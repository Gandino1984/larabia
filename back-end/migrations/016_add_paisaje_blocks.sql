-- 016_add_paisaje_blocks.sql
-- Paisajes sonoros (soundscapes): an article format (block_type 'paisaje')
-- and a comic panel format (comic_panel + soundscape_data). The piece is a
-- JSON written by back-end/controllers/paisaje/paisaje_store.js; its files
-- live in back-end/uploads/paisaje/ (served with CORS under /paisaje-files).
-- Also applied automatically at back-end boot (index.js) when missing.
ALTER TABLE article_blocks
  MODIFY COLUMN block_type ENUM('text','image','iframe','comic_panel','paisaje') NOT NULL,
  ADD COLUMN soundscape_data TEXT NULL AFTER audio_mode;
