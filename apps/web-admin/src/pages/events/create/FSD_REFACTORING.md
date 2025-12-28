# 이벤트 생성 페이지 FSD 리팩토링

**원본 파일**: `event-create.page.tsx` (1,840줄)  
**리팩토링 파일**: `event-create.page.refactored.tsx` (~450줄)  
**코드 감소**: **75%** 🎉

## 📁 생성된 구조

```
web-admin/src/
├── entities/
│   └── event-form/
│       └── model/
│           ├── useFormEntities.ts      # 엔티티 데이터 로딩 Hook
│           └── index.ts
│
├── features/
│   └── event-form/
│       └── model/
│           ├── useBasicInfoForm.ts     # 기본 정보 폼 상태 및 유효성 검증
│           ├── useRelationshipsForm.ts # 관계 정보 폼 상태
│           └── index.ts
│
├── widgets/
│   └── event-form/
│       └── ui/
│           ├── BasicInfoSection.tsx    # 기존 위젯 (사용 중)
│           ├── DetailsSection.tsx      # 기존 위젯 (사용 중)
│           ├── LocationSection.tsx     # 기존 위젯 (사용 중)
│           └── StepNavigation.tsx      # 기존 위젯 (사용 중)
│
└── pages/events/create/
    ├── event-create.page.tsx           # 기존 파일 (유지)
    └── event-create.page.refactored.tsx # FSD 리팩토링 버전 ✨
```

## 🏗️ 아키텍처 레이어

### 1. **Entities** (비즈니스 엔티티)

#### `entities/event-form/model/useFormEntities`

폼에 필요한 모든 엔티티 데이터를 로드합니다:

- 인물 목록 (`availablePersons`)
- 국가 목록 (`availableCountries`)
- 역사적 국가 목록 (`availableHistoricalCountries`)
- 카테고리 목록 (`dbCategories`)
- 군부대 목록 (`availableMilitaryUnits`)
- 사건 목록 (`availableEvents`)

**이점**: 데이터 로딩 로직이 한 곳에 집중되어 재사용 가능

### 2. **Features** (기능)

#### `features/event-form/model/useBasicInfoForm`

기본 정보 폼의 상태와 유효성 검증 로직:

- 제목, 설명, 날짜/시간, 카테고리, 썸네일
- 위치, 태그, 관련 국가
- 유효성 검증 (`isValid`, `getDateError`)
- 날짜 차이 계산 (`calculateDaysDifference`)

#### `features/event-form/model/useRelationshipsForm`

관계 정보 폼의 상태 및 필터링 로직:

- 부모 사건 선택 및 검색
- 관련 인물 선택 및 검색
- 관련 사건 선택 및 검색
- 자동 필터링 및 외부 클릭 처리

**이점**: 폼 로직이 명확하게 분리되어 테스트 및 유지보수 용이

### 3. **Widgets** (UI 컴포넌트)

이미 존재하는 위젯들을 활용:

- `BasicInfoSection` - 기본 정보 입력 UI
- `DetailsSection` - 상세 내용 작성 UI (섹션 기반)
- `LocationSection` - 위치 정보 입력 UI
- `StepNavigation` - 단계 네비게이션 UI

**이점**: 이미 잘 분리되어 있어 재사용 가능

### 4. **Pages** (조립)

`event-create.page.refactored.tsx`는 순수 조립 레이어:

- Hook들을 조합하여 상태 관리
- Widget들을 배치하여 UI 구성
- 비즈니스 로직 없음 (모두 features/entities에 위임)

## 📊 개선 효과

| 항목         | 이전        | 리팩토링 후           | 개선율              |
| ------------ | ----------- | --------------------- | ------------------- |
| 페이지 코드  | 1,840줄     | ~450줄                | **75% 감소**        |
| 데이터 로딩  | 페이지 내부 | `entities/event-form` | ✅ 분리됨           |
| 폼 상태 관리 | 페이지 내부 | `features/event-form` | ✅ 분리됨           |
| 유효성 검증  | 페이지 내부 | `features/event-form` | ✅ 분리됨           |
| 재사용성     | 낮음        | 높음                  | ✅ Hook 재사용 가능 |

## 🔄 데이터 흐름

