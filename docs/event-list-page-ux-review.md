# 사건 리스트 페이지(/events 카탈로그) UI/UX 검토서

- **작성일**: 2026-07-28
- **대상**: `/events` → `EventsCatalogPage` (`apps/web-admin/src/pages/events/list/events.page.tsx`) 및 그 하위 조립 컴포넌트·훅·뷰 위젯 7종·스타일 8파일
- **제외**: `pages/events/ledger/`(미라우트·보류), `pages/events/create`·`detail`(연결 동선 확인 목적으로만 열람)
- **선행 검토**: `docs/event-list-view-improvement-review.md`(데이터 누락·모바일 레일·autoLoadAll), `docs/event-list-view-design-review.md`(단일행·제목위계·카테고리칩). 두 문서의 **구현 완료 항목은 재발굴하지 않았고**, "고쳤다고 적혔으나 코드에 미반영/회귀"인 경우만 남겼다.

> **구현 상태 (2026-07-29 갱신)**: **배치 1(P1) + 2(키보드 스코프) + 3(transformer 정직화) + 4(계층·카운트 계약) 구현 완료 · 미커밋.**
>
> 배치 4 검증 = tsc 0(web·api) / 신규 lint 0 / 신규 spec 4건(총 645 중 643 통과, 실패 2는 기존) / **라이브 확인**: 자식 사건 33/33에 `relatedCountries`가 실림(페이로드 441,788 → 452,762 bytes, +2.5%), `/events/count`가 최상위 146을 반환해 '(최상위)' 라벨이 정확함을 확인. 범위: **자식에도 필터 적용**(매칭 자손이 있을 때만 전개, 잘린 자식은 부모 행에 '조건 밖 N' 표시), `isMatch`/`hiddenChildCount`를 평탄화 계약에 추가하고 `matchedCount`로 카운트 오염 제거, `isFiltered`를 실제 필터 상태로 판정(접기 조작이 필터로 둔갑하던 문제), 헤더/하단/aria 카운트에 모수 명시(조건 일치 N건 · 등록 전체 N건(최상위) · 표시 N행(최상위 M건)), 서버 childEvents에 `countryRelations` 추가(국가·대륙 필터가 자식을 보게), 트리 뷰 평면 모드 중복 렌더 수정, 자식 수 배지 + `aria-expanded`, 모바일에서 그룹과 다른 해 토큰 유지, `EventCompactList`가 재선언하던 평탄화 타입을 공유 계약으로 통일.
>
> **배치 3 검증** =
>
> 배치 3 검증 = tsc 0 / 신규 lint 0 / 신규 spec 5건(총 641 중 639 통과, 실패 2는 기존) / **라이브 API 확인**: 목록 응답이 `startDatePrecision`을 실제로 싣는 것 확인(루트 100건 중 day 43·year 1·month 1·미기록 55), 검토서가 지목한 두 사건(연 정밀도 `2023-12-31`, 월 정밀도 `2022-09-01`)이 그대로 존재. 범위: **importance 표시 전면 제거**(사용자 결정 — 목록 별·제목 3단·도트 3단·헤더 '핵심/주요' 칩·대시보드 티어 카드·트리 배지 2종), precision 매핑 복구(+`EventHierarchyNode.period`에 실어 요약모달·트리·드로어까지), 지도 뷰 PRIMARY→SECONDARY 강등 + 실행 불가 안내문 교체(타임라인 빈 상태의 지도 유도 문구도 함께), 드로어 날짜/기간을 `shared/lib/iso-date`로 교체(BC `NaN.NaN.NaN` 제거), `!end`와 '당일'을 분리해 잉여 '1일' 토큰 제거, 가짜 `cat-other-001` 폐기(→ id 빈값 + 라벨 '미분류')와 그에 따른 '분류 누락' 지표 복구, 품질 카드의 좌표·출처 지표 제거, JSON 내보내기 전용 직렬화기(자리표시자 배제 + precision 포함), 드로어의 참전국·사상자 죽은 분기 제거.
>
> **배치 2 검증** =
>
> 배치 2 검증 = tsc 0 / 신규 lint 0 / 신규 spec 10건 통과(총 636건 중 634 통과, 실패 2는 기존). 범위: 리스트 네비를 **포커스가 목록 행에 있을 때만** 동작하도록 게이트(`enabled = viewMode===LIST && !anyOverlayOpen`), Enter는 눌린 행의 id로 이동(stale 클로저 제거), 이동 후보를 **실제 렌더된 행**에서 뽑아 접힌 밴드의 숨은 항목 제외, Escape를 `closeTopOverlay()` 우선순위 스택으로 단일화, 선택→스크롤을 페이지의 단일 effect로 통합(+`scroll-margin-top`), 단축키 도움말 카피를 실제 스코프에 맞게 정정.
>
> **배치 1 검증** = 검증 = tsc 0(web-admin·api) / 신규 lint 0 / jest 신규 4건 통과(기존 실패 4건은 무관: `import.meta` jest 설정 2, country 헬퍼 1, gamification `BadgeStats` 1) / **API 재빌드·재기동 후 실측**: `GET /events?limit=100` 페이로드 1,220,447 → 441,788 bytes(**-64%**, 섹션 제목 236개 유지), 삭제 시 살아있는 자식 2건이 최상위로 승격돼 목록 API에 노출됨(검증용 임시 데이터는 정리 완료). 배치 2~6 및 §5 신규 9건은 미착수.

## 방법과 검증 수준

8개 렌즈(정보구조 / 툴바·검색·필터 / LIST 뷰 밀도 / 접근성 / 반응형·다크 / 성능 / 데이터 정직성 / 상호작용 워크플로)로 병렬 코드 검토 후, 렌즈별 **적대적 검증**(반박이 기본자세) → 중복 병합 → 완전성 크리틱 순으로 진행했다.

- 제출 **124건** → 적대검증 생존 124건(CONFIRMED 117 / PLAUSIBLE 7) → 중복 병합 **74건** + 크리틱 신규 **9건**.
- 심각도: **P1 9 · P2 46 · P3 69**. 공수: S 69 · M 52 · L 3.
- **적대검증이 0건을 기각한 점은 이 검토서의 약한 고리다.** 그래서 P1 9건 전부와 크리틱 신규 항목 일부는 검토서 작성자가 원본 코드로 **직접 재확인**했다(아래 §1에 확인 결과 표기).
- **라이브 시각 검증은 미실시** — Chrome 확장이 연결되어 있지 않다. 픽셀·스크린리더 낭독 관련 항목은 CSS 규칙·색 계산 기반 판정이다.
- 수치 근거는 로컬 MariaDB(`localhost:3307/papyrus`) 실측: **사건 228건 / 최상위 141 / 하위 87 / 부모가 삭제된 살아있는 자식 0건 / 목록 응답이 싣는 본문 섹션 399개 = 1,430KB.**

---

## 1. P1 — 직접 재확인 완료

| # | 항목 | 재확인 결과 |
|---|---|---|
| **P1-1** | **필터 팝오버가 통째로 잘려 안 보임.** `Filter.FilterGroup`이 `height:34px; overflow:hidden`인데(`pages/events/styles/filter.styles.ts:35-43`) 그 직속 자식 `PopoverWrap`(`position:relative`, `widgets/event-filters-panel/ui/filters-panel.tsx:383-386`) 안에서 `Popover`가 `position:absolute; top:calc(100% + 4px)`로 그려진다(`:389-391`). 컨테이닝 블록 체인이 클리핑 박스 안에 있으므로 `z-index:60`으로 벗어나지 못한다. | ✅ 확인. `<Filter.FilterGroup>`(`filters-panel.tsx:114`)이 카테고리·대륙·국가 `InlineFilterPopover` 3종을 직접 감싼다. **결과: 조작 가능한 필터는 세기 `<select>` 하나뿐.** 팝오버 안의 '전체 보기 →'가 CategoryModal/국가 모달의 유일한 진입점이라 모달 경로까지 동반 차단. `git log -S` 기준 `overflow:hidden`은 2026-05-01(`22afb8841`), 팝오버는 2026-06-09(`ff6e9721e`) 도입 — **약 7주 잠복한 회귀**. |
| **P1-2** | **통계(대시보드) 뷰 조건부 훅 → 페이지 크래시.** `if (stats.total === 0) return <EmptyStateSpotlight/>`(`widgets/event-dashboard-view/ui/event-dashboard-view.tsx:207-215`) **뒤에** `const loadedRootCount = useMemo(...)`(:220-223). | ✅ 확인. 훅 개수가 렌더마다 달라진다(0건 1개 → 데이터 2개). 0건 검색 후 검색어를 지우거나 `?view=dashboard` 딥링크에서 데이터가 뒤늦게 도착하면 "Rendered more hooks than during the previous render" → 상위 에러 바운더리가 **페이지 전체를 에러 화면으로 교체**. |
| **P1-3** | **전역 `window` keydown이 Enter/↑↓/Home/End를 하이재킹.** `use-catalog-keyboard.ts:137`이 `window`에 붙고, 제외 대상은 input/textarea/contentEditable뿐(`:16-23`). | ✅ 확인. ⑴ 사건이 하나라도 선택돼 있으면 `Enter`가 `preventDefault()` 후 상세로 이동(`:111-114`) → **키보드로 어떤 버튼도 활성화 불가**. ⑵ 행의 `onKeyDown`이 `stopPropagation()` 없이 `onSelect`만 호출하므로(`widgets/event-list-compact/ui/event-list-item.tsx:181-187`) 행 B에서 Enter를 누르면 **직전 선택 A의 상세로 이동**(stale closure). ⑶ `HTMLSelectElement` 미제외 → 정렬·개수·세기 select에서 ↓가 값 대신 목록 선택을 움직임. ⑷ 목록에 항목이 있으면 **↑↓·Home·End 기본 스크롤이 페이지 전역에서 소실**. |
| **P1-4** | **포커스 링이 사실상 안 보임.** `BRAND.focusRing = 0 0 0 3px rgba(37,99,235,.32)`(`pages/events/styles/theme.ts:221`)가 26개소에서 `outline:none`과 짝을 이룬다. | ✅ 확인(색 계산). 라이트 배경 대비 **1.59:1**, 다크 **1.37:1** — WCAG 1.4.11 요구 3:1 미달. 목록 행만 예외적으로 `outline:2px solid #2563eb`(5.17:1). 토큰 1곳 수정으로 26개소 동시 해결. |
| **P1-5** | **목록 응답이 모든 사건 본문(MEDIUMTEXT)을 실어 옴.** `apps/api/.../event.controller.ts:517`(자식 `eventSections: true`), `:541`(루트 `eventSections`), `:122`(`content` 직렬화). | ✅ 확인 + **DB 실측 1,430KB / 399섹션**. 프론트 7개 뷰 중 `eventSections`를 읽는 곳은 0건이다. 같은 컨트롤러 `:952`에 "카드가 안 쓰는 섹션 content를 뺐다"는 **동일 교정 주석이 이미 있다**(다른 엔드포인트에서만 적용됨). `autoLoadAll:true`(`events.page.tsx:172`)라 전 페이지를 자동 소진 → 결국 전량이 브라우저로. |
| **P1-6** | **부모 소프트삭제 시 살아있는 하위 사건이 전 뷰에서 실종.** `event.service.ts:1147-1158`은 대상 행의 `deletedAt`만 세팅하고 자식의 `parentEventId`는 그대로 둔다. 목록 API는 `parentEventId: null, deletedAt: null`인 루트만 페이징하고(`event.controller.ts:483-490`) 자식은 부모의 include로만 실린다. | ✅ 확인(구조적 결함). **단, 현재 DB에는 해당 케이스 0건** — 아직 터지지 않았을 뿐이다. 확인 다이얼로그가 하위 동반 실종을 예고하지 않고 헤더 카운트는 1만 줄어 **사용자가 소실 자체를 인지할 수 없다**. `updateEvent`에는 이미 살아있는 자식만 detach하는 규약이 있다(`event.service.ts:602-620`) — 삭제 경로에 같은 규약을 적용하는 것이 최소 변경. |
| **P1-7** | **지도 뷰는 데이터와 무관하게 100% 빈 화면.** `eventTransformers.ts:124`가 모든 사건에 `map: { summary: '', markers: [] }`를 하드코딩하고, `EventMapView`의 유일한 좌표 소스가 `evt.map?.markers`다(`widgets/event-map-view/ui/event-map-view.tsx:73`). | ✅ 확인. 위젯 헤더 주석이 약속한 'relatedCountries 좌표 fallback'은 구현이 없고, 빈 상태 안내가 지시하는 `map.markers` 입력 경로는 **등록 폼에도 API DTO에도 없다**. 그런데 지도는 primary 세그먼트 3개 중 하나다(`catalog-main-content.tsx:105`). 필터가 걸려 있으면 "현재 필터에 좌표 있는 사건이 없습니다"가 떠서 사용자가 자기 필터 탓으로 오인한다. |
| **P1-8** | ≤720px에서 `ViewSegmented`의 overflow+mask가 '더보기' 메뉴를 클리핑(`list-toolbar.styles.ts:458-471`) → 격자·통계·트리·갤러리 진입 불가. P1-1과 동일 패턴. | ✅ 패턴 동일(절대배치 자식이 클리핑 조상 안). |
| **P1-9** | `& button { ... !important }`가 자손 결합자라 팝오버 **내부** 버튼까지 덮는다(`filter.styles.ts:57-63`). | ✅ 확인. **P1-1과 반드시 동시 배포**해야 한다. 아니면 팝오버가 보이는 순간 옵션의 선택 표시·포커스 링이 전부 지워진 상태로 노출된다. |

> **가장 중요한 사실**: P1-1 하나 때문에 카테고리·대륙·국가 필터가 오늘 **사용자 노출 0**이다. 이 페이지의 필터 관련 개선 항목(§비권고 표의 M68·M69·M70)은 팝오버를 살린 뒤 실사용 기준으로 재평가해야 우선순위가 왜곡되지 않는다.

---

## 2. 근본 원인 클러스터

**RC-1. 변환기가 "타입 만족용 자리표시자 공장"이고, 타입에 선언돼 있어 tsc가 못 잡는다.**
`eventTransformers.ts` 한 파일이 `importance:'notable'`(:71)·`categoryId:'cat-other-001'`(:79)·`countries:[]`(:110)·`map.markers:[]`(:124)·`stats` 0(:100-105)·`type:'battle'`(:90)을 모든 사건에 박고, 서버가 실제로 보내는 `startDatePrecision`·`sources`는 매핑하지 않는다. 소비처(목록·격자·트리·통계·지도·드로어·JSON 내보내기)는 그 상수를 데이터로 믿고 분기를 짰다. **화면의 거짓 표기 대부분이 이 한 파일에서 나온다.**

**RC-2. 전역 리스너가 지역 위젯의 계약을 대신하고 있다.**
`use-catalog-keyboard.ts:137`의 window 바인딩 + Escape 단일 분기(`:54-57`)가 select·버튼·모달·타임라인·지도·드로어의 키 입력을 전부 가로챈다. 접근성 P1 2건이 이 파일 하나에서 나온다.

**RC-3. 계층(부모-자식)이 파이프라인 단계마다 다른 규약으로 취급된다.**
서버는 루트만 페이징하고 자식은 include로만(`event.controller.ts:483-532`), count는 루트만(`:657-662`), 클라 필터는 루트만 산출(`useEventFilters.ts:163-165`), 평탄화는 자식을 무필터 전개(`useEventHierarchy.ts:105-116`), 그룹핑은 자식을 부모 연도 버킷에(`event-compact-list.tsx:149-152`), 삭제는 자식을 손대지 않는다(`event.service.ts:1147`). **"한 건"의 정의가 6곳에서 다르다.**

**RC-4. 뷰 7종이 공통 셸 계약 없이 각자 구현됐고, 데이터 소스가 없는 뷰까지 primary다.**
프레임·하단여백·빈상태·스크롤바·로딩 표시·정렬 반영·FAB 회피가 뷰마다 제각각이다. 좌표 파이프라인이 없는 지도가 PRIMARY 3개 중 하나이며, 격자는 거시 진입점을 표방하나 드릴다운이 없다.

**RC-5. 스타일 레이어에 단일 출처가 없다.**
`overflow:hidden`이 팝오버를 클리핑하고, `& button {...!important}`가 자손을 덮으며, `--rail-inset` 변수화가 한 줄 누락됐고, 색은 토큰 대신 리터럴 8곳으로 흩어졌으며, 브레이크포인트 9종에 `BREAKPOINTS` 토큰은 사문화, `list.styles.ts` 46 export 중 21개가 dead다. **다음 수정자가 살아있는 코드보다 죽은 코드를 먼저 만난다.**

**RC-6. 로딩·상태 모델이 이중화돼 "언제 준비됐는가"에 답할 주체가 없다.**
`autoLoadAll:true`(`events.page.tsx:172`) ↔ 수동 `handleScroll`(:353-361) ↔ 타임라인 25배치 상한이 동시에 살아 있고, 드로어는 `isLoading={false}` 하드코딩(:627), 빈 상태는 소진 중에도 확정 표시, `pageSize`는 표시량을 못 바꾸면서 캐시를 갈아 전량 재로딩한다.

---

## 3. 배치 계획

### 배치 1 — 죽은 화면·크래시·데이터 은닉 (P1)
> 필터 3종·보조 뷰 4종·통계 뷰가 각각 "조작 불가/즉시 크래시"라, 이걸 안 고치면 이후 배치의 어떤 개선도 실화면에서 검증할 수 없다.

| 항목 | 근거 |
|---|---|
| P1-1 팝오버 클리핑 — `createPortal` 또는 `overflow` 래퍼 분리 | `filter.styles.ts:43,99-100` / `filters-panel.tsx:114,389-391` |
| P1-9 `& button {...!important}` → 직속 자식 결합자 (**P1-1과 동시 배포 필수**) | `filter.styles.ts:57-63` |
| P1-8 '더보기' 메뉴 클리핑 (동일 패턴) | `list-toolbar.styles.ts:458-471` |
| P1-2 대시보드 조건부 훅 | `event-dashboard-view.tsx:207,220` |
| P1-6 부모 삭제 시 자식 실종 (정책 3안 중 택1) | `event.service.ts:1147-1158` / `event.controller.ts:488` |
| P1-5 목록 응답 `eventSections` → `select:{id,title,order}` (통째 제거는 드로어 섹션 칩 회귀) | `event.controller.ts:517,541,122` / `event-detail-panel.tsx:205,309-311` |

### 배치 2 — 전역 키보드 훅 스코프 봉인 (P1~P2, 단일 파일)
> 5건이 한 파일이고, 여기를 안 좁히면 배치 5의 roving tabindex·포커스 이동 개선이 즉시 무효화된다.

가드 3종(`HTMLSelectElement` 추가 / `closest('button,a,select,[role=button]')` 조기 return / `viewMode===LIST && !overlayOpen`) · Enter는 `useRef`로 최신 선택 읽기 · Escape 레이어 스택(`closeTopOverlay()`) · 선택 이동 시 `focus({preventScroll:true})` + reduced-motion 분기 · 선택 변경 단일 지점 `scrollIntoView` + `scroll-margin-top`.
근거: `use-catalog-keyboard.ts:16-23,54-57,95-133,137` / `events.page.tsx:343,605-623` / `catalog-overlay-modals.tsx:147-206`

### 배치 3 — transformer 정직화 (P1~P2)
> 상수 6개가 5개 뷰의 거짓 표기를 만든다. 소스를 먼저 정하지 않으면 "지울까 배선할까"를 소비처마다 7번 반복하게 된다.

`importance` 필드 도입 **또는** 별·티어KPI·트리배지 제거(택1) · `precision` 매핑 + `EventHierarchyNode.period`까지 전파 · 지도는 좌표 파이프라인 없으면 PRIMARY 제외 + 실행 불가 안내문 삭제 · 품질카드에서 좌표·출처 제거 + 내보내기 전용 직렬화기 · `cat-other-001` 폐기(`!categoryId` = '미분류') · 드로어 날짜를 `shared/lib/iso-date`로 · `!end`(종료 미상)와 `start===end`(당일) 분리.
근거: `eventTransformers.ts:71,79,87-138,90,100-105,110,124` / `event-detail-panel.tsx:90-116` / `event-dashboard-view.tsx:103-120` / `export-events.ts:14`

### 배치 4 — 계층·카운트 계약 확정 (P2, 서버+클라 동시)
> 카운트·필터·그룹핑·자식 include가 전부 "루트 기준 vs 행 기준"이라는 미정의 계약에서 갈라졌다. 계약을 문서화하고 한 번에 적용해야 서로 상쇄되지 않는다.

모수를 '고유 사건 수'로 통일 + `isFiltered`를 `filtersOrSearchActive`로 · 매칭 술어를 flatten 단계로(비매칭 자식은 '조건 밖 N건' 축약) · 자식 include에 `countryRelations`는 id만 select · 트리 뷰는 평면 모드에서도 원본 루트 기준 · 자식 수 배지 + `aria-expanded`.
근거: `event.controller.ts:488,511-532,657-662` / `useEventFilters.ts:157-165` / `useEventHierarchy.ts:60-78,105-116` / `catalog-main-content.tsx:138,300-311` / `event-list-item.tsx:198-212`

### 배치 5 — 접근성: 토큰 3개 + 시맨틱 (P2, 최대 레버리지)
> `focusRing`/`text.tertiary`/`#64748b` 세 토큰이 30개소 이상을 동시에 고친다. 배치 2에서 키보드 스코프가 잡힌 뒤라야 roving tabindex를 실측 검증할 수 있다.

`BRAND.focusRing` 1.59:1 → 불투명 2px 링(26개소, `theme.ts:221`) · `text.tertiary` 2.54:1(`shared/styles/theme.ts:73,154`) · 동일분기 삼항 8곳 + 인라인 `#64748b` · 계층 토글 이중 실행 + `role="switch"` · 터치 타깃 2건(ExpandBtn 20×20, 검색 지우기 22×22) · reduced-motion 4곳 · roving tabindex · 드로어 `aria-labelledby` · `wideMode`에서도 `h1` sr-only 유지 · aria-live를 건수 span으로 축소 · 최근 본 드롭다운 일괄.

### 배치 6 — 로딩·URL 모델 일원화 + 저비용 성능 (P2~P3)
소진 정책 일원화(`autoLoadAll` 유지 시 `handleScroll`·타임라인 상한·'스크롤하여 더 보기' 문구 제거, `placeholderData:(prev)=>prev`) · 드로어 `isLoading` 실제 배선 + 미발견 전용 상태 · 뷰 모드 localStorage(우선순위 URL>저장>디바이스) · 상세→목록 복귀 `location.state` · `?? EMPTY` 상수 · URL sync deps를 `debouncedKeyword`로 · per-event `console.log` 삭제(`event.controller.ts:551-553`) · `activeFilterCount`에서 keyword 제외 · '전체 초기화'에서 정렬 분리 · 0건 내보내기 disabled.

### 잔여 풀 (시각 마감·hygiene, 상호 의존 없음)
레일·디바이더·표면 픽셀 4건 / dead export 21개 정리 / 뷰 셸 mixin / 북마크·최근 정리 수단 / 기타 P3.

---

## 4. 즉효 항목 (effort S · 체감 큰 순)

1. **대시보드 훅 순서 교정** — `loadedRootCount` useMemo를 이른 반환 위로. 0건 검색 한 번에 페이지가 에러 화면이 되는 것을 즉시 제거. `event-dashboard-view.tsx:207,220`
2. **키보드 훅 가드 3줄** — `isInEditableElement`에 `HTMLSelectElement` 추가 + Enter/화살표 앞 `closest('button,a,select,[role=button]')` 조기 return. 이것 하나로 P1-3의 실사용 피해가 사라진다. `use-catalog-keyboard.ts:16-23,95-114`
3. **focusRing 토큰 교체** — 1.59:1 → 불투명 2px 링. 한 곳 수정으로 26개소가 살아난다. `theme.ts:221`
4. **'계층' 토글 라벨 이중 발화 제거** — `FilterToggle`은 `styled.label`이고(`filter.styles.ts:589`) 내부 `Switch`는 `<button>`이다. `<button>`은 labelable 요소라, **라벨 텍스트를 누르면** 라벨의 `onClick`(토글 1회) + 라벨 활성화가 버튼으로 전달돼(토글 2회) **무변화**가 된다. 스위치를 직접 누를 때는 `stopPropagation` 덕에 정상. 라벨의 `onClick`을 제거하면 끝. `filters-panel.tsx:187-199`
5. **드로어 `isLoading` 배선** — `isLoading={!selectedEvent && (isLoading || hasMore)}`. 공유 링크 사용자가 '사건 상세' 제목 밑에서 '사건을 선택해주세요'를 보는 자기모순 제거. `events.page.tsx:627`
6. **sticky 연도 헤더 `left:38px` → `var(--rail-inset)`** — 한 줄. 모바일 기본 뷰에서 헤더 라벨과 본문이 겹쳐 읽히는 현상 제거. `list.styles.ts:566`
7. **`formatDuration`의 `!end` 분기 분리** — 종료 정보 없는 사건이 '1일짜리'로 단정되는 거짓 표기 제거. `event-list-item.tsx:97-108`
8. **잘린 제목에 `title` 속성** — 같은 행의 국기·별·액션엔 전부 툴팁이 있는데 정작 유일하게 잘리는 요소만 없다. `event-list-item.tsx:222`

차점: `?? EMPTY` 상수(`use-catalog-reference-data.ts:43-46`), per-event `console.log` 삭제(`event.controller.ts:551-553`), `activeFilterCount`에서 keyword 제외(`events.page.tsx:385`).

---

## 5. 완전성 크리틱 — 신규 9건

렌즈들이 갤러리(본문 2줄)·트리(4곳)를 사실상 읽지 않았고, "0건"을 *필터 결과 0건*으로만 다뤄 **로드 중 0건 / 부분 실패 0건 / 신규 계정 0건**을 구분하지 않았다. 그 사각지대에서 나온 항목:

| # | 항목 | 근거 |
|---|---|---|
| **N-1** (P2/S) | **격자·갤러리·트리·통계 4개 뷰에 로딩 상태가 없음** — 7뷰 중 `isLoading`을 받는 건 LIST·TIMELINE뿐. 나머지는 `length===0`을 즉시 "데이터 없음"으로 단정한다. `?view=grid` 딥링크 진입 시 사건 228건인 계정에 **"사건을 등록해보세요"**가 뜬다. | `events.page.tsx:471-522` vs `:526,579` / `event-timeline.tsx:2792` |
| **N-2** (P2/M) | **부분 로드 실패가 격자·갤러리·트리·지도에서 완전히 은폐** — `loadMoreFailed`/`hasMore`가 LIST·TIMELINE에만 전달된다. 잘린 모집단으로 그린 밀집도·품질 통계가 **완전한 수치인 양** 제시되고 재시도 경로도 없다. | `events.page.tsx:547,578` vs `:460-520` / `useEvents.ts:137-145` |
| **N-3** (P2/S) | **격자·갤러리가 하위 사건 전량을 조용히 제외** (`if (item.depth !== 0) continue`). 부모 1건 아래 자식 15건인 연대가 **1건**으로 계산돼 밀집도가 구조적으로 왜곡되고, **hero 이미지를 가진 사건이 하위면 갤러리에 절대 등장하지 않는다** — 이미지 발견이 존재 이유인 뷰에서 치명적. 현재 하위 87건이 대상. | `event-grid-view.tsx:90` / `event-gallery-view.tsx:55` |
| **N-4** (P3/S) | 격자 heat의 분모는 `parentEventId`, 분자는 `depth`로 자식을 걸러 **평면 모드에서 `heatRatio > 1`**. 자기 주석(`:67-69`)이 선언한 불변식 위반이고 클램프도 없다. | `event-grid-view.tsx:70-82,90,152,266-269` |
| **N-5** (P3/S) | 격자 카드가 `role="button"` div 안에 진짜 `<button>` 3개를 품는다 — 목록 뷰가 이미 `role="listitem"`으로 고친 패턴의 미수복 잔존. | `event-grid-view.tsx:155-156,201-210` |
| **N-6** (P3/S) | **`/events`에 문서 제목이 없다** — `useDocumentTitle` 미호출. 형제인 사건 상세는 쓴다(`event-detail.page.tsx:80`). 뷰·필터·선택을 전부 URL에 싣는 = 북마크가 일급 기능인 페이지인데 저장한 링크들이 서로 구분되지 않는다. | `events.page.tsx`(참조 0건) / `use-document-title.hook.ts:14-22` |
| **N-7** (P3/M) | **인쇄·PDF 저장이 구조적으로 불가** — `PageScene`(fixed+overflow hidden) → `PageWrapper`(hidden) → `CompactList`(auto) 3중 클리핑에 `@media print` 0줄. 현재 스크롤 위치 한 화면만 인쇄된다. 같은 저장소의 인물·국가수반 타임라인엔 인쇄 스타일이 있다. | `layout.styles.ts:9-40` / `list.styles.ts:19-31` |
| **N-8** (P3/S) | 빈 상태가 "사건을 등록해보세요"라고만 하고 **등록 버튼을 주지 않는다**(`EmptyStateSpotlight`는 `primaryAction` 지원, 지도만 사용). 갤러리는 `description`조차 없다. 게다가 필터 유무와 무관하게 "필터를 풀거나"를 출력해 신규 사용자에게 없는 필터를 풀라고 한다. | `event-grid-view.tsx:137-142` 외 3뷰 / `empty-state.tsx:64-75` |
| **N-9** (P3/S) | **타임라인 빈 상태가 사용자를 사(死) 화면인 지도로 안내** — "목록·**지도**·갤러리 등 다른 뷰로 전환해 보세요". 지도는 P1-7대로 100% 빈 화면이고 갤러리는 N-3대로 하위를 감춘다. | `event-timeline.tsx:2801-2807` |

---

## 6. 의도적 비권고 (지금 손대지 말 것)

| 항목 | 이유 |
|---|---|
| 행을 `<a>`/`role="link"`로 승격 | 선행 검토가 중첩 대화형을 해소하며 `role="listitem"`으로 확정한 결정의 되돌림. 링크로 올리면 내부 액션 버튼 3종과 다시 중첩된다. **재설계 안건**으로 분리하고 그 전까지는 roving tabindex만 진행. |
| 목록 가상화 (effort L) | 선행 검토의 명시적 보류. 차단 요인이 pseudo 오버플로 + 형제 결합 셀렉터 + 그룹 래퍼 부재의 3중이고, 228행에서 이득이 없다. 근본책은 서버 `COALESCE(start_date, start_year)` 정렬이라 그 결정이 먼저. 단 "pseudo를 행 내부로 옮겨 `content-visibility:auto` 가능하게"만은 국소 변경이라 잔여 풀로 승계. |
| 타임라인 viewport 윈도잉 | `event-timeline.tsx:1428-1440`이 "클러스터/외부라벨 배치가 전역이라 컬링 시 경계 토글 jitter"라고 배제 근거를 명시해 뒀다. 그 주석을 반박하지 않은 채 채택하면 시각 회귀가 재발. **fitAll 바닥값 보정만** 분리 채택. |
| URL `replace` → `push` 전환 | `use-catalog-url-sync.ts:5`가 "히스토리 부풀림 방지"라고 의도를 명시한 트레이드오프. 고빈도 타이핑(`q`)까지 push하면 반대 비용이 실재한다. **제품 결정 대기** — 단 `event`(드로어) 한 파라미터만 push하는 최소안은 배치 6에서 별도 판단. |
| 그룹핑 규약 변경 | "자식을 부모 버킷에 붙인다"(never-drop 수정에서 확정)와 "세기›연도 크로노 그룹핑"(디자인 리뷰에서 확정한 레일=정거장 메타포)을 뒤집는다. **표기 보정만** 채택, 구조 변경 금지. |
| 대륙/국가 필터 옵션 개선 3건 | P1-1 때문에 오늘 사용자 노출이 0. 팝오버가 살아난 **뒤 실사용 기준으로 재평가**. |
| 예방적 성능 최적화 4건 | 제출자 스스로 "현재 데이터에서 체감 없음"이라 적었고 루트 141건 기준 수 ms. 규모 임계(루트 1,000건+) 도달 시 **증분 변환 + 서버 COALESCE 정렬**을 한 묶음으로. |
| 다중 선택·일괄 작업 (effort L) | 결함이 아니라 미구현 기능이고 서버 일괄 API가 없다. 배치 2 완료 후 스크롤 유실이 해소되면 체감이 달라지므로 그 뒤 재평가. |
| 방문 표시·메타 토큰 라기드 (PLAUSIBLE 2건) | 각각 커밋 `5a48b72ff`의 "단일 좌측밀착 행" 결정의 부분 되돌림, 그리고 `event-compact-list.tsx:57-58` 주석이 용도를 한정한 **신규 기능 요청**. 결함 목록이 아니라 백로그. |

---

## 7. 남은 검증

- **라이브 시각 검증 미실시**(Chrome 확장 미연결). 특히 P1-1·P1-8의 클리핑, 배치 5의 대비 항목은 실제 브라우저에서 한 번 확인하는 것이 좋다. vite는 `:3000`, API는 `:8000`에서 실행 중.
- 적대검증 기각률 0% — 이 검토서의 P2/P3 항목 중 §1·§5에서 직접 재확인하지 않은 것들은 **구현 착수 전 근거 라인 재확인**을 권한다.

---

## 부록 A — 렌즈별 원본 findings 124건

> 병합·우선순위는 §2~§4를 따른다. 이 표는 근거 추적용 원본이다. `status`는 적대검증 결과(CONFIRMED/PLAUSIBLE).


### IA — 정보구조·뷰모드 (15건)

| id | 심각도 | 공수 | status | 항목 | 근거 |
|---|---|---|---|---|---|
| IA-1 | P1 | M | CONFIRMED | 지도 뷰는 구조적으로 항상 빈 화면(마커 소스가 상수 []) | `apps/web-admin/src/entities/event/model/eventTransformers.ts:124`<br>`apps/web-admin/src/widgets/event-map-view/ui/event-map-view.tsx:73`<br>`apps/web-admin/src/widgets/event-map-view/ui/event-map-view.tsx:164`<br>`apps/web-admin/src/widgets/event-map-view/ui/event-map-view.tsx:184` |
| IA-2 | P1 | S | CONFIRMED | 통계(대시보드) 뷰: 조건부 훅 → 0건→N건 전환 시 페이지 크래시 | `apps/web-admin/src/widgets/event-dashboard-view/ui/event-dashboard-view.tsx:207`<br>`apps/web-admin/src/widgets/event-dashboard-view/ui/event-dashboard-view.tsx:220`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:484`<br>`apps/web-admin/src/pages/layout/layout.ui.tsx:87` |
| IA-3 | P2 | M | CONFIRMED | ?event= 딥링크가 '사건을 선택해주세요' 막다른 패널로 열림 | `apps/web-admin/src/pages/events/list/events.page.tsx:250`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:627`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:784`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:348` |
| IA-5 | P2 | M | CONFIRMED | 헤더 카운트·목록 카운트가 서로 다른 모수(110 vs 152) | `apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:138`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:300`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:769`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:142` |
| IA-6 | P2 | S | CONFIRMED | 중요도가 상수 'notable' — 통계 스트립·중요도 카드가 항상 0 | `apps/web-admin/src/entities/event/model/eventTransformers.ts:71`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:47`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:85`<br>`apps/web-admin/src/widgets/event-dashboard-view/ui/event-dashboard-view.tsx:99` |
| IA-8 | P2 | M | CONFIRMED | ↑↓/Home/End/Enter를 전역 가로채 모든 뷰·드로어 스크롤 차단 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:95`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:111`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:137`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:343` |
| IA-9 | P2 | M | CONFIRMED | 평면 보기 + 트리 뷰 = 하위 사건이 루트로 중복 렌더 | `apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:107`<br>`apps/web-admin/src/widgets/event-tree-view/ui/event-tree-view.tsx:65`<br>`apps/web-admin/src/widgets/event-tree-view/ui/event-tree-view.tsx:174`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:187` |
| IA-10 | P3 | S | CONFIRMED | 뷰 선택이 세션 간 기억 안 됨 — 매번 타임라인으로 리셋 | `apps/web-admin/src/pages/events/list/lib/resolve-default-view-mode.ts:7`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:145`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:124`<br>`apps/web-admin/src/shared/router.ts:159` |
| IA-11 | P3 | M | CONFIRMED | 격자(연대) 뷰 클릭이 드릴다운이 아니라 임의 사건 1건 선택 | `apps/web-admin/src/widgets/event-grid-view/ui/event-grid-view.tsx:159`<br>`apps/web-admin/src/widgets/event-grid-view/ui/event-grid-view.tsx:110`<br>`apps/web-admin/src/widgets/event-grid-view/ui/event-grid-view.tsx:94`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:95` |
| IA-12 | P3 | S | CONFIRMED | 'N개 적용 중'이 화면에 없는 검색어 칩까지 카운트 | `apps/web-admin/src/pages/events/list/events.page.tsx:385`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:223`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:229`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:261` |
| IA-13 | P3 | S | CONFIRMED | '전체 초기화'가 정렬까지 되돌리고 계층 토글은 남김 | `apps/web-admin/src/features/event-filters/model/useEventFilters.ts:285`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:388`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:253`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:249` |
| IA-14 | P3 | S | CONFIRMED | 첫 방문 노트북에서 wideMode 자동 ON → 뷰 설명이 사라짐 | `apps/web-admin/src/pages/events/list/events.page.tsx:124`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:315`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:286`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:719` |
| IA-15 | P3 | M | CONFIRMED | 뷰 복귀·딥링크 시 선택 항목으로 스크롤 복원 없음 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:124`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:250`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:456`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:353` |
| IA-4 | P3 | M | CONFIRMED | 모든 URL 갱신이 replace — 뒤로가기로 되돌릴 수 없음 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:181`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:5`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:784`<br>`apps/web-admin/src/pages/events/styles/list-page.styles.ts:354` |
| IA-7 | P3 | S | CONFIRMED | 뷰 전환 클릭 후 무반응 구간(isPending 폐기 + lazy fallback 억제) | `apps/web-admin/src/pages/events/list/events.page.tsx:245`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:443`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:457`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:176` |

