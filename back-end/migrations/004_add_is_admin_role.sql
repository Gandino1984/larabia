-- ============================================================
-- larabia-magazine: add is_admin role (separate from is_editor)
--
-- Final role tiers after this migration:
--   is_super_admin  → everything (manage users, metadata, approve articles)
--   is_admin        → create + publish directly (no approval round-trip)
--   is_editor       → create + submit-for-approval (existing behavior)
--   is_premium_reader → read premium articles
--   default          → read free published articles
--
-- All flags are independent booleans, so a user can hold multiple
-- simultaneously (super admins are implicitly admins + editors).
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

ALTER TABLE user
    ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Admin: can create and publish articles directly (no approval)'
        AFTER is_editor;

ALTER TABLE user
    ADD INDEX idx_is_admin (is_admin);
