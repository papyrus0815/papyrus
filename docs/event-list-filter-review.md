# `/events` 필터 시스템 전면 검토

작성 2026-08-02 · 브랜치 `feature/service-manager-v2` · 작성 시점 미구현 → **후속 커밋에서 구현**
(이 문서는 검토 당시의 스냅샷이다. 항목별 반영 여부는 이후 커밋을 볼 것)

선행 4라운드([improvement](./event-list-view-improvement-review.md) ·
[design](./event-list-view-design-review.md) ·
[page-ux](./event-list-page-ux-review.md) ·
[ux-3](./event-list-view-ux-review-3.md) ·
[design-overhaul-4](./event-list-view-design-overhaul-review.md))는
목록 **뷰**의 데이터 누락·a11y 구조·성능·시각 디자인을 다뤘다.
이 5차는 그 뷰에 무엇을 담을지 정하는 **필터 시스템** 자체를 처음으로 통째로 본다.

---

## 0. 검토 범위·방법

**대상 표면** — 필터 상태·술어의 단일 출처(`features/event-filters/model/useEventFilters.ts`),
필터 바 위젯(`widgets/event-filters-panel`), 툴바·활성 칩(`pages/events/list/components/catalog-toolbar.tsx`),
URL 동기화(`use-catalog-url-sync.ts`), 필터를 소비하는 평탄화(`features/event-hierarchy/model`),
필터 스타일 2파일(`filter.styles.ts` 820줄 · `list-toolbar.styles.ts` 614줄),
그리고 **서버 조회 계약**(`apps/api/src/libs/event/presentation/event.controller.ts`).

**방법** — 7렌즈 병렬 발굴 → 렌즈별 적대 검증(반증 시도·라이브 DB 대조·심각도 하향) → 완전성 비평(누락 렌즈 재발굴).

| 렌즈 | 관점 | 생존 |
|---|---|---:|
| DATA | 필터 의미론·데이터 정합 | 10 |
| URL | URL 동기화·영속·초기화 | 12 |
| IA | 정보구조·개념모델·발견성 | 18 |
| INT | 인터랙션·조작 흐름 | 14 |
| A11Y | 접근성 | 10 |
| PERF | 성능·확장성 | 7 |
| VIS | 시각·반응형·다크·코드구조 | 12 |
| GAP | 완전성 비평 추가 발굴 | 11 |

**생존 94건**(중복 병합 후 **73행**) · CONFIRMED 79 / PLAUSIBLE 15.

| 심각도 | 행 | 건 |
|---|---:|---:|
| **P1** — 지금 잘못 보이거나 못 씀 | 3 | 4 |
| **P2** — 명확한 마찰·개념 결함 | 28 | 34 |
| **P3** — 다듬기·백로그 | 42 | 56 |

적대 검증에서 심각도가 내려간 건이 많다(P1→P2 3건, P2→P3 14건). 근거가 코드로만 성립하고
라이브 영향이 1~2건이거나, 다른 어포던스(칩 바·트리거 라벨)가 최소 신호를 주고 있는 경우다.
**살아남은 P1은 3행뿐이고, 그중 2행은 실측이 아니라 코드 판정이라 구현 전 라이브 재현이 선행이다.**

라이브 대조에 쓴 실 DB: 사건 261건(루트 171 · 자식 90) · 카테고리 10 · 현대국가 70 · 역사국가 263 ·
사건–국가 관계 571행(그중 역사국가 424).

---

## 1. 근인 진단

개별 94건은 네 개의 구조적 원인에서 갈라져 나온다. **이 절이 이 문서의 본론이다** —
아래 넷을 이름 붙여 고치지 않으면 배치 계획은 두더지 잡기가 된다.

### 근인 1 — "국가"·"세기"의 정의가 서버·카탈로그·목록·타임라인 **네 곳에 따로 산다**

필터의 축 이름은 하나인데 그 축이 무엇을 의미하는지는 화면마다 다르게 구현돼 있다.

| 축 | 서버 `GET /events` | 카탈로그 술어 | 목록 그룹핑 | 타임라인 |
|---|---|---|---|---|
| **국가** | 브리지 계보 합류(`대한민국 → 조선`, controller:479-493) | **id 정확 일치**(useEventFilters:140-143) | — | — |
| **세기** | `startDate` DATETIME 범위(controller:447-459) — 1000년 이전 NULL·BC는 Invalid Date | **시작/끝 두 점 동등비교**(useEventFilters:132-139) | 자식은 **부모 버킷** 귀속(list-grouping:109-113) | `new Date('-0500-01-01')` → **AD 500 둔갑**(event-timeline:541-546) |
| **카테고리** | 단일 `categoryId` (루트에만) | 단일 id | — | **다중 숨김, 키는 name**(event-timeline:413,546) |

라이브 델타가 이미 크다 — 국가 상세('대한민국')와 카탈로그 국가 필터('대한민국')가 내는 사건 집합의
차이는 독일 76건, 러시아 65건, 오스트리아 48건이다(브리지 역사국가로만 태그된 사건 수).
세기 축에서는 부모·자식의 시작 세기가 다른 살아있는 쌍이 13쌍 있어, 칩은 '20세기'인데
행은 '19세기' 헤더 밑에 놓인다.

사용자가 얻는 결론은 항상 같다 — **"카탈로그가 사건을 누락한다"**. 실제로는 두 화면이 다른 정의를 쓰고 있고,
어느 화면에도 그 차이를 고지하는 문구가 없다. `DATA-4/IA-3` · `DATA-1/IA-4` · `DATA-9` · `GAP-9` · `GAP-4` · `DATA-2`가 전부 이 하나에서 나온다.

> **정본을 하나 정하는 것이 이 검토서의 최우선 결정이다.** 권고는 서버 정의(브리지 포함 + 구간 겹침)를
> 정본으로 삼고 클라 술어를 그쪽에 맞추는 것 — 국가 상세·원장·카탈로그가 이미 같은 서버를 보고 있기 때문이다.

### 근인 2 — 필터가 "술어 한 벌"이 아니라 **파이프라인 네 지점에 흩어져** 있다

한 화면의 "무엇을 보여줄까"가 네 단계에 나뉘어 있고, 각 단계는 앞뒤를 모른다.

```
events (autoLoadAll 전량)
  ├─① 5축 술어 matchesEvent  → 평탄화가 계보 인지로 적용(매칭 자손 있는 부모는 문맥 행으로 존치)
  ├─② 북마크           → 평탄화 결과를 행 단위로 filter (events.page:454-457)
  ├─③ 접힘 isCollapsedAway → 그 결과를 또 filter (events.page:467-470)
  └─④ 연·세기 밴드 접힘  → selectVisibleRows (events.page:526-543) — 단, grouped=false면 위젯이 무시
```

여기서 세 부류의 결함이 자동으로 파생된다.

- **곱셈 사고** — ②와 ③이 서로를 모른다. '하위 접기' 후 '북마크만'을 켜면 북마크한 자식은
  `isCollapsedAway`인 채 잘리고, 그 자식을 펼칠 부모 행은 ②에서 이미 사라져 **되살릴 셰브론이 화면에 없다**(`IA-7/DATA-10`).
- **모수 표류** — "조건 일치 N건"이 어느 단계를 세느냐에 따라 달라진다. 지금은 ③ 이후를 세므로
  데이터도 조건도 그대로인데 '하위 접기'만으로 233 → 146으로 떨어지고, 같은 화면의 JSON 내보내기는
  ② 결과를 쓴다(`DATA-6`). 미필터 분기에서는 통계 스트립이 자식 포함 모수, 총계는 루트 모수다(`DATA-7`).
  ④와 위젯 렌더가 정렬 모드에 따라 갈리면 **DOM에 보이는 행이 ↑↓·드로어 이전/다음에서 빠진다**(`GAP-2`) —
  `list-grouping.ts:249-252`가 "이 분기는 렌더와 정확히 같아야 한다"고 경고해 둔 바로 그 지점이다.
- **소비처 누락** — ①이 붙인 `isMatch`를 읽는 곳은 목록 행과 카운트뿐이다. 타임라인·지도·격자·통계·트리·갤러리
  6개 뷰와 JSON 내보내기는 문맥 부모를 그냥 데이터로 센다. '전쟁'으로 좁힌 뒤 통계 뷰에 가면
  **필터로 배제한 카테고리가 막대로 그려진다**(`GAP-1`).

즉 지금 구조에서는 필터를 하나 고칠 때마다 "이 축은 어느 단계에 넣어야 하나"를 매번 새로 결정해야 하고,
그 결정이 카운트·내비게이션·내보내기·6개 뷰에 조용히 번진다.

### 근인 3 — 필터 바가 **선언만 하고 계약을 이행하지 않는다**(ARIA·data 속성·스타일 훅이 모두 dangling)

같은 파일 안에서 "약속했는데 아무도 이행하지 않는" 계약이 다섯 겹으로 쌓여 있다.

