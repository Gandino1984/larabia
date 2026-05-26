// back-end/controllers/magazine_article/magazine_article_controller.js
import magazine_article_model from "../../models/magazine_article_model.js";
import article_block_model from "../../models/article_block_model.js";
import article_author_model from "../../models/article_author_model.js";
import user_model from "../../models/user_model.js";
import magazine_project_model from "../../models/magazine_project_model.js";
import { Op } from "sequelize";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { deleteFile, cleanupArticleImages, cleanupBlockImages } from '../../utils/file_cleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function validateArticleData(articleData) {
    const errors = [];

    if (!articleData.title_article) {
        errors.push("El título es obligatorio");
    } else if (articleData.title_article.length > 255) {
        errors.push("El título no puede exceder 255 caracteres");
    }

    if (!articleData.content_article) {
        errors.push("El contenido es obligatorio");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

async function loadArticleAuthors(article) {
    try {
        const articleAuthors = await article_author_model.findAll({
            where: { article_id: article.id_article },
            include: [{
                model: user_model,
                as: 'user',
                attributes: ['id_user', 'name_user', 'image_user']
            }],
            order: [['author_order', 'ASC']]
        });

        return articleAuthors.map(aa => ({
            id_user: aa.user.id_user,
            name_user: aa.user.name_user,
            image_user: aa.user.image_user,
            author_order: aa.author_order
        }));
    } catch (err) {
        console.error("-> loadArticleAuthors() - Error =", err);
        return [];
    }
}

// Batch load authors for multiple articles in a single query (avoids N+1 pattern)
async function loadBatchArticleAuthors(articleIds) {
    if (!articleIds || articleIds.length === 0) return new Map();
    try {
        const articleAuthors = await article_author_model.findAll({
            where: { article_id: articleIds },
            include: [{
                model: user_model,
                as: 'user',
                attributes: ['id_user', 'name_user', 'image_user']
            }],
            order: [['article_id', 'ASC'], ['author_order', 'ASC']]
        });

        const authorsMap = new Map();
        for (const aa of articleAuthors) {
            if (!aa.user) continue;
            const list = authorsMap.get(aa.article_id) || [];
            list.push({
                id_user: aa.user.id_user,
                name_user: aa.user.name_user,
                image_user: aa.user.image_user,
                author_order: aa.author_order
            });
            authorsMap.set(aa.article_id, list);
        }
        return authorsMap;
    } catch (err) {
        console.error("-> loadBatchArticleAuthors() - Error =", err);
        return new Map();
    }
}

// Batch fetch legacy author users (single query instead of per-article fallback)
async function loadBatchLegacyAuthors(articles, authorsMap) {
    const legacyUserIds = [...new Set(
        articles
            .filter(a => !authorsMap.has(a.id_article) && a.author_id)
            .map(a => a.author_id)
    )];
    if (legacyUserIds.length === 0) return {};
    try {
        const users = await user_model.findAll({
            where: { id_user: legacyUserIds },
            attributes: ['id_user', 'name_user', 'image_user']
        });
        const map = {};
        for (const u of users) map[u.id_user] = u;
        return map;
    } catch (err) {
        console.error("-> loadBatchLegacyAuthors() - Error =", err);
        return {};
    }
}

async function getAll(filters = {}) {
    try {
        const whereClause = { active_article: true };

        // Apply status filter
        if (filters.status === 'all') {
            // No status filter - return all active articles (drafts + published)
        } else if (filters.status) {
            whereClause.status_article = filters.status;
        } else {
            // By default, only show published articles
            whereClause.status_article = 'published';
        }

        // Apply category filter
        if (filters.category) {
            whereClause.category_article = filters.category;
        }

        // Apply project filter
        if (filters.project_id) {
            whereClause.project_id = filters.project_id;
        }

        // Apply featured filter
        if (filters.featured !== undefined) {
            whereClause.featured_article = filters.featured;
        }

        // Fetch articles without blocks — blocks are large and only needed in detail view (getById)
        const articles = await magazine_article_model.findAll({
            where: whereClause,
            order: [['date_published', 'DESC']]
        });

        if (!articles || articles.length === 0) {
            return { error: "No hay artículos disponibles", data: [] };
        }

        const articleIds = articles.map(a => a.id_article);

        // Batch fetch: projects, authors, and legacy authors — 3 queries total regardless of article count
        const projectIds = [...new Set(articles.map(a => a.project_id).filter(Boolean))];
        const projectMap = {};
        if (projectIds.length > 0) {
            const projects = await magazine_project_model.findAll({
                where: { id_project: projectIds },
                attributes: ['id_project', 'title_project']
            });
            for (const p of projects) {
                projectMap[p.id_project] = p.title_project;
            }
        }

        const authorsMap = await loadBatchArticleAuthors(articleIds);
        const legacyUsersMap = await loadBatchLegacyAuthors(articles, authorsMap);

        const articlesWithDetails = articles.map(article => {
            const authors = authorsMap.get(article.id_article) || [];
            const legacyUser = authors.length === 0 && article.author_id
                ? (legacyUsersMap[article.author_id] || null)
                : null;
            return {
                ...article.toJSON(),
                project_title: article.project_id ? (projectMap[article.project_id] || null) : null,
                authors,
                author: authors.length > 0 ? authors[0] : (legacyUser ? {
                    id_user: legacyUser.id_user,
                    name_user: legacyUser.name_user,
                    image_user: legacyUser.image_user
                } : null),
                author_name: authors.length > 0 ? authors[0].name_user : article.author_name
            };
        });

        console.log("-> magazine_article_controller.js - getAll() - Artículos encontrados =", articlesWithDetails.length);

        return { data: articlesWithDetails };
    } catch (err) {
        console.error("-> magazine_article_controller.js - getAll() - Error =", err);
        return { error: "Error al obtener artículos" };
    }
}

async function getById(id_article) {
    try {
        const article = await magazine_article_model.findByPk(id_article, {
            include: [{
                model: article_block_model,
                as: 'blocks',
                required: false
            }],
            order: [
                [{ model: article_block_model, as: 'blocks' }, 'block_order', 'ASC']
            ]
        });

        if (!article) {
            return { error: "Artículo no encontrado" };
        }

        if (!article.active_article) {
            return { error: "Artículo no disponible" };
        }

        // Get author details using multi-author system
        const authors = await loadArticleAuthors(article);

        // Legacy fallback: if no authors in junction table, use author_id
        let author = null;
        if (authors.length === 0 && article.author_id) {
            author = await user_model.findByPk(article.author_id);
        }

        let projectTitle = null;
        if (article.project_id) {
            const project = await magazine_project_model.findByPk(article.project_id, {
                attributes: ['id_project', 'title_project']
            });
            projectTitle = project ? project.title_project : null;
        }

        const articleWithDetails = {
            ...article.toJSON(),
            project_title: projectTitle,
            authors: authors.length > 0 ? authors : [],
            author: authors.length > 0 ? authors[0] : (author ? {
                id_user: author.id_user,
                name_user: author.name_user,
                image_user: author.image_user
            } : null),
            author_name: authors.length > 0 ? authors[0].name_user : article.author_name
        };

        return { data: articleWithDetails };
    } catch (err) {
        console.error("-> magazine_article_controller.js - getById() - Error =", err);
        return { error: "Error al obtener el artículo" };
    }
}

async function getByCategory(category) {
    try {
        if (!category) {
            return { error: "La categoría es obligatoria" };
        }

        const articles = await magazine_article_model.findAll({
            where: {
                category_article: category,
                status_article: 'published',
                active_article: true
            },
            order: [['date_published', 'DESC']]
        });

        if (!articles || articles.length === 0) {
            return { data: [], message: "No hay artículos en esta categoría" };
        }

        const categoryArticleIds = articles.map(a => a.id_article);

        const categoryProjectIds = [...new Set(articles.map(a => a.project_id).filter(Boolean))];
        const categoryProjectMap = {};
        if (categoryProjectIds.length > 0) {
            const projects = await magazine_project_model.findAll({
                where: { id_project: categoryProjectIds },
                attributes: ['id_project', 'title_project']
            });
            for (const p of projects) {
                categoryProjectMap[p.id_project] = p.title_project;
            }
        }

        const categoryAuthorsMap = await loadBatchArticleAuthors(categoryArticleIds);
        const categoryLegacyUsersMap = await loadBatchLegacyAuthors(articles, categoryAuthorsMap);

        const articlesWithDetails = articles.map(article => {
            const authors = categoryAuthorsMap.get(article.id_article) || [];
            const legacyUser = authors.length === 0 && article.author_id
                ? (categoryLegacyUsersMap[article.author_id] || null)
                : null;
            return {
                ...article.toJSON(),
                project_title: article.project_id ? (categoryProjectMap[article.project_id] || null) : null,
                authors,
                author: authors.length > 0 ? authors[0] : (legacyUser ? {
                    id_user: legacyUser.id_user,
                    name_user: legacyUser.name_user,
                    image_user: legacyUser.image_user
                } : null),
                author_name: authors.length > 0 ? authors[0].name_user : article.author_name
            };
        });

        return { data: articlesWithDetails };
    } catch (err) {
        console.error("-> magazine_article_controller.js - getByCategory() - Error =", err);
        return { error: "Error al obtener artículos por categoría" };
    }
}

async function getFeatured() {
    try {
        const articles = await magazine_article_model.findAll({
            where: {
                featured_article: true,
                status_article: 'published',
                active_article: true
            },
            order: [['date_published', 'DESC']],
            limit: 5
        });

        if (!articles || articles.length === 0) {
            return { data: [], message: "No hay artículos destacados" };
        }

        const featuredArticleIds = articles.map(a => a.id_article);

        const featuredProjectIds = [...new Set(articles.map(a => a.project_id).filter(Boolean))];
        const featuredProjectMap = {};
        if (featuredProjectIds.length > 0) {
            const projects = await magazine_project_model.findAll({
                where: { id_project: featuredProjectIds },
                attributes: ['id_project', 'title_project']
            });
            for (const p of projects) {
                featuredProjectMap[p.id_project] = p.title_project;
            }
        }

        const featuredAuthorsMap = await loadBatchArticleAuthors(featuredArticleIds);
        const featuredLegacyUsersMap = await loadBatchLegacyAuthors(articles, featuredAuthorsMap);

        const articlesWithDetails = articles.map(article => {
            const authors = featuredAuthorsMap.get(article.id_article) || [];
            const legacyUser = authors.length === 0 && article.author_id
                ? (featuredLegacyUsersMap[article.author_id] || null)
                : null;
            return {
                ...article.toJSON(),
                project_title: article.project_id ? (featuredProjectMap[article.project_id] || null) : null,
                authors,
                author: authors.length > 0 ? authors[0] : (legacyUser ? {
                    id_user: legacyUser.id_user,
                    name_user: legacyUser.name_user,
                    image_user: legacyUser.image_user
                } : null),
                author_name: authors.length > 0 ? authors[0].name_user : article.author_name
            };
        });

        return { data: articlesWithDetails };
    } catch (err) {
        console.error("-> magazine_article_controller.js - getFeatured() - Error =", err);
        return { error: "Error al obtener artículos destacados" };
    }
}

async function create(articleData) {
    try {
        const validation = validateArticleData(articleData);
        if (!validation.isValid) {
            return {
                error: "Validación fallida",
                details: validation.errors
            };
        }

        // Validate author if provided
        if (articleData.author_id) {
            const author = await user_model.findByPk(articleData.author_id);
            if (!author) {
                return { error: "El autor especificado no existe" };
            }
        }

        // If status is 'published', set publish date
        if (articleData.status_article === 'published' && !articleData.date_published) {
            articleData.date_published = new Date();
        }

        const article = await magazine_article_model.create(articleData);

        // Handle multi-author system
        if (articleData.authors && Array.isArray(articleData.authors) && articleData.authors.length > 0) {
            const authorPromises = articleData.authors.map((authorId, index) => {
                return article_author_model.create({
                    article_id: article.id_article,
                    user_id: authorId,
                    author_order: index
                });
            });
            await Promise.all(authorPromises);
            console.log(`✅ ${articleData.authors.length} autores asociados al artículo`);
        }

        console.log("✅ Artículo creado:", {
            id_article: article.id_article,
            title: article.title_article,
            status: article.status_article
        });

        // Reload article with authors to return complete data
        const authors = await loadArticleAuthors(article);
        const articleWithAuthors = {
            ...article.toJSON(),
            authors: authors.length > 0 ? authors : [],
            author: authors.length > 0 ? authors[0] : null,
            author_name: authors.length > 0 ? authors[0].name_user : articleData.author_name
        };

        return {
            success: article.status_article === 'published'
                ? "Artículo creado y publicado exitosamente"
                : "Artículo guardado como borrador",
            data: articleWithAuthors
        };
    } catch (err) {
        console.error("-> magazine_article_controller.js - create() - Error =", err);
        return { error: "Error al crear el artículo" };
    }
}

async function update(id_article, articleData) {
    try {
        const article = await magazine_article_model.findByPk(id_article);

        if (!article) {
            return { error: "Artículo no encontrado" };
        }

        // Validate title length if provided
        if (articleData.title_article && articleData.title_article.length > 255) {
            return { error: "El título no puede exceder 255 caracteres" };
        }

        // If changing status to published, set publish date
        if (articleData.status_article === 'published' && article.status_article === 'draft' && !articleData.date_published) {
            articleData.date_published = new Date();
        }

        await article.update(articleData);

        // Handle multi-author system update
        if (articleData.authors && Array.isArray(articleData.authors)) {
            // Remove existing author associations
            await article_author_model.destroy({ where: { article_id: id_article } });

            // Create new author associations
            if (articleData.authors.length > 0) {
                const authorPromises = articleData.authors.map((authorId, index) => {
                    return article_author_model.create({
                        article_id: id_article,
                        user_id: authorId,
                        author_order: index
                    });
                });
                await Promise.all(authorPromises);
                console.log(`✅ ${articleData.authors.length} autores actualizados para el artículo`);
            }
        }

        // Reload article with authors and project title to return complete data
        const updatedArticle = await magazine_article_model.findByPk(id_article);
        const authors = await loadArticleAuthors(updatedArticle);

        let updatedProjectTitle = null;
        if (updatedArticle.project_id) {
            const project = await magazine_project_model.findByPk(updatedArticle.project_id, {
                attributes: ['id_project', 'title_project']
            });
            updatedProjectTitle = project ? project.title_project : null;
        }

        const articleWithAuthors = {
            ...updatedArticle.toJSON(),
            project_title: updatedProjectTitle,
            authors: authors.length > 0 ? authors : [],
            author: authors.length > 0 ? authors[0] : null,
            author_name: authors.length > 0 ? authors[0].name_user : updatedArticle.author_name
        };

        return {
            data: articleWithAuthors,
            success: "Artículo actualizado exitosamente"
        };
    } catch (err) {
        console.error("-> magazine_article_controller.js - update() - Error =", err);
        return { error: "Error al actualizar el artículo" };
    }
}

async function removeById(id_article) {
    try {
        if (!id_article) {
            return { error: "ID del artículo no proporcionado" };
        }

        const article = await magazine_article_model.findByPk(id_article);

        if (!article) {
            return { error: "Artículo no encontrado" };
        }

        console.log("🗑️ Eliminando artículo:", {
            id: article.id_article,
            title: article.title_article,
            hasImage: !!article.cover_image_article
        });

        // Import article_block_model dynamically to avoid circular dependency
        const { default: article_block_model } = await import("../../models/article_block_model.js");

        // Fetch all blocks for this article before cascade deletion
        const blocks = await article_block_model.findAll({
            where: { article_id: id_article }
        });

        console.log(`📦 Encontrados ${blocks.length} bloques en el artículo`);

        // Delete all block images using utility
        let blockImagesDeleted = 0;
        let blockAudioDeleted = 0;

        for (const block of blocks) {
            // Delete block image
            if (block.image_url) {
                if (deleteFile(block.image_url)) {
                    blockImagesDeleted++;
                }
            }

            // Delete audio file for interactive audio panels
            if (block.is_interactive && block.interaction_type === 'audio' && block.interaction_data) {
                if (deleteFile(block.interaction_data)) {
                    blockAudioDeleted++;
                }
            }
        }

        // Delete article cover image using utility
        if (article.cover_image_article) {
            deleteFile(article.cover_image_article);
        }

        // Delete article (cascade will delete blocks automatically)
        await article.destroy();
        console.log("✅ Artículo eliminado de la base de datos (CASCADE: bloques también eliminados)");

        const deletionSummary = [
            `${blocks.length} bloques`,
            blockImagesDeleted > 0 ? `${blockImagesDeleted} imágenes` : null,
            blockAudioDeleted > 0 ? `${blockAudioDeleted} archivos de audio` : null,
            article.cover_image_article ? '1 imagen de portada' : null
        ].filter(Boolean).join(', ');

        return {
            data: id_article,
            message: `Artículo eliminado exitosamente (${deletionSummary} eliminados)`
        };
    } catch (err) {
        console.error("-> magazine_article_controller.js - removeById() - Error =", err);
        return { error: "Error al eliminar el artículo" };
    }
}

async function uploadCoverImage(id_article, imagePath) {
    try {
        const article = await magazine_article_model.findByPk(id_article);

        if (!article) {
            return { error: "Artículo no encontrado" };
        }

        // Delete old cover image only if it's a DIFFERENT file from the new one.
        // The upload middleware already replaces same-named files during rename,
        // so deleting here when paths match would destroy the newly uploaded file.
        if (article.cover_image_article && article.cover_image_article !== imagePath) {
            const backendDir = path.resolve(__dirname, '..', '..');
            const oldImagePath = path.join(backendDir, article.cover_image_article);

            try {
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                    console.log("✅ Imagen anterior eliminada:", oldImagePath);
                }
            } catch (deleteErr) {
                console.error("Error al eliminar imagen anterior:", deleteErr);
            }
        }

        console.log("Actualizando imagen de portada:", {
            id_article,
            imagePath
        });

        await article.update({ cover_image_article: imagePath });

        return {
            data: {
                id_article: id_article,
                cover_image_article: imagePath
            },
            message: "Imagen de portada actualizada correctamente"
        };
    } catch (err) {
        console.error("-> magazine_article_controller.js - uploadCoverImage() - Error =", err);
        return { error: "Error al actualizar la imagen de portada" };
    }
}

