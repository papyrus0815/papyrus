-- DropForeignKey
ALTER TABLE `government_career` DROP FOREIGN KEY `government_career_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `government_career` DROP FOREIGN KEY `government_career_organization_id_fkey`;

-- DropForeignKey
ALTER TABLE `government_career` DROP FOREIGN KEY `government_career_person_id_fkey`;

-- DropForeignKey
ALTER TABLE `government_career` DROP FOREIGN KEY `government_career_position_id_fkey`;

-- DropForeignKey
ALTER TABLE `government_career_image` DROP FOREIGN KEY `government_career_image_career_id_fkey`;

-- DropTable
DROP TABLE `government_career`;

-- DropTable
DROP TABLE `government_career_image`;

-- CreateTable
CREATE TABLE `tenure_events_page_display` (
    `tenure_id` CHAR(36) NOT NULL,
    `show_on_events_page` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenure_events_page_display_tenure_id_key`(`tenure_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tenure_events_page_display` ADD CONSTRAINT `tenure_events_page_display_tenure_id_fkey` FOREIGN KEY (`tenure_id`) REFERENCES `government_position_tenure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

