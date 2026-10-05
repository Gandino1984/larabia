// magazine-front/src/utils/articleFilters.js
//
// Shared filtering + sorting for article lists (the Artículos section and the
// creator's "Mis publicaciones"): category, project, author, year / month,
// and the sort order. Pure functions — the UI lives in ArticleFilters.jsx.

export const EMPTY_ARTICLE_FILTERS = {
  category: '',
  project: '',
  author: '',
  year: '',
  month: '',
  sort: ''
};

// Publication categories: [value, i18n key] (also the creator's category list).
export const CATEGORIES = [
  ['reportaje', 'editor.category.reportage'], ['multimedia', 'editor.category.multimedia'],
  ['cultura', 'editor.category.culture'], ['sociedad', 'editor.category.society'],
  ['opinion', 'editor.category.opinion'], ['crónica', 'editor.category.cronica'],
  ['entrevista', 'editor.category.entrevista'], ['editorial', 'editor.category.editorial'],
  ['fotoreportaje', 'editor.category.fotoreportaje'], ['video reportaje', 'editor.category.videoreportaje'],
  ['podcast', 'editor.category.podcast'], ['cómic multimedia', 'editor.category.comic'],
  ['crítica', 'editor.category.critica'], ['ensayo', 'editor.category.ensayo'],
  ['terrenito en pluton', 'editor.category.microAbierto'], ['internacional', 'editor.category.internacional'],
  ['no-ficcion', 'editor.category.noficcion'], ['ficcion', 'editor.category.ficcion'],
  ['micro-perfiles', 'editor.category.microperfiles'], ['talleres', 'editor.category.talleres'],
  ['infantil', 'editor.category.infantil']
];
const CATEGORY_KEYS = Object.fromEntries([['general', 'editor.category.general'], ...CATEGORIES]);

/** i18n key for a category value (undefined for unknown values). */
export const categoryLabelKey = (value) => CATEGORY_KEYS[value];

/** Value used for "articles without a project" in the project filter. */
export const NO_PROJECT = 'none';

/** The date an article is listed under: publication date, else creation. */
export function articleDate(article) {
  const raw = article?.date_published || article?.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The article's authors as { id, name } (falls back to the legacy author_name). */
export function articleAuthors(article) {
  if (article?.authors?.length) {
    return article.authors.map((a) => ({ id: String(a.id_user), name: a.name_user }));
  }
  return article?.author_name ? [{ id: `name:${article.author_name}`, name: article.author_name }] : [];
}

/** Dropdown options present in the given articles (plus any selected value). */
export function buildFilterOptions(articles, filters = EMPTY_ARTICLE_FILTERS) {
  const categories = new Set();
  const projects = new Map();
  const authors = new Map();
  const years = new Set();
  const months = new Set();
  let withoutProject = false;

  for (const a of articles) {
    if (a.category_article) categories.add(a.category_article);
    if (a.project_id) projects.set(String(a.project_id), a.project_title || `#${a.project_id}`);
    else withoutProject = true;
    for (const au of articleAuthors(a)) if (!authors.has(au.id)) authors.set(au.id, au.name);
    const d = articleDate(a);
    if (d) {
      years.add(String(d.getFullYear()));
      if (filters.year && String(d.getFullYear()) === filters.year) months.add(String(d.getMonth() + 1));
    }
  }
  // Keep a selected value listed even if no article matches it any more.
  if (filters.category) categories.add(filters.category);
  if (filters.year) years.add(filters.year);
  if (filters.month) months.add(filters.month);

  const byName = (x, y) => x[1].localeCompare(y[1], 'es', { sensitivity: 'base' });
  return {
    categories: [...categories].sort((x, y) => x.localeCompare(y, 'es', { sensitivity: 'base' })),
    projects: [...projects.entries()].sort(byName),
    withoutProject,
    authors: [...authors.entries()].sort(byName),
    years: [...years].sort((x, y) => Number(y) - Number(x)),
    months: [...months].sort((x, y) => Number(x) - Number(y))
  };
}

/** How many filters (not the sort) are set. */
export const countActiveFilters = (f) =>
  ['category', 'project', 'author', 'year', 'month'].filter((k) => f[k]).length;

/** Filter + sort. `defaultSort` applies when the user hasn't picked one. */
export function applyArticleFilters(articles, f, defaultSort = 'newest') {
  const filtered = articles.filter((a) => {
    if (f.category && a.category_article !== f.category) return false;
    if (f.project) {
      if (f.project === NO_PROJECT ? !!a.project_id : String(a.project_id) !== f.project) return false;
    }
    if (f.author && !articleAuthors(a).some((au) => au.id === f.author)) return false;
    if (f.year || f.month) {
      const d = articleDate(a);
      if (!d) return false;
      if (f.year && String(d.getFullYear()) !== f.year) return false;
      if (f.month && String(d.getMonth() + 1) !== f.month) return false;
    }
    return true;
  });

  const time = (a) => articleDate(a)?.getTime() ?? 0;
  const sort = f.sort || defaultSort;
  const sorted = [...filtered];
  if (sort === 'oldest') {
    sorted.sort((a, b) => (time(a) - time(b)) || ((a.id_article || 0) - (b.id_article || 0)));
  } else if (sort === 'views') {
    sorted.sort((a, b) => ((b.view_count_article || 0) - (a.view_count_article || 0)) || (time(b) - time(a)));
  } else if (sort === 'title') {
    sorted.sort((a, b) => (a.title_article || '').localeCompare(b.title_article || '', 'es', { sensitivity: 'base' }));
  } else {
    sorted.sort((a, b) => (time(b) - time(a)) || ((b.id_article || 0) - (a.id_article || 0)));
  }
  return sorted;
}
