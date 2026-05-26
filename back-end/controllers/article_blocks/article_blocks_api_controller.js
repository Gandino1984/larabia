// back-end/controllers/article_blocks/article_blocks_api_controller.js
import articleBlocksController from "./article_blocks_controller.js";
import multer from 'multer';

// Configure multer for memory storage with 50MB limit for large comic panels
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit for large horizontal images
    }
});

async function getBlocksByArticleId(req, res) {
    try {
        const { article_id } = req.params;

        if (!article_id) {
            return res.status(400).json({
                error: 'El ID del artículo es obligatorio'
            });
        }

        const { error, data } = await articleBlocksController.getBlocksByArticleId(article_id);

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> article_blocks_api_controller.js - getBlocksByArticleId() - Error =", err);
        res.status(500).json({
            error: "Error al obtener bloques del artículo",
            details: err.message
        });
    }
}

async function getById(req, res) {
    try {
        const { id_block } = req.params;

        if (!id_block) {
            return res.status(400).json({
                error: 'El ID del bloque es obligatorio'
            });
        }

        const { error, data } = await articleBlocksController.getById(id_block);

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> article_blocks_api_controller.js - getById() - Error =", err);
        res.status(500).json({
            error: "Error al obtener bloque",
            details: err.message
        });
    }
}

async function create(req, res) {
    try {
        const blockData = req.body;

        const { error, data } = await articleBlocksController.create(blockData);

        if (error) {
            return res.status(400).json({ error });
        }

        res.status(201).json({ error, data });
    } catch (err) {
        console.error("-> article_blocks_api_controller.js - create() - Error =", err);
        res.status(500).json({
            error: "Error al crear bloque",
            details: err.message
        });
    }
}

async function update(req, res) {
    try {
        const { id_block } = req.params;
        const blockData = req.body;

        if (!id_block) {
            return res.status(400).json({
                error: 'El ID del bloque es obligatorio'
            });
        }

        const { error, data } = await articleBlocksController.update(id_block, blockData);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> article_blocks_api_controller.js - update() - Error =", err);
        res.status(500).json({
            error: "Error al actualizar bloque",
            details: err.message
        });
    }
}

async function deleteBlock(req, res) {
    try {
        const { id_block } = req.params;

        if (!id_block) {
            return res.status(400).json({
                error: 'El ID del bloque es obligatorio'
            });
        }

        const { error, data } = await articleBlocksController.deleteBlock(id_block);

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> article_blocks_api_controller.js - deleteBlock() - Error =", err);
        res.status(500).json({
            error: "Error al eliminar bloque",
            details: err.message
        });
    }
}

async function reorderBlocks(req, res) {
    try {
        const { article_id } = req.params;
        const { blocks } = req.body; // Array of { id_block, block_order }

        if (!article_id) {
            return res.status(400).json({
                error: 'El ID del artículo es obligatorio'
            });
        }

        if (!Array.isArray(blocks)) {
            return res.status(400).json({
                error: 'Se requiere un array de bloques con sus nuevos órdenes'
            });
        }

        const { error, data } = await articleBlocksController.reorderBlocks(article_id, blocks);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> article_blocks_api_controller.js - reorderBlocks() - Error =", err);
        res.status(500).json({
            error: "Error al reordenar bloques",
            details: err.message
        });
    }
}

async function uploadImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No se proporcionó ningún archivo'
            });
        }

        const { error, data } = await articleBlocksController.uploadBlockImage(req.file);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> article_blocks_api_controller.js - uploadImage() - Error =", err);
        res.status(500).json({
            error: "Error al subir imagen",
            details: err.message
        });
    }
}

async function uploadAudio(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No se proporcionó ningún archivo de audio'
            });
        }

        const { error, data } = await articleBlocksController.uploadPanelAudio(req.file);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> article_blocks_api_controller.js - uploadAudio() - Error =", err);
        res.status(500).json({
            error: "Error al subir audio",
            details: err.message
        });
    }
}

export default {
    getBlocksByArticleId,
    getById,
    create,
    update,
    deleteBlock,
    reorderBlocks,
    uploadImage,
    uploadAudio,
    uploadMiddleware: upload.single('image'),
    audioUploadMiddleware: upload.single('audio')
};
