// back-end/controllers/chat/chat_api_controller.js
//
// The magazine's chat (models/chat_models.js, migration 029).
// - Socios/as (paying members, complimentary ones too) — and super admins —
//   ask an author (a published author profile) or a visual artist to chat,
//   from Autoras/es or the Galería (POST /chat/request).
// - The author accepts or declines (POST /chat/conversations/:id/respond);
//   once accepted both write, and the author can end it at any time
//   (POST /chat/conversations/:id/end). To write again after that (or after
//   a decline), the member asks again: same conversation, history kept.
// - GET /chat/mine lists the person's conversations with what the bell needs:
//   requests to answer (host), changes not seen yet (requester), unread.
// Refusals are 403 with a `code` (never 401, which logs the reader out).
import { Op } from "sequelize";
import user_model from "../../models/user_model.js";
import author_profile_model from "../../models/author_profile_model.js";
import reader_subscription_model, { isLiveSubscription } from "../../models/reader_subscription_model.js";
import { gallery_exhibition_model } from "../../models/gallery_models.js";
import { chat_conversation_model, chat_message_model, CHAT_ORIGINS } from "../../models/chat_models.js";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";

const MESSAGE_MAX = 2000;
// Spam brakes, per person and hour.
const MESSAGES_PER_HOUR = 60;
const REQUESTS_PER_HOUR = 20;

const PERSON = ['id_user', 'name_user', 'image_user'];
const personOf = (u) => (u ? { id_user: u.id_user, name_user: u.name_user, image_user: u.image_user || null } : null);
const cleanText = (value) => String(value ?? '').replace(/\r\n/g, '\n').trim();
// Dates come back from MySQL as UTC strings without a zone (sequelize
// dateStrings); compared as they are, Node reads them as local time.
const utcDate = (v) => (v instanceof Date ? v : v ? new Date(String(v).replace(' ', 'T') + 'Z') : null);
const sameId = (a, b) => a != null && b != null && Number(a) === Number(b);

const messageOf = (m) => ({ id_message: m.id_message, sender_id: m.sender_id, body: m.body, created_at: m.created_at });

// ---------- who ----------

/** Socios/as (a live subscription, complimentary included) and super admins ask to chat. */
async function canRequest(user) {
    if (roleSnapshot(user).isSuperAdmin) return true;
    return isLiveSubscription(await reader_subscription_model.findOne({ where: { user_id: user.id_user } }));
}

/** Authors (a published author profile) and visual artists are asked. */
async function canHost(user) {
    if (roleSnapshot(user).isArtist) return true;
    return !!(await author_profile_model.findOne({
        where: { user_id: user.id_user, status_profile: 'published' },
        attributes: ['id_author_profile']
    }));
}

async function signedIn(req, res) {
    const user = await getRequestUser(req);
    if (!user) res.status(403).json({ error: 'Inicia sesión para continuar', code: 'login_required' });
    return user;
}

// ---------- shapes ----------

const roleIn = (c, userId) => (sameId(c.host_id, userId) ? 'host' : 'requester');

// What one side sees of a conversation (unread, the latest message, and —
// for the requester — whether the author changed something they haven't seen).
async function summaryOf(c, userId, exhibitions = null) {
    const role = roleIn(c, userId);
    const readAt = role === 'host' ? c.host_read_at : c.requester_read_at;
    const [unread, last] = await Promise.all([
        chat_message_model.count({
            where: {
                conversation_id: c.id_conversation,
                sender_id: { [Op.ne]: userId },
                ...(readAt ? { created_at: { [Op.gt]: utcDate(readAt) } } : {})
            }
        }),
        chat_message_model.findOne({ where: { conversation_id: c.id_conversation }, order: [['created_at', 'DESC'], ['id_message', 'DESC']] })
    ]);
    const changed = utcDate(c.changed_at);
    const seen = utcDate(c.requester_seen_at);
    const ex = exhibitions ? exhibitions.get(c.host_id) : null;
    return {
        id_conversation: c.id_conversation,
        role,
        status: c.status,
        origin: c.origin,
        other: personOf(role === 'host' ? c.requester : c.host),
        exhibition: ex ? { id_exhibition: ex.id_exhibition } : null,
        requested_at: c.requested_at,
        changed_at: c.changed_at,
        // The requester's bell: the author accepted, declined or ended it.
        unseen_change: role === 'requester' && c.status !== 'requested' && !!changed && (!seen || changed > seen),
        last_message: last ? messageOf(last) : null,
        last_message_at: c.last_message_at,
        unread
    };
}

const WITH_PEOPLE = [
    { model: user_model, as: 'requester', attributes: PERSON },
    { model: user_model, as: 'host', attributes: PERSON }
];

