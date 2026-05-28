import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { validateImageMiddleware } from '../utils/imageValidationUtilities.js';
import { processUploadedImage } from '../utils/imageConversionUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
  }
  try { await fs.chmod(dirPath, 0o755); } catch {}
};

/**
 * Landing-background uploader (mirrors MetadataUploadMiddleware).
 *
 * Body: multipart/form-data with field 'image' (single file).
 * Files land at back-end/uploads/theme/landing-bg.webp — a single canonical
 * filename, so a new upload replaces the previous background. Backgrounds are
 * full-bleed, so the size cap is higher than logos (2 MB).
 */
const bgStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const dir = path.join(__dirname, '..', 'uploads', 'theme');
      await ensureDirectoryExists(dir);
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    cb(null, `temp_bg_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/avif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`Tipo de archivo inválido. Solo JPEG, PNG, WebP, AVIF. Recibido: ${file.mimetype}`), false);
};

const uploadBg = multer({
  storage: bgStorage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 } // 8 MB upload cap (compressed below)
}).single('image');

const handleBackgroundUpload = async (req, res, next) => {
  uploadBg(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Error al subir el archivo', details: err.message, code: err.code });
    } else if (err) {
      return res.status(400).json({ error: 'Error al subir el fondo', details: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });

    try {
      await validateImageMiddleware(req, res, async () => {
        try {
          const processed = await processUploadedImage(req.file, 2048); // backgrounds: cap ~2 MB
          const finalName = `landing-bg.webp`;
          const finalPath = path.join(path.dirname(processed.path), finalName);

          try { await fs.unlink(finalPath); } catch {}
          await fs.rename(processed.path, finalPath);

          req.file = { ...processed, path: finalPath, filename: finalName };
          next();
        } catch (processError) {
          console.error('Error processing background:', processError);
          if (req.file?.path) {
            try { await fs.unlink(req.file.path); } catch {}
          }
          return res.status(500).json({ error: 'Error al procesar el fondo', details: processError.message });
        }
      });
    } catch (validationError) {
      console.error('Background validation failed:', validationError);
    }
  });
};

export { handleBackgroundUpload };
