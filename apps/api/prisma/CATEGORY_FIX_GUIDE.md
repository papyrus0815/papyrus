# 카테고리 중복 문제 해결 가이드

## 문제
- DB에 동일한 이름의 카테고리가 여러 개 존재
- 이전 seed 스크립트가 UUID()를 사용하여 매번 새로운 레코드 생성

## 즉시 해결 (프론트엔드)
✅ **완료**: `event-create.page.tsx`에서 중복 제거 로직 추가
- name 기준으로 중복 제거
- 가장 오래된 카테고리만 유지

## DB 완전 정리 (선택사항)

### 방법 1: Prisma Studio 사용
```bash
cd apps/api
npx prisma studio
```
1. `event_category` 테이블 열기
2. 중복 레코드 수동 삭제
3. 필요시 seed-event-categories.sql 재실행

### 방법 2: MySQL Workbench/CLI
```sql
-- 1. 중복 확인
SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
FROM event_category 
GROUP BY name 
HAVING COUNT(*) > 1;

-- 2. 중복 제거 (오래된 것만 유지)
DELETE c1 FROM event_category c1
INNER JOIN event_category c2 
WHERE 
    c1.name = c2.name 
    AND c1.created_at > c2.created_at;

-- 3. 확인
SELECT id, name, created_at FROM event_category ORDER BY name;
```

### 방법 3: 완전 초기화 (events가 없을 때만)
```sql
-- 모든 카테고리 삭제
DELETE FROM event_category;

-- seed-event-categories.sql 재실행
-- (고정 ID 사용으로 중복 방지)
```

## 변경 사항
- `seed-event-categories.sql`: UUID() → 고정 ID 사용 (cat-military-001 등)
- `ON DUPLICATE KEY UPDATE` 추가로 재실행 시 업데이트만 수행

## 결과
✅ 프론트엔드에서 중복 필터링 적용됨
✅ 향후 시드 재실행 시 중복 생성 방지

