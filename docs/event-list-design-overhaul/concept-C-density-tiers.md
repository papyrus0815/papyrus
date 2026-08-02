# 리디자인 방향 C — 「밀도 계층 + 그룹 크롬 축소」

> **설계 명제**
> 한 벌의 행·헤더로 모든 상황을 맞추길 포기한다. **세로 픽셀의 소유권을 사용자에게 넘기고(밀도 3단), 크롬이 데이터에게서 빼앗은 세로를 되돌려준다(그룹 크롬 다이어트 + 레일 다이어트).**
> 이 목록의 병목은 가로가 아니라 세로다 — 1440×900에서 17,903px을 604px 창으로 훑는다(30화면). 가로 412px이 비는 것은 낭비지만, 세로 6,336px(35.4%)이 크롬인 것은 **과업 실패**다.

---

## 0. 이 안이 내리는 세 개의 판정

| 질문 | 판정 | 근거 |
|---|---|---|
| **1행짜리 연 그룹 50개(57%)를 어떻게 하나** | **시각 헤더를 렌더하지 않고, 그 행의 선두 토큰을 `YYYY.M.D`로 승격한다.** 여러 해를 한 밴드로 묶지 **않는다**. | 밴드 병합은 `YearSection[role=group]` + `GroupHeading` + `aria-labelledby` 3중 계약(회귀 금지 2)을 반드시 깬다 — 한 밴드가 여러 연도를 라벨하려면 연도 단위 group을 해체해야 한다. 헤더만 안 그리면 DOM·ARIA는 **한 글자도 안 바뀐다**. §3.1 |
| **좌측 70px 레일 거터의 존폐** | **거터는 36px로 축소해 존치. 행 단위 도트·커넥터(504개)는 전면 폐지. 눈금은 세기·연도 헤더에만 남긴다.** | RHYTHM-1의 지적("등간격 도트가 시간을 인코딩하지 않는다")은 옳다 — 하지만 결론은 '거터 폐지'가 아니라 '**도트 폐지 + 시간 인코딩은 그룹 간 여백이 맡음**'이다. 세기·연도 sticky 앵커는 좌측 단일 축이 있어야 '지금 어느 시대'가 읽힌다. §4 |
| **밀도 모드의 정본 저장소** | **`localStorage: papyrus.events.listDensity`가 정본. URL `?density=`는 읽기 전용 초기 오버라이드.** | `wideMode`(WIDE_MODE_KEY, events.page.tsx:108/142)와 정확히 같은 패턴. 밀도는 '이 사용자의 눈'에 붙는 값이지 '이 링크가 가리키는 것'이 아니다. §5.3 |

---

## 1. 헤드라인 — 실측 기반 예측치

| 지표 | 현행 | C · 기본(cozy) | C · 조밀(compact) | C · 조밀 + '연도 모두 접기' |
|---|---:|---:|---:|---:|
| 스크롤 총량 | 17,903px | **12,543px (−30%)** | **10,135px (−43%)** | **4,431px (−75%)** |
| 목록 위 크롬(1440) | 279px | 188px | 188px | 188px |
| 목록 가시 높이 | 604px | 695px | 695px | 695px |
| 화면당 실사건 행 | 8.5행 | **14.0행 (+65%)** | **17.3행 (+104%)** | — |
| 총 화면 수 | 29.6 | **18.0** | **14.6** | **6.4** |
| 그룹 크롬 비중 | 35.4% | 16.0% | 15.8% | — |
| 모바일 390 총 화면 | 59 | 28.4 | 25.0 | — |
| 행 안 죽은 폭(1440 무선택) | 412px | **0px**(278px는 카드 *밖* 여백) | 0px | 0px |
| 행당 유채색 마크 | 최대 5 | **최대 2**(칩 + 국기) | 2 | 2 |

**계산 근거(cozy)**: 행 252×40 = 10,080 / 연 헤더 38개×36 = 1,368(50개는 헤더 없음) / 세기 헤더 12×40 = 480 / 세기 간 여백 11×16 = 176 / 결번 rule 18×20 = 360 / 하단 79 → **12,543**.
**(compact)**: 252×32 = 8,064 / 38×30 = 1,140 / 12×36 = 432 / 11×12 = 132 / 18×16 = 288 / 79 → **10,135**.

---

## 2. 밀도 계층 (Density Tiers)

### 2.1 토큰 — `theme.ts`에 단일 출처

```ts
// pages/events/styles/theme.ts
export type ListDensity = 'compact' | 'cozy' | 'roomy'

/** 목록 행·그룹 크롬의 세로 예산. 가로 슬롯 폭도 여기서만 나온다. */
export const LIST_DENSITY = {
  compact: {
    rowMinH: 32, rowPadY: 3, rowGap: 6, rowPadL: 10, rowPadR: 12,
    tree: 22, date: 62, chip: 56, act: 24, indent: 16,
    title: '13px', meta: '11px', chip_fs: '10px',
    yearHeaderH: 30, yearHeaderMt: 8, yearHeaderMb: 2,
    centuryHeaderH: 36, centurySectionGap: 12,
    rowMinH_narrow: 56,
  },
  cozy: {   // 기본값
    rowMinH: 40, rowPadY: 6, rowGap: 8, rowPadL: 12, rowPadR: 16,
    tree: 26, date: 66, chip: 60, act: 26, indent: 20,
    title: '14px', meta: '12px', chip_fs: '10.5px',
    yearHeaderH: 36, yearHeaderMt: 10, yearHeaderMb: 4,
    centuryHeaderH: 40, centurySectionGap: 16,
    rowMinH_narrow: 64,
  },
  roomy: {
    rowMinH: 48, rowPadY: 9, rowGap: 10, rowPadL: 14, rowPadR: 18,
    tree: 28, date: 70, chip: 64, act: 28, indent: 24,
    title: '15px', meta: '12px', chip_fs: '11px',
    yearHeaderH: 44, yearHeaderMt: 14, yearHeaderMb: 6,
    centuryHeaderH: 48, centurySectionGap: 24,
    rowMinH_narrow: 72,
  },
} as const
```

`TYPE_SCALE`은 사문화 상태(선언 4단 중 목록이 쓰는 값 1개)이므로 **행 전용 3단을 명시 추가**하고 목록은 리터럴 대신 이것만 소비한다 — 10 / 10.5 / 11 / 12 / 14 / 13.333(유령) 6단 → **3단**. `letter-spacing`은 제목 `-0.005em`, 나머지 전부 `0` (5종 → 2종). **[TYPE-10, TYPE-15]**

```ts
TYPE_SCALE.listRow = {
  compact: { title: '13px', meta: '11px', chip: '10px' },
  cozy:    { title: '14px', meta: '12px', chip: '10.5px' },
  roomy:   { title: '15px', meta: '12px', chip: '11px' },
}
```

### 2.2 CSS 변수 배선 — 소비처는 변수만 읽는다

`CompactList`가 `data-density` 속성을 받고 변수를 한 번만 선언한다. 행·헤더·스켈레톤이 전부 이 변수를 읽으므로 **밀도 분기가 컴포넌트마다 흩어지지 않는다**.

```
CompactList[data-density='cozy'] {
  --row-min-h: 40px;  --row-pad-y: 6px;  --row-gap: 8px;
  --row-pad-l: 12px;  --row-pad-r: 16px;
  --row-tree: 26px;   --row-date: 66px;  --row-chip: 60px;
  --row-act: 26px;    --row-indent: 20px;
  --row-title: 14px;  --row-meta: 12px;  --row-chip-fs: 10.5px;
  --year-h: 36px;     --year-mt: 10px;   --year-mb: 4px;
  --century-header-h: 40px;              /* ← 기존 변수. 밀도에 편입 */
  --century-gap: 16px;
  --rail-inset: 19px;                    /* ← 기존 변수. 값만 변경 */
}
```

