import magazine_metadata_model from "../../models/magazine_metadata_model.js";

/**
 * Always operate on the singleton row (id=1). If the row somehow doesn't exist
 * (e.g. migration 003 was skipped), create it with defaults on first read.
 */
async function getSingleton() {
    const [row] = await magazine_metadata_model.findOrCreate({
        where: { id: 1 },
        defaults: { id: 1, name: 'La Rabia' }
    });
    return row;
}

async function get() {
    try {
        const row = await getSingleton();
        return { data: row.toJSON() };
    } catch (err) {
        console.error('-> magazine_metadata_controller.get() error =', err);
        return { error: 'Error al cargar los datos de la revista' };
    }
}

/**
 * Patch the magazine metadata. Whitelist-based so unexpected fields are dropped.
 * The two logo fields are typically set via uploadLogo() below; passing them
 * here directly lets a super admin reset them to defaults if needed.
 */
async function update(patch, updatedByUserId) {
    try {
        const row = await getSingleton();
        const allowed = ['name', 'slogan', 'description', 'logo_light', 'logo_dark'];
        const next = {};
        for (const field of allowed) {
            if (patch[field] !== undefined) next[field] = patch[field];
        }
        if (updatedByUserId) next.updated_by = updatedByUserId;

        if (next.name !== undefined && (!next.name || next.name.trim().length === 0)) {
            return { error: 'El nombre de la revista no puede estar vacío' };
        }
        if (next.name && next.name.length > 100) {
            return { error: 'El nombre no puede exceder 100 caracteres' };
        }
        if (next.slogan && next.slogan.length > 255) {
            return { error: 'El eslogan no puede exceder 255 caracteres' };
        }

        await row.update(next);
        return { data: row.toJSON(), success: 'Datos de la revista actualizados' };
    } catch (err) {
        console.error('-> magazine_metadata_controller.update() error =', err);
        return { error: 'Error al actualizar los datos de la revista' };
    }
}

/**
 * Update a logo path on the singleton row. Called by the upload route after
 * MetadataUploadMiddleware has placed the file on disk.
 */
async function setLogoPath(variant, relativePath, updatedByUserId) {
    try {
        const safeVariant = variant === 'dark' ? 'dark' : 'light';
        const field = safeVariant === 'dark' ? 'logo_dark' : 'logo_light';
        const row = await getSingleton();
        const update = { [field]: relativePath };
        if (updatedByUserId) update.updated_by = updatedByUserId;
        await row.update(update);
        return { data: row.toJSON(), success: `Logo (${safeVariant}) actualizado` };
    } catch (err) {
        console.error('-> magazine_metadata_controller.setLogoPath() error =', err);
        return { error: 'Error al actualizar el logo' };
    }
}

export default { get, update, setLogoPath };
