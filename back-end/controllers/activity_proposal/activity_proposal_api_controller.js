// back-end/controllers/activity_proposal/activity_proposal_api_controller.js
//
// «Propón una actividad» (models/activity_proposal_model.js). Anyone signed in
// (sign-in is with Google: it makes the account if there's none) proposes a
// workshop or an open call / contest — two in progress at most (sent or being
// considered; a declined or withdrawn one frees its place). They see theirs
// and withdraw one while nobody has decided. Admins and super admins read
// them all and decide: «considering» sends the person an email (in the
// language they wrote from) saying we've received it and are considering it;
// «declined» doesn't write. The team also gets an email for each new one.
// Refusals are 403 with a `code` (never 401, which logs the reader out).
import activity_proposal_model, { ACTIVITY_KINDS } from "../../models/activity_proposal_model.js";
import user_model from "../../models/user_model.js";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";
import { sendActivityProposalEmail, sendActivityProposalConsideredEmail } from "../../services/emailService.js";

export const ACTIVE_MAX = 2;
const TITLE_MAX = 150;
const DESCRIPTION_MAX = 3000;
const DETAILS_MAX = 1500;
const LANGS = ['es', 'en', 'eu'];
const KIND_LABELS = { workshop: 'Taller', call: 'Convocatoria o concurso' };
const ACTIVE = ['new', 'considering'];

const langOf = (req) => {
    const l = String(req.headers['accept-language'] || '').slice(0, 2).toLowerCase();
    return LANGS.includes(l) ? l : 'es';
};

const shape = (p, { withUser = false } = {}) => ({
    id_activity_proposal: p.id_activity_proposal,
    kind_proposal: p.kind_proposal,
    title_proposal: p.title_proposal,
    description_proposal: p.description_proposal,
    details_proposal: p.details_proposal,
    status_proposal: p.status_proposal,
    reviewed_at: p.reviewed_at,
    email_sent_at: p.email_sent_at,
    created_at: p.created_at,
    ...(withUser ? {
        user: p.user ? { id_user: p.user.id_user, name_user: p.user.name_user, email_user: p.user.email_user, image_user: p.user.image_user } : null
    } : {})
});

async function signedIn(req, res) {
    const user = await getRequestUser(req);
    if (!user) res.status(403).json({ error: 'Inicia sesión con Google para proponer una actividad', code: 'login_required' });
    return user;
}

/** Admins and super admins: they read the proposals and decide. */
async function reviewer(req, res) {
    const user = await getRequestUser(req);
    const role = roleSnapshot(user);
    if (!user || !(role.isAdmin || role.isSuperAdmin)) {
        res.status(403).json({ error: 'Solo las y los admins pueden revisar las propuestas', code: 'forbidden' });
        return null;
    }
    return user;
}

const activeCount = (userId) => activity_proposal_model.count({ where: { user_id: userId, status_proposal: ACTIVE } });

// POST /activity-proposals { kind, title, description, details }
async function create(req, res) {
    try {
        const user = await signedIn(req, res);
        if (!user) return;
        const kind = String(req.body?.kind || '');
        const title = String(req.body?.title || '').trim();
        const description = String(req.body?.description || '').trim();
        const details = String(req.body?.details || '').trim();
        if (!ACTIVITY_KINDS.includes(kind)) return res.status(400).json({ error: 'Elige si es un taller o una convocatoria' });
        if (!title) return res.status(400).json({ error: 'Escribe el título de tu propuesta' });
        if (title.length > TITLE_MAX) return res.status(400).json({ error: `El título es demasiado largo (máximo ${TITLE_MAX} caracteres)` });
        if (!description) return res.status(400).json({ error: 'Cuéntanos en qué consiste tu propuesta' });
        if (description.length > DESCRIPTION_MAX) return res.status(400).json({ error: `La descripción es demasiado larga (máximo ${DESCRIPTION_MAX} caracteres)` });
        if (details.length > DETAILS_MAX) return res.status(400).json({ error: `Los detalles son demasiado largos (máximo ${DETAILS_MAX} caracteres)` });
        if ((await activeCount(user.id_user)) >= ACTIVE_MAX) {
            return res.status(409).json({ error: `Ya tienes ${ACTIVE_MAX} propuestas en curso: espera a que las revisemos o retira una`, code: 'limit' });
        }
        const proposal = await activity_proposal_model.create({
            user_id: user.id_user,
            kind_proposal: kind,
            title_proposal: title,
            description_proposal: description,
            details_proposal: details || null,
            lang_proposal: langOf(req)
        });
        // The team hears of it (doesn't hold the answer).
        sendActivityProposalEmail({
            senderName: user.name_user, senderEmail: user.email_user,
            kindLabel: KIND_LABELS[kind], title, description, details
        }).catch(() => {});
        res.json({ error: null, success: 'Propuesta enviada: el equipo la leerá pronto', data: shape(proposal) });
    } catch (err) {
        console.error('-> activity proposals create() - Error =', err);
        res.status(500).json({ error: 'Error al enviar la propuesta' });
    }
}

