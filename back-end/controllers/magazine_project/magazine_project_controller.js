// back-end/controllers/magazine_project/magazine_project_controller.js
import magazine_project_model from "../../models/magazine_project_model.js";
import magazine_article_model from "../../models/magazine_article_model.js";
import user_model from "../../models/user_model.js";
import project_author_model from "../../models/project_author_model.js";
import { Op } from "sequelize";
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a mysql2 connection pool
// Note: charset is set per-connection via SET NAMES to ensure UTF-8
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
});

// Helper function to escape and quote SQL values
function escapeSQLValue(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    if (value instanceof Date) {
        return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    // For strings, escape single quotes and wrap in quotes
    const escaped = String(value).replace(/'/g, "''");
    return `'${escaped}'`;
}

function validateProjectData(projectData) {
    const errors = [];

    if (!projectData.title_project) {
        errors.push("El título es obligatorio");
    } else if (projectData.title_project.length > 255) {
        errors.push("El título no puede exceder 255 caracteres");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

async function loadProjectAuthors(projectId) {
    const rows = await project_author_model.findAll({
        where: { project_id: projectId },
        include: [{
            model: user_model,
            as: 'user',
            attributes: ['id_user', 'name_user', 'image_user']
        }],
        order: [['author_order', 'ASC']]
    });
    return rows.map(pa => ({
        id_user: pa.user.id_user,
        name_user: pa.user.name_user,
        image_user: pa.user.image_user,
        author_order: pa.author_order
    }));
}

async function getAll(filters = {}) {
    try {
        const whereClause = { active_project: true };

        // Apply status filter
        if (filters.status) {
            whereClause.status_project = filters.status;
        } else {
            // By default, only show published projects
            whereClause.status_project = 'published';
        }

        // Apply type filter
        if (filters.type) {
            whereClause.type_project = filters.type;
        }

        // Apply format filter
        if (filters.format) {
            whereClause.format_project = filters.format;
        }

        // Apply featured filter
        if (filters.featured !== undefined) {
            whereClause.featured_project = filters.featured;
        }

        const projects = await magazine_project_model.findAll({
            where: whereClause,
            order: [['date_published', 'DESC']]
        });

        if (!projects || projects.length === 0) {
            return { error: "No hay proyectos disponibles", data: [] };
        }

        // Add author details and article count
        const projectsWithDetails = [];
        for (const project of projects) {
            const authors = await loadProjectAuthors(project.id_project);

            // Count articles in this project
            const articleCount = await magazine_article_model.count({
                where: {
                    project_id: project.id_project,
                    status_article: 'published',
                    active_article: true
                }
            });

            projectsWithDetails.push({
                ...project.toJSON(),
                authors,
                article_count: articleCount
            });
        }

        console.log("-> magazine_project_controller.js - getAll() - Proyectos encontrados =", projectsWithDetails.length);

        return { data: projectsWithDetails };
    } catch (err) {
        console.error("-> magazine_project_controller.js - getAll() - Error =", err);
        return { error: "Error al obtener proyectos" };
    }
}

async function getById(id_project) {
    try {
        const project = await magazine_project_model.findByPk(id_project);

        if (!project) {
            return { error: "Proyecto no encontrado" };
        }

        if (!project.active_project) {
            return { error: "Proyecto no disponible" };
        }

        // Increment view count
        await project.update({
            view_count_project: project.view_count_project + 1
        });

        // Get authors
        const authors = await loadProjectAuthors(id_project);

        // Get articles in this project
        const articles = await magazine_article_model.findAll({
            where: {
                project_id: id_project,
                status_article: 'published',
                active_article: true
            },
            order: [['date_published', 'DESC']]
        });

        const projectWithDetails = {
            ...project.toJSON(),
            authors,
            articles: articles.map(article => ({
                id_article: article.id_article,
                title_article: article.title_article,
                excerpt_article: article.excerpt_article,
                cover_image_article: article.cover_image_article,
                date_published: article.date_published
            })),
            article_count: articles.length
        };

        return { data: projectWithDetails };
    } catch (err) {
        console.error("-> magazine_project_controller.js - getById() - Error =", err);
        return { error: "Error al obtener el proyecto" };
    }
}

async function getByType(type) {
    try {
        if (!type) {
            return { error: "El tipo es obligatorio" };
        }

        const projects = await magazine_project_model.findAll({
            where: {
                type_project: type,
                status_project: 'published',
                active_project: true
            },
            order: [['date_published', 'DESC']]
        });

        if (!projects || projects.length === 0) {
            return { data: [], message: "No hay proyectos de este tipo" };
        }

        const projectsWithDetails = [];
        for (const project of projects) {
            const authors = await loadProjectAuthors(project.id_project);

            const articleCount = await magazine_article_model.count({
                where: {
                    project_id: project.id_project,
                    status_article: 'published',
                    active_article: true
                }
            });

            projectsWithDetails.push({
                ...project.toJSON(),
                authors,
                article_count: articleCount
            });
        }

        return { data: projectsWithDetails };
    } catch (err) {
        console.error("-> magazine_project_controller.js - getByType() - Error =", err);
        return { error: "Error al obtener proyectos por tipo" };
    }
}

async function getByFormat(format) {
    try {
        if (!format) {
            return { error: "El formato es obligatorio" };
        }

        const projects = await magazine_project_model.findAll({
            where: {
                format_project: format,
                status_project: 'published',
                active_project: true
            },
            order: [['date_published', 'DESC']]
        });

        if (!projects || projects.length === 0) {
            return { data: [], message: "No hay proyectos con este formato" };
        }

        const projectsWithDetails = [];
        for (const project of projects) {
            const authors = await loadProjectAuthors(project.id_project);

            const articleCount = await magazine_article_model.count({
                where: {
                    project_id: project.id_project,
                    status_article: 'published',
                    active_article: true
                }
            });

            projectsWithDetails.push({
                ...project.toJSON(),
                authors,
                article_count: articleCount
            });
        }

        return { data: projectsWithDetails };
    } catch (err) {
        console.error("-> magazine_project_controller.js - getByFormat() - Error =", err);
        return { error: "Error al obtener proyectos por formato" };
    }
}

async function getFeatured() {
    try {
        const projects = await magazine_project_model.findAll({
            where: {
                featured_project: true,
                status_project: 'published',
                active_project: true
            },
            order: [['date_published', 'DESC']],
            limit: 5
        });

        if (!projects || projects.length === 0) {
            return { data: [], message: "No hay proyectos destacados" };
        }

        const projectsWithDetails = [];
        for (const project of projects) {
            const authors = await loadProjectAuthors(project.id_project);

            const articleCount = await magazine_article_model.count({
                where: {
                    project_id: project.id_project,
                    status_article: 'published',
                    active_article: true
                }
            });

            projectsWithDetails.push({
                ...project.toJSON(),
                authors,
                article_count: articleCount
            });
        }

        return { data: projectsWithDetails };
    } catch (err) {
        console.error("-> magazine_project_controller.js - getFeatured() - Error =", err);
        return { error: "Error al obtener proyectos destacados" };
    }
}

async function create(projectData) {
    try {
        const validation = validateProjectData(projectData);
        if (!validation.isValid) {
            return {
                error: "Validación fallida",
                details: validation.errors
            };
        }

        // Validate author if provided
        if (projectData.author_id) {
            const author = await user_model.findByPk(projectData.author_id);
            if (!author) {
                return { error: "El autor especificado no existe" };
            }
        }

        // If status is 'published', set publish date
        if (projectData.status_project === 'published' && !projectData.date_published) {
            projectData.date_published = new Date();
        }

        // Use mysql2 directly with proper UTF-8 charset to bypass encoding issues
        const now = new Date();

        console.log("📝 Creating project with values:", {
            title: projectData.title_project,
            type: projectData.type_project,
            format: projectData.format_project
        });

        // Check Unicode normalization and byte representation
        if (projectData.type_project) {
            console.log("🔍 type_project analysis:");
            console.log("  - String:", projectData.type_project);
            console.log("  - Length:", projectData.type_project.length);
            console.log("  - Bytes (hex):", Buffer.from(projectData.type_project, 'utf8').toString('hex'));
            console.log("  - NFC form:", projectData.type_project.normalize('NFC'));
            console.log("  - NFD form:", projectData.type_project.normalize('NFD'));
        }
        if (projectData.format_project) {
            console.log("🔍 format_project analysis:");
            console.log("  - String:", projectData.format_project);
            console.log("  - Length:", projectData.format_project.length);
            console.log("  - Bytes (hex):", Buffer.from(projectData.format_project, 'utf8').toString('hex'));
            console.log("  - NFC form:", projectData.format_project.normalize('NFC'));
            console.log("  - NFD form:", projectData.format_project.normalize('NFD'));
        }

        // Get a connection and set charset explicitly to match table collation
        const connection = await pool.getConnection();
        let result;
        try {
            // Set charset and collation to match the table (utf8mb4_unicode_ci)
            await connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");

            // Build query with direct value interpolation to avoid prepared statement encoding issues
            const queryWithValues = `
                INSERT INTO magazine_projects (
                    title_project,
                    description_project,
                    author_id,
                    author_name,
                    cover_image_project,
                    type_project,
                    format_project,
                    date_published,
                    status_project,
                    featured_project,
                    view_count_project,
                    active_project,
                    created_at,
                    updated_at
                ) VALUES (
                    ${escapeSQLValue(projectData.title_project)},
                    ${escapeSQLValue(projectData.description_project || null)},
                    ${escapeSQLValue(projectData.author_id || null)},
                    ${escapeSQLValue(projectData.author_name || null)},
                    ${escapeSQLValue(projectData.cover_image_project || null)},
                    ${escapeSQLValue(projectData.type_project || null)},
                    ${escapeSQLValue(projectData.format_project || null)},
                    ${escapeSQLValue(projectData.date_published || null)},
                    ${escapeSQLValue(projectData.status_project || 'draft')},
                    ${escapeSQLValue(projectData.featured_project || false)},
                    ${escapeSQLValue(0)},
                    ${escapeSQLValue(true)},
                    ${escapeSQLValue(now)},
                    ${escapeSQLValue(now)}
                )
            `;

            console.log("🔤 Executing query:", queryWithValues);

            // Use query() instead of execute() to avoid prepared statement encoding issues
            [result] = await connection.query(queryWithValues);
        } finally {
            connection.release();
        }

        // Fetch the created project
        const project = await magazine_project_model.findByPk(result.insertId);

        // Insert authors into junction table
        const authorsToInsert = projectData.authors && projectData.authors.length > 0
            ? projectData.authors
            : (projectData.author_id ? [{ user_id: projectData.author_id }] : []);

        if (authorsToInsert.length > 0) {
            const now2 = new Date();
            const authorRecords = authorsToInsert.map((a, index) => ({
                project_id: project.id_project,
                user_id: a.user_id || a.id_user,
                author_order: a.author_order !== undefined ? a.author_order : index,
                created_at: now2,
                updated_at: now2
            }));
            await project_author_model.bulkCreate(authorRecords, { ignoreDuplicates: true });
        }

        console.log("✅ Proyecto creado:", {
            id_project: project.id_project,
            title: project.title_project,
            status: project.status_project
        });

        return {
            success: project.status_project === 'published'
                ? "Proyecto creado y publicado exitosamente"
                : "Proyecto guardado como borrador",
            data: project
        };
    } catch (err) {
        console.error("-> magazine_project_controller.js - create() - Error =", err);
        return { error: "Error al crear el proyecto" };
    }
}

async function update(id_project, projectData) {
    try {
        const project = await magazine_project_model.findByPk(id_project);

        if (!project) {
            return { error: "Proyecto no encontrado" };
        }

        // Validate title length if provided
        if (projectData.title_project && projectData.title_project.length > 255) {
            return { error: "El título no puede exceder 255 caracteres" };
        }

        // If changing status to published, set publish date
        if (projectData.status_project === 'published' && project.status_project === 'draft' && !projectData.date_published) {
            projectData.date_published = new Date();
        }

        // Build dynamic UPDATE query using mysql2 directly
        const updateFields = [];
        const values = [];

        if (projectData.title_project !== undefined) {
            updateFields.push('title_project = ?');
            values.push(projectData.title_project);
        }
        if (projectData.description_project !== undefined) {
            updateFields.push('description_project = ?');
            values.push(projectData.description_project);
        }
        if (projectData.author_id !== undefined) {
            updateFields.push('author_id = ?');
            values.push(projectData.author_id);
        }
        if (projectData.author_name !== undefined) {
            updateFields.push('author_name = ?');
            values.push(projectData.author_name);
        }
        if (projectData.cover_image_project !== undefined) {
            updateFields.push('cover_image_project = ?');
            values.push(projectData.cover_image_project);
        }
        if (projectData.type_project !== undefined) {
            updateFields.push('type_project = ?');
            values.push(projectData.type_project);
        }
        if (projectData.format_project !== undefined) {
            updateFields.push('format_project = ?');
            values.push(projectData.format_project);
        }
        if (projectData.date_published !== undefined) {
            updateFields.push('date_published = ?');
            values.push(projectData.date_published);
        }
        if (projectData.status_project !== undefined) {
            updateFields.push('status_project = ?');
            values.push(projectData.status_project);
        }
        if (projectData.featured_project !== undefined) {
            updateFields.push('featured_project = ?');
            values.push(projectData.featured_project);
        }

        // Always update updated_at
        updateFields.push('updated_at = ?');
        values.push(new Date());

        // Add id_project for WHERE clause
        values.push(id_project);

        const query = `
            UPDATE magazine_projects
            SET ${updateFields.join(', ')}
            WHERE id_project = ?
        `;

        // Get a connection and set charset explicitly to match table collation
        const connection = await pool.getConnection();
        try {
            // Set charset and collation to match the table (utf8mb4_unicode_ci)
            await connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");

            // Execute the UPDATE
            await connection.execute(query, values);
        } finally {
            connection.release();
        }

        const updatedProject = await magazine_project_model.findByPk(id_project);

        // Sync authors in junction table if provided
        if (projectData.authors !== undefined) {
            await project_author_model.destroy({ where: { project_id: id_project } });
            if (projectData.authors.length > 0) {
                const now2 = new Date();
                const authorRecords = projectData.authors.map((a, index) => ({
                    project_id: id_project,
                    user_id: a.user_id || a.id_user,
                    author_order: a.author_order !== undefined ? a.author_order : index,
                    created_at: now2,
                    updated_at: now2
                }));
                await project_author_model.bulkCreate(authorRecords, { ignoreDuplicates: true });
            }
        }

        return {
            data: updatedProject,
            success: "Proyecto actualizado exitosamente"
        };
    } catch (err) {
        console.error("-> magazine_project_controller.js - update() - Error =", err);
        return { error: "Error al actualizar el proyecto" };
    }
}

async function removeById(id_project) {
    try {
        if (!id_project) {
            return { error: "ID del proyecto no proporcionado" };
        }

        const project = await magazine_project_model.findByPk(id_project);

        if (!project) {
            return { error: "Proyecto no encontrado" };
        }

        console.log("🗑️ Eliminando proyecto:", {
            id: project.id_project,
            title: project.title_project,
            hasImage: !!project.cover_image_project
        });

        const backendDir = path.resolve(__dirname, '..', '..');

        // Import article_block_model dynamically to avoid circular dependency
        const { default: article_block_model } = await import("../../models/article_block_model.js");

        // Fetch all articles and their blocks before cascade deletion
        const articles = await magazine_article_model.findAll({
            where: { project_id: id_project },
            include: [{
                model: article_block_model,
                as: 'blocks',
                required: false
            }]
        });

        console.log(`📄 Encontrados ${articles.length} artículos en el proyecto`);

        // Clean up all article cover images and block images
        let totalImagesDeleted = 0;
        for (const article of articles) {
            // Delete article cover image
            if (article.cover_image_article) {
                const imagePath = path.join(backendDir, article.cover_image_article);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        totalImagesDeleted++;
                        console.log(`✅ Imagen de artículo eliminada: ${article.cover_image_article}`);
                    } catch (err) {
                        console.error(`❌ Error al eliminar imagen de artículo:`, err);
                    }
                }
            }

            // Delete block images
            if (article.blocks && article.blocks.length > 0) {
                for (const block of article.blocks) {
                    if (block.image_url) {
                        // Handle both relative paths and full URLs
                        let relativePath = block.image_url;
                        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
                            try {
                                const url = new URL(relativePath);
                                relativePath = url.pathname.substring(1); // Remove leading /
                            } catch (e) {
                                console.error("Error parsing URL:", e);
                            }
                        }

                        const imagePath = path.join(backendDir, relativePath);
                        if (fs.existsSync(imagePath)) {
                            try {
                                fs.unlinkSync(imagePath);
                                totalImagesDeleted++;
                                console.log(`✅ Imagen de bloque eliminada: ${relativePath}`);
                            } catch (err) {
                                console.error(`❌ Error al eliminar imagen de bloque:`, err);
                            }
                        }
                    }
                }
            }
        }

        console.log(`🖼️ Total de imágenes de artículos/bloques eliminadas: ${totalImagesDeleted}`);

        // Delete project cover image
        if (project.cover_image_project) {
            const imagePath = path.join(backendDir, project.cover_image_project);

            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log("✅ Imagen de portada del proyecto eliminada");
                } catch (err) {
                    console.error("❌ Error al eliminar imagen de portada:", err);
                }
            }
        }

        // Delete project (cascade will delete articles and blocks automatically)
        await project.destroy();
        console.log("✅ Proyecto eliminado de la base de datos (CASCADE: artículos y bloques también eliminados)");

        return {
            data: id_project,
            message: `Proyecto eliminado exitosamente (${articles.length} artículos y ${totalImagesDeleted} imágenes eliminadas)`
        };
    } catch (err) {
        console.error("-> magazine_project_controller.js - removeById() - Error =", err);
        return { error: "Error al eliminar el proyecto" };
    }
}

