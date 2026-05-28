import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const INTERNAL_PORT = 3000;
const EXTERNAL_PORT = config.app.port;

// Serve uploaded magazine assets (article covers, block images, author profile pics, user profile pics, project covers)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets/images', express.static(path.join(__dirname, 'assets', 'images')));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(cors(config.cors));
app.options('*', cors(config.cors));

app.use("/", router);

app.listen(INTERNAL_PORT, '0.0.0.0', () => {
    console.log('');
    logEnvironmentInfo();
    console.log('');
    console.log(`>>> Internal Port:  ${INTERNAL_PORT}`);
    console.log(`>>> External Port:  ${EXTERNAL_PORT}`);
    console.log(`>>> Uploads:        ${path.join(__dirname, 'uploads')}`);
    console.log('');
});
