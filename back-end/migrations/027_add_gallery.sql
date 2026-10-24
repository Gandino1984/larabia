-- 027: the Galería — visual artists (a role a super admin grants by
-- invitation, like authors) hang a small virtual exhibition: a title, a short
-- text and up to 7 works (images), each reviewed by a super admin before it's
-- shown. Visitors with an account write to the artist; the messages are kept
-- as conversations (artist ↔ visitor) and answered in the gallery's chat.
-- The back-end also adds the user columns and creates the tables at boot.

ALTER TABLE user
  ADD COLUMN is_artist TINYINT(1) NOT NULL DEFAULT 0 AFTER is_premium_reader,
  ADD COLUMN artist_invite_status VARCHAR(20) NULL COMMENT 'pending | accepted | declined — null: never invited',
  ADD COLUMN artist_invited_by INT UNSIGNED NULL,
  ADD COLUMN artist_invited_at DATETIME NULL,
  ADD COLUMN artist_invite_email_sent_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS gallery_exhibitions (
  id_exhibition INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  title         VARCHAR(120) NULL COMMENT 'NULL: the artist''s name',
  statement     TEXT NULL,
  created_at    DATETIME NOT NULL,
  updated_at    DATETIME NOT NULL,
  PRIMARY KEY (id_exhibition),
  UNIQUE KEY uq_exhibition_user (user_id),
  CONSTRAINT fk_exhibition_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_works (
  id_work          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exhibition_id    INT UNSIGNED NOT NULL,
  image_work       VARCHAR(255) NOT NULL COMMENT 'file in uploads/gallery',
  title_work       VARCHAR(150) NULL COMMENT 'NULL: «Sin título»',
  width_px         INT UNSIGNED NULL,
  height_px        INT UNSIGNED NULL,
  position_work    INT UNSIGNED NOT NULL DEFAULT 0,
  status_work      VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | rejected',
  rejection_reason VARCHAR(500) NULL,
  reviewed_by      INT UNSIGNED NULL,
  reviewed_at      DATETIME NULL,
  review_seen      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0: the artist has not seen the review yet',
  created_at       DATETIME NOT NULL,
  updated_at       DATETIME NOT NULL,
  PRIMARY KEY (id_work),
  KEY idx_work_exhibition (exhibition_id),
  KEY idx_work_status (status_work),
  CONSTRAINT fk_work_exhibition FOREIGN KEY (exhibition_id) REFERENCES gallery_exhibitions (id_exhibition) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_conversations (
  id_conversation    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  artist_id          INT UNSIGNED NOT NULL,
  visitor_id         INT UNSIGNED NOT NULL,
  last_message_at    DATETIME NULL,
  artist_read_at     DATETIME NULL,
  visitor_read_at    DATETIME NULL,
  created_at         DATETIME NOT NULL,
  updated_at         DATETIME NOT NULL,
  PRIMARY KEY (id_conversation),
  UNIQUE KEY uq_conversation (artist_id, visitor_id),
  KEY idx_conversation_visitor (visitor_id),
  CONSTRAINT fk_conversation_artist FOREIGN KEY (artist_id) REFERENCES user (id_user) ON DELETE CASCADE,
  CONSTRAINT fk_conversation_visitor FOREIGN KEY (visitor_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_messages (
  id_message      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id       INT UNSIGNED NOT NULL,
  body            TEXT NOT NULL,
  created_at      DATETIME NOT NULL,
  updated_at      DATETIME NOT NULL,
  PRIMARY KEY (id_message),
  KEY idx_message_conversation (conversation_id),
  CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES gallery_conversations (id_conversation) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
