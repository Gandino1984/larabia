// front-end/src/paisaje/integration/PaisajePiece.jsx
//
// A soundscape for readers (engine: Cristian Vergara — see ../README.md).
//   variant 'minimal' — article format: the piece in its circle + title + play.
//   variant 'panel'   — comic panel: the piece fills the panel + play.
// One sound at a time on the page (the others pause), and a comic panel
// pauses when it leaves the screen.
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PaisajePlayer from '../player/PaisajePlayer';
import { parseSoundscape, pieceJsonUrl, pieceAudioUrl, playerLabels } from './soundscape';
import { announceAudioStart, onOtherAudioStart } from './exclusiveAudio';
import '../converter/converter.css';
import './PaisajePiece.css';

function PaisajePiece({ soundscape, title, variant = 'minimal', staticPreview = false, audioUrl: audioUrlProp, jsonUrl: jsonUrlProp }) {
  const { t } = useTranslation();
  const piece = parseSoundscape(soundscape);
  const wrapRef = useRef(null);
  const sourceId = useId();

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
      className={`larabia-paisaje larabia-paisaje--${variant}`}
      style={variant === 'panel' && piece.width && piece.height ? { aspectRatio: `${piece.width} / ${piece.height}` } : undefined}
    >
      <PaisajePlayer
        jsonUrl={jsonUrlProp || pieceJsonUrl(piece)}
        audioUrl={audioUrlProp || pieceAudioUrl(piece)}
        peakMode={piece.mode === 'spectrum' ? 'spectrum' : 'amplitude'}
        veil={typeof piece.veil === 'number' ? piece.veil : 0.35}
        variant={variant}
        offset={variant === 'minimal' ? [piece.offsetX || 0, piece.offsetY || 0] : undefined}
        title={variant === 'minimal' ? title || undefined : undefined}
        staticPreview={staticPreview}
        locked={staticPreview}
        labels={playerLabels(t)}
      />
    </div>
  );
}

export default PaisajePiece;
