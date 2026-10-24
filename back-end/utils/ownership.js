// back-end/utils/ownership.js
//
// Whose is a publication: for requireOwnerOrSuperAdmin (utils/authHelper.js).
// Outside super admins, people change only their own articles and projects —
// "own" = one of its authors (the authors table, or the older author_id).
import article_author_model from "../models/article_author_model.js";
import magazine_article_model from "../models/magazine_article_model.js";
import project_author_model from "../models/project_author_model.js";
import magazine_project_model from "../models/magazine_project_model.js";

const sameId = (a, b) => a != null && b != null && Number(a) === Number(b);

export async function isArticleAuthor(articleId, userId) {
    if (!articleId || !userId) return false;
    if (await article_author_model.findOne({ where: { article_id: articleId, user_id: userId } })) return true;
    const article = await magazine_article_model.findByPk(articleId, { attributes: ['author_id'] });
    return !!article && sameId(article.author_id, userId);
}

export async function isProjectAuthor(projectId, userId) {
    if (!projectId || !userId) return false;
    if (await project_author_model.findOne({ where: { project_id: projectId, user_id: userId } })) return true;
    const project = await magazine_project_model.findByPk(projectId, { attributes: ['author_id'] });
    return !!project && sameId(project.author_id, userId);
}

/**
 * Whether `userId` is among the authors a new publication is created with
 * (`authors`: ids, or { id_user | user_id }; else the single `author_id`).
 */
export function signsIt({ authors, author_id }, userId) {
    const ids = Array.isArray(authors) && authors.length
        ? authors.map((a) => (a && typeof a === 'object' ? (a.id_user ?? a.user_id) : a))
        : [author_id];
    return ids.some((id) => sameId(id, userId));
}
