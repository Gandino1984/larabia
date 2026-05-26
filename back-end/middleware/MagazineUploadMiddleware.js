// back-end/middleware/MagazineUploadMiddleware.js
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { validateImageMiddleware } from '../utils/imageValidationUtilities.js';
import { processUploadedImage } from '../utils/imageConversionUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to ensure directory exists with proper permissions
const ensureDirectoryExists = async (dirPath) => {
  try {
    try {
      await fs.access(dirPath);
      console.log(`Directory already exists: ${dirPath}`);
    } catch {
      await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
      console.log(`Directory created successfully: ${dirPath}`);
    }

    try {
      await fs.chmod(dirPath, 0o755);
    } catch (chmodError) {
      console.warn('Could not set directory permissions:', chmodError.message);
    }

    return true;
  } catch (error) {
    console.error('Error ensuring directory exists:', error);
    throw error;
  }
};

// Function to clean existing magazine article images before saving new ones
const cleanExistingArticleImages = async (dirPath, articleId) => {
  try {
    try {
      await fs.access(dirPath);
    } catch (err) {
      console.log('Directory does not exist yet, nothing to clean');
      return;
    }

    const files = await fs.readdir(dirPath);

    if (!files || files.length === 0) {
      console.log('No files to clean in directory');
      return;
    }

    const articleFiles = files.filter(file =>
      file.includes(`article_${articleId}`) ||
      file.includes(`temp_article_${articleId}`)
    );

    if (articleFiles.length === 0) {
      console.log('No existing article files to clean');
      return;
    }

    console.log(`Cleaning ${articleFiles.length} existing images for article ${articleId}`);

    for (const file of articleFiles) {
      const filePath = path.join(dirPath, file);
      await fs.unlink(filePath);
      console.log(`Deleted existing article image: ${filePath}`);
    }
  } catch (error) {
    console.error('Error cleaning existing article images:', error);
  }
};

// Multer storage configuration for magazine images
const magazineImageStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    console.log('=== Magazine Cover Image Upload - Setting Destination ===');
    console.log('Processing file:', file.fieldname, file.originalname);

    const articleId = req.headers['x-article-id'];

    console.log('Article ID:', articleId);

    if (!articleId) {
      return cb(new Error('Article ID is required'));
    }

    try {
      const backendDir = path.resolve(__dirname, '..');

      // Build path to magazine cover images folder (under uploads, served by express.static)
      const magazineDir = path.join(backendDir, 'uploads', 'magazine');

      console.log('Directory structure:', {
        backendDir,
        magazineDir
      });

      // Ensure directory exists
      const uploadsDir = path.join(backendDir, 'uploads');

      await ensureDirectoryExists(uploadsDir);
      await ensureDirectoryExists(magazineDir);

      // Clean existing article images
      await cleanExistingArticleImages(magazineDir, articleId);

      console.log(`✓ Magazine cover image will be stored in: ${magazineDir}`);

      // Verify directory is accessible
      try {
        await fs.access(magazineDir);
        console.log('✓ Directory verified and accessible');
      } catch (err) {
        console.error('✗ Directory not accessible after creation:', err);
        throw err;
      }

      cb(null, magazineDir);
    } catch (error) {
      console.error('Error setting up upload directory:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const articleId = req.headers['x-article-id'];
    const tempFileName = articleId
      ? `temp_article_${articleId}_${Date.now()}${path.extname(file.originalname)}`
      : `temp_article_new_${Date.now()}${path.extname(file.originalname)}`;
    console.log(`Generated temporary filename: ${tempFileName}`);
    cb(null, tempFileName);
  }
});

