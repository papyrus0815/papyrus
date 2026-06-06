-- AlterTable
ALTER TABLE `notification` ADD COLUMN `actor_account_id` CHAR(36) NULL,
    ADD COLUMN `actor_name` VARCHAR(60) NULL;
