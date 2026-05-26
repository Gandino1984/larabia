// back-end/routers/magazine_article_api_router.js
import { Router } from "express";
import magazineArticleApiController from "../controllers/magazine_article/magazine_article_api_controller.js";
import { handleMagazineImageUpload } from "../middleware/MagazineUploadMiddleware.js";

const router = Router();

// GET routes
router.get("/", magazineArticleApiController.getAll);
router.get("/featured", magazineArticleApiController.getFeatured);
router.get("/by-category/:category", magazineArticleApiController.getByCategory);
router.get("/by-id/:id_article", magazineArticleApiController.getById);
router.get("/editors", magazineArticleApiController.getEditors);
router.get("/pending-invitations", magazineArticleApiController.getPendingInvitations);

// POST routes
router.post("/track-view/:id_article", magazineArticleApiController.trackView);
router.post("/create", magazineArticleApiController.create);
router.post("/invite-coauthor", magazineArticleApiController.inviteCoAuthor);
router.post(
    "/upload-cover-image",
    handleMagazineImageUpload,
    magazineArticleApiController.uploadCoverImage
);

// PATCH routes
router.patch("/update/:id_article", magazineArticleApiController.update);
router.patch("/deactivate/:id_article", magazineArticleApiController.deactivate);
router.patch("/invitation/:id/respond", magazineArticleApiController.respondToInvitation);

// DELETE routes
router.delete("/remove-by-id/:id_article", magazineArticleApiController.removeById);
router.delete("/remove-cover-image/:id_article", magazineArticleApiController.removeCoverImage);

export default router;
