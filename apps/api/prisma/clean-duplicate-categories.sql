-- 중복된 카테고리 제거 (가장 오래된 것만 남기고 삭제)
DELETE c1 FROM event_category c1
INNER JOIN event_category c2 
WHERE 
    c1.name = c2.name 
    AND c1.created_at > c2.created_at;

-- 남은 카테고리 확인
SELECT id, name, description, created_at FROM event_category ORDER BY name;

