// back-end/controllers/gallery/gallery_api_controller.js
//
// The Galería (models/gallery_models.js, migration 027).
// - Anyone sees the exhibitions: an artist's title, short text and their
//   APPROVED works (a super admin reviews each one before it's shown).
// - Visual artists (user.is_artist) manage their own exhibition: its text and
//   up to WORKS_MAX (15) works (an image, a title — none: «Sin título» — and
//   its size in pixels, read from the file). Any change to a work sends it
//   back to review.
// - Visitors with an account write to an artist; each visitor ↔ artist pair is
//   one conversation, kept, and answered in the gallery's chat. The bell feed
//   tells each side about unread messages, and artists about their reviews.
// - Super admins review the works and invite artists (like authors: an
//   account for that email, accepted or declined when they first sign in).
// Refusals are 403 with a `code` (never 401, which logs the reader out).
import multer from "multer";
import { Op } from "sequelize";
import user_model from "../../models/user_model.js";
import {
    gallery_exhibition_model, gallery_work_model, gallery_conversation_model, gallery_message_model,
    WORKS_MAX
} from "../../models/gallery_models.js";
import { getRequestUser, roleSnapshot, requireSuperAdmin } from "../../utils/authHelper.js";
import { sanitizeUserData } from "../user/google_oauth_controller.js";
import { sendArtistInvitationEmail } from "../../services/emailService.js";
import { IMAGE_TYPES, IMAGE_MAX_MB, ensureDir, saveWorkImage, removeWorkImage, workImagePath } from "./gallery_store.js";

ensureDir();

const TITLE_MAX = 120;
const STATEMENT_MAX = 1000;
const WORK_TITLE_MAX = 150;
const MESSAGE_MAX = 2000;
const REASON_MAX = 500;
// Messages one person can send in an hour (spam brake).
const MESSAGES_PER_HOUR = 60;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const cleanEmail = (value) => String(value ?? '').trim().toLowerCase();
const cleanText = (value) => String(value ?? '').replace(/\r\n/g, '\n').trim();
const PERSON = ['id_user', 'name_user', 'image_user'];
// Dates come back from MySQL as UTC strings without a zone («2026-10-24
// 13:39:10», sequelize dateStrings); handed back to a query as they are, Node
// reads them as local time (hours off). As a Date, in UTC.
const utcDate = (v) => (v instanceof Date ? v : v ? new Date(String(v).replace(' ', 'T') + 'Z') : null);

// ---------- uploads ----------

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: IMAGE_MAX_MB * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
        const err = new Error('bad type');
        err.code = 'BAD_TYPE';
        cb(err);
    }
}).single('image');

/** multer's errors (size, type…) as JSON. */
function upload(req, res, next) {
    imageUpload(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: `La imagen es demasiado grande (máximo ${IMAGE_MAX_MB} MB)` });
        }
        if (err.code === 'BAD_TYPE') {
            return res.status(400).json({ error: 'Formato de imagen no admitido: usa JPG, PNG, WebP, AVIF, GIF o TIFF' });
        }
        res.status(400).json({ error: 'Error al recibir la imagen' });
    });
}

// Runs BEFORE multer: no image is received from someone who isn't an artist.
async function artistOnly(req, res, next) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.status(403).json({ error: 'Inicia sesión para continuar', code: 'login_required' });
        if (!roleSnapshot(user).isArtist) {
            return res.status(403).json({ error: 'Solo las y los artistas de la galería pueden hacer esto', code: 'artist_required' });
        }
        req.galleryUser = user;
        next();
    } catch (err) {
        console.error('gallery - artistOnly:', err);
        res.status(500).json({ error: 'Error al comprobar tu cuenta' });
    }
}

// ---------- shapes ----------

const personOf = (u) => (u ? { id_user: u.id_user, name_user: u.name_user, image_user: u.image_user || null } : null);

const workOf = (w, { withReview = false } = {}) => ({
    id_work: w.id_work,
    image: workImagePath(w.image_work),
    title_work: w.title_work || null,
    width_px: w.width_px,
    height_px: w.height_px,
    position_work: w.position_work,
    ...(withReview ? {
        status_work: w.status_work,
        rejection_reason: w.rejection_reason || null,
        reviewed_at: w.reviewed_at || null
    } : {})
});

const byPosition = (a, b) => (a.position_work - b.position_work) || (a.id_work - b.id_work);

