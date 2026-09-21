-- 009_add_engagement.sql
-- Likes, favorites and comments for magazine articles.
--
-- NOTE: these tables are also created automatically at back-end boot via
-- model.sync() (CREATE TABLE IF NOT EXISTS), so this file is mainly for record
-- keeping / manual setup. All statements are idempotent.

CREATE TABLE IF NOT EXISTS `article_likes` (
  `id_like` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `article_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id_like`),
  UNIQUE KEY `unique_article_like` (`article_id`, `user_id`),
  CONSTRAINT `fk_article_likes_article` FOREIGN KEY (`article_id`) REFERENCES `magazine_articles` (`id_article`) ON DELETE CASCADE,
  CONSTRAINT `fk_article_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `article_favorites` (
  `id_favorite` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `article_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id_favorite`),
  UNIQUE KEY `unique_article_favorite` (`article_id`, `user_id`),
  CONSTRAINT `fk_article_favorites_article` FOREIGN KEY (`article_id`) REFERENCES `magazine_articles` (`id_article`) ON DELETE CASCADE,
  CONSTRAINT `fk_article_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `article_comments` (
  `id_comment` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `article_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `content_comment` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id_comment`),
  KEY `idx_article_comments_article_id` (`article_id`),
  CONSTRAINT `fk_article_comments_article` FOREIGN KEY (`article_id`) REFERENCES `magazine_articles` (`id_article`) ON DELETE CASCADE,
  CONSTRAINT `fk_article_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
