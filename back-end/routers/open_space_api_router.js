import { Router } from "express";
import openSpaceApiController from "../controllers/open_space/open_space_api_controller.js";

const router = Router();

// «Espacio abierto» proposals.
router.post("/proposals", openSpaceApiController.canSend, openSpaceApiController.upload, openSpaceApiController.create);
router.get("/proposals/mine", openSpaceApiController.mine);
router.get("/proposals/count", openSpaceApiController.count);
router.get("/proposals", openSpaceApiController.list);
router.patch("/proposals/:id", openSpaceApiController.setStatus);
router.delete("/proposals/:id", openSpaceApiController.remove);
router.get("/proposals/:id/file", openSpaceApiController.downloadFile);

export default router;