> ⚠️ **회귀 금지 4 준수**: `--rail-inset` / `--century-header-h`는 **변수 이름과 소비처를 그대로 둔 채 값만** 밀도에 묶는다. `YearDivider{top: var(--century-header-h)}`가 자동으로 따라와야 두 sticky 띠 사이 슬릿이 안 생긴다(list.styles.ts:766 주석의 그 함정).

### 2.3 행 높이 — 왜 이 숫자인가

현행 45px의 정체: `padding 8+8 + border 1 + 콘텐츠 28px(BookmarkBtn)`. **행 높이의 60%가 데이터가 아니다.** 타이포 최대 높이는 칩 19.8px·제목 18.2px뿐. **[SPACE-5]**

| 밀도 | 계산 | 지배값 | 데스크톱 | 모바일(2줄) |
|---|---|---|---|---|
| compact | 3+3+1+24(act) = 31 | `min-height:32` | **32px** | 56px |
| cozy | 6+6+1+26 = 39 | `min-height:40` | **40px** | 64px |
| roomy | 9+9+1+28 = 47 | `min-height:48` | **48px** | 72px |

`min-height`가 항상 계산값보다 크게 잡혀 **행 높이 고유값이 1종으로 고정**된다(현행 2종). 스캔 리듬 유지는 이 목록의 전제다(ADAPT-6의 '3줄 붕괴' 재발 방지).

액션 버튼 24/26/28px — **compact의 24×24는 WCAG 2.2 SC 2.5.8 AA 최소치와 정확히 일치**하며 그 아래로 내려가지 않는다. 행 높이를 더 줄이려면 버튼을 hover-only로 숨겨야 하는데, 북마크는 *상태 표시*라 숨길 수 없다. 대신 **요약 버튼(FiLayers)을 행에서 제거**해 액션 열을 72→32px로 축소한다(§3.4).

### 2.4 컨트롤·저장·고지

- **컨트롤**: `ViewSwitcherRow`의 '넓게' 버튼 **왼쪽**에 3-way 세그먼트(아이콘만, 66px).
  `role="radiogroup" aria-label="목록 밀도"` + 3개 `role="radio" aria-checked`.
  라벨: `조밀` / `기본` / `편안` (title 속성에 `조밀 — 행 높이 32px, 한 화면 약 17행`).
  ≤900px에서는 '더보기(⋯)' 드롭다운 안으로, ≤640px에서는 필터 바텀시트 안으로.
- **저장**: `localStorage['papyrus.events.listDensity']`(정본) / `?density=compact|cozy|roomy`(초기 오버라이드, 마운트 1회만 읽음). 기본값 **`cozy` 고정** — `wideMode`처럼 뷰포트로 자동 추정하지 **않는다**. 밀도는 과업 의존적이라 사용자 선택이 우선이며, 자동 추정은 "왜 어제와 다르지"를 만든다.
- **a11y 고지**: **새 live region을 만들지 않는다**(회귀 금지 2 — 목록 라이브 영역은 이미 `event-compact-list.tsx:379`의 `role="status" aria-live="polite"` 하나로 통합돼 있다). 그 문장 끝에 `· 밀도 기본` 을 append한다. 예: `사건 252행 표시 중 · 밀도 조밀`.
- **스크롤 앵커 보존**: 밀도 변경은 전 행의 높이를 바꾸므로 보고 있던 위치가 튄다. 변경 **전** 스크롤러 상단에 걸친 첫 `[data-event-id]`를 기록 → 변경 후 `scrollIntoView({ block: 'start', behavior: 'instant' })`. `prefers-reduced-motion` 무관(항상 instant, 높이 transition 금지).

---

## 3. 그룹 크롬 다이어트

### 3.1 헤더리스 연 그룹 — 회귀 금지 1·2를 지키면서 시각 헤더만 없애는 방법

**문제 규모**: 연 그룹 88개 중 **50개(57%)가 사건 1건**. 1행 그룹 = 헤더 63px + 행 45px = 108px, 그중 58%가 크롬. 50개가 5,373px(전체의 30%)을 점유. **[SPACE-3, RHYTHM-3, SPACE-11]**

**렌더 트리 — 바뀌는 것은 `YearDivider` 한 줄뿐이다.**

```jsx
<List.YearSection role="group" aria-labelledby={yearHeadingId}>   {/* ✅ 그대로 */}
  <List.GroupHeading id={yearHeadingId} aria-level={4}>            {/* ✅ 그대로(시각 숨김) */}
    {`${formatYearLabel(year)} — 사건 ${n}건${gapNote}`}
  </List.GroupHeading>

  {hasYearHeader && (                                             {/* ⬅ 유일한 변경 */}
    <List.YearDivider …>…</List.YearDivider>
  )}

  <List.RowList role="list" aria-labelledby={yearHeadingId}>       {/* ✅ 그대로 */}
    {rows.map(r => <EventListItem … groupYear={hasYearHeader ? year : null}
                                    dateMode={hasYearHeader ? 'md' : 'ymd'} />)}
  </List.RowList>
</List.YearSection>
```

- **sticky containing block(회귀 금지 1)**: `YearSection` 박스는 그대로 생성된다. sticky할 요소가 없을 뿐이라 34겹 적층 회귀는 구조적으로 불가능. 세기 sticky는 `CenturySection`이 계속 담당.
- **헤딩 탐색·aria-labelledby(회귀 금지 2)**: `GroupHeading`·`role=group`·`aria-labelledby`·`aria-level`이 전부 유지되므로 **스크린리더 경험은 변화 0**. 시각 사용자만 63px을 돌려받는다.
- **판정 기준**: `buildYearBuckets`가 `headerlessYears: Set<number>` 를 함께 방출한다(그룹 루트 수 `yearRootCount === 1` **그리고** 렌더 행 수 `eventsByYear.get(y).length === 1`). 두 조건을 다 봐야 `'1908년 1' 아래 12행`(RHYTHM-8이 실측한 18개 그룹)이 헤더를 잃지 않는다.
- **접기 계약**: 헤더가 없으면 접을 수단도 없다 → **접기 대상에서 제외**. 페이지가 소유한 `collapsedYears`에 그 연도가 남아 있어도 행이 사라지지 않게 **fail-closed 가드**를 렌더와 `useEventHierarchy`의 `isCollapsedAway` 계산 **양쪽**에 건다:
  `const collapsed = collapsedYears.has(y) && !headerlessYears.has(y)`
  헤더리스 판정은 `buildYearBuckets` 단일 출처에서만 나온다(회귀 금지 3 — 평탄화·접힘 판정의 이중화 금지).

**보상 — 행 선두 토큰이 연도를 흡수한다.**
`rowDateLabel`에 `dateMode` 축을 추가한다(기존 precision 가드는 그대로).

| 상황 | 현행 | C |
|---|---|---|
| 그룹 헤더 있음 · day 정밀도 | `6.13` | `6.13` |
| 그룹 헤더 있음 · month | `6월` | `6월` |
| 그룹 헤더 있음 · year | `''` | `''` |
| **헤더리스 · day** | `1996`(연도만) | **`1996.4.3`** — 연도 파트만 `600`, 월·일 `500` |
| **헤더리스 · month** | `1996` | **`1996.4`** |
| **헤더리스 · year** | `1996` | **`1996`** |
| 오프그룹 자식(부모와 다른 해) | `(1893)` | `(1893)` 유지 |
| BC | `기원전 1046` (~72px) | **`BC 1046`** (~45px), `title`/aria는 `기원전 1046년` **[ADAPT-11]** |

### 3.2 남는 38개 헤더 — 밀도별 축소 + 위계 재배분

