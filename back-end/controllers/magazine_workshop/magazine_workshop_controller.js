// back-end/controllers/magazine_workshop/magazine_workshop_controller.js
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import workshop_author_model from "../../models/workshop_author_model.js";
import workshop_reservation_model from "../../models/workshop_reservation_model.js";
import workshop_block_model from "../../models/workshop_block_model.js";
import workshop_invitation_model from "../../models/workshop_invitation_model.js";
import workshop_spot_request_model from "../../models/workshop_spot_request_model.js";
import sequelize from "../../config/sequelize.js";
import reader_subscription_model, { liveSubscriptionWhere } from "../../models/reader_subscription_model.js";
import user_model from "../../models/user_model.js";
import { Op } from "sequelize";
import { deleteFile } from "../../utils/file_cleanup.js";

// Who a workshop is for.
export const AUDIENCES = ['general', 'infantil'];

// A coordinate within range, or null (empty / invalid clears it).
const coord = (value, max) => {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) && Math.abs(n) <= max ? Number(n.toFixed(6)) : null;
};

async function loadWorkshopAuthors(workshopId) {
    const rows = await workshop_author_model.findAll({
        where: { workshop_id: workshopId },
        include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'image_user'] }],
        order: [['author_order', 'ASC']]
    });
    return rows.filter(r => r.user).map(r => ({
        id_user: r.user.id_user,
        name_user: r.user.name_user,
        image_user: r.user.image_user,
        author_order: r.author_order
    }));
}

async function loadWorkshopParticipants(workshopId) {
    const rows = await workshop_reservation_model.findAll({
        where: { workshop_id: workshopId },
        include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'image_user'] }],
        order: [['created_at', 'ASC'], ['id_reservation', 'ASC']]
    });
    return rows.filter(r => r.user).map(r => ({
        id_user: r.user.id_user,
        name_user: r.user.name_user,
        image_user: r.user.image_user
    }));
}

// Users blocked from the workshop (they can't book it). Managers only.
async function loadWorkshopBlocked(workshopId) {
    const rows = await workshop_block_model.findAll({
        where: { workshop_id: workshopId },
        include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'image_user'] }],
        order: [['created_at', 'ASC'], ['id_block', 'ASC']]
    });
    return rows.filter(r => r.user).map(r => ({
        id_user: r.user.id_user,
        name_user: r.user.name_user,
        image_user: r.user.image_user
    }));
}

async function isBlocked(workshopId, userId) {
    if (!userId) return false;
    return !!(await workshop_block_model.findOne({ where: { workshop_id: workshopId, user_id: userId } }));
}

// Pending invitations hold a place until the invited reader answers.
async function countPendingInvitations(workshopId, exceptUserId = null) {
    const where = { workshop_id: workshopId, status: 'pending' };
    if (exceptUserId) where.invitee_user_id = { [Op.ne]: exceptUserId };
    return workshop_invitation_model.count({ where });
}

// Places taken (bookings + places held by pending invitations) / left, as
// the workshop page shows them.
function spotsSummary(workshop, count, pending = 0) {
    const capacity = workshop?.capacity_workshop;
    const taken = count + pending;
    return {
        id_workshop: Number(workshop.id_workshop),
        reservation_count: count,
        pending_invitations: pending,
        spots_left: capacity != null ? Math.max(0, capacity - taken) : null,
        is_full: capacity != null ? taken >= capacity : false
    };
}

// Who of these users can book this workshop: anyone if it's free; otherwise
// the magazine team (editors, admins, super admins) and socios/as (paying or
// complimentary). `users` carry id_user and the role flags.
async function bookableUserIds(users, { free = false } = {}) {
    if (free) return new Set(users.map(u => u.id_user));
    const truthy = (v) => v === true || v === 1;
    const ids = new Set(users
        .filter(u => truthy(u.is_editor) || truthy(u.is_admin) || truthy(u.is_super_admin))
        .map(u => u.id_user));
    const rest = users.map(u => u.id_user).filter(id => !ids.has(id));
    if (rest.length > 0) {
        const subs = await reader_subscription_model.findAll({
            where: { user_id: rest, ...liveSubscriptionWhere() },
            attributes: ['user_id']
        });
        subs.forEach(sub => ids.add(sub.user_id));
    }
    return ids;
}

