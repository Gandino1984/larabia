-- 036: contest entries. While a contest's sign-ups are open, a contestant
-- (anyone signed in) sends their work: a title, a short note and the work
-- pasted and/or as a file (texts or images, ≤ 10 MB, kept private in
-- uploads/contest-entries — never served: only its author and the contest's
-- managers download it through the API). One per person and contest;
-- sending it signs them up (workshop_reservations). The back-end also
-- creates the table at boot (index.js).

CREATE TABLE IF NOT EXISTS contest_entries (
  id_entry INT UNSIGNED NOT NULL AUTO_INCREMENT,
  workshop_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  title_entry VARCHAR(150) NOT NULL,
  note_entry TEXT NULL,
  text_entry MEDIUMTEXT NULL,
  file_entry VARCHAR(255) NULL,
  file_name_entry VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_entry),
  UNIQUE KEY uq_contest_entry (workshop_id, user_id),
  KEY idx_contest_entry_user (user_id),
  CONSTRAINT fk_contest_entry_workshop FOREIGN KEY (workshop_id) REFERENCES magazine_workshops (id_workshop) ON DELETE CASCADE,
  CONSTRAINT fk_contest_entry_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