| | 현행 | compact | cozy | roomy |
|---|---:|---:|---:|---:|
| 연 헤더 블록 | 63px (mt22 + pad8/8 + 라벨33 + mb8) | **30** | **36** | **44** |
| 세기 헤더 | 44px | **36** | **40** | **48** |
| 세기 섹션 간 | 28px | **12** | **16** | **24** |

**세기 ↔ 연도 위계를 1.14× → 1.5× 이상으로 벌린다 [RHYTHM-7]**

| 채널 | 세기 | 연도 | 비 |
|---|---|---|---|
| 타입 | **20px / 800 / -0.02em** (현행 16/800) | 14px / 700 | 1.43× |
| 앞 여백 | `--century-gap` 16 | `--year-mt` 10 | — |
| hairline | **하단 1줄만**(상단 제거 — 경계는 여백이 만든다) | 상단 1줄 유지 | 1:1 → 역할 분리 |
| 레일 도트 | **14px**(링 3px) | **9px**(링 2.5px) | 1.56× |
| 배경 | **솔리드** `#ffffff` / `#141414` (backdrop-filter 2줄 제거) **[RHYTHM-5]** | 솔리드(현행 유지) | — |

`backdrop-filter: blur(10px) saturate(160%)` 제거는 20세기 섹션(1,767px)에서 상시 stuck인 표면의 18~22% 비침을 없애고, 스크롤 중 프레임당 재합성 비용도 없앤다.

### 3.3 카운트 표기 통일 [RHYTHM-8, TYPE-4, ALIGN-14]

현행: 세기 `'30건'`(우측 끝, 12/600 tertiary 2.54:1) / 연도 `'6'`(라벨 옆, **specificity 버그로 14/700 primary** → "2026년 6"이 '6월'로 읽힌다) / 접힘 `'6행이 접혀있습니다'`.

**C의 단일 규칙** — 두 헤더 모두 **우측 끝 72px 셀, 12px/600, metaText(4.83/7.19:1)**:
- 자식 없음: `30건`
- 렌더 행 ≠ 그룹 루트: `5건 · 7행`
- 접힘: `5건 · 7행 접힘`
- `YearDivider span { font-size:14px; font-weight:700 }`(list.styles.ts:671)을 **`& > span`으로 좁혀** `CollapsedCount`가 부모 규칙에 먹히던 버그를 구조적으로 제거하고, 인라인 `CollapsedCount`는 삭제(우측 셀로 이동).

### 3.4 접기가 실제로 공간을 아끼게 [RHYTHM-9, RHYTHM-10, SPACE-11]

- `CollapsedPlaceholder`: `margin 1/4 → 0/2`, `padding 4 → 2`, `min-height 18px` (29 → **20px**)
- 접힌 연 헤더 `margin-bottom → 2px`
- **세기 접힘에도 동일한 placeholder를 렌더** — 지금은 93행짜리 20세기를 접으면 완전한 공백이라 '데이터 없는 세기'와 구별이 안 된다. 문구는 §3.3 어휘로 `20세기 — 93건 · 118행 접힘`.
- **툴바에 '연도 접기' 토글 추가** — 88클릭 → 1클릭. 헤더 있는 38개만 대상(헤더리스 50개는 이미 최소). 결과 스크롤 **10,135 → 4,431px**, 6.4화면에 전 세기 골격이 들어온다.
- **행에서 요약 버튼(FiLayers) 제거** → 계층 조작을 tree 셀 하나로 수렴(§4.3). 액션 열 72 → 32px.

### 3.5 결번(gap) 인코딩 — 크롬을 줄이면서 시간 정보는 늘린다 [RHYTHM-1]

인접 연 그룹 87쌍 중 18쌍이 10년 이상 결번(최대 203년), 12세기는 데이터가 통째로 없다. 그런데 전부 같은 63px이다.

`buildYearBuckets`가 그룹마다 `gapYears`(직전 그룹과의 차)를 방출하고, `YearSection`에 `data-gap` 을 준다.

| Δ(연) | 앞 여백 | 시각 rule |
|---|---|---|
| 1 | 0 (hairline만) | 없음 |
| 2–9 | 8px | 없음 |
| 10–49 | 20px | 중앙 1px 점선 + `12년 기록 없음` (10.5px/500 metaText, `aria-hidden`) |
| 50+ | 28px | 동일, `203년 기록 없음` |
| 빈 세기(12세기) | `--century-gap` × 1.5 | 뮤트 밴드 + `12세기 — 기록 없음` |

- 텍스트는 시각 rule에 `aria-hidden`을 걸고 **`GroupHeading` 문구에 편입**한다: `1002년 — 사건 1건 · 직전 기록과 203년 간격`. 새 랜드마크·라이브 영역 0개.
- 이 rule은 헤더리스 구간(옛 세기에 밀집)에서 **유일하게 남는 그룹 크롬**이 된다 — 크롬 총량은 줄고 시간 정보량은 늘어나는 교환.
- 추가 비용: 18개 × ~20px = 360px (전체의 2.9%).

---

## 4. 레일 — 존폐 판정과 그 결과

### 4.1 판정

> **행 도트·커넥터는 폐지. 거터는 70 → 36px로 축소해 존치. 눈금은 세기(14px)·연도(9px) 2단만.**

**폐지 근거 (진단 4건이 한 지점을 가리킨다)**
- 도트가 나르는 유일한 정보(카테고리)를 **145px 옆 칩이 이미 한글 텍스트로** 말한다. 2026-07-22 설계기록이 `[EL-5]`를 기각한 사유("도트 이중 인코딩")가 실제로는 그대로 배포됐다 — 도트 + 칩 tint + 칩 라벨 hue = 3중. **[TYPE-3]**
- 다크에서 최빈 3개 카테고리 도트가 1.78~2.85:1로 WCAG 1.4.11 미달 — 해당 행이 **161/252(64%)**. 라이트는 통과 → 같은 화면이 테마에 따라 다른 위계로 읽힌다. **[TYPE-2]**
- 행을 선택하면 그 도트(11px)가 자기 연도 앵커(10px)보다 커져 **눈금 서열이 상시 역전**된다. **[RHYTHM-6]**
- 자식 행 도트가 최상위와 같은 좌표·크기라 85개 자식이 1급 정거장으로 보인다(축만 보면 252건, 연대기 앵커는 167건). **[RHYTHM-16]**
- 부수 해소: stuck 헤더의 좌측 38px을 관통하던 행 도트·커넥터가 **소멸**한다 — 오클루전 `left` 좌표를 손댈 필요조차 없어진다. **[RHYTHM-4]**

**존치 근거 (완전 폐지하지 않는 이유)**
- 세기·연도 sticky 헤더의 앵커 도트가 좌측 단일 축 위에 있어야 '지금 어느 시대인가'가 스크롤 중 읽힌다. 축을 없애면 헤더가 그냥 텍스트 줄이 된다.
- `--rail-inset` 변수가 이미 `YearDivider` / `CenturyDivider` / `CollapsedPlaceholder` / `Stop::before/::after`의 단일 출처(회귀 금지 4)라 **값만 바꾸면 전부 자동 추종**한다 — 비용 S.
- 폐지하면 `CollapsedPlaceholder`의 '압축 구간' 은유와 `UnknownYearDivider`의 hollow 도트 강등 신호가 함께 죽는다.

### 4.2 새 좌표

| | 현행 | C (≥1025px) | ≤1024px | ≤640px |
|---|---:|---:|---:|---:|
| `CompactList` padding-left | 70px | **36px** | **24px** | 24px(유지) |
| 레일선 x (컨테이너 기준) | 31~32 | **17~18** | 11~12 | 11~12(유지) |
| `--rail-inset` | 38px | **19px** | 13px | 12px(유지) |
| 스파인 alpha | 0.22 (1.38:1) | **0.34 (~1.7:1)** | 0.34 | 0.34 |
| 레일 꼬리 | 마지막 행 아래 215px 연장 | `background-size: 100% calc(100% - var(--rail-tail))`, `--rail-tail: 96px` + 종단 캡(가로 hairline 16px + 6px hollow 도트) **[RHYTHM-15]** | | |

