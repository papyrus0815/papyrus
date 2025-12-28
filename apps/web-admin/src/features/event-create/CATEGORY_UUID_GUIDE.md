# 카테고리 UUID 설정 가이드

## DB 카테고리 등록 및 UUID 확인

### 1단계: DB에 카테고리 등록

```sql
-- event_category 테이블에 카테고리 INSERT
INSERT INTO event_category (id, name, description) VALUES
  (UUID(), '군사', '군사/전쟁 관련 사건'),
  (UUID(), '외교', '외교 협상 및 조약'),
  (UUID(), '회담', '국제 회담 및 회의'),
  (UUID(), '정치', '정치적 사건'),
  (UUID(), '경제', '경제적 사건'),
  (UUID(), '사회', '사회적 사건'),
  (UUID(), '문화', '문화적 사건'),
  (UUID(), '과학기술', '과학기술 발전'),
  (UUID(), '종교', '종교적 사건');
```

### 2단계: 생성된 UUID 확인

```sql
SELECT id, name FROM event_category ORDER BY name;
```

결과 예시:

```
abc-123-def  |  군사
def-456-ghi  |  외교
ghi-789-jkl  |  회담
...
```

### 3단계: 클라이언트 코드 업데이트

`web-admin/src/features/event-create/lib/category-utils.ts`:

```typescript
export const WELL_KNOWN_CATEGORY_IDS = {
  // ✅ 실제 UUID로 변경
  MILITARY: 'abc-123-def', // DB에서 확인한 "군사" 카테고리 ID
  DIPLOMATIC: 'def-456-ghi', // DB에서 확인한 "외교" 카테고리 ID
  CONFERENCE: 'ghi-789-jkl', // DB에서 확인한 "회담" 카테고리 ID
  POLITICAL: 'jkl-012-mno', // ...
  ECONOMIC: 'mno-345-pqr',
  SOCIAL: 'pqr-678-stu',
  CULTURAL: 'stu-901-vwx',
  TECHNOLOGICAL: 'vwx-234-yza',
  RELIGIOUS: 'yza-567-bcd',
} as const
```

## 이점

### 1. DB 이름 변경 가능 ✅

```sql
-- "군사" → "전쟁"으로 이름 변경해도
UPDATE event_category SET name = '전쟁' WHERE id = 'abc-123-def';

-- 클라이언트 코드는 수정 불필요!
if (categoryId === WELL_KNOWN_CATEGORY_IDS.MILITARY) { ... }
```

### 2. 다국어 지원 가능 ✅

```sql
-- 언어별로 name만 변경
-- 한국어: "군사"
-- 영어: "Military"
-- 일본어: "軍事"

-- ID는 동일하므로 코드 수정 불필요
```

### 3. 타입 안전 ✅

```typescript
// UUID 상수 사용
const categoryId = WELL_KNOWN_CATEGORY_IDS.MILITARY
// 오타 불가능, IDE 자동완성
```

## 사용 방법

### DB 카테고리 확인 스크립트

```sql
-- 카테고리 목록과 ID 확인
SELECT
  id,
  name,
  description,
  created_at
FROM event_category
ORDER BY name;
```

### 코드 업데이트 순서

1. ✅ DB에서 카테고리 INSERT
2. ✅ 생성된 UUID 확인 (SELECT 쿼리)
3. ✅ `WELL_KNOWN_CATEGORY_IDS` 업데이트
4. ✅ 테스트

## 주의사항

⚠️ **UUID는 절대 변경하지 마세요**

- DB에서 카테고리 삭제 후 재생성 → UUID 바뀜 → 코드 깨짐
- 카테고리는 **soft delete** 권장 (deleted_at 필드 사용)

⚠️ **초기 데이터는 migration으로 관리**

```prisma
-- migration/seed.ts
const categories = [
{ id: 'abc-123-def', name: '군사' },
{ id: 'def-456-ghi', name: '외교' },
// ...
]
```

## 다음 단계

1. DB에 카테고리 등록
2. UUID 확인
3. 이 파일에 주석으로 알려주세요:

```typescript
// 예시:
// 군사: abc-123-def-456-ghi-789
// 외교: def-456-ghi-789-jkl-012
```

그러면 `WELL_KNOWN_CATEGORY_IDS`를 업데이트하겠습니다!
