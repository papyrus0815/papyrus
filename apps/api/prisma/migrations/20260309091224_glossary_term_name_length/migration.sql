-- DropIndex
DROP INDEX `idx_glossary_term_name` ON `glossary_term`;

-- AlterTable
ALTER TABLE `glossary_term` MODIFY `name` VARCHAR(1000) NOT NULL;