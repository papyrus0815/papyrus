-- 국가 기관(administration_department) 재설계 — 2026-11-08
--  · 기관 종류(kind)·원어명·영문명·약칭
--  · 설립·폐지일 구조화(era/연/월/일/정밀도) — 기존 DATETIME에서 백필, DATETIME은 서버 파생으로 강등
--  · 후신 1칸(successor_id) → 계보 표(administration_department_transition)로 이전 후 컬럼 삭제
--  · 사건 ↔ 기관 연결(event_department_relation) 신설
--  · 부처 내 별도 사건 표(administration_department_event, 0행) 폐기
--  · 삭제 규칙: 상위 기관 CASCADE → RESTRICT(하위가 함께 지워지던 것), 현대 국가 CASCADE → SET NULL

-- DropForeignKey
ALTER TABLE `administration_department` DROP FOREIGN KEY `administration_department_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `administration_department` DROP FOREIGN KEY `administration_department_parent_id_fkey`;

-- DropForeignKey
ALTER TABLE `administration_department` DROP FOREIGN KEY `administration_department_successor_id_fkey`;

-- DropForeignKey
ALTER TABLE `administration_department_event` DROP FOREIGN KEY `administration_department_event_department_id_fkey`;

-- CreateTable
CREATE TABLE `administration_department_transition` (
    `id` CHAR(36) NOT NULL,
    `predecessor_id` CHAR(36) NOT NULL,
    `successor_id` CHAR(36) NOT NULL,
    `kind` ENUM('RENAME', 'MERGE', 'SPLIT', 'REORGANIZE', 'ABSORBED') NOT NULL,
    `era` ENUM('BC', 'AD') NULL,
    `year` INTEGER NULL,
    `month` INTEGER NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_admin_dept_transition_successorId`(`successor_id`),
    UNIQUE INDEX `administration_department_transition_predecessor_id_successo_key`(`predecessor_id`, `successor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 백필: 후신 1칸 → 계보 표(종류를 알 수 없어 REORGANIZE)
INSERT INTO `administration_department_transition` (`id`, `predecessor_id`, `successor_id`, `kind`, `created_at`, `updated_at`)
SELECT UUID(), `id`, `successor_id`, 'REORGANIZE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `administration_department` WHERE `successor_id` IS NOT NULL;

-- DropIndex
DROP INDEX `idx_admin_dept_successorId` ON `administration_department`;

-- AlterTable
ALTER TABLE `administration_department` DROP COLUMN `successor_id`,
    ADD COLUMN `abbreviation` VARCHAR(40) NULL,
    ADD COLUMN `abolished_day` INTEGER NULL,
    ADD COLUMN `abolished_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `abolished_month` INTEGER NULL,
    ADD COLUMN `abolished_precision` VARCHAR(10) NULL,
    ADD COLUMN `abolished_year` INTEGER NULL,
    ADD COLUMN `established_day` INTEGER NULL,
    ADD COLUMN `established_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `established_month` INTEGER NULL,
    ADD COLUMN `established_precision` VARCHAR(10) NULL,
    ADD COLUMN `established_year` INTEGER NULL,
    ADD COLUMN `kind` ENUM('MINISTRY', 'AGENCY', 'MILITARY_COMMAND', 'COLONIAL_GOVERNMENT', 'ROYAL_HOUSEHOLD', 'OTHER') NOT NULL DEFAULT 'MINISTRY',
    ADD COLUMN `name_en` VARCHAR(200) NULL,
    ADD COLUMN `name_local` VARCHAR(200) NULL;

-- 백필: 기존 DATETIME → 구조화 설립·폐지일 (서기, 일 단위)
UPDATE `administration_department`
SET `established_era` = 'AD', `established_year` = YEAR(`established_date`), `established_month` = MONTH(`established_date`),
    `established_day` = DAY(`established_date`), `established_precision` = 'day'
WHERE `established_date` IS NOT NULL;

UPDATE `administration_department`
SET `abolished_era` = 'AD', `abolished_year` = YEAR(`abolished_date`), `abolished_month` = MONTH(`abolished_date`),
    `abolished_day` = DAY(`abolished_date`), `abolished_precision` = 'day'
WHERE `abolished_date` IS NOT NULL;

-- DropTable
DROP TABLE `administration_department_event`;

-- CreateTable
CREATE TABLE `event_department_relation` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `department_id` CHAR(36) NOT NULL,
    `role` ENUM('ISSUER', 'RECIPIENT', 'PRINCIPAL', 'PARTICIPANT', 'OTHER') NOT NULL,
    `role_description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_department_eventId`(`event_id`),
    INDEX `idx_event_department_departmentId`(`department_id`),
    UNIQUE INDEX `event_department_relation_event_id_department_id_role_key`(`event_id`, `department_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_admin_dept_kind` ON `administration_department`(`kind`);

-- AddForeignKey
ALTER TABLE `administration_department` ADD CONSTRAINT `administration_department_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administration_department` ADD CONSTRAINT `administration_department_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `administration_department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administration_department_transition` ADD CONSTRAINT `administration_department_transition_predecessor_id_fkey` FOREIGN KEY (`predecessor_id`) REFERENCES `administration_department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administration_department_transition` ADD CONSTRAINT `administration_department_transition_successor_id_fkey` FOREIGN KEY (`successor_id`) REFERENCES `administration_department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_department_relation` ADD CONSTRAINT `event_department_relation_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_department_relation` ADD CONSTRAINT `event_department_relation_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `administration_department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
