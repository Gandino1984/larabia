# larabia-magazine

**La Rabia** — revista comunitaria digital del distrito 02 de Bilbao (Uribarri).

Split out of [uribarri.online](https://github.com/Gandino1984/uribarri.online) so the magazine evolves as its own product with its own backend, database, and identity layer.

## Stack

- **Backend:** Node.js 22+ · Express 4 · Sequelize 6 · MySQL 8 · Sharp · Nodemailer · google-auth-library
- **Frontend:** React 18 · Vite 6 · i18next (es / en / eu)
- **Container:** Docker Compose · nginx-proxy + Let's Encrypt companion

## Layout

```
back-end/
  config/         Sequelize + environment loaders
  models/         Sequelize models — user + 7 magazine tables
  controllers/    Business logic: user, contact, magazine_article, magazine_project, article_blocks, author_profile
  routers/        Express route definitions
  middleware/     ProfileUploadMiddleware + MagazineUploadMiddleware (covers, blocks, profiles)
  services/       emailService.js (Nodemailer — verification, reset, welcome, contact, newsletter)
  utils/          imageConversionUtils (Sharp → WebP), imageValidationUtilities, file_cleanup
  uploads/        Runtime upload dir (gitignored — bind-mounted in production)
  migrations/     001_init_schema.sql — consolidated schema, auto-applied on first DB boot

front-end/        React/Vite app
  src/app_context Auth, UI, Magazine, Author contexts
  src/components  layout, magazine, admin, authors, openmic, humor, newsletter, contact, google-auth, user, notifications
  nginx/          Production nginx config (server_name = _ so it accepts any host the proxy forwards)

Dockerfile          (back-end image)
front-end/Dockerfile (2-stage: vite build → nginx)
docker-compose.yml  Three services: db, back-end, front-end
.env.example        Copy to .env and fill in
```

## Deployment

Production runs on the VPS at **https://larabiamag.com** (+ `www.`), API at **https://api.larabiamag.com**, behind an external nginx-proxy + Let's Encrypt companion on the shared `nginx-proxy` docker network. Routing and TLS are driven by the `VIRTUAL_HOST` / `LETSENCRYPT_HOST` env on each service (from `.env`).

### First-time bring-up

1. **Clone this repo onto the VPS** (e.g. `~/larabia`).
2. **Copy `.env.example` to `.env`** and fill in real values. The defaults already point at `larabiamag.com` / `api.larabiamag.com`.
3. **Start the stack:**
   ```bash
   docker compose up -d --build
   ```
   The first DB boot runs `back-end/migrations/001_init_schema.sql` automatically.
4. **Watch the Let's Encrypt companion** mint certs:
   ```bash
   docker logs -f nginx-proxy-le | grep larabiamag
   ```
5. **Sanity check:** visit `https://larabiamag.com` and `https://api.larabiamag.com/health`.

### Routine deploy (already running)

```bash
cd ~/larabia && git pull origin main && docker compose up -d --build
```

Rebuild only the changed service to be quick (`… up -d --build front-end`). The front-end must be rebuilt whenever `VITE_API_URL` / `VITE_GOOGLE_CLIENT_ID` change — they are **baked at build time** (use `--no-cache` if a build-arg change isn't picked up).

#### Promoting the first super admin

The schema starts empty — first registration produces a regular user. Run this once after registering your first account to grant yourself editor + super-admin:

```sql
docker exec -it larabia_db mysql -u root -p larabia_db -e \
  "UPDATE user SET is_editor = 1, is_super_admin = 1 WHERE email_user = 'you@example.com';"
```

### Changing the domain

The magazine moved from `larabia.uribarri.online` to `larabiamag.com` on 2026-09-09. To move to a different domain later:

1. Point new DNS **A** records (`newdomain.com`, `www.newdomain.com`, `api.newdomain.com`) at the VPS IP and wait for propagation (`dig +short A newdomain.com`).
2. Edit `.env` (comma-separate multiple front hosts for a SAN cert):
   ```
   FRONT_VIRTUAL_HOST=newdomain.com,www.newdomain.com
   API_VIRTUAL_HOST=api.newdomain.com
   FRONTEND_URL=https://newdomain.com
   VITE_API_URL=https://api.newdomain.com
   ```
3. Rebuild so the new `VITE_API_URL` is baked in and the back-end picks up the new env:
   ```bash
   docker compose build --no-cache front-end && docker compose up -d
   ```
4. **Add the new origins to the Google OAuth client** (`Authorized JavaScript origins`: `https://newdomain.com`, `https://www.newdomain.com`) or Google sign-in breaks on the new domain.

No code changes needed — CORS origins derive from `FRONTEND_URL` (the `www.` variant is added automatically). The Let's Encrypt companion mints certs automatically once DNS resolves to the VPS.

## Local development

```bash
# 1. Install deps (one-time)
cd back-end && npm install --prefix ..   # root package.json drives the back-end
cd ../front-end && npm install

# 2. Bring up MySQL (Docker is easiest)
docker compose up -d db

# 3. In one terminal — back-end
npm run dev                              # from repo root, runs nodemon on back-end/index.js

# 4. In another terminal — front-end
cd front-end && npm run dev              # vite at localhost:5174 with proxy → localhost:3000
```

## Differences from uribarri.online

- **Slim user table.** Dropped `type_user`, `phone_user`, `contributor_user`, `calification_user`, `is_manager`, and all `telegram_*` fields. Magazine doesn't have user types — one account per email.
- **No shop / order / org / publication tables.** Those stay in uribarri.online.
- **Independent identities.** A magazine reader does not have an uribarri.online account, and vice-versa. If you're an editor on both, you currently register twice.
- **Email branding** flipped from "Uribarri.Online" to "La Rabia" (`back-end/services/emailService.js`).
- **Upload paths** unified under `back-end/uploads/{magazine,article_blocks,author-profiles,user-profiles}/` and `back-end/assets/images/magazine/projects/`.

## License

ISC — see [LICENSE](LICENSE) (to be added).
