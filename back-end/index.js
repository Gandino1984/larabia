import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { translateResponses } from './i18n/translateResponses.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataTypes } from 'sequelize';
import sequelize from './config/sequelize.js';
import config, { logEnvironmentInfo } from './config/environment.js';
import router from './routers/main_router.js';

// Magazine models — imported here so association side-effects register
// before any controller queries via `include`.
import './models/user_model.js';
import './models/magazine_article_model.js';
import './models/magazine_project_model.js';
import './models/article_block_model.js';
import './models/article_author_model.js';
import './models/article_author_invitation_model.js';
import './models/author_profile_model.js';
import './models/project_author_model.js';
import './models/magazine_metadata_model.js';
import './models/magazine_theme_model.js';
import './models/magazine_nav_model.js';
import './models/magazine_workshop_model.js';
import './models/workshop_author_model.js';
import './models/workshop_reservation_model.js';
import articleLikeModel from './models/article_like_model.js';
import articleFavoriteModel from './models/article_favorite_model.js';
import articleCommentModel from './models/article_comment_model.js';
import projectSubscriptionModel from './models/project_subscription_model.js';
import readerSubscriptionModel from './models/reader_subscription_model.js';
import workshopBlockModel from './models/workshop_block_model.js';
import workshopInvitationModel from './models/workshop_invitation_model.js';
import openSpaceProposalModel from './models/open_space_proposal_model.js';
import subscriptionApiController from './controllers/subscription/subscription_api_controller.js';
import { PAISAJE_DIR, ensureDirs as ensurePaisajeDirs, cleanupOrphans as cleanupPaisajeOrphans } from './controllers/paisaje/paisaje_store.js';
import { isPrivateUploadPath } from './controllers/open_space/proposal_store.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// 3000 in the container; BACKEND_LISTEN_PORT only for running it locally
// next to other services.
const INTERNAL_PORT = Number(process.env.BACKEND_LISTEN_PORT) || 3000;
const EXTERNAL_PORT = config.app.port;

// Files attached to «Espacio abierto» proposals are private (the team and the
// sender download them through /open-space): never served from here.
app.use('/uploads', (req, res, next) => (isPrivateUploadPath(req.path) ? res.status(404).end() : next()));
// Serve uploaded magazine assets (article covers, block images, author profile pics, user profile pics, project covers)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets/images', express.static(path.join(__dirname, 'assets', 'images')));

// Stripe webhook: needs the raw body (signature check), so it is registered
// before express.json(). Server-to-server — no CORS involved.
app.post('/subscription/webhook', express.raw({ type: 'application/json' }), subscriptionApiController.handleWebhook);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(cors(config.cors));
app.options('*', cors(config.cors));

// Paisajes sonoros: drawings + normalised audio, WITH CORS (the player
// analyses the audio with Web Audio, which needs CORS across origins —
// /uploads above is served before cors). Range requests work (seek).
// Only the public files: drawings, reference images and audio (not the
// internal .meta/.status bookkeeping nor the multer tmp dir).
const PAISAJE_PUBLIC = /^\/(images\/[A-Za-z0-9_-]+\.(json|webp|jpg|jpeg)|audio\/[A-Za-z0-9_-]+\.m4a)$/;
app.use('/paisaje-files', cors(config.cors), (req, res, next) =>
    PAISAJE_PUBLIC.test(req.path) ? next() : res.status(404).json({ error: 'Not found' }),
    express.static(PAISAJE_DIR, { fallthrough: false, maxAge: '7d', index: false }));

// Messages of the JSON answers in the reader's language (i18n/messages.js).
app.use(translateResponses);

app.use("/", router);

// Create the engagement tables (likes/favorites/comments) if they don't exist
// yet. Existing tables are managed by the SQL migrations; sync() here only issues
// CREATE TABLE IF NOT EXISTS for these new tables and never alters others.
Promise.all([
    articleLikeModel.sync(),
    articleFavoriteModel.sync(),
    articleCommentModel.sync(),
    projectSubscriptionModel.sync(),
    readerSubscriptionModel.sync(),
    workshopBlockModel.sync(),
    workshopInvitationModel.sync(),
    openSpaceProposalModel.sync()
])
    .then(() => console.log('>>> Engagement tables ready (likes/favorites/comments/subscriptions/workshop blocks + invitations/open space proposals)'))
    .catch((err) => console.error('Error syncing engagement tables:', err.message));

