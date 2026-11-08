// back-end/controllers/gallery/gallery_engagement_controller.js
//
// What readers do in the Galería (models/gallery_models.js, migration 032):
// - Likes on an illustration (a "work") and on an obra (a "piece"): anyone
//   with an account, a toggle.
// - Comments on an illustration: everyone reads them; anyone with an account
//   writes (COMMENT_MAX characters, COMMENTS_PER_HOUR); the exhibition's
//   artist and super admins delete them.
// - The artist's bell (artistActivity, in GET /gallery/feed): others' new
//   comments and likes on their exhibition, grouped by illustration / obra,
//   until they've seen them (artist_seen, migration 033).
// Only on what the public sees: approved illustrations of an artist's
// exhibition, and obras with at least one. Sharing needs nothing here: the
// links (?exhibition=…&piece=… / &work=…) open the public exhibition.
// Refusals are 403 with a `code` (never 401, which logs the reader out).
import { Op, fn, col } from "sequelize";
import user_model from "../../models/user_model.js";
import {
    gallery_exhibition_model, gallery_piece_model, gallery_work_model,
    gallery_work_comment_model, gallery_work_like_model, gallery_piece_like_model,
    COMMENT_MAX
} from "../../models/gallery_models.js";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";

const COMMENTS_PER_HOUR = 30;
const PERSON = ['id_user', 'name_user', 'image_user'];
const cleanText = (value) => String(value ?? '').replace(/\r\n/g, '\n').trim();

const withArtist = { model: gallery_exhibition_model, as: 'exhibition', include: [{ model: user_model, as: 'artist', attributes: [...PERSON, 'is_artist'] }] };

/** An illustration the public sees (approved, in an artist's exhibition), or null. */
async function publicWork(id) {
    const work = await gallery_work_model.findByPk(id, { include: [withArtist] });
    if (!work || work.status_work !== 'approved' || !roleSnapshot(work.exhibition?.artist).isArtist) return null;
    return work;
}

/** An obra the public sees (in an artist's exhibition, with an approved illustration), or null. */
async function publicPiece(id) {
    const piece = await gallery_piece_model.findByPk(id, { include: [withArtist] });
    if (!piece || !roleSnapshot(piece.exhibition?.artist).isArtist) return null;
    const shown = await gallery_work_model.count({ where: { piece_id: piece.id_piece, status_work: 'approved' } });
    return shown > 0 ? piece : null;
}

const NO_WORK = 'Esta ilustración no existe';
const NO_PIECE = 'Esta obra no existe';

// { id → count } for a grouped COUNT.
async function countsBy(model, key, ids) {
    if (!ids.length) return new Map();
    const rows = await model.findAll({
        attributes: [key, [fn('COUNT', col(key)), 'n']],
        where: { [key]: ids },
        group: [key],
        raw: true
    });
    return new Map(rows.map((r) => [r[key], Number(r.n)]));
}

async function mineOf(model, key, ids, userId) {
    if (!ids.length || !userId) return new Set();
    const rows = await model.findAll({ attributes: [key], where: { [key]: ids, user_id: userId }, raw: true });
    return new Set(rows.map((r) => r[key]));
}

/**
 * The obras of a public exhibition (gallery_api_controller pieceOf shapes)
 * with their likes — `likes`, `liked` (by `userId`) — and, on each
 * illustration, `comments` too.
 */
export async function withEngagement(pieces, userId) {
    const pieceIds = pieces.map((p) => p.id_piece);
    const workIds = pieces.flatMap((p) => p.works.map((w) => w.id_work));
    const [pieceLikes, workLikes, workComments, piecesMine, worksMine] = await Promise.all([
        countsBy(gallery_piece_like_model, 'piece_id', pieceIds),
        countsBy(gallery_work_like_model, 'work_id', workIds),
        countsBy(gallery_work_comment_model, 'work_id', workIds),
        mineOf(gallery_piece_like_model, 'piece_id', pieceIds, userId),
        mineOf(gallery_work_like_model, 'work_id', workIds, userId)
    ]);
    return pieces.map((p) => ({
        ...p,
        likes: pieceLikes.get(p.id_piece) || 0,
        liked: piecesMine.has(p.id_piece),
        works: p.works.map((w) => ({
            ...w,
            likes: workLikes.get(w.id_work) || 0,
            liked: worksMine.has(w.id_work),
            comments: workComments.get(w.id_work) || 0
        }))
    }));
}

// Likes or unlikes (a toggle); answers the new state and count. The artist's
// own like is born seen (it's not news to them).
async function toggle(model, key, id, userId, artistId) {
    const where = { [key]: id, user_id: userId };
    const existing = await model.findOne({ where });
    if (existing) await existing.destroy();
    else {
        try {
            await model.create({ ...where, artist_seen: userId === artistId });
        } catch (err) {
            // A double tap: the other request made it.
            if (err.name !== 'SequelizeUniqueConstraintError') throw err;
        }
    }
    return { liked: !existing, likes: await model.count({ where: { [key]: id } }) };
}

