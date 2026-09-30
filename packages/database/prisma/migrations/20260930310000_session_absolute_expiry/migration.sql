-- Add an absolute session lifetime in addition to the sliding idle timeout.
-- Existing rows default to the same instant they already expire.
ALTER TABLE `sessions` ADD COLUMN `absolute_expires_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `sessions` SET `absolute_expires_at` = `expires_at`;

CREATE INDEX `sessions_expires_at_idx` ON `sessions`(`expires_at`);
