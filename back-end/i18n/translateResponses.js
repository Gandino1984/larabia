// back-end/i18n/translateResponses.js
//
// Express middleware: the messages of a JSON answer (top-level error /
// success / message strings) in the reader's language. The front-end sends
// the language chosen in its header as Accept-Language (es | en | eu); the
// texts come from i18n/messages.js. Unknown messages stay as they are.
import { MESSAGES, PATTERNS } from './messages.js';

const LANGS = ['es', 'en', 'eu'];
const FIELDS = ['error', 'success', 'message'];

export function requestLang(req) {
    const lang = String(req.headers['accept-language'] || '').slice(0, 2).toLowerCase();
    return LANGS.includes(lang) ? lang : 'es';
}

export function translateMessage(text, lang) {
    const exact = MESSAGES[text];
    if (exact) return exact[lang] || text;
    for (const p of PATTERNS) {
        if (p[lang] && p.re.test(text)) return text.replace(p.re, p[lang]);
    }
    return text;
}

export function translateResponses(req, res, next) {
    const lang = requestLang(req);
    const json = res.json.bind(res);
    res.json = (body) => {
        if (!body || typeof body !== 'object' || Array.isArray(body)) return json(body);
        let out = body;
        for (const field of FIELDS) {
            if (typeof body[field] !== 'string') continue;
            const text = translateMessage(body[field], lang);
            if (text !== body[field]) {
                if (out === body) out = { ...body };
                out[field] = text;
            }
        }
        return json(out);
    };
    next();
}

export default translateResponses;
