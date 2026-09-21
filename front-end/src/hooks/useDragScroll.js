// magazine-front/src/hooks/useDragScroll.js
//
// Click/drag-to-scroll for a horizontal container (the article/project
// carousels). Touch devices already pan natively via overflow-x, so this only
// handles mouse pointers. A real drag suppresses the card click that would
// otherwise fire on release.
import { useEffect } from 'react';

export function useDragScroll(ref, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onPointerDown = (e) => {
      if (e.pointerType !== 'mouse') return; // touch pans natively
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.classList.add('is-dragging');
    };

    const onPointerMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('is-dragging');
    };

    // Swallow the click that follows a drag so a card doesn't open.
    const onClickCapture = (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, [ref, enabled]);
}

export default useDragScroll;
