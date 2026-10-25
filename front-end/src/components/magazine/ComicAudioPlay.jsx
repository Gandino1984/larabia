// magazine-front/src/components/magazine/ComicAudioPlay.jsx
//
// The play button of a comic panel with audio: bottom-left, like a paisaje
// sonoro panel's (paisaje/integration/PaisajePiece.jsx), with the same entry —
// reaching the panel, the button shows up big in the middle of what's on
// screen, pulses, then glides to its corner (`onEnter` tells the viewer the
// reader got there). The audio itself is the viewer's (HScrollViewer): it can
// go on over the next panels, so it doesn't pause when this one leaves.
import { useEffect, useRef, useState } from 'react';
import { clippingAncestors, isMostlyVisible, visibleRect, VISIBILITY_THRESHOLDS } from '../../utils/visibility';

// The same times as a paisaje panel's intro.
const INTRO_HOLD_MS = 2400;
const DOCK_MS = 1000;
const REVEAL_FALLBACK_MS = 2000;

function ComicAudioPlay({ playing, time, onToggle, onEnter, label }) {
  const wrapRef = useRef(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;
  const dockRef = useRef(null);

  // Driven on the DOM (data-intro: armed → center → dock → done), as in
  // PaisajePiece. Not with reduced motion.
  const [introEnabled] = useState(() => (
    typeof IntersectionObserver !== 'undefined'
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    let state = introEnabled ? 'armed' : 'done';
    let entered = false;
    let holdTimer = null;
    let dockTimer = null;
    let revealTimer = null;
    let frame = null;
    const set = (next) => { state = next; if (introEnabled) el.dataset.intro = next; };
    const clearTimers = () => {
      clearTimeout(holdTimer); clearTimeout(dockTimer); clearTimeout(revealTimer); revealTimer = null;
      cancelAnimationFrame(frame);
    };

    const dock = () => {
      if (state !== 'center') return;
      clearTimeout(holdTimer);
      cancelAnimationFrame(frame);
      set('dock');
      dockTimer = setTimeout(() => set('done'), DOCK_MS);
    };
    dockRef.current = dock;
    const startIntro = () => {
      const btn = el.querySelector('.comic-audio__play');
      if (!btn || playingRef.current) { set('done'); return; }
      // Its resting place (centre), relative to the panel.
      const b = btn.getBoundingClientRect();
      const r0 = el.getBoundingClientRect();
      const rest = { x: b.left + b.width / 2 - r0.left, y: b.top + b.height / 2 - r0.top };
      const clippers = clippingAncestors(el);
      // Every frame while it waits in the middle: aim at the centre of what's
      // on screen of the panel — the viewer may still be gliding to it.
      const aim = () => {
        const r = el.getBoundingClientRect();
        const seen = visibleRect(el, clippers);
        if (seen.width > 0 && seen.height > 0) {
          el.style.setProperty('--intro-dx', `${Math.round(seen.left + seen.width / 2 - (r.left + rest.x))}px`);
          el.style.setProperty('--intro-dy', `${Math.round(seen.top + seen.height / 2 - (r.top + rest.y))}px`);
        }
        if (state === 'center') frame = requestAnimationFrame(aim);
      };
      set('center');
      aim();
      holdTimer = setTimeout(dock, INTRO_HOLD_MS);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        // Left the screen: next time it comes in, the intro plays again.
        entered = false;
        clearTimers();
        if (introEnabled && !playingRef.current) set('armed');
        return;
      }
      if (!entered && isMostlyVisible(entry)) {
        entered = true;
        clearTimeout(revealTimer); revealTimer = null;
        onEnterRef.current?.();
        if (state === 'armed') startIntro();
      } else if (state === 'armed' && !revealTimer) {
        // On screen but never quite "entered" (odd sizes): show it anyway.
        revealTimer = setTimeout(() => { if (state === 'armed') set('done'); }, REVEAL_FALLBACK_MS);
      }
    }, { threshold: VISIBILITY_THRESHOLDS });
    io.observe(el);
    return () => { io.disconnect(); clearTimers(); dockRef.current = null; };
  }, [introEnabled]);

  // Pressing play while it's in the middle sends it to its corner at once.
  useEffect(() => { if (playing) dockRef.current?.(); }, [playing]);

  return (
    <div ref={wrapRef} className="comic-audio" data-intro={introEnabled ? 'armed' : undefined}>
      <div className="comic-audio__chrome">
        <button
          type="button"
          className="comic-audio__play"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={label}
          aria-pressed={playing}
        >
          {/* The paisaje player's own icons. */}
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M8 5 L19 12 L8 19 Z" />
            </svg>
          )}
        </button>
        {time && <span className="comic-audio__time" role="timer" aria-live="off">{time}</span>}
      </div>
    </div>
  );
}

export default ComicAudioPlay;