| 선언 | 실제 |
|---|---|
| `role="listbox"` + `role="option"`(filters-panel:333,362) | 파일 전체에 `onKeyDown`·`tabIndex`·`aria-activedescendant`·`aria-controls` **0건** — 조작 모델은 '버튼 N개 나열' |
| 열림 시 포커스 이동(:284-289) | `searchable`일 때만. 카테고리(10종)·대륙(7종)은 임계 12 미만이라 **영구 false** → 포털은 `document.body` 끝, 트리거와 DOM 인접성도 프로그램적 연결도 없음 |
| `aria-label="카테고리 필터"`(:312) | 시각 라벨('정치')을 **덮어씀** → WCAG 2.5.3 Label in Name 실패 |
| `data-active`(:313) | 레포 전체에 소비하는 CSS **0건** |
| `FilterTriggerButton`의 배경·보더·radius·height(filter.styles:208-257) | 상위 `FilterGroup`의 `& button { … !important }`(:63-69)가 **전부 덮음** — 살아남는 건 `color` 뿐 |
| `box-shadow: 0 0 0 2px`(focusRing) | `FilterGroup`의 `overflow:hidden`(:43)에 상·하 2px가 잘림 → 4개 컨트롤 중 어디에 포커스인지 구분 불가 |

결과는 **"마우스 사용자에게만 정상인 필터 바"**다. 키보드·스크린리더로 온전히 조작 가능한 필터는
5종 중 네이티브 `<select>`인 세기 하나뿐이고(`INT-1/A11Y-2` = 이 검토서의 유일한 CONFIRMED P1),
저시력·인지 부하 사용자에게는 활성 상태를 알려주는 근접 신호가 라벨 문자열 하나뿐이다.

이 다섯은 개별 버그가 아니라 **한 번의 재작성으로 함께 해소되는 하나의 결함**이다 —
APG select-only combobox 패턴으로 옮기면 포커스 도달·화살표 내비·접근 이름·활성 표시가 한꺼번에 정리된다.
그래서 배치 1을 별도로 세웠고, 부분 수정을 금한다(반쪽 수정은 `role`만 남기고 동작은 그대로인 지금 상태를 재생산한다).

### 근인 4 — URL이 상태의 정본인 **척만** 한다(검증도 시딩도 절반)

이 페이지는 12개 파라미터를 URL에 싣는, 사실상 'URL이 상태 저장소'인 화면이다. 그런데:

- **시딩은 4개뿐** — `bookmarks`·`view`·`event`·`q`만 `useState` lazy initializer로 URL에서 읽고,
  나머지 8개는 기본값으로 시작해 effect가 나중에 반영한다. 그래서 마운트 첫 커밋에서
  effect B가 **아직 갱신 전 state로 URL을 다시 써** 필터 5개를 지웠다가 다음 커밋에 복구한다(`URL-5`).
- **검증은 3개뿐** — `size`·`dir`·`view`만 화이트리스트를 통과하고 `cat`·`country`·`continent`·`century`·`sort`는
  무검증이다. `?century=0`·`?century=5.5`·`?sort=recentlyAdded`·`?country=<삭제된 id>`가 전부 상태가 된다(`URL-1`·`URL-2`·`URL-3`).
- **폴백 라벨이 축마다 3가지** — 같은 '해석 실패' 상황에서 카테고리 트리거는 '알 수 없음', 국가 트리거는 **'국가'**
  (= 필터 없음과 **같은 문자열**), 칩은 전부 '알 수 없음'이다. 국가는 활성 스타일도 없어(근인 3)
  "필터가 안 걸린 것처럼 보이는데 결과는 0건"이 된다(`URL-1/IA-16/DATA-17`).
- **원인 구분 불가** — `useCatalogReferenceData`가 `isLoading`/`isError`를 아예 반환하지 않는다(`data ?? []`).
  '잘못된 링크'와 '참조 데이터 아직 안 옴'과 '영영 실패'가 화면상 **완전히 같다**(`GAP-5`).
  참조 데이터는 react-query 비동기라 **필터가 걸린 공유 링크를 열 때마다** 이 구간을 지나간다.
- **실수의 비용이 비대칭** — 모든 write가 `replace:true`라 뒤로가기로 못 돌아가고, '전체 초기화'에는
  확인도 되돌리기도 없다. 훨씬 가벼운 북마크 1건 토글에는 이미 `notify.action('…', { label:'실행 취소' })`가 붙어 있다(`URL-8/INT-11`).

> 파싱을 훅 밖 순수 함수 `parseCatalogSearchParams(searchParams)` **하나**로 빼고 initializer와 effect가 같은 함수를
> 쓰게 하면 위 다섯이 동시에 풀린다 — 검증도 그 한 곳에 모인다.

### 부수 진단 — 전량 로드가 만드는 "나중에 정확해지는 화면"

카탈로그는 `autoLoadAll: true`로 서버 페이지를 전부 소진한 뒤 클라이언트가 전역 필터를 돈다.
이 구조 자체는 오늘 규모(루트 171건, 왕복 2회)에서 **옳은 선택**이다 — 필터 전환이 네트워크 0회·즉시다.
문제는 소진이 끝나기 전 구간의 파생값이 전부 부분값이라는 것이다: 세기 `<select>` 옵션은 로드된 사건에서만 생기고
(그래서 `?century=17` 정상 딥링크도 잠시 **빈 칸**으로 뜬다), 북마크 배지는 과소 표기되고,
목록 외 4개 뷰는 유예 없이 "표시할 데이터가 없습니다"를 확정한다(`GAP-3`).
**즉 지금의 성능 부채는 체감 지연이 아니라 '오표시 창(window)'의 형태로 나타나고, 그 창의 길이가 데이터에 선형 비례한다.**
서버 위임(`PERF-1`)은 그래서 '언젠가'가 아니라 임계(serverTotal) 기반 전환으로 설계해야 하며,
그 선행 조건은 서버 `century`가 BC·1000년 이전을 조용히 탈락시키는 결함(`DATA-2`)의 수리다.

---

## 2. 배치 계획

배치 기준은 심각도가 아니라 **함께 고쳐야 하는 응집도**다. 같은 파일을 두 번 뜯거나,
반쪽만 고쳐 계약이 더 어긋나는 것을 막는 순서로 짰다.

| # | 배치 | 목표(한 줄) | 행 | 규모 | 선행 |
|---|---|---|---:|---|---|
| 1 | **필터 팝오버를 조작 가능한 위젯으로** | `role=listbox` 선언과 실제 조작 모델을 일치시켜 키보드·SR로 4축 전부 조작 가능하게 | 9 | **L** | 없음 (최우선) |
| 2 | **술어 의미론 정정** | '무엇이 조건을 만족하는가'를 겹침·브리지·단일 레인으로 정직하게 | 8 | **M** | 근인 1 정본 결정 |
| 3 | **모수 규약 단일화 + 뷰 간 필터 계약** | '조건 일치 N건'이 어디서나 같은 모수를 말하고, 필터가 7뷰·내보내기에 동일 적용 | 9 | **M** | 배치 2 |
| 4 | **URL 계약: 검증·시딩·초기화 범위** | 파서 단일화로 무효값·로딩·실패·되돌리기를 한 곳에서 처리 | 12 | **M** | 없음 (배치 2와 병렬 가능) |
| 5 | **필터 바 시각 계약 정리** | `!important` 역전을 풀고 활성·포커스 표시를 되살리며 죽은 표면 360줄 제거 | 9 | **M** | 배치 1(마크업 확정) |
| 6 | **툴바 재조립과 조작 피드백** | 칩 바를 전용 행으로 승격하고, 필터를 만진 뒤 화면이 무엇을 말하는지 통일 | 7 | **M** | 배치 5 |
| 7 | **옵션 모집단: 국가 창·건수·모순 조합** | 옵션 목록이 참조 DB가 아니라 '내 데이터'를 반영하게 | 8 | **M** | 배치 1 |
| 8 | **렌더 낭비 정리** | 화면에 없는 모달·좌표 불변 팝오버·중복 memo의 순수 낭비 제거 | 5 | **S** | 없음 (아무 때나) |
| — | 보류·기각 | 규모 L 또는 제품 결정 필요 | 6 | — | — |

### 배치 1 — 필터 팝오버를 조작 가능한 위젯으로 (L)

> **이번 검토서의 유일한 CONFIRMED P1이 여기 있다.** 카테고리·대륙 팝오버는 열려도 포커스가 이동하지 않고
> 포털이 `document.body` 끝이라, 키보드/SR 사용자가 옵션에 닿으려면 툴바·전 목록 행·드로어를 지나
> 문서 끝까지 Tab을 밀고 가야 한다. 유일한 우회로였던 '전체 보기 →' 모달 진입점조차 **팝오버 안에** 있다.

포함: `INT-1/A11Y-2`(P1) · `INT-2/A11Y-1` · `INT-3/A11Y-5` · `INT-8/A11Y-4` · `INT-12` · `INT-13/A11Y-9` · `A11Y-8` · `INT-4` · `INT-14`

정공법은 APG **select-only combobox**로의 재작성이다:
트리거를 `role="combobox" aria-expanded aria-controls aria-activedescendant`로 바꾸고 포커스는 트리거에 유지,
옵션은 `<button>`이 아닌 `<div role="option" id>`로 내려 탭 스톱 폭증(국가 50개)을 없애고,
`SearchRow`·`Empty`·`Footer`를 `role="listbox"` 밖 형제로 옮겨 유효한 자식 구성을 만든다.
`aria-label` 고정은 제거하고 접근 이름을 시각 텍스트('카테고리: 정치')로 구성한다.
Esc 2단 규약(1회차=검색어만 지움), 닫힘 시 트리거 포커스 복귀, `aria-setsize/posinset`도 이 한 벌에 포함된다.

