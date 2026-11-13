// front-end/src/paisaje/integration/PaisajePiece.jsx
//
// A soundscape for readers (engine: Cristian Vergara — see ../README.md).
//   variant 'minimal' — article format: the piece in its circle + title + play.
//   variant 'panel'   — comic panel: the same circle (with its framing),
//                       sized to the panel, over the comic's canvas; the
//                       title unfolds to the right of the play button while
//                       the audio plays.
// Both are the engine's own 'minimal' presentation. The title is the audio's
// (soundscape_data.audioTitle) or else `title` (the article's).
// One sound at a time on the page (the others pause), and a comic panel
// pauses when it leaves the screen. Entering a comic panel, its play button
// shows up big in the middle of what's on screen, pulses, then glides to its
// corner (`onEnter` tells the comic viewer the reader got there).
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PaisajePlayer from '../player/PaisajePlayer';
import { audioTitleOf, parseSoundscape, pieceJsonUrl, pieceAudioUrl, playerLabels } from './soundscape';
import { announceAudioStart, onOtherAudioStart } from './exclusiveAudio';
import { clippingAncestors, isMostlyVisible, visibleRect, VISIBILITY_THRESHOLDS } from '../../utils/visibility';
import '../converter/converter.css';
import './PaisajePiece.css';

// How long the play button stays big in the middle before going to its corner.
const INTRO_HOLD_MS = 2400;
const DOCK_MS = 1000;
// Shown anyway if the panel stays on screen this long without "entering".
const REVEAL_FALLBACK_MS = 2000;
// The title waits for the play button to reach its corner when play is
// pressed during the entry.
const TITLE_AFTER_DOCK_MS = 800;

function PaisajePiece({ soundscape, title, variant = 'minimal', staticPreview = false, audioUrl: audioUrlProp, jsonUrl: jsonUrlProp, onEnter }) {
  const { t } = useTranslation();
  const piece = parseSoundscape(soundscape);
  const shownTitle = audioTitleOf(piece, title);
  const wrapRef = useRef(null);
  const titleRef = useRef(null);
  const sourceId = useId();
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  // The intro (comic panels only; not with reduced motion). Driven on the DOM
  // (data-intro: armed → center → dock → done), so the player never
  // re-renders for it. Fixed at mount: React then never rewrites the
  // attribute.
  const [introEnabled] = useState(() => (
    variant === 'panel' && !staticPreview
    && typeof IntersectionObserver !== 'undefined'
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    const el = wrapRef.current;
    if (variant !== 'panel' || staticPreview || !el || typeof IntersectionObserver === 'undefined') return undefined;
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
    const playing = () => { const a = el.querySelector('audio'); return !!a && !a.paused; };

    const dock = () => {
      if (state !== 'center') return;
      clearTimeout(holdTimer);
      cancelAnimationFrame(frame);
      set('dock');
      dockTimer = setTimeout(() => set('done'), DOCK_MS);
    };
    const startIntro = () => {
      const btn = el.querySelector('.paisaje-play-minimal');
      if (!btn || playing()) { set('done'); return; }
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
        if (introEnabled && !playing()) set('armed');
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

    // Pressing play while it's in the middle sends it to its corner at once.
    const onPlay = (e) => { if (e.target.tagName === 'AUDIO') dock(); };
    el.addEventListener('play', onPlay, true);
    return () => { io.disconnect(); clearTimers(); el.removeEventListener('play', onPlay, true); };
  }, [variant, staticPreview, introEnabled]);

  // Comic panels: the title next to the play button while the audio plays.
  // On the DOM (data-playing), like the entry: the player never re-renders.
  // Placed from the button's layout position (offsets ignore the entry's
  // transform): just right of it, level with its middle.
  useEffect(() => {
    const el = wrapRef.current;
    if (variant !== 'panel' || staticPreview || !el) return undefined;
    const place = () => {
      const btn = el.querySelector('.paisaje-play-minimal');
      const label = titleRef.current;
      if (!btn || !label) return;
      let x = btn.offsetLeft + btn.offsetWidth;
      let y = btn.offsetTop + btn.offsetHeight / 2;
      for (let n = btn.offsetParent; n && n !== el && el.contains(n); n = n.offsetParent) {
        x += n.offsetLeft;
        y += n.offsetTop;
      }
      // As wide as fits in the panel — and in the viewer, when the panel is
      // wider than it (a phone held upright shows its left side).
      const room = Math.min(el.clientWidth, ...clippingAncestors(el).map((c) => c.clientWidth || Infinity));
      label.style.setProperty('--title-x', `${Math.round(x + 10)}px`);
      label.style.setProperty('--title-y', `${Math.round(y)}px`);
      label.style.setProperty('--title-max', `${Math.max(80, Math.round(room - x - 10 - 12))}px`);
    };
    const onPlay = (e) => {
      if (e.target.tagName !== 'AUDIO') return;
      place();
      const entering = el.dataset.intro === 'center' || el.dataset.intro === 'dock';
      titleRef.current?.style.setProperty('--title-delay', entering ? `${TITLE_AFTER_DOCK_MS}ms` : '0ms');
      el.dataset.playing = 'true';
    };
    const onStop = (e) => { if (e.target.tagName === 'AUDIO') delete el.dataset.playing; };
    el.addEventListener('play', onPlay, true);
    el.addEventListener('pause', onStop, true);
    el.addEventListener('ended', onStop, true);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('play', onPlay, true);
      el.removeEventListener('pause', onStop, true);
      el.removeEventListener('ended', onStop, true);
      ro?.disconnect();
    };
  }, [variant, staticPreview]);

  // Exclusive playback: 'play' doesn't bubble, so listen in the capture phase.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onPlay = (e) => { if (e.target.tagName === 'AUDIO') announceAudioStart(sourceId); };
    el.addEventListener('play', onPlay, true);
    const off = onOtherAudioStart(sourceId, () => el.querySelector('audio')?.pause());
    return () => { el.removeEventListener('play', onPlay, true); off(); };
  }, [sourceId]);

  // Comic panels: stop when scrolled away.
  useEffect(() => {
    const el = wrapRef.current;
    if (variant !== 'panel' || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) el.querySelector('audio')?.pause();
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [variant]);

  if (!piece?.imageId || !piece?.audioId) return null;

  return (
    <div
      ref={wrapRef}
      className={`larabia-paisaje larabia-paisaje--${variant}${variant === 'panel' ? (piece.height > piece.width ? ' is-tall' : ' is-wide') : ''}`}
      data-intro={introEnabled ? 'armed' : undefined}
    >
      <PaisajePlayer
        jsonUrl={jsonUrlProp || pieceJsonUrl(piece)}
        audioUrl={audioUrlProp || pieceAudioUrl(piece)}
        peakMode={piece.mode === 'spectrum' ? 'spectrum' : 'amplitude'}
        veil={typeof piece.veil === 'number' ? piece.veil : 0.35}
        variant="minimal"
        offset={[piece.offsetX || 0, piece.offsetY || 0]}
        title={variant === 'minimal' ? shownTitle || undefined : undefined}
        staticPreview={staticPreview}
        locked={staticPreview}
        labels={playerLabels(t)}
      />
      {variant === 'panel' && !staticPreview && shownTitle && (
        <p ref={titleRef} className="larabia-paisaje__title" title={shownTitle}>
          <span>{shownTitle}</span>
        </p>
      )}
    </div>
  );
}

export default PaisajePiece;
