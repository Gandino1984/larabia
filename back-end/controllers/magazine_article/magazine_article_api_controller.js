// back-end/controllers/magazine_article/magazine_article_api_controller.js
import magazineArticleController from "./magazine_article_controller.js";
import article_author_model from "../../models/article_author_model.js";
import magazine_article_model from "../../models/magazine_article_model.js";
import article_author_invitation_model from "../../models/article_author_invitation_model.js";
import user_model from "../../models/user_model.js";
import { getRequestUser, roleSnapshot, requireSuperAdmin } from "../../utils/authHelper.js";

// Returns true if userId is an author of the given article (checks junction table + legacy author_id)
async function isArticleAuthor(articleId, userId) {
    if (!userId) return false;
    const entry = await article_author_model.findOne({
        where: { article_id: articleId, user_id: userId }
    });
    if (entry) return true;
    // Fall back to legacy author_id field
    const article = await magazine_article_model.findByPk(articleId, { attributes: ['author_id'] });
    return article && article.author_id == userId;
}

// Returns true if userId is a magazine super-admin (can edit/delete any article)
async function isUserSuperAdmin(userId) {
    if (!userId) return false;
    const user = await user_model.findByPk(userId, { attributes: ['is_super_admin'] });
    return user && (user.is_super_admin === true || user.is_super_admin === 1);
}

async function getAll(req, res) {
    try {
        const { status, category, featured, project_id } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (category) filters.category = category;
        if (featured !== undefined) filters.featured = featured === 'true';
        if (project_id) filters.project_id = parseInt(project_id);

        const callerUser = await getRequestUser(req);
        const { error, data } = await magazineArticleController.getAll(filters, roleSnapshot(callerUser));
        res.json({ error, data });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - getAll() - Error =", err);
        res.status(500).json({
            error: "Error al obtener los artículos",
            details: err.message
        });
    }
}

async function getById(req, res) {
    try {
        const { id_article } = req.params;

        if (!id_article) {
            return res.status(400).json({
                error: 'El ID del artículo es obligatorio'
            });
        }

        const callerUser = await getRequestUser(req);
        const { error, data } = await magazineArticleController.getById(id_article, roleSnapshot(callerUser));

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error, data });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - getById() - Error =", err);
        res.status(500).json({
            error: "Error al obtener el artículo",
            details: err.message
        });
    }
}

async function getByCategory(req, res) {
    try {
        const { category } = req.params;

        if (!category) {
            return res.status(400).json({
                error: 'La categoría es obligatoria'
            });
        }

        const callerUser = await getRequestUser(req);
        const { error, data, message } = await magazineArticleController.getByCategory(category, roleSnapshot(callerUser));
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - getByCategory() - Error =", err);
        res.status(500).json({
            error: "Error al obtener artículos por categoría",
            details: err.message
        });
    }
}

async function getFeatured(req, res) {
    try {
        const callerUser = await getRequestUser(req);
        const { error, data, message } = await magazineArticleController.getFeatured(roleSnapshot(callerUser));
        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - getFeatured() - Error =", err);
        res.status(500).json({
            error: "Error al obtener artículos destacados",
            details: err.message
        });
    }
}

async function create(req, res) {
    try {
        const {
            title_article,
            content_article,
            excerpt_article,
            author_id,
            author_name,
            authors,
            project_id,
            cover_image_article,
            category_article,
            tags_article,
            date_published,
            status_article,
            featured_article,
            is_premium
        } = req.body;

        if (!title_article || !content_article) {
            return res.status(400).json({
                error: 'El título y el contenido son obligatorios',
                missingFields: {
                    title_article: !title_article,
                    content_article: !content_article
                }
            });
        }

        const articleData = {
            title_article,
            content_article,
            excerpt_article: excerpt_article || null,
            author_id: author_id || null,
            author_name: author_name || null,
            authors: authors || null,
            project_id: project_id || null,
            cover_image_article: cover_image_article || null,
            category_article: category_article || 'general',
            tags_article: tags_article || null,
            date_published: date_published || null,
            status_article: status_article || 'draft',
            featured_article: featured_article || false,
            is_premium: is_premium || false
        };

        const callerUser = await getRequestUser(req);
        const { error, data, success } = await magazineArticleController.create(articleData, roleSnapshot(callerUser));

        if (error) {
            return res.status(400).json({ error, details: data });
        }

        res.json({ error, data, success });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - create() - Error =", err);
        res.status(500).json({
            error: "Error al crear el artículo",
            details: err.message
        });
    }
}

