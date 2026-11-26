// back-end/routers/activity_proposal_api_router.js
// «Propón una actividad» (Barrio): proposals of workshops and open calls.
import { Router } from "express";
import activityProposalApiController from "../controllers/activity_proposal/activity_proposal_api_controller.js";

const router = Router();

router.get("/mine", activityProposalApiController.mine);          // signed in: theirs + how many more
router.get("/count", activityProposalApiController.count);        // admins / super admins: new ones (the bell)
router.get("/", activityProposalApiController.list);              // admins / super admins: all (?status=)
router.post("/", activityProposalApiController.create);           // signed in (Google): two in progress at most
router.delete("/:id", activityProposalApiController.withdraw);    // its person, while nobody has decided
router.post("/:id/consider", activityProposalApiController.consider); // admins: approve → email «we're considering it»
router.post("/:id/decline", activityProposalApiController.decline);   // admins: decline (no email)

export default router;
