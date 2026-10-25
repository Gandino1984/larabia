// magazine-front/src/components/gallery/galleryUtils.js — small helpers
// shared by the Galería's components.
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

/** A work's image (the API gives a path: /uploads/gallery/…). */
export const workImageUrl = (path) => (!path ? null : path.startsWith('http') ? path : `${apiUrl}${path.startsWith('/') ? path : `/${path}`}`);

/** An illustration's title (a "work" in the API) — «Sin título» when it has none. */
export const workTitle = (work, t) => work?.title_work || t('gallery.untitled', 'Sin título');

/** An obra's title (a "piece" in the API) — «Sin título» when it has none. */
export const pieceTitle = (piece, t) => piece?.title_piece || t('gallery.untitled', 'Sin título');

/** «1200 × 800 px» (nothing if the size isn't known). */
export const workSize = (work, t) => (work?.width_px && work?.height_px
  ? t('gallery.sizePx', { w: work.width_px, h: work.height_px, defaultValue: '{{w}} × {{h}} px' })
  : '');

/** An exhibition's title — the artist's name when it has none. */
export const exhibitionTitle = (exhibition) => exhibition?.title || exhibition?.artist?.name_user || '';
