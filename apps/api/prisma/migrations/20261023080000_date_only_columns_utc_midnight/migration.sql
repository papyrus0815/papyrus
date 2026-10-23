-- '날짜만' 뜻하는 DATETIME 칸을 UTC 자정으로 — 재임(20261023051000)과 같은 규칙을 나머지 테이블에.
--
-- 시드가 `new Date(y, m - 1, d)`(로컬 자정)로 날짜를 만들어, 이 맥(로스앤젤레스)에서 넣은 값은 07:00·08:00·07:52:58(LMT)이
-- 박혀 있다. 서울 서버에서 같은 시드를 돌리면 전날 15:00이 되어 하루 앞당겨지고, 화면이 로컬 getter로 읽으면 서쪽에선 전날로 보인다.
-- 값을 '가장 가까운 UTC 자정'으로 맞춘다(+12시간 후 날짜). 검증: 이 반올림으로 달력 날짜가 바뀌는 행 0, 바뀌는 건 시각뿐.
-- 같은 커밋에서 시드는 Date.UTC로, API·웹은 날짜 값을 UTC로 읽게 바꾼다.
-- 대상에서 뺀 것: event.start_date/end_date(시각을 담는 칸 — 07:15 지령 등), *_at 타임스탬프(획득·배지 시각).

UPDATE `dynasty` SET `start_date` = TIMESTAMP(DATE(`start_date` + INTERVAL 12 HOUR)) WHERE `start_date` IS NOT NULL AND TIME(`start_date`) <> '00:00:00';
UPDATE `dynasty` SET `end_date` = TIMESTAMP(DATE(`end_date` + INTERVAL 12 HOUR)) WHERE `end_date` IS NOT NULL AND TIME(`end_date`) <> '00:00:00';
UPDATE `government_position_definition` SET `established_date` = TIMESTAMP(DATE(`established_date` + INTERVAL 12 HOUR)) WHERE `established_date` IS NOT NULL AND TIME(`established_date`) <> '00:00:00';
UPDATE `government_position_definition` SET `abolished_date` = TIMESTAMP(DATE(`abolished_date` + INTERVAL 12 HOUR)) WHERE `abolished_date` IS NOT NULL AND TIME(`abolished_date`) <> '00:00:00';
UPDATE `person` SET `birth_date` = TIMESTAMP(DATE(`birth_date` + INTERVAL 12 HOUR)) WHERE `birth_date` IS NOT NULL AND TIME(`birth_date`) <> '00:00:00';
UPDATE `person` SET `death_date` = TIMESTAMP(DATE(`death_date` + INTERVAL 12 HOUR)) WHERE `death_date` IS NOT NULL AND TIME(`death_date`) <> '00:00:00';
UPDATE `person_country_affiliation` SET `start_date` = TIMESTAMP(DATE(`start_date` + INTERVAL 12 HOUR)) WHERE `start_date` IS NOT NULL AND TIME(`start_date`) <> '00:00:00';
UPDATE `person_country_affiliation` SET `end_date` = TIMESTAMP(DATE(`end_date` + INTERVAL 12 HOUR)) WHERE `end_date` IS NOT NULL AND TIME(`end_date`) <> '00:00:00';
UPDATE `person_human_relationship` SET `start_date` = TIMESTAMP(DATE(`start_date` + INTERVAL 12 HOUR)) WHERE `start_date` IS NOT NULL AND TIME(`start_date`) <> '00:00:00';
UPDATE `person_human_relationship` SET `end_date` = TIMESTAMP(DATE(`end_date` + INTERVAL 12 HOUR)) WHERE `end_date` IS NOT NULL AND TIME(`end_date`) <> '00:00:00';
UPDATE `person_life_event` SET `start_date` = TIMESTAMP(DATE(`start_date` + INTERVAL 12 HOUR)) WHERE `start_date` IS NOT NULL AND TIME(`start_date`) <> '00:00:00';
UPDATE `person_life_event` SET `end_date` = TIMESTAMP(DATE(`end_date` + INTERVAL 12 HOUR)) WHERE `end_date` IS NOT NULL AND TIME(`end_date`) <> '00:00:00';
UPDATE `person_spouse` SET `marriage_start_date` = TIMESTAMP(DATE(`marriage_start_date` + INTERVAL 12 HOUR)) WHERE `marriage_start_date` IS NOT NULL AND TIME(`marriage_start_date`) <> '00:00:00';
UPDATE `person_spouse` SET `marriage_end_date` = TIMESTAMP(DATE(`marriage_end_date` + INTERVAL 12 HOUR)) WHERE `marriage_end_date` IS NOT NULL AND TIME(`marriage_end_date`) <> '00:00:00';
UPDATE `political_party` SET `founded_date` = TIMESTAMP(DATE(`founded_date` + INTERVAL 12 HOUR)) WHERE `founded_date` IS NOT NULL AND TIME(`founded_date`) <> '00:00:00';
UPDATE `political_party` SET `dissolved_date` = TIMESTAMP(DATE(`dissolved_date` + INTERVAL 12 HOUR)) WHERE `dissolved_date` IS NOT NULL AND TIME(`dissolved_date`) <> '00:00:00';
UPDATE `political_party_membership` SET `start_date` = TIMESTAMP(DATE(`start_date` + INTERVAL 12 HOUR)) WHERE `start_date` IS NOT NULL AND TIME(`start_date`) <> '00:00:00';
UPDATE `political_party_membership` SET `end_date` = TIMESTAMP(DATE(`end_date` + INTERVAL 12 HOUR)) WHERE `end_date` IS NOT NULL AND TIME(`end_date`) <> '00:00:00';
