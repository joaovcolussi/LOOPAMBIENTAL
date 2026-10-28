-- Laudos e documentos técnicos anexados a anúncios de compra e venda.
-- Rollback: DROP TABLE `listing_documents`; (remova também os objetos com prefixo listing-documents/ do storage).

-- CreateTable
CREATE TABLE `listing_documents` (
    `id` VARCHAR(36) NOT NULL,
    `listing_id` VARCHAR(36) NOT NULL,
    `uploaded_by_user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('TECHNICAL_REPORT', 'LAB_ANALYSIS', 'SAFETY_DATA_SHEET', 'OTHER') NOT NULL DEFAULT 'TECHNICAL_REPORT',
    `file_name` VARCHAR(255) NOT NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(80) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `valid_until` DATE NULL,
    `status` ENUM('READY', 'REJECTED') NOT NULL DEFAULT 'READY',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `listing_documents_storage_key_key`(`storage_key`),
    INDEX `listing_documents_listing_id_deleted_at_status_idx`(`listing_id`, `deleted_at`, `status`),
    INDEX `listing_documents_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `listing_documents` ADD CONSTRAINT `listing_documents_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listing_documents` ADD CONSTRAINT `listing_documents_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

