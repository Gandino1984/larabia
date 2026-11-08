-- 032: readers in the Galería. Anyone with an account likes an illustration
-- (gallery_works) or an obra (gallery_pieces) — one like per person — and
-- comments on an illustration (up to 2000 characters); the exhibition's
-- artist and super admins delete comments. Everything goes with the
-- illustration, obra or account it belongs to. The back-end creates these
-- tables at boot (syncGalleryTables).

CREATE TABLE IF NOT EXISTS gallery_work_comments (
  id_comment      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_id         INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  content_comment TEXT NOT NULL,
  created_at      DATETIME NOT NULL,
  updated_at      DATETIME NOT NULL,
  PRIMARY KEY (id_comment),
  KEY idx_work_comment_work (work_id),
  CONSTRAINT fk_work_comment_work FOREIGN KEY (work_id) REFERENCES gallery_works (id_work) ON DELETE CASCADE,
  CONSTRAINT fk_work_comment_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_work_likes (
  id_like    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_like),
  UNIQUE KEY uq_work_like (work_id, user_id),
  CONSTRAINT fk_work_like_work FOREIGN KEY (work_id) REFERENCES gallery_works (id_work) ON DELETE CASCADE,
  CONSTRAINT fk_work_like_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_piece_likes (
  id_like    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  piece_id   INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_like),
  UNIQUE KEY uq_piece_like (piece_id, user_id),
  CONSTRAINT fk_piece_like_piece FOREIGN KEY (piece_id) REFERENCES gallery_pieces (id_piece) ON DELETE CASCADE,
  CONSTRAINT fk_piece_like_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
