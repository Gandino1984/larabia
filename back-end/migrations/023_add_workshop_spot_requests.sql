-- 023: requests for an extra place in a full workshop (socios/as). The
-- managers accept (capacity + 1, booked for them) or decline. The back-end
-- also creates this table at boot (sync) if it doesn't exist.

CREATE TABLE IF NOT EXISTS workshop_spot_requests (
  id_spot_request INT UNSIGNED NOT NULL AUTO_INCREMENT,
  workshop_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  message VARCHAR(300) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  responded_by INT UNSIGNED NULL,
  responded_at DATETIME NULL,
  requester_seen TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_spot_request),
  UNIQUE KEY unique_workshop_spot_request (workshop_id, user_id),
  CONSTRAINT fk_spot_request_workshop FOREIGN KEY (workshop_id) REFERENCES magazine_workshops (id_workshop) ON DELETE CASCADE,
  CONSTRAINT fk_spot_request_user FOREIGN KEY (user_id) REFERENCES `user` (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
