// magazine-front/src/utils/locale.js
//
// Dates in the language chosen in the header. Chrome has no Basque dates (its
// Intl falls back to Spanish), so Basque is written here — in the usual form,
// «2026ko urriaren 19a» — unless the browser has it.
import i18n from '../i18n/config';

const LOCALES = { es: 'es-ES', en: 'en-GB', eu: 'eu-ES' };
const lang = () => String(i18n.language || 'es').slice(0, 2);

export const uiLocale = () => LOCALES[lang()] || LOCALES.es;

let nativeBasque = null;
const hasNativeBasque = () => {
  if (nativeBasque === null) {
    try {
      nativeBasque = Intl.DateTimeFormat.supportedLocalesOf(['eu']).length > 0;
    } catch {
      nativeBasque = false;
    }
  }
  return nativeBasque;
};

const EU_MONTHS = ['urtarrila', 'otsaila', 'martxoa', 'apirila', 'maiatza', 'ekaina', 'uztaila', 'abuztua', 'iraila', 'urria', 'azaroa', 'abendua'];
const EU_MONTHS_OF = ['urtarrilaren', 'otsailaren', 'martxoaren', 'apirilaren', 'maiatzaren', 'ekainaren', 'uztailaren', 'abuztuaren', 'irailaren', 'urriaren', 'azaroaren', 'abenduaren'];
const EU_MONTHS_SHORT = ['urt.', 'ots.', 'mar.', 'api.', 'mai.', 'eka.', 'uzt.', 'abu.', 'ira.', 'urr.', 'aza.', 'abe.'];

// «2026ko» but «2025eko»: -eko after a number said ending in a consonant
// (bat, bost, hamar, hamabost — Basque counts in twenties).
const yearOf = (y) => {
  const r = (y % 100) % 20;
  return `${y}${[1, 5, 10, 15].includes(r) && y % 100 !== 0 ? 'eko' : 'ko'}`;
};

function basqueDate(d, o) {
  const pad = (n) => String(n).padStart(2, '0');
  const month = d.getMonth();
  const parts = [];
  if (!o.year && !o.month && !o.day) return `${d.getFullYear()}/${pad(month + 1)}/${pad(d.getDate())}`;
  if (o.year) parts.push(yearOf(d.getFullYear()));
  if (o.month) {
    if (o.month === 'short') parts.push(EU_MONTHS_SHORT[month]);
    else if (o.month === 'numeric' || o.month === '2-digit') parts.push(pad(month + 1));
    else parts.push(o.day ? EU_MONTHS_OF[month] : EU_MONTHS[month]);
  }
  if (o.day) parts.push(`${d.getDate()}a`);
  let out = parts.join(' ');
  if (o.hour) out += `, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return out;
}

/**
 * A date from the API as a Date. The DB answers «2026-10-19 08:51:31» (UTC,
 * no zone — and Safari won't parse it): read it as UTC. null when it isn't a date.
 */
export function serverDate(value) {
  const s = String(value || '');
  const d = new Date(/^\d{4}-\d\d-\d\d \d/.test(s) ? `${s.replace(' ', 'T')}Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * toLocaleDateString in the header's language. `value`: a Date, or a date
 * from the API (read as UTC — serverDate), or anything Date takes.
 */
export function localDate(value, options = {}) {
  const d = value instanceof Date ? value : serverDate(value);
  if (!d || Number.isNaN(d.getTime())) return '';
  if (lang() === 'eu' && !hasNativeBasque()) return basqueDate(d, options);
  return d.toLocaleDateString(uiLocale(), options);
}
