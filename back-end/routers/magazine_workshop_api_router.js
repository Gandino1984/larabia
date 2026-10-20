// back-end/routers/magazine_workshop_api_router.js
import { Router } from "express";
import magazineWorkshopApiController from "../controllers/magazine_workshop/magazine_workshop_api_controller.js";
import { handleWorkshopImageUpload } from "../middleware/MagazineUploadMiddleware.js";

const router = Router();

// GET
router.get("/", magazineWorkshopApiController.getAll);
router.get("/by-id/:id_workshop", magazineWorkshopApiController.getById);           // signed-in readers (participants: managers)
router.get("/manage/:id_workshop/users", magazineWorkshopApiController.searchUsers); // managers: find people (?q=)
router.get("/invitations/feed", magazineWorkshopApiController.invitationFeed);       // signed-in: invitations + answers

// POST
router.post("/create", magazineWorkshopApiController.create);                       // admins / super-admin
router.post("/reserve/:id_workshop", magazineWorkshopApiController.reserve);        // free: anyone signed in; else socios/as + magazine team
router.post("/manage/:id_workshop/invitations", magazineWorkshopApiController.inviteParticipant); // managers: invite someone
router.post("/invitations/:id_invitation/respond", magazineWorkshopApiController.respondInvitation); // invitee: accept / decline
router.post("/invitations/responses/seen", magazineWorkshopApiController.markResponsesSeen);       // inviter: answers seen
router.post("/spot-requests/answers/seen", magazineWorkshopApiController.markSpotAnswersSeen);   // requester: answers seen
router.post("/spot-requests/:id_workshop", magazineWorkshopApiController.requestSpot);            // socios/as: ask for an extra place (full workshop)
router.delete("/spot-requests/:id_workshop", magazineWorkshopApiController.withdrawSpotRequest);   // withdraw own pending request
router.post("/manage/:id_workshop/spot-requests/:id_user", magazineWorkshopApiController.respondSpotRequest); // managers: accept (capacity + 1) / decline
router.post("/manage/:id_workshop/blocks", magazineWorkshopApiController.blockUser);             // managers: block someone
router.post("/upload-cover-image", handleWorkshopImageUpload, magazineWorkshopApiController.uploadCoverImage); // managers: super admin, or its creator / talleristas on the team

// PATCH
router.patch("/update/:id_workshop", magazineWorkshopApiController.update);         // managers: super admin, or its creator / talleristas on the team

// DELETE
router.delete("/remove-by-id/:id_workshop", magazineWorkshopApiController.remove);  // managers: super admin, or its creator / talleristas on the team
router.delete("/reserve/:id_workshop", magazineWorkshopApiController.cancelReservation); // cancel own reservation
router.delete("/manage/:id_workshop/participants/:id_user", magazineWorkshopApiController.removeParticipant); // managers
router.delete("/manage/:id_workshop/invitations/:id_user", magazineWorkshopApiController.withdrawInvitation); // managers
router.delete("/manage/:id_workshop/blocks/:id_user", magazineWorkshopApiController.unblockUser);             // managers

export default router;
