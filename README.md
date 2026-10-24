# La Rabia — larabia-magazine

**English** · [Español](README.es.md)

**La Rabia** is the community digital magazine of district 02 of Bilbao (Uribarri). Live at **https://larabiamag.com** (API: **https://api.larabiamag.com**).

It began as part of [uribarri.online](https://github.com/Gandino1984/uribarri.online) and was split out so the magazine could grow as its own product, with its own back-end, database and accounts.

## Contents

- [What it does](#what-it-does)
- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Roles and permissions](#roles-and-permissions)
- [How the main pieces work](#how-the-main-pieces-work)
- [Languages (i18n)](#languages-i18n)
- [Local development](#local-development)
- [Tests](#tests)
- [Deployment](#deployment)
- [Database and migrations](#database-and-migrations)
- [Conventions](#conventions)
- [Credits](#credits)

## What it does

**Reading**

- **Home:** a hero slider of featured stories (its title, excerpt and project follow the language chosen in the header), followed by previews of the sections.
- **Sections:** the top-bar buttons (Articles, Projects, Workshops, More › Fiction, International…). Any article or project can also appear in other sections, if a super admin approves it.
- **Projects page:** «Projects» in the top bar opens the page of every published project, newest first, with a search bar (title, description or author, ignoring case and accents); each card shows its authors and how many publications it has.
- **Publications** can belong to a **project** (a series, a zine, a book…) or stand on their own. Each one is one of these types:
  - an **article** (text, images and embeds, built from blocks);
  - a **comic** (a horizontal reader whose panels can be images, links, audio, embeds or soundscapes, with panel-by-panel navigation, saved reading progress and full screen); in the creator, each panel shows the percentage of its image while it uploads;
  - a **micro-profile**;
  - a **soundscape** (*paisaje sonoro*, a drawing that moves with a sound).
- **Authors:** the directory of author profiles, in alphabetical order with a search bar (by name or specialty, ignoring case and accents), and each author's publications. An author's photo is their profile's own photo (else their account image) everywhere: the directory, the avatars next to their name and their card.
- **Workshops:**
  - The cards are public.
  - **Sharing:** anyone, with or without an account, can copy a workshop's link from its ⋯ menu («Compartir»), as with articles. The link opens the workshop page for someone signed in; signed out, it shows that workshop's card in Talleres (ringed in gold, in its tab, past workshops included) with a note to sign in, and the page opens once they have.
  - Opening one needs a sign-in. Booking a place depends on the workshop, decided when it's created or edited: **free** workshops are open to anyone with an account; the others need being a member — *socio/a* (the team doesn't need it). The cards say «Gratuito» or «Para socios/as», and there's an «Acceso» filter.
  - **Extra places:** when a workshop is full, a socio/a (paying or complimentary) can ask for one more place, with an optional message — and so can anyone with an account if the workshop is free (without an account, never). The «Pedir una plaza» button is on the workshop card and on its page, and the card shows how many requests are pending. Its managers see the requests on the workshop page and in the bell: accepting opens a place (capacity + 1) and gives it to that person; declining doesn't. The person hears the answer in the bell (`workshop_spot_requests`).
  - Managers — super admins, and the team members who created or teach a workshop (its *talleristas*), like an article's authors — edit it, invite people (an invitation holds a place), remove participants or block them.
  - Each workshop has a location on a map (Leaflet/OpenStreetMap). There's no link out to Google Maps: people find their way on the map itself.
- **Espacio abierto** (open space): the literary proposals the magazine publishes. Anyone with an account (no need to be a member) can send one through a form, then follow its status there.
- **Engagement:** likes, favourites, comments and following projects.
- **Notifications** in the header bell: new content, invitations, answers and membership.
- **Top bar:** the bell sits right after the profile photo; «Publica» (editors and up) is the last item of the bar (on phones, an icon left of the burger). The language picker is a small pill outside the bar, top left (the red «Hazte socio/a» button goes under it), so it's there even where the bar hides (an article); on phones it's in the burger menu.
- **Contact form** and **newsletter** («Recomendaciones»):
  - New accounts (signing in with Google for the first time) get it; the sign-in page says so. Anyone turns it on or off from «Recomendaciones».
  - Every newsletter has a one-click «Darme de baja» link that works without signing in, and a `List-Unsubscribe` header for the mail client's own button (a random token per person, `user.newsletter_token`, never sent to the front-end).

**Three languages:** Spanish, English and Basque.

- The whole interface, the server's messages and the dates follow the header language.
- Articles and projects can carry English and Basque versions of their texts, and the article reader has its own ES · EN · EU switch.

See [Languages (i18n)](#languages-i18n).

**Publishing**

- **The creator** is a six-step wizard: project (new, existing or none) → classification, authors and sections → cover, title and excerpt → type → content → review and publish.
- **Review:** everything is a draft until it's published. Everyone below super admin sends their work for review. A super admin approves it, or sends it back with a reason; authors can move their work back to draft.
- **The workshop editor** works like the creator: a full page with four steps (the workshop → when and where → cover and talleristas → review and save) and «Mis talleres», the workshops you manage. Admins and super admins create workshops; their talleristas on the team edit them.
- **Soundscape editor:** a three-step wizard (image and style → sound and player → framing and summary), used both in articles and in comic panels.
- **Invited authors:** a super admin can sign up an author who has no account yet and publish on their behalf. The person accepts or declines when they first sign in (see below).

**Administration** (*Admin*, super admins):

- users and roles;
- the review queue (articles, projects and section changes);
- the **front page** (*Portada*): the order of the hero's featured stories (arrows or drag and drop), taking one out, adding any published story (`magazine_articles.featured_order`). The hero shows only the featured stories; the most liked ones that aren't featured are listed as suggestions, to feature with one click;
- the proposals sent from Espacio abierto (read them, accept or decline them, download the file, reply by e-mail);
- magazine details (name, slogan, logos);
- workshops;
- appearance (theme presets, colours, animations);
- the top-bar **menu builder** (labels in ES / EN / EU, who sees each button, what it opens).

**Membership** (*hacerse socio/a*): readers become paying members through **Stripe** (monthly and yearly). The interface says «socio/a» («Hazte socio/a», the «Socio/a» badge); the code and the tables still call it *subscription*.

- Members get a badge and can book workshops.
- The feature stays off until the `STRIPE_*` variables are set.
- **Not public yet:** while `MEMBERSHIP_PUBLIC` isn't `true` (server `.env`), only admins and super admins see «Hazte socio/a» and can pay — to test it. Anyone else sees no button, members-only workshops just say they're for socios/as, and the server refuses to start a payment (`not_open`). Set it to `true` and restart the back-end to open it.
- A super admin can make someone a **complimentary member** (*socio/a de cortesía*) in Admin › Usuarios: they count as a member (same badge, workshops) without Stripe. It's the `complimentary` column of `reader_subscriptions`, which the Stripe sync never writes.

## Stack

- **Back-end:** Node.js 22+ · Express 4 · Sequelize 6 · MySQL 8 · Sharp (images → WebP) · ffmpeg (audio → AAC, loudness-normalised) · Nodemailer · google-auth-library · Stripe
- **Front-end:** React 18 · Vite 6 · i18next (es / en / eu) · react-quill · Leaflet · @react-spring/web · Vitest
- **Infrastructure:** Docker Compose (db, back-end, front-end) · external nginx-proxy + Let's Encrypt companion

## Repository layout

```
back-end/
  index.js        Express app: static files, CORS, i18n middleware, routes, boot-time column checks
  config/         Sequelize + environment (CORS origins derive from FRONTEND_URL)
  models/         Sequelize models (21 tables)
  controllers/    One folder per area: user (incl. author_invitation_controller, google_oauth_controller),
                  magazine_article, magazine_project, article_blocks, author_profile, magazine_workshop,
                  engagement, subscription, paisaje, magazine_metadata, magazine_theme, magazine_nav, contact
  routers/        Express routes (api_router mounts them all)
  middleware/     Upload middlewares (covers, blocks, profiles, logos, theme backgrounds)
  services/       emailService.js (verification, reset, welcome, contact, newsletter, author invitation)
  utils/          authHelper (roles), sections, translations, image conversion/validation, file cleanup
  i18n/           messages.js (the server's messages in en/eu) + translateResponses.js (middleware)
  migrations/     Numbered SQL migrations (see its README)
  uploads/        Runtime uploads (gitignored, a volume in production)

front-end/
  src/app_context/  React contexts: Auth, UI, Magazine, Author, AuthorInvitation, Workshop, Engagement,
                    Subscription, Notification, PendingReview, Metadata, Theme, Nav (+ navConfig, themePresets)
  src/components/   layout, magazine (home, lists, reader, comic viewer), admin (creator, blocks, comic editor,
                    Admin tabs), authors, workshops, maps, google-auth, notifications, user, common
  src/paisaje/      The soundscape engine (vendored, untouched) + integration/ (the magazine's code) — see its README
  src/utils/        contentLang (content versions), locale (dates), sections, articleFilters, projectKinds…
  src/i18n/         i18next config + locales/{es,en,eu}.json (flat dotted keys)
  nginx/            Production nginx config + keep-assets.sh (keeps previous builds' JS chunks)

Dockerfile            Back-end image (includes ffmpeg)
front-end/Dockerfile  Two stages: vite build → nginx
docker-compose.yml    db, back-end, front-end
.env.example          Copy to .env and fill it in
```

## Roles and permissions

Roles are independent flags on `user`. One account can hold several.

| Role | Can |
|---|---|
| Reader (default) | Read, like, comment, follow projects, become a member, book workshops (as a member) |
| Premium reader (`is_premium_reader`) | Also read articles marked premium |
| Editor (`is_editor`) | Create publications and author profiles; everything goes through review. Edit the workshops they teach |
| Admin (`is_admin`) | Like an editor, plus creating workshops and newsletter recommendations |
| Super admin (`is_super_admin`) | Everything; publishes directly; reviews others' work; Admin panel; invites authors |

- `canCreateContent` = editor, admin or super admin. `canPublishDirectly` = super admin only.
- The server checks the role on each request: it reads the `x-user-id` header and looks the user up (`back-end/utils/authHelper.js`).
- When access is refused, the server answers 403 with a `code`, never 401: the front-end logs the user out on 401.
- E-mails listed in `SUPER_ADMIN_EMAILS` become super admins when they sign in.

## How the main pieces work

**Sign-in** is with Google only (Google Identity Services). Signing in with an e-mail that already has an account without a password links Google to that account.

**Review workflow:**

- A non-super-admin's work goes from `draft` to `pending_approval` (*send for review*), and from there to `published` (approve) or back to `draft` with a reason (reject).
- Super admins work through it in Admin › Pendientes. The header badge counts what's waiting, including unread Espacio abierto proposals.

**Sections** (`back-end/utils/sections.js`, `front-end/src/utils/sections.js`):

- The section list comes from the menu: the buttons of type "article category", plus Espacio abierto and Micro-perfiles.
- Each publication stores its *approved* sections and the sections it *requested* (JSON columns). A super admin settles the requests.

**Invited authors** (`back-end/controllers/user/author_invitation_controller.js`):

1. In «Autoras/es», a super admin adds a name and e-mail. The server creates a Google account without a password (or invites the existing reader account) and e-mails the invitation.
2. Until the person answers, super admins can write their profile and credit them. A super admin who is the only author and adds them publishes on their behalf.
3. On their first sign-in, the person sees the invitation (a modal and a bell item):
   - **Accept** → they become an editor.
   - **Decline** → they stay a reader, their profile is hidden, and what nobody else signs is signed «La Rabia».
   - Already made editor by a super admin → nothing to answer: on that first sign-in the invitation counts as accepted (its email says «sign in», not «accept»).
4. The invitation email (in Spanish and English, one after the other; HTML + plain text; replies go to `CONTACT_EMAIL`) records when it went out (`user.author_invite_email_sent_at`). The profile editor says when it was sent, or that it isn't recorded as sent, with «Enviar email». In «Autoras/es», super admins see the pending invitations not recorded as sent — also of people already made editors who haven't signed in yet — and send them all with one button (`GET /user/invite-author/unsent`, `POST /user/invite-author/send-unsent`).

**Espacio abierto proposals** (`back-end/controllers/open_space/`, `front-end/src/components/openmic/`):

- `POST /open-space/proposals` (multipart), for anyone signed in. It takes a title, the kind of text, a short explanation (≤ 600 characters) and the text: pasted (≤ 50,000 characters), as a file (PDF, DOC, DOCX, ODT, TXT or RTF, ≤ 5 MB), or both.
- At most 5 proposals per person in 24 hours. Each one e-mails the team (`CONTACT_EMAIL`).
- The files are stored in `uploads/proposals/` under random names and are **not public**. `index.js` answers 404 for that folder before the static route. The sender and super admins download a file through `GET /open-space/proposals/:id/file`.
- Status: `new` → `read` (when a super admin opens it in Admin › Propuestas) → `accepted` / `declined`. The sender sees it in the section and can withdraw the proposal.

**Content in other languages** (`back-end/utils/translations.js`, `front-end/src/utils/contentLang.js`):

- The original is Spanish. English and Basque versions live in JSON columns: `translations_article` (title, excerpt), `translations_block` (text, caption, alt text) and `translations_project` (title, description).
- In the creator, the «Idioma en el que escribes» switch selects which version is being written.
- Readers get the version of their language, or the original when there is none.

**Soundscapes** (`front-end/src/paisaje/`):

- The engine is by Cristian Vergara and **must not be modified**; magazine code goes in `integration/`.
- Images are processed in the browser. The server only stores the drawing and normalises the audio with ffmpeg.
- All magazine audio, comics included, goes through this pipeline (any size, stored as AAC).

**Old JS chunks:** each front-end build renames its chunks. nginx serves `/assets/` from the current build and falls back to a volume that keeps previous builds for 30 days, so tabs opened before a deploy keep working.

## Languages (i18n)

The interface is fully translated into **es / en / eu**. There are three layers:

1. **Interface:**
   - Every visible string goes through `t('key', 'default in Spanish')`. The keys live in `front-end/src/i18n/locales/{es,en,eu}.json` (flat dotted keys; plurals use `_one` / `_other`).
   - Contexts and utilities use `i18n.t` from `src/i18n/config`.
   - The menu labels are stored with `es` / `en` / `eu` and are edited in Admin › Menú.
2. **Server messages:**
   - The front-end sends the header language as `Accept-Language`.
   - `back-end/i18n/translateResponses.js` translates the `error`, `success` and `message` strings of every JSON answer, using `back-end/i18n/messages.js`.
   - The code keeps writing messages in Spanish. A new message needs an entry there (exact text, or a pattern when it carries values).
3. **Content:** the versions of articles and projects described above.

**Dates** go through `front-end/src/utils/locale.js` (`localDate`). Chrome has no Basque dates (its `Intl` falls back to Spanish), so Basque is formatted by hand there («2026ko urriaren 19a»).

**Not translated:** the soundscape engine's own interface texts (the engine is kept as delivered) and the magazine's own content in the database (name, slogan, author bios).

## Local development

```bash
# 1. Dependencies (once)
npm install                      # repo root: drives the back-end
cd front-end && npm install

# 2. MySQL (Docker is easiest)
docker compose up -d db

# 3. Back-end (repo root): nodemon on back-end/index.js
npm run dev

# 4. Front-end: Vite on localhost:5174, proxying API paths to VITE_API_URL (default localhost:3000)
cd front-end && npm run dev
```

- The back-end needs `ffmpeg` installed to process audio.
- Without the `EMAIL_*` variables, no e-mails are sent. The rest works.

## Tests

- `cd front-end && npm test` runs the soundscape engine's test suite (Vitest, 277 tests). They must stay green.
- The other features were tested end to end with Puppeteer against a throwaway MySQL. Those scripts aren't part of the repository.

## Deployment

Production runs on a VPS: **https://larabiamag.com** (+ `www.`) and **https://api.larabiamag.com**.

- The site sits behind an external nginx-proxy with its Let's Encrypt companion, on the shared `nginx-proxy` Docker network.
- Routing and certificates come from `VIRTUAL_HOST` / `LETSENCRYPT_HOST` on each service, set from `.env`.

### First-time bring-up

1. Clone the repository on the VPS (e.g. `~/larabia`).
2. Copy `.env.example` to `.env` and fill it in. The defaults point at `larabiamag.com` / `api.larabiamag.com`.
3. Start it: `docker compose up -d --build`. The first database boot runs `back-end/migrations/001_init_schema.sql`.
4. Watch the certificates being issued: `docker logs -f nginx-proxy-le | grep larabiamag`.
5. Check `https://larabiamag.com` and `https://api.larabiamag.com/health`.

### Routine deploy

```bash
cd ~/larabia && git pull origin main \
  && docker compose build --no-cache back-end front-end \
  && docker compose up -d back-end front-end \
  && docker image prune -f && docker builder prune -f
```

- **Rebuild only what changed.** `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` are baked into the front-end at build time.
- **Prune after every build:** each `--no-cache` build leaves the old image behind (~1.4 GB for the back-end).
- **Back up the database before a deploy that changes the schema:**
  ```bash
  docker exec larabia_db sh -c 'mysqldump --single-transaction -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
    | gzip > ~/larabia-backups/db-$(date +%F).sql.gz
  ```

### First super admin

Put your e-mail in `SUPER_ADMIN_EMAILS` before signing in for the first time. It is promoted automatically on every sign-in.

### Changing the domain

1. Point the DNS **A** records (`newdomain.com`, `www.newdomain.com`, `api.newdomain.com`) at the VPS.
2. Edit `FRONT_VIRTUAL_HOST`, `API_VIRTUAL_HOST`, `FRONTEND_URL` and `VITE_API_URL` in `.env`.
3. Rebuild with `docker compose build --no-cache front-end && docker compose up -d`.
4. Add the new origins to the Google OAuth client ("Authorized JavaScript origins").

The CORS origins derive from `FRONTEND_URL`, which adds the `www.` variant.

## Database and migrations

The schema is in `back-end/migrations/` ([README](back-end/migrations/README.md) · [ES](back-end/migrations/README.es.md)).

- `001` creates everything on an empty database. The numbered files after it are incremental.
- Since `012`, the back-end also adds its newer columns at boot when they're missing (`back-end/index.js`), so a deploy doesn't depend on applying them by hand.
- Several tables are created at boot with `sync()` if missing (engagement, subscriptions, workshop blocks and invitations).

## Conventions

- **Every visible string in the three languages, in the same change** (interface keys; `messages.js` for server messages).
- **Capitals only on real buttons.** Badges, notifications and clickable text keep their case (`text-transform: none`).
- **Mobile first:** check every screen at 390 px wide as well as on desktop.
- **Soundscape engine:** don't touch `src/paisaje/converter`, `styles`, `wizard` or the player logic; magazine code goes in `integration/`.
- **Authenticated requests** pass `headers: { 'x-user-id': currentUser.id_user }` explicitly.

## Credits

- **Paisaje sonoro** (the soundscape engine): **Cristian Vergara**, 2026. It's integrated with his permission ([origin](https://github.com/zuriai-org/paisaje-sonoro-public)).
- Maps © OpenStreetMap contributors.

## License

ISC — see [LICENSE](LICENSE) (to be added).
