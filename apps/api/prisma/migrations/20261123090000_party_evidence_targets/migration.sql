-- 정당 수치·출처(B5): 측정값 대상에 정당, 인용 대상에 정당 본체와 곁가지 9종(이름·법적 지위·이념·스펙트럼 기간·
-- 산하 조직·소속·표지·표현·당사). 수치는 근거 도메인(Observation)에, 출처는 Citation에 — 정당 전용 표를 만들지 않는다.
-- 설계: docs/political-party-model-review.md §4.9·4.11

-- AlterTable
ALTER TABLE `citation` MODIFY `target_type` ENUM('OBSERVATION', 'EVENT', 'EVENT_SECTION', 'EVENT_SIDE', 'SIDE_DEPLOYED_UNIT', 'EVENT_PARTICIPANT', 'PERSON_EVENT', 'POLITICAL_PARTY', 'PARTY_ALIAS', 'PARTY_LEGAL_STATUS', 'PARTY_IDEOLOGY', 'PARTY_POSITION_PERIOD', 'PARTY_ORGANIZATION', 'PARTY_MEMBERSHIP', 'PARTY_SYMBOL', 'PARTY_EXPRESSION', 'PARTY_HEADQUARTERS') NOT NULL;

-- AlterTable
ALTER TABLE `observation` MODIFY `subject_type` ENUM('EVENT', 'EVENT_SIDE', 'EVENT_PARTICIPANT', 'EVENT_SIDE_UNIT', 'COUNTRY', 'HISTORICAL_COUNTRY', 'ORGANIZATION', 'PERSON', 'POLITICAL_PARTY') NOT NULL;
