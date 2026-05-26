-- ============================================================
-- larabia-magazine: permissions system (premium readers + editor approval workflow)
-- Applied on top of 001_init_schema.sql.
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ----- Premium-reader role -----
-- Boolean flag granted manually by a super admin. Premium readers can see
-- articles where is_premium=1.
ALTER TABLE user
    ADD COLUMN is_premium_reader TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Subscriber-tier reader: can access articles with is_premium=1'
        AFTER is_super_admin;

ALTER TABLE user
    ADD INDEX idx_is_premium_reader (is_premium_reader);

-- ----- Premium article flag -----
-- Per-article gate. Free articles are visible to everyone; premium articles
-- require the requester to be premium_reader, an editor, or super_admin
-- (or to be a listed author of the article).
ALTER TABLE magazine_articles
    ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'When 1, only premium_reader / editor / super_admin can read'
        AFTER featured_article;

ALTER TABLE magazine_articles
    ADD INDEX idx_is_premium (is_premium);

-- ----- Editor approval workflow -----
-- Extend status_article with 'pending_approval'. Editors submit articles
-- for review (draft → pending_approval), and a super admin transitions them
-- to published. Super admins can still publish directly.
ALTER TABLE magazine_articles
    MODIFY COLUMN status_article ENUM('draft', 'pending_approval', 'published') NOT NULL DEFAULT 'draft';
