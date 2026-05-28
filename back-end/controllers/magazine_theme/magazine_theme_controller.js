import magazine_theme_model from "../../models/magazine_theme_model.js";

/**
 * Color tokens a super admin may override. Anything outside this set is dropped
 * so the client can't inject arbitrary custom properties. Keep in sync with the
 * front-end token layer in index.css / ThemeContext.
 */
const ALLOWED_TOKENS = new Set([
    '--color-bg',
    '--color-surface',
    '--color-surface-alt',
    '--color-surface-3',
    '--color-text',
    '--color-text-muted',
    '--color-accent',
    '--color-accent-2',
    '--color-danger',
    '--color-border',
    '--surface-light',
    '--surface-light-2',
    '--light-border',
    '--on-light',
    '--on-light-muted',
    '--color-header-bg',
    '--color-header-text',
    '--color-header-bg-active',
    '--color-header-text-active'
]);

const ALLOWED_PRESETS = new Set(['default', 'light', 'high-contrast']);
const ALLOWED_SPEEDS = new Set(['slow', 'normal', 'fast']);

// A conservative CSS color/value pattern: hex, rgb/rgba/hsl(...), or simple
// alnum (named colors). No braces/semicolons so a value can't carry CSS syntax.
const SAFE_VALUE = /^[#a-zA-Z0-9.,()%\s/-]{1,64}$/;

function sanitizeTokens(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const clean = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!ALLOWED_TOKENS.has(key)) continue;
        if (typeof value !== 'string' || !SAFE_VALUE.test(value)) continue;
        clean[key] = value.trim();
    }
    return Object.keys(clean).length ? clean : {};
}

/**
 * Always operate on the singleton row (id=1). Create it with defaults on first
 * read if migration 005 left it empty.
 */
async function getSingleton() {
    const [row] = await magazine_theme_model.findOrCreate({
        where: { id: 1 },
        defaults: { id: 1, preset: 'default' }
    });
    return row;
}

async function get() {
    try {
        const row = await getSingleton();
        return { data: row.toJSON() };
    } catch (err) {
        console.error('-> magazine_theme_controller.get() error =', err);
        return { error: 'Error al cargar el tema de la revista' };
    }
}

/**
 * Patch the theme. Whitelist-based; unexpected fields and unsafe values are
 * dropped. landing_bg_value for an image is normally set via uploadBackground().
 */
async function update(patch, updatedByUserId) {
    try {
        const row = await getSingleton();
        const next = {};

        if (patch.preset !== undefined) {
            if (!ALLOWED_PRESETS.has(patch.preset)) {
                return { error: 'Preset de tema no válido' };
            }
            next.preset = patch.preset;
        }
        if (patch.tokens !== undefined) {
            const tokens = sanitizeTokens(patch.tokens);
            if (tokens === null) return { error: 'Formato de colores no válido' };
            next.tokens = tokens;
        }
        if (patch.landing_bg_type !== undefined) {
            if (patch.landing_bg_type !== 'color' && patch.landing_bg_type !== 'image') {
                return { error: 'Tipo de fondo no válido' };
            }
            next.landing_bg_type = patch.landing_bg_type;
        }
        if (patch.landing_bg_value !== undefined) {
            const v = patch.landing_bg_value;
            if (v !== null && (typeof v !== 'string' || v.length > 255)) {
                return { error: 'Valor de fondo no válido' };
            }
            // For a color value reuse the safe pattern; image paths are set by upload.
            if (v && next.landing_bg_type !== 'image' && patch.landing_bg_type !== 'image'
                && !v.startsWith('/uploads/') && !SAFE_VALUE.test(v)) {
                return { error: 'Color de fondo no válido' };
            }
            next.landing_bg_value = v;
        }
        if (patch.animations_enabled !== undefined) {
            next.animations_enabled = !!patch.animations_enabled;
        }
        if (patch.animation_speed !== undefined) {
            if (!ALLOWED_SPEEDS.has(patch.animation_speed)) {
                return { error: 'Velocidad de animación no válida' };
            }
            next.animation_speed = patch.animation_speed;
        }
        if (patch.respect_reduced_motion !== undefined) {
            next.respect_reduced_motion = !!patch.respect_reduced_motion;
        }

        if (updatedByUserId) next.updated_by = updatedByUserId;

        await row.update(next);
        return { data: row.toJSON(), success: 'Tema de la revista actualizado' };
    } catch (err) {
        console.error('-> magazine_theme_controller.update() error =', err);
        return { error: 'Error al actualizar el tema de la revista' };
    }
}

/**
 * Persist an uploaded landing-background image path. Called by the upload route
 * after ThemeUploadMiddleware has placed the file on disk.
 */
async function setLandingBackground(relativePath, updatedByUserId) {
    try {
        const row = await getSingleton();
        const update = { landing_bg_type: 'image', landing_bg_value: relativePath };
        if (updatedByUserId) update.updated_by = updatedByUserId;
        await row.update(update);
        return { data: row.toJSON(), success: 'Fondo de portada actualizado' };
    } catch (err) {
        console.error('-> magazine_theme_controller.setLandingBackground() error =', err);
        return { error: 'Error al actualizar el fondo de portada' };
    }
}

export default { get, update, setLandingBackground };
