# 사건 등록 페이지 개선 방안 - 국가 등록 & 사건 그룹핑

## 📋 현재 상태 분석

### 기존 사건 관계 시스템

#### 1️⃣ 계층 구조 (Hierarchy)

```
제2차 세계대전 (부모)
├── 유럽 전선 (자식)
│   ├── 폴란드 침공 (손자)
│   ├── 프랑스 침공 (손자)
│   └── 노르망디 상륙작전 (손자)
└── 태평양 전선 (자식)
    ├── 진주만 공격 (손자)
    └── 미드웨이 해전 (손자)
```

**특징:**

- `parentEventId`로 상위 사건 지정
- 명확한 상하 관계
- 시간적/공간적으로 포함 관계

#### 2️⃣ 연관 사건 (Related Events)

```
베르사유 조약
  → 연관: 제1차 세계대전, 바이마르 공화국 수립
```

**특징:**

- `relatedEventIds` 배열로 관리
- 수평적 연관 관계
- 인과 관계, 영향 관계 등

---

## 🌍 문제 1: 사건 관련 국가 등록 기능 부재

### 현재 상황

- ❌ 일반 사건: 관련 국가 등록 기능 **없음**
- ✅ 군사 사건: `belligerents` (교전국)로 국가 등록
- ✅ 회담 사건: `participants` (참가국)로 국가 등록

### 문제점

정치/경제/사회/문화 등 비군사 사건의 경우:

- 프랑스 혁명 → 프랑스 관련인지 명시 불가
- 산업 혁명 → 영국 관련인지 명시 불가
- 대공황 → 미국 관련인지 명시 불가

---

## 💡 해결 방안 1: 관련 국가 등록 기능 추가

### A. 데이터 구조

```typescript
interface EventCountryRelation {
  countryId?: string          // 현대 국가
  historicalCountryId?: string // 역사적 국가
  role: string                // 역할 (주도국, 피해국, 참여국 등)
  roleDescription?: string    // 역할 상세 설명
  note?: string              // 비고
}

// 사건 등록 시
{
  title: "프랑스 혁명",
  countries: [
    {
      historicalCountryId: "france-kingdom-id",
      role: "발생국",
      roleDescription: "혁명의 주 무대"
    },
    {
      countryId: "austria-id",
      role: "간섭국",
      roleDescription: "반혁명 간섭"
    }
  ]
}
```

### B. UI 구성안

#### 옵션 1: 간단 버전 (추천) ⭐

```
┌─ 관련 국가 ─────────────────┐
│ [+ 국가 추가]                │
│                              │
│ 🇫🇷 프랑스 [발생국]          │
│    └─ 혁명의 주 무대         │
│    [역할 수정] [제거]        │
│                              │
│ 🇦🇹 오스트리아 [간섭국]      │
│    └─ 반혁명 간섭            │
│    [역할 수정] [제거]        │
└──────────────────────────────┘
```

#### 옵션 2: 상세 버전

```
┌─ 관련 국가 ─────────────────┐
│ [국가 검색: _____] [+ 추가]  │
│                              │
│ 선택된 국가:                 │
│ ┌──────────────────────┐    │
│ │ 🇫🇷 프랑스            │    │
│ │ 역할: [발생국 ▼]     │    │
│ │ 설명: [____________] │    │
│ │      [저장] [제거]   │    │
│ └──────────────────────┘    │
└──────────────────────────────┘
```

### C. 역할 타입 (role)

```typescript
type CountryRoleType =
  | 'origin' // 발생국 (혁명, 사건의 주 무대)
  | 'participant' // 참여국 (관련된 국가)
  | 'victim' // 피해국 (침략, 재난 피해)
  | 'aggressor' // 가해국 (침략국)
  | 'supporter' // 지원국 (원조, 협력)
  | 'mediator' // 중재국 (분쟁 조정)
  | 'observer' // 관찰국 (직접 참여 없음)
  | 'affected' // 영향받은 국가
  | 'other' // 기타
```

### D. 구현 위치

`event-create.page.tsx`의 **relationships** 단계에 추가:

```typescript
// 상태 추가
const [relatedCountries, setRelatedCountries] = useState<
  Array<{
    countryId?: string
    historicalCountryId?: string
    role: string
    roleDescription: string
    note: string
  }>
>([])

// relationships 단계에 UI 추가
<S.FormSection>
  <S.FormRow>
    <S.FormLabel>관련 국가</S.FormLabel>
    <S.FormField>
      {/* 국가 추가 UI */}
    </S.FormField>
  </S.FormRow>
</S.FormSection>
```

