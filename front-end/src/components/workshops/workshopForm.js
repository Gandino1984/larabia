// magazine-front/src/components/workshops/workshopForm.js
//
// A workshop ↔ the values of the workshop editor (WorkshopEditor): what the
// form starts with, what's sent to the server, and the image URLs.
import { DEFAULT_CENTER } from '../maps/mapPin';
import { serverDate } from '../../utils/locale';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

export const resolveAvatar = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
};

export const resolveCover = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('blob:')) return img;
  return `${apiUrl}/${img.startsWith('/') ? img.slice(1) : img}`;
};

// A date from the API (UTC: «2026-11-20 17:00:00») → the local time an
// <input type="datetime-local"> shows. Reading it as local time moved the
// workshop an hour or two earlier on every save.
const toLocalInput = (d) => {
  const dt = serverDate(d);
  if (!dt) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

// New workshops start placed on the default location (Matiko, Uribarri); the
// creator moves the pin if it's elsewhere.
export const toForm = (w) => ({
  title_workshop: w?.title_workshop || '',
  description_workshop: w?.description_workshop || '',
  location_workshop: w?.location_workshop || '',
  date_workshop: toLocalInput(w?.date_workshop),
  capacity_workshop: w?.capacity_workshop ?? '',
  audience_workshop: w?.audience_workshop === 'infantil' ? 'infantil' : 'general',
  lat_workshop: w?.lat_workshop ?? DEFAULT_CENTER[0],
  lng_workshop: w?.lng_workshop ?? DEFAULT_CENTER[1]
});

// Its talleristas; a new workshop starts with whoever creates it.
export const toAuthors = (w, currentUser) => (
  w
    ? (w.authors || []).map((a) => ({ id_user: a.id_user, name_user: a.name_user, image_user: a.image_user }))
    : (currentUser ? [{ id_user: currentUser.id_user, name_user: currentUser.name_user, image_user: currentUser.image_user }] : [])
);

export const toPayload = (form, authors) => ({
  title_workshop: form.title_workshop.trim(),
  description_workshop: form.description_workshop.trim() || null,
  location_workshop: form.location_workshop.trim() || null,
  date_workshop: form.date_workshop ? new Date(form.date_workshop).toISOString() : null,
  capacity_workshop: form.capacity_workshop === '' ? null : Number(form.capacity_workshop),
  audience_workshop: form.audience_workshop,
  lat_workshop: form.lat_workshop,
  lng_workshop: form.lng_workshop,
  authors: authors.map((a, i) => ({ user_id: a.id_user, author_order: i }))
});