async function update(req, res) {
    try {
        const { id_article } = req.params;

        if (!id_article) {
            return res.status(400).json({
                error: 'El ID del artículo es obligatorio'
            });
        }

        const requestorUserId = req.headers['x-user-id'];
        const superAdmin = await isUserSuperAdmin(requestorUserId);
        if (!superAdmin && !await isArticleAuthor(id_article, requestorUserId)) {
            return res.status(403).json({ error: 'No tienes permiso para editar este artículo' });
        }

        const {
            title_article,
            content_article,
            excerpt_article,
            author_id,
            author_name,
            authors,
            project_id,
            cover_image_article,
            category_article,
            tags_article,
            date_published,
            status_article,
            featured_article,
            active_article,
            is_premium
        } = req.body;

        const updateData = {};
        if (title_article !== undefined) updateData.title_article = title_article;
        if (content_article !== undefined) updateData.content_article = content_article;
        if (excerpt_article !== undefined) updateData.excerpt_article = excerpt_article;
        if (author_id !== undefined) updateData.author_id = author_id;
        if (author_name !== undefined) updateData.author_name = author_name;
        if (authors !== undefined) updateData.authors = authors;
        if (project_id !== undefined) updateData.project_id = project_id || null;
        if (cover_image_article !== undefined) updateData.cover_image_article = cover_image_article;
        if (category_article !== undefined) updateData.category_article = category_article;
        if (tags_article !== undefined) updateData.tags_article = tags_article;
        if (date_published !== undefined) updateData.date_published = date_published;
        if (status_article !== undefined) updateData.status_article = status_article;
        if (featured_article !== undefined) updateData.featured_article = featured_article;
        if (active_article !== undefined) updateData.active_article = active_article;
        if (is_premium !== undefined) updateData.is_premium = is_premium;

        const callerUser = await getRequestUser(req);
        const { error, data, success } = await magazineArticleController.update(id_article, updateData, roleSnapshot(callerUser));

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data, success });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - update() - Error =", err);
        res.status(500).json({
            error: "Error al actualizar el artículo",
            details: err.message
        });
    }
}

async function removeById(req, res) {
    try {
        const { id_article } = req.params;

        if (!id_article) {
            return res.status(400).json({
                error: 'El ID del artículo es obligatorio'
            });
        }

        const requestorUserId = req.headers['x-user-id'];
        const superAdmin = await isUserSuperAdmin(requestorUserId);
        if (!superAdmin && !await isArticleAuthor(id_article, requestorUserId)) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este artículo' });
        }

        const { error, data, message } = await magazineArticleController.removeById(id_article);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ data, message, error });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - removeById() - Error =", err);
        res.status(500).json({
            error: "Error al eliminar el artículo",
            details: err.message
        });
    }
}

async function uploadCoverImage(req, res) {
    try {
        const articleId = req.headers['x-article-id'];

        if (!articleId) {
            return res.status(400).json({
                error: 'El ID del artículo es obligatorio'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No se ha subido ningún archivo'
            });
        }

        // Extract relative path from the full file path
        const filePath = req.file.path;
        const backendIndex = filePath.indexOf('back-end');

        if (backendIndex === -1) {
            console.error('No se encontró back-end en la ruta:', filePath);
            return res.status(500).json({
                error: 'Estructura de ruta de archivo inválida'
            });
        }

        // Get path starting from 'uploads' (served by express.static)
        const uploadsIndex = filePath.indexOf('uploads', backendIndex);
        if (uploadsIndex === -1) {
            console.error('No se encontró uploads en la ruta:', filePath);
            return res.status(500).json({
                error: 'Estructura de ruta de archivo inválida'
            });
        }

        const relativePath = filePath.substring(uploadsIndex).replace(/\\/g, '/');

        console.log('Subiendo imagen de portada - Construcción de ruta:', {
            fullPath: filePath,
            relativePath: relativePath,
            filename: req.file.filename
        });

        const { error, data, message } = await magazineArticleController.uploadCoverImage(articleId, relativePath);

        if (error) {
            return res.status(500).json({ error });
        }

        res.json({ error: null, data, message });
    } catch (err) {
        console.error('Error al subir imagen de portada:', err);
        res.status(500).json({
            error: 'Error al subir la imagen de portada',
            details: err.message
        });
    }
}

