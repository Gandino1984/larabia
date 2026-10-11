-- 014_add_workshop_blocks.sql
-- Users blocked from a workshop by its managers (they can't book it).
-- Also created automatically at back-end boot (index.js, sync) when missing.
CREATE TABLE IF NOT EXISTS workshop_blocks (
  id_block INT UNSIGNED NOT NULL AUTO_INCREMENT,
  workshop_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  blocked_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_block),
  UNIQUE KEY unique_workshop_block (workshop_id, user_id),
  KEY idx_wb_user (user_id),
  CONSTRAINT fk_wb_workshop FOREIGN KEY (workshop_id) REFERENCES magazine_workshops (id_workshop) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
