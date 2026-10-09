-- 011_add_reader_subscriptions.sql
-- Paid reader subscriptions (Stripe). One row per user, kept in sync by the
-- Stripe webhook. Also created at boot via model.sync(); idempotent.

CREATE TABLE IF NOT EXISTS `reader_subscriptions` (
  `id_reader_subscription` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `stripe_customer_id` VARCHAR(255) NULL,
  `stripe_subscription_id` VARCHAR(255) NULL,
  `status` VARCHAR(30) NULL,
  `plan` VARCHAR(20) NULL,
  `current_period_end` DATETIME NULL,
  `cancel_at_period_end` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id_reader_subscription`),
  UNIQUE KEY `unique_reader_subscription_user` (`user_id`),
  KEY `idx_reader_subscription_customer` (`stripe_customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
