import { Router } from 'express';
import magazineThemeApiController from '../controllers/magazine_theme/magazine_theme_api_controller.js';
import { handleBackgroundUpload } from '../middleware/ThemeUploadMiddleware.js';

const router = Router();

// Public — every page load fetches this so visitors see the configured theme.
router.get('/', magazineThemeApiController.getTheme);

// Super-admin only — preset / color tokens / landing bg / animation settings.
router.patch('/', magazineThemeApiController.updateTheme);

// Super-admin only — POST a multipart image to use as the landing background.
router.post('/upload-background', handleBackgroundUpload, magazineThemeApiController.uploadBackground);

export default router;
