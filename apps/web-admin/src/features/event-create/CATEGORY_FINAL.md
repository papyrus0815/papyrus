# 카테고리 판단 최종 방식

## ✅ 키워드 기반 체크 (최종 선택)

### 구현

```typescript
// category-utils.ts

/**
 * ID 키워드 체크 방식
 *
 * DB ID 네이밍 규칙: cat-{type}-{number}
 * 예: cat-military-001, cat-diplomatic-001
 */
export const isMilitaryCategory = (categoryIdOrName?: string): boolean => {
  if (!categoryIdOrName) return false

  // ID 키워드 체크
  if (categoryIdOrName.includes('military')) return true

  // name 체크 (하위 호환성)
  return categoryIdOrName === '군사'
}

export const isDiplomaticCategory = (categoryIdOrName?: string): boolean => {
  if (!categoryIdOrName) return false

  // ID 키워드 체크
  if (
    categoryIdOrName.includes('diplomatic') ||
    categoryIdOrName.includes('conference')
  )
    return true

  // name 체크
  return (
    categoryIdOrName === '외교' ||
    categoryIdOrName === '회담' ||
    categoryIdOrName === '회담/조약'
  )
}
```

### 이점

#### 1. 간결함 ⬆️⬆️⬆️

```typescript
// ❌ Before: 상수 정의 필요
export const SPECIAL_CATEGORY_IDS = {
  MILITARY: 'cat-military-001',
  DIPLOMATIC: 'cat-diplomatic-001',
  CONFERENCE: 'cat-conference-001',
} as const

// ✅ After: 상수 불필요, 키워드만 체크
categoryIdOrName.includes('military')
```

#### 2. 유연함 ⬆️⬆️

```typescript
// DB에서 카테고리 추가해도 자동 작동
// cat-military-002  → includes('military') ✅
// cat-military-ww2  → includes('military') ✅
```

#### 3. DB 독립성 ⬆️⬆️

```sql
-- DB ID 네이밍 규칙만 지키면 됨
INSERT INTO event_category (id, name) VALUES
  ('cat-military-001', '군사'),
  ('cat-military-ancient', '고대 전쟁'),  -- 자동으로 군사로 인식!
  ('cat-diplomatic-001', '외교');
```

## 필수 규칙

### DB ID 네이밍 컨벤션

```
cat-{type}-{identifier}

예시:
✅ cat-military-001
✅ cat-diplomatic-002
✅ cat-conference-ww2
✅ cat-political-korean-war

❌ military-cat-001      (순서 틀림)
❌ category-military-01  (prefix 틀림)
```

### 키워드 리스트

- `military` - 군사 정보 폼 표시
- `diplomatic` - 회담 정보 폼 표시
- `conference` - 회담 정보 폼 표시

## 비교: 3가지 방식

| 방식                  | 코드량 | 유연성 | DB 의존성 | 타입 안전성 |
| --------------------- | ------ | ------ | --------- | ----------- |
| **1. name 직접 비교** | ⭐     | ❌     | ❌❌❌    | ⭐⭐        |
| **2. UUID 상수 정의** | ❌❌   | ⭐⭐   | ⭐⭐⭐    | ⭐⭐⭐      |
| **3. 키워드 체크** ✅ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐      | ⭐⭐        |

### 방식 1: name 직접 비교

```typescript
categoryName === '군사'
```

- 장점: 간단
- 단점: DB 이름 변경 시 모든 코드 수정

### 방식 2: UUID 상수 정의

```typescript
const IDS = { MILITARY: 'cat-military-001' }
categoryId === IDS.MILITARY
```

- 장점: 타입 안전, DB 독립적
- 단점: 상수 관리 부담

### 방식 3: 키워드 체크 (선택됨)

```typescript
categoryId.includes('military')
```

- 장점: 간결, 유연, 상수 불필요
- 단점: ID 네이밍 규칙 필수

## 결론

**키워드 체크 방식 선택 이유:**

1. ✅ 코드가 가장 간결 (상수 정의 불필요)
2. ✅ 유연함 (새 카테고리 추가 자동 지원)
3. ✅ DB 독립성 (이름 변경 가능)
4. ✅ 유지보수 쉬움

**필수 규칙:**

- DB ID는 반드시 `cat-{type}-{number}` 형식
- 예: `cat-military-001`, `cat-diplomatic-002`

**완벽한 선택입니다!** 🎯