// File filter for allowed image types
const fileFilter = (req, file, cb) => {
  console.log('File filter checking:', file.fieldname, file.mimetype);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/avif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only JPEG, PNG, JPG, WebP, and AVIF are allowed. Received: ${file.mimetype}`), false);
  }
};

// Multer upload instance
const uploadMagazineImage = multer({
  storage: magazineImageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for initial upload
  }
}).single('image'); // Field name must match frontend

// Main upload handler with validation and processing
const handleMagazineImageUpload = async (req, res, next) => {
  console.log('=== Starting Magazine Cover Image Upload Handler ===');
  console.log('Request content type:', req.headers['content-type']);
  console.log('Request headers:', {
    'x-article-id': req.headers['x-article-id']
  });

  uploadMagazineImage(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'El archivo es demasiado grande. Máximo 10MB permitido para procesamiento.',
          details: err.message,
          code: err.code,
          field: err.field
        });
      }
      return res.status(400).json({
        error: 'Error uploading file',
        details: err.message,
        code: err.code,
        field: err.field
      });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        error: 'Error uploading magazine cover image',
        details: err.message
      });
    }

    console.log('Magazine cover image upload processed by multer successfully');

    if (!req.file) {
      console.warn('No file data in request after processing');
      return res.status(400).json({
        error: 'No se ha proporcionado ningún archivo'
      });
    }

    console.log('Uploaded file details:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    try {
      await fs.access(req.file.path);
      console.log('✓ File verified on disk at:', req.file.path);
    } catch (verifyError) {
      console.error('✗ File not found on disk:', verifyError);
      return res.status(500).json({
        error: 'Error al guardar el archivo',
        details: 'El archivo no se guardó correctamente'
      });
    }

    try {
      await validateImageMiddleware(req, res, async () => {
        try {
          console.log('Processing uploaded image for WebP conversion and compression...');

          const processedFile = await processUploadedImage(req.file);

          console.log('Image processed:', {
            original: req.file.filename,
            processed: processedFile.filename,
            size: Math.round(processedFile.size / 1024) + 'KB'
          });

          const articleId = req.headers['x-article-id'];
          if (articleId) {
            const finalFilename = `article_${articleId}.webp`;
            const finalPath = path.join(path.dirname(processedFile.path), finalFilename);

            console.log(`Renaming ${processedFile.filename} to ${finalFilename}`);

            try {
              await fs.unlink(finalPath);
              console.log('Deleted existing file with same name');
            } catch (unlinkErr) {
              // File doesn't exist, which is fine
            }

            await fs.rename(processedFile.path, finalPath);
            console.log('✓ File renamed successfully');

            processedFile.path = finalPath;
            processedFile.filename = finalFilename;
          }

          req.file = processedFile;

          const stats = await fs.stat(processedFile.path);
          console.log('✓ Final image file verified:', {
            filename: processedFile.filename,
            size: Math.round(stats.size / 1024) + 'KB',
            type: processedFile.mimetype,
            path: processedFile.path
          });

          next();
        } catch (processError) {
          console.error('Error processing image:', processError);

          if (req.file && req.file.path) {
            try {
              await fs.unlink(req.file.path);
              console.log('Cleaned up failed upload file');
            } catch (cleanupError) {
              console.error('Error cleaning up file:', cleanupError);
            }
          }

          return res.status(500).json({
            error: 'Error al procesar la imagen',
            details: processError.message
          });
        }
      });
    } catch (validationError) {
      console.error('Image validation failed:', validationError);
    }
  });
};

// Function to clean existing magazine project images before saving new ones
const cleanExistingProjectImages = async (dirPath, projectId) => {
  try {
    try {
      await fs.access(dirPath);
    } catch (err) {
      console.log('Directory does not exist yet, nothing to clean');
      return;
    }

    const files = await fs.readdir(dirPath);

    if (!files || files.length === 0) {
      console.log('No files to clean in directory');
      return;
    }

    const projectFiles = files.filter(file =>
      file.includes(`project_${projectId}`) ||
      file.includes(`temp_project_${projectId}`)
    );

    if (projectFiles.length === 0) {
      console.log('No existing project files to clean');
      return;
    }

    console.log(`Cleaning ${projectFiles.length} existing images for project ${projectId}`);

    for (const file of projectFiles) {
      const filePath = path.join(dirPath, file);
      await fs.unlink(filePath);
      console.log(`Deleted existing project image: ${filePath}`);
    }
  } catch (error) {
    console.error('Error cleaning existing project images:', error);
  }
};

// Multer storage configuration for magazine project images
const magazineProjectImageStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    console.log('=== Magazine Project Cover Image Upload - Setting Destination ===');
    console.log('Processing file:', file.fieldname, file.originalname);

    const projectId = req.headers['x-project-id'];

    console.log('Project ID:', projectId);

    if (!projectId) {
      return cb(new Error('Project ID is required'));
    }

    try {
      const backendDir = path.resolve(__dirname, '..');

      // Build path to magazine projects images folder
      const projectsDir = path.join(backendDir, 'assets', 'images', 'magazine', 'projects');

      console.log('Directory structure:', {
        backendDir,
        projectsDir
      });

      // Ensure all directories exist
      const assetsDir = path.join(backendDir, 'assets');
      const imagesDir = path.join(assetsDir, 'images');
      const magazineDir = path.join(imagesDir, 'magazine');

      await ensureDirectoryExists(assetsDir);
      await ensureDirectoryExists(imagesDir);
      await ensureDirectoryExists(magazineDir);
      await ensureDirectoryExists(projectsDir);

      // Clean existing project images
      await cleanExistingProjectImages(projectsDir, projectId);

      console.log(`✓ Magazine project cover image will be stored in: ${projectsDir}`);

      // Verify directory is accessible
      try {
        await fs.access(projectsDir);
        console.log('✓ Directory verified and accessible');
      } catch (err) {
        console.error('✗ Directory not accessible after creation:', err);
        throw err;
      }

      cb(null, projectsDir);
    } catch (error) {
      console.error('Error setting up upload directory:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const projectId = req.headers['x-project-id'];
    const tempFileName = projectId
      ? `temp_project_${projectId}_${Date.now()}${path.extname(file.originalname)}`
      : `temp_project_new_${Date.now()}${path.extname(file.originalname)}`;
    console.log(`Generated temporary filename: ${tempFileName}`);
    cb(null, tempFileName);
  }
});

// Multer upload instance for project images
const uploadMagazineProjectImage = multer({
  storage: magazineProjectImageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for initial upload
  }
}).single('image'); // Field name must match frontend

// Main upload handler for project images
const handleMagazineProjectImageUpload = async (req, res, next) => {
  console.log('=== Starting Magazine Project Cover Image Upload Handler ===');
  console.log('Request content type:', req.headers['content-type']);
  console.log('Request headers:', {
    'x-project-id': req.headers['x-project-id']
  });

  uploadMagazineProjectImage(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'El archivo es demasiado grande. Máximo 10MB permitido para procesamiento.',
          details: err.message,
          code: err.code,
          field: err.field
        });
      }
      return res.status(400).json({
        error: 'Error uploading file',
        details: err.message,
        code: err.code,
        field: err.field
      });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        error: 'Error uploading magazine project cover image',
        details: err.message
      });
    }

    console.log('Magazine project cover image upload processed by multer successfully');

    if (!req.file) {
      console.warn('No file data in request after processing');
      return res.status(400).json({
        error: 'No se ha proporcionado ningún archivo'
      });
    }

    console.log('Uploaded file details:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    try {
      await fs.access(req.file.path);
      console.log('✓ File verified on disk at:', req.file.path);
    } catch (verifyError) {
      console.error('✗ File not found on disk:', verifyError);
      return res.status(500).json({
        error: 'Error al guardar el archivo',
        details: 'El archivo no se guardó correctamente'
      });
    }

    try {
      await validateImageMiddleware(req, res, async () => {
        try {
          console.log('Processing uploaded image for WebP conversion and compression...');

          const processedFile = await processUploadedImage(req.file);

          console.log('Image processed:', {
            original: req.file.filename,
            processed: processedFile.filename,
            size: Math.round(processedFile.size / 1024) + 'KB'
          });

          const projectId = req.headers['x-project-id'];
          if (projectId) {
            const finalFilename = `project_${projectId}.webp`;
            const finalPath = path.join(path.dirname(processedFile.path), finalFilename);

            console.log(`Renaming ${processedFile.filename} to ${finalFilename}`);

            try {
              await fs.unlink(finalPath);
              console.log('Deleted existing file with same name');
            } catch (unlinkErr) {
              // File doesn't exist, which is fine
            }

            await fs.rename(processedFile.path, finalPath);
            console.log('✓ File renamed successfully');

            processedFile.path = finalPath;
            processedFile.filename = finalFilename;
          }

          req.file = processedFile;

          const stats = await fs.stat(processedFile.path);
          console.log('✓ Final image file verified:', {
            filename: processedFile.filename,
            size: Math.round(stats.size / 1024) + 'KB',
            type: processedFile.mimetype,
            path: processedFile.path
          });

          next();
        } catch (processError) {
          console.error('Error processing image:', processError);

          if (req.file && req.file.path) {
            try {
              await fs.unlink(req.file.path);
              console.log('Cleaned up failed upload file');
            } catch (cleanupError) {
              console.error('Error cleaning up file:', cleanupError);
            }
          }

          return res.status(500).json({
            error: 'Error al procesar la imagen',
            details: processError.message
          });
        }
      });
    } catch (validationError) {
      console.error('Image validation failed:', validationError);
    }
  });
};

// Function to clean existing author profile images before saving new ones
const cleanExistingAuthorProfileImages = async (dirPath, userId) => {
  try {
    try {
      await fs.access(dirPath);
    } catch (err) {
      console.log('Directory does not exist yet, nothing to clean');
      return;
    }

    const files = await fs.readdir(dirPath);

    if (!files || files.length === 0) {
      console.log('No files to clean in directory');
      return;
    }

    const profileFiles = files.filter(file =>
      file.includes(`author_${userId}`) ||
      file.includes(`temp_author_${userId}`)
    );

    if (profileFiles.length === 0) {
      console.log('No existing author profile files to clean');
      return;
    }

    console.log(`Cleaning ${profileFiles.length} existing images for author user ${userId}`);

    for (const file of profileFiles) {
      const filePath = path.join(dirPath, file);
      await fs.unlink(filePath);
      console.log(`Deleted existing author profile image: ${filePath}`);
    }
  } catch (error) {
    console.error('Error cleaning existing author profile images:', error);
  }
};

// Multer storage configuration for author profile images
const authorProfileImageStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    console.log('=== Author Profile Image Upload - Setting Destination ===');
    console.log('Processing file:', file.fieldname, file.originalname);

    const userId = req.headers['x-user-id'];

    console.log('User ID:', userId);

    if (!userId) {
      return cb(new Error('User ID is required'));
    }

    try {
      const backendDir = path.resolve(__dirname, '..');

      const profilesDir = path.join(backendDir, 'uploads', 'author-profiles');

      console.log('Directory structure:', { backendDir, profilesDir });

      const uploadsDir = path.join(backendDir, 'uploads');

      await ensureDirectoryExists(uploadsDir);
      await ensureDirectoryExists(profilesDir);

      await cleanExistingAuthorProfileImages(profilesDir, userId);

      console.log(`✓ Author profile image will be stored in: ${profilesDir}`);

      try {
        await fs.access(profilesDir);
        console.log('✓ Directory verified and accessible');
      } catch (err) {
        console.error('✗ Directory not accessible after creation:', err);
        throw err;
      }

      cb(null, profilesDir);
    } catch (error) {
      console.error('Error setting up upload directory:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const userId = req.headers['x-user-id'];
    const tempFileName = userId
      ? `temp_author_${userId}_${Date.now()}${path.extname(file.originalname)}`
      : `temp_author_new_${Date.now()}${path.extname(file.originalname)}`;
    console.log(`Generated temporary filename: ${tempFileName}`);
    cb(null, tempFileName);
  }
});

// Multer upload instance for author profile images
const uploadAuthorProfileImage = multer({
  storage: authorProfileImageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for initial upload
  }
}).single('image');

// Main upload handler for author profile images
const handleAuthorProfileImageUpload = async (req, res, next) => {
  console.log('=== Starting Author Profile Image Upload Handler ===');
  console.log('Request content type:', req.headers['content-type']);
  console.log('Request headers:', { 'x-user-id': req.headers['x-user-id'] });

  uploadAuthorProfileImage(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'El archivo es demasiado grande. Máximo 10MB permitido para procesamiento.',
          details: err.message,
          code: err.code,
          field: err.field
        });
      }
      return res.status(400).json({
        error: 'Error uploading file',
        details: err.message,
        code: err.code,
        field: err.field
      });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        error: 'Error uploading author profile image',
        details: err.message
      });
    }

    console.log('Author profile image upload processed by multer successfully');

    if (!req.file) {
      console.warn('No file data in request after processing');
      return res.status(400).json({
        error: 'No se ha proporcionado ningún archivo'
      });
    }

    console.log('Uploaded file details:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    try {
      await fs.access(req.file.path);
      console.log('✓ File verified on disk at:', req.file.path);
    } catch (verifyError) {
      console.error('✗ File not found on disk:', verifyError);
      return res.status(500).json({
        error: 'Error al guardar el archivo',
        details: 'El archivo no se guardó correctamente'
      });
    }

    try {
      await validateImageMiddleware(req, res, async () => {
        try {
          console.log('Processing uploaded image for WebP conversion and compression...');

          const processedFile = await processUploadedImage(req.file);

          console.log('Image processed:', {
            original: req.file.filename,
            processed: processedFile.filename,
            size: Math.round(processedFile.size / 1024) + 'KB'
          });

          const userId = req.headers['x-user-id'];
          if (userId) {
            const finalFilename = `author_${userId}.webp`;
            const finalPath = path.join(path.dirname(processedFile.path), finalFilename);

            console.log(`Renaming ${processedFile.filename} to ${finalFilename}`);

            try {
              await fs.unlink(finalPath);
              console.log('Deleted existing file with same name');
            } catch (unlinkErr) {
              // File doesn't exist, which is fine
            }

            await fs.rename(processedFile.path, finalPath);
            console.log('✓ File renamed successfully');

            processedFile.path = finalPath;
            processedFile.filename = finalFilename;
          }

          req.file = processedFile;

          const stats = await fs.stat(processedFile.path);
          console.log('✓ Final image file verified:', {
            filename: processedFile.filename,
            size: Math.round(stats.size / 1024) + 'KB',
            type: processedFile.mimetype,
            path: processedFile.path
          });

          next();
        } catch (processError) {
          console.error('Error processing image:', processError);

          if (req.file && req.file.path) {
            try {
              await fs.unlink(req.file.path);
              console.log('Cleaned up failed upload file');
            } catch (cleanupError) {
              console.error('Error cleaning up file:', cleanupError);
            }
          }

          return res.status(500).json({
            error: 'Error al procesar la imagen',
            details: processError.message
          });
        }
      });
    } catch (validationError) {
      console.error('Image validation failed:', validationError);
    }
  });
};

export { handleMagazineImageUpload, handleMagazineProjectImageUpload, handleAuthorProfileImageUpload };
