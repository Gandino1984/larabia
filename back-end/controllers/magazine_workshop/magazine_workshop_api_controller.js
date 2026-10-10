// back-end/controllers/magazine_workshop/magazine_workshop_api_controller.js
import magazineWorkshopController from "./magazine_workshop_controller.js";
import { getRequestUser, roleSnapshot } from "../../utils/authHelper.js";
import reader_subscription_model, { ACTIVE_STATUSES } from "../../models/reader_subscription_model.js";
import magazine_workshop_model from "../../models/magazine_workshop_model.js";
import workshop_author_model from "../../models/workshop_author_model.js";

/**
 * Creating workshops: the magazine team (editors, admins, super admins).
 * Returns the user, or sends a 403.
 */
async function requireWorkshopCreator(req, res) {
    const user = await getRequestUser(req);
    if (!user || !roleSnapshot(user).canCreateContent) {
        res.status(403).json({ error: 'Solo el equipo de la revista puede crear talleres' });
        return null;
    }
    return user;
}

/**
 * Editing / deleting a workshop (and its cover): super admins, or whoever
 * created it or teaches it. Returns the user, or sends a 403 / 404.
 */
async function requireWorkshopManager(req, res, workshopId) {
    const user = await requireWorkshopCreator(req, res);
    if (!user) return null;
    if (roleSnapshot(user).isSuperAdmin) return user;
    const workshop = await magazine_workshop_model.findByPk(workshopId);
    if (!workshop) {
        res.status(404).json({ error: 'Taller no encontrado' });
        return null;
    }
    if (workshop.author_id === user.id_user) return user;
    const teaches = await workshop_author_model.findOne({ where: { workshop_id: workshopId, user_id: user.id_user } });
    if (teaches) return user;
    res.status(403).json({ error: 'Solo quien creó o imparte el taller (o el super-administrador) puede modificarlo' });
    return null;
}

/**
 * Anyone can see the workshop LIST; opening a workshop and BOOKING it is for
 * paying subscribers (the magazine team — editors, admins, super admins —
 * has access without subscribing).
 * Resolves the caller's standing: { user, code } where code is null (can book),
 * 'login_required' or 'subscription_required'.
 */
async function workshopAccess(req) {
    const user = await getRequestUser(req);
    if (!user) return { user: null, code: 'login_required' };
    if (roleSnapshot(user).canCreateContent) return { user, code: null };
    const sub = await reader_subscription_model.findOne({ where: { user_id: user.id_user } });
    if (sub && ACTIVE_STATUSES.includes(sub.status)) return { user, code: null };
    return { user, code: 'subscription_required' };
}

/**
 * Workshop page + booking gate. Sends a 403 with the `code` the front-end
 * uses — never a 401, which logs the reader out. Returns the user when
 * they're allowed.
 */
async function requireWorkshopAccess(req, res) {
    const { user, code } = await workshopAccess(req);
    if (!code) return user;
    res.status(403).json({
        error: code === 'login_required'
            ? 'Inicia sesión para ver el taller y reservar plaza'
            : 'Los talleres son exclusivos para personas suscriptoras de la revista',
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

// Workshop page: subscribers and the magazine team only (the list is public).
// Adds `reserved_by_me` and `booking_code` (always null here — kept so the
// front-end's reserve button logic stays uniform).
async function getById(req, res) {
    try {
        const user = await requireWorkshopAccess(req, res);
        if (!user) return;
        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
        const { error, data } = await magazineWorkshopController.getById(id_workshop);
        if (error) return res.status(404).json({ error });
        const participants = data.participants || [];
        const out = {
            ...data,
            reserved_by_me: participants.some((p) => p.id_user === user.id_user),
            booking_code: null
        };
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

export default {
    getAll,
    getById,
    create,
    update,
    remove,
    uploadCoverImage,
    reserve,
    cancelReservation
};
