-- DropForeignKey (self-reference on government_position_definition)
ALTER TABLE `government_position_definition` DROP FOREIGN KEY `government_position_definition_parent_id_fkey`;

-- DropIndex
DROP INDEX `idx_gov_pos_def_parentId` ON `government_position_definition`;

-- AlterTable
ALTER TABLE `government_position_definition` DROP COLUMN `parent_id`;
