// back-end/utils/translations.js
//
// Content in other languages. The original text of an article, its blocks and
// a project is Spanish (its usual columns); the editor can add versions in the
// other languages of the magazine, stored as JSON:
//   { en: { title: '…', subtitle: '…', excerpt: '…' }, eu: { … } }
// Readers see the version of their language, or the original (front-end
// utils/contentLang.js).

export const CONTENT_LANGS = ['en', 'eu'];

// Fields each kind of content can translate, with their maximum length.
export const TRANSLATABLE = {
    article: { title: 255, subtitle: 100, excerpt: 2000 },
    block: { content: 200000, caption: 1000, alt: 500 },
    project: { title: 255, subtitle: 100, description: 10000 }
};

// Quill's empty paragraph ("<p><br></p>") or bare spaces count as nothing.
const hasText = (s) => typeof s === 'string'
    && s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

/**
 * Clean translations sent by the editor (object or JSON string).
 * undefined → not sent (leave the column alone); null → nothing translated.
 */
export function normalizeTranslations(kind, value) {
    if (value === undefined) return undefined;
    let v = value;
    if (v === null || v === '') return null;
    if (typeof v === 'string') {
        try {
            v = JSON.parse(v);
        } catch {
            return null;
        }
    }
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const fields = TRANSLATABLE[kind];
    const out = {};
    for (const lang of CONTENT_LANGS) {
        const src = v[lang];
        if (!src || typeof src !== 'object') continue;
        const entry = {};
        for (const [field, max] of Object.entries(fields)) {
            if (hasText(src[field])) entry[field] = src[field].slice(0, max);
        }
        if (Object.keys(entry).length) out[lang] = entry;
    }
    return Object.keys(out).length ? out : null;
}
