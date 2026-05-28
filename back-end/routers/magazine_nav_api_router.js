import { Router } from 'express';
import magazineNavApiController from '../controllers/magazine_nav/magazine_nav_api_controller.js';

const router = Router();

// Public — every page load fetches this so visitors get the configured nav.
router.get('/', magazineNavApiController.getNav);

// Super-admin only — replace the nav config (or null to reset to default).
router.patch('/', magazineNavApiController.updateNav);

export default router;
