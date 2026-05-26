// magazine-front/src/hooks/usePreloader.js
import { useState, useEffect, useRef } from 'react';
import { useMagazine } from '../app_context/MagazineContext';

/**
 * Custom hook to preload home page content (featured articles only).
 *
 * Progress stages:
 *   25%      – waiting for featured articles to load
 *   60–95%   – preloading featured cover images
 *   100%     – done
 *
 * Timeouts:
 *   Hard (15s) – absolute fallback, fires regardless of state
 *   Soft (8s)  – skip remaining images if they are slow
 */
export const usePreloader = () => {
  const { featuredArticles, featuredLoaded } = useMagazine();
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const hasCompletedRef = useRef(false);

  // Hard timeout — absolute maximum from mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.log('Preloader: Hard timeout (15s), forcing completion');
        hasCompletedRef.current = true;
        setProgress(100);
        setTimeout(() => setIsLoading(false), 300);
      }
    }, 15000);
    return () => clearTimeout(t);
  }, []);

  // Main preloader effect
  useEffect(() => {
    if (hasCompletedRef.current) return;

    // Stage 1: featured articles still loading
    if (!featuredLoaded) {
      setProgress(25);
      return;
    }

    // Stage 2: featured articles ready — preload cover images
    setProgress(60);

    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    const imageUrls = [...new Set(
      featuredArticles.map(article => {
        const cover = article?.cover_image_article;
        if (!cover) return '/logoFondoNegro.jpg';
        return cover.startsWith('/') ? cover : `${apiUrl}/${cover}`;
      })
    )];

    let cancelled = false;

    const imagePromises = imageUrls.map((url, index) =>
      new Promise(resolve => {
        const img = new Image();
        const imgTimeout = setTimeout(() => resolve(), 5000);
        img.onload = img.onerror = () => {
          clearTimeout(imgTimeout);
          setProgress(Math.round(60 + ((index + 1) / imageUrls.length) * 35));
          resolve();
        };
        img.src = url;
      })
    );

    // Soft timeout: if images take more than 8s, complete anyway
    const softTimeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.log('Preloader: Soft timeout — images slow, completing');
        cancelled = true;
        hasCompletedRef.current = true;
        setProgress(100);
        setTimeout(() => setIsLoading(false), 300);
      }
    }, 8000);

    Promise.all(imagePromises)
      .then(() => {
        if (!cancelled && !hasCompletedRef.current) {
          console.log('Preloader: All featured content loaded successfully');
          hasCompletedRef.current = true;
          setProgress(100);
          setTimeout(() => setIsLoading(false), 300);
        }
      })
      .catch(() => {
        if (!cancelled && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setProgress(100);
          setTimeout(() => setIsLoading(false), 500);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(softTimeout);
    };
  }, [featuredArticles, featuredLoaded]);

  return { isLoading, progress };
};
