// back-end/controllers/gallery/gallery_engagement_controller.js
//
// What readers do in the Galería (models/gallery_models.js, migration 032):
// - Likes on an illustration (a "work") and on an obra (a "piece"): anyone
//   with an account, a toggle.
// - Comments on an illustration: everyone reads them; anyone with an account
//   writes (COMMENT_MAX characters, COMMENTS_PER_HOUR); the exhibition's
//   artist and super admins delete them.
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

// Likes or unlikes (a toggle); answers the new state and count.
async function toggle(model, key, id, userId) {
    const where = { [key]: id, user_id: userId };
    const existing = await model.findOne({ where });
    if (existing) await existing.destroy();
    else {
        try {
            await model.create(where);
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
        if (!(await publicWork(req.params.id))) return res.status(404).json({ error: NO_WORK });
        res.json({ error: null, data: await toggle(gallery_work_like_model, 'work_id', Number(req.params.id), user.id_user) });
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
        if (!(await publicPiece(req.params.id))) return res.status(404).json({ error: NO_PIECE });
        res.json({ error: null, data: await toggle(gallery_piece_like_model, 'piece_id', Number(req.params.id), user.id_user) });
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
        const created = await gallery_work_comment_model.create({ work_id: work.id_work, user_id: user.id_user, content_comment: text });
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

export default { likeWork, likePiece, listComments, createComment, deleteComment };
