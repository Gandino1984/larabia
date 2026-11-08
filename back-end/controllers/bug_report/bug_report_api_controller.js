// back-end/controllers/bug_report/bug_report_api_controller.js
//
// «Reportar un error» (models/bug_report_model.js): anyone signed in sends
// one; the super admins list them, count the new ones (Admin badge + bell),
// mark them seen / fixed and delete them.
import { Op } from "sequelize";
import bug_report_model, { BUG_REPORT_STATUSES } from "../../models/bug_report_model.js";
import user_model from "../../models/user_model.js";
import { getRequestUser, requireSuperAdmin } from "../../utils/authHelper.js";

const DESCRIPTION_MAX = 2000;
const PER_HOUR = 10;
const text = (v, max) => (v === undefined || v === null ? '' : String(v)).trim().slice(0, max);

// What the web sends about where they were, kept short.
function cleanContext(raw) {
    const c = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const out = {
        open: text(c.open, 300),
        language: text(c.language, 10),
        screen: text(c.screen, 30),
        browser: text(c.browser, 400)
    };
    return Object.values(out).some(Boolean) ? out : null;
}

const withUser = { model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'email_user', 'image_user'] };

const shape = (r) => ({
    id_report: r.id_report,
    description_report: r.description_report,
    page_report: r.page_report,
    view_report: r.view_report,
    context_report: typeof r.context_report === 'string' ? JSON.parse(r.context_report || 'null') : r.context_report,
    status_report: r.status_report,
    created_at: r.created_at,
    updated_at: r.updated_at,
    user: r.user ? { id_user: r.user.id_user, name_user: r.user.name_user, email_user: r.user.email_user, image_user: r.user.image_user } : null
});

// POST /bug-reports { description, page, view, context } — anyone signed in.
async function create(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.status(403).json({ error: 'Inicia sesión para reportar un error', code: 'login_required' });
        const description = text(req.body?.description, DESCRIPTION_MAX + 1);
        if (!description) return res.status(400).json({ error: 'Cuéntanos qué ha pasado' });
        if (description.length > DESCRIPTION_MAX) {
            return res.status(400).json({ error: `El mensaje es demasiado largo (máximo ${DESCRIPTION_MAX} caracteres)` });
        }
        const recent = await bug_report_model.count({
            where: { user_id: user.id_user, created_at: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) } }
        });
        if (recent >= PER_HOUR) {
            return res.status(429).json({ error: 'Has enviado muchos avisos en poco tiempo. Espera un poco', code: 'too_many' });
        }
        const report = await bug_report_model.create({
            user_id: user.id_user,
            description_report: description,
            page_report: text(req.body?.page, 500) || null,
            view_report: text(req.body?.view, 60) || null,
            context_report: cleanContext(req.body?.context),
            status_report: 'new'
        });
        res.json({ error: null, success: 'Gracias: el equipo ya sabe lo que ha pasado', data: { id_report: report.id_report } });
    } catch (err) {
        console.error('-> bug report create() - Error =', err);
        res.status(500).json({ error: 'Error al enviar el aviso' });
    }
}

// GET /bug-reports — super admins: all of them, newest first.
async function list(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const rows = await bug_report_model.findAll({ include: [withUser], order: [['created_at', 'DESC']], limit: 500 });
        res.json({ error: null, data: rows.map(shape) });
    } catch (err) {
        console.error('-> bug report list() - Error =', err);
        res.status(500).json({ error: 'Error al cargar los errores reportados' });
    }
}

// GET /bug-reports/count — super admins: how many are new, and the latest
// new ones (for the bell).
async function count(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const [fresh, latest] = await Promise.all([
            bug_report_model.count({ where: { status_report: 'new' } }),
            bug_report_model.findAll({ where: { status_report: 'new' }, include: [withUser], order: [['created_at', 'DESC']], limit: 5 })
        ]);
        res.json({ error: null, data: { new: fresh, latest: latest.map(shape) } });
    } catch (err) {
        console.error('-> bug report count() - Error =', err);
        res.status(500).json({ error: 'Error al cargar los errores reportados' });
    }
}

// PATCH /bug-reports/:id { status: 'new' | 'seen' | 'fixed' } — super admins.
async function setStatus(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const status = req.body?.status;
        if (!BUG_REPORT_STATUSES.includes(status)) return res.status(400).json({ error: 'Estado no válido' });
        const report = await bug_report_model.findByPk(req.params.id, { include: [withUser] });
        if (!report) return res.status(404).json({ error: 'Aviso no encontrado' });
        await report.update({ status_report: status });
        res.json({ error: null, data: shape(report) });
    } catch (err) {
        console.error('-> bug report setStatus() - Error =', err);
        res.status(500).json({ error: 'Error al actualizar el aviso' });
    }
}

// DELETE /bug-reports/:id — super admins.
async function remove(req, res) {
    try {
        if (!(await requireSuperAdmin(req, res))) return;
        const deleted = await bug_report_model.destroy({ where: { id_report: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Aviso no encontrado' });
        res.json({ error: null, message: 'Aviso eliminado', data: { id_report: Number(req.params.id) } });
    } catch (err) {
        console.error('-> bug report remove() - Error =', err);
        res.status(500).json({ error: 'Error al eliminar el aviso' });
    }
}

export default { create, list, count, setStatus, remove };