⚠️ **부분 수정 금지.** 포커스 이동만 붙이면 화살표 없는 listbox가 되고, 화살표만 붙이면 도달 못 하는 listbox가 된다.
회귀 가드로 `filters-panel.spec.tsx`에 키보드 시나리오 4건(↓ 활성 이동 / Enter 확정 / Esc 복귀 / 타입어헤드)을 추가한다.

### 배치 2 — 술어 의미론 정정 (M)

포함: `DATA-1/IA-4`(세기 겹침) · `DATA-4/IA-3`(국가 브리지) · `IA-7/DATA-10`(북마크 레인 합류) ·
`DATA-9`(버킷 축 통일) · `IA-5`(연도 미상 축) · `GAP-11/DATA-16`(location 검색) · `GAP-9`(타임라인 BC) · `GAP-10`(spec 신설)

근인 1·2를 술어 레벨에서 끝낸다. 핵심 3개:

1. `centuryOk`를 **구간 겹침**으로 교체하고 `availableCenturies`도 시작~종료 사이 세기를 모두 채운다.
   두 곳이 `eventSpansCentury(event, century)` 하나를 공유하게 할 것(지금은 같은 결함을 두 곳에 복제).
2. 국가 필터에 **브리지 합집합**을 합류시킨다. 즉시안은 이미 응답에 실려 오는
   `parentModernCountryIds`로 역인덱스를 만드는 것(페이로드 증가 0), 정본은 서버 위임(→ 보류 `PERF-1`).
   칩 라벨도 '국가 · 대한민국(연결 역사국가 포함)'으로 정직화한다.
3. **북마크를 다른 축과 같은 레인으로** — `matchesEvent`에 `!bookmarksOnly || bookmarks.has(id)`를 더하고
   `hasNarrowingFilters`에 `bookmarksOnly`를 포함시킨다. 그러면 평탄화가 매칭 자손을 가진 부모를 문맥 행으로
   남겨 '복구 불가' 상태와 고아 depth 행이 **둘 다** 사라지고, `events.page.tsx`의 사후 filter를 삭제할 수 있다.

`GAP-10`은 이 배치의 동반 작업이다 — `useEventFilters.spec.ts`(술어 테이블: 세기 걸침·미상·BC·국가 id·대륙 조인·키워드 필드,
`availableCenturies` 파생, 칩 라벨/onClear, 리셋 범위)를 **먼저** 세우고 술어를 고친다.
지금 이 파일은 spec이 0건이고, 이번 검토 결함의 절반이 여기서 나왔다.

### 배치 3 — 모수 규약 단일화 + 뷰 간 필터 계약 (M)

포함: `GAP-1`(P1) · `GAP-2`(P1) · `DATA-6` · `DATA-7` · `IA-17` · `GAP-7` · `GAP-3` · `GAP-6` · `GAP-4`

근인 2의 하류 전량. 규약 한 문장을 정하고 코드가 그것만 따르게 한다:

> **모수 규약** — `matchedCount`는 ①(술어) 직후를 센다. `displayedCount`는 ④(밴드 접힘) 이후를 센다.
> 두 숫자는 서로 다른 질문에 답하며, 그 사이 단계(②③)는 **어느 카운트에도 영향을 주지 않는다.**
> 내보내기·6개 뷰는 ①의 `isMatch`를 존중한다.

`GAP-2`는 그 규약을 어긴 결과가 가장 나쁜 형태로 드러난 지점이다(등록순 정렬 시 그룹핑이 꺼지면
위젯은 접힘을 무시하고 전량 렌더하는데 `navigableItems`는 접힘을 계속 적용 → 화면엔 보이는데
드로어 '다음'이 건너뛰고, 그 행을 클릭하면 '조건 밖' 배너가 뜬다). `grouped` 여부를 페이지가 계산해
**단일 변수**로 두고 위젯 prop과 `selectVisibleRows` 적용 조건이 같은 값을 읽게 하면 끝난다.

`GAP-4`는 단기안만 — 타임라인의 `hiddenCategories`·`groupBy`를 페이지 상태로 끌어올려
URL(`hide=`/`lane=`)과 `activeFilterCount`·칩·`handleResetAll`에 포함시킨다. 키를 name→categoryId로 바꾸고
페이지 카테고리 필터와 합치는 중기안은 다중 선택(`IA-10`, 보류)에 종속된다.

⚠️ `GAP-1`·`GAP-2`는 PLAUSIBLE(완전성 비평 발굴, 적대 검증 미통과)이다. **착수 전 라이브 재현이 선행**이다 —
재현되면 이 배치가 배치 2보다 앞선다.

### 배치 4 — URL 계약: 검증·시딩·초기화 범위 (M)

포함: `URL-1/IA-16/DATA-17` · `GAP-5` · `URL-2/DATA-11` · `URL-3` · `URL-5` · `URL-13` ·
`URL-4` · `URL-6` · `URL-7` · `URL-8/INT-11` · `URL-12` · `URL-11`

근인 4 전량. 순서가 중요하다:

1. **파서 추출** — `parseCatalogSearchParams(searchParams)` 순수 함수 신설. 여기에 검증을 전부 모은다
   (`century`: 정수·비0·|c|≤21 / `sort`: `Object.values(SORT_OPTIONS)` 화이트리스트 / `q`: trim).
2. **시딩 통일** — 8개 state의 `useState`를 그 함수 기반 lazy initializer로. 첫 커밋부터 `state === URL`이 되어
   effect B의 첫 write가 사라지고 `lastSelfWriteRef` 의존 구간도 없어진다(`URL-5`).
3. **참조 데이터 채널** — `useCatalogReferenceData`가 `{ data, isLoading, isError, refetch }`를 축별로 반환.
   로드 완료 후 미해결 id는 `FILTER_ALL`로 낙하 + URL 키 제거 + `notify` 고지. 로딩 중에는 '불러오는 중',
   영구 실패는 '이름 조회 실패'로 원인을 구분한다(`GAP-5`). 폴백 문자열은 트리거·칩 모두 '알 수 없음'으로 통일.
4. **미발견 상태** — `?event=<삭제된 id>`는 로드 소진 후 '사건을 찾을 수 없습니다 + 선택 해제'를 렌더하고
   URL 키를 제거한다. 지금은 빈 상태 분기에 **닫기 ✕가 없어** 데스크톱(≥1200px, 백드롭 없음)에서 Esc 외 탈출로가 없다(`URL-4`).
5. **초기화 범위 규약** — `handleResetAll`의 대상 집합을 표로 확정해 주석으로 박는다. 정렬은 제외
   (같은 훅의 `hasNarrowingFilters`가 이미 '표시 옵션'이라 선언), **접힘(`collapsedYears`/`collapsedCenturies`)은 포함**
   — 지금 드로어의 '조건 밖' 배너가 권하는 '필터 초기화'가 접힘을 안 풀어 **완전한 먹통 버튼**이다(`URL-6`).
   그리고 초기화 직전 스냅샷으로 `notify.action('필터 N개 해제', { label:'되돌리기' })`를 붙인다(`URL-8/INT-11`).

### 배치 5 — 필터 바 시각 계약 정리 (M)

포함: `VIS-11`(선행) · `VIS-2/A11Y-7` · `IA-8/INT-7/VIS-3/A11Y-6` · `VIS-10` · `VIS-1` · `VIS-4` · `VIS-7` · `VIS-9` · `IA-15`

**`VIS-11`이 이 배치의 선행이다.** `FilterGroup`의 `& button { … !important }` 리셋을 걷어내고
`FilterTriggerButton`/`CenturySelect`에 `$inGroup` variant를 주어 '그룹 내부 형태'를 자기 파일에서 표현하게 한다.
이걸 먼저 하지 않으면 활성 표시(`data-active`)도 포커스 링도 새 `!important`를 달아야 하고, 그러면 다음 사람이 또 같은 벽을 만난다.

그 위에 얹히는 것들:
- **포커스 링** — `box-shadow`(바깥 spread)가 `overflow:hidden`에 잘리므로 `outline: 2px solid; outline-offset: -2px`
  또는 `inset` 그림자로 교체. 그룹의 `:focus-within` 링은 개별 표시와 경합하므로 border-color 변화만 남긴다.
  `theme.ts`에 `focusRingInset` 토큰을 추가해 클리핑 컨테이너 안 컨트롤의 규약으로 박으면 재발이 막힌다.
- **활성 표시** — 이미 내보내고 있는 `data-active`를 소비만 하면 된다. 색 단독 금지(글자 굵기 + 좌측 인디케이터 + 색 3중 인코딩).
- **라벨 폭 요동** — 트리거 라벨이 필드명을 값으로 **치환**해서 '연합군 점령하 오스트리아' 하나로 트리거가
  ≈80→≈210px가 되고, 그 오른쪽 컨트롤이 전부 밀려 액션 줄이 새 줄로 내려간다. `필드명 · 값` 2요소 +
  값 span에 `max-width:12ch; ellipsis` + 트리거 `min-width`로 **고정 슬롯화**한다(`VIS-4`).