// Invitations a workshop's managers see: pending and declined (accepted ones
// are among the participants).
async function loadWorkshopInvitations(workshopId) {
    const rows = await workshop_invitation_model.findAll({
        where: { workshop_id: workshopId, status: ['pending', 'declined'] },
        include: [
            { model: user_model, as: 'invitee', attributes: ['id_user', 'name_user', 'image_user'] },
            { model: user_model, as: 'inviter', attributes: ['id_user', 'name_user'] }
        ],
        order: [['updated_at', 'ASC'], ['id_invitation', 'ASC']]
    });
    return rows.filter(r => r.invitee).map(r => ({
        id_invitation: r.id_invitation,
        status: r.status,
        responded_at: r.responded_at,
        id_user: r.invitee.id_user,
        name_user: r.invitee.name_user,
        image_user: r.invitee.image_user,
        inviter_name: r.inviter?.name_user || null
    }));
}

// The reader's own pending invitation to this workshop, or null.
async function myPendingInvitation(workshopId, userId) {
    if (!userId) return null;
    const inv = await workshop_invitation_model.findOne({
        where: { workshop_id: workshopId, invitee_user_id: userId, status: 'pending' },
        include: [{ model: user_model, as: 'inviter', attributes: ['id_user', 'name_user'] }]
    });
    return inv ? {
        id_invitation: inv.id_invitation,
        inviter: inv.inviter ? { id_user: inv.inviter.id_user, name_user: inv.inviter.name_user } : null
    } : null;
}

async function syncAuthors(workshopId, authors) {
    // authors: array of numeric user ids, or objects with user_id/id_user.
    await workshop_author_model.destroy({ where: { workshop_id: workshopId } });
    const ids = (authors || [])
        .map((a, i) => ({ user_id: typeof a === 'object' ? (a.user_id ?? a.id_user) : a, author_order: i }))
        .filter(a => a.user_id);
    if (ids.length > 0) {
        await workshop_author_model.bulkCreate(
            ids.map(a => ({ workshop_id: workshopId, user_id: a.user_id, author_order: a.author_order })),
            { ignoreDuplicates: true }
        );
    }
}

function validate(data) {
    const errors = [];
    if (!data.title_workshop || !data.title_workshop.trim()) errors.push("El título es obligatorio");
    if (data.title_workshop && data.title_workshop.length > 255) errors.push("El título no puede exceder 255 caracteres");
    return { isValid: errors.length === 0, errors };
}

async function decorate(workshop) {
    const authors = await loadWorkshopAuthors(workshop.id_workshop);
    const reservation_count = await workshop_reservation_model.count({ where: { workshop_id: workshop.id_workshop } });
    const pending = await countPendingInvitations(workshop.id_workshop);
    return {
        ...workshop.toJSON(),
        authors,
        ...spotsSummary(workshop, reservation_count, pending)
    };
}

async function getAll() {
    try {
        const workshops = await magazine_workshop_model.findAll({
            where: { active_workshop: true },
            order: [['date_workshop', 'ASC']]
        });
        const data = [];
        for (const w of workshops) data.push(await decorate(w));
        return { data };
    } catch (err) {
        console.error("-> workshop getAll() - Error =", err);
        return { error: "Error al obtener los talleres" };
    }
}

async function getById(id_workshop) {
    try {
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop || !workshop.active_workshop) return { error: "Taller no encontrado" };
        const decorated = await decorate(workshop);
        decorated.participants = await loadWorkshopParticipants(id_workshop);
        return { data: decorated };
    } catch (err) {
        console.error("-> workshop getById() - Error =", err);
        return { error: "Error al obtener el taller" };
    }
}

async function create(data) {
    try {
        const v = validate(data);
        if (!v.isValid) return { error: "Validación fallida", details: v.errors };

        const workshop = await magazine_workshop_model.create({
            title_workshop: data.title_workshop,
            description_workshop: data.description_workshop || null,
            location_workshop: data.location_workshop || null,
            date_workshop: data.date_workshop || null,
            cover_image_workshop: data.cover_image_workshop || null,
            capacity_workshop: (data.capacity_workshop === '' || data.capacity_workshop === undefined) ? null : data.capacity_workshop,
            author_id: data.author_id || null,
            author_name: data.author_name || null,
            audience_workshop: AUDIENCES.includes(data.audience_workshop) ? data.audience_workshop : 'general',
            free_workshop: data.free_workshop === true,
            lat_workshop: coord(data.lat_workshop, 90),
            lng_workshop: coord(data.lng_workshop, 180),
            active_workshop: true
        });

        if (Array.isArray(data.authors)) await syncAuthors(workshop.id_workshop, data.authors);

        return { success: "Taller creado", data: await decorate(workshop) };
    } catch (err) {
        console.error("-> workshop create() - Error =", err);
        return { error: "Error al crear el taller" };
    }
}

