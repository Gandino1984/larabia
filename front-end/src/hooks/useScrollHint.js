// magazine-front/src/hooks/useScrollHint.js
//
// Returns whether to show a "you can swipe sideways" hint over a horizontally
// scrollable container. The hint appears when the container is in view (so it's
// actually seen, including on mobile where it starts off-screen), only if the
// content overflows and hasn't been scrolled yet. It auto-hides after a few
// seconds and is dismissed as soon as the user scrolls the carousel horizontally.
import { useEffect, useState } from 'react';

export function useScrollHint(ref, enabled = true, { delay = 500, autoHide = 6000 } = {}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setShow(false);
      return;
    }

    let shown = false;
    let dismissed = false;
    let showTimer;
    let hideTimer;

    const overflowsX = () => el.scrollWidth - el.clientWidth > 12;
    const inView = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return r.top < vh * 0.85 && r.bottom > vh * 0.15;
    };

    const tryReveal = () => {
      if (shown || dismissed) return;
      if (inView() && overflowsX() && el.scrollLeft < 8) {
        window.removeEventListener('scroll', tryReveal);
        showTimer = setTimeout(() => {
          if (dismissed) return;
          shown = true;
          setShow(true);
          hideTimer = setTimeout(() => setShow(false), autoHide);
        }, delay);
      }
    };

    // A real horizontal scroll of the carousel dismisses it (checking the actual
    // offset avoids a spurious scroll-snap event at ~0 on load).
    const onTrackScroll = () => {
      if (el.scrollLeft > 12) {
        dismissed = true;
        setShow(false);
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      }
    };

    window.addEventListener('scroll', tryReveal, { passive: true });
    el.addEventListener('scroll', onTrackScroll, { passive: true });
    // Check once in case the section is already on screen.
    tryReveal();

    return () => {
      window.removeEventListener('scroll', tryReveal);
      el.removeEventListener('scroll', onTrackScroll);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [ref, enabled, delay, autoHide]);

  return show;
}

export default useScrollHint;
