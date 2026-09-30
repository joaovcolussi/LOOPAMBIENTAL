-- AlterTable
ALTER TABLE `companies` ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

-- AlterTable
ALTER TABLE `listings` ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

-- CreateIndex
CREATE INDEX `listings_latitude_longitude_idx` ON `listings`(`latitude`, `longitude`);
