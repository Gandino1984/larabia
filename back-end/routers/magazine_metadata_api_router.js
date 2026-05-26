import { Router } from 'express';
import magazineMetadataApiController from '../controllers/magazine_metadata/magazine_metadata_api_controller.js';
import { handleLogoUpload } from '../middleware/MetadataUploadMiddleware.js';

const router = Router();

// Public — every page load fetches this so visitors see the configured brand.
router.get('/', magazineMetadataApiController.getMetadata);

// Super-admin only — name / slogan / description.
router.patch('/', magazineMetadataApiController.updateMetadata);

// Super-admin only — POST a multipart image with ?variant=light|dark.
router.post('/upload-logo', handleLogoUpload, magazineMetadataApiController.uploadLogo);

export default router;
