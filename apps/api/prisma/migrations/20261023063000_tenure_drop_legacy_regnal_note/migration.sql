-- 재임 비고(notes)의 레거시 '왕명: X' 줄 정리 — 왕호는 regnal_name 칸이 정본이다.
-- 남은 13행 전부 비고가 그 한 줄뿐이고 값이 regnal_name과 같다(프리드리히 빌헬름 2·3·4세, 알렉산드르 1~3세 등).
-- 이 줄을 읽던 화면·API 폴백(정규식 파싱 6벌)은 같은 커밋에서 지운다.
UPDATE `government_position_tenure`
SET `notes` = NULLIF(TRIM(REGEXP_REPLACE(`notes`, '(^|\n)[ \t]*왕명[ \t]*:[^\n]*', '')), '')
WHERE `notes` REGEXP '(^|\n)[ \t]*왕명[ \t]*:'
  AND `regnal_name` IS NOT NULL;
