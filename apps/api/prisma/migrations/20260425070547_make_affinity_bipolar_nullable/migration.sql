-- AlterTable: 친밀도 nullable 화 (MENTOR에서 미설정 허용)
ALTER TABLE `person_human_relationship` MODIFY `affinity_level` INTEGER NULL;

-- Backfill: 단극 1..5 → 양극 -2..+2 매핑
--   1=매우 낮음 → -2 (매우 적대)
--   2=낮음     → -1 (다소 부정)
--   3=중립     →  0 (중립)
--   4=높음     → +1 (다소 우호)
--   5=매우 높음 → +2 (매우 우호)
UPDATE `person_human_relationship`
SET `affinity_level` = CASE
  WHEN `affinity_level` = 1 THEN -2
  WHEN `affinity_level` = 2 THEN -1
  WHEN `affinity_level` = 3 THEN 0
  WHEN `affinity_level` = 4 THEN 1
  WHEN `affinity_level` = 5 THEN 2
  ELSE `affinity_level`
END
WHERE `affinity_level` BETWEEN 1 AND 5;

-- MENTOR 행은 프런트가 항상 3(중립)을 강제 전송했던 노이즈 — NULL로 정리.
-- (기존 모델에서 MENTOR의 친밀도는 UI에서 노출/수집되지 않았음)
UPDATE `person_human_relationship`
SET `affinity_level` = NULL
WHERE `relationship_type` = 'MENTOR';
