-- AlterTable
ALTER TABLE `cabinet` ADD COLUMN `linkage_group_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `cabinet_linkage_group` (
    `id` CHAR(36) NOT NULL,
    `label` VARCHAR(200) NULL,
    `account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_cabinet_linkage_group_accountId`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_cabinet_linkageGroupId` ON `cabinet`(`linkage_group_id`);

-- AddForeignKey
ALTER TABLE `cabinet_linkage_group` ADD CONSTRAINT `cabinet_linkage_group_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_linkage_group_id_fkey` FOREIGN KEY (`linkage_group_id`) REFERENCES `cabinet_linkage_group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;