-- 037: micro-perfiles. Their image block also keeps the person's web
-- (profile_website, an http(s) address) and Instagram user (profile_instagram,
-- without @), and a caption for the audio — what it is (audio_caption,
-- ≤ 300 characters). Shown under the audio in the reader. The back-end also
-- adds these columns at boot (index.js).

ALTER TABLE article_blocks
  ADD COLUMN profile_website VARCHAR(500) NULL,
  ADD COLUMN profile_instagram VARCHAR(100) NULL,
  ADD COLUMN audio_caption TEXT NULL;
