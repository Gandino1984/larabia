-- 015_add_workshop_invitations.sql
-- Invitations to a workshop sent by its managers. A pending invitation holds
-- a place until the invited reader accepts (→ reservation) or declines.
-- Also created automatically at back-end boot (index.js, sync) when missing.
CREATE TABLE IF NOT EXISTS workshop_invitations (
  id_invitation INT UNSIGNED NOT NULL AUTO_INCREMENT,
  workshop_id INT UNSIGNED NOT NULL,
  inviter_user_id INT UNSIGNED NOT NULL,
  invitee_user_id INT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  responded_at DATETIME NULL,
  inviter_seen TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_invitation),
  UNIQUE KEY unique_workshop_invitation (workshop_id, invitee_user_id),
  KEY idx_wi_inviter (inviter_user_id),
  KEY idx_wi_invitee (invitee_user_id),
  CONSTRAINT fk_wi_workshop FOREIGN KEY (workshop_id) REFERENCES magazine_workshops (id_workshop) ON DELETE CASCADE,
  CONSTRAINT fk_wi_inviter FOREIGN KEY (inviter_user_id) REFERENCES user (id_user) ON DELETE CASCADE,
  CONSTRAINT fk_wi_invitee FOREIGN KEY (invitee_user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
