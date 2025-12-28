-- Step 1: 현재 모든 카테고리 확인
SELECT id, name, created_at, updated_at 
FROM event_category 
ORDER BY name, created_at;

-- Step 2: 카테고리별 개수 확인 (중복 찾기)
SELECT name, COUNT(*) as count, GROUP_CONCAT(id ORDER BY created_at SEPARATOR ', ') as all_ids
FROM event_category 
GROUP BY name
ORDER BY name;

-- Step 3: 정규 카테고리가 아닌 것 찾기
SELECT * FROM event_category 
WHERE name NOT IN ('정치', '경제', '군사', '사회', '문화', '과학기술', '외교', '종교', '기타')
ORDER BY name;

