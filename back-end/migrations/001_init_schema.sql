-- ============================================================
-- larabia-magazine: initial schema
-- Consolidated from uribarri.online magazine migrations 027–049.
-- Run against an empty larabia_db. Tables are created in FK-safe order:
--   user, magazine_projects, magazine_articles, article_blocks,
--   article_authors, article_author_invitations, project_authors,
--   author_profiles.
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================
-- user (slim — magazine-only fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS user (
    id_user                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name_user                     VARCHAR(100) NOT NULL,
    email_user                    VARCHAR(255) NOT NULL,
    pass_user                     VARCHAR(255) DEFAULT NULL,
    google_id                     VARCHAR(255) DEFAULT NULL,
    auth_provider                 ENUM('local','google') NOT NULL DEFAULT 'local',
    image_user                    VARCHAR(255) DEFAULT NULL,
    location_user                 VARCHAR(100) NOT NULL DEFAULT '',
    age_user                      INT NOT NULL DEFAULT 18,
    email_verified                TINYINT(1) NOT NULL DEFAULT 0,
    verification_token            VARCHAR(255) DEFAULT NULL,
    verification_token_expires    DATETIME DEFAULT NULL,
    password_reset_token          VARCHAR(255) DEFAULT NULL,
    password_reset_token_expires  DATETIME DEFAULT NULL,
    is_editor                     TINYINT(1) NOT NULL DEFAULT 0,
    is_super_admin                TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Magazine super-admin: can edit/delete any article',
    receives_newsletter           TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Subscribed to newsletter emails',
    UNIQUE KEY unique_email_user (email_user),
    INDEX idx_is_editor (is_editor),
    INDEX idx_is_super_admin (is_super_admin),
    INDEX idx_password_reset_token (password_reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- magazine_projects (created before articles so articles.project_id FK resolves)
-- ============================================================
CREATE TABLE IF NOT EXISTS magazine_projects (
    id_project           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title_project        VARCHAR(255) NOT NULL,
    description_project  TEXT DEFAULT NULL,
    author_id            INT UNSIGNED DEFAULT NULL COMMENT 'Legacy: pre-multi-author. Use project_authors for new records.',
    author_name          VARCHAR(100) DEFAULT NULL,
    cover_image_project  VARCHAR(255) DEFAULT NULL,
    type_project         ENUM(
        'ficción','no-ficción','ensayo','académico','científico',
        'periodístico','poético','narrativo','experimental','documental','autobiográfico'
    ) DEFAULT NULL,
    format_project       ENUM(
        'cómic','crónica','ensayo','cuento','multimedia','podcast','video',
        'fotografía','ilustración','performance','instalación','novela',
        'artículo','reportaje','entrevista','poesía'
    ) DEFAULT NULL,
    date_published       DATETIME DEFAULT NULL,
    status_project       ENUM('draft','published') NOT NULL DEFAULT 'draft',
    featured_project     BOOLEAN NOT NULL DEFAULT FALSE,
    view_count_project   INT UNSIGNED NOT NULL DEFAULT 0,
    active_project       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status_project),
    INDEX idx_featured (featured_project),
    INDEX idx_type (type_project),
    INDEX idx_format (format_project),
    INDEX idx_author (author_id),
    INDEX idx_published_date (date_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- magazine_articles
-- ============================================================
CREATE TABLE IF NOT EXISTS magazine_articles (
    id_article            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title_article         VARCHAR(255) NOT NULL,
    content_article       LONGTEXT NOT NULL,
    excerpt_article       TEXT DEFAULT NULL,
    author_id             INT UNSIGNED DEFAULT NULL COMMENT 'Legacy: pre-multi-author. Use article_authors for new records.',
    author_name           VARCHAR(100) DEFAULT NULL,
    project_id            INT UNSIGNED DEFAULT NULL,
    cover_image_article   VARCHAR(255) DEFAULT NULL,
    category_article      VARCHAR(100) DEFAULT 'general',
    tags_article          JSON DEFAULT NULL,
    date_published        DATETIME DEFAULT NULL,
    status_article        ENUM('draft','published') NOT NULL DEFAULT 'draft',
    featured_article      BOOLEAN NOT NULL DEFAULT FALSE,
    view_count_article    INT UNSIGNED NOT NULL DEFAULT 0,
    active_article        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status_article),
    INDEX idx_featured (featured_article),
    INDEX idx_category (category_article),
    INDEX idx_author (author_id),
    INDEX idx_published_date (date_published),
    INDEX idx_project (project_id),
    INDEX idx_status_active    (status_article, active_article),
    INDEX idx_featured_status  (featured_article, status_article, active_article),
    INDEX idx_category_status  (category_article, status_article, active_article),
    CONSTRAINT fk_article_project
        FOREIGN KEY (project_id) REFERENCES magazine_projects (id_project)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- article_blocks (block-based article content)
-- ============================================================
CREATE TABLE IF NOT EXISTS article_blocks (
    id_block          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id        INT UNSIGNED NOT NULL,
    block_type        ENUM('text','image','iframe','comic_panel') NOT NULL,
    block_order       INT UNSIGNED NOT NULL DEFAULT 0,
    content           TEXT,
    image_url         VARCHAR(500),
    image_alt         TEXT,
    image_caption     TEXT,
    iframe_url        VARCHAR(500),
    iframe_width      VARCHAR(50) DEFAULT '100%',
    iframe_height     VARCHAR(50) DEFAULT '400px',
    is_interactive    BOOLEAN DEFAULT FALSE COMMENT 'Whether the panel is interactive (clickable)',
    interaction_type  ENUM('link','audio','iframe') NULL COMMENT 'Type of interaction',
    interaction_data  VARCHAR(500) NULL COMMENT 'URL for link, audio file path for audio, iframe src for iframe',
    audio_stop_panel  INT NULL COMMENT 'Panel number where audio should stop playing (null = no auto-stop)',
    audio_mode        ENUM('loop','once') NULL DEFAULT 'once',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_article_blocks_article_id (article_id),
    INDEX idx_article_blocks_order      (article_id, block_order),
    INDEX idx_article_blocks_interactive (is_interactive),
    FOREIGN KEY (article_id) REFERENCES magazine_articles (id_article) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- article_authors (M:N user <-> article)
-- ============================================================
CREATE TABLE IF NOT EXISTS article_authors (
    id_article_author INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id        INT UNSIGNED NOT NULL,
    user_id           INT UNSIGNED NOT NULL,
    author_order      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=first author, 1=second, etc.',
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_article_user (article_id, user_id),
    INDEX idx_article_id    (article_id),
    INDEX idx_user_id       (user_id),
    INDEX idx_article_order (article_id, author_order),
    FOREIGN KEY (article_id) REFERENCES magazine_articles (id_article) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Junction table for article-author many-to-many relationships';

-- ============================================================
-- article_author_invitations (co-author invitation workflow)
-- ============================================================
CREATE TABLE IF NOT EXISTS article_author_invitations (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id       INT UNSIGNED NOT NULL,
    inviter_user_id  INT UNSIGNED NOT NULL,
    invitee_user_id  INT UNSIGNED NOT NULL,
    status           ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_article_invitee (article_id, invitee_user_id),
    INDEX idx_article (article_id),
    INDEX idx_invitee (invitee_user_id),
    INDEX idx_inviter (inviter_user_id),
    FOREIGN KEY (article_id) REFERENCES magazine_articles (id_article) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks co-author invitations for magazine articles';

-- ============================================================
-- project_authors (M:N user <-> project)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_authors (
    id_project_author INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id        INT UNSIGNED NOT NULL,
    user_id           INT UNSIGNED NOT NULL,
    author_order      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=primary creator, 1=second collaborator, etc.',
    created_at        DATETIME NOT NULL,
    updated_at        DATETIME NOT NULL,
    UNIQUE KEY unique_project_user (project_id, user_id),
    INDEX idx_project_id      (project_id),
    INDEX idx_user_id_project (user_id),
    CONSTRAINT fk_project_authors_project
        FOREIGN KEY (project_id) REFERENCES magazine_projects (id_project)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_project_authors_user
        FOREIGN KEY (user_id) REFERENCES user (id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- author_profiles (1:1 with user, public-facing profile data)
-- ============================================================
CREATE TABLE IF NOT EXISTS author_profiles (
    id_author_profile  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id            INT UNSIGNED NOT NULL,
    display_name       VARCHAR(100) NOT NULL,
    bio_text           TEXT NOT NULL,
    specialty_tags     JSON NULL,
    website_url        VARCHAR(255) NULL,
    twitter_handle     VARCHAR(100) NULL,
    instagram_handle   VARCHAR(100) NULL,
    profile_image      VARCHAR(255) NULL DEFAULT NULL COMMENT 'Custom profile image filename (WebP). NULL = use Google account image.',
    status_profile     ENUM('draft','published') DEFAULT 'draft',
    featured_profile   BOOLEAN DEFAULT FALSE,
    view_count         INT UNSIGNED DEFAULT 0,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_profile (user_id),
    INDEX idx_status (status_profile),
    INDEX idx_featured (featured_profile),
    FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
