-- 1. Schema: Add ultimatum_event_id to war_declaration
ALTER TABLE `war_declaration` ADD COLUMN `ultimatum_event_id` CHAR(36) NULL;

CREATE INDEX `idx_war_decl_ultimatumEventId` ON `war_declaration`(`ultimatum_event_id`);

ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_ultimatum_event_id_fkey`
  FOREIGN KEY (`ultimatum_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 2. PoliticalSystem 헌정 개전·선전포고권 및 군 통수권 정본 백필 (기존 70개 정체 보강)
-- ============================================================================

-- 2-A. 전제군주정 공통 기본값: 군주 전권(MONARCH_PREROGATIVE) + 군주가 최고통수권자
UPDATE `political_system`
SET
  `war_power_authority` = 'MONARCH_PREROGATIVE',
  `commander_in_chief_position_id` = COALESCE(`commander_in_chief_position_id`, `head_of_state_position_id`),
  `war_power_notes` = COALESCE(`war_power_notes`, '군주에게 선전·강화 및 군 통수 대권이 전속됨')
WHERE `war_power_authority` IS NULL
  AND `government_form` = 'ABSOLUTE_MONARCHY';

-- 2-B. 고전적·외견적 입헌군주정 중 헌법상 군주 대권 체제 (프로이센·오헝·사르데냐·이탈리아 왕국·루마니아·세르비아·러시아 1906·메이지 헌법·스페인 1876·부르봉 복고·7월 왕정)
UPDATE `political_system`
SET
  `war_power_authority` = 'MONARCH_PREROGATIVE',
  `commander_in_chief_position_id` = COALESCE(`commander_in_chief_position_id`, `head_of_state_position_id`),
  `war_power_notes` = COALESCE(`war_power_notes`, '헌법상 선전·강화 및 육해군 통수 대권이 군주에게 귀속됨(각료 부서 또는 내각 보필)')
WHERE `war_power_authority` IS NULL
  AND `id` IN (
    '3a637d86-253c-4dc8-8830-c59fe86adb26', -- 프로이센 1850년 흠정헌법
    '21a3b927-1f40-4f06-acee-2505670fb9c3', -- 북독일 연방 헌법
    'd176279f-2ce1-40af-8c0c-0038054d395f', -- 오스트리아-헝가리 1867 대타협
    '79415c92-2c4e-4fa8-9216-326956a17048', -- 헝가리 왕국 1867 대타협
    '881ddc6d-6f89-496c-8ba6-f1cd31f6dbab', -- 사르데냐 왕국 알베르토 헌장
    '1100282f-b8e9-4422-95aa-67e846172ae7', -- 이탈리아 왕국 알베르토 헌장 (제5조 국왕 선전포고권)
    '6b5f3a4e-b359-49c9-b8b2-858d566e2c81', -- 루마니아 왕국 입헌군주제
    'd6462820-74cf-409f-a988-3ef8a40cf366', -- 세르비아 왕국
    '5499a373-ca18-427d-b616-0ced5613a190', -- 세르비아-크로아티아-슬로베니아 왕국
    '923e4243-aa1d-4bd3-a54c-ceb0bb809cd9', -- 러시아 제국 1906년 국가기본법 제12·14조 황제 전권
    'e5c3c049-d4fe-4d5d-a8db-3968131184bd', -- 대일본제국 헌법 제11·13조 천황 통수·선전 대권
    'a51e14be-ae62-47b4-85e8-189d1e6f590d', -- 스페인 1876년 왕정복고 헌법
    '969fe0f4-0f27-4efe-a804-aa9a19981fbf', -- 프랑스 부르봉 복고 왕정 (1814 헌장 제14조)
    'd637604a-199f-40cd-a72e-7edbdca3f23b'  -- 프랑스 7월 왕정
  );

-- 2-C. 독일 제국 (비스마르크 헌법 제11조): 황제가 연방참사원(상원) 동의를 얻어 선전포고
UPDATE `political_system`
SET
  `war_power_authority` = 'MONARCH_WITH_UPPER_HOUSE',
  `war_consent_chamber_id` = `upper_chamber_id`,
  `commander_in_chief_position_id` = COALESCE(`commander_in_chief_position_id`, `head_of_state_position_id`),
  `war_power_notes` = '제국헌법 제11조: 황제가 제국 명의로 선전포고하되 연방참사원(Bundesrat)의 동의를 요함(단 제국 영토·해안 피침 시 단독 개전 가능)'
WHERE `id` = '49991fe1-d9eb-40d5-aad5-cbff6ee68896';

-- 2-D. 일본국 헌법 (평화헌법 제9조): 국권 발동으로서의 전쟁과 교전권 포기
UPDATE `political_system`
SET
  `war_power_authority` = 'RENOUNCED',
  `commander_in_chief_position_id` = COALESCE(`commander_in_chief_position_id`, `head_of_government_position_id`),
  `war_power_notes` = '헌법 제9조에 따라 국권 발동으로서의 전쟁과 무력행사 및 국가 교전권을 포기함(자위대 최고지휘감독권은 내각총리대신)'
WHERE `id` = 'c61e4686-afa4-492e-aefe-92cd243c164a';

