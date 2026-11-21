// back-end/controllers/magazine_workshop/call_vote_api_controller.js
//
// The votes on a convocatoria's published works (articles with
// call_id_article; models/call_vote_model.js):
//   - anyone with an account: ONE public vote per call;
//   - super admins: up to THREE works per call, counted apart (their votes
//     don't go into the public tally);
//   - nobody votes for their own work;
//   - voting is open until the resolution day (the jury's day): a vote can
//     be withdrawn or moved to another work until then;
//   - the results (both tallies, each in its own list) are seen by the super
//     admins at any time and by everyone from the resolution day on.
import { Op } from "sequelize";
import sequelize from "../../config/sequelize.js";
import call_vote_model from "../../models/call_vote_model.js";
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import magazine_article_model from "../../models/magazine_article_model.js";
import article_author_model from "../../models/article_author_model.js";
import user_model from "../../models/user_model.js";
import { isContest } from "./magazine_workshop_controller.js";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";

export const JURY_VOTES = 3;
const todayDay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
const dayOf = (v) => {
    if (!v) return null;
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};

/** The published call, or null (drafts and calls under review: nobody votes). */
async function loadCall(id) {
    const call = await magazine_workshop_model.findByPk(id);
    return call && call.active_workshop && isContest(call) && call.review_status_workshop === 'approved' ? call : null;
}

/** Voting is open before the resolution day; from that day the results are public. */
export function votingWindow(call, today = todayDay()) {
    const closesOn = dayOf(call.resolution_date_workshop);
    return { closes_on: closesOn, open: !!closesOn && today < closesOn, resolved: !!closesOn && today >= closesOn };
}

/** The call's published works, oldest first, with their authors. */
async function callWorks(callId) {
    const rows = await magazine_article_model.findAll({
        where: { call_id_article: callId, status_article: 'published', active_article: true },
        attributes: ['id_article', 'title_article', 'excerpt_article', 'cover_image_article', 'date_published', 'author_name'],
        order: [['date_published', 'ASC'], ['id_article', 'ASC']]
    });
    const ids = rows.map((r) => r.id_article);
    const authors = ids.length ? await article_author_model.findAll({
        where: { article_id: ids },
        include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'image_user'] }],
        order: [['author_order', 'ASC']]
    }) : [];
    return rows.map((r) => {
        const own = authors.filter((a) => a.article_id === r.id_article && a.user);
        return {
            ...r.toJSON(),
            authors: own.length
                ? own.map((a) => ({ id_user: a.user.id_user, name_user: a.user.name_user, image_user: a.user.image_user }))
                : (r.author_name ? [{ id_user: null, name_user: r.author_name, image_user: null }] : [])
        };
    });
}

/** What this person can do: { signed_in, jury, public_vote, jury_votes, jury_max }. */
async function myVotes(callId, user) {
    if (!user) return { signed_in: false, jury: false, public_vote: null, jury_votes: [], jury_max: JURY_VOTES };
    const jury = roleSnapshot(user).isSuperAdmin;
    const votes = await call_vote_model.findAll({ where: { workshop_id: callId, user_id: user.id_user }, attributes: ['article_id', 'jury_vote'] });
    return {
        signed_in: true,
        jury,
        public_vote: votes.find((v) => !v.jury_vote)?.article_id ?? null,
        jury_votes: votes.filter((v) => v.jury_vote).map((v) => v.article_id),
        jury_max: JURY_VOTES
    };
}

async function state(call, user) {
    const works = await callWorks(call.id_workshop);
    const me = await myVotes(call.id_workshop, user);
    const window = votingWindow(call);
    return {
        call: {
            id_workshop: call.id_workshop,
            title_workshop: call.title_workshop,
            with_prizes_workshop: !!call.with_prizes_workshop,
            section_workshop: call.section_workshop
        },
        ...window,
        results_visible: window.resolved || me.jury,
        // Own works can't be voted.
        works: works.map((w) => ({ ...w, mine: !!user && w.authors.some((a) => a.id_user === user.id_user) })),
        me
    };
}

// GET /calls/:id_workshop/voting — the works and this person's votes
// (anyone: signed out, the buttons ask to sign in).
async function voting(req, res) {
    try {
        const call = await loadCall(req.params.id_workshop);
        if (!call) return res.status(404).json({ error: 'Convocatoria no encontrada' });
        const user = await getRequestUser(req);
        res.json({ error: null, data: await state(call, user) });
    } catch (err) {
        console.error('-> call votes voting() - Error =', err);
        res.status(500).json({ error: 'Error al cargar la votación' });
    }
}

/** The signed-in voter, the open call and the work they vote on — or null (answer sent). */
async function voteTarget(req, res, articleId) {
    const user = await getRequestUser(req);
    if (!user) {
        res.status(403).json({ error: 'Inicia sesión para votar', code: 'login_required' });
        return null;
    }
    const call = await loadCall(req.params.id_workshop);
    if (!call) {
        res.status(404).json({ error: 'Convocatoria no encontrada' });
        return null;
    }
    if (!votingWindow(call).open) {
        res.status(400).json({ error: 'La votación de esta convocatoria está cerrada', code: 'closed' });
        return null;
    }
    const article = await magazine_article_model.findOne({
        where: { id_article: articleId, call_id_article: call.id_workshop, status_article: 'published', active_article: true },
        attributes: ['id_article']
    });
    if (!article) {
        res.status(404).json({ error: 'Esta obra no está en la convocatoria', code: 'not_in_call' });
        return null;
    }
    return { user, call, article };
}

