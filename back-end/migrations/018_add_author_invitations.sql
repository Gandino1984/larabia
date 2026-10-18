-- 018: authors a super admin signs up in «Autoras/es» before they have an
-- account. They accept (→ editora) or decline when they first sign in with
-- that email. The back-end adds these columns at boot if they are missing.
ALTER TABLE user
  ADD COLUMN author_invite_status VARCHAR(20) NULL COMMENT 'pending | accepted | declined',
  ADD COLUMN author_invited_by INT UNSIGNED NULL,
  ADD COLUMN author_invited_at DATETIME NULL;
