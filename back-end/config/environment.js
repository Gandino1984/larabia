import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';

const config = {
    env: NODE_ENV,
    isProduction,
    isDevelopment,

    app: {
        port: process.env.APP_PORT || 3000
    },

    urls: isProduction
        ? {
            frontend: process.env.FRONTEND_URL || 'https://larabia.uribarri.online',
            api: process.env.API_URL || 'https://api.larabia.uribarri.online'
        }
        : {
            frontend: process.env.FRONTEND_URL || 'http://localhost:5174',
            api: process.env.API_URL || 'http://localhost:3000'
        },

    cors: {
        origin: isProduction
            ? [
                'https://larabia.uribarri.online',
                'https://api.larabia.uribarri.online'
            ]
            : [
                'http://localhost:5174',
                'http://localhost:3000',
                'http://127.0.0.1:5174',
                process.env.FRONTEND_URL || 'http://localhost:5174'
            ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-User-ID',
            'x-user-id',
            'x-user-name',
            'X-Article-ID',
            'x-article-id',
            'X-Project-ID',
            'x-project-id',
            'Content-Disposition'
        ],
        exposedHeaders: ['Content-Disposition'],
        preflightContinue: false,
        optionsSuccessStatus: 204
    },

    database: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        name: process.env.MYSQL_DATABASE || 'larabia_db',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || ''
    },

    rateLimiting: {
        maxRegistrations: parseInt(process.env.MAX_REGISTRATIONS || '10', 10),
        resetHours: parseInt(process.env.RESET_HOURS || '24', 10)
    },

    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASS || ''
    },

    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    },

    // Emails that are automatically promoted to super_admin (+ editor) on every
    // login. Comma-separated, case-insensitive. The check runs on every login so
    // a fresh database (or a manually-demoted account) re-promotes on next sign-in.
    superAdminEmails: (process.env.SUPER_ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
};

export const isSuperAdminEmail = (email) => {
    if (!email) return false;
    return config.superAdminEmails.includes(email.toLowerCase());
};

export const logEnvironmentInfo = () => {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║      LARABIA MAGAZINE — ENVIRONMENT CONFIGURATION      ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Environment:    ${config.env.padEnd(38)} ║`);
    console.log(`║ App Port:       ${String(config.app.port).padEnd(38)} ║`);
    console.log(`║ Frontend URL:   ${config.urls.frontend.padEnd(38)} ║`);
    console.log(`║ API URL:        ${config.urls.api.padEnd(38)} ║`);
    console.log(`║ Database Host:  ${config.database.host.padEnd(38)} ║`);
    console.log('╚════════════════════════════════════════════════════════╝');
};

export default config;