async function removeCoverImage(id_article) {
    try {
        const article = await magazine_article_model.findByPk(id_article);

        if (!article) {
            return { error: "Artículo no encontrado" };
        }

        if (article.cover_image_article) {
            const backendDir = path.resolve(__dirname, '..', '..');
            const imagePath = path.join(backendDir, article.cover_image_article);

            console.log("🖼️ Eliminando imagen de portada:", imagePath);

            try {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log("✅ Imagen eliminada exitosamente");
                } else {
                    console.warn("⚠️ Imagen no encontrada:", imagePath);
                }
            } catch (deleteErr) {
                console.error("❌ Error al eliminar imagen:", deleteErr);
                return { error: "Error al eliminar el archivo de imagen" };
            }
        }

        await article.update({ cover_image_article: null });

        return {
            data: {
                id_article: id_article,
                cover_image_article: null
            },
            message: "Imagen de portada eliminada correctamente"
        };
    } catch (err) {
        console.error("-> magazine_article_controller.js - removeCoverImage() - Error =", err);
        return { error: "Error al eliminar la imagen de portada" };
    }
}

// Soft delete - set active_article to false
async function deactivate(id_article) {
    try {
        const article = await magazine_article_model.findByPk(id_article);

        if (!article) {
            return { error: "Artículo no encontrado" };
        }

        await article.update({ active_article: false });

        return {
            data: article,
            message: "Artículo desactivado exitosamente"
        };
    } catch (err) {
        console.error("-> magazine_article_controller.js - deactivate() - Error =", err);
        return { error: "Error al desactivar el artículo" };
    }
}

async function getEditors() {
    try {
        const editors = await user_model.findAll({
            where: { is_editor: true },
            attributes: ['id_user', 'name_user', 'image_user'],
            order: [['name_user', 'ASC']]
        });

        console.log(`-> magazine_article_controller.js - getEditors() - Encontrados ${editors.length} editores`);

        return { data: editors };
    } catch (err) {
        console.error("-> magazine_article_controller.js - getEditors() - Error =", err);
        return { error: "Error al obtener editores" };
    }
}

async function trackView(id_article) {
    try {
        const article = await magazine_article_model.findByPk(id_article, {
            attributes: ['id_article', 'view_count_article', 'active_article']
        });

        if (!article || !article.active_article) {
            return { error: "Artículo no encontrado" };
        }

        await article.update({
            view_count_article: article.view_count_article + 1
        });

        return { success: true, view_count_article: article.view_count_article + 1 };
    } catch (err) {
        console.error("-> magazine_article_controller.js - trackView() - Error =", err);
        return { error: "Error al registrar visita" };
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
    trackView
};
