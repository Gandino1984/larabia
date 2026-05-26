// back-end/routers/author_profile_api_router.js
import express from 'express';
import * as controller from '../controllers/author_profile/author_profile_api_controller.js';
import { handleAuthorProfileImageUpload } from '../middleware/MagazineUploadMiddleware.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/author-profile/all', controller.getAll);
router.get('/author-profile', controller.getAllPublished);
router.get('/author-profile/featured', controller.getFeatured);
router.get('/author-profile/by-id/:id', controller.getById);
router.get('/author-profile/by-user/:userId', controller.getByUserId);

// Protected routes (require editor authentication)
router.post('/author-profile/create', controller.create);
router.patch('/author-profile/update/:id', controller.update);
router.delete('/author-profile/remove-by-id/:id', controller.deleteProfile);
router.post('/author-profile/upload-image', handleAuthorProfileImageUpload, controller.uploadProfileImage);

export default router;
