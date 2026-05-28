import magazine_nav_model from "../../models/magazine_nav_model.js";

/**
 * Configurable top-bar navigation.
 *
 * nav_config is an ordered array of items. An item is either:
 *   - a "link":  { id, kind:'link', label:{es,en}, visible, min_role, action:{type,value} }
 *   - a "group": { id, kind:'group', label:{es,en}, visible, min_role, children:[link...] }
 *
 * Everything is whitelist-validated server-side — never trust the client. An
 * invalid item is dropped rather than failing the whole save, so a malformed
 * client can't brick the bar.
 */

const ACTION_TYPES = new Set(['section', 'modal', 'url', 'article', 'project', 'author', 'category']);
const SECTIONS = new Set(['home', 'articles', 'authors', 'openmic', 'humor', 'projects']);
const MODALS = new Set(['contact', 'newsletter']);
const ROLES = new Set(['all', 'editor', 'super_admin']);

const MAX_ITEMS = 30;
const MAX_CHILDREN = 20;
const MAX_LABEL = 40;

function sanitizeLabel(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const es = typeof raw.es === 'string' ? raw.es.trim().slice(0, MAX_LABEL) : '';
    const en = typeof raw.en === 'string' ? raw.en.trim().slice(0, MAX_LABEL) : '';
    if (!es && !en) return null; // need at least one language
    return { es: es || en, en: en || es };
}

function sanitizeAction(a) {
    if (!a || typeof a !== 'object' || !ACTION_TYPES.has(a.type)) return null;
    let v = a.value;
    switch (a.type) {
        case 'section':
            if (!SECTIONS.has(v)) return null;
            break;
        case 'modal':
            if (!MODALS.has(v)) return null;
            break;
        case 'url':
            // Only absolute http(s) or site-relative paths — no javascript: etc.
            if (typeof v !== 'string' || v.length > 500 || !/^(https?:\/\/|\/)/.test(v)) return null;
            v = v.trim();
            break;
        case 'article':
        case 'project':
        case 'author':
            v = String(v);
            if (!/^\d{1,12}$/.test(v)) return null; // numeric id
            break;
        case 'category':
            if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(v)) return null;
            break;
        default:
            return null;
    }
    return { type: a.type, value: v };
}

function sanitizeLink(it) {
    if (!it || typeof it !== 'object') return null;
    const id = typeof it.id === 'string' && it.id.length > 0 && it.id.length <= 40 ? it.id : null;
    if (!id) return null;
    const label = sanitizeLabel(it.label);
    if (!label) return null;
    const action = sanitizeAction(it.action);
    if (!action) return null;
    return {
        id,
        kind: 'link',
        label,
        visible: it.visible !== false,
        min_role: ROLES.has(it.min_role) ? it.min_role : 'all',
        action
    };
}

function sanitizeItem(it) {
    if (!it || typeof it !== 'object') return null;
    const id = typeof it.id === 'string' && it.id.length > 0 && it.id.length <= 40 ? it.id : null;
    if (!id) return null;
    const label = sanitizeLabel(it.label);
    if (!label) return null;
    const base = {
        id,
        label,
        visible: it.visible !== false,
        min_role: ROLES.has(it.min_role) ? it.min_role : 'all'
    };
    // Special fixed item: the dynamic "all projects" dropdown. No action/children.
    if (it.kind === 'projects') {
        return { ...base, kind: 'projects' };
    }
    if (Array.isArray(it.children)) {
        const children = it.children.map(sanitizeLink).filter(Boolean).slice(0, MAX_CHILDREN);
        return { ...base, kind: 'group', children };
    }
    const action = sanitizeAction(it.action);
    if (!action) return null;
    return { ...base, kind: 'link', action };
}

function sanitizeNavConfig(raw) {
    if (raw === null) return null; // explicit reset to built-in default
    if (!Array.isArray(raw)) return undefined; // invalid → signal error
    return raw.map(sanitizeItem).filter(Boolean).slice(0, MAX_ITEMS);
}

async function getSingleton() {
    const [row] = await magazine_nav_model.findOrCreate({
        where: { id: 1 },
        defaults: { id: 1 }
    });
    return row;
}

async function get() {
    try {
        const row = await getSingleton();
        return { data: row.toJSON() };
    } catch (err) {
        console.error('-> magazine_nav_controller.get() error =', err);
        return { error: 'Error al cargar la navegación' };
    }
}

async function update(navConfig, updatedByUserId) {
    try {
        const clean = sanitizeNavConfig(navConfig);
        if (clean === undefined) return { error: 'Formato de navegación no válido' };
        const row = await getSingleton();
        await row.update({ nav_config: clean, updated_by: updatedByUserId || null });
        return { data: row.toJSON(), success: 'Navegación actualizada' };
    } catch (err) {
        console.error('-> magazine_nav_controller.update() error =', err);
        return { error: 'Error al actualizar la navegación' };
    }
}

export default { get, update };
