-- 029: the magazine's chat. A socio/a (paying member) asks an author or a
-- visual artist to chat — from Autoras/es or the Galería; the author accepts
-- or declines, and can end it at any time (asking again re-opens it, with
-- its history). It replaces the Galería's own chat: the back-end creates
-- these tables at boot and, the first time, copies gallery_conversations /
-- gallery_messages (027) into them as active conversations; the old tables
-- are kept but no longer used. Times the bell compares are to the millisecond.

CREATE TABLE IF NOT EXISTS chat_conversations (
  id_conversation   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  requester_id      INT UNSIGNED NOT NULL COMMENT 'the member who asks',
  host_id           INT UNSIGNED NOT NULL COMMENT 'the author / artist asked',
  origin            VARCHAR(20)  NOT NULL DEFAULT 'authors' COMMENT 'authors | gallery',
  status            VARCHAR(20)  NOT NULL DEFAULT 'requested' COMMENT 'requested | active | declined | ended',
  requested_at      DATETIME(3) NULL,
  changed_at        DATETIME(3) NULL COMMENT 'when the status last changed',
  requester_seen_at DATETIME(3) NULL COMMENT 'the requester saw the latest change',
  last_message_at   DATETIME(3) NULL,
  requester_read_at DATETIME(3) NULL,
  host_read_at      DATETIME(3) NULL,
  created_at        DATETIME NOT NULL,
  updated_at        DATETIME NOT NULL,
  PRIMARY KEY (id_conversation),
  UNIQUE KEY uq_chat_pair (requester_id, host_id),
  KEY idx_chat_host (host_id),
  CONSTRAINT fk_chat_requester FOREIGN KEY (requester_id) REFERENCES user (id_user) ON DELETE CASCADE,
  CONSTRAINT fk_chat_host FOREIGN KEY (host_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id_message      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id       INT UNSIGNED NOT NULL,
  body            TEXT NOT NULL,
  created_at      DATETIME(3) NOT NULL,
  updated_at      DATETIME(3) NOT NULL,
  PRIMARY KEY (id_message),
  KEY idx_chat_message_conversation (conversation_id),
  CONSTRAINT fk_chat_message_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id_conversation) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
