-- 국가↔역사국가 리뷰 F26·F40 데이터 정리 (docs/country-historical-link-review.md)
--
-- ⚠️ 실행 전 반드시 백업하고, 아래 3번 항목은 "다중 왕관 군주의 주 국적을 무엇으로 볼 것인가"라는
--    도메인 판단이 필요하므로 검토 후 수동 실행할 것. 1·2번만 무조건 안전하다.
--
-- 배경: PersonCountryAffiliation의 CITIZENSHIP priority=0 슬롯은 '주 국적 미러' 한 칸이어야 하는데
--       유일성 제약도, 쓰기 경로의 upsert도 없어 21명에게 중복 슬롯이 쌓였다.
--       (쓰기 경로 자체는 person.prisma.repository.ts에서 upsert로 수정 완료 — 재발 방지)

-- ─────────────────────────────────────────────────────────────
-- 0. 현황 확인 (읽기 전용 — 먼저 이것부터 실행해 대상 확인)
-- ─────────────────────────────────────────────────────────────
SELECT p.id, p.sur_name, p.name, COUNT(*) AS slots
FROM person_country_affiliation a
JOIN person p ON p.id = a.person_id
WHERE a.affiliation_type = 'CITIZENSHIP' AND a.priority = 0
GROUP BY p.id, p.sur_name, p.name
HAVING COUNT(*) > 1
ORDER BY slots DESC, p.sur_name;

-- ─────────────────────────────────────────────────────────────
-- 1. 순수 중복 행 제거 (안전) — 에른스트: 전 컬럼이 동일한 2행
--    같은 (person, country, historical_country) 조합이 2번 들어간 것이므로 하나만 남긴다.
-- ─────────────────────────────────────────────────────────────
DELETE dup FROM person_country_affiliation dup
JOIN person_country_affiliation keep
  ON  keep.person_id = dup.person_id
  AND keep.affiliation_type = dup.affiliation_type
  AND keep.priority = dup.priority
  AND (keep.country_id <=> dup.country_id)
  AND (keep.historical_country_id <=> dup.historical_country_id)
  AND keep.id < dup.id
WHERE dup.affiliation_type = 'CITIZENSHIP' AND dup.priority = 0;

-- ─────────────────────────────────────────────────────────────
-- 2. 막시밀리안(합스부르크) 브리지 비정합 정정 (F40)
--    country_id=오스트리아 / historical_country_id=보헤미아 왕국인데 둘을 잇는 브리지가 없다.
--    응답의 effective 국적은 역사 FK 우선이라 배지는 보헤미아(→체코)로 가는데,
--    저장된 현대 FK는 오스트리아라 현대 축 필터·카운트에서만 다른 나라를 가리킨다.
--    dual-write 규약상 현대 FK는 역사 FK의 '브리지 그림자'여야 하므로, 브리지가 없으면 NULL이 정답.
-- ─────────────────────────────────────────────────────────────
UPDATE person
SET country_id = NULL
WHERE id = '7de8352f-4254-4aa6-8b07-60294a0b7496'
  AND historical_country_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM historical_country_modern_country b
    WHERE b.historical_country_id = person.historical_country_id
      AND b.modern_country_id = person.country_id
  );

-- ─────────────────────────────────────────────────────────────
-- 3. 다중 왕관 군주의 슬롯 서열화 (⚠️ 판단 필요 — 자동 실행 금지)
--    합스부르크·호엔촐레른처럼 여러 왕관을 쓴 군주는 priority=0 슬롯이 여러 개다.
--    "주 국적 한 칸 + 나머지는 부차 소속"으로 정리하려면 어느 왕관이 주(主)인지 정해야 하고,
--    그 판단은 Person.historical_country_id(FK, 정본)가 이미 갖고 있다.
--
--    아래는 'FK와 일치하는 슬롯만 priority=0으로 남기고 나머지는 1로 강등'하는 안이다.
--    실행 전 반드시 SELECT로 영향 행을 확인할 것.

-- 3-a. 영향 행 미리보기 (읽기 전용)
SELECT p.id, p.sur_name, p.name,
       h.name AS slot_country,
       CASE WHEN a.historical_country_id <=> p.historical_country_id
                 AND a.country_id <=> p.country_id
            THEN '유지(주 국적 FK와 일치)' ELSE '강등 후보' END AS action
FROM person_country_affiliation a
JOIN person p ON p.id = a.person_id
LEFT JOIN historical_country h ON h.id = a.historical_country_id
WHERE a.affiliation_type = 'CITIZENSHIP' AND a.priority = 0
  AND p.id IN (
    SELECT person_id FROM person_country_affiliation
    WHERE affiliation_type = 'CITIZENSHIP' AND priority = 0
    GROUP BY person_id HAVING COUNT(*) > 1
  )
ORDER BY p.sur_name, p.name, action;

-- 3-b. 실제 강등 (위 미리보기 확인 후에만 주석 해제)
-- UPDATE person_country_affiliation a
-- JOIN person p ON p.id = a.person_id
-- SET a.priority = 1
-- WHERE a.affiliation_type = 'CITIZENSHIP' AND a.priority = 0
--   AND NOT (a.historical_country_id <=> p.historical_country_id
--            AND a.country_id <=> p.country_id)
--   AND p.id IN (
--     SELECT person_id FROM (
--       SELECT person_id FROM person_country_affiliation
--       WHERE affiliation_type = 'CITIZENSHIP' AND priority = 0
--       GROUP BY person_id HAVING COUNT(*) > 1
--     ) t
--   );
