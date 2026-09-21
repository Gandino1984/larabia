// back-end/controllers/engagement/engagement_api_controller.js
import engagementController from "./engagement_controller.js";
import { getRequestUser, roleSnapshot, requireSuperAdmin } from "../../utils/authHelper.js";

async function like(req, res) {
    try {
        const user = await getRequestUser(req);
        const { error, data } = await engagementController.toggleLike(req.params.id_article, user?.id_user);
        if (error) return res.status(user ? 400 : 401).json({ error });
        res.json({ error: null, data });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
}

async function favorite(req, res) {
    try {
        const user = await getRequestUser(req);
        const { error, data } = await engagementController.toggleFavorite(req.params.id_article, user?.id_user);
        if (error) return res.status(user ? 400 : 401).json({ error });
        res.json({ error: null, data });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
}

async function myEngagement(req, res) {
    try {
        const user = await getRequestUser(req);
        const { error, data } = await engagementController.getMyEngagement(user?.id_user);
        if (error) return res.status(400).json({ error });
        res.json({ error: null, data });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
}

async function subscribe(req, res) {
    try {
        const user = await getRequestUser(req);
        const { error, data } = await engagementController.toggleSubscription(req.params.id_project, user?.id_user);
        if (error) return res.status(user ? 400 : 401).json({ error });
        res.json({ error: null, data });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
}

async function mySubscriptions(req, res) {
    try {
        const user = await getRequestUser(req);
        const { error, data } = await engagementController.getMySubscriptions(user?.id_user);
        if (error) return res.status(400).json({ error });
        res.json({ error: null, data });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
}

async function listComments(req, res) {
    try {
        const { error, data } = await engagementController.listComments(req.params.id_article);
        if (error) return res.status(400).json({ error });
        res.json({ error: null, data });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
}

async function createComment(req, res) {
    try {
        const user = await getRequestUser(req);
        const { error, data, success } = await engagementController.createComment(
            req.params.id_article, user?.id_user, req.body?.content_comment
        );
        if (error) return res.status(user ? 400 : 401).json({ error });
        res.json({ error: null, data, success });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
}

async function deleteComment(req, res) {
    try {
        const admin = await requireSuperAdmin(req, res);
        if (!admin) return; // requireSuperAdmin already sent 403/401
        const { error, success } = await engagementController.deleteComment(req.params.id_comment);
        if (error) return res.status(400).json({ error });
        res.json({ error: null, success });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
}

export default { like, favorite, myEngagement, subscribe, mySubscriptions, listComments, createComment, deleteComment };
