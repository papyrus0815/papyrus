# FSD 아키텍처 적용 - Event Create Feature

## 개요

3000줄이 넘는 거대한 `event-create.page.tsx` 파일을 FSD (Feature-Sliced Design) 아키텍처에 맞게 분리했습니다.

## 문제점 (Before)

### 단일 파일의 문제

- **3057줄**의 거대한 파일
- **100개 이상**의 useState
- **300줄** 이상의 handleSubmit 함수
- 타입 변환, 유효성 검증, 비즈니스 로직이 모두 섞여있음
- 테스트 불가능
- 재사용 불가능
- 유지보수 어려움

### 코드 예시 (Before)

```typescript
export const EventCreatePage = () => {
  // 100개의 useState
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // ... 98개 더

  // 인라인 타입 변환 (타입 안전성 낮음)
  const typeMap = { battle: 'BATTLE', ... }
  const conflictType = (typeMap[type] || 'BATTLE') as 'BATTLE' | 'WAR' | ...

  // 300줄의 handleSubmit
  const handleSubmit = async () => {
    // 유효성 검증 (인라인)
    if (!title.trim()) { ... }

    // 타입 변환 (인라인, 100줄)
    const converted = { ... }

    // 데이터 생성 (인라인, 150줄)
    const eventData = { ... }

    // API 호출
    await createEvent(eventData)
  }

  // 2500줄의 JSX
  return (...)
}
```

## 해결 방법 (After)

### FSD 레이어 구조

```
web-admin/src/
├── features/event-create/        # Feature 레이어
│   ├── model/                    # 상태 관리
│   │   ├── use-event-basic-info.ts       (89줄)
│   │   ├── use-military-event-state.ts   (68줄)
│   │   ├── use-event-relationships.ts    (103줄)
│   │   ├── use-event-ui-state.ts         (32줄)
│   │   └── index.ts
│   ├── lib/                      # 비즈니스 로직 & 유틸리티
│   │   ├── type-converters.ts            (170줄) - 타입 변환 함수
│   │   ├── validators.ts                 (39줄)  - 유효성 검증
│   │   ├── event-data-builder.ts         (297줄) - 데이터 생성 로직
│   │   └── index.ts
│   ├── README.md                 # 사용 가이드
│   ├── MIGRATION_GUIDE.md        # 마이그레이션 가이드
│   └── FSD_ARCHITECTURE.md       # 이 문서
├── widgets/event-form/           # Widget 레이어 (향후)
│   ├── ui/
│   └── model/
└── pages/events/create/          # Page 레이어
    └── event-create.page.tsx     # 가벼워진 페이지 (향후 리팩토링)
```

### 주요 개선 사항

#### 1. 상태 관리 분리 (model/)

**Before**: 100개의 useState가 한 파일에
**After**: 논리적으로 그룹화된 4개의 hooks

```typescript
// 기본 정보 상태
const basicInfo = useEventBasicInfo()
// { title, setTitle, description, setDescription, ... }

// 군사 이벤트 상태
const militaryState = useMilitaryEventState()
// { militaryEvent, belligerents, casualties, ... }

// 관계 정보 상태
const relationships = useEventRelationships()
// { parentEventId, relatedPersons, relatedCountryIds, ... }

// UI 상태
const uiState = useEventUIState()
// { currentStep, isLoading, modalStates, ... }
```

#### 2. 타입 변환 로직 분리 (lib/type-converters.ts)

**Before**: 타입 단언(`as`)을 사용한 불안전한 변환

```typescript
const conflictType = (typeMap[type] || 'BATTLE') as
  | 'BATTLE'
  | 'WAR'
  | 'SIEGE'
  | 'CAMPAIGN'
  | 'SKIRMISH'
```

**After**: 타입 가드 함수로 안전한 변환

```typescript
const toConflictType = (type: string | undefined): ConflictType => {
  const typeMap: Record<string, ConflictType> = {
    battle: ConflictType.BATTLE,
    war: ConflictType.WAR,
    siege: ConflictType.SIEGE,
    campaign: ConflictType.CAMPAIGN,
    skirmish: ConflictType.SKIRMISH,
  }
  return type && type in typeMap ? typeMap[type] : ConflictType.BATTLE
}

// 사용
const conflictType = toConflictType('battle')
```

#### 3. 비즈니스 로직 분리 (lib/event-data-builder.ts)

**Before**: handleSubmit 내부에 모든 로직 (300줄)
**After**: 재사용 가능한 함수들로 분리

```typescript
// 멘션 추출 (10줄)
export const extractMentions = (sections: EventSection[]) => { ... }

// 군사 이벤트 데이터 생성 (200줄)
export const buildMilitaryEventData = (...) => { ... }

// 제출 데이터 생성 (87줄)
export const buildEventSubmitData = (...) => { ... }
```

#### 4. 유효성 검증 분리 (lib/validators.ts)