async function exhibitionsOf(hostIds) {
    if (!hostIds.length) return new Map();
    const rows = await gallery_exhibition_model.findAll({ where: { user_id: [...new Set(hostIds)] }, attributes: ['id_exhibition', 'user_id'] });
    return new Map(rows.map((e) => [e.user_id, e]));
}

async function conversationsOf(userId) {
    const rows = await chat_conversation_model.findAll({
        where: { [Op.or]: [{ requester_id: userId }, { host_id: userId }] },
        include: WITH_PEOPLE,
        order: [['changed_at', 'DESC']]
    });
    const exhibitions = await exhibitionsOf(rows.filter((c) => c.origin === 'gallery').map((c) => c.host_id));
    const list = await Promise.all(rows.map((c) => summaryOf(c, userId, exhibitions)));
    // Latest activity first: a message, or a change of status.
    const at = (s) => Math.max(utcDate(s.last_message_at)?.getTime() || 0, utcDate(s.changed_at)?.getTime() || 0);
    return list.sort((a, b) => at(b) - at(a));
}

// The conversation :id, if the caller is in it.
async function ownConversation(req, res) {
    const user = await signedIn(req, res);
    if (!user) return {};
    const c = await chat_conversation_model.findByPk(req.params.id, { include: WITH_PEOPLE });
    if (!c || (!sameId(c.requester_id, user.id_user) && !sameId(c.host_id, user.id_user))) {
        res.status(404).json({ error: 'Esta conversación no existe' });
        return {};
    }
    return { user, c };
}

async function respondWith(res, c, userId, success = null) {
    const fresh = await chat_conversation_model.findByPk(c.id_conversation, { include: WITH_PEOPLE });
    const exhibitions = fresh.origin === 'gallery' ? await exhibitionsOf([fresh.host_id]) : null;
    res.json({ error: null, data: await summaryOf(fresh, userId, exhibitions), ...(success ? { success } : {}) });
}

// ---------- the list (and the bell) ----------

/** GET /chat/mine — the signed-in person's conversations. Never 401: signed out, []. */
async function mine(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.json({ error: null, data: [] });
        res.json({ error: null, data: await conversationsOf(user.id_user) });
    } catch (err) {
        console.error('chat - mine:', err);
        res.status(500).json({ error: 'Error al cargar tus charlas' });
    }
}

/** POST /chat/seen { ids? } — the requester has seen the author's answers (all, or those). */
async function seen(req, res) {
    try {
        const user = await signedIn(req, res);
        if (!user) return;
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : null;
        await chat_conversation_model.update({ requester_seen_at: new Date() }, {
            where: { requester_id: user.id_user, ...(ids ? { id_conversation: ids } : {}) }
        });
        res.json({ error: null, data: { ok: true } });
    } catch (err) {
        console.error('chat - seen:', err);
        res.status(500).json({ error: 'Error al guardar' });
    }
}

// ---------- asking ----------

/**
 * POST /chat/request { host_id, origin } — a member asks an author / artist to
 * chat. Already active: nothing to ask (it's returned). Already asked: 409.
 */
async function request(req, res) {
    try {
        const user = await signedIn(req, res);
        if (!user) return;
        if (!(await canRequest(user))) {
            return res.status(403).json({ error: 'Charlar con las autoras/es y artistas es solo para socios/as de la revista', code: 'subscription_required' });
        }
        const host = await user_model.findByPk(req.body?.host_id);
        if (!host || !(await canHost(host))) return res.status(404).json({ error: 'Esta persona no está disponible para charlar', code: 'not_host' });
        if (sameId(host.id_user, user.id_user)) return res.status(400).json({ error: 'No puedes charlar contigo misma o contigo mismo', code: 'self' });
        const origin = CHAT_ORIGINS.includes(req.body?.origin) ? req.body.origin : 'authors';

        const existing = await chat_conversation_model.findOne({ where: { requester_id: user.id_user, host_id: host.id_user } });
        if (existing?.status === 'active') return respondWith(res, existing, user.id_user);
        if (existing?.status === 'requested') {
            return res.status(409).json({ error: `Ya le has pedido charlar a ${host.name_user}: te avisaremos cuando responda`, code: 'already_requested' });
        }
        const recent = await chat_conversation_model.count({
            where: { requester_id: user.id_user, requested_at: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) } }
        });
        if (recent >= REQUESTS_PER_HOUR) {
            return res.status(429).json({ error: 'Has pedido muchas charlas en poco tiempo. Espera un poco', code: 'too_many' });
        }
        const now = new Date();
        // Asking again (after a decline or an end) re-opens the same one.
        const fields = { status: 'requested', origin, requested_at: now, changed_at: now, requester_seen_at: now };
        const c = existing
            ? await existing.update(fields)
            : await chat_conversation_model.create({ requester_id: user.id_user, host_id: host.id_user, ...fields });
        await respondWith(res, c, user.id_user, `Solicitud enviada a ${host.name_user}: te avisaremos cuando responda`);
    } catch (err) {
        console.error('chat - request:', err);
        res.status(500).json({ error: 'Error al pedir la charla' });
    }
}

