CREATE TABLE `home_carousel_slides` (
  `id` VARCHAR(36) NOT NULL,
  `position` INTEGER NOT NULL,
  `storage_key` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(80) NOT NULL,
  `size_bytes` INTEGER NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `alt_text` VARCHAR(180) NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `updated_by_user_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  CONSTRAINT `home_carousel_slides_position_check` CHECK (`position` BETWEEN 1 AND 4),
  CONSTRAINT `home_carousel_slides_size_check` CHECK (`size_bytes` > 0),
  CONSTRAINT `home_carousel_slides_version_check` CHECK (`version` > 0),
  UNIQUE INDEX `home_carousel_slides_position_key`(`position`),
  UNIQUE INDEX `home_carousel_slides_storage_key_key`(`storage_key`),
  INDEX `home_carousel_slides_updated_by_user_id_idx`(`updated_by_user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `home_carousel_slides_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `actor_user_id` VARCHAR(36) NULL,
  `action` VARCHAR(80) NOT NULL,
  `resource_type` VARCHAR(80) NOT NULL,
  `resource_id` VARCHAR(36) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `audit_logs_resource_type_resource_id_created_at_idx`(`resource_type`, `resource_id`, `created_at` DESC),
  INDEX `audit_logs_actor_user_id_created_at_idx`(`actor_user_id`, `created_at` DESC),
  PRIMARY KEY (`id`),
  CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