async function removeCoverImage(req, res) {
    try {
        const { id_article } = req.params;

        if (!id_article) {
            return res.status(400).json({
                error: 'El ID del artículo es obligatorio'
            });
        }

        const { error, data, message } = await magazineArticleController.removeCoverImage(id_article);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error: null, data, message });
    } catch (err) {
        console.error('Error al eliminar imagen de portada:', err);
        res.status(500).json({
            error: 'Error al eliminar la imagen de portada',
            details: err.message
        });
    }
}

async function deactivate(req, res) {
    try {
        const { id_article } = req.params;

        if (!id_article) {
            return res.status(400).json({
                error: 'El ID del artículo es obligatorio'
            });
        }

        const { error, data, message } = await magazineArticleController.deactivate(id_article);

        if (error) {
            return res.status(400).json({ error });
        }

        res.json({ error, data, message });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - deactivate() - Error =", err);
        res.status(500).json({
            error: "Error al desactivar el artículo",
            details: err.message
        });
    }
}

async function trackView(req, res) {
    try {
        const { id_article } = req.params;

        if (!id_article) {
            return res.status(400).json({ error: 'El ID del artículo es obligatorio' });
        }

        const { error, success, view_count_article } = await magazineArticleController.trackView(id_article);

        if (error) {
            return res.status(404).json({ error });
        }

        res.json({ error: null, success, view_count_article });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - trackView() - Error =", err);
        res.status(500).json({ error: "Error al registrar visita", details: err.message });
    }
}

async function getEditors(req, res) {
    try {
        const { error, data } = await magazineArticleController.getEditors();

        if (error) {
            return res.status(500).json({ error });
        }

        res.json({ error: null, data });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - getEditors() - Error =", err);
        res.status(500).json({
            error: "Error al obtener editores",
            details: err.message
        });
    }
}

async function inviteCoAuthor(req, res) {
    try {
        const inviterUserId = req.headers['x-user-id'];
        const { article_id, invitee_user_id } = req.body;

        if (!inviterUserId) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }
        if (!article_id || !invitee_user_id) {
            return res.status(400).json({ error: 'Se requieren article_id e invitee_user_id' });
        }
        if (parseInt(inviterUserId) === parseInt(invitee_user_id)) {
            return res.status(400).json({ error: 'No puedes invitarte a ti mismo' });
        }

        // Check inviter is an author of the article (or a super-admin)
        const inviterIsSuperAdmin = await isUserSuperAdmin(inviterUserId);
        if (!inviterIsSuperAdmin && !await isArticleAuthor(article_id, inviterUserId)) {
            return res.status(403).json({ error: 'Solo los autores del artículo pueden invitar co-autores' });
        }

        // Check invitee is an editor
        const invitee = await user_model.findByPk(invitee_user_id, {
            attributes: ['id_user', 'is_editor', 'is_admin', 'is_super_admin', 'name_user']
        });
        const truthy = (v) => v === true || v === 1;
        const inviteeCanCreate = invitee && (truthy(invitee.is_editor) || truthy(invitee.is_admin) || truthy(invitee.is_super_admin));
        if (!inviteeCanCreate) {
            return res.status(400).json({ error: 'Solo se puede invitar a usuarios con rol de editor o admin' });
        }

        // Check invitee is not already an author
        if (await isArticleAuthor(article_id, invitee_user_id)) {
            return res.status(400).json({ error: 'Este editor ya es autor del artículo' });
        }

        // Check for existing invitation (pending or accepted)
        const existing = await article_author_invitation_model.findOne({
            where: { article_id, invitee_user_id }
        });
        if (existing) {
            if (existing.status === 'pending') {
                return res.status(400).json({ error: 'Ya existe una invitación pendiente para este editor' });
            }
            if (existing.status === 'accepted') {
                return res.status(400).json({ error: 'Este editor ya aceptó una invitación previa' });
            }
            // If rejected, allow re-inviting by updating the record
            await existing.update({ status: 'pending', inviter_user_id: inviterUserId });
            return res.json({ error: null, success: `Invitación reenviada a ${invitee.name_user}` });
        }

        await article_author_invitation_model.create({
            article_id,
            inviter_user_id: inviterUserId,
            invitee_user_id
        });

        res.json({ error: null, success: `Invitación enviada a ${invitee.name_user}` });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - inviteCoAuthor() - Error =", err);
        res.status(500).json({ error: "Error al enviar la invitación", details: err.message });
    }
}