async function update(id_workshop, data) {
    try {
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop) return { error: "Taller no encontrado" };
        if (data.title_workshop && data.title_workshop.length > 255) return { error: "El título no puede exceder 255 caracteres" };

        const fields = {};
        for (const f of ['title_workshop', 'description_workshop', 'location_workshop', 'date_workshop', 'cover_image_workshop', 'author_id', 'author_name']) {
            if (data[f] !== undefined) fields[f] = data[f];
        }
        if (data.lat_workshop !== undefined) fields.lat_workshop = coord(data.lat_workshop, 90);
        if (data.lng_workshop !== undefined) fields.lng_workshop = coord(data.lng_workshop, 180);
        if (data.audience_workshop !== undefined) {
            fields.audience_workshop = AUDIENCES.includes(data.audience_workshop) ? data.audience_workshop : 'general';
        }
        if (data.free_workshop !== undefined) fields.free_workshop = data.free_workshop === true;
        if (data.capacity_workshop !== undefined) {
            fields.capacity_workshop = (data.capacity_workshop === '' || data.capacity_workshop === null) ? null : data.capacity_workshop;
        }
        await workshop.update(fields);

        if (Array.isArray(data.authors)) await syncAuthors(id_workshop, data.authors);

        return { success: "Taller actualizado", data: await decorate(workshop) };
    } catch (err) {
        console.error("-> workshop update() - Error =", err);
        return { error: "Error al actualizar el taller" };
    }
}

async function removeById(id_workshop) {
    try {
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop) return { error: "Taller no encontrado" };
        if (workshop.cover_image_workshop) deleteFile(workshop.cover_image_workshop);
        await workshop.destroy(); // cascade removes authors + reservations
        return { data: id_workshop, message: "Taller eliminado" };
    } catch (err) {
        console.error("-> workshop removeById() - Error =", err);
        return { error: "Error al eliminar el taller" };
    }
}

async function uploadCoverImage(id_workshop, imagePath) {
    try {
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop) return { error: "Taller no encontrado" };
        if (workshop.cover_image_workshop && workshop.cover_image_workshop !== imagePath) deleteFile(workshop.cover_image_workshop);
        await workshop.update({ cover_image_workshop: imagePath });
        return { data: { id_workshop, cover_image_workshop: imagePath }, message: "Imagen actualizada" };
    } catch (err) {
        console.error("-> workshop uploadCoverImage() - Error =", err);
        return { error: "Error al actualizar la imagen" };
    }
}

/**
 * Any registered user reserves a spot. Fails if full or already reserved.
 */
async function reserve(id_workshop, userId) {
    try {
        if (!userId) return { error: "Autenticación requerida" };
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop || !workshop.active_workshop) return { error: "Taller no encontrado" };

        if (await isBlocked(id_workshop, userId)) {
            return { error: "No puedes reservar plaza en este taller", code: 'blocked' };
        }

        const existing = await workshop_reservation_model.findOne({ where: { workshop_id: id_workshop, user_id: userId } });
        if (existing) return { error: "Ya tienes una reserva en este taller" };

        // Places held for other people's invitations count as taken; the
        // reader's own invitation (if any) holds this place for them.
        const count = await workshop_reservation_model.count({ where: { workshop_id: id_workshop } });
        const pendingOthers = await countPendingInvitations(id_workshop, userId);
        if (workshop.capacity_workshop != null && count + pendingOthers >= workshop.capacity_workshop) {
            return { error: "El taller está completo" };
        }

        await workshop_reservation_model.create({ workshop_id: id_workshop, user_id: userId });
        // A place freed up: their pending request for an extra one is moot.
        await workshop_spot_request_model.destroy({ where: { workshop_id: id_workshop, user_id: userId, status: 'pending' } });
        // Booking with a pending invitation answers it (the inviter is told).
        await workshop_invitation_model.update(
            { status: 'accepted', responded_at: new Date(), inviter_seen: false },
            { where: { workshop_id: id_workshop, invitee_user_id: userId, status: 'pending' } }
        );
        return {
            success: "Reserva confirmada",
            data: spotsSummary(workshop, count + 1, pendingOthers)
        };
    } catch (err) {
        console.error("-> workshop reserve() - Error =", err);
        return { error: "Error al reservar" };
    }
}

