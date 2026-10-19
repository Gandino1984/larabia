// back-end/controllers/open_space/open_space_api_controller.js
//
// «Espacio abierto» proposals (open_space_proposal_model). Anyone signed in
// sends one — no subscription needed; they see and can withdraw their own.
// Super admins read them all, change their status and download the files.
// Refusals are 403 with a `code` (never 401, which logs the reader out).
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { Op } from "sequelize";
import open_space_proposal_model, { PROPOSAL_KINDS, PROPOSAL_STATUSES } from "../../models/open_space_proposal_model.js";
import user_model from "../../models/user_model.js";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";
import { sendOpenSpaceProposalEmail } from "../../services/emailService.js";
import { PROPOSALS_DIR, FILE_EXTENSIONS, FILE_MAX_MB, ensureDir, storedPath, removeFile } from "./proposal_store.js";

ensureDir();

const TITLE_MAX = 150;
const SUMMARY_MAX = 600;
const TEXT_MAX = 50000;
// Proposals one person can send in 24 hours (spam brake).
const DAILY_MAX = 5;

// For the e-mail to the team (the interface translates the kinds itself).
const KIND_LABELS = {
    poesia: 'Poesía', relato: 'Relato', microrrelato: 'Microrrelato',
    cronica: 'Crónica', ensayo: 'Ensayo', otro: 'Otro'
};

// multer 1.x reads file names as latin1: «poesía.pdf» arrives as «poesÃ­a.pdf».
const utf8Name = (name) => {
    const fixed = Buffer.from(String(name || ''), 'latin1').toString('utf8');
    return fixed.includes('�') ? String(name || '') : fixed;
};

const fileUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, PROPOSALS_DIR),
        filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(utf8Name(file.originalname)).toLowerCase()}`)
    }),
    limits: { fileSize: FILE_MAX_MB * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(utf8Name(file.originalname)).toLowerCase();
        if (FILE_EXTENSIONS.includes(ext)) return cb(null, true);
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
            return res.status(413).json({ error: `El archivo es demasiado grande (máximo ${FILE_MAX_MB} MB)` });
        }
        if (err.code === 'BAD_TYPE') {
            return res.status(400).json({ error: 'Formato de archivo no admitido: usa PDF, DOC, DOCX, ODT, TXT o RTF' });
        }
        res.status(400).json({ error: 'Error al recibir el archivo' });
    });
}

// Runs BEFORE multer: no file is received from someone who isn't signed in
// or has already sent today's proposals.
async function canSend(req, res, next) {
    try {
        const user = await getRequestUser(req);
        if (!user) {
            return res.status(403).json({ error: 'Inicia sesión para enviar una propuesta', code: 'login_required' });
        }
        const recent = await open_space_proposal_model.count({
            where: { user_id: user.id_user, created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        });
        if (recent >= DAILY_MAX) {
            return res.status(429).json({ error: 'Has enviado muchas propuestas hoy. Vuelve a intentarlo mañana', code: 'too_many' });
        }
        req.proposalUser = user;
        next();
    } catch (err) {
        console.error('-> open space canSend() - Error =', err);
        res.status(500).json({ error: 'Error al enviar la propuesta' });
    }
}

/** The super admin making the request, or null after answering 403. */
async function requireSuperAdmin(req, res) {
    const user = await getRequestUser(req);
    if (user && roleSnapshot(user).isSuperAdmin) return user;
    res.status(403).json({ error: 'Solo el super-administrador puede ver las propuestas', code: 'forbidden' });
    return null;
}

const ownFields = (p) => ({
    id_proposal: p.id_proposal,
    title_proposal: p.title_proposal,
    kind_proposal: p.kind_proposal,
    summary_proposal: p.summary_proposal,
    has_text: !!p.text_proposal,
    file_name_proposal: p.file_name_proposal,
    status_proposal: p.status_proposal,
    created_at: p.created_at,
    updated_at: p.updated_at
});

// POST /open-space/proposals — multipart: title, kind, summary, text?, file?, consent
async function create(req, res) {
    const file = req.file;
    const reject = (error) => {
        if (file) removeFile(file.filename);
        res.status(400).json({ error });
    };
    try {
        const user = req.proposalUser;
        // Forms send textarea line breaks as \r\n: one character each, as the
        // form's counter shows them.
        const clean = (v) => String(v || '').replace(/\r\n?/g, '\n').trim();
        const title = clean(req.body.title).replace(/\s+/g, ' ');
        const kind = PROPOSAL_KINDS.includes(req.body.kind) ? req.body.kind : 'otro';
        const summary = clean(req.body.summary);
        const text = clean(req.body.text);

        if (!title) return reject('Escribe el título de la propuesta');
        if (title.length > TITLE_MAX) return reject(`El título es demasiado largo (máximo ${TITLE_MAX} caracteres)`);
        if (!summary) return reject('Explica brevemente tu propuesta');
        if (summary.length > SUMMARY_MAX) return reject(`La explicación es demasiado larga (máximo ${SUMMARY_MAX} caracteres)`);
        if (text.length > TEXT_MAX) return reject('El texto es demasiado largo: envíalo como archivo');
        if (!text && !file) return reject('Pega el texto o adjunta un archivo');
        if (req.body.consent !== 'true') return reject('Confirma que el texto es tuyo');

        const fileName = file ? utf8Name(file.originalname).slice(0, 255) : null;
        const proposal = await open_space_proposal_model.create({
            user_id: user.id_user,
            title_proposal: title,
            kind_proposal: kind,
            summary_proposal: summary,
            text_proposal: text || null,
            file_proposal: file ? file.filename : null,
            file_name_proposal: fileName,
            status_proposal: 'new'
        });

        await sendOpenSpaceProposalEmail({
            senderName: user.name_user,
            senderEmail: user.email_user,
            title,
            kindLabel: KIND_LABELS[kind],
            summary,
            text,
            fileName
        });

        res.status(201).json({ data: ownFields(proposal), success: 'Propuesta enviada. ¡Gracias!' });
    } catch (err) {
        console.error('-> open space create() - Error =', err);
        if (file) removeFile(file.filename);
        res.status(500).json({ error: 'Error al enviar la propuesta' });
    }
}

// GET /open-space/proposals/mine — the caller's own proposals.
async function mine(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.json({ data: [] });
        const rows = await open_space_proposal_model.findAll({
            where: { user_id: user.id_user },
            order: [['created_at', 'DESC']]
        });
        res.json({ data: rows.map(ownFields) });
    } catch (err) {
        console.error('-> open space mine() - Error =', err);
        res.status(500).json({ error: 'Error al cargar las propuestas' });
    }
}

// GET /open-space/proposals?status= — super admin: every proposal, newest first.
async function list(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const where = PROPOSAL_STATUSES.includes(req.query.status) ? { status_proposal: req.query.status } : {};
        const rows = await open_space_proposal_model.findAll({
            where,
            order: [['created_at', 'DESC']],
            include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'email_user', 'image_user'] }]
        });
        res.json({
            data: rows.map((p) => ({
                ...ownFields(p),
                text_proposal: p.text_proposal,
                user: p.user ? {
                    id_user: p.user.id_user,
                    name_user: p.user.name_user,
                    email_user: p.user.email_user,
                    image_user: p.user.image_user
                } : null
            }))
        });
    } catch (err) {
        console.error('-> open space list() - Error =', err);
        res.status(500).json({ error: 'Error al cargar las propuestas' });
    }
}

// GET /open-space/proposals/count — super admin: how many are still unread.
async function count(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const unread = await open_space_proposal_model.count({ where: { status_proposal: 'new' } });
        res.json({ data: { new: unread } });
    } catch (err) {
        console.error('-> open space count() - Error =', err);
        res.status(500).json({ error: 'Error al cargar las propuestas' });
    }
}

// PATCH /open-space/proposals/:id { status } — super admin.
async function setStatus(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const status = req.body?.status;
        if (!PROPOSAL_STATUSES.includes(status)) return res.status(400).json({ error: 'Estado no válido' });
        const proposal = await open_space_proposal_model.findByPk(req.params.id);
        if (!proposal) return res.status(404).json({ error: 'Propuesta no encontrada' });
        await proposal.update({ status_proposal: status });
        res.json({ data: ownFields(proposal) });
    } catch (err) {
        console.error('-> open space setStatus() - Error =', err);
        res.status(500).json({ error: 'Error al actualizar la propuesta' });
    }
}

/** The proposal if the caller sent it or is a super admin; null after answering. */
async function ownOrSuperAdmin(req, res) {
    const user = await getRequestUser(req);
    const proposal = await open_space_proposal_model.findByPk(req.params.id);
    if (!proposal) {
        res.status(404).json({ error: 'Propuesta no encontrada' });
        return null;
    }
    if (!user || (proposal.user_id !== user.id_user && !roleSnapshot(user).isSuperAdmin)) {
        res.status(403).json({ error: 'No tienes permiso para esta propuesta', code: 'forbidden' });
        return null;
    }
    return proposal;
}

// DELETE /open-space/proposals/:id — the sender withdraws it, or a super admin removes it.
async function remove(req, res) {
    try {
        const proposal = await ownOrSuperAdmin(req, res);
        if (!proposal) return;
        const fileName = proposal.file_proposal;
        await proposal.destroy();
        removeFile(fileName);
        res.json({ data: { id_proposal: proposal.id_proposal }, success: 'Propuesta eliminada' });
    } catch (err) {
        console.error('-> open space remove() - Error =', err);
        res.status(500).json({ error: 'Error al eliminar la propuesta' });
    }
}

// GET /open-space/proposals/:id/file — the attached file, as a download.
async function downloadFile(req, res) {
    try {
        const proposal = await ownOrSuperAdmin(req, res);
        if (!proposal) return;
        const p = storedPath(proposal.file_proposal);
        if (!p) return res.status(404).json({ error: 'Archivo no encontrado' });
        res.download(p, proposal.file_name_proposal || path.basename(p), (err) => {
            if (err && !res.headersSent) res.status(404).json({ error: 'Archivo no encontrado' });
        });
    } catch (err) {
        console.error('-> open space downloadFile() - Error =', err);
        res.status(500).json({ error: 'Error al descargar el archivo' });
    }
}

export default {
    canSend,
    upload,
    create,
    mine,
    list,
    count,
    setStatus,
    remove,
    downloadFile
};