async function getPendingInvitations(req, res) {
    try {
        const userId = req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }

        const invitations = await article_author_invitation_model.findAll({
            where: { invitee_user_id: userId, status: 'pending' },
            include: [
                {
                    model: magazine_article_model,
                    as: 'article',
                    attributes: ['id_article', 'title_article']
                },
                {
                    model: user_model,
                    as: 'inviter',
                    attributes: ['id_user', 'name_user']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ error: null, data: invitations });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - getPendingInvitations() - Error =", err);
        res.status(500).json({ error: "Error al obtener invitaciones", details: err.message });
    }
}

async function respondToInvitation(req, res) {
    try {
        const userId = req.headers['x-user-id'];
        const { id } = req.params;
        const { response } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }
        if (!response || !['accepted', 'rejected'].includes(response)) {
            return res.status(400).json({ error: 'La respuesta debe ser "accepted" o "rejected"' });
        }

        const invitation = await article_author_invitation_model.findByPk(id);
        if (!invitation) {
            return res.status(404).json({ error: 'Invitación no encontrada' });
        }
        if (parseInt(invitation.invitee_user_id) !== parseInt(userId)) {
            return res.status(403).json({ error: 'No tienes permiso para responder esta invitación' });
        }
        if (invitation.status !== 'pending') {
            return res.status(400).json({ error: 'Esta invitación ya fue respondida' });
        }

        await invitation.update({ status: response });

        if (response === 'accepted') {
            // Count existing authors to determine order
            const count = await article_author_model.count({ where: { article_id: invitation.article_id } });
            await article_author_model.create({
                article_id: invitation.article_id,
                user_id: invitation.invitee_user_id,
                author_order: count
            });
            return res.json({ error: null, success: 'Invitación aceptada. Ahora eres co-autor de este artículo.' });
        }

        res.json({ error: null, success: 'Invitación rechazada.' });
    } catch (err) {
        console.error("-> magazine_article_api_controller.js - respondToInvitation() - Error =", err);
        res.status(500).json({ error: "Error al responder la invitación", details: err.message });
    }
}

// ============================================================
// Editorial approval workflow (Permissions C)
// ============================================================

async function submitForApproval(req, res) {
    try {
        const { id_article } = req.params;
        if (!id_article) return res.status(400).json({ error: 'El ID del artículo es obligatorio' });

        const callerUser = await getRequestUser(req);
        if (!callerUser) return res.status(401).json({ error: 'Autenticación requerida' });

        const result = await magazineArticleController.submitForApproval(id_article, roleSnapshot(callerUser));
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> submitForApproval API - Error =', err);
        res.status(500).json({ error: 'Error al enviar el artículo para aprobación', details: err.message });
    }
}

async function approveArticle(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return; // requireSuperAdmin already wrote 403
        const { id_article } = req.params;
        if (!id_article) return res.status(400).json({ error: 'El ID del artículo es obligatorio' });
        const result = await magazineArticleController.approveArticle(id_article);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> approveArticle API - Error =', err);
        res.status(500).json({ error: 'Error al aprobar el artículo', details: err.message });
    }
}

async function rejectArticle(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const { id_article } = req.params;
        if (!id_article) return res.status(400).json({ error: 'El ID del artículo es obligatorio' });
        const result = await magazineArticleController.rejectArticle(id_article);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        console.error('-> rejectArticle API - Error =', err);
        res.status(500).json({ error: 'Error al rechazar el artículo', details: err.message });
    }
}

async function getPending(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return;
        const result = await magazineArticleController.getPending();
        res.json({ error: null, ...result });
    } catch (err) {
        console.error('-> getPending API - Error =', err);
        res.status(500).json({ error: 'Error al obtener artículos pendientes', details: err.message });
    }
}

export default {
    getAll,
    getById,
    getByCategory,
    getFeatured,
    create,
    update,
    removeById,
    uploadCoverImage,
    removeCoverImage,
    deactivate,
    getEditors,
    trackView,
    inviteCoAuthor,
    getPendingInvitations,
    respondToInvitation,
    submitForApproval,
    approveArticle,
    rejectArticle,
    getPending
};
