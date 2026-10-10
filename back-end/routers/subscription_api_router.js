// back-end/routers/subscription_api_router.js
// Paid reader subscriptions (Stripe). The webhook route is mounted separately
// in index.js, before express.json(), because Stripe signs the raw body.
import { Router } from "express";
import subscriptionApiController from "../controllers/subscription/subscription_api_controller.js";

const router = Router();

router.get("/config", subscriptionApiController.getConfig);
router.get("/me", subscriptionApiController.getMine);
router.get("/status/:userId", subscriptionApiController.getStatus);
router.get("/subscribers", subscriptionApiController.getSubscribers);
router.post("/checkout", subscriptionApiController.createCheckout);
router.post("/portal", subscriptionApiController.createPortal);

export default router;
