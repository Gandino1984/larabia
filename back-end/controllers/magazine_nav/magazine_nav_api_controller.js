import magazineNavController from './magazine_nav_controller.js';
import { requireSuperAdmin } from '../../utils/authHelper.js';

/** GET /magazine-nav — public. Returns the singleton row (nav_config may be null). */
async function getNav(req, res) {
    try {
        const result = await magazineNavController.get();
        if (result.error) return res.status(500).json(result);
        res.json({ error: null, data: result.data });
    } catch (err) {
        console.error('-> getNav API - Error =', err);
        res.status(500).json({ error: 'Error al cargar la navegación', details: err.message });
    }
}

/** PATCH /magazine-nav — super-admin. Body: { nav_config: [...] | null } */
async function updateNav(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const result = await magazineNavController.update(req.body?.nav_config, admin.id_user);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> updateNav API - Error =', err);
        res.status(500).json({ error: 'Error al actualizar la navegación', details: err.message });
    }
}

export default { getNav, updateNav };