async function exhibitionOfArtist(userId, { create = false } = {}) {
    let ex = await gallery_exhibition_model.findOne({ where: { user_id: userId } });
    if (!ex && create) {
        try {
            ex = await gallery_exhibition_model.create({ user_id: userId });
        } catch (err) {
            // Two requests at once (a page loading twice): the other one made it.
            if (err.name !== 'SequelizeUniqueConstraintError') throw err;
            ex = await gallery_exhibition_model.findOne({ where: { user_id: userId } });
        }
    }
    return ex;
}

// ---------- public ----------

/** GET /gallery — the exhibitions with at least one approved work, newest first. */
async function list(req, res) {
    try {
        const exhibitions = await gallery_exhibition_model.findAll({
            include: [
                { model: user_model, as: 'artist', attributes: [...PERSON, 'is_artist'], where: { is_artist: true } },
                { model: gallery_work_model, as: 'works', where: { status_work: 'approved' }, required: true }
            ],
            order: [['updated_at', 'DESC']]
        });
        res.json({
            error: null,
            data: exhibitions.map((ex) => {
                const works = [...ex.works].sort(byPosition);
                return {
                    id_exhibition: ex.id_exhibition,
                    title: ex.title || null,
                    statement: ex.statement || null,
                    artist: personOf(ex.artist),
                    cover: workOf(works[0]),
                    works_count: works.length
                };
            })
        });
    } catch (err) {
        console.error('gallery - list:', err);
        res.status(500).json({ error: 'Error al cargar la galería' });
    }
}

/** GET /gallery/exhibition/:id — one exhibition and its approved works. */
async function exhibition(req, res) {
    try {
        const ex = await gallery_exhibition_model.findByPk(req.params.id, {
            include: [{ model: user_model, as: 'artist', attributes: [...PERSON, 'is_artist'] }]
        });
        if (!ex || !roleSnapshot(ex.artist).isArtist) {
            return res.status(404).json({ error: 'Esta exposición no existe' });
        }
        const works = await gallery_work_model.findAll({ where: { exhibition_id: ex.id_exhibition, status_work: 'approved' } });
        if (works.length === 0) return res.status(404).json({ error: 'Esta exposición no existe' });
        res.json({
            error: null,
            data: {
                id_exhibition: ex.id_exhibition,
                title: ex.title || null,
                statement: ex.statement || null,
                artist: personOf(ex.artist),
                works: works.sort(byPosition).map((w) => workOf(w))
            }
        });
    } catch (err) {
        console.error('gallery - exhibition:', err);
        res.status(500).json({ error: 'Error al cargar la exposición' });
    }
}

// ---------- the artist's own exhibition ----------

async function mineData(user) {
    const ex = await exhibitionOfArtist(user.id_user, { create: true });
    const works = await gallery_work_model.findAll({ where: { exhibition_id: ex.id_exhibition } });
    return {
        id_exhibition: ex.id_exhibition,
        title: ex.title || null,
        statement: ex.statement || null,
        artist: personOf(user),
        works: works.sort(byPosition).map((w) => workOf(w, { withReview: true })),
        works_max: WORKS_MAX
    };
}

/** GET /gallery/mine — artists: their exhibition with every work and its review. */
async function mine(req, res) {
    try {
        res.json({ error: null, data: await mineData(req.galleryUser) });
    } catch (err) {
        console.error('gallery - mine:', err);
        res.status(500).json({ error: 'Error al cargar tu exposición' });
    }
}

/** PATCH /gallery/mine { title, statement } — artists: the exhibition's text. */
async function updateMine(req, res) {
    try {
        const title = req.body?.title !== undefined ? cleanName(req.body.title) : undefined;
        const statement = req.body?.statement !== undefined ? cleanText(req.body.statement) : undefined;
        if (title !== undefined && title.length > TITLE_MAX) {
            return res.status(400).json({ error: `El título es demasiado largo (máximo ${TITLE_MAX} caracteres)`, code: 'title_too_long' });
        }
        if (statement !== undefined && statement.length > STATEMENT_MAX) {
            return res.status(400).json({ error: `El texto es demasiado largo (máximo ${STATEMENT_MAX} caracteres)`, code: 'statement_too_long' });
        }
        const ex = await exhibitionOfArtist(req.galleryUser.id_user, { create: true });
        await ex.update({
            ...(title !== undefined ? { title: title || null } : {}),
            ...(statement !== undefined ? { statement: statement || null } : {})
        });
        res.json({ error: null, data: await mineData(req.galleryUser), success: 'Exposición guardada' });
    } catch (err) {
        console.error('gallery - updateMine:', err);
        res.status(500).json({ error: 'Error al guardar la exposición' });
    }
}

