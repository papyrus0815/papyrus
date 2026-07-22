# 사건 목록(LIST) 뷰 개선 검토

> 대상: `/events` 카탈로그의 **"목록"(LIST) 뷰** = `EventCompactList` 위젯
> 제보: "사건 상세페이지 목록에 들어갔을 때 디자인도 깨지고, 데이터도 제대로 안 나옴"
> 방법: 헤드리스 Chrome 실측 재현(admin 로그인 → `/events` 목록 뷰, 로컬 DB 사건 153건) + 5개 관점 다중 에이전트 코드 리뷰(적대 검증, 생존 28 / 반박 2)
> 작성일: 2026-07-21 · **구현 완료: 2026-07-21 (미커밋)**

---

## ✅ 구현 상태 (2026-07-21)

검토 후 **안전·검증 가능한 수정을 전면 구현**했다. `tsc 0` · 변경 파일 신규 lint 0(잔여는 전부 기존 레거시 단글자변수) · **헤드리스 Chrome 라이브 재검증 통과**.

| 항목 | 상태 | 파일 |
|------|------|------|
| A. 자식만 북마크 → 빈 화면 | ✅ 수정·재검증(0행→1행, '10세기›976년' 아래 렌더) | `event-compact-list.tsx` 그룹핑 never-drop + '연도 미상' 버킷 |
| E. 날짜 완전 미상 사건 드롭 | ✅ 수정(같은 never-drop + 미상 버킷) | `event-compact-list.tsx` |
| C(P1). autoLoadAll 무한 재시도 루프 | ✅ 수정(`isFetchNextPageError` 게이트) | `useEvents.ts` |
| F. 부분 로드 에러 무고지 | ✅ 수정(하단 인라인 '다시 시도' + `loadMoreFailed` 노출) | `useEvents.ts`, `events.page.tsx`, `event-compact-list.tsx` |
| 진행 표시(isLoadingMore) 죽음 | ✅ 수정(`isFetchingNextPage` 배선) | `events.page.tsx` |
| B. 모바일 레일/디바이더 어긋남 | ✅ 수정·재검증(모바일 스크린샷 정렬 확인) | `list.styles.ts`+`event-list-item.tsx` `--rail-inset` 변수화 |
| 평탄화 O(N²)→O(1) | ✅ 수정(`Map` 조회) | `useEventHierarchy.ts` |
| D3/D4 카운트 정합 | ✅ 수정(centuryCount를 버킷 귀속 연도 기준으로) | `event-compact-list.tsx` |
| 짧은 뷰포트 빈 상태 잘림 | ✅ 수정(`@media (max-height:720px)`) | `list.styles.ts` |
| sticky 헤더 44px 하드코딩 결합 | ✅ 수정(`--century-header-h` 변수) | `list.styles.ts` |
| chevron reduced-motion | ✅ 수정(인라인 transition→CSS) | `event-compact-list.tsx`+`list.styles.ts` |
| 행 role=button 안 버튼 중첩 | ✅ 수정(`role="listitem"`+`aria-current`) | `event-list-item.tsx` |

**의도적 보류(사유 명기):**
- **D. 목록 가상화(전량 렌더 스케일)** — `content-visibility:auto`는 타임라인 레일의 `::before/::after`(음수 left 오버플로 도트/커넥터)를 paint 컨테인으로 *잘라* 적용 불가. 전면 가상화는 sticky 헤더+레일+가변높이를 재설계하는 L공수라 로컬 규모(153건)로는 이득 검증이 불가 → **별도 작업**으로 분리(또는 근본책=서버측 `COALESCE(start_date, start_year)` 정렬로 autoLoadAll 자체를 축소). *단, O(N²)→O(1)과 무한루프 게이트로 규모 비용의 상당 부분은 이번에 완화됨.*
- 완전한 `role=list/listitem` + 디바이더 시맨틱 재설계, backdrop-filter→solid — P3, 회귀 대비 이득 낮아 보류.

> 잔여 소소: '연도 미상'/orphan-자식 버킷에서 연 헤더 카운트가 depth0만 세어 `976년 0`처럼 표기됨(항목은 정상 렌더). 극단 엣지라 depth0 카운트 의미 보존 위해 유지.

---

## 0. TL;DR (진단)

