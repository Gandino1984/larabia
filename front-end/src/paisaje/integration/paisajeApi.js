// front-end/src/paisaje/integration/paisajeApi.js
//
// Uploads for the paisaje editor (back-end: /paisaje — content creators).
// The drawing is uploaded as its .paisaje.json + reference image; the audio
// is accepted at once and normalised in the background (poll its status).
import axiosInstance from '../../utils/axiosConfig';
import { buildPaisajeJson } from '../wizard/buildPaisajeJson';

/** The proxy in front of the API accepts up to 20 MB per request. */
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];

const errorOf = (err, fallback) => err?.response?.data?.error || fallback;

/** Upload a style editor's document. → { imageId, style, width, height, jsonUrl, imageUrl } */
export async function uploadDrawing(doc, userId) {
  const form = new FormData();
  form.append('points', buildPaisajeJson(doc), `${doc.name || 'dibujo'}.paisaje.json`);
  form.append('webp', doc.webp, doc.webpName || 'referencia.webp');
  if (doc.posterizedJpeg) form.append('posterized', doc.posterizedJpeg, doc.posterizedJpegName || 'posterizado.jpg');
  try {
    const res = await axiosInstance.post('/paisaje/image', form, {
      headers: { 'Content-Type': 'multipart/form-data', 'x-user-id': userId },
      timeout: 120000
    });
    return res.data.data;
  } catch (err) {
    throw new Error(errorOf(err, 'No se pudo subir el dibujo'));
  }
}

/** Upload an audio file (real progress). → audioId */
export async function uploadAudio(file, userId, onProgress) {
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await axiosInstance.post('/paisaje/audio', form, {
      headers: { 'Content-Type': 'multipart/form-data', 'x-user-id': userId },
      timeout: 10 * 60 * 1000,
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)); }
    });
    return res.data.data.audioId;
  } catch (err) {
    throw new Error(errorOf(err, 'No se pudo subir el audio'));
  }
}

export async function getAudioStatus(audioId, userId) {
  const res = await axiosInstance.get(`/paisaje/audio/${audioId}`, { headers: { 'x-user-id': userId } });
  return res.data.data;
}

/** Poll until the audio is ready or failed. `isCancelled()` stops it. */
export async function waitForAudio(audioId, userId, isCancelled = () => false) {
  for (;;) {
    if (isCancelled()) return null;
    let s;
    try {
      s = await getAudioStatus(audioId, userId);
    } catch (err) {
      throw new Error(errorOf(err, 'No se pudo consultar el audio'));
    }
    if (s.status !== 'processing') return s;
    await new Promise((r) => setTimeout(r, 1500));
  }
}
