// back-end/controllers/paisaje/paisaje_api_controller.js
//
// Uploads for "paisajes sonoros" (see paisaje_store.js). Only people who can
// create content (editors, admins, super admins) — same as articles. 403
// (never 401, which logs the reader out) when not allowed.
import multer from "multer";
import fs from "fs";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";
import {
    TMP_DIR,
    AUDIO_FORMATS,
    ensureDirs,
    hasFfmpeg,
    newId,
    enqueueAudio,
    audioStatus,
    audioUrl,
    saveImage,
    imageUrls
} from "./paisaje_store.js";

ensureDirs();

const imageUpload = multer({ dest: TMP_DIR, limits: { fileSize: 50 * 1024 * 1024 } }).fields([
    { name: "points", maxCount: 1 },
    { name: "webp", maxCount: 1 },
    { name: "posterized", maxCount: 1 }
]);
// No size limit by default: the audio is converted to AAC, normalised and
// the original deleted (PAISAJE_AUDIO_MAX_MB sets a cap if ever needed).
const AUDIO_MAX_MB = Number(process.env.PAISAJE_AUDIO_MAX_MB) || 0;
const audioUpload = multer({
    dest: TMP_DIR,
    ...(AUDIO_MAX_MB ? { limits: { fileSize: AUDIO_MAX_MB * 1024 * 1024 } } : {})
}).single("file");

/** Wrap multer so its errors (size limit…) answer as JSON. */
const withUpload = (mw) => (req, res, next) =>
    mw(req, res, (err) => {
        if (!err) return next();
        const tooBig = err.code === "LIMIT_FILE_SIZE";
        res.status(tooBig ? 413 : 400).json({ error: tooBig ? "El archivo es demasiado grande" : "Error al recibir el archivo" });
    });

// Runs BEFORE multer: nobody without permission gets to send a file.
async function creatorOnly(req, res, next) {
    try {
        const user = await getRequestUser(req);
        if (!user || !roleSnapshot(user).canCreateContent) {
            return res.status(403).json({ error: "Solo el equipo de la revista puede crear paisajes sonoros" });
        }
        req.paisajeUser = user;
        next();
    } catch (err) {
        console.error("-> paisaje creatorOnly() - Error =", err);
        res.status(500).json({ error: "Error de autenticación" });
    }
}

const removeFiles = (files) => files.forEach((f) => f && fs.rmSync(f.path, { force: true }));

// POST /paisaje/image — multipart: points (.paisaje.json) + webp [+ posterized]
async function uploadImage(req, res) {
    const fields = req.files || {};
    const files = [fields.points?.[0], fields.webp?.[0], fields.posterized?.[0]];
    try {
        const user = req.paisajeUser;
        if (!files[0] || !files[1]) {
            removeFiles(files);
            return res.status(400).json({ error: "Faltan archivos: el documento del dibujo y la imagen de referencia" });
        }
        const result = saveImage({
            pointsPath: files[0].path,
            webpPath: files[1].path,
            posterizedPath: files[2]?.path,
            userId: user.id_user
        });
        if (result.error) {
            removeFiles(files);
            return res.status(400).json({ error: result.error });
        }
        const { style, width, height, refExt, posterized } = result.meta;
        res.json({
            error: null,
            data: { imageId: result.id, style, width, height, refExt, posterized, ...imageUrls(result.id, result.meta) }
        });
    } catch (err) {
        removeFiles(files);
        console.error("-> paisaje uploadImage() - Error =", err);
        res.status(500).json({ error: "No se pudo guardar el dibujo" });
    }
}

// POST /paisaje/audio — multipart: file. Answers 202 at once; the editor
// polls GET /paisaje/audio/:id until it's ready.
async function uploadAudio(req, res) {
    const file = req.file;
    try {
        if (!file) return res.status(400).json({ error: "Falta el archivo de audio" });
        const ext = (file.originalname.split(".").pop() || "").toLowerCase();
        if (!AUDIO_FORMATS.includes(ext)) {
            removeFiles([file]);
            return res.status(400).json({ error: `Formato no admitido (.${ext}). Admitidos: ${AUDIO_FORMATS.join(", ")}` });
        }
        if (!hasFfmpeg()) {
            removeFiles([file]);
            return res.status(503).json({ error: "El servidor no puede procesar audio ahora mismo" });
        }
        const id = newId();
        enqueueAudio(id, file.path, ext);
        res.status(202).json({ error: null, data: { audioId: id, status: "processing" } });
    } catch (err) {
        removeFiles([file]);
        console.error("-> paisaje uploadAudio() - Error =", err);
        res.status(500).json({ error: "No se pudo recibir el audio" });
    }
}

// GET /paisaje/audio/:id — { status: processing | ready | error, … }
async function getAudioStatus(req, res) {
    try {
        res.set("Cache-Control", "no-store"); // polled: never a cached "processing"
        const s = audioStatus(req.params.id);
        if (!s) return res.status(404).json({ error: "Audio no encontrado" });
        res.json({
            error: null,
            data: {
                audioId: req.params.id,
                status: s.status,
                originalFormat: s.originalFormat ?? null,
                loudnessBefore: s.loudnessBefore ?? null,
                loudnessAfter: s.loudnessAfter ?? null,
                audioUrl: s.status === "ready" ? audioUrl(req.params.id) : null,
                message: s.error ?? null
            }
        });
    } catch (err) {
        console.error("-> paisaje getAudioStatus() - Error =", err);
        res.status(500).json({ error: "Error al consultar el audio" });
    }
}

export default {
    creatorOnly,
    imageUpload: withUpload(imageUpload),
    audioUpload: withUpload(audioUpload),
    uploadImage,
    uploadAudio,
    getAudioStatus
};
