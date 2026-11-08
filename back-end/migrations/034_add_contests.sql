-- 034: contests in the Talleres section. A contest is a row of
-- magazine_workshops with kind_workshop = 'contest': no date, place or
-- capacity; sign-ups open on registration_start_workshop and close after
-- registration_end_workshop (plain days), the jury announces the winners on
-- resolution_date_workshop, and awards_workshop holds the 1st, 2nd and 3rd
-- place and the honorable mention ({ first, second, third, mention }: each
-- { prize, winner }). Anyone signed in signs up (workshop_reservations).
-- Contests by anyone but a super admin wait for one: review_status_workshop
-- 'pending' → 'approved' | 'rejected' (rejection_reason_workshop);
-- review_seen_workshop = its creator has seen the decision (bell).
-- Workshops stay 'workshop' / 'approved'. The back-end also adds these
-- columns at boot (index.js).
--
-- Also: every new account gets the newsletter (opt-out), so
-- user.receives_newsletter defaults to 1. Existing accounts are not changed.

ALTER TABLE magazine_workshops
  ADD COLUMN kind_workshop VARCHAR(20) NOT NULL DEFAULT 'workshop',
  ADD COLUMN registration_start_workshop DATE NULL,
  ADD COLUMN registration_end_workshop DATE NULL,
  ADD COLUMN resolution_date_workshop DATE NULL,
  ADD COLUMN awards_workshop JSON NULL,
  ADD COLUMN review_status_workshop VARCHAR(20) NOT NULL DEFAULT 'approved',
  ADD COLUMN rejection_reason_workshop TEXT NULL,
  ADD COLUMN review_seen_workshop TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE user
  ALTER COLUMN receives_newsletter SET DEFAULT 1;