-- 2-E. 의회 전속 개전 의결 체제 (미국 합중국 헌법·연합규약, 프랑스 제1공화국 국민공회, 바이마르 공화국 제45조)
UPDATE `political_system`
SET
  `war_power_authority` = 'LEGISLATURE_EXCLUSIVE',
  `war_consent_chamber_id` = `lower_chamber_id`,
  `commander_in_chief_position_id` = COALESCE(`commander_in_chief_position_id`, `head_of_state_position_id`),
  `war_power_notes` = CASE
    WHEN `id` = 'bf8fa13d-5b63-4b7b-bd92-f16c5bf79054' THEN '합중국 헌법 제1조 제8절 제11항에 따라 연방의회(상·하원 합동)가 전속 선전포고권을 보유하며, 대통령은 제2조 제2절상 육해군 최고사령관'
    WHEN `id` = 'a5dbdc98-c394-4d55-8866-886477c57c40' THEN '바이마르 헌법 제45조 제2항: 선전포고와 강화는 제국법률(제국의회 Reichstag 의결)로써 행함'
    WHEN `id` = '40c8bcc7-9e64-453e-a537-00253c8a1f5e' THEN '국민공회(입법부) 법령으로써 선전포고를 의결·선포함'
    ELSE '의회 전속 의결로써 선전포고·개전을 결정함'
  END
WHERE `id` IN (
  'bf8fa13d-5b63-4b7b-bd92-f16c5bf79054', -- 미국 합중국 헌법
  '9618460b-a397-47d4-b843-33d318b965d8', -- 미국 연합규약
  'a5dbdc98-c394-4d55-8866-886477c57c40', -- 바이마르 공화국
  '40c8bcc7-9e64-453e-a537-00253c8a1f5e'  -- 프랑스 제1공화국
);

-- 2-F. 영국 웨스트민스터 왕실 대권(내각 전결) 체제
UPDATE `political_system`
SET
  `war_power_authority` = 'EXECUTIVE_EXCLUSIVE',
  `commander_in_chief_position_id` = COALESCE(`commander_in_chief_position_id`, `head_of_state_position_id`),
  `war_power_notes` = '왕실 대권(Royal Prerogative)에 속하며 실제 개전 결정은 총리·내각의 자문에 따라 성립(법적 의회 사전 승인 불요, 최근 하원 표결 관행 형성)'
WHERE `id` IN (
  'c3e52272-6b95-4cf9-b596-dc74c5126cf3',
  '462e91b6-e34a-4359-8f47-bb5dd87dbf08',
  '221921b8-b9eb-413f-9048-88158ee5393e',
  '45e15ca5-84e5-4ebc-94b0-fcfbd06f79b3'
);

-- 2-G. 군정 · 일당독재 · 전시 비상정부 (행정부/최고지도부 전결)
UPDATE `political_system`
SET
  `war_power_authority` = 'EXECUTIVE_EXCLUSIVE',
  `commander_in_chief_position_id` = COALESCE(`commander_in_chief_position_id`, `head_of_state_position_id`, `head_of_government_position_id`),
  `war_power_notes` = CASE
    WHEN `id` = '50a3238a-5ad7-49ec-8d42-6f8e7823311d' THEN '1933년 수권법 및 1938년 국방군 최고사령부(OKW) 개편 이후 총통(히틀러)이 의회 절차 없이 개전·군 통수를 독점 행사'
    WHEN `id` = '63a3627a-d1db-4dea-8481-04da4427d3eb' THEN '형식상 알베르토 헌장상 국왕 대권이나 실질적 개전 결정과 최고통수 위임은 두체(무솔리니)가 독점 행사'
    ELSE '최고지도부·집행기구가 실질적 개전 결정권과 군 통수권을 직접 행사함'
  END
WHERE `war_power_authority` IS NULL
  AND `government_form` IN ('MILITARY', 'ONE_PARTY', 'PROVISIONAL', 'THEOCRACY');

