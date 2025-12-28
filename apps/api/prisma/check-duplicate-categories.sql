-- Step 1: 중복 카테고리 확인
SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
FROM event_category 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Step 2: 중복 제거 (MySQL)
-- 아래 명령을 MySQL Workbench나 Prisma Studio에서 실행하세요
/*
DELETE c1 FROM event_category c1
INNER JOIN event_category c2 
WHERE 
    c1.name = c2.name 
    AND c1.created_at > c2.created_at;
*/

-- Step 3: 또는 모두 삭제하고 새로 시드 (events 테이블이 비어있을 때만 가능)
-- DELETE FROM event_category;
-- 그 후 seed-event-categories.sql 실행

