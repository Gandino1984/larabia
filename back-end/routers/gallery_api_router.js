// back-end/routers/gallery_api_router.js — the Galería (gallery_api_controller.js).
import { Router } from "express";
import gallery from "../controllers/gallery/gallery_api_controller.js";

const router = Router();

// Anyone: the exhibitions and their approved works.
router.get("/", gallery.list);
router.get("/exhibition/:id", gallery.exhibition);

// Artists: their own exhibition (artistOnly runs before any image is received).
router.get("/mine", gallery.artistOnly, gallery.mine);
router.patch("/mine", gallery.artistOnly, gallery.updateMine);
router.patch("/mine/order", gallery.artistOnly, gallery.reorderWorks);
router.post("/mine/works", gallery.artistOnly, gallery.upload, gallery.addWork);
router.patch("/mine/works/:id", gallery.artistOnly, gallery.upload, gallery.updateWork);
router.delete("/mine/works/:id", gallery.artistOnly, gallery.removeWork);

// Super admins: the gallery of someone invited, prepared on their behalf until
// they accept it (onBehalf, then the artist's own handlers for that person).
router.post("/for/:userId", gallery.prepareFor);
router.get("/for/:userId", gallery.onBehalf, gallery.mine);
router.patch("/for/:userId", gallery.onBehalf, gallery.updateMine);
router.patch("/for/:userId/order", gallery.onBehalf, gallery.reorderWorks);
router.post("/for/:userId/works", gallery.onBehalf, gallery.upload, gallery.addWork);
router.patch("/for/:userId/works/:id", gallery.onBehalf, gallery.upload, gallery.updateWork);
router.delete("/for/:userId/works/:id", gallery.onBehalf, gallery.removeWork);

// Super admins: review the works.
router.get("/review", gallery.reviewList);
router.get("/review/count", gallery.reviewCount);
router.post("/review/:id", gallery.review);

// (Talking to an artist: the magazine's chat, /chat.)

// The bell.
router.get("/feed", gallery.feed);
router.post("/feed/reviews-seen", gallery.artistOnly, gallery.reviewsSeen);

// Invitations: super admins invite; the invited person answers.
router.post("/invite", gallery.invite);
router.get("/invitations", gallery.invitations);
router.post("/invitations/send-unsent", gallery.sendUnsent);
router.post("/invitations/:id/resend", gallery.resend);
router.get("/invitation", gallery.myInvitation);
router.post("/invitation/respond", gallery.respond);

export default router;
