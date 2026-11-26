-- 041: «Propón una actividad» (Barrio). Anyone — with an account already or
-- making one by signing in with Google — proposes a workshop or an open call /
-- contest; two in progress at most per person (sent or being considered).
-- Admins and super admins decide: 'considering' (the person gets an email, in
-- the language they wrote from — lang_proposal —, saying we've received it and
-- are considering it; email_sent_at) or 'declined'.
-- The back-end also creates the table at boot (index.js).

CREATE TABLE IF NOT EXISTS activity_proposals (
  id_activity_proposal INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  kind_proposal VARCHAR(20) NOT NULL,
  title_proposal VARCHAR(150) NOT NULL,
  description_proposal TEXT NOT NULL,
  details_proposal TEXT NULL,
  lang_proposal VARCHAR(5) NOT NULL DEFAULT 'es',
  status_proposal VARCHAR(20) NOT NULL DEFAULT 'new',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  email_sent_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_activity_proposal),
  KEY idx_activity_proposal_user (user_id, status_proposal),
  KEY idx_activity_proposal_status (status_proposal, created_at),
  CONSTRAINT fk_activity_proposal_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
