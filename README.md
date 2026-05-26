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

### Stage 1 — test on the existing `larabia.uribarri.online`

The new stack will replace the current `magazine-front` container that lives in uribarri.online's docker-compose. The DNS for `larabia.uribarri.online` already points at the VPS; you've added an `api.larabia` DNS record for the new API subdomain.

1. **Clone this repo onto the VPS** (e.g. `~/larabia-magazine`).
2. **Copy `.env.example` to `.env`** and fill in real values. The Stage-1 defaults (`larabia.uribarri.online` + `api.larabia.uribarri.online`) are already in place.
3. **Stop the old magazine-front container** so it doesn't conflict on `VIRTUAL_HOST=larabia.uribarri.online`:
   ```bash
   docker stop magazine-front && docker rm magazine-front
   ```
4. **Start the new stack:**
   ```bash
   docker compose up -d --build
   ```
   The first DB boot runs `back-end/migrations/001_init_schema.sql` automatically.
5. **Watch the Let's Encrypt companion** mint certs for `api.larabia.uribarri.online`:
   ```bash
   docker logs -f nginx-proxy-le | grep larabia
   ```
6. **Sanity check:** visit `https://larabia.uribarri.online` and `https://api.larabia.uribarri.online/health`.

#### Promoting the first super admin

The schema starts empty — first registration produces a regular user. Run this once after registering your first account to grant yourself editor + super-admin:

```sql
docker exec -it larabia_db mysql -u root -p larabia_db -e \
  "UPDATE user SET is_editor = 1, is_super_admin = 1 WHERE email_user = 'you@example.com';"
```

### Stage 2 — move to its own domain

Whenever you're ready to move off the subdomain:

1. Point new DNS records (`yourmagazine.com` + `api.yourmagazine.com`) at the VPS IP.
2. Edit `.env`:
   ```
   FRONT_VIRTUAL_HOST=yourmagazine.com
   API_VIRTUAL_HOST=api.yourmagazine.com
   FRONTEND_URL=https://yourmagazine.com
   VITE_API_URL=https://api.yourmagazine.com
   ```
3. Rebuild the front-end so the new `VITE_API_URL` is baked in:
   ```bash
   docker compose up -d --build front-end back-end
   ```

That's it — no code changes.

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
