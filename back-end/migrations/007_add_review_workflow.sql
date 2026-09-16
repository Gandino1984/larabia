-- ============================================================
-- 007_add_review_workflow.sql
-- Extends the editorial review/approval workflow so BOTH articles and
-- projects go through super-admin validation before going public.
--
--   * magazine_projects gains the 'pending_approval' status (articles
--     already had it via migration 002/003-era schema).
--   * both tables gain a nullable rejection_reason so a super admin can
--     tell the author why their submission was returned to draft.
--
-- Applied automatically only on a FRESH database (docker initdb). For an
-- existing volume, apply manually:
--   docker exec -i larabia_db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" larabia_db' < 007_add_review_workflow.sql
-- MySQL 8 has no "ADD COLUMN IF NOT EXISTS", so run this once.
-- ============================================================

-- Projects: add the review state between draft and published.
ALTER TABLE magazine_projects
    MODIFY COLUMN status_project
        ENUM('draft', 'pending_approval', 'published') NOT NULL DEFAULT 'draft';

-- Rejection feedback shown to the author when content is returned to draft.
ALTER TABLE magazine_articles
    ADD COLUMN rejection_reason TEXT NULL COMMENT 'Super-admin feedback when a submission is rejected back to draft'
    AFTER status_article;

ALTER TABLE magazine_projects
    ADD COLUMN rejection_reason TEXT NULL COMMENT 'Super-admin feedback when a submission is rejected back to draft'
    AFTER status_project;