/** POST /gallery/mine/works (multipart: image, title) — artists: a new work, to review. */
async function addWork(req, res) {
    try {
        if (!req.file) return res.status(400).json({ error: 'Falta la imagen de la obra', code: 'image_required' });
        const title = cleanName(req.body?.title);
        if (title.length > WORK_TITLE_MAX) {
            return res.status(400).json({ error: `El título es demasiado largo (máximo ${WORK_TITLE_MAX} caracteres)`, code: 'title_too_long' });
        }
        const ex = await exhibitionOfArtist(req.galleryUser.id_user, { create: true });
        const count = await gallery_work_model.count({ where: { exhibition_id: ex.id_exhibition } });
        if (count >= WORKS_MAX) {
            return res.status(409).json({ error: `Una exposición tiene como mucho ${WORKS_MAX} obras`, code: 'works_full' });
        }
        let saved;
        try {
            saved = await saveWorkImage(req.file.buffer);
        } catch (err) {
            console.error('gallery - addWork image:', err.message);
            return res.status(400).json({ error: 'No se pudo leer la imagen', code: 'bad_image' });
        }
        const last = await gallery_work_model.max('position_work', { where: { exhibition_id: ex.id_exhibition } });
        await gallery_work_model.create({
            exhibition_id: ex.id_exhibition,
            image_work: saved.file,
            title_work: title || null,
            width_px: saved.width,
            height_px: saved.height,
            position_work: Number.isFinite(last) ? last + 1 : 0,
            status_work: 'pending'
        });
        res.json({ error: null, data: await mineData(req.galleryUser), success: 'Obra subida: se verá cuando la revise el equipo' });
    } catch (err) {
        console.error('gallery - addWork:', err);
        res.status(500).json({ error: 'Error al subir la obra' });
    }
}

async function ownWork(req, res) {
    const ex = await exhibitionOfArtist(req.galleryUser.id_user);
    const work = ex && await gallery_work_model.findOne({ where: { id_work: req.params.id, exhibition_id: ex.id_exhibition } });
    if (!work) {
        res.status(404).json({ error: 'Esta obra no existe' });
        return null;
    }
    return work;
}

/**
 * PATCH /gallery/mine/works/:id (multipart: image?, title?) — artists: change a
 * work; any change sends it back to review.
 */
async function updateWork(req, res) {
    try {
        const work = await ownWork(req, res);
        if (!work) return;
        const changes = {};
        if (req.body?.title !== undefined) {
            const title = cleanName(req.body.title);
            if (title.length > WORK_TITLE_MAX) {
                return res.status(400).json({ error: `El título es demasiado largo (máximo ${WORK_TITLE_MAX} caracteres)`, code: 'title_too_long' });
            }
            if ((title || null) !== (work.title_work || null)) changes.title_work = title || null;
        }
        let oldFile = null;
        if (req.file) {
            let saved;
            try {
                saved = await saveWorkImage(req.file.buffer);
            } catch (err) {
                console.error('gallery - updateWork image:', err.message);
                return res.status(400).json({ error: 'No se pudo leer la imagen', code: 'bad_image' });
            }
            oldFile = work.image_work;
            Object.assign(changes, { image_work: saved.file, width_px: saved.width, height_px: saved.height });
        }
        if (Object.keys(changes).length) {
            await work.update({
                ...changes,
                status_work: 'pending', rejection_reason: null, reviewed_by: null, reviewed_at: null, review_seen: true
            });
            if (oldFile) removeWorkImage(oldFile);
        }
        res.json({
            error: null,
            data: await mineData(req.galleryUser),
            success: Object.keys(changes).length ? 'Obra guardada: se verá cuando la revise el equipo' : 'Obra guardada'
        });
    } catch (err) {
        console.error('gallery - updateWork:', err);
        res.status(500).json({ error: 'Error al guardar la obra' });
    }
}

