# SelectModal 공통 컴포넌트 사용 가이드

## 📁 위치

`apps/web/src/shared/ui/select-modal/`

## 🎯 목적

중앙 모달 선택 UI를 재사용 가능한 공통 컴포넌트로 제공

## 📦 사용 예시

### 1. 단일 선택 모달 (기원 선택)

```tsx
import { SelectModal, SelectOption } from '@/shared/ui/select-modal'

// 옵션 정의
const eraOptions: SelectOption[] = [
  {
    value: 'BC',
    label: '기원전 (BC)',
    icon: '📜',
    description: 'Before Christ - 서기 이전 시대',
  },
  {
    value: 'AD',
    label: '기원후 (AD)',
    icon: '📅',
    description: 'Anno Domini - 서기 이후 시대',
  },
]

// 사용
<SelectModal
  isOpen={showStartEraModal}
  onClose={() => setShowStartEraModal(false)}
  title="시작 기원 선택"
  options={eraOptions}
  selectedValue={selectedStartEra}
  onSelect={(era) => {
    setValue('startEra', era, { shouldValidate: true })
    setShowStartEraModal(false)
  }}
/>
```

### 2. 다중 선택 모달 (현대 국가 선택)

```tsx
// 옵션 정의
const countryOptions: SelectOption[] = modernCountries.map(country => ({
  value: country.id,
  label: country.name,
  icon: '🌍',
}))

// 헤더 추가 컨텐츠 (전체 해제 버튼)
const headerExtra = selectedModernCountries.length > 0 && (
  <div style={{
    padding: '12px',
    background: '#f3f4f6',
    borderRadius: '8px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <span>{selectedModernCountries.length}개 선택됨</span>
    <button onClick={() => setSelectedModernCountries([])}>
      전체 해제
    </button>
  </div>
)

// 사용
<SelectModal
  isOpen={showModernCountryModal}
  onClose={() => setShowModernCountryModal(false)}
  title="상위 현대 국가 선택 (여러 개 선택 가능)"
  options={countryOptions}
  multiple
  selectedValues={selectedModernCountries}
  onSelect={handleModernCountryToggle}
  headerExtra={headerExtra}
/>
```

### 3. 설명이 있는 선택 모달 (국가 형태)

```tsx
const stateTypeOptions: SelectOption[] = [
  {
    value: 'EMPIRE',
    label: '제국',
    icon: '👑',
    description: '황제가 통치하는 국가'
  },
  {
    value: 'KINGDOM',
    label: '왕국',
    icon: '🏰',
    description: '왕이 통치하는 국가'
  },
  // ...
]

<SelectModal
  isOpen={showStateTypeModal}
  onClose={() => setShowStateTypeModal(false)}
  title="국가 형태 선택"
  options={stateTypeOptions}
  selectedValue={selectedStateType}
  onSelect={(value) => {
    setValue('stateType', value, { shouldValidate: true })
    setShowStateTypeModal(false)
  }}
/>
```

## 🔧 Props

| Prop             | Type                 | Required | Default | Description           |
| ---------------- | -------------------- | -------- | ------- | --------------------- |
| `isOpen`         | `boolean`            | ✅       | -       | 모달 표시 여부        |
| `onClose`        | `() => void`         | ✅       | -       | 모달 닫기 핸들러      |
| `title`          | `string`             | ✅       | -       | 모달 제목             |
| `options`        | `SelectOption[]`     | ✅       | -       | 선택 옵션 목록        |
| `selectedValue`  | `T`                  | ❌       | -       | 현재 선택된 값 (단일) |
| `onSelect`       | `(value: T) => void` | ✅       | -       | 선택 핸들러           |
| `multiple`       | `boolean`            | ❌       | `false` | 다중 선택 모드        |
| `selectedValues` | `T[]`                | ❌       | `[]`    | 선택된 값 목록 (다중) |
| `headerExtra`    | `ReactNode`          | ❌       | -       | 헤더 추가 컨텐츠      |

## 📊 이점

### Before (중복 코드)

```tsx
// 국가 형태 모달: ~100줄
{showStateTypeModal ? createPortal(...) : null}

// 현대 국가 모달: ~120줄
{showModernCountryModal ? createPortal(...) : null}

// 시작 기원 모달: ~80줄
{showStartEraModal ? createPortal(...) : null}

// 종료 기원 모달: ~80줄
{showEndEraModal ? createPortal(...) : null}

// 총 ~380줄
```

### After (공통 컴포넌트)

```tsx
// 각 모달: ~10-15줄
<SelectModal {...props} />
<SelectModal {...props} />
<SelectModal {...props} />
<SelectModal {...props} />

// 총 ~50줄 + 공통 컴포넌트 1개 (~150줄)
// 실제 코드 감소: ~230줄
```

## ✅ 장점

1. **코드 재사용**: 4개 모달 → 1개 컴포넌트
2. **유지보수 용이**: 스타일 변경 시 한 곳만 수정
3. **타입 안정성**: Generic 타입으로 타입 체크
4. **일관성**: 모든 모달이 동일한 UX
5. **확장성**: 새로운 모달 추가 시 옵션만 정의

## 🎨 커스터마이징

필요시 `headerExtra` prop으로 추가 UI 삽입 가능 (예: 검색바, 필터, 액션 버튼)
