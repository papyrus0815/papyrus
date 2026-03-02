# 역대수반 계보도(Lineage Tree) 문제 검토

## 1. 현재 구조 요약

- **두 가지 렌더 모드**
  - **연도 기준** (`UnifiedYearBasedContainer`): `useYearBasedLayout && yearBasedLayout.positionByYear.size > 0` 일 때
    - 타임라인 연도와 카드 위치가 `yearToPixel(연도)`로 일치
    - 같은 퇴임년도 → 같은 `targetBottomPx` → 같은 bottom 유지
  - **그리드**: 위 조건이 아니면
    - 위치는 **행/열**(`placement.row`, `placement.col`) 기준
    - 카드 top/bottom은 **행 높이**(`rowHeights`)로만 결정됨 → **연도와 무관**

- **연도 기준이 켜지는 조건**
  - `variableCardHeight === true`
  - `yearRange != null` 이고 `yearRange.maxYear > yearRange.minYear`
  - `yearBasedLayout.positionByYear` 가 존재하고 **size > 0**

- **positionByYear 가 채워지는 조건**
  - `flatWithYear` = `rows.flat()` 중 `getStart(t) != null` 인 재임만
  - `getStart(t)` = `getYearFromDate(t?.startDate ?? t?.start_date)` → **startDate/start_date 중 하나라도 파싱 가능해야 함**
  - **한 건이라도 start가 null이면** 그 재임은 `positionByYear`에 **없음** → 연도 기준 분기에서는 **해당 카드 렌더 시 `return null`** (카드가 아예 안 그려짐)
  - **전부 start가 null이면** `positionByYear.size === 0` → **연도 기준 분기 자체가 안 타고 그리드로 감**

## 2. 사용자 증상별로 보는 원인

### 2.1 “같은 퇴임년도인데 bottom이 다르다” (바이에른 공작·작센 공작 등)

- **연도 기준이 제대로 타면**: `targetBottomPx = yearToPixel(item.end)` 로 동일 연도 = 동일 bottom 이어야 함.
- **실제로 다르게 보인다면**:
  1. **연도 기준이 아예 안 켜진 경우**  
     → 그리드 모드에서 **행(row)** 기준으로만 배치되기 때문. 같은 퇴임년도라도 다른 행이면 다른 bottom.
  2. **원인 후보**  
     - `yearRange`가 undefined (아래 2.3 참고)  
     - 또는 `positionByYear.size === 0` (날짜 파싱 실패로 flatWithYear가 비었거나, 일부만 들어감)

### 2.2 “로마왕 1138년 취임이 작센 공작보다 위에 있다” / “위치가 전혀 안 맞다”

- 연도 기준 모드에서는 **열(col)별로** 스태킹하고, 같은 연도면 `yearToPixel(연도)`로 같은 top.
- “로마왕이 작센 공작보다 위” = 로마왕 top < 작센 공작 top 이라면:
  - 데이터상 로마왕 취임년이 작센 공작보다 **이전**이면 의도된 결과일 수 있음.
  - 반대로 **같은 1138인데 한쪽만 위**라면:
    - 두 재임이 **서로 다른 열**(col)에 있고, 한 열에서만 겹침 보정 등으로 top이 당겨졌을 수 있음.
    - 또는 **연도 기준이 아니라 그리드**로 그려져서, “대수/행” 기준으로만 배치되어 연도와 어긋나 보일 수 있음.
- 정리: **연도 기준이 적용되지 않으면** (그리드로 빠지면) “연도와 위치 불일치”가 반드시 발생함.

### 2.3 “카드가 쪼그라든다” / “취임년도에 따라 카드 길이가 이상하다”

- 연도 기준에서는 `CARD_HEIGHT_MIN_YEAR_BASED`(240px)로 최소 높이를 강제하고 있음.
- **그리드**에서는 `tenureIdToCardHeight` fallback이 `t.startDate`/`t.endDate`만 사용.  
  - API가 snake_case(`start_date`/`end_date`)만 주면 여기서는 **undefined** → 연수 0 → 높이만 240 등으로 고정될 수 있고, 레이아웃이 단순 행 높이로만 잡혀서 “쪼그라든 것처럼” 보일 수 있음.
- “취임년도에 따라 카드 길이가 맞지 않다”는 말은 **연도 기준이 꺼져 있어서** 카드 높이가 “연도 구간”이 아니라 행/고정값으로만 잡히기 때문일 가능성이 큼.