-- 2-H. 민주 공화정 · 현대 입헌군주정 공통: 행정부 결정 + 의회 동의/승인 (EXECUTIVE_WITH_LEGISLATURE_CONSENT)
-- (러시아 연방 1993 헌법은 상원인 연방평의회 승인, 단원제·대다수 양원제는 하원/합동회의 승인)
UPDATE `political_system`
SET
  `war_power_authority` = 'EXECUTIVE_WITH_LEGISLATURE_CONSENT',
  `war_consent_chamber_id` = CASE
    WHEN `id` = 'dda49c54-2934-4cad-bee6-7d98159877ea' THEN `upper_chamber_id` -- 러시아 연방평의회 해외 무력사용 승인
    ELSE `lower_chamber_id`
  END,
  `commander_in_chief_position_id` = CASE
    WHEN `id` = 'a42550c0-0e48-4f8c-a532-5af0e806f6e8' THEN COALESCE(`head_of_government_position_id`, `head_of_state_position_id`) -- 독일 기본법 제115b조 방위사태 시 연방총리 지휘권 이관
    ELSE COALESCE(`head_of_state_position_id`, `head_of_government_position_id`)
  END,
  `war_power_notes` = CASE
    WHEN `country_id` IS NOT NULL AND `name` LIKE '%공화국%' AND `name` LIKE '%헌법%' AND `id` IN (
      '17037f94-b157-4223-b1fb-164522de0fef',
      '2bd9a84f-e7fc-49e9-88e2-a1aae28d53f2',
      'e71ce06e-ad05-45e6-8d0e-02751d9a1a94',
      'a4691968-f39a-46ae-b434-5f865044cd25',
      'ba95bd1e-a4f8-427b-b390-705d494c70f0',
      'af30db6e-e9ce-468c-ab74-449496678631'
    ) THEN '대통령이 국군을 통수하고 선전포고·강화를 행하되 헌법상 국회의 동의를 요함'
    WHEN `id` = 'abd27a31-8bec-48e6-bfb5-b321c441d4f3' THEN '1791년 헌법: 국왕의 공식 제청에 따라 입법의회가 개전 법령을 의결함'
    WHEN `id` = 'bdb3f3aa-4ec9-4f66-81fe-291f8778479b' THEN '국왕은 세임(Sejm)의 승인 없이 선전포고나 공세 동원을 할 수 없음'
    WHEN `id` = 'a42550c0-0e48-4f8c-a532-5af0e806f6e8' THEN '기본법 제115a·115b조: 연방하원(연방참사원 동의)이 방위사태를 확정하며 선포 시 연방총리가 군 지휘권을 승계'
    ELSE '행정부(대통령·내각)가 개전을 부의·선포하되 헌법상 의회의 사전 동의 또는 사후 승인을 요함'
  END
WHERE `war_power_authority` IS NULL;

-- ============================================================================
-- 3. 기존 19건 war_declaration 정본의 헌정 결정자·내각·의회·최후통첩·종전조약 보강
-- ============================================================================

-- 1792-04-20 프랑스 왕국 ──▶ 오스트리아 대공국 (입법의회 가결)
UPDATE `war_declaration`
SET
  `approved_chamber_id` = (SELECT `id` FROM `chamber` WHERE `id` = '655dd293-5f14-4bdd-8b73-7efe33b9d047'),
  `casus_belli` = COALESCE(`casus_belli`, '반혁명 망명 귀족 비호 중단 요구 및 필니츠 선언에 대한 선제 혁명전쟁 개시'),
  `termination_kind` = 'PEACE_TREATY',
  `ended_era` = 'AD', `ended_year` = 1797, `ended_month` = 10, `ended_day` = 17, `ended_precision` = 'day',
  `ended_date` = '1797-10-17 00:00:00',
  `peace_treaty_id` = (SELECT `id` FROM `treaty` WHERE `id` = 'f93eb4e7-234d-43e6-b51c-588a4e22b712')
WHERE `id` = '7c60964d-eb06-11f1-af95-ea3bb9ad8113';

-- 1793-01~02 프랑스 제1공화국 ──▶ 스페인·네덜란드·영국 (국민공회 의결)
UPDATE `war_declaration`
SET
  `approved_chamber_id` = (SELECT `id` FROM `chamber` WHERE `id` = 'cdc2b49d-fe99-4084-b5cd-fb6a868bfcd8'),
  `casus_belli` = COALESCE(`casus_belli`, '루이 16세 처형 이후 외교 단절 및 저지대 팽창 충돌에 따른 국민공회 개전 결의'),
  `termination_kind` = CASE WHEN `id` = '7c6099e2-eb06-11f1-af95-ea3bb9ad8113' THEN 'PEACE_TREATY' ELSE `termination_kind` END,
  `ended_era` = CASE WHEN `id` = '7c6099e2-eb06-11f1-af95-ea3bb9ad8113' THEN 'AD' ELSE `ended_era` END,
  `ended_year` = CASE WHEN `id` = '7c6099e2-eb06-11f1-af95-ea3bb9ad8113' THEN 1795 ELSE `ended_year` END,
  `ended_month` = CASE WHEN `id` = '7c6099e2-eb06-11f1-af95-ea3bb9ad8113' THEN 7 ELSE `ended_month` END,
  `ended_day` = CASE WHEN `id` = '7c6099e2-eb06-11f1-af95-ea3bb9ad8113' THEN 22 ELSE `ended_day` END,
  `ended_precision` = CASE WHEN `id` = '7c6099e2-eb06-11f1-af95-ea3bb9ad8113' THEN 'day' ELSE `ended_precision` END,
  `ended_date` = CASE WHEN `id` = '7c6099e2-eb06-11f1-af95-ea3bb9ad8113' THEN '1795-07-22 00:00:00' ELSE `ended_date` END,
  `peace_treaty_id` = CASE WHEN `id` = '7c6099e2-eb06-11f1-af95-ea3bb9ad8113' THEN (SELECT `id` FROM `treaty` WHERE `id` = 'c5587f92-c516-4674-b5bb-b9d77a68e09a') ELSE `peace_treaty_id` END
WHERE `id` IN (
  '7c6099e2-eb06-11f1-af95-ea3bb9ad8113',
  '7c609578-eb06-11f1-af95-ea3bb9ad8113',
  '7c6094f4-eb06-11f1-af95-ea3bb9ad8113'
);

