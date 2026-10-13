// back-end/routers/paisaje_api_router.js
// Paisajes sonoros: uploads for the editor (people who can create content).
// The files themselves are served with CORS under /paisaje-files (index.js).
import { Router } from "express";
import paisajeApiController from "../controllers/paisaje/paisaje_api_controller.js";

const router = Router();
const { creatorOnly } = paisajeApiController;

router.post("/image", creatorOnly, paisajeApiController.imageUpload, paisajeApiController.uploadImage); // document + reference image
router.post("/audio", creatorOnly, paisajeApiController.audioUpload, paisajeApiController.uploadAudio); // → 202, processed in background
router.get("/audio/:id", creatorOnly, paisajeApiController.getAudioStatus);                             // processing | ready | error

export default router;
