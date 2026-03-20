-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `sub_term_number` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `event_country_relation_treaty` ADD CONSTRAINT `event_country_relation_treaty_relation_id_fkey` FOREIGN KEY (`relation_id`) REFERENCES `event_country_relation_new`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;