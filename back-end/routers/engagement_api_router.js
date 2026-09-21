// back-end/routers/engagement_api_router.js
import { Router } from "express";
import engagementApiController from "../controllers/engagement/engagement_api_controller.js";

const router = Router();

// Likes / favorites (toggle) — require a logged-in user (x-user-id header).
router.post("/like/:id_article", engagementApiController.like);
router.post("/favorite/:id_article", engagementApiController.favorite);

// The current user's liked + favorited article ids.
router.get("/my", engagementApiController.myEngagement);

// Project subscriptions (bell) — toggle + list the current user's followed projects.
router.post("/subscribe/:id_project", engagementApiController.subscribe);
router.get("/my-subscriptions", engagementApiController.mySubscriptions);

// Comments
router.get("/comments/:id_article", engagementApiController.listComments);
router.post("/comments/:id_article", engagementApiController.createComment);
router.delete("/comments/:id_comment", engagementApiController.deleteComment);   // super-admin

export default router;
