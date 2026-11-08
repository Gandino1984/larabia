// magazine-front/src/components/workshops/workshopForm.js
//
// A workshop ↔ the values of the workshop editor (WorkshopEditor): what the
// form starts with, what's sent to the server, and the image URLs.
import { DEFAULT_CENTER } from '../maps/mapPin';
import { serverDate } from '../../utils/locale';
import { AWARD_PLACES, parseAwards, dayOf } from '../../utils/contests';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

export const resolveCover = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('blob:')) return img;
  return `${apiUrl}/${img.startsWith('/') ? img.slice(1) : img}`;
};

// A date from the API (UTC: «2026-11-20 17:00:00») → the local day and time
// the editor's «Fecha» (<input type="date">) and «Hora» (<input type="time">)
// show. Reading it as local time moved the workshop an hour or two earlier on
// every save. Two fields, not one datetime-local: with the day typed but not
// the time, that one is simply empty and the date was lost without a word.
const pad = (n) => String(n).padStart(2, '0');
const toLocalDay = (d) => {
  const dt = serverDate(d);
  return dt ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` : '';
};
const toLocalTime = (d) => {
  const dt = serverDate(d);
  return dt ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : '';
};

/** The day + time of the form as a Date (local), or null if either is missing. */
export const formDate = (form) => (form.date_day && form.date_time ? new Date(`${form.date_day}T${form.date_time}`) : null);

// A contest's awards in the form: every place, each { prize, winner }.
const toAwardsForm = (raw) => {
  const a = parseAwards(raw);
  return Object.fromEntries(AWARD_PLACES.map((p) => [p, { prize: a[p]?.prize || '', winner: a[p]?.winner || '' }]));
};

// New workshops start placed on the default location (Matiko, Uribarri); the
// creator moves the pin if it's elsewhere. `kind`: what a new one starts as
// (a saved one keeps its own: it can't change).
export const toForm = (w, kind = 'workshop') => ({
  kind_workshop: w ? (w.kind_workshop === 'contest' ? 'contest' : 'workshop') : kind,
  // A contest: sign-ups open / close (plain days), the jury's day, awards.
  registration_start_workshop: dayOf(w?.registration_start_workshop) || '',
  registration_end_workshop: dayOf(w?.registration_end_workshop) || '',
  resolution_date_workshop: dayOf(w?.resolution_date_workshop) || '',
  awards_workshop: toAwardsForm(w?.awards_workshop),
  title_workshop: w?.title_workshop || '',
  description_workshop: w?.description_workshop || '',
  location_workshop: w?.location_workshop || '',
  date_day: toLocalDay(w?.date_workshop),
  date_time: toLocalTime(w?.date_workshop),
  capacity_workshop: w?.capacity_workshop ?? '',
  audience_workshop: w?.audience_workshop === 'infantil' ? 'infantil' : 'general',
  // Who books: false = socios/as and the team (the default), true = anyone signed in.
  free_workshop: w?.free_workshop === true || w?.free_workshop === 1,
  lat_workshop: w?.lat_workshop ?? DEFAULT_CENTER[0],
  lng_workshop: w?.lng_workshop ?? DEFAULT_CENTER[1]
});

// Its talleristas; a new workshop starts with whoever creates it.
export const toAuthors = (w, currentUser) => (
  w
    ? (w.authors || []).map((a) => ({ id_user: a.id_user, name_user: a.name_user, image_user: a.image_user }))
    : (currentUser ? [{ id_user: currentUser.id_user, name_user: currentUser.name_user, image_user: currentUser.image_user }] : [])
);

export const toPayload = (form, authors) => (form.kind_workshop === 'contest' ? {
  kind_workshop: 'contest',
  title_workshop: form.title_workshop.trim(),
  description_workshop: form.description_workshop.trim() || null,
  registration_start_workshop: form.registration_start_workshop || null,
  registration_end_workshop: form.registration_end_workshop || null,
  resolution_date_workshop: form.resolution_date_workshop || null,
  awards_workshop: Object.fromEntries(AWARD_PLACES.map((p) => [p, {
    prize: form.awards_workshop[p].prize.trim(),
    winner: form.awards_workshop[p].winner.trim()
  }])),
  authors: authors.map((a, i) => ({ user_id: a.id_user, author_order: i }))
} : {
  kind_workshop: 'workshop',
  title_workshop: form.title_workshop.trim(),
  description_workshop: form.description_workshop.trim() || null,
  location_workshop: form.location_workshop.trim() || null,
  date_workshop: formDate(form) ? formDate(form).toISOString() : null,
  capacity_workshop: form.capacity_workshop === '' ? null : Number(form.capacity_workshop),
  audience_workshop: form.audience_workshop,
  free_workshop: !!form.free_workshop,
  lat_workshop: form.lat_workshop,
  lng_workshop: form.lng_workshop,
  authors: authors.map((a, i) => ({ user_id: a.id_user, author_order: i }))
});
