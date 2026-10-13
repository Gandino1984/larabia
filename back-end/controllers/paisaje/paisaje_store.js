// back-end/controllers/paisaje/paisaje_store.js
//
// Storage + audio processing for "paisajes sonoros" (soundscapes): an image
// turned into an audio-reactive drawing (engine by Cristian Vergara — see
// front-end/src/paisaje/README.md). A piece is used as an article format
// (block_type 'paisaje') or as a comic panel (comic_panel + soundscape_data).
//
// Files (bind-mounted volume, survive rebuilds):
//   uploads/paisaje/images/{id}.json       the drawing document (format v3,
//                                          validated with the engine's own
//                                          type-guard — shared code)
//   uploads/paisaje/images/{id}.webp|.jpg  editorial reference image
//   uploads/paisaje/images/{id}.jpeg       posterized working JPEG (optional)
//   uploads/paisaje/images/{id}.meta.json  style, size, extensions
//   uploads/paisaje/audio/{id}.m4a         audio normalised to −16 LUFS (AAC 192k)
//   uploads/paisaje/audio/{id}.status.json processing | ready | error (+ loudness)
// Served with CORS under /paisaje-files (the player analyses the audio with
// Web Audio, which needs CORS across origins).
//
// Audio is normalised with the SYSTEM ffmpeg (EBU R128 loudnorm, two passes),
// in the background, one job at a time: the upload answers at once and the
// editor polls the status (the proxy cuts requests at 60 s).
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile, spawnSync } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import article_block_model from "../../models/article_block_model.js";
import { isPaisajeDocument } from "../../../front-end/src/paisaje/converter/format.ts";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PAISAJE_DIR = path.join(__dirname, "..", "..", "uploads", "paisaje");
export const IMAGES_DIR = path.join(PAISAJE_DIR, "images");
export const AUDIO_DIR = path.join(PAISAJE_DIR, "audio");
export const TMP_DIR = path.join(PAISAJE_DIR, "tmp");

/** Public URL prefix of the files (see index.js). */
export const FILES_PREFIX = "/paisaje-files";

export const AUDIO_FORMATS = ["mp3", "wav", "ogg", "m4a", "flac", "aac"];

/** Unreferenced uploads older than this are deleted (abandoned editors). */
const ORPHAN_AGE_MS = 48 * 60 * 60 * 1000;
/** A job "processing" for longer than this was cut (restart): error. */
const STALE_JOB_MS = 3 * 60 * 60 * 1000;

export function ensureDirs() {
    for (const dir of [IMAGES_DIR, AUDIO_DIR, TMP_DIR]) fs.mkdirSync(dir, { recursive: true });
}

/** Random url-safe id (also the only thing that ever reaches a file path). */
export const newId = () => crypto.randomBytes(9).toString("base64url");
const ID_RE = /^[A-Za-z0-9_-]{8,32}$/;
export const isId = (v) => typeof v === "string" && ID_RE.test(v);

function readJson(file) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}
function writeJson(file, value) {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value));
    fs.renameSync(tmp, file);
}

// ─── ffmpeg ──────────────────────────────────────────────────────────────

let ffmpegAvailable = null;
/** Is the system ffmpeg/ffprobe installed? (checked once) */
export function hasFfmpeg() {
    if (ffmpegAvailable === null) {
        ffmpegAvailable = ["ffmpeg", "ffprobe"].every(
            (bin) => spawnSync(bin, ["-version"], { stdio: "ignore" }).status === 0
        );
        if (!ffmpegAvailable) console.warn("[paisaje] ffmpeg/ffprobe not found: audio uploads disabled");
    }
    return ffmpegAvailable;
}

/** loudnorm prints its JSON in stderr; take the LAST {...} block. */
function extractLoudnormJson(stderr) {
    const matches = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/g);
    if (!matches || matches.length === 0) throw new Error("ffmpeg no devolvió el JSON de loudnorm");
    return JSON.parse(matches[matches.length - 1]);
}
const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null; // "-inf" / "nan" → null
};
const round1 = (v) => (v === null ? null : Math.round(v * 10) / 10);

// Pass 1: measure. Pass 2: apply linearly with the measured values → AAC 192k.
async function measureLoudness(input) {
    const { stderr } = await execFileAsync("ffmpeg", [
        "-nostdin", "-hide_banner", "-i", input,
        "-af", "loudnorm=I=-16:TP=-2:LRA=11:print_format=json",
        "-f", "null", "-"
    ], { maxBuffer: 16 * 1024 * 1024, timeout: 60 * 60 * 1000 }); // long recordings
    const j = extractLoudnormJson(stderr);
    return {
        measuredI: num(j.input_i),
        measuredTP: num(j.input_tp),
        measuredLRA: num(j.input_lra),
        measuredThresh: num(j.input_thresh),
        offset: num(j.target_offset) ?? 0
    };
}

