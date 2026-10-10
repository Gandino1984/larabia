// magazine-front/src/utils/workshopFilters.js
//
// Filtering + sorting for the workshops page (WorkshopFilters): text search,
// when (upcoming / past / all), month, instructor, availability and order.
// Pure functions — the UI lives in components/workshops/WorkshopFilters.jsx.

export const EMPTY_WORKSHOP_FILTERS = {
  q: '',
  when: 'upcoming',   // 'upcoming' | 'past' | 'all'
  month: '',          // 'YYYY-MM'
  author: '',         // instructor id_user
  availability: '',   // '' | 'free'
  sort: 'date'        // 'date' | 'recent' | 'title'
};

const normalize = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The workshop's date, or null when it has none ("fecha por confirmar"). */
export function workshopDate(w) {
  if (!w?.date_workshop) return null;
  const d = new Date(w.date_workshop);
  return Number.isNaN(d.getTime()) ? null : d;
}

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Upcoming = today or later, or no date yet. */
const isUpcoming = (w, now) => {
  const d = workshopDate(w);
  if (!d) return true;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d >= startOfToday;
};

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

/** How many filters (not the sort, not the default "upcoming") are set. */
export const countActiveWorkshopFilters = (f) =>
  [f.q?.trim(), f.when !== 'upcoming' ? f.when : '', f.month, f.author, f.availability].filter(Boolean).length;

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
    if (f.availability === 'free' && !hasFreeSpots(w)) return false;
    return true;
  });

  const time = (w) => workshopDate(w)?.getTime();
  const sorted = [...filtered];
  if (f.sort === 'title') {
    sorted.sort((a, b) => (a.title_workshop || '').localeCompare(b.title_workshop || '', 'es', { sensitivity: 'base' }));
  } else if (f.sort === 'recent') {
    sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } else {
    // Soonest first (past: most recent first); undated ones at the end.
    const dir = f.when === 'past' ? -1 : 1;
    sorted.sort((a, b) => {
      const ta = time(a); const tb = time(b);
      if (ta == null && tb == null) return 0;
      if (ta == null) return 1;
      if (tb == null) return -1;
      return (ta - tb) * dir;
    });
  }
  return sorted;
}
