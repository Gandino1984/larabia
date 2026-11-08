-- 033: the artist hears in their bell of readers' new comments and likes on
-- their exhibition (032). Each one is marked when the artist has seen it
-- (their own likes and comments are born seen). The back-end also adds
-- these columns at boot (syncGalleryTables).

ALTER TABLE gallery_work_comments
  ADD COLUMN artist_seen TINYINT(1) NOT NULL DEFAULT 0 AFTER content_comment;

ALTER TABLE gallery_work_likes
  ADD COLUMN artist_seen TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id;

ALTER TABLE gallery_piece_likes
  ADD COLUMN artist_seen TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id;
