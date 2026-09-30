-- CreateTable
CREATE TABLE `contact_unlocks` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `listing_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `source` ENUM('PLAN', 'CREDIT', 'ONE_TIME') NOT NULL DEFAULT 'ONE_TIME',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `contact_unlocks_company_id_listing_id_key`(`company_id`, `listing_id`),
    INDEX `contact_unlocks_listing_id_idx`(`listing_id`),
    INDEX `contact_unlocks_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contact_unlocks` ADD CONSTRAINT `contact_unlocks_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_unlocks` ADD CONSTRAINT `contact_unlocks_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_unlocks` ADD CONSTRAINT `contact_unlocks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
