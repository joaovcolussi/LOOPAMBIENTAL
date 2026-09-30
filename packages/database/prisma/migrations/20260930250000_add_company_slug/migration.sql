-- AlterTable
ALTER TABLE `companies` ADD COLUMN `slug` VARCHAR(220) NULL;

-- Backfill deterministic slugs for existing companies
UPDATE `companies`
SET `slug` = CONCAT(
  LEFT(
    TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(`legal_name`, '[^a-zA-Z0-9]+', '-'))),
    180
  ),
  '-',
  LEFT(`id`, 8)
)
WHERE `slug` IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX `companies_slug_key` ON `companies`(`slug`);