/** DELETE /gallery/mine/works/:id — artists: take a work down. */
async function removeWork(req, res) {
    try {
        const work = await ownWork(req, res);
        if (!work) return;
        const file = work.image_work;
        await work.destroy();
        removeWorkImage(file);
        res.json({ error: null, data: await mineData(req.galleryUser), success: 'Obra eliminada' });
    } catch (err) {
        console.error('gallery - removeWork:', err);
        res.status(500).json({ error: 'Error al eliminar la obra' });
    }
}

/** PATCH /gallery/mine/order { ids } — artists: the order of their works. */
async function reorderWorks(req, res) {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : null;
        const ex = await exhibitionOfArtist(req.galleryUser.id_user);
        if (!ids || !ex) return res.status(400).json({ error: 'Falta el orden de las obras' });
        const works = await gallery_work_model.findAll({ where: { exhibition_id: ex.id_exhibition } });
        const own = new Set(works.map((w) => w.id_work));
        if (ids.length !== own.size || !ids.every((id) => own.has(id))) {
            return res.status(400).json({ error: 'El orden no coincide con tus obras' });
        }
        await Promise.all(ids.map((id, i) => gallery_work_model.update({ position_work: i }, { where: { id_work: id } })));
        res.json({ error: null, data: await mineData(req.galleryUser), success: 'Orden guardado' });
    } catch (err) {
        console.error('gallery - reorderWorks:', err);
        res.status(500).json({ error: 'Error al guardar el orden' });
    }
}

// ---------- review (super admins) ----------

/** GET /gallery/review?status=pending|approved|rejected — super admins. */
async function reviewList(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
        const works = await gallery_work_model.findAll({
            where: { status_work: status },
            include: [{
                model: gallery_exhibition_model, as: 'exhibition',
                include: [{ model: user_model, as: 'artist', attributes: PERSON }]
            }],
            order: [['updated_at', status === 'pending' ? 'ASC' : 'DESC']]
        });
        res.json({
            error: null,
            data: works.map((w) => ({
                ...workOf(w, { withReview: true }),
                updated_at: w.updated_at,
                exhibition: { id_exhibition: w.exhibition?.id_exhibition, title: w.exhibition?.title || null },
                artist: personOf(w.exhibition?.artist)
            }))
        });
    } catch (err) {
        console.error('gallery - reviewList:', err);
        res.status(500).json({ error: 'Error al cargar las obras' });
    }
}

/** GET /gallery/review/count — super admins: how many works wait for review. */
async function reviewCount(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        res.json({ error: null, data: { pending: await gallery_work_model.count({ where: { status_work: 'pending' } }) } });
    } catch (err) {
        console.error('gallery - reviewCount:', err);
        res.status(500).json({ error: 'Error al contar las obras' });
    }
}

/** POST /gallery/review/:id { decision: approve|reject, reason? } — super admins. */
async function review(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const decision = req.body?.decision;
        if (decision !== 'approve' && decision !== 'reject') {
            return res.status(400).json({ error: "La decisión debe ser 'approve' o 'reject'" });
        }
        const reason = cleanText(req.body?.reason).slice(0, REASON_MAX);
        const work = await gallery_work_model.findByPk(req.params.id);
        if (!work) return res.status(404).json({ error: 'Esta obra no existe' });
        await work.update({
            status_work: decision === 'approve' ? 'approved' : 'rejected',
            rejection_reason: decision === 'reject' ? (reason || null) : null,
            reviewed_by: admin.id_user,
            reviewed_at: new Date(),
            review_seen: false
        });
        res.json({
            error: null,
            data: workOf(work, { withReview: true }),
            success: decision === 'approve' ? 'Obra aprobada: ya se ve en la galería' : 'Obra rechazada'
        });
    } catch (err) {
        console.error('gallery - review:', err);
        res.status(500).json({ error: 'Error al revisar la obra' });
    }
}

// ---------- messages ----------

const sentLastHour = (userId) => gallery_message_model.count({
    where: { sender_id: userId, created_at: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) } }
});

function checkBody(body, res) {
    if (!body) {
        res.status(400).json({ error: 'Escribe un mensaje', code: 'empty' });
        return false;
    }
    if (body.length > MESSAGE_MAX) {
        res.status(400).json({ error: `El mensaje es demasiado largo (máximo ${MESSAGE_MAX} caracteres)`, code: 'too_long' });
        return false;
    }
    return true;
}