- **죽은 표면 제거** — `widgets/event-list/ui/filter-panel.tsx`(참조 0)를 삭제하고 그에 따라 죽는
  `filter.styles.ts` export 26개(≈360/820줄)를 제거한다. `theme.ts`의 `SURFACE`·`Z_INDEX`도 소비처 0(`VIS-10`).
  이 정리를 먼저 하면 `VIS-1`(토큰화)의 대상이 절반으로 준다.
- ≤768px mask는 **삭제가 아니라 조건화**다 — 선례(RWD-4)와 달리 여기는 375~400px에서 실제로 넘친다(`VIS-7`).

### 배치 6 — 툴바 재조립과 조작 피드백 (M)

포함: `VIS-8/VIS-13` · `VIS-14` · `IA-6` · `INT-9` · `INT-10` · `A11Y-3/A11Y-10` · `GAP-8`

두 갈래가 같은 파일에서 만나므로 한 배치다.

**구조** — 칩 바를 `TopFilterBar`의 마지막 flex 아이템에서 빼내 **전용 행**으로 승격하고 `min-height`로 자리를 예약한다.
지금은 액션 버튼 줄 **아래**로 밀려 원인(트리거)과 결과(칩)가 끊기고, 조건부 렌더라 필터를 토글할 때마다
툴바 높이가 0↔36px로 튄다 — 상단 크롬을 279→186px로 줄인 직후라 그 예산의 20%다.
전용 행이 되면 `margin-left:auto` 무효(`VIS-13`)와 세퍼레이터 고아 문제도 함께 사라진다.
`VIS-14`(CatalogToolbar 36 props 중 17개가 순수 배관)는 같은 수술에서 `filters: React.ReactNode` 슬롯으로 정리한다.
`IA-6`(북마크는 액션 줄에, 계층 토글은 필터 그룹에 — 두 축이 자리를 바꿔 앉음)도 여기서 제자리로 보내면
**"필터 그룹 = 칩으로 나타나는 것 = 전체 초기화 대상"**이라는 한 문장 규칙이 성립한다.

**피드백** — 필터를 바꿔도 스크롤 위치가 유지돼 새 결과의 중간에 착지하는 문제(`INT-10`, 손잡이
`[data-list-scroller]`는 이미 있다), 칩 제거 시 포커스 유실 + 뒤 칩이 당겨져 오는 연쇄 오클릭(`INT-9`),
0건이 되면 라이브 영역 둘이 동시에 사라져 SR에 침묵이 남는 문제(`A11Y-3/A11Y-10` — 항상 마운트되는
단일 라이브 영역 + 스피너는 `aria-hidden`), 필터가 걸린 채 새 사건을 등록하면 아무 안내 없이 결과에 안 나타나는 문제
(`GAP-8` — `onSaved`를 배선해 매칭이면 선택+스크롤, 아니면 '필터 해제하고 보기' 액션 토스트).

### 배치 7 — 옵션 모집단: 국가 창·건수·모순 조합 (M)

포함: `IA-2` · `INT-5` · `PERF-9` · `IA-13` · `IA-14` · `IA-1` · `IA-9` · `IA-12`

옵션 목록이 참조 DB 순서를 그대로 뱉는 데서 오는 결함군. 오늘 실측으로 국가 옵션은
`1 + 현대 70 + 역사 263 = 334개`이고 `maxVisible=50`은 검색어가 없을 때만 걸린다. 그래서:

- 팝오버 첫 화면의 역사국가는 **구조적으로 0개**다(현대 70개가 슬롯을 전부 소진, `IA-2`).
  대륙 필터도 역사국가를 배제하므로 두 축이 동시에 현대 편향이고, 역사국가로만 태그된 사건은
  '국가로 좁히기' 브라우즈 동선에서 사실상 부재한다 — 역사 카탈로그에서 엔티티 한 클래스의 전면 부재다.
- 반대로 검색 중에는 **상한이 풀려** 334개가 통째로 DOM에 들어간다(`PERF-9`, 가상화 없음).
- 선택된 국가가 앞 50개 밖이면 팝오버 안에 체크가 하나도 없다(`INT-5`).

처방: 팝오버를 '현대/역사' 2섹션으로 나눠 각 섹션에 별도 상한 + '역사 국가 N개 더 보기',
정렬은 **로드된 사건의 태그 빈도** 내림차순(참조 DB 순서보다 카탈로그 맥락에 맞다),
선택 항목은 절단과 무관하게 항상 상단 고정, 검색 중에도 상한 100 + '조건에 맞는 N건 중 100건 표시'.
같은 계산으로 축별 건수 맵을 만들어 옵션 우측에 회색 숫자를 붙이면 `IA-13`(세기만 사건 파생, 나머지는 DB 전량이라
한 필터 바 안에서 옵션 모집단 규약이 갈리는 문제)도 해소된다.
`IA-1`(대륙+국가 모순 조합) · `IA-9`(모달의 대륙 키가 name, 페이지는 id) · `IA-12`(빈 상태 drop-one-out 카운트) ·
`IA-14`(모달 '전체 국가' sentinel이 ㅈ 구간에 파묻힘 + 역사 탭엔 해제 수단 없음)도 같은 옵션 모델 수술에 얹힌다.

### 배치 8 — 렌더 낭비 정리 (S)

포함: `PERF-7` · `INT-15/PERF-8` · `PERF-11` · `PERF-4` · `PERF-5`

전부 "화면에 없는데 도는" 계산이다. 오늘 규모에서 체감은 없지만 수정이 각 1~10줄이고 회귀 위험이 0에 가깝다.

- 닫힌 국가 모달이 매 렌더 국가 전량을 필터·정렬한다 — `if (!isOpen) return null`이 **310행**에 있어
  그 앞의 memo 3벌과 생 map 2회가 먼저 돈다. 호출부 조건부 마운트 한 줄로 끝나고,
  이 모달은 인물·사건 등이 공유하므로 이득이 이 페이지에 국한되지 않는다(`PERF-7`).
- `useAnchoredPosition`이 스크롤 이벤트마다 **같은 좌표로 새 객체**를 setState한다. 트리거는 목록 스크롤러 밖
  sticky 툴바라 rect가 변하지 않는데도 팝오버 50개 옵션이 매 프레임 재조정된다 — 4개 숫자 얕은 비교 + rAF 코얼레스(`INT-15/PERF-8`).
- URL 동기화가 **raw** `keywordInput`에 의존해 키 입력마다 `setSearchParams`가 돈다(디바운스는 재계산만 늦춘다).
  소스를 `debouncedKeyword`로 바꾸면 키당 2렌더가 1렌더로 준다(`PERF-11`).
- `buildYearBuckets`가 같은 입력으로 페이지·위젯에서 2회(`PERF-4`) — 성능보다 **단일 출처** 논거가 크다
  (`list-grouping.ts:247-252`가 두 판정이 어긋나면 안 된다고 경고). 페이지 값을 prop으로 내리면 된다.
- `matchesEvent`가 사건당 2패스로 평가되고 캐시가 두 훅에 따로 있다(`PERF-5`) — 소문자 haystack 사전계산 +
  `matchCache`를 `useEventFilters`로 끌어올려 공유.

---

## 3. 전체 건 표

### P1 (3행 · 4건)

| id | 확신도 | 렌즈 | 제목 | 파일:줄 | 제안 | 규모 | 배치 |
|---|---|---|---|---|---|---|---|
| **INT-1 / A11Y-2** | CONFIRMED | INT·A11Y | 카테고리·대륙 팝오버는 열려도 포커스가 이동하지 않고 포털이 body 끝이라 키보드·SR로 도달 불가 | `widgets/event-filters-panel/ui/filters-panel.tsx:284` | combobox 패턴으로 포커스를 트리거에 유지(정공법). 임시안은 `searchable` 무관 포커스 이동 + Tab 트랩/focusout 닫기 | M | 1 |
| **GAP-1** | PLAUSIBLE | GAP | 필터의 '문맥 부모'가 목록에서만 강등되고 6개 뷰·JSON 내보내기는 데이터로 집계 | `features/event-hierarchy/model/useEventHierarchy.ts:27` | 뷰에 넘기기 전 `matchedOnlyHierarchy`를 만들거나 각 뷰 루프에 `!isMatch continue`. 내보내기엔 `matchesFilter`+필터 메타 | M | 3 |
| **GAP-2** | PLAUSIBLE | GAP | 등록순 정렬 시 그룹핑이 꺼져 접힌 행까지 렌더되는데 카운트·드로어 이전/다음은 접힘을 계속 적용 | `pages/events/list/events.page.tsx:526` | `grouped`를 페이지 단일 변수로 두고 위젯 prop과 `selectVisibleRows` 조건이 같은 값을 읽게 | S | 3 |

### P2 (28행 · 34건)

