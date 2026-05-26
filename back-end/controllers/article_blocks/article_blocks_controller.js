// back-end/controllers/article_blocks/article_blocks_controller.js
import article_block_model from "../../models/article_block_model.js";
import magazine_article_model from "../../models/magazine_article_model.js";
import { Op } from "sequelize";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function validateBlockData(blockData) {
    const errors = [];

    if (!blockData.article_id) {
        errors.push("El ID del artículo es obligatorio");
    }

    if (!blockData.block_type) {
        errors.push("El tipo de bloque es obligatorio");
    } else if (!['text', 'image', 'iframe', 'comic_panel'].includes(blockData.block_type)) {
        errors.push("Tipo de bloque inválido. Debe ser 'text', 'image', 'iframe' o 'comic_panel'");
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

        // Validate if provided
        if (blockData.block_type || blockData.content || blockData.image_url || blockData.iframe_url) {
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

        // Check if image needs WebP conversion (JPEG/JPG/PNG)
        const needsConversion = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
        const originalFormat = file.mimetype.split('/')[1].toUpperCase();

        let finalFileName;
        let filePath;
        let wasConverted = false;
        let originalSize = file.buffer.length;
        let finalSize = originalSize;

        if (needsConversion) {
            // Check image dimensions before conversion
            const sharp = (await import('sharp')).default;
            const metadata = await sharp(file.buffer).metadata();
            const maxWebPDimension = 16383; // WebP max dimension limit

            console.log(`-> Image info:`, {
                filename: file.originalname,
                dimensions: `${metadata.width}x${metadata.height}`,
                size: Math.round(originalSize / 1024) + 'KB',
                format: originalFormat
            });

            // If image exceeds WebP dimension limits, keep original format
            if (metadata.width > maxWebPDimension || metadata.height > maxWebPDimension) {
                console.log(`-> ⚠️ Image exceeds WebP limits (max ${maxWebPDimension}px). Keeping original ${originalFormat} format.`);

                // Save in original format without conversion
                finalFileName = `block_${Date.now()}_${file.originalname}`;
                filePath = path.join(uploadDir, finalFileName);
                fs.writeFileSync(filePath, file.buffer);

                wasConverted = false; // No conversion happened
            } else {
                // Convert to WebP for better compression
                console.log(`-> Converting ${originalFormat} to WebP...`);

                const webpBuffer = await sharp(file.buffer)
                    .webp({ quality: 90, effort: 6 }) // High quality, good compression
                    .toBuffer();

                finalFileName = `block_${Date.now()}.webp`;
                filePath = path.join(uploadDir, finalFileName);
                fs.writeFileSync(filePath, webpBuffer);

                wasConverted = true;
                finalSize = webpBuffer.length;

                console.log(`-> ✅ Converted ${originalFormat} to WebP successfully:`, {
                    final: Math.round(finalSize / 1024) + 'KB',
                    saved: Math.round((originalSize - finalSize) / 1024) + 'KB'
                });
            }
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

        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/ogg', 'audio/webm', 'audio/aac'];
        if (!allowedTypes.includes(file.mimetype)) {
            console.log('Rejected file mimetype:', file.mimetype);
            return { error: "Tipo de archivo no permitido. Solo se aceptan archivos de audio (MP3, WAV, OGG, WEBM, AAC)" };
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