const signedIn = async (req, res, error) => {
    const user = await getRequestUser(req);
    if (!user) res.status(403).json({ error, code: 'login_required' });
    return user;
};

/** POST /gallery/works/:id/like — a reader with an account likes (or unlikes) an illustration. */
async function likeWork(req, res) {
    try {
        const user = await signedIn(req, res, 'Inicia sesión para dar me gusta');
        if (!user) return;
        const work = await publicWork(req.params.id);
        if (!work) return res.status(404).json({ error: NO_WORK });
        res.json({ error: null, data: await toggle(gallery_work_like_model, 'work_id', work.id_work, user.id_user, work.exhibition.user_id) });
    } catch (err) {
        console.error('gallery - likeWork:', err);
        res.status(500).json({ error: 'Error al guardar el me gusta' });
    }
}

/** POST /gallery/pieces/:id/like — the same for an obra. */
async function likePiece(req, res) {
    try {
        const user = await signedIn(req, res, 'Inicia sesión para dar me gusta');
        if (!user) return;
        const piece = await publicPiece(req.params.id);
        if (!piece) return res.status(404).json({ error: NO_PIECE });
        res.json({ error: null, data: await toggle(gallery_piece_like_model, 'piece_id', piece.id_piece, user.id_user, piece.exhibition.user_id) });
    } catch (err) {
        console.error('gallery - likePiece:', err);
        res.status(500).json({ error: 'Error al guardar el me gusta' });
    }
}

const commentOf = (c) => ({
    id_comment: c.id_comment,
    work_id: c.work_id,
    content_comment: c.content_comment,
    created_at: c.created_at,
    user_id: c.user_id,
    author_name: c.user?.name_user || 'Usuario',
    author_image: c.user?.image_user || null
});

/** GET /gallery/works/:id/comments — everyone: an illustration's comments, newest first. */
async function listComments(req, res) {
    try {
        if (!(await publicWork(req.params.id))) return res.status(404).json({ error: NO_WORK });
        const comments = await gallery_work_comment_model.findAll({
            where: { work_id: req.params.id },
            include: [{ model: user_model, as: 'user', attributes: PERSON }],
            order: [['created_at', 'DESC'], ['id_comment', 'DESC']]
        });
        res.json({ error: null, data: comments.map(commentOf) });
    } catch (err) {
        console.error('gallery - listComments:', err);
        res.status(500).json({ error: 'Error al obtener los comentarios' });
    }
}

/** POST /gallery/works/:id/comments {content_comment} — a reader with an account comments. */
async function createComment(req, res) {
    try {
        const user = await signedIn(req, res, 'Debes iniciar sesión para comentar');
        if (!user) return;
        const text = cleanText(req.body?.content_comment);
        if (!text) return res.status(400).json({ error: 'El comentario no puede estar vacío' });
        if (text.length > COMMENT_MAX) return res.status(400).json({ error: 'El comentario es demasiado largo (máx. 2000 caracteres)' });
        const work = await publicWork(req.params.id);
        if (!work) return res.status(404).json({ error: NO_WORK });
        const lastHour = await gallery_work_comment_model.count({
            where: { user_id: user.id_user, created_at: { [Op.gte]: new Date(Date.now() - 3600 * 1000) } }
        });
        if (lastHour >= COMMENTS_PER_HOUR) {
            return res.status(429).json({ error: 'Has escrito muchos comentarios en poco tiempo. Espera un poco', code: 'too_many' });
        }
        const created = await gallery_work_comment_model.create({
            work_id: work.id_work, user_id: user.id_user, content_comment: text,
            artist_seen: user.id_user === work.exhibition.user_id
        });
        res.json({ error: null, data: commentOf({ ...created.get(), user }), success: 'Comentario publicado' });
    } catch (err) {
        console.error('gallery - createComment:', err);
        res.status(500).json({ error: 'Error al publicar el comentario' });
    }
}

/** DELETE /gallery/comments/:id — the exhibition's artist or a super admin. */
async function deleteComment(req, res) {
    try {
        const user = await signedIn(req, res, 'Inicia sesión para continuar');
        if (!user) return;
        const comment = await gallery_work_comment_model.findByPk(req.params.id, {
            include: [{ model: gallery_work_model, as: 'work', include: [{ model: gallery_exhibition_model, as: 'exhibition' }] }]
        });
        if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
        const isArtistOfIt = comment.work?.exhibition?.user_id === user.id_user;
        if (!isArtistOfIt && !roleSnapshot(user).isSuperAdmin) {
            return res.status(403).json({ error: 'Solo la artista o el artista de la exposición (o un super admin) puede borrar comentarios', code: 'not_owner' });
        }
        await comment.destroy();
        res.json({ error: null, success: 'Comentario eliminado' });
    } catch (err) {
        console.error('gallery - deleteComment:', err);
        res.status(500).json({ error: 'Error al eliminar el comentario' });
    }
}