```
┌─────────────────────────────────────────────────────┐
│              Page (조립 레이어)                      │
│  - 단계 관리 (currentStep)                          │
│  - 모달 상태 관리                                    │
│  - 제출 처리 (handleSubmit)                         │
└─────────────────────────────────────────────────────┘
                      ↓ ↑
┌─────────────────────────────────────────────────────┐
│              Widgets (UI)                            │
│  - BasicInfoSection                                  │
│  - DetailsSection                                    │
│  - LocationSection                                   │
│  - StepNavigation                                    │
│  - MilitaryEventForm                                 │
│  - ConferenceEventForm                               │
└─────────────────────────────────────────────────────┘
                      ↓ ↑
┌─────────────────────────────────────────────────────┐
│              Features (폼 로직)                      │
│  - useBasicInfoForm (기본 정보 + 유효성 검증)       │
│  - useRelationshipsForm (관계 정보 + 필터링)        │
└─────────────────────────────────────────────────────┘
                      ↓ ↑
┌─────────────────────────────────────────────────────┐
│              Entities (데이터)                       │
│  - useFormEntities (엔티티 데이터 로딩)             │
└─────────────────────────────────────────────────────┘
                      ↓ ↑
┌─────────────────────────────────────────────────────┐
│              API Layer                               │
│  - getAllPersons, getAllCountries, etc.             │
└─────────────────────────────────────────────────────┘
```

## ✅ FSD 원칙 준수

### 1. **단방향 의존성**

```
pages → widgets → features → entities → shared
```

### 2. **관심사의 분리**

- **데이터 로딩**: `entities/event-form/model/useFormEntities`
- **폼 상태**: `features/event-form/model/useBasicInfoForm`
- **폼 상태**: `features/event-form/model/useRelationshipsForm`
- **UI 렌더링**: `widgets/event-form/ui/*`
- **페이지 조립**: `pages/events/create/event-create.page.refactored.tsx`

### 3. **재사용성**

모든 Hook은 독립적으로 사용 가능:

```typescript
// 다른 페이지에서도 사용 가능
import { useFormEntities } from '@/entities/event-form/model'
import { useBasicInfoForm } from '@/features/event-form/model'

const MyCustomPage = () => {
  const { availableCountries } = useFormEntities()
  const { title, setTitle, isValid } = useBasicInfoForm()

  // ...
}
```

### 4. **테스트 용이성**

각 Hook을 독립적으로 테스트 가능:

```typescript
// useBasicInfoForm.test.ts
describe('useBasicInfoForm', () => {
  it('should validate title', () => {
    const { result } = renderHook(() => useBasicInfoForm())
    expect(result.current.isValid()).toBe(false)

    act(() => {
      result.current.setTitle('Test Event')
      result.current.setStartDate('2024-01-01')
    })

    expect(result.current.isValid()).toBe(true)
  })
})
```

## 🚀 사용 방법

### 기존 버전 (유지)

```typescript
import EventCreatePage from './event-create.page'
```

### FSD 리팩토링 버전

```typescript
import EventCreatePageRefactored from './event-create.page.refactored'
```

### 라우터 교체

```typescript
// src/pages/events/event-route.ts
import EventCreatePageRefactored from './create/event-create.page.refactored'

// ...
{
  path: 'create',
  element: <EventCreatePageRefactored />,
}
```

## 🎯 향후 개선 사항

1. ✅ **완료**: 엔티티 데이터 로딩 분리
2. ✅ **완료**: 기본 정보 폼 분리
3. ✅ **완료**: 관계 정보 폼 분리
4. ⏭️ **권장**: 군사 이벤트 폼 상태 분리 (`features/military-event-form`)
5. ⏭️ **권장**: 회담 이벤트 폼 상태 분리 (`features/conference-event-form`)
6. ⏭️ **권장**: 관계 UI를 Widget으로 분리 (`widgets/event-relationships`)
7. ⏭️ **권장**: 각 Hook 단위 테스트 작성

## 💡 핵심 이점

1. **유지보수성**: 변경사항을 해당 레이어에서만 수정
2. **확장성**: 새로운 폼 필드 추가가 쉬움
3. **테스트**: 각 Hook을 독립적으로 테스트
4. **재사용**: Hook을 다른 페이지에서도 사용 가능
5. **가독성**: 페이지 코드가 75% 감소하여 이해하기 쉬움

---

**리팩토링 완료일**: 2025-12-16  
**상태**: ✅ 기본 구조 완료 (린터 검증 필요)  
**다음 단계**: 린터 에러 수정 후 프로덕션 적용
