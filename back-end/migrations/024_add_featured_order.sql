-- 024: the order of the featured stories in the home hero, set by a super
-- admin in Admin › Portada. NULL = no position (after the ordered ones,
-- newest first). The back-end also adds this column at boot.

ALTER TABLE magazine_articles
  ADD COLUMN featured_order INT NULL AFTER featured_article;
