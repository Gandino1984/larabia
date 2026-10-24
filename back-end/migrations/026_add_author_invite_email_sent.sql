-- 026: when the author invitation email was last sent successfully (NULL:
-- not sent, or sent before this was recorded). Admin › Autoras/es lists the
-- pending invitations without it and sends them. The back-end also adds this
-- column at boot.

ALTER TABLE user
  ADD COLUMN author_invite_email_sent_at DATETIME NULL AFTER author_invited_at;