async function uploadCoverImage(id_project, imagePath) {
    try {
        const project = await magazine_project_model.findByPk(id_project);

        if (!project) {
            return { error: "Proyecto no encontrado" };
        }

        // Delete old cover image if exists
        if (project.cover_image_project) {
            const backendDir = path.resolve(__dirname, '..', '..');
            const oldImagePath = path.join(backendDir, project.cover_image_project);

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
            id_project,
            imagePath
        });

        await project.update({ cover_image_project: imagePath });

        return {
            data: {
                id_project: id_project,
                cover_image_project: imagePath
            },
            message: "Imagen de portada actualizada correctamente"
        };
    } catch (err) {
        console.error("-> magazine_project_controller.js - uploadCoverImage() - Error =", err);
        return { error: "Error al actualizar la imagen de portada" };
    }
}

async function removeCoverImage(id_project) {
    try {
        const project = await magazine_project_model.findByPk(id_project);

        if (!project) {
            return { error: "Proyecto no encontrado" };
        }

        if (project.cover_image_project) {
            const backendDir = path.resolve(__dirname, '..', '..');
            const imagePath = path.join(backendDir, project.cover_image_project);

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

        await project.update({ cover_image_project: null });

        return {
            data: {
                id_project: id_project,
                cover_image_project: null
            },
            message: "Imagen de portada eliminada correctamente"
        };
    } catch (err) {
        console.error("-> magazine_project_controller.js - removeCoverImage() - Error =", err);
        return { error: "Error al eliminar la imagen de portada" };
    }
}

// Soft delete - set active_project to false
async function deactivate(id_project) {
    try {
        const project = await magazine_project_model.findByPk(id_project);

        if (!project) {
            return { error: "Proyecto no encontrado" };
        }

        await project.update({ active_project: false });

        return {
            data: project,
            message: "Proyecto desactivado exitosamente"
        };
    } catch (err) {
        console.error("-> magazine_project_controller.js - deactivate() - Error =", err);
        return { error: "Error al desactivar el proyecto" };
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
    removeById,
    uploadCoverImage,
    removeCoverImage,
    deactivate
};
