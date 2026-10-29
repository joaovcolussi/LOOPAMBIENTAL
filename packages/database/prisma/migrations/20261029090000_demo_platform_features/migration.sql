-- Recursos de demonstração da plataforma: cobrança genérica (negociação,
-- assinatura e desbloqueio de contato), MFA, consentimentos e solicitações LGPD,
-- registro de arquivos com varredura, atributos técnicos de material, remessas
-- com rastreio e chaves de API por empresa.
-- Rollback: remova as tabelas criadas (api_keys, shipment_events, shipments,
-- listing_attributes, material_attributes, files, data_requests, user_consents),
-- as colunas novas de users/payment_transactions e restaure deal_id NOT NULL
-- somente se não houver cobranças de assinatura/desbloqueio gravadas.

-- AlterTable
ALTER TABLE `auth_tokens` MODIFY `type` ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'MFA_CHALLENGE') NOT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('PROPOSAL_CREATED', 'PROPOSAL_COUNTERED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'PROPOSAL_CANCELLED', 'MESSAGE_RECEIVED', 'COMPANY_VERIFICATION_REQUESTED', 'COMPANY_VERIFIED', 'COMPANY_VERIFICATION_REJECTED', 'SAVED_SEARCH_MATCH', 'PAYMENT_CONFIRMED', 'SHIPMENT_UPDATED', 'SYSTEM') NOT NULL;

-- AlterTable
ALTER TABLE `payment_transactions` ADD COLUMN `created_by_user_id` VARCHAR(36) NULL,
    ADD COLUMN `listing_id` VARCHAR(36) NULL,
    ADD COLUMN `purpose` ENUM('DEAL', 'SUBSCRIPTION', 'CONTACT_UNLOCK') NOT NULL DEFAULT 'DEAL',
    ADD COLUMN `subscription_id` VARCHAR(36) NULL,
    MODIFY `deal_id` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `mfa_enabled_at` DATETIME(3) NULL,
    ADD COLUMN `mfa_recovery_codes` JSON NULL,
    ADD COLUMN `mfa_secret_encrypted` TEXT NULL;

-- CreateTable
CREATE TABLE `user_consents` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('TERMS', 'PRIVACY') NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `accepted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_consents_user_id_type_accepted_at_idx`(`user_id`, `type`, `accepted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_requests` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('EXPORT', 'DELETION') NOT NULL,
    `status` ENUM('COMPLETED', 'REJECTED') NOT NULL,
    `notes` VARCHAR(500) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `data_requests_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `data_requests_type_created_at_idx`(`type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` VARCHAR(36) NOT NULL,
    `owner_user_id` VARCHAR(36) NOT NULL,
    `purpose` ENUM('LISTING_MEDIA', 'LISTING_DOCUMENT', 'COMPANY_DOCUMENT', 'CAROUSEL') NOT NULL,
    `resource_id` VARCHAR(36) NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(80) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `access_level` ENUM('PUBLIC', 'PRIVATE') NOT NULL,
    `scan_status` ENUM('PENDING', 'CLEAN', 'INFECTED', 'ERROR') NOT NULL DEFAULT 'PENDING',
    `scan_engine` VARCHAR(60) NULL,
    `scan_details` VARCHAR(255) NULL,
    `scanned_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `files_storage_key_key`(`storage_key`),
    INDEX `files_scan_status_created_at_idx`(`scan_status`, `created_at`),
    INDEX `files_purpose_resource_id_idx`(`purpose`, `resource_id`),
    INDEX `files_owner_user_id_created_at_idx`(`owner_user_id`, `created_at`),
    INDEX `files_sha256_idx`(`sha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_attributes` (
    `id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(60) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `type` ENUM('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN') NOT NULL,
    `unit` VARCHAR(20) NULL,
    `options` JSON NULL,
    `is_filterable` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `material_attributes_category_id_sort_order_idx`(`category_id`, `sort_order`),
    UNIQUE INDEX `material_attributes_category_id_key_key`(`category_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `listing_attributes` (
    `listing_id` VARCHAR(36) NOT NULL,
    `attribute_id` VARCHAR(36) NOT NULL,
    `value_text` VARCHAR(200) NULL,
    `value_number` DECIMAL(16, 3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `listing_attributes_attribute_id_value_text_idx`(`attribute_id`, `value_text`),
    INDEX `listing_attributes_attribute_id_value_number_idx`(`attribute_id`, `value_number`),
    PRIMARY KEY (`listing_id`, `attribute_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipments` (
    `id` VARCHAR(36) NOT NULL,
    `logistics_request_id` VARCHAR(36) NOT NULL,
    `quote_id` VARCHAR(36) NOT NULL,
    `carrier_name` VARCHAR(200) NOT NULL,
    `tracking_code` VARCHAR(40) NOT NULL,
    `status` ENUM('SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `estimated_delivery_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shipments_logistics_request_id_key`(`logistics_request_id`),
    UNIQUE INDEX `shipments_tracking_code_key`(`tracking_code`),
    INDEX `shipments_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipment_events` (
    `id` VARCHAR(36) NOT NULL,
    `shipment_id` VARCHAR(36) NOT NULL,
    `status` ENUM('SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') NOT NULL,
    `description` VARCHAR(240) NOT NULL,
    `location` VARCHAR(160) NULL,
    `created_by_user_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `shipment_events_shipment_id_created_at_idx`(`shipment_id`, `created_at`),
    INDEX `shipment_events_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `created_by_user_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `prefix` VARCHAR(16) NOT NULL,
    `key_hash` VARCHAR(128) NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_keys_key_hash_key`(`key_hash`),
    INDEX `api_keys_company_id_revoked_at_idx`(`company_id`, `revoked_at`),
    INDEX `api_keys_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `payment_transactions_subscription_id_status_idx` ON `payment_transactions`(`subscription_id`, `status`);

-- CreateIndex
CREATE INDEX `payment_transactions_listing_id_company_id_status_idx` ON `payment_transactions`(`listing_id`, `company_id`, `status`);

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_consents` ADD CONSTRAINT `user_consents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_requests` ADD CONSTRAINT `data_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_attributes` ADD CONSTRAINT `material_attributes_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `waste_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listing_attributes` ADD CONSTRAINT `listing_attributes_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listing_attributes` ADD CONSTRAINT `listing_attributes_attribute_id_fkey` FOREIGN KEY (`attribute_id`) REFERENCES `material_attributes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_logistics_request_id_fkey` FOREIGN KEY (`logistics_request_id`) REFERENCES `logistics_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_events` ADD CONSTRAINT `shipment_events_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_events` ADD CONSTRAINT `shipment_events_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

