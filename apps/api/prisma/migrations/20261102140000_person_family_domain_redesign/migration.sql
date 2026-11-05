-- 1. Person: 성별 내 출생 서열(gender_birth_order) 및 양부모(adoptive_father_id, adoptive_mother_id) 컬럼 추가
ALTER TABLE `person`
    ADD COLUMN `gender_birth_order` INTEGER NULL,
    ADD COLUMN `adoptive_father_id` CHAR(36) NULL,
    ADD COLUMN `adoptive_mother_id` CHAR(36) NULL;

-- 2. PersonSpouse: 혼인 해소 사유(marriage_end_reason) 및 서열 귀속 배우자(rank_holder_id) 컬럼 추가
ALTER TABLE `person_spouse`
    ADD COLUMN `marriage_end_reason` ENUM('DEATH', 'DIVORCE', 'DEPOSED', 'ANNULMENT', 'SEPARATION', 'OTHER') NULL,
    ADD COLUMN `rank_holder_id` CHAR(36) NULL;

-- 3. 기존 데이터 정합성 보정:
-- 3a) parent_marriage_id가 존재하지 않는 person_spouse를 가리키는 고아 참조 정리
UPDATE `person` p
LEFT JOIN `person_spouse` ps ON p.`parent_marriage_id` = ps.`id`
SET p.`parent_marriage_id` = NULL
WHERE p.`parent_marriage_id` IS NOT NULL AND ps.`id` IS NULL;

-- 3b) 친부모(father_id, mother_id) 사이에 person_spouse 행이 존재하면 parent_marriage_id 자동 백필
UPDATE `person` p
INNER JOIN `person_spouse` ps
  ON (ps.`person_id` = p.`father_id` AND ps.`spouse_id` = p.`mother_id`)
  OR (ps.`person_id` = p.`mother_id` AND ps.`spouse_id` = p.`father_id`)
SET p.`parent_marriage_id` = ps.`id`
WHERE p.`parent_marriage_id` IS NULL
  AND p.`father_id` IS NOT NULL
  AND p.`mother_id` IS NOT NULL;

-- 3c) 기존 비대칭 혼인 서열(PRIMARY, SECONDARY, CONCUBINE) 행에서 남녀 부부인 경우 여성 배우자 쪽으로 rank_holder_id 백필
UPDATE `person_spouse` ps
INNER JOIN `person` p1 ON ps.`person_id` = p1.`id`
INNER JOIN `person` p2 ON ps.`spouse_id` = p2.`id`
SET ps.`rank_holder_id` = CASE
    WHEN UPPER(p1.`gender`) = 'FEMALE' AND UPPER(p2.`gender`) = 'MALE' THEN p1.`id`
    WHEN UPPER(p2.`gender`) = 'FEMALE' AND UPPER(p1.`gender`) = 'MALE' THEN p2.`id`
    ELSE NULL
END
WHERE ps.`rank_holder_id` IS NULL
  AND ps.`marriage_rank` IN ('PRIMARY', 'SECONDARY', 'CONCUBINE');

-- 4. 인덱스 및 외래키 제약 추가
CREATE INDEX `idx_person_adoptiveFatherId` ON `person`(`adoptive_father_id`);
CREATE INDEX `idx_person_adoptiveMotherId` ON `person`(`adoptive_mother_id`);

ALTER TABLE `person`
    ADD CONSTRAINT `person_adoptive_father_id_fkey` FOREIGN KEY (`adoptive_father_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `person_adoptive_mother_id_fkey` FOREIGN KEY (`adoptive_mother_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `person_parent_marriage_id_fkey` FOREIGN KEY (`parent_marriage_id`) REFERENCES `person_spouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