---

## 🔗 문제 2: 비슷한 성격의 사건 그룹핑

### 사례 분석

#### 예시 1: 군축 조약 시리즈

- 워싱턴 해군 군축 조약 (1922)
- 런던 해군 군축 조약 (1930, 1936)
- 제네바 의정서 (1925)

**관계:** 모두 "군축 협정"이라는 공통 주제

#### 예시 2: 혁명 시리즈

- 명예혁명 (1688)
- 프랑스 혁명 (1789)
- 러시아 혁명 (1917)

**관계:** 모두 "부르주아/사회주의 혁명"

#### 예시 3: 경제 위기

- 대공황 (1929)
- 오일 쇼크 (1973)
- 금융위기 (2008)

**관계:** 모두 "글로벌 경제 위기"

---

## 🎯 해결 방안

### 방안 1: 태그 시스템 (가장 간단) ⭐ 추천

**개념:**

- 기존 `tags` 배열 활용
- 특별한 prefix로 그룹 태그 구분

**예시:**

```typescript
// 워싱턴 해군 군축 조약
tags: ['#군축협정', '#해군', '1920년대', '국제조약']

// 런던 해군 군축 조약
tags: ['#군축협정', '#해군', '1930년대', '국제조약']

// 제네바 의정서
tags: ['#군축협정', '#화학무기', '1920년대']
```

**UI:**

```
검색/필터:
  태그: #군축협정
  → 워싱턴 조약, 런던 조약, 제네바 의정서 모두 표시
```

**장점:**

- 구현 매우 간단 (이미 tags 필드 있음)
- 유연함 (여러 그룹에 속할 수 있음)
- 검색 쉬움

**단점:**

- 명확한 그룹 구조 아님
- 태그 관리 필요

---

### 방안 2: 사건 시리즈 (Event Series) - 새 테이블

**개념:**

- 별도의 "사건 시리즈" 엔티티 생성
- 여러 사건을 하나의 시리즈로 묶음

**DB 스키마:**

```prisma
model EventSeries {
  id          String  @id @default(uuid())
  name        String // "군축 조약 시리즈"
  description String? // 시리즈 설명
  theme       String? // 공통 주제

  events Event[] // 이 시리즈에 속한 사건들
}

model Event {
  // ... 기존 필드
  seriesId String?
  series      EventSeries? @relation(...)
}
```

**UI:**

```
┌─ 군축 조약 시리즈 ────────────────┐
│ 📄 워싱턴 해군 군축 조약 (1922)   │
│ 📄 런던 해군 군축 조약 (1930)     │
│ 📄 런던 해군 군축 조약 (1936)     │
│ 📄 제네바 의정서 (1925)          │
└───────────────────────────────────┘
```

**장점:**

- 명확한 그룹 구조
- 시리즈별 통계/분석 가능
- 시리즈 자체에 설명 추가 가능

**단점:**

- DB 스키마 변경 필요
- 관리 복잡도 증가
- 1개 시리즈에만 속할 수 있음

---

### 방안 3: 연관 사건 강화 (Relation Type)

**개념:**

- 기존 `relatedEvents` 활용
- 관계 타입 명시

**DB 스키마:**

```prisma
model EventRelation {
  id            String       @id
  sourceEventId String
  targetEventId String
  relationType  RelationType // SERIES, CAUSE, EFFECT, SIMILAR
  note          String?

  sourceEvent    Event @relation("Source", ...)
  targetEvent    Event @relation("Target", ...)
}

enum RelationType {
  PARENT_CHILD // 계층 관계
  SERIES // 시리즈 관계 ⭐
  CAUSE // 원인
  EFFECT // 결과
  SIMILAR // 유사 사건
  CONTINUATION // 연속 사건
  PARALLEL // 동시 발생
}
```

**예시:**

```typescript
// 워싱턴 조약
relatedEvents: [
  {
    eventId: 'london-treaty-1930',
    type: 'SERIES',
    note: '동일 주제의 후속 조약',
  },
  {
    eventId: 'geneva-protocol-1925',
    type: 'SERIES',
    note: '군축 협정 시리즈',
  },
]
```

**UI:**

```
연관 사건:
  🔗 런던 조약 (1930) [시리즈]
  🔗 제네바 의정서 (1925) [시리즈]
  ➡️ 제2차 세계대전 (1939) [결과]
```

