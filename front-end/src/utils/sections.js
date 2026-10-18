// magazine-front/src/utils/sections.js
//
// Magazine sections: the header buttons that list publications — the nav
// builder's «Categoría de artículos» items (Internacional, Ficción, Galería…)
// plus Espacio abierto and Micro-perfiles. An article or a project ALSO
// appears in the sections it belongs to, besides «Artículos» / «Proyectos».
// The catalogue comes from the nav config, so a button added in Admin → Menú
// becomes a section at once.
//
// Each publication carries the APPROVED sections (sections_article /
// sections_project: what readers see) and, while a super admin hasn't
// decided, the ones its author REQUESTED (sections_requested_*; null =
// nothing pending). See back-end utils/sections.js.
import { navLabel } from '../app_context/navConfig';

// Nav 'section' items whose page lists publications.
const LISTING_SECTIONS = ['openmic', 'microperfiles'];
// Before sections existed, these pages showed one category: keep showing it.
const LEGACY_CATEGORIES = {
  openmic: ['terrenito en pluton', 'micro abierto'],
  microperfiles: ['micro-perfiles']
};

const norm = (s) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const sameKey = (a, b) => norm(a) === norm(b);

/** [{ key, label, path }] in menu order; `path` = the groups it sits in. */
export function sectionCatalog(navConfig, lang) {
  const out = [];
  const walk = (items, path) => (items || []).forEach((item) => {
    if (!item || item.visible === false) return;
    const label = navLabel(item, lang);
    if (item.kind === 'group') { walk(item.children, [...path, label]); return; }
    const a = item.action;
    const key = a?.type === 'category' ? a.value
      : a?.type === 'section' && LISTING_SECTIONS.includes(a.value) ? a.value
        : null;
    if (key && !out.some((s) => sameKey(s.key, key))) out.push({ key, label, path });
  });
  walk(navConfig, []);
  return out;
}

export function parseSections(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Approved sections of an article or a project. */
export const sectionsOf = (pub) => parseSections(pub?.sections_article ?? pub?.sections_project);

/** Sections its author asked for, or null if nothing is pending. */
export function requestedSectionsOf(pub) {
  const value = pub?.sections_requested_article !== undefined
    ? pub.sections_requested_article
    : pub?.sections_requested_project;
  return value === null || value === undefined ? null : parseSections(value);
}

/** Does this publication appear in section `key`? */
export function inSection(pub, key) {
  if (!key) return false;
  if (sectionsOf(pub).some((s) => sameKey(s, key))) return true;
  const category = norm(pub?.category_article);
  if (!category) return false;
  return category === norm(key) || (LEGACY_CATEGORIES[key] || []).some((c) => norm(c) === category);
}

export const sectionLabel = (key, catalog) => catalog.find((s) => sameKey(s.key, key))?.label || key;

/** "Internacional, Ficción" — or `none` when empty. */
export const sectionList = (keys, catalog, none = '—') =>
  (keys && keys.length ? keys.map((k) => sectionLabel(k, catalog)).join(', ') : none);