### 2.4 “한 세기 길이가 짧아서 카드가 잘린다”

- `totalHeight = min(MAX_YEAR_BASED_HEIGHT, max(400, totalRange * PX_PER_YEAR_MIN))`
- `PX_PER_YEAR_MIN = 18` → 100년 ≈ 1800px.  
  사용자가 “한 세기를 더 길게”라고 한 것은 이 값을 키우거나, 세기당 픽셀을 더 주는 조정이 필요함.

## 3. 데이터/코드 쪽 확인 포인트

### 3.1 yearRange가 정말 채워지는가

- **전체 보기**: `mergedLineageAll`에서 `allTenures` 기준으로 `getYear(t.startDate)`, `getYear(t.endDate)` 로 minYear/maxYear 계산.
  - 여기서 **`t.startDate`만** 사용. API가 camelCase(`startDate`)를 주므로 보통은 문제 없음.
- **단일 직책**: `lineageYearRange`에서 `getY(t.startDate)`, `getY(t.endDate)` 사용.
  - 마찬가지로 `startDate`/`endDate`만 사용.  
  - 만약 특정 화면/API 경로에서 **snake_case만** 온다면 `yearRange`/`lineageYearRange`가 undefined가 되어 **연도 기준이 아예 꺼짐** → 위 2.1, 2.2 현상으로 이어짐.

### 3.2 positionByYear에 모든 카드가 들어가는가

- `flatWithYear`는 `getStart(t) != null` 인 것만 포함.
- lineage-tree의 `getStart`는 `t?.startDate ?? (t as any)?.start_date` 를 지원하지만,  
  heads 쪽 yearRange/lineageYearRange는 **start_date 미지원**.
- **일부 재임만** start가 없으면:  
  → 그 재임들은 positionByYear에 없음 → 연도 기준 분기에서 **해당 카드는 `return null`** → **빈 칸 또는 카드 누락**.

### 3.3 실제로 어떤 분기가 타는지

- 브라우저에서 다음을 확인하는 것이 좋음:
  - `useYearBasedLayout`
  - `yearBasedLayout.positionByYear?.size`
  - 현재 `yearRange` (minYear, maxYear)
- `positionByYear.size === 0` 이면 무조건 그리드 → “연도와 위치 불일치”, “같은 퇴임년도 다른 bottom” 모두 설명 가능.

## 4. 결론 및 수정 제안 방향

| 증상 | 가능한 원인 | 제안 |
|------|-------------|------|
| 같은 퇴임년도 다른 bottom | 연도 기준 미적용(그리드 사용) | yearRange/positionByYear가 왜 비는지 확인; 날짜 필드 통일(camel + snake) |
| 로마왕/작센 공작 위치 어긋남 | 그리드 모드이거나 열별 top 보정 | 연도 기준이 확실히 적용되도록 하고, 같은 연도 = 같은 top/bottom 검증 |
| 카드 쪼그라듦 / 길이 이상 | 그리드 fallback 또는 최소 높이 미달 | 연도 기준 진입 보장; 그리드에서도 snake_case 날짜 fallback |
| 한 세기 짧음 / 잘림 | PX_PER_YEAR_MIN 또는 totalHeight 상한 | PX_PER_YEAR_MIN 상향 또는 세기당 추가 배율 |

**우선 할 일**

1. **날짜 필드 통일**  
   - heads-of-state에서 `yearRange`/`lineageYearRange` 계산 시 `t.startDate ?? t.start_date`, `t.endDate ?? t.end_date` 사용해 snake_case도 처리.
2. **연도 기준 진입 보장**  
   - `getStart(t)`가 null이면 해당 카드는 positionByYear에서 빠지므로, **가능한 한** start/end 파싱 실패를 줄이기 (형식 다양하게 허용, fallback 연도 등).
3. **디버깅**  
   - 개발 시 `useYearBasedLayout`, `positionByYear.size`, `yearRange` 로그로 실제로 연도 기준이 켜지는지 확인.
4. **한 세기 길이**  
   - `PX_PER_YEAR_MIN` 상향 또는 “세기당 최소 px” 같은 옵션 추가로 카드 잘림 완화.

이 문서는 `LINEAGE_TREE_PROBLEM_REVIEW.md` 로 저장했고, 위 순서대로 수정하면 “문제가 뭔지”를 코드/데이터 기준으로 특정한 뒤 하나씩 해소할 수 있습니다.