-- 1798-09-09 오스만 제국 ──▶ 프랑스 제1공화국
UPDATE `war_declaration`
SET `casus_belli` = COALESCE(`casus_belli`, '나폴레옹 원정군의 오스만령 이집트 무단 침공에 대한 주권 수호 개전')
WHERE `id` = '7c609d08-eb06-11f1-af95-ea3bb9ad8113';

-- 1854-03-27 프랑스 제2제국 ──▶ 러시아 제국 (나폴레옹 3세)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '85469140-d9c7-4fcd-9291-0e2876960427'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = '76ffc9d4-87ac-40bc-8144-968edb78dd1e'),
  `casus_belli` = COALESCE(`casus_belli`, '러시아군의 다뉴브 공국 점령 철수 요구 최후통첩 거부 및 오스만 제국 보전'),
  `termination_kind` = 'PEACE_TREATY',
  `ended_era` = 'AD', `ended_year` = 1856, `ended_month` = 3, `ended_day` = 30, `ended_precision` = 'day',
  `ended_date` = '1856-03-30 00:00:00',
  `termination_note` = '1856년 파리 강화조약 체결'
WHERE `id` = '7c609b45-eb06-11f1-af95-ea3bb9ad8113';

-- 1854-03-28 영국 ──▶ 러시아 제국 (빅토리아 여왕 재위기)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '44c75c7d-2eb0-40d8-9c88-3ec37e3f1f71'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = '6856163e-55cb-4163-a7c6-4589a95e2ed6'),
  `casus_belli` = COALESCE(`casus_belli`, '러시아 제국의 흑해 남하 저지 및 다뉴브 공국 철군 최후통첩 거부'),
  `termination_kind` = 'PEACE_TREATY',
  `ended_era` = 'AD', `ended_year` = 1856, `ended_month` = 3, `ended_day` = 30, `ended_precision` = 'day',
  `ended_date` = '1856-03-30 00:00:00',
  `termination_note` = '1856년 파리 강화조약 체결'
WHERE `id` = '7c609b8c-eb06-11f1-af95-ea3bb9ad8113';

-- 1855-01-26 사르데냐 왕국 ──▶ 러시아 제국 (카보우르 내각)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '647319b2-81ea-4d2a-bcd0-feaf816a54dc'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = '09510844-6c0f-45de-89a7-6d097c45a0e4'),
  `cabinet_id` = (SELECT `id` FROM `cabinet` WHERE `id` = '5c1d73ce-70d7-4102-bff5-90f209a828e0'),
  `casus_belli` = COALESCE(`casus_belli`, '영·프와의 군사동맹 협약 체결을 통한 이탈리아 통일 외교 발언권 확보'),
  `termination_kind` = 'PEACE_TREATY',
  `ended_era` = 'AD', `ended_year` = 1856, `ended_month` = 3, `ended_day` = 30, `ended_precision` = 'day',
  `ended_date` = '1856-03-30 00:00:00'
WHERE `id` = '7c609e88-eb06-11f1-af95-ea3bb9ad8113';

-- 1870-07-19 프랑스 제2제국 ──▶ 프로이센 왕국 (나폴레옹 3세 · 입법원 전비 승인)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '85469140-d9c7-4fcd-9291-0e2876960427'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = '76ffc9d4-87ac-40bc-8144-968edb78dd1e'),
  `approved_chamber_id` = (SELECT `id` FROM `chamber` WHERE `id` = 'd876de80-8f70-4097-be01-cf66b0bdd7ce'),
  `yeas` = 245, `nays` = 10,
  `casus_belli` = COALESCE(`casus_belli`, '스페인 왕위 계승 분쟁 및 엠스 전보 사건으로 촉발된 외교적 모욕'),
  `termination_kind` = 'PEACE_TREATY',
  `ended_era` = 'AD', `ended_year` = 1871, `ended_month` = 5, `ended_day` = 10, `ended_precision` = 'day',
  `ended_date` = '1871-05-10 00:00:00',
  `termination_note` = '1871년 프랑크푸르트 강화조약 체결'
WHERE `id` = '7c609e0b-eb06-11f1-af95-ea3bb9ad8113';

-- 1914-07-28 오스트리아-헝가리 ──▶ 세르비아 왕국 (7월 23일 최후통첩 연결 + 7월 25일 국교 단절일 기록)
UPDATE `war_declaration`
SET
  `ultimatum_event_id` = (SELECT `id` FROM `event` WHERE `id` = 'a0e7d32f-ac47-460d-abac-6a34155e669f'),
  `severance_era` = 'AD', `severance_year` = 1914, `severance_month` = 7, `severance_day` = 25,
  `casus_belli` = COALESCE(`casus_belli`, '사라예보 황태자 암살 배후 책임 추궁 및 7월 23일 최후통첩 제6항(오스트리아 관리의 세르비아 내 수사 참여) 거부'),
  `termination_kind` = 'STATE_EXTINCTION',
  `ended_era` = 'AD', `ended_year` = 1918, `ended_month` = 11, `ended_day` = 3, `ended_precision` = 'day',
  `ended_date` = '1918-11-03 00:00:00'
WHERE `id` = '7c609f1f-eb06-11f1-af95-ea3bb9ad8113';

