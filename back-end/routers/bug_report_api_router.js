// back-end/routers/bug_report_api_router.js — «Reportar un error».
import { Router } from "express";
import bugReportApiController from "../controllers/bug_report/bug_report_api_controller.js";

const router = Router();

router.post("/", bugReportApiController.create);              // anyone signed in
router.get("/count", bugReportApiController.count);           // super admins: new ones (badge, bell)
router.get("/", bugReportApiController.list);                 // super admins
router.patch("/:id", bugReportApiController.setStatus);       // super admins: new | seen | fixed
router.delete("/:id", bugReportApiController.remove);         // super admins

export default router;
