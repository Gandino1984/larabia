// back-end/controllers/magazine_workshop/magazine_workshop_api_controller.js
import magazineWorkshopController from "./magazine_workshop_controller.js";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";
import reader_subscription_model, { isLiveSubscription } from "../../models/reader_subscription_model.js";
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import workshop_author_model from "../../models/workshop_author_model.js";

/**
 * Creating workshops: admins and super admins only. Returns the user, or
 * sends a 403.
 */
async function requireWorkshopCreator(req, res) {
    const user = await getRequestUser(req);
    const role = roleSnapshot(user);
    if (!user || !(role.isAdmin || role.isSuperAdmin)) {
        res.status(403).json({ error: 'Solo admins y super-admins pueden crear talleres' });
        return null;
    }
    return user;
}

/**
 * Does this user manage the workshop? Like an article and its authors: super
 * admins (any workshop), and the team (editors, admins) on the workshops they
 * created or teach — its talleristas. `workshop` is a model instance or the
 * plain object getById returns (its `authors` list saves a query).
 */
async function isWorkshopManager(user, workshop) {
    if (!user || !workshop) return false;
    const role = roleSnapshot(user);
    if (role.isSuperAdmin) return true;
    if (!role.canCreateContent) return false;
    if (workshop.author_id === user.id_user) return true;
    if (Array.isArray(workshop.authors)) return workshop.authors.some((a) => a.id_user === user.id_user);
    const teaches = await workshop_author_model.findOne({ where: { workshop_id: workshop.id_workshop, user_id: user.id_user } });
    return !!teaches;
}

/**
 * Editing / deleting a workshop (and its cover) and managing its
 * participants: its managers (see isWorkshopManager). Returns the user, or
 * sends a 403 / 404.
 */
async function requireWorkshopManager(req, res, workshopId) {
    const user = await getRequestUser(req);
    const workshop = await magazine_workshop_model.findByPk(workshopId);
    if (!workshop) {
        res.status(404).json({ error: 'Taller no encontrado' });
        return null;
    }
    if (await isWorkshopManager(user, workshop)) return user;
    res.status(403).json({ error: 'Solo quien creó o imparte el taller (o el super-administrador) puede gestionarlo' });
    return null;
}

/**
 * Who sees what:
 *   - anyone: the workshop LIST (cards);
 *   - signed-in readers: the workshop page;
 *   - paying subscribers: booking a place (the magazine team — editors,
 *     admins, super admins — books without subscribing);
 *   - the workshop's managers: its participants and invitations (and
 *     managing them: invite, remove, block).
 * Booking standing: { user, code } where code is null (can book),
 * 'login_required' or 'subscription_required'.
 */
async function hasActiveSubscription(userId) {
    const sub = await reader_subscription_model.findOne({ where: { user_id: userId } });
    return isLiveSubscription(sub);
}

async function workshopAccess(req) {
    const user = await getRequestUser(req);
    if (!user) return { user: null, code: 'login_required' };
    if (roleSnapshot(user).canCreateContent) return { user, code: null };
    if (await hasActiveSubscription(user.id_user)) return { user, code: null };
    return { user, code: 'subscription_required' };
}

/**
 * Booking gate. Sends a 403 with the `code` the front-end uses — never a 401,
 * which logs the reader out. Returns the user when they're allowed.
 */
async function requireWorkshopAccess(req, res) {
    const { user, code } = await workshopAccess(req);
    if (!code) return user;
    res.status(403).json({
        error: code === 'login_required'
            ? 'Inicia sesión para reservar plaza'
            : 'Las reservas de los talleres son exclusivas para socios/as de la revista',
        code
    });
    return null;
}

// Public: anyone can see the workshops.
async function getAll(req, res) {
    try {
        const { error, data } = await magazineWorkshopController.getAll();
        res.json({ error, data });
    } catch (err) {
        console.error("-> workshop api getAll() - Error =", err);
        res.status(500).json({ error: "Error al obtener los talleres", details: err.message });
    }
}

// Workshop page: signed-in readers (the list is public). Adds
// `reserved_by_me`, `booking_code` (null = can book, 'subscription_required'
// or 'blocked'), `my_invitation` (a pending invitation for the reader) and
// `can_manage`. The participants, invitations and blocked users are only
// sent to the workshop's managers.
async function getById(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) {
            return res.status(403).json({ error: 'Inicia sesión para ver el taller', code: 'login_required' });
        }
        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
        const { error, data } = await magazineWorkshopController.getById(id_workshop);
        if (error) return res.status(404).json({ error });

        const canManage = await isWorkshopManager(user, data);
        const participants = data.participants || [];
        let bookingCode = null;
        if (await magazineWorkshopController.isBlocked(id_workshop, user.id_user)) bookingCode = 'blocked';
        else if (!roleSnapshot(user).canCreateContent && !(await hasActiveSubscription(user.id_user))) {
            bookingCode = 'subscription_required';
        }

        const out = {
            ...data,
            reserved_by_me: participants.some((p) => p.id_user === user.id_user),
            booking_code: bookingCode,
            my_invitation: await magazineWorkshopController.myPendingInvitation(id_workshop, user.id_user),
            can_manage: canManage
        };
        if (canManage) {
            out.invitations = await magazineWorkshopController.loadWorkshopInvitations(id_workshop);
            out.blocked_users = await magazineWorkshopController.loadWorkshopBlocked(id_workshop);
        } else {
            delete out.participants;
        }
        res.json({ error, data: out });
    } catch (err) {
        console.error("-> workshop api getById() - Error =", err);
        res.status(500).json({ error: "Error al obtener el taller", details: err.message });
    }
}