async function postMessage(conversation, user, body) {
    const message = await gallery_message_model.create({ conversation_id: conversation.id_conversation, sender_id: user.id_user, body });
    const now = message.created_at || new Date();
    const mySide = conversation.artist_id === user.id_user ? 'artist_read_at' : 'visitor_read_at';
    await conversation.update({ last_message_at: now, [mySide]: now });
    return message;
}

const messageOf = (m) => ({ id_message: m.id_message, sender_id: m.sender_id, body: m.body, created_at: m.created_at });

/**
 * POST /gallery/exhibition/:id/messages { body } — anyone signed in (not the
 * artist): writes to the artist, in their conversation (created if needed).
 */
async function writeToArtist(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.status(403).json({ error: 'Inicia sesión para escribir a la o el artista', code: 'login_required' });
        const ex = await gallery_exhibition_model.findByPk(req.params.id, {
            include: [{ model: user_model, as: 'artist', attributes: [...PERSON, 'is_artist'] }]
        });
        if (!ex || !roleSnapshot(ex.artist).isArtist) return res.status(404).json({ error: 'Esta exposición no existe' });
        if (ex.user_id === user.id_user) {
            return res.status(400).json({ error: 'No puedes escribirte a ti misma o a ti mismo', code: 'own_exhibition' });
        }
        const body = cleanText(req.body?.body);
        if (!checkBody(body, res)) return;
        if (await sentLastHour(user.id_user) >= MESSAGES_PER_HOUR) {
            return res.status(429).json({ error: 'Has enviado muchos mensajes en poco tiempo. Espera un poco', code: 'too_many' });
        }
        const [conversation] = await gallery_conversation_model.findOrCreate({
            where: { artist_id: ex.user_id, visitor_id: user.id_user },
            defaults: { artist_id: ex.user_id, visitor_id: user.id_user }
        });
        const message = await postMessage(conversation, user, body);
        res.json({
            error: null,
            data: { id_conversation: conversation.id_conversation, message: messageOf(message) },
            success: 'Mensaje enviado'
        });
    } catch (err) {
        console.error('gallery - writeToArtist:', err);
        res.status(500).json({ error: 'Error al enviar el mensaje' });
    }
}

// The conversations of a user (as artist and as visitor) with their unread count.
async function conversationsOf(userId) {
    const conversations = await gallery_conversation_model.findAll({
        where: { [Op.or]: [{ artist_id: userId }, { visitor_id: userId }] },
        include: [
            { model: user_model, as: 'artist', attributes: PERSON },
            { model: user_model, as: 'visitor', attributes: PERSON }
        ],
        order: [['last_message_at', 'DESC']]
    });
    const exhibitions = await gallery_exhibition_model.findAll({
        where: { user_id: [...new Set(conversations.map((c) => c.artist_id))] },
        attributes: ['id_exhibition', 'user_id', 'title']
    });
    const exhibitionOf = new Map(exhibitions.map((e) => [e.user_id, e]));
    return Promise.all(conversations.map(async (c) => {
        const role = c.artist_id === userId ? 'artist' : 'visitor';
        const readAt = role === 'artist' ? c.artist_read_at : c.visitor_read_at;
        const [unread, last] = await Promise.all([
            gallery_message_model.count({
                where: {
                    conversation_id: c.id_conversation,
                    sender_id: { [Op.ne]: userId },
                    ...(readAt ? { created_at: { [Op.gt]: utcDate(readAt) } } : {})
                }
            }),
            gallery_message_model.findOne({ where: { conversation_id: c.id_conversation }, order: [['created_at', 'DESC'], ['id_message', 'DESC']] })
        ]);
        const ex = exhibitionOf.get(c.artist_id);
        return {
            id_conversation: c.id_conversation,
            role,
            other: personOf(role === 'artist' ? c.visitor : c.artist),
            exhibition: ex ? { id_exhibition: ex.id_exhibition, title: ex.title || null } : null,
            last_message: last ? messageOf(last) : null,
            last_message_at: c.last_message_at,
            unread
        };
    }));
}

/** GET /gallery/conversations — the signed-in user's conversations. */
async function conversations(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.json({ error: null, data: [] });
        res.json({ error: null, data: await conversationsOf(user.id_user) });
    } catch (err) {
        console.error('gallery - conversations:', err);
        res.status(500).json({ error: 'Error al cargar los mensajes' });
    }
}