- **현재 로컬 규모(153건)에서 "기본" 목록 뷰는 정상 렌더된다.** 데스크톱·태블릿·모바일·노트북 × 라이트·다크 × 정렬/세기필터 전 조건에서 152행이 모두 뜨고, 내부 스크롤이 동작하며, 콘솔 에러 0. 즉 "항상 깨진다"가 아니라 **특정 상태·특정 규모에서** 깨진다.
- 제보하신 4개 증상(레이아웃 틀어짐 / 항목 누락 / 세로로 길고 느림 / 빈 화면)은 서로 다른 3~4개의 실제 결함으로 나뉜다. 그중 **2건은 지금 이 데이터(153건)에서도 재현**되고, 나머지는 **커밋 전 변경(`autoLoadAll`)이 규모/엣지 데이터에서** 유발한다.

### 지금 당장 재현되는 것 (스크린샷 확보)

| # | 증상 | 조건 | 상태 |
|---|------|------|------|
| **A** | **빈 화면** ("1건"이라면서 목록이 텅 빔) | 하위(자식) 사건 하나만 북마크 + "북마크만" 켬 | ✅ 실측 재현 |
| **B** | **레이아웃 틀어짐** (툴바 잘림·타임라인 레일 도트 클리핑) | 모바일/좁은 폭(≤640px) | ✅ 실측 재현 |

### 규모/엣지에서 유발되는 것 (코드로 확정)

| # | 증상 | 원인 | 상태 |
|---|------|------|------|
| **C** | 빈 화면·영구 로딩·서버 폭격 | `autoLoadAll` 페이지 실패 시 **무한 재시도 루프** | ✅ 코드 확정(P1) |
| **D** | 세로로 길고 느림·탭 프리즈 | **가상화 부재** + `autoLoadAll`이 전 페이지 강제 로드(152행에 이미 DOM 15,508px) | ✅ 코드 확정 |
| **E** | 항목 누락 | 날짜 완전 미상 사건이 오름차순에서 **조용히 드롭** | ✅ 코드 확정 |
| **F** | 항목 누락(무고지) | 부분 로드 중 에러가 **배너로 안 뜸** | ✅ 코드 확정 |

---

## 1. 재현 방법론

로컬 vite(`WEB_PORT=5199`, API `:8000` 프록시)로 실제 앱을 띄우고 admin/1234 로그인 후 `/events?view=list`를 헤드리스 Chrome으로 열어 실측했다.

- **데이터**: non-deleted 사건 153건(최상위 110, 자식 ~42, `start_date` NULL 23건이나 전부 구조화 `start_year` 보유, BC/고대 0건, 최고령 867 AD).
- **정상 확인**: 기본 진입 시 152행 전부 렌더, `CompactList`가 `overflow-y:auto`로 내부 스크롤(문서 레벨 오버플로 0), 콘솔 에러 0. → 세기 드롭다운의 "9세기"가 최고령인 것도 데이터상 정확(그 이전 사건 없음).
- **핵심 관측**: 152행인데 `CompactList.scrollHeight = 15,508px`. **가상화가 전혀 없다**(모든 행이 실제 DOM). 이 값이 규모에 선형 비례한다.

---

## 2. 우선순위별 결함

### 🔴 P1 — autoLoadAll 무한 재시도 루프

- **파일**: `apps/web-admin/src/entities/event/model/useEvents.ts:126-130` (효과), `:102-119`(retry/getNextPageParam), 소비 `pages/events/list/events.page.tsx:171`
- **근인**: 자동 소진 효과가 `if (autoLoadAll && hasNextPage && !isFetchingNextPage) fetchNextPage()`인데, 페이지 fetch가 **실패**하면 마지막 성공 페이지는 가득 차 있어 `hasNextPage`가 true로 남고 `isFetchingNextPage`는 false로 떨어진다 → 효과가 즉시 `fetchNextPage()`를 **다시** 호출 → (5xx는 retry 2회 후) 또 실패 → 무한 반복.
- **결과**: 서버를 계속 두드리고 목록은 영원히 "로딩" 상태에 갇힘 → **빈 화면/에러** 증상. 취소·상한 없음.
- **수정(S~M)**: 효과에 에러/횟수 게이트.
  ```ts
  const failRef = useRef(0)
  useEffect(() => {
    if (!options.autoLoadAll) return
    if (query.isError) return                 // 실패 시 자동 재개 중단
    if (hasNextPage && !isFetchingNextPage && failRef.current < 3) {
      fetchNextPage().catch(() => { failRef.current += 1 })
    }
  }, [options.autoLoadAll, hasNextPage, isFetchingNextPage, query.isError, fetchNextPage])
  ```
  + 상한 도달 시 하단에 "나머지 이어받기" CTA 노출.

