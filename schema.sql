-- LOOP AMBIENTAL
-- MySQL 8.4 schema generated from packages/database/prisma/schema.prisma.
-- This file creates the structure only. Run the demo-data command separately.

CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `password_hash` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'PENDING', 'BLOCKED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `platform_role` ENUM('USER', 'MODERATOR', 'ADMIN') NOT NULL DEFAULT 'USER',
    `email_verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_platform_role_idx`(`platform_role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `user_agent` VARCHAR(500) NULL,
    `ip_address` VARCHAR(64) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `sessions_token_hash_key`(`token_hash`),
    INDEX `sessions_user_id_expires_at_idx`(`user_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `companies` (
    `id` VARCHAR(36) NOT NULL,
    `legal_name` VARCHAR(200) NOT NULL,
    `trade_name` VARCHAR(200) NULL,
    `tax_id_hash` VARCHAR(128) NULL,
    `status` ENUM('ACTIVE', 'PENDING', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `verification` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
    `description` TEXT NULL,
    `city` VARCHAR(120) NULL,
    `state` CHAR(2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    UNIQUE INDEX `companies_tax_id_hash_key`(`tax_id_hash`),
    INDEX `companies_status_verification_idx`(`status`, `verification`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `company_members` (
    `company_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `company_members_user_id_idx`(`user_id`),
    PRIMARY KEY (`company_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `waste_categories` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(140) NOT NULL,
    `parent_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `waste_categories_slug_key`(`slug`),
    INDEX `waste_categories_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `materials` (
    `id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `default_unit` VARCHAR(20) NOT NULL,
    `risk_class` VARCHAR(40) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `materials_slug_key`(`slug`),
    INDEX `materials_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `listings` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `created_by_user_id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `material_id` VARCHAR(36) NULL,
    `type` ENUM('BUY', 'SELL') NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'NEGOTIATING', 'CLOSED', 'EXPIRED', 'REJECTED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `title` VARCHAR(180) NOT NULL,
    `slug` VARCHAR(220) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(16, 3) NOT NULL,
    `available_quantity` DECIMAL(16, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `unit_price` DECIMAL(14, 2) NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'BRL',
    `city` VARCHAR(120) NULL,
    `state` CHAR(2) NULL,
    `published_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `favorite_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    UNIQUE INDEX `listings_slug_key`(`slug`),
    INDEX `listings_status_type_published_at_idx`(`status`, `type`, `published_at` DESC),
    INDEX `listings_category_id_status_idx`(`category_id`, `status`),
    INDEX `listings_company_id_status_idx`(`company_id`, `status`),
    INDEX `listings_city_state_status_idx`(`city`, `state`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `moderation_cases` (
    `id` VARCHAR(36) NOT NULL,
    `listing_id` VARCHAR(36) NOT NULL,
    `status` ENUM('OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `reason` TEXT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `moderation_cases_status_created_at_idx`(`status`, `created_at`),
    INDEX `moderation_cases_listing_id_status_idx`(`listing_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `moderation_actions` (
    `id` VARCHAR(36) NOT NULL,
    `case_id` VARCHAR(36) NOT NULL,
    `actor_id` VARCHAR(36) NOT NULL,
    `type` ENUM('APPROVE', 'REJECT') NOT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `moderation_actions_case_id_created_at_idx`(`case_id`, `created_at`),
    INDEX `moderation_actions_actor_id_created_at_idx`(`actor_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `favorites` (
    `user_id` VARCHAR(36) NOT NULL,
    `listing_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `favorites_listing_id_created_at_idx`(`listing_id`, `created_at`),
    PRIMARY KEY (`user_id`, `listing_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `proposals` (
    `id` VARCHAR(36) NOT NULL,
    `listing_id` VARCHAR(36) NOT NULL,
    `proposer_company_id` VARCHAR(36) NOT NULL,
    `created_by_user_id` VARCHAR(36) NOT NULL,
    `quantity` DECIMAL(16, 3) NOT NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'BRL',
    `notes` TEXT NULL,
    `valid_until` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `proposals_listing_id_status_idx`(`listing_id`, `status`),
    INDEX `proposals_proposer_company_id_status_idx`(`proposer_company_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `proposal_revisions` (
    `id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NOT NULL,
    `actor_user_id` VARCHAR(36) NOT NULL,
    `quantity` DECIMAL(16, 3) NOT NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `proposal_revisions_proposal_id_created_at_idx`(`proposal_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `deals` (
    `id` VARCHAR(36) NOT NULL,
    `listing_id` VARCHAR(36) NOT NULL,
    `proposal_id` VARCHAR(36) NOT NULL,
    `buyer_company_id` VARCHAR(36) NOT NULL,
    `seller_company_id` VARCHAR(36) NOT NULL,
    `status` ENUM('OPEN', 'AWAITING_DOCUMENTS', 'AWAITING_PAYMENT', 'AWAITING_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `deals_proposal_id_key`(`proposal_id`),
    INDEX `deals_listing_id_status_idx`(`listing_id`, `status`),
    INDEX `deals_buyer_company_id_status_idx`(`buyer_company_id`, `status`),
    INDEX `deals_seller_company_id_status_idx`(`seller_company_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `conversations` (
    `id` VARCHAR(36) NOT NULL,
    `listing_id` VARCHAR(36) NULL,
    `proposal_id` VARCHAR(36) NULL,
    `deal_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `conversations_proposal_id_key`(`proposal_id`),
    UNIQUE INDEX `conversations_deal_id_key`(`deal_id`),
    INDEX `conversations_listing_id_updated_at_idx`(`listing_id`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `conversation_participants` (
    `conversation_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_read_at` DATETIME(3) NULL,
    INDEX `conversation_participants_user_id_last_read_at_idx`(`user_id`, `last_read_at`),
    PRIMARY KEY (`conversation_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `messages` (
    `id` VARCHAR(36) NOT NULL,
    `conversation_id` VARCHAR(36) NOT NULL,
    `sender_user_id` VARCHAR(36) NOT NULL,
    `body` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `edited_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    INDEX `messages_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('PROPOSAL_CREATED', 'PROPOSAL_COUNTERED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'PROPOSAL_CANCELLED', 'MESSAGE_RECEIVED', 'SYSTEM') NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `body` TEXT NOT NULL,
    `payload` JSON NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `notifications_user_id_read_at_created_at_idx`(`user_id`, `read_at`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `auth_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET') NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `auth_tokens_token_hash_key`(`token_hash`),
    INDEX `auth_tokens_user_id_type_expires_at_idx`(`user_id`, `type`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `companies`
  ADD COLUMN `contact_name` VARCHAR(150) NULL,
  ADD COLUMN `contact_email` VARCHAR(320) NULL,
  ADD COLUMN `contact_whatsapp` VARCHAR(20) NULL,
  ADD COLUMN `tax_id_encrypted` TEXT NULL,
  ADD COLUMN `address_line` VARCHAR(200) NULL,
  ADD COLUMN `address_number` VARCHAR(20) NULL,
  ADD COLUMN `address_district` VARCHAR(120) NULL,
  ADD COLUMN `address_postal_code` VARCHAR(12) NULL,
  ADD COLUMN `contact_visibility` ENUM('PRIVATE', 'MEMBERS', 'PUBLIC') NOT NULL DEFAULT 'PRIVATE';

ALTER TABLE `listings`
  ADD COLUMN `frequency` ENUM('ONE_TIME', 'WEEKLY', 'MONTHLY', 'CONTINUOUS') NOT NULL DEFAULT 'ONE_TIME',
  ADD COLUMN `risk_classification` ENUM('NON_HAZARDOUS', 'HAZARDOUS', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN `origin_details` VARCHAR(240) NULL,
  ADD COLUMN `own_transport` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `requires_documents` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `last_access_at` DATETIME(3) NULL;

ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `company_members` ADD CONSTRAINT `company_members_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `company_members` ADD CONSTRAINT `company_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `waste_categories` ADD CONSTRAINT `waste_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `waste_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `materials` ADD CONSTRAINT `materials_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `waste_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `listings` ADD CONSTRAINT `listings_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `listings` ADD CONSTRAINT `listings_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `listings` ADD CONSTRAINT `listings_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `waste_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `listings` ADD CONSTRAINT `listings_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `moderation_cases` ADD CONSTRAINT `moderation_cases_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `moderation_actions` ADD CONSTRAINT `moderation_actions_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `moderation_cases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `moderation_actions` ADD CONSTRAINT `moderation_actions_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_proposer_company_id_fkey` FOREIGN KEY (`proposer_company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `proposal_revisions` ADD CONSTRAINT `proposal_revisions_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `proposal_revisions` ADD CONSTRAINT `proposal_revisions_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `deals` ADD CONSTRAINT `deals_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `deals` ADD CONSTRAINT `deals_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `deals` ADD CONSTRAINT `deals_buyer_company_id_fkey` FOREIGN KEY (`buyer_company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `deals` ADD CONSTRAINT `deals_seller_company_id_fkey` FOREIGN KEY (`seller_company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_deal_id_fkey` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_user_id_fkey` FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `payment_transactions` (
    `idempotency_key` VARCHAR(100) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `deal_id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `external_id` VARCHAR(180) NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'BRL',
    `status` ENUM('INITIATED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
    `checkout_url` TEXT NULL,
    `metadata` JSON NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `payment_transactions_idempotency_key_key`(`idempotency_key`),
    UNIQUE INDEX `payment_transactions_external_id_key`(`external_id`),
    INDEX `payment_transactions_deal_id_status_idx`(`deal_id`, `status`),
    INDEX `payment_transactions_company_id_created_at_idx`(`company_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `logistics_requests` (
    `id` VARCHAR(36) NOT NULL,
    `deal_id` VARCHAR(36) NOT NULL,
    `requested_by_user_id` VARCHAR(36) NOT NULL,
    `origin` VARCHAR(300) NOT NULL,
    `destination` VARCHAR(300) NOT NULL,
    `quantity` DECIMAL(16, 3) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `pickup_window` VARCHAR(160) NULL,
    `requirements` TEXT NULL,
    `status` ENUM('REQUESTED', 'QUOTED', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `logistics_requests_deal_id_status_idx`(`deal_id`, `status`),
    INDEX `logistics_requests_requested_by_user_id_created_at_idx`(`requested_by_user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `logistics_quotes` (
    `id` VARCHAR(36) NOT NULL,
    `request_id` VARCHAR(36) NOT NULL,
    `quoted_by_user_id` VARCHAR(36) NOT NULL,
    `carrier_name` VARCHAR(200) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'BRL',
    `estimated_days` INTEGER NULL,
    `notes` TEXT NULL,
    `status` ENUM('ACTIVE', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `logistics_quotes_request_id_status_idx`(`request_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_deal_id_fkey` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `logistics_requests` ADD CONSTRAINT `logistics_requests_deal_id_fkey` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `logistics_requests` ADD CONSTRAINT `logistics_requests_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `logistics_quotes` ADD CONSTRAINT `logistics_quotes_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `logistics_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `logistics_quotes` ADD CONSTRAINT `logistics_quotes_quoted_by_user_id_fkey` FOREIGN KEY (`quoted_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `auth_tokens` ADD CONSTRAINT `auth_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
