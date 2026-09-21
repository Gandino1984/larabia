-- 010_add_project_subscriptions.sql
-- Per-user "follow this project" subscriptions (the bell on the project panel).
-- Also created at boot via model.sync(); idempotent.

CREATE TABLE IF NOT EXISTS `project_subscriptions` (
  `id_subscription` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id_subscription`),
  UNIQUE KEY `unique_project_subscription` (`project_id`, `user_id`),
  CONSTRAINT `fk_project_subs_project` FOREIGN KEY (`project_id`) REFERENCES `magazine_projects` (`id_project`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_subs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
