// back-end/controllers/magazine_workshop/magazine_workshop_controller.js
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import workshop_author_model from "../../models/workshop_author_model.js";
import workshop_reservation_model from "../../models/workshop_reservation_model.js";
import user_model from "../../models/user_model.js";
import { deleteFile } from "../../utils/file_cleanup.js";

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
        order: [['created_at', 'ASC']]
    });
    return rows.filter(r => r.user).map(r => ({
        id_user: r.user.id_user,
        name_user: r.user.name_user,
        image_user: r.user.image_user
    }));
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

export default {
    getAll,
    getById,
    create,
    update,
    removeById,
    uploadCoverImage,
    reserve,
    cancelReservation
};
