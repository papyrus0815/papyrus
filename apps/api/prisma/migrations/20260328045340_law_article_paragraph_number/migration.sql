-- AlterTable
ALTER TABLE `law` DROP COLUMN `provision_reference`,
    ADD COLUMN `article_number` INTEGER NULL,
    ADD COLUMN `paragraph_number` INTEGER NULL;