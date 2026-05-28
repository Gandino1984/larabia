import magazineThemeController from './magazine_theme_controller.js';
import { requireSuperAdmin } from '../../utils/authHelper.js';

/** GET /magazine-theme — public. Always returns the singleton row. */
async function getTheme(req, res) {
    try {
        const result = await magazineThemeController.get();
        if (result.error) return res.status(500).json(result);
        res.json({ error: null, data: result.data });
    } catch (err) {
        console.error('-> getTheme API - Error =', err);
        res.status(500).json({ error: 'Error al cargar el tema de la revista', details: err.message });
    }
}

/**
 * PATCH /magazine-theme — super-admin.
 * Body: { preset?, tokens?, landing_bg_type?, landing_bg_value?,
 *         animations_enabled?, animation_speed?, respect_reduced_motion? }
 */
async function updateTheme(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const result = await magazineThemeController.update(req.body || {}, admin.id_user);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> updateTheme API - Error =', err);
        res.status(500).json({ error: 'Error al actualizar el tema de la revista', details: err.message });
    }
}

/**
 * POST /magazine-theme/upload-background — super-admin.
 * ThemeUploadMiddleware has already placed the file on disk; we persist the path.
 */
async function uploadBackground(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        if (!req.file) return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });

        const relativePath = `/uploads/theme/${req.file.filename}`;
        const result = await magazineThemeController.setLandingBackground(relativePath, admin.id_user);
        if (result.error) return res.status(500).json(result);
        res.json({ error: null, data: result.data, success: result.success });
    } catch (err) {
        console.error('-> uploadBackground API - Error =', err);
        res.status(500).json({ error: 'Error al subir el fondo', details: err.message });
    }
}

export default { getTheme, updateTheme, uploadBackground };
