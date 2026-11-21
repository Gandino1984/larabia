-- 038: convocatorias. The contests (magazine_workshops, kind_workshop
-- 'contest') are now «convocatorias» (open calls): a call can also be a
-- contest (prizes and a jury) or just ask for works.
--   - with_prizes_workshop: it's a contest (the existing ones are);
--   - section_workshop: the magazine section (nav key, as in
--     sections_article) where the works it accepts are published;
--   - contest_entries: each work is reviewed by a super admin — 'sent',
--     'accepted' (a draft article was made from it, article_id_entry) or
--     'declined' (decline_reason_entry);
--   - magazine_articles.call_id_article: the call a published work belongs to;
--   - call_votes: the public vote (one per account and call) and the super
--     admins' (three each per call), kept apart.
-- The back-end also adds the columns and creates the table at boot (index.js).

ALTER TABLE magazine_workshops
  ADD COLUMN with_prizes_workshop TINYINT(1) NOT NULL DEFAULT 0 AFTER awards_workshop,
  ADD COLUMN section_workshop VARCHAR(100) NULL AFTER with_prizes_workshop;

UPDATE magazine_workshops SET with_prizes_workshop = 1 WHERE kind_workshop = 'contest';

ALTER TABLE contest_entries
  ADD COLUMN status_entry VARCHAR(20) NOT NULL DEFAULT 'sent',
  ADD COLUMN decline_reason_entry TEXT NULL,
  ADD COLUMN article_id_entry INT UNSIGNED NULL;

ALTER TABLE magazine_articles
  ADD COLUMN call_id_article INT UNSIGNED NULL,
  ADD KEY idx_article_call (call_id_article);

CREATE TABLE IF NOT EXISTS call_votes (
  id_vote INT UNSIGNED NOT NULL AUTO_INCREMENT,
  workshop_id INT UNSIGNED NOT NULL,
  article_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  jury_vote TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id_vote),
  UNIQUE KEY uq_call_vote (workshop_id, user_id, article_id),
  KEY idx_call_vote_article (article_id),
  KEY idx_call_vote_user (user_id),
  CONSTRAINT fk_call_vote_workshop FOREIGN KEY (workshop_id) REFERENCES magazine_workshops (id_workshop) ON DELETE CASCADE,
  CONSTRAINT fk_call_vote_article FOREIGN KEY (article_id) REFERENCES magazine_articles (id_article) ON DELETE CASCADE,
  CONSTRAINT fk_call_vote_user FOREIGN KEY (user_id) REFERENCES user (id_user) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
