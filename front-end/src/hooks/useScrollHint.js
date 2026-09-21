// magazine-front/src/hooks/useScrollHint.js
//
// Returns whether to show a scroll/swipe help hint over a target element. The
// hint appears when the element is in the viewport (so it shows on first load
// and on every normal reload — regardless of restored scroll position — for
// whatever element the user is actually looking at). It auto-hides after a few
// seconds, hides if the element leaves the viewport, and (for horizontal
// carousels) is dismissed by a real sideways scroll.
import { useEffect, useState } from 'react';

export function useScrollHint(
  ref,
  enabled = true,
  { delay = 500, autoHide = 6000, requireOverflowX = true } = {}
) {
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
      return r.top < vh * 0.8 && r.bottom > vh * 0.2;
    };
    const canReveal = () =>
      inView() && (!requireOverflowX || (overflowsX() && el.scrollLeft < 8));

    const onView = () => {
      if (dismissed) return;
      if (!shown) {
        if (canReveal()) {
          shown = true;
          showTimer = setTimeout(() => {
            if (dismissed) return;
            // Re-check in view at fire time (scroll may have been restored).
            if (inView()) {
              setShow(true);
              hideTimer = setTimeout(() => setShow(false), autoHide);
            } else {
              shown = false; // let it reveal later when scrolled into view
            }
          }, delay);
        }
      } else if (!inView()) {
        // Once shown, hide as soon as the element leaves the viewport.
        setShow(false);
      }
    };

    // A real horizontal scroll of the carousel dismisses it for good.
    const onTrackScroll = () => {
      if (requireOverflowX && el.scrollLeft > 12) {
        dismissed = true;
        setShow(false);
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      }
    };

    window.addEventListener('scroll', onView, { passive: true });
    window.addEventListener('resize', onView);
    el.addEventListener('scroll', onTrackScroll, { passive: true });
    // Check on mount, and again on the next frame in case reload restored the
    // scroll position after the first paint.
    onView();
    const raf = requestAnimationFrame(onView);

    return () => {
      window.removeEventListener('scroll', onView);
      window.removeEventListener('resize', onView);
      el.removeEventListener('scroll', onTrackScroll);
      cancelAnimationFrame(raf);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [ref, enabled, delay, autoHide, requireOverflowX]);

  return show;
}

export default useScrollHint;
