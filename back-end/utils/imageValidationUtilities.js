import { validateMIMEType } from "validate-image-type";
import fs from 'fs/promises';

export const SUPPORTED_IMAGE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'image/avif': ['.avif']
};

export const IMAGE_VALIDATION_CONFIG = {
    allowMimeTypes: Object.keys(SUPPORTED_IMAGE_TYPES),
    maxSize: 1 * 1024 * 1024 // 1MB
};

export const validateImage = async (filePath) => {
    try {
        const result = await validateMIMEType(filePath, {
            allowMimeTypes: IMAGE_VALIDATION_CONFIG.allowMimeTypes
        });

        if (!result.ok) {
            throw new Error(result.error);
        }

        const stats = await fs.stat(filePath);

        if (stats.size > IMAGE_VALIDATION_CONFIG.maxSize) {
            console.log(`Image size is ${Math.round(stats.size / (1024 * 1024))}MB, will be compressed to 1MB`);
        }

        return {
            valid: true,
            mimeType: result.mimeType,
            size: stats.size,
            needsCompression: stats.size > IMAGE_VALIDATION_CONFIG.maxSize
        };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

export const validateImageMiddleware = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
        }

        const validationResult = await validateImage(req.file.path);

        if (!validationResult.valid) {
            await fs.unlink(req.file.path);
            return res.status(400).json({
                error: 'Archivo de imagen inválido',
                details: validationResult.error
            });
        }

        if (validationResult.needsCompression) {
            console.log('Image needs compression, will be processed');
        }

        req.imageValidation = validationResult;
        next();
    } catch (error) {
        console.error('-> imageValidationUtilities.js - validateImageMiddleware() - Error =', error);
        if (req.file) {
            try { await fs.unlink(req.file.path); } catch {}
        }
        return res.status(500).json({ error: 'Error al validar la imagen' });
    }
};
