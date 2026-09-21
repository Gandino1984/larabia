// magazine-front/src/hooks/useScrollHint.js
//
// Returns whether to show a scroll/swipe help hint over a target element. Uses
// an IntersectionObserver so it works regardless of which element is the scroll
// container (the page scrolls on <body> here, so window-scroll listeners are
// unreliable). The hint appears when the element enters the viewport — on first
// load and on every normal reload, for whatever the user is looking at — then
// auto-hides, hides when the element leaves the viewport, and (for horizontal
// carousels) is dismissed for good by a real sideways scroll.
import { useEffect, useState } from 'react';

export function useScrollHint(
  ref,
  enabled = true,
  { delay = 300, autoHide = 7000, requireOverflowX = true, threshold = 0.4 } = {}
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

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (dismissed) return;
        if (e.isIntersecting) {
          if (!shown && (!requireOverflowX || (overflowsX() && el.scrollLeft < 8))) {
            shown = true;
            showTimer = setTimeout(() => {
              if (dismissed) return;
              setShow(true);
              hideTimer = setTimeout(() => setShow(false), autoHide);
            }, delay);
          }
        } else {
          // Left the viewport — hide (and cancel a pending show).
          setShow(false);
          clearTimeout(showTimer);
          clearTimeout(hideTimer);
        }
      },
      { threshold }
    );
    io.observe(el);

    // A real horizontal scroll of the carousel dismisses it for good (checking
    // the offset avoids a spurious scroll-snap event at ~0 on load).
    const onTrackScroll = () => {
      if (requireOverflowX && el.scrollLeft > 12) {
        dismissed = true;
        setShow(false);
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      }
    };
    el.addEventListener('scroll', onTrackScroll, { passive: true });

    return () => {
      io.disconnect();
      el.removeEventListener('scroll', onTrackScroll);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [ref, enabled, delay, autoHide, requireOverflowX, threshold]);

  return show;
}

export default useScrollHint;
