// back-end/controllers/magazine_workshop/magazine_workshop_api_controller.js
import magazineWorkshopController from "./magazine_workshop_controller.js";
import { getRequestUser, roleSnapshot, requireSuperAdmin } from "../../utils/authHelper.js";

async function getAll(req, res) {
    try {
        const { error, data } = await magazineWorkshopController.getAll();
        res.json({ error, data });
    } catch (err) {
        console.error("-> workshop api getAll() - Error =", err);
        res.status(500).json({ error: "Error al obtener los talleres", details: err.message });
    }
}

async function getById(req, res) {
    try {
        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
        const { error, data } = await magazineWorkshopController.getById(id_workshop);
        if (error) return res.status(404).json({ error });
        res.json({ error, data });
    } catch (err) {
        console.error("-> workshop api getById() - Error =", err);
        res.status(500).json({ error: "Error al obtener el taller", details: err.message });
    }
}

async function create(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return; // 403 already sent

        const { title_workshop, description_workshop, location_workshop, date_workshop,
            cover_image_workshop, capacity_workshop, authors, author_name } = req.body;

        const data = {
            title_workshop,
            description_workshop,
            location_workshop,
            date_workshop: date_workshop || null,
            cover_image_workshop: cover_image_workshop || null,
            capacity_workshop,
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
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;

        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });

        const { title_workshop, description_workshop, location_workshop, date_workshop,
            cover_image_workshop, capacity_workshop, authors, author_name } = req.body;

        const data = {};
        if (title_workshop !== undefined) data.title_workshop = title_workshop;
        if (description_workshop !== undefined) data.description_workshop = description_workshop;
        if (location_workshop !== undefined) data.location_workshop = location_workshop;
        if (date_workshop !== undefined) data.date_workshop = date_workshop || null;
        if (cover_image_workshop !== undefined) data.cover_image_workshop = cover_image_workshop;
        if (capacity_workshop !== undefined) data.capacity_workshop = capacity_workshop;
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
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const { id_workshop } = req.params;
        if (!id_workshop) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
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
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const workshopId = req.headers['x-workshop-id'];
        if (!workshopId) return res.status(400).json({ error: 'El ID del taller es obligatorio' });
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
        const user = await getRequestUser(req);
        if (!user) return res.status(401).json({ error: 'Autenticación requerida' });
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