- 641~1024 대역에 거터 축소 미디어쿼리가 **처음 생긴다** — 834px에서 제목 가용 폭 +46px. **[SPACE-10]**
- 도트가 사라져 '축이 눈금보다 흐리다'는 역전(1.38 < 1.68)은 **구조적으로 불가능**해진다. **[RHYTHM-2]**
- 회수한 34px은 전부 §3.1의 날짜 셀 승격(36 → 66px)에 재투자된다. **리딩 거터 총량은 줄지 않는다** — 정직하게 SPACE-9는 미해소(§8).

### 4.3 계층 신호를 tree 셀 하나로 수렴 [ALIGN-12]

현행: 셰브론(x=105) + 자식수 배지(제목 뒤 가변 x) + 요약 버튼(x=919) — 한 개념이 세 지점.
C: **`[▸ 3]` 단일 컨트롤**(폭 `--row-tree` 22/26/28 × 20px)로 병합.
- 셰브론 11px + 카운트 10px/600. `aria-label`은 현행 문구 그대로(`하위 사건 3개 펼치기`), 카운트는 `aria-hidden`(중복 낭독 방지 — 현행 정책 유지).
- 요약(FiLayers)은 **드로어 안으로 강등**. 행 액션은 북마크 단독 → 액션 열 72 → 32px, 회수분은 제목·국기로.
- `ChildCountBadge`가 제목 뒤에서 사라져 제목→기간 사이 가변 삽입 토큰이 하나 줄어든다.

---

## 5. 행 레이아웃 — 열·폭·타입·색

### 5.1 슬롯 정의 (1440 / cozy / 무선택)

| 슬롯 | 폭 | 정렬 | 축소 | 문서 x(좌) |
|---|---:|---|---|---:|
| 카드 좌측 여백 | 21 | — | — | 0 |
| 카드 border | 1 | — | — | 21 |
| **거터(레일)** | 36 | 레일선 x=17 | 고정 | 22 |
| `Stop` padding-left | `--row-pad-l` 12 | — | 고정 | 58 |
| **tree** `[▸N]` | `--row-tree` 26 | 중앙 | `flex-shrink:0` | 70 |
| gap | `--row-gap` 8 | | | 96 |
| **date** | `--row-date` **66** | **우측 정렬**, tabular | `flex-shrink:0` | 104 |
| gap | 8 | | | 170 |
| **chip** | `--row-chip` **60** | `justify-content:flex-start` | `flex-shrink:0` | 178 |
| gap | 8 | | | 238 |
| **title** | `flex:0 1 auto`, `min-width:12ch`, 가용 ~612px | 좌 | 유일한 축소 대상 | **246** |
| matchReason | `flex:0 1 auto`, 제목 셀 뒤 | 좌 | 축소 | 가변 |
| **duration** | auto(최대 58) | 우 | 0 | 가변 |
| **flags** | auto, `max-width:168px` | 좌 | 1 | 가변 |
| **actions** | `--row-act` 26 + pad-l 8 = 34 | `margin-left:auto` | 0 | **1090** |
| `Stop` padding-right | `--row-pad-r` 16 | | | 1124 |

**핵심 변경 3가지**
1. `Body { max-width: 880px }` **제거**. 폭 소유권을 `CatalogSection`으로 올린다: `width: min(100%, 1120px)`, **좌측 정렬**(중앙 정렬 금지 — 목록의 좌측 스캔선이 폭에 따라 흔들린다). 1440에서 카드 밖 278px, 1920에서 758px이 **카드 밖 여백**이 된다. 같은 빈 픽셀이라도 행 *안*에 있으면 '깨진 행', *밖*에 있으면 '여백'이다. **[SPACE-1]**
2. `Year { min-width:36px }` → **`width: var(--row-date); text-align: right`**. 우측 정렬이면 `6.13` / `12.31` / `1996.4.3` / `BC 1046`의 끝자리가 한 축에 서고, 짧은 `M.D` 행에서 앞이 비는 것이 '연도 생략됨'을 형태로 말한다. 날짜 x 고유값 **3종 → 1종**(depth 제외). **[ALIGN-5]**
3. `CategoryLabel`에 `width: var(--row-chip)` — 칩 폭 4종(34/43/52/56)이 만들던 제목 좌측선 4단이 소멸. 제목 x 고유값 **11종 → 2종**(depth 0: 246 / depth 1: 266). 완전 1종은 들여쓰기를 행→셀로 옮겨야 하고 그건 grid 전환(ALIGN-1/3)이므로 **이 안의 범위 밖**.

들여쓰기: `margin-left: calc(var(--depth) * var(--row-indent))` — 22px 하드코딩(어떤 모듈과도 비정합, 8px 그리드 밖) → **16/20/24px**로 밀도 연동. depth 1이 tree 셀 우측 경계에 정확히 착지한다. **[ALIGN-13, ADAPT-10]**

### 5.2 타입·색 토큰

| 슬롯 | size / weight | 라이트 | 다크 | 대비(라이트/다크) |
|---|---|---|---|---|
| 제목 | `var(--row-title)` / **700** | `TITLE_TEXT` `#0f172a` | `#f1f5f9` | 17.9 / 16.8 |
| 제목(문맥 강등) | 동일 / **500** | `metaText` `#6b7280` | `#a1a1aa` | 4.83 / 7.19 |
| **날짜(연도 파트)** | `var(--row-meta)` / **600** | **`#4b5563`** | **`#d4d4d8`** | **7.56 / 12.46** |
| 날짜(월·일 파트) | `var(--row-meta)` / 500 | `#6b7280` | `#a1a1aa` | 4.83 / 7.19 |
| 카테고리 칩 | `var(--row-chip-fs)` / **500**(현행 600) | soft.text | soft.textDark | 5.37~8.70 / 8.83~9.62 |
| 기간·근거 | `var(--row-meta)` / 500 | metaText | metaText | 4.83 / 7.19 |
| **'조건 밖 N'** | `var(--row-meta)` / **600** + 1px 점선 밑줄 | **`#2563eb`** | **`#93c5fd`** | 5.17 / 8.9 |
| 자식수(tree 안) | 10px / 600 | text.secondary | text.secondary | 4.36 / 6.36 |
| 국가 칩 이름 | `var(--row-chip-fs)` | text.secondary | text.secondary | 4.36 / 6.36 |
| **'+N' 오버플로** | `var(--row-chip-fs)` | **metaText**(현행 tertiary 2.29:1) | metaText | 4.36 / 6.36 |
| 그룹 카운트 | 12px / 600 | metaText | metaText | 4.83 / 7.19 |

**[TYPE-1] 정렬 키가 행에서 가장 약하던 역전을 뒤집는다** — 날짜 12/500 → **12/600 + `#4b5563`(7.56:1)**, 칩 600 → 500. 결과 사다리 `제목 14/700 → 날짜 12/600 → 칩 10.5/500`이 **크기·굵기 양축에서 단조**가 된다. 제목 확대(14→15는 roomy에서만)는 행 높이 0 증가 — 라인박스 18.2px 대비 여유가 있다.

