-- 동양식 즉위 서수(n대) 로 재구조화
-- 1) 기존 3-컬럼 unique 제약 제거
-- 2) regnalNumber 를 country/historicalCountry 별 start_date 순 ordinal 로 백필
-- 3) 새 2-컬럼 unique 제약 추가
--
-- 비고: sovereign_reign 의 country_id / historical_country_id FK 는
--       단일 컬럼 인덱스 idx_sovereign_reign_countryId / _histCountryId 로 받쳐지고 있어
--       3-컬럼 unique 인덱스 제거 시에도 FK 무효화 없음 → FK drop/re-add 불필요.

-- DropIndex
DROP INDEX `sovereign_reign_country_id_regnal_name_regnal_number_key` ON `sovereign_reign`;

-- DropIndex
DROP INDEX `sovereign_reign_historical_country_id_regnal_name_regnal_num_key` ON `sovereign_reign`;

-- Backfill: modern country 별 start_date 순 ordinal (현 데이터엔 0건이지만 향후 대비)
UPDATE `sovereign_reign` sr
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY country_id ORDER BY start_date, id) AS rn
  FROM `sovereign_reign`
  WHERE country_id IS NOT NULL
) ranked ON sr.id = ranked.id
SET sr.regnal_number = ranked.rn;

-- Backfill: historical country 별 start_date 순 ordinal
UPDATE `sovereign_reign` sr
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY historical_country_id ORDER BY start_date, id) AS rn
  FROM `sovereign_reign`
  WHERE historical_country_id IS NOT NULL
) ranked ON sr.id = ranked.id
SET sr.regnal_number = ranked.rn;

-- CreateIndex
CREATE UNIQUE INDEX `sovereign_reign_country_id_regnal_number_key` ON `sovereign_reign`(`country_id`, `regnal_number`);

-- CreateIndex
CREATE UNIQUE INDEX `sovereign_reign_historical_country_id_regnal_number_key` ON `sovereign_reign`(`historical_country_id`, `regnal_number`);
