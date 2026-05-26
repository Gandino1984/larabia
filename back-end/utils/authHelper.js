import user_model from '../models/user_model.js';

/**
 * Resolve the calling user from a request.
 *
 * Auth model: the magazine front-end sends `x-user-id` on requests that
 * need authentication. Server-side we look that id up in the DB to get
 * the canonical role flags — never trust booleans the client sends.
 *
 * Returns null when there is no x-user-id header or the user no longer
 * exists. Returns the Sequelize user model instance otherwise.
 */
export async function getRequestUser(req) {
    const idHeader = req.headers['x-user-id'];
    if (!idHeader) return null;
    const id = parseInt(idHeader, 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    try {
        return await user_model.findByPk(id);
    } catch (err) {
        console.error('[authHelper] user lookup failed:', err.message);
        return null;
    }
}

/**
 * Convenience role snapshot. Boolean fields read from a Sequelize model can
 * be either booleans or 0/1 ints depending on dialect mood, so coerce.
 */
export function roleSnapshot(user) {
    const truthy = (v) => v === true || v === 1;
    if (!user) {
        return {
            isAuthenticated: false,
            isEditor: false,
            isSuperAdmin: false,
            isPremiumReader: false,
            userId: null
        };
    }
    return {
        isAuthenticated: true,
        isEditor: truthy(user.is_editor),
        isSuperAdmin: truthy(user.is_super_admin),
        isPremiumReader: truthy(user.is_premium_reader),
        userId: user.id_user
    };
}

/**
 * Reject the request unless the caller is a super admin. Sends the 403 itself;
 * returns true iff the request should proceed.
 */
export async function requireSuperAdmin(req, res) {
    const user = await getRequestUser(req);
    if (!user || !roleSnapshot(user).isSuperAdmin) {
        res.status(403).json({ error: 'Solo el super-administrador puede realizar esta acción' });
        return null;
    }
    return user;
}

export default {
    getRequestUser,
    roleSnapshot,
    requireSuperAdmin
};
