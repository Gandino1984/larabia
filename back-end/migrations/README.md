# Migrations

`001_init_schema.sql` creates the entire larabia-magazine schema in a single pass against an empty database. It is the consolidation of uribarri.online's magazine migrations 027–049.

## Applying

**Docker (Phase 6 onwards):** Drop the SQL file into `db/scripts/` and the MySQL container will run it automatically on first boot (via the `docker-entrypoint-initdb.d` mechanism).

**Manual / local:**
```bash
mysql -u root -p larabia_db < back-end/migrations/001_init_schema.sql
```

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
