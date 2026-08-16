-- AlterTable
ALTER TABLE `event` ADD COLUMN `anchor_override` ENUM('ANCHOR', 'PLAIN') NULL;
