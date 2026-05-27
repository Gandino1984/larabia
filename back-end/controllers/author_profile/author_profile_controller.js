// back-end/controllers/author_profile/author_profile_controller.js
import author_profile_model from "../../models/author_profile_model.js";
import user_model from "../../models/user_model.js";
import { roleSnapshot } from "../../utils/authHelper.js";

const authorProfileController = {
    /**
     * Get all published author profiles with user information
     */
    async getAllPublished(filters = {}) {
        try {
            const whereClause = {
                status_profile: 'published',
                ...filters
            };

            const profiles = await author_profile_model.findAll({
                where: whereClause,
                include: [{
                    model: user_model,
                    as: 'user',
                    attributes: ['id_user', 'name_user', 'image_user']
                }],
                order: [
                    ['featured_profile', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });

            return {
                error: null,
                data: profiles,
                message: `${profiles.length} perfiles encontrados`
            };
        } catch (err) {
            console.error("-> author_profile_controller.js - getAllPublished() - Error =", err);
            return {
                error: "Error al obtener los perfiles de autores",
                data: null
            };
        }
    },

    /**
     * Get ALL author profiles regardless of status (super admin use)
     */
    async getAll() {
        try {
            const profiles = await author_profile_model.findAll({
                include: [{
                    model: user_model,
                    as: 'user',
                    attributes: ['id_user', 'name_user', 'image_user']
                }],
                order: [
                    ['featured_profile', 'DESC'],
                    ['status_profile', 'ASC'],
                    ['created_at', 'DESC']
                ]
            });

            return {
                error: null,
                data: profiles,
                message: `${profiles.length} perfiles encontrados`
            };
        } catch (err) {
            console.error("-> author_profile_controller.js - getAll() - Error =", err);
            return {
                error: "Error al obtener los perfiles",
                data: null
            };
        }
    },

    /**
     * Get featured author profiles only
     */
    async getFeatured() {
        try {
            const profiles = await author_profile_model.findAll({
                where: {
                    status_profile: 'published',
                    featured_profile: true
                },
                include: [{
                    model: user_model,
                    as: 'user',
                    attributes: ['id_user', 'name_user', 'image_user']
                }],
                order: [['created_at', 'DESC']]
            });

            return {
                error: null,
                data: profiles,
                message: `${profiles.length} perfiles destacados encontrados`
            };
        } catch (err) {
            console.error("-> author_profile_controller.js - getFeatured() - Error =", err);
            return {
                error: "Error al obtener perfiles destacados",
                data: null
            };
        }
    },

    /**
     * Get a single author profile by ID
     */
    async getById(id_author_profile) {
        try {
            const profile = await author_profile_model.findOne({
                where: { id_author_profile },
                include: [{
                    model: user_model,
                    as: 'user',
                    attributes: ['id_user', 'name_user', 'image_user']
                }]
            });

            if (!profile) {
                return {
                    error: "Perfil de autor no encontrado",
                    data: null
                };
            }

            return {
                error: null,
                data: profile
            };
        } catch (err) {
            console.error("-> author_profile_controller.js - getById() - Error =", err);
            return {
                error: "Error al obtener el perfil",
                data: null
            };
        }
    },

    /**
     * Get author profile by user ID (for editors to load their own profile)
     */
    async getByUserId(user_id) {
        try {
            const profile = await author_profile_model.findOne({
                where: { user_id },
                include: [{
                    model: user_model,
                    as: 'user',
                    attributes: ['id_user', 'name_user', 'image_user', 'is_editor']
                }]
            });

            if (!profile) {
                return {
                    error: null,
                    data: null,
                    message: "No se encontró perfil para este usuario"
                };
            }

            return {
                error: null,
                data: profile
            };
        } catch (err) {
            console.error("-> author_profile_controller.js - getByUserId() - Error =", err);
            return {
                error: "Error al obtener el perfil por usuario",
                data: null
            };
        }
    },

    /**
     * Create a new author profile
     */
    async create(profileData) {
        try {
            // Validate required fields
            if (!profileData.user_id || !profileData.display_name || !profileData.bio_text) {
                return {
                    error: "user_id, display_name y bio_text son obligatorios",
                    data: null
                };
            }

            // Check the user is a content creator (editor, admin, or super admin)
            const user = await user_model.findByPk(profileData.user_id);
            if (!user) {
                return {
                    error: "Usuario no encontrado",
                    data: null
                };
            }

            if (!roleSnapshot(user).canCreateContent) {
                return {
                    error: "Solo los editores pueden crear perfiles de autor",
                    data: null
                };
            }

            // Check if user already has a profile
            const existingProfile = await author_profile_model.findOne({
                where: { user_id: profileData.user_id }
            });

            if (existingProfile) {
                return {
                    error: "Este usuario ya tiene un perfil de autor",
                    data: null
                };
            }

            // Create the profile
            const newProfile = await author_profile_model.create(profileData);

            // Fetch the created profile with user data
            const createdProfile = await author_profile_model.findOne({
                where: { id_author_profile: newProfile.id_author_profile },
                include: [{
                    model: user_model,
                    as: 'user',
                    attributes: ['id_user', 'name_user', 'image_user']
                }]
            });

            return {
                error: null,
                data: createdProfile,
                success: "Perfil de autor creado exitosamente"
            };
        } catch (err) {
            console.error("-> author_profile_controller.js - create() - Error =", err);

            if (err.name === 'SequelizeUniqueConstraintError') {
                return {
                    error: "Ya existe un perfil para este usuario",
                    data: null
                };
            }

            return {
                error: "Error al crear el perfil de autor",
                data: err.message
            };
        }
    },

    /**
     * Update an existing author profile
     */
    async update(id_author_profile, updateData) {
        try {
            const profile = await author_profile_model.findByPk(id_author_profile);

            if (!profile) {
                return {
                    error: "Perfil de autor no encontrado",
                    data: null
                };
            }

            // Update the profile
            await profile.update(updateData);

            // Fetch updated profile with user data
            const updatedProfile = await author_profile_model.findOne({
                where: { id_author_profile },
                include: [{
                    model: user_model,
                    as: 'user',
                    attributes: ['id_user', 'name_user', 'image_user']
                }]
            });

            return {
                error: null,
                data: updatedProfile,
                success: "Perfil actualizado exitosamente"
            };
        } catch (err) {
            console.error("-> author_profile_controller.js - update() - Error =", err);
            return {
                error: "Error al actualizar el perfil",
                data: err.message
            };
        }
    },

    /**
     * Delete an author profile
     */
    async deleteProfile(id_author_profile) {
        try {
            const profile = await author_profile_model.findByPk(id_author_profile);

            if (!profile) {
                return {
                    error: "Perfil de autor no encontrado",
                    data: null
                };
            }

            await profile.destroy();

            return {
                error: null,
                data: null,
                success: "Perfil eliminado exitosamente"
            };
        } catch (err) {
            console.error("-> author_profile_controller.js - deleteProfile() - Error =", err);
            return {
                error: "Error al eliminar el perfil",
                data: null
            };
        }
    }
};

export default authorProfileController;