| id | 확신도 | 렌즈 | 제목 | 파일:줄 | 제안 | 규모 | 배치 |
|---|---|---|---|---|---|---|---|
| DATA-4 / IA-3 | CONFIRMED | DATA·IA | 국가 필터가 id 정확 일치라 서버(브리지 계보 포함)와 정의가 달라 화면마다 다른 결과 | `features/event-filters/model/useEventFilters.ts:140` | 서버 위임(권장) 또는 `parentModernCountryIds` 역인덱스로 OR 합류 + 칩 라벨 정직화 | M | 2 |
| DATA-1 / IA-4 | CONFIRMED | DATA·IA | 세기 필터가 시작·끝 '두 점'만 비교 — 중간 세기에서 사건 누락, 옵션에도 미생성 | `features/event-filters/model/useEventFilters.ts:132` | `eventSpansCentury()` 하나로 구간 겹침 판정 + `availableCenturies`도 사이 세기 채움 | M | 2 |
| IA-7 / DATA-10 | CONFIRMED | IA·DATA | 북마크만 평탄화 '이후' 행 단위 적용 — 접기와 곱해지면 북마크한 자식이 복구 수단 없이 사라짐 | `pages/events/list/events.page.tsx:454` | `matchesEvent`·`hasNarrowingFilters`에 `bookmarksOnly` 합류 후 사후 filter 삭제 | M | 2 |
| DATA-9 | CONFIRMED | DATA | 세기 필터는 자기 날짜로 판정, 목록 버킷은 부모 귀속 → '19세기' 칩 아래 '18세기' 헤더 | `features/event-hierarchy/model/list-grouping.ts:109` | 필터 중에는 매칭 행을 자기 연도 버킷에 귀속(최소안: 행에 자기 연도 토큰 강제 노출) | M | 2 |
| DATA-6 | CONFIRMED | DATA | '조건 일치 N건'이 하위 접기에 반응해 줄어듦 — 카운트가 접힘 상태를 셈 | `pages/events/list/events.page.tsx:480` | `visibleFlattenedHierarchy` 기준으로 카운트(접힘 이전). 화면 행 수는 `displayedCount`가 별도로 말함 | S | 3 |
| URL-1 / IA-16 / DATA-17 | CONFIRMED | URL·IA·DATA | URL 필터 값 무검증 + 미해결 id 폴백 라벨이 축마다 3가지(국가는 '필터 없음'과 동일 문자열) | `pages/events/list/hooks/use-catalog-url-sync.ts:112` | 참조 로드 후 미해결 id를 FILTER_ALL로 낙하 + URL 키 제거 + 고지. 폴백 문자열 '알 수 없음'으로 통일 | M | 4 |
| URL-4 | CONFIRMED | URL | `?event=<삭제 id>`가 '사건 상세' 랜드마크를 점유한 채 '사건을 선택해주세요' — 닫기 어포던스 0 | `pages/events/list/events.page.tsx:355` | 로드 소진 후 '찾을 수 없습니다 + 선택 해제' 전용 상태 + URL 키 제거. 빈 분기에도 ✕ 노출 | M | 4 |
| URL-6 | CONFIRMED | URL | 드로어 '조건 밖' 배너의 '필터 초기화'가 원인(연도·세기 접힘)을 안 풀어 완전한 먹통 버튼 | `pages/events/list/events.page.tsx:1008` | `handleResetAll` 계약을 '행을 감추는 모든 것'으로 확장(접힘 포함) 또는 배너를 원인별 분기 | S | 4 |
| IA-2 | CONFIRMED | IA | 국가 팝오버 첫 화면에 역사국가가 구조적으로 0개 — 현대 70개가 50 슬롯 전부 소진 | `widgets/event-filters-panel/ui/filters-panel.tsx:164` | 현대/역사 2섹션 + 섹션별 상한 + '역사 국가 N개 더 보기'. 정렬은 사건 태그 빈도순 | M | 7 |
| INT-2 / A11Y-1 | CONFIRMED | INT·A11Y | `role=listbox` 선언인데 화살표·`aria-activedescendant` 전무, 옵션 50개가 개별 탭 정지점 | `widgets/event-filters-panel/ui/filters-panel.tsx:331` | ↑↓/Home/End/Enter keydown + roving tabindex 또는 activedescendant. 트리거에 `aria-controls` | M | 1 |
| INT-3 / A11Y-5 | CONFIRMED | INT·A11Y | 옵션 선택·Esc로 닫힐 때 포커스가 트리거로 복귀하지 않고 body로 낙하 | `widgets/event-filters-panel/ui/filters-panel.tsx:368` | `closePopover(restoreFocus)` 단일 창구에서 `triggerRef.focus({preventScroll})` (외부클릭은 제외) | S | 1 |
| INT-8 / A11Y-4 | CONFIRMED | INT·A11Y | 트리거 `aria-label`이 선택값을 덮어써 접근 이름이 항상 '카테고리 필터' — WCAG 2.5.3 실패 | `widgets/event-filters-panel/ui/filters-panel.tsx:312` | `aria-label` 제거하고 접근 이름을 시각 텍스트로('카테고리: 정치'). 팝오버 이름은 분리. spec 갱신 | S | 1 |
| INT-9 | CONFIRMED | INT | 칩 제거 시 포커스 유실 + 뒤 칩이 좌측으로 당겨져 연속 클릭이 엉뚱한 필터를 지움 | `pages/events/list/components/catalog-toolbar.tsx:262` | 다음 칩→이전 칩→검색 입력 순 폴백 포커스. 제거 커밋을 다음 프레임으로 늦춰 연쇄 오클릭 완화 | S | 6 |
| INT-10 | CONFIRMED | INT | 필터·검색을 바꿔도 목록 스크롤이 초기화되지 않아 새 결과의 중간에 착지 | `widgets/event-list-compact/ui/event-compact-list.tsx:402` | 좁히는 필터 변경 시 `[data-list-scroller]`의 scrollTop=0 (선택 사건 없을 때만) | M | 6 |
| A11Y-3 / A11Y-10 | CONFIRMED | A11Y | 0건이 되면 라이브 영역 둘이 동시에 사라져 SR에 고지가 남지 않음 + 스피너 `role=status`에 텍스트 0바이트 | `pages/events/list/components/catalog-header-stats.tsx:68` | 페이지 레벨에 **항상 마운트**되는 단일 라이브 영역(텍스트만 교체) + `MetaArea`의 `aria-live` 제거 + 스피너 `aria-hidden` | S | 6 |
| VIS-2 / A11Y-7 | CONFIRMED | VIS·A11Y | 포커스 링(box-shadow)이 `FilterGroup`의 `overflow:hidden`에 잘려 4개 중 어디에 포커스인지 불명 | `pages/events/styles/filter.styles.ts:43` | `outline: 2px solid; outline-offset:-2px`(또는 inset)로 교체 + 그룹 `:focus-within` 링은 border만. `focusRingInset` 토큰 신설 | S | 5 |
| VIS-4 | CONFIRMED | VIS | 라벨 치환식 활성 표시가 트리거 폭을 무제한 요동 — 긴 국가명 하나로 액션 줄이 새 줄로 밀림 | `widgets/event-filters-panel/ui/filters-panel.tsx:87` | `필드명 · 값` 2요소 + 값 span `max-width:12ch; ellipsis` + 트리거 `min-width`로 슬롯 고정 | S | 5 |
| VIS-8 / VIS-13 | CONFIRMED | VIS | 칩 바가 액션 줄 아래로 밀려 원인·결과 분리 + 자리 예약 없어 토글마다 목록이 세로로 튐 | `pages/events/list/components/catalog-toolbar.tsx:256` | 칩 바를 전용 행으로 승격(`width:100%` + `min-height`) — `margin-left:auto` 무효·세퍼레이터 고아도 함께 해소 | M | 6 |
| GAP-3 | PLAUSIBLE | GAP | 격자·통계·트리·갤러리가 자동 로드 중에도 '표시할 데이터가 없습니다'를 확정 + 필터 해제 경로 0 | `pages/events/list/events.page.tsx:769` | `isLoading`/`hasMore`/`hasActiveFilters`/`onResetFilters`를 4뷰에도 배선하고 빈 상태를 공용 슬롯으로 수렴 | M | 3 |
| GAP-4 | PLAUSIBLE | GAP | 타임라인 안에 두 번째 필터 체계(groupBy·카테고리 숨김) — URL·칩·초기화 어디에도 없고 키도 name vs id | `widgets/event-timeline/ui/event-timeline.tsx:413` | 단기: 페이지 상태로 승격 + URL(`hide`/`lane`) + 칩·`activeFilterCount`·리셋 포함. 중기: 키를 categoryId로 | M | 3 |
| GAP-5 | PLAUSIBLE | GAP | 참조 데이터 로딩·실패가 필터 UI에 전혀 표현되지 않아 빈 필터와 '알 수 없음'이 정상 화면처럼 보임 | `pages/events/list/hooks/use-catalog-reference-data.ts:42` | 훅이 `{data,isLoading,isError,refetch}`를 축별 반환 → 로딩 skeleton / 실패 '다시 시도' 행 / 칩 폴백 문구 구분 | M | 4 |
| GAP-6 | PLAUSIBLE | GAP | 평면 모드에서 '하위 접기'가 no-op인데 활성이고, 그 클릭이 계층을 다시 켤 때 뒤늦게 터짐 | `pages/events/list/components/catalog-toolbar.tsx:200` | `showFlatView`를 툴바까지 내려 숨김 또는 `disabled` + 사유 title — 행 셰브론의 `canExpand` 규약과 동일 판단 | S | 3 |
| GAP-7 | PLAUSIBLE | GAP | 통계 뷰 배너가 필터 상태에서 거짓 모수 주장, 전량 로드되면 '필터된 통계'라는 사실을 0회 언급 | `widgets/event-dashboard-view/ui/event-dashboard-view.tsx:192` | 배너 모수를 `stats.total`로 교체 + `hasActiveFilters`/칩을 넘겨 필터 중에는 조건 요약 배너 상시 노출 | S | 3 |
| GAP-8 | PLAUSIBLE | GAP | 필터가 걸린 채 새 사건을 등록하면 결과에 안 나타나는데 안내 0 — `onSaved` 미배선 | `pages/events/list/events.page.tsx:1195` | `onSaved` 배선: 매칭이면 선택+스크롤, 아니면 `notify.action('… 필터와 맞지 않습니다', '필터 해제하고 보기')` | S | 6 |
| GAP-9 | PLAUSIBLE | GAP | 세기 필터는 BC를 지원하는데 타임라인은 BC ISO를 네이티브 Date로 파싱해 AD 위치에 그림 | `widgets/event-timeline/ui/event-timeline.tsx:541` | `parseIsoDateParts` + 부호 연도 산술로 교체(격자 뷰와 동일 패턴). BC 파싱에 네이티브 Date 금지를 lint로 | S | 2 |
| GAP-10 | PLAUSIBLE | GAP | 필터 의미론 단일 출처와 URL 동기화에 테스트 0건 — 유일한 필터 spec 4건은 포털 기계 동작만 고정 | `widgets/event-filters-panel/ui/filters-panel.spec.tsx:10` | `useEventFilters.spec.ts`(술어 테이블·파생·칩·리셋) + `use-catalog-url-sync.spec.ts`(12파라미터 왕복·폴백) 신설 | M | 2 |
| DATA-2 | CONFIRMED | DATA | 서버 `century`가 10세기 이하에서 Invalid Date — 세기 축 서버 이관을 막는 진짜 이유 | `apps/api/src/libs/event/presentation/event.controller.ts:447` | `startDate` 범위 대신 `startYear`/`startEra`(또는 백필 signed_year) 기준 재작성. 그 전엔 decade 렌즈 3자리 옵션 차단 | M | 보류 |
| PERF-1 | CONFIRMED | PERF | 서버가 이미 지원하는 필터 축을 하나도 안 쓰고 전 페이지를 소진 — 10배에서 20회 순차 왕복 | `pages/events/list/events.page.tsx:263` | 임계(`serverTotal`) 기반 전환. 이관 시 서버 where를 `OR: [{…}, {childEvents:{some:…}}]`로 확장해 클라 의미 보존 | L | 보류 |

