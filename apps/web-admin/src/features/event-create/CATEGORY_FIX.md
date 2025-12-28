# 카테고리 매직 스트링 제거

## 문제점

### Before (하드코딩된 문자열 비교)

```typescript
// ❌ 위험한 하드코딩
if (category === 'military') { ... }
if (category === 'diplomatic' || category === 'conference') { ... }

// ❌ DB 이름 변경 시 깨짐
// DB: "군사" → 코드: 'military' (매핑 필요)
```

**문제**:

1. ❌ DB 카테고리 이름 변경 시 모든 코드 수정 필요
2. ❌ 한글/영문 매핑이 `categoryNameMap`에만 의존
3. ❌ 오타 가능성
4. ❌ 타입 안전하지 않음

## 해결 방법

### 카테고리 유틸리티 함수 생성

`features/event-create/lib/category-utils.ts`:

```typescript
/**
 * 카테고리 타입 (내부 사용)
 */
export enum CategoryType {
  MILITARY = 'military',
  DIPLOMATIC = 'diplomatic',
  CONFERENCE = 'conference',
  // ...
}

/**
 * DB 카테고리 이름 → 내부 타입 매핑
 */
const CATEGORY_NAME_TO_TYPE: Record<string, CategoryType> = {
  // 한글 이름 (DB에 저장된 실제 값)
  군사: CategoryType.MILITARY,
  외교: CategoryType.DIPLOMATIC,
  회담: CategoryType.CONFERENCE,
  정치: CategoryType.POLITICAL,
  // ...

  // 영문 이름 (하위 호환성)
  military: CategoryType.MILITARY,
  diplomatic: CategoryType.DIPLOMATIC,
  // ...
}

/**
 * 카테고리 판단 함수
 */
export const isMilitaryCategory = (categoryName?: string): boolean => {
  if (!categoryName) return false
  return CATEGORY_NAME_TO_TYPE[categoryName] === CategoryType.MILITARY
}

export const isDiplomaticCategory = (categoryName?: string): boolean => {
  if (!categoryName) return false
  const type = CATEGORY_NAME_TO_TYPE[categoryName]
  return type === CategoryType.DIPLOMATIC || type === CategoryType.CONFERENCE
}
```

### After (타입 안전한 헬퍼 함수)

```typescript
// ✅ 명시적이고 안전
if (isMilitaryCategory(category)) { ... }
if (isDiplomaticCategory(category)) { ... }

// ✅ DB 이름 변경 시 한 곳(CATEGORY_NAME_TO_TYPE)만 수정
// ✅ 타입 안전
// ✅ 가독성 향상
```

## 실제 사용 예시

### Before

```typescript
const steps = [
  {
    id: FORM_STEPS.MILITARY,
    label: category === 'military'
      ? '군사 정보'
      : category === 'diplomatic' || category === 'conference'
        ? '회담 정보'
        : '상세 정보',
    icon: category === 'military'
      ? FiShield
      : category === 'diplomatic' || category === 'conference'
        ? FiGlobe
        : FiLayers,
  },
]

{currentStep === FORM_STEPS.MILITARY && category === 'military' && (...)}
{currentStep === FORM_STEPS.MILITARY && (category === 'diplomatic' || category === 'conference') && (...)}
```

### After

```typescript
const steps = [
  {
    id: FORM_STEPS.MILITARY,
    label: isMilitaryCategory(category)
      ? '군사 정보'
      : isDiplomaticCategory(category)
        ? '회담 정보'
        : '상세 정보',
    icon: isMilitaryCategory(category)
      ? FiShield
      : isDiplomaticCategory(category)
        ? FiGlobe
        : FiLayers,
  },
]

{currentStep === FORM_STEPS.MILITARY && isMilitaryCategory(category) && (...)}
{currentStep === FORM_STEPS.MILITARY && isDiplomaticCategory(category) && (...)}
```

## 이점

### 1. DB 독립성 ⬆️

```typescript
// DB에서 "군사" → "전쟁" 으로 변경해도
// CATEGORY_NAME_TO_TYPE만 수정하면 됨

const CATEGORY_NAME_TO_TYPE: Record<string, CategoryType> = {
  전쟁: CategoryType.MILITARY, // ✅ 한 곳만 수정
  // ...
}
```

### 2. 타입 안전성 ⬆️

```typescript
// ✅ enum 사용으로 타입 체크
export enum CategoryType {
  MILITARY = 'military',
  // ...
}
```

### 3. 가독성 ⬆️

```typescript
// ❌ Before
if (category === 'military' || category === 'diplomatic' || category === 'conference')

// ✅ After
if (isMilitaryCategory(category) || isDiplomaticCategory(category))
```

### 4. 유지보수성 ⬆️

- 카테고리 로직이 한 곳에 집중
- 변경 시 영향 범위 최소화
- 테스트 가능

## 추가 확장 가능

```typescript
// 여러 카테고리 타입 체크
export const isCategoryType = (
  categoryName: string | undefined,
  ...types: CategoryType[]
): boolean => {
  if (!categoryName) return false
  const categoryType = CATEGORY_NAME_TO_TYPE[categoryName]
  return types.includes(categoryType)
}

// 사용
if (isCategoryType(category, CategoryType.MILITARY, CategoryType.DIPLOMATIC)) {
  // 군사 또는 외교 카테고리일 때
}
```

## 결론

**매직 스트링 → 타입 안전한 헬퍼 함수**:

- ✅ DB 독립성
- ✅ 타입 안전성
- ✅ 가독성
- ✅ 유지보수성

**Best Practice!** 🎯
