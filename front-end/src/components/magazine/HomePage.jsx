// magazine-front/src/components/magazine/HomePage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSpring, animated } from '@react-spring/web';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import { ChevronLeft, ChevronRight, Calendar, Share2 } from 'lucide-react';
import SectionPreviews from './SectionPreviews';
import ScrollHint from '../common/ScrollHint';
import RollText from '../common/RollText';
import './HomePage.css';

function AuthorAvatar({ author, getUrl }) {
  const [imgError, setImgError] = useState(false);
  const url = getUrl(author);

  if (!url || imgError) {
    return (
      <span className="hero-author-avatar hero-author-avatar--fallback">
        {author.name_user?.charAt(0)?.toUpperCase() || '?'}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={author.name_user}
      className="hero-author-avatar"
      onError={() => setImgError(true)}
    />
  );
}

// Play the hero staggered entrance + the scroll-hint overlay only once per
// session; afterwards the hero content is simply there.
let heroEntrancePlayed = false;
let scrollOverlayShown = false;

function HomePage({ ready = true }) {
  const { t } = useTranslation();
  const { featuredArticles, setSelectedArticle, fetchArticleById } = useMagazine();
  const { navigateToArticle, openAuthorCard, showSuccess } = useUI();

  const handleShare = (e, article) => {
    e.stopPropagation();
    const url = `${window.location.origin}?article=${article.id_article}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => showSuccess(t('hero.linkCopied', '¡Enlace copiado!')))
        .catch(() => {});
    }
  };
  // Staggered fade-up of the hero content (project label → title → description/
  // date/authors), in sync with the create-button slide-in.
  // The cover image fades in slowly starting as soon as the hero is visible; the
  // fade finishes around when the description text slides up.
  const [heroBgIn, setHeroBgIn] = useState(false);
  useEffect(() => {
    if (ready) setHeroBgIn(true);
  }, [ready]);

  // Parallax: the hero cover drifts slower than the page as the user scrolls
  // down (wheel/keyboard/touch), so the section previews slide up over it.
  const [parallaxY, setParallaxY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const readScroll = () =>
      (document.scrollingElement && document.scrollingElement.scrollTop) ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      window.scrollY ||
      0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setParallaxY(readScroll());
      });
    };
    // The page scrolls on <body> here (overflow-x:hidden makes body the
    // scroller), and that scroll event doesn't reach window — so listen broadly.
    const targets = [window, document, document.body, document.documentElement];
    targets.forEach((t) => t.addEventListener('scroll', onScroll, { passive: true }));
    return () => {
      targets.forEach((t) => t.removeEventListener('scroll', onScroll));
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const [heroIn, setHeroIn] = useState(heroEntrancePlayed);
  useEffect(() => {
    if (!ready || heroEntrancePlayed) return;
    const timer = setTimeout(() => {
      heroEntrancePlayed = true;
      setHeroIn(true);
    }, 850);
    return () => clearTimeout(timer);
  }, [ready]);

  // Scroll-hint overlay: after the whole entrance sequence, show a centered
  // scroll message over a darkened, blurred backdrop. Auto-hides and is
  // dismissed by any scroll intent. Once per session.
  const [scrollOverlay, setScrollOverlay] = useState(false);
  const [overlayClosing, setOverlayClosing] = useState(false);
  // Play the reverse (fade + slide down) exit, then unmount.
  const hideOverlay = useCallback(() => {
    setOverlayClosing(true);
    setTimeout(() => {
      setScrollOverlay(false);
      setOverlayClosing(false);
    }, 320);
  }, []);
  useEffect(() => {
    if (!heroIn || scrollOverlayShown) return;
    let hideT;
    const showT = setTimeout(() => {
      scrollOverlayShown = true;
      setScrollOverlay(true);
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      hideT = setTimeout(hideOverlay, isDesktop ? 3500 : 4000);
    }, 1500);
    const dismiss = () => { clearTimeout(hideT); hideOverlay(); };
    window.addEventListener('wheel', dismiss, { passive: true });
    window.addEventListener('touchmove', dismiss, { passive: true });
    window.addEventListener('scroll', dismiss, { passive: true });
    return () => {
      clearTimeout(showT);
      clearTimeout(hideT);
      window.removeEventListener('wheel', dismiss);
      window.removeEventListener('touchmove', dismiss);
      window.removeEventListener('scroll', dismiss);
    };
  }, [heroIn]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});
  // Touch swipe support for the hero (it advances by state, not native scroll,
  // so it needs explicit touch handling to pan sideways with a finger). The
  // slide tracks the finger via a react-spring x offset so the content feels
  // like it's being dragged; on release it either advances (new slide slides in
  // from the swipe direction) or snaps back.
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);
  const didDrag = useRef(false);
  const [{ x }, springApi] = useSpring(() => ({ x: 0, config: { tension: 300, friction: 32 } }));
  // Opacity spring for cross-fading between featured stories (arrows + auto).
  const [{ op }, opApi] = useSpring(() => ({ op: 1 }));
  const transitioning = useRef(false);

  const slideCount = featuredArticles?.length || 0;

  // Raw change (used by the touch swipe, which has its own slide animation).
  const advanceRaw = (dir) => {
    if (slideCount > 0) setCurrentSlide((prev) => (prev + dir + slideCount) % slideCount);
  };

  // Quick fade-out of the current story, swap, quick fade-in of the next.
  const fadeTo = (getIndex) => {
    if (slideCount <= 1 || transitioning.current) return;
    transitioning.current = true;
    opApi.start({
      op: 0,
      config: { duration: 160 },
      onRest: () => {
        setCurrentSlide(getIndex);
        opApi.start({
          op: 1,
          config: { duration: 220 },
          onRest: () => { transitioning.current = false; },
        });
      },
    });
  };

  const nextSlide = () => fadeTo((prev) => (prev + 1) % slideCount);
  const prevSlide = () => fadeTo((prev) => (prev - 1 + slideCount) % slideCount);
  const goToSlide = (index) => fadeTo(() => index);

  // Auto-advance slides (with the same cross-fade).
  useEffect(() => {
    if (!featuredArticles || featuredArticles.length <= 1) return;
    const interval = setInterval(() => {
      fadeTo((prev) => (prev + 1) % featuredArticles.length);
    }, 14000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredArticles]);

  // Left/right arrow keys move the hero slider (unless the user is typing).
  useEffect(() => {
    const count = featuredArticles?.length || 0;
    if (count <= 1) return;
    const handleKey = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
      if (typing) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        fadeTo((prev) => (prev + 1) % count);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        fadeTo((prev) => (prev - 1 + count) % count);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredArticles]);

  // Swipe to change slides on touch devices — the slide follows the finger.
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    didDrag.current = false;
    springApi.stop();
  };
  const handleTouchMove = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = dx;
    if (Math.abs(dx) > 6) didDrag.current = true;
    springApi.start({ x: dx, immediate: true }); // track the finger 1:1
  };
  const handleTouchEnd = () => {
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    const width = window.innerWidth || 400;
    const multiple = featuredArticles && featuredArticles.length > 1;
    if (multiple && Math.abs(dx) > 50) {
      const dir = dx < 0 ? 1 : -1; // swipe left → next, right → prev
      // The new slide enters from the side the finger came from (raw change, the
      // x spring provides the slide animation here — no cross-fade on swipe).
      advanceRaw(dir);
      springApi.set({ x: dir * width });
      springApi.start({ x: 0 });
    } else {
      springApi.start({ x: 0 }); // snap back
    }
  };

  const handleArticleClick = async (article) => {
    // Load the full, canonical article by id (same path as an article card /
    // deep link) so the detail always has the complete data — the featured
    // object alone was leaving the description empty in the detail view.
    setSelectedArticle(article); // instant paint with what we have
    if (article?.id_article && fetchArticleById) {
      await fetchArticleById(article.id_article);
    }
    navigateToArticle();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAuthorImageUrl = (author) => {
    const img = author?.image_user;
    if (!img) return null;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
  };

  const getCoverImageUrl = (article) => {
    const cover = article?.cover_image_article;
    if (!cover) return '/logoFondoNegro.jpg';
    if (cover.startsWith('http://') || cover.startsWith('https://')) return cover;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    return `${apiUrl}${cover.startsWith('/') ? cover : '/' + cover}`;
  };

  const currentArticle = featuredArticles?.[currentSlide];

  return (
    <div className="home-page">
      {/* Hero Section with Featured Articles Slider */}
      <section className="hero-section">
        {currentArticle ? (
          <div
            className={`hero-slider hero-anim ${heroIn ? 'hero-in' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <animated.div
              className={`hero-slide ${heroBgIn ? 'bg-in' : ''}`}
              style={{
                opacity: op,
                transform: x.to((v) => `translate3d(${v}px, 0, 0)`),
              }}
              onClick={() => { if (didDrag.current) { didDrag.current = false; return; } handleArticleClick(currentArticle); }}
            >
              {/* Cover image on its own layer so it can fade in slowly + parallax. */}
              <div
                className="hero-slide__bg"
                style={{
                  backgroundImage: `url(${brokenImages[currentArticle.id_article] ? '/logoFondoNegro.jpg' : getCoverImageUrl(currentArticle)})`,
                  transform: `translate3d(0, ${parallaxY * 0.4}px, 0)`,
                }}
              />
              {/* Hidden img to detect broken cover images and fall back to logo */}
              <img
                src={getCoverImageUrl(currentArticle)}
                alt=""
                style={{ display: 'none' }}
                onError={() => setBrokenImages(prev => ({ ...prev, [currentArticle.id_article]: true }))}
              />
              <div className={`hero-content hero-anim ${heroIn ? 'hero-in' : ''}`}>
                <div className="hero-headline">
                  {currentArticle.project_title && (
                    <span className="hero-project-label">Proyecto: {currentArticle.project_title}</span>
                  )}
                  <h1 className="hero-title">{currentArticle.title_article}</h1>
                </div>
                {currentArticle.date_published && (
                  <span className="hero-date">
                    <Calendar size={18} />
                    {formatDate(currentArticle.date_published)}
                  </span>
                )}
                {currentArticle.excerpt_article && (
                  <div className="hero-desc-row">
                    <p className="hero-excerpt">{currentArticle.excerpt_article}</p>
                    <div
                      className="hero-desc-image"
                      style={{ backgroundImage: `url(${brokenImages[currentArticle.id_article] ? '/logoFondoNegro.jpg' : getCoverImageUrl(currentArticle)})` }}
                      role="img"
                      aria-label={currentArticle.title_article}
                    />
                  </div>
                )}
                <div className="hero-meta">
                  {(currentArticle.authors?.length > 0 || currentArticle.author_name) && (
                    <span className="meta-item hero-authors">
                      {currentArticle.authors?.length > 0
                        ? currentArticle.authors.map((author) => (
                            <span
                              key={author.id_user}
                              className="hero-author hero-author--clickable"
                              onClick={(e) => { e.stopPropagation(); openAuthorCard(author); }}
                              role="button"
                              tabIndex={0}
                            >
                              <AuthorAvatar author={author} getUrl={getAuthorImageUrl} />
                              <span className="hero-author-name">{author.name_user}</span>
                            </span>
                          ))
                        : <span className="hero-author-name">{currentArticle.author_name}</span>
                      }
                    </span>
                  )}
                  {currentArticle.category_article && currentArticle.category_article.toLowerCase() !== 'general' && (
                    <span className="hero-category">{currentArticle.category_article}</span>
                  )}
                  <div className="hero-actions">
                    <button
                      type="button"
                      className="hero-share-btn"
                      onClick={(e) => handleShare(e, currentArticle)}
                      title={t('hero.share', 'Compartir')}
                    >
                      <Share2 size={18} />
                      <RollText text={t('hero.share', 'Compartir')} />
                    </button>
                    <button
                      type="button"
                      className="hero-enter-btn"
                      onClick={(e) => { e.stopPropagation(); handleArticleClick(currentArticle); }}
                    >
                      <RollText text={t('hero.enter', 'Entrar')} />
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </animated.div>

            {/* Navigation Arrows */}
            {featuredArticles && featuredArticles.length > 1 && (
              <>
                <button className="hero-nav prev" onClick={(e) => { e.stopPropagation(); prevSlide(); }}>
                  <ChevronLeft size={32} />
                </button>
                <button className="hero-nav next" onClick={(e) => { e.stopPropagation(); nextSlide(); }}>
                  <ChevronRight size={32} />
                </button>

                {/* Slide Indicators */}
                <div className="hero-indicators">
                  {featuredArticles.map((_, index) => (
                    <button
                      key={index}
                      className={`indicator ${index === currentSlide ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); goToSlide(index); }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="hero-slide hero-default">
            <div className="hero-content">
              <img
                src="/LogoLaRabiaWhite.png"
                alt="La Rabia"
                className="hero-logo"
              />
            </div>
          </div>
        )}

      </section>

      {/* Section previews: full-width slideshows per header-bar button */}
      <SectionPreviews />

      {/* Scroll-hint overlay: centered message over a darkened, blurred backdrop,
          shown once after the entrance sequence. */}
      {scrollOverlay && createPortal(
        <div className={`scroll-hint-overlay ${overlayClosing ? 'is-closing' : ''}`} onClick={hideOverlay}>
          <ScrollHint dual visible label={t('hero.scrollHintMobile')} labelDesktop={t('hero.scrollHintDesktop')} />
        </div>,
        document.body
      )}
    </div>
  );
}

export default HomePage;