// Columns added to tables that already exist in production (idempotent: each
// is added only if missing). See migrations 012 (audience) and 013 (map location).
(async () => {
    try {
        const qi = sequelize.getQueryInterface();
        const workshops = await qi.describeTable('magazine_workshops');
        if (!workshops.audience_workshop) {
            await qi.addColumn('magazine_workshops', 'audience_workshop', {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'general'
            });
            console.log('>>> Added magazine_workshops.audience_workshop');
        }
        for (const col of ['lat_workshop', 'lng_workshop']) {
            if (!workshops[col]) {
                await qi.addColumn('magazine_workshops', col, { type: DataTypes.DECIMAL(9, 6), allowNull: true });
                console.log(`>>> Added magazine_workshops.${col}`);
            }
        }
        // Free workshops: no membership needed to book (migration 022).
        if (!workshops.free_workshop) {
            await qi.addColumn('magazine_workshops', 'free_workshop', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
            console.log('>>> Added magazine_workshops.free_workshop');
        }
        // Paisajes sonoros (migration 016): block type 'paisaje' + the piece JSON.
        const blocks = await qi.describeTable('article_blocks');
        if (!String(blocks.block_type?.type || '').includes("'paisaje'")) {
            await qi.changeColumn('article_blocks', 'block_type', {
                type: DataTypes.ENUM('text', 'image', 'iframe', 'comic_panel', 'paisaje'),
                allowNull: false
            });
            console.log(">>> Added 'paisaje' to article_blocks.block_type");
        }
        if (!blocks.soundscape_data) {
            await qi.addColumn('article_blocks', 'soundscape_data', { type: DataTypes.TEXT, allowNull: true });
            console.log('>>> Added article_blocks.soundscape_data');
        }
        // Authors signed up by a super admin, waiting to accept (migration 018).
        const users = await qi.describeTable('user');
        for (const [col, type] of [
            ['author_invite_status', DataTypes.STRING(20)],
            ['author_invited_by', DataTypes.INTEGER.UNSIGNED],
            ['author_invited_at', DataTypes.DATE]
        ]) {
            if (!users[col]) {
                await qi.addColumn('user', col, { type, allowNull: true });
                console.log(`>>> Added user.${col}`);
            }
        }
        // Complimentary subscriptions given by a super admin (migration 021).
        const subs = await qi.describeTable('reader_subscriptions');
        if (!subs.complimentary) {
            await qi.addColumn('reader_subscriptions', 'complimentary', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
            console.log('>>> Added reader_subscriptions.complimentary');
        }
        if (!subs.complimentary_at) {
            await qi.addColumn('reader_subscriptions', 'complimentary_at', { type: DataTypes.DATE, allowNull: true });
            console.log('>>> Added reader_subscriptions.complimentary_at');
        }
        // Magazine sections of articles and projects (migration 017) and
        // content in other languages (migration 019).
        for (const [table, cols] of [
            ['magazine_articles', ['sections_article', 'sections_requested_article', 'translations_article']],
            ['magazine_projects', ['sections_project', 'sections_requested_project', 'translations_project']],
            ['article_blocks', ['translations_block']]
        ]) {
            const desc = await qi.describeTable(table);
            for (const col of cols) {
                if (!desc[col]) {
                    await qi.addColumn(table, col, { type: DataTypes.JSON, allowNull: true });
                    console.log(`>>> Added ${table}.${col}`);
                }
            }
        }
    } catch (err) {
        console.error('Error ensuring added columns:', err.message);
    }
})();

// Paisajes sonoros: working dirs + daily clean-up of abandoned uploads
// (first run a minute after boot, once the columns above exist).
ensurePaisajeDirs();
const runPaisajeCleanup = () =>
    cleanupPaisajeOrphans().catch((err) => console.error('[paisaje] cleanup failed:', err.message));
setTimeout(runPaisajeCleanup, 60 * 1000).unref();
setInterval(runPaisajeCleanup, 24 * 60 * 60 * 1000).unref();

app.listen(INTERNAL_PORT, '0.0.0.0', () => {
    console.log('');
    logEnvironmentInfo();
    console.log('');
    console.log(`>>> Internal Port:  ${INTERNAL_PORT}`);
    console.log(`>>> External Port:  ${EXTERNAL_PORT}`);
    console.log(`>>> Uploads:        ${path.join(__dirname, 'uploads')}`);
    console.log('');
});