async function cancelReservation(id_workshop, userId) {
    try {
        if (!userId) return { error: "Autenticación requerida" };
        const deleted = await workshop_reservation_model.destroy({ where: { workshop_id: id_workshop, user_id: userId } });
        if (!deleted) return { error: "No tenías una reserva en este taller" };
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        const count = await workshop_reservation_model.count({ where: { workshop_id: id_workshop } });
        const pending = await countPendingInvitations(id_workshop);
        return {
            success: "Reserva cancelada",
            data: spotsSummary(workshop, count, pending)
        };
    } catch (err) {
        console.error("-> workshop cancelReservation() - Error =", err);
        return { error: "Error al cancelar la reserva" };
    }
}

// ── Participant management (workshop managers; the API checks who) ──

// Participants, invitations, blocked users and places, after each change.
async function managementState(id_workshop) {
    const workshop = await magazine_workshop_model.findByPk(id_workshop);
    const count = await workshop_reservation_model.count({ where: { workshop_id: id_workshop } });
    const pending = await countPendingInvitations(id_workshop);
    return {
        ...spotsSummary(workshop, count, pending),
        participants: await loadWorkshopParticipants(id_workshop),
        invitations: await loadWorkshopInvitations(id_workshop),
        blocked_users: await loadWorkshopBlocked(id_workshop)
    };
}

// Invite someone (in a free workshop anyone; otherwise socios/as and the
// magazine team). The invitation
// holds a place until they accept (→ booking) or decline. Inviting again
// after a "no" sends a new invitation.
async function inviteUser(id_workshop, inviteeId, inviterId) {
    try {
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop || !workshop.active_workshop) return { error: "Taller no encontrado" };
        const user = await user_model.findByPk(inviteeId, { attributes: ['id_user', 'is_editor', 'is_admin', 'is_super_admin'] });
        if (!user) return { error: "Usuario no encontrado" };
        if (await isBlocked(id_workshop, inviteeId)) {
            return { error: "Esta persona está bloqueada en este taller. Desbloquéala antes de invitarla" };
        }
        const participant = await workshop_reservation_model.findOne({ where: { workshop_id: id_workshop, user_id: inviteeId } });
        if (participant) return { error: "Esta persona ya participa en el taller" };
        const existing = await workshop_invitation_model.findOne({ where: { workshop_id: id_workshop, invitee_user_id: inviteeId } });
        if (existing?.status === 'pending') return { error: "Esta persona ya tiene una invitación pendiente" };
        if (!(await bookableUserIds([user], { free: !!workshop.free_workshop })).has(user.id_user)) {
            return { error: "Solo se puede invitar a socios/as de la revista", code: 'not_subscriber' };
        }
        const count = await workshop_reservation_model.count({ where: { workshop_id: id_workshop } });
        const pending = await countPendingInvitations(id_workshop);
        if (workshop.capacity_workshop != null && count + pending >= workshop.capacity_workshop) {
            return { error: "El taller está completo. Amplía el aforo para invitar a más personas" };
        }
        const values = { inviter_user_id: inviterId, status: 'pending', responded_at: null, inviter_seen: false };
        if (existing) await existing.update(values);
        else await workshop_invitation_model.create({ workshop_id: id_workshop, invitee_user_id: inviteeId, ...values });
        return { success: "Invitación enviada", data: await managementState(id_workshop) };
    } catch (err) {
        console.error("-> workshop inviteUser() - Error =", err);
        return { error: "Error al enviar la invitación" };
    }
}

// Withdraw a pending invitation: its place is free again.
async function withdrawInvitation(id_workshop, inviteeId) {
    try {
        const deleted = await workshop_invitation_model.destroy({
            where: { workshop_id: id_workshop, invitee_user_id: inviteeId, status: 'pending' }
        });
        if (!deleted) return { error: "Esta persona no tiene ninguna invitación pendiente" };
        return { success: "Invitación retirada", data: await managementState(id_workshop) };
    } catch (err) {
        console.error("-> workshop withdrawInvitation() - Error =", err);
        return { error: "Error al retirar la invitación" };
    }
}

