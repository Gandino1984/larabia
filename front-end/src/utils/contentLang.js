// magazine-front/src/utils/contentLang.js
//
// Content in other languages: the original text of an article, its blocks and
// a project is Spanish; editors can add versions in English and Basque
// (back-end utils/translations.js):
//   translations_article  { en: { title, subtitle, excerpt }, eu: { … } }
//   translations_block    { en: { content, caption, alt }, eu: { … } }
//   translations_project  { en: { title, subtitle, description }, eu: { … } }
// Readers get the version of the language they chose in the header (or the
// article reader's own toggle), and the original where there is none.

export const CONTENT_LANGS = ['es', 'en', 'eu'];
export const ORIGINAL_LANG = 'es';
// Each language's name in itself, as in the header's language selector.
export const LANG_NAMES = { es: 'Español', en: 'English', eu: 'Euskara' };

export const baseLang = (lng) => {
  const l = String(lng || ORIGINAL_LANG).slice(0, 2).toLowerCase();
  return CONTENT_LANGS.includes(l) ? l : ORIGINAL_LANG;
};

export function parseTranslations(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const v = JSON.parse(value);
      return v && typeof v === 'object' ? v : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? value : {};
}

// Quill's empty paragraph ("<p><br></p>") or bare spaces count as nothing.
export const hasText = (s) => typeof s === 'string'
  && s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

/** The text of `field` in `lang`, or the original. */
export function localized(original, translations, field, lang) {
  const l = baseLang(lang);
  if (l === ORIGINAL_LANG) return original;
  const text = parseTranslations(translations)[l]?.[field];
  return hasText(text) ? text : original;
}

export const articleTitle = (a, lang) => localized(a?.title_article, a?.translations_article, 'title', lang);
export const articleSubtitle = (a, lang) => localized(a?.subtitle_article, a?.translations_article, 'subtitle', lang);
export const articleExcerpt = (a, lang) => localized(a?.excerpt_article, a?.translations_article, 'excerpt', lang);
// The project an article belongs to, as the article lists bring it.
export const articleProjectTitle = (a, lang) => localized(a?.project_title, a?.project_translations, 'title', lang);
export const projectTitle = (p, lang) => localized(p?.title_project, p?.translations_project, 'title', lang);
export const projectSubtitle = (p, lang) => localized(p?.subtitle_project, p?.translations_project, 'subtitle', lang);
export const projectDescription = (p, lang) => localized(p?.description_project, p?.translations_project, 'description', lang);
export const blockText = (b, lang) => localized(b?.content, b?.translations_block, 'content', lang);
export const blockCaption = (b, lang) => localized(b?.image_caption, b?.translations_block, 'caption', lang);
export const blockAlt = (b, lang) => localized(b?.image_alt, b?.translations_block, 'alt', lang);

/** Does this translations object have anything in `lang`? */
export const hasLang = (translations, lang) => {
  const entry = parseTranslations(translations)[lang];
  return !!entry && Object.values(entry).some(hasText);
};

/** The languages an article can be read in: the original plus any other its
 *  title, excerpt or blocks have text in. */
export function articleLangs(article) {
  return CONTENT_LANGS.filter((l) => l === ORIGINAL_LANG
    || hasLang(article?.translations_article, l)
    || (article?.blocks || []).some((b) => hasLang(b.translations_block, l)));
}

/** A copy of `translations` with `field` of `lang` set to `text`. */
export function withTranslation(translations, lang, field, text) {
  const all = parseTranslations(translations);
  return { ...all, [lang]: { ...(all[lang] || {}), [field]: text } };
}
