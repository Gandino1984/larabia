// front-end/src/paisaje/integration/paisajeApi.js
//
// Uploads for the paisaje editor (back-end: /paisaje — content creators).
// The drawing is uploaded as its .paisaje.json + reference image; the audio
// is accepted at once and normalised in the background (poll its status).
import axiosInstance from '../../utils/axiosConfig';
import i18n from '../../i18n/config';
import { buildPaisajeJson } from '../wizard/buildPaisajeJson';

// Audio: the magazine's shared pipeline (any size → AAC normalised).
export { AUDIO_EXTENSIONS, AUDIO_ACCEPT, uploadAudio, getAudioStatus, waitForAudio } from '../../utils/audioUpload';

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
    throw new Error(errorOf(err, i18n.t('messages.error.uploadDrawing', 'No se pudo subir el dibujo')));
  }
}
