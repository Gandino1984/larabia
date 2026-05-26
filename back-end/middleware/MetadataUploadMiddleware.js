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
 * Magazine logo uploader.
 *
 * Body: multipart/form-data with field 'image' (single file).
 * Query: ?variant=light|dark
 *
 * Files land at back-end/uploads/magazine-metadata/logo-{variant}.webp.
 * Old file at the same variant is replaced (single canonical filename per variant).
 * Animation behavior in the front-end is untouched — only the SOURCE file changes.
 */
const logoStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const dir = path.join(__dirname, '..', 'uploads', 'magazine-metadata');
      await ensureDirectoryExists(dir);
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const variant = (req.query.variant || 'light').toLowerCase();
    const safeVariant = variant === 'dark' ? 'dark' : 'light';
    cb(null, `temp_logo_${safeVariant}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/avif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`Tipo de archivo inválido. Solo JPEG, PNG, WebP, AVIF. Recibido: ${file.mimetype}`), false);
};

const uploadLogo = multer({
  storage: logoStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB cap
}).single('image');

const handleLogoUpload = async (req, res, next) => {
  uploadLogo(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Error al subir el archivo', details: err.message, code: err.code });
    } else if (err) {
      return res.status(400).json({ error: 'Error al subir el logo', details: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });

    try {
      await validateImageMiddleware(req, res, async () => {
        try {
          const processed = await processUploadedImage(req.file, 512); // logos are small — cap at 512KB
          const variant = (req.query.variant || 'light').toLowerCase() === 'dark' ? 'dark' : 'light';
          const finalName = `logo-${variant}.webp`;
          const finalPath = path.join(path.dirname(processed.path), finalName);

          try { await fs.unlink(finalPath); } catch {}
          await fs.rename(processed.path, finalPath);

          req.file = { ...processed, path: finalPath, filename: finalName };
          next();
        } catch (processError) {
          console.error('Error processing logo:', processError);
          if (req.file?.path) {
            try { await fs.unlink(req.file.path); } catch {}
          }
          return res.status(500).json({ error: 'Error al procesar el logo', details: processError.message });
        }
      });
    } catch (validationError) {
      console.error('Logo validation failed:', validationError);
    }
  });
};

export { handleLogoUpload };
