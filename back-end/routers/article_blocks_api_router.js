// back-end/routers/article_blocks_api_router.js
import { Router } from "express";
import articleBlocksApiController from "../controllers/article_blocks/article_blocks_api_controller.js";

const router = Router();

// GET routes
router.get("/by-article/:article_id", articleBlocksApiController.getBlocksByArticleId);
router.get("/by-id/:id_block", articleBlocksApiController.getById);

// POST routes
router.post("/create", articleBlocksApiController.create);
router.post(
    "/upload-image",
    articleBlocksApiController.uploadMiddleware,
    articleBlocksApiController.uploadImage
);
router.post(
    "/upload-audio",
    articleBlocksApiController.audioUploadMiddleware,
    articleBlocksApiController.uploadAudio
);
router.post("/reorder/:article_id", articleBlocksApiController.reorderBlocks);

// PATCH routes
router.patch("/update/:id_block", articleBlocksApiController.update);

// DELETE routes
router.delete("/remove-by-id/:id_block", articleBlocksApiController.deleteBlock);

export default router;
