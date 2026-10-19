-- 020: «Espacio abierto» — literary proposals sent by anyone with an account.
-- The back-end also creates this table at boot (sync) if it doesn't exist.
-- Attached files are stored in back-end/uploads/proposals (not public).

CREATE TABLE IF NOT EXISTS open_space_proposals (
  id_proposal INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title_proposal VARCHAR(150) NOT NULL,
  kind_proposal VARCHAR(20) NOT NULL DEFAULT 'otro',
  summary_proposal TEXT NOT NULL,
  text_proposal MEDIUMTEXT NULL,
  file_proposal VARCHAR(255) NULL,
  file_name_proposal VARCHAR(255) NULL,
  status_proposal VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_proposal),
  KEY idx_proposal_user (user_id),
  KEY idx_proposal_status (status_proposal),
  CONSTRAINT fk_proposal_user FOREIGN KEY (user_id) REFERENCES `user` (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