**색 예산 재정리 (행당 유채색 마크 5 → 2)**
- 레일 도트 hue 소멸(§4) → 카테고리 hue는 **칩 단독**. 목록↔타임라인↔격자 색 통일 canon(LEDGER hue)은 그대로. **[TYPE-3]**
- **amber는 북마크 전용으로 예약**한다. `MatchReasonKind`는 중립으로 강등(bg `rgba(15,23,42,.06)`/`rgba(255,255,255,.08)`, 텍스트 metaText) — 현행은 `종교` 카테고리 칩과 **hex가 두 테마 모두 완전히 동일**해 '종교 사건 + 검색 매칭' 행에서 픽셀 단위로 같은 색이 됐다. **[TYPE-6, RHYTHM-13]**
  > ⚠️ TYPE-6(amber=북마크 전용)과 RHYTHM-13(amber=검색 전용)은 처방이 상충한다. **C는 TYPE-6를 채택** — 북마크는 *상태*라 형태(fill)만으로는 스캔 중 잡히지 않지만, 검색 하이라이트는 배경 fill이라는 별도 채널을 이미 쓴다.
- 북마크 ON `#f59e0b`(라이트 **2.15:1**, OFF 4.00:1보다 흐림) → **라이트 `#b45309`(5.02) / 다크 `#f59e0b`(8.58)**. **[TYPE-7]**
- 검색 `Mark`가 `color:inherit`이라 다크 매칭근거가 **1.99:1**로 붕괴 → 색을 **강제**: 라이트 `bg #fde68a / color #0f172a`(14.33:1), 다크 `bg #fbbf24 / color #1c1917`(10.48:1). **[TYPE-5]**
- 이모지 국기: 정지 상태 `filter: saturate(0.75)`, hover/active 행에서만 `saturate(1)`. `NameText` 10px → `--row-chip-fs`에 합류. **[TYPE-12]**
- `Stop`의 전역 `font-variant-numeric: tabular-nums` 제거 → `Year`·`Duration`·카운트에만 국소 적용. 제목 43%(109행)가 숫자를 포함해 최대 7px씩 넓어지던 손실 회수. **[ALIGN-10]**

### 5.3 상태

| 상태 | 표현 | 근거 |
|---|---|---|
| **default** | 배경 투명 + 하단 hairline `rgba(15,23,42,.05)` / `rgba(255,255,255,.05)` | 현행 유지 |
| **hover** | bg `rgba(15,23,42,.04)` / `rgba(255,255,255,.05)`. 국기 `saturate(1)` 복원 | |
| **선택(active)** | 좌측 `inset 3px 0 0 #2563eb` + bg tint **라이트 `rgba(37,99,235,.08)`**(현행 .13) / **다크 `.16`**(현행 .22) + `border-radius 6px` | 현행 tint 위 metaText가 **4.04:1**(AA 미달). 화살표 내비 중 상시 상태라 심각. alpha를 낮추면 4.62:1 통과, 식별은 좌측 막대가 담당. **[TYPE-14]** |
| **focus-visible** | `outline: 2px solid #2563eb / #93c5fd; outline-offset: **+1px**` | 현행 `-2px`라 active 좌측 막대와 물리적으로 겹쳐 '선택'과 '포커스'가 한 신호로 뭉갰다. 바깥에 그리면 분리된다. **[RHYTHM-12]** |
| **문맥 강등**(isMatch=false) | `opacity: 0.62` **제거** → ⑴ 제목만 `metaText` + weight 700→500 ⑵ 행 좌측 `inset 2px 0 0 dashed`-풍 중립 마커(`#94a3b8`) ⑶ 제목 앞 10px `문맥` 마이크로라벨. **hover/focus에서 해제하지 않는다.** | 현행은 행 전체 opacity라 metaText가 4.83→**2.39:1**로 AA 위반을 *생성*하고, 화살표 내비가 선택+포커스를 함께 옮기므로 키보드 사용 중 **강등이 절대 보이지 않는다**. 강등 동작 자체는 유지(회귀 금지 7). **[TYPE-9, RHYTHM-11]** |
| **북마크 ON** | `#b45309` / `#f59e0b` + fill | **[TYPE-7]** |
| **검색 매칭** | `Mark` 색 강제(§5.2) + 매칭 근거 토큰 유지(모바일에서도, §6) | 회귀 금지 7 |
| **'조건 밖 N'** | 브랜드 블루 12/600 + 점선 밑줄(hover 실선) + `::before { inset: -6px -4px }` 히트 확장 → 47×25px | 현행 39×13px, 행에서 유일하게 히트 확장이 빠진 컨트롤(WCAG 2.2 SC 2.5.8 미달). 이 버튼은 필터에 가려진 하위 사건의 **유일한 복구 경로**다. **[TYPE-8, ADAPT-7]** |
| **forced-colors** | active `outline: 2px solid Highlight` | 현행 유지 |

---

## 6. 반응형

가로 축은 **밀도와 독립**이다(밀도는 세로만 건드린다). 가로까지 밀도에 묶으면 열 축이 밀도마다 바뀌어 학습이 깨진다.

| | 1920 | 1440 | 1280 | 834 | 390 |
|---|---|---|---|---|---|
| 카드 폭 | `min(100%, 1120)` → 1120, 밖 758px 여백 | 1120, 밖 278px | 100%(1120 미만) | 100% | 100% |
| 거터 | 36 | 36 | 36 | **24** | 24 |
| 국기 max / NameText | 3 / 80px | 3 / 80px | 3 / 80px | **2 / 64px** | 1 / `min(112px, 28vw)` |
| 기간 토큰 | 표시(당일 사건은 생략) | 동일 | 동일 | 동일 | **표시**(현행은 `display:none`) |
| 매칭 근거 | 표시 | 표시 | 표시 | 표시 | **표시**(비운 기간 슬롯 인계) |
| 행 형태 | 1줄 | 1줄 | 1줄 | 1줄 | **2줄** |
| 행 높이(cozy) | 40 | 40 | 40 | 40 | **64** |
| 밀도 컨트롤 | 세그먼트 | 세그먼트 | 세그먼트 | **더보기(⋯)** | **필터 시트** |
| 상단 크롬 | 188 | 188 | 188 | ~200 | **~200**(현행 415) |
| 화면당 행(compact) | 17.3 | 17.3 | 17.3 | ~15 | ~9 |

**브레이크포인트 4단 확정** — 현행은 `max-width:640px` **단 하나**라 641~1023이 '적응 없는 붕괴 대역'이다(641px에서 제목 125행·국가칩 127행 잘림). `theme.ts BREAKPOINTS`에 `sm=640 / md=900 / lg=1180`을 확정하고 `event-list-item.tsx`의 640 리터럴 5곳(:654 :857 :911 :939 :954)을 치환. `isNarrow: boolean` → `band: 'narrow'|'mid'|'wide'` 3값 prop으로 승격(칩 개수는 CSS로 못 한다). **[ADAPT-1]**

**모바일 2줄 행 재정렬**
- `ExpandBtn`/`ExpandSpacer`의 `order: -2` → **`order: 1`**(메타 줄 선두). 두 줄이 같은 x에서 시작해 좌측선이 3개 → **1개**, 제목 폭 268 → 296px(+10%). **[ADAPT-5, ALIGN-7]**
- **회귀 금지 5 준수**: `Title { flex: 1 1 0 }`의 basis 0은 그대로(auto면 3줄 붕괴), `Flags max-width`는 112px 고정 → `min(112px, 28vw)`로만 완화(320px에서 89px → 3줄 붕괴 해소, 640px에서 112px 유지), `max={1}` 유지.
- 기간 토큰: `display:none`(≤640) **삭제**. 억제 축을 뷰포트 → **콘텐츠**로 교체 — `formatDuration`의 same-day 분기가 `'1일'` 대신 `''`를 반환한다(precision 가드 :144-151과 '종료 미상 생략' :156은 **손대지 않는다**, 회귀 금지 9). 데스크톱에서 133행의 잉여 토큰이 사라지며 ~24px씩 폭을 돌려주고, 모바일은 정보성 105행('15년 9개월' 등)을 되찾는다. **[TYPE-13, ADAPT-8]**
- 매칭 근거: 비워진 기간 슬롯을 이어받는다(행 높이 증가 0). 현행은 ≤640에서 `display:none`이라 모바일 검색 결과의 **76%가 무근거**였다. **[ADAPT-9]**

