/*
  Warnings:

  - You are about to alter the column `type` on the `person_nickname` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(95))`.

*/
-- 미매핑 자유 문자열은 덮어쓰기 전에 원문을 reason에 보존 (ELSE 'OTHER'가 비가역이므로)
UPDATE `person_nickname`
SET `reason` = LEFT(
  CONCAT(
    COALESCE(`reason`, ''),
    CASE WHEN `reason` IS NULL OR `reason` = '' THEN '' ELSE ' · ' END,
    '유형(이전): ', `type`
  ), 300)
WHERE `type` IS NOT NULL AND `type` <> ''
  AND `type` NOT IN (
    '별명', '이명', '애칭', '존칭', '경칭', '조롱', '멸칭', '출생명', '아명',
    '자', '자(字)', '호', '아호', '아호(雅號)', '필명', '시호', '묘호', '가명', '기타',
    'EPITHET', 'PET_NAME', 'HONORIFIC', 'PEJORATIVE', 'BIRTH_NAME', 'CHILDHOOD_NAME',
    'COURTESY_NAME', 'ART_NAME', 'PEN_NAME', 'POSTHUMOUS_NAME', 'TEMPLE_NAME', 'PSEUDONYM', 'OTHER'
  );

-- 백필: 기존 자유 문자열 유형 → enum 토큰 (MODIFY 전에 실행해야 strict mode 캐스트 실패/절단 없음)
-- 이미 유효 토큰인 행은 제외 — 시드 선실행(토큰이 VarChar로 먼저 들어온 경우)·수동 재실행에도 멱등
UPDATE `person_nickname`
SET `type` = CASE `type`
  WHEN '별명' THEN 'EPITHET'
  WHEN '이명' THEN 'EPITHET'
  WHEN '애칭' THEN 'PET_NAME'
  WHEN '존칭' THEN 'HONORIFIC'
  WHEN '경칭' THEN 'HONORIFIC'
  WHEN '조롱' THEN 'PEJORATIVE'
  WHEN '멸칭' THEN 'PEJORATIVE'
  WHEN '출생명' THEN 'BIRTH_NAME'
  WHEN '아명' THEN 'CHILDHOOD_NAME'
  WHEN '자' THEN 'COURTESY_NAME'
  WHEN '자(字)' THEN 'COURTESY_NAME'
  WHEN '호' THEN 'ART_NAME'
  WHEN '아호' THEN 'ART_NAME'
  WHEN '아호(雅號)' THEN 'ART_NAME'
  WHEN '필명' THEN 'PEN_NAME'
  WHEN '시호' THEN 'POSTHUMOUS_NAME'
  WHEN '묘호' THEN 'TEMPLE_NAME'
  WHEN '가명' THEN 'PSEUDONYM'
  ELSE 'OTHER'
END
WHERE `type` IS NOT NULL AND `type` <> ''
  AND `type` NOT IN (
    'EPITHET', 'PET_NAME', 'HONORIFIC', 'PEJORATIVE', 'BIRTH_NAME', 'CHILDHOOD_NAME',
    'COURTESY_NAME', 'ART_NAME', 'PEN_NAME', 'POSTHUMOUS_NAME', 'TEMPLE_NAME', 'PSEUDONYM', 'OTHER'
  );

-- 빈 문자열은 미분류(NULL)로 — strict mode에서 ''는 enum 캐스트 실패
UPDATE `person_nickname` SET `type` = NULL WHERE `type` = '';

-- AlterTable
ALTER TABLE `person_nickname` MODIFY `type` ENUM('EPITHET', 'PET_NAME', 'HONORIFIC', 'PEJORATIVE', 'BIRTH_NAME', 'CHILDHOOD_NAME', 'COURTESY_NAME', 'ART_NAME', 'PEN_NAME', 'POSTHUMOUS_NAME', 'TEMPLE_NAME', 'PSEUDONYM', 'OTHER') NULL;
