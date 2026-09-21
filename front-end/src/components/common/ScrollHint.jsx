// magazine-front/src/components/common/ScrollHint.jsx
//
// A "you can scroll" affordance. Small screens show the classic pointing-hand
// icon; large screens show a mouse (you scroll with a wheel, not a finger).
// Which one is visible is decided in CSS via a media query. Two directions:
//   - "down"       → hints at vertical scroll (used on the hero).
//   - "horizontal" → hints at sideways swipe (used on scrollable carousels).
// Purely decorative: it never captures pointer events.
import { Pointer, Mouse } from 'lucide-react';
import './ScrollHint.css';

function ScrollHint({ direction = 'down', label }) {
  return (
    <div className={`scroll-hint scroll-hint--${direction}`} aria-hidden="true">
      <span className="scroll-hint__hand">
        <Pointer className="scroll-hint__icon scroll-hint__icon--hand" strokeWidth={2} />
        <Mouse className="scroll-hint__icon scroll-hint__icon--mouse" strokeWidth={2} />
      </span>
      {label && <span className="scroll-hint__label">{label}</span>}
    </div>
  );
}

export default ScrollHint;