---

## 7. 로딩 스켈레톤 · 빈 상태

**스켈레톤 [RHYTHM-14, ADAPT-13]** — 현행은 균일한 12줄이라 '헤더가 3분의 1인 목록'이라는 최종 리듬을 예고하지 못하고, 모바일은 `min-height:45px` 고정이라 도착 시 **312px 점프**한다.

C의 스켈레톤 = **실제 초기 화면 구성 모사**, 전부 `--row-*` 변수 공유:
```
세기 헤더 placeholder × 1   (높이 var(--century-header-h), 라벨 바 110×16 + 우측 카운트 바 40×12, 도트 14px)
연 헤더 placeholder   × 2   (높이 var(--year-h), 라벨 바 62×13 + 카운트 바 34×12, 도트 9px)
행                    × 7   (min-height var(--row-min-h), 날짜 바 var(--row-date) 우측정렬, 칩 바 var(--row-chip))
헤더리스 행           × 3   (날짜 바를 꽉 채운 var(--row-date) — YYYY.M.D 폭 예고)
```
`@media (max-width: 640px)`에 `flex-wrap: wrap; row-gap: 3px` + 0높이 스페이서, `min-height: var(--row-min-h-narrow)`. `max-width` 상수 이중화 제거(카드 상한이 폭을 소유).

**빈 상태** — 현행 유지(활성 필터 칩 + 해제 + 최근 본 사건 fallback). 추가:
- 밀도 compact에서 빈 상태 컨테이너 패딩 `40 → 24px`.
- 하단 고정 크롬: `CompactList padding-bottom 120 → 32px`(데스크톱), `LoadingMoreRow padding 40 → 14px`(높이 99 → 47px), ≤640에서만 `max(96px, env(safe-area-inset-bottom))` 유지. **219 → 79px(-140px = 3.5행분)**. 미사용 styled `ScrollHint`(list.styles.ts:688-695, JSX 참조 0) 삭제. **[SPACE-8]**

---

## 8. 상단 크롬 — 세로 예산의 나머지 절반

목록 위 크롬 279px 중 페이지 소유분 215px, 그중 **79px(37%)이 순수 간격**이다. `PageScene`이 fixed이고 스크롤은 내부 컨테이너라 이 215px은 **아무리 스크롤해도 1px도 회수되지 않는다**. **[SPACE-4]**

| 조치 | 절감 | 주의 |
|---|---:|---|
| `PageHeader`('사건 연대표') 삭제 → `ViewSwitcherRow` 좌측 13px/700 라벨로 흡수 | −39px | 좌측 nav 활성 탭 '사건'과 같은 말을 27+12px에 다시 적고 있었다 |
| `ViewHint` 정적 문구 → 뷰 세그먼트 `aria-description` | −38px | ⚠️ **`SortScopeNote`는 제거 금지** — '기간순은 같은 해 안에서만' / '등록순은 연도 그룹 해제'는 IA-12의 성과다. 정렬 셀렉트 **바로 아래 인라인**으로 남긴다(조건부라 평소 0px) |
| gap 12/12/14 → 8/8/8 | −14px | |
| **합계** | **279 → 188px** | 목록 가시 604 → **695px** |
| (추가) 스크롤 40px 이후 필터바 44px 컴팩트 바로 축소 | 훑는 동안 −57px | 배치 4 |

**모바일 [SPACE-7]**: 415px(뷰포트의 49%) → **~200px**. 1행 = 검색 + `필터 N` 버튼(카테고리·대륙·국가·기간·계층을 바텀시트로 통합, 밀도 세그먼트도 여기), 2행 = 뷰 세그먼트 + 정렬 + 카운트. JSON·도움말·하위 접기는 시트 안. 화면당 4행 → **7~9행**, 59화면 → **25~28화면**.

---

## 9. ASCII 목업 — 1440px · cozy · 라이트 · 무선택

```
 x=0     21  58   70    96  104          170  178      238  246
 │       │   │    │     │   │            │    │        │    │
 ┌───────┴───┴────┴─────┴───┴────────────┴────┴────────┴────┴───────────────────────────────────┐ ← CatalogSection width:min(100%,1120px), 좌측정렬
 │◀── 거터 36 ──▶│                                                                              │
 │      │        │                                                                              │
 │      ┃        │                                                                              │   ┃ = 레일 스파인 1px, alpha .34, x=39
 │      ●━━━━  21세기  (2001–2100)                                        167건 · 252행         │  세기 헤더 40px · 20px/800 · 하단 hairline 1줄만
 │      ┃        ├──────────────────────────────────────────────────────────────────────────────┤
 │      ┃        │                                                                              │   ← --century-gap 16px
 │      ○━━━  2025년                                                          5건 · 7행         │  연 헤더 36px · 14px/700 · 상단 hairline · 도트 9px
 │      ┃        │                                                                              │
 │      ┃      [▸2]   6.13   전쟁/군사   2025 이란-이스라엘 12일 전쟁      11일  🇮🇱🇺🇸🇮🇷 +2    🔖 │  행 40px
 │      ┃        ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  hairline
 │      ┃        │┃    6.13   전쟁/군사   이란 나탄즈 핵시설 공습            1일   🇮🇱🇮🇷         🔖 │  자식 40px · 들여쓰기 20px · 좌측 1px 가이드(┃)
 │      ┃        ├──────────────────────────────────────────────────────────────────────────────┤
 │      ┃      [ ]    6.12   외교       IAEA 이란 비협조 결의 (2025-06-12)        🇬🇧🇺🇸🇮🇷 +1   🔖 │  ← '1일' 토큰 생략(same-day)
 │      ┃        │                                                                              │
 │      ○━━━  2024년                                                          3건 · 3행         │
 │      ┃      ⋯                                                                                │
 │      ┃        │                                                                              │
 │      ┃  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  12년 기록 없음  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │  Δ≥10 결번 rule, 20px
 │      ┃        │                                                                              │
 │      ┃      [ ]  1996.4.3  회담/조약  제네바 4자 회담 제안                    🇰🇷🇺🇸🇨🇳       🔖 │  ← 헤더리스 그룹: 연 divider 없음, 날짜가 YYYY.M.D
 │      ┃        ├──────────────────────────────────────────────────────────────────────────────┤     '1996'만 600 weight, '.4.3'은 500
 │      ┃      [ ] 1995.11.21 회담/조약  데이턴 협정 서명                        🇧🇦🇷🇸🇭🇷 +2   🔖 │  ← 역시 헤더리스(1행 그룹)
 │      ┃        │                                                                              │
 └───────────────┴──────────────────────────────────────────────────────────────────────────────┘
        ▲        ▲       ▲          ▲                                     ▲       ▲          ▲
     레일 x=39  tree 26  date 66   chip 60      title (가용 ~612px)     dur    flags     act 26
                        우측정렬   고정폭       min 12ch · nowrap · …   auto  max 168   +pad8
                                                                                          ▲
                                                                                    단일 우측 기준선 x=1124
                             ◀────────────── 카드 밖 여백 278px ──────────────▶
```

**같은 데이터 · compact(32px) 비교** — 위 6행이 차지하는 세로: cozy 240px → compact **192px**, 헤더 포함 구간 전체 396 → **312px**.

