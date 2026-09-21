// magazine-front/src/components/common/ScrollHint.jsx
//
// A small "you can scroll" affordance: the classic pointing-hand icon with a
// gentle looping motion. Two directions:
//   - "down"       → hints at vertical scroll (used on the hero).
//   - "horizontal" → hints at sideways swipe (used on scrollable carousels).
// Purely decorative: it never captures pointer events.
import { Pointer } from 'lucide-react';
import './ScrollHint.css';

function ScrollHint({ direction = 'down', label }) {
  return (
    <div className={`scroll-hint scroll-hint--${direction}`} aria-hidden="true">
      <span className="scroll-hint__hand">
        <Pointer size={26} strokeWidth={2} />
      </span>
      {label && <span className="scroll-hint__label">{label}</span>}
    </div>
  );
}

export default ScrollHint;
