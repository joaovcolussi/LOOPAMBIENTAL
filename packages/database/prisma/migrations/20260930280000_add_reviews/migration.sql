-- AlterTable
ALTER TABLE `companies` ADD COLUMN `rating_average` DECIMAL(3, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `rating_count` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(36) NOT NULL,
    `deal_id` VARCHAR(36) NOT NULL,
    `author_user_id` VARCHAR(36) NOT NULL,
    `author_company_id` VARCHAR(36) NOT NULL,
    `reviewed_company_id` VARCHAR(36) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reviews_deal_id_author_company_id_key`(`deal_id`, `author_company_id`),
    INDEX `reviews_reviewed_company_id_created_at_idx`(`reviewed_company_id`, `created_at` DESC),
    INDEX `reviews_author_user_id_idx`(`author_user_id`),
    INDEX `reviews_author_company_id_idx`(`author_company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_deal_id_fkey` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_author_user_id_fkey` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_author_company_id_fkey` FOREIGN KEY (`author_company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_reviewed_company_id_fkey` FOREIGN KEY (`reviewed_company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
