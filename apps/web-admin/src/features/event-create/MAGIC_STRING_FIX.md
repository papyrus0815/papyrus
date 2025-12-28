# 매직 스트링 제거

## 문제점

### Before (매직 스트링 사용)

```typescript
{currentStep === 'basic' && (...)}
{currentStep === 'military' && (...)}
{currentStep === 'details' && (...)}

const [currentStep, setCurrentStep] = useState<FormStep>('basic')
```

**문제**:

1. ❌ **오타 가능성**: `'basic'` → `'baisc'` (컴파일 에러 없음)
2. ❌ **리팩토링 어려움**: 문자열 검색으로만 찾아야 함
3. ❌ **타입 안전성 부족**: IDE 자동완성 지원 약함
4. ❌ **유지보수 어려움**: 값 변경 시 모든 곳을 찾아 수정

## 해결 방법

### After (상수 객체 사용)

#### 1. 상수 정의 (`features/event-create/lib/constants.ts`)

```typescript
export const FORM_STEPS = {
  BASIC: 'basic',
  MILITARY: 'military',
  DETAILS: 'details',
  LOCATION: 'location',
  RELATIONSHIPS: 'relationships',
} as const satisfies Record<string, FormStep>
```

#### 2. 사용

```typescript
// ✅ 상수 사용
{currentStep === FORM_STEPS.BASIC && (...)}
{currentStep === FORM_STEPS.MILITARY && (...)}
{currentStep === FORM_STEPS.DETAILS && (...)}

const [currentStep, setCurrentStep] = useState<FormStep>(FORM_STEPS.BASIC)
```

## 이점

### 1. 타입 안전성 ⬆️

```typescript
// ❌ Before: 오타 가능
currentStep === 'baisc' // 컴파일 통과, 런타임 버그!

// ✅ After: 오타 불가능
currentStep === FORM_STEPS.BAISC // 컴파일 에러!
```

### 2. IDE 지원 ⬆️

```typescript
// ✅ 자동완성 지원
FORM_STEPS. // → BASIC, MILITARY, DETAILS, LOCATION, RELATIONSHIPS
```

### 3. 리팩토링 용이 ⬆️

```typescript
// ✅ "Find all references" 가능
// ✅ "Rename symbol" 가능
// ✅ 값 변경 시 한 곳만 수정
```

### 4. 가독성 ⬆️

```typescript
// ❌ Before
if (step === 'military') { ... }

// ✅ After
if (step === FORM_STEPS.MILITARY) { ... }
// 훨씬 명확하고 의도가 분명함
```

## 추가 개선: 카테고리도 상수화

```typescript
export const CATEGORIES = {
  MILITARY: 'military',
  DIPLOMATIC: 'diplomatic',
  CONFERENCE: 'conference',
  // ...
} as const

// 사용
{category === CATEGORIES.MILITARY && (...)}
```

## TypeScript 패턴

### `as const satisfies`

```typescript
export const FORM_STEPS = {
  BASIC: 'basic',
  // ...
} as const satisfies Record<string, FormStep>
```

- `as const`: 리터럴 타입으로 좁힘 (`'basic'` 타입)
- `satisfies Record<string, FormStep>`: FormStep 타입 체크

이렇게 하면:

- ✅ 타입 안전성 보장
- ✅ IDE 자동완성
- ✅ 값 변경 불가능 (const)

## 결론

**매직 스트링 → 상수 객체**로 변경:

- ✅ 타입 안전성
- ✅ 오타 방지
- ✅ 리팩토링 용이
- ✅ 가독성 향상

**Best Practice!** 🎯
