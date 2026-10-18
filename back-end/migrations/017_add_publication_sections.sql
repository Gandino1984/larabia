-- 017: magazine sections (header buttons such as «Internacional») that an
-- article or a project ALSO appears in. JSON arrays of section keys:
-- the approved ones (what readers see) and the ones requested by the author,
-- waiting for a super admin (NULL = nothing pending). See utils/sections.js.
-- The back-end adds these columns at boot if they are missing (index.js).
ALTER TABLE magazine_articles
  ADD COLUMN sections_article JSON NULL,
  ADD COLUMN sections_requested_article JSON NULL;
ALTER TABLE magazine_projects
  ADD COLUMN sections_project JSON NULL,
  ADD COLUMN sections_requested_project JSON NULL;
