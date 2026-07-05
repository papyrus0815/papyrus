-- AlterTable
ALTER TABLE `person` ADD COLUMN `historical_country_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_person_historicalCountryId` ON `person`(`historical_country_id`);

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: 기존 "역사국가 주 국적"(CITIZENSHIP priority=0 슬롯의 historical_country_id)을 새 first-class FK로 승격.
-- dual-write(F1=A) 정책 — 슬롯은 discovery 인덱스로 유지하고, FK로 미러 복사한다.
UPDATE `person` `p`
JOIN `person_country_affiliation` `a`
  ON `a`.`person_id` = `p`.`id`
 AND `a`.`affiliation_type` = 'CITIZENSHIP'
 AND `a`.`priority` = 0
 AND `a`.`historical_country_id` IS NOT NULL
SET `p`.`historical_country_id` = `a`.`historical_country_id`
WHERE `p`.`historical_country_id` IS NULL;