async function ownConversation(req, res) {
    const user = await getRequestUser(req);
    if (!user) {
        res.status(403).json({ error: 'Inicia sesión para continuar', code: 'login_required' });
        return {};
    }
    const conversation = await gallery_conversation_model.findByPk(req.params.id, {
        include: [
            { model: user_model, as: 'artist', attributes: PERSON },
            { model: user_model, as: 'visitor', attributes: PERSON }
        ]
    });
    if (!conversation || (conversation.artist_id !== user.id_user && conversation.visitor_id !== user.id_user)) {
        res.status(404).json({ error: 'Esta conversación no existe' });
        return {};
    }
    return { user, conversation };
}

/** GET /gallery/conversations/:id — its messages (participants only); marks it read. */
async function conversation(req, res) {
    try {
        const { user, conversation: c } = await ownConversation(req, res);
        if (!c) return;
        const messages = await gallery_message_model.findAll({
            where: { conversation_id: c.id_conversation },
            order: [['created_at', 'ASC'], ['id_message', 'ASC']],
            limit: 500
        });
        const role = c.artist_id === user.id_user ? 'artist' : 'visitor';
        await c.update({ [role === 'artist' ? 'artist_read_at' : 'visitor_read_at']: new Date() });
        const ex = await exhibitionOfArtist(c.artist_id);
        res.json({
            error: null,
            data: {
                id_conversation: c.id_conversation,
                role,
                artist: personOf(c.artist),
                visitor: personOf(c.visitor),
                other: personOf(role === 'artist' ? c.visitor : c.artist),
                exhibition: ex ? { id_exhibition: ex.id_exhibition, title: ex.title || null } : null,
                messages: messages.map(messageOf)
            }
        });
    } catch (err) {
        console.error('gallery - conversation:', err);
        res.status(500).json({ error: 'Error al cargar la conversación' });
    }
}

/** POST /gallery/conversations/:id/messages { body } — a reply (participants only). */
async function reply(req, res) {
    try {
        const { user, conversation: c } = await ownConversation(req, res);
        if (!c) return;
        const body = cleanText(req.body?.body);
        if (!checkBody(body, res)) return;
        if (await sentLastHour(user.id_user) >= MESSAGES_PER_HOUR) {
            return res.status(429).json({ error: 'Has enviado muchos mensajes en poco tiempo. Espera un poco', code: 'too_many' });
        }
        const message = await postMessage(c, user, body);
        res.json({ error: null, data: messageOf(message), success: 'Mensaje enviado' });
    } catch (err) {
        console.error('gallery - reply:', err);
        res.status(500).json({ error: 'Error al enviar el mensaje' });
    }
}

// ---------- the bell ----------

/**
 * GET /gallery/feed — for the bell: conversations with unread messages, the
 * artist's works reviewed since they last looked, and (super admins) how many
 * works wait for review. Never 401: signed out, all empty.
 */
async function feed(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.json({ error: null, data: { messages: [], reviews: [], pending_review: 0 } });
        const role = roleSnapshot(user);
        const messages = (await conversationsOf(user.id_user)).filter((c) => c.unread > 0);
        let reviews = [];
        const ex = role.isArtist ? await exhibitionOfArtist(user.id_user) : null;
        if (ex) {
            const works = await gallery_work_model.findAll({
                where: { exhibition_id: ex.id_exhibition, review_seen: false, status_work: ['approved', 'rejected'] }
            });
            reviews = works.map((w) => workOf(w, { withReview: true }));
        }
        const pending_review = role.isSuperAdmin ? await gallery_work_model.count({ where: { status_work: 'pending' } }) : 0;
        res.json({ error: null, data: { messages, reviews, pending_review } });
    } catch (err) {
        console.error('gallery - feed:', err);
        res.status(500).json({ error: 'Error al cargar los avisos de la galería' });
    }
}

/** POST /gallery/feed/reviews-seen — artists: they've seen their reviews. */
async function reviewsSeen(req, res) {
    try {
        const ex = await exhibitionOfArtist(req.galleryUser.id_user);
        if (ex) await gallery_work_model.update({ review_seen: true }, { where: { exhibition_id: ex.id_exhibition, review_seen: false } });
        res.json({ error: null, data: { ok: true } });
    } catch (err) {
        console.error('gallery - reviewsSeen:', err);
        res.status(500).json({ error: 'Error al guardar' });
    }
}

