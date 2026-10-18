-- 019: content in other languages (en, eu). The original is Spanish (the
-- usual columns); these hold the editor's versions, see utils/translations.js.
-- The back-end adds the columns at boot if they are missing.
ALTER TABLE magazine_articles
  ADD COLUMN translations_article JSON NULL COMMENT '{ en: { title, excerpt }, eu: { ... } }';
ALTER TABLE article_blocks
  ADD COLUMN translations_block JSON NULL COMMENT '{ en: { content, caption, alt }, eu: { ... } }';
ALTER TABLE magazine_projects
  ADD COLUMN translations_project JSON NULL COMMENT '{ en: { title, description }, eu: { ... } }';
