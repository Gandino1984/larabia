import { Router } from "express";
import apiRouter from "./api_router.js";

const router = Router();

// Health check — used by Docker healthcheck and load balancers
router.get("/health", (req, res) => res.json({ status: "ok" }));

// Mount API at root (magazine-front uses bare endpoints like /magazine-article, /user/login)
router.use("/", apiRouter);

// Email verification deep link bounces through the API and into the front-end.
// The link in verification emails points at FRONTEND_URL/verify-email directly,
// but we keep this redirect as a safety net for clicks that hit the API host.
router.get("/verify-email", (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL;
    const queryString = req.url.split('?')[1] || '';
    res.redirect(`${frontendUrl}/verify-email?${queryString}`);
});

export default router;
