# 이벤트 목록 페이지 FSD 아키텍처

이 문서는 `events.page.ui.tsx` (1760줄)를 FSD (Feature-Sliced Design) 아키텍처로 분리한 구조를 설명합니다.

## 📁 디렉토리 구조

```
web-admin/src/
├── entities/                          # 비즈니스 엔티티 레이어
│   ├── event/
│   │   └── model/
│   │       ├── types.ts              # 타입 정의 (CenturyFilter, FilterChip)
│   │       ├── useEvents.ts          # 이벤트 데이터 로딩 Hook
│   │       ├── eventTransformers.ts  # API → UI 데이터 변환 로직
│   │       └── index.ts
│   └── government-position/
│       └── model/
│           ├── useHeadsOfState.ts    # 국가 원수 관련 Hook
│           └── index.ts
│
├── features/                          # 기능 레이어
│   ├── event-filters/
│   │   └── model/
│   │       ├── useEventFilters.ts    # 필터링 로직 Hook
│   │       └── index.ts
│   └── event-hierarchy/
│       └── model/
│           ├── useEventHierarchy.ts  # 계층 구조 관리 Hook
│           └── index.ts
│
├── widgets/                           # UI 위젯 레이어
│   ├── event-category-summary/
│   │   └── ui/
│   │       ├── CategorySummaryGrid.tsx
│   │       └── index.ts
│   ├── event-filters-panel/
│   │   └── ui/
│   │       ├── FiltersPanel.tsx
│   │       └── index.ts
│   ├── event-list-compact/
│   │   └── ui/
│   │       ├── EventCompactList.tsx
│   │       ├── EventListItem.tsx
│   │       └── index.ts
│   └── tenure-group/
│       └── ui/
│           ├── TenureGroupHeader.tsx
│           ├── OtherHeadsOfStateList.tsx
│           ├── TenureGroupFooter.tsx
│           └── index.ts
│
└── pages/                             # 페이지 레이어 (조립)
    └── events/
        └── list/
            ├── events.page.ui.tsx                  # 기존 파일 (유지)
            └── events.page.ui.refactored.tsx       # FSD 리팩토링 버전 ✨
```

## 🏗️ 아키텍처 레이어 설명

### 1. **Entities** (비즈니스 엔티티)

독립적인 비즈니스 로직과 데이터 관리를 담당합니다.

#### `entities/event/model`
- **`useEvents`**: API에서 이벤트 데이터를 로드하고 상태 관리
- **`eventTransformers`**: API 응답을 UI에서 사용하는 `HistoricalEvent` 타입으로 변환
- **`types`**: 공통 타입 정의

#### `entities/government-position/model`
- **`useHeadsOfState`**: 사건별 국가 원수 정보 필터링 및 관리
- **`useTenureGroups`**: 국가 원수 집권 기간별로 사건을 그룹핑

### 2. **Features** (기능)

사용자 시나리오와 상호작용을 담당합니다.

#### `features/event-filters/model`
- **`useEventFilters`**: 모든 필터링 로직 관리
  - 카테고리, 키워드, 세기, 국가, 직업 필터
  - 정렬 로직 (파급력, 최신순, 지속 기간)
  - 필터 칩 생성 및 초기화

#### `features/event-hierarchy/model`
- **`useEventHierarchy`**: 사건의 계층 구조 관리
  - 확장/접기 상태 관리
  - 플랫 뷰 / 계층 뷰 전환
  - Hierarchy 평탄화 로직

### 3. **Widgets** (UI 위젯)

재사용 가능한 독립적인 UI 블록입니다.

#### `widgets/event-category-summary`
카테고리별 사건 개수를 표시하는 요약 카드 그리드

#### `widgets/event-filters-panel`
좌측 필터 패널 (검색, 카테고리, 국가, 직업, 세기 선택)

#### `widgets/event-list-compact`
- **`EventCompactList`**: 사건 목록 컨테이너 (정렬, 빈 상태 처리)
- **`EventListItem`**: 개별 사건 리스트 아이템

#### `widgets/tenure-group`
- **`TenureGroupHeader`**: 집권 기간 그룹 헤더
- **`OtherHeadsOfStateList`**: 동시기 다른 국가 원수 목록
- **`TenureGroupFooter`**: 집권 기간 그룹 푸터

### 4. **Pages** (페이지 - 조립)

모든 레이어를 조합하여 최종 페이지를 구성합니다.

