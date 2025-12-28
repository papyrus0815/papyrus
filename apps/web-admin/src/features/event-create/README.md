# Event Create Feature

이벤트 생성/수정 기능을 FSD 아키텍처에 맞게 구조화한 feature 모듈입니다.

## 디렉토리 구조

```
features/event-create/
├── model/                      # 상태 관리 hooks
│   ├── use-event-basic-info.ts      # 기본 정보 상태
│   ├── use-military-event-state.ts  # 군사 이벤트 상태
│   ├── use-event-relationships.ts   # 관계 정보 상태
│   └── use-event-ui-state.ts        # UI 상태 (모달, 단계 등)
├── lib/                        # 비즈니스 로직 & 유틸리티
│   ├── type-converters.ts           # 타입 변환 함수
│   ├── validators.ts                # 유효성 검증
│   └── event-data-builder.ts        # 이벤트 데이터 생성
└── ui/                         # (향후) 작은 UI 컴포넌트
```

## 사용 방법

### 1. 상태 관리 Hooks 사용

```typescript
import {
  useEventBasicInfo,
  useEventRelationships,
  useEventUIState,
  useMilitaryEventState,
} from '@/features/event-create/model'

export const EventCreatePage = () => {
  // 기본 정보 상태
  const basicInfo = useEventBasicInfo()

  // 군사 이벤트 상태
  const militaryState = useMilitaryEventState()

  // 관계 정보 상태
  const relationships = useEventRelationships()

  // UI 상태
  const uiState = useEventUIState()

  // ... 기존 로직
}
```

### 2. 타입 변환 함수 사용

```typescript
import {
  categoryNameMap,
  fromConflictTypeDto,
  toCombatType,
  toConflictType,
} from '@/features/event-create/lib'

// UI → DTO 변환
const conflictType = toConflictType('battle') // ConflictType.BATTLE
const combatType = toCombatType('land') // CombatType.LAND

// DTO → UI 변환
const uiType = fromConflictTypeDto('BATTLE') // 'battle'
```

### 3. 비즈니스 로직 사용

```typescript
import {
  buildEventSubmitData,
  buildMilitaryEventData,
  extractMentions,
} from '@/features/event-create/lib/event-data-builder'

// 멘션 추출
const { mentionedPersons, mentionedEvents } = extractMentions(sections)

// 군사 이벤트 데이터 생성
const militaryEvent = buildMilitaryEventData(category, {
  belligerents,
  belligerentsGraph,
  militaryDetails,
  casualties,
  warCost,
})

// 제출 데이터 생성
const eventData = buildEventSubmitData({
  title,
  description,
  startDate,
  // ... 기타 필드
})
```

### 4. 유효성 검증

```typescript
import { validateBasicInfo, validateDateRange } from '@/features/event-create/lib'

// 기본 정보 검증
if (!validateBasicInfo({ title, startDate })) {
  return
}

// 날짜 범위 검증
if (!validateDateRange(startDate, endDate)) {
  return
}
```

## 마이그레이션 가이드

기존 `event-create.page.tsx`에서 새로운 구조로 마이그레이션:

### Before (3000+ 줄)

```typescript
export const EventCreatePage = () => {
  // 100개 이상의 useState
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // ... 98개 더

  // 인라인 타입 변환
  const typeMap = { battle: 'BATTLE', ... }

  // 거대한 handleSubmit 함수 (300+ 줄)
  const handleSubmit = async () => {
    // ...
  }
}
```

### After (분리된 구조)

```typescript
import { useEventBasicInfo, useMilitaryEventState } from '@/features/event-create/model'
import { buildMilitaryEventData, buildEventSubmitData } from '@/features/event-create/lib'

export const EventCreatePage = () => {
  // 그룹화된 상태
  const basicInfo = useEventBasicInfo()
  const militaryState = useMilitaryEventState()

  // 간결한 handleSubmit
  const handleSubmit = async () => {
    const militaryEvent = buildMilitaryEventData(...)
    const eventData = buildEventSubmitData(...)

    if (isEditMode) {
      await updateEvent(editEventId, eventData)
    } else {
      await createEvent(eventData)
    }
  }
}
```

## 이점

1. **유지보수성**: 3000줄 → 논리적으로 분리된 작은 모듈들
2. **재사용성**: hooks와 utils는 다른 곳에서도 사용 가능
3. **테스트 용이성**: 각 함수와 hook을 독립적으로 테스트
4. **타입 안전성**: 명시적인 타입 변환 함수로 런타임 에러 방지
5. **가독성**: 각 파일의 책임이 명확함

## 다음 단계

1. ✅ 상태 관리 hooks 분리
2. ✅ 타입 변환 & 유틸리티 분리
3. ✅ 비즈니스 로직 분리
4. ⏳ widgets/event-form - 큰 폼 섹션 컴포넌트 분리
5. ⏳ page 컴포넌트를 hooks 사용하도록 리팩토링
