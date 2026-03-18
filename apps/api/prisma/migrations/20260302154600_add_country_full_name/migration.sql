-- DropForeignKey
ALTER TABLE `person_spouse` DROP FOREIGN KEY `person_spouse_person_id_fkey`;

-- DropForeignKey
ALTER TABLE `person_spouse` DROP FOREIGN KEY `person_spouse_spouse_id_fkey`;

-- AlterTable
ALTER TABLE `country` ADD COLUMN `full_name` VARCHAR(150) NULL;

-- DropTable
DROP TABLE `person_spouse`;