### P3 (42행 · 56건)

| id | 확신도 | 렌즈 | 제목 | 파일:줄 | 제안 | 규모 | 배치 |
|---|---|---|---|---|---|---|---|
| IA-8 / INT-7 / VIS-3 / A11Y-6 | CONFIRMED | IA·INT·VIS·A11Y | `data-active`를 내보내는데 소비 CSS가 레포에 0건 — 활성/비활성 트리거의 유일한 차이가 라벨 문자열 | `widgets/event-filters-panel/ui/filters-panel.tsx:313` | `FilterGroup` 안에 `& button[data-active='true']` 규칙(굵기+인디케이터+색 3중). 죽은 속성을 남길 거면 제거 | S | 5 |
| VIS-11 | CONFIRMED | VIS | `FilterTriggerButton`의 배경·보더·radius·height가 `FilterGroup`의 `!important`에 전량 사장 | `pages/events/styles/filter.styles.ts:233` | `!important` 리셋 제거 + `$inGroup` variant로 그룹 내부 형태를 자기 파일에서 표현 (배치 5의 **선행**) | M | 5 |
| VIS-10 | CONFIRMED | VIS | `filter.styles.ts` 820줄 중 ≈360줄이 죽은 표면 — 미참조 export 8 + 고아 위젯 전용 18 | `pages/events/styles/filter.styles.ts:259` | `widgets/event-list/ui/filter-panel.tsx`(참조 0) 삭제 → 죽는 export 26개 제거. `theme.ts`의 `SURFACE`·`Z_INDEX`도 소비처 0 | S | 5 |
| VIS-1 | CONFIRMED | VIS | 색 리터럴 149개 vs `theme.colors` 1회, `BRAND` 경유 규약 36줄 위반 | `pages/events/styles/filter.styles.ts:653` | 값 동일 리터럴 기계 치환 + `CONTROL` 토큰 신설(6컨트롤이 같은 6값 복붙) + eslint 금지 규칙. VIS-10 뒤에 하면 대상 절반 | M | 5 |
| VIS-7 | CONFIRMED | VIS | ≤768px FilterGroup 우측 mask가 넘치지 않을 때도 상시 적용 — 모서리·보더가 흐려짐 | `pages/events/styles/filter.styles.ts:124` | **삭제 아님** — `scrollWidth>clientWidth` 조건화 또는 별도 오버레이 의사요소(375~400px에서는 실제로 넘침) | S | 5 |
| VIS-9 | CONFIRMED | VIS | 툴바 한 줄 컨트롤의 브레이크포인트·높이 3중 불일치(641~768px에서 필터 그룹만 6px 큼) | `pages/events/styles/filter.styles.ts:39` | `--toolbar-control-h` 변수 하나로 내리고 터치 확대 지점을 768px 하나로 통일. 구조 전환(1024·640)만 별도 유지 | M | 5 |
| VIS-14 | CONFIRMED | VIS | `CatalogToolbar` 36 props 중 17개가 순수 배관 + 주 경로 핸들러만 optional이라 미배선이 조용히 먹통 | `pages/events/list/components/catalog-toolbar.tsx:35` | `filters: React.ReactNode` 슬롯으로 전환(props 36→19) + `onSelect*` 3종 required 승격 | M | 6 |
| IA-15 | CONFIRMED | IA | 세기만 네이티브 select — 미적용 시 트리거가 '전체'가 되어 축 이름이 사라지고 조작 감각도 다름 | `widgets/event-filters-panel/ui/filters-panel.tsx:168` | `InlineFilterPopover`로 전환(옵션: 전체/미상/세기, `searchable` 조건부). 최소안은 첫 옵션 라벨 '세기 전체' | M | 5 |
| IA-5 | CONFIRMED | IA | '연도 미상'은 목록의 1급 섹션인데 세기 축엔 그 값이 없어 세기를 고르면 전량 조용히 탈락 | `widgets/event-filters-panel/ui/filters-panel.tsx:180` | 세기 옵션에 `미상` sentinel 추가 + 술어 분기 + URL `century=unknown` 왕복 + 칩 '세기 · 연도 미상' | S | 2 |
| GAP-11 / DATA-16 | PLAUSIBLE | GAP·DATA | `location`(실데이터 85건)이 표시·내보내기까지 되는데 검색 술어에 없음. city·행정구역은 매핑 자체가 누락 | `features/event-filters/model/useEventFilters.ts:125` | keywordOk에 `location` 추가 + placeholder 정직화(즉시, S). city/adminDivision 매핑은 실데이터 0건이라 후순위 | S | 2 |
| DATA-7 | CONFIRMED | DATA | 미필터 시 카테고리 통계는 자식 포함, 총계는 최상위 — 파일이 선언한 모수 규약을 스스로 위반 | `pages/events/list/events.page.tsx:666` | 미필터 분기에서 `events.filter(e=>!e.parentEventId)`를 넘겨 `serverTotal`과 모수 일치 | S | 3 |
| IA-17 | CONFIRMED | IA | 'N개 적용 중' 숫자와 렌더된 칩 개수가 어긋나고, 검색어만 있으면 칩 0개인 칩 바가 뜸 | `pages/events/list/events.page.tsx:681` | `activeFilterCount`를 렌더 대상과 같은 집합으로(keyword 제외·북마크 포함). 칩 0개면 바 자체를 렌더 안 함 | S | 3 |
| DATA-11 / URL-2 | CONFIRMED | DATA·URL | `century` 파싱이 `Number.isFinite`만 봐서 0·소수·지수·공백이 통과, 옵션에 없으면 select가 빈 칸 | `pages/events/list/hooks/use-catalog-url-sync.ts:121` | 정수·비0·\|c\|≤21 검증 + 실패 시 URL 키 제거. 선택값이 옵션에 없으면 임시 option 렌더('결과 없음') | S | 4 |
| URL-3 | CONFIRMED | URL | `sort`만 검증 없이 `as SortOption` 캐스팅 — 잘못된 값이면 정렬 컨트롤이 빈 칸, 화면과 URL이 다른 말 | `pages/events/list/hooks/use-catalog-url-sync.ts:134` | `Object.values(SORT_OPTIONS)` 화이트리스트 + 낙하 시 URL 키 제거(같은 훅 4개 파라미터의 기존 패턴) | S | 4 |
| URL-5 | CONFIRMED | URL | URL→상태 시딩이 12개 중 4개뿐 — 마운트 첫 write가 딥링크 필터를 전부 지웠다가 복구 | `pages/events/list/hooks/use-catalog-url-sync.ts:152` | 전 필터 state를 URL lazy initializer로 통일 + 파싱을 순수 함수로 추출(URL-1~3 검증도 그 한 곳에) | M | 4 |
| URL-7 | CONFIRMED | URL | '전체 초기화' 범위가 자의적 — 정렬은 되돌리면서 계층 토글·선택·접힘은 남기고 고지도 없음 | `features/event-filters/model/useEventFilters.ts:306` | 정렬 제외(`hasNarrowingFilters` 정의와 일치) + 접힘 포함 + 범위를 라벨/툴팁에 명시하고 주석에 규약화 | S | 4 |
| URL-8 / INT-11 | CONFIRMED | URL·INT | '전체 초기화'에 되돌리기가 없고 모든 write가 replace라 뒤로가기로도 복구 불가 | `pages/events/list/components/catalog-toolbar.tsx:286` | 초기화 직전 스냅샷 캡처 → `notify.action('필터 N개 해제', {label:'되돌리기'})` (북마크 토글의 기존 선례와 동일 규약) | S | 4 |
| URL-11 | CONFIRMED | URL | `bookmarks=1`은 URL에 실리는데 북마크 실체는 브라우저 로컬 — 받는 사람은 항상 0건 | `pages/events/list/hooks/use-catalog-url-sync.ts:109` | 공유·복사 시 `bookmarks` 키 제외 + `bookmarks.size===0`이면 빈 상태에 '이 브라우저에만 저장됩니다' 고지 | S | 4 |
| URL-12 | CONFIRMED | URL | `view`를 항상 기록해 디바이스가 추론한 기본값이 사용자 선택처럼 공유 — 모바일 LIST 폴백 무력화 | `pages/events/list/hooks/use-catalog-url-sync.ts:175` | 사용자가 실제로 뷰를 전환했을 때만 기록. 또는 수신 측이 모바일+timeline이면 LIST 강등 + 고지 | S | 4 |
| URL-13 | CONFIRMED | URL | 공백만 있는 검색어가 URL에 남아 '필터가 걸린 것처럼' 보이지만 아무 것도 좁히지 않음 | `pages/events/list/hooks/use-catalog-url-sync.ts:158` | `setOrDel('q', keywordInput.trim() \|\| null)` + URL→state도 trim (다른 판정과 단일 기준) | S | 4 |
| INT-4 | CONFIRMED | INT | '전체 보기 →' 모달을 닫아도 트리거로 복귀 안 함 — 팝오버가 모달보다 먼저 언마운트돼 복원 대상이 body | `widgets/event-filters-panel/ui/filters-panel.tsx:393` | `onShowMoreModal()` 호출 **전에** `triggerRef.focus()` → 모달이 기억하는 previouslyFocused가 트리거가 됨 | S | 1 |
| INT-12 | CONFIRMED | INT | 팝오버 검색창에서 Esc가 검색어가 아니라 팝오버 전체를 닫고, 검색어만 지울 수단이 없음 | `widgets/event-filters-panel/ui/filters-panel.tsx:281` | Esc 2단 규약(1회차 `setQuery('')`+`stopPropagation`, 빈 값일 때만 닫기) + 커스텀 지우기 ✕ 노출 | S | 1 |
| INT-13 / A11Y-9 | CONFIRMED | INT·A11Y | 검색창 Enter가 no-op이고 결과 0건도 고지 없음 + 검색 input이 `role=listbox`의 무효 자식 | `widgets/event-filters-panel/ui/filters-panel.tsx:345` | Enter=활성 옵션 확정(INT-2와 한 벌) + 팝오버 안 `role=status` 라이브 영역 상시 마운트 + SearchRow를 listbox 밖으로 | S | 1 |
| INT-14 | PLAUSIBLE | INT | 팝오버를 닫으려는 바깥 클릭이 뒤 요소로 통과해 닫으면서 사건 드로어가 열림 | `widgets/event-filters-panel/ui/filters-panel.tsx:263` | 닫기를 소비하는 투명 스크림 포털 또는 첫 outside mousedown의 뒤이은 click 1회 삼킴. 3벌 팝오버 규약 통일 | S | 1 |
| A11Y-8 | PLAUSIBLE | A11Y | 국가 팝오버의 50개 절단이 SR에 전달 안 됨 — `aria-setsize/posinset` 부재 + 안내가 listbox 무효 자식 | `widgets/event-filters-panel/ui/filters-panel.tsx:297` | 옵션에 `aria-setsize/posinset` 부여 + Footer를 listbox 밖으로 + 문구를 '전체 N개 중 50개 표시'로 수치화 | S | 1 |
| INT-5 | CONFIRMED | INT | 선택된 국가가 앞 50개 창 밖이면 팝오버에 표시되지 않아 현재 선택을 확인·해제 불가 | `widgets/event-filters-panel/ui/filters-panel.tsx:297` | 선택 옵션을 절단과 무관하게 상단 고정 + 열릴 때 `scrollIntoView({block:'nearest'})` | S | 7 |
| PERF-9 | CONFIRMED | PERF | 검색 중에는 `maxVisible`이 무시돼 옵션 334개가 통째로 DOM에(가상화 없음) | `widgets/event-filters-panel/ui/filters-panel.tsx:297` | 검색 중에도 상한(100) 적용 + '조건에 맞는 N건 중 100건 표시' 푸터. 200 초과가 확실한 국가는 windowing 검토 | M | 7 |
| IA-13 | CONFIRMED | IA | 필터 옵션에 건수가 없어 '빈손' 선택을 못 막음 — 세기만 사건 파생, 나머지는 DB 전량(규약 불일치) | `widgets/event-filters-panel/ui/filters-panel.tsx:120` | 로드된 events에서 축별 건수 맵 → 옵션 우측 회색 숫자 + 0건 기본 숨김 토글. 4축 모집단 규약 통일 | M | 7 |
| IA-14 | CONFIRMED | IA | 모달의 '전체 국가'(해제) 옵션이 이름 정렬에 섞여 ㅈ 구간에 파묻히고, 역사 탭엔 해제 수단 자체가 없음 | `pages/events/list/components/catalog-entity-filter-modals.tsx:65` | sentinel을 정렬 제외 + 그리드 최상단 고정(또는 헤더 '필터 해제' 버튼)하고 탭 무관 노출. 단일 선택도 체크 배지 표시 | S | 7 |
| IA-1 | CONFIRMED | IA | 대륙→국가는 개념상 계층인데 옵션·술어 모두 평행 — '아시아+프랑스' 영구 0건 조합을 UI가 안 막음 | `widgets/event-filters-panel/ui/filters-panel.tsx:99` | 대륙 선택 시 국가 옵션을 그 대륙으로 좁힘(역사국가는 '대륙 미상' 그룹으로 존치) + 충돌 시 인라인 해제 액션 | M | 7 |
| IA-9 | CONFIRMED | IA | '전체 보기' 모달이 자체 대륙 필터를 갖는데 페이지와 단절, 키도 name vs id로 갈림 | `shared/ui/advanced-country-select-modal/advanced-country-select-modal.tsx:88` | `initialContinentId` prop으로 시딩 + 모달 내부 필터를 continentId 기준으로 통일. 동기/로컬 여부를 라벨로 명시 | M | 7 |
| IA-12 | CONFIRMED | IA | 0건 회복 경로에 'drop-one-out 카운트'가 없어 어느 축이 범인인지 추측을 요구 | `widgets/event-list-compact/ui/event-compact-list.tsx:337` | 빈 상태 칩을 '카테고리 · 전쟁 ✕ (해제 시 37건)'으로. 단일 원인이면 CTA 승격. 축 5개라 재계산 5회 | M | 7 |
| IA-6 | PLAUSIBLE | IA | 북마크(진짜 필터)는 액션 줄에, 계층 토글(표시 옵션)은 필터 그룹에 — 두 축이 자리를 바꿔 앉음 | `pages/events/list/components/catalog-toolbar.tsx:220` | 계층 스위치를 표시 옵션 묶음으로, 북마크를 필터 그룹 5번째 세그먼트로 → '필터 그룹=칩=초기화 대상' 규칙 성립 | S | 6 |
| PERF-7 | CONFIRMED | PERF | 닫혀 있는 국가 모달이 매 렌더 국가 전량을 필터·정렬 — early return이 `useMemo`들 뒤(310행) | `pages/events/list/components/catalog-entity-filter-modals.tsx:65` | 호출부 조건부 마운트 + `modernCountries` 배열 `useMemo`. 근본은 Body 분리(공유 모달이라 이득 범위 넓음) | S | 8 |
| INT-15 / PERF-8 | CONFIRMED | INT·PERF | `useAnchoredPosition`이 스크롤마다 동일 좌표로 새 객체 setState — 좌표 불변인데 옵션 50개 재렌더 | `shared/hooks/use-anchored-position.hook.ts:63` | 이전 값과 4필드 비교 후 동일하면 setState 생략 + rAF 코얼레스 + `passive:true` | S | 8 |
| PERF-11 | CONFIRMED | PERF | 250ms 디바운스가 재계산만 늦추고 리렌더는 못 막음 — URL 동기화가 raw `keywordInput`에 의존 | `pages/events/list/hooks/use-catalog-url-sync.ts:184` | q 소스를 `debouncedKeyword`로(deps 포함). 키당 2렌더 → 1렌더 | S | 8 |
| PERF-4 | CONFIRMED | PERF | `buildYearBuckets`가 같은 입력으로 페이지·위젯에서 2회 — 성능보다 **단일 출처** 논거 | `pages/events/list/events.page.tsx:517` | 페이지가 계산한 `yearBuckets`를 prop으로 내리고 위젯 memo 제거(호출부 1곳이라 회귀 위험 0) | S | 8 |
| PERF-5 | CONFIRMED | PERF | `matchesEvent`가 사건당 2패스 평가 + 호출마다 title/description 새 소문자 복사, 캐시가 두 훅에 따로 | `features/event-filters/model/useEventFilters.ts:120` | `events` 의존 memo로 소문자 haystack 사전계산 + `matchCache`를 `useEventFilters`로 끌어올려 공유 | M | 8 |
| URL-10 | CONFIRMED | URL | 필터 프리셋/저장된 검색이 없고 조건을 URL로 공유·복사하는 진입점이 UI에 0개 | `pages/events/list/hooks/use-catalog-url-sync.ts:19` | 1단계(S): 칩 바 우측 '링크 복사'. 2단계(M): `papyrus.events.filterPresets`에 search string 스냅샷 저장 | M | 보류 |
| IA-10 | CONFIRMED | IA | '정치 OR 전쟁', '프랑스+영국' 다중 선택 불가 — 서버·API 래퍼·모달은 전부 지원하는데 카탈로그만 단일 | `pages/events/list/components/catalog-entity-filter-modals.tsx:74` | 상태를 `string[]`로 승격 + 술어 `some()` + URL `country=a,b`(단일 하위호환) + 칩 '프랑스 +2' | L | 보류 |
| IA-11 / IA-18 | CONFIRMED | IA | 연도 범위·십년대·품질 축 부재 — 서버는 지원하고 그 구현은 라우팅 안 된 원장에만 있음 | `features/event-filters/model/useEventFilters.ts:46` | 세기 컨트롤을 '시간' 축으로 일반화(세기/십년대/사용자 지정) + 품질 칩 3종 + `lensToEventsOptions` 승격 | L | 보류 |
| VIS-6 | CONFIRMED | VIS | 동일 구조 포털 드롭다운 3벌 복붙 — radius·shadow·z-index 토큰이 서로 다르고 외부클릭/Esc도 3중 중복 | `widgets/event-filters-panel/ui/filters-panel.tsx:414` | `shared/ui/anchored-popover` 신설(위치+포털+외부클릭+Esc+표면 흡수) → 3소비처는 옵션 렌더만(≈300→90줄) | L | 보류 |

