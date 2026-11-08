-- 035: «Reportar un error». Anyone with an account tells the team something
-- on the web doesn't work: what happened, plus where they were (the address,
-- the view, what was open) and their language, screen and browser. The super
-- admins hear of it (Admin badge and bell) and mark it seen or fixed in
-- Admin › Errores. The back-end also creates the table at boot (index.js).

CREATE TABLE IF NOT EXISTS bug_reports (
  id_report INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  description_report TEXT NOT NULL,
  page_report VARCHAR(500) NULL,
  view_report VARCHAR(60) NULL,
  context_report JSON NULL,
  status_report VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_report),
  KEY idx_bug_report_user (user_id),
  KEY idx_bug_report_status (status_report),
  CONSTRAINT fk_bug_report_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
