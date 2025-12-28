# 마이그레이션 가이드

`event-create.page.tsx`를 FSD 아키텍처로 마이그레이션하는 방법

## 1단계: Import 변경

### Before

```typescript
// 파일 내부에 타입 변환 로직이 산재
const typeMap = { battle: 'BATTLE', ... }
const sideLevelMap = { coalition: 'COALITION', ... }
```

### After

```typescript
import {
  categoryNameMap,
  participationMap,
  sideLevelMap,
  toCombatType,
  toConflictType,
} from '@/features/event-create/lib'
```

## 2단계: 상태 관리 리팩토링

### Before

```typescript
export const EventCreatePage = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  // ... 100개의 useState
}
```

### After

```typescript
import {
  useEventBasicInfo,
  useEventRelationships,
  useEventUIState,
  useMilitaryEventState,
} from '@/features/event-create/model'

export const EventCreatePage = () => {
  const basicInfo = useEventBasicInfo()
  const militaryState = useMilitaryEventState()
  const relationships = useEventRelationships()
  const uiState = useEventUIState()

  // 기존 코드에서 state 참조 변경
  // title → basicInfo.title
  // setTitle → basicInfo.setTitle
}
```

## 3단계: handleSubmit 리팩토링

### Before (300+ 줄)

```typescript
const handleSubmit = async () => {
  // 유효성 검증 (인라인)
  if (!title.trim()) {
    toast.error('사건명을 입력해주세요.')
    return
  }

  // 타입 변환 (인라인)
  const typeMap = { ... }
  const conflictType = typeMap[militaryDetails.type] as 'BATTLE' | ...

  // 데이터 생성 (인라인, 200줄)
  const eventData = {
    title,
    description,
    // ... 엄청난 로직
  }

  // API 호출
  if (isEditMode) {
    await updateEvent(editEventId, eventData)
  } else {
    await createEvent(eventData)
  }
}
```

### After (30줄)

```typescript
import {
  buildEventSubmitData,
  buildMilitaryEventData,
  extractMentions,
  validateBasicInfo,
} from '@/features/event-create/lib'

const handleSubmit = async () => {
  // 유효성 검증
  if (
    !validateBasicInfo({
      title: basicInfo.title,
      startDate: basicInfo.startDate,
    })
  ) {
    return
  }

  // 멘션 추출
  const { mentionedPersons, mentionedEvents } = extractMentions(
    basicInfo.sections,
  )

  // 군사 이벤트 데이터 생성
  const militaryEvent = buildMilitaryEventData(basicInfo.category, {
    belligerents: militaryState.belligerents,
    belligerentsGraph: militaryState.belligerentsGraph,
    militaryDetails: militaryState.militaryDetails,
    casualties: militaryState.casualties,
    warCost: militaryState.warCost,
  })

  // 제출 데이터 생성
  const eventData = buildEventSubmitData({
    ...basicInfo,
    ...relationships,
    militaryEvent,
    mentionedPersons,
    mentionedEvents,
  })

  // API 호출
  if (isEditMode) {
    await updateEvent(
      editEventId,
      eventData as Parameters<typeof updateEvent>[1],
    )
  } else {
    await createEvent(eventData as Parameters<typeof createEvent>[0])
  }
}
```

## 4단계: 타입 변환 로직 제거

### Before

```typescript
// handleSubmit 내부에 타입 변환 로직 (100+ 줄)
const typeMap: Record<string, 'BATTLE' | 'WAR' | ...> = {
  battle: 'BATTLE',
  war: 'WAR',
  // ...
}

const convertedMilitaryDetails = {
  conflictType: (typeMap[militaryDetails.type] || 'BATTLE') as 'BATTLE' | 'WAR' | ...,
  combatTypes: militaryDetails.combatType.map(ct =>
    (combatMap[ct] || 'LAND') as 'LAND' | 'NAVAL' | ...
  ),
}
```

### After

```typescript
import { toCombatType, toConflictType } from '@/features/event-create/lib'

// buildMilitaryEventData 내부에서 자동 처리
// 또는 직접 사용
const conflictType = toConflictType(militaryDetails.type)
const combatTypes = militaryDetails.combatType.map(toCombatType)
```

## 5단계: 점진적 마이그레이션 전략

전체를 한 번에 마이그레이션하기보다는 점진적으로:

1. **1주차**: Import 변경 및 타입 변환 함수 적용
2. **2주차**: 상태 관리 hooks 적용 (하나씩)
3. **3주차**: handleSubmit 리팩토링
4. **4주차**: 테스트 작성 및 검증

### 예시: 점진적 적용

```typescript
export const EventCreatePage = () => {
  // ✅ 마이그레이션 완료
  const basicInfo = useEventBasicInfo()

  // ⏳ 아직 마이그레이션 전 (기존 방식)
  const [belligerents, setBelligerents] = useState<BelligerentSide[]>([])

  // 두 방식을 혼용 가능
  const handleSubmit = async () => {
    const militaryEvent = buildMilitaryEventData(basicInfo.category, {
      belligerents, // 기존 state
      // ...
    })
  }
}
```

## 주의사항

1. **Breaking Changes 없음**: 기존 코드와 호환 가능하도록 설계
2. **점진적 적용**: 한 번에 모두 바꾸지 말고 단계적으로
3. **테스트**: 각 단계마다 기능이 정상 작동하는지 확인
4. **타입 체크**: TypeScript 에러 없이 컴파일되는지 확인

## 롤백 전략

마이그레이션 중 문제 발생 시:

1. Git commit을 단계별로 생성
2. 각 단계마다 테스트 후 commit
3. 문제 발생 시 이전 commit으로 롤백

```bash
# 단계별 commit 예시
git commit -m "refactor: import type converters from lib"
git commit -m "refactor: apply useEventBasicInfo hook"
git commit -m "refactor: apply buildMilitaryEventData"
```