**장점:**

- 관계 명확히 구분
- 다양한 관계 타입 표현 가능
- 시각화 용이

**단점:**

- DB 스키마 변경 필요
- 양방향 관계 관리 복잡

---

### 방안 4: 카테고리 세분화

**개념:**

- 카테고리에 하위 분류 추가

**예시:**

```typescript
category: 'diplomatic'
subCategory: 'disarmament' // 군축
subTheme: 'naval' // 해군

또는

category: 'diplomatic'
tags: ['@군축', '@해군군축', '@국제조약']
```

**장점:**

- 기존 구조 크게 변경 없음
- 검색/필터 쉬움

**단점:**

- 유연성 낮음
- 미리 정의된 분류만 사용 가능

---

## 🎯 최종 추천

### 즉시 구현: 방안 1 (태그 시스템) ⭐

**이유:**

1. **즉시 사용 가능** - DB 변경 없음
2. **유연함** - 어떤 그룹도 만들 수 있음
3. **검색 친화적** - 태그 기반 검색 쉬움

**구현:**

```typescript
// 사건 등록 시
tags: [
  '#군축협정', // 그룹 태그 (# prefix)
  '#해군군축', // 세부 그룹
  '국제조약', // 일반 태그
  '1920년대', // 시대 태그
]
```

**UI 예시:**

```
┌─ 태그 ───────────────┐
│ 🏷️ #군축협정         │
│ 🏷️ #해군군축         │
│ 🏷️ 국제조약         │
│ 🏷️ 1920년대         │
│                      │
│ [+ 태그 추가]        │
└──────────────────────┘

검색:
  "#군축협정" 검색 시
  → 워싱턴, 런던, 제네바 조약 모두 표시
```

### 향후 확장: 방안 3 (관계 타입)

**장기적으로 더 나은 구조**

```prisma
model EventToEvent {
  id           String            @id
  fromEventId  String
  toEventId    String
  relationType EventRelationType
  note         String?
}

enum EventRelationType {
  PARENT_CHILD // 계층
  SERIES // 시리즈 (같은 주제)
  SEQUEL // 연속 (시간적 순서)
  CAUSE_EFFECT // 인과
  SIMILAR // 유사
  PARALLEL // 동시 발생
}
```

---

## 📝 구체적 구현 계획

### Phase 1: 관련 국가 등록 기능 (즉시)

#### 1-1. 상태 추가

```typescript
const [relatedCountries, setRelatedCountries] = useState<
  Array<{
    id: string // 임시 ID
    countryId?: string
    historicalCountryId?: string
    role: string
    roleDescription: string
    note: string
  }>
>([])
```

#### 1-2. UI 추가 (relationships 단계)

```jsx
<S.FormSection>
  <S.SectionTitle>
    <FiGlobe /> 관련 국가
  </S.SectionTitle>

  <S.FormRow>
    <S.AddButton onClick={handleAddCountry}>
      <FiPlus /> 국가 추가
    </S.AddButton>
  </S.FormRow>

  {relatedCountries.map((country) => (
    <S.CountryRelationCard key={country.id}>
      <S.CountryInfo>
        <span>{getCountryName(country)}</span>
        <S.RoleBadge>{country.role}</S.RoleBadge>
      </S.CountryInfo>
      <S.RoleDescription>{country.roleDescription}</S.RoleDescription>
      <S.CardActions>
        <button onClick={() => editCountry(country.id)}>수정</button>
        <button onClick={() => removeCountry(country.id)}>제거</button>
      </S.CardActions>
    </S.CountryRelationCard>
  ))}
</S.FormSection>
```

#### 1-3. 역할 옵션

```typescript
const COUNTRY_ROLE_OPTIONS = [
  { value: 'origin', label: '발생국' },
  { value: 'participant', label: '참여국' },
  { value: 'victim', label: '피해국' },
  { value: 'aggressor', label: '가해국' },
  { value: 'supporter', label: '지원국' },
  { value: 'mediator', label: '중재국' },
  { value: 'observer', label: '관찰국' },
  { value: 'affected', label: '영향받은 국가' },
  { value: 'other', label: '기타' },
]
```

### Phase 2: 태그 기반 그룹핑 (간단)

#### 2-1. 태그 UI 개선

