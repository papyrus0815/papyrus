-- AlterTable
ALTER TABLE `organization` MODIFY `type` ENUM('POLITICAL_PARTY', 'INTERGOVERNMENTAL_ORG', 'NGO', 'TRADE_UNION', 'GOVERNMENT_AGENCY', 'MILITARY_ALLIANCE', 'RELIGIOUS_ORG', 'BUSINESS_ASSOCIATION', 'EDUCATION', 'MILITARY_ACADEMY', 'COMPANY', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `organization_person_role` ADD COLUMN `term_number` INTEGER NULL,
    ADD COLUMN `timeline_title` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `person` ADD COLUMN `is_alive` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_birth_date_unknown` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_death_date_unknown` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `middle_name` VARCHAR(50) NULL,
    ADD COLUMN `original_name` VARCHAR(100) NULL,
    ADD COLUMN `show_lifespan_on_event_list` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `organization_person_role_image` (
    `id` CHAR(36) NOT NULL,
    `role_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_org_person_role_image_roleId`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_nickname` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `nickname` VARCHAR(100) NOT NULL,
    `type` VARCHAR(50) NULL,
    `priority` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_nickname_personId`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_profile_image` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `priority` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_profile_image_personId`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_education` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `organization_id` CHAR(36) NOT NULL,
    `education_type` VARCHAR(50) NULL,
    `class_number` INTEGER NULL,
    `degree` VARCHAR(50) NULL,
    `major` VARCHAR(200) NULL,
    `department` VARCHAR(200) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `status` VARCHAR(50) NULL,
    `student_number` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_education_personId`(`person_id`),
    INDEX `idx_person_education_orgId`(`organization_id`),
    INDEX `idx_person_education_classNumber`(`class_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `education_image` (
    `id` CHAR(36) NOT NULL,
    `education_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_education_image_educationId`(`education_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `military_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `rank_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `branch` VARCHAR(50) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `position` VARCHAR(100) NULL,
    `term_number` INTEGER NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_military_career_personId`(`person_id`),
    INDEX `idx_military_career_rankId`(`rank_id`),
    INDEX `idx_military_career_orgId`(`organization_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `military_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_military_career_image_careerId`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `government_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `department` VARCHAR(200) NULL,
    `organization_id` CHAR(36) NULL,
    `role_title` VARCHAR(100) NULL,
    `term_number` INTEGER NULL,
    `country_id` CHAR(36) NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_gov_career_personId`(`person_id`),
    INDEX `idx_gov_career_positionId`(`position_id`),
    INDEX `idx_gov_career_countryId`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `organization_id` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NULL,
    `level` VARCHAR(50) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_business_career_personId`(`person_id`),
    INDEX `idx_business_career_positionId`(`position_id`),
    INDEX `idx_business_career_orgId`(`organization_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `organization_id` CHAR(36) NOT NULL,
    `department` VARCHAR(200) NULL,
    `research_field` VARCHAR(200) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_academic_career_personId`(`person_id`),
    INDEX `idx_academic_career_positionId`(`position_id`),
    INDEX `idx_academic_career_orgId`(`organization_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `religious_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `organization_id` CHAR(36) NULL,
    `religion_id` CHAR(36) NOT NULL,
    `denomination_id` CHAR(36) NULL,
    `title` VARCHAR(100) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_religious_career_personId`(`person_id`),
    INDEX `idx_religious_career_positionId`(`position_id`),
    INDEX `idx_religious_career_religionId`(`religion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `government_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_government_career_image_careerId`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_business_career_image_careerId`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_academic_career_image_careerId`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `religious_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_religious_career_image_careerId`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `organization_id` CHAR(36) NULL,
    `genre` VARCHAR(200) NULL,
    `art_field` VARCHAR(200) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_artist_career_personId`(`person_id`),
    INDEX `idx_artist_career_positionId`(`position_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `artist_career_image_career_id_idx`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `athlete_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `organization_id` CHAR(36) NULL,
    `sport` VARCHAR(100) NULL,
    `position` VARCHAR(100) NULL,
    `jersey_number` INTEGER NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `athlete_career_person_id_idx`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `athlete_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `athlete_career_image_career_id_idx`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `organization_id` CHAR(36) NOT NULL,
    `department` VARCHAR(200) NULL,
    `beat` VARCHAR(200) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `media_career_person_id_idx`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `media_career_image_career_id_idx`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legal_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `organization_id` CHAR(36) NULL,
    `specialization` VARCHAR(200) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `legal_career_person_id_idx`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legal_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `legal_career_image_career_id_idx`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medical_career` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `timeline_title` VARCHAR(200) NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT true,
    `position_id` CHAR(36) NOT NULL,
    `job_category_id` CHAR(36) NULL,
    `organization_id` CHAR(36) NOT NULL,
    `department` VARCHAR(200) NULL,
    `specialization` VARCHAR(200) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `medical_career_person_id_idx`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medical_career_image` (
    `id` CHAR(36) NOT NULL,
    `career_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `medical_career_image_career_id_idx`(`career_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_award` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `award_name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NULL,
    `awarding_body` VARCHAR(200) NULL,
    `award_date` DATETIME(3) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `person_award_person_id_idx`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_award_image` (
    `id` CHAR(36) NOT NULL,
    `award_id` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `person_award_image_award_id_idx`(`award_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization_person_role_image` ADD CONSTRAINT `organization_person_role_image_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `organization_person_role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_nickname` ADD CONSTRAINT `person_nickname_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_profile_image` ADD CONSTRAINT `person_profile_image_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_education` ADD CONSTRAINT `person_education_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_education` ADD CONSTRAINT `person_education_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `education_image` ADD CONSTRAINT `education_image_education_id_fkey` FOREIGN KEY (`education_id`) REFERENCES `person_education`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_career` ADD CONSTRAINT `military_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_career` ADD CONSTRAINT `military_career_rank_id_fkey` FOREIGN KEY (`rank_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_career` ADD CONSTRAINT `military_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_career_image` ADD CONSTRAINT `military_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `military_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_career` ADD CONSTRAINT `government_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_career` ADD CONSTRAINT `government_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_career` ADD CONSTRAINT `government_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_career` ADD CONSTRAINT `government_career_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_career` ADD CONSTRAINT `business_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_career` ADD CONSTRAINT `business_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_career` ADD CONSTRAINT `business_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_career` ADD CONSTRAINT `academic_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_career` ADD CONSTRAINT `academic_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_career` ADD CONSTRAINT `academic_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `religious_career` ADD CONSTRAINT `religious_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `religious_career` ADD CONSTRAINT `religious_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `religious_career` ADD CONSTRAINT `religious_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `religious_career` ADD CONSTRAINT `religious_career_religion_id_fkey` FOREIGN KEY (`religion_id`) REFERENCES `religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `religious_career` ADD CONSTRAINT `religious_career_denomination_id_fkey` FOREIGN KEY (`denomination_id`) REFERENCES `religion_denomination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_career_image` ADD CONSTRAINT `government_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `government_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_career_image` ADD CONSTRAINT `business_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `business_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_career_image` ADD CONSTRAINT `academic_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `academic_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `religious_career_image` ADD CONSTRAINT `religious_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `religious_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist_career` ADD CONSTRAINT `artist_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist_career` ADD CONSTRAINT `artist_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist_career` ADD CONSTRAINT `artist_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist_career_image` ADD CONSTRAINT `artist_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `artist_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `athlete_career` ADD CONSTRAINT `athlete_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `athlete_career` ADD CONSTRAINT `athlete_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `athlete_career` ADD CONSTRAINT `athlete_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `athlete_career_image` ADD CONSTRAINT `athlete_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `athlete_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_career` ADD CONSTRAINT `media_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_career` ADD CONSTRAINT `media_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_career` ADD CONSTRAINT `media_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_career_image` ADD CONSTRAINT `media_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `media_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legal_career` ADD CONSTRAINT `legal_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legal_career` ADD CONSTRAINT `legal_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legal_career` ADD CONSTRAINT `legal_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legal_career_image` ADD CONSTRAINT `legal_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `legal_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_career` ADD CONSTRAINT `medical_career_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_career` ADD CONSTRAINT `medical_career_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `ref_job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_career` ADD CONSTRAINT `medical_career_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_career_image` ADD CONSTRAINT `medical_career_image_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `medical_career`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_award` ADD CONSTRAINT `person_award_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_award_image` ADD CONSTRAINT `person_award_image_award_id_fkey` FOREIGN KEY (`award_id`) REFERENCES `person_award`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
