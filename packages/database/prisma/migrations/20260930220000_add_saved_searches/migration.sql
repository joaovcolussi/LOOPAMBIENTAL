-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('PROPOSAL_CREATED', 'PROPOSAL_COUNTERED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'PROPOSAL_CANCELLED', 'MESSAGE_RECEIVED', 'COMPANY_VERIFICATION_REQUESTED', 'COMPANY_VERIFIED', 'COMPANY_VERIFICATION_REJECTED', 'SAVED_SEARCH_MATCH', 'SYSTEM') NOT NULL;

-- CreateTable
CREATE TABLE `saved_searches` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `filters` JSON NOT NULL,
    `frequency` ENUM('NONE', 'DAILY', 'WEEKLY') NOT NULL DEFAULT 'DAILY',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `saved_searches_user_id_is_active_idx`(`user_id`, `is_active`),
    INDEX `saved_searches_is_active_frequency_idx`(`is_active`, `frequency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

