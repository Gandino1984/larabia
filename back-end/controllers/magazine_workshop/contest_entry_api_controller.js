// back-end/controllers/magazine_workshop/contest_entry_api_controller.js
//
// Contest entries (models/contest_entry_model.js): a contestant — anyone
// signed in — sends their work while sign-ups are open: its title, a short
// note and the work pasted and/or as a file (texts or images, private). One
// per person; sending it is signing up. They change or withdraw it while
// sign-ups are open. The contest's managers (its organisers on the team and
// the super admins) list the entries and download them.
// Convocatorias: a super admin reviews each work — accepting it makes a
// draft article in the call's section (call_works.js), declining it says so
// to its author. An accepted work can't be changed or withdrawn any more;
// changing a declined one sends it to the review again.
import multer from "multer";
import crypto from "crypto";
import path from "path";
import contest_entry_model from "../../models/contest_entry_model.js";
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import workshop_reservation_model from "../../models/workshop_reservation_model.js";
import user_model from "../../models/user_model.js";
import magazineWorkshopController, { isContest, contestPhase } from "./magazine_workshop_controller.js";
import { isWorkshopManager } from "./magazine_workshop_api_controller.js";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";
import { createDraftFromEntry, entryArticle, entryArticles } from "./call_works.js";
import { ENTRIES_DIR, ENTRY_EXTENSIONS, ENTRY_MAX_MB, ensureEntriesDir, entryPath, removeEntryFile, removeEntries } from "./contest_entry_store.js";

const TITLE_MAX = 150;
const NOTE_MAX = 600;
const TEXT_MAX = 50000;

ensureEntriesDir();

// multer 1.x reads file names as latin1: «relato.pdf» with accents arrives garbled.
const utf8Name = (name) => {
    const fixed = Buffer.from(String(name || ''), 'latin1').toString('utf8');
    return fixed.includes('�') ? String(name || '') : fixed;
};

const fileUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, ENTRIES_DIR),
        filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(utf8Name(file.originalname)).toLowerCase()}`)
    }),
    limits: { fileSize: ENTRY_MAX_MB * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(utf8Name(file.originalname)).toLowerCase();
        if (ENTRY_EXTENSIONS.includes(ext)) return cb(null, true);
        const err = new Error('bad type');
        err.code = 'BAD_TYPE';
        cb(err);
    }
}).single('file');

/** multer's errors (size, type…) as JSON. */
function upload(req, res, next) {
    fileUpload(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: `El archivo es demasiado grande (máximo ${ENTRY_MAX_MB} MB)` });
        }
        if (err.code === 'BAD_TYPE') {
            return res.status(400).json({ error: 'Formato de archivo no admitido: usa PDF, DOC, DOCX, ODT, TXT, RTF, JPG, PNG o WEBP' });
        }
        res.status(400).json({ error: 'Error al recibir el archivo' });
    });
}

const REASON_MAX = 2000;

// `articles`: id_article → { id_article, status_article, title_article }
// (entryArticles) — the article an accepted work became, if it still exists.
const shape = (e, { withUser = false, articles = new Map() } = {}) => ({
    id_entry: e.id_entry,
    title_entry: e.title_entry,
    note_entry: e.note_entry,
    text_entry: e.text_entry,
    file_name_entry: e.file_name_entry,
    has_file: !!e.file_entry,
    status_entry: e.status_entry || 'sent',
    decline_reason_entry: e.status_entry === 'declined' ? e.decline_reason_entry : null,
    article: (e.article_id_entry && articles.get(e.article_id_entry)) || null,
    created_at: e.created_at,
    updated_at: e.updated_at,
    ...(withUser && e.user ? { user: { id_user: e.user.id_user, name_user: e.user.name_user, email_user: e.user.email_user, image_user: e.user.image_user } } : {})
});

async function loadContest(id) {
    const contest = await magazine_workshop_model.findByPk(id);
    return contest && contest.active_workshop && isContest(contest) ? contest : null;
}

/**
 * The signed-in contestant and the contest, if they can send (or change or
 * withdraw) their work now: published, sign-ups open, not blocked. Otherwise
 * sends the answer and returns null.
 */
async function openFor(req, res) {
    const user = await getRequestUser(req);
    if (!user) {
        res.status(403).json({ error: 'Inicia sesión para participar', code: 'login_required' });
        return null;
    }
    const contest = await loadContest(req.params.id_workshop);
    if (!contest || contest.review_status_workshop !== 'approved') {
        res.status(404).json({ error: 'Convocatoria no encontrada' });
        return null;
    }
    const phase = contestPhase(contest);
    if (phase === 'soon') {
        res.status(400).json({ error: 'Las inscripciones de esta convocatoria todavía no están abiertas', code: 'not_open' });
        return null;
    }
    if (phase !== 'open') {
        res.status(400).json({ error: 'Las inscripciones de esta convocatoria están cerradas', code: 'closed' });
        return null;
    }
    if (await magazineWorkshopController.isBlocked(contest.id_workshop, user.id_user)) {
        res.status(403).json({ error: 'No puedes inscribirte en esta convocatoria', code: 'blocked' });
        return null;
    }
    return { user, contest };
}

// Runs BEFORE multer: no file is received from someone who can't send now.
async function canSend(req, res, next) {
    try {
        const ctx = await openFor(req, res);
        if (!ctx) return;
        req.contestCtx = ctx;
        next();
    } catch (err) {
        console.error('-> contest entry canSend() - Error =', err);
        res.status(500).json({ error: 'Error al enviar la obra' });
    }
}

// POST /contests/:id_workshop/entry (multipart: title, note, text, file,
// remove_file) — sends or changes the contestant's work; signs them up.
async function submit(req, res) {
    const uploaded = req.file?.filename || null;
    const reject = (status, error) => {
        if (uploaded) removeEntryFile(uploaded);
        return res.status(status).json({ error });
    };
    try {
        const { user, contest } = req.contestCtx;
        const title = String(req.body?.title || '').trim();
        const note = String(req.body?.note || '').trim();
        const text = String(req.body?.text || '').trim();
        if (!title) return reject(400, 'Escribe el título de tu obra');
        if (title.length > TITLE_MAX) return reject(400, `El título es demasiado largo (máximo ${TITLE_MAX} caracteres)`);
        if (note.length > NOTE_MAX) return reject(400, `La nota es demasiado larga (máximo ${NOTE_MAX} caracteres)`);
        if (text.length > TEXT_MAX) return reject(400, 'El texto es demasiado largo: envíalo como archivo');

        const existing = await contest_entry_model.findOne({ where: { workshop_id: contest.id_workshop, user_id: user.id_user } });
        if (existing?.status_entry === 'accepted') return reject(400, 'Tu obra ya ha sido aceptada: ya no se puede cambiar');
        const dropFile = req.body?.remove_file === 'true';
        const keepsFile = !!existing?.file_entry && !dropFile;
        if (!text && !uploaded && !keepsFile) return reject(400, 'Pega el texto de tu obra o adjunta un archivo');

        const fields = {
            title_entry: title,
            note_entry: note || null,
            text_entry: text || null,
            // Changed: back to the review.
            status_entry: 'sent',
            decline_reason_entry: null,
            ...(uploaded
                ? { file_entry: uploaded, file_name_entry: utf8Name(req.file.originalname).slice(0, 255) }
                : dropFile ? { file_entry: null, file_name_entry: null } : {})
        };
        let entry;
        if (existing) {
            const oldFile = existing.file_entry;
            await existing.update(fields);
            if (oldFile && (uploaded || dropFile)) removeEntryFile(oldFile);
            entry = existing;
        } else {
            entry = await contest_entry_model.create({ workshop_id: contest.id_workshop, user_id: user.id_user, ...fields });
        }
        // Sending the work is signing up.
        await workshop_reservation_model.findOrCreate({
            where: { workshop_id: contest.id_workshop, user_id: user.id_user },
            defaults: { workshop_id: contest.id_workshop, user_id: user.id_user }
        });
        res.json({
            error: null,
            success: existing ? 'Obra actualizada' : 'Obra enviada: ya participas en la convocatoria',
            data: shape(entry)
        });
    } catch (err) {
        console.error('-> contest entry submit() - Error =', err);
        if (uploaded) removeEntryFile(uploaded);
        res.status(500).json({ error: 'Error al enviar la obra' });
    }
}

// GET /contests/:id_workshop/entry — the contestant's own work, or null.
async function mine(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.status(403).json({ error: 'Inicia sesión para participar', code: 'login_required' });
        const entry = await contest_entry_model.findOne({ where: { workshop_id: req.params.id_workshop, user_id: user.id_user } });
        res.json({ error: null, data: entry ? shape(entry, { articles: await entryArticles([entry]) }) : null });
    } catch (err) {
        console.error('-> contest entry mine() - Error =', err);
        res.status(500).json({ error: 'Error al cargar las obras' });
    }
}

// DELETE /contests/:id_workshop/entry — withdraws it (and the sign-up)
// while sign-ups are open.
async function withdraw(req, res) {
    try {
        const ctx = await openFor(req, res);
        if (!ctx) return;
        const accepted = await contest_entry_model.findOne({ where: { workshop_id: ctx.contest.id_workshop, user_id: ctx.user.id_user, status_entry: 'accepted' } });
        if (accepted) return res.status(400).json({ error: 'Tu obra ya ha sido aceptada: ya no se puede retirar' });
        const removed = await removeEntries({ workshop_id: ctx.contest.id_workshop, user_id: ctx.user.id_user });
        if (!removed) return res.status(404).json({ error: 'No has enviado ninguna obra a esta convocatoria' });
        await workshop_reservation_model.destroy({ where: { workshop_id: ctx.contest.id_workshop, user_id: ctx.user.id_user } });
        res.json({ error: null, success: 'Has retirado tu obra de la convocatoria', data: null });
    } catch (err) {
        console.error('-> contest entry withdraw() - Error =', err);
        res.status(500).json({ error: 'Error al retirar la obra' });
    }
}

// GET /contests/:id_workshop/entries — its managers: every entry, oldest first.
async function list(req, res) {
    try {
        const user = await getRequestUser(req);
        const contest = await loadContest(req.params.id_workshop);
        if (!contest) return res.status(404).json({ error: 'Convocatoria no encontrada' });
        if (!(await isWorkshopManager(user, contest))) {
            return res.status(403).json({ error: 'Solo quien organiza la convocatoria (o un super admin) puede ver las obras' });
        }
        const rows = await contest_entry_model.findAll({
            where: { workshop_id: contest.id_workshop },
            include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'email_user', 'image_user'] }],
            order: [['created_at', 'ASC'], ['id_entry', 'ASC']]
        });
        const articles = await entryArticles(rows);
        res.json({ error: null, data: rows.map((r) => shape(r, { withUser: true, articles })) });
    } catch (err) {
        console.error('-> contest entry list() - Error =', err);
        res.status(500).json({ error: 'Error al cargar las obras' });
    }
}

// GET /contests/:id_workshop/entries/:id_entry/file — its author or the
// contest's managers.
async function download(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.status(403).json({ error: 'Inicia sesión para participar', code: 'login_required' });
        const entry = await contest_entry_model.findOne({ where: { id_entry: req.params.id_entry, workshop_id: req.params.id_workshop } });
        if (!entry) return res.status(404).json({ error: 'Obra no encontrada' });
        const contest = await loadContest(entry.workshop_id);
        if (entry.user_id !== user.id_user && !(contest && await isWorkshopManager(user, contest))) {
            return res.status(403).json({ error: 'Solo quien organiza la convocatoria (o un super admin) puede ver las obras' });
        }
        const p = entryPath(entry.file_entry);
        if (!p) return res.status(404).json({ error: 'Archivo no encontrado' });
        res.download(p, entry.file_name_entry || path.basename(p), (err) => {
            if (err && !res.headersSent) res.status(404).json({ error: 'Archivo no encontrado' });
        });
    } catch (err) {
        console.error('-> contest entry download() - Error =', err);
        res.status(500).json({ error: 'Error al descargar el archivo' });
    }
}

// ── The review of each work (super admins) ──

async function reviewTarget(req, res) {
    const user = await getRequestUser(req);
    if (!user || !roleSnapshot(user).isSuperAdmin) {
        res.status(403).json({ error: 'Solo un super admin puede revisar las obras' });
        return null;
    }
    const entry = await contest_entry_model.findOne({ where: { id_entry: req.params.id_entry, workshop_id: req.params.id_workshop } });
    const contest = entry ? await loadContest(entry.workshop_id) : null;
    if (!entry || !contest) {
        res.status(404).json({ error: 'Obra no encontrada' });
        return null;
    }
    return { user, entry, contest };
}

// POST /contests/:id_workshop/entries/:id_entry/accept — makes the draft
// article (or returns the one already made) to publish from the editor.
async function accept(req, res) {
    try {
        const ctx = await reviewTarget(req, res);
        if (!ctx) return;
        const { entry, contest } = ctx;
        if (!contest.section_workshop) {
            return res.status(400).json({ error: 'Elige primero en la convocatoria la sección donde se publican los trabajos', code: 'no_section' });
        }
        let article = await entryArticle(entry);
        const created = !article;
        if (!article) article = await createDraftFromEntry(entry, contest);
        await entry.update({ status_entry: 'accepted', decline_reason_entry: null, article_id_entry: article.id_article });
        const articles = await entryArticles([entry]);
        res.json({
            error: null,
            success: created ? 'Obra aceptada: se ha creado un borrador para publicarla' : 'Obra aceptada',
            data: shape(entry, { withUser: false, articles })
        });
    } catch (err) {
        console.error('-> contest entry accept() - Error =', err);
        res.status(500).json({ error: 'Error al aceptar la obra' });
    }
}

// POST /contests/:id_workshop/entries/:id_entry/decline { reason } — not
// once its article is published (unpublish or delete that first).
async function decline(req, res) {
    try {
        const ctx = await reviewTarget(req, res);
        if (!ctx) return;
        const { entry } = ctx;
        const article = await entryArticle(entry);
        if (article?.status_article === 'published') {
            return res.status(400).json({ error: 'Esta obra ya está publicada: retírala de la revista antes de rechazarla' });
        }
        const reason = String(req.body?.reason || '').trim().slice(0, REASON_MAX) || null;
        await entry.update({ status_entry: 'declined', decline_reason_entry: reason });
        res.json({ error: null, success: 'Obra rechazada', data: shape(entry, { articles: await entryArticles([entry]) }) });
    } catch (err) {
        console.error('-> contest entry decline() - Error =', err);
        res.status(500).json({ error: 'Error al rechazar la obra' });
    }
}

export default { canSend, upload, submit, mine, withdraw, list, download, accept, decline };