**다크 모드 차이**: 레일 스파인 `rgba(147,197,253,0.34)`, 헤더 오클루전 `#141414` 솔리드, 제목 `#f1f5f9`, 날짜 연도 파트 `#d4d4d8`, hairline `rgba(255,255,255,0.05)`. 행 도트가 없으므로 **다크에서 64%의 행이 3:1 미달이던 문제 자체가 사라진다**.

---

## 10. 구현 배치

| 배치 | 내용 | 파일 | 해소 | 비용 | 검증 |
|---|---|---|---|---|---|
| **0. 토대** | `LIST_DENSITY`·`TYPE_SCALE.listRow`·`BREAKPOINTS.md/lg` 추가, `CompactList`에 `--row-*` 변수 선언(cozy 고정), 소비처를 리터럴 → 변수로 기계 치환 | `theme.ts`, `list.styles.ts`, `event-list-item.tsx` | — | **S** | tsc 0 · 변경파일 lint 0 · **시각 무변화**(cozy ≒ 현행 근사치, 스크린샷 diff로 확인) |
| **1. 레일 다이어트** | `Stop::before/::after` 삭제, 거터 70→36·`--rail-inset` 19, `@media(max-width:1024px)` 구간 신설, 스파인 alpha .34, `--rail-tail` 종단 캡, 세기·연도 도트 14/9px | `event-list-item.tsx`, `list.styles.ts` | RHYTHM-2/4/6/16, TYPE-2/3, SPACE-10, RHYTHM-15 | **S** | 라이브 실측: 행당 유채색 마크 ≤2 · 다크 도트 대비 미달 0건 · stuck 헤더 관통 0 |
| **2. 그룹 크롬** | `buildYearBuckets`가 `headerlessYears`·`gapYears` 방출 → `YearDivider` 조건부 렌더 + `dateMode` prop + `rowDateLabel` 확장(BC 축약 포함) + `Year` 고정폭 우측정렬 + 카운트 표기 통일 + `CollapsedPlaceholder` 압축 + 세기 접힘 placeholder + 결번 rule + `CenturyDivider` 솔리드·타입 20/800 | `list-grouping.ts`, `event-compact-list.tsx`, `event-list-item.tsx`, `list.styles.ts`, `useEventHierarchy.ts`(fail-closed 가드) | SPACE-3/11, RHYTHM-1/3/5/7/8/9/10, TYPE-4, ALIGN-5/14, ADAPT-11 | **M** | jest: `headerlessYears` 판정(1건·1행 동시 만족만) · `collapsedYears`에 헤더리스 연도가 있어도 행이 사라지지 않음 · 라이브: 스크롤 총량 ≤13,000px · 헤딩 탐색 88개 유지(axe) |
| **3. 밀도 3단** | 세그먼트 컨트롤 + localStorage/URL + 스크롤 앵커 보존 + 라이브 문구 append + 밀도별 값 실배선 + 들여쓰기 `--row-indent` | `events.page.tsx`, `catalog-main-content.tsx`, `list.styles.ts`, `theme.ts` | SPACE-5, TYPE-10/15, ALIGN-13, ADAPT-10 | **M** | 3밀도 × 라이트/다크 6컷 · 행 높이 고유값 1종 · 밀도 전환 후 상단 행 id 동일 · axe radiogroup |
| **4. 세로 크롬** | `PageHeader` 삭제·라벨 흡수, `ViewHint` → aria-description(`SortScopeNote` 존치), gap 8/8/8, 하단 padding·`LoadingMoreRow` 축소, `ScrollHint` 삭제, 모바일 툴바 2행 압축 | `events.page.tsx`, `catalog-main-content.tsx`, `catalog-toolbar.tsx`, `list-page.styles.ts`, `layout.styles.ts`, `list.styles.ts` | SPACE-4/7/8 | **M** | 1440 크롬 ≤190px · 390 크롬 ≤210px · IA-12 고지 3케이스 여전히 노출 |
| **5. 색·상태 예산** | 날짜 600/#4b5563·칩 500, amber 재예약, `Mark` 색 강제, 북마크 ON 색, active tint 낮춤, focus offset +1, 문맥강등 vehicle 교체, '조건 밖 N' 승격+히트, '+N'·국기 saturate, tabular 국소화, same-day 생략 | `event-list-item.tsx`, `country-flags.tsx`, `theme.ts` | TYPE-1/5/6/7/8/9/11/12/13/14, RHYTHM-11/12/13, ADAPT-7/8 | **S** | 대비 스크립트(`contrast.js`) 재실행 — 목록 내 AA 미달 0 · 1.4.11 3:1 미달 0 |
| **6. 반응형 사다리** | 640 리터럴 5곳 → sm/md/lg, `isNarrow` → `band` 3값, 모바일 `order` 재배치, `Flags min(112px,28vw)`, 매칭근거 슬롯 인계 | `event-list-item.tsx`, `event-compact-list.tsx` | ADAPT-1/5/9, ALIGN-7 | **M** | 18단 뷰포트 스윕 재실행: 641~1023 제목 잘림 <5% · 320px 3줄 행 0 · 모바일 좌측선 1개 |
| **7. 폭 소유권 + 스켈레톤** | `Body max-width` 제거 → `CatalogSection width:min(100%,1120px)` 좌측정렬, 좌우 패딩 대칭, 스켈레톤 재구성(밀도·모바일 분기) | `event-list-item.tsx`, `list.styles.ts`, `event-compact-list.tsx` | SPACE-1, RHYTHM-14, ADAPT-13 | **S** | 1920/1440 행 안 죽은 폭 0 · 로딩→데이터 세로 점프 <40px |
| **8. tree 병합** | `[▸N]` 단일 컨트롤, `ChildCountBadge` 이동, 요약 버튼 드로어 강등, 액션 열 32px | `event-list-item.tsx`, `catalog-detail-drawer.tsx` | ALIGN-12 | **S** | 로빙 탭 정지점 여전히 2개 · 요약 진입 경로 유지 |

**권장 순서**: 0 → 1 → 2 → 3 → 5 → 7 → 4 → 6 → 8.
배치 0~3이 이 안의 **본체**(스크롤 −43%의 대부분이 여기서 나온다). 4~8은 동반 정리이며 독립 커밋 가능.

---

## 11. 회귀 금지 9항 대조

| # | 항목 | 이 안의 위협 | 완화 |
|---|---|---|---|
| 1 | 세기/연도 sticky containing block | **낮음** — `YearSection` 박스는 유지, sticky 요소만 조건부 | 헤더리스 그룹은 sticky 대상이 없어 적층 자체가 불가. `--century-header-h`를 밀도에 편입할 때 `YearDivider{top}`이 **같은 변수**를 읽는지 확인(슬릿 회귀) |
| 2 | 로빙 tabindex · aria-level/posinset/setsize · GroupHeading · RowList[role=list] | **중간** — 헤더 미렌더가 ARIA를 건드릴 위험 | `GroupHeading`/`role=group`/`aria-labelledby`/`RowList` **한 줄도 안 바꾼다**. 배치 2에 axe 헤딩 카운트(세기 12 + 연도 88 = 100) 회귀 테스트 추가. 밀도 고지는 **기존 단일 live region에 append**(신규 금지) |
| 3 | 평탄화 = 접힘 무관 전량 방출 + `isCollapsedAway` | **중간** — 헤더리스 그룹이 `collapsedYears`에 남아 행이 사라질 수 있음 | `headerlessYears`는 `buildYearBuckets` **단일 출처**. 렌더와 `isCollapsedAway` 양쪽에 `collapsed && !headerless` fail-closed 가드. jest 케이스 필수 |
| 4 | `--rail-inset` / `--century-header-h` | **낮음** | 변수명·소비처 불변, **값만** 변경. 하드코딩 재도입 금지 |
| 5 | 모바일 `Title flex:1 1 0` · `Flags 112px + max=1` | **중간** — 모바일 2줄 행을 재정렬한다 | `flex-basis: 0` 절대 유지. `Flags`는 상한을 `min(112px, 28vw)`로 **완화만**(640px에서 값 불변), `max={1}` 유지. 320~640 8단 스윕으로 행 높이 고유값 1종 확인 |
| 6 | 액션 고정 우측 열 | **낮음** — `margin-left:auto` 유지, 폭만 72→32 | depth에 따른 22px 이동(ALIGN-3)은 **여전히 남는다**(미해소, §12) |
| 7 | isMatch 문맥강등 · '조건 밖 N' · 매칭 근거 토큰 | **중간** — 강등 vehicle을 바꾼다 | 강등 **동작은 유지**, opacity → 토큰 스왑. `hiddenChildCount` 고지는 오히려 **승격**. 매칭 근거는 모바일에서 **부활** |
| 8 | importance(★) 부활 금지 | **없음** | 밀도는 importance가 아니다. 행 크기 3단은 **행 전체가 함께** 바뀌며 행 간 위계를 만들지 않는다 |
| 9 | 기간 토큰 precision 가드 | **낮음** | `formatDuration` :144-151(precision) / :156(종료 미상) **손대지 않음**. :157-162 same-day 분기만 `'1일'` → `''` |