// ---------- invitations ----------

const hasSignedIn = (u) => !!(u.google_id || u.pass_user);

const invitationOf = (u) => ({
    id_user: u.id_user,
    name_user: u.name_user,
    email_user: u.email_user,
    image_user: u.image_user || null,
    is_artist: roleSnapshot(u).isArtist,
    artist_invite_status: u.artist_invite_status || null,
    artist_invited_at: u.artist_invited_at || null,
    artist_invite_email_sent_at: u.artist_invite_email_sent_at || null,
    has_signed_in: hasSignedIn(u)
});

// Sends the email and records when it went out (only if it did).
async function sendInvitation(user, inviter) {
    const sent = await sendArtistInvitationEmail(user.email_user, user.name_user, inviter?.name_user);
    if (sent) await user.update({ artist_invite_email_sent_at: new Date() });
    return sent;
}

/** POST /gallery/invite { name, email } — super admins: invite a visual artist. */
async function invite(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const name = cleanName(req.body?.name);
        const email = cleanEmail(req.body?.email);
        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres', code: 'invalid_name' });
        }
        if (!emailRegex.test(email) || email.length > 255) {
            return res.status(400).json({ error: 'El email no es válido', code: 'invalid_email' });
        }
        let user = await user_model.findOne({ where: { email_user: email } });
        if (user) {
            if (roleSnapshot(user).isArtist) {
                return res.status(409).json({ error: `${user.name_user} ya es artista de la galería`, code: 'already_artist', data: invitationOf(user) });
            }
            if (user.artist_invite_status === 'pending') {
                return res.status(409).json({ error: `${user.name_user} ya tiene una invitación pendiente`, code: 'already_invited', data: invitationOf(user) });
            }
            // A reader, an author… or someone who declined before: invite their account.
            await user.update({
                artist_invite_status: 'pending',
                artist_invited_by: admin.id_user,
                artist_invited_at: new Date(),
                artist_invite_email_sent_at: null
            });
        } else {
            const sameName = await user_model.findOne({ where: { name_user: name } });
            if (sameName) {
                return res.status(409).json({ error: `Ya hay una cuenta llamada «${name}». Usa un nombre que la distinga.`, code: 'name_taken' });
            }
            // A Google account without a password: the first Google sign-in with
            // this email links to it (google_oauth_controller.js).
            user = await user_model.create({
                name_user: name,
                email_user: email,
                pass_user: null,
                google_id: null,
                auth_provider: 'google',
                email_verified: false,
                location_user: '',
                age_user: 18,
                artist_invite_status: 'pending',
                artist_invited_by: admin.id_user,
                artist_invited_at: new Date()
            });
        }
        const emailSent = await sendInvitation(user, admin);
        res.json({
            error: null,
            data: invitationOf(user),
            emailSent,
            success: emailSent
                ? `Invitación enviada a ${user.email_user}`
                : `Invitación guardada, pero el email no se pudo enviar a ${user.email_user}`
        });
    } catch (err) {
        console.error('gallery - invite:', err);
        res.status(500).json({ error: 'Error al invitar a la o el artista', details: err.message });
    }
}

/** GET /gallery/invitations — super admins: the artists and their invitations. */
async function invitations(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const users = await user_model.findAll({
            where: { [Op.or]: [{ is_artist: true }, { artist_invite_status: { [Op.ne]: null } }] },
            order: [['name_user', 'ASC']]
        });
        res.json({ error: null, data: users.map(invitationOf) });
    } catch (err) {
        console.error('gallery - invitations:', err);
        res.status(500).json({ error: 'Error al cargar las invitaciones' });
    }
}

