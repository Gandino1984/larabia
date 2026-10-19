// front-end/src/utils/audioUpload.js
//
// Every audio the magazine stores goes through ONE pipeline (back-end
// /paisaje/audio — content creators): upload of any size and format (WAV
// recommended: best quality), converted to AAC 192 kbps with the volume
// normalised to −16 LUFS (ffmpeg, in the background), original discarded.
// Used by paisajes sonoros, comic audio panels and micro-perfiles.
import axiosInstance from './axiosConfig';
import i18n from '../i18n/config';

export const AUDIO_EXTENSIONS = ['wav', 'flac', 'aiff', 'aif', 'mp3', 'm4a', 'aac', 'ogg', 'opus', 'webm', 'mp4'];
export const AUDIO_ACCEPT = `${AUDIO_EXTENSIONS.map((e) => `.${e}`).join(',')},audio/*`;

/** Is this file in an accepted format (by extension)? */
export const isAcceptedAudio = (file) =>
  AUDIO_EXTENSIONS.includes((file?.name?.split('.').pop() || '').toLowerCase());

const errorOf = (err, fallback) => err?.response?.data?.error || fallback;

/** Upload (real progress 0–100). → audioId; processing continues on the server. */
export async function uploadAudio(file, userId, onProgress) {
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await axiosInstance.post('/paisaje/audio', form, {
      headers: { 'Content-Type': 'multipart/form-data', 'x-user-id': userId },
      timeout: 4 * 60 * 60 * 1000, // big files on slow connections
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)); }
    });
    return res.data.data.audioId;
  } catch (err) {
    throw new Error(errorOf(err, i18n.t('messages.error.uploadAudio', 'No se pudo subir el audio')));
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
      throw new Error(errorOf(err, i18n.t('messages.error.checkAudio', 'No se pudo consultar el audio')));
    }
    if (s.status !== 'processing') return s;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/** Upload + wait: → the stored audio's path (AAC), or throws with a message. */
export async function uploadAndProcessAudio(file, userId, onProgress) {
  const audioId = await uploadAudio(file, userId, onProgress);
  const s = await waitForAudio(audioId, userId);
  if (!s || s.status !== 'ready') throw new Error(s?.message || 'No se pudo procesar el audio');
  return s.audioUrl;
}