**IA-1 — 지도 뷰는 구조적으로 항상 빈 화면(마커 소스가 상수 [])**  
문제: 목록 데이터 변환기 `transformEventsFromApi`가 모든 사건에 `map: { summary: '', markers: [] }`를 하드코딩한다(eventTransformers.ts:124). EventMapView는 오직 `evt.map?.markers`에서만 좌표를 읽으므로(:73) `allMarkers`는 항상 길이 0 → :164 분기로 무조건 EmptyStateSpotlight를 렌더한다. 위젯 헤더 주석이 약속한 'relatedCountries 첫 좌표 fallback'은 구현이 없다. 게다가 안내 문구가 지시하는 `map.markers` 입력 경로는 사건 등록/수정 폼에도 API DTO에도 존재하지 않는다(코드베이스 전체에서 markers를 쓰는 곳은 이 위젯·대시보드·타입 선언뿐).  
영향: 3개 primary 세그먼트(타임라인/목록/**지도**) 중 하나가 100% 확률로 죽은 화면이다. 사용자가 '지도'를 누르면 데이터 상태와 무관하게 '아직 좌표 데이터가 없습니다 — 사건 등록 시 map.markers에 좌표를 추가하면 표시됩니다'만 나오고, 그 지시대로 등록 화면에 가도 좌표 입력란이 없어 아무 것도 할 수 없다. 필터가 걸려 있으면 '현재 필터에 좌표 있는 사건이 없습니다 · 필터 모두 초기화' CTA가 떠서 사용자는 자기 필터 탓으로 오인하고 필터를 지우는 헛수고를 한다.  
권고: (a) 즉시: 지도를 PRIMARY_MODES에서 빼고(catalog-main-content.tsx:102-118) SECONDARY로 내리거나, 데이터 소스가 생길 때까지 VIEW_MODES에서 제외한다. 빈 상태 문구에서 실행 불가능한 지시(map.markers)를 제거. (b) 살릴 거면 주석이 약속한 fallback을 실제로 구현 — 목록 응답의 `relatedCountries`/`relatedHistoricalCountries` 좌표를 transformer에서 `map.markers`로 채우고, `hasActiveFilters` 분기는 '전체 데이터에 좌표 0건'일 때는 타지 않도록 분리한다.

**IA-2 — 통계(대시보드) 뷰: 조건부 훅 → 0건→N건 전환 시 페이지 크래시**  
문제: `if (stats.total === 0) return <EmptyStateSpotlight …>`(:207-215) 이른 반환 **뒤에** `const loadedRootCount = useMemo(...)`(:220-223)가 있다. 즉 훅 개수가 렌더마다 달라진다(빈 상태 1개 → 데이터 상태 2개). React는 이 전이에서 'Rendered more hooks than during the previous render'를 던진다.  
영향: 재현: 통계 뷰에서 검색창에 아무 문자열(결과 0건)을 넣었다가 지우면, 또는 `?view=dashboard` 딥링크로 진입해 데이터가 첫 렌더 이후 도착하면 컴포넌트가 예외를 던져 상위 SmartErrorBoundary가 잡아 **페이지 전체가 에러 화면으로 교체**된다. 필터를 되돌리는 지극히 평범한 조작이 화면을 날린다.  
권고: `loadedRootCount`/`isPartial` 계산을 `stats` useMemo 안으로 흡수하거나 최소한 이른 반환보다 위로 올린다(훅은 항상 같은 순서·개수로). 회귀 방지로 web-admin ESLint에 react-hooks/rules-of-hooks가 error로 걸리는지 확인.

**IA-3 — ?event= 딥링크가 '사건을 선택해주세요' 막다른 패널로 열림**  
문제: `selectedEventId`는 URL `event` 파라미터로 초기화되고(:250-252) 값이 truthy면 무조건 드로어가 마운트된다(:784). 그러나 상세 데이터는 `eventByIdMap`(로드·필터된 사건들)에서만 조회하고, 패널에는 `isLoading={false}`가 **하드코딩**돼 있다(:627). 따라서 해당 사건이 아직 페이지네이션으로 도착하지 않았거나(autoLoadAll 진행 중) 현재 필터/북마크 조건에 걸러졌으면 selectedEvent=null → 패널이 '사건을 선택해주세요 / 좌측에서 사건을 클릭하면 이 자리에 상세가 표시됩니다'를 띄운다(event-detail-panel.tsx:520-532).  
영향: 공유받은 `/events?event=<id>` 링크를 열면 (모바일에선 전면 슬라이드인 드로어가 열린 채) '사건 상세'라는 제목 밑에 '사건을 선택해주세요'라는 자기모순 문구가 뜬다. 사용자는 링크가 깨진 건지 로딩 중인지 알 수 없고, 필터가 걸린 URL(예: `?cat=…&event=…`)에서는 아무리 기다려도 영영 나타나지 않는다.  
권고: 세 갈래로 분기: (1) 아직 로딩 중(`isLoading || hasMore`)이면 `isLoading={true}`를 넘겨 스켈레톤, (2) 로드 완료 후에도 못 찾으면 '이 사건은 현재 필터에 가려져 있습니다 · 필터 해제' 또는 '삭제되었거나 접근 권한이 없습니다 · 상세 페이지로 이동' 안내, (3) 단건 조회 fallback(`getEventById`)으로 목록 밖 사건도 패널에 채운다.
근거 정정: 필터 배제 주장 근거로 events.page.tsx:364-371(selectedEvent)만 보면 오독됨. 실제 소스는 events.page.tsx:289 + use-catalog-event-index.ts:27-46 (필터 미적용 원본 events).

**IA-5 — 헤더 카운트·목록 카운트가 서로 다른 모수(110 vs 152)**  
문제: 세 카운트의 모수가 전부 다르다. `serverTotal`=서버의 **최상위(parentEventId=null)** 사건 수, `totalCount=events.length`=변환기가 부모+자식+손자를 모두 담은 평탄 배열 길이(eventTransformers.ts:142), `visibleCount=visibleFlattenedHierarchy.length`=루트+펼쳐진 자식. `isFiltered = visibleCount !== totalCount`(catalog-main-content.tsx:138)라 (a) 자식이 자동 펼침으로 다 보이면 두 값이 우연히 같아져 '미필터'로 판정 → 헤더는 serverTotal(루트 수)만 표시하는데 목록은 자식 포함 행을 렌더하고 하단에 '총 152건'을 찍는다(event-compact-list.tsx:524). (b) 사용자가 계층 하나를 접거나 손자 계층이 있으면 두 값이 달라져 **필터를 하나도 안 걸었는데** 필터 모드로 전환된다.  
영향: 같은 화면 상단에 '110건', 하단에 '끝까지 봤습니다 · 총 152건'이 동시에 보인다. 계층 한 줄을 접는 순간 헤더가 '150건 / 등록 전체 110건'으로 바뀌어 **필터된 수가 전체 수보다 큰** 모순이 뜨고, 툴팁은 '필터 적용 전 전체 수'라고 우긴다. 사용자는 어느 숫자가 진짜인지 판단할 수 없다.  
권고: 카운트 계약을 '최상위 기준' 하나로 통일: `totalCount`를 `events.filter(e=>!e.parentEventId).length`로, `visibleCount`도 depth 0 기준으로 넘기고, 자식 수는 '하위 N건 포함' 보조 표기로 분리한다. `isFiltered`는 카운트 비교가 아니라 실제 필터 상태(`filtersOrSearchActive`)로 판정해야 접기 조작이 필터로 둔갑하지 않는다.

**IA-6 — 중요도가 상수 'notable' — 통계 스트립·중요도 카드가 항상 0**  
문제: `buildHierarchy`가 모든 노드에 `importance: 'notable'`을 하드코딩한다(eventTransformers.ts:71). 이를 소비하는 CatalogHeaderStats의 critical/major 집계는 항상 0이라 '핵심·주요' 항목이 절대 렌더되지 않고(:85-102), 대시보드 '중요도 분포' 카드는 영구히 `핵심 0 · 주요 0 · 평범 N`이며, 격자 뷰 Top3의 중요도 정렬도 무의미해진다(event-grid-view.tsx:110-126, ImportancePill 전부 동일 등급). 더불어 헤더 스트립의 topCategory는 **필터되지 않은 `events` 전체**로 계산되는데(:47-53) 앞의 총계만 필터된 값으로 바뀐다(:78).  
영향: 통계 스트립은 사실상 '숫자 1개'로 퇴화했고, '통계' 뷰의 첫 카드는 정보량이 0인 채 자리를 차지한다. 필터를 걸면 '12건 · 정치 47' 처럼 **부분 카운트가 총계보다 큰** 줄이 만들어져 무엇을 세고 있는지 알 수 없다.  
권고: 중요도를 실제로 안 쓰면 헤더 스트립의 tier 표시와 대시보드 '중요도 분포' 카드를 제거하고, 쓸 거면 API 응답 필드를 transformer에 배선한다. topCategory 등 스트립 집계는 총계와 같은 모수(현재 필터 결과)로 계산해 한 줄 안에서 스코프를 섞지 않는다.

**IA-8 — ↑↓/Home/End/Enter를 전역 가로채 모든 뷰·드로어 스크롤 차단**  
문제: `useCatalogListNavigation`이 window에 keydown을 걸고(:137) 입력창이 아닌 모든 포커스에서 ArrowUp/ArrowDown/Home/End에 `preventDefault()`를 호출한다(:95-110). 이 훅은 viewMode와 무관하게 항상 활성이고(events.page.tsx:343-348), 리스트가 없는 통계·지도·갤러리·격자 뷰와 상세 드로어 안에서도 동작한다. Enter는 `selectedEventId`만 있으면 상세 페이지로 navigate한다(:111-114).  
영향: ① 키보드/스크린리더 사용자가 통계 뷰나 상세 드로어를 화살표로 스크롤할 수 없다 — 대신 목록 선택이 옆으로 움직이며 드로어 내용이 통째로 다른 사건으로 바뀐다(읽던 자리를 잃음). ② 사건이 선택된 상태에서 툴바의 '북마크'·'JSON'·필터 칩에 Tab으로 이동해 Enter를 누르면 그 버튼이 실행되는 동시에 `/events/:id`로 **페이지가 이탈**한다. ③ 지도 뷰에는 `[data-event-id]`가 없어 화살표가 조용히 선택만 바꾸고 아무 피드백이 없다.  
권고: (1) 훅을 `viewMode === LIST`(및 행 기반 뷰)에서만 활성화, (2) 리스트 컨테이너에 포커스가 있을 때만(`listRef.current?.contains(document.activeElement)`) 처리하도록 스코프 축소, (3) Enter는 활성 요소가 버튼/링크가 아닐 때만 navigate(`e.target.closest('button,a')` 가드), (4) 드로어가 열려 있으면(dialog 모드) 리스트 네비게이션 비활성.
근거 정정: use-catalog-keyboard.ts:95는 ArrowDown 분기 시작(:95-100), ArrowUp은 :101-104, Home :105-107, End :108-110. 추가 근거: 같은 파일 :16-23 isInEditableElement가 HTMLSelectElement 미포함.

**IA-9 — 평면 보기 + 트리 뷰 = 하위 사건이 루트로 중복 렌더**  
문제: '계층' 토글을 끄면(`showFlatView=true`) 평탄화가 **모든 노드를 depth 0으로** 밀어 넣는다(useEventHierarchy.ts:107). 트리 뷰는 `depth===0`인 항목을 루트로 간주해 카드로 뽑고(event-tree-view.tsx:65-77) 각 카드 안에서 `root.children`을 무조건 다시 렌더한다(:174-190). 즉 자식 사건이 자기 루트 카드로 한 번, 부모 카드 안 자식 노드로 또 한 번 나온다. `data-event-id`도 중복돼 키보드 이동의 `scrollIntoView`와 `aria-current`가 첫 번째 노드로만 매칭된다.  
영향: 필터 바에서 '계층' 스위치를 끈 뒤 트리 뷰로 가면 같은 사건이 화면에 두 번 나타나 목록이 부풀고(노드 수 표기도 실제와 어긋남), 어느 쪽을 눌러야 하는지 모호해진다. 반대로 '계층 끄기'를 눌렀는데도 트리는 여전히 계층을 그려 토글이 먹히지 않은 것처럼 보인다.  
권고: 트리 뷰는 평면 모드에서도 항상 원본 루트(`events.filter(e=>!e.parentEventId)`)를 기준으로 렌더하거나, `showFlatView`일 때 트리 세그먼트를 비활성화/안내한다. 근본적으로 '계층/평면'은 필터가 아니라 목록 뷰 전용 표시 옵션이므로 FiltersPanel(:187-200)에서 ViewSwitcherRow의 표시 옵션 쪽으로 옮기고 적용 뷰를 명시하는 것이 맞다.
근거 정정: FiltersPanel의 계층 토글 블록은 :187이 아니라 :186-200(`<Filter.FilterToggle onClick={onToggleFlatView}>`가 :186).

**IA-10 — 뷰 선택이 세션 간 기억 안 됨 — 매번 타임라인으로 리셋**  
문제: `resolveDefaultViewMode`는 URL `view` 파라미터와 `max-width:640px` 미디어쿼리만 본다(:7-18). 영속 저장소는 쓰지 않는다 — 같은 페이지의 '넓게 보기'는 localStorage로 세션 간 유지하는데(events.page.tsx:124-137) 정작 정보 밀도를 좌우하는 뷰 모드는 아니다. `pathKeys.events.root()`는 쿼리가 없는 `/events/`이므로(shared/router.ts:159) 사이드바·홈 등에서 들어오면 항상 파라미터가 비고, URL→상태 effect가 그때마다 기본값으로 되돌린다(use-catalog-url-sync.ts:145-146).  
영향: 항상 '목록'으로 일하는 데스크톱 사용자도 사이드바로 /events에 들어올 때마다 가장 무겁고(위젯 5,596줄) 가로 패닝이 Space+드래그/Ctrl+휠뿐인 타임라인이 먼저 뜬다. 매 방문마다 '목록'을 다시 누르는 반복 마찰이 생긴다.  
권고: 뷰 모드도 wideMode와 같은 방식으로 localStorage에 영속화하고 우선순위를 URL > 저장값 > 디바이스 기본으로 둔다. 저장값이 있는데 URL이 비어 있는 경우에는 첫 마운트에서만 채택해 딥링크를 덮어쓰지 않도록 한다.

**IA-11 — 격자(연대) 뷰 클릭이 드릴다운이 아니라 임의 사건 1건 선택**  
문제: 격자 뷰는 '어느 시대에 사건이 몰렸는지'를 보여주는 거시 진입점으로 선언돼 있으나(VIEW_HINTS, catalog-main-content.tsx:95) 카드 클릭 핸들러는 `onSelectEvent(cell.top3[0].id)`로 **그 연대의 첫 사건 하나를 선택**할 뿐이다(:159-167). 세기/연대 필터를 적용하거나 목록으로 넘겨주는 경로가 없다. top3 자체도 importance가 상수라(IA-6) 사실상 순회 순서 3건이다. 또 `parseIsoDateParts` 실패 사건은 `if (!p) continue`로 조용히 빠져(:94) 격자 총합이 헤더 카운트와 달라진다.  
영향: '1910년대 12건' 카드를 눌러 그 시대를 파고들려 하면 엉뚱한 한 사건의 상세 드로어만 열린다. 나머지 11건으로 가려면 다시 목록 뷰로 가서 세기 필터를 손으로 걸어야 해, 거시→미시 동선이 끊긴다. 날짜 미상 사건은 격자에서 아예 보이지 않는데 어디에도 고지되지 않는다.  
권고: 카드 클릭을 '세기/연대 필터 적용 + 목록 뷰 전환'(또는 최소한 `setSelectedCentury`)으로 바꾸고, 개별 사건 선택은 카드 안 Top3 행에만 남긴다. 날짜 파싱 실패분은 목록 뷰와 동일하게 '연도 미상' 셀로 모아 드롭하지 않는다.

**IA-12 — 'N개 적용 중'이 화면에 없는 검색어 칩까지 카운트**  
문제: `activeFilterCount = filterSummaryChips.length + (bookmarksOnly ? 1 : 0)`인데(events.page.tsx:385) 칩 렌더링은 `key !== 'keyword'`를 걸러낸다(catalog-toolbar.tsx:229-231). 검색어가 있으면 chips에는 keyword가 포함되므로(useEventFilters.ts:261-267) 카운트만 1 증가한다.  
영향: 검색어만 입력한 상태에서 활성 필터 바에 '1개 적용 중'과 '전체 초기화'만 뜨고 정작 지울 수 있는 칩은 하나도 없다. 사용자는 보이지 않는 필터가 걸렸다고 오해하고 '전체 초기화'를 눌러 검색어까지 날린다.  
권고: `activeFilterCount`를 실제 렌더되는 칩 수로 계산하거나(keyword 제외), 반대로 검색어 칩도 바에 표시해 카운트와 일치시킨다.

**IA-13 — '전체 초기화'가 정렬까지 되돌리고 계층 토글은 남김**  
문제: `handleResetFilters`가 카테고리·키워드·세기·국가·대륙뿐 아니라 `setSortBy('recent')`·`setSortDirection('desc')`도 되돌린다(:285-293). 정렬은 UI상 필터가 아니라 ViewSwitcherRow의 '표시 옵션' family로 분리돼 있는데도(catalog-main-content.tsx:249-277) 초기화 대상에 들어가 있고, 반대로 같은 필터 바에 있는 '계층/평면' 토글은 초기화되지 않는다.  
영향: 오름차순(옛날→최근)으로 맞춰 놓고 필터를 몇 개 걸었다가 '전체 초기화'를 누르면 정렬이 말없이 최신순으로 되돌아가 스크롤 위치와 읽던 시대가 통째로 바뀐다. 필터 바의 다른 토글은 그대로 남아 규칙이 일관되지 않는다.  
권고: `handleResetFilters`에서 정렬 리셋을 제거(정렬은 표시 옵션이므로 보존)하거나, 최소한 버튼 라벨을 '필터·정렬 초기화'로 정직하게 바꾸고 계층 토글까지 포함해 범위를 통일한다.

**IA-14 — 첫 방문 노트북에서 wideMode 자동 ON → 뷰 설명이 사라짐**  
문제: wideMode 초기값이 `window.innerHeight < 860`이라(:124-137) 13~14인치 노트북(innerHeight 대개 700~800)에서는 **첫 방문부터 켜진 상태**로 시작한다. wideMode는 페이지 헤더(:719)와 `VIEW_HINTS` 캡션(catalog-main-content.tsx:315)을 함께 접는다. 그런데 목록·격자·갤러리·통계·트리·지도 뷰는 wideMode prop을 받지 않아(events.page.tsx:523-562) 실제 절약분은 헤더+힌트 ~50px뿐이고, 툴팁이 약속한 '콘텐츠 최대화'(~250px)는 타임라인 미니맵에만 해당한다(:286-290).  
영향: 7개 뷰의 용도를 알려주는 유일한 안내문이 처음 온 사용자에게 기본으로 감춰져, '격자'와 '갤러리'와 '트리'가 뭐가 다른지 모른 채 하나씩 눌러 보게 된다. 반대로 넓게 보기를 켜도 목록 뷰에서는 체감 이득이 거의 없어 토글의 가치가 오해된다.  
권고: 첫 방문 자동 ON은 타임라인 뷰일 때만 적용하고(다른 뷰는 기본 OFF), ViewHint는 wideMode와 분리해 유지하거나 세그먼트 tooltip/aria-description으로 옮겨 항상 접근 가능하게 한다. 툴팁 문구도 뷰별 실제 효과에 맞게 조정.

**IA-15 — 뷰 복귀·딥링크 시 선택 항목으로 스크롤 복원 없음**  
문제: `scrollIntoView`는 키보드 ↑↓ 이동 경로에서만 호출된다(use-catalog-keyboard.ts:124-133). viewMode 전환은 `activeSlot` switch로 뷰 컴포넌트를 언마운트/마운트하므로(:456-583) 스크롤 위치가 매번 0으로 돌아가고, `?event=`로 진입해 선택 상태가 복원돼도(:250-252) 해당 행으로 스크롤하는 코드가 없다. 덧붙여 autoLoadAll이 켜진 상태에서 `onScroll`의 수동 무한스크롤 경로가 그대로 남아 있고(:353-361), 목록 하단은 여전히 '↓ 스크롤하여 더 보기'로 안내한다(event-compact-list.tsx:516).  
영향: 152행 목록에서 1700년대까지 내려가 통계 뷰를 잠깐 봤다가 돌아오면 다시 맨 위다. 공유 링크로 특정 사건을 열면 드로어는 뜨는데 좌측 목록에서 그 행이 화면 밖이라 문맥(앞뒤 사건)을 볼 수 없다.  
권고: 선택된 `data-event-id`가 있으면 리스트 마운트 시 한 번 `scrollIntoView({block:'center'})`를 실행하고, 뷰 전환 시 스크롤 오프셋을 뷰별로 ref/sessionStorage에 기억했다 복원한다. autoLoadAll 콜사이트에서는 죽은 `handleScroll` 경로와 '스크롤하여 더 보기' 문구를 제거해 로딩 모델을 하나로 통일한다.

**IA-4 — 모든 URL 갱신이 replace — 뒤로가기로 되돌릴 수 없음**  
문제: 상태→URL effect가 검색어·필터·뷰·선택 사건까지 **모두** `setSearchParams(next, { replace: true })`로 쓴다(:181). 훅 상단 주석은 '뒤로가기 시 끌어와 반영'을 표방하지만(:5-6) 히스토리 엔트리가 만들어지지 않아 되돌릴 상태가 없다. 선택 사건(`?event=`)은 1200px 미만에서 전면 드로어(dialog, position:fixed)를 여는데 이것도 replace다.  
영향: 필터를 잘못 걸거나 사건을 잘못 눌렀을 때 브라우저 뒤로가기를 누르면 직전 상태로 돌아가는 대신 **/events 페이지를 완전히 벗어난다**. 특히 모바일에서 전면 드로어가 열린 상태의 뒤로가기(시스템 back 제스처)는 드로어만 닫히는 게 아니라 카탈로그를 떠나 버려, 사용자는 다시 진입해 필터를 처음부터 다시 건다.  
권고: 최소한 '탐색적' 상태 변화(사건 선택 `event`, 뷰 전환 `view`)는 push, 고빈도 타이핑(`q`)만 replace로 분리한다. 모바일 드로어는 열 때 push하고 popstate에서 닫는 패턴(history 기반 dialog)으로 시스템 back과 정합시킨다.
근거 정정: 주석 근거는 :5-6이 아니라 :4(‘URL → 상태: 마운트/뒤로가기/딥링크 진입 시’). :5-6은 오히려 replace가 의도적임을 명시한 줄.

**IA-7 — 뷰 전환 클릭 후 무반응 구간(isPending 폐기 + lazy fallback 억제)**  
문제: 뷰 전환은 `startTransition(() => setViewMode(next))`로 처리되고 `isPending`은 `const [, startViewTransition]`으로 버려진다(:245-249). 전환 중에는 상태가 아직 커밋되지 않으므로 세그먼트의 `$active`/`aria-pressed`도 이전 뷰에 머문다. 게다가 transition은 이미 보이는 콘텐츠를 fallback으로 가리지 않으므로, 새로 마운트되는 lazy 뷰(:457-522, 특히 Leaflet ~150KB인 지도)가 서스펜드하는 동안 `LazyViewFallback`(:443-448)은 표시되지 않고 **이전 뷰가 그대로 남는다**.  
영향: '격자'나 '지도'를 눌러도 버튼 하이라이트조차 바뀌지 않고 화면이 그대로여서, 느린 네트워크에서 사용자는 클릭이 씹혔다고 판단해 여러 번 누른다. 청크가 도착하는 순간에야 화면이 툭 바뀐다.  
권고: `const [isViewPending, startViewTransition] = useTransition()`로 받아 (a) 클릭된 세그먼트에 즉시 pending 스타일(스피너/opacity)과 `aria-busy`를 주고, (b) 지연이 길면 `LazyViewFallback`을 명시적으로 렌더한다. 대안으로 세그먼트 hover/focus 시 해당 뷰 모듈을 prefetch(`import()` 워밍업).


### FLT — 툴바·검색·필터 (16건)

| id | 심각도 | 공수 | status | 항목 | 근거 |
|---|---|---|---|---|---|
| TF-1 | P1 | M | CONFIRMED | 카테고리·대륙·국가 필터 팝오버가 FilterGroup의 overflow:hidden에 잘려 아예 안 보임 | `apps/web-admin/src/pages/events/styles/filter.styles.ts:42`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:43`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:97`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:114` |
| TF-2 | P2 | S | CONFIRMED | 사건이 선택된 상태에서 Enter를 누르면 어떤 버튼도 동작하지 않고 상세로 이탈 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:16`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:84`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:111`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:137` |
| TF-3 | P2 | S | CONFIRMED | 정렬·세기·페이지크기 네이티브 select를 키보드로 조작할 수 없음(화살표 preventDefault) | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:16`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:95`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:105`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:166` |
| TF-4 | P2 | M | CONFIRMED | 720px 이하에서 '더보기' 뷰 메뉴가 ViewSegmented overflow에 잘려 격자·통계·트리·갤러리 진입 불가 | `apps/web-admin/src/pages/events/styles/list-toolbar.styles.ts:457`<br>`apps/web-admin/src/pages/events/styles/list-toolbar.styles.ts:471`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:188`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:221` |
| TF-6 | P2 | S | CONFIRMED | '계층' 토글은 라벨/아이콘을 클릭하면 두 번 실행돼 아무 변화가 없음 | `apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:187`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:190`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:193`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:589` |
| TF-8 | P2 | M | CONFIRMED | 카테고리·검색 필터가 하위 사건에는 적용되지 않아 비매칭 자식이 결과에 섞이고 카운트에 포함됨 | `apps/web-admin/src/features/event-filters/model/useEventFilters.ts:157`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:163`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:59`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:135` |
| TF-10 | P3 | S | CONFIRMED | 전체 페이지 자동 소진 중에도 '일치하는 사건이 없습니다'를 확정 표시 | `apps/web-admin/src/pages/events/list/events.page.tsx:172`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:526`<br>`apps/web-admin/src/entities/event/model/useEvents.ts:137`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:208` |
| TF-11 | P3 | M | CONFIRMED | 국가 필터 옵션이 '사건이 있는 국가'가 아니라 DB 전체 국가의 앞 50개 | `apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:95`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:147`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:160`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-reference-data.ts:26` |
| TF-12 | P3 | S | CONFIRMED | 결과 카운트 옆 통계 스트립이 필터를 무시한 전체 집계라 서로 모순 | `apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:43`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:78`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:85`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:300` |
| TF-13 | P3 | S | CONFIRMED | 'N개씩' 페이지 크기 컨트롤이 표시량을 바꾸지 못하고 요청 수만 늘림(라벨이 오도) | `apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:267`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:270`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:119`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:172` |
| TF-14 | P3 | S | CONFIRMED | 'N개 적용 중' 개수와 실제 칩 개수가 어긋남(검색어는 세지만 칩은 숨김) | `apps/web-admin/src/pages/events/list/events.page.tsx:385`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:223`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:229`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:261` |
| TF-15 | P3 | S | CONFIRMED | 대륙을 골라도 국가 목록이 좁혀지지 않아 모순 조합으로 0건에 빠짐 | `apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:131`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:147`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:95`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:146` |
| TF-16 | P3 | S | CONFIRMED | 정렬 기준을 바꾸면 방향이 항상 내림차순으로 되돌아가고, '전체 초기화'는 정렬까지 리셋 | `apps/web-admin/src/pages/events/list/events.page.tsx:680`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:683`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:285`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:253` |
| TF-5 | P3 | M | CONFIRMED | FilterGroup의 `& button {...!important}`가 팝오버 내부 버튼까지 덮어써 선택 표시·포커스 링 소멸 | `apps/web-admin/src/pages/events/styles/filter.styles.ts:57`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:60`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:63`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:464` |
| TF-7 | P3 | M | CONFIRMED | 하위 사건의 관련국이 목록 응답에 없어 국가·대륙 필터가 자식을 못 본다 | `apps/api/src/libs/event/presentation/event.controller.ts:513`<br>`apps/api/src/libs/event/presentation/event.controller.ts:531`<br>`apps/api/src/libs/event/presentation/event.controller.ts:282`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:130` |
| TF-9 | P3 | M | CONFIRMED | 대륙 필터가 역사국가 사건을 통째로 배제하는데 화면에 아무 안내가 없음 | `apps/web-admin/src/features/event-filters/model/useEventFilters.ts:60`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:134`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:139`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:242` |

**TF-1 — 카테고리·대륙·국가 필터 팝오버가 FilterGroup의 overflow:hidden에 잘려 아예 안 보임**  
문제: FilterGroup(filter.styles.ts:35~)은 height:34px + overflow:hidden(모바일에선 overflow-x:auto/overflow-y:hidden)인 컨테이너다. InlineFilterPopover의 PopoverWrap(position:relative)이 그 직속 자식이고, Popover는 그 안에서 position:absolute; top:calc(100% + 4px)로 그려진다. 절대배치 요소는 자기 컨테이닝 블록(PopoverWrap)이 클리핑 조상(FilterGroup) *안에* 있으면 그대로 잘리므로, 34px 박스 밖(y=38px)에서 시작하는 팝오버 전체가 클리핑된다. z-index:60은 클리핑과 무관하다. 동일 구조를 재현해 headless Chrome으로 측정한 결과 팝오버 옵션 중앙에서 document.elementFromPoint()가 BODY를 반환했고(=페인트·히트테스트 모두 없음) 스크린샷에도 드롭다운이 전혀 나타나지 않았다.  
영향: 툴바에서 '카테고리'/'대륙'/'국가'를 클릭하면 아무 일도 일어나지 않은 것처럼 보인다(클릭은 되고 open=true지만 화면에 아무것도 안 뜸). 팝오버 안에 있는 국가 검색창·'전체 보기 →'가 유일한 CategoryModal/AdvancedCountrySelectModal 진입점이므로(catalog-toolbar.tsx:175-176) 카테고리·국가 필터는 URL(?cat=, ?country=)을 직접 편집하지 않는 한 사용할 방법이 전혀 없다. 실제로 조작 가능한 필터는 네이티브 select인 '세기'뿐이다.  
권고: FilterGroup의 overflow:hidden은 radius 클리핑용이므로 팝오버 경로를 컨테이너 밖으로 뺀다. ① 최소 수정: Popover를 createPortal로 body에 띄우고 트리거 rect 기준으로 좌표 계산(RecentEventsDropdown처럼 clipping 조상이 없는 곳으로 이동), 또는 ② FilterGroup에서 overflow:hidden을 제거하고 자식 첫/마지막 요소에 border-radius를 직접 부여(모바일 가로 스크롤은 별도 래퍼 div로 분리해 overflow를 팝오버 조상에서 떼어낸다). 회귀 방지를 위해 '팝오버가 열렸을 때 옵션이 히트테스트되는지'를 검증하는 렌더 테스트를 추가.
근거 정정: filter.styles.ts:97 → 99~100 (`overflow-x:auto; overflow-y:hidden`은 97행이 아니라 99~100행). 나머지 42·43·114·286·389·391은 정확.

**TF-2 — 사건이 선택된 상태에서 Enter를 누르면 어떤 버튼도 동작하지 않고 상세로 이탈**  
문제: useCatalogListNavigation이 window keydown을 전역으로 듣고, 편집 요소 판정(isInEditableElement)은 input/textarea/contenteditable만 제외한다. 따라서 포커스가 툴바의 어떤 <button>에 있어도 핸들러가 실행되고, selectedEventId가 있으면 `e.key==='Enter'` 분기에서 preventDefault() 후 navigate(detail)를 호출한다. 버튼의 Enter 활성화는 keydown의 기본 동작이므로 preventDefault로 취소되어 버튼 onClick은 아예 안 불린다.  
영향: 사건을 하나 클릭해 드로어를 연 뒤 키보드로 툴바를 쓰면(북마크, JSON 내보내기, 도움말, 새 사건 등록, 활성 필터 칩 ✕, 전체 초기화, 뷰 세그먼트, 넓게 보기 등) Enter가 그 버튼을 누르지 않고 선택된 사건 상세 페이지로 이동해 카탈로그 상태(스크롤·펼침)가 통째로 날아간다. 마우스 사용자에겐 안 보이고 키보드 전용 사용자만 겪는다.  
권고: Enter 처리를 전역 window 리스너가 아니라 리스트 컨테이너(CompactList) 자체의 onKeyDown으로 스코프하거나, 최소한 `if ((e.target as HTMLElement)?.closest('button, a, select, [role="button"]')) return` 가드를 isInEditableElement에 합류시킨다. 화살표/Home/End도 같은 가드를 공유해야 한다.

**TF-3 — 정렬·세기·페이지크기 네이티브 select를 키보드로 조작할 수 없음(화살표 preventDefault)**  
문제: isInEditableElement가 HTMLSelectElement를 제외 목록에 넣지 않아, 세기 필터(CenturySelect)·정렬 기준(Filter.SortSelect)·페이지 크기(List.SortSelect)에 포커스가 있어도 리스트 네비게이션 핸들러가 실행된다. ArrowDown/ArrowUp/Home/End 모두 e.preventDefault()되어 네이티브 select의 옵션 이동·팝업 열기(Alt+ArrowDown 포함)가 전부 취소되고, 대신 리스트 선택만 바뀐다.  
영향: 키보드 사용자가 Tab으로 '세기' 셀렉트에 도달해 ↓를 눌러도 세기가 바뀌지 않고 뒤쪽 리스트의 선택 행만 움직인다. 정렬 기준·페이지 크기도 동일. Enter를 누르면 TF-2에 걸려 상세로 이탈한다. 남는 수단은 문자 타이핑 typeahead뿐이라 사실상 세 컨트롤 모두 키보드로 못 바꾼다.  
권고: isInEditableElement에 `el instanceof HTMLSelectElement`(및 role='listbox'/'combobox' 컨테이너)를 추가한다. TF-2와 같은 가드 함수를 공유해 한 곳만 고치면 되도록 한다.

**TF-4 — 720px 이하에서 '더보기' 뷰 메뉴가 ViewSegmented overflow에 잘려 격자·통계·트리·갤러리 진입 불가**  
문제: ViewSegmented는 @media(max-width:720px)에서 overflow-x:auto; overflow-y:hidden + mask-image를 갖는다. MoreSegmentWrap(position:relative)이 그 자식이고 MoreMenu는 top:calc(100% + 4px)의 absolute라 TF-1과 동일한 원리로 세로 방향이 클리핑된다. 640px 뷰포트로 동일 구조를 재현해 측정한 결과 메뉴 항목 중앙에서 elementFromPoint가 BODY를 반환했다.  
영향: 태블릿·모바일(≤720px)에서 '더보기'를 눌러도 드롭다운이 안 보여 격자/통계/트리/갤러리 4개 뷰로 전환할 방법이 없다(URL ?view=grid 직접 입력 제외). 데스크톱에서는 정상이라 재현 조건을 모르면 '가끔 안 된다'로만 보인다.  
권고: MoreMenu도 portal로 띄우거나, ViewSegmented의 가로 스크롤을 별도 내부 래퍼(div)로 옮겨 MoreSegmentWrap이 클리핑 조상 밖에 놓이게 한다. TF-1과 같은 수정 패턴이라 함께 처리 권장.
근거 정정: list-toolbar.styles.ts:457 → 458~459(overflow-x/overflow-y). 471(mask-image)은 정확.

**TF-6 — '계층' 토글은 라벨/아이콘을 클릭하면 두 번 실행돼 아무 변화가 없음**  
문제: Filter.FilterToggle은 <label>이고 onClick={onToggleFlatView}를 직접 갖는다. 그 안에 <button>(Switch)이 있는데 button은 labelable 요소라, 라벨 영역 클릭 시 ① 라벨의 onClick이 실행되고 ② 브라우저가 라벨 활성화 동작으로 중첩 버튼에 클릭을 전달해 Switch의 onClick까지 실행된다. 동일 구조를 headless Chrome으로 클릭 측정한 결과 라벨 텍스트 클릭 시 핸들러가 LABEL→BTN 순으로 2회 실행됐다(스위치 직접 클릭은 1회).  
영향: '계층' 글자나 좌측 아이콘, 라벨 여백을 클릭하면 계층/평면 전환이 두 번 일어나 원위치 — 사용자에겐 '토글이 고장났다'로 보인다. 30×18px짜리 작은 스위치를 정확히 눌러야만 동작하며, 모바일 터치에서 특히 자주 빗나간다.  
권고: label의 onClick을 제거하고 Switch 버튼 하나만 토글을 담당하게 하거나(라벨은 클릭 전달만), 반대로 label을 <div>로 바꾸고 내부 Switch에서 stopPropagation을 제거해 단일 경로로 만든다. 함께 Switch에 role="switch" + aria-checked + aria-label(계층 보기)을 부여해 스크린리더에서 이름·상태가 읽히게 한다.

**TF-8 — 카테고리·검색 필터가 하위 사건에는 적용되지 않아 비매칭 자식이 결과에 섞이고 카운트에 포함됨**  
문제: 필터는 루트만 산출하고(filteredEvents는 `!parentEventId` + matchesSelfOrDescendant), 그 뒤 useEventHierarchy가 자식을 무필터로 전개한다. 게다가 자식을 가진 부모는 자동 펼침(useEventHierarchy.ts:59-77)이라, 매칭된 루트의 하위 사건은 카테고리·검색어·세기 조건과 무관하게 전부 렌더된다. displayedCount(=visibleFlattenedHierarchy.length)에도 그대로 포함된다.  
영향: 카테고리='전쟁'으로 걸었는데 목록에 '조약 체결'(외교) 같은 하위 사건이 그대로 보이고, '전쟁 12건'이라고 표시된 수치에 그 비매칭 자식들이 섞여 있다. 검색어로 좁혔을 때도 검색어가 없는 자식이 같이 나와 '검색이 안 먹는다'는 인상을 준다.  
권고: 평탄화 단계에 매칭 술어를 전달해 (a) 자식도 매칭될 때만 전개하거나 (b) 비매칭 자식은 '조건 밖 하위 N건' 접힘 행으로 축약한다. 최소한 displayedCount는 매칭 항목만 세도록 분리해 카운트 오염을 막는다.

**TF-10 — 전체 페이지 자동 소진 중에도 '일치하는 사건이 없습니다'를 확정 표시**  
문제: 검색·필터는 전부 클라이언트에서 '현재까지 로드된' events 위에 돈다. isLoading은 첫 페이지 이후 false가 되고(events.page.tsx:526은 `isLoading && events.length===0`), 2페이지 이후가 스트리밍되는 동안 결과가 0이면 EventCompactList가 곧바로 빈 상태 분기로 들어간다. 로딩 중임을 알리는 LoadingMoreRow(isLoadingMore)는 비어있지 않은 분기 안에만 있어 이때 렌더되지 않는다.  
영향: 큰 DB에서 검색어를 치면 잠깐 '현재 조건과 일치하는 사건이 없습니다 · 모든 필터 초기화'가 뜬 뒤 몇 초 후 결과가 튀어나온다. 사용자는 그 사이 '없구나' 하고 필터를 지우거나 페이지를 떠난다. 세기·국가 필터도 마지막 페이지에 몰린 1000년 이전 사건 때문에 같은 증상을 낸다.  
권고: 빈 상태 분기 조건에 `hasMore || isFetchingNextPage`를 합류시켜, 아직 소진 중이면 '전체 사건을 불러오는 중… (현재 N건 검색됨)' 상태를 보여준다(타임라인 위젯이 이미 쓰는 분기 패턴과 통일). 근본적으로는 검색어/카테고리/세기를 서버 파라미터로 넘겨 부분 데이터 위 검색 자체를 없앤다.
근거 정정: event-compact-list.tsx:208 → 빈 상태 분기 조건은 207행(`) : flattenedHierarchy.length === 0 ? (`), 208은 EmptyCatalogState 시작.

**TF-11 — 국가 필터 옵션이 '사건이 있는 국가'가 아니라 DB 전체 국가의 앞 50개**  
문제: 옵션은 getAllCountries + getAllHistoricalCountries 전량을 그대로 이어붙인 뒤 maxVisible=50으로 앞에서 자른다(정렬·빈도 가중치 없음). 사건 기반 국가 목록을 만들려던 availableCountries(useEventFilters.ts:69-77)는 어디에서도 소비되지 않는 데다, 소스인 event.countries가 transformer에서 항상 []로 채워져(eventTransformers.ts:110) 언제나 빈 배열을 반환한다 — 즉 '사건에 실제로 등장하는 국가' 패싯이 이중으로 죽어 있다.  
영향: 국가 목록을 열면 사건이 0건인 나라들이 대부분인 50개가 임의 순서로 뜨고, 실제로 사건이 많은 역사국가는 뒤에 밀려 검색으로만 도달 가능하다. 고른 국가가 0건이면 결과가 비어 사용자는 '필터가 고장났나'로 해석한다.  
권고: 국가 옵션을 events의 relatedCountries/relatedHistoricalCountries 빈도로 정렬하고 각 항목에 건수를 병기한다(0건은 하단 접힘 또는 비활성). availableCountries는 관계 필드 기준으로 다시 구현하거나 삭제한다.
근거 정정: '임의 순서' → 서버가 name asc 정렬(apps/api/src/libs/country/infrastructure/country.prisma.repository.ts:17). 인용 라인 95·147·160·26·69·110은 전부 정확.

**TF-12 — 결과 카운트 옆 통계 스트립이 필터를 무시한 전체 집계라 서로 모순**  
문제: CatalogHeaderStats는 앞의 큰 숫자만 visibleCount(필터 적용 후)를 쓰고, 옆의 '핵심/주요/TOP 카테고리'는 events(로드된 전체, 필터 미적용)에서 계산한다. 게다가 tier는 e.hierarchy.importance로 세는데 transformer가 importance를 항상 'notable'로 고정해(eventTransformers.ts:71) critical/major는 영원히 0 — 주석에 적힌 '핵심 89 · 주요 234' 표기는 절대 렌더되지 않는다.  
영향: 카테고리='전쟁'으로 좁혀 12건이 남았는데 바로 옆에 '정치 47'처럼 전혀 다른 카테고리의 전체 수치가 붙어 나온다. 사용자는 두 숫자의 관계를 해석할 수 없고, 필터 결과 요약으로 신뢰할 수 없다. 설계상 있어야 할 중요도 분포는 아예 안 나온다.  
권고: 통계 스트립도 필터 결과(visibleFlattenedHierarchy 기준 이벤트 집합)를 입력으로 받게 하고, 필터 상태일 때는 '전체 대비' 값과 구분되도록 라벨을 붙인다. importance가 실데이터로 채워지지 않는 한 tier 블록은 제거한다.

**TF-13 — 'N개씩' 페이지 크기 컨트롤이 표시량을 바꾸지 못하고 요청 수만 늘림(라벨이 오도)**  
문제: autoLoadAll:true라 useEvents는 hasNextPage가 false가 될 때까지 모든 페이지를 자동 소진한다. 따라서 pageSize는 최종 표시 건수에 영향이 전혀 없고 요청 분할 단위만 바꾼다. 그런데 title은 '한 번에 불러올 사건 수 (스크롤 시 추가 로드)'로 스크롤 기반 점진 로드를 암시한다. 게다가 pageSize는 buildQueryKey에 들어가 값이 바뀌면 캐시가 갈리고 1페이지부터 전량 재요청된다.  
영향: '20개씩'을 고르면 목록이 20건으로 줄 거라 기대하지만 결과는 동일하고, 대신 요청이 5배로 늘어 첫 화면 완성이 눈에 띄게 느려진다. URL(?size=20)로 공유되면 받는 사람도 같은 손해를 그대로 물려받는다.  
권고: autoLoadAll이 켜진 카탈로그에서는 이 컨트롤을 감추거나, 라벨을 '한 번에 요청할 개수(성능 옵션)'로 정직하게 바꾼다. 사용자가 진짜 원하는 '표시 개수 제한'이 필요하면 렌더 상한(예: 상위 200건 + 더 보기)으로 별도 구현한다.

**TF-14 — 'N개 적용 중' 개수와 실제 칩 개수가 어긋남(검색어는 세지만 칩은 숨김)**  
문제: activeFilterCount = filterSummaryChips.length + bookmarksOnly인데, filterSummaryChips에는 keyword 칩이 포함된다(useEventFilters.ts:261-267). 반면 툴바는 렌더 시 `.filter((c) => c.key !== 'keyword')`로 그 칩을 제거한다. 결과적으로 개수와 표시 칩 수가 항상 검색어 유무만큼 어긋난다.  
영향: 검색어만 입력한 상태에서는 '🔍 1개 적용 중'과 '전체 초기화'만 뜨고 칩이 하나도 없어 무엇이 걸렸는지 알 수 없다. 카테고리+검색어면 '2개 적용 중 · 칩 1개'가 되어 '보이지 않는 필터가 하나 더 있다'는 불안을 준다.  
권고: 칩 목록과 카운트의 출처를 하나로 통일한다 — 검색어 칩을 표시하거나(입력창과 중복이면 '검색어 · …' 칩을 클릭 시 입력창 포커스로) 카운트에서도 제외한다. 아이콘도 검색 돋보기(FiSearch) 대신 깔때기 계열로 바꿔 '필터 개수'임을 맞춘다.

**TF-15 — 대륙을 골라도 국가 목록이 좁혀지지 않아 모순 조합으로 0건에 빠짐**  
문제: 주석은 '대륙 → 국가 순으로 좁혀가는 동선'이라고 선언하지만, 국가 옵션(allCountryOptions)은 selectedContinent를 전혀 참조하지 않는다. 두 필터는 matches()에서 AND로 결합되므로 대륙=아시아 + 국가=프랑스 같은 조합이 만들어질 수 있고 결과는 항상 0건이다.  
영향: 대륙을 먼저 고른 사용자가 국가 목록에서 그 대륙 밖 나라를 고르면 아무 경고 없이 결과가 0이 된다. 빈 화면에서 두 칩이 나란히 보이지만 어느 쪽이 모순인지 짚어주지 않아 하나씩 지워보며 원인을 찾아야 한다.  
권고: selectedContinent가 설정되면 allCountryOptions를 countryContinentMap 기준으로 필터링하고, 대륙 밖 국가를 고르면 대륙 칩을 자동 해제하거나 '대륙 필터와 충돌' 안내를 띄운다.

**TF-16 — 정렬 기준을 바꾸면 방향이 항상 내림차순으로 되돌아가고, '전체 초기화'는 정렬까지 리셋**  
문제: handleSortChange는 새 정렬 기준이 'recent' 또는 'duration'이면(=선택 가능한 전부) 무조건 setSortDirection('desc')를 호출한다. 즉 정렬 셀렉트를 건드리는 순간 방향 선택이 항상 초기화된다. 또 handleResetFilters는 표시 옵션인 sortBy/sortDirection까지 되돌리는데, '전체 초기화' 버튼은 필터 칩 옆에 놓여 있고 정렬은 칩으로 표현되지 않는다.  
영향: 오래된 순(오름차순)으로 훑던 사용자가 '기간순'으로 바꾸면 방향이 몰래 최신순으로 뒤집혀 리스트가 반대로 재배치된다. 또 필터만 지우려고 '전체 초기화'를 누르면 정렬까지 기본값으로 돌아가 스크롤 맥락을 잃는다.  
권고: handleSortChange의 방향 강제 리셋을 제거해 sortDirection을 독립 상태로 유지하고(기준별 기본값이 필요하면 최초 1회만 적용), handleResetFilters에서 sortBy/sortDirection 리셋을 분리해 '필터 초기화'와 '표시 옵션 초기화'를 나눈다.

**TF-5 — FilterGroup의 `& button {...!important}`가 팝오버 내부 버튼까지 덮어써 선택 표시·포커스 링 소멸**  
문제: FilterGroup의 규칙은 자손 결합자(`& button`, `& select`)라 그룹 안에 렌더되는 팝오버의 옵션 버튼(Item)·'전체 보기' 버튼(FooterAction)에도 적용된다. background:transparent!important가 Item의 선택 상태 배경(BRAND.primaryFillDark/primarySoftHover)을 지우고, box-shadow:none!important가 Item·FooterAction의 &:focus-visible { box-shadow: BRAND.focusRing }을 지우며, border-radius:0!important가 6px 라운드를 없앤다.  
영향: TF-1을 고쳐 팝오버가 보이게 되는 순간에도, 현재 어떤 항목이 선택돼 있는지 배경색으로 구별되지 않고(체크 아이콘만 남음) 키보드 Tab으로 옵션을 훑을 때 포커스 표시가 아예 안 보인다. 즉 TF-1만 고치면 그 아래 결함이 그대로 드러난다.  
권고: 자손 결합자를 직속 자식 결합자로 좁힌다(`& > button`, `& > select`, `& > div > button` 대신 트리거 전용 클래스 지정). 근본적으로는 !important 리셋 대신 트리거 컴포넌트(FilterTriggerButton/CenturySelect)에 '그룹 내부' variant prop을 주는 방식으로 바꾼다.

**TF-7 — 하위 사건의 관련국이 목록 응답에 없어 국가·대륙 필터가 자식을 못 본다**  
문제: GET /events의 childEvents include에는 category·historicalCountry·eventSections·eventImages만 있고 countryRelations가 없다. toResponseDto는 countryRelations가 없으면 relatedCountries를 undefined로 내려보낸다(event.controller.ts:282). 클라의 matches()는 countryOk를 `event.relatedCountries?.some(...) || event.relatedHistoricalCountries?.some(...)`로 계산하므로 자식은 관련국 관계행으로는 절대 매칭되지 않고, continentOk는 relatedCountries(현대국가)만 보므로 자식이 대륙 필터를 만족하는 경우는 아예 없다.  
영향: '워털루 전투'(자식)에만 프랑스가 태그돼 있고 상위 '나폴레옹 전쟁'에는 태그가 없으면, 국가=프랑스로 거를 때 그 계보 전체가 목록에서 사라진다. 사용자는 '분명 프랑스 사건인데 국가 필터를 걸면 없어진다'를 겪지만 원인을 알 수 없다.  
권고: childEvents(및 손자) include에 `countryRelations: { include: { country: true, historicalCountry: true } }`를 추가하거나(페이로드 증가가 부담이면 id만 select), 국가·대륙 필터를 서버 파라미터(countryIds/historicalCountryIds)로 넘겨 서버가 계보 단위로 판정하게 한다.
근거 정정: event.controller.ts:513·531 → childEvents include 블록은 511~532(자식 include 시작 513, 손자 523). :282는 정확(relatedCountries 방출).

**TF-9 — 대륙 필터가 역사국가 사건을 통째로 배제하는데 화면에 아무 안내가 없음**  
문제: countryContinentMap은 modern countries의 continentId로만 만들어지고, continentOk는 relatedCountries(현대국가)만 조회한다. 역사국가는 continentId가 없어 대륙 필터가 켜지는 순간 '역사국가로만 태그된 사건'은 전부 탈락한다(코드 주석에 v1 한계로 명기). 칩 라벨은 '대륙 · 유럽'일 뿐 이 배제를 알리지 않는다.  
영향: 대륙=유럽을 고르면 신성로마제국·오스트리아 대공국처럼 역사국가로만 태그된 유럽 사건들이 조용히 사라져, 사용자는 '유럽 사건이 이것밖에 없나'로 오해한다. 현대국가 태그가 함께 달린 사건만 남아 결과가 편향된다.  
권고: HistoricalCountryModernCountry 브리지로 역사국가 → 대륙을 해석해 continentOk에 합류시킨다. 즉시 어렵다면 대륙 칩/트리거에 '현대 국가 태그 기준' 보조 문구를 노출하고, 대륙 필터가 켜진 동안 배제된 건수를 '역사국가만 태그된 N건 제외'로 알린다.


### LST — LIST 뷰 밀도 (16건)

| id | 심각도 | 공수 | status | 항목 | 근거 |
|---|---|---|---|---|---|
| LD-1 | P2 | M | CONFIRMED | 하위 사건이 부모 연도 그룹에 묻히고 모바일에선 실제 연도가 사라짐 | `apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:147-161`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:150-163`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:491-505`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:60-78` |
| LD-10 | P2 | M | CONFIRMED | 행이 링크가 아니라 div — 새 탭 열기·링크 복사 불가, 클릭과 Enter의 결과가 다름 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:176-194`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:111-113`<br>`apps/web-admin/src/widgets/event-tree-view/ui/event-tree-view.tsx:228-240` |
| LD-2 | P2 | M | CONFIRMED | importance가 상수라 목록의 3단 시각 위계·헤더 KPI가 통째로 미발현 | `apps/web-admin/src/entities/event/model/eventTransformers.ts:63-74`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:82-90`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:224-233`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:380-383` |
| LD-8 | P2 | S | CONFIRMED | 드로어 이전/다음·딥링크 선택 시 목록이 선택 행으로 스크롤되지 않음 | `apps/web-admin/src/pages/events/list/events.page.tsx:605-623`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:106-107`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:119-133`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:398-411` |
| LD-9 | P2 | S | CONFIRMED | 모바일에서 sticky 연도 헤더의 불투명 배경이 라벨을 덮지 못해 본문과 겹쳐 읽힘 | `apps/web-admin/src/pages/events/styles/list.styles.ts:563-577`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:522-527`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:79-82` |
| LD-11 | P3 | M | CONFIRMED | 정렬 기준 '기간순'이 목록 뷰에서 사실상 무시됨 | `apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:171-183`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:19`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:525-561`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:249-266` |
| LD-12 | P3 | M | PLAUSIBLE | 메타 토큰이 제목 뒤에 붙어 라기드 — 열 스캔이 불가능하고 제목 시작점도 흔들림 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:445-453`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:510-523`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:549-565`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:491-500` |
| LD-13 | P3 | S | CONFIRMED | 로딩 스켈레톤이 실제 행과 어긋나 데이터 도착 시 좌우 28px·행마다 4px 점프 | `apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:187-207`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:749-812`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:197-214`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:298-310` |
| LD-14 | P3 | S | CONFIRMED | 같은 화면에서 총 건수가 두 가지로 표시됨(상단=최상위 기준, 하단=하위 포함) | `apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:290-294`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:521-527`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:549`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:77-84` |
| LD-15 | P3 | S | PLAUSIBLE | sticky 세기/연도 띠 오프셋이 실제 높이와 무관한 상수 + 두 띠의 우측 끝이 12px 어긋남 | `apps/web-admin/src/pages/events/styles/list.styles.ts:36-37`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:538-539`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:660-680`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:522-527` |
| LD-16 | P3 | M | PLAUSIBLE | '이미 본 사건' 표시가 없어 훑어본 항목과 새 항목이 구분되지 않음 | `apps/web-admin/src/pages/events/list/events.page.tsx:152`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:281-286`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:553`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:262-287` |
| LD-3 | P3 | S | CONFIRMED | 잘린 제목에 툴팁이 없어 긴 사건명을 읽을 방법이 없음 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:222`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:507-523`<br>`apps/web-admin/src/shared/ui/country-flags/country-flags.tsx:86-100`<br>`apps/web-admin/src/pages/events/styles/layout.styles.ts:182-196` |
| LD-4 | P3 | S | CONFIRMED | startDatePrecision이 변환 단계에서 유실돼 연·월 정밀도 사건에 가짜 월·일 표기 | `apps/web-admin/src/entities/event/model/eventTransformers.ts:87-138`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:150-163`<br>`apps/web-admin/src/shared/api/events.ts:177`<br>`apps/api/src/libs/event/presentation/event.controller.ts:210-211` |
| LD-5 | P3 | S | CONFIRMED | 종료 미상과 당일 종료를 구별 없이 '1일'로 단정 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:97-123`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:235`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:67-70` |
| LD-6 | P3 | S | CONFIRMED | 부모 행에 하위 사건 개수가 없어 접었을 때 무엇이 숨는지 알 수 없음 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:198-212`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:60-78`<br>`apps/web-admin/src/widgets/event-tree-view/ui/event-tree-view.tsx:145`<br>`apps/web-admin/src/widgets/event-tree-view/ui/event-tree-view.tsx:168-170` |
| LD-7 | P3 | M | CONFIRMED | 접힌 연도/세기 안의 행이 ↑↓ 네비게이션 대상으로 남아 '보이지 않는 행'이 선택됨 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:87-133`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:96-108`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:327`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:392-399` |

**LD-1 — 하위 사건이 부모 연도 그룹에 묻히고 모바일에선 실제 연도가 사라짐**  
문제: 그룹핑은 depth>0 항목의 버킷 연도를 `lastTopLevelYear ?? parsedYear`로 정해, 자식을 항상 *부모의* 연도 버킷에 넣는다. 부모는 자식 보유 시 전원 자동 전개(useEventHierarchy:60-78)되므로 이 경로가 기본값이다. 행 자신은 `startParts.year !== groupYear`일 때만 자기 연도를 노출하는데(event-list-item:162), 그 연도 토큰 `<Year>`는 640px 이하에서 `display:none`이다. 실DB 기준 자식 87건 중 62건(71%)이 부모와 다른 해다(예: '툴롱 항 방문'1893 → 부모 '러불 동맹'1894, '비르텐 전투'939 → 부모 1937... 실제 937).  
영향: 데스크톱에서는 '1894년' 헤더 아래에 1893 사건이 섞여 연도 그룹 자체를 신뢰할 수 없고(전체 228행 중 62행=27%), 모바일에서는 연도 토큰까지 숨겨져 사용자가 '툴롱 항 방문'을 1894년 사건으로 확정 오독한다. 연도 헤더 카운트(depth0만)와도 어긋나 '2건'이라 적힌 그룹에서 7행이 보인다.  
권고: ① 자식의 버킷 귀속은 유지하되(부모 인접성), 그룹 헤더와 다른 해면 행 연도 토큰을 모바일에서도 항상 렌더하고 시각적으로 구분(예: 괄호·다른 색). ② 또는 `bucketYear`를 자기 연도 우선으로 바꾸고 부모 인접성은 들여쓰기·커넥터에 맡긴다. ③ 최소한 aria-label에 실제 연도를 넣어 SR 오독을 막는다.

**LD-10 — 행이 링크가 아니라 div — 새 탭 열기·링크 복사 불가, 클릭과 Enter의 결과가 다름**  
문제: Stop은 `<div role="listitem" tabIndex={0} onClick>`이다. href가 없어 Cmd/Ctrl+클릭·가운데 클릭·우클릭 '링크 주소 복사'가 모두 동작하지 않는다. 게다가 마우스 클릭은 드로어 선택만 하고, 같은 행에서 Enter는 상세 페이지(`pathKeys.events.detail`)로 라우팅한다(키보드 훅). role도 문제인데, 이전 검토가 role="button" 중첩을 없애며 listitem으로 바꾼 뒤 '클릭 가능한 요소'라는 신호가 사라져 SR 사용자는 포커스만 받고 동작을 알 수 없다.  
영향: 여러 사건을 탭으로 벌려놓고 비교하려는 사용자가 목록에서 그렇게 할 수 없고, 동료에게 사건 링크를 보내려면 일단 드로어를 열어 다른 경로를 찾아야 한다. 또 같은 행에서 마우스는 드로어, 키보드는 페이지 이동이라 학습한 동작이 배신당한다.  
권고: 제목을 `<a href={pathKeys.events.detail(id)}>`로 감싸고 onClick에서 수식키 없을 때만 preventDefault→드로어 선택(수식키/가운데 클릭은 브라우저 기본 동작에 위임). 행 루트는 `role="listitem"` 유지하되 내부 링크가 접근 가능한 이름을 담당하게 한다.

**LD-2 — importance가 상수라 목록의 3단 시각 위계·헤더 KPI가 통째로 미발현**  
문제: `buildHierarchy`가 `importance: 'notable'`을 하드코딩하고(유일한 생산자), 서버 응답에도 사건 importance 필드가 없다(swagger 검색 결과 event 계열 0건). 그 결과 `tierFromNode`는 항상 'normal'을 반환 → ★★/★★★ 미렌더, 제목은 항상 14px/600(15px·700 분기 사문), 레일 도트는 항상 7px. 헤더 통계 스트립도 `hierarchy.importance`로 집계해 '핵심 N·주요 N' 칩이 영구 미표시다(자체 주석의 예시 '핵심 89 · 주요 234'가 실현 불가).  
영향: 228건이 전부 동일한 굵기·크기·도트로 렌더돼, 스캔 시 어느 사건이 중요한지 판단할 앵커가 하나도 없다. 사용자는 '별 표시가 왜 안 보이지'가 아니라 애초에 위계가 없는 균질한 텍스트 벽을 보고 눈이 미끄러진다.  
권고: 둘 중 하나로 정직화: (A) 서버에 importance를 도입하고 transformer가 실제 값을 실어 3단 위계를 살린다, (B) 도입 전까지는 죽은 분기(별·크기·도트 3단·헤더 KPI)를 제거하고 위계 신호를 실재하는 축(하위 사건 수, 기간 길이, 관련국 수 등)으로 대체한다.

**LD-8 — 드로어 이전/다음·딥링크 선택 시 목록이 선택 행으로 스크롤되지 않음**  
문제: scrollIntoView는 키보드 훅에만 있다. 드로어의 이전/다음(onDrawerPrev/Next)은 selectedEventId만 바꾸고, `?event=<id>` 딥링크 진입도 마찬가지다. 목록은 가상화 없이 전량 렌더(선행 검토 실측 15,508px)라 선택 행이 화면 밖에 있을 확률이 높다.  
영향: 드로어에서 '다음'을 몇 번 누르면 드로어 내용만 바뀌고 좌측 목록의 인디고 활성 막대·틴트는 화면 밖에 있어, 지금 리스트의 어느 지점을 보고 있는지 알 수 없다. 딥링크로 들어온 사용자는 선택된 사건이 목록 어디에 있는지 스스로 스크롤해 찾아야 한다.  
권고: selectedEventId 변경을 단일 지점에서 감지해 `[data-event-id]`로 스크롤(block:'nearest')하는 효과를 페이지에 두고, 키보드 훅의 중복 스크롤은 그쪽으로 흡수한다. sticky 헤더에 가리지 않도록 Stop에 `scroll-margin-top: calc(var(--century-header-h) + 44px)`를 함께 준다.

**LD-9 — 모바일에서 sticky 연도 헤더의 불투명 배경이 라벨을 덮지 못해 본문과 겹쳐 읽힘**  
문제: YearDivider의 오클루전용 solid 배경 `&::after`가 `left: 38px`로 하드코딩돼 있다. 선행 검토에서 레일 오프셋을 `--rail-inset` 변수로 단일화했지만 이 pseudo만 누락됐고, 모바일(≤640px)에서는 `--rail-inset: 12px`라 라벨은 x=0부터 시작하는데 배경은 x=26부터 칠해진다.  
영향: 모바일에서 스크롤하면 sticky된 '1894년 ▾ 3' 라벨의 앞부분(셰브론+연도 앞 글자)이 투명한 채 아래로 흐르는 사건 제목 위에 겹쳐 두 글자가 포개진다. 라이트 모드에서 특히 판독 불가.  
권고: `left: 38px` → `left: var(--rail-inset)`로 교체(도트가 left:0에 있으므로 도트 지름만큼만 비우려면 `calc(var(--rail-inset) - 6px)` 정도). 같은 파일에서 남은 픽셀 하드코딩(DateDivider의 -70px/left:32px)도 함께 점검.

**LD-11 — 정렬 기준 '기간순'이 목록 뷰에서 사실상 무시됨**  
문제: 목록은 항상 연도로 버킷팅하고 `allYears`를 숫자 정렬(방향만 반영)한다. 정렬 기준(sortBy)은 EventCompactList에 전달조차 되지 않는다 — 파일 상단에 `SortOption` 타입 import만 남아 있고 prop이 없다. 그래서 '기간순'을 골라도 세기/연도 그룹 순서는 그대로고 각 연도 버킷 *내부* 순서만 바뀐다.  
영향: 툴바에서 '기간순'을 선택하면 목록이 거의 그대로라 사용자는 정렬이 고장 났다고 느낀다(같은 툴바가 타임라인·격자에서는 실제로 순서를 바꾸므로 뷰마다 다르게 동작하는 것으로 보인다).  
권고: 목록 뷰에서 sortBy='duration'이면 연도 그룹핑을 끄고 평면 정렬 목록으로 렌더하거나(그룹 헤더 대신 기간 구간 헤더), 최소한 정렬 셀렉트 옆에 '목록 뷰는 연도 그룹 고정' 안내를 노출한다. 미사용 `SortOption` import도 제거.

**LD-12 — 메타 토큰이 제목 뒤에 붙어 라기드 — 열 스캔이 불가능하고 제목 시작점도 흔들림**  
문제: Body에 flex 스페이서가 없고 Title이 `flex: 0 1 auto`라 [연도][카테고리칩][제목][별][기간][국기][요약][북마크]가 전부 좌측 밀착된다. 폭이 고정된 것은 `Year(min-width:36px)`뿐이고 카테고리 칩은 `flex-shrink:0`에 고정 폭이 없어 '기타'(2자)와 '전쟁/군사'(5자)가 약 34px 차이 난다. 결과적으로 제목의 시작 x가 행마다 흔들리고, 북마크·기간·국기의 x는 제목 길이에 따라 완전히 무작위가 된다(실DB 제목 20~65자).  
영향: 좌측 밀착은 '죽은 여백'을 없앤 의도된 선택이지만, 그 대가로 (a) 제목 첫 글자가 세로로 정렬되지 않아 제목 열 스캔 속도가 떨어지고, (b) 즐겨찾기한 사건을 눈으로 찾으려면 각 행의 서로 다른 위치에 있는 앰버 북마크 아이콘을 훑어야 하며, (c) 여러 사건의 기간을 비교하려 해도 숫자가 정렬되지 않아 대조가 안 된다.  
권고: 제목 이후의 '액션' 축만 우측 고정 열로 분리(RowActions를 `margin-left:auto`) 하고, 카테고리 칩에 `min-width`(예: 62px)+가운데 정렬을 주어 제목 시작점을 고정한다. 기간·국기는 제목 바로 뒤 유지 가능.

**LD-13 — 로딩 스켈레톤이 실제 행과 어긋나 데이터 도착 시 좌우 28px·행마다 4px 점프**  
문제: 선행 검토에서 스켈레톤을 단일 행 구조로 동기화했으나 세 가지가 남았다. ① 실제 행은 항상 20px ExpandBtn/ExpandSpacer로 시작하는데 스켈레톤에는 없어 연도·칩·제목이 28px(20+gap 8) 우측으로 이동한다. ② 높이가 다르다 — 스켈레톤 콘텐츠 최대 16px(+패딩 16+보더 1=33px) vs 실제 20px(=37px). ③ `$depth = index % 3`으로 인위적 들여쓰기(0/22/44px)를 만드는데 실데이터는 최상위가 대부분이라 좌측 정렬이 뒤바뀐다.  
영향: 첫 로딩에서 스켈레톤이 사라지는 순간 12행 기준 세로로 ~48px, 가로로 28px 흔들리며 텍스트가 자리를 옮긴다. 특히 계단식 들여쓰기가 평평해지는 변화가 커서 '레이아웃이 한 번 무너졌다 잡힌다'는 인상을 준다.  
권고: SkeletonBody 선두에 20px 스페이서를 넣고, SkeletonStop에 실제 행과 같은 `min-height`(37px)을 주며, $depth는 0 고정 또는 실제 계층 비율(대부분 0)에 맞춘다.

**LD-14 — 같은 화면에서 총 건수가 두 가지로 표시됨(상단=최상위 기준, 하단=하위 포함)**  
문제: 헤더 통계의 'N건'은 미필터 시 serverTotal(=`parentEventId: null` 카운트, 즉 최상위만)을 쓰고, 목록 하단 '끝까지 봤습니다 · 총 N건'과 `aria-label="사건 목록 (N건)"`은 displayedCount(=평탄화된 행 수, 자동 전개된 하위 포함)를 쓴다. 실DB 기준 최상위 141 vs 전체 228로 두 숫자가 구조적으로 다르다.  
영향: 한 화면 위아래에서 '141건'과 '총 228건'을 동시에 보게 돼 어느 쪽이 진짜인지 알 수 없고, 내보내기 확인 문구('최상위 N건 중…')와도 기준이 달라 혼란이 겹친다.  
권고: 라벨에 기준을 명시해 정직화한다 — 하단은 '표시 중 228행(최상위 141건)' 형태로, 헤더는 '등록 141건(최상위)'로. 또는 두 곳 모두 같은 기준(표시 행 수)으로 통일하고 서버 총량은 툴팁으로 강등.

**LD-15 — sticky 세기/연도 띠 오프셋이 실제 높이와 무관한 상수 + 두 띠의 우측 끝이 12px 어긋남**  
문제: `--century-header-h: 44px`는 변수로 단일화됐을 뿐 실제 CenturyDivider 높이(패딩 20 + 보더 2 + 16px 라벨 라인박스 ≈ 19 → 약 41px)와 무관한 상수다. 또 CenturyDivider는 `width: calc(100% + var(--rail-inset))`에 좌우 -inset 마진이라 우측이 컨텐츠 폭에서 끝나는 반면, YearDivider는 `margin-right:-12px`로 우측 패딩까지 덮는다.  
영향: 세기 띠와 연도 띠 사이에 약 3px 슬릿이 생겨 스크롤 시 사건 텍스트가 두 헤더 사이로 스쳐 지나가고, 브라우저 폰트 확대/줌에서는 반대로 연도 띠가 세기 띠를 파고들어 글자가 겹친다. 정지 상태에서도 두 sticky 띠의 우측 끝선이 12px 어긋나 계단처럼 보인다.  
권고: `--century-header-h`를 ResizeObserver나 `position: sticky; top: 0` + 컨테이너 쿼리 대신 실제 측정값으로 세팅하거나, 세기 헤더 높이를 `height: 44px` 고정으로 강제해 상수와 일치시킨다. CenturyDivider는 width 지정을 버리고 YearDivider처럼 좌우 음수 마진 + `align-self: stretch`로 맞춘다.

**LD-16 — '이미 본 사건' 표시가 없어 훑어본 항목과 새 항목이 구분되지 않음**  
문제: `useRecentEvents`로 최근 본 사건 id가 이미 축적되고 EventCompactList에 `recentEventIds`로 전달되지만, 이 값은 '필터 결과 0건' 빈 상태의 추천 목록에서만 쓰인다. 행 자체에는 방문 표시가 없고 시각 상태는 hover(투명→5% 회색)와 active(인디고 13% 틴트+좌측 막대) 두 가지뿐이다.  
영향: 228행을 위아래로 훑으며 하나씩 클릭해 확인하는 작업에서, 방금 본 사건과 아직 안 본 사건이 완전히 동일하게 보여 같은 항목을 반복해서 연다. 드로어를 닫으면 active 표시도 사라져 어디까지 훑었는지 흔적이 남지 않는다.  
권고: `recentEventIds`를 행까지 내려 방문 행의 제목 색을 한 단계 낮추거나(방문 링크 관습) 레일 도트를 hollow로 바꾼다. 저비용 대안으로 현재 세션에서 연 사건에만 얇은 좌측 마커를 남긴다.

**LD-3 — 잘린 제목에 툴팁이 없어 긴 사건명을 읽을 방법이 없음**  
문제: `Title`은 `white-space:nowrap + text-overflow:ellipsis`인데 `title` 속성도, 커스텀 툴팁도 없다. 같은 행의 국기 칩(title={c.name})·중요도 별(title)·액션 버튼(title)은 전부 툴팁이 있는데, 정작 잘리는 유일한 요소인 제목만 없다. 행을 클릭하면 상세 드로어가 열리면서 `CatalogSplit`이 440px+gap 20px를 가져가 리스트 폭이 460px 줄어 잘림이 급증한다(실DB 제목 평균 20자·최장 65자·28자 초과 48건).  
영향: '도카이도근철도순람서(東海道筋鉄道巡覧書) 작성 — 나카센도에서…' 같은 항목이 '도카이도근철도순람서(東海…'로 잘리고, 전체를 보려면 행을 클릭해 드로어를 여는 수밖에 없다. 드로어를 연 상태로 다음 후보를 훑을 때는 리스트가 더 좁아져 유사 제목 사건들을 구별하지 못한다.  
권고: `<Title title={node.title}>`(하이라이트 노드와 무관하게 원문 문자열)을 추가하고, 드로어가 열린 상태(<1400px 컬럼)에서는 제목 우선순위를 높이도록 기간·국기 토큰을 먼저 접는다.

**LD-4 — startDatePrecision이 변환 단계에서 유실돼 연·월 정밀도 사건에 가짜 월·일 표기**  
문제: 서버는 `startDatePrecision`을 응답에 실어 보내지만(controller:211), `convertToHistoricalEvent`가 이 필드를 매핑하지 않아 런타임에는 항상 undefined다(타입 events.types.ts:157에는 선언돼 있어 tsc가 못 잡는다). 그 결과 rowDateLabel의 `precision === 'year'` / `'month'` 가드가 죽고, 남는 방어는 '01-01 sentinel' 하나뿐이다. 실DB 검증: precision='year'인 '가스프롬, 1999년 이후 첫 연간 순손실'은 start_date=2023-12-31 → 행에 '12.31'로, precision='month'인 '가스프롬 유럽向 가스 공급 사실상 중단'은 2022-09-01 → '9.1'로 렌더된다.  
영향: 연도만 아는 사건이 '12.31'이라는 존재하지 않는 날짜로, 월까지만 아는 사건이 '9.1'이라는 없는 일자로 표시된다. 사용자는 목록만 보고 정확한 날짜가 기록된 사건이라 믿고, 같은 해 안에서의 순서도 가짜 일자 기준으로 읽힌다.  
권고: transformer에 `startDatePrecision`(및 endDatePrecision)을 매핑해 기존 가드를 되살린다. 표기는 precision='month' → 'M월', 'year' → 생략(그룹 헤더 위임)으로 이미 구현돼 있어 필드만 이으면 된다.
근거 정정: 근거 중 `apps/web-admin/src/shared/api/events.ts:177`은 오인용 — 그 줄은 getAllEvents 응답이 아니라 `EventLinkCandidate` 인터페이스의 필드다. 서버가 실제로 실어 보내는 근거는 `apps/api/src/libs/event/presentation/event.controller.ts:211`(toResponseDto, getAllEvents가 :555 `events.map(e => this.toResponseDto(e))`로 사용)이고, 프론트 타입 선언은 `apps/web-admin/src/pages/events/create/events.types.ts:157`이다.

**LD-5 — 종료 미상과 당일 종료를 구별 없이 '1일'로 단정**  
문제: `formatDuration`은 `!end`(종료 미상)와 `end === start`(당일 종료)를 같은 분기에서 '1일'로 반환한다. period.end는 `evt.endDate ?? undefined`라 종료 정보가 아예 없는 사건도 그냥 '1일'이 된다. 실DB: 종료 정보 전무 14건이 '1일'로 표기되고(예: '가스프롬 유럽向 가스 공급 사실상 중단' — 종료 시점 없는 지속 상태), 전체 228건 중 117건(51%)의 행이 '1일' 토큰을 달고 있다.  
영향: 진행 중/종료 미상 사건이 '1일짜리 단발 사건'으로 읽혀 사실이 왜곡된다. 동시에 밀도 측면에서 절반의 행이 정보량 0에 가까운 '1일' 토큰에 8px gap과 폭을 쓰면서 제목 공간을 잠식한다.  
권고: `!end`일 때는 빈 문자열(토큰 생략)이나 '종료 미상'을 반환해 `end === start`(1일)와 분리한다. 최소 변경으로 51%의 행에서 잉여 토큰이 사라져 제목 가용 폭이 늘어난다.

**LD-6 — 부모 행에 하위 사건 개수가 없어 접었을 때 무엇이 숨는지 알 수 없음**  
문제: 부모 행의 어포던스는 20px 셰브론 하나뿐이고 자식 수 배지가 없다. 자식 보유 부모는 전부 자동 전개돼 기본 상태가 '펼침'이므로, 셰브론은 사실상 '접기' 버튼인데 접힌 뒤에는 몇 개가 사라졌는지 표시가 없다(연도 헤더 카운트는 depth0만 세므로 자식 수를 대신하지도 못한다). 같은 데이터로 트리 뷰는 루트마다 'N개 노드'를 노출한다(event-tree-view:168-170).  
영향: 목록에서 '세 하인리히 전쟁' 행을 접으면 5개가 사라졌는지 1개가 사라졌는지 알 수 없어 다시 펼쳐 확인해야 한다. 또 자식이 없는 행과 있는 행이 20px 셰브론 유무로만 갈려, 계층이 있는 사건을 훑어 찾기 어렵다.  
권고: `hasChildren`일 때 셰브론 옆(또는 제목 뒤)에 자식 수 배지를 렌더하고 aria-label에도 포함('하위 사건 5개 접기'). ExpandBtn에 `aria-expanded`가 빠져 있는 것도 함께 보완(트리 뷰 ToggleBtn은 이미 있음).

**LD-7 — 접힌 연도/세기 안의 행이 ↑↓ 네비게이션 대상으로 남아 '보이지 않는 행'이 선택됨**  
문제: 연도·세기 접힘 상태(`collapsedYears`/`collapsedCenturies`)는 EventCompactList 내부 로컬 state라 페이지의 `visibleFlattenedHierarchy`에 반영되지 않는다. 키보드 훅은 이 배열을 그대로 순회하므로 접혀서 DOM에 없는 항목도 선택 대상이며, 선택 후 `document.querySelector('[data-event-id=...]')`가 null이라 scrollIntoView도 조용히 실패한다.  
영향: 세기를 접어 범위를 좁힌 뒤 ↓를 누르면 화면에는 아무 변화가 없는데(하이라이트 행 없음) 우측 상세 드로어의 내용만 바뀐다. 사용자는 '방향키가 먹었다 안 먹었다 한다'고 느끼고, 어디를 보고 있는지 위치 감각을 잃는다.  
권고: 접힘 상태를 페이지 레벨로 올려 네비게이션 리스트를 '실제 렌더되는 행'으로 필터링하거나, 선택 대상이 접힌 그룹에 속하면 해당 그룹을 자동 펼친 뒤 스크롤한다.


### A11Y — 접근성 (16건)

| id | 심각도 | 공수 | status | 항목 | 근거 |
|---|---|---|---|---|---|
| A11Y-1 | P1 | S | CONFIRMED | 전역 Enter 가로채기 — 버튼 활성화 불가 + 엉뚱한 사건으로 이동 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:111`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:137`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:16`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:182` |
| A11Y-2 | P1 | S | CONFIRMED | ↑↓·Home·End 전역 preventDefault — select·팝오버·페이지 스크롤 먹통 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:95`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:105`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:166`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:250` |
| A11Y-3 | P1 | S | CONFIRMED | 공용 focusRing이 1.59:1 — outline 제거 후 남는 유일 표시가 사실상 안 보임 | `apps/web-admin/src/pages/events/styles/theme.ts:221`<br>`apps/web-admin/src/pages/events/styles/list-toolbar.styles.ts:255`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:213`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:609` |
| A11Y-10 | P2 | M | CONFIRMED | 보조 텍스트(tertiary) 대비 2.54:1 — 연도·기간·건수·힌트가 전부 미달 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:497`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:571`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:599`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:126` |
| A11Y-12 | P2 | S | CONFIRMED | 터치 타깃 미달 — 펼치기 20×20, 검색 지우기 22×22, 행 액션 28×28 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:467`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:590`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:616`<br>`apps/web-admin/src/pages/events/styles/list-toolbar.styles.ts:160` |
| A11Y-13 | P2 | M | CONFIRMED | 상세 패널이 열려도 포커스·고지 없음, dialog 이름이 사건 제목이 아님 | `apps/web-admin/src/pages/events/list/components/catalog-detail-drawer.tsx:70`<br>`apps/web-admin/src/pages/events/list/components/catalog-detail-drawer.tsx:72`<br>`apps/web-admin/src/pages/events/styles/list-page.styles.ts:394`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:784` |
| A11Y-14 | P2 | M | CONFIRMED | 모든 행이 tabIndex=0 + autoLoadAll → 탭 스톱 수백 개 | `apps/web-admin/src/pages/events/list/events.page.tsx:172`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:189`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:199`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:332` |
| A11Y-4 | P2 | S | CONFIRMED | 최근 본 사건 메뉴: 포커스 표시가 배경 alpha 0.08(1.12:1)뿐 | `apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:175`<br>`apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:83` |
| A11Y-5 | P2 | M | CONFIRMED | 목록 행이 role=listitem + tabIndex=0 — '열 수 있다'는 신호가 없음 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:189`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:176`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:290`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:332` |
| A11Y-6 | P2 | S | CONFIRMED | 화살표로 선택을 바꿔도 DOM 포커스가 안 움직임 → 스크린리더 무음 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:119`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:130`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:191` |
| A11Y-7 | P2 | S | CONFIRMED | '계층' 토글 스위치에 접근 이름도 상태도 없음 | `apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:190`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:724`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:589` |
| A11Y-8 | P2 | S | CONFIRMED | 요약 모달은 Esc로 안 닫히고, Esc가 대신 뒤의 상세를 닫음 | `apps/web-admin/src/pages/events/list/components/catalog-overlay-modals.tsx:147`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:54`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:253`<br>`apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:56` |
| A11Y-9 | P2 | S | CONFIRMED | 기본 진입(집중 보기)에서 페이지에 h1이 아예 없음 + 헤딩 레벨 점프 | `apps/web-admin/src/pages/events/list/events.page.tsx:124`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:719`<br>`apps/web-admin/src/pages/events/styles/list-page.styles.ts:94`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:1086` |
| A11Y-11 | P3 | S | CONFIRMED | 중요도 별(★★★)이 대비 1.46:1 — 사실상 안 보이는 유일 신호 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:536`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:224` |
| A11Y-15 | P3 | S | CONFIRMED | prefers-reduced-motion 누락 4곳 — 인라인 transition은 아예 끌 수 없음 | `apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:217`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:304`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:477`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:493` |
| A11Y-16 | P3 | S | CONFIRMED | aria-live가 통계 스트립 전체를 감싸 장문 재낭독 + 0건일 때 틀린 값 낭독 | `apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:300`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:43`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:78`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:208` |

**A11Y-1 — 전역 Enter 가로채기 — 버튼 활성화 불가 + 엉뚱한 사건으로 이동**  
문제: useCatalogListNavigation이 `window`에 keydown을 붙이고(`:137`), `isInEditableElement`가 input/textarea/contenteditable만 걸러내므로(`:16-23`) 버튼·select에 포커스가 있어도 통과한다. 그 상태에서 `e.key === 'Enter' && selectedEventId`면 `e.preventDefault()` 후 `navigate(pathKeys.events.detail(selectedEventId))`를 실행한다(`:111-114`). Enter의 기본 동작이 취소되므로 버튼의 click이 아예 발생하지 않는다. 게다가 window 리스너는 React 루트 컨테이너보다 뒤에 실행되어, 행에서 Enter를 눌렀을 때(event-list-item.tsx:182-188이 setSelectedEventId 호출) 핸들러 클로저가 읽는 selectedEventId는 *직전* 값이다.  
영향: 사건을 한 건이라도 선택하면(= drawer가 열린 평상시 상태) 키보드 사용자는 Enter로 어떤 버튼도 누를 수 없다. 북마크 토글, 연도/세기 접기, '다시 시도', 드로어 '상세 닫기', '새 사건 등록' 모두 Enter를 누르는 순간 아무 일도 안 일어나고 대신 상세 페이지로 튕겨 나간다. 목록에서 B 사건에 포커스를 두고 Enter를 누르면 B가 아니라 직전에 보던 A 사건의 상세로 이동한다.  
권고: 핸들러를 window가 아니라 리스트 컨테이너(List.CompactList)에 바인딩하거나, 최소한 `(e.target as HTMLElement).closest('[data-event-id]')`가 있을 때만 처리하도록 게이트한다. Enter 분기는 최신 선택을 useRef로 읽어 stale 클로저를 없애고, 열려 있는 모달/팝오버(shortcutHelpOpen·showSummaryModal·popover open) 동안에는 훅 자체를 비활성화한다.

**A11Y-2 — ↑↓·Home·End 전역 preventDefault — select·팝오버·페이지 스크롤 먹통**  
문제: 같은 전역 핸들러가 ArrowDown/ArrowUp/Home/End를 무조건 `e.preventDefault()`한다(`:95-110`). `isInEditableElement`는 HTMLSelectElement를 포함하지 않으므로 네이티브 select(세기 필터 filters-panel.tsx:166, 정렬 기준·페이지 크기 catalog-main-content.tsx:250/267)와 팝오버의 `role="option"` 버튼(filters-panel.tsx:330)에 포커스가 있어도 그대로 가로챈다.  
영향: 세기/정렬/개수 select에 포커스를 두고 ↓를 눌러도 값이 바뀌지 않고, 대신 목록 선택이 다음 사건으로 점프하며 화면이 그리로 스크롤된다. 카테고리·대륙 필터 팝오버(role=listbox)를 열고 화살표로 옵션을 훑는 것도 불가능하다. 그리고 목록에 항목이 하나라도 있으면 키보드 사용자의 기본 스크롤 수단(↑↓, Home/End)이 페이지 전체에서 사라진다.  
권고: `isInEditableElement`에 `HTMLSelectElement`와 `[role=listbox]/[role=menu]/[role=dialog]` 조상 검사를 추가하고, A11Y-1과 동일하게 리스너 스코프를 리스트 컨테이너로 좁힌다. 팝오버 내부는 자체 roving 화살표 내비를 갖게 하거나 최소한 상위 핸들러를 무력화한다.

**A11Y-3 — 공용 focusRing이 1.59:1 — outline 제거 후 남는 유일 표시가 사실상 안 보임**  
문제: `BRAND.focusRing = '0 0 0 3px rgba(37, 99, 235, 0.32)'`(theme.ts:221)이 카탈로그 전 컨트롤의 포커스 표시다. 대부분의 규칙이 `outline: none;`과 짝지어 이 box-shadow만 남긴다(list-toolbar.styles.ts:255-258, filter.styles.ts:213-216, list.styles.ts:609-611/730-732, catalog-main-content.tsx:399-402 등 26개소). 실측 계산: 링 합성색이 라이트 배경(#ffffff) 대비 **1.59:1**, #f8fafc 대비 1.58:1, 다크(#0f0f0f) 대비 **1.37:1**. WCAG 1.4.11/2.4.11의 3:1을 크게 밑돈다. 동반되는 `border-color: rgba(37,99,235,0.5)` 변화도 흰 배경 대비 2.14:1로 미달.  
영향: 키보드로 툴바(검색 지우기·북마크·JSON·도움말·새 사건), 필터 트리거 5종, 정렬/방향/개수, 세기·연도 접기 버튼, 팝오버 항목을 Tab으로 순회할 때 **지금 어디에 있는지 화면에서 식별되지 않는다**. 저시력 사용자뿐 아니라 일반 키보드 사용자도 매 Tab마다 감으로 눌러야 한다. (예외적으로 목록 행만 `outline: 2px solid #2563eb`로 5.17:1을 확보 — event-list-item.tsx:428-432)  
권고: focusRing 토큰을 불투명 2px 링 + 대비 확보 조합으로 교체한다(예: `0 0 0 2px #ffffff, 0 0 0 4px #2563eb` 라이트 / `0 0 0 2px #0f0f0f, 0 0 0 4px #93c5fd` 다크). 토큰 한 곳만 고치면 26개소가 함께 해결된다.
근거 정정: 근거는 전부 정확(theme.ts:221 focusRing, list-toolbar.styles.ts:256-258, filter.styles.ts:214-216, list.styles.ts:609-611 YearDivider·730-732 CenturyDivider, catalog-main-content.tsx:399-402, event-list-item.tsx:428-432 행 outline 2px). 보강: 명시 규칙이 없는 컨트롤도 안전하지 않다 — app/css.ts:62-68의 전역 `:where(button,[role=button],a,input,select,textarea):focus-visible { outline:none; box-shadow: var(--focus-ring) }`가 네이티브 아웃라인을 걷어내고 더 약한 보라 링 rgba(173,70,255,0.25)(흰 배경 대비 ~1.40:1)로 대체한다. 즉 실패 지점은 26개소보다 넓다.

**A11Y-10 — 보조 텍스트(tertiary) 대비 2.54:1 — 연도·기간·건수·힌트가 전부 미달**  
문제: `theme.colors.text.tertiary`는 라이트 `#9ca3af`, 다크 `#71717a`다(shared/styles/theme.ts:73, :154). 실측 대비는 라이트 흰 배경 **2.54:1**(#f8fafc 위 2.43:1), 다크 #0f0f0f 위 **3.97:1**로 둘 다 소형 텍스트 기준 4.5:1 미달이다. 이 토큰이 행 연도(11~12px, event-list-item.tsx:497), 기간(11px, :571), 스크롤/끝 안내(12.5px, event-compact-list.tsx:599·651), 통계 스트립 전체(12px, catalog-header-stats.tsx:126·131·156), 뷰 힌트(11.5px, catalog-main-content.tsx:410), 팝오버 placeholder·빈 안내(filters-panel.tsx:434·520·536)에 쓰인다. 필터 그룹 라벨은 라이트 `#94a3b8`(2.45:1), 다크 `#475569`(2.53:1)로 더 낮다(filter.styles.ts:333).  
영향: 저시력·고령 사용자나 밝은 환경에서 행의 월·일, 기간('3년 2개월'), '총 153건', 뷰 설명 문구가 배경에 묻혀 읽히지 않는다. 특히 연도는 모바일에서 숨겨지므로(event-list-item.tsx:502-504) 데스크톱에서 안 읽히면 시간 정보 자체를 잃는다.  
권고: 카탈로그에서 쓰는 tertiary를 라이트 `#6b7280`(4.83:1)·다크 `#a1a1aa`(7.48:1) 이상으로 올리거나, 목록 메타 전용 토큰을 새로 만들어 4.5:1을 보장한다. filter.styles.ts:333의 하드코딩 `#94a3b8`/`#475569`도 같은 토큰으로 흡수.
근거 정정: 마지막 문장('필터 그룹 라벨 라이트 #94a3b8/다크 #475569, filter.styles.ts:333')은 오류 2중이다 — filter.styles.ts:331-334는 FilterReset의 focus-visible(rgba(239,68,68,0.18))이고, 해당 색 조합은 FilterBlockLabel(filter.styles.ts:128-135, 색 지정은 :134). 그리고 FilterBlockLabel은 widgets/event-list/ui/filter-panel.tsx:88에서만 쓰이는데 이 위젯은 /events 카탈로그가 임포트하지 않는 사문화 경로라 이 페이지에는 렌더되지 않는다. 나머지 근거(event-list-item.tsx:497 Year·:571 Duration, event-compact-list.tsx:599 ScrollHintInline·:651 EndOfListText, catalog-header-stats.tsx:126·131·156, catalog-main-content.tsx:410 ViewHint, filters-panel.tsx:434·520·536, shared/styles/theme.ts:73/:154)는 전부 정확.

**A11Y-12 — 터치 타깃 미달 — 펼치기 20×20, 검색 지우기 22×22, 행 액션 28×28**  
문제: ExpandBtn 20×20(event-list-item.tsx:467-468), PromSearchClear 22×22(list-toolbar.styles.ts:160-161), Switch 30×18(filter.styles.ts:726-727)은 WCAG 2.2 SC 2.5.8의 24×24 최소치조차 못 넘고, IconBtn/BookmarkBtn 28×28(:590-591, :616-617)도 44×44 권장에 한참 못 미친다. 게다가 이 세 버튼은 행 안에서 `gap: 2px`로 붙어 있고(:455-461) 행 전체가 클릭 시 상세를 여는 영역이다.  
영향: 모바일에서 하위 사건을 펼치려다 20px 화살표를 빗맞히면 행이 눌려 상세 drawer가 열린다. 북마크를 누르려다 요약 모달이 뜨거나 상세가 열리는 오탭이 반복된다. 손떨림·운동 장애 사용자에게는 사실상 사용 불가.  
권고: 세 버튼에 `min-width/min-height: 32px`(모바일 40px) + 시각 크기는 `::before` 확장 히트영역으로 유지한다. RowActions gap을 6px로 넓히고, ≤640px에서는 요약 아이콘을 접어 북마크·펼치기만 남긴다.
근거 정정: IconBtn/BookmarkBtn 28×28(event-list-item.tsx:590-591, :616-617)은 WCAG 2.2 SC 2.5.8(AA, 24×24)을 **충족**한다 — 44×44는 AAA인 SC 2.5.5 권장치이므로 AA 위반 목록에서 빼야 한다. Filter.Switch 30×18(filter.styles.ts:726-727)도 감싼 FilterToggle label이 34px(@768 이하 40px)+동일 onClick이라 실질 타깃은 기준을 넘는다. 실제로 남는 AA 미달은 ExpandBtn 20×20(:467-468)과 PromSearchClear 22×22(list-toolbar.styles.ts:160-161) 둘.

**A11Y-13 — 상세 패널이 열려도 포커스·고지 없음, dialog 이름이 사건 제목이 아님**  
문제: drawer는 `title` prop으로 사건 제목을 받는데도 dialog 이름은 상수 `aria-label="사건 상세"`다(catalog-detail-drawer.tsx:70). 제목을 담는 DetailDrawerHeaderTitle은 헤딩이 아닌 div이고(:73-75), DetailDrawerHeader는 `display: none` → `@media (max-width:1200px)`에서만 flex라 **데스크톱에서는 헤더와 닫기 버튼 자체가 렌더되지 않는다**(list-page.styles.ts:394-400). 데스크톱 컬럼 모드에서는 focus trap도 aria-modal도 없고(:46, :68-70) 패널이 새로 마운트될 때 포커스 이동이나 aria-live 고지도 없다(events.page.tsx:784-792).  
영향: 모바일에서 drawer가 열리면 스크린리더가 '사건 상세 대화상자'라고만 읽고 어느 사건인지 말하지 않는다. 데스크톱에서는 행을 선택해도 상세 패널이 열린 사실이 전혀 고지되지 않으며, 그 패널로 가려면 A11Y-14대로 남은 행을 전부 Tab으로 지나가야 한다.  
권고: drawer 헤더 제목을 `<h2 id>`로 만들고 `aria-labelledby`로 연결한다(모바일). 데스크톱에서는 패널 루트에 `tabIndex={-1}` + 선택 변경 시 포커스 이동, 또는 최소한 `role="region" aria-label={사건 제목}` + 선택 결과를 알리는 시각 숨김 aria-live 문구를 추가한다.

**A11Y-14 — 모든 행이 tabIndex=0 + autoLoadAll → 탭 스톱 수백 개**  
문제: `autoLoadAll: true`(events.page.tsx:172)로 전 페이지를 강제 소진하는데 목록은 가상화가 없다. 각 행은 `tabIndex={0}`이고(event-list-item.tsx:189) 내부에 펼치기·요약·북마크 버튼이 최대 3개 더 있으며(:199-276), 세기/연도 디바이더도 각각 `<button>`이다(event-compact-list.tsx:332, :367). 로컬 실측 규모(선행 문서 기준 152행)만으로도 400개 이상의 탭 스톱이 생기고, 이 값은 데이터 규모에 선형 비례한다.  
영향: 키보드 사용자가 목록 위쪽 항목에서 시작해 하단의 '다시 시도'나 우측 상세 패널로 가려면 Tab을 수백 번 눌러야 한다. 실질적으로 목록 이후 영역에 도달할 수 없어 키보드 트랩과 다름없다.  
권고: 목록에 roving tabindex를 적용한다 — 선택된 행 하나만 `tabIndex=0`, 나머지는 `-1`로 두고 ↑↓(A11Y-2 스코프 수정과 함께)로 이동시킨다. 행 내부 액션 버튼도 `tabIndex=-1`로 내리고 행 포커스 상태에서 별도 키(예: b=북마크)로 접근하거나, 최소한 목록 앞뒤에 '목록 건너뛰기' 스킵 링크를 둔다.
근거 정정: 탭 스톱 추정치 '400개 이상'은 근거보다 높다. 행 내부 버튼은 항상 3개가 아니라 북마크 1개(onToggleBookmark가 events.page.tsx:558에서 항상 전달)만 상시이고, ExpandBtn은 hasChildren일 때만(:198), 요약 IconBtn은 hasChildren && depth===0일 때만(:246) 렌더된다 → 선행 문서의 152행 기준 하한은 약 304 + 디바이더. 결론(수백 개, 데이터 규모에 선형)은 불변.

**A11Y-4 — 최근 본 사건 메뉴: 포커스 표시가 배경 alpha 0.08(1.12:1)뿐**  
문제: MenuItem의 `&:focus-visible`이 `outline: none`과 함께 배경만 `rgba(37,99,235,0.08)`(다크 0.18)로 바꾼다(recent-events-dropdown.tsx:175-181). 실측 대비는 흰 배경 대비 **1.12:1**, 다크 #18181b 대비 1.17:1로 hover(0.04)와 사실상 구별되지 않는다. 또 `role="menu"`/`role="menuitem"`(:83, :90)을 선언했지만 메뉴가 열려도 포커스가 트리거에 남고 화살표 로빙이 없어 ARIA 메뉴 패턴 계약을 지키지 않는다.  
영향: '최근' 드롭다운을 열어 Tab으로 항목을 훑을 때 어느 항목이 선택될지 시각적으로 알 수 없고, 스크린리더는 메뉴라고 알렸는데 화살표는 (A11Y-2 때문에) 뒤쪽 목록 선택을 움직인다.  
권고: focus-visible에 A11Y-3의 새 링 토큰을 적용하고, role=menu/menuitem을 버리고 catalog-main-content의 MoreMenu처럼 `role="group"` + 버튼으로 낮추거나(실제 Tab 동작과 일치), 유지하려면 열릴 때 첫 항목에 포커스 이동 + 화살표 로빙을 구현한다.
근거 정정: recent-events-dropdown.tsx:175-181 focus-visible 규칙·:83 role="menu"·:90 role="menuitem" 모두 실재. 단 '포커스 표시가 배경뿐'은 부정확 — MenuItem은 <button>이라 app/css.ts:62-68 전역 규칙의 `box-shadow: var(--focus-ring)`(보라 3px, 흰 배경 대비 ~1.40:1)가 property 충돌 없이 함께 적용된다. 표시가 둘이어도 합계가 3:1에 한참 못 미치는 결론은 불변.

**A11Y-5 — 목록 행이 role=listitem + tabIndex=0 — '열 수 있다'는 신호가 없음**  
문제: 선행 검토에서 `role="button"` 중첩을 없애며 행 루트를 `role="listitem"`으로 바꿨는데(event-list-item.tsx:190), `tabIndex={0}`·onClick·Enter/Space 핸들러는 그대로 남았다(:181-189). 결과적으로 행은 '포커스 받는 비대화형 요소'다 — 스크린리더는 역할·상태를 읽어주지 않고, 접근 이름도 행 텍스트 전체(연도+카테고리+제목+기간+국기)가 통째로 읽힌다. 컨테이너는 `role="list"`인데(event-compact-list.tsx:292) 직계 자식에 `<button>`인 세기/연도 디바이더(:332, :367)와 로딩/에러 div가 섞여 list 시맨틱도 깨진다.  
영향: 스크린리더 사용자는 행을 '목록 항목 1985년 정치 …'로만 듣고 그것을 눌러 상세를 열 수 있다는 사실을 알 수 없다. 목록 모드에서 '전체 N개 중 M번째' 같은 위치 안내도 자식 버튼 때문에 부정확하게 나온다.  
권고: 행 루트를 `role="link"`(또는 실제 `<a>`)로 올려 대화형임을 선언하고 aria-label에 '제목 · 연도'만 압축해 넣는다. 자식 버튼은 그대로 두되(중첩 링크/버튼은 role=link+버튼이면 여전히 문제이므로) 제목만 감싸는 링크로 바꾸는 안이 더 안전하다. 디바이더는 list 밖으로 빼거나 각 연도 그룹을 자체 `role="list"`로 감싼다.
근거 정정: role="listitem"의 정확한 라인은 event-list-item.tsx:190(제출 evidence의 :189는 tabIndex={0}, :176은 <Stop 시작). role="list"는 event-compact-list.tsx:292(:290은 <List.CompactList 시작). 디바이더 버튼 :332(CenturyDivider)·:367(YearDivider)은 정확.

**A11Y-6 — 화살표로 선택을 바꿔도 DOM 포커스가 안 움직임 → 스크린리더 무음**  
문제: ↑↓/Home/End 처리는 `setSelectedEventId(newId)` 후 rAF 두 번에 걸쳐 `element.scrollIntoView({behavior:'smooth', block:'center'})`만 한다(use-catalog-keyboard.ts:119-134). 포커스는 이동하지 않고, 선택 변화는 행의 `aria-current`(event-list-item.tsx:191)로만 표현되며 aria-live 고지도 없다. scrollIntoView는 prefers-reduced-motion 검사 없이 항상 smooth다.  
영향: 스크린리더 사용자가 단축키 도움말대로 ↑↓를 눌러도 아무것도 낭독되지 않는다(화면만 스크롤됨). 어떤 사건이 선택됐는지 알 방법이 없고, Enter를 눌러도 A11Y-1 때문에 엉뚱한 사건으로 간다. 모션 민감 사용자는 화살표를 누를 때마다 강제로 부드러운 스크롤 애니메이션을 겪는다.  
권고: 선택 이동 시 `element.focus({preventScroll:true})`로 실제 포커스를 옮기고(roving tabindex와 함께), scrollIntoView의 behavior를 `matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'`로 분기한다.

**A11Y-7 — '계층' 토글 스위치에 접근 이름도 상태도 없음**  
문제: `Filter.Switch`는 텍스트 자식이 없는 `<button type="button">`이고(filters-panel.tsx:190-199) aria-label·aria-pressed·role="switch"/aria-checked가 전부 없다. 켬/끔은 `$active` prop이 만드는 배경색과 SwitchThumb 위치로만 표현된다(filter.styles.ts:724-780). 감싸는 `Filter.FilterToggle`은 `styled.label`(:589)이지만 button에 대한 라벨 연결은 브라우저 구현이 일관되지 않아 이름을 보장하지 못한다. 크기도 30×18px로 WCAG 2.2 최소 타깃(24×24)에 못 미친다.  
영향: 스크린리더 사용자는 필터 바 끝에서 이름 없는 '버튼'을 만나고, 그것이 계층 보기 토글인지도 지금 켜져 있는지도 알 수 없다. 계층/평면 전환은 목록 결과 구성을 통째로 바꾸는 기능이라 상태를 모르면 결과 차이를 해석할 수 없다.  
권고: Switch에 `role="switch"` + `aria-checked={!showFlatView}` + `aria-label="계층 보기"`를 부여하고, 라벨 텍스트는 `id`+`aria-labelledby`로 명시 연결한다. 히트 영역은 label 래퍼가 이미 34~40px이므로 스위치에 `padding` 대신 `::before` 확장으로 24×24 이상을 확보한다.
근거 정정: filters-panel.tsx:190-199 Filter.Switch(자식은 SwitchThumb div뿐, aria 없음)·filter.styles.ts:724-762 Switch(30×18)·:589 FilterToggle=styled.label 모두 실재. 두 부수 주장은 약화 필요: (1) 타깃 크기 — 감싼 FilterToggle label이 height 34px(@768px 이하 min-height 40px)이고 자신도 onClick={onToggleFlatView}를 갖는 동등 타깃이라 실제 히트 영역은 24×24를 넘는다. SC 2.5.8 위반 주장은 사실상 성립하지 않음. (2) 접근 이름 — <button>은 HTML 사양상 labelable element라 label이 이름을 줄 여지가 있다(브라우저별 상이). 확정적인 결함은 role/상태 부재 쪽.

**A11Y-8 — 요약 모달은 Esc로 안 닫히고, Esc가 대신 뒤의 상세를 닫음**  
문제: 사건 요약 모달(catalog-overlay-modals.tsx:147-206)에는 Escape 핸들러가 없다 — 닫기 수단은 오버레이 클릭과 X 버튼뿐이다. 반면 페이지 전역 Escape(use-catalog-keyboard.ts:54-57)는 `shortcutHelpOpen`만 우선 처리하고 그 외에는 무조건 `clearSelectedEvent()`를 호출한다. 게다가 필터 팝오버(filters-panel.tsx:253-255)·최근 본 드롭다운(recent-events-dropdown.tsx:56-58)·더보기 메뉴(catalog-main-content.tsx:151-153)의 Escape 핸들러는 document에, 전역 핸들러는 window에 각각 붙어 있어 **둘 다 발화**한다.  
영향: 요약 모달을 Esc로 닫으려 하면 모달은 그대로 있고 뒤의 상세 패널만 조용히 닫힌다. 필터 팝오버나 최근 드롭다운을 Esc로 닫을 때도 매번 보고 있던 사건 선택이 함께 날아간다 — 되돌리려면 목록에서 그 사건을 다시 찾아야 한다.  
권고: 요약 모달에 Esc 핸들러를 추가하고, 전역 Escape는 '가장 위의 열린 레이어 하나만' 닫도록 스택(열린 오버레이 집합)을 두고 분기한다. 최소 조치로 `if (shortcutHelpOpen || showSummaryModal || showCategoryModal || showCountryModal) return`을 전역 Escape 앞에 둔다.

**A11Y-9 — 기본 진입(집중 보기)에서 페이지에 h1이 아예 없음 + 헤딩 레벨 점프**  
문제: wideMode 초기값이 `window.innerHeight < 860`이면 true다(events.page.tsx:124-137). 그리고 렌더는 `{wideMode ? null : ... PageHeader ...}`로 헤더 전체를 드롭한다(:719-739). PageHeaderTitle이 이 페이지의 유일한 `<h1>`이므로(list-page.styles.ts:94), 노트북급 뷰포트의 첫 방문자는 **h1이 하나도 없는 페이지**를 받는다. 나머지 헤딩도 h1 → EmptyTitle h3(list.styles.ts:1086) → FallbackHeading h4(event-compact-list.tsx:681)로 h2를 건너뛴다.  
영향: 스크린리더 사용자가 헤딩 목록(NVDA의 H 키, VoiceOver 로터)으로 페이지 구조를 파악하려 하면 '사건 연대표'라는 문서 제목 자체가 잡히지 않아 여기가 어느 화면인지 알 수 없다. 빈 상태에서만 h3가 튀어나와 레벨 순서가 어긋난다.  
권고: wideMode에서도 h1은 유지하되 시각적으로만 숨긴다(sr-only 클래스). 빈 상태 EmptyTitle을 h2로 낮추고 FallbackHeading을 h3로 맞춰 레벨 연속성을 확보한다.

**A11Y-11 — 중요도 별(★★★)이 대비 1.46:1 — 사실상 안 보이는 유일 신호**  
문제: 디자인 결정상 목록에서 중요도는 '색이 아닌 별'로만 표현된다(event-list-item.tsx:224-233). 그런데 ImportanceStars는 9px 글리프에 `opacity: 0.45`(major)/`0.6`(critical)를 tertiary 색 위에 얹는다(:536-545). 실측 합성 대비는 라이트 **1.46:1 / 1.68:1**, 다크 1.72:1 — 텍스트 4.5:1은 물론 비텍스트 3:1도 크게 밑돈다. 레일 도트 크기(7/9/11px)가 보조 신호지만 도트 색은 카테고리 색이라 중요도와 분리되지 않는다.  
영향: '핵심 사건/주요 사건'이라는 등급이 화면상 거의 보이지 않아, 저시력 사용자는 물론 일반 사용자도 목록에서 중요 사건을 골라낼 수 없다. 상단 통계 스트립은 '핵심 89 · 주요 234'라고 알려주는데 정작 목록에서 그 89건을 시각적으로 찾지 못한다.  
권고: opacity를 제거하고 색을 직접 지정한다(예: 라이트 `#b45309`, 다크 `#fbbf24` — 각각 4.5:1 이상). 글리프 크기도 9px → 11px로 올리고, 별 대신 소형 텍스트 배지('핵심'/'주요')를 쓰면 대비·의미 전달이 동시에 해결된다.
근거 정정: '중요도는 별로만 표현되는 유일 신호'라는 전제가 코드와 어긋난다. 같은 파일에 중복 인코딩이 셋 더 있다 — (a) 레일 도트 크기 event-list-item.tsx:380-383(normal 7px / critical 9px / active 11px), (b) 제목 font-size·weight event-list-item.tsx:513-516(14/600 · 14.5/650 · 15/700), (c) 스크린리더용 role="img" + aria-label='핵심 사건'/'주요 사건'(:227-229). 따라서 '등급이 화면에서 완전히 사라진다'·'스크린리더도 모른다'는 과장이다.

**A11Y-15 — prefers-reduced-motion 누락 4곳 — 인라인 transition은 아예 끌 수 없음**  
문제: 세기/연도 chevron은 선행 검토에서 인라인 transition을 CSS로 옮겼지만, 같은 패턴이 두 곳에 남아 있다 — '더보기' chevron(catalog-main-content.tsx:213-218)과 필터 팝오버 chevron(filters-panel.tsx:300-306)이 `style={{transition:'transform 0.15s ease'}}`를 쓴다. 인라인 스타일은 `@media (prefers-reduced-motion)`으로 덮을 수 없다. 그 밖에 ExpandBtn의 `transition: ... transform 0.15s`(event-list-item.tsx:477)에는 reduced-motion 블록이 없고(Stop의 :434-439는 Stop과 ::after만 커버), `List.LoadingSpinner`는 `animation: spin 0.8s linear infinite`에 가드가 없으며(list.styles.ts:493-499 — 같은 파일의 LazyViewSpinner는 가드 있음), 요약 모달의 framer-motion scale 0.95→1(catalog-overlay-modals.tsx:167-177)도 무조건 실행된다.  
영향: 전정기관 민감·모션 멀미 사용자가 OS에서 '동작 줄이기'를 켜도 필터·더보기 화살표 회전, 하위 사건 펼치기 아이콘 회전, 무한 로딩 스피너, 요약 모달 줌이 그대로 재생된다. autoLoadAll 때문에 스피너는 첫 진입에서 길게 노출된다.  
권고: 두 인라인 transition을 styled 규칙으로 옮기고 reduced-motion 블록을 붙인다. ExpandBtn·LoadingSpinner에 `@media (prefers-reduced-motion: reduce) { transition: none; animation: none; }` 추가. framer-motion은 `useReducedMotion()`으로 initial/animate를 opacity만 남긴다.
근거 정정: 5개 중 1개는 반박된다 — 요약 모달의 framer-motion scale 0.95→1(catalog-overlay-modals.tsx:167-177)은 app/app.tsx:240-242의 `<MotionConfig reducedMotion="user">`가 전역 적용돼 있어 OS '동작 줄이기' 시 transform 애니메이션이 자동 비활성된다(주석도 그 취지를 명시). 이 항목은 삭제해야 하고 권고의 useReducedMotion() 배선도 불필요. 또 'LoadingSpinner와 같은 파일의 LazyViewSpinner는 가드 있음'은 파일이 다르다 — LazyViewSpinner는 list-page.styles.ts:27-42(가드 :39-41), LoadingSpinner는 list.styles.ts:484-500.

**A11Y-16 — aria-live가 통계 스트립 전체를 감싸 장문 재낭독 + 0건일 때 틀린 값 낭독**  
문제: `MetaArea`에 `aria-live="polite"`가 걸려 있고(catalog-main-content.tsx:300) 그 안에 CatalogHeaderStats 전체 + '/ 등록 전체 N건' 힌트가 들어간다. 스트립의 tier·top 카테고리 집계는 필터가 아니라 로드된 `events` 전체 기준이라(catalog-header-stats.tsx:43-73) 필터로 0건이 되어도 `total`만 0으로 바뀌고 나머지는 그대로 남는다(:78). 한편 결과가 0건이면 목록 자체가 EmptyCatalogState로 교체되는데(event-compact-list.tsx:208-288) 이 블록에는 live 영역이 없다.  
영향: 검색어를 타이핑할 때마다(250ms 디바운스) '0건 · 핵심 89 · 주요 234 · 정치 47' 같은 긴 문장이 통째로 다시 읽히고, 그중 '핵심 89 · 주요 234'는 현재 결과와 무관한 숫자라 사용자를 오도한다. 정작 '조건과 일치하는 사건이 없습니다'라는 핵심 상태 변화는 낭독되지 않는다.  
권고: aria-live를 MetaArea 전체가 아니라 결과 건수만 담은 시각 숨김 span으로 좁히고(예: `검색 결과 12건`), 나머지 통계는 `aria-live` 밖으로 뺀다. 빈 상태 진입 시에도 같은 live 영역이 '결과 없음'을 알리도록 문구를 공유한다. 부수적으로 tier/카테고리 집계도 필터된 목록 기준으로 바꿔 수치 자체의 정합을 맞춘다.
근거 정정: 제목 전반부 '장문 재낭독'은 과장이다. MetaArea(catalog-main-content.tsx:300)에 aria-atomic이 없어 기본값 false → 스크린리더는 변경된 노드만 고지하므로 검색 타이핑 시 실제로 읽히는 것은 총건수 텍스트(그리고 isFiltered 토글 시 FilteredHint :307-311의 추가/제거)이지 '0건 · 핵심 89 · 주요 234 · 정치 47' 전체가 아니다. 후반부(오도하는 수치·빈 상태 무고지)는 정확.


### RSP — 반응형·다크 (16건)

| id | 심각도 | 공수 | status | 항목 | 근거 |
|---|---|---|---|---|---|
| VIS-1 | P1 | M | CONFIRMED | FilterGroup overflow:hidden이 필터 팝오버를 통째로 잘라냄 | `apps/web-admin/src/pages/events/styles/filter.styles.ts:38`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:43`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:97`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:114` |
| VIS-2 | P2 | M | CONFIRMED | ≤720px에서 '더보기' 뷰 메뉴가 세그먼트 overflow에 잘려 4개 뷰 접근 불가 | `apps/web-admin/src/pages/events/styles/list-toolbar.styles.ts:457`<br>`apps/web-admin/src/pages/events/styles/list-toolbar.styles.ts:471`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:188`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:331` |
| VIS-3 | P2 | S | CONFIRMED | 목록 행의 날짜·기간·카운트 색(text.tertiary)이 라이트 2.5:1 / 다크 3.8:1 | `apps/web-admin/src/shared/styles/theme.ts:73`<br>`apps/web-admin/src/shared/styles/theme.ts:154`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:497`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:571` |
| VIS-10 | P3 | S | CONFIRMED | 다크 표면 3종(#0f0f0f / #0f0f12 / #171717)이 섞여 레일 도트에 링 자국 | `apps/web-admin/src/pages/events/styles/layout.styles.ts:23`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:1255`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:390`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:556` |
| VIS-11 | P3 | S | CONFIRMED | 세기 헤더와 연도 헤더의 우측 hairline 끝이 12px 어긋남 | `apps/web-admin/src/pages/events/styles/list.styles.ts:526`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:665`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:667`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:30` |
| VIS-12 | P3 | S | PLAUSIBLE | '연도 미상' divider 앞에서만 이중 hairline | `apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:446`<br>`apps/web-admin/src/widgets/event-list-item.tsx:322`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:322`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:624` |
| VIS-13 | P3 | S | CONFIRMED | `dark ? '#64748b' : '#64748b'` 동일 분기 — 다크 분기가 미작성인 지점들 | `apps/web-admin/src/pages/events/styles/filter.styles.ts:606`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:361`<br>`apps/web-admin/src/pages/events/styles/filter.styles.ts:460`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:189` |
| VIS-14 | P3 | S | CONFIRMED | 스크롤바 스타일이 목록 뷰에만 있고, 다크에서는 그마저 안 보임 | `apps/web-admin/src/pages/events/styles/list.styles.ts:58`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:66`<br>`apps/web-admin/src/pages/events/styles/shared.styles.ts:35`<br>`apps/web-admin/src/widgets/event-grid-view/ui/event-grid-view.tsx:239` |
| VIS-15 | P3 | M | CONFIRMED | 카테고리 팔레트 4번째 사본이 통일 팔레트와 hue가 뒤바뀐 채 남아 있음 | `apps/web-admin/src/pages/events/styles/skeleton.styles.ts:350`<br>`apps/web-admin/src/pages/events/styles/skeleton.styles.ts:298`<br>`apps/web-admin/src/pages/events/styles/skeleton.styles.ts:317`<br>`apps/web-admin/src/pages/events/styles/theme.ts:22` |
| VIS-16 | P3 | S | CONFIRMED | 행 펼치기 chevron 회전에만 reduced-motion 가드 누락 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:477`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:434`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:614`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:756` |
| VIS-4 | P3 | S | CONFIRMED | 모바일 sticky 연도 헤더 좌측 26px가 투명 — 아래 행이 라벨에 비침 | `apps/web-admin/src/pages/events/styles/list.styles.ts:527`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:566`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:81`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:35` |
| VIS-5 | P3 | M | CONFIRMED | 뷰마다 프레임·하단 여백이 달라 뷰 전환 시 콘텐츠 상자가 나타났다 사라짐 | `apps/web-admin/src/pages/events/styles/list.styles.ts:1244`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:3818`<br>`apps/web-admin/src/widgets/event-grid-view/ui/event-grid-view.tsx:239`<br>`apps/web-admin/src/widgets/event-gallery-view/ui/event-gallery-view.tsx:158` |
| VIS-6 | P3 | M | CONFIRMED | 브레이크포인트 9종 난립 — BREAKPOINTS 토큰은 사실상 사문화 | `apps/web-admin/src/pages/events/styles/theme.ts:369`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:502`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:575`<br>`apps/web-admin/src/pages/events/styles/list-toolbar.styles.ts:424` |
| VIS-7 | P3 | S | CONFIRMED | 모바일 FAB가 지도 뷰 우하단 위에 그대로 겹침 | `apps/web-admin/src/pages/events/styles/layout.styles.ts:120`<br>`apps/web-admin/src/pages/events/styles/layout.styles.ts:127`<br>`apps/web-admin/src/widgets/event-map-view/ui/event-map-view.tsx:271`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:810` |
| VIS-8 | P3 | M | CONFIRMED | list.styles.ts 46개 export 중 21개가 죽은 구(舊) 카드 레이아웃 잔재 | `apps/web-admin/src/pages/events/styles/list.styles.ts:111`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:146`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:780`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:1212` |
| VIS-9 | P3 | M | CONFIRMED | 빈 상태 UI가 목록 뷰만 자체 구현 — 나머지 6뷰는 공용 EmptyStateSpotlight | `apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:209`<br>`apps/web-admin/src/pages/events/styles/list.styles.ts:959`<br>`apps/web-admin/src/widgets/event-grid-view/ui/event-grid-view.tsx:137`<br>`apps/web-admin/src/widgets/event-gallery-view/ui/event-gallery-view.tsx:72` |

**VIS-1 — FilterGroup overflow:hidden이 필터 팝오버를 통째로 잘라냄**  
문제: `FilterGroup`은 `height: 34px` + `overflow: hidden`(filter.styles.ts:38,43), 좁은 폭에선 `overflow-x:auto; overflow-y:hidden`(:97)이다. 카테고리·대륙·국가 트리거는 이 FilterGroup의 **직속 자식** `PopoverWrap`(position:relative, filters-panel.tsx:286) 안에 있고, 드롭다운 `Popover`는 `position:absolute; top: calc(100% + 4px)`(:389-391)로 트리거 아래 38px 지점에서 시작한다. 절대위치 요소의 컨테이닝 블록 체인(Popover → PopoverWrap → FilterGroup)에 overflow 박스가 포함되므로 z-index 60은 클리핑을 벗어나지 못하고, 34px 높이 박스 밖의 팝오버 전체가 잘린다. FilterGroup의 주석(:95-96)은 '가로' 잘림만 인지해 overflow-x만 auto로 풀었을 뿐 세로 클리핑은 그대로다.  
영향: 사용자가 툴바의 '카테고리'/'대륙'/'국가' 버튼을 눌러도 화면에 아무것도 나타나지 않는다(aria-expanded만 true로 바뀜). 인라인 선택 동선이 통째로 죽고, 팝오버 안에 들어있는 '전체 보기 →' 모달 진입 버튼도 같이 잘려 모달 경로마저 막힌다. 결과적으로 카탈로그에서 실제로 조작 가능한 필터는 세기 select 하나뿐이다. 데스크톱·모바일 모든 폭에서 동일.  
권고: FilterGroup에서 `overflow: hidden`을 제거하고(자식 첫/마지막 radius는 `& > *:first-child { border-radius: 8px 0 0 8px }` 식으로 직접 부여), 좁은 폭 가로 스크롤은 FilterGroup을 감싸는 별도 래퍼(`FilterGroupScroller`)로 옮긴다. 그래도 스크롤 컨테이너가 남으므로 `Popover`는 `createPortal` + 트리거 rect 기반 좌표(또는 CSS anchor positioning)로 body에 띄우는 것이 정공법이다. 동일 패턴인 `recent-events-dropdown.tsx`의 Menu는 overflow 조상이 없어 정상이므로 그 구조를 참고.
근거 정정: filter.styles.ts:38 (`height: 34px`), :43 (`overflow: hidden`), :97 (`@media (max-width:768px)` opening, overflow-x:auto at :99, overflow-y:hidden at :100) — all exact. filters-panel.tsx:114 `<Filter.FilterGroup>` ✓, :285-286 `<PopoverWrap ref={wrapRef}>` ✓, styled defs PopoverWrap:383 / Popover:389-391 ✓.

**VIS-2 — ≤720px에서 '더보기' 뷰 메뉴가 세그먼트 overflow에 잘려 4개 뷰 접근 불가**  
문제: `ViewSegmented`는 `@media (max-width: 720px)`에서 `overflow-x:auto; overflow-y:hidden` + `mask-image`를 켠다(list-toolbar.styles.ts:457-484). '더보기' 트리거인 `MoreSegmentWrap`(catalog-main-content.tsx:188, position:relative)은 ViewSegmented의 자식이고 `MoreMenu`는 `position:absolute; top: calc(100% + 4px)`(:331-333)이라 세그먼트 박스(30~36px 높이) 바깥에 그려진다. VIS-1과 같은 이유로 클리핑되며, mask-image도 동일하게 페인트를 자른다. 데스크톱(>720px)에서는 overflow가 없어 정상 동작하므로 반응형 전용 회귀다.  
영향: 태블릿·모바일(≤720px)에서 '더보기'를 탭하면 메뉴가 보이지 않는다. SECONDARY_MODES에 묶인 격자·통계·트리·갤러리 4개 뷰(catalog-main-content.tsx:109-118)로 전환할 방법이 UI상 사라지고, 남는 것은 타임라인·목록·지도 3개뿐이다. URL로 ?view=grid를 직접 치는 우회 외엔 복귀 경로도 없다.  
권고: MoreMenu를 `createPortal`로 body에 띄우고 트리거 `getBoundingClientRect()` 기준으로 좌표를 잡거나, 가로 스크롤 대상을 `ViewSegmented` 자신이 아닌 내부 래퍼로 한 단계 내려 `MoreSegmentWrap`이 스크롤 컨테이너 밖에 놓이게 한다. 대안으로 ≤720px에서는 '더보기'를 드롭다운 대신 `Modal`(modal.styles.ts) 시트로 전환.
근거 정정: catalog-main-content.tsx:188은 `<MoreSegmentWrap ref={moreRef}>` JSX(styled 정의는 :326), MoreMenu styled 정의 :331-333 ✓, SECONDARY_MODES :108-118 ✓, list-toolbar.styles.ts:457 `@media (max-width:720px)` / :458-459 overflow-x:auto·overflow-y:hidden / :471-484 mask-image ✓.

**VIS-3 — 목록 행의 날짜·기간·카운트 색(text.tertiary)이 라이트 2.5:1 / 다크 3.8:1**  
문제: `theme.colors.text.tertiary`는 라이트 `#9ca3af`(theme.ts:73), 다크 `#71717a`(:154)다. 이벤트 페이지 표면은 라이트 `#ffffff`(CatalogSection), 다크 `#0f0f0f`+`rgba(255,255,255,0.02)`≈`#141414`(list.styles.ts:1244-1256, layout.styles.ts:23). 대비를 계산하면 라이트 **2.54:1**, 다크 **3.81:1**로 둘 다 WCAG AA(4.5:1) 미달이다. 이 토큰은 행 선두 날짜 `Year`(12px, event-list-item.tsx:497), `Duration`(11px, :571), `CollapsedCount`(list.styles.ts:641), `CenturyDividerCount/Years`(:767,:777), `ViewHint`(catalog-main-content.tsx:410), `ScrollHintInline`·`EndOfListText`(event-compact-list.tsx:599,651) 등 카탈로그 보조 데이터 거의 전부에 쓰인다. 참고로 같은 파일에서 검색 아이콘만은 라이트 `#94a3b8→#64748b`로 이미 한 번 올렸다(list-toolbar.styles.ts:48-54) — 문제를 인지했으나 토큰 자체는 안 고침.  
영향: '장부' 톤 화면에서 실제 데이터인 월·일, 기간, 세기/연도 건수가 배경에 묻혀 읽기 힘들다. 밝은 사무실 모니터나 저대비 패널에서 날짜 열이 회색 얼룩처럼 보이고, 다크 모드에서도 마찬가지다. 시력 저하 사용자에겐 목록에서 시간 정보를 스캔하는 핵심 동작이 사실상 불가능하다.  
권고: 이벤트 페이지에서 meta 텍스트에 쓰는 층을 `text.tertiary` → `text.secondary`(라이트 `#6b7280` 4.83:1 / 다크 `#a1a1aa` 7.4:1)로 올리거나, 전역 토큰의 tertiary를 라이트 `#6b7280`·다크 `#8b8b93` 수준으로 조정한다(전역 변경 시 blast 확인 필요). 최소한 목록 행의 `Year`/`Duration`과 divider 카운트 3곳만이라도 secondary로 승격.

**VIS-10 — 다크 표면 3종(#0f0f0f / #0f0f12 / #171717)이 섞여 레일 도트에 링 자국**  
문제: 다크 배경이 세 갈래다. PageScene은 `#0f0f0f`(layout.styles.ts:23, SURFACE.baseDark theme.ts:330), 전역 테마의 background.primary는 `#171717`(shared/styles/theme.ts:136), 그런데 레일 도트를 레일선에서 '오려내는' separator 링과 sticky divider 배경은 `#0f0f12`를 쓴다(event-list-item.tsx:389-391, list.styles.ts:556, :628, :707, :910). 실제 행 뒤의 표면은 `#0f0f0f` 위에 CatalogSection의 `rgba(255,255,255,0.02)`가 얹혀 약 `#141414`이므로, 링 색 `#0f0f12`와 5/255 정도 어긋난다.  
영향: 다크 모드에서 목록을 보면 좌측 타임라인 레일 위 각 도트 둘레에 아주 옅은 검은 링이 생겨 도트가 '뚫린' 게 아니라 '얹힌 스티커'처럼 보인다. 라이트 모드(#ffffff 대 #ffffff)는 정확히 맞아떨어져 이 얼룩이 없다 — 다크에서만 마감이 흐트러진다.  
권고: CompactList에 `--surface-bg` CSS 변수를 선언(다크=실제 합성값, 라이트=#ffffff)하고, 도트 링·sticky divider 배경·CollapsedPlaceholder 도트가 모두 `var(--surface-bg)`를 참조하도록 바꾼다. 겸사겸사 `SURFACE.baseDark`와 전역 `background.primary`의 관계도 주석으로 명시.
근거 정정: `SURFACE.baseDark`는 pages/events/styles/theme.ts:305(리뷰어의 :330은 SURFACE 내 다른 키). 나머지(layout.styles.ts:23 `#0f0f0f`, list.styles.ts:1255 CatalogSection bg, event-list-item.tsx:389-391 sep, list.styles.ts:556·628·707·910 `#0f0f12`, shared/styles/theme.ts:136 `#171717`)는 정확.

**VIS-11 — 세기 헤더와 연도 헤더의 우측 hairline 끝이 12px 어긋남**  
문제: `YearDivider`는 `margin: 22px -12px 8px calc(-1*var(--rail-inset))`(:526)이고 width가 auto라 좌우로 각각 inset·12px 확장된다. `CenturyDivider`는 좌우 margin을 모두 `calc(-1*var(--rail-inset))`로 주면서 `width: calc(100% + var(--rail-inset))`(:665-667)로 명시해, over-constrained가 되어 margin-right가 무시되고 우측 끝이 콘텐츠 박스 오른쪽(=CompactList padding-right 12px 안쪽, :30)에서 멈춘다. 즉 세기 헤더의 border-top/bottom이 연도 헤더보다 정확히 12px 짧다.  
영향: 세기 헤더 바로 아래 연도 헤더가 붙는 구간에서 두 가로 hairline의 오른쪽 끝이 계단처럼 12px 어긋나 보인다. 스크롤로 두 sticky 헤더가 겹쳐 붙을 때 특히 눈에 띈다.  
권고: `CenturyDivider`의 `width`를 제거하고(`align-self: stretch`로 대체) margin만 `0 -12px 8px calc(-1*var(--rail-inset))`로 YearDivider와 동일하게 맞춘다. 또는 두 divider가 공유하는 `dividerBleedMixin`으로 좌우 bleed 값을 한 곳에 둔다.

**VIS-12 — '연도 미상' divider 앞에서만 이중 hairline**  
문제: 행 컴포넌트 `Stop`은 `&:has(+ button) { border-bottom: none }`으로 divider 직전 행의 밑줄을 지워 '행 밑줄 + divider 윗줄' 이중선을 피한다(event-list-item.tsx:322-325). 그런데 '연도 미상' 헤더는 `<List.UnknownYearDivider as="div">`로 렌더돼 button이 아니다(event-compact-list.tsx:446). UnknownYearDivider는 YearDivider를 상속해 `border-top: 1px`을 그대로 갖고(list.styles.ts:624, :529), CenturyDivider의 `& + button { border-top: none }`(:718)도 div에는 매칭되지 않는다.  
영향: '연도 미상' 섹션 바로 위에서만 가로선이 두 줄 겹쳐 그려져, 다른 연도 경계보다 굵고 지저분해 보인다. 이 구간이 특별한 오류 구간처럼 오독될 수 있다.  
권고: `Stop`의 선택자를 `&:has(+ button), &:has(+ [data-divider])`로 넓히고 UnknownYearDivider 렌더 시 `data-divider` 속성을 부여하거나, `as="div"` 대신 `disabled` button으로 렌더한다(스크린리더에도 비대화형임이 더 정확히 전달됨).
근거 정정: `/Users/.../src/widgets/event-list-item.tsx:322`는 **존재하지 않는 경로**(ls 실패). 올바른 경로는 `src/widgets/event-list-compact/ui/event-list-item.tsx:322-325`이며 같은 목록에 중복 기재돼 있다. 나머지(event-compact-list.tsx:446 `as="div"`, list.styles.ts:624 UnknownYearDivider, :718 `& + button`)는 정확.

**VIS-13 — `dark ? '#64748b' : '#64748b'` 동일 분기 — 다크 분기가 미작성인 지점들**  
문제: `theme.mode === 'dark' ? '#64748b' : '#64748b'` 형태로 **양쪽 분기 값이 같은** 삼항이 events/styles에 7곳 있다(filter.styles.ts:361,460,606 / list.styles.ts:433,449 / layout.styles.ts:71 / modal.styles.ts:66,177). 그중 `FilterToggleLabel`(filter.styles.ts:602-607)은 툴바의 '계층' 라벨로 실제 렌더되고(filters-panel.tsx:189), 같은 줄의 아이콘도 `style={{ color: '#64748b' }}` 인라인 하드코딩이다(:188). `#64748b`는 다크 표면(#0f0f0f~#141414) 대비 약 3.9:1로 AA 미달, 라이트(#ffffff)에서는 4.8:1로 통과한다.  
영향: 다크 모드에서 필터 툴바의 '계층' 라벨과 그 아이콘이 배경에 묻혀, 옆의 토글 스위치가 무엇을 켜고 끄는 스위치인지 읽기 어렵다. 동일 분기 삼항은 '테마 대응했다'는 착시를 줘 리뷰에서도 걸러지지 않는다.  
권고: 7곳의 동일 분기 삼항을 `theme.colors.text.secondary`(또는 VIS-3의 개선 토큰)로 치환하고, filters-panel.tsx:188의 인라인 `color: '#64748b'`를 `currentColor`로 바꿔 라벨 색을 따르게 한다. ESLint로 잡기 어려우니 `grep -E "'#[0-9a-f]{6}' : '#\1'"` 를 한 번 돌려 전량 정리.
근거 정정: 본문은 '7곳'이라 썼지만 실제(그리고 리뷰어가 나열한) 개수는 8곳. 정규식 재검증 결과 정확히 filter.styles.ts:361·460·606 / list.styles.ts:433·449 / layout.styles.ts:71 / modal.styles.ts:66·177 — 나열된 라인 전부 문자 단위로 일치.

**VIS-14 — 스크롤바 스타일이 목록 뷰에만 있고, 다크에서는 그마저 안 보임**  
문제: `CompactList`만 webkit 스크롤바를 6px·thumb `rgba(37,99,235,0.2)`로 커스터마이즈한다(list.styles.ts:58-71). 격자·갤러리·트리·통계의 `Host`는 `overflow: auto`만 있어 OS 기본 스크롤바가 뜬다. 재사용하라고 만든 `customScrollbar` mixin(shared.styles.ts:35-51)은 어디서도 import되지 않는다. 또 thumb 색이 테마 분기 없이 20% 알파 인디고라, 다크 표면(#141414) 위에서 합성하면 약 `#17233e`로 트랙(투명=표면)과 거의 구분되지 않는다.  
영향: 뷰를 바꾸면 스크롤바 두께와 색이 바뀌어 같은 페이지가 아닌 것처럼 보인다. 다크 모드에서 목록 뷰의 스크롤바는 사실상 보이지 않아, 153건짜리 긴 목록에서 지금 어디쯤 있는지 시각적으로 알 수 없다.  
권고: `customScrollbar` mixin에 테마 분기(다크 thumb `rgba(255,255,255,0.18)`, 라이트 `rgba(15,23,42,0.18)`)를 넣고 `CompactList`와 5개 뷰 `Host`에 동일 적용. 크로스 브라우저를 위해 `scrollbar-color`/`scrollbar-width` 표준 속성도 함께 선언.

**VIS-15 — 카테고리 팔레트 4번째 사본이 통일 팔레트와 hue가 뒤바뀐 채 남아 있음**  
문제: 선행 검토대로 `CATEGORY_BADGE_COLORS`·`CATEGORY_SOFT_COLORS`는 `LEDGER_CATEGORY`(ledger-tokens.ts:20-31)와 hue가 일치하고, 목록·격자·갤러리·통계·지도(CategoryDot)·타임라인이 전부 그 출처를 쓰는 것을 코드로 확인했다. 그러나 **네 번째 사본**이 남아 있다: skeleton.styles.ts의 `CATEGORY_BUBBLE_COLOR`(:350-361)는 정치=`#1d4ed8`(파랑), 외교=`#7c3aed`(보라)로 통일 팔레트(정치=보라 `#6d28d9`, 외교=하늘 `#0ea5e9`)와 **정확히 서로 뒤바뀌어** 있고, `CATEGORY_BORDERS`(:298)도 옛 hue다. 같은 카드는 `background: #ffffff`, 제목 `color:#0f172a`로 테마 분기가 아예 없다(:317, :403). 이 카드를 쓰는 `CategorySummaryGrid`/`intro-section`은 현재 미사용이지만, `CATEGORY_COLORS`(theme.ts:22-)는 live인 `category-modal.tsx:22`가 아직 참조한다.  
영향: 현재 화면에 노출되지는 않지만, 카테고리 색을 손보려는 다음 작업자가 '카테고리 색' grep에서 이 사본을 먼저 만나 정치=파랑/외교=보라로 되돌리면 목록·타임라인 전체의 색 통일이 한 번에 깨진다. 또 이 dead 카드가 되살아나면 다크 모드에서 흰 카드가 그대로 뜬다.  
권고: 미사용 위젯(`widgets/event-category-summary`, `pages/events/components/intro-section`, `widgets/event-list/ui/filter-panel.tsx`·`event-list-section.tsx`·`simple-select-modal.tsx`)과 함께 `CATEGORY_BORDERS`/`CATEGORY_BUBBLE_BG`/`CATEGORY_BUBBLE_COLOR`/`CategorySummary*`를 삭제한다. live인 `category-modal.tsx`가 쓰는 `CATEGORY_COLORS`는 tagline만 필요하므로 색 필드를 `LEDGER_CATEGORY` 파생으로 바꾸고 팔레트 단일 출처를 확정.

**VIS-16 — 행 펼치기 chevron 회전에만 reduced-motion 가드 누락**  
문제: 선행 검토에서 세기·연도 divider chevron의 transition은 인라인에서 CSS로 옮기며 `@media (prefers-reduced-motion: reduce)` 가드를 붙였다(list.styles.ts:614-619, :756-760). 그런데 행 자체의 펼치기 버튼 `ExpandBtn`은 `transition: background 0.12s, transform 0.15s` + `transform: rotate(90deg)`(event-list-item.tsx:477-478)인데 reduced-motion 블록이 없다. 같은 파일의 `Stop`은 :434에서 제대로 막고 있어 한 컴포넌트 안에서 정책이 갈린다.  
영향: 모션 민감 설정을 켠 사용자가 하위 사건을 펼칠 때마다 화살표가 90도 회전 애니메이션을 한다. 계층이 깊은 목록에서 반복적으로 발생해 불쾌감·현기증을 유발할 수 있다.  
권고: `ExpandBtn`에 `@media (prefers-reduced-motion: reduce) { transition: none; }` 추가. 나아가 `MOTION` 토큰(theme.ts:263)에 reduced-motion을 흡수한 `transitionMixin(props)` 헬퍼를 만들어 개별 선언에서 빠지지 않게 한다.

**VIS-4 — 모바일 sticky 연도 헤더 좌측 26px가 투명 — 아래 행이 라벨에 비침**  
문제: `YearDivider`는 padding-left를 `var(--rail-inset)`로 변수화했지만(list.styles.ts:526-527), sticky 시 본문 가림 방지용 불투명 띠인 `&::after`는 `left: 38px`로 **데스크톱 값이 하드코딩**돼 있다(:566). `--rail-inset`은 ≤640px에서 12px로 재정의되므로(:81), 모바일에선 라벨이 12px 지점부터 시작하는데 불투명 배경은 38px부터 깔린다 → 좌측 26px 구간(chevron + '19…' 앞부분)에 배경이 없다. 선행 검토가 `-38px` 하드코딩을 `--rail-inset`으로 일원화했다고 기록했으나(docs/event-list-view-improvement-review.md 항목 B), 이 한 줄이 누락된 부분 회귀다.  
영향: 모바일에서 목록을 스크롤하면 상단에 고정된 '1985년 12' 라벨의 앞부분이 그 아래를 지나가는 사건 제목과 겹쳐 글자가 서로 뒤엉킨다. 지금 몇 년도 구간을 보고 있는지 순간적으로 못 읽는다.  
권고: `&::after { left: 38px }`를 `left: var(--rail-inset)`로 교체. 같은 파일의 `CollapsedPlaceholder::before/::after`(:888,:904)와 `SkeletonRail`(event-compact-list.tsx:764)은 이미 변수를 쓰므로 이 한 줄만 맞추면 단일 출처가 완성된다.
근거 정정: list.styles.ts:566 `left: 38px;`(YearDivider `&::after`) ✓, :526-527 margin/padding의 `var(--rail-inset)` ✓, :35 `--rail-inset: 38px` ✓, :81 `--rail-inset: 12px`(@media max-width:640px, 블록 시작은 :79) ✓.

**VIS-5 — 뷰마다 프레임·하단 여백이 달라 뷰 전환 시 콘텐츠 상자가 나타났다 사라짐**  
문제: 목록 뷰는 `CatalogSection`(radius 12 + 1px border + 표면 bg, list.styles.ts:1244-1257), 타임라인은 그와 값이 **똑같은** `cardBase`(event-timeline.tsx:3818-3829)를 각자 중복 정의해 카드 프레임을 가진다. 반면 격자·갤러리·트리·지도·통계 5개 뷰의 루트 `Host`는 border/background가 전혀 없는 맨 div다(각 :239 / :158 / :292 / :271 / :458). 하단 여백도 목록 120px(list.styles.ts:30), 격자·갤러리·트리·통계 80px, 지도 0px로 제각각이다.  
영향: 같은 페이지에서 보기 모드만 바꿨을 뿐인데 콘텐츠 영역을 감싸던 카드 테두리가 사라졌다 나타나 페이지가 '다른 화면'처럼 튄다. 특히 목록↔격자를 오갈 때 좌우 경계선과 배경이 함께 변해 레이아웃이 흔들린 것처럼 보인다.  
권고: `cardBase`/`CatalogSection`을 `pages/events/styles/shared.styles.ts`의 mixin(예: `viewSurfaceMixin`) 하나로 승격하고, 7개 뷰의 Host가 전부 그것을 쓰도록 통일한다. 하단 여백도 상수(FAB 회피용 `--view-bottom-pad`)로 뽑아 동일 값 적용.
근거 정정: CatalogSection export는 list.styles.ts:1243(:1244는 `display:flex`). 나머지 라인(event-timeline.tsx:3818 cardBase, grid:239 / gallery:158 / tree:292 / map:271 / dashboard:458 Host)은 전부 정확.

**VIS-6 — 브레이크포인트 9종 난립 — BREAKPOINTS 토큰은 사실상 사문화**  
문제: `BREAKPOINTS`(theme.ts:369-374)가 정의돼 있지만 실제 참조는 미라우트 dead 컴포넌트 intro-section과 `catalog-detail-drawer.tsx:19` 두 곳뿐이고, 스타일은 전부 리터럴을 쓴다. events/styles 전체 max-width 히스토그램: 480(8) 600(1) 640(10) 720(2) 768(38) 900(1) 1024(1) 1200(7) 1400(1). 구체적 어긋남 사례: 행의 `Year`는 ≤640에서 숨는데(event-list-item.tsx:502) `Duration`은 ≤600에서 숨는다(:575) → 601~640px 구간에서 '연도는 없고 기간만 있는' 행이 된다. `ViewSwitcherRow` gap은 900(:424), 세그먼트 스크롤은 720(:457), 세그먼트 터치 타겟은 640(:568), 라벨 sr-only는 1024(:554)로 네 단계가 서로 다르다. `CompactList`는 768과 640에 각각 규칙을 두는데(list.styles.ts:73,79) 768 규칙은 `max-height:none` 한 줄뿐이라 사실상 죽어 있다.  
영향: 노트북 창을 줄이거나 태블릿 가로/세로를 바꾸는 동안 레이아웃이 한 번에 정돈되지 않고 601·640·720·768·900·1024에서 여섯 번 따로따로 튄다. 601~640px 구간에서는 행에서 날짜가 사라졌는데 기간은 남아 '무슨 날짜인지 모르는 채 기간만 보이는' 상태가 된다.  
권고: `BREAKPOINTS`에 sm(640)/md(768)/lg(1024)/xl(1200)/xxl(1400)을 확정하고 events/styles 전 파일의 리터럴을 `@media (max-width: ${BREAKPOINTS.sm})` 형태로 치환한다. 우선 601/720/900 같은 1회성 값을 640/768로 흡수하고, `Year`·`Duration` 숨김 임계를 640으로 일치시킨다.
근거 정정: BREAKPOINTS 정의는 pages/events/styles/theme.ts:365-370(리뷰어의 :369는 `wide` 줄). 히스토그램도 부정확 — events/styles 실측은 480(6 미디어쿼리, 리터럴 포함 8) 640(10) 720(1, 2 아님) 768(38) 900(1) 1024(1) 1200(7) 1400(1)이고 300/360/400/460/1000이 추가로 누락됨(즉 난립은 오히려 더 심함). 600px는 styles 디렉토리가 아니라 event-list-item.tsx:575에 있음.

**VIS-7 — 모바일 FAB가 지도 뷰 우하단 위에 그대로 겹침**  
문제: `CreateEventFab`은 ≤640px에서 `position: fixed; right:16; bottom: max(16px, env(safe-area-inset-bottom)+12px); 56×56; z-index:1050`으로 항상 렌더된다(layout.styles.ts:120-138, events.page.tsx:810). 다른 뷰들은 Host에 `padding-bottom: 80px`을 둬 72px짜리 FAB 영역을 겨우 비켜가지만, 지도 뷰의 `Host`는 `display:flex; gap:10px`뿐이고 하단 패딩이 0이며 `MapWrap`이 바닥까지 채운다(event-map-view.tsx:271-277).  
영향: 모바일 지도 뷰에서 화면 우하단(구글 지도의 확대/축소·약관 링크, 그리고 그 좌표에 찍힌 사건 마커)이 파란 FAB에 가려 탭할 수 없다. 지도를 팬해서 마커를 옮기지 않는 한 그 영역의 사건은 선택 불가.  
권고: 뷰 공통 하단 여백 토큰(VIS-5의 `--view-bottom-pad`)을 만들어 지도 Host에도 `padding-bottom: 80px`(또는 MapWrap 하단 inset)을 주거나, 지도 뷰에서는 FAB를 `bottom`을 올려 배치/숨김 처리한다.

**VIS-8 — list.styles.ts 46개 export 중 21개가 죽은 구(舊) 카드 레이아웃 잔재**  
문제: list.styles.ts의 46개 export 중 21개(CompactListItem·CompactListBody·CompactThumbnail·CompactCategoryBadge·CompactListContent/Header/Title/Meta·CompactCategoryDot·TimelineDate*·TimelineDuration·DateDivider·SimpleYearLabel·CompactListSummary·ImportanceBadge·SummaryIconButton·ToolbarToggle 4종)가 어디서도 참조되지 않는다. 이들은 `--rail-inset` 도입 **이전** 좌표계를 그대로 들고 있다: `CompactListItem::before/::after`가 `left: -41 - depth*24`(:146,:186,:225), `DateDivider`가 `margin-left:-70px; width: calc(100% + 70px); ::before{left:32px}`(:783-798). list-page.styles.ts도 EmptyResults 3종·DeletedEvent* 5종이 dead(:212 이하), shared.styles의 `customScrollbar`·`SkeletonBase`도 dead(:35,:54). 더해 `SummaryIconButton`은 list/detail/modal 세 파일에 각각(list.styles:1212, detail.styles:711, modal.styles:475), `SortSelect`·`ResultControls`·`ToolbarMeta`는 list.styles와 filter.styles에 이중 정의돼 있고 두 정의의 색·높이가 다르다.  
영향: 직접적인 화면 결함은 아니지만, 다음 수정자가 '행 커넥터가 어긋난다'를 고치려 grep하면 살아있는 `Stop`(event-list-item.tsx)이 아니라 dead `CompactListItem`의 -41px를 먼저 만나 엉뚱한 곳을 고친다. 실제로 VIS-4(38px 하드코딩 잔존)가 정확히 이 혼선의 산물이다. 또 `import * as List` 네임스페이스 임포트라 21개 styled 컴포넌트가 모듈 평가 시 전부 생성돼 초기 스타일 주입 비용도 그만큼 낭비된다.  
권고: dead export 21+8개를 삭제하고, 중복 정의된 `SummaryIconButton`/`SortSelect`/`ResultControls`/`ToolbarMeta`는 한 곳(예: shared.styles 또는 filter.styles)만 남겨 re-export한다. 삭제 후 `import * as List`를 named import로 바꾸면 남은 것만 남았음을 타입 레벨에서 강제할 수 있다.
근거 정정: `shared.styles.ts:54 SkeletonBase`는 dead가 아님 — 같은 파일 :66 `SkeletonText`가 상속해 쓰고, SkeletonText는 intro-section.tsx:41 등에서 참조된다(그 소비자가 미라우트라 *전이적으로* 죽었을 뿐, 미참조 export는 아님). 진짜 dead는 :35 `customScrollbar`(전 코드베이스 참조 0). `TimelineDate*`는 list.styles.ts:444 `TimelineDateWrapper` / :453 `TimelineDateRow`가 정확한 이름.

**VIS-9 — 빈 상태 UI가 목록 뷰만 자체 구현 — 나머지 6뷰는 공용 EmptyStateSpotlight**  
문제: 격자·갤러리·지도·통계·트리 5개 뷰는 공용 `EmptyStateSpotlight`(shared/ui/empty-state)를 쓰는데, 목록 뷰만 `List.EmptyCatalogState`(list.styles.ts:959-1026)라는 자체 구현을 쓴다. 자체 구현은 min-height 420px, margin-left 40px, 좌측 2px 그라데이션 레일 + 16px 도트라는 완전히 다른 시각 언어를 갖는다.  
영향: 필터를 걸어 결과가 0건일 때, 목록 뷰에서는 좌측 세로선과 큰 도트가 있는 화면이, 격자로 바꾸면 스포트라이트형 화면이 나온다. 같은 '결과 없음' 상황인데 화면 구성과 버튼 위치가 달라져 '뭔가 다른 오류인가' 하고 다시 읽게 된다.  
권고: `EmptyCatalogState`가 제공하는 3-way 아이콘·활성 필터 칩·최근 본 사건 fallback을 `EmptyStateSpotlight`의 `extra` 슬롯으로 이식해 목록 뷰도 공용 컴포넌트로 수렴시킨다. 타임라인 레일 데코가 꼭 필요하면 `EmptyStateSpotlight`에 variant를 추가.


### PERF — 성능 (14건)

| id | 심각도 | 공수 | status | 항목 | 근거 |
|---|---|---|---|---|---|
| PERF-1 | P1 | M | CONFIRMED | 목록 응답이 모든 사건의 본문(MEDIUMTEXT)을 통째로 실어 옴 | `apps/api/src/libs/event/presentation/event.controller.ts:541`<br>`apps/api/src/libs/event/presentation/event.controller.ts:517`<br>`apps/api/src/libs/event/presentation/event.controller.ts:122`<br>`apps/api/src/libs/event/presentation/event.controller.ts:952` |
| PERF-13 | P2 | L | CONFIRMED | 가상화 재검토 — 차단 요인은 pseudo 오버플로 하나가 아니라 '형제 결합 CSS + 그룹 래퍼 부재' 2중 구조 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:353`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:374`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:322`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:330` |
| PERF-2 | P2 | S | CONFIRMED | 참조 데이터 `?? []`가 매 렌더 새 배열 → 필터·정렬·타임라인 메모 체인 전체 붕괴 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-reference-data.ts:42`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:60`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:166`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:512` |
| PERF-5 | P2 | S | CONFIRMED | 검색어 한 글자마다 페이지 전체가 2번 렌더 — URL 동기화가 디바운스 밖에 있음 | `apps/web-admin/src/pages/events/list/events.page.tsx:256`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:152`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:184`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:566` |
| PERF-7 | P2 | S | CONFIRMED | 페이지 크기(20/50/100) 변경 시 목록이 통째로 사라졌다 처음부터 다시 로드 | `apps/web-admin/src/entities/event/model/useEvents.ts:57`<br>`apps/web-admin/src/entities/event/model/useEvents.ts:81`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:267`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:526` |
| PERF-9 | P2 | L | CONFIRMED | 타임라인 SVG 폭이 사건 수가 아닌 '연도 범위'에 비례 — 고대 사건 1건이 SVG를 수 배로 부풀리고 '전체 맞춤'이 구조적으로 불가 | `apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:631`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:663`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:763`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:1083` |
| PERF-10 | P3 | S | CONFIRMED | 타임라인의 자동 로드 상한(25배치)이 페이지의 autoLoadAll에 의해 무력화 — '더 보기' CTA도 오안내 | `apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:452`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:461`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:471`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:172` |
| PERF-11 | P3 | S | PLAUSIBLE | 국가 필터 팝오버 — 검색 시작 순간 50개 상한이 풀리고, options 인라인 배열이 useMemo를 무력화 | `apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:278`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:272`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:152`<br>`apps/web-admin/src/widgets/event-filters-panel/ui/filters-panel.tsx:95` |
| PERF-12 | P3 | S | CONFIRMED | 항상 빈 값을 내는 O(N) 계산 2건 — 헤더의 '핵심/주요' 칩은 영영 안 뜬다 | `apps/web-admin/src/features/event-filters/model/useEventFilters.ts:69`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:110`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:43`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:106` |
| PERF-14 | P3 | S | CONFIRMED | 목록 API가 응답마다 사건 수만큼 console.log를 찍음 | `apps/api/src/libs/event/presentation/event.controller.ts:550` |
| PERF-3 | P3 | M | CONFIRMED | autoLoadAll이 페이지 도착마다 누적분 전량을 재변환 — O(N²/pageSize) + 페이지당 렌더 2회 | `apps/web-admin/src/entities/event/model/useEvents.ts:137`<br>`apps/web-admin/src/entities/event/model/useEvents.ts:154`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:57`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:142` |
| PERF-4 | P3 | M | PLAUSIBLE | 필터·정렬 변경이 startTransition 없이 동기 실행 — 진행 표시 없는 프리즈 | `apps/web-admin/src/pages/events/list/events.page.tsx:245`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:680`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:690`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:109` |
| PERF-6 | P3 | S | CONFIRMED | 정렬 비교자 내부에서 ISO 정규식 파싱 — 정렬 키 사전계산 없음 | `apps/web-admin/src/features/event-filters/model/useEventFilters.ts:183`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:186`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:29`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:125` |
| PERF-8 | P3 | M | CONFIRMED | 타임라인 막대 위에 마우스를 올리기만 해도 전체 SVG가 재렌더 | `apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:397`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:412`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:3220`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:3723` |

**PERF-1 — 목록 응답이 모든 사건의 본문(MEDIUMTEXT)을 통째로 실어 옴**  
문제: GET /events(페이지네이션 목록)의 include가 최상위 사건의 `eventSections: { orderBy: { order: 'asc' } }`(:541)와 자식 사건의 `eventSections: true`(:517)를 모두 포함하고, toResponseDto가 `content: section.content`(:122)로 본문 전체를 직렬화한다. Event 섹션 content는 MEDIUMTEXT(16MB 상한)로 마이그레이션된 장문 필드다. 프론트는 이 값을 `HistoricalEvent.eventSections`(eventTransformers.ts:133)로 보관만 하고, 카탈로그 7개 뷰 전체(event-list-compact / grid / tree / gallery / timeline / map / dashboard)에서 `eventSections`를 참조하는 코드는 0건이다. 같은 컨트롤러 :952에는 "eventSections·eventImages는 카드가 쓰지 않는데 섹션 content(MEDIUMTEXT)까지 매 상세 응답에 실려 페이로드가 부풀었다 — 제거"라는 주석이 이미 있어, 동일 패턴이 다른 엔드포인트에서는 교정됐는데 정작 카탈로그 목록에는 남아 있다.  
영향: /events 첫 진입 시 pageSize=100(events.page.tsx:119)으로 100건 + 그 자식·손자의 **본문 전체**를 내려받는다. 게다가 autoLoadAll(:172)이 전 페이지를 자동 소진하므로 결국 DB의 모든 사건 본문이 브라우저로 넘어온다. 사용자는 제목·연도·카테고리 칩·국기만 보는 화면을 위해 수 MB의 텍스트 다운로드+JSON 파싱을 기다린다. 목록의 첫 행이 뜨는 시점(스켈레톤 종료)이 그만큼 뒤로 밀리고, 저속 회선에서는 스켈레톤이 수 초간 유지된다.  
권고: 목록 엔드포인트 include에서 `eventSections`를 제거(또는 `select: { id: true, title: true, order: true }`로 content 제외)하고, 자식/손자의 `eventSections: true`도 삭제한다. eventImages도 목록은 대표 1장만 필요하므로 `take: 1, where: { isPrimary: true }`로 축소. :952의 기존 주석이 이미 근거·패턴을 제공한다. 변경 후 `npm run build:nestia`로 SDK 재생성.
근거 정정: event.controller.ts:542(최상위 `eventSections: { orderBy: { order: 'asc' } }`), :517(자식 `eventSections: true`), :123(map 시작)/:126(`content: section.content`), :952(상세에서 제거했다는 주석) — 인용된 :541/:122는 각각 1~3줄 어긋남. 나머지(eventTransformers.ts:133, events.page.tsx:172)는 정확.

**PERF-13 — 가상화 재검토 — 차단 요인은 pseudo 오버플로 하나가 아니라 '형제 결합 CSS + 그룹 래퍼 부재' 2중 구조**  
문제: 선행 검토는 `content-visibility:auto`가 불가한 이유로 레일 `::before/::after`의 음수 오버플로만 들었다. 코드를 다시 보면 제약이 두 겹이다. ① `Stop::before`(:353-366)와 `::after`(:374-396)가 `left: calc(-1 * var(--rail-inset) - depth*22px)` = 행 밖 최대 -38px에 그려지므로 paint containment에 잘린다 — 이 제약은 여전히 유효하다. ② 추가로 `Stop`은 `&:last-of-type, &:has(+ button)`(:322-325)으로 **형제 관계에 의존**해 border를 지우고, 세기/연도 divider는 같은 평면의 형제이며 `position: sticky`(list.styles.ts:538, :678)에 세기 헤더는 `backdrop-filter: blur(10px) saturate(160%)`(:691)까지 쓴다. 그리고 렌더 루프는 그룹을 `React.Fragment`로 감싸므로(event-compact-list.tsx:330) **그룹 단위 DOM 래퍼가 존재하지 않는다** → 연도 그룹 단위 지연 렌더도 지금 구조로는 불가능하다. 즉 윈도잉은 `:has(+ button)`/`:last-of-type`/sticky를 동시에 깨뜨리고, content-visibility는 pseudo에 막히고 그룹 적용도 래퍼가 없어 막힌다.  
영향: 현재 152행에 15,508px(선행 실측)라는 DOM 높이가 사건 수에 선형 비례하고, autoLoadAll이 전량을 밀어 넣으므로 완화 장치가 하나도 없다. 게다가 세기 헤더의 backdrop-filter는 스크롤 프레임마다 재합성 비용을 더한다. 데이터가 수천 건이 되면 스크롤 버벅임과 탭 프리즈로 나타난다.  
권고: 차단 요인을 실제로 푸는 최소 리팩터: ① 레일 도트/커넥터를 행 **내부**로 옮긴다 — `Stop`에 `padding-left: var(--rail-inset)`를 주고 pseudo의 `left`를 양수로 바꾸면 오버플로가 사라져 `content-visibility: auto; contain-intrinsic-size: 0 44px;`를 행 단위로 바로 적용할 수 있다(가장 저렴한 1차 완화, 코드 변경 국소). ② 형제 결합 셀렉터(`:has(+ button)`, `:last-of-type`)를 JS 계산 prop(`$isLastInGroup`)으로 대체하면 그 다음 단계인 `@tanstack/react-virtual` 도입 시 divider row + event row를 한 배열로 사전 평탄화하는 표준 경로가 열린다. ③ 세기 헤더의 backdrop-filter는 solid 배경으로 강등(연 헤더는 이미 2차 구현에서 solid로 내려간 전례가 있다).

**PERF-2 — 참조 데이터 `?? []`가 매 렌더 새 배열 → 필터·정렬·타임라인 메모 체인 전체 붕괴**  
문제: useCatalogReferenceData가 `dbCategories: categoriesQuery.data ?? []`처럼 4개 쿼리 모두 `?? []`로 폴백한다(:42-47). data가 undefined인 동안 `[]`는 **렌더마다 새 배열 리터럴**이라 참조가 매번 바뀐다. 이 값들이 메모 의존성 사슬의 뿌리다: `countryContinentMap` useMemo([countries], :60) → `filteredEvents` useMemo(deps에 countryContinentMap 포함, :166-175) → `sortedEvents` → `flattenedHierarchy` → EventCompactList 그룹핑 / EventTimeline `countryLaneInfo`([continents, countries], :512) → `allBars`(:593) → `bars` → `renderResult`(라벨 충돌·클러스터링 패스). 즉 참조 쿼리가 하나라도 미해결이면 **모든 useMemo가 매 렌더 무효화**되어 전체 파이프라인이 렌더마다 처음부터 재계산된다.  
영향: 첫 진입 후 참조 쿼리 4개가 전부 resolve될 때까지(수백 ms) 발생하는 모든 렌더 — 페이지 도착, URL 동기화, 키 입력, 마우스 hover — 가 필터+정렬+평탄화+타임라인 레이아웃 전량 재계산을 유발한다. 더 심각한 건 실패 케이스다: 4개 중 하나라도 실패해 data가 영구 undefined면(이 훅은 실패해도 나머지를 살리는 설계라 앱이 멈추지 않고 그냥 계속 돈다) **세션 내내** 모든 렌더가 전체 파이프라인을 재실행한다 — hover 한 번, 키 한 번에 타임라인 전체 레이아웃이 다시 계산되어 지속적인 버벅임으로 나타난다.  
권고: 모듈 스코프 상수 `const EMPTY: readonly never[] = []`를 두고 `categoriesQuery.data ?? EMPTY` 형태로 4개 모두 안정 참조를 반환한다(타입은 각 DTO 배열로 캐스팅). 훅 반환 객체 자체도 useMemo로 감싸 소비처의 얕은 비교를 돕는다. 1줄짜리 수정이지만 파급이 가장 크다.
근거 정정: use-catalog-reference-data.ts는 return 블록 :42, `?? []` 4건은 :43-46. event-timeline.tsx:593은 allBars의 *deps 배열* 줄이고 정의는 :528(countryLaneInfo는 :512 정의·:524 deps로 정확).

**PERF-5 — 검색어 한 글자마다 페이지 전체가 2번 렌더 — URL 동기화가 디바운스 밖에 있음**  
문제: `keywordInput`은 매 키 입력마다 갱신되는 즉시 상태다(events.page.tsx:256). 그런데 상태→URL 동기화 효과의 의존성 배열에 **디바운스되지 않은 `keywordInput`이 그대로** 들어 있다(use-catalog-url-sync.ts:184-197). 따라서 키 입력 1회당 ① setKeywordInput으로 렌더, ② 효과가 `setSearchParams(next, {replace:true})`를 호출해 searchParams 객체가 바뀌며 라우트 서브트리 렌더 — 총 2회 렌더가 발생한다. 두 렌더 모두 `EventCompactList`(memo 아님)와 `EventTimeline`(memo 아님, 데스크톱 기본 뷰, events.page.tsx:566)을 통과한다. 카탈로그 전체에서 `React.memo`는 `EventListItem` 단 하나뿐이라(widgets 전역 grep 결과), 타임라인은 5,596줄 함수 본문 재실행 + `renderItems.map`(event-timeline.tsx:3066)으로 전 막대의 SVG 엘리먼트를 새로 만들어 재조정한다.  
영향: 데스크톱 기본 진입은 타임라인 뷰다. 여기서 검색창에 '나폴레옹'을 치면 6글자 × 2렌더 = 12회의 전체 SVG 재조정이 일어나 글자가 뚝뚝 끊겨 들어가고, 커서가 뒤늦게 따라온다. 정작 검색 결과는 250ms 디바운스 뒤에야 반영되므로, 이 12회 렌더는 전부 결과와 무관한 낭비다.  
권고: URL 동기화 효과의 의존성을 `keywordInput` 대신 `debouncedKeyword`로 바꾸고(효과 본문의 `setOrDel('q', ...)`도 동일 값 사용), 검색 중 URL이 뒤늦게 따라오는 건 replace 동기화라 문제 없다. 함께 `EventCompactList`·`EventTimeline`을 `React.memo`로 감싸면 관련 없는 상태 변경(모달 open, wideMode 등)에서도 무거운 뷰가 보호된다.
근거 정정: events.page.tsx:566은 EventTimeline JSX 시작 :567. 나머지(:256 keywordInput, use-catalog-url-sync.ts:152 효과, :184-197 deps에 keywordInput)는 정확.

**PERF-7 — 페이지 크기(20/50/100) 변경 시 목록이 통째로 사라졌다 처음부터 다시 로드**  
문제: `buildQueryKey`가 `pageSize`를 queryKey에 포함하므로(useEvents.ts:73) 페이지 크기 셀렉트를 바꾸면 완전히 다른 쿼리가 되고, `useInfiniteQuery`에 `placeholderData`(v5의 keepPreviousData)가 지정되어 있지 않다(:81-120). 따라서 `query.data`가 즉시 undefined가 되어 `events`는 `[]`(:154-155), 페이지는 `isLoading && events.length === 0`(events.page.tsx:526)으로 스켈레톤 분기에 진입한다. 동시에 autoLoadAll이 offset 0부터 다시 전 페이지를 소진한다. 같은 문제가 `countryId` 변경(국가 상세 임베드)에도 적용된다.  
영향: 사용자가 '한 번에 불러올 사건 수'를 20→100으로 바꾸는 순간(catalog-main-content.tsx:267-276), 이미 보고 있던 목록이 전부 사라지고 스켈레톤이 뜬 뒤 처음부터 다시 받아온다. 스크롤 위치도 초기화되고, 방금 읽던 지점을 다시 찾아야 한다. 이 컨트롤은 '더 편하게 보려고' 만지는 옵션인데 결과는 가장 파괴적인 재로딩이다.  
권고: `useInfiniteQuery`에 `placeholderData: (prev) => prev`(v5 keepPreviousData 대체)를 추가해 새 pageSize 데이터가 도착할 때까지 이전 결과를 유지하고, `isFetching`으로 상단에 얇은 진행 바만 노출한다. 셀렉트 변경도 startTransition으로 감싸면 컨트롤 자체의 반응성이 유지된다.

**PERF-9 — 타임라인 SVG 폭이 사건 수가 아닌 '연도 범위'에 비례 — 고대 사건 1건이 SVG를 수 배로 부풀리고 '전체 맞춤'이 구조적으로 불가**  
문제: `computePxPerYear`가 `base = Math.max(fit, PIXELS_PER_YEAR_DEFAULT * 0.5)`로 **연당 12px 바닥**을 두고(:631-646, PIXELS_PER_YEAR_DEFAULT=24 :176), `timelineWidth = yearSpan × pixelsPerYear`(:663), `svgWidth = 115 + timelineWidth + 236`(:763)이다. ZOOM_MIN=0.5(:182)이므로 실효 최소 밀도는 6px/년이다. 현재 데이터(867~2025, span≈1160)로 계산하면 최소 SVG 콘텐츠 폭 ≈ 6,960px이고 기본 진입은 의도적으로 화면폭 2.5배 프레이밍을 쓴다(:1105 INITIAL_VIEW_WIDTH_FACTOR). `fitAll`(:1083-1096)은 targetZoom을 ZOOM_MIN으로 clamp하므로 span이 넓으면 **아무리 눌러도 전체가 화면에 안 들어온다**. 그리고 `renderResult`(:1486-1884)는 viewport와 무관하게 `barsSortedByLane` 전량을 순회해 막대/마일스톤/클러스터/라벨을 만든다 — 가로 방향 가상화가 전혀 없다.  
영향: '전체 맞춤' 버튼을 눌러도 전체가 안 보이고 여전히 약 7화면분을 가로로 스크롤해야 한다(현재 데이터 기준). 더 심각한 건 확장성이다: 기원전 3000년 사건 **단 1건**을 등록하면 span이 5,000년이 되어 SVG 폭이 30,000px 이상으로 뛰고, 사건 수는 그대로인데 스크롤·줌·페인트 비용만 5배가 된다. 즉 데이터 한 건이 모든 사용자의 타임라인 성능을 떨어뜨린다.  
권고: ① `pixelsPerYear` 바닥값을 상수 대신 `min(containerInnerWidth / yearSpan, DEFAULT)`처럼 컨테이너 기준으로 재정의해 fitAll이 실제로 fit하게 만들고, ZOOM_MIN을 span에 따라 동적으로 낮춘다. ② renderResult에 viewport 윈도잉을 도입 — `viewportYears`(:853)가 이미 계산돼 있으므로 `barsSortedByLane` 순회 시 `[viewportStart - margin, viewportEnd + margin]` 밖 막대를 건너뛰면 된다(라벨 충돌 해소는 창 안에서만 수행). ③ 사건이 희소한 구간을 접는 시간축 압축(break axis)은 별도 검토.
근거 정정: timelineWidth는 :663이 아니라 **:652**(`const timelineWidth = Math.ceil(yearSpan * pixelsPerYear)`), INITIAL_VIEW_WIDTH_FACTOR는 :1105가 아니라 **:1109**. 나머지(:631 computePxPerYear, :643 base floor, :763 svgWidth, :1083 fitAll, :176/:182 상수, :1505 barsSortedByLane 전량 순회)는 정확.

**PERF-10 — 타임라인의 자동 로드 상한(25배치)이 페이지의 autoLoadAll에 의해 무력화 — '더 보기' CTA도 오안내**  
문제: 타임라인은 `AUTO_LOAD_MAX_BATCHES = 25` 상한과 `autoLoadCapped` 상태, 수동 '더 보기' 경로(:452-476)를 갖고 있고 주석은 이 장치의 목적을 "이전엔 hasMore가 false가 될 때까지 전 테이블을 무한 자동 fetch해, 사건 수가 많으면 매 페이지마다 변환·필터·flatten·bars 재빌드가 폭주했다"라고 명시한다. 그러나 페이지가 `useEvents({ autoLoadAll: true })`(events.page.tsx:172)를 쓰고, useEvents 내부 효과(:137-152)는 hasNextPage인 동안 **무조건** fetchNextPage를 연쇄한다. 타임라인이 onLoadMore 호출을 멈춰도 데이터 소진은 useEvents가 계속한다. 즉 상한 장치는 실효가 0인 죽은 안전장치다.  
영향: 주석이 경고한 폭주(페이지마다 변환→필터→평탄화→bars→renderResult 전량 재빌드)가 대규모 데이터에서 그대로 재현된다. 게다가 26번째 배치부터 `autoLoadCapped`가 true가 되어 '더 보기' CTA가 뜨는데, 뒤에서는 useEvents가 여전히 자동으로 계속 받고 있다 — 사용자는 '멈췄으니 눌러야 하나' 싶어 누르지만 실제로는 아무 의미 없는 클릭이고, 화면은 계속 혼자 갱신된다.  
권고: 소진 정책을 한 곳으로 일원화한다. 타임라인의 상한을 진짜 정책으로 삼겠다면 events.page의 `autoLoadAll: true`를 제거하고 뷰가 onLoadMore로 제어하게 하거나, 반대로 useEvents에 `maxAutoPages` 옵션을 추가해 상한을 데이터 레이어로 올리고 타임라인의 중복 효과(:461-469)를 삭제한다. 어느 쪽이든 `autoLoadCapped` UI는 실제로 로딩이 멈춘 상태에서만 뜨도록 배선해야 한다.
근거 정정: AUTO_LOAD_MAX_BATCHES 선언은 :458(인용 :452는 그 위 주석 블록 시작), 자동 로드 효과는 :461-469, handleManualLoadMore는 :472. events.page.tsx:172·useEvents.ts:137은 정확.

**PERF-11 — 국가 필터 팝오버 — 검색 시작 순간 50개 상한이 풀리고, options 인라인 배열이 useMemo를 무력화**  
문제: 두 가지가 겹친다. ① 표시 상한이 `maxVisible !== undefined && !query.trim()`일 때만 적용된다(:278-281). 즉 검색어를 **한 글자라도 입력하는 순간** `maxVisible={50}`(:160)이 해제되고 `filtered` 전량이 렌더된다. 옵션 집합은 현대 국가 전부 + 역사 국가 전부(`allCountryOptions`, :95-108)라 수백 개 규모다. ② `options` prop이 호출부에서 매 렌더 새 배열 리터럴로 만들어지고(`[{ id: FILTER_ALL, name: '전체' }, ...allCountryOptions]`, :152-156), `filtered` useMemo의 의존성이 `[options, query]`(:272-276)이므로 이 메모는 **절대 캐시 히트가 나지 않는다** — 부모가 렌더될 때마다 전체 옵션을 다시 `.filter()`한다.  
영향: 국가 필터를 열고 '프' 한 글자를 치면 상한이 풀려 수백 개 옵션 버튼(styled-components 인스턴스 포함)이 한 번에 렌더되고, 이어지는 글자마다 같은 일이 반복돼 입력이 눈에 띄게 밀린다. 정작 검색은 후보를 좁히려고 하는 행동인데 결과는 정반대다. 또한 팝오버를 열어두지 않아도, 메인 검색창 타이핑 등으로 부모가 렌더될 때마다 옵션 필터링이 헛돈다.  
권고: ① `visibleList` 계산에서 query 조건을 빼고 항상 상한을 적용한다(`filtered.slice(0, maxVisible ?? filtered.length)`), 검색 중에는 상한을 조금 올리되(예: 100) `truncated` 안내는 유지. ② `options`를 호출부에서 `useMemo`로 감싸 안정 참조로 만든다(카테고리·대륙 팝오버도 동일). ③ 소문자 변환 결과를 옵션 생성 시 미리 붙여두면 키 입력당 `toLowerCase()` 재할당도 사라진다.
근거 정정: options 인라인 배열은 :151-154(`...allCountryOptions`가 :153), maxVisible={50}은 :160. filtered useMemo :272-276, visibleList :278-281, allCountryOptions :95-108은 정확.

**PERF-12 — 항상 빈 값을 내는 O(N) 계산 2건 — 헤더의 '핵심/주요' 칩은 영영 안 뜬다**  
문제: ① `availableCountries` useMemo(useEventFilters.ts:69-77)는 `event.countries`를 순회해 Set을 만들고 `localeCompare`로 정렬하는데, transformer가 `countries: []`를 고정으로 넣으므로(eventTransformers.ts:110) 결과는 **항상 빈 배열**이다. 게다가 events.page는 이 값을 구조분해하지도 않는다(:204 부근에서 availableCenturies만 받음). ② `CatalogHeaderStats`(catalog-header-stats.tsx:43-73)는 `e.hierarchy?.importance`로 critical/major를 집계하는데, `buildHierarchy`가 `importance: 'notable' as const`를 하드코딩한다(eventTransformers.ts:106의 노드 생성부, :70). 따라서 tierCount는 언제나 {critical:0, major:0}이고 :85-102의 두 칩이 렌더되지 않는다 — 파일 상단 docstring이 예시로 든 `표시 1,247건 · 핵심 89 · 주요 234 · 정치 47` 중 가운데 두 항목은 나올 수 없다.  
영향: 사용자 입장: 헤더 통계 스트립에 약속된 '핵심 N · 주요 N' 지표가 어떤 데이터에서도 절대 표시되지 않는다(카테고리 TOP1만 뜬다). 개발 입장: events 배열이 바뀔 때마다(=페이지 도착마다, PERF-2 상황에선 매 렌더마다) 결과가 확정적으로 비어 있는 O(N) 순회 2건이 실행된다.  
권고: `availableCountries`는 소비처가 없고 소스 필드도 비어 있으므로 삭제한다(국가 목록이 필요하면 `relatedCountries` 기반으로 재작성). importance는 서버 응답에 실제 필드가 없으면 헤더의 tier 칩과 EventListItem의 별(★) 표시를 제거하거나, DTO에 importance를 추가하고 transformer가 그 값을 싣도록 배선한다 — 둘 중 하나로 정직하게 정리해야 '왜 별이 하나도 안 보이지'라는 후속 혼란이 없다.
근거 정정: eventTransformers.ts에서 `importance: 'notable' as const`는 **:71**(buildHierarchy 노드 생성부)이며 인용된 :106은 해당 코드가 아니다. `countries: []`는 :110, availableCountries는 useEventFilters.ts:69-77, CatalogHeaderStats 집계는 catalog-header-stats.tsx:43-73으로 정확.

**PERF-14 — 목록 API가 응답마다 사건 수만큼 console.log를 찍음**  
문제: 페이지네이션 목록 핸들러가 응답 직전에 `console.log('✅ N개 최상위 사건 반환')` 후 `events.forEach(evt => console.log(...))`로 **사건 1건마다 한 줄씩** 로그를 출력한다(:550-553). limit=100이면 요청당 100줄 이상, autoLoadAll이 전 페이지를 소진하므로 사용자 1명의 첫 진입에 수백 줄이 찍힌다.  
영향: stdout 쓰기는 동기 blocking이라 응답 생성이 그만큼 지연되고, 이 지연은 사용자가 스켈레톤을 보는 시간에 그대로 더해진다. 로그가 실제 오류를 덮어 운영 중 원인 추적도 어려워진다.  
권고: per-event forEach 로그를 삭제하고, 요약 로그가 필요하면 Nest Logger를 debug 레벨로 1줄만 남긴다(개수·소요시간).
근거 정정: 실제 위치는 event.controller.ts:551-553(`console.log('✅ ...')` + `events.forEach(evt => console.log(...))`). 인용 :550은 1줄 위.

**PERF-3 — autoLoadAll이 페이지 도착마다 누적분 전량을 재변환 — O(N²/pageSize) + 페이지당 렌더 2회**  
문제: autoLoadAll 효과(useEvents.ts:137-152)가 hasNextPage인 동안 무조건 다음 페이지를 연쇄 요청하고, `events` useMemo(:154-160)는 매번 `query.data.pages.flat()` **전체**를 `transformEventsFromApi`에 다시 넣는다. 변환은 증분이 아니라 전량이며, `buildHierarchy`(eventTransformers.ts:57-74)는 노드마다 `new Set(seen)`을 새로 복사하고, 마지막에 모든 이벤트를 새 객체로 재구성한다(:142). 결과 배열·모든 원소가 새 아이덴티티라 downstream 메모(childrenByParent, filteredEvents, sortedEvents, flattenedHierarchy, useCatalogEventIndex의 두 Map, EventCompactList의 eventById·그룹핑, 타임라인 allBars→renderResult)가 전부 무효화된다. 여기에 useEventHierarchy의 자동 펼침 효과(:60-78)가 새 부모를 발견할 때마다 setState를 하므로 **페이지당 평탄화+렌더가 2회** 발생한다.  
영향: 현재 데이터(최상위 110건, pageSize 100)에서는 초기 진입에 참조 4 + count 1 + 사건 2 = 7회 왕복, 파이프라인 2회 실행, 렌더 4회 정도로 체감 문제가 없다. 그러나 최상위가 2,000건이 되면 20페이지 × (전량 재변환 + 전량 필터·정렬·평탄화 + 미가상화 DOM 재조정 × 2렌더)가 되어 변환 누계만 100+200+…+2000 ≈ 21,000건이다. 사용자는 첫 100건이 그려진 뒤에도 목록이 계속 위아래로 재정렬되며 스크롤이 튀고, 그 동안 클릭·타이핑이 씹힌다.  
권고: ① 변환을 증분화: 이미 변환한 페이지 결과를 페이지 인덱스별로 캐시하고 새 페이지분만 변환한 뒤 concat(참조 안정성도 함께 확보). ② autoLoadAll을 무제한 소진 대신 상한/임계(serverTotal이 임계 이하일 때만 전량, 초과 시 명시적 '더 보기')로 전환. ③ 근본책은 서버 정렬을 `COALESCE(start_date, start_year)`로 바꿔 클라 전역 재정렬 의존 자체를 제거하는 것(선행 검토에서도 근본책으로 지목됨).

**PERF-4 — 필터·정렬 변경이 startTransition 없이 동기 실행 — 진행 표시 없는 프리즈**  
문제: 페이지에서 `useTransition`은 **viewMode 전환에만** 쓰인다(events.page.tsx:245-249 `changeViewMode`). 정렬 기준(:680-688), 정렬 방향(:690-692), 카테고리/국가/대륙/세기 세터, 북마크 토글은 전부 raw setState다. 이 상태들이 바뀌면 `filteredEvents`(useEventFilters.ts:109-175, 술어 안에서 `getCenturyFromDate` 2회 + `title/description.toLowerCase()` + 자식 재귀) → `sortedEvents`(:178-207) → `flattenedHierarchy` → 그룹핑 → 미가상화 전 행 재조정이 **한 렌더 안에서 동기로** 실행된다. 로딩 인디케이터도 없다(검색어의 `isSearchPending` 스피너는 디바운스 대기 구간만 덮고, 실제 계산 구간은 덮지 않는다 — events.page.tsx:258).  
영향: 카테고리 칩이나 정렬 방향을 누르면 결과가 나올 때까지 화면이 아무 반응 없이 굳는다. 눌린 상태 피드백도, 스피너도 없어서 사용자는 '안 눌렸나' 하고 다시 누르게 되고, 그러면 같은 동기 작업이 한 번 더 쌓인다. 153건에서는 짧지만, 데이터가 늘수록 이 무반응 구간이 그대로 길어진다.  
권고: 정렬·필터 세터를 `startTransition`으로 감싸고 `isPending`을 툴바 칩/정렬 버튼의 시각 상태(예: 반투명 + aria-busy)에 배선한다. 이미 `changeViewMode`가 같은 패턴을 쓰고 있어 규약 추가 없이 확장 가능하다. 추가로 `useDeferredValue(sortedEvents)`로 리스트 렌더만 뒤로 미루면 툴바 반응성은 즉시 확보된다.

**PERF-6 — 정렬 비교자 내부에서 ISO 정규식 파싱 — 정렬 키 사전계산 없음**  
문제: `sortedEvents`의 비교자가 `startKey(a) - startKey(b)`(useEventFilters.ts:183-199)를 호출하는데 `startKey`는 `dateSortKey` → `parseIsoDateParts`로 **비교 때마다 정규식 match**를 돌린다(iso-date.ts:30-53). 'duration' 정렬은 `isoYearSpan`이 파싱을 2회씩 하므로 비교당 4회다. 같은 패턴이 `useEventHierarchy.compareNodes`(:29-43)에도 있고, 평면(flat) 뷰에서는 평탄화된 **전체 배열**에 이 비교자로 sort를 건다(:125-134). 정렬 키를 미리 한 번 계산해 붙여두는(Schwartzian) 처리가 없다.  
영향: 정렬 방향 토글이나 필터 변경마다 O(N log N) 비교 × 2~4회 정규식이 돈다. 최상위 2,000건이면 약 22,000회 비교 → 44,000~88,000회 문자열 파싱이 한 프레임 안에서 실행되고, PERF-4대로 transition도 없어 그 시간만큼 UI가 굳는다. 사용자는 '↑↓ 화살표 한 번 눌렀는데 화면이 멈춘다'로 겪는다.  
권고: 정렬 전에 `const keyed = filteredEvents.map(e => ({ e, k: dateSortKey(e.startDate) ?? Number.NEGATIVE_INFINITY, span: isoYearSpan(e.startDate, e.endDate) }))`로 키를 1회 계산하고 그 배열을 정렬한 뒤 `.map(x => x.e)`로 되돌린다. `compareNodes`도 동일하게 노드별 키를 사전 계산해 넘기도록 시그니처를 바꾼다. 파싱 횟수가 O(N log N)에서 O(N)으로 떨어진다.
근거 정정: iso-date.ts의 parseIsoDateParts는 :29 시작이고 정규식 match는 :33(인용 :30은 함수 내부 첫 줄). 나머지(useEventFilters.ts:183 startKey, :186 sort, useEventHierarchy.ts:29 compareNodes, :125 flat 전량 sort)는 정확.

**PERF-8 — 타임라인 막대 위에 마우스를 올리기만 해도 전체 SVG가 재렌더**  
문제: `tooltip`(:397-403), `hoveredBarId`(:412), `hoveredCategory`(:406), `focusedBarId`(:432)가 모두 컴포넌트 최상위 useState다. 막대의 onMouseEnter(:3220)와 우측 레일 행의 onMouseEnter(:3723)가 각각 `setHoveredBarId`를, showTooltip(:1250)이 `setTooltip`을 호출한다. EventTimeline 내부에는 `React.memo`로 분리된 하위 컴포넌트가 하나도 없으므로(widgets 전역 grep에서 memo는 event-list-item.tsx 단 1건), hover 1회마다 5,596줄 함수 본문이 다시 실행되고 `renderItems.map`(:3066)이 전 막대·클러스터의 SVG 엘리먼트를, `viewportBars.items.map`(:3716)이 최대 RAIL_CAP=300행(:2217)을 새로 만들어 재조정한다.  
영향: 타임라인에서 가장 잦은 인터랙션이 '막대 위를 훑으며 툴팁 읽기'인데, 마우스가 막대를 지날 때마다 수백 개 SVG 노드가 재조정된다. 툴팁이 늦게 뜨거나 마우스를 따라오지 못하고, 빠르게 훑으면 hover 하이라이트가 끈적하게 밀린다. 우측 레일에서 마우스를 위아래로 움직여도 같은 비용이 반복된다.  
권고: ① hover/tooltip 상태를 별도 컨텍스트나 하위 컴포넌트로 내려 상위 재렌더에서 분리하고, 막대 하이라이트는 상태 대신 CSS `:hover`/`data-hovered` 속성 직접 조작으로 처리한다(이미 syncLaneLabels가 :857에서 setAttribute 직접 조작 패턴을 쓰고 있다). ② 최소 조치로 `renderItems.map`이 만드는 막대 그룹을 `React.memo` 컴포넌트로 추출해 id/좌표가 같으면 재조정을 건너뛰게 한다.


### DATA — 데이터 정직성 (15건)

| id | 심각도 | 공수 | status | 항목 | 근거 |
|---|---|---|---|---|---|
| DATA-1 | P1 | M | CONFIRMED | 부모 사건을 삭제하면 살아있는 하위 사건이 카탈로그에서 통째 실종 | `apps/api/src/libs/event/application/event.service.ts:1147`<br>`apps/api/src/libs/event/presentation/event.controller.ts:488`<br>`apps/api/src/libs/event/presentation/event.controller.ts:660`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:158` |
| DATA-11 | P2 | M | CONFIRMED | JSON 내보내기가 실데이터가 아닌 자리표시자를 배포 (type 'battle' 고정·사상자 0·정밀도 없음) | `apps/web-admin/src/entities/event/model/eventTransformers.ts:90`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:100`<br>`apps/web-admin/src/pages/events/list/lib/export-events.ts:16`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:202` |
| DATA-2 | P2 | S | CONFIRMED | 상세 드로어 '기간'이 네이티브 Date — 없는 날짜를 단정, BC는 NaN | `apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:90`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:95`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:229`<br>`apps/api/src/libs/event/presentation/event.controller.ts:78` |
| DATA-3 | P2 | M | CONFIRMED | startDatePrecision이 변환 단계에서 유실 — 없는 '일'을 지어내 표기 | `apps/web-admin/src/entities/event/model/eventTransformers.ts:87`<br>`apps/web-admin/src/entities/event/model/types.ts:155`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:154`<br>`apps/web-admin/src/pages/events/list/components/catalog-overlay-modals.tsx:185` |
| DATA-5 | P2 | M | CONFIRMED | 한 화면의 '건수'가 서로 다른 3개 모수 — 표시(152) > 등록 전체(110) | `apps/web-admin/src/pages/events/list/events.page.tsx:769`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:138`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:307`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:47` |
| DATA-6 | P2 | M | CONFIRMED | 필터가 최상위에만 적용돼 조건을 위반하는 행·세기가 그대로 노출 | `apps/web-admin/src/features/event-filters/model/useEventFilters.ts:157`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:164`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:145`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:105` |
| DATA-7 | P2 | M | CONFIRMED | 중요도가 하드코딩 'notable' — 별·핵심/주요 통계가 영구히 죽어 있고 '핵심 0건'을 사실처럼 보고 | `apps/web-admin/src/entities/event/model/eventTransformers.ts:71`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:84`<br>`apps/web-admin/src/pages/events/list/components/catalog-header-stats.tsx:48`<br>`apps/web-admin/src/widgets/event-dashboard-view/ui/event-dashboard-view.tsx:99` |
| DATA-8 | P2 | S | CONFIRMED | 통계 뷰 '데이터 품질' 카드가 구조적으로 항상 거짓 (좌표·출처 100% 누락, 분류 누락 0) | `apps/web-admin/src/widgets/event-dashboard-view/ui/event-dashboard-view.tsx:103`<br>`apps/web-admin/src/widgets/event-dashboard-view/ui/event-dashboard-view.tsx:116`<br>`apps/web-admin/src/widgets/event-dashboard-view/ui/event-dashboard-view.tsx:120`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:124` |
| DATA-9 | P2 | M | CONFIRMED | 지도 뷰는 영구 빈 화면 — 좌표 필드가 스키마에 없는데 '좌표를 추가하라'고 안내 | `apps/web-admin/src/entities/event/model/eventTransformers.ts:124`<br>`apps/web-admin/src/widgets/event-map-view/ui/event-map-view.tsx:76`<br>`apps/web-admin/src/widgets/event-map-view/ui/event-map-view.tsx:180`<br>`apps/web-admin/src/widgets/event-map-view/ui/event-map-view.tsx:74` |
| DATA-10 | P3 | M | CONFIRMED | 북마크가 계정·삭제와 무관한 전역 localStorage — 배지 숫자가 실재하지 않는 사건을 셈 | `apps/web-admin/src/shared/hooks/use-bookmarks.hook.ts:6`<br>`apps/web-admin/src/shared/hooks/use-bookmarks.hook.ts:14`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:667`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:196` |
| DATA-12 | P3 | M | CONFIRMED | 데스크톱 기본 뷰(타임라인)의 막대 좌표가 네이티브 Date — BC 사건은 NaN 위치 | `apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:541`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:543`<br>`apps/web-admin/src/widgets/event-timeline/ui/event-timeline.tsx:1519`<br>`apps/web-admin/src/shared/lib/iso-date.ts:115` |
| DATA-13 | P3 | S | CONFIRMED | 카테고리 미지정 사건이 '기타'로 둔갑 + 가짜 id 때문에 '기타' 필터로는 안 잡힘 | `apps/web-admin/src/entities/event/model/eventTransformers.ts:79`<br>`apps/web-admin/src/features/event-filters/model/useEventFilters.ts:112`<br>`apps/api/prisma/seeds/eventCategory.seed.ts:21`<br>`apps/web-admin/src/widgets/event-dashboard-view/ui/event-dashboard-view.tsx:120` |
| DATA-14 | P3 | S | CONFIRMED | '기간순' 정렬이 연 단위라 1년 미만 사건은 전부 동률 — 정렬해도 순서가 안 바뀜 | `apps/web-admin/src/features/event-filters/model/useEventFilters.ts:190`<br>`apps/web-admin/src/shared/lib/iso-date.ts:141`<br>`apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts:38`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:257` |
| DATA-15 | P3 | S | CONFIRMED | '최근 본 사건' 드롭다운이 BC를 '-44년'으로 표기하고, 미로드·삭제 사건은 조용히 사라짐 | `apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:86`<br>`apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:101`<br>`apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:44`<br>`apps/web-admin/src/shared/hooks/use-recent-events.hook.ts:14` |
| DATA-4 | P3 | S | CONFIRMED | 종료일이 없는 사건을 전부 '1일짜리 사건'으로 표기 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:97`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:108`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:235`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:102` |

**DATA-1 — 부모 사건을 삭제하면 살아있는 하위 사건이 카탈로그에서 통째 실종**  
문제: deleteEvent는 대상 행의 deletedAt만 세팅하고 자식의 parentEventId는 손대지 않는다(event.service.ts:1147-1158). 반면 목록 API는 `parentEventId: null, deletedAt: null`인 최상위만 페이징하고(event.controller.ts:488), 자식은 오직 부모의 childEvents include를 통해서만 실려온다. 따라서 부모가 소프트삭제되면 그 부모는 루트 쿼리에서 빠지고, 살아있는 자식들은 여전히 parentEventId가 채워져 있어 루트도 아니어서 응답에 아예 포함되지 않는다. 권위 총개수(/events/count, event.controller.ts:660)도 루트만 세므로 사라진 자식 수는 어떤 숫자에도 반영되지 않는다.  
영향: 드로어에서 '제2차 세계대전'(하위 12건 보유)을 삭제하면, 삭제하지 않은 하위 12건이 목록·타임라인·격자·트리·통계 등 /events의 모든 뷰에서 동시에 사라진다. 확인 다이얼로그는 '이 사건을 삭제하시겠습니까 / 삭제 후에는 목록에서 복구할 수 없습니다'라고만 말할 뿐 하위 사건 동반 실종을 예고하지 않고, 삭제 후 헤더 카운트는 1만 줄어 사용자는 12건이 없어진 사실 자체를 알아채지 못한다. 되살리려면 부모를 복구해야 하는데 관리자 UI에 복구 동선이 없다.  
권고: ① 확인 다이얼로그에 살아있는 자식 수를 표시하고(‘하위 N건도 목록에서 함께 사라집니다’) 사용자가 선택하게 하거나, ② 서버 deleteEvent를 트랜잭션으로 감싸 자식도 함께 소프트삭제하거나(cascade), ③ 자식의 parentEventId를 null로 detach해 루트로 승격시키는 정책 중 하나를 정본으로 채택하라. updateEvent 쪽엔 이미 살아있는 자식만 detach하는 로직(event.service.ts:602-620)이 있으므로 그 규약을 삭제 경로에도 적용하는 것이 최소 변경이다.
근거 정정: 근거 라인 전부 실재·정확: event.service.ts:1147 `async deleteEvent`(1150-1158에서 deletedAt/deletedById만 세팅, 자식 무터치), event.controller.ts:488 `parentEventId: null` + :489 `createdById: userId` + :490 `deletedAt: null`, :660 count의 동일 `parentEventId: null`, event-detail-panel.tsx:158 handleConfirmDelete, :542 '삭제 후에는 목록에서 복구할 수 없습니다.'

**DATA-11 — JSON 내보내기가 실데이터가 아닌 자리표시자를 배포 (type 'battle' 고정·사상자 0·정밀도 없음)**  
문제: exportEventsAsJson은 HistoricalEvent 객체를 그대로 직렬화한다(export-events.ts:16). 그런데 이 객체의 상당수 필드는 transformer가 만든 고정 자리표시자다: `type: 'battle'`(모든 사건, :90), `stats.casualties {0,0,0}`·`participatingNations 0`·`durationInYears 0`(:100-105), `importance 'notable'`, tags/timeline/theaters/keyFigures/countries/influence 빈 배열(:97,107-111). 반대로 startDatePrecision·구조화 BC 필드(startEra/startYear)는 애초에 실려오지 않아 내보낸 파일로는 연도만 아는 사건과 1월 1일 사건을 구분할 수 없다. 부분 내보내기 경고는 serverTotal이 숫자일 때만 뜨므로(events.page.tsx:429-438) /events/count가 실패하면 경고 없이 조용히 일부만 내보낸다.  
영향: '현재 필터된 결과를 내보내기'를 믿고 받은 JSON에서 모든 사건의 종류가 'battle', 사상자가 0, 참전국이 0으로 적혀 있다. 이 파일을 백업·분석·이관에 쓰면 실제 DB와 다른 사실이 그대로 퍼진다. BC/고대 사건은 날짜 정밀도 정보가 통째로 빠져 재수입 시 1월 1일로 고착된다.  
권고: 내보내기용 직렬화기를 별도로 두고, transformer가 만든 자리표시자 필드는 제외하거나 실제 응답(EventResponseDto) 원본을 내보내라(precision·구조화 날짜 포함). 부분 내보내기 경고는 serverTotal 유무와 무관하게 hasMore가 true이면 항상 띄울 것.
근거 정정: export-events.ts:16은 `URL.createObjectURL(blob)` — 실제 직렬화 지점은 :14 `JSON.stringify(events, null, 2)`(HistoricalEvent 원형 그대로). 나머지 근거는 정확: eventTransformers.ts:90 `type: 'battle' as const`, :100-105 stats 0 고정, :71 importance, :97/107-111 빈 배열, catalog-toolbar.tsx:202-208 '현재 필터된 결과를 내보내기' 버튼, events.page.tsx:428-438 부분 경고 게이트.

**DATA-2 — 상세 드로어 '기간'이 네이티브 Date — 없는 날짜를 단정, BC는 NaN**  
문제: 목록 행을 클릭하면 열리는 EventDetailPanel이 `new Date(dateString)` + 로컬 게터로 날짜를 찍고(:90-93), 기간도 `end.getTime() - start.getTime()`으로 계산한다(:95-116). 서버는 start_date DATETIME이 없는 사건(서기 1000년 이전·BC)을 구조화 필드로 재구성하면서 월·일이 없으면 01/01로 채워 보낸다(event.controller.ts:78-93). 프로젝트 표준 파서 parseIsoDateParts(iso-date.ts:29)는 이 파일에서 전혀 쓰이지 않는다.  
영향: 연도만 아는 사건(로컬 DB에 start_date NULL·start_year 보유 23건)을 클릭하면 '867.01.01 (1일)'로, 즉 1월 1일 하루 동안 일어난 사건인 것처럼 단정 표기된다. 같은 사건의 목록 행은 sentinel 가드로 월·일을 숨기므로(event-list-item.tsx:159) 행과 드로어가 서로 다른 말을 한다. BC 사건을 등록하면 `-0044-03-15`가 Invalid Date가 되어 'NaN.NaN.NaN (NaN일)'이 뜨고, UTC 서쪽 타임존(미주)에서는 로컬 게터 때문에 날짜가 하루 앞으로 밀린다.  
권고: formatDate/calculateDuration을 폐기하고 shared/lib/iso-date의 formatDateWithPrecision + isoDaySpan(또는 EventListItem의 formatDuration처럼 IsoDateParts 기반 borrow 차분)으로 교체하라. 정밀도는 DATA-3 수정으로 전달되는 startDatePrecision/endDatePrecision을 넘겨 '867년'/'1592년 4월'까지만 쓰게 하고, 종료일 없는 사건에 '1일'을 붙이지 말 것(DATA-4).
근거 정정: 라인 정확: event-detail-panel.tsx:90-93 formatDate(new Date + 로컬 게터), :95-116 calculateDuration(getTime 차분), :229/:232 렌더, event.controller.ts:78 formatEventDate(`month ?? 1`, `day ?? 1`로 01/01 채움, BC는 `-YYYY-MM-DD`), iso-date.ts:29 parseIsoDateParts. 이 파일 import 목록(11-49행)에 @/shared/lib/iso-date 없음도 확인.

**DATA-3 — startDatePrecision이 변환 단계에서 유실 — 없는 '일'을 지어내 표기**  
문제: 서버 응답에는 startDatePrecision/endDatePrecision이 실려오고(event.response.ts:17-23) 프론트 타입에도 선언돼 있지만(types.ts:154-157), transformEventsFromApi가 반환 객체를 만들 때 두 필드를 매핑하지 않는다(eventTransformers.ts:87-138). 그 결과 목록 행의 precision 분기(event-list-item.tsx:150-163)는 언제나 `undefined`를 보고 'day 또는 미기록' 가지로 떨어지며, 요약 모달·트리는 아예 precision 인자를 넘기지 않아 formatDateWithPrecision이 기본값 'day'로 동작한다.  
영향: 월까지만 아는 사건(1592-04-01, precision='month')이 목록 행에 '4.1'로 찍혀 4월 1일에 일어난 것처럼 보인다. 01-01 sentinel 가드는 1월 사건만 막아줄 뿐 2~12월 월정밀 사건은 전부 가짜 일자를 얻는다. 요약 모달 부제와 계층 트리 카드는 연도만 아는 사건까지 '867년 1월 1일'로 단정한다. 정밀도를 정직하게 입력한 사용자일수록 화면이 더 크게 거짓말한다.  
권고: eventTransformers에 `startDatePrecision: evt.startDatePrecision ?? null`, `endDatePrecision: ...`을 추가하고, EventHierarchyNode.period에도 precision을 실어 요약 모달/트리(노드만 받는 컴포넌트)가 formatDateRange(start, end, sp, ep)를 호출할 수 있게 하라. 그 뒤 event-list-item.tsx:157의 '미기록=day 취급' 폴백을 '미기록=연도만 표시'로 뒤집어 보수적으로 만들 것.
근거 정정: 근거 정확: eventTransformers.ts:87-138 반환 객체에 startDatePrecision/endDatePrecision 키 없음, types.ts:154-157(및 events.types.ts:157) 선언 존재, event.response.ts:17-23 서버 응답 필드 존재, event-list-item.tsx:154 `event.startDatePrecision` 소비, catalog-overlay-modals.tsx:185-188 formatDateRange(2인자), tree-view.tsx:35 formatDateRange(2인자).

**DATA-5 — 한 화면의 '건수'가 서로 다른 3개 모수 — 표시(152) > 등록 전체(110)**  
문제: visibleCount=visibleFlattenedHierarchy.length(펼쳐진 자식 포함 '행 수'), totalCount=events.length(자식·손자 포함 '로드된 사건 수'), serverTotal=/events/count(최상위만) 세 값이 한 스트립에서 섞인다. isFiltered는 `visibleCount !== totalCount`로 판정하는데(catalog-main-content.tsx:138) 계층이 있으면 필터가 하나도 없어도 두 값은 절대 같지 않다. 게다가 CatalogHeaderStats의 카테고리 top1 카운트는 필터와 무관하게 events 전체를 센다(catalog-header-stats.tsx:47-53). 목록 하단 '총 N건'과 aria-label도 행 수 기준(event-compact-list.tsx:293,524)인 반면 연·세기 헤더 카운트는 depth 0만 센다(:301,:335).  
영향: 선행 실측(사건 153건·최상위 110·렌더 행 152) 기준으로, 필터를 하나도 걸지 않았는데 헤더가 '152건 … / 등록 전체 110건'을 표시한다 — 표시가 전체보다 많고, '필터 적용 전' 툴팁이 붙은 보조 표기까지 뜬다. 부모 하나를 접으면 '총 N건'이 줄어들어 사용자는 사건이 사라진 줄 안다. '표시 12건 · 전쟁 47' 처럼 하위 카운트가 총계보다 큰 조합도 정상적으로 나온다.  
권고: 카운트 모수를 '사건 수(고유 이벤트)'로 통일하라: visibleCount를 `new Set(visible.map(i=>i.node.id)).size`가 아니라 필터 통과 사건 수로 산출하고, isFiltered 판정은 rows 비교가 아니라 filtersOrSearchActive 플래그로 바꾼다. CatalogHeaderStats의 카테고리/티어 집계도 visible 집합을 입력으로 받게 하고, serverTotal이 최상위만 센다는 사실을 라벨에 명시하거나 count 엔드포인트에 하위 포함 옵션을 추가하라.
근거 정정: 라인 전부 정확: events.page.tsx:769 visibleCount=visibleFlattenedHierarchy.length, :770 totalCount=events.length, catalog-main-content.tsx:138 `const isFiltered = visibleCount !== totalCount`, :307-310 FilteredHint(+:140 authoritativeTotal=serverTotal??totalCount), catalog-header-stats.tsx:47-53(events 전체 순회) / :78(total=visibleCount??serverTotal??events.length), event-compact-list.tsx:301 yearEventCount(depth0만) / :524 '총 N건'(displayedCount=events.page.tsx:549의 행 수). 단 problem의 '계층이 있으면 두 값은 절대 같지 않다'는 과장 — 손자가 없고 모든 루트가 펼쳐지면 두 값은 같아진다(자동 펼침은 useEventHierarchy.ts:60-78에서 sortedEvents=루트만 대상이라 손자는 기본 접힘).

**DATA-6 — 필터가 최상위에만 적용돼 조건을 위반하는 행·세기가 그대로 노출**  
문제: filteredEvents는 '자기 또는 후손이 매칭되면 루트를 남긴다'는 술어로 루트만 걸러내고(useEventFilters.ts:157-165), 이후 useEventHierarchy는 남은 루트의 children을 매칭 여부와 무관하게 전부 push한다(계층 모드 :145, 평면 모드 :105-116). 즉 필터는 '어떤 루트를 보여줄지'만 결정하고 '무엇을 렌더할지'는 통제하지 못한다.  
영향: (a) 검색어 '노르망디'로 자식 1건만 매칭돼도 부모의 하위 20건이 전부 렌더되고 하이라이트는 1건에만 붙는다 — 결과 수가 실제 매칭보다 20배로 부풀고 '20건 중 어디가 매칭인지' 스캔해야 한다. (b) 세기 필터를 '20세기'로 걸어도, 20세기 자식을 가진 19세기 부모가 남아 목록 최상단에 '19세기 (1801–1900)' 세기 헤더와 그 부모 행이 뜬다. 사용자는 필터가 고장 났다고 느낀다. (c) 카테고리 '경제'를 걸어도 그 부모의 '전쟁' 자식 칩들이 함께 보인다.  
권고: matches() 술어를 flatten 단계로 내려 자식에도 적용하고(비매칭 자식은 렌더 제외, 단 매칭 자식을 가진 부모는 컨텍스트 행으로 유지하되 'N건 중 1건 일치' 같은 표시), 세기 필터처럼 시간축을 좁히는 필터는 부모 폴백 자체를 끄는 것이 정직하다. 최소 수정으로는 flatten 결과에 `isMatch` 플래그를 실어 비매칭 행을 흐리게 하고 카운트에서 제외하라.
근거 정정: 라인 정확: useEventFilters.ts:157-161 matchesSelfOrDescendant, :163-165 `events.filter(!parentEventId).filter(matchesSelfOrDescendant)`, useEventHierarchy.ts:145 계층 모드 `expandedEventIds.has(node.id) && node.children` → sortedChildren 전량 traverse, :105-116 평면 모드 addAllEventsFlat 전량 push, event-compact-list.tsx:141 flattenedHierarchy.forEach(렌더 그룹핑 진입점).

**DATA-7 — 중요도가 하드코딩 'notable' — 별·핵심/주요 통계가 영구히 죽어 있고 '핵심 0건'을 사실처럼 보고**  
문제: transformEventsFromApi가 모든 노드의 importance를 `'notable'` 리터럴로 채운다(eventTransformers.ts:71). Event 스키마·응답 DTO 어디에도 importance 필드가 없어(grep 결과 0건) 데이터 출처 자체가 존재하지 않는다. 그런데 UI 4곳이 이 값을 신호로 쓴다: 행의 ★★★/★★와 제목 크기·도트 크기(event-list-item.tsx:84-90, 224-233), 헤더 스트립의 '핵심/주요'(catalog-header-stats.tsx:48-51, 85-102), 통계 뷰의 티어 3분할(event-dashboard-view.tsx:99-101, 245-254), 요약 모달 트리의 중요도 배지(tree-view.tsx:24-33).  
영향: 목록에서 별은 단 한 번도 뜨지 않아 '중요도' 시각 위계가 통째로 죽어 있고(제목 15/14.5/14px 분기도 항상 14px), 헤더의 핵심·주요 항목은 조건부 렌더라 조용히 사라진다. 반면 통계 뷰는 '핵심 0 · 주요 0 · 일반 110'을 당당히 표시해 사용자가 '우리 DB엔 핵심 사건이 하나도 없다'고 오독한다. 요약 모달의 모든 하위 사건 카드에는 '일반' 배지가 붙는다.  
권고: 둘 중 하나를 고르라. ① importance를 실제 필드로 만든다(Event 스키마 + DTO + 등록 폼 + transformer 매핑). ② 데이터가 없다는 사실을 인정하고 별·티어 통계·트리 배지를 제거해 죽은 신호를 화면에서 걷어낸다. 최소한 통계 뷰의 '핵심 0/주요 0'은 '미집계'로 표기해 0건이라는 거짓 사실 주장은 즉시 없애야 한다.
근거 정정: 라인 정확: eventTransformers.ts:71 `importance: 'notable' as const`, event-list-item.tsx:84-90 tierFromNode / :224-233 별 렌더 / :513-516 제목 크기 분기, catalog-header-stats.tsx:48-51(집계)·85-102(조건부 렌더), event-dashboard-view.tsx:99-101(티어 집계)·245-254(핵심/주요/평범 칩), tree-view.tsx:25-31 중요도 배지.

**DATA-8 — 통계 뷰 '데이터 품질' 카드가 구조적으로 항상 거짓 (좌표·출처 100% 누락, 분류 누락 0)**  
문제: 품질 카드는 transformer가 만들어낸 자리표시자를 검사한다. `evt.map.markers`는 항상 `[]`로 하드코딩되고(eventTransformers.ts:124) `sources`는 아예 채워지지 않으며(반환 객체에 키 없음), category는 미지정이어도 '기타'로 채워진다(:79-80). 검사 코드는 각각 :103(hasCoords), :116(!evt.sources), :120(!evt.category)이다.  
영향: '데이터 품질' 카드가 언제나 '좌표 누락 = 전체 건수', '출처 없음 = 전체 건수', '분류 없음 = 0'을 표시한다. 실제로 카테고리를 지정하지 않은 사건이 있어도 0으로 나오고, 좌표·출처는 사용자가 아무리 데이터를 채워도 100%에서 내려가지 않는다. 셀을 클릭하면 '첫 번째 누락 사건으로 이동'하는데 사실상 무작위 사건으로 점프한다. 관리자용 품질 대시보드가 개선 우선순위를 정하는 데 전혀 쓸 수 없다.  
권고: 존재하지 않는 지표(좌표·출처)는 카드에서 제거하거나 '미지원'으로 표시하고, 분류 누락은 transformer의 '기타' 폴백 이전 값(evt.category?.id == null)을 별도 플래그로 실어 판정하라. 이미지·국가 누락처럼 실데이터 기반 지표만 남기면 카드가 다시 신뢰를 얻는다.
근거 정정: 라인 정확(1:1 일치): event-dashboard-view.tsx:103-107 hasCoords(evt.map?.markers), :116 `!evt.sources || evt.sources.length===0`, :120 `!evt.category`, eventTransformers.ts:124 `map: { summary:'', markers: [] }`, :79-80 category 폴백 '기타'. 품질 셀 렌더·점프는 :376-428.

**DATA-9 — 지도 뷰는 영구 빈 화면 — 좌표 필드가 스키마에 없는데 '좌표를 추가하라'고 안내**  
문제: EventMapView의 마커는 오직 `evt.map?.markers`에서만 나오는데(event-map-view.tsx:76-80), transformer가 이 값을 항상 `{summary:'', markers: []}`로 채운다. Event Prisma 모델·응답 DTO에는 위경도 필드 자체가 없다(grep latitude/longitude → 0건). 즉 allMarkers는 어떤 데이터에서도 0이며, 빈 상태 문구는 '사건 등록 시 map.markers에 좌표를 추가하면 여기에 표시됩니다'라고 안내한다(:180-190).  
영향: 3개 주요 뷰 세그먼트 중 하나인 '지도'를 누르면 데이터 상태와 무관하게 항상 '아직 좌표 데이터가 없습니다'가 뜨고, 안내대로 하려 해도 사건 등록 폼에 좌표 입력란이 없어 사용자가 따라 할 방법이 없다. 뷰 힌트는 '지리적 위치 — 좌표가 있는 사건만 표시'라고 기능이 있는 것처럼 말한다. (부수적으로, 좌표가 생기더라도 연도 계산이 `new Date(...).getFullYear()`(:74)라 BC 사건은 NaN이 되어 연도 슬라이더가 깨진다.)  
권고: 좌표 데이터 파이프라인을 만들 계획이 없다면 지도 세그먼트를 '더보기'로 내리거나 비활성 + '준비 중' 표기로 바꿔라. 만들 계획이라면 Event에 lat/lng(또는 EventLocation 테이블)를 추가하고 등록 폼·DTO·transformer까지 배선한 뒤 문구를 실제 동선(‘사건 편집 > 위치’)으로 교체할 것. 연도 계산은 parseIsoDateParts로 교체.
근거 정정: 근거 정확(미세 조정): 마커 소스 읽기는 event-map-view.tsx:73 `const markers = evt.map?.markers ?? []`이고 :76-80이 좌표 유효성 루프(원문 '76-80'과 사실상 동일 범위), :74 `new Date(item.node.period.start).getFullYear()`는 정확, 빈 상태 문구 :180-190 정확, eventTransformers.ts:124 정확, catalog-main-content.tsx:94 VIEW_HINTS[MAP]='지리적 위치 — 좌표가 있는 사건만 표시' 정확.

**DATA-10 — 북마크가 계정·삭제와 무관한 전역 localStorage — 배지 숫자가 실재하지 않는 사건을 셈**  
문제: STORAGE_KEY가 'papyrus_event_bookmarks' 하나뿐이라 계정 스코프가 없다(use-bookmarks.hook.ts:6). 사건 목록은 서버에서 createdById로 계정 스코프되므로(event.controller.ts:489) 다른 계정에서 담은 id는 events에 존재하지 않는다. 삭제된 사건 id도 영구 잔류하며 정리 훅이 없다. 배지는 `bookmarks.size`를 그대로 표시하고(events.page.tsx:667 → catalog-toolbar.tsx:196-198), 실제 필터는 `bookmarks.has(item.node.id)` 교집합이라(events.page.tsx:330) 두 값이 어긋난다. 로드 시 `new Set(JSON.parse(stored))`는 배열이 아닌 값이 들어오면 throw 후 catch로 조용히 무시된다(:14-19).  
영향: 계정을 바꾸거나 사건을 삭제하면 툴바 북마크 배지는 '12'인데 '북마크만'을 켜면 3건만(혹은 0건 빈 상태로) 나온다. 사용자는 북마크가 사라졌다고 느끼지만 어디에도 설명이 없고, 죽은 id를 지울 수단도 없다. 저장값이 손상되면 북마크 전체가 알림 없이 사라지고 다음 토글 한 번으로 storage가 단일 항목으로 덮어써져 복구 불가가 된다.  
권고: 키를 `papyrus_event_bookmarks:{accountId}`로 스코프하고, 로드 시 Array.isArray + string 요소 검증을 거쳐 손상값은 폐기 대신 백업 후 초기화하라. 배지 숫자는 현재 목록과 교집합한 유효 개수로 바꾸고(또는 '12개 중 3개 표시'), 필터가 0건일 때 '북마크한 사건 9건이 이 계정에 없습니다 · 정리하기' CTA를 주면 죽은 id를 청소할 수 있다.
근거 정정: 라인 정확: use-bookmarks.hook.ts:6 STORAGE_KEY 단일 상수, :14-19 try/JSON.parse/catch 무시, events.page.tsx:667 bookmarksCount=bookmarks.size → catalog-toolbar.tsx:196-198 Badge, events.page.tsx:330 `flattenedHierarchy.filter((item) => bookmarks.has(item.node.id))`, event.controller.ts:489 createdById 스코프.

**DATA-12 — 데스크톱 기본 뷰(타임라인)의 막대 좌표가 네이티브 Date — BC 사건은 NaN 위치**  
문제: allBars가 `new Date(startStr).getFullYear() + (getMonth() + getDate()/31)/12`로 막대의 시작·종료 연도를 만든다(event-timeline.tsx:541-546). 서버가 BC 사건에 대해 만들어 보내는 `-0044-03-15` 형태는 네이티브 Date에서 Invalid Date가 되어 startYear/endYear가 NaN이 되고, 렌더는 그 값을 그대로 `left: (b.startYear - minYear) * pixelsPerYear`에 넣는다(:1519-1521). 프로젝트에는 이미 BC 안전 정수 키(dateSortKey, iso-date.ts:115)와 parseIsoDateParts가 있는데 이 위젯만 우회한다.  
영향: 현재 로컬 DB엔 BC 사건이 0건이라 잠복해 있지만, BC 사건을 한 건이라도 등록하면 데스크톱 첫 진입 뷰에서 그 막대가 NaN 좌표로 계산돼 위치·폭이 깨지고(브라우저가 잘못된 left를 무시해 lane 원점에 겹침) 연도 라벨도 NaN이 된다. 목록 뷰는 BC를 '기원전 44'로 정상 표시하므로 뷰를 바꿀 때마다 같은 사건이 다르게 보인다. 세기 필터가 '기원전 N세기'를 지원한다는 점에서 BC 데이터 유입은 설계상 예정된 경로다.  
권고: startYear/endYear 산출을 parseIsoDateParts 기반 `year + (month-1 + (day-1)/31)/12`(부호 연도 그대로)로 교체하라. 이미 목록·격자·갤러리·트리가 같은 파서를 쓰고 있어 규약도 일치한다. 교체 후 minYear/maxYear가 음수 연도를 포함하도록 눈금 라벨(formatYearLabel)의 BC 표기만 함께 확인하면 된다.
근거 정정: event-timeline.tsx:541은 `const end = endStr ? new Date(endStr) : start`이고 문제의 파싱은 :540 `const start = new Date(startStr)`, 연도 산출은 :542-546(원문이 '541-546'으로 범위 표기한 것과 일치). :1519 `const x = (b.startYear - minYear) * pixelsPerYear`는 정확. 다만 렌더는 CSS `left`가 아니라 **SVG 좌표 속성**(x/cx, :2924·:3046·:3265 등)이라 '브라우저가 잘못된 left를 무시해 lane 원점에 겹침'이라는 메커니즘 서술은 부정확.

**DATA-13 — 카테고리 미지정 사건이 '기타'로 둔갑 + 가짜 id 때문에 '기타' 필터로는 안 잡힘**  
문제: categoryId가 없는 사건에 transformer가 `categoryId: 'cat-other-001'`, `category: '기타'`를 채운다(eventTransformers.ts:79-80). 그런데 실제 DB의 '기타' 카테고리는 uuid id를 가진 별개 행이다(eventCategory.seed.ts:21, id는 @default(uuid)). 카테고리 필터는 `event.categoryId === selectedCategory`로 정확 비교한다(useEventFilters.ts:112-114).  
영향: 목록에서 '기타' 칩을 달고 있는 사건을 보고 필터에서 '기타'를 고르면 그 사건들이 결과에서 빠진다(선택된 값은 실제 uuid, 사건이 가진 값은 'cat-other-001'). 반대로 통계 뷰의 '분류 없음'은 항상 0이라 미분류 사건을 찾아낼 방법이 화면 어디에도 없다.  
권고: 미지정 사건의 categoryId를 가짜 문자열로 채우지 말고 undefined로 두되 표시 라벨만 '미분류'로 파생하라. 필터 쪽에는 '미분류' 선택지를 추가해 `!event.categoryId` 조건으로 매칭시키고, 품질 지표 missingCategory도 같은 조건을 쓰게 통일할 것.
근거 정정: 라인 정확: eventTransformers.ts:79-80 `evt.category?.id ?? 'cat-other-001'` / `?? '기타'`, useEventFilters.ts:112-114 `event.categoryId === selectedCategory`, eventCategory.seed.ts:21 `{ name: '기타', description: '기타 사건' }`(id는 event.prisma:217 `@default(uuid())`), event-dashboard-view.tsx:120 `!evt.category`.

**DATA-14 — '기간순' 정렬이 연 단위라 1년 미만 사건은 전부 동률 — 정렬해도 순서가 안 바뀜**  
문제: 기간 정렬 키가 `isoYearSpan(start, end)` = `end.year - start.year` 정수다(useEventFilters.ts:190-196, iso-date.ts:141-149). end가 없으면 0을 돌려주고, 같은 해 안에서 끝난 사건도 0이다. 평면 뷰 비교자도 같은 함수를 쓴다(useEventHierarchy.ts:38-44).  
영향: 표시 옵션에서 '기간순'을 고르면 종료일 없는 사건(대다수)과 같은 해에 끝난 사건이 전부 동률 0이 되어 화면 순서가 사실상 변하지 않는다. 오름/내림 토글을 눌러도 동률 구간은 그대로라 사용자는 정렬이 먹히지 않는다고 느낀다. 행에는 '3개월 12일' 같은 라벨이 보이는데 정렬은 그 값을 전혀 반영하지 않는다.  
권고: 정렬 키를 isoDaySpan(iso-date.ts:159, BC 안전)으로 바꿔 일 단위 차이를 반영하고, end가 없는 사건은 0이 아니라 null로 취급해 방향과 무관하게 뒤로 보내라(compareByDate의 미상 규약과 동일). 정밀도가 'year'인 사건은 일 단위 비교가 무의미하므로 연 단위 근사로 fallback하되 라벨에 '≈'를 붙일 것.
근거 정정: useEventFilters.ts:190은 `case 'duration':`이고 실제 키 계산은 :193-195(isoYearSpan 차분) — 원문 '190-196' 범위 표기와 일치. useEventHierarchy.ts:38은 닫는 중괄호이고 duration 분기는 :36-37. iso-date.ts:141-149 isoYearSpan(end 없으면 0), catalog-main-content.tsx:257 `<option value="duration">기간순</option>`은 정확.

**DATA-15 — '최근 본 사건' 드롭다운이 BC를 '-44년'으로 표기하고, 미로드·삭제 사건은 조용히 사라짐**  
문제: 드롭다운은 parseIsoDateParts로 부호 연도를 얻은 뒤 `${year}년`으로 그대로 찍는다(recent-events-dropdown.tsx:86,101). 같은 페이지의 목록·트리·갤러리는 모두 `year < 0 ? '기원전 N'` 분기를 갖고 있는데(event-list-item.tsx:152, tree-view의 formatYear, gallery) 여기만 빠졌다. 또 최근 id 10개를 저장하지만(use-recent-events.hook.ts:6) 현재 로드된 events에 없는 id는 필터로 조용히 제거된다(:44-47).  
영향: BC 사건을 열람하면 최근 목록에 '-44년 · 전쟁'으로 뜬다. 그리고 사건이 삭제됐거나 아직 로드되지 않은 페이지에 있으면 최근 목록에서 그냥 빠져서, 방금 본 사건이 목록에 없는 상황이 생긴다(항목이 0개가 되면 버튼 자체가 사라짐, :67).  
권고: 연도 라벨을 공용 헬퍼(예: formatDateWithPrecision 또는 tree-view의 formatYear를 shared로 승격)로 통일하라. 미해결 id는 제거 대신 제목 없이 '불러오는 중' 또는 '삭제된 사건'으로 표시하거나, 최근 목록에 title 스냅샷을 함께 저장해 id 해석 실패와 무관하게 이름이 남게 할 것.
근거 정정: 라인 정확: recent-events-dropdown.tsx:86 `parseIsoDateParts(evt.startDate)?.year`, :101 `${year}년`(BC 분기 없음), :44-47 미해결 id 필터 제거, :67 `if (items.length === 0) return null`, use-recent-events.hook.ts:6 MAX_RECENT=10 / :13-22 로드.

**DATA-4 — 종료일이 없는 사건을 전부 '1일짜리 사건'으로 표기**  
문제: formatDuration은 `if (!end || 동일날짜) return '1일'`로, 종료일 '미입력'과 '하루짜리 사건'을 같은 값으로 합친다(event-list-item.tsx:106-108). 행은 이 문자열이 비어있지 않으면 무조건 렌더한다(:235). 드로어의 calculateDuration도 동일 규칙(event-detail-panel.tsx:102-104).  
영향: 종료일을 아직 안 넣은 사건(대다수)이 목록에서 전부 '1일' 배지를 달고 나온다. '조선 건국', '867년 ○○ 즉위'처럼 기간이 애초에 미상인 사건도 하루짜리 사건으로 보이고, 드로어에서도 '(1일)'로 확정된다. 사용자는 데이터가 비어 있다는 사실을 인지하지 못하므로 종료일을 채워 넣을 이유도 못 느낀다.  
권고: formatDuration이 end 없음일 때 빈 문자열(또는 null)을 반환하게 하고, 정말 start==end인 경우에만 '1일'을 쓰라. 미입력임을 드러내고 싶다면 행이 아니라 드로어에서 '기간 미상' 같은 muted 텍스트로 표기하고, precision이 'year'/'month'인 경우엔 일 단위 기간 자체를 계산하지 말 것.
근거 정정: 코드 근거는 정확(event-list-item.tsx:102-108 `!end || 동일날짜 → '1일'`, :235 `{duration && <Duration>}`, event-detail-panel.tsx:102-104 동일 규칙). 다만 userImpact의 '종료일을 아직 안 넣은 사건(대다수)'은 실측과 어긋남 — 실DB에서 end_date·end_year 둘 다 NULL은 228건 중 14건(6%), 종료 정보 보유 214건.


### FLOW — 상호작용 워크플로 (16건)

| id | 심각도 | 공수 | status | 항목 | 근거 |
|---|---|---|---|---|---|
| IX-1 | P2 | S | CONFIRMED | 전역 Enter 가로채기 — 버튼·모달이 키보드로 죽고 엉뚱한 상세로 이동 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:111`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:83`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:16`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:343` |
| IX-2 | P2 | S | CONFIRMED | ↑↓·Home·End 전역 preventDefault — 정렬 select와 페이지 스크롤이 먹통 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:95`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:101`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:105`<br>`apps/web-admin/src/pages/events/list/components/catalog-main-content.tsx:250` |
| IX-3 | P2 | S | CONFIRMED | 요약 모달에 Esc가 없고, Esc가 배경 선택만 조용히 지운다 | `apps/web-admin/src/pages/events/list/components/catalog-overlay-modals.tsx:147`<br>`apps/web-admin/src/pages/events/list/components/catalog-overlay-modals.tsx:160`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:54`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-modals.ts:58` |
| IX-4 | P2 | S | CONFIRMED | 드로어 상세의 기간이 네이티브 Date — BC·날짜 미상에서 NaN.NaN.NaN | `apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:90`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:95`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:229`<br>`apps/web-admin/src/entities/event/model/eventTransformers.ts:67` |
| IX-5 | P2 | S | CONFIRMED | 드로어가 로딩을 모른다 — ?event= 딥링크/뒤로가기 시 '사건을 선택해주세요' | `apps/web-admin/src/pages/events/list/events.page.tsx:627`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:784`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:250`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:519` |
| IX-6 | P2 | M | CONFIRMED | 상세 왕복 후 목록 스크롤·선택 행 위치가 복원되지 않음 | `apps/web-admin/src/pages/events/list/events.page.tsx:250`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:124`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx:288`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:353` |
| IX-10 | P3 | S | CONFIRMED | 목록 스크롤 핸들러가 '부분 로드 실패' 게이트를 우회해 재요청을 난사 | `apps/web-admin/src/pages/events/list/events.page.tsx:353`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:559`<br>`apps/web-admin/src/entities/event/model/useEvents.ts:137`<br>`apps/web-admin/src/entities/event/model/useEvents.ts:173` |
| IX-11 | P3 | M | CONFIRMED | 상세 패널이 열려도 포커스가 가지 않고, 모든 행이 Tab 정지점 | `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:189`<br>`apps/web-admin/src/pages/events/list/components/catalog-detail-drawer.tsx:46`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:784`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:382` |
| IX-12 | P3 | S | CONFIRMED | JSON 내보내기가 0건에서 무반응이고, 필터만 걸면 매번 확인 모달 | `apps/web-admin/src/pages/events/list/lib/export-events.ts:12`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:429`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:200` |
| IX-13 | P3 | M | CONFIRMED | 북마크·최근 목록이 삭제된 사건 id를 영구 보관 — 배지 숫자와 결과 불일치 | `apps/web-admin/src/shared/hooks/use-bookmarks.hook.ts:9`<br>`apps/web-admin/src/pages/events/list/components/catalog-toolbar.tsx:196`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:328`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:585` |
| IX-14 | P3 | M | CONFIRMED | 드로어의 참전국·사상자는 transformer가 0을 박아 절대 렌더되지 않음 | `apps/web-admin/src/entities/event/model/eventTransformers.ts:100`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:257`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:269` |
| IX-15 | P3 | S | CONFIRMED | '최근' 드롭다운 — 메뉴 키보드 규약 미이행·BC 연도 오표기·트리거 소멸 | `apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:83`<br>`apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:101`<br>`apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:67`<br>`apps/web-admin/src/pages/events/list/components/recent-events-dropdown.tsx:31` |
| IX-16 | P3 | L | CONFIRMED | 다중 선택·일괄 작업 부재 — 반복 편집이 사건당 페이지 왕복 | `apps/web-admin/src/pages/events/list/events.page.tsx:250`<br>`apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx:245`<br>`apps/web-admin/src/widgets/event-list/ui/event-detail-panel.tsx:410`<br>`apps/web-admin/src/pages/events/list/components/catalog-entity-filter-modals.tsx:74` |
| IX-7 | P3 | M | PLAUSIBLE | 모든 상태 변경이 replace — 뒤로가기 한 번에 목록을 떠난다 | `apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:179`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:158`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:784`<br>`apps/web-admin/src/pages/events/list/components/catalog-detail-drawer.tsx:36` |
| IX-8 | P3 | M | CONFIRMED | 상세 페이지의 '목록' 링크가 필터·뷰·검색을 전부 버린다 | `apps/web-admin/src/pages/events/detail/components/detail-hero.tsx:81`<br>`apps/web-admin/src/shared/router.ts:159`<br>`apps/web-admin/src/pages/events/detail/event-detail.page.tsx:406`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts:152` |
| IX-9 | P3 | S | CONFIRMED | '최근 본 사건'이 화살표 네비게이션으로 오염되고, 정작 상세 열람은 기록 안 됨 | `apps/web-admin/src/pages/events/list/events.page.tsx:282`<br>`apps/web-admin/src/pages/events/list/hooks/use-catalog-keyboard.ts:119`<br>`apps/web-admin/src/shared/hooks/use-recent-events.hook.ts:7`<br>`apps/web-admin/src/pages/events/list/events.page.tsx:152` |

**IX-1 — 전역 Enter 가로채기 — 버튼·모달이 키보드로 죽고 엉뚱한 상세로 이동**  
문제: useCatalogListNavigation이 window에 keydown을 걸고, 편집 가능 요소(input/textarea/contentEditable)만 제외한 채 `e.key === 'Enter' && selectedEventId`면 무조건 preventDefault() 후 navigate(detail)한다. <button>은 Enter keydown의 기본동작이 click 발생이므로 preventDefault가 버튼 활성화 자체를 취소한다. 행(event-list-item.tsx:182-188)도 Enter를 처리하지만 window 핸들러가 뒤에 실행되며 클로저의 이전 selectedEventId를 그대로 쓴다.  
영향: 사건을 하나라도 선택한 뒤(=드로어가 열린 뒤) 키보드 사용자가 툴바의 '북마크'·'JSON'·'단축키 도움말', 단축키 도움말 모달의 닫기 버튼, 카테고리/국가 필터 모달의 항목 버튼 위에서 Enter를 누르면 그 버튼은 아무 반응이 없고 대신 선택돼 있던 사건의 상세 페이지로 페이지가 통째로 바뀐다. 목록에서 Tab으로 다른 행에 가서 Enter를 눌러도 그 행이 아니라 직전에 선택돼 있던 사건의 상세로 간다.  
권고: (1) Enter 분기를 window가 아니라 목록 컨테이너(또는 행)로 내리고, (2) `e.target`이 목록 행(`[data-event-id]`)일 때만 처리하도록 가드하며, (3) viewMode !== LIST이거나 모달/드로어가 열려 있으면 훅 자체를 비활성(useEffect 조기 return)한다. 최소 조치로도 `if (e.target !== document.body && !(e.target as HTMLElement).closest('[data-event-id]')) return`를 Enter 분기 앞에 둘 것.

**IX-2 — ↑↓·Home·End 전역 preventDefault — 정렬 select와 페이지 스크롤이 먹통**  
문제: 같은 window 핸들러가 ArrowUp/ArrowDown/Home/End에 대해 항상 preventDefault()한다. 제외 대상은 input/textarea/contentEditable뿐이라 네이티브 `<select>`(정렬 기준, 정렬 방향 옆의 '한 번에 불러올 사건 수')는 제외되지 않는다. 또 훅이 viewMode와 무관하게 등록돼(events.page.tsx:343) 타임라인·지도·통계·갤러리 뷰에서도 동작한다. 선택이 없을 때 ↑는 마지막 항목(:104), Home은 첫 항목(:105-107)을 선택한다.  
영향: 정렬 select에 포커스를 두고 ↓로 '기간순'을 고르려 하면 옵션이 바뀌지 않고 대신 목록 선택이 한 칸 내려가며 상세 드로어가 열린다(페이지 크기 select도 동일). 아무것도 선택하지 않은 상태에서 페이지를 훑으려고 ↑ 한 번 누르면 맨 마지막 사건이 선택되며 드로어가 열리고, Home을 눌러 맨 위로 가려 하면 첫 사건이 선택된다. 타임라인·지도 뷰에서도 화살표 스크롤이 차단된다.  
권고: isInEditableElement에 `HTMLSelectElement`와 `[role=listbox|combobox|menu]` 조상을 추가하고, 훅에 `enabled: viewMode === VIEW_MODES.LIST && !anyOverlayOpen` 인자를 넣어 목록 뷰에서만 등록한다. 선택이 없을 때의 Home/End/↑는 '선택 생성' 대신 no-op으로 두고, 첫 선택은 ↓ 또는 명시적 클릭/Tab 진입에서만 만들 것.
근거 정정: use-catalog-keyboard.ts의 preventDefault 실제 줄은 :96(ArrowDown)·:102(ArrowUp)·:106(Home)·:109(End) — 인용한 :95/:101/:105는 각 분기의 조건줄

**IX-3 — 요약 모달에 Esc가 없고, Esc가 배경 선택만 조용히 지운다**  
문제: 사건 요약 모달(role=dialog·aria-modal)은 자체 Escape 핸들러가 없고 useFocusTrap도 Esc를 다루지 않는다. 전역 Escape 분기는 `shortcutHelpOpen`만 검사하고, 아니면 `selectedEventId`를 지운다(:54-57). showSummaryModal은 어느 분기에도 없다.  
영향: 행의 '사건 요약 보기'로 계층 요약 모달을 연 뒤 Esc를 누르면 모달은 그대로 남고, 대신 뒤에 있던 사건 선택이 해제되어 상세 드로어가 닫힌다. Esc를 여러 번 눌러도 모달은 안 닫히고(닫으려면 X 또는 오버레이 클릭), 모달을 닫고 나면 원래 보고 있던 사건이 선택 해제돼 있어 맥락을 잃는다.  
권고: Escape 처리를 하나의 우선순위 스택으로 통일한다: 요약 모달 → 카테고리/국가 모달 → 단축키 도움말 → 드로어 선택 해제 순으로 '가장 위 레이어 하나만' 닫도록 use-catalog-modals에 `closeTopOverlay()`를 두고, use-catalog-keyboard의 Escape 분기는 그것만 호출.

**IX-4 — 드로어 상세의 기간이 네이티브 Date — BC·날짜 미상에서 NaN.NaN.NaN**  
문제: 드로어 본문의 formatDate/calculateDuration이 `new Date(dateString)`으로 연·월·일과 기간을 만든다. transformer는 startDate가 없으면 `period.start = ''`로 채우고(eventTransformers.ts:67-70), BC 사건은 `-0044-03-15` 형태다. `new Date('')`·`new Date('-0044-03-15')`는 모두 Invalid Date라 getFullYear()가 NaN이 된다. 같은 데이터를 목록 행은 parseIsoDateParts로 BC 안전하게(‘기원전 44’·‘미상’) 렌더하고 요약 모달도 shared/lib/iso-date의 formatDateRange를 쓴다.  
영향: 목록에서 '기원전 44'로 잘 보이던 사건을 클릭하면 우측 상세 패널 '기간' 칸이 `NaN.NaN.NaN (1일)`로 뜬다. 날짜를 아직 안 넣은 사건도 동일하게 NaN으로 보여, 사용자는 데이터가 깨진 것으로 오해한다(실제로는 미상).  
권고: formatDate/calculateDuration을 제거하고 shared/lib/iso-date의 parseIsoDateParts + formatDateRange, 기간은 event-list-item.tsx:97의 formatDuration(ISO 파츠 borrow 방식)을 재사용한다. period.start가 빈 문자열이면 '미상'을 렌더하고 기간 행 자체를 숨길 것.
근거 정정: userImpact의 'BC 사건은 -0044-03-15 형태' 는 사실과 다름 — apps/api/src/libs/event/presentation/dto/event.response.ts:383 주석대로 'BC·고대는 startDate가 null'이라 eventTransformers.ts:68에서 period.start=''가 되고, 목록 행은 parseIsoDateParts('')→null→'미상'(event-list-item.tsx:151)으로 표시된다(‘기원전 44’가 아님). 결함 자체는 오히려 더 넓게 성립

**IX-5 — 드로어가 로딩을 모른다 — ?event= 딥링크/뒤로가기 시 '사건을 선택해주세요'**  
문제: EventDetailPanel에 `isLoading={false}`가 하드코딩돼 있다(스켈레톤 분기가 영구 사문화). selectedEventId는 마운트 시 URL의 `event` 파라미터로 초기화되므로 드로어는 즉시 열리지만, selectedEvent는 해당 사건이 실린 페이지가 도착할 때까지 null이고 그러면 패널은 '사건을 선택해주세요 / 좌측에서 사건을 클릭하면…' 빈 상태를 보여준다.  
영향: 공유받은 `/events?...&event=xxx` 링크로 진입하거나 상세에서 뒤로가기로 돌아오면, 사건이 선택된 상태(헤더는 '사건 상세')인데 본문은 '사건을 선택해주세요'라고 말한다. autoLoadAll이 전 페이지를 소진할 때까지 수 초간 지속되고, 그 사건이 삭제됐거나 로드에 실패하면 이 모순된 화면이 영구히 남는다.  
권고: `isLoading={!selectedEvent && (isLoading || isFetchingNextPage || hasMore)}`로 배선해 스켈레톤을 살리고, 전체 로드가 끝났는데도 selectedEvent가 null이면 '이 사건을 찾을 수 없습니다(삭제되었거나 접근 권한 없음) · 선택 해제' 전용 상태를 렌더한다.

**IX-6 — 상세 왕복 후 목록 스크롤·선택 행 위치가 복원되지 않음**  
문제: 목록은 CompactList 내부 스크롤 컨테이너인데 스크롤 위치를 저장/복원하는 코드가 events.page·list/hooks·event-list-compact 어디에도 없다(sessionStorage·scrollTop 참조 0건). 선택 행으로 스크롤하는 유일한 경로는 키보드 네비게이션의 rAF scrollIntoView(:124-133)뿐이라, URL의 `event`로 복원된 선택은 화면 밖에 있어도 스크롤되지 않는다.  
영향: 18세기까지 한참 스크롤해 내려가서 사건을 열고 상세/편집으로 갔다가 뒤로 오면, 드로어는 그 사건으로 열려 있는데 목록은 맨 위(최근 세기)로 돌아가 있다. 방금 보던 행을 다시 찾으려면 매번 처음부터 스크롤해야 하고, 이 왕복이 편집 작업마다 반복된다.  
권고: 마운트 시 selectedEventId가 있으면 `[data-event-id]`로 한 번 scrollIntoView({block:'center'})하고(이미 있는 rAF 유틸 재사용), 추가로 CompactList의 scrollTop을 sessionStorage에 키(현재 필터 시그니처)와 함께 저장·복원한다.
근거 정정: 목록 스크롤 컨테이너의 실제 줄은 event-compact-list.tsx:290 `<List.CompactList onScroll={onScroll}>`(인용 :288은 EmptyCatalogState 종료줄)

**IX-10 — 목록 스크롤 핸들러가 '부분 로드 실패' 게이트를 우회해 재요청을 난사**  
문제: useEvents는 자동 소진 effect에 `!isFetchNextPageError` 가드를 넣어 실패 시 자동 재개를 멈추도록 고쳤는데(선행 검토서의 P1 수정), 목록 뷰에 그대로 남아 있는 handleScroll은 `hasMore && !isLoading`만 보고 fetchMoreEvents()를 호출한다. 실패 상태에서도 hasNextPage는 true, isLoading은 false라 조건이 항상 참이며, fetchMoreEvents의 가드(:175)는 '진행 중 아님'만 확인하므로 통과한다.  
영향: 다음 페이지 로드가 실패해 하단에 '일부 사건을 불러오지 못했습니다 · 다시 시도'가 뜬 상태에서 사용자가 그 근처를 스크롤하면 스크롤 프레임마다 같은 요청이 다시 나가고(5xx면 내부 retry 2회까지), 서버가 계속 두드려 맞으면서 화면은 스피너와 오류 배너를 오간다. 명시적 '다시 시도'를 누르지 않아도 자동 재시도가 끝없이 반복된다.  
권고: handleScroll 조건에 `&& !loadMoreFailed`를 추가하고, 이미 autoLoadAll이 켜진 콜사이트에서는 onScroll 무한스크롤을 아예 넘기지 않는다(둘 중 하나로 일원화). 재개는 '다시 시도' 버튼만 담당하게 할 것.
근거 정정: fetchMoreEvents 가드 실제 줄은 useEvents.ts:175 `if (query.hasNextPage && !query.isFetchingNextPage)`(:173은 프로퍼티 시작줄)

**IX-11 — 상세 패널이 열려도 포커스가 가지 않고, 모든 행이 Tab 정지점**  
문제: 행마다 `tabIndex={0}`이 붙어 로빙 tabindex가 없다(152행이면 Tab 정지점 152개). 데스크톱(>1200px)에서는 CatalogDetailDrawer가 isMobile=false라 focus trap도 비활성이고, 선택 시 패널로 포커스를 옮기는 코드도 없다. 패널은 DOM상 메인 콘텐츠 뒤 그리드 컬럼이다.  
영향: 키보드 사용자가 목록 중간 행을 선택해 상세 패널을 연 뒤 그 안의 '수정'·'삭제'·'상세 보기' 버튼에 가려면 남은 모든 행(수십~수백 개)을 Tab으로 통과해야 한다. 반대로 툴바에서 Tab으로 목록을 지나 하단 CTA에 가려면 전 행을 훑어야 한다.  
권고: 행을 로빙 tabindex(선택 행만 tabIndex=0, 나머지 -1)로 바꾸고, 선택이 생겼을 때 패널 헤더(또는 첫 액션 버튼)로 포커스를 옮기며 패널 상단에 '목록으로 돌아가기' 스킵 링크를 둔다. 데스크톱 패널에도 Esc→목록 복귀 포커스 반환을 배선.

**IX-12 — JSON 내보내기가 0건에서 무반응이고, 필터만 걸면 매번 확인 모달**  
문제: exportEventsAsJson은 `if (events.length === 0) return`으로 아무 알림 없이 종료한다. 반대로 events.page의 확인 로직은 `loadedRootCount < serverTotal`이면 confirm을 띄우는데, 필터로 좁힌 경우도 항상 이 조건에 걸린다(필터 적용 = 로드된 최상위보다 적음). 성공 시 토스트도 없다.  
영향: 필터 결과가 0건일 때 'JSON'을 누르면 '…0건만 내보냅니다. 계속할까요?'라는 확인창이 뜨고, 확인을 눌러도 파일은 생성되지 않으며 아무 메시지도 없다(버튼이 고장난 것으로 보임). 정상 사용에서도 버튼 툴팁은 '현재 필터된 결과를 내보내기'인데 필터를 쓸 때마다 '부분만 내보냅니다' 경고가 떠 매번 한 번 더 클릭해야 한다.  
권고: 0건이면 confirm 이전에 `notify.info('내보낼 사건이 없습니다')`로 조기 반환하고 툴바 버튼을 disabled 처리한다. 경고 confirm은 '필터 때문에 적음'이 아니라 '아직 로드 중이라 적음'(hasMore===true)일 때만 띄우고, 완료 시 `notify.success('N건을 내보냈습니다')`를 추가. 파일명에도 필터 요약(예: events-19c-war-2026-07-28.json)을 넣을 것.

**IX-13 — 북마크·최근 목록이 삭제된 사건 id를 영구 보관 — 배지 숫자와 결과 불일치**  
문제: 북마크·최근 본 사건은 localStorage의 id 배열/Set이며 서버 상태와 대조하는 로직이 없다. 툴바 배지는 `bookmarksCount={bookmarks.size}`(원본 Set 크기)를 그대로 표시하는 반면, 목록은 `flattenedHierarchy.filter(item => bookmarks.has(item.node.id))`로 실재하는 항목만 남긴다. 드로어에서 삭제하면 handleAfterDelete가 쿼리만 무효화하고 북마크/최근에서 그 id를 제거하지 않는다.  
영향: 북마크한 사건을 삭제하면 툴바 배지는 계속 '북마크 7'인데 '북마크만'을 켜면 6건만 뜬다. 계정을 바꾸거나 다른 사람의 사건이 목록에서 빠져도 마찬가지다. 사용자는 '왜 하나가 안 보이지'를 확인할 방법도, 죽은 북마크를 정리할 방법(비우기 UI 없음)도 없다.  
권고: handleAfterDelete에서 삭제 id를 bookmarks·recentEvents에서 제거하고(두 훅에 remove(id) 노출), 배지는 실제로 해석 가능한 수(loaded id와 교집합)를 쓰되 전체 로드 완료 전에는 원본 수를 쓴다. 북마크 드롭다운에 '북마크 비우기'를 추가.
근거 정정: 배지 값의 출처는 events.page.tsx:667 `bookmarksCount: bookmarks.size`(인용 :328은 visibleFlattenedHierarchy 필터 memo의 시작줄, bookmarks.has는 :330)

**IX-14 — 드로어의 참전국·사상자는 transformer가 0을 박아 절대 렌더되지 않음**  
문제: transformEventsFromApi가 `stats: { casualties: {total:0,...}, participatingNations: 0, ... }`을 모든 사건에 무조건 채운다. 드로어는 `isMilitary && stats.participatingNations > 0`, `... casualties.total > 0`로 게이트해서 이 두 행은 어떤 데이터에서도 렌더되지 않는다(사문화된 분기 + formatCompactNumber 호출).  
영향: 군사 사건을 드로어로 열면 상세 페이지에는 있는 교전 진영·사상자 정보가 요약 그리드에서 통째로 빠져 있다. 사용자는 '이 사건엔 사상자 데이터가 없구나'로 오해하고 확인하러 상세 페이지를 한 번 더 왕복한다.  
권고: 드로어 정보 그리드를 실제 응답 필드(militaryEvent/casualties 모듈)에 연결하거나, 연결할 계획이 없다면 두 분기와 formatCompactNumber import를 제거하고 대신 '군사 상세는 상세 페이지에서' 링크 한 줄로 대체해 정보 위치를 정직하게 안내한다.
근거 정정: 사문화 사유가 하나 더 있음 — eventTransformers.ts:91이 category에 DB 한국어 이름(evtCategoryName, 예 '군사')을 담으므로 event-detail-panel.tsx:208 `selectedEvent.category === 'military'`(isMilitary)도 항상 false. 즉 stats 0 게이트 이전에 isMilitary 게이트에서 이미 죽는 이중 사문화

**IX-15 — '최근' 드롭다운 — 메뉴 키보드 규약 미이행·BC 연도 오표기·트리거 소멸**  
문제: 트리거가 `aria-haspopup="menu"`, 컨테이너가 `role="menu"`, 항목이 `role="menuitem"`인데 열림 시 첫 항목으로 포커스를 옮기지도, ↑↓ 로빙을 구현하지도 않는다(항목 도달 수단은 Tab뿐). 연도는 `${year}년`을 그대로 찍어 BC(음수 연도)가 '-44년'으로 나온다. 항목이 0건이면 컴포넌트가 null을 반환해 트리거 버튼 자체가 사라진다(MAX_ITEMS 5는 저장 상한 10과도 불일치).  
영향: 스크린리더는 메뉴라고 안내하는데 화살표가 먹지 않아 사용자가 갇힌 느낌을 받는다. 고대 사건을 본 뒤 최근 목록을 열면 '-44년 · 전쟁'처럼 목록 행('기원전 44')과 다른 표기가 나온다. 또 최근 기록이 비면 툴바에서 '최근' 버튼이 통째로 사라져 툴바 폭이 흔들리고, 그 기능이 존재한다는 사실 자체를 발견할 수 없다.  
권고: role을 실제 동작에 맞춰 낮추거나(catalog-main-content의 '더보기'가 role="group"으로 이미 그렇게 정정했다) ↑↓ 로빙+열릴 때 첫 항목 포커스를 구현한다. 연도는 formatCenturyLabel/parseIsoDateParts 기반 BC 포맷터를 쓰고, 0건에서도 트리거를 disabled 상태로 남겨 '아직 본 사건이 없습니다' 안내를 띄울 것.

**IX-16 — 다중 선택·일괄 작업 부재 — 반복 편집이 사건당 페이지 왕복**  
문제: 선택 상태는 `selectedEventId: string | null` 단수뿐이고, 행 액션은 '요약 보기'·'북마크' 두 개다(체크박스·selectedIds는 코드베이스 전체에 없음). 편집·삭제는 드로어에서 한 건씩만 가능하며, 편집은 별도 페이지로 이동한다.  
영향: 예를 들어 잘못 분류된 사건 20건의 카테고리를 고치려면 (행 클릭 → 드로어 → 수정 → 편집 페이지 → 저장 → 뒤로 → 스크롤 위치 소실[IX-6]) 사이클을 20번 반복해야 한다. 목록이 필터로 정확히 그 20건을 이미 보여주고 있어도 그 결과 집합에 대해 할 수 있는 일괄 동작은 JSON 내보내기뿐이다.  
권고: 1단계로 행 hover/포커스 시 체크박스를 노출하고 Shift+클릭 범위 선택 + 하단 액션바(카테고리 일괄 변경·북마크 일괄 추가·삭제)를 붙인다. 서버 일괄 API가 없다면 우선 클라이언트 순차 호출 + 진행률·부분 실패 요약으로 시작하고, 선택은 필터 변경 시 유지하되 개수와 '선택 해제'를 항상 노출할 것.

**IX-7 — 모든 상태 변경이 replace — 뒤로가기 한 번에 목록을 떠난다**  
문제: 상태→URL 동기화가 검색어·필터·뷰모드·페이지크기뿐 아니라 `event`(=드로어 열림)까지 전부 `setSearchParams(next, { replace: true })`로 쓴다. 히스토리 엔트리가 하나도 쌓이지 않는다.  
영향: (1) 필터를 여러 번 바꾼 뒤 '직전 조건으로 되돌리기'를 뒤로가기로 시도하면 카탈로그를 벗어나 이전 페이지로 나가버린다. (2) 모바일에서 드로어(fixed dialog)를 연 상태로 안드로이드 back 제스처를 쓰면 드로어가 닫히는 게 아니라 사이트의 이전 화면으로 나간다 — 모달을 back으로 닫는 모바일 관습과 어긋난다.  
권고: `event` 파라미터만 push로 분리(드로어 열기=push, 닫기=history.back 또는 replace)해 뒤로가기가 드로어를 닫게 하고, 필터류는 지금처럼 replace를 유지하되 '초기화' 같은 큰 전이만 push로 둔다.
근거 정정: use-catalog-url-sync.ts에서 replace 호출 실제 줄은 :181 `setSearchParams(next, { replace: true })`(:179는 비교 조건), `event` 파라미터 기록은 :159(:158은 'q')

**IX-8 — 상세 페이지의 '목록' 링크가 필터·뷰·검색을 전부 버린다**  
문제: 상세 히어로 좌상단의 유일한 복귀 동선이 `<BackLink to={pathKeys.events.root()}>`이고 root()는 쿼리 없는 `/events/`다. 오류/404 화면의 '목록으로 돌아가기'(:406)도 동일하다. 목록의 모든 상태는 쿼리 파라미터에 있는데 그 어떤 것도 전달되지 않는다.  
영향: `?cat=전쟁&century=19&view=list&q=베를린`으로 좁혀 놓고 사건을 열어 읽은 뒤 '목록'을 누르면, 필터·검색어·뷰모드가 전부 초기화된 기본 카탈로그(데스크톱은 타임라인)로 떨어진다. 여러 사건을 훑어보는 작업에서 조건 재설정을 매번 반복하게 된다.  
권고: 상세 진입 시 location.state에 목록 URL(search 포함)을 실어 보내고 BackLink가 그것을 우선 사용, 없으면 `document.referrer`가 같은 오리진의 /events면 navigate(-1), 최후에 root()로 폴백한다.

**IX-9 — '최근 본 사건'이 화살표 네비게이션으로 오염되고, 정작 상세 열람은 기록 안 됨**  
문제: 기록 트리거가 `useEffect(() => { if (selectedEventId) addRecentEvent(selectedEventId) }, [selectedEventId])` 하나뿐이다. 즉 '선택'이 곧 '열람'으로 간주된다. 키보드 ↑↓과 드로어의 이전/다음 버튼은 한 번 누를 때마다 selectedEventId를 바꾸고, 큐 상한은 10건(MAX_RECENT)이다. 반대로 상세 페이지(pages/events/detail)에서는 useRecentEvents를 전혀 호출하지 않는다(코드베이스 전체에서 소비처는 events.page 한 곳).  
영향: ↓를 열 번 훑기만 해도 스쳐 지나간 사건 10건이 '최근 본 사건'을 가득 채워, 실제로 읽었던 사건이 목록에서 밀려난다. 반대로 목록을 거치지 않고 상세 URL로 직접 읽은 사건이나 상세에서 오래 읽은 사건은 최근 목록에 남지 않는다. 결과적으로 이 드롭다운은 '내가 방금 본 것'과 일치하지 않는다.  
권고: 기록 조건을 '의도적 열람'으로 좁힌다 — 드로어가 실제로 열려 일정 시간(예: 800ms) 유지됐거나 '상세 보기'로 이동했을 때만 addRecentEvent 호출(debounce), 그리고 event-detail.page 마운트 시에도 addRecentEvent(eventId)를 호출해 진짜 열람을 기록한다.
