// back-end/routers/magazine_project_api_router.js
import { Router } from "express";
import magazineProjectApiController from "../controllers/magazine_project/magazine_project_api_controller.js";
import { handleMagazineProjectImageUpload } from "../middleware/MagazineUploadMiddleware.js";

const router = Router();

// GET routes
router.get("/", magazineProjectApiController.getAll);
router.get("/featured", magazineProjectApiController.getFeatured);
router.get("/by-type/:type", magazineProjectApiController.getByType);
router.get("/by-format/:format", magazineProjectApiController.getByFormat);
router.get("/by-id/:id_project", magazineProjectApiController.getById);

// POST routes
router.post("/create", magazineProjectApiController.create);
router.post(
    "/upload-cover-image",
    handleMagazineProjectImageUpload,
    magazineProjectApiController.uploadCoverImage
);

// PATCH routes
router.patch("/update/:id_project", magazineProjectApiController.update);
router.patch("/deactivate/:id_project", magazineProjectApiController.deactivate);

// DELETE routes
router.delete("/remove-by-id/:id_project", magazineProjectApiController.remove);
router.delete("/remove-cover-image/:id_project", magazineProjectApiController.removeCoverImage);

export default router;
