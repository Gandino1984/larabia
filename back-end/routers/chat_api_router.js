// back-end/routers/chat_api_router.js — the magazine's chat (chat_api_controller.js).
import { Router } from "express";
import chat from "../controllers/chat/chat_api_controller.js";

const router = Router();

// The signed-in person's conversations (and the bell's data); answers seen.
router.get("/mine", chat.mine);
router.post("/seen", chat.seen);

// Socios/as ask an author / artist; the author accepts, declines or ends it.
router.post("/request", chat.request);
router.post("/conversations/:id/respond", chat.respond);
router.post("/conversations/:id/end", chat.end);

// Messages (participants; writing only while it's active).
router.get("/conversations/:id", chat.conversation);
router.post("/conversations/:id/messages", chat.write);

export default router;