// POST /calls/:id_workshop/votes { article_id, move } — votes. Someone who
// already gave their public vote moves it with `move: true`.
async function vote(req, res) {
    try {
        const articleId = Number(req.body?.article_id);
        if (!Number.isInteger(articleId) || articleId <= 0) return res.status(400).json({ error: 'Falta la obra' });
        const ctx = await voteTarget(req, res, articleId);
        if (!ctx) return;
        const { user, call } = ctx;
        const own = await article_author_model.findOne({ where: { article_id: articleId, user_id: user.id_user } });
        if (own) return res.status(400).json({ error: 'No puedes votar tu propia obra', code: 'own_work' });
        const jury = roleSnapshot(user).isSuperAdmin;

        const outcome = await sequelize.transaction(async (t) => {
            const mine = await call_vote_model.findAll({
                where: { workshop_id: call.id_workshop, user_id: user.id_user, jury_vote: jury },
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            if (mine.some((v) => v.article_id === articleId)) return { ok: true };
            if (jury) {
                if (mine.length >= JURY_VOTES) return { error: `Ya has dado tus ${JURY_VOTES} votos en esta convocatoria: retira uno para votar otra obra`, code: 'jury_limit' };
                await call_vote_model.create({ workshop_id: call.id_workshop, article_id: articleId, user_id: user.id_user, jury_vote: true }, { transaction: t });
                return { ok: true };
            }
            if (mine.length) {
                if (req.body?.move !== true) return { error: 'Ya has votado en esta convocatoria', code: 'already_voted', voted: mine[0].article_id };
                await mine[0].update({ article_id: articleId }, { transaction: t });
                return { ok: true, moved: true };
            }
            await call_vote_model.create({ workshop_id: call.id_workshop, article_id: articleId, user_id: user.id_user, jury_vote: false }, { transaction: t });
            return { ok: true };
        });
        if (outcome.error) return res.status(409).json({ error: outcome.error, code: outcome.code, data: outcome.voted ? { voted: outcome.voted } : null });
        res.json({ error: null, success: outcome.moved ? 'Has cambiado tu voto' : 'Voto registrado', data: await state(call, user) });
    } catch (err) {
        if (err?.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Ya has votado esta obra', code: 'already_voted' });
        }
        console.error('-> call votes vote() - Error =', err);
        res.status(500).json({ error: 'Error al registrar el voto' });
    }
}

// DELETE /calls/:id_workshop/votes/:id_article — withdraws this person's
// vote on that work (while voting is open).
async function unvote(req, res) {
    try {
        const articleId = Number(req.params.id_article);
        const ctx = await voteTarget(req, res, articleId);
        if (!ctx) return;
        const { user, call } = ctx;
        const removed = await call_vote_model.destroy({ where: { workshop_id: call.id_workshop, user_id: user.id_user, article_id: articleId } });
        if (!removed) return res.status(404).json({ error: 'No habías votado esta obra' });
        res.json({ error: null, success: 'Has retirado tu voto', data: await state(call, user) });
    } catch (err) {
        console.error('-> call votes unvote() - Error =', err);
        res.status(500).json({ error: 'Error al retirar el voto' });
    }
}

// GET /calls/:id_workshop/results — the public vote and the super admins',
// each ranked (every work, with 0 too). Before the resolution day only the
// super admins see them; anyone else gets { visible: false, results_on }.
async function results(req, res) {
    try {
        const call = await loadCall(req.params.id_workshop);
        if (!call) return res.status(404).json({ error: 'Convocatoria no encontrada' });
        const user = await getRequestUser(req);
        const window = votingWindow(call);
        const jury = !!user && roleSnapshot(user).isSuperAdmin;
        const base = { call: { id_workshop: call.id_workshop, title_workshop: call.title_workshop }, ...window, results_on: window.closes_on };
        if (!window.resolved && !jury) return res.json({ error: null, data: { ...base, visible: false } });

        const works = await callWorks(call.id_workshop);
        const counts = await call_vote_model.findAll({
            where: { workshop_id: call.id_workshop, article_id: { [Op.in]: works.map((w) => w.id_article) } },
            attributes: ['article_id', 'jury_vote', [sequelize.fn('COUNT', sequelize.col('id_vote')), 'n']],
            group: ['article_id', 'jury_vote'],
            raw: true
        });
        const tally = (juryVote) => works
            .map((w) => ({
                id_article: w.id_article,
                title_article: w.title_article,
                authors: w.authors.map((a) => a.name_user),
                votes: Number(counts.find((c) => c.article_id === w.id_article && !!c.jury_vote === juryVote)?.n || 0)
            }))
            .sort((a, b) => b.votes - a.votes || a.title_article.localeCompare(b.title_article, 'es'));
        const voters = async (juryVote) => call_vote_model.count({ where: { workshop_id: call.id_workshop, jury_vote: juryVote }, distinct: true, col: 'user_id' });
        res.json({
            error: null,
            data: {
                ...base,
                visible: true,
                public: tally(false),
                jury: tally(true),
                public_voters: await voters(false),
                jury_voters: await voters(true),
                jury_max: JURY_VOTES
            }
        });
    } catch (err) {
        console.error('-> call votes results() - Error =', err);
        res.status(500).json({ error: 'Error al cargar los resultados' });
    }
}

export default { voting, vote, unvote, results };
