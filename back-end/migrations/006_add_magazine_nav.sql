-- ============================================================
-- larabia-magazine: configurable top-bar navigation (Phase 2)
-- Singleton table — only the row with id=1 is ever read or written.
-- Lets super admins choose which buttons appear in the top bar, their order,
-- labels, and what they do (go to a section, open a modal, deep-link to an
-- article/project/author, or an external URL).
--
-- nav_config defaults to NULL: when null the front-end renders its built-in
-- DEFAULT_NAV (today's navigation), so the bar is unchanged until edited.
-- Applied on top of 005_add_magazine_theme.sql.
--
-- NOTE: not auto-applied to an existing DB — see migrations/README.md.
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS magazine_nav (
    id          INT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
    nav_config  JSON DEFAULT NULL
        COMMENT 'Ordered array of top-bar items (links/groups). NULL = built-in default nav.',
    updated_by  INT UNSIGNED DEFAULT NULL COMMENT 'FK to user — last super admin to edit',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_magazine_nav_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the singleton row (nav_config stays NULL = built-in default nav).
INSERT IGNORE INTO magazine_nav (id) VALUES (1);
