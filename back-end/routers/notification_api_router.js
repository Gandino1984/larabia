// back-end/routers/notification_api_router.js
// The bell's kept notifications: each person their own (x-user-id).
import { Router } from "express";
import notificationApiController from "../controllers/notification/notification_api_controller.js";

const router = Router();

router.get("/", notificationApiController.list);
router.post("/sync", notificationApiController.sync);       // keep the new ones
router.post("/read", notificationApiController.markRead);   // all read (the bell was opened)
router.post("/clear", notificationApiController.dismissAll); // «Borrar todas»
router.delete("/:key", notificationApiController.dismiss);  // «×» on one

export default router;