**Before**: handleSubmit 내부에 산재

```typescript
if (!title.trim()) {
  toast.error('사건명을 입력해주세요.')
  return
}
if (!startDate) {
  toast.error('시작일을 입력해주세요.')
  return
}
```

**After**: 재사용 가능한 검증 함수

```typescript
export const validateBasicInfo = (data: {
  title: string
  startDate: string
}): boolean => {
  if (!data.title.trim()) {
    toast.error('사건명을 입력해주세요.')
    return false
  }
  if (!data.startDate) {
    toast.error('시작일을 입력해주세요.')
    return false
  }
  return true
}
```

## 이점

### 1. 유지보수성 ⬆️

- 3057줄 → 여러 개의 작은 모듈 (각 30~300줄)
- 각 파일의 책임이 명확함
- 변경 영향 범위가 제한적

### 2. 재사용성 ⬆️

- hooks는 다른 페이지에서도 사용 가능
- 타입 변환 함수는 다른 feature에서도 사용 가능
- 유효성 검증 로직 재사용 가능

### 3. 테스트 용이성 ⬆️

```typescript
// Before: 테스트 불가능
// 3000줄의 컴포넌트를 어떻게 테스트?

// After: 각 함수를 독립적으로 테스트
describe('toConflictType', () => {
  it('should convert battle to BATTLE', () => {
    expect(toConflictType('battle')).toBe(ConflictType.BATTLE)
  })

  it('should return default value for invalid input', () => {
    expect(toConflictType('invalid')).toBe(ConflictType.BATTLE)
  })
})
```

### 4. 타입 안전성 ⬆️

```typescript
// Before: 타입 단언 (런타임 검증 없음)
const type = (typeMap[input] || 'BATTLE') as 'BATTLE' | ...

// After: 타입 가드 함수 (런타임 검증)
const toConflictType = (input: string | undefined): ConflictType => {
  return input && input in typeMap ? typeMap[input] : ConflictType.BATTLE
}
```

### 5. 가독성 ⬆️

```typescript
// Before: 300줄의 handleSubmit
const handleSubmit = async () => {
  // 100줄의 유효성 검증
  // 100줄의 타입 변환
  // 100줄의 데이터 생성
}

// After: 30줄의 handleSubmit
const handleSubmit = async () => {
  if (!validateBasicInfo({ title, startDate })) return

  const { mentionedPersons, mentionedEvents } = extractMentions(sections)
  const militaryEvent = buildMilitaryEventData(...)
  const eventData = buildEventSubmitData(...)

  await (isEditMode ? updateEvent(...) : createEvent(...))
}
```

## 성능 영향

- **번들 크기**: 변화 없음 (코드 양은 동일, 구조만 변경)
- **런타임 성능**: 변화 없음
- **개발 경험**: 대폭 개선
- **빌드 시간**: 변화 없음

## 다음 단계

### 단계적 마이그레이션

1. ✅ lib 모듈 생성 (type-converters, validators, event-data-builder)
2. ✅ model hooks 생성 (상태 관리)
3. ⏳ **페이지 컴포넌트 리팩토링** (hooks 사용)
4. ⏳ widgets 분리 (큰 폼 섹션들)
5. ⏳ 테스트 작성

### 페이지 리팩토링 예시

```typescript
// event-create.page.tsx (리팩토링 후)
import {
  useEventBasicInfo,
  useMilitaryEventState,
  useEventRelationships,
  useEventUIState,
} from '@/features/event-create/model'
import {
  buildMilitaryEventData,
  buildEventSubmitData,
  extractMentions,
  validateBasicInfo,
} from '@/features/event-create/lib'

export const EventCreatePage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // 상태 관리 (100줄 → 4줄)
  const basicInfo = useEventBasicInfo()
  const militaryState = useMilitaryEventState()
  const relationships = useEventRelationships()
  const uiState = useEventUIState()

  // 편집 모드
  const editEventId = location.state?.editEventId
  const isEditMode = Boolean(editEventId)

  // 제출 (300줄 → 30줄)
  const handleSubmit = async () => {
    if (!validateBasicInfo(basicInfo)) return

    const { mentionedPersons, mentionedEvents } = extractMentions(basicInfo.sections)
    const militaryEvent = buildMilitaryEventData(basicInfo.category, militaryState)
    const eventData = buildEventSubmitData({
      ...basicInfo,
      ...relationships,
      militaryEvent,
      mentionedPersons,
      mentionedEvents,
    })

    if (isEditMode) {
      await updateEvent(editEventId, eventData)
    } else {
      await createEvent(eventData)
    }

    navigate(pathKeys.history.events())
  }

  // JSX는 동일...
  return (...)
}
```

## 참고 문서

- [README.md](./README.md) - 사용 방법
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 마이그레이션 가이드
- [FSD 공식 문서](https://feature-sliced.design/)
