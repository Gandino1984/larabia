import { Router } from "express";

import userApiRouter from "./user_api_router.js";
import contactApiRouter from "./contact_api_router.js";
import magazineArticleApiRouter from "./magazine_article_api_router.js";
import articleBlocksApiRouter from "./article_blocks_api_router.js";
import magazineProjectApiRouter from "./magazine_project_api_router.js";
import authorProfileApiRouter from "./author_profile_api_router.js";
import magazineMetadataApiRouter from "./magazine_metadata_api_router.js";
import magazineThemeApiRouter from "./magazine_theme_api_router.js";
import magazineNavApiRouter from "./magazine_nav_api_router.js";

const router = Router();

router.use("/user", userApiRouter);
router.use("/contact", contactApiRouter);
router.use("/magazine-article", magazineArticleApiRouter);
router.use("/article-blocks", articleBlocksApiRouter);
router.use("/magazine-project", magazineProjectApiRouter);
router.use("/magazine-metadata", magazineMetadataApiRouter);
router.use("/magazine-theme", magazineThemeApiRouter);
router.use("/magazine-nav", magazineNavApiRouter);

// Author profile routes are defined with their full prefix (/author-profile/*) inside the router
router.use("/", authorProfileApiRouter);

export default router;
