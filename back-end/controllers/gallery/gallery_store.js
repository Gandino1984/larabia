// back-end/controllers/gallery/gallery_store.js
//
// Where the Galería's works live: uploads/gallery (public, like the other
// uploads — the API only lists approved works, but the files of pending ones
// aren't secret). Each upload is turned into a WebP at its own size (the
// pixel size the gallery shows is the original's, read after applying the
// photo's rotation).
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const GALLERY_DIR = path.join(__dirname, '..', '..', 'uploads', 'gallery');
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/tiff'];
export const IMAGE_MAX_MB = 20;
// WebP can't go beyond this per side.
const WEBP_MAX = 16383;

export function ensureDir() {
    fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

/** Saves an uploaded image; returns { file, width, height } (the original's size). */
export async function saveWorkImage(buffer) {
    const sharp = (await import('sharp')).default;
    const img = sharp(buffer, { animated: false }).rotate();
    const meta = await sharp(buffer).metadata();
    // Orientations 5–8 turn the picture a quarter: width and height swap.
    const turned = (meta.orientation || 1) >= 5;
    const width = turned ? meta.height : meta.width;
    const height = turned ? meta.width : meta.height;
    const fit = width > WEBP_MAX || height > WEBP_MAX
        ? img.resize({ width: WEBP_MAX, height: WEBP_MAX, fit: 'inside' })
        : img;
    const data = await fit.webp({ quality: 90 }).toBuffer();
    const file = `${crypto.randomUUID()}.webp`;
    ensureDir();
    fs.writeFileSync(path.join(GALLERY_DIR, file), data);
    return { file, width, height };
}

export function removeWorkImage(file) {
    if (!file || file.includes('/') || file.includes('..')) return;
    fs.promises.unlink(path.join(GALLERY_DIR, file)).catch(() => {});
}

/** The URL path the front-end shows it from. */
export const workImagePath = (file) => (file ? `/uploads/gallery/${file}` : null);
