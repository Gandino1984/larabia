// magazine-front/src/utils/workshopFilters.js
//
// Filtering + sorting for the workshops page (WorkshopFilters): text search,
// when (all — the finished ones too, after the upcoming: the default — or
// only the upcoming: the page's «Ocultar talleres finalizados» button),
// month, instructor, availability, access (free / for socios/as) and order.
// Pure functions — the UI lives in components/workshops/WorkshopFilters.jsx.
import { serverDate } from './locale';
import { isContest, contestLastDay } from './contests';

export const EMPTY_WORKSHOP_FILTERS = {
  q: '',
  when: 'all',        // 'all' | 'upcoming' | 'past'
  month: '',          // 'YYYY-MM'
  author: '',         // instructor id_user
  availability: '',   // '' | 'free' (places left)
  access: '',         // '' | 'free' (free workshop) | 'members' (for socios/as)
  sort: 'date'        // 'date' | 'recent' | 'title'
};

const normalize = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The workshop's date, or null when it has none ("fecha por confirmar");
 *  a contest's, the jury's day (it's finished once that day is over). */
export function workshopDate(w) {
  if (isContest(w)) return contestLastDay(w);
  if (!w?.date_workshop) return null;
  return serverDate(w.date_workshop);
}

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Upcoming = today or later, or no date yet. */
const isUpcoming = (w, now) => {
  const d = workshopDate(w);
  if (!d) return true;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d >= startOfToday;
};

/** Finished: its day is over (the server says the same — no booking then). */
export const isPastWorkshop = (w, now = new Date()) => !isUpcoming(w, now);

const hasFreeSpots = (w) => w.capacity_workshop == null || (w.spots_left ?? 1) > 0;

/** Options present in the workshops (months, instructors). */
export function buildWorkshopFilterOptions(workshops, filters = EMPTY_WORKSHOP_FILTERS) {
  const months = new Set();
  const authors = new Map();
  for (const w of workshops) {
    const d = workshopDate(w);
    if (d) months.add(monthKey(d));
    for (const a of w.authors || []) if (a?.id_user) authors.set(String(a.id_user), a.name_user);
  }
  if (filters.month) months.add(filters.month);
  return {
    months: [...months].sort(),
    authors: [...authors.entries()].sort((x, y) => x[1].localeCompare(y[1], 'es', { sensitivity: 'base' }))
  };
}

/** How many filters are set (not the sort, nor the finished ones: that's
 *  the page's own button). */
export const countActiveWorkshopFilters = (f) =>
  [f.q?.trim(), f.month, f.author, f.availability, f.access].filter(Boolean).length;

/** Filter + sort. */
export function applyWorkshopFilters(workshops, f, now = new Date()) {
  const q = normalize(f.q).trim();
  const filtered = workshops.filter((w) => {
    if (q) {
      const haystack = [w.title_workshop, w.description_workshop, w.location_workshop, ...(w.authors || []).map((a) => a.name_user)]
        .map(normalize).join(' ');
      if (!haystack.includes(q)) return false;
    }
    if (f.when === 'upcoming' && !isUpcoming(w, now)) return false;
    if (f.when === 'past' && isUpcoming(w, now)) return false;
    if (f.month) {
      const d = workshopDate(w);
      if (!d || monthKey(d) !== f.month) return false;
    }
    if (f.author && !(w.authors || []).some((a) => String(a.id_user) === f.author)) return false;
    // Places and access are workshops' (anyone with an account signs up to
    // a contest).
    if (isContest(w)) return true;
    if (f.availability === 'free' && !hasFreeSpots(w)) return false;
    const free = w.free_workshop === true || w.free_workshop === 1;
    if (f.access === 'free' && !free) return false;
    if (f.access === 'members' && free) return false;
    return true;
  });

  const time = (w) => workshopDate(w)?.getTime();
  const sorted = [...filtered];
  if (f.sort === 'title') {
    sorted.sort((a, b) => (a.title_workshop || '').localeCompare(b.title_workshop || '', 'es', { sensitivity: 'base' }));
  } else if (f.sort === 'recent') {
    sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } else {
    // Upcoming: soonest first, undated ones at the end. Then the finished
    // ones: the most recent first.
    const upcoming = sorted.filter((w) => isUpcoming(w, now)).sort((a, b) => {
      const ta = time(a); const tb = time(b);
      if (ta == null && tb == null) return 0;
      if (ta == null) return 1;
      if (tb == null) return -1;
      return ta - tb;
    });
    const past = sorted.filter((w) => !isUpcoming(w, now)).sort((a, b) => time(b) - time(a));
    return [...upcoming, ...past];
  }
  return sorted;
}
