// magazine-front/src/hooks/useScrollHint.js
//
// Returns whether to show a "you can swipe sideways" hint over a horizontally
// scrollable container. The hint appears when the container scrolls into view
// (so it's actually seen, including on mobile where it may start off-screen),
// only if the content overflows and hasn't been scrolled yet. It auto-hides
// after a few seconds and is dismissed the moment the user scrolls the carousel
// horizontally.
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

    const reveal = () => {
      if (shown || dismissed) return;
      showTimer = setTimeout(() => {
        if (!dismissed && overflowsX() && el.scrollLeft < 8) {
          shown = true;
          setShow(true);
          hideTimer = setTimeout(() => setShow(false), autoHide);
        }
      }, delay);
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && reveal()),
      { threshold: 0.15 }
    );
    io.observe(el);

    // Only a real horizontal scroll of the carousel dismisses it. We check the
    // actual offset because scroll-snap can fire a spurious scroll event at ~0
    // on load, which would otherwise dismiss the hint before it ever appears.
    const onScroll = () => {
      if (el.scrollLeft > 12) {
        dismissed = true;
        setShow(false);
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      el.removeEventListener('scroll', onScroll);
    };
  }, [ref, enabled, delay, autoHide]);

  return show;
}

export default useScrollHint;
