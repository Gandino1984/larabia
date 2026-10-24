# Migrations

**English** · [Español](README.es.md)

`001_init_schema.sql` creates the entire larabia-magazine schema in a single pass against an empty database. It is the consolidation of uribarri.online's magazine migrations 027–049.

Later numbered files (`002_…`, `003_…`, `004_…`) are **incremental** changes layered on top of `001`.

## Applying

**Docker, fresh database only:** files in `db/scripts/` are run automatically by the MySQL container via `docker-entrypoint-initdb.d` — but **only on first boot, when the data volume is empty**. Once the volume exists, MySQL never re-runs the init scripts, so adding a new `00x_*.sql` file does **not** apply it to a running/existing database. New migrations on an existing DB must be applied by hand (see below).

**Manual / local (fresh DB):**
```bash
mysql -u root -p larabia_db < back-end/migrations/001_init_schema.sql
```

### Applying an incremental migration to an existing database

Run each new migration **exactly once**, in order. They are **not idempotent** — an `ALTER TABLE … ADD COLUMN/INDEX` errors with "Duplicate column/key" if run twice, so check first.

Against a running Docker stack (the `.sql` file may not even be present on the deploy host — you can pipe it in, or paste the statements inline):

```bash
# from a checkout that has the file:
docker exec -i larabia_db mysql -u root -p"$ROOT_PW" larabia_db \
  < back-end/migrations/004_add_is_admin_role.sql

# or inline, if the file isn't on this host:
docker exec -i larabia_db mysql -u root -p"$ROOT_PW" larabia_db <<'SQL'
ALTER TABLE user ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_editor;
ALTER TABLE user ADD INDEX idx_is_admin (is_admin);
SQL
```

Check whether a migration is already applied before running it, e.g.:
```bash
docker exec -i larabia_db mysql -u root -p"$ROOT_PW" \
  -e "SHOW COLUMNS FROM user LIKE 'is_admin';" larabia_db
```
A row means it's already applied — do **not** re-run.

## Boot-time columns

Since `012`, the back-end checks at boot (`back-end/index.js`) for the columns its newer migrations add and creates any that are missing, so a deploy no longer depends on applying them by hand:

| Migration | Adds |
|---|---|
| `012` | `magazine_workshops.audience_workshop` |
| `013` | `magazine_workshops.lat_workshop`, `lng_workshop` |
| `016` | `article_blocks.block_type` gains `'paisaje'`; `article_blocks.soundscape_data` |
| `017` | `sections_article` / `sections_requested_article`, `sections_project` / `sections_requested_project` |
| `018` | `user.author_invite_status`, `author_invited_by`, `author_invited_at` |
| `019` | `translations_article`, `translations_block`, `translations_project` |
| `021` | `reader_subscriptions.complimentary`, `complimentary_at` |
| `022` | `magazine_workshops.free_workshop` |
| `024` | `magazine_articles.featured_order` |
| `025` | `user.newsletter_token` (unique) |
| `026` | `user.author_invite_email_sent_at` |

The tables of `009`, `010`, `011`, `014`, `015`, `020` and `023` are created at boot with Sequelize `sync()` when missing. The SQL files stay the reference for a fresh database.

## Tables

| Table | Purpose |
|---|---|
| `user` | Accounts: roles (`is_editor`, `is_admin`, `is_super_admin`, `is_premium_reader`), Google link, author invitation status, newsletter (`receives_newsletter`, `newsletter_token`) |
| `magazine_projects` | Projects that group publications (type, format, sections, translations) |
| `magazine_articles` | Publications: cover and metadata; the content lives in `article_blocks` |
| `article_blocks` | Ordered content blocks: `text` / `image` / `iframe` / `comic_panel` / `paisaje` (+ translations) |
| `article_authors` | M:N — the authors of an article |
| `article_author_invitations` | Co-author invitations (pending / accepted / rejected) |
| `project_authors` | M:N — the authors of a project |
| `author_profiles` | The public author profile of a user (bio, links, draft / published) |
| `magazine_metadata` | Singleton: name, slogan, description, logos |
| `magazine_theme` | Singleton: theme preset, colours, front page background, animations |
| `magazine_nav` | Singleton: the top-bar menu (`nav_config` JSON; NULL = default) |
| `magazine_workshops` | Workshops (date, place, map location, capacity, audience) |
| `workshop_authors` | M:N — who leads a workshop |
| `workshop_reservations` | Bookings |
| `workshop_blocks` | People blocked from a workshop |
| `workshop_invitations` | Workshop invitations (they hold a place while pending) |
| `workshop_spot_requests` | Requests for an extra place in a full workshop (socios/as; accepting opens one more) |
| `article_likes`, `article_favorites`, `article_comments` | Readers' engagement |
| `project_subscriptions` | Readers following a project |
| `reader_subscriptions` | Paid subscriptions (Stripe customer and subscription) |
| `open_space_proposals` | Literary proposals sent from Espacio abierto (text or a private file in `uploads/proposals/`, status) |

## Differences from uribarri.online

- `user` table drops: `type_user`, `phone_user`, `contributor_user`, `calification_user`, `is_manager`, all `telegram_*` columns.
- The unique key on `(email_user, type_user)` is replaced with a unique key on `email_user` alone (one account per email — magazine doesn't have user types).
- No seed data — the magazine starts empty per the split-out plan.