// GET /activity-proposals/mine — theirs, newest first, and how many more they can send.
async function mine(req, res) {
    try {
        const user = await signedIn(req, res);
        if (!user) return;
        const rows = await activity_proposal_model.findAll({ where: { user_id: user.id_user }, order: [['created_at', 'DESC']] });
        const active = rows.filter((r) => ACTIVE.includes(r.status_proposal)).length;
        res.json({ error: null, data: { items: rows.map((r) => shape(r)), active, max: ACTIVE_MAX } });
    } catch (err) {
        console.error('-> activity proposals mine() - Error =', err);
        res.status(500).json({ error: 'Error al cargar tus propuestas' });
    }
}

// DELETE /activity-proposals/:id — withdraw your own while nobody has decided.
async function withdraw(req, res) {
    try {
        const user = await signedIn(req, res);
        if (!user) return;
        const p = await activity_proposal_model.findByPk(req.params.id);
        if (!p || p.user_id !== user.id_user) return res.status(404).json({ error: 'Propuesta no encontrada' });
        if (p.status_proposal !== 'new') return res.status(400).json({ error: 'Ya la hemos revisado: no se puede retirar' });
        await p.destroy();
        res.json({ error: null, success: 'Propuesta retirada', data: null });
    } catch (err) {
        console.error('-> activity proposals withdraw() - Error =', err);
        res.status(500).json({ error: 'Error al retirar la propuesta' });
    }
}

// GET /activity-proposals?status= — reviewers: all (or by status), newest first.
async function list(req, res) {
    try {
        if (!(await reviewer(req, res))) return;
        const status = String(req.query.status || '');
        const rows = await activity_proposal_model.findAll({
            where: ['new', 'considering', 'declined'].includes(status) ? { status_proposal: status } : {},
            include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'email_user', 'image_user'] }],
            order: [['created_at', 'DESC']],
            limit: 300
        });
        res.json({ error: null, data: rows.map((r) => shape(r, { withUser: true })) });
    } catch (err) {
        console.error('-> activity proposals list() - Error =', err);
        res.status(500).json({ error: 'Error al cargar las propuestas' });
    }
}

// GET /activity-proposals/count — reviewers: how many new, and the latest (the bell).
async function count(req, res) {
    try {
        if (!(await reviewer(req, res))) return;
        const rows = await activity_proposal_model.findAll({
            where: { status_proposal: 'new' },
            include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user'] }],
            order: [['created_at', 'DESC']],
            limit: 50
        });
        res.json({
            error: null,
            data: {
                new: rows.length,
                latest: rows.slice(0, 10).map((r) => ({
                    id_activity_proposal: r.id_activity_proposal, kind_proposal: r.kind_proposal,
                    title_proposal: r.title_proposal, created_at: r.created_at,
                    user: r.user ? { id_user: r.user.id_user, name_user: r.user.name_user } : null
                }))
            }
        });
    } catch (err) {
        console.error('-> activity proposals count() - Error =', err);
        res.status(500).json({ error: 'Error al cargar las propuestas' });
    }
}

async function decide(req, res, status) {
    const user = await reviewer(req, res);
    if (!user) return null;
    const p = await activity_proposal_model.findByPk(req.params.id, {
        include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'email_user', 'image_user'] }]
    });
    if (!p) {
        res.status(404).json({ error: 'Propuesta no encontrada' });
        return null;
    }
    await p.update({ status_proposal: status, reviewed_by: user.id_user, reviewed_at: new Date() });
    return p;
}

// POST /activity-proposals/:id/consider — approved: the person gets an
// email (once) saying we've received it and are considering it.
async function consider(req, res) {
    try {
        const p = await decide(req, res, 'considering');
        if (!p) return;
        let emailed = !!p.email_sent_at;
        if (!emailed && p.user?.email_user) {
            emailed = await sendActivityProposalConsideredEmail({
                userEmail: p.user.email_user, userName: p.user.name_user,
                title: p.title_proposal, kind: p.kind_proposal, lang: p.lang_proposal
            });
            if (emailed) await p.update({ email_sent_at: new Date() });
        }
        res.json({
            error: null,
            success: emailed
                ? 'Propuesta aprobada: le hemos escrito para decírselo'
                : 'Propuesta aprobada, pero no se pudo enviar el correo',
            code: emailed ? null : 'email_failed',
            data: shape(p, { withUser: true })
        });
    } catch (err) {
        console.error('-> activity proposals consider() - Error =', err);
        res.status(500).json({ error: 'Error al aprobar la propuesta' });
    }
}

// POST /activity-proposals/:id/decline — no email.
async function decline(req, res) {
    try {
        const p = await decide(req, res, 'declined');
        if (!p) return;
        res.json({ error: null, success: 'Propuesta descartada', data: shape(p, { withUser: true }) });
    } catch (err) {
        console.error('-> activity proposals decline() - Error =', err);
        res.status(500).json({ error: 'Error al descartar la propuesta' });
    }
}

export default { create, mine, withdraw, list, count, consider, decline };
