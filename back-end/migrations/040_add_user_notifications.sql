-- 040: the bell's notifications stay until their person deletes them.
-- The front-end works the notifications out from what's going on (new
-- articles, answers, reviews, comments…) and keeps a copy of each
-- informational one here the first time it sees it (notif_key: its stable id;
-- payload: its title / message — text or translation key + values — and what
-- it opens). read_at: seen in the bell; dismissed_at: deleted («×» or «Borrar
-- todas») — the row stays 120 days so it isn't saved again, then it's
-- forgotten (a daily job). Ones that need an answer (invitations, requests)
-- aren't kept: they go when answered.
-- The back-end also creates the table at boot (index.js).

CREATE TABLE IF NOT EXISTS user_notifications (
  id_notification INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  notif_key VARCHAR(191) NOT NULL,
  type_notification VARCHAR(40) NOT NULL,
  payload_notification JSON NULL,
  event_at DATETIME NOT NULL,
  read_at DATETIME NULL,
  dismissed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_notification),
  UNIQUE KEY uq_user_notification (user_id, notif_key),
  KEY idx_user_notification_list (user_id, dismissed_at, event_at),
  CONSTRAINT fk_user_notification_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
