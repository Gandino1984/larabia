import { Router } from "express";
import contactApiController from "../controllers/contact/contact_api_controller.js";

const router = Router();

router.post("/send", contactApiController.sendContactMessage);

export default router;
