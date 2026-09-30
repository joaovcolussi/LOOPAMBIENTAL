-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('PROPOSAL_CREATED', 'PROPOSAL_COUNTERED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'PROPOSAL_CANCELLED', 'MESSAGE_RECEIVED', 'COMPANY_VERIFICATION_REQUESTED', 'COMPANY_VERIFIED', 'COMPANY_VERIFICATION_REJECTED', 'SYSTEM') NOT NULL;

-- CreateTable
CREATE TABLE `company_documents` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `uploaded_by_user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('CNPJ_CARD', 'SOCIAL_CONTRACT', 'ADDRESS_PROOF', 'OPERATING_LICENSE', 'ENVIRONMENTAL_LICENSE', 'OTHER') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(80) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewed_by_user_id` VARCHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `review_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_documents_storage_key_key`(`storage_key`),
    INDEX `company_documents_company_id_status_idx`(`company_id`, `status`),
    INDEX `company_documents_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    INDEX `company_documents_reviewed_by_user_id_idx`(`reviewed_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_verifications` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `requested_by_user_id` VARCHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `review_notes` TEXT NULL,
    `reviewed_by_user_id` VARCHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `company_verifications_company_id_status_idx`(`company_id`, `status`),
    INDEX `company_verifications_status_created_at_idx`(`status`, `created_at`),
    INDEX `company_verifications_requested_by_user_id_idx`(`requested_by_user_id`),
    INDEX `company_verifications_reviewed_by_user_id_idx`(`reviewed_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_documents` ADD CONSTRAINT `company_documents_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_documents` ADD CONSTRAINT `company_documents_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_documents` ADD CONSTRAINT `company_documents_reviewed_by_user_id_fkey` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_verifications` ADD CONSTRAINT `company_verifications_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_verifications` ADD CONSTRAINT `company_verifications_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_verifications` ADD CONSTRAINT `company_verifications_reviewed_by_user_id_fkey` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