// The invited reader answers: 'accept' books the held place, 'decline'
// frees it. Either way the inviter gets notified.
async function respondInvitation(id_invitation, userId, response) {
    try {
        const inv = await workshop_invitation_model.findByPk(id_invitation);
        if (!inv || inv.invitee_user_id !== userId) return { error: "Invitación no encontrada" };
        if (inv.status !== 'pending') return { error: "Ya respondiste a esta invitación" };
        const workshop = await magazine_workshop_model.findByPk(inv.workshop_id);
        if (!workshop || !workshop.active_workshop) return { error: "Taller no encontrado" };
        const accept = response === 'accept';
        if (accept) {
            if (await isBlocked(inv.workshop_id, userId)) return { error: "No puedes reservar plaza en este taller", code: 'blocked' };
            await workshop_reservation_model.findOrCreate({
                where: { workshop_id: inv.workshop_id, user_id: userId },
                defaults: { workshop_id: inv.workshop_id, user_id: userId }
            });
        }
        await inv.update({ status: accept ? 'accepted' : 'declined', responded_at: new Date(), inviter_seen: false });
        return {
            success: accept ? "Invitación aceptada: tienes plaza en el taller" : "Invitación rechazada. La plaza queda libre",
            data: { id_invitation: inv.id_invitation, id_workshop: inv.workshop_id, status: inv.status }
        };
    } catch (err) {
        console.error("-> workshop respondInvitation() - Error =", err);
        return { error: "Error al responder a la invitación" };
    }
}

// The reader's workshop notifications: invitations waiting for an answer
// (upcoming workshops) and answers to the invitations they sent, until seen.
async function invitationFeed(userId) {
    try {
        const workshopAttrs = ['id_workshop', 'title_workshop', 'date_workshop', 'audience_workshop', 'cover_image_workshop'];
        const pending = await workshop_invitation_model.findAll({
            where: { invitee_user_id: userId, status: 'pending' },
            include: [
                {
                    model: magazine_workshop_model, as: 'workshop', attributes: workshopAttrs,
                    where: { active_workshop: true, [Op.or]: [{ date_workshop: null }, { date_workshop: { [Op.gte]: new Date() } }] }
                },
                { model: user_model, as: 'inviter', attributes: ['id_user', 'name_user'] }
            ],
            order: [['updated_at', 'DESC']]
        });
        const answers = await workshop_invitation_model.findAll({
            where: { inviter_user_id: userId, status: ['accepted', 'declined'], inviter_seen: false },
            include: [
                { model: magazine_workshop_model, as: 'workshop', attributes: workshopAttrs },
                { model: user_model, as: 'invitee', attributes: ['id_user', 'name_user'] }
            ],
            order: [['responded_at', 'DESC']],
            limit: 30
        });
        return {
            data: {
                invitations: pending.map(i => ({
                    id_invitation: i.id_invitation,
                    created_at: i.updated_at,
                    workshop: i.workshop.toJSON(),
                    inviter: i.inviter ? { id_user: i.inviter.id_user, name_user: i.inviter.name_user } : null
                })),
                responses: answers.filter(a => a.workshop && a.invitee).map(a => ({
                    id_invitation: a.id_invitation,
                    status: a.status,
                    responded_at: a.responded_at,
                    workshop: a.workshop.toJSON(),
                    invitee: { id_user: a.invitee.id_user, name_user: a.invitee.name_user }
                }))
            }
        };
    } catch (err) {
        console.error("-> workshop invitationFeed() - Error =", err);
        return { error: "Error al cargar las invitaciones" };
    }
}

// The inviter has seen these answers (they leave the notifications).
async function markResponsesSeen(userId, ids) {
    const list = (Array.isArray(ids) ? ids : []).map(Number).filter(n => Number.isInteger(n) && n > 0);
    if (list.length === 0) return { data: { updated: 0 } };
    const [updated] = await workshop_invitation_model.update(
        { inviter_seen: true },
        { where: { inviter_user_id: userId, id_invitation: list } }
    );
    return { data: { updated } };
}