---

### 🟠 P2 (지금 재현) — 자식만 북마크 + "북마크만" → 빈 화면

- **파일**: 드롭 지점 `widgets/event-list-compact/ui/event-compact-list.tsx:149-150`, 근인 `pages/events/list/events.page.tsx:327-330`
- **근인**: `visibleFlattenedHierarchy`(events.page.tsx:327-330)는 `flattenedHierarchy`를 `bookmarks.has(node.id)`로 거르되 **각 항목의 `depth`를 그대로 보존**한다. 그룹핑 useMemo는 `depth>0` 항목을 "직전 depth0 연도"(`lastTopLevelYear`) 버킷에 귀속시키는데, 계층 뷰에서 부모(depth0)가 항상 먼저 나오는 불변식을 전제로 한다. 북마크 필터가 그 사이의 depth0 부모를 제거해 **자식(depth1)만** 남기면 `lastTopLevelYear=null` → `year=null` → `if (year===null) return`으로 항목이 통째 드롭된다.
- **실측 결과**: `renderedRows: 0`, 그러나 `aria-label="사건 목록 (1건)"`, 하단 "끝까지 봤습니다 · 총 1건", **EmptyCatalogState는 안 뜸**(length===1이라 빈 상태 분기 미진입). 즉 **아무것도 없는데 "1건"이라 우기는 화면**.
- **수정(S)**: 그룹핑에서 항목을 **절대 드롭하지 말 것**. `depth>0`도 자기 연도로 폴백:
  ```ts
  const ownYear = parseIsoDateParts(item.node.period.start)?.year ?? null
  const year = item.depth === 0 ? (parsedYear ?? lastTopLevelYear) : (lastTopLevelYear ?? ownYear)
  ```
  그리고 최종 non-null year는 depth 무관하게 `eventYears`에 add(→ `allYears`에 버킷 존재해야 렌더 루프가 순회). 대안: `bookmarksOnly` 필터 시 남은 자식을 depth 0으로 승격.

---

### 🟠 P2 (지금 재현) — 모바일/좁은 폭 레이아웃 틀어짐

- **파일**: `pages/events/styles/list.styles.ts:518`(YearDivider `margin -38`), `:639`(CenturyDivider `margin -38`), `:846/:861`(CollapsedPlaceholder `::before/::after left:-38`), `:73-74`(CompactList @640 `padding-left:24`, 레일 12px)
- **근인**: 세기/연도 디바이더의 레일 오프셋(음수 margin `-38px`)이 **데스크톱 70px 거터에 하드코딩**돼 있는데, 모바일(≤640px)에서는 `CompactList` 좌측 패딩이 24px·가이드 레일이 12px로 바뀐다. 오프셋이 함께 재정의되지 않아 디바이더가 좌측으로 삐져나가고 **앵커 도트가 화면 밖으로 잘린다**. 추가로 상단 툴바(카테고리/대륙/국가/전체·정렬·"집중")가 좁은 폭에서 가로 오버플로로 잘린다.
- **수정(S)**: ≤640px 미디어쿼리에서 세 컴포넌트의 레일 오프셋을 모바일 거터에 맞게 재정의(`margin-left:-12px`, `padding-left:12px`, 도트 `left:0` 유지, placeholder `left:-12px`). 근본책은 레일 위치를 **CSS 변수**(`--rail-x`)로 빼 단일 출처화.

---

### 🟠 P2 (규모) — 가상화 부재 + autoLoadAll 전량 로드

> 5개 관점 finder가 **독립적으로 동일 결론**에 도달(data D5, perf D1/D2/D3, layout D3, state, a11y D1) → 가장 강하게 확증된 구조적 리스크.

