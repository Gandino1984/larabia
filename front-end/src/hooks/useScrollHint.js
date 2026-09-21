// magazine-front/src/hooks/useScrollHint.js
//
// Returns whether to show a "you can swipe sideways" hint over a horizontally
// scrollable container. The hint appears a short moment after mount (only if the
// content actually overflows and hasn't been scrolled yet) and is dismissed the
// first time the user scrolls or touches the container.
import { useEffect, useState } from 'react';

export function useScrollHint(ref, enabled = true, delay = 1800) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setShow(false);
      return;
    }

    let dismissed = false;
    const overflowsX = () => el.scrollWidth - el.clientWidth > 12;

    const timer = setTimeout(() => {
      if (!dismissed && overflowsX() && el.scrollLeft < 8) setShow(true);
    }, delay);

    const dismiss = () => {
      dismissed = true;
      setShow(false);
    };

    el.addEventListener('scroll', dismiss, { passive: true });
    el.addEventListener('pointerdown', dismiss);

    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', dismiss);
      el.removeEventListener('pointerdown', dismiss);
    };
  }, [ref, enabled, delay]);

  return show;
}

export default useScrollHint;
