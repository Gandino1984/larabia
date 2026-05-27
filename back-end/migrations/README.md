# Migrations

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

## Tables created

| Table | Purpose |
|---|---|
| `user` | Slim user table — only magazine-relevant fields (no shop / telegram / type_user) |
| `magazine_projects` | Project collections that can group articles |
| `magazine_articles` | Articles (cover + metadata, content lives in `article_blocks`) |
| `article_blocks` | Ordered content blocks per article (text / image / iframe / comic_panel) |
| `article_authors` | M:N junction — multiple authors per article |
| `article_author_invitations` | Pending/accepted/rejected co-author invitations |
| `project_authors` | M:N junction — multiple authors per project |
| `author_profiles` | 1:1 public bio per editor |

## Differences from uribarri.online

- `user` table drops: `type_user`, `phone_user`, `contributor_user`, `calification_user`, `is_manager`, all `telegram_*` columns.
- The unique key on `(email_user, type_user)` is replaced with a unique key on `email_user` alone (one account per email — magazine doesn't have user types).
- No seed data — the magazine starts empty per the split-out plan.