---

## 12. 이 안이 해소하지 못하는 것 (16건 / 69건 중)

> 해소 53 · 미해소 16. 해소 53건 중 약 15건(TYPE-5/6/7/11/12, RHYTHM-12/13, ADAPT-7 등)은 **이 안의 논리와 독립인 저비용 동반 정리**다 — 다른 방향을 채택해도 똑같이 할 수 있다. 이 안 고유의 기여는 **SPACE-3/4/5/7/8 · RHYTHM-1/2/3/9 · TYPE-10**과 그에 직결된 것들이다.

| id | 왜 못 하나 |
|---|---|
| **SPACE-2** 상시 2열 | 죽은 가로 412px을 상세 패널로 채우는 것은 **가로 축의 안**이다. C는 세로만 다룬다. 카드 상한 1120으로 '행 안 죽은 폭'은 0이 되지만 **선택 시 목록 컬럼이 좁아지는 리플로우는 그대로 남는다** |
| **SPACE-6** 거터 → 세기 인덱스 | 정면 충돌. C는 거터를 36px로 **줄여서** 인덱스를 넣을 자리를 없앤다. 대신 '연도 접기' 1클릭으로 전 세기 골격이 6.4화면에 들어오는 것을 대안으로 제시한다(§3.4) — 인덱스만큼 직접적이지는 않다 |
| **SPACE-9** 리딩 거터 219px | 거터에서 회수한 34px을 날짜 셀 승격(36→66)에 **전액 재투자**했다. 총량은 그대로. '무데이터 픽셀'(빈 셰브론 자리)만 tree 병합으로 해소 |
| **ALIGN-1** 공유 열 축(grid) | 제목 좌측선을 11종 → **2종**으로 줄이지만 1종은 못 만든다. `margin-left`를 셀 `padding`으로 옮기는 것이 grid 전환의 전제이고 그건 cost L |
| **ALIGN-2** 단일 우측 기준선 | 행·hairline·액션의 우측은 x=1124로 통일되지만 **세기 헤더 카운트만** 별도 정렬 규칙(§3.3에서 72px 셀로 맞추므로 부분 해소). 완전 통일은 grid 트랙 합이 필요 |
| **ALIGN-3** depth가 액션 열을 22px 밀어냄 | `Stop{margin-left}`를 유지하므로 자식 행의 북마크는 여전히 부모보다 오른쪽으로 튀어나온다 |
| **ALIGN-4** 기간·국기 x 157/161종 | 열로 못 만든다. `max-width:168px` 캡으로 **최대 팽창만** 283→168px로 억제 |
| **ALIGN-6** 슬롯 순서 판정 | 판정은 수용(순서 유지)하나 그 전제인 '앞 슬롯 고정폭'만 충족. 새 결정 없음 |
| **ALIGN-8** 삽입 토큰 3종이 열을 흔듦 | `ChildCountBadge`는 tree로 이동(해소) — `MatchReason`·`FilteredOutHint`는 여전히 제목·기간 사이 |
| **ALIGN-9** 말줄임 정책 | 제목 트랙을 `minmax`로 고정하지 않으므로 잘림은 여전히 1행. 폭 분산 9배도 그대로 |
| **ALIGN-11** 베이스라인 1.51px | `align-items:center` 유지. `baseline` 전환은 grid 셀 정의가 선행돼야 안전 |
| **ADAPT-2** 국가 칩 글리프 중간 절단 | '+N'을 클리핑 박스 밖으로 빼는 구조 변경 미실시. 다만 거터 −34px·기간 토큰 −24px로 **잘림 빈도는 감소**한다(악화 없음) |
| **ADAPT-3** 미디어쿼리가 컨테이너를 못 봄 | 사다리를 뷰포트 기준으로 짠다. `container-type`은 SPACE-2(상시 2열)와 한 묶음이라 그 안이 담당 |
| **ADAPT-4** 초광폭 상한 상수 | 상한을 880 → 1120으로 올리지만 `clamp` 사다리는 안 넣는다. 1920의 758px은 여전히 여백 |
| **ADAPT-6** ≤640 한 벌이 320~640 담당 | `Flags min(112px,28vw)`로 3줄 붕괴만 막는다. 480~640에서 국가 2~3개를 1개로 줄이는 낭비는 그대로 |
| **ADAPT-12** ≥1600 전용 계획 | 기간 레인·칩 max 5 미채택. 세로가 병목이라는 C의 명제상 우선순위가 낮다 |

---

## 13. 트레이드오프 — 이 안이 실제로 무엇을 포기하는가

1. **'시간축의 정거장' 은유가 약해진다.** 252개 도트가 사라지면 목록은 '타임라인'보다 '표'에 가까워진다. 반대급부는 노이즈 504개 제거·다크 접근성·눈금 서열 정상화. **타임라인 뷰·격자 뷰가 이미 별도로 존재**하므로 목록이 타임라인을 흉내 낼 이유는 약하다.
2. **연 그룹 경계의 절반이 사라진다.** 헤더리스 50개 구간에서 '해가 바뀌었다'는 신호는 행 선두 `YYYY.M.D`와 결번 rule뿐이다. 옛 세기(희소 구간)를 훑을 때 리듬이 평평해질 수 있다 — 다만 그 구간은 **원래 크롬이 58%**였다.
3. **날짜 셀이 66px로 커진다.** 202/252행은 그 중 24px만 쓴다(우측 정렬이라 앞이 빈다). 열 축을 1종으로 유지하기 위한 명시적 비용이며, 회수한 거터 34px이 여기로 간다.
4. **컨트롤이 하나 늘어난다.** 툴바에 밀도 세그먼트 66px + '연도 접기' 토글. 세로에서 91px을 벌고 가로에서 ~110px을 쓴다 — 세로가 병목이므로 순이득.
5. **밀도는 학습을 요구한다.** 첫 진입은 `cozy`(현행 근사)라 아무것도 안 바뀐 것처럼 보인다. 조밀 모드의 이득(+104%)은 발견되어야 발생한다. 완화: 세그먼트 `title`에 `한 화면 약 17행` 같은 **결과 수치**를 적어 이득을 미리 말한다.
6. **amber 충돌을 TYPE-6 쪽으로 끊었다.** RHYTHM-13(amber=검색 전용)을 따르면 북마크가 무채색이 되는데, 북마크 필터로 좁혀 훑을 때 '무엇이 켜져 있는가'가 형태(fill)로만 남아 스캔이 안 된다. 검색은 배경 fill이라는 별도 채널을 이미 갖고 있다.
