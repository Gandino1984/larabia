// magazine-front/src/components/common/ScrollHint.jsx
//
// A "you can scroll" affordance. Small screens show the classic pointing-hand
// icon; large screens show a mouse (you scroll with a wheel, not a finger).
// Which one is visible is decided in CSS via a media query. Two directions:
//   - "down"       → hints at vertical scroll (used on the hero).
//   - "horizontal" → hints at sideways swipe (used on scrollable carousels).
// Purely decorative: it never captures pointer events.
import { Pointer, Mouse, ArrowUpDown, ArrowLeftRight } from 'lucide-react';
import './ScrollHint.css';

const Icons = () => (
  <>
    <Pointer className="scroll-hint__icon scroll-hint__icon--hand" strokeWidth={2} />
    <Mouse className="scroll-hint__icon scroll-hint__icon--mouse" strokeWidth={2} />
  </>
);

function ScrollHint({ direction = 'down', label, labelDesktop, visible = true, dual = false }) {
  // "dual": two icons side by side — one bobbing vertically, one horizontally —
  // to convey both scroll-down and swipe-sideways at once (hand on mobile,
  // mouse on desktop, via CSS).
  if (dual) {
    return (
      <div className={`scroll-hint scroll-hint--dual${visible ? ' is-visible' : ''}`} aria-hidden="true">
        {label && (
          <span className={`scroll-hint__label${labelDesktop ? ' scroll-hint__label--mobile' : ''}`}>{label}</span>
        )}
        {labelDesktop && (
          <span className="scroll-hint__label scroll-hint__label--desktop">{labelDesktop}</span>
        )}
        <span className="scroll-hint__dual-row">
          <span className="scroll-hint__dual-item">
            <span className="scroll-hint__hand scroll-hint__hand--bob-y"><Icons /></span>
            <ArrowUpDown className="scroll-hint__dir" strokeWidth={2.5} />
          </span>
          <span className="scroll-hint__dual-item">
            <span className="scroll-hint__hand scroll-hint__hand--bob-x"><Icons /></span>
            <ArrowLeftRight className="scroll-hint__dir" strokeWidth={2.5} />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={`scroll-hint scroll-hint--${direction}${visible ? ' is-visible' : ''}`} aria-hidden="true">
      {label && (
        <span className={`scroll-hint__label${labelDesktop ? ' scroll-hint__label--mobile' : ''}`}>{label}</span>
      )}
      {labelDesktop && (
        <span className="scroll-hint__label scroll-hint__label--desktop">{labelDesktop}</span>
      )}
      <span className="scroll-hint__dual-item">
        <span className="scroll-hint__hand">
          <Icons />
        </span>
        {direction === 'horizontal'
          ? <ArrowLeftRight className="scroll-hint__dir" strokeWidth={2.5} />
          : <ArrowUpDown className="scroll-hint__dir" strokeWidth={2.5} />}
      </span>
    </div>
  );
}

export default ScrollHint;