/** POST /gallery/invitations/:id/resend { email? } — super admins. */
async function resend(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const user = await user_model.findByPk(req.params.id);
        if (!user || user.artist_invite_status !== 'pending') {
            return res.status(404).json({ error: 'Esta persona no tiene una invitación pendiente' });
        }
        const email = req.body?.email !== undefined ? cleanEmail(req.body.email) : null;
        if (email && email !== cleanEmail(user.email_user)) {
            if (!emailRegex.test(email)) return res.status(400).json({ error: 'El email no es válido', code: 'invalid_email' });
            if (hasSignedIn(user)) {
                return res.status(409).json({ error: 'Esta persona ya ha iniciado sesión: su email no se puede cambiar', code: 'signed_in' });
            }
            if (await user_model.findOne({ where: { email_user: email } })) {
                return res.status(409).json({ error: `Ya hay una cuenta con el email ${email}`, code: 'email_taken' });
            }
            await user.update({ email_user: email });
        }
        await user.update({ artist_invited_at: new Date() });
        const inviter = user.artist_invited_by ? await user_model.findByPk(user.artist_invited_by) : admin;
        if (!(await sendInvitation(user, inviter || admin))) {
            return res.status(502).json({ error: 'El email de invitación no se pudo enviar', data: invitationOf(user) });
        }
        res.json({ error: null, data: invitationOf(user), success: `Invitación enviada a ${user.email_user}` });
    } catch (err) {
        console.error('gallery - resend:', err);
        res.status(500).json({ error: 'Error al reenviar la invitación' });
    }
}

/** POST /gallery/invitations/send-unsent — super admins: pending ones whose email isn't recorded as sent. */
async function sendUnsent(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const users = (await user_model.findAll({
            where: { artist_invite_status: 'pending', artist_invite_email_sent_at: null }
        })).filter((u) => !hasSignedIn(u));
        const sent = [];
        const failed = [];
        for (const user of users) {
            const inviter = user.artist_invited_by ? await user_model.findByPk(user.artist_invited_by) : admin;
            (await sendInvitation(user, inviter || admin) ? sent : failed).push(invitationOf(user));
        }
        res.json({
            error: null,
            data: { sent, failed },
            success: failed.length
                ? `Enviadas: ${sent.length}. No se pudieron enviar: ${failed.length}`
                : `Invitaciones enviadas: ${sent.length}`
        });
    } catch (err) {
        console.error('gallery - sendUnsent:', err);
        res.status(500).json({ error: 'Error al enviar las invitaciones' });
    }
}

/**
 * GET /gallery/invitation — the signed-in user's pending artist invitation, or
 * data: null (also signed out: never a 401).
 */
async function myInvitation(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user || user.artist_invite_status !== 'pending') return res.json({ error: null, data: null });
        // Made artist by a super admin before answering: the invitation is done.
        if (roleSnapshot(user).isArtist) {
            await user.update({ artist_invite_status: 'accepted', email_verified: true });
            return res.json({ error: null, data: null });
        }
        const inviter = user.artist_invited_by
            ? await user_model.findByPk(user.artist_invited_by, { attributes: ['id_user', 'name_user'] })
            : null;
        res.json({ error: null, data: { status: 'pending', invited_at: user.artist_invited_at, inviter } });
    } catch (err) {
        console.error('gallery - myInvitation:', err);
        res.status(500).json({ error: 'Error al obtener la invitación' });
    }
}

/** POST /gallery/invitation/respond { response: accept|decline } — returns the session user. */
async function respond(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.status(403).json({ error: 'Inicia sesión para responder', code: 'login_required' });
        const response = req.body?.response;
        if (response !== 'accept' && response !== 'decline') {
            return res.status(400).json({ error: "La respuesta debe ser 'accept' o 'decline'" });
        }
        if (user.artist_invite_status !== 'pending') {
            return res.status(409).json({ error: 'No tienes ninguna invitación pendiente', code: 'no_invitation' });
        }
        if (response === 'accept') {
            await user.update({ is_artist: true, email_verified: true, artist_invite_status: 'accepted' });
            await exhibitionOfArtist(user.id_user, { create: true });
            return res.json({ error: null, data: sanitizeUserData(user), success: 'Invitación aceptada: ya puedes montar tu exposición en la galería' });
        }
        await user.update({ artist_invite_status: 'declined' });
        res.json({ error: null, data: sanitizeUserData(user), success: 'Has rechazado la invitación' });
    } catch (err) {
        console.error('gallery - respond:', err);
        res.status(500).json({ error: 'Error al responder la invitación' });
    }
}

export default {
    upload, artistOnly,
    list, exhibition,
    mine, updateMine, addWork, updateWork, removeWork, reorderWorks,
    reviewList, reviewCount, review,
    writeToArtist, conversations, conversation, reply,
    feed, reviewsSeen,
    invite, invitations, resend, sendUnsent, myInvitation, respond
};
