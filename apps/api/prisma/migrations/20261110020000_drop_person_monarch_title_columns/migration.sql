-- Person: 군주 호칭 스칼라 컬럼(temple_name, posthumous_name, pre_enthronement_title) 제거
ALTER TABLE `person`
  DROP COLUMN `temple_name`,
  DROP COLUMN `posthumous_name`,
  DROP COLUMN `pre_enthronement_title`;