/** POST /chat/conversations/:id/respond { response: accept|decline } — the author. */
async function respond(req, res) {
    try {
        const { user, c } = await ownConversation(req, res);
        if (!c) return;
        if (!sameId(c.host_id, user.id_user)) return res.status(403).json({ error: 'Solo la autora o el autor responde a la solicitud', code: 'not_host' });
        const response = req.body?.response;
        if (response !== 'accept' && response !== 'decline') {
            return res.status(400).json({ error: "La respuesta debe ser 'accept' o 'decline'" });
        }
        if (c.status !== 'requested') return res.status(409).json({ error: 'Esta solicitud ya no está pendiente', code: 'not_requested' });
        await c.update({ status: response === 'accept' ? 'active' : 'declined', changed_at: new Date() });
        const name = c.requester?.name_user || '';
        await respondWith(res, c, user.id_user, response === 'accept'
            ? `Has aceptado charlar con ${name}`
            : `Has rechazado la solicitud de ${name}`);
    } catch (err) {
        console.error('chat - respond:', err);
        res.status(500).json({ error: 'Error al responder la solicitud' });
    }
}

/** POST /chat/conversations/:id/end — the author ends it (to write again, the member asks again). */
async function end(req, res) {
    try {
        const { user, c } = await ownConversation(req, res);
        if (!c) return;
        if (!sameId(c.host_id, user.id_user)) return res.status(403).json({ error: 'Solo la autora o el autor puede terminar la conversación', code: 'not_host' });
        if (c.status !== 'active') return res.status(409).json({ error: 'Esta conversación no está abierta', code: 'not_active' });
        await c.update({ status: 'ended', changed_at: new Date() });
        await respondWith(res, c, user.id_user, 'Conversación terminada');
    } catch (err) {
        console.error('chat - end:', err);
        res.status(500).json({ error: 'Error al terminar la conversación' });
    }
}

// ---------- messages ----------

/** GET /chat/conversations/:id — it and its messages (participants); marks it read and seen. */
async function conversation(req, res) {
    try {
        const { user, c } = await ownConversation(req, res);
        if (!c) return;
        const messages = await chat_message_model.findAll({
            where: { conversation_id: c.id_conversation },
            order: [['created_at', 'ASC'], ['id_message', 'ASC']],
            limit: 500
        });
        const now = new Date();
        await c.update(roleIn(c, user.id_user) === 'host'
            ? { host_read_at: now }
            : { requester_read_at: now, requester_seen_at: now });
        const exhibitions = c.origin === 'gallery' ? await exhibitionsOf([c.host_id]) : null;
        res.json({ error: null, data: { ...(await summaryOf(c, user.id_user, exhibitions)), messages: messages.map(messageOf) } });
    } catch (err) {
        console.error('chat - conversation:', err);
        res.status(500).json({ error: 'Error al cargar la conversación' });
    }
}

/** POST /chat/conversations/:id/messages { body } — either side, while it's active. */
async function write(req, res) {
    try {
        const { user, c } = await ownConversation(req, res);
        if (!c) return;
        if (c.status !== 'active') {
            return res.status(409).json({ error: 'La conversación no está abierta: para escribir, vuelve a pedir charlar', code: 'not_active' });
        }
        const body = cleanText(req.body?.body);
        if (!body) return res.status(400).json({ error: 'Escribe un mensaje', code: 'empty' });
        if (body.length > MESSAGE_MAX) {
            return res.status(400).json({ error: `El mensaje es demasiado largo (máximo ${MESSAGE_MAX} caracteres)`, code: 'too_long' });
        }
        const lastHour = await chat_message_model.count({
            where: { sender_id: user.id_user, created_at: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) } }
        });
        if (lastHour >= MESSAGES_PER_HOUR) {
            return res.status(429).json({ error: 'Has enviado muchos mensajes en poco tiempo. Espera un poco', code: 'too_many' });
        }
        const message = await chat_message_model.create({ conversation_id: c.id_conversation, sender_id: user.id_user, body });
        const now = message.created_at || new Date();
        await c.update({ last_message_at: now, [roleIn(c, user.id_user) === 'host' ? 'host_read_at' : 'requester_read_at']: now });
        res.json({ error: null, data: messageOf(message), success: 'Mensaje enviado' });
    } catch (err) {
        console.error('chat - write:', err);
        res.status(500).json({ error: 'Error al enviar el mensaje' });
    }
}

export default { mine, seen, request, respond, end, conversation, write };
