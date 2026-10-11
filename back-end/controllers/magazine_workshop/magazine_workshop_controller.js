// back-end/controllers/magazine_workshop/magazine_workshop_controller.js
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import workshop_author_model from "../../models/workshop_author_model.js";
import workshop_reservation_model from "../../models/workshop_reservation_model.js";
import workshop_block_model from "../../models/workshop_block_model.js";
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

// Places taken / left, as the workshop page shows them.
function spotsSummary(workshop, count) {
    const capacity = workshop?.capacity_workshop;
    return {
        id_workshop: Number(workshop.id_workshop),
        reservation_count: count,
        spots_left: capacity != null ? Math.max(0, capacity - count) : null,
        is_full: capacity != null ? count >= capacity : false
    };
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
    const capacity = workshop.capacity_workshop;
    return {
        ...workshop.toJSON(),
        authors,
        reservation_count,
        spots_left: (capacity === null || capacity === undefined) ? null : Math.max(0, capacity - reservation_count),
        is_full: (capacity === null || capacity === undefined) ? false : reservation_count >= capacity
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

        const count = await workshop_reservation_model.count({ where: { workshop_id: id_workshop } });
        if (workshop.capacity_workshop != null && count >= workshop.capacity_workshop) {
            return { error: "El taller está completo" };
        }

        await workshop_reservation_model.create({ workshop_id: id_workshop, user_id: userId });
        const newCount = count + 1;
        return {
            success: "Reserva confirmada",
            data: {
                id_workshop: Number(id_workshop),
                reservation_count: newCount,
                spots_left: workshop.capacity_workshop != null ? Math.max(0, workshop.capacity_workshop - newCount) : null,
                is_full: workshop.capacity_workshop != null ? newCount >= workshop.capacity_workshop : false
            }
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
        const capacity = workshop?.capacity_workshop;
        return {
            success: "Reserva cancelada",
            data: {
                id_workshop: Number(id_workshop),
                reservation_count: count,
                spots_left: capacity != null ? Math.max(0, capacity - count) : null,
                is_full: capacity != null ? count >= capacity : false
            }
        };
    } catch (err) {
        console.error("-> workshop cancelReservation() - Error =", err);
        return { error: "Error al cancelar la reserva" };
    }
}

// ── Participant management (workshop managers; the API checks who) ──

// Participants, blocked users and places, after each change.
async function managementState(id_workshop) {
    const workshop = await magazine_workshop_model.findByPk(id_workshop);
    const count = await workshop_reservation_model.count({ where: { workshop_id: id_workshop } });
    return {
        ...spotsSummary(workshop, count),
        participants: await loadWorkshopParticipants(id_workshop),
        blocked_users: await loadWorkshopBlocked(id_workshop)
    };
}

// Include someone in the workshop (no subscription needed — the managers
// decide). Respects the capacity and blocks.
async function addParticipant(id_workshop, userId) {
    try {
        const workshop = await magazine_workshop_model.findByPk(id_workshop);
        if (!workshop || !workshop.active_workshop) return { error: "Taller no encontrado" };
        const user = await user_model.findByPk(userId, { attributes: ['id_user'] });
        if (!user) return { error: "Usuario no encontrado" };
        if (await isBlocked(id_workshop, userId)) {
            return { error: "Esta persona está bloqueada en este taller. Desbloquéala antes de incluirla" };
        }
        const existing = await workshop_reservation_model.findOne({ where: { workshop_id: id_workshop, user_id: userId } });
        if (existing) return { error: "Esta persona ya participa en el taller" };
        const count = await workshop_reservation_model.count({ where: { workshop_id: id_workshop } });
        if (workshop.capacity_workshop != null && count >= workshop.capacity_workshop) {
            return { error: "El taller está completo. Amplía el aforo para incluir a más personas" };
        }
        await workshop_reservation_model.create({ workshop_id: id_workshop, user_id: userId });
        return { success: "Participante incluido", data: await managementState(id_workshop) };
    } catch (err) {
        console.error("-> workshop addParticipant() - Error =", err);
        return { error: "Error al incluir participante" };
    }
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

// People to include / block, by name (id, name and photo only), marked
// when they already take part or are blocked.
async function searchUsers(id_workshop, query) {
    try {
        const q = String(query || '').trim();
        if (q.length < 2) return { data: [] };
        const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
        const users = await user_model.findAll({
            where: { name_user: { [Op.like]: `%${escaped}%` } },
            attributes: ['id_user', 'name_user', 'image_user'],
            order: [['name_user', 'ASC']],
            limit: 10
        });
        const ids = users.map(u => u.id_user);
        const [reserved, blocked] = await Promise.all([
            workshop_reservation_model.findAll({ where: { workshop_id: id_workshop, user_id: ids }, attributes: ['user_id'] }),
            workshop_block_model.findAll({ where: { workshop_id: id_workshop, user_id: ids }, attributes: ['user_id'] })
        ]);
        const reservedSet = new Set(reserved.map(r => r.user_id));
        const blockedSet = new Set(blocked.map(b => b.user_id));
        return {
            data: users.map(u => ({
                id_user: u.id_user,
                name_user: u.name_user,
                image_user: u.image_user,
                is_participant: reservedSet.has(u.id_user),
                is_blocked: blockedSet.has(u.id_user)
            }))
        };
    } catch (err) {
        console.error("-> workshop searchUsers() - Error =", err);
        return { error: "Error al buscar usuarios" };
    }
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
    addParticipant,
    removeParticipant,
    blockUser,
    unblockUser,
    searchUsers
};