async function applyLoudness(input, output, m) {
    const fmt = (v, fallback) => (v === null ? fallback : v.toFixed(2));
    const { stderr } = await execFileAsync("ffmpeg", [
        "-nostdin", "-hide_banner", "-y", "-i", input,
        "-vn",
        "-af",
        "loudnorm=I=-16:TP=-2:LRA=11:" +
            `measured_I=${fmt(m.measuredI, "-70")}:` +
            `measured_TP=${fmt(m.measuredTP, "-20")}:` +
            `measured_LRA=${fmt(m.measuredLRA, "1")}:` +
            `measured_thresh=${fmt(m.measuredThresh, "-70")}:` +
            `offset=${m.offset.toFixed(2)}:linear=true:print_format=json`,
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        output
    ], { maxBuffer: 16 * 1024 * 1024, timeout: 60 * 60 * 1000 });
    try {
        return { loudnessAfter: num(extractLoudnormJson(stderr).output_i) };
    } catch {
        return { loudnessAfter: null };
    }
}

// One job at a time: protects the VPS (shared with other sites).
let queue = Promise.resolve();

const statusFile = (id) => path.join(AUDIO_DIR, `${id}.status.json`);

/** Queue the normalisation of an uploaded file; returns at once. */
export function enqueueAudio(id, inputPath, originalFormat) {
    const createdAt = new Date().toISOString();
    writeJson(statusFile(id), { status: "processing", originalFormat, createdAt });
    queue = queue.then(async () => {
        const output = path.join(AUDIO_DIR, `${id}.m4a`);
        try {
            const measured = await measureLoudness(inputPath);
            const { loudnessAfter } = await applyLoudness(inputPath, output, measured);
            writeJson(statusFile(id), {
                status: "ready",
                originalFormat,
                loudnessBefore: round1(measured.measuredI),
                loudnessAfter: round1(loudnessAfter),
                createdAt,
                readyAt: new Date().toISOString()
            });
        } catch (err) {
            console.error(`[paisaje] audio ${id} failed:`, err.message);
            fs.rmSync(output, { force: true });
            writeJson(statusFile(id), {
                status: "error",
                originalFormat,
                error: "No se pudo procesar el audio. Prueba con otro archivo (mp3, wav, ogg, m4a, flac o aac).",
                createdAt
            });
        } finally {
            fs.rmSync(inputPath, { force: true });
        }
    });
}

/** { status, originalFormat, loudnessBefore, loudnessAfter, error? } or null. */
export function audioStatus(id) {
    if (!isId(id)) return null;
    const s = readJson(statusFile(id));
    if (!s) return null;
    if (s.status === "processing" && Date.now() - Date.parse(s.createdAt) > STALE_JOB_MS) {
        return { ...s, status: "error", error: "El procesado del audio se interrumpió. Vuelve a subirlo." };
    }
    return s;
}

export const audioUrl = (id) => `${FILES_PREFIX}/audio/${id}.m4a`;

// ─── Images (drawing documents) ─────────────────────────────────────────

const isWebpBytes = (b) =>
    b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
const isJpegBytes = (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** The style name of a validated document. */
function styleOf(doc) {
    if (doc.version === 1) return "puntillista";
    if (doc.style === "lineart") return "lineart";
    if (doc.style === "azimuthal") return "azimuthal";
    return "posterized";
}

/**
 * Store an uploaded drawing: the document (validated with the engine's own
 * type-guard), the reference image (WebP, or JPEG where the browser can't
 * encode WebP) and the optional posterized JPEG. Returns { id, meta } or
 * { error } (Spanish message for the editor).
 */
export function saveImage({ pointsPath, webpPath, posterizedPath, userId }) {
    let doc;
    try {
        doc = JSON.parse(fs.readFileSync(pointsPath, "utf8"));
    } catch {
        return { error: "El documento del dibujo no es JSON válido." };
    }
    if (!isPaisajeDocument(doc)) {
        return { error: "El documento no es un paisaje sonoro válido (formato, versión o datos incorrectos)." };
    }
    const ref = fs.readFileSync(webpPath);
    const refExt = isWebpBytes(ref) ? "webp" : isJpegBytes(ref) ? "jpg" : null;
    if (!refExt) return { error: "La imagen de referencia debe ser WebP o JPEG." };
    if (posterizedPath && !isJpegBytes(fs.readFileSync(posterizedPath))) {
        return { error: "La imagen posterizada debe ser un JPEG." };
    }

    const id = newId();
    fs.renameSync(pointsPath, path.join(IMAGES_DIR, `${id}.json`));
    fs.renameSync(webpPath, path.join(IMAGES_DIR, `${id}.${refExt}`));
    if (posterizedPath) fs.renameSync(posterizedPath, path.join(IMAGES_DIR, `${id}.jpeg`));
    const meta = {
        style: styleOf(doc),
        width: doc.image.width,
        height: doc.image.height,
        refExt,
        posterized: !!posterizedPath,
        userId: userId ?? null,
        createdAt: new Date().toISOString()
    };
    writeJson(path.join(IMAGES_DIR, `${id}.meta.json`), meta);
    return { id, meta };
}

export function imageMeta(id) {
    return isId(id) ? readJson(path.join(IMAGES_DIR, `${id}.meta.json`)) : null;
}

/** Public URLs of a stored drawing. */
export function imageUrls(id, meta) {
    return {
        jsonUrl: `${FILES_PREFIX}/images/${id}.json`,
        imageUrl: `${FILES_PREFIX}/images/${id}.${meta.refExt}`,
        posterizedUrl: meta.posterized ? `${FILES_PREFIX}/images/${id}.jpeg` : null
    };
}

// ─── A piece on a block ─────────────────────────────────────────────────

const MODES = ["amplitude", "spectrum"];
const clampOffset = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(Math.min(20000, Math.max(-20000, n)) * 10) / 10 : 0;
};

