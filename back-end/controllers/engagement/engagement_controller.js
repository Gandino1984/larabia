// back-end/controllers/engagement/engagement_controller.js
//
// Likes, favorites and comments for magazine articles.
import { fn, col } from "sequelize";
import article_like_model from "../../models/article_like_model.js";
import article_favorite_model from "../../models/article_favorite_model.js";
import article_comment_model from "../../models/article_comment_model.js";
import user_model from "../../models/user_model.js";

// ---- Likes ----

async function toggleLike(id_article, userId) {
    if (!userId) return { error: "Debes iniciar sesión" };
    try {
        const existing = await article_like_model.findOne({ where: { article_id: id_article, user_id: userId } });
        let liked;
        if (existing) {
            await existing.destroy();
            liked = false;
        } else {
            await article_like_model.create({ article_id: id_article, user_id: userId });
            liked = true;
        }
        const like_count = await article_like_model.count({ where: { article_id: id_article } });
        return { data: { liked, like_count } };
    } catch (err) {
        console.error("-> engagement_controller.js - toggleLike() - Error =", err);
        return { error: "Error al actualizar el like" };
    }
}

// ---- Favorites ----

async function toggleFavorite(id_article, userId) {
    if (!userId) return { error: "Debes iniciar sesión" };
    try {
        const existing = await article_favorite_model.findOne({ where: { article_id: id_article, user_id: userId } });
        let favorited;
        if (existing) {
            await existing.destroy();
            favorited = false;
        } else {
            await article_favorite_model.create({ article_id: id_article, user_id: userId });
            favorited = true;
        }
        return { data: { favorited } };
    } catch (err) {
        console.error("-> engagement_controller.js - toggleFavorite() - Error =", err);
        return { error: "Error al actualizar favoritos" };
    }
}

// The current user's liked + favorited article ids (for filling the card icons).
async function getMyEngagement(userId) {
    if (!userId) return { data: { likedIds: [], favoritedIds: [] } };
    try {
        const [likes, favs] = await Promise.all([
            article_like_model.findAll({ where: { user_id: userId }, attributes: ['article_id'] }),
            article_favorite_model.findAll({ where: { user_id: userId }, attributes: ['article_id'] })
        ]);
        return {
            data: {
                likedIds: likes.map(l => l.article_id),
                favoritedIds: favs.map(f => f.article_id)
            }
        };
    } catch (err) {
        console.error("-> engagement_controller.js - getMyEngagement() - Error =", err);
        return { error: "Error al obtener la actividad del usuario" };
    }
}

// Ids of the N most-liked articles (used to feed the hero). Returns [{article_id, likes}].
async function getTopLikedArticleIds(limit = 10) {
    try {
        const rows = await article_like_model.findAll({
            attributes: ['article_id', [fn('COUNT', col('id_like')), 'likes']],
            group: ['article_id'],
            order: [[fn('COUNT', col('id_like')), 'DESC']],
            limit
        });
        return rows.map(r => ({ article_id: r.article_id, likes: Number(r.get('likes')) }));
    } catch (err) {
        console.error("-> engagement_controller.js - getTopLikedArticleIds() - Error =", err);
        return [];
    }
}

// ---- Comments ----

async function listComments(id_article) {
    try {
        const comments = await article_comment_model.findAll({
            where: { article_id: id_article },
            order: [['created_at', 'DESC']],
            include: [{ model: user_model, as: 'user', attributes: ['id_user', 'name_user', 'image_user'] }]
        });
        const data = comments.map(c => {
            const json = c.toJSON();
            return {
                id_comment: json.id_comment,
                article_id: json.article_id,
                content_comment: json.content_comment,
                created_at: json.created_at,
                user_id: json.user_id,
                author_name: json.user?.name_user || 'Usuario',
                author_image: json.user?.image_user || null
            };
        });
        return { data };
    } catch (err) {
        console.error("-> engagement_controller.js - listComments() - Error =", err);
        return { error: "Error al obtener los comentarios" };
    }
}

async function createComment(id_article, userId, content) {
    if (!userId) return { error: "Debes iniciar sesión para comentar" };
    const text = (content || '').trim();
    if (!text) return { error: "El comentario no puede estar vacío" };
    if (text.length > 2000) return { error: "El comentario es demasiado largo (máx. 2000 caracteres)" };
    try {
        const created = await article_comment_model.create({
            article_id: id_article,
            user_id: userId,
            content_comment: text
        });
        const user = await user_model.findByPk(userId, { attributes: ['id_user', 'name_user', 'image_user'] });
        return {
            data: {
                id_comment: created.id_comment,
                article_id: id_article,
                content_comment: text,
                created_at: created.created_at,
                user_id: userId,
                author_name: user?.name_user || 'Usuario',
                author_image: user?.image_user || null
            },
            success: "Comentario publicado"
        };
    } catch (err) {
        console.error("-> engagement_controller.js - createComment() - Error =", err);
        return { error: "Error al publicar el comentario" };
    }
}

// Super-admin only (gating happens in the api controller).
async function deleteComment(id_comment) {
    try {
        const comment = await article_comment_model.findByPk(id_comment);
        if (!comment) return { error: "Comentario no encontrado" };
        await comment.destroy();
        return { success: "Comentario eliminado" };
    } catch (err) {
        console.error("-> engagement_controller.js - deleteComment() - Error =", err);
        return { error: "Error al eliminar el comentario" };
    }
}

export default {
    toggleLike,
    toggleFavorite,
    getMyEngagement,
    getTopLikedArticleIds,
    listComments,
    createComment,
    deleteComment
};
