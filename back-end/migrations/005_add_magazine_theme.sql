-- ============================================================
-- larabia-magazine: configurable theme / appearance (Phase 1)
-- Singleton table — only the row with id=1 is ever read or written.
-- Lets super admins set a color scheme, landing background and animation
-- behavior at runtime. All columns default to the *current* hardcoded look,
-- so the app is visually unchanged until a super admin edits it.
-- Applied on top of 004_add_is_admin_role.sql.
--
-- NOTE: not auto-applied to an existing DB — see migrations/README.md.
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS magazine_theme (
    id                      INT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
    preset                  VARCHAR(40)  NOT NULL DEFAULT 'default'
        COMMENT 'Active preset key; "default" reproduces the original design',
    tokens                  JSON DEFAULT NULL
        COMMENT 'CSS custom-property overrides as {"--color-bg":"#252525", ...}',
    landing_bg_type         ENUM('color','image') NOT NULL DEFAULT 'color',
    landing_bg_value        VARCHAR(255) DEFAULT NULL
        COMMENT 'Hex color (type=color) or /uploads/theme/... path (type=image)',
    animations_enabled      TINYINT(1) NOT NULL DEFAULT 1,
    animation_speed         VARCHAR(10) NOT NULL DEFAULT 'normal'
        COMMENT 'slow | normal | fast',
    respect_reduced_motion  TINYINT(1) NOT NULL DEFAULT 1,
    updated_by              INT UNSIGNED DEFAULT NULL COMMENT 'FK to user — last super admin to edit',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_magazine_theme_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the singleton row with the default preset. INSERT IGNORE so re-runnable.
INSERT IGNORE INTO magazine_theme (id, preset) VALUES (1, 'default');
