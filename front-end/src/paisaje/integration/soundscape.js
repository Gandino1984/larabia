// front-end/src/paisaje/integration/soundscape.js
//
// La Rabia ⇄ paisaje sonoro: the piece stored on a block (`soundscape_data`,
// normalised by the back-end — see back-end/controllers/paisaje/paisaje_store.js)
// and the URLs of its files (served with CORS under /paisaje-files).
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Absolute URL of a back-end path. */
export const apiFile = (p) => {
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('blob:')) return p;
  return `${API}${p.startsWith('/') ? p : `/${p}`}`;
};

/** The piece of a block: soundscape_data is a JSON string from the server,
 *  or an object while it's being edited. */
export function parseSoundscape(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

export const pieceJsonUrl = (s) => apiFile(`/paisaje-files/images/${s.imageId}.json`);
export const pieceAudioUrl = (s) => apiFile(`/paisaje-files/audio/${s.audioId}.m4a`);

/** A piece can be saved once it has a drawing and a processed audio. */
export const isPieceComplete = (raw) => {
  const s = parseSoundscape(raw);
  return !!(s && s.imageId && s.audioId);
};

/** What the server keeps of a draft (it derives the rest). */
export const pieceForSave = (s) => s && ({
  imageId: s.imageId,
  audioId: s.audioId,
  mode: s.mode,
  veil: s.veil,
  offsetX: s.offsetX ?? 0,
  offsetY: s.offsetY ?? 0
});

/** Player texts in the reader's language (PaisajePlayer `labels`). */
export const playerLabels = (t) => ({
  loading: t('paisaje.player.loading', 'Cargando…'),
  enableAudio: t('paisaje.player.enableAudio', 'Pulsa play para activar el sonido'),
  play: t('paisaje.player.play', 'Reproducir'),
  pause: t('paisaje.player.pause', 'Pausar'),
  playPiece: t('paisaje.player.playPiece', 'Reproducir paisaje sonoro'),
  progress: t('paisaje.player.progress', 'Progreso'),
  mute: t('paisaje.player.mute', 'Silenciar'),
  unmute: t('paisaje.player.unmute', 'Activar sonido'),
  volume: t('paisaje.player.volume', 'Volumen'),
  svgLabel: t('paisaje.player.svgLabel', 'Paisaje sonoro'),
  audioError: t('paisaje.player.audioError', 'No se pudo cargar el audio.')
});
