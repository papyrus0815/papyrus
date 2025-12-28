# 사건 등록 페이지 리팩토링 가이드

## ✅ 완료된 작업

### 1. 비슷한 사건 기능 제거

- ✅ 상태 변수 제거: `similarEventIds`, `similar EventSearch`, `showSimilarEventList`
- ✅ ref 제거: `similarEventSelectorRef`
- ✅ 외부 클릭 핸들러에서 제거
- ✅ filteredSimilarEvents useMemo 제거
- ✅ API 전송 데이터에서 제거

### 2. 관련 국가 간소화

- ✅ 복잡한 구조 제거: 역할, 설명, 노트 등
- ✅ 간단한 ID 배열로 변경: `relatedCountryIds`, `relatedHistoricalCountryIds`

---

## ⏳ 남은 작업

### 3. UI에서 비슷한 사건 섹션 제거 필요

**위치:** relationships 단계 (약 2399-2538번 라인)

```tsx
// ❌ 삭제 필요
{
  /* 비슷한 사건 */
}
;<S.FormRow>
  <S.FormLabel>비슷한 사건</S.FormLabel>
  ...전체 섹션 삭제...
</S.FormRow>
```

### 4. 관련 국가 UI 간소화 필요

**현재 (복잡):**

```tsx
<S.CountryAddForm>
  <국가 타입 선택>
  <국가 선택>
  <역할 선택>  ← 삭제
  <역할 설명>  ← 삭제
  <추가/취소>
</S.CountryAddForm>
```

**변경 후 (간단):**

```tsx
<S.FormField>
  <S.Select>
    <option>국가 타입</option>
  </S.Select>
  <S.Select>
    <option>국가 선택</option>
  </S.Select>
  <S.AddButton>추가</S.AddButton>

  {/* 선택된 국가 목록 */}
  <S.SelectedCountriesList>
    {relatedCountryIds.map((id) => (
      <S.CountryChip>{국가명} [×]</S.CountryChip>
    ))}
  </S.SelectedCountriesList>
</S.FormField>
```

### 5. basic 단계로 이동 필요한 항목

**현재 위치:** relationships 단계 (2300번 라인~)
**이동할 위치:** basic 단계 (1558번 라인 이후)

**이동할 항목:**

1. 상위 사건 (parentEvent) - 2313번 라인
2. 관련 사건 (relatedEvents) - 2581번 라인
3. 태그 (tags) - 2399번 라인 (삭제된 비슷한 사건 다음)
4. 관련 국가 (countries) - 2591번 라인
5. 관련 인물 (persons) - 2798번 라인

**이동 순서 (basic 단계에서):**

```
기본 정보 단계:
1. 썸네일
2. 제목
3. 설명
4. 날짜/시간
5. 카테고리
------- 여기에 추가 -------
6. 상위 사건
7. 관련 사건
8. 태그
9. 관련 국가 (간소화)
10. 관련 인물
```

---

## 🔧 구현 방법

### Step 1: 관련 국가 UI 간소화

**삭제할 부분:**

- 역할 선택 드롭다운 (2655-2670)
- 역할 설명 입력 (2672-2682)
- RoleBadge, CountryDescription 표시 (2763-2771)

**간단한 버전:**

```tsx
<S.FormField>
  <S.FormGroup>
    <S.Select
      onChange={(e) => {
        const type = e.target.value
        if (type === 'modern') {
          // 현대 국가 선택 모드
        } else {
          // 역사적 국가 선택 모드
        }
      }}
    >
      <option value="">국가 타입 선택</option>
      <option value="modern">현대 국가</option>
      <option value="historical">역사적 국가</option>
    </S.Select>

    <S.Select>
      <option value="">국가 선택...</option>
      {/* 국가 목록 */}
    </S.Select>

    <S.AddButton onClick={handleAddCountry}>추가</S.AddButton>
  </S.FormGroup>

  {/* 선택된 국가들 */}
  <S.SelectedCountriesList>
    {relatedCountryIds.map((id) => {
      const country = availableCountries.find((c) => c.id === id)
      return (
        <S.CountryChip key={id}>
          <FiGlobe /> {country?.name}
          <button onClick={() => removeCountry(id)}>
            <FiX />
          </button>
        </S.CountryChip>
      )
    })}
  </S.SelectedCountriesList>
</S.FormField>
```

