-- AlterTable
ALTER TABLE `government_position_definition` ADD COLUMN `is_monarchical` BOOLEAN NOT NULL DEFAULT false;

-- Backfill: 세습·주권 군주 칭호(HEAD_OF_STATE 12종)만 재위 성격으로 표시.
-- 대통령·국가주석·최고지도자(공화정 원수), 각료·귀족 칭호는 default false 유지.
UPDATE `government_position_definition`
  SET `is_monarchical` = true
  WHERE `position_type` = 'HEAD_OF_STATE'
    AND `title` IN ('국왕','여왕','황제','천황','교황','칸','술탄',
                    '선제후','로마왕','이탈리아왕','변경백','방백');
