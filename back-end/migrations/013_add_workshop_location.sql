-- 013_add_workshop_location.sql
-- Map position of a workshop (set by its creator with a Leaflet picker);
-- location_workshop keeps the place's visible name / address.
-- Also added automatically at back-end boot (index.js) when missing.
ALTER TABLE magazine_workshops
  ADD COLUMN lat_workshop DECIMAL(9,6) NULL AFTER location_workshop,
  ADD COLUMN lng_workshop DECIMAL(9,6) NULL AFTER lat_workshop;
