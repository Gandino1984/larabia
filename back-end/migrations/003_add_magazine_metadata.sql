-- ============================================================
-- larabia-magazine: magazine identity (name, slogan, description, logos)
-- Singleton table — only the row with id=1 is ever read or written.
-- Applied on top of 002_add_permissions_system.sql.
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS magazine_metadata (
    id              INT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
    name            VARCHAR(100) NOT NULL DEFAULT 'La Rabia',
    slogan          VARCHAR(255) DEFAULT NULL,
    description     TEXT DEFAULT NULL,
    logo_light      VARCHAR(255) DEFAULT '/LogoLaRabiaWhite.png'
        COMMENT 'Logo shown on dark backgrounds (e.g. header default state)',
    logo_dark       VARCHAR(255) DEFAULT '/logoLaRabiaBlack.png'
        COMMENT 'Logo shown on light backgrounds (e.g. header hover, emails)',
    updated_by      INT UNSIGNED DEFAULT NULL COMMENT 'FK to user — last super admin to edit',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_magazine_metadata_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the singleton row. INSERT IGNORE so the migration is re-runnable.
INSERT IGNORE INTO magazine_metadata (id, name, slogan, description)
VALUES (
    1,
    'La Rabia',
    'Revista comunitaria del distrito 02 de Bilbao',
    'La Rabia es una plataforma digital comunitaria del barrio de Uribarri. Un espacio para compartir historias, voces y experiencias del distrito 02 de Bilbao.'
);
