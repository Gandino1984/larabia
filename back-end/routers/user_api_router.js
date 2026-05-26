import { Router } from "express";
import userApiController from "../controllers/user/user_api_controller.js";
import userController from "../controllers/user/user_controller.js";
import { handleProfileImageUpload } from "../middleware/ProfileUploadMiddleware.js";
import user_model from '../models/user_model.js';
import magazine_article_model from '../models/magazine_article_model.js';
import { sendNewsletterEmail } from '../services/emailService.js';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// ============================================================
// Reads
// ============================================================
router.get("/", userApiController.getAll);

// Editor directory — used by magazine-front to pick co-authors / show editor list
router.get('/editors', async (req, res) => {
    try {
        const editors = await user_model.findAll({
            where: { is_editor: true },
            attributes: ['id_user', 'name_user', 'image_user'],
            order: [['name_user', 'ASC']]
        });
        res.json({ error: null, data: editors });
    } catch (err) {
        console.error('Error fetching editors:', err);
        res.status(500).json({ error: 'Error al obtener los editores', details: err.message });
    }
});

// ============================================================
// Auth
// ============================================================
router.post("/byId", userApiController.getById);
router.post("/login", userApiController.login);
router.post("/create", userApiController.create);
router.post("/by-email", userApiController.getByEmail);
router.post("/search-by-name", userApiController.searchByName);
router.patch("/update", userApiController.update);
router.delete("/remove/:id_user", userApiController.removeById);
router.post('/register', userApiController.register);
router.post("/details", userApiController.getByUserName);

// Email verification
router.post('/verify-email', async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) return res.status(400).json({ error: 'Email y token son requeridos' });
        const result = await userController.verifyEmail(email, token);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ error: 'Error al verificar el email', details: error.message });
    }
});

router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email es requerido' });
        const result = await userController.resendVerificationEmail(email);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (error) {
        console.error('Error resending verification email:', error);
        res.status(500).json({ error: 'Error al reenviar el email de verificación', details: error.message });
    }
});

router.post('/request-password-reset', userApiController.requestPasswordReset);
router.post('/reset-password', userApiController.resetPasswordWithToken);
router.post('/change-password', userApiController.changePassword);

// Google OAuth
router.post('/google-auth', userApiController.googleAuth);
router.post('/link-google', userApiController.linkGoogleAccount);
router.post('/select-google-account', userApiController.selectGoogleAccount);
router.post('/complete-google-registration', userApiController.completeGoogleRegistration);

// ============================================================
// Profile image upload + serve
// ============================================================
const handleUpload = async (req, res) => {
    try {
        const userName = req.headers['x-user-name'];
        if (!req.file || !userName) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                details: !req.file ? 'No file uploaded' : 'Missing x-user-name header'
            });
        }
        const result = await userApiController.updateProfileImage(userName);
        if (result.error) return res.status(400).json(result);
        return res.json({ ...result, data: { ...result.data, image_user: userName } });
    } catch (error) {
        console.error('Error handling upload:', error);
        return res.status(500).json({ error: 'Error en la carga de la imagen de perfil', details: error.message });
    }
};

router.post('/upload-image', handleProfileImageUpload, handleUpload);
router.post('/upload-profile-image', handleProfileImageUpload, handleUpload);
router.get('/image/:userName', userApiController.getUserImage);

// ============================================================
// Newsletter (kept under /user/* for back-compat with magazine-front)
// ============================================================

// Toggle subscription
router.post('/toggle-newsletter', async (req, res) => {
    try {
        const { id_user } = req.body;
        if (!id_user) return res.status(400).json({ error: 'id_user is required' });

        const user = await user_model.findByPk(id_user);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const newValue = !user.receives_newsletter;
        await user.update({ receives_newsletter: newValue });

        res.json({ error: null, data: { receives_newsletter: newValue } });
    } catch (error) {
        console.error('Error toggling newsletter:', error);
        res.status(500).json({ error: 'Failed to toggle newsletter subscription', details: error.message });
    }
});

// Subscriber count (editor-only — no PII returned)
router.get('/newsletter-subscribers', async (req, res) => {
    try {
        const count = await user_model.count({ where: { receives_newsletter: true } });
        res.json({ error: null, data: { count } });
    } catch (error) {
        console.error('Error fetching newsletter subscribers:', error);
        res.status(500).json({ error: 'Failed to fetch subscriber count', details: error.message });
    }
});

// Send newsletter to all subscribers
router.post('/send-newsletter', async (req, res) => {
    try {
        const { articleIds, introText } = req.body;
        if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
            return res.status(400).json({ error: 'articleIds array is required and must not be empty' });
        }

        const subscribers = await user_model.findAll({
            where: { receives_newsletter: true },
            attributes: ['email_user', 'name_user']
        });

        if (subscribers.length === 0) {
            return res.json({ error: null, data: { sent: 0, message: 'No subscribers to send to' } });
        }

        const articles = await magazine_article_model.findAll({
            where: {
                id_article: { [Op.in]: articleIds },
                status_article: 'published',
                active_article: true
            }
        });

        if (articles.length === 0) {
            return res.status(400).json({ error: 'No published articles found for the given IDs' });
        }

        let sent = 0;
        let failed = 0;
        for (const subscriber of subscribers) {
            const result = await sendNewsletterEmail(
                subscriber.email_user,
                subscriber.name_user,
                articles,
                introText || ''
            );
            if (result.success) sent++;
            else failed++;
        }

        res.json({ error: null, data: { sent, failed, total: subscribers.length } });
    } catch (error) {
        console.error('Error sending newsletter:', error);
        res.status(500).json({ error: 'Failed to send newsletter', details: error.message });
    }
});

export default router;