- **파일**: 렌더 `widgets/event-list-compact/ui/event-compact-list.tsx:277-427`, 소비 `pages/events/list/events.page.tsx:171`, 자동소진 `entities/event/model/useEvents.ts:126-130`
- **근인**: `autoLoadAll:true`가 **모든 페이지를 강제 소진**하는데 목록은 **가상화가 전혀 없다**. 152행에 이미 DOM 15,508px. 규모(수천 건)에서 수천 DOM 노드 + sticky 디바이더 다수 → **세로로 매우 길고 스크롤 버벅임, 심하면 탭 프리즈/OOM**(= "세로로 길고 느림", "빈 화면").
- **동반 결함**:
  - **파이프라인 전량 재계산** — 페이지 도착마다 `transform → filter → sort → flatten → 그룹핑`을 전부 다시 함(`O(N²/pageSize)`). `useEvents.ts:132-138`, `useEventFilters.ts:178-207`, `event-compact-list.tsx:120-174`.
  - **평탄화 O(N)×노드** — `useEventHierarchy.ts:110,144`가 자식 부모를 `events.find`로 선형 탐색(`O(C·N)`). → `Map<id,event>` 1회 구축으로 O(1). (이미 `useEventFilters.ts:98-107 childrenByParent`가 같은 패턴을 씀.)
  - **스트리밍 리플로** — 전량 로드 완료 전 부분 데이터가 전역 재정렬되며 항목이 위아래로 점프(= "레이아웃 틀어짐" 착시). `useEventFilters.ts:178-207`.
  - **sticky backdrop-filter blur** — 긴 리스트 스크롤 시 프레임당 재합성 비용(`list.styles.ts:530-569,634-667`).
- **수정(L)**: ① 목록 렌더 **가상화**(`@tanstack/react-virtual`/`react-window`) — 세기/연도 디바이더가 섞이므로 **"divider row + event row를 한 배열로 사전 평탄화"** 후 단일 가변높이 가상 리스트로 렌더. ② `autoLoadAll`을 무제한 소진 대신 **총건수 임계(예: <500)에서만** 활성화하거나 상한(maxAutoPages)+스크롤 점진 로드. **근본책**은 서버측 정렬(1000년 이전 NULL `start_date`를 `start_year`로 COALESCE 정렬 = 메모 `event-catalog-clientside-sort-over-paginated`의 Option2)로 클라 전역 재정렬 의존 자체를 제거. ③ transform을 **새 페이지분만** 증분 변환.

---

### 🟠 P2 (엣지) — 날짜 완전 미상 사건이 오름차순에서 드롭

- **파일**: `event-compact-list.tsx:134-150`, 파이프라인 `useEventFilters.ts:183-204`, `iso-date.ts:115-118`
- **근인**: `startDate`·`startYear`가 **둘 다 null**이면 transformer가 `period.start=''` → `parseIsoDateParts('')=null`. `sortedEvents`는 null 키를 `NEGATIVE_INFINITY`로 보내 **오름차순 시 목록 맨 앞**에 놓는다 → 첫 depth0의 `parsedYear=null`, `lastTopLevelYear=null` → `year=null` → 드롭. (내림차순이면 맨 뒤로 가 직전 연도 버킷에 오배치.)
- **현재 상태**: 로컬 153건은 그런 사건 0건이라 미발현. 그러나 **날짜 완전 미상 사건 1건만 등록**되고 사용자가 오름차순으로 바꾸면(= autoLoadAll 주석이 권장하는 바로 그 조작) 그 사건이 사라진다.
- **수정(M)**: P2(북마크)와 동일하게 non-null year 드롭 금지 + **"연도 미상" 버킷**(특수 sentinel 키)을 `allYears` 말미에 헤더와 함께 렌더. 최소한 미상 항목을 방향 무관하게 항상 맨 뒤로 고정(`compareByDate`처럼)해 첫 항목 드롭을 구조적으로 차단.

---

### 🟡 P3 — 상태/진행 표시 결함

- **부분 로드 에러 무고지** (`events.page.tsx:739`): `isError && events.length === 0`일 때만 에러 배너. 2페이지부터 실패하면 `events.length>0`이라 배너가 억제돼 **조용히 항목 누락**. P1(무한루프)과 합쳐지면 오류가 사용자에게 전혀 안 보임. → 리스트 하단 인라인 "일부를 불러오지 못했습니다 · 다시 시도" 노출.
- **isLoadingMore 항상 사실상 false** (`events.page.tsx:545`): `isLoadingMore={isLoading && events.length>0}`인데 autoLoad 중엔 첫 페이지 후 `isLoading=false` → 진행 표시가 죽고 "↓ 스크롤하여 더 보기"로 오안내(aria-live 미고지). → `isLoadingMore={isFetchingNextPage}`로 배선(이미 `useEvents`가 반환).
- **handleScroll 무한스크롤이 autoLoadAll과 중복** (`events.page.tsx:352-360`): 죽은 경로 + 오해 유발. autoLoadAll 콜사이트에선 제거하거나 둘 중 하나로 일원화.

