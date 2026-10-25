-- 031: articles and projects have a subtitle — a line under the title, up
-- to 100 characters (optional; translatable like the title, in
-- translations_article / translations_project → { en: { subtitle } }).
-- The back-end also adds these columns at boot.

ALTER TABLE magazine_articles
  ADD COLUMN subtitle_article VARCHAR(100) NULL AFTER title_article;

ALTER TABLE magazine_projects
  ADD COLUMN subtitle_project VARCHAR(100) NULL AFTER title_project;
