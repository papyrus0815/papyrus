-- AlterTable
ALTER TABLE `person_event` ADD COLUMN `country_id` CHAR(36) NULL,
    ADD COLUMN `historical_country_id` CHAR(36) NULL,
    ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `idx_person_event_eventId_sortOrder` ON `person_event`(`event_id`, `sort_order`);

-- CreateIndex
CREATE INDEX `idx_person_event_countryId` ON `person_event`(`country_id`);

-- CreateIndex
CREATE INDEX `idx_person_event_histCountryId` ON `person_event`(`historical_country_id`);

-- AddForeignKey
ALTER TABLE `person_event` ADD CONSTRAINT `person_event_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_event` ADD CONSTRAINT `person_event_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 백필 ──────────────────────────────────────────────────────────────────
-- 1) 표시 순서: 지금 화면에 보이는 순서(ORDER BY 없이 읽혀 PK=id 순)를 그대로 보존한다.
UPDATE `person_event` pe
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `event_id` ORDER BY `id`) - 1 AS rn
  FROM `person_event`
) ordered ON ordered.`id` = pe.`id`
SET pe.`sort_order` = ordered.rn;

-- 2) 참여 자격 국가 — 모호하지 않을 때만.
-- 2-a) 인물의 역사국가 국적이 그 사건의 참여국(또는 주 무대)이면
UPDATE `person_event` pe
JOIN `person` p ON p.`id` = pe.`person_id`
JOIN `event` e ON e.`id` = pe.`event_id`
SET pe.`historical_country_id` = p.`historical_country_id`
WHERE p.`historical_country_id` IS NOT NULL
  AND (
    e.`historical_country_id` = p.`historical_country_id`
    OR EXISTS (
      SELECT 1 FROM `event_country_relation` r
      WHERE r.`event_id` = pe.`event_id` AND r.`historical_country_id` = p.`historical_country_id`
    )
  );

-- 2-b) 인물의 현대국가 국적이 그 사건의 참여국이면
UPDATE `person_event` pe
JOIN `person` p ON p.`id` = pe.`person_id`
SET pe.`country_id` = p.`country_id`
WHERE p.`country_id` IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM `event_country_relation` r
    WHERE r.`event_id` = pe.`event_id` AND r.`country_id` = p.`country_id`
  );

-- 2-c) 아직 역사국가가 비었고, 인물의 현대국가와 브리지로 이어진 역사국가가 사건 참여국 중 **딱 하나**면
UPDATE `person_event` pe
JOIN `person` p ON p.`id` = pe.`person_id`
JOIN (
  SELECT r.`event_id`, hm.`modern_country_id`, MIN(r.`historical_country_id`) AS hc_id,
         COUNT(DISTINCT r.`historical_country_id`) AS hc_count
  FROM `event_country_relation` r
  JOIN `historical_country_modern_country` hm ON hm.`historical_country_id` = r.`historical_country_id`
  GROUP BY r.`event_id`, hm.`modern_country_id`
) bridged ON bridged.`event_id` = pe.`event_id` AND bridged.`modern_country_id` = p.`country_id`
SET pe.`historical_country_id` = bridged.hc_id
WHERE pe.`historical_country_id` IS NULL AND bridged.hc_count = 1;