---

## 4. 기각·보류

이번 라운드에서 손대지 않는 건과 그 이유. **전부 유효한 지적이며 기각이 아니라 순서 문제인 것과, 제품 결정이 필요한 것으로 갈린다.**

| id | 사유 |
|---|---|
| **PERF-1** (P2 · L) | **아키텍처 결정 대기.** 지금 규모(루트 171건, 왕복 2회)에서 클라 전역 필터는 옳은 선택이다 — 필터 전환이 네트워크 0회다. 서버로 옮기면 `queryKey`가 갈려 필터마다 재요청·로딩 상태가 생기고, 서버 where가 루트에만 걸려 '자식만 매칭된 루트를 살린다'는 클라 의미가 깨진다(제안 자체가 인정). **임계(`serverTotal`) 기반 전환으로 설계할 것**이며 선행은 DATA-2. |
| **DATA-2** (P2 · M) | **카탈로그 영향 0.** 서버 `century`는 카탈로그가 호출하지 않고, 원장(`/events/ledger`)은 미라우트다. 다만 같은 코드의 `decade` 렌즈는 UI로 도달 가능하고 살아있는 사건 24건이 3자리 연도라 옵션이 실제로 노출된다. **PERF-1의 선행 조건**이므로 그때 함께. |
| **IA-10** (P3 · L) | **제품 결정.** 다중 선택은 상태·URL 스키마·칩·팝오버 조작 모델(선택 후 닫지 않음 + '적용')을 동시에 바꾼다. 서버 `categoryId`는 단일이라 카테고리 다중은 클라 술어로만 가능해 근인 1(정의 정본화)과 충돌할 수 있다. **배치 2에서 국가 축 정본을 정한 뒤** 착수. |
| **IA-11 / IA-18** (P3 · L) | **범위가 필터 축 신설.** '품질 3종'과 '십년대·연도 범위'는 새 축이라 URL·칩·서버 파라미터·옵션 UI가 모두 늘어난다. 원장의 `lensToEventsOptions` 승격이 선행이고, 격자 카드 클릭 → 드릴다운(선행 검토서 IA-11)과 한 덩어리로 다뤄야 중복 계상이 없다. |
| **URL-10** (P3 · M) | **신규 기능.** 프리셋은 사업계획서 2차 로드맵에 이미 있다. 다만 **1단계 '링크 복사'(S)는 배치 4에 얹을 수 있다** — URL이 이미 완전한 직렬화이고 파서가 한 곳으로 모이면 저장 포맷이 search string 하나로 끝난다. 2단계(프리셋 CRUD)만 보류. |
| **VIS-6** (P3 · L) | **배치 1과 충돌.** 팝오버 3벌 통합은 옳지만, 배치 1이 그중 하나(필터 팝오버)를 combobox로 재작성한다. **먼저 통합하면 재작성이 공용 컴포넌트를 오염시키고, 먼저 재작성하면 통합 대상이 바뀐다.** 배치 1 완료 후 확정된 마크업을 기준으로 추출할 것. |