### 🟡 P3 — 레이아웃/카운트

- **짧은 뷰포트 빈 상태 잘림** (`list.styles.ts:1198-1199` vs `923-924`): `CatalogSection`이 `overflow:hidden`인데 `EmptyCatalogState`가 `min-height:420px` → 낮은 뷰포트에서 "필터 초기화/새 사건 등록" 버튼 도달 불가. → `@media (max-height:720px)`로 축소·상단 정렬.
- **sticky 헤더 하드코딩 결합** (`list.styles.ts:530-531` YearDivider `top:44px` ↔ CenturyDivider `top:0`): 폰트/줌 변동 시 두 sticky 헤더가 겹침. → `--century-header-h` CSS 변수 단일 출처.
- **연/세기 카운트 불일치** (`event-compact-list.tsx:161-167,288-290`): `centuryCount`는 depth0&유효연도만, `yearEventCount`는 흡수된 미상 depth0까지 셈 → 합이 안 맞음. + `displayedCount`/aria/"총 N건"이 실제 렌더 행보다 큼(드롭 발생 시). → 카운트를 실제 버킷 담긴 항목 기준으로 통일.

### 🟡 P3 — 접근성

- `role=list` 컨테이너의 자식이 `listitem`이 아님(button/divider) → 리스트 시맨틱 붕괴 (`event-compact-list.tsx:277-281`).
- 행 루트가 `role=button`인데 내부에 실제 `<button>`(펼치기·요약·북마크) 중첩 → 무효 대화형 중첩 (`event-list-item.tsx:146-227`).
- 세기/연도 chevron 회전 **인라인** transition이 `prefers-reduced-motion` 무시 (`event-compact-list.tsx:336-339,372-375`) → styled 규칙으로 이관.

---

## 3. 권장 실행 순서

1. **즉시(작은 수정, 지금 재현되는 사용자 피해)**
   - P2 북마크 빈 화면 — 그룹핑 드롭 제거(자식 폴백) + 미상 버킷 (P2 엣지와 한 번에 해결). **(S)**
   - P1 autoLoadAll 무한루프 게이트 + 부분 로드 에러 인라인 노출. **(S~M)**
   - `isLoadingMore={isFetchingNextPage}` 배선 + 죽은 handleScroll 정리. **(S)**
   - 모바일 레일 오프셋 CSS 변수화. **(S)**
2. **후속(구조, 규모 대비)**
   - 목록 가상화 도입 + `autoLoadAll` 임계/상한화(또는 서버측 COALESCE 정렬). **(L)**
   - 평탄화 `Map` O(1)화, transform 증분 변환. **(S~M)**
3. **정리(품질)**
   - 카운트 단일 출처, 짧은 뷰포트 빈 상태, sticky 결합, a11y 시맨틱/reduced-motion.

---

## 4. 투명성 — 반박된 항목 (2건)

- **`CatalogSection` height:100% + 매직넘버 max-height가 상단 형제 높이를 무시해 잘린다** → **반박**. 실측상 flex 체인(`PageScene fixed → PageWrapper flex:1 → CatalogSplit grid → ActiveContent → CatalogSection`)이 실제 높이를 결정하며, 측정 결과 section `clientHeight=604 < max-height=776`으로 flex가 먼저 제약했다. 매직넘버 `60px`가 클리핑을 유발하지 않음. (다만 `height:100%` + 매직 max-height의 **취약성** 자체는 개선 여지 — flex:1로 일원화 권장, 회귀 위험은 낮음.)

---

## 부록 — 규모 미해당(현재 데이터로는 정상인 것)

- 세기 드롭다운 "9세기~21세기"는 정확(그 이전 사건 데이터 없음). `iso-date.ts`는 BC 안전하게 잘 설계됨.
- 기본 진입·정렬·세기필터·평면(계층off)·다크모드 — 전부 정상 렌더 확인.