async function removeParticipant(id_workshop, userId) {
    try {
        const deleted = await workshop_reservation_model.destroy({ where: { workshop_id: id_workshop, user_id: userId } });
        if (!deleted) return { error: "Esta persona no participa en el taller" };
        return { success: "Participante eliminado", data: await managementState(id_workshop) };
    } catch (err) {
        console.error("-> workshop removeParticipant() - Error =", err);
        return { error: "Error al eliminar participante" };
    }
}

// Block someone from the workshop: they lose their place (if they had one)
// and can't book it again.
async function blockUser(id_workshop, userId, blockedBy) {
    try {
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop) return { error: "Taller no encontrado" };
        const user = await user_model.findByPk(userId, { attributes: ['id_user'] });
        if (!user) return { error: "Usuario no encontrado" };
        await workshop_block_model.findOrCreate({
            where: { workshop_id: id_workshop, user_id: userId },
            defaults: { workshop_id: id_workshop, user_id: userId, blocked_by: blockedBy || null }
        });
        await workshop_reservation_model.destroy({ where: { workshop_id: id_workshop, user_id: userId } });
        await workshop_invitation_model.destroy({ where: { workshop_id: id_workshop, invitee_user_id: userId } });
        return { success: "Usuario bloqueado en este taller", data: await managementState(id_workshop) };
    } catch (err) {
        console.error("-> workshop blockUser() - Error =", err);
        return { error: "Error al bloquear al usuario" };
    }
}

async function unblockUser(id_workshop, userId) {
    try {
        const deleted = await workshop_block_model.destroy({ where: { workshop_id: id_workshop, user_id: userId } });
        if (!deleted) return { error: "Esta persona no estaba bloqueada" };
        return { success: "Usuario desbloqueado", data: await managementState(id_workshop) };
    } catch (err) {
        console.error("-> workshop unblockUser() - Error =", err);
        return { error: "Error al desbloquear al usuario" };
    }
}

// People to invite / block, by name (id, name and photo only), marked
// when they already take part or are blocked.
async function searchUsers(id_workshop, query) {
    try {
        const q = String(query || '').trim();
        if (q.length < 2) return { data: [] };
        const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
        const users = await user_model.findAll({
            where: { name_user: { [Op.like]: `%${escaped}%` } },
            attributes: ['id_user', 'name_user', 'image_user', 'is_editor', 'is_admin', 'is_super_admin'],
            order: [['name_user', 'ASC']],
            limit: 10
        });
        const ids = users.map(u => u.id_user);
        const workshop = await magazine_workshop_model.findByPk(id_workshop, { attributes: ['free_workshop'] });
        const [reserved, blocked, invitations, bookable] = await Promise.all([
            workshop_reservation_model.findAll({ where: { workshop_id: id_workshop, user_id: ids }, attributes: ['user_id'] }),
            workshop_block_model.findAll({ where: { workshop_id: id_workshop, user_id: ids }, attributes: ['user_id'] }),
            workshop_invitation_model.findAll({ where: { workshop_id: id_workshop, invitee_user_id: ids }, attributes: ['invitee_user_id', 'status'] }),
            bookableUserIds(users, { free: !!workshop?.free_workshop })
        ]);
        const reservedSet = new Set(reserved.map(r => r.user_id));
        const blockedSet = new Set(blocked.map(b => b.user_id));
        const invitationStatus = new Map(invitations.map(i => [i.invitee_user_id, i.status]));
        return {
            data: users.map(u => ({
                id_user: u.id_user,
                name_user: u.name_user,
                image_user: u.image_user,
                is_participant: reservedSet.has(u.id_user),
                is_blocked: blockedSet.has(u.id_user),
                can_book: bookable.has(u.id_user),
                invitation_status: invitationStatus.get(u.id_user) || null
            }))
        };
    } catch (err) {
        console.error("-> workshop searchUsers() - Error =", err);
        return { error: "Error al buscar usuarios" };
    }
}

// ── Extra places (socios/as ask for one in a full workshop) ──

const SPOT_MESSAGE_MAX = 300;

// Is it full? Bookings + places held by pending invitations vs capacity.
async function workshopIsFull(workshop) {
    if (workshop.capacity_workshop == null) return false;
    const count = await workshop_reservation_model.count({ where: { workshop_id: workshop.id_workshop } });
    const pending = await countPendingInvitations(workshop.id_workshop);
    return count + pending >= workshop.capacity_workshop;
}