### 재발굴 금지 / 이미 다뤄진 건

아래는 이번 발굴에서 **선행 검토서와 중복**으로 확인된 것들이다. 위 표에 남겼지만 선행 문서의 id로 귀속해 관리한다.

- `URL-7` ≡ 선행 `IA-13`/`TF-16`(초기화가 정렬까지) — 이미 등재·미착수. 새 근거(라벨·카운트 모수)로 등급 변동 없음.
- `IA-17` ≡ 선행 `TF-14`/`IA-12`(카운트 불일치) — 증분은 '칩 0개 바'라는 구체 상태뿐.
- `IA-1` ≡ 선행 `TF-15`(대륙↔국가 계층) — 유예 사유였던 '팝오버 노출 0'이 포털 수정으로 **소멸**해 재평가 시점 도래.
- `PERF-9` ≡ 선행 `PERF-11①` — 같은 유예 조건(P1-1 팝오버 클리핑)이 해소돼 재평가 대상.
- `PERF-11` ≡ 선행 `PERF-5` — 배치 6에 채택됐으나 미구현. 렌더 산수만 정정(키당 2→1렌더 반감이지 제거 아님).
- `VIS-10` ⊃ 선행 `docs/event-list-page-ux-review.md:671`(고아 위젯 삭제) — 신규분은 죽은 export 전수(≈360/820줄)와 `SURFACE`·`Z_INDEX` 사문화.
- `A11Y-3` ⊃ 선행 `A11Y-16`(P3, 배치5 미착수) — 증분은 배치4 `statsEvents` 배선으로 '0건'조차 사라진 것.

### 심각도가 내려간 주요 건 (착수 전 재확인 대상 아님 — 근거 기록용)

- `DATA-1`(P1→P2): 세기 경계를 2개 이상 건너뛰는 살아있는 사건이 **1건**('영국 동인도회사의 인도 진출' 1600→1757). 로직 결함은 그대로 생존.
- `DATA-2`(P1→P2): 원장 세기 렌즈가 UI에서 도달 불가(수제 URL로만 재현). decade 렌즈가 대체 재현 경로.
- `PERF-1`(P1→P2): '20회 왕복·3.4MB'는 10배 투영치이고 오늘은 2회. 반대편 비용(필터마다 재요청)이 근거에서 누락돼 있었다.
- `IA-1`·`IA-5`·`IA-10`·`IA-11`·`IA-18`(P2→P3): 전부 '기능 미구현'이지 오작동이 아니고, 탈출로(칩 ✕·검색·빈 상태 CTA)가 존재.
- `INT-*`·`VIS-*` 다수(P2→P3): 트리거 라벨 치환과 활성 칩 바가 최소 신호를 주고 있어 '전혀 알 수 없다'는 서술이 과장이었다.

### 증거 정정 (구현 시 주의)

- `URL-13`: "공백만 있을 때 지우기 ✕가 노출된다"는 **반대**다. `hasKeyword`가 `trim()` 기준이라 ✕가 안 뜨고 '/' 힌트가 뜬다 — 문제가 조금 더 나쁘다.
- `VIS-7`: 선례(RWD-4)의 처방인 'mask 삭제'를 그대로 적용하면 **375~400px 폰 대역에서 어포던스 회귀**다. 조건화가 정답.
- `A11Y-3`: '낭독 0회'는 미필터→필터0 전이에서는 성립하지 않는다(`FilteredHint` 삽입이 읽힘). 완전 침묵은 **이미 필터 중 N→0** 전이.
- `A11Y-1`: 'ArrowDown이 페이지 스크롤조차 안 됨'은 부정확 — 옵션 List가 `overflow-y:auto`라 최소한 목록은 스크롤된다.
- `INT-3`: 트리거에 포커스를 둔 채 Esc를 누르면 포커스는 유지된다. body 낙하는 검색창 Esc·옵션 클릭 두 경로.
- `DATA-16`: `city_id`·`administrative_division_id`를 채운 살아있는 사건은 **0건**. 실효 있는 부분은 `location` 자유텍스트 85건.
- `VIS-4`: '1440px에서 실제로 wrap된다'는 폭 산술 추정이지 런타임 실측이 아니다.