### Step 2: relationships 단계 내용 복사 → basic 단계에 붙여넣기

**복사할 코드 블록:**

1. 상위 사건 (2313-2443 라인)
2. 관련 사건 (2581-2697 라인)
3. 태그 (간소화 후)
4. 관련 국가 (간소화 후)
5. 관련 인물 (2798-2940 라인)

**붙여넣기 위치:**
`{currentStep === 'basic' && (` 블록 내부, 카테고리 선택 다음 (약 1920번 라인)

### Step 3: relationships 단계 제거 또는 비활성화

**옵션 A:** relationships 단계 완전 제거

```tsx
const steps = [
  { id: 'basic', label: '기본 정보' },
  { id: 'military', label: '군사 정보' }, // 군사/회담만
  { id: 'details', label: '내용 작성' },
  { id: 'location', label: '위치 정보' },
  // relationships 제거
]
```

**옵션 B:** relationships 단계 조건부 숨김

```tsx
const steps = [
  { id: 'basic', label: '기본 정보' },
  // ... 다른 단계들
].filter((step) => {
  // basic, details, location은 항상 표시
  if (['basic', 'details', 'location'].includes(step.id)) return true
  // military는 군사/회담 카테고리에서만
  if (step.id === 'military')
    return ['military', 'diplomatic'].includes(category)
  // relationships는 숨김
  return step.id !== 'relationships'
})
```

---

## 📝 필요한 스타일 컴포넌트

### 추가 필요:

```tsx
export const CountryChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;

  button {
    background: none;
    border: none;
    color: #6366f1;
    cursor: pointer;
    padding: 2px;
    display: flex;

    &:hover {
      color: #ef4444;
    }
  }
`

export const SelectedCountriesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`
```

---

## 🎯 최종 결과

### basic 단계 UI 구조:

```
┌─ 기본 정보 ──────────────────────┐
│ 📷 썸네일                         │
│ 📝 제목                          │
│ 📄 설명                          │
│ 📅 날짜/시간                      │
│ 📁 카테고리                       │
│ ─────────────────────────        │
│ 🔗 상위 사건                     │
│ 🔗 관련 사건                     │
│ 🏷️ 태그 (#군축협정, #해군)       │
│ 🌍 관련 국가 (프랑스, 영국)      │
│ 👤 관련 인물 (루스벨트, 처칠)    │
└───────────────────────────────────┘
```

### relationships 단계:

- 제거 또는 비활성화

---

## 💡 수동 작업 가이드

파일이 너무 커서 자동 리팩토링이 어렵습니다.
다음 순서로 수동 작업을 권장합니다:

### 1단계: 관련 국가 간소화 (2591-2796 라인)

```tsx
현재 라인 2591부터 시작하는 "관련 국가" 섹션을:
1. 역할 선택 부분 삭제 (2655-2670)
2. 역할 설명 부분 삭제 (2672-2682)
3. SaveButton, CancelButton → 간단한 AddButton으로 변경
4. CountryRelationCard → CountryChip으로 변경
```

### 2단계: basic 단계로 복사 (카테고리 다음, 1920번 라인)

```tsx
카테고리 선택 코드 (1832-1942 라인) 다음에:
1. 상위 사건 복사 (2313-2443)
2. 관련 사건 복사 (2581-2697)
3. 태그 복사 (간소화된 것)
4. 관련 국가 복사 (간소화된 것)
5. 관련 인물 복사 (2798-2940)
```

### 3단계: relationships 단계 제거 (2296-3000 라인)

```tsx
{currentStep === 'relationships' && (
  ...전체 섹션 삭제...
)}
```

---

현재 상태로는 기능은 추가되었지만, UI 위치 이동이 필요한 상황입니다.
수동으로 진행하시겠습니까, 아니면 단계별로 진행할까요?
