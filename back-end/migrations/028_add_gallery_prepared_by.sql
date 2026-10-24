-- 028: galleries a super admin prepares on an artist's behalf. prepared_by is
-- who prepared it while the artist's invitation is pending (hidden from the
-- public until they accept); accepting hands it over (NULL), declining
-- deletes it with its works. The back-end also adds this column at boot.

ALTER TABLE gallery_exhibitions
  ADD COLUMN prepared_by INT UNSIGNED NULL AFTER statement;
