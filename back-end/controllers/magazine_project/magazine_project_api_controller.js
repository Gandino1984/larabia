// back-end/controllers/magazine_project/magazine_project_api_controller.js
import magazineProjectController from "./magazine_project_controller.js";
import { getRequestUser, roleSnapshot, requireSuperAdmin } from "../../utils/authHelper.js";

async function getAll(req, res) {
    try {
        const { status, type, format, featured } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (format) filters.format = format;
        if (featured !== undefined) filters.featured = featured === 'true';

        const callerUser = await getRequestUser(req);
        const { error, data } = await magazineProjectController.getAll(filters, roleSnapshot(callerUser));
        res.json({ error, data });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - getAll() - Error =", err);
        res.status(500).json({
            error: "Error al obtener los proyectos",
            details: err.message
        });
    }
}

async function getById(req, res) {
    try {
        const { id_project } = req.params;

        if (!id_project) {
            return res.status(400).json({
                error: 'El ID del proyecto es obligatorio'
            });
        }

        const callerUser = await getRequestUser(req);
        const { error, data } = await magazineProjectController.getById(id_project, roleSnapshot(callerUser));

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - getById() - Error =", err);
        res.status(500).json({
            error: "Error al obtener el proyecto",
            details: err.message
        });
    }
}

async function getByType(req, res) {
    try {
        const { type } = req.params;

        if (!type) {
            return res.status(400).json({
                error: 'El tipo es obligatorio'
            });
        }

        const { error, data, message } = await magazineProjectController.getByType(type);
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - getByType() - Error =", err);
        res.status(500).json({
            error: "Error al obtener proyectos por tipo",
            details: err.message
        });
    }
}

async function getByFormat(req, res) {
    try {
        const { format } = req.params;

        if (!format) {
            return res.status(400).json({
                error: 'El formato es obligatorio'
            });
        }

        const { error, data, message } = await magazineProjectController.getByFormat(format);
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - getByFormat() - Error =", err);
        res.status(500).json({
            error: "Error al obtener proyectos por formato",
            details: err.message
        });
    }
}

async function getFeatured(req, res) {
    try {
        const { error, data, message } = await magazineProjectController.getFeatured();
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - getFeatured() - Error =", err);
        res.status(500).json({
            error: "Error al obtener proyectos destacados",
            details: err.message
        });
    }
}

async function create(req, res) {
    try {
        const {
            title_project,
            description_project,
            author_id,
            author_name,
            cover_image_project,
            type_project,
            format_project,
            date_published,
            status_project,
            featured_project
        } = req.body;

        if (!title_project) {
            return res.status(400).json({
                error: 'El título es obligatorio',
                missingFields: {
                    title_project: !title_project
                }
            });
        }

        // Convert empty strings to null for ENUM fields
        const normalizeString = (str) => {
            if (!str || typeof str !== 'string' || str.trim() === '') return null;
            return str;
        };

        const projectData = {
            title_project,
            description_project: description_project || null,
            author_id: author_id || null,
            author_name: author_name || null,
            cover_image_project: cover_image_project || null,
            type_project: normalizeString(type_project),
            format_project: normalizeString(format_project),
            date_published: date_published || null,
            status_project: status_project || 'draft',
            featured_project: featured_project || false
        };

        const callerUser = await getRequestUser(req);
        const { error, data, success } = await magazineProjectController.create(projectData, roleSnapshot(callerUser));

        if (error) {
            return res.status(400).json({ error, details: data });
        }

        res.json({ error, data, success });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - create() - Error =", err);
        res.status(500).json({
            error: "Error al crear el proyecto",
            details: err.message
        });
    }
}

async function update(req, res) {
    try {
        const { id_project } = req.params;

        if (!id_project) {
            return res.status(400).json({
                error: 'El ID del proyecto es obligatorio'
            });
        }

        const {
            title_project,
            description_project,
            author_id,
            author_name,
            cover_image_project,
            type_project,
            format_project,
            date_published,
            status_project,
            featured_project
        } = req.body;

        // Convert empty strings to null for ENUM fields
        const normalizeString = (str) => {
            if (!str || typeof str !== 'string' || str.trim() === '') return null;
            return str;
        };

        const projectData = {};
        if (title_project !== undefined) projectData.title_project = title_project;
        if (description_project !== undefined) projectData.description_project = description_project;
        if (author_id !== undefined) projectData.author_id = author_id;
        if (author_name !== undefined) projectData.author_name = author_name;
        if (cover_image_project !== undefined) projectData.cover_image_project = cover_image_project;
        if (type_project !== undefined) projectData.type_project = normalizeString(type_project);
        if (format_project !== undefined) projectData.format_project = normalizeString(format_project);
        if (date_published !== undefined) projectData.date_published = date_published;
        if (status_project !== undefined) projectData.status_project = status_project;
        if (featured_project !== undefined) projectData.featured_project = featured_project;

        const callerUser = await getRequestUser(req);
        const { error, data, success } = await magazineProjectController.update(id_project, projectData, roleSnapshot(callerUser));

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data, success });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - update() - Error =", err);
        res.status(500).json({
            error: "Error al actualizar el proyecto",
            details: err.message
        });
    }
}

