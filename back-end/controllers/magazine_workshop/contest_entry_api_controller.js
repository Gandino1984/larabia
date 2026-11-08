// back-end/controllers/magazine_workshop/contest_entry_api_controller.js
//
// Contest entries (models/contest_entry_model.js): a contestant — anyone
// signed in — sends their work while sign-ups are open: its title, a short
// note and the work pasted and/or as a file (texts or images, private). One
// per person; sending it is signing up. They change or withdraw it while
// sign-ups are open. The contest's managers (its organisers on the team and
// the super admins) list the entries and download them.
import multer from "multer";
import crypto from "crypto";
import path from "path";
import contest_entry_model from "../../models/contest_entry_model.js";
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import workshop_reservation_model from "../../models/workshop_reservation_model.js";
import user_model from "../../models/user_model.js";
import magazineWorkshopController, { isContest, contestPhase } from "./magazine_workshop_controller.js";
import { isWorkshopManager } from "./magazine_workshop_api_controller.js";
import { getRequestUser } from "../../utils/authHelper.js";
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

const shape = (e, { withUser = false } = {}) => ({
    id_entry: e.id_entry,
    title_entry: e.title_entry,
    note_entry: e.note_entry,
    text_entry: e.text_entry,
    file_name_entry: e.file_name_entry,
    has_file: !!e.file_entry,
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
        res.status(404).json({ error: 'Concurso no encontrado' });
        return null;
    }
    const phase = contestPhase(contest);
    if (phase === 'soon') {
        res.status(400).json({ error: 'Las inscripciones de este concurso todavía no están abiertas', code: 'not_open' });
        return null;
    }
    if (phase !== 'open') {
        res.status(400).json({ error: 'Las inscripciones de este concurso están cerradas', code: 'closed' });
        return null;
    }
    if (await magazineWorkshopController.isBlocked(contest.id_workshop, user.id_user)) {
        res.status(403).json({ error: 'No puedes inscribirte en este concurso', code: 'blocked' });
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
        const dropFile = req.body?.remove_file === 'true';
        const keepsFile = !!existing?.file_entry && !dropFile;
        if (!text && !uploaded && !keepsFile) return reject(400, 'Pega el texto de tu obra o adjunta un archivo');

        const fields = {
            title_entry: title,
            note_entry: note || null,
            text_entry: text || null,
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
            success: existing ? 'Obra actualizada' : 'Obra enviada: ya participas en el concurso',
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
        res.json({ error: null, data: entry ? shape(entry) : null });
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
        const removed = await removeEntries({ workshop_id: ctx.contest.id_workshop, user_id: ctx.user.id_user });
        if (!removed) return res.status(404).json({ error: 'No has enviado ninguna obra a este concurso' });
        await workshop_reservation_model.destroy({ where: { workshop_id: ctx.contest.id_workshop, user_id: ctx.user.id_user } });
        res.json({ error: null, success: 'Has retirado tu obra del concurso', data: null });
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
        if (!contest) return res.status(404).json({ error: 'Concurso no encontrado' });
        if (!(await isWorkshopManager(user, contest))) {
            return res.status(403).json({ error: 'Solo quien organiza el concurso (o un super admin) puede ver las obras' });
        }
        const rows = await contest_entry_model.findAll({
            where: { workshop_id: contest.id_workshop },
            include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'email_user', 'image_user'] }],
            order: [['created_at', 'ASC'], ['id_entry', 'ASC']]
        });
        res.json({ error: null, data: rows.map((r) => shape(r, { withUser: true })) });
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
            return res.status(403).json({ error: 'Solo quien organiza el concurso (o un super admin) puede ver las obras' });
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

export default { canSend, upload, submit, mine, withdraw, list, download };
