-- 021: complimentary subscriptions — a super admin gives a reader a
-- subscription without Stripe (Admin › Usuarios). It counts like a paid one
-- (badge, workshops). The back-end also adds these columns at boot.

ALTER TABLE reader_subscriptions
  ADD COLUMN complimentary TINYINT(1) NOT NULL DEFAULT 0 AFTER cancel_at_period_end,
  ADD COLUMN complimentary_at DATETIME NULL AFTER complimentary;