async function remove(req, res) {
    try {
        const { id_project } = req.params;

        if (!id_project) {
            return res.status(400).json({
                error: 'El ID del proyecto es obligatorio'
            });
        }

        const { error, data, message } = await magazineProjectController.removeById(id_project);

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - remove() - Error =", err);
        res.status(500).json({
            error: "Error al eliminar el proyecto",
            details: err.message
        });
    }
}

async function uploadCoverImage(req, res) {
    try {
        const { id_project } = req.params;

        if (!id_project) {
            return res.status(400).json({
                error: 'El ID del proyecto es obligatorio'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No se proporcionó ninguna imagen'
            });
        }

        const imagePath = `assets/images/magazine/projects/${req.file.filename}`;

        const { error, data, message } = await magazineProjectController.uploadCoverImage(id_project, imagePath);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - uploadCoverImage() - Error =", err);
        res.status(500).json({
            error: "Error al subir la imagen",
            details: err.message
        });
    }
}

async function removeCoverImage(req, res) {
    try {
        const { id_project } = req.params;

        if (!id_project) {
            return res.status(400).json({
                error: 'El ID del proyecto es obligatorio'
            });
        }

        const { error, data, message } = await magazineProjectController.removeCoverImage(id_project);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - removeCoverImage() - Error =", err);
        res.status(500).json({
            error: "Error al eliminar la imagen",
            details: err.message
        });
    }
}

async function deactivate(req, res) {
    try {
        const { id_project } = req.params;

        if (!id_project) {
            return res.status(400).json({
                error: 'El ID del proyecto es obligatorio'
            });
        }

        const { error, data, message } = await magazineProjectController.deactivate(id_project);

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_project_api_controller.js - deactivate() - Error =", err);
        res.status(500).json({
            error: "Error al desactivar el proyecto",
            details: err.message
        });
    }
}

// ============================================================
// Editorial approval workflow
// ============================================================

async function submitForApproval(req, res) {
    try {
        const { id_project } = req.params;
        if (!id_project) return res.status(400).json({ error: 'El ID del proyecto es obligatorio' });

        const callerUser = await getRequestUser(req);
        if (!callerUser) return res.status(401).json({ error: 'Autenticación requerida' });

        const result = await magazineProjectController.submitForApproval(id_project, roleSnapshot(callerUser));
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> submitForApproval API - Error =', err);
        res.status(500).json({ error: 'Error al enviar el proyecto para aprobación', details: err.message });
    }
}

async function approveProject(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return; // requireSuperAdmin already wrote 403
        const { id_project } = req.params;
        if (!id_project) return res.status(400).json({ error: 'El ID del proyecto es obligatorio' });
        const result = await magazineProjectController.approveProject(id_project);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> approveProject API - Error =', err);
        res.status(500).json({ error: 'Error al aprobar el proyecto', details: err.message });
    }
}

async function rejectProject(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const { id_project } = req.params;
        if (!id_project) return res.status(400).json({ error: 'El ID del proyecto es obligatorio' });
        const result = await magazineProjectController.rejectProject(id_project, req.body?.reason);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> rejectProject API - Error =', err);
        res.status(500).json({ error: 'Error al rechazar el proyecto', details: err.message });
    }
}

async function getPending(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const result = await magazineProjectController.getPending();
        res.json({ error: null, ...result });
    } catch (err) {
        console.error('-> getPending API - Error =', err);
        res.status(500).json({ error: 'Error al obtener proyectos pendientes', details: err.message });
    }
}

export default {
    getAll,
    getById,
    getByType,
    getByFormat,
    getFeatured,
    create,
    update,
    remove,
    uploadCoverImage,
    removeCoverImage,
    deactivate,
    submitForApproval,
    approveProject,
    rejectProject,
    getPending
};
