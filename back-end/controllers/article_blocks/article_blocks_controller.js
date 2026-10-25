// back-end/controllers/article_blocks/article_blocks_controller.js
import article_block_model from "../../models/article_block_model.js";
import magazine_article_model from "../../models/magazine_article_model.js";
import { Op } from "sequelize";
import { sanitizeSoundscape } from "../paisaje/paisaje_store.js";
import { normalizeTranslations } from "../../utils/translations.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// WebP's largest side, in pixels.
const WEBP_MAX = 16383;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function validateBlockData(blockData) {
    const errors = [];

    if (!blockData.article_id) {
        errors.push("El ID del artículo es obligatorio");
    }

    if (!blockData.block_type) {
        errors.push("El tipo de bloque es obligatorio");
    } else if (!['text', 'image', 'iframe', 'comic_panel', 'paisaje'].includes(blockData.block_type)) {
        errors.push("Tipo de bloque inválido. Debe ser 'text', 'image', 'iframe', 'comic_panel' o 'paisaje'");
    }

    if (blockData.block_type === 'paisaje' && !blockData.soundscape_data) {
        errors.push("El paisaje sonoro está incompleto");
    }

    // Validate based on block type
    if (blockData.block_type === 'text' && !blockData.content) {
        errors.push("El contenido de texto es obligatorio para bloques de texto");
    }

    if (blockData.block_type === 'image' && !blockData.image_url) {
        errors.push("La URL de la imagen es obligatoria para bloques de imagen");
    }

    if (blockData.block_type === 'comic_panel' && blockData.interaction_type !== 'iframe' && !blockData.image_url) {
        errors.push("La URL de la imagen es obligatoria para paneles de cómic");
    }
    if (blockData.block_type === 'comic_panel' && blockData.interaction_type === 'iframe' && !blockData.interaction_data) {
        errors.push("La URL del iframe es obligatoria para paneles de cómic de tipo iframe");
    }

    if (blockData.block_type === 'iframe' && !blockData.iframe_url) {
        errors.push("La URL del iframe es obligatoria para bloques de iframe");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Paisaje sonoro on a block (article format or comic panel): check the piece
 * and store its normalised JSON; the block's image_url becomes the piece's
 * reference image (previews, comic preload, cover fallback). Mutates
 * blockData; returns an error message or null.
 */
function applySoundscape(blockData) {
    if (blockData.soundscape_data === undefined) return null;
    if (blockData.soundscape_data === null || blockData.soundscape_data === '') {
        blockData.soundscape_data = null;
        return null;
    }
    const { value, imageUrl, error } = sanitizeSoundscape(blockData.soundscape_data);
    if (error) return error;
    blockData.soundscape_data = value;
    blockData.image_url = imageUrl;
    return null;
}

// Get all blocks for a specific article, ordered by block_order
async function getBlocksByArticleId(article_id) {
    try {
        const blocks = await article_block_model.findAll({
            where: { article_id },
            order: [['block_order', 'ASC']]
        });

        console.log(`-> article_blocks_controller.js - getBlocksByArticleId() - Blocks found for article ${article_id}:`, blocks.length);

        return { data: blocks };
    } catch (err) {
        console.error("-> article_blocks_controller.js - getBlocksByArticleId() - Error =", err);
        return { error: "Error al obtener bloques del artículo" };
    }
}

// Get a single block by ID
async function getById(id_block) {
    try {
        const block = await article_block_model.findByPk(id_block);

        if (!block) {
            return { error: "Bloque no encontrado" };
        }

        console.log("-> article_blocks_controller.js - getById() - Block found:", id_block);

        return { data: block };
    } catch (err) {
        console.error("-> article_blocks_controller.js - getById() - Error =", err);
        return { error: "Error al obtener bloque" };
    }
}

// Create a new block
async function create(blockData) {
    try {
        // Validate article exists
        const article = await magazine_article_model.findByPk(blockData.article_id);
        if (!article) {
            return { error: "Artículo no encontrado" };
        }

        const soundscapeError = applySoundscape(blockData);
        if (soundscapeError) return { error: soundscapeError };
        // Text / caption / alt in other languages.
        if (blockData.translations_block !== undefined) {
            blockData.translations_block = normalizeTranslations('block', blockData.translations_block);
        }

        // Validate block data
        const validation = validateBlockData(blockData);
        if (!validation.isValid) {
            return { error: validation.errors.join(", ") };
        }

        // If no block_order specified, add to end
        if (blockData.block_order === undefined || blockData.block_order === null) {
            const maxOrder = await article_block_model.max('block_order', {
                where: { article_id: blockData.article_id }
            });
            blockData.block_order = (maxOrder || -1) + 1;
        }

        const newBlock = await article_block_model.create(blockData);

        console.log("-> article_blocks_controller.js - create() - Block created:", newBlock.id_block);

        return { data: newBlock };
    } catch (err) {
        console.error("-> article_blocks_controller.js - create() - Error =", err);
        return { error: "Error al crear bloque" };
    }
}

// Update an existing block
async function update(id_block, blockData) {
    try {
        const block = await article_block_model.findByPk(id_block);

        if (!block) {
            return { error: "Bloque no encontrado" };
        }

        const soundscapeError = applySoundscape(blockData);
        if (soundscapeError) return { error: soundscapeError };
        if (blockData.translations_block !== undefined) {
            blockData.translations_block = normalizeTranslations('block', blockData.translations_block);
        }

        // Validate if provided
        if (blockData.block_type || blockData.content || blockData.image_url || blockData.iframe_url || blockData.soundscape_data) {
            const dataToValidate = { ...block.toJSON(), ...blockData };
            const validation = validateBlockData(dataToValidate);
            if (!validation.isValid) {
                return { error: validation.errors.join(", ") };
            }
        }

        await block.update(blockData);

        console.log("-> article_blocks_controller.js - update() - Block updated:", id_block);

        return { data: block };
    } catch (err) {
        console.error("-> article_blocks_controller.js - update() - Error =", err);
        return { error: "Error al actualizar bloque" };
    }
}

// Delete a block
async function deleteBlock(id_block) {
    try {
        const block = await article_block_model.findByPk(id_block);

        if (!block) {
            return { error: "Bloque no encontrado" };
        }

        const article_id = block.article_id;
        const deletedOrder = block.block_order;

        await block.destroy();

        // Reorder remaining blocks
        await article_block_model.decrement(
            'block_order',
            {
                by: 1,
                where: {
                    article_id: article_id,
                    block_order: { [Op.gt]: deletedOrder }
                }
            }
        );

        console.log("-> article_blocks_controller.js - deleteBlock() - Block deleted:", id_block);

        return { data: { message: "Bloque eliminado exitosamente" } };
    } catch (err) {
        console.error("-> article_blocks_controller.js - deleteBlock() - Error =", err);
        return { error: "Error al eliminar bloque" };
    }
}

// Reorder blocks - update multiple blocks' order at once
async function reorderBlocks(article_id, blockOrders) {
    try {
        // blockOrders should be an array of { id_block, block_order }
        const article = await magazine_article_model.findByPk(article_id);
        if (!article) {
            return { error: "Artículo no encontrado" };
        }

        for (const { id_block, block_order } of blockOrders) {
            await article_block_model.update(
                { block_order },
                { where: { id_block, article_id } }
            );
        }

        console.log("-> article_blocks_controller.js - reorderBlocks() - Blocks reordered for article:", article_id);

        return { data: { message: "Bloques reordenados exitosamente" } };
    } catch (err) {
        console.error("-> article_blocks_controller.js - reorderBlocks() - Error =", err);
        return { error: "Error al reordenar bloques" };
    }
}

// Upload image for image block
async function uploadBlockImage(file) {
    try {
        if (!file) {
            return { error: "No se proporcionó ningún archivo" };
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return { error: "Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, GIF, WEBP, AVIF)" };
        }

        const uploadDir = path.join(__dirname, '../../uploads/article_blocks');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // JPEG / PNG (comic panels and image blocks, up to 20 MB) become WebP.
        // GIF (it may move), WebP and AVIF are kept as they come.
        const needsConversion = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
        const originalFormat = file.mimetype.split('/')[1].toUpperCase();

        let finalFileName;
        let filePath;
        let wasConverted = false;
        let originalSize = file.buffer.length;
        let finalSize = originalSize;

        if (needsConversion) {
            const sharp = (await import('sharp')).default;
            let webpBuffer;
            let resized = false;
            try {
                const metadata = await sharp(file.buffer).metadata();
                // Photos from phones: their EXIF orientation (rotate() applies it;
                // the WebP has none). Orientations 5–8 turn it a quarter.
                const turned = (metadata.orientation || 1) >= 5;
                const width = turned ? metadata.height : metadata.width;
                const height = turned ? metadata.width : metadata.height;
                console.log(`-> Image info:`, {
                    filename: file.originalname,
                    dimensions: `${width}x${height}`,
                    size: Math.round(originalSize / 1024) + 'KB',
                    format: originalFormat
                });
                let pipeline = sharp(file.buffer).rotate();
                // WebP can't go past WEBP_MAX px a side: a wider panel is scaled
                // down to fit (same proportions) rather than kept as PNG/JPEG.
                if (width > WEBP_MAX || height > WEBP_MAX) {
                    pipeline = pipeline.resize({ width: WEBP_MAX, height: WEBP_MAX, fit: 'inside', withoutEnlargement: true });
                    resized = true;
                }
                // Effort 4: the same quality and size as the slowest setting, in
                // a fraction of the time (a 20 MB panel would near the upload's
                // time limit at effort 6).
                webpBuffer = await pipeline.webp({ quality: 90, effort: 4 }).toBuffer();
            } catch (err) {
                console.error('-> WebP conversion failed:', err.message);
                return { error: /pixel limit/i.test(err.message)
                    ? 'La imagen tiene demasiados píxeles para convertirla a WebP: redúcela un poco'
                    : 'No se pudo convertir la imagen a WebP' };
            }

            finalFileName = `block_${Date.now()}.webp`;
            filePath = path.join(uploadDir, finalFileName);
            fs.writeFileSync(filePath, webpBuffer);
            wasConverted = true;
            finalSize = webpBuffer.length;
            console.log(`-> ✅ Converted ${originalFormat} to WebP${resized ? ` (scaled to fit ${WEBP_MAX}px)` : ''}:`, {
                final: Math.round(finalSize / 1024) + 'KB',
                saved: Math.round((originalSize - finalSize) / 1024) + 'KB'
            });
        } else {
            // Keep original format (GIF, WebP, AVIF)
            finalFileName = `block_${Date.now()}_${file.originalname}`;
            filePath = path.join(uploadDir, finalFileName);
            fs.writeFileSync(filePath, file.buffer);
        }

        // Return relative URL - frontend will construct full URL using VITE_API_URL
        const imageUrl = `/uploads/article_blocks/${finalFileName}`;

        console.log("-> article_blocks_controller.js - uploadBlockImage() - Image uploaded:", imageUrl);

        return {
            data: {
                image_url: imageUrl,
                converted: wasConverted,
                originalFormat: wasConverted ? originalFormat : null,
                originalSize: Math.round(originalSize / 1024), // KB
                finalSize: Math.round(finalSize / 1024), // KB
                savedSpace: wasConverted ? Math.round((originalSize - finalSize) / 1024) : 0 // KB
            }
        };
    } catch (err) {
        console.error("-> article_blocks_controller.js - uploadBlockImage() - Error =", err);
        console.error("-> Error details:", {
            message: err.message,
            stack: err.stack,
            filename: file?.originalname,
            filesize: file?.size,
            mimetype: file?.mimetype
        });
        return { error: "Error al subir imagen: " + err.message };
    }
}

// Upload audio for interactive panel
async function uploadPanelAudio(file) {
    try {
        if (!file) {
            return { error: "No se proporcionó ningún archivo de audio" };
        }

        // Accepted: MP3, AAC (incl. .aac ADTS and .m4a container), OGG, WEBM, MP4. WAV removed.
        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/x-aac', 'audio/aacp', 'audio/vnd.dlna.adts', 'audio/mp4', 'audio/x-m4a', 'video/mp4'];
        if (!allowedTypes.includes(file.mimetype)) {
            console.log('Rejected file mimetype:', file.mimetype);
            return { error: "Tipo de archivo no permitido. Solo se aceptan archivos de audio (MP3, AAC, OGG, MP4)" };
        }

        const uploadDir = path.join(__dirname, '../../uploads/article_blocks/audio');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `audio_${Date.now()}_${file.originalname}`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, file.buffer);

        // Return relative URL - frontend will construct full URL using VITE_API_URL
        const audioUrl = `/uploads/article_blocks/audio/${fileName}`;

        console.log("-> article_blocks_controller.js - uploadPanelAudio() - Audio uploaded:", audioUrl);

        return { data: { audio_url: audioUrl } };
    } catch (err) {
        console.error("-> article_blocks_controller.js - uploadPanelAudio() - Error =", err);
        return { error: "Error al subir audio" };
    }
}

export default {
    getBlocksByArticleId,
    getById,
    create,
    update,
    deleteBlock,
    reorderBlocks,
    uploadBlockImage,
    uploadPanelAudio
};
