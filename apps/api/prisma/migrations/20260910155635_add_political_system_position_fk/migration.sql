-- AlterTable
ALTER TABLE `political_system` ADD COLUMN `head_of_government_position_id` CHAR(36) NULL,
    ADD COLUMN `head_of_state_position_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_political_system_headOfStatePositionId` ON `political_system`(`head_of_state_position_id`);

-- CreateIndex
CREATE INDEX `idx_political_system_headOfGovernmentPositionId` ON `political_system`(`head_of_government_position_id`);

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_head_of_state_position_id_fkey` FOREIGN KEY (`head_of_state_position_id`) REFERENCES `government_position_definition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_head_of_government_position_id_fkey` FOREIGN KEY (`head_of_government_position_id`) REFERENCES `government_position_definition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- 백필: 자유입력으로 저장돼 있던 직함을 관직 정의 카탈로그와 이어 붙인다.
-- 정확히 같은 제목 + 같은 유형(국가원수/정부수반)일 때만 연결한다 — '연합회의 의장'처럼
-- 카탈로그에 없는 칭호는 그대로 자유입력으로 남는다(그게 그 칸의 남은 역할이다).
UPDATE `political_system` ps
JOIN `government_position_definition` def
  ON def.`title` = ps.`head_of_state_title`
 AND def.`position_type` = 'HEAD_OF_STATE'
SET ps.`head_of_state_position_id` = def.`id`,
    ps.`head_of_state_title` = NULL
WHERE ps.`head_of_state_title` IS NOT NULL
  AND ps.`head_of_state_position_id` IS NULL;

UPDATE `political_system` ps
JOIN `government_position_definition` def
  ON def.`title` = ps.`head_of_government_title`
 AND def.`position_type` = 'HEAD_OF_GOVERNMENT'
SET ps.`head_of_government_position_id` = def.`id`,
    ps.`head_of_government_title` = NULL
WHERE ps.`head_of_government_title` IS NOT NULL
  AND ps.`head_of_government_position_id` IS NULL;
