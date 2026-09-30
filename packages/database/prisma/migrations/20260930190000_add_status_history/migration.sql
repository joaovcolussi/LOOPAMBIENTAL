-- CreateTable
CREATE TABLE `listing_status_history` (
    `id` VARCHAR(36) NOT NULL,
    `listing_id` VARCHAR(36) NOT NULL,
    `from_status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'NEGOTIATING', 'CLOSED', 'EXPIRED', 'REJECTED', 'ARCHIVED') NULL,
    `to_status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'NEGOTIATING', 'CLOSED', 'EXPIRED', 'REJECTED', 'ARCHIVED') NOT NULL,
    `actor_user_id` VARCHAR(36) NULL,
    `reason` VARCHAR(160) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `listing_status_history_listing_id_created_at_idx`(`listing_id`, `created_at`),
    INDEX `listing_status_history_actor_user_id_idx`(`actor_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deal_status_history` (
    `id` VARCHAR(36) NOT NULL,
    `deal_id` VARCHAR(36) NOT NULL,
    `from_status` ENUM('OPEN', 'AWAITING_DOCUMENTS', 'AWAITING_PAYMENT', 'AWAITING_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED') NULL,
    `to_status` ENUM('OPEN', 'AWAITING_DOCUMENTS', 'AWAITING_PAYMENT', 'AWAITING_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED') NOT NULL,
    `actor_user_id` VARCHAR(36) NULL,
    `note` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `deal_status_history_deal_id_created_at_idx`(`deal_id`, `created_at`),
    INDEX `deal_status_history_actor_user_id_idx`(`actor_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `listing_status_history` ADD CONSTRAINT `listing_status_history_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listing_status_history` ADD CONSTRAINT `listing_status_history_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deal_status_history` ADD CONSTRAINT `deal_status_history_deal_id_fkey` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deal_status_history` ADD CONSTRAINT `deal_status_history_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