-- 1914-08-04 영국 ──▶ 독일 제국 (애스퀴스 총리 · 벨기에 최후통첩 연결 · 베르사유 조약 종결)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '690741f6-fa19-406a-b262-a2743d84179f'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = '7bc1ef8f-6b44-4607-8b6a-9ca9bde1a1b0'),
  `ultimatum_event_id` = (SELECT `id` FROM `event` WHERE `id` = '88aca89f-28ea-4210-a00c-6a5429cbd54a'),
  `casus_belli` = COALESCE(`casus_belli`, '독일군의 벨기에 영세중립 침범(1839 런던 조약 위반) 및 철군 최후통첩 시한(런던 시간 밤 11시) 만료'),
  `termination_kind` = 'PEACE_TREATY',
  `ended_era` = 'AD', `ended_year` = 1919, `ended_month` = 6, `ended_day` = 28, `ended_precision` = 'day',
  `ended_date` = '1919-06-28 00:00:00',
  `peace_treaty_id` = (SELECT `id` FROM `treaty` WHERE `id` = 'efd63ca2-edc3-49c9-b566-c97b1500ad70')
WHERE `id` = '7c609893-eb06-11f1-af95-ea3bb9ad8113';

-- 1914-08-06 오스트리아-헝가리 ──▶ 러시아 제국
UPDATE `war_declaration`
SET
  `casus_belli` = COALESCE(`casus_belli`, '러시아 제국의 대오스트리아·독일 총동원령 강행 및 독오 동맹 의무 이행'),
  `termination_kind` = 'PEACE_TREATY',
  `ended_era` = 'AD', `ended_year` = 1918, `ended_month` = 3, `ended_day` = 3, `ended_precision` = 'day',
  `ended_date` = '1918-03-03 00:00:00',
  `termination_note` = '1918년 브레스트-리토프스크 강화조약 체결'
WHERE `id` = '7c609d8f-eb06-11f1-af95-ea3bb9ad8113';

-- 1915-10-14 불가리아 왕국 ──▶ 세르비아 왕국 & 1916-09-01 불가리아 왕국 ──▶ 루마니아 왕국 (페르디난드 1세 · 라도슬라보프 내각)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '46ffad93-3574-4107-89e5-34831120f212'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = 'a1f71af8-484f-4c34-b722-88a3573fe5eb'),
  `cabinet_id` = (SELECT `id` FROM `cabinet` WHERE `id` = '5d757b25-8ebf-4c49-b972-bbd572333e22'),
  `casus_belli` = CASE
    WHEN `id` = '7c609947-eb06-11f1-af95-ea3bb9ad8113' THEN '제2차 발칸전쟁 실지(마케도니아) 회복 및 동맹국 비밀 군사협약 이행'
    ELSE '루마니아의 연합국 측 참전에 대응한 남도브루자 수복 및 동맹국 공동작전'
  END,
  `termination_kind` = CASE
    WHEN `id` = '7c609bf7-eb06-11f1-af95-ea3bb9ad8113' THEN 'PEACE_TREATY'
    ELSE 'ARMISTICE'
  END,
  `ended_era` = 'AD',
  `ended_year` = 1918,
  `ended_month` = CASE WHEN `id` = '7c609bf7-eb06-11f1-af95-ea3bb9ad8113' THEN 5 ELSE 9 END,
  `ended_day` = CASE WHEN `id` = '7c609bf7-eb06-11f1-af95-ea3bb9ad8113' THEN 7 ELSE 29 END,
  `ended_precision` = 'day',
  `ended_date` = CASE WHEN `id` = '7c609bf7-eb06-11f1-af95-ea3bb9ad8113' THEN '1918-05-07 00:00:00' ELSE '1918-09-29 00:00:00' END,
  `peace_treaty_id` = CASE
    WHEN `id` = '7c609bf7-eb06-11f1-af95-ea3bb9ad8113' THEN (SELECT `id` FROM `treaty` WHERE `id` = '25a8dcbf-082c-43c7-86c0-4a9964eac6a7')
    ELSE NULL
  END,
  `termination_note` = CASE
    WHEN `id` = '7c609947-eb06-11f1-af95-ea3bb9ad8113' THEN '1918년 9월 29일 살로니카 휴전협정 및 1919년 뇌이 조약'
    ELSE NULL
  END
WHERE `id` IN ('7c609947-eb06-11f1-af95-ea3bb9ad8113', '7c609bf7-eb06-11f1-af95-ea3bb9ad8113');

-- 1918-11-10 루마니아 왕국 ──▶ 독일 제국 (코안더 내각 · 베르사유 조약 종결)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '5f08ae08-227f-4c74-99b2-2a71080808d8'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = 'f195885d-1229-4388-9b9c-90d608e6b923'),
  `cabinet_id` = (SELECT `id` FROM `cabinet` WHERE `id` = '7ebff265-76e4-419a-9111-b4c7b901d8c6'),
  `casus_belli` = COALESCE(`casus_belli`, '부쿠레슈티 강압 강화 무효화 및 마켄젠 독일 점령군 24시간 내 철수 최후통첩 시한 만료'),
  `termination_kind` = 'PEACE_TREATY',
  `ended_era` = 'AD', `ended_year` = 1919, `ended_month` = 6, `ended_day` = 28, `ended_precision` = 'day',
  `ended_date` = '1919-06-28 00:00:00',
  `peace_treaty_id` = (SELECT `id` FROM `treaty` WHERE `id` = 'efd63ca2-edc3-49c9-b566-c97b1500ad70')