async function create(req, res) {
    try {
        const admin = await requireWorkshopCreator(req, res);
        if (!admin) return; // 403 already sent

        const { title_workshop, description_workshop, location_workshop, date_workshop,
            cover_image_workshop, capacity_workshop, audience_workshop, lat_workshop, lng_workshop, authors, author_name } = req.body;

        const data = {
            title_workshop,
            description_workshop,
            location_workshop,
            date_workshop: date_workshop || null,
            cover_image_workshop: cover_image_workshop || null,
            capacity_workshop,
            audience_workshop,
            lat_workshop,
            lng_workshop,
            author_id: admin.id_user,
            author_name: author_name || admin.name_user,
            authors: Array.isArray(authors) ? authors : undefined
        };

        const { error, data: result, success, details } = await magazineWorkshopController.create(data);
        if (error) return res.status(400).json({ error, details });
        res.json({ error: null, data: result, success });
    } catch (err) {
        console.error("-> workshop api create() - Error =", err);
        res.status(500).json({ error: "Error al crear el taller", details: err.message });
    }
}

async function update(req, res) {
    try {
        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
        const admin = await requireWorkshopManager(req, res, id_workshop);
        if (!admin) return;

        const { title_workshop, description_workshop, location_workshop, date_workshop,
            cover_image_workshop, capacity_workshop, audience_workshop, lat_workshop, lng_workshop, authors, author_name } = req.body;

        const data = {};
        if (title_workshop !== undefined) data.title_workshop = title_workshop;
        if (description_workshop !== undefined) data.description_workshop = description_workshop;
        if (location_workshop !== undefined) data.location_workshop = location_workshop;
        if (date_workshop !== undefined) data.date_workshop = date_workshop || null;
        if (cover_image_workshop !== undefined) data.cover_image_workshop = cover_image_workshop;
        if (capacity_workshop !== undefined) data.capacity_workshop = capacity_workshop;
        if (audience_workshop !== undefined) data.audience_workshop = audience_workshop;
        if (lat_workshop !== undefined) data.lat_workshop = lat_workshop;
        if (lng_workshop !== undefined) data.lng_workshop = lng_workshop;
        if (author_name !== undefined) data.author_name = author_name;
        if (authors !== undefined) data.authors = authors;

        const { error, data: result, success } = await magazineWorkshopController.update(id_workshop, data);
        if (error) return res.status(400).json({ error });
        res.json({ error: null, data: result, success });
    } catch (err) {
        console.error("-> workshop api update() - Error =", err);
        res.status(500).json({ error: "Error al actualizar el taller", details: err.message });
    }
}

async function remove(req, res) {
    try {
        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
        const admin = await requireWorkshopManager(req, res, id_workshop);
        if (!admin) return;
        const { error, data, message } = await magazineWorkshopController.removeById(id_workshop);
        if (error) return res.status(404).json({ error });
        res.json({ error: null, data, message });
    } catch (err) {
        console.error("-> workshop api remove() - Error =", err);
        res.status(500).json({ error: "Error al eliminar el taller", details: err.message });
    }
}

async function uploadCoverImage(req, res) {
    try {
        const workshopId = req.headers['x-workshop-id'];
        if (!workshopId) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
        const admin = await requireWorkshopManager(req, res, workshopId);
        if (!admin) return;
        if (!req.file) return res.status(400).json({ error: 'No se ha subido ningún archivo' });

        const filePath = req.file.path;
        const assetsIndex = filePath.indexOf('assets');
        if (assetsIndex === -1) return res.status(500).json({ error: 'Estructura de ruta inválida' });
        const relativePath = filePath.substring(assetsIndex).replace(/\\/g, '/');

        const { error, data, message } = await magazineWorkshopController.uploadCoverImage(workshopId, relativePath);
        if (error) return res.status(400).json({ error });
        res.json({ error: null, data, message });
    } catch (err) {
        console.error("-> workshop api uploadCoverImage() - Error =", err);
        res.status(500).json({ error: "Error al subir la imagen", details: err.message });
    }
}

async function reserve(req, res) {
    try {
        const user = await requireWorkshopAccess(req, res);
        if (!user) return;
        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
        const result = await magazineWorkshopController.reserve(id_workshop, user.id_user);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error("-> workshop api reserve() - Error =", err);
        res.status(500).json({ error: "Error al reservar", details: err.message });
    }
}