```jsx
<S.FormRow>
  <S.FormLabel>태그</S.FormLabel>
  <S.FormField>
    <S.TagInput
      placeholder="태그 입력 (#으로 시작하면 그룹 태그)"
      onKeyDown={handleAddTag}
    />
    <S.TagList>
      {tags.map((tag) => (
        <S.TagChip $isGroup={tag.startsWith('#')}>
          {tag}
          <button onClick={() => removeTag(tag)}>×</button>
        </S.TagChip>
      ))}
    </S.TagList>
    <S.Hint>
      💡 # 으로 시작하는 태그는 시리즈 그룹으로 사용됩니다
      <br />
      예: #군축협정, #해군군축
    </S.Hint>
  </S.FormField>
</S.FormRow>
```

#### 2-2. 리스트 페이지에서 그룹 표시

```jsx
// events.page.ui.tsx에서
<S.GroupTag onClick={() => filterByTag('#군축협정')}>
  #군축협정 (3건)
</S.GroupTag>

// 클릭 시 해당 그룹의 사건들만 표시
```

---

## 🚀 즉시 구현 권장사항

### 1단계: 관련 국가 등록 (필수)

- ✅ 간단한 UI (국가 선택 + 역할 선택 + 설명)
- ✅ relationships 단계에 추가
- ✅ 군사/회담 사건은 기존 구조 유지

### 2단계: 태그 시스템 강화 (선택)

- ⏳ 그룹 태그 (#prefix) 도입
- ⏳ 태그 필터 UI 개선
- ⏳ 그룹별 사건 모아보기

### 3단계: 관계 타입 추가 (장기)

- ⏳ EventRelation 테이블 생성
- ⏳ 관계 타입 정의
- ⏳ 관계 시각화

---

## 📐 설계 결정 사항

### A. 계층 vs 시리즈 차이

| 특성 | 계층 (Hierarchy)                   | 시리즈 (Series/Group) |
| ---- | ---------------------------------- | --------------------- |
| 관계 | 포함 관계                          | 주제적 유사성         |
| 예시 | 제2차 세계대전 > 노르망디 상륙작전 | 군축협정 시리즈       |
| 구조 | 트리 (부모-자식)                   | 플랫 (태그/그룹)      |
| 중복 | 불가 (1개 부모만)                  | 가능 (여러 그룹)      |

### B. 군사 사건 vs 일반 사건

| 사건 타입 | 국가 등록 방식   | 데이터 구조        |
| --------- | ---------------- | ------------------ |
| 군사 사건 | belligerents     | 교전국 + 동맹 관계 |
| 회담 사건 | participants     | 참가국 + 조약 조건 |
| 일반 사건 | **countries** ⭐ | 관련국 + 역할      |

**통합 원칙:**

- 군사/회담: 기존 구조 유지 (상세 정보 필요)
- 기타: 간단한 countries 배열 사용

---

## 💻 구현 코드 예시

### 관련 국가 컴포넌트

```typescript
const CountryRelationManager: React.FC = () => {
  const [countries, setCountries] = useState<RelatedCountry[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [role, setRole] = useState('participant')
  const [description, setDescription] = useState('')

  const addCountry = () => {
    if (!selectedCountry) return

    setCountries([...countries, {
      id: crypto.randomUUID(),
      countryId: selectedCountry,
      role,
      roleDescription: description,
      note: ''
    }])

    // 초기화
    setSelectedCountry('')
    setRole('participant')
    setDescription('')
    setIsAdding(false)
  }

  return (
    <div>
      <button onClick={() => setIsAdding(true)}>
        + 국가 추가
      </button>

      {isAdding && (
        <AddCountryForm>
          <CountrySelect onChange={setSelectedCountry} />
          <RoleSelect onChange={setRole} />
          <DescriptionInput onChange={setDescription} />
          <button onClick={addCountry}>추가</button>
          <button onClick={() => setIsAdding(false)}>취소</button>
        </AddCountryForm>
      )}

      {countries.map(country => (
        <CountryCard key={country.id}>
          {/* 국가 정보 표시 */}
        </CountryCard>
      ))}
    </div>
  )
}
```

---

## 결론

### 즉시 구현

1. **관련 국가 등록 기능** - relationships 단계에 추가
2. **역할 타입** - 9가지 역할 중 선택

### 비슷한 사건 그룹핑

1. **단기:** 태그 시스템 (#prefix)
2. **중기:** 관계 타입 추가 (SERIES)
3. **장기:** EventSeries 테이블

**지금 구현할 것:**

- 관련 국가 등록 UI 추가
- 태그 시스템 가이드 추가
