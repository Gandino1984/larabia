-- 030: the Galería is organised in obras. An exhibition has up to 5 obras
-- (gallery_pieces: a title and an order), each with up to 10 illustrations —
-- the rows of gallery_works, which now belong to an obra (piece_id) and have
-- a description (up to 300 characters). Super admins have no limits (the
-- back-end, models/gallery_models.js). The back-end also creates the table
-- and adds these columns at boot, and turns each illustration from before
-- into an obra of its own (with its title), so nothing is merged.

CREATE TABLE IF NOT EXISTS gallery_pieces (
  id_piece       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exhibition_id  INT UNSIGNED NOT NULL,
  title_piece    VARCHAR(150) NULL COMMENT 'NULL: «Sin título»',
  position_piece INT UNSIGNED NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL,
  updated_at     DATETIME NOT NULL,
  PRIMARY KEY (id_piece),
  KEY idx_piece_exhibition (exhibition_id),
  CONSTRAINT fk_piece_exhibition FOREIGN KEY (exhibition_id) REFERENCES gallery_exhibitions (id_exhibition) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE gallery_works
  ADD COLUMN piece_id INT UNSIGNED NULL AFTER exhibition_id,
  ADD COLUMN description_work VARCHAR(300) NULL AFTER title_work,
  ADD KEY idx_work_piece (piece_id),
  ADD CONSTRAINT fk_work_piece FOREIGN KEY (piece_id) REFERENCES gallery_pieces (id_piece) ON DELETE CASCADE;
