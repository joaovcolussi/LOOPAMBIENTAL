-- CreateTable
CREATE TABLE `company_invitations` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `invited_by_user_id` VARCHAR(36) NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `expires_at` DATETIME(3) NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_invitations_token_hash_key`(`token_hash`),
    INDEX `company_invitations_company_id_status_idx`(`company_id`, `status`),
    INDEX `company_invitations_email_status_idx`(`email`, `status`),
    INDEX `company_invitations_invited_by_user_id_idx`(`invited_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` VARCHAR(36) NOT NULL,
    `reporter_user_id` VARCHAR(36) NOT NULL,
    `target_type` ENUM('LISTING', 'COMPANY', 'USER', 'MESSAGE') NOT NULL,
    `listing_id` VARCHAR(36) NULL,
    `company_id` VARCHAR(36) NULL,
    `reported_user_id` VARCHAR(36) NULL,
    `message_id` VARCHAR(36) NULL,
    `reason` ENUM('COUNTERFEIT', 'PRODUCT_QUALITY', 'MISLEADING', 'CONTACT_ABUSE', 'SPAM', 'ILLEGAL', 'HAZARDOUS', 'UNDOCUMENTED', 'OTHER') NOT NULL,
    `details` TEXT NULL,
    `status` ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    `resolution_notes` TEXT NULL,
    `reviewed_by_user_id` VARCHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reports_status_created_at_idx`(`status`, `created_at`),
    INDEX `reports_reporter_user_id_created_at_idx`(`reporter_user_id`, `created_at`),
    INDEX `reports_target_type_status_idx`(`target_type`, `status`),
    INDEX `reports_listing_id_idx`(`listing_id`),
    INDEX `reports_company_id_idx`(`company_id`),
    INDEX `reports_reported_user_id_idx`(`reported_user_id`),
    INDEX `reports_message_id_idx`(`message_id`),
    INDEX `reports_reviewed_by_user_id_idx`(`reviewed_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_invitations` ADD CONSTRAINT `company_invitations_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_invitations` ADD CONSTRAINT `company_invitations_invited_by_user_id_fkey` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporter_user_id_fkey` FOREIGN KEY (`reporter_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reviewed_by_user_id_fkey` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reported_user_id_fkey` FOREIGN KEY (`reported_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

