// back-end/controllers/author_profile/author_profile_api_controller.js
import authorProfileController from "./author_profile_controller.js";
import author_profile_model from "../../models/author_profile_model.js";

async function getAll(req, res) {
    try {
        const { error, data, message } = await authorProfileController.getAll();
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - getAll() - Error =", err);
        res.status(500).json({
            error: "Error al obtener todos los perfiles",
            details: err.message
        });
    }
}

async function getAllPublished(req, res) {
    try {
        const { error, data, message } = await authorProfileController.getAllPublished();
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - getAllPublished() - Error =", err);
        res.status(500).json({
            error: "Error al obtener los perfiles de autores",
            details: err.message
        });
    }
}

async function getFeatured(req, res) {
    try {
        const { error, data, message } = await authorProfileController.getFeatured();
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - getFeatured() - Error =", err);
        res.status(500).json({
            error: "Error al obtener perfiles destacados",
            details: err.message
        });
    }
}

async function getById(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'El ID del perfil es obligatorio'
            });
        }

        const { error, data } = await authorProfileController.getById(id);

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - getById() - Error =", err);
        res.status(500).json({
            error: "Error al obtener el perfil",
            details: err.message
        });
    }
}

async function getByUserId(req, res) {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                error: 'El ID del usuario es obligatorio'
            });
        }

        const { error, data, message } = await authorProfileController.getByUserId(userId);
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - getByUserId() - Error =", err);
        res.status(500).json({
            error: "Error al obtener el perfil por usuario",
            details: err.message
        });
    }
}

async function create(req, res) {
    try {
        const {
            user_id,
            display_name,
            bio_text,
            specialty_tags,
            website_url,
            twitter_handle,
            instagram_handle,
            status_profile,
            featured_profile
        } = req.body;

        if (!user_id || !display_name || !bio_text) {
            return res.status(400).json({
                error: 'user_id, display_name y bio_text son obligatorios',
                missingFields: {
                    user_id: !user_id,
                    display_name: !display_name,
                    bio_text: !bio_text
                }
            });
        }

        const profileData = {
            user_id,
            display_name,
            bio_text,
            specialty_tags: specialty_tags || null,
            website_url: website_url || null,
            twitter_handle: twitter_handle || null,
            instagram_handle: instagram_handle || null,
            status_profile: status_profile || 'draft',
            featured_profile: featured_profile || false
        };

        const { error, data, success } = await authorProfileController.create(profileData);

        if (error) {
            return res.status(400).json({ error, details: data });
        }

        res.json({ error, data, success });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - create() - Error =", err);
        res.status(500).json({
            error: "Error al crear el perfil de autor",
            details: err.message
        });
    }
}

async function update(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'El ID del perfil es obligatorio'
            });
        }

        const {
            display_name,
            bio_text,
            specialty_tags,
            website_url,
            twitter_handle,
            instagram_handle,
            status_profile,
            featured_profile
        } = req.body;

        const updateData = {};
        if (display_name !== undefined) updateData.display_name = display_name;
        if (bio_text !== undefined) updateData.bio_text = bio_text;
        if (specialty_tags !== undefined) updateData.specialty_tags = specialty_tags;
        if (website_url !== undefined) updateData.website_url = website_url;
        if (twitter_handle !== undefined) updateData.twitter_handle = twitter_handle;
        if (instagram_handle !== undefined) updateData.instagram_handle = instagram_handle;
        if (status_profile !== undefined) updateData.status_profile = status_profile;
        if (featured_profile !== undefined) updateData.featured_profile = featured_profile;

        const { error, data, success } = await authorProfileController.update(id, updateData);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data, success });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - update() - Error =", err);
        res.status(500).json({
            error: "Error al actualizar el perfil",
            details: err.message
        });
    }
}

async function deleteProfile(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'El ID del perfil es obligatorio'
            });
        }

        const { error, data, success } = await authorProfileController.deleteProfile(id);

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data, success });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - deleteProfile() - Error =", err);
        res.status(500).json({
            error: "Error al eliminar el perfil",
            details: err.message
        });
    }
}

async function uploadProfileImage(req, res) {
    try {
        const userId = req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({ error: 'El ID del usuario es obligatorio' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
        }

        const profile = await author_profile_model.findOne({ where: { user_id: userId } });

        if (!profile) {
            return res.status(404).json({ error: 'Perfil de autor no encontrado para este usuario' });
        }

        await profile.update({ profile_image: req.file.filename });

        res.json({
            error: null,
            data: { profile_image: req.file.filename },
            success: 'Imagen de perfil actualizada correctamente'
        });
    } catch (err) {
        console.error("-> author_profile_api_controller.js - uploadProfileImage() - Error =", err);
        res.status(500).json({
            error: "Error al subir la imagen de perfil",
            details: err.message
        });
    }
}

export {
    getAll,
    getAllPublished,
    getFeatured,
    getById,
    getByUserId,
    create,
    update,
    deleteProfile,
    uploadProfileImage
};