WHERE `id` = '7c609c74-eb06-11f1-af95-ea3bb9ad8113';

-- 1941-06-22 나치 독일 ──▶ 소련 (아돌프 히틀러 · 기습 개전 및 슐렌부르크 각서 전달)
UPDATE `war_declaration`
SET
  `kind` = 'UNDECLARED_HOSTILITIES',
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '7dc29948-5079-4d97-8294-3c3d0db67d0c'),
  `casus_belli` = COALESCE(`casus_belli`, '독소 불가침 조약 일방 파기 및 소련군의 서부 국경 병력 집중에 대한 ‘예방전쟁’ 명분(바르바로사 작전 개시 후 개전 각서 사후 통보)'),
  `termination_kind` = 'SURRENDER',
  `ended_era` = 'AD', `ended_year` = 1945, `ended_month` = 5, `ended_day` = 8, `ended_precision` = 'day',
  `ended_date` = '1945-05-08 00:00:00',
  `termination_note` = '1945년 5월 8일 독일 국방군 무조건 항복'
WHERE `id` = '7c6097be-eb06-11f1-af95-ea3bb9ad8113';

-- 1941-06-22 이탈리아 왕국 ──▶ 소련 (무솔리니 내각)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = '1b013d92-1478-4c3b-86b7-9c169e424e56'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = '682e054a-e6e5-4e53-b5f6-0cc46d740c1d'),
  `cabinet_id` = (SELECT `id` FROM `cabinet` WHERE `id` = 'ee967f77-28a1-42cc-909a-2c132726f644'),
  `casus_belli` = COALESCE(`casus_belli`, '독일과의 강철조약·삼국동맹 연대 및 반공산주의 십자군 참전'),
  `termination_kind` = 'ARMISTICE',
  `ended_era` = 'AD', `ended_year` = 1943, `ended_month` = 9, `ended_day` = 3, `ended_precision` = 'day',
  `ended_date` = '1943-09-03 00:00:00',
  `termination_note` = '1943년 9월 카시빌레 휴전협정 및 1947년 파리 강화조약'
WHERE `id` = '7c609aa2-eb06-11f1-af95-ea3bb9ad8113';

-- 1941-06-22 루마니아 왕국 ──▶ 소련 (이온 안토네스쿠 내각)
UPDATE `war_declaration`
SET
  `decided_by_person_id` = (SELECT `id` FROM `person` WHERE `id` = 'a4c81e20-5b39-4f72-8d14-6e92c3015a01'),
  `decided_by_tenure_id` = (SELECT `id` FROM `government_position_tenure` WHERE `id` = 'c7d92f10-3a48-4e61-9b25-7f81d4026b04'),
  `cabinet_id` = (SELECT `id` FROM `cabinet` WHERE `id` = 'aa4d61c3-dcd6-11f1-889f-ee0bb136e30a'),
  `casus_belli` = COALESCE(`casus_belli`, '1940년 소련에 할양된 베사라비아·북부코비나 영토 수복'),
  `termination_kind` = 'ARMISTICE',
  `ended_era` = 'AD', `ended_year` = 1944, `ended_month` = 8, `ended_day` = 23, `ended_precision` = 'day',
  `ended_date` = '1944-08-23 00:00:00',
  `termination_note` = '1944년 8월 미하이 1세 친정 쿠데타·대소 정전 및 9월 모스크바 휴전협정'
WHERE `id` = '7c609fc9-eb06-11f1-af95-ea3bb9ad8113';

-- 1941-06-27 헝가리 왕국 ──▶ 소련
UPDATE `war_declaration`
SET
  `casus_belli` = COALESCE(`casus_belli`, '카사(코시체) 공습 사건에 대한 소련군 보복 주장'),
  `termination_kind` = 'ARMISTICE',
  `ended_era` = 'AD', `ended_year` = 1945, `ended_month` = 1, `ended_day` = 20, `ended_precision` = 'day',
  `ended_date` = '1945-01-20 00:00:00',
  `termination_note` = '1945년 1월 모스크바 휴전협정 및 1947년 파리 강화조약'
WHERE `id` = '7c60972e-eb06-11f1-af95-ea3bb9ad8113';

-- ============================================================================
-- 4. 누락되어 있던 제1차 세계대전 핵심 정본 개전·선전포고 5건 추가 백필
--    (기존 최후통첩·개전 사건 및 강화조약 정본과 연결, 중복 방지 idempotent INSERT)
-- ============================================================================

