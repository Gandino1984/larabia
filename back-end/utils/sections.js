// back-end/utils/sections.js
//
// Sections of the magazine (header buttons such as «Internacional») that a
// publication — article or project — ALSO appears in, besides its own list
// («Artículos» / «Proyectos»). Stored as JSON arrays of section keys (the
// nav item's value, see front-end utils/sections.js):
//   sections_*            approved: what readers see
//   sections_requested_*  what the author asked for, waiting for a super
//                         admin (null = nothing pending; [] = "take it out of
//                         every section"). The approver keeps, changes or
//                         rejects it.
// Super admins (canPublishDirectly) set the approved sections directly.

const MAX_SECTIONS = 12;
const MAX_KEY_LENGTH = 100;

const COLUMNS = {
    article: ["sections_article", "sections_requested_article"],
    project: ["sections_project", "sections_requested_project"]
};

/** A clean list of section keys from whatever was sent (array or JSON). */
export function normalizeSections(value) {
    let list = value;
    if (typeof list === "string") {
        try {
            list = JSON.parse(list);
        } catch {
            list = list.split(",");
        }
    }
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const item of list) {
        if (typeof item !== "string") continue;
        const key = item.trim().slice(0, MAX_KEY_LENGTH);
        if (key && !out.some((k) => k.toLowerCase() === key.toLowerCase())) out.push(key);
        if (out.length >= MAX_SECTIONS) break;
    }
    return out;
}

export function sameSections(a, b) {
    const x = normalizeSections(a).map((k) => k.toLowerCase());
    const y = normalizeSections(b).map((k) => k.toLowerCase());
    return x.length === y.length && x.every((k) => y.includes(k));
}

/**
 * Columns to write when someone sends `sent` (raw; undefined = not sent) for
 * a publication whose approved sections are `current`.
 *   - super admins: the approved sections, at once (and any request is
 *     settled) — unless they didn't change them, so saving other edits never
 *     rejects a pending request by accident;
 *   - everyone else: a request (dropped if it equals what's approved).
 */
export function sectionsUpdate(kind, sent, current, roleCtx) {
    if (sent === undefined) return {};
    const [live, request] = COLUMNS[kind];
    const wanted = normalizeSections(sent);
    if (roleCtx?.canPublishDirectly) {
        if (sameSections(wanted, current)) return {};
        return { [live]: wanted.length ? wanted : null, [request]: null };
    }
    return { [request]: sameSections(wanted, current) ? null : wanted };
}

/**
 * Columns to write when a super admin approves (a pending publication or a
 * section request): their choice if they made one, else what was asked for,
 * else what there was.
 */
export function sectionsOnApproval(kind, record, chosen) {
    const [live, request] = COLUMNS[kind];
    const asked = record[request];
    const value = chosen !== undefined
        ? normalizeSections(chosen)
        : normalizeSections(asked !== null && asked !== undefined ? asked : record[live]);
    return { [live]: value.length ? value : null, [request]: null };
}
