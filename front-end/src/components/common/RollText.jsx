// magazine-front/src/components/common/RollText.jsx
//
// Text with a "roll up" hover effect (replicated from ginivini.com's menu):
// two identical copies inside an overflow-hidden box; the second sits one line
// below (absolute). On hover of the parent button (.nav-link / .more-dropdown-btn)
// both slide up one line, so the first leaves upward and the second enters from
// below. Combines with the button's existing color hover. Styling: Header.css.
import { useEffect, useState } from 'react';

function RollText({ text }) {
  return (
    <span className="roll">
      <span className="roll__line">{text}</span>
      <span className="roll__line" aria-hidden="true">{text}</span>
    </span>
  );
}

// Texts that take turns in the same box with that roll, every `every` ms
// (the Talleres button: «Talleres» ↔ «Concursos»). The lines — the texts and
// the first one again — sit one under the other; the track rises a line at a
// time and, once the copy of the first is in, jumps back to the top unseen.
// With the animations off (or reduced motion) the texts just swap. The box
// is as wide as the longest text. The button names both (`aria-label`).
const ROLL_MS = 450;
export function CycleText({ texts, every = 3000 }) {
  const [index, setIndex] = useState(0);
  const [jump, setJump] = useState(false);
  const count = texts.length;
  useEffect(() => {
    if (count < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => i + 1), every);
    return () => clearInterval(timer);
  }, [count, every]);
  useEffect(() => {
    if (index < count) return undefined;
    const timer = setTimeout(() => { setJump(true); setIndex(0); }, ROLL_MS + 50);
    return () => clearTimeout(timer);
  }, [index, count]);
  useEffect(() => {
    if (!jump) return undefined;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setJump(false)));
    return () => cancelAnimationFrame(frame);
  }, [jump]);
  if (count < 2) return <RollText text={texts[0] || ''} />;
  return (
    <span className="roll roll--cycle" aria-hidden="true">
      <span
        className={`roll__track ${jump ? 'is-jumping' : ''}`}
        style={{ transform: `translateY(${(-index * 100) / (count + 1)}%)` }}
      >
        {[...texts, texts[0]].map((text, k) => <span key={k} className="roll__line">{text}</span>)}
      </span>
    </span>
  );
}

export default RollText;
