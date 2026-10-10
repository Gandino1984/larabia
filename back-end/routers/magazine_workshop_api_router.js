// back-end/routers/magazine_workshop_api_router.js
import { Router } from "express";
import magazineWorkshopApiController from "../controllers/magazine_workshop/magazine_workshop_api_controller.js";
import { handleWorkshopImageUpload } from "../middleware/MagazineUploadMiddleware.js";

const router = Router();

// GET
router.get("/", magazineWorkshopApiController.getAll);
router.get("/by-id/:id_workshop", magazineWorkshopApiController.getById);

// POST
router.post("/create", magazineWorkshopApiController.create);                       // admins / super-admin
router.post("/reserve/:id_workshop", magazineWorkshopApiController.reserve);        // subscribers + magazine team
router.post("/upload-cover-image", handleWorkshopImageUpload, magazineWorkshopApiController.uploadCoverImage); // super-admin / admin creator or instructor

// PATCH
router.patch("/update/:id_workshop", magazineWorkshopApiController.update);         // super-admin / admin creator or instructor

// DELETE
router.delete("/remove-by-id/:id_workshop", magazineWorkshopApiController.remove);  // super-admin / admin creator or instructor
router.delete("/reserve/:id_workshop", magazineWorkshopApiController.cancelReservation); // cancel own reservation

export default router;