-- 4-1. 1914-08-01 독일 제국 ──▶ 러시아 제국 (7월 31일 대러시아 최후통첩 만료 개전)
INSERT INTO `war_declaration` (
  `id`, `declaring_historical_country_id`, `target_historical_country_id`,
  `kind`, `casus_belli`,
  `declared_date`, `declared_era`, `declared_year`, `declared_month`, `declared_day`, `declared_precision`,
  `approved_chamber_id`, `war_event_id`, `ultimatum_event_id`,
  `termination_kind`, `ended_date`, `ended_era`, `ended_year`, `ended_month`, `ended_day`, `ended_precision`, `termination_note`,
  `created_at`, `updated_at`
)
SELECT
  '8b101001-eb06-11f1-af95-ea3bb9ad8113',
  '06065d9a-4bdb-4066-a8db-e8be8f029e1f', -- 독일 제국
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a', -- 러시아 제국
  'ULTIMATUM_EXPIRY',
  '러시아 제국의 총동원령 12시간 내 중지 요구 최후통첩 시한 만료',
  '1914-08-01 00:00:00', 'AD', 1914, 8, 1, 'day',
  (SELECT `id` FROM `chamber` WHERE `id` = '8b759083-d0f4-4835-91e6-462d9622826e'), -- 연방참사원
  (SELECT `id` FROM `event` WHERE `id` = 'f5d0b6f5-0673-49c6-9932-8d24cd912f37'),
  (SELECT `id` FROM `event` WHERE `id` = '442b1c64-82b5-4568-a579-f3aaf6a97801'),
  'PEACE_TREATY', '1918-03-03 00:00:00', 'AD', 1918, 3, 3, 'day', '1918년 브레스트-리토프스크 강화조약 체결',
  NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `war_declaration` WHERE `id` = '8b101001-eb06-11f1-af95-ea3bb9ad8113')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '06065d9a-4bdb-4066-a8db-e8be8f029e1f')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

-- 4-2. 1914-08-03 독일 제국 ──▶ 프랑스 제3공화국 (베르사유 조약 종결)
INSERT INTO `war_declaration` (
  `id`, `declaring_historical_country_id`, `target_historical_country_id`,
  `kind`, `casus_belli`,
  `declared_date`, `declared_era`, `declared_year`, `declared_month`, `declared_day`, `declared_precision`,
  `approved_chamber_id`, `war_event_id`,
  `termination_kind`, `ended_date`, `ended_era`, `ended_year`, `ended_month`, `ended_day`, `ended_precision`, `peace_treaty_id`,
  `created_at`, `updated_at`
)
SELECT
  '8b101002-eb06-11f1-af95-ea3bb9ad8113',
  '06065d9a-4bdb-4066-a8db-e8be8f029e1f', -- 독일 제국
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', -- 프랑스 제3공화국
  'FORMAL_DECLARATION',
  '러불동맹에 따른 프랑스의 중립 거부 및 슐리펜 계획 개시(뉘른베르크 허위 공습 주장 포함)',
  '1914-08-03 00:00:00', 'AD', 1914, 8, 3, 'day',
  (SELECT `id` FROM `chamber` WHERE `id` = '8b759083-d0f4-4835-91e6-462d9622826e'),
  (SELECT `id` FROM `event` WHERE `id` = 'f5d0b6f5-0673-49c6-9932-8d24cd912f37'),
  'PEACE_TREATY', '1919-06-28 00:00:00', 'AD', 1919, 6, 28, 'day',
  (SELECT `id` FROM `treaty` WHERE `id` = 'efd63ca2-edc3-49c9-b566-c97b1500ad70'),
  NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `war_declaration` WHERE `id` = '8b101002-eb06-11f1-af95-ea3bb9ad8113')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '06065d9a-4bdb-4066-a8db-e8be8f029e1f')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

-- 4-3. 1914-08-04 독일 제국 ──▶ 벨기에 왕국 (8월 2일 영토 통과 최후통첩 거부 후 침공·개전)
INSERT INTO `war_declaration` (
  `id`, `declaring_historical_country_id`, `target_historical_country_id`,
  `kind`, `casus_belli`,
  `declared_date`, `declared_era`, `declared_year`, `declared_month`, `declared_day`, `declared_precision`,
  `war_event_id`, `ultimatum_event_id`,
  `termination_kind`, `ended_date`, `ended_era`, `ended_year`, `ended_month`, `ended_day`, `ended_precision`, `peace_treaty_id`,
  `created_at`, `updated_at`
)
SELECT
  '8b101003-eb06-11f1-af95-ea3bb9ad8113',
  '06065d9a-4bdb-4066-a8db-e8be8f029e1f', -- 독일 제국
  '1f2db67a-3cfd-4a8f-8d6b-40db1eae500b', -- 벨기에 왕국
  'ULTIMATUM_EXPIRY',
  '독일군 영토 통과 요구 최후통첩을 벨기에 정부가 거부함에 따라 무력 통과 개시',
  '1914-08-04 00:00:00', 'AD', 1914, 8, 4, 'day',
  (SELECT `id` FROM `event` WHERE `id` = 'f5d0b6f5-0673-49c6-9932-8d24cd912f37'),
  (SELECT `id` FROM `event` WHERE `id` = '88aca89f-28ea-4210-a00c-6a5429cbd54a'),
  'PEACE_TREATY', '1919-06-28 00:00:00', 'AD', 1919, 6, 28, 'day',
  (SELECT `id` FROM `treaty` WHERE `id` = 'efd63ca2-edc3-49c9-b566-c97b1500ad70'),
  NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `war_declaration` WHERE `id` = '8b101003-eb06-11f1-af95-ea3bb9ad8113')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '06065d9a-4bdb-4066-a8db-e8be8f029e1f')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '1f2db67a-3cfd-4a8f-8d6b-40db1eae500b');