// ---------- the artist's bell ----------

const SNIPPET_MAX = 140;

// Rows (newest first) grouped by what they're on: how many, the ids (to mark
// them seen) and the newest one's person and time.
function groupBy(rows, kind, keyOf, titleOf, idOf, extra = () => ({})) {
    const groups = new Map();
    for (const r of rows) {
        const key = keyOf(r);
        if (!groups.has(key)) {
            groups.set(key, {
                kind, target_id: key, title: titleOf(r), count: 0, ids: [],
                last_name: r.user?.name_user || null, last_at: r.created_at, ...extra(r)
            });
        }
        const g = groups.get(key);
        g.count += 1;
        g.ids.push(idOf(r));
    }
    return [...groups.values()];
}

/**
 * Others' comments and likes on an artist's exhibition they haven't seen:
 * { exhibition_id, items: [{ kind: 'comment' | 'work-like' | 'piece-like',
 *   target_id, title, count, ids, last_name, last_at, last_text? }] }, newest first.
 */
export async function artistActivity(ex) {
    const unseen = { artist_seen: false, user_id: { [Op.ne]: ex.user_id } };
    const person = { model: user_model, as: 'user', attributes: PERSON };
    const onWork = { model: gallery_work_model, as: 'work', where: { exhibition_id: ex.id_exhibition, status_work: 'approved' }, attributes: ['id_work', 'title_work'] };
    const onPiece = { model: gallery_piece_model, as: 'piece', where: { exhibition_id: ex.id_exhibition }, attributes: ['id_piece', 'title_piece'] };
    const [comments, workLikes, pieceLikes] = await Promise.all([
        gallery_work_comment_model.findAll({ where: unseen, include: [onWork, person], order: [['id_comment', 'DESC']] }),
        gallery_work_like_model.findAll({ where: unseen, include: [onWork, person], order: [['id_like', 'DESC']] }),
        gallery_piece_like_model.findAll({ where: unseen, include: [onPiece, person], order: [['id_like', 'DESC']] })
    ]);
    const snippet = (text) => (text.length > SNIPPET_MAX ? `${text.slice(0, SNIPPET_MAX - 1)}…` : text);
    const items = [
        ...groupBy(comments, 'comment', (c) => c.work_id, (c) => c.work.title_work || null, (c) => c.id_comment,
            (c) => ({ last_text: snippet(c.content_comment) })),
        ...groupBy(workLikes, 'work-like', (l) => l.work_id, (l) => l.work.title_work || null, (l) => l.id_like),
        ...groupBy(pieceLikes, 'piece-like', (l) => l.piece_id, (l) => l.piece.title_piece || null, (l) => l.id_like)
    ].sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
    return { exhibition_id: ex.id_exhibition, items };
}

const idList = (value) => (Array.isArray(value) ? value.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 1000) : []);

/** POST /gallery/feed/activity-seen {comments, work_likes, piece_likes: [ids]} — artists: seen in their bell. */
async function activitySeen(req, res) {
    try {
        const ex = await gallery_exhibition_model.findOne({ where: { user_id: req.galleryUser.id_user } });
        if (!ex) return res.json({ error: null });
        // Only what's on their own exhibition.
        const [works, pieces] = await Promise.all([
            gallery_work_model.findAll({ where: { exhibition_id: ex.id_exhibition }, attributes: ['id_work'], raw: true }),
            gallery_piece_model.findAll({ where: { exhibition_id: ex.id_exhibition }, attributes: ['id_piece'], raw: true })
        ]);
        const workIds = works.map((w) => w.id_work);
        const pieceIds = pieces.map((p) => p.id_piece);
        const seen = { artist_seen: true };
        const [comments, workLikes, pieceLikes] = [idList(req.body?.comments), idList(req.body?.work_likes), idList(req.body?.piece_likes)];
        await Promise.all([
            comments.length && gallery_work_comment_model.update(seen, { where: { id_comment: comments, work_id: workIds } }),
            workLikes.length && gallery_work_like_model.update(seen, { where: { id_like: workLikes, work_id: workIds } }),
            pieceLikes.length && gallery_piece_like_model.update(seen, { where: { id_like: pieceLikes, piece_id: pieceIds } })
        ]);
        res.json({ error: null });
    } catch (err) {
        console.error('gallery - activitySeen:', err);
        res.status(500).json({ error: 'Error al guardar los avisos vistos' });
    }
}

export default { likeWork, likePiece, listComments, createComment, deleteComment, activitySeen };
