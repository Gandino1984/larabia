// back-end/controllers/notification/notification_api_controller.js
//
// The bell's kept notifications (models/user_notification_model.js): each
// person reads, marks read and deletes only their own.
//   GET    /notifications          { items, dismissed }
//   POST   /notifications/sync     { items: [{ key, type, payload, event_at }] }
//                                  → saves the new ones (known ones — read or
//                                  deleted — stay as they are), then as GET
//   POST   /notifications/read     every kept one, read
//   DELETE /notifications/:key     delete one (also a notification that isn't
//                                  kept, e.g. the profile reminder: hidden)
//   POST   /notifications/clear    delete them all { keys: not-kept ones shown }
import { Op } from "sequelize";
import user_notification_model from "../../models/user_notification_model.js";
import { getRequestUser } from "../../utils/authHelper.js";

const LIST_MAX = 200;
const DISMISSED_LIST_MAX = 500;
const SYNC_MAX = 100;
const PAYLOAD_MAX = 4000;
// Deleted ones are forgotten after this long (their source won't bring them back by then).
const FORGET_AFTER_DAYS = 120;

const KEY_RE = /^[\w.:-]{1,191}$/;
const TYPE_RE = /^[\w-]{1,40}$/;

async function owner(req, res) {
    const user = await getRequestUser(req);
    if (!user) res.status(403).json({ error: 'Inicia sesión para ver tus notificaciones', code: 'login_required' });
    return user;
}

const shape = (n) => ({
    key: n.notif_key,
    type: n.type_notification,
    payload: n.payload_notification,
    event_at: n.event_at,
    read: !!n.read_at
});

async function listFor(userId) {
    const [items, dismissed] = await Promise.all([
        user_notification_model.findAll({
            where: { user_id: userId, dismissed_at: null },
            order: [['event_at', 'DESC'], ['id_notification', 'DESC']],
            limit: LIST_MAX
        }),
        user_notification_model.findAll({
            where: { user_id: userId, dismissed_at: { [Op.ne]: null } },
            attributes: ['notif_key'],
            order: [['dismissed_at', 'DESC']],
            limit: DISMISSED_LIST_MAX
        })
    ]);
    return { items: items.map(shape), dismissed: dismissed.map((d) => d.notif_key) };
}

async function list(req, res) {
    try {
        const user = await owner(req, res);
        if (!user) return;
        res.json({ error: null, data: await listFor(user.id_user) });
    } catch (err) {
        console.error('-> notifications list() - Error =', err);
        res.status(500).json({ error: 'Error al cargar las notificaciones' });
    }
}

/** A notification as sent, checked; null if it isn't valid. */
function clean(item) {
    if (!item || typeof item !== 'object') return null;
    const key = String(item.key || '');
    const type = String(item.type || '');
    if (!KEY_RE.test(key) || !TYPE_RE.test(type)) return null;
    const payload = item.payload && typeof item.payload === 'object' ? item.payload : null;
    if (payload && JSON.stringify(payload).length > PAYLOAD_MAX) return null;
    const at = new Date(item.event_at);
    const eventAt = Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 60_000 ? new Date() : at;
    return { notif_key: key, type_notification: type, payload_notification: payload, event_at: eventAt };
}

async function sync(req, res) {
    try {
        const user = await owner(req, res);
        if (!user) return;
        const rows = (Array.isArray(req.body?.items) ? req.body.items : [])
            .slice(0, SYNC_MAX)
            .map(clean)
            .filter(Boolean)
            .map((r) => ({ ...r, user_id: user.id_user }));
        // Known ones (read, deleted) stay as they are.
        if (rows.length) await user_notification_model.bulkCreate(rows, { ignoreDuplicates: true });
        res.json({ error: null, data: await listFor(user.id_user) });
    } catch (err) {
        console.error('-> notifications sync() - Error =', err);
        res.status(500).json({ error: 'Error al guardar las notificaciones' });
    }
}

async function markRead(req, res) {
    try {
        const user = await owner(req, res);
        if (!user) return;
        await user_notification_model.update(
            { read_at: new Date() },
            { where: { user_id: user.id_user, read_at: null, dismissed_at: null } }
        );
        res.json({ error: null, data: await listFor(user.id_user) });
    } catch (err) {
        console.error('-> notifications markRead() - Error =', err);
        res.status(500).json({ error: 'Error al actualizar las notificaciones' });
    }
}

async function dismiss(req, res) {
    try {
        const user = await owner(req, res);
        if (!user) return;
        const key = String(req.params.key || '');
        if (!KEY_RE.test(key)) return res.status(400).json({ error: 'Notificación no válida' });
        const now = new Date();
        const [row, created] = await user_notification_model.findOrCreate({
            where: { user_id: user.id_user, notif_key: key },
            defaults: { user_id: user.id_user, notif_key: key, type_notification: 'dismissed', payload_notification: null, event_at: now, read_at: now, dismissed_at: now }
        });
        if (!created && !row.dismissed_at) await row.update({ dismissed_at: now, read_at: row.read_at || now });
        res.json({ error: null, data: await listFor(user.id_user) });
    } catch (err) {
        console.error('-> notifications dismiss() - Error =', err);
        res.status(500).json({ error: 'Error al borrar la notificación' });
    }
}

async function dismissAll(req, res) {
    try {
        const user = await owner(req, res);
        if (!user) return;
        const now = new Date();
        await user_notification_model.update(
            { dismissed_at: now },
            { where: { user_id: user.id_user, dismissed_at: null } }
        );
        // Not-kept ones the front-end shows (e.g. the profile reminder), by key.
        const keys = (Array.isArray(req.body?.keys) ? req.body.keys : []).map(String).filter((k) => KEY_RE.test(k)).slice(0, SYNC_MAX);
        if (keys.length) {
            await user_notification_model.bulkCreate(
                keys.map((k) => ({ user_id: user.id_user, notif_key: k, type_notification: 'dismissed', payload_notification: null, event_at: now, read_at: now, dismissed_at: now })),
                { ignoreDuplicates: true }
            );
        }
        res.json({ error: null, success: 'Notificaciones borradas', data: await listFor(user.id_user) });
    } catch (err) {
        console.error('-> notifications dismissAll() - Error =', err);
        res.status(500).json({ error: 'Error al borrar las notificaciones' });
    }
}

/** Deleted long ago: forgotten (daily, index.js). */
export async function forgetOldDismissed() {
    const before = new Date(Date.now() - FORGET_AFTER_DAYS * 864e5);
    return user_notification_model.destroy({ where: { dismissed_at: { [Op.lt]: before } } });
}

export default { list, sync, markRead, dismiss, dismissAll };