/**
 * Check and normalise the soundscape stored on a block (`soundscape_data`):
 * the client sends { imageId, audioId, mode, veil, offsetX, offsetY }; the
 * drawing and the processed audio must exist. Returns { value (JSON string),
 * imageUrl } or { error }. Everything else is derived here, never trusted.
 */
export function sanitizeSoundscape(raw) {
    let s = raw;
    if (typeof s === "string") {
        try { s = JSON.parse(s); } catch { return { error: "Datos del paisaje sonoro inválidos" }; }
    }
    if (!s || typeof s !== "object") return { error: "Datos del paisaje sonoro inválidos" };
    const meta = imageMeta(s.imageId);
    if (!meta) return { error: "La imagen del paisaje sonoro no existe" };
    const audio = audioStatus(s.audioId);
    if (!audio || audio.status !== "ready") return { error: "El audio del paisaje sonoro no está listo" };
    const veil = Number(s.veil);
    const value = {
        v: 1,
        imageId: s.imageId,
        audioId: s.audioId,
        style: meta.style,
        width: meta.width,
        height: meta.height,
        mode: MODES.includes(s.mode) ? s.mode : "amplitude",
        veil: Number.isFinite(veil) ? Math.min(1, Math.max(0, Math.round(veil * 100) / 100)) : 0.35,
        offsetX: clampOffset(s.offsetX),
        offsetY: clampOffset(s.offsetY),
        audioFormat: audio.originalFormat ?? null,
        loudnessBefore: audio.loudnessBefore ?? null,
        loudnessAfter: audio.loudnessAfter ?? null
    };
    return { value: JSON.stringify(value), imageUrl: imageUrls(s.imageId, meta).imageUrl };
}

// ─── Clean-up ───────────────────────────────────────────────────────────

/**
 * Delete uploads no block references once they're older than 48 h (editors
 * closed without saving, pieces replaced or deleted). Conservative: if the
 * block table can't be read, nothing is deleted.
 */
export async function cleanupOrphans(maxAgeMs = ORPHAN_AGE_MS) {
    const rows = await article_block_model.findAll({
        where: { soundscape_data: { [Op.ne]: null } },
        attributes: ["soundscape_data"]
    });
    const usedImages = new Set();
    const usedAudio = new Set();
    for (const r of rows) {
        try {
            const s = JSON.parse(r.soundscape_data);
            if (s.imageId) usedImages.add(s.imageId);
            if (s.audioId) usedAudio.add(s.audioId);
        } catch { /* unreadable: ignore */ }
    }
    const now = Date.now();
    let removed = 0;
    const sweep = (dir, used) => {
        for (const f of fs.readdirSync(dir)) {
            const id = f.split(".")[0];
            if (!isId(id) || used.has(id)) continue;
            const full = path.join(dir, f);
            if (now - fs.statSync(full).mtimeMs < maxAgeMs) continue;
            fs.rmSync(full, { force: true });
            removed++;
        }
    };
    sweep(IMAGES_DIR, usedImages);
    sweep(AUDIO_DIR, usedAudio);
    // Multer leftovers.
    for (const f of fs.readdirSync(TMP_DIR)) {
        const full = path.join(TMP_DIR, f);
        if (now - fs.statSync(full).mtimeMs > 24 * 60 * 60 * 1000) { fs.rmSync(full, { force: true }); removed++; }
    }
    if (removed) console.log(`[paisaje] cleanup: ${removed} orphan file(s) removed`);
    return removed;
}
