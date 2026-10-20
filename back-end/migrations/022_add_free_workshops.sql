-- 022: free workshops — anyone signed in books a place; the others (default)
-- are for socios/as and the magazine team. The back-end also adds this
-- column at boot.

ALTER TABLE magazine_workshops
  ADD COLUMN free_workshop TINYINT(1) NOT NULL DEFAULT 0 AFTER audience_workshop;
