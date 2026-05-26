import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import user_model from '../models/user_model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
};

const profileImageStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const userName = req.headers['x-user-name'];

    if (!userName) {
      console.error('Username not found in headers');
      return cb(new Error('Usuario no especificado'));
    }

    try {
      const user = await user_model.findOne({ where: { name_user: userName } });
      if (!user) {
        return cb(new Error('Usuario no encontrado'));
      }

      // Store user profile images under uploads/user-profiles/{userName}/profile.{ext}
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'user-profiles', userName);

      await ensureDirectoryExists(uploadsDir);

      try { await fs.chmod(uploadsDir, 0o755); } catch {}

      cb(null, uploadsDir);
    } catch (error) {
      console.error('Error setting up upload directory:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const fileName = `profile${path.extname(file.originalname).toLowerCase()}`;
    cb(null, fileName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo inválido. Solo se permiten JPEG, PNG, JPG y WebP. Recibido: ${file.mimetype}`), false);
  }
};

const uploadProfileImage = multer({
  storage: profileImageStorage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }
}).single('profileImage');

const handleProfileImageUpload = async (req, res, next) => {
  uploadProfileImage(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: 'Error al subir el archivo',
        details: err.message,
        code: err.code,
        field: err.field
      });
    } else if (err) {
      return res.status(400).json({
        error: 'Error al subir la imagen de perfil',
        details: err.message
      });
    }
    next();
  });
};

export { handleProfileImageUpload };
