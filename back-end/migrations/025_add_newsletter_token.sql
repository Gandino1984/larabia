-- 025: a random token per person for the newsletter's one-click «Darme de
-- baja» link (and the List-Unsubscribe header), which works without signing
-- in. Made the first time a newsletter is sent to them. The back-end also
-- adds this column at boot.

ALTER TABLE user
  ADD COLUMN newsletter_token CHAR(32) NULL AFTER receives_newsletter,
  ADD UNIQUE KEY uq_user_newsletter_token (newsletter_token);