-- 4-4. 1915-05-23 이탈리아 왕국 ──▶ 오스트리아-헝가리 제국 (런던 비밀조약 이행 개전 · 빌라 주스티 휴전 종결)
INSERT INTO `war_declaration` (
  `id`, `declaring_historical_country_id`, `target_historical_country_id`,
  `kind`, `casus_belli`,
  `declared_date`, `declared_era`, `declared_year`, `declared_month`, `declared_day`, `declared_precision`,
  `decided_by_person_id`, `approved_chamber_id`, `yeas`, `nays`,
  `war_event_id`, `narrative_event_id`,
  `termination_kind`, `ended_date`, `ended_era`, `ended_year`, `ended_month`, `ended_day`, `ended_precision`, `peace_treaty_id`,
  `created_at`, `updated_at`
)
SELECT
  '8b101004-eb06-11f1-af95-ea3bb9ad8113',
  '0b822cbd-25bb-4f37-87a1-43d408b0db7d', -- 이탈리아 왕국
  '694515a9-cd57-43fe-b1a5-6b89ec37b09b', -- 오스트리아-헝가리 제국
  'FORMAL_DECLARATION',
  '삼국동맹 제7조 보상 불이행 주장 및 런던 비밀조약에 따른 미수복 이탈리아(트렌티노·트리에스테) 회복',
  '1915-05-23 00:00:00', 'AD', 1915, 5, 23, 'day',
  (SELECT `id` FROM `person` WHERE `id` = 'a6a8b627-63f6-46c7-9358-80d49c57ee2a'), -- 안토니오 살란드라
  (SELECT `id` FROM `chamber` WHERE `id` = '65c95cfb-d969-41e9-be70-bfa44e84e63f'), -- 이탈리아 대의원 전시 전권 승인(407:74)
  407, 74,
  (SELECT `id` FROM `event` WHERE `id` = 'f5d0b6f5-0673-49c6-9932-8d24cd912f37'),
  (SELECT `id` FROM `event` WHERE `id` = '5e90ea1d-0db3-414a-b028-71f21c1d4d29'),
  'ARMISTICE', '1918-11-03 00:00:00', 'AD', 1918, 11, 3, 'day',
  (SELECT `id` FROM `treaty` WHERE `id` = 'f7bf94ba-4425-47de-a141-5744b4dd9411'),
  NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `war_declaration` WHERE `id` = '8b101004-eb06-11f1-af95-ea3bb9ad8113')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '0b822cbd-25bb-4f37-87a1-43d408b0db7d')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

-- 4-5. 1916-08-27 루마니아 왕국 ──▶ 오스트리아-헝가리 제국 (연합국 측 참전 · 1918 부쿠레슈티 강화조약 종결)
INSERT INTO `war_declaration` (
  `id`, `declaring_historical_country_id`, `target_historical_country_id`,
  `kind`, `casus_belli`,
  `declared_date`, `declared_era`, `declared_year`, `declared_month`, `declared_day`, `declared_precision`,
  `decided_by_person_id`, `decided_by_tenure_id`, `cabinet_id`,
  `war_event_id`,
  `termination_kind`, `ended_date`, `ended_era`, `ended_year`, `ended_month`, `ended_day`, `ended_precision`, `peace_treaty_id`,
  `created_at`, `updated_at`
)
SELECT
  '8b101005-eb06-11f1-af95-ea3bb9ad8113',
  'deb3cfce-9d92-487f-9bc7-89e636815877', -- 루마니아 왕국
  '694515a9-cd57-43fe-b1a5-6b89ec37b09b', -- 오스트리아-헝가리 제국
  'ALLIANCE_ENTRY',
  '1916년 부쿠레슈티 협정(연합국 동맹 조약)에 따른 트란실바니아·부코비나 루마니아인 거주지 통합',
  '1916-08-27 00:00:00', 'AD', 1916, 8, 27, 'day',
  (SELECT `id` FROM `person` WHERE `id` = 'a6da0c3d-a985-43ea-a663-c2872c1814d7'), -- 이온 브러티아누
  (SELECT `id` FROM `government_position_tenure` WHERE `id` = 'fa9b393d-6d81-44a5-bc6d-c3010ee5b047'),
  (SELECT `id` FROM `cabinet` WHERE `id` = '7a672d86-bf7b-4b8c-8c9f-8d93bf207a63'),
  (SELECT `id` FROM `event` WHERE `id` = 'f5d0b6f5-0673-49c6-9932-8d24cd912f37'),
  'PEACE_TREATY', '1918-05-07 00:00:00', 'AD', 1918, 5, 7, 'day',
  (SELECT `id` FROM `treaty` WHERE `id` = '25a8dcbf-082c-43c7-86c0-4a9964eac6a7'),
  NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `war_declaration` WHERE `id` = '8b101005-eb06-11f1-af95-ea3bb9ad8113')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'deb3cfce-9d92-487f-9bc7-89e636815877')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');
