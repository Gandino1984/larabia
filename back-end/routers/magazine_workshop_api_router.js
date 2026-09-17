// back-end/routers/magazine_workshop_api_router.js
import { Router } from "express";
import magazineWorkshopApiController from "../controllers/magazine_workshop/magazine_workshop_api_controller.js";
import { handleWorkshopImageUpload } from "../middleware/MagazineUploadMiddleware.js";

const router = Router();

// GET
router.get("/", magazineWorkshopApiController.getAll);
router.get("/by-id/:id_workshop", magazineWorkshopApiController.getById);

// POST
router.post("/create", magazineWorkshopApiController.create);                       // super-admin
router.post("/reserve/:id_workshop", magazineWorkshopApiController.reserve);        // any registered user
router.post("/upload-cover-image", handleWorkshopImageUpload, magazineWorkshopApiController.uploadCoverImage); // super-admin

// PATCH
router.patch("/update/:id_workshop", magazineWorkshopApiController.update);         // super-admin

// DELETE
router.delete("/remove-by-id/:id_workshop", magazineWorkshopApiController.remove);  // super-admin
router.delete("/reserve/:id_workshop", magazineWorkshopApiController.cancelReservation); // cancel own reservation

export default router;
