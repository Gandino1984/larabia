// magazine-front/src/utils/contests.js
//
// Contests: rows of the workshops (magazine_workshops) with kind_workshop =
// 'contest' — the Talleres section holds both. A contest has no date, place
// or capacity: sign-ups open on one day and close after another, the jury
// announces the winners on a third, and it can award a 1st, 2nd and 3rd place
// and an honorable mention (each with its prize and, from the jury's day on,
// its winner). Anyone with an account signs up. Contests by anyone but a
// super admin wait for one to approve them (review_status_workshop). Same
// rules as the server (controllers/magazine_workshop/magazine_workshop_controller.js).
import { localDate } from './locale';

export const isContest = (w) => w?.kind_workshop === 'contest';

// Contest days are plain days ('YYYY-MM-DD'), compared with today in the
// magazine's time zone.
export const todayDay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
export const dayOf = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

/** A plain day as a local Date (for formatting and sorting). */
export function dayDate(v) {
  const d = dayOf(v);
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** «15 de diciembre de 2026» (in the header's language). */
export const formatDay = (v, options = { day: 'numeric', month: 'long', year: 'numeric' }) => {
  const d = dayDate(v);
  return d ? localDate(d, options) : '';
};

/** The sign-up days, { from, to }: the year only once when both share it
 *  («del 1 de octubre al 5 de noviembre de 2026»). */
export function signupRange(start, end) {
  const a = dayDate(start);
  const b = dayDate(end);
  const sameYear = a && b && a.getFullYear() === b.getFullYear();
  return {
    from: sameYear ? formatDay(start, { day: 'numeric', month: 'long' }) : formatDay(start),
    to: formatDay(end)
  };
}

/** 'soon' (sign-ups not open yet) | 'open' | 'closed' (waiting for the jury) | 'resolved' (from the jury's day). */
export function contestPhase(w, today = todayDay()) {
  const start = dayOf(w?.registration_start_workshop);
  const end = dayOf(w?.registration_end_workshop);
  const jury = dayOf(w?.resolution_date_workshop);
  if (jury && today >= jury) return 'resolved';
  if (start && today < start) return 'soon';
  if (end && today > end) return 'closed';
  return 'open';
}

/** The contest's last day (finished the day after it): the jury's. */
export const contestLastDay = (w) => dayDate(w?.resolution_date_workshop) || dayDate(w?.registration_end_workshop);

// The awards: { first, second, third, mention }, each { prize, winner }.
export const AWARD_PLACES = ['first', 'second', 'third', 'mention'];

export function parseAwards(raw) {
  let a = raw;
  if (typeof a === 'string') {
    try { a = JSON.parse(a); } catch { a = null; }
  }
  return a && typeof a === 'object' && !Array.isArray(a) ? a : {};
}

/** The places with a prize or a winner, in order: [{ place, prize, winner }]. */
export const awardList = (w) => {
  const a = parseAwards(w?.awards_workshop);
  return AWARD_PLACES
    .map((place) => ({ place, prize: a[place]?.prize || '', winner: a[place]?.winner || '' }))
    .filter((x) => x.prize || x.winner);
};

/** «1.er premio», «Mención honorífica»… */
export const awardLabel = (place, t) => ({
  first: t('contests.place.first', '1.er premio'),
  second: t('contests.place.second', '2.º premio'),
  third: t('contests.place.third', '3.er premio'),
  mention: t('contests.place.mention', 'Mención honorífica')
}[place]);

/** Waiting for a super admin, or sent back (only its managers see these). */
export const reviewStateOf = (w) => (isContest(w) ? (w.review_status_workshop || 'approved') : 'approved');
