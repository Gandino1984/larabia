// back-end/utils/subtitle.js — the subtitle of an article or a project (a
// line under the title, migration 031).

export const SUBTITLE_MAX = 100;

/**
 * The subtitle as sent: spaces tidied, empty → null; undefined = not sent
 * (leave it alone). Returns { value } or { error } (too long).
 */
export function cleanSubtitle(value) {
    if (value === undefined) return { value: undefined };
    const s = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (s.length > SUBTITLE_MAX) return { error: `El subtítulo no puede exceder ${SUBTITLE_MAX} caracteres` };
    return { value: s || null };
}
