import magazineMetadataController from './magazine_metadata_controller.js';
import { requireSuperAdmin } from '../../utils/authHelper.js';

/** GET /magazine-metadata — public. Always returns the singleton row. */
async function getMetadata(req, res) {
    try {
        const result = await magazineMetadataController.get();
        if (result.error) return res.status(500).json(result);
        res.json({ error: null, data: result.data });
    } catch (err) {
        console.error('-> getMetadata API - Error =', err);
        res.status(500).json({ error: 'Error al cargar los datos de la revista', details: err.message });
    }
}

/** PATCH /magazine-metadata — super-admin. Body: { name?, slogan?, description? } */
async function updateMetadata(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const { name, slogan, description } = req.body || {};
        const result = await magazineMetadataController.update(
            { name, slogan, description },
            admin.id_user
        );
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> updateMetadata API - Error =', err);
        res.status(500).json({ error: 'Error al actualizar los datos de la revista', details: err.message });
    }
}

/**
 * POST /magazine-metadata/upload-logo?variant=light|dark — super-admin.
 * MetadataUploadMiddleware has already placed the file on disk by the time
 * this handler runs; we just persist the path to the DB.
 */
async function uploadLogo(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        if (!req.file) return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });

        // Compute the public path the front-end will use to fetch the image.
        // Files live in back-end/uploads/magazine-metadata; express.static
        // serves them under /uploads/.
        const variant = (req.query.variant || 'light').toLowerCase() === 'dark' ? 'dark' : 'light';
        const relativePath = `/uploads/magazine-metadata/${req.file.filename}`;

        const result = await magazineMetadataController.setLogoPath(variant, relativePath, admin.id_user);
        if (result.error) return res.status(500).json(result);
        res.json({ error: null, data: result.data, success: result.success });
    } catch (err) {
        console.error('-> uploadLogo API - Error =', err);
        res.status(500).json({ error: 'Error al subir el logo', details: err.message });
    }
}

export default { getMetadata, updateMetadata, uploadLogo };