async function cancelReservation(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.status(401).json({ error: 'Autenticación requerida' });
        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
        const result = await magazineWorkshopController.cancelReservation(id_workshop, user.id_user);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error("-> workshop api cancelReservation() - Error =", err);
        res.status(500).json({ error: "Error al cancelar la reserva", details: err.message });
    }
}

// ── Participant management: the workshop's managers ──

// The target user id, from the URL or the body.
const targetUserId = (req) => {
    const n = Number(req.params.id_user ?? req.body?.user_id);
    return Number.isInteger(n) && n > 0 ? n : null;
};

// Run a management operation and answer with the updated lists.
async function manage(req, res, run) {
    try {
        const { id_workshop } = req.params;
        const manager = await requireWorkshopManager(req, res, id_workshop);
        if (!manager) return;
        const userId = targetUserId(req);
        if (!userId) return res.status(400).json({ error: 'Falta el usuario' });
        const result = await run(id_workshop, userId, manager);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error("-> workshop api manage() - Error =", err);
        res.status(500).json({ error: "Error al gestionar participantes", details: err.message });
    }
}

// Invite someone (subscribers and the magazine team). Managers book their
// own place with "Reservar plaza".
const inviteParticipant = (req, res) => manage(req, res, (id, userId, manager) => {
    if (userId === manager.id_user) return { error: 'Para apuntarte tú, usa «Reservar plaza»' };
    return magazineWorkshopController.inviteUser(id, userId, manager.id_user);
});

const withdrawInvitation = (req, res) => manage(req, res,
    (id, userId) => magazineWorkshopController.withdrawInvitation(id, userId));

const removeParticipant = (req, res) => manage(req, res,
    (id, userId) => magazineWorkshopController.removeParticipant(id, userId));

const blockUser = (req, res) => manage(req, res, async (id, userId, manager) => {
    if (userId === manager.id_user) return { error: 'No puedes bloquearte a ti mismo/a' };
    return magazineWorkshopController.blockUser(id, userId, manager.id_user);
});

const unblockUser = (req, res) => manage(req, res,
    (id, userId) => magazineWorkshopController.unblockUser(id, userId));

// People to invite / block, by name (?q=, 2+ characters).
async function searchUsers(req, res) {
    try {
        const { id_workshop } = req.params;
        const manager = await requireWorkshopManager(req, res, id_workshop);
        if (!manager) return;
        const result = await magazineWorkshopController.searchUsers(id_workshop, req.query.q);
        if (result.error) return res.status(400).json(result);
        res.json({ error: null, data: result.data });
    } catch (err) {
        console.error("-> workshop api searchUsers() - Error =", err);
        res.status(500).json({ error: "Error al buscar usuarios", details: err.message });
    }
}

// ── Invitations: the invited reader and the inviter ──

// The signed-in reader's workshop notifications (invitations to answer and
// answers to the invitations they sent). Signed out: empty (never a 401,
// which logs the reader out).
async function invitationFeed(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.json({ error: null, data: { invitations: [], responses: [] } });
        const result = await magazineWorkshopController.invitationFeed(user.id_user);
        if (result.error) return res.status(500).json(result);
        res.json({ error: null, data: result.data });
    } catch (err) {
        console.error("-> workshop api invitationFeed() - Error =", err);
        res.status(500).json({ error: "Error al cargar las invitaciones", details: err.message });
    }
}

// Accept ({ response: 'accept' } — books the held place; needs the right to
// book) or decline ({ response: 'decline' }).
async function respondInvitation(req, res) {
    try {
        const response = req.body?.response;
        if (!['accept', 'decline'].includes(response)) return res.status(400).json({ error: 'Respuesta no válida' });
        const user = response === 'accept'
            ? await requireWorkshopAccess(req, res)
            : await getRequestUser(req);
        if (!user) {
            if (!res.headersSent) res.status(403).json({ error: 'Inicia sesión para responder', code: 'login_required' });
            return;
        }
        const id = Number(req.params.id_invitation);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invitación no válida' });
        const result = await magazineWorkshopController.respondInvitation(id, user.id_user, response);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error("-> workshop api respondInvitation() - Error =", err);
        res.status(500).json({ error: "Error al responder a la invitación", details: err.message });
    }
}

// The inviter has seen these answers ({ ids: [...] }).
async function markResponsesSeen(req, res) {
    try {
        const user = await getRequestUser(req);
        if (!user) return res.status(403).json({ error: 'Inicia sesión', code: 'login_required' });
        const result = await magazineWorkshopController.markResponsesSeen(user.id_user, req.body?.ids);
        res.json({ error: null, data: result.data });
    } catch (err) {
        console.error("-> workshop api markResponsesSeen() - Error =", err);
        res.status(500).json({ error: "Error al actualizar las notificaciones", details: err.message });
    }
}

export default {
    getAll,
    getById,
    create,
    update,
    remove,
    uploadCoverImage,
    reserve,
    cancelReservation,
    inviteParticipant,
    withdrawInvitation,
    invitationFeed,
    respondInvitation,
    markResponsesSeen,
    removeParticipant,
    blockUser,
    unblockUser,
    searchUsers
};
