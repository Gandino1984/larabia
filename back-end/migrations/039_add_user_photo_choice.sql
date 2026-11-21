-- 039: one photo per person, the same everywhere (user.image_user —
-- back-end/utils/userPhoto.js). It's their Google picture, their author
-- profile's photo or one they uploaded on their profile card: their choice,
-- or — none made — the first there is of: the author profile's photo, the
-- uploaded one, the Google picture.
--   - google_picture_user: the Google picture, kept apart (refreshed at each
--     Google sign-in; until now it was only saved when the account was made
--     through Google — a prepared account, like an invited author's, had none);
--   - photo_choice_user: 'google' | 'magazine' | 'own' | NULL (none made).
-- The back-end also adds the columns at boot and then lines up everyone's
-- image_user (index.js); the UPDATEs below do the same by hand.

ALTER TABLE user
  ADD COLUMN google_picture_user VARCHAR(1000) NULL AFTER image_user,
  ADD COLUMN photo_choice_user VARCHAR(10) NULL AFTER google_picture_user;

UPDATE user SET google_picture_user = image_user WHERE image_user LIKE 'http%';

-- With no choice made, an author's profile photo comes first.
UPDATE user u
  JOIN author_profiles ap ON ap.user_id = u.id_user
  SET u.image_user = CONCAT('/uploads/author-profiles/', ap.profile_image)
  WHERE ap.profile_image IS NOT NULL AND ap.profile_image <> '' AND u.photo_choice_user IS NULL;