// The reader's own request on this workshop (status), or null.
async function mySpotRequest(workshopId, userId) {
    if (!userId) return null;
    const r = await workshop_spot_request_model.findOne({ where: { workshop_id: workshopId, user_id: userId } });
    return r ? { status: r.status, message: r.message, created_at: r.created_at, responded_at: r.responded_at } : null;
}

// Pending requests on a workshop, for its managers.
async function loadWorkshopSpotRequests(workshopId) {
    const rows = await workshop_spot_request_model.findAll({
        where: { workshop_id: workshopId, status: 'pending' },
        include: [{ model: user_model, as: 'requester', attributes: ['id_user', 'name_user', 'image_user'] }],
        order: [['created_at', 'ASC']]
    });
    return rows.filter(r => r.requester).map(r => ({
        id_spot_request: r.id_spot_request,
        id_user: r.requester.id_user,
        name_user: r.requester.name_user,
        image_user: r.requester.image_user,
        message: r.message,
        created_at: r.created_at
    }));
}

// A socio/a asks for an extra place (membership is checked by the caller).
async function requestSpot(id_workshop, userId, rawMessage) {
    try {
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop || !workshop.active_workshop) return { error: "Taller no encontrado" };
        const message = String(rawMessage || '').trim();
        if (message.length > SPOT_MESSAGE_MAX) return { error: `El mensaje es demasiado largo (máximo ${SPOT_MESSAGE_MAX} caracteres)` };
        if (await isBlocked(id_workshop, userId)) return { error: "No puedes pedir plaza en este taller", code: 'blocked' };
        if (await workshop_reservation_model.findOne({ where: { workshop_id: id_workshop, user_id: userId } })) {
            return { error: "Ya participas en este taller" };
        }
        if (workshop.capacity_workshop == null) return { error: "Este taller no tiene un aforo limitado" };
        if (!(await workshopIsFull(workshop))) return { error: "El taller todavía tiene plazas libres: reserva la tuya", code: 'not_full' };
        const existing = await workshop_spot_request_model.findOne({ where: { workshop_id: id_workshop, user_id: userId } });
        if (existing?.status === 'pending') return { error: "Ya has pedido una plaza extra en este taller" };
        if (existing?.status === 'declined') return { error: "Ya pediste una plaza extra en este taller y no se pudo abrir", code: 'declined' };
        if (existing) await existing.destroy(); // an old accepted one (they cancelled since)
        await workshop_spot_request_model.create({ workshop_id: id_workshop, user_id: userId, message: message || null, status: 'pending' });
        return { success: "Solicitud enviada: quien gestiona el taller decidirá si abre una plaza más", data: { status: 'pending' } };
    } catch (err) {
        console.error("-> workshop requestSpot() - Error =", err);
        return { error: "Error al enviar la solicitud" };
    }
}

async function withdrawSpotRequest(id_workshop, userId) {
    try {
        const deleted = await workshop_spot_request_model.destroy({ where: { workshop_id: id_workshop, user_id: userId, status: 'pending' } });
        if (!deleted) return { error: "No tienes ninguna solicitud pendiente en este taller" };
        return { success: "Solicitud retirada", data: { status: null } };
    } catch (err) {
        console.error("-> workshop withdrawSpotRequest() - Error =", err);
        return { error: "Error al retirar la solicitud" };
    }
}