#### `pages/events/list/events.page.ui.refactored.tsx`
- 비즈니스 로직 없음 (순수 조립 레이어)
- Hooks와 Widgets를 조합하여 페이지 구성
- 약 **350줄** (기존 1760줄에서 80% 감소) ✨

## 🔄 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                         Page (조립)                          │
│  - UI 상태 관리                                               │
│  - 모달 상태                                                  │
│  - 레이아웃 구성                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      Widgets (UI)                            │
│  - CategorySummaryGrid                                       │
│  - FiltersPanel                                              │
│  - EventCompactList                                          │
│  - TenureGroup Components                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    Features (기능)                           │
│  - useEventFilters (필터링 로직)                             │
│  - useEventHierarchy (계층 구조)                             │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                   Entities (데이터)                          │
│  - useEvents (데이터 로딩)                                   │
│  - useHeadsOfState (국가 원수)                               │
│  - eventTransformers (변환 로직)                             │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  - getAllEvents                                              │
│  - getAllEventCategories                                     │
│  - getAllPersonsWithGovernmentPositions                      │
└─────────────────────────────────────────────────────────────┘
```

## ✅ FSD 원칙 준수

### 1. **단방향 의존성**
- 상위 레이어는 하위 레이어만 참조
- `pages` → `widgets` → `features` → `entities` → `shared`

### 2. **관심사의 분리**
- **데이터 로딩**: `entities/event/model/useEvents.ts`
- **데이터 변환**: `entities/event/model/eventTransformers.ts`
- **필터링**: `features/event-filters/model/useEventFilters.ts`
- **계층 구조**: `features/event-hierarchy/model/useEventHierarchy.ts`
- **UI 렌더링**: `widgets/**/ui/*.tsx`
- **페이지 조립**: `pages/events/list/events.page.ui.refactored.tsx`

### 3. **재사용성**
- 모든 Hook과 Widget은 독립적으로 테스트 가능
- 다른 페이지에서도 재사용 가능
- Props를 통한 명확한 인터페이스

### 4. **확장성**
- 새로운 필터 추가: `features/event-filters`만 수정
- 새로운 위젯 추가: `widgets/` 디렉토리에 추가
- 비즈니스 로직 변경: `entities/`만 수정

## 🚀 마이그레이션 가이드

### 기존 파일 사용
```tsx
import EventsCatalogPage from './events.page.ui'
```

### FSD 리팩토링 버전 사용
```tsx
import EventsCatalogPageRefactored from './events.page.ui.refactored'
```

### 점진적 마이그레이션
1. 기존 파일(`events.page.ui.tsx`)은 유지
2. 새 파일(`events.page.ui.refactored.tsx`)로 점진적 전환
3. 테스트 완료 후 기존 파일 교체
4. 라우터에서 import 경로만 변경

```tsx
// router.tsx
import EventsCatalogPage from '@/pages/events/list/events.page.ui.refactored'
```

## 📊 개선 효과

| 항목 | 기존 | 리팩토링 후 | 개선율 |
|------|------|-------------|--------|
| 페이지 코드 라인 수 | 1,760줄 | ~350줄 | 80% ↓ |
| 단일 파일 책임 | 다중 | 단일 | ✅ |
| 테스트 가능성 | 어려움 | 쉬움 | ✅ |
| 재사용성 | 낮음 | 높음 | ✅ |
| 유지보수성 | 어려움 | 쉬움 | ✅ |

## 🧪 테스트 전략

### Unit Tests
```typescript
// entities/event/model/useEvents.test.ts
describe('useEvents', () => {
  it('should load events from API', async () => {
    // ...
  })
})

// features/event-filters/model/useEventFilters.test.ts
describe('useEventFilters', () => {
  it('should filter events by category', () => {
    // ...
  })
})
```

### Integration Tests
```typescript
// widgets/event-list-compact/ui/EventCompactList.test.tsx
describe('EventCompactList', () => {
  it('should render event list items', () => {
    // ...
  })
})
```

### E2E Tests
```typescript
// pages/events/list/events.page.e2e.test.tsx
describe('Events Catalog Page', () => {
  it('should filter and display events', () => {
    // ...
  })
})
```

## 📚 참고 자료

- [Feature-Sliced Design 공식 문서](https://feature-sliced.design/)
- [FSD 베스트 프랙티스](https://feature-sliced.design/docs/guides/best-practices)
- [React Hooks 패턴](https://react.dev/reference/react)

---

**작성일**: 2025-12-16  
**버전**: 1.0.0  
**작성자**: AI Assistant

