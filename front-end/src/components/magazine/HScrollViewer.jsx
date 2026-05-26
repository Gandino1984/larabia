// magazine-front/src/components/magazine/HScrollViewer.jsx
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Play, Pause, X, Volume2, Link as LinkIcon, Bookmark, RotateCcw, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext.jsx';
import { useAuth } from '../../app_context/AuthContext.jsx';
import './HScrollViewer.css';

function HScrollViewer({ panels, articleId }) {
  const { t } = useTranslation();
  const { showInfo, showSuccess } = useUI();
  const { currentUser, loading: authLoading } = useAuth();
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  // Helper function to construct full image URL
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3007';
    return `${apiUrl}${url.startsWith('/') ? url : '/' + url}`;
  };

  // Append recommended params to YouTube embed URLs to minimise chrome/letterboxing
  const getIframeSrc = (url) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      const isYouTube =
        parsed.hostname === 'www.youtube.com' ||
        parsed.hostname === 'youtube.com' ||
        parsed.hostname === 'www.youtube-nocookie.com' ||
        parsed.hostname === 'youtube-nocookie.com';
      if (isYouTube) {
        parsed.searchParams.set('rel', '0');
        parsed.searchParams.set('modestbranding', '1');
        parsed.searchParams.set('showinfo', '0');
        parsed.searchParams.set('iv_load_policy', '3'); // hide annotations
      }
      return parsed.toString();
    } catch {
      return url;
    }
  };

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Touch gesture state for swipe detection
  const [touchStart, setTouchStart] = useState({ x: 0, time: 0 });

  // Audio player ref for interactive audio panels
  const audioRef = useRef(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioConfig, setAudioConfig] = useState({ mode: 'once', stopPanel: null });
  const [currentVisiblePanel, setCurrentVisiblePanel] = useState(null);

  // Interactive icon color state
  const [blueIconPanels, setBlueIconPanels] = useState(new Set());
  const iconTimeoutRefs = useRef({});

  // Portrait mobile detection — advise user to rotate
  const [showRotateBanner, setShowRotateBanner] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth <= 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowRotateBanner(isMobile && isPortrait);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  // Loading state for preloader
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const loadedImagesRef = useRef(new Set());

  // Track if we've restored progress for this mount
  const hasRestoredRef = useRef(false);

  // Track all currently visible panels
  const visiblePanelsRef = useRef(new Map());

  // Debounced scroll position check for better performance
  const checkScrollPosition = useRef(null);

  useEffect(() => {
    let timeoutId;

    checkScrollPosition.current = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftArrow(scrollLeft > 10);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);

        // Calculate scroll percentage
        const maxScroll = scrollWidth - clientWidth;
        const percentage = maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * 100) : 0;
        setScrollPercentage(percentage);
      }
    };

    const debouncedCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => checkScrollPosition.current(), 50);
    };

    checkScrollPosition.current.debounced = debouncedCheck;

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (checkScrollPosition.current) {
      // Call immediately and after a short delay to ensure DOM is ready
      checkScrollPosition.current();
      setTimeout(() => checkScrollPosition.current(), 100);

      window.addEventListener('resize', checkScrollPosition.current, { passive: true });
      return () => window.removeEventListener('resize', checkScrollPosition.current);
    }
  }, [panels]);

  // Check scroll position after loading completes
  useEffect(() => {
    if (!isLoading && checkScrollPosition.current) {
      // Wait for the viewer to render and images to be laid out
      setTimeout(() => {
        checkScrollPosition.current();
      }, 200);

      // Double check after a bit more time
      setTimeout(() => {
        checkScrollPosition.current();
      }, 500);
    }
  }, [isLoading]);


  // Intersection Observer for interactive panel notifications
  useEffect(() => {
    if (!scrollContainerRef.current || isLoading) return;

    const options = {
      root: scrollContainerRef.current,
      threshold: 0.1,
      rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.classList.contains('interactive-panel')) {
          const interactionType = entry.target.dataset.interactionType;
          const panelId = entry.target.dataset.panelId;

          console.log('Interactive panel detected:', { interactionType, panelId, articleId });

          // Make icon blue when panel becomes visible
          setBlueIconPanels(prev => new Set(prev).add(panelId));

          // Clear any existing timeout for this panel
          if (iconTimeoutRefs.current[panelId]) {
            clearTimeout(iconTimeoutRefs.current[panelId]);
          }

          // Transition to black after 2.5 seconds
          iconTimeoutRefs.current[panelId] = setTimeout(() => {
            setBlueIconPanels(prev => {
              const newSet = new Set(prev);
              newSet.delete(panelId);
              return newSet;
            });
          }, 2500);

          // Check if user has seen tutorial for this article
          const tutorialKey = articleId ? `hscroll_tutorial_seen_${articleId}` : 'hscroll_tutorial_seen';
          const hasSeenTutorial = localStorage.getItem(tutorialKey);

          console.log('Tutorial check:', { tutorialKey, hasSeenTutorial });

          // If first time for this article, show info card
          if (!hasSeenTutorial) {
            const infoMessage = t('hscroll.tutorial.interactivePanels');

            console.log('Calling showInfo with message:', infoMessage, 'iconType:', interactionType);
            showInfo(infoMessage, interactionType);
            localStorage.setItem(tutorialKey, 'true');
          }
        }
      });
    }, options);

    // Observe all interactive panels
    const interactivePanels = scrollContainerRef.current?.querySelectorAll('.interactive-panel');
    interactivePanels?.forEach(panel => observer.observe(panel));

    return () => {
      observer.disconnect();
      // Clear all icon transition timeouts
      Object.values(iconTimeoutRefs.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [panels, articleId, showInfo, isLoading]);

  // Monitor current visible panel and stop audio at stop panel
  useEffect(() => {
    if (!audioConfig.stopPanel || !isPlaying) return;

    const options = {
      root: scrollContainerRef.current,
      threshold: 0.1, // Trigger as soon as 10% of the panel is visible
      rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const panelElement = entry.target;
          const panelNumber = parseInt(panelElement.dataset.panelNumber);
          setCurrentVisiblePanel(panelNumber);

          // Stop audio exactly at the configured stop panel
          if (panelNumber === audioConfig.stopPanel && audioRef.current) {
            console.log(`Audio stopped at panel ${panelNumber} as configured`);
            audioRef.current.pause();
            setCurrentAudio(null);
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            setAudioConfig({ mode: 'once', stopPanel: null });
          }
        }
      });
    }, options);

    // Observe all panels
    const allPanels = scrollContainerRef.current?.querySelectorAll('.hscroll-viewer-panel');
    allPanels?.forEach(panel => observer.observe(panel));

    return () => {
      observer.disconnect();
    };
  }, [panels, audioConfig.stopPanel, isPlaying]);

  // Initialize current visible panel when loading completes
  useEffect(() => {
    console.log('🔍 Init check:', { isLoading, panelsLength: panels?.length, currentVisiblePanel });
    if (!isLoading && panels?.length > 0 && currentVisiblePanel === null) {
      console.log('🎬 Initializing current visible panel to 1');
      setCurrentVisiblePanel(1);
    }
  }, [isLoading, panels, currentVisiblePanel]);

  // Track current visible panel for reading progress
  useEffect(() => {
    if (!scrollContainerRef.current || isLoading) return;

    const container = scrollContainerRef.current;

    // Function to find the leftmost/most prominent visible panel
    const updateCurrentPanel = () => {
      const allPanels = container.querySelectorAll('.hscroll-viewer-panel');
      if (!allPanels.length) return;

      const containerRect = container.getBoundingClientRect();
      const containerLeft = containerRect.left;

      let leftmostPanel = null;
      let minDistance = Infinity;

      allPanels.forEach(panel => {
        const rect = panel.getBoundingClientRect();
        const panelLeft = rect.left;
        const panelRight = rect.right;

        // Check if panel is visible (at least partially in viewport)
        if (panelRight > containerLeft && panelLeft < containerRect.right) {
          // Distance from left edge of container to left edge of panel
          const distance = Math.abs(panelLeft - containerLeft);

          if (distance < minDistance) {
            minDistance = distance;
            leftmostPanel = panel;
          }
        }
      });

      if (leftmostPanel) {
        const panelNumber = parseInt(leftmostPanel.dataset.panelNumber);
        if (currentVisiblePanel !== panelNumber) {
          setCurrentVisiblePanel(panelNumber);
          console.log('👁️ Current panel updated to:', panelNumber);
        }
      }
    };

    // Debounce scroll updates
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateCurrentPanel, 100);
    };

    // Initial update
    updateCurrentPanel();

    // Listen to scroll events
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      visiblePanelsRef.current.clear();
    };
  }, [panels, isLoading, currentVisiblePanel]);

  // Save reading progress to localStorage when current panel changes
  useEffect(() => {
    if (currentVisiblePanel !== null && articleId && !authLoading) {
      const userId = currentUser?.id_user || 'guest';
      const progressKey = `comic_progress_${userId}_${articleId}`;
      localStorage.setItem(progressKey, currentVisiblePanel.toString());
      console.log('💾 Saved reading progress:', {
        userId,
        progressKey,
        panel: currentVisiblePanel,
        user: currentUser?.name_user || 'guest'
      });
    }
  }, [currentVisiblePanel, articleId, currentUser, authLoading]);

  // Reset hasRestored flag when articleId changes (new comic opened)
  useEffect(() => {
    hasRestoredRef.current = false;
    console.log('🔄 Reset restore flag for article:', articleId);
  }, [articleId]);

  // Restore reading progress after content is loaded
  useEffect(() => {
    // Only restore once per mount, after loading is complete AND auth is ready
    if (hasRestoredRef.current) {
      console.log('⏭️ Already restored, skipping');
      return;
    }

    if (isLoading || authLoading || !articleId || !scrollContainerRef.current) {
      console.log('⏸️ Waiting to restore:', { isLoading, authLoading, hasArticleId: !!articleId, hasContainer: !!scrollContainerRef.current });
      return;
    }

    const userId = currentUser?.id_user || 'guest';
    const progressKey = `comic_progress_${userId}_${articleId}`;
    const savedProgress = localStorage.getItem(progressKey);

    console.log('🔄 Restoring reading progress:', {
      userId,
      progressKey,
      savedProgress,
      currentUser: currentUser?.name_user || 'guest'
    });

    if (savedProgress) {
      const panelNumber = parseInt(savedProgress);
      // Wait a bit longer to ensure panels are fully rendered and positioned
      setTimeout(() => {
        if (!scrollContainerRef.current) {
          console.warn('⚠️ Container lost during timeout');
          return;
        }

        const targetPanel = scrollContainerRef.current.querySelector(
          `[data-panel-number="${panelNumber}"]`
        );

        if (targetPanel) {
          console.log(`✅ Restored to panel ${panelNumber}`);
          hasRestoredRef.current = true;
          // Use instant scroll for better UX when restoring position
          targetPanel.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' });
        } else {
          console.warn(`⚠️ Could not find panel ${panelNumber} to restore`);
          // Check how many panels exist
          const allPanels = scrollContainerRef.current.querySelectorAll('[data-panel-number]');
          console.warn(`Found ${allPanels.length} panels total`);
        }
      }, 500);
    } else {
      console.log('ℹ️ No saved progress found');
      hasRestoredRef.current = true; // Mark as restored even if no progress to prevent retries
    }
  }, [articleId, currentUser, isLoading, authLoading]);

  // Preload all comic panel images and track progress
  useEffect(() => {
    if (!panels || panels.length === 0) {
      setIsLoading(false);
      return;
    }

    // Reset loading state
    setIsLoading(true);
    setLoadProgress(0);
    loadedImagesRef.current = new Set();

    // Track start time to ensure minimum display time
    const startTime = Date.now();
    const MIN_DISPLAY_TIME = 1500; // Minimum 1.5 seconds

    // Get all image URLs from panels (skip iframe panels — no image to preload)
    const imageUrls = panels
      .filter(panel => panel.interaction_type !== 'iframe')
      .map(panel => getImageUrl(panel.image_url))
      .filter(url => url);

    const totalImages = imageUrls.length;

    if (totalImages === 0) {
      setIsLoading(false);
      return;
    }

    let loadedCount = 0;
    let allImagesLoaded = false;

    const checkAndHidePreloader = () => {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsed);

      setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
    };

    // Preload each image
    imageUrls.forEach((url) => {
      const img = new Image();

      img.onload = () => {
        loadedCount++;
        loadedImagesRef.current.add(url);
        const progress = Math.round((loadedCount / totalImages) * 100);
        setLoadProgress(progress);

        // If all images loaded, hide preloader after minimum time
        if (loadedCount === totalImages && !allImagesLoaded) {
          allImagesLoaded = true;
          checkAndHidePreloader();
        }
      };

      img.onerror = () => {
        // Even if image fails, count it as "loaded" to not block the UI indefinitely
        console.error(`Failed to load image: ${url}`);
        loadedCount++;
        const progress = Math.round((loadedCount / totalImages) * 100);
        setLoadProgress(progress);

        if (loadedCount === totalImages && !allImagesLoaded) {
          allImagesLoaded = true;
          checkAndHidePreloader();
        }
      };

      img.src = url;
    });

  }, [panels]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          scrollLeft(0.2);
          break;
        case 'ArrowRight':
          e.preventDefault();
          scrollRight(0.2);
          break;
        case 'Home':
          e.preventDefault();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          }
          break;
        case 'End':
          e.preventDefault();
          if (scrollContainerRef.current) {
            const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
            scrollContainerRef.current.scrollTo({ left: maxScroll, behavior: 'smooth' });
          }
          break;
        case ' ':
          e.preventDefault();
          if (e.shiftKey) {
            scrollLeft(1.5); // Fast scroll
          } else {
            scrollRight(1.5); // Fast scroll
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const scrollLeft = (speed = 0.2) => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * speed;
      const targetScroll = scrollContainerRef.current.scrollLeft - scrollAmount;
      scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const scrollRight = (speed = 0.2) => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * speed;
      const targetScroll = scrollContainerRef.current.scrollLeft + scrollAmount;
      scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  // Drag handlers for horizontal scrolling
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setHasDragged(false);
    const currentX = e.pageX;
    setStartX(currentX - scrollContainerRef.current.offsetLeft);
    setScrollLeftStart(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const currentX = e.pageX;
    const walk = (currentX - (startX + scrollContainerRef.current.offsetLeft)) * 0.7; // Dampen to 70% speed

    // If user moved more than 5px, consider it a drag
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }

    scrollContainerRef.current.scrollLeft = scrollLeftStart - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click events
    setTimeout(() => setHasDragged(false), 100);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setTimeout(() => setHasDragged(false), 100);
    }
  };

  // Haptic feedback helper
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Touch handlers for mobile with swipe detection
  const handleTouchStart = (e) => {
    setIsDragging(true);
    const touchX = e.touches[0].pageX;
    setStartX(touchX - scrollContainerRef.current.offsetLeft);
    setScrollLeftStart(scrollContainerRef.current.scrollLeft);
    setTouchStart({
      x: touchX,
      time: Date.now()
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX); // 1:1 ratio for smoother touch dragging
    scrollContainerRef.current.scrollLeft = scrollLeftStart - walk;
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;

    const touchEnd = {
      x: e.changedTouches[0].pageX,
      time: Date.now()
    };

    const distance = touchEnd.x - touchStart.x;
    const duration = touchEnd.time - touchStart.time;

    // Swipe detected: >50px movement in <300ms
    if (Math.abs(distance) > 50 && duration < 300) {
      vibrate([10]); // Light haptic feedback
      if (distance > 0) {
        scrollLeft(); // Swipe right = previous panel
      } else {
        scrollRight(); // Swipe left = next panel
      }
    }

    setIsDragging(false);
  };

  // Format time in MM:SS
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Close audio player
  const closeAudioPlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentAudio(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  // Manual save progress
  const handleManualSave = () => {
    if (currentVisiblePanel !== null && articleId && !authLoading) {
      const userId = currentUser?.id_user || 'guest';
      const progressKey = `comic_progress_${userId}_${articleId}`;
      localStorage.setItem(progressKey, currentVisiblePanel.toString());
      console.log('📌 Manual save:', {
        userId,
        panel: currentVisiblePanel,
        user: currentUser?.name_user || 'guest'
      });
      showSuccess(t('hscroll.progressSaved', { panel: currentVisiblePanel }));
    }
  };

  // Manual restore to saved position
  const handleManualRestore = () => {
    if (!articleId || !scrollContainerRef.current || authLoading) return;

    const userId = currentUser?.id_user || 'guest';
    const progressKey = `comic_progress_${userId}_${articleId}`;
    const savedProgress = localStorage.getItem(progressKey);

    if (savedProgress) {
      const panelNumber = parseInt(savedProgress);
      const targetPanel = scrollContainerRef.current.querySelector(
        `[data-panel-number="${panelNumber}"]`
      );

      if (targetPanel) {
        targetPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        showSuccess(t('hscroll.restoringToPanel', { panel: panelNumber }));
      } else {
        showInfo(t('hscroll.panelNotFound'));
      }
    } else {
      showInfo(t('hscroll.noProgressSaved'));
    }
  };

  // Handle interactive panel click
  const handlePanelClick = (panel) => {
    // Don't trigger if user was dragging
    if (hasDragged) return;

    // Only handle clicks on interactive panels
    if (!panel.is_interactive || !panel.interaction_type) return;

    if (panel.interaction_type === 'link') {
      // Open link in new tab
      if (panel.interaction_data) {
        window.open(panel.interaction_data, '_blank', 'noopener,noreferrer');
      }
    } else if (panel.interaction_type === 'audio') {
      // Play audio
      if (panel.interaction_data) {
        const audioUrl = getImageUrl(panel.interaction_data);

        // If same audio is playing, toggle play/pause
        if (currentAudio === audioUrl && audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play();
            setIsPlaying(true);
          } else {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        } else {
          // Play new audio
          if (audioRef.current) {
            audioRef.current.pause();
          }

          // Store audio configuration
          const mode = panel.audio_mode || 'once';
          const stopPanel = panel.audio_stop_panel || null;
          setAudioConfig({ mode, stopPanel });

          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          setCurrentAudio(audioUrl);
          setIsPlaying(true);
          setCurrentTime(0);
          setDuration(0);

          // Set loop based on mode
          audio.loop = (mode === 'loop');

          // Set up event listeners
          audio.addEventListener('loadedmetadata', () => {
            setDuration(audio.duration);
          });

          audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
          });

          audio.addEventListener('ended', () => {
            // If mode is 'once', close the player
            if (mode === 'once') {
              setCurrentAudio(null);
              setIsPlaying(false);
              setCurrentTime(0);
              setDuration(0);
              setAudioConfig({ mode: 'once', stopPanel: null });
            } else if (mode === 'loop') {
              // Explicitly restart the audio for loop mode
              audio.currentTime = 0;
              audio.play().catch(err => {
                console.error('Error looping audio:', err);
              });
            }
          });

          audio.play().catch(err => {
            console.error('Error playing audio:', err);
            alert(t('hscroll.audio.errorPlaying'));
            setIsPlaying(false);
          });
        }
      }
    }
  };

  // Parse "16:9" → "16 / 9" for CSS aspect-ratio property
  const parseAspectRatio = (ratioStr) => {
    if (!ratioStr) return '16 / 9';
    const [w, h] = ratioStr.split(':').map(Number);
    if (w && h) return `${w} / ${h}`;
    return '16 / 9';
  };

  // Sort panels by order
  const sortedPanels = [...panels].sort((a, b) => (a.block_order || 0) - (b.block_order || 0));

  // Debug logging for panel display
  console.log('📊 Rendering with:', {
    currentVisiblePanel,
    scrollPercentage,
    panelsCount: sortedPanels.length,
    isLoading,
    authLoading
  });

  // Render audio player using portal
  const audioPlayerElement = currentAudio ? (
    <div
      className="floating-audio-player"
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '12px 16px',
        minWidth: '280px',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
      }}
    >
      <button
        className="audio-player-control"
        onClick={togglePlayPause}
        aria-label={isPlaying ? t('hscroll.audio.pause') : t('hscroll.audio.play')}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <div className="audio-player-info">
        <div className="audio-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        <div className="audio-time-left">
          -{formatTime(duration - currentTime)}
        </div>
      </div>

      <button
        className="audio-player-close"
        onClick={closeAudioPlayer}
        aria-label={t('hscroll.audio.closePlayer')}
      >
        <X size={18} />
      </button>
    </div>
  ) : null;

  return (
    <>
      {isLoading ? (
        <div className="hscroll-preloader">
          <div className="preloader-content">
            <img
              src="/logoLaRabiaBlack.png"
              alt={t('hscroll.logo')}
              className="preloader-logo"
            />
            <p className="progress-text">{loadProgress}%</p>
          </div>
        </div>
      ) : (
        <div className="hscroll-viewer" role="region" aria-label={t('hscroll.ariaLabel')}>
          {showRotateBanner && (
            <div className="hscroll-rotate-banner" role="status">
              <Smartphone className="hscroll-rotate-icon" size={22} />
              <span>{t('hscroll.rotateBanner')}</span>
              <button
                className="hscroll-rotate-dismiss"
                onClick={() => setShowRotateBanner(false)}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          )}
        <div className="hscroll-viewer-controls">
          {/* Fast scroll left (outer) */}
          <button
            className="btn-scroll-viewer btn-left btn-fast"
            onClick={() => scrollLeft(1.8)}
            title={t('hscroll.controls.previousFast')}
            aria-label={t('hscroll.controls.previousFastAria')}
            style={{ opacity: showLeftArrow ? 1 : 0.3 }}
            disabled={!showLeftArrow}
          >
            <ArrowLeft size={28} />
            <ArrowLeft size={28} className="arrow-overlay" />
          </button>

          {/* Slow scroll left (inner) */}
          <button
            className="btn-scroll-viewer btn-left btn-slow"
            onClick={() => scrollLeft(0.2)}
            title={t('hscroll.controls.previousSlow')}
            aria-label={t('hscroll.controls.previousSlowAria')}
            style={{ opacity: showLeftArrow ? 1 : 0.3 }}
            disabled={!showLeftArrow}
          >
            <ArrowLeft size={20} />
          </button>

          <div
            className="hscroll-viewer-container"
            ref={scrollContainerRef}
            onScroll={() => checkScrollPosition.current?.debounced?.()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            tabIndex={0}
            role="list"
            aria-label={t('hscroll.panelsAriaLabel')}
          >
            <div className="hscroll-viewer-panels">
              {sortedPanels.map((panel, index) => (
                <div
                  key={panel.id_block}
                  className={`hscroll-viewer-panel ${panel.is_interactive ? 'interactive-panel' : ''} ${panel.interaction_type === 'iframe' ? 'iframe-panel' : ''}`}
                  data-interaction-type={panel.interaction_type}
                  data-panel-number={index + 1}
                  data-panel-id={panel.id_block}
                  onClick={() => handlePanelClick(panel)}
                  style={{
                    cursor: panel.is_interactive ? 'pointer' : 'default',
                    ...(panel.interaction_type === 'iframe' && {
                      aspectRatio: parseAspectRatio(panel.image_caption),
                      width: 'auto',
                    }),
                  }}
                  role={panel.is_interactive ? 'button' : undefined}
                  aria-label={panel.is_interactive ? t('hscroll.interactivePanel', { number: index + 1 }) : undefined}
                  tabIndex={panel.is_interactive ? 0 : undefined}
                >
                  {panel.interaction_type === 'iframe' ? (
                    <iframe
                      src={getIframeSrc(panel.interaction_data)}
                      className="viewer-panel-iframe"
                      frameBorder="0"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      title={`Panel ${index + 1}`}
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <img
                        src={getImageUrl(panel.image_url)}
                        alt={panel.image_alt || t('hscroll.panel', { number: index + 1 })}
                        className="viewer-panel-image"
                        loading="lazy"
                      />

                      {panel.image_caption && (
                        <p className="viewer-panel-caption">{panel.image_caption}</p>
                      )}

                      {/* Audio badge for audio panels */}
                      {panel.interaction_type === 'audio' && (
                        <div className="panel-audio-badge" title={t('hscroll.panelWithAudio')}>
                          <Volume2 size={20} />
                        </div>
                      )}

                      {panel.is_interactive && (
                        <div className="interactive-indicator">
                          <div className="pulse-ring"></div>
                          <span className={`interactive-icon ${blueIconPanels.has(panel.id_block) ? 'blue' : ''}`}>
                            {panel.interaction_type === 'link' ? (
                              <LinkIcon size={20} />
                            ) : (
                              <Volume2 size={20} />
                            )}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Slow scroll right (inner) */}
          <button
            className="btn-scroll-viewer btn-right btn-slow"
            onClick={() => scrollRight(0.2)}
            title={t('hscroll.controls.nextSlow')}
            aria-label={t('hscroll.controls.nextSlowAria')}
            style={{ opacity: showRightArrow ? 1 : 0.3 }}
            disabled={!showRightArrow}
          >
            <ArrowRight size={20} />
          </button>

          {/* Fast scroll right (outer) */}
          <button
            className="btn-scroll-viewer btn-right btn-fast"
            onClick={() => scrollRight(1.8)}
            title={t('hscroll.controls.nextFast')}
            aria-label={t('hscroll.controls.nextFastAria')}
            style={{ opacity: showRightArrow ? 1 : 0.3 }}
            disabled={!showRightArrow}
          >
            <ArrowRight size={28} />
            <ArrowRight size={28} className="arrow-overlay" />
          </button>
        </div>

        {/* Reading progress indicator */}
        <div className="hscroll-progress-container">
          <div className="hscroll-progress-bar">
            <div
              className="hscroll-progress-fill"
              style={{ width: `${scrollPercentage}%` }}
            />
          </div>
          <div className="hscroll-progress-info">
            <div className="hscroll-progress-text">
              {currentVisiblePanel ? t('hscroll.progress.currentPanel', { panel: currentVisiblePanel }) : t('common.states.loading')} • {t('hscroll.progress.percentRead', { percent: scrollPercentage })}
            </div>
            <div className="hscroll-progress-controls">
              <button
                className="btn-progress-action"
                onClick={handleManualSave}
                title={t('hscroll.progress.saveTitle')}
                aria-label={t('hscroll.progress.saveAria')}
                disabled={!currentVisiblePanel || authLoading}
              >
                <Bookmark size={16} />
                <span>{t('hscroll.progress.save')}</span>
              </button>
              <button
                className="btn-progress-action"
                onClick={handleManualRestore}
                title={t('hscroll.progress.restoreTitle')}
                aria-label={t('hscroll.progress.restoreAria')}
                disabled={authLoading}
              >
                <RotateCcw size={16} />
                <span>{t('hscroll.progress.restore')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Render audio player via portal to document.body */}
      {currentAudio && createPortal(audioPlayerElement, document.body)}
    </>
  );
}

export default HScrollViewer;
