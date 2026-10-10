-- 012_add_workshop_audience.sql
-- Who a workshop is for: 'general' (adults) | 'infantil' (children).
-- Also added automatically at back-end boot (index.js) when missing, so an
-- existing database needs no manual step. Fresh DB: apply after 008.
ALTER TABLE magazine_workshops
  ADD COLUMN audience_workshop VARCHAR(20) NOT NULL DEFAULT 'general' AFTER capacity_workshop;