// A manager answers. Accepting opens one more place and books it for them.
async function respondSpotRequest(id_workshop, requesterId, managerId, response) {
    if (!['accept', 'decline'].includes(response)) return { error: "Respuesta no válida" };
    try {
        return await sequelize.transaction(async (transaction) => {
            const request = await workshop_spot_request_model.findOne({
                where: { workshop_id: id_workshop, user_id: requesterId, status: 'pending' },
                transaction, lock: transaction.LOCK.UPDATE
            });
            if (!request) return { error: "Solicitud no encontrada" };
            const answered = { responded_by: managerId, responded_at: new Date(), requester_seen: false };
            if (response === 'decline') {
                await request.update({ status: 'declined', ...answered }, { transaction });
                return { success: "Solicitud rechazada", data: { status: 'declined' } };
            }
            const workshop = await magazine_workshop_model.findByPk(id_workshop, { transaction, lock: transaction.LOCK.UPDATE });
            if (!workshop || !workshop.active_workshop) return { error: "Taller no encontrado" };
            const already = await workshop_reservation_model.findOne({ where: { workshop_id: id_workshop, user_id: requesterId }, transaction });
            if (!already) {
                if (workshop.capacity_workshop != null) await workshop.update({ capacity_workshop: workshop.capacity_workshop + 1 }, { transaction });
                await workshop_reservation_model.create({ workshop_id: id_workshop, user_id: requesterId }, { transaction });
            }
            await request.update({ status: 'accepted', ...answered }, { transaction });
            return { success: "Plaza abierta: ya tiene sitio en el taller", data: { status: 'accepted', capacity_workshop: workshop.capacity_workshop } };
        });
    } catch (err) {
        console.error("-> workshop respondSpotRequest() - Error =", err);
        return { error: "Error al responder a la solicitud" };
    }
}

// For the bell: pending requests on the workshops this user manages, and the
// answers to their own requests they haven't seen.
async function spotFeed(userId, managedIds) {
    const workshopAttrs = ['id_workshop', 'title_workshop', 'date_workshop', 'audience_workshop', 'cover_image_workshop'];
    const pending = managedIds === 'all' || (Array.isArray(managedIds) && managedIds.length > 0)
        ? await workshop_spot_request_model.findAll({
            where: { status: 'pending', ...(managedIds === 'all' ? {} : { workshop_id: managedIds }) },
            include: [
                { model: magazine_workshop_model, as: 'workshop', attributes: workshopAttrs, where: { active_workshop: true } },
                { model: user_model, as: 'requester', attributes: ['id_user', 'name_user'] }
            ],
            order: [['created_at', 'DESC']],
            limit: 30
        })
        : [];
    const answers = await workshop_spot_request_model.findAll({
        where: { user_id: userId, status: ['accepted', 'declined'], requester_seen: false },
        include: [{ model: magazine_workshop_model, as: 'workshop', attributes: workshopAttrs }],
        order: [['responded_at', 'DESC']],
        limit: 30
    });
    return {
        spot_requests: pending.filter(r => r.workshop && r.requester && r.user_id !== userId).map(r => ({
            id_spot_request: r.id_spot_request,
            created_at: r.created_at,
            message: r.message,
            workshop: r.workshop.toJSON(),
            requester: { id_user: r.requester.id_user, name_user: r.requester.name_user }
        })),
        spot_answers: answers.filter(a => a.workshop).map(a => ({
            id_spot_request: a.id_spot_request,
            status: a.status,
            responded_at: a.responded_at,
            workshop: a.workshop.toJSON()
        }))
    };
}

// Workshops this team member manages (created or teaches): ids.
async function managedWorkshopIds(userId) {
    const [created, teaches] = await Promise.all([
        magazine_workshop_model.findAll({ where: { author_id: userId }, attributes: ['id_workshop'] }),
        workshop_author_model.findAll({ where: { user_id: userId }, attributes: ['workshop_id'] })
    ]);
    return [...new Set([...created.map(w => w.id_workshop), ...teaches.map(a => a.workshop_id)])];
}

async function markSpotAnswersSeen(userId, ids) {
    const list = (Array.isArray(ids) ? ids : []).map(Number).filter(n => Number.isInteger(n) && n > 0);
    if (list.length === 0) return { data: { updated: 0 } };
    const [updated] = await workshop_spot_request_model.update(
        { requester_seen: true },
        { where: { id_spot_request: list, user_id: userId } }
    );
    return { data: { updated } };
}

export default {
    getAll,
    getById,
    create,
    update,
    removeById,
    uploadCoverImage,
    reserve,
    cancelReservation,
    isBlocked,
    loadWorkshopBlocked,
    loadWorkshopInvitations,
    myPendingInvitation,
    inviteUser,
    withdrawInvitation,
    respondInvitation,
    invitationFeed,
    markResponsesSeen,
    removeParticipant,
    blockUser,
    unblockUser,
    searchUsers,
    mySpotRequest,
    loadWorkshopSpotRequests,
    requestSpot,
    withdrawSpotRequest,
    respondSpotRequest,
    spotFeed,
    managedWorkshopIds,
    markSpotAnswersSeen
};
