-- ============================================================
-- 008_add_workshops.sql
-- Workshops (talleres) created by super admins, with instructor authors and
-- capacity-limited reservations by any registered user.
--
-- Fresh DB: applied automatically by docker initdb. Existing DB: apply manually
--   docker exec -i larabia_db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" larabia_db' < 008_add_workshops.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS magazine_workshops (
    id_workshop INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title_workshop VARCHAR(255) NOT NULL,
    description_workshop TEXT NULL,
    location_workshop VARCHAR(255) NULL,
    date_workshop DATETIME NULL,
    cover_image_workshop VARCHAR(255) NULL,
    capacity_workshop INT UNSIGNED NULL COMMENT 'Max participants (aforo); NULL = unlimited',
    author_id INT UNSIGNED NULL COMMENT 'Legacy/primary creator',
    author_name VARCHAR(100) NULL,
    active_workshop TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_workshop),
    KEY idx_workshop_date (date_workshop),
    KEY idx_workshop_active (active_workshop)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Instructor authors (many-to-many with users).
CREATE TABLE IF NOT EXISTS workshop_authors (
    id_workshop_author INT UNSIGNED NOT NULL AUTO_INCREMENT,
    workshop_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    author_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_workshop_author),
    UNIQUE KEY unique_workshop_author (workshop_id, user_id),
    KEY idx_wa_workshop (workshop_id),
    KEY idx_wa_user (user_id),
    CONSTRAINT fk_wa_workshop FOREIGN KEY (workshop_id) REFERENCES magazine_workshops (id_workshop) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Participants (reservations); one per user per workshop.
CREATE TABLE IF NOT EXISTS workshop_reservations (
    id_reservation INT UNSIGNED NOT NULL AUTO_INCREMENT,
    workshop_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_reservation),
    UNIQUE KEY unique_workshop_reservation (workshop_id, user_id),
    KEY idx_wr_workshop (workshop_id),
    KEY idx_wr_user (user_id),
    CONSTRAINT fk_wr_workshop FOREIGN KEY (workshop_id) REFERENCES magazine_workshops (id_workshop) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
