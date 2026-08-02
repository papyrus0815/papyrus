# 국가 페이지 좌측 사이드바 검토 (2026-07-24)

대상: `/history/country` 좌측 국가 목록 패널 — `widgets/country/country-list`(15파일 ~4.1k줄) + `widgets/content-shell` 좌측 페인 + `pages/country` 셸 + `country-mobile-ui`.

방법: 8렌즈(UX·정확성·a11y·성능·디자인·아키텍처·상태영속·자매 사이드바 패리티) 병렬 검토 103건 → 중복 병합 68건 → 발견별 적대 검증(기각 2) → 완전성 비판 1라운드(추가 6건). **생존 72건 = P2 18 · P3 54, P1 없음.** 각 발견의 verdict는 CONFIRMED(코드로 확증)/PLAUSIBLE(런타임 확인 필요).

## P2 한눈에 (18건)

| ID | 발견 | 파일 | effort |
|---|---|---|---|
| F1 | 딥링크·팔레트 선택 시 사이드바 무동작 | widgets/country/country-list/ui/country-list.tsx:275 | M |
| F3 | filtered 계산의 검색·'과거' 분기가 유형·대륙·정렬 컨트롤을 무시 | widgets/country/country-list/country-list-state.context.tsx:150 | S |
| F4 | 대륙 미로드·고아 continentId 시 국가가 통째로 유실(never-drop 위반) | widgets/country/country-list/ui/country-list.tsx:194 | S |
| F5 | 미연결 역사국가는 핀·최근에 추가해도 빠른접근 섹션에서 조용히 사라짐 | widgets/country/country-list/ui/country-list.tsx:137 | S |
| F6 | 역사국가 popover 존속연도가 BC-safe 공용 포맷터를 우회한 원시 숫자 | widgets/country/country-list/ui/country-list-children-popover.tsx:287 | S |
| F7 | 헤더 카운트 배지의 분모가 현대 국가뿐 | widgets/country/country-list/ui/country-list.tsx:334 | S |
| F8 | 핀·최근·그룹접힘 localStorage 영속 상태가 계정 미스코프 | widgets/country/country-list/model/pinned-countries.store.ts:24 | M |
| F10 | 모바일 목록의 역사국가 행 깨짐(🏳️·'- · 수도 미상')·유형 필터 부재·공유 컨텍스트 트랩 | widgets/country/country-mobile-ui/ui/country-mobile-ui.tsx:119 | M |
| F11 | listbox에 Tab으로 진입 불가 | widgets/country/country-list/ui/country-list.tsx:392 | M |
| F12 | 마우스 클릭 후 화살표 키를 누르면 목록 맨 위로 점프 | widgets/country/country-list/model/use-list-keyboard-nav.ts:52 | S |
| F13 | listbox 역할 구조 위반 | widgets/country/country-list/ui/country-list.tsx:418 | M |
| F14 | 역사국가 popover가 키보드로 완전히 조작 불가 | widgets/country/country-list/ui/country-list-children-popover.tsx:176 | M |
| F15 | 컨텍스트 메뉴·역사국가 편집이 사실상 마우스 전용 | widgets/country/country-list/ui/country-list-context-menu.tsx:45 | M |
| F16 | 검색 키 입력마다 사이드바 전 행(~380) 리렌더 | widgets/country/country-list/country-list-state.context.tsx:180 | M |
| F17 | 필터 셀렉트 화살표가 data URI 안 currentColor라 다크모드에서 검정 렌더 | widgets/country/country-list/ui/country-list.styles.ts:557 | S |
| G1-1 | 국가 목록 fetch 실패가 '등록된 국가가 없어요' 빈 상태로 위장 | widgets/content-shell/model/use-content-core-data.hook.ts:43 | M |
| G1-2 | 역사 국가 쿼리만 실패하면 '과거' 필터·검색 합류·미연결 배지가 부분 데이터를 완전한 것처럼 무음 표시 | widgets/country/country-list/country-list-state.context.tsx:89 | M |
| G3-1 | invalidatePersonCaches 사본 간 드리프트 이미 발생 | widgets/country/country-list/ui/person-register-view-modal.tsx:59 | S |

## 근인 요약

1. **파생 상태의 계약 표류** — `filtered`(검색·유형·대륙·정렬)가 분기마다 다른 컨트롤을 무시하고, 그룹핑이 never-drop을 안 지키며, 카운트 배지 분모가 다른 모집단을 가리킴 (F3·F4·F7).
2. **선택(selectedId)과 목록의 단절** — 전체 접힘 기본값 + 자동 펼침 부재 + 1회성 80ms 타이머로, 이 effect가 설계 목적(딥링크·⌘K 외부 진입)에서 전부 무동작 (F1·F5·F12).
3. **에러 상태 축 전무** — fetch 실패가 빈 상태로 위장되고 `?? []`가 부분 실패를 무음 처리 (G1-*). 전역 retry:false라 일회 실패가 영구화.
4. **접근성: listbox 구조 위반 + 마우스 전용 기능** — Tab 진입 불가, popover·컨텍스트메뉴 키보드 조작 불가 (F11~F15).
5. **규약 분열** — 부유 표면 bespoke(글래스 미경유), 데드 스타일 1/3, 접힘 rail·최근목록·모바일 시트가 페이지마다 딴 구현 (F38~·F63~F68).

## 기각 (적대 검증에서 반박됨)

- **F2** 선택된 역사국가가 사이드바 어디에도 하이라이트되지 않음 — 기본 상태에서 역사국가는 목록에 아예 없음 — 중심 주장("사이드바 어디에도 하이라이트되지 않음·aria-selected 행이 하나도 없다")이 사실이 아님. country-detail-shell.tsx:89-91이 역사국가 id를 포함한 모든 selectedId를 recent 스토어에 push하고(recent-countries.store.ts:20, 최전방 삽입·persist), 발견의 전제 조건인 기본 상태(필터 없음=hasFilterActive false)에서 바로 그때 '최근' 빠른접근 섹션이 목록 최상단에 렌더된다. 이 섹션의 flatById는 현대 국가의 historicalCountries 자식을 명시적으로 포함하며(country-list.tsx:137-147), 행은 동일한 CountryListRow로 aria-selected·$active
- **F26** 셸 GlobalStyle이 테마 무관하게 body를 #ffffff로 강제 — 다크 테마 하드코딩 규약 위반 — 인용 자체(country-detail-shell.tsx:42의 `body { background-color: #ffffff; }` 무조건 주입)는 사실이나, 주장된 결과(다크 모드에서 흰 배경 노출)는 성립하지 않는다. app.tsx:192-196의 테마 동기화 effect가 마운트·모드 변경 시마다 `document.body.style.backgroundColor = getTheme(mode).colors.background.primary`(다크=#171717, theme.ts:136)를 **인라인 스타일**로 설정하며, 인라인 스타일은 !important 없는 스타일시트 규칙(셸 GlobalStyle은 !important 미사용)을 항상 이긴다. 즉 다크 모드에서 body는 #171717로 유지되고 셸의

---

## 배치 1 — 데이터 정합·에러 상태 (P2 코어, 대부분 S) ✅ 구현 완료 (2026-07-26, 미커밋)

> **구현 요약**: F3·F4·F7·G1-1·G1-2·G1-3·G2-1 전부 반영. tsc 0, 변경파일 lint 0, 신규 spec 4/4 통과.
> - `use-content-core-data.hook.ts`: G2-1 캐시 in-place sort → 사본 정렬; 세분 로딩/에러 플래그(`isLoadingCountries/Historical/Continents`, `isError/Countries/Historical`) + `refetchAll` 노출; stale 주석 정정.
> - `country-list-state.context.tsx` + 신규 `model/sort-countries.ts`: F3 `filtered` 재작성(검색 합류는 '전체'+대륙미지정만·정렬은 항상 sortBy 반영), 공용 `compareBySort`(값없는 항목 끝으로) 분리·에러 플래그 context 노출.
> - `country-list.tsx`: F4 never-drop 그룹핑(고아 continentId·대륙 미로드 시 미분류 흡수)·대륙 콜드로딩 스켈레톤; F7 카운트 분모를 활성 필터 모집단에 일치; G1-3 스켈레톤 게이트 필터별 분기; G1-1 `CountryListError`(재시도)·G1-2 부분에러 배너.
> - `country-list-error.tsx`(신규): 총체/부분 에러 컴포넌트. `sidebar-header.tsx`: `countTitle` 툴팁. `country-list-filters.tsx`: '과거'서 대륙 셀렉트 비활성·역사에러 시 카운트 배지 억제. F57(한 글자 변수)은 이 3파일 한정 정리.



### F3 [P2/S/CONFIRMED] filtered 계산의 검색·'과거' 분기가 유형·대륙·정렬 컨트롤을 무시 — UI는 활성인 채 거짓말

`apps/web-admin/src/widgets/country/country-list/country-list-state.context.tsx:150` · 렌즈: correctness, ux-ia, architecture

country-list-state.context.tsx: 131행 historical 분기만 early return하고 'all'/'modern'은 같은 경로. 150행 검색 조건이 countryTypeFilter를 전혀 안 봐 유형='현대' 명시해도 검색어만 있으면 '과거 국가' 섹션이 합류한다. matchesHistoricalSearch(126-129)는 continentFilter 미반영 — '유럽'+검색 조합에서 현대는 대륙으로 걸러지는데 역사국가는 대륙 무관 전부 합류. historical 분기(131-135)는 continentFilter·sortBy 모두 무시하고, 검색 분기(150-156)는 합류 결과를 무조건 이름순 localeCompare — '인구순' 유지한 채 검색하면 피드백 없이 이름순으로 바뀐다. 그런데 필터 UI(country-list-filters.tsx:151-173)는 셀렉트를 항상 활성으로 렌더하고 모바일(country-mobile-ui.tsx:133-145)도 동일. 재현: 유형='현대'→'로마' 검색→과거 섹션 노출; '아시아'+'제국' 검색→유럽 역사국가 합류; '과거' 필터에서 '인구순' 골라도 미동.

**권고:** 검색 합류를 `searchTextLower && countryTypeFilter === 'all'`로 좁혀 '현대' 계약을 지키고, 대륙 필터 활성 시 역사국가 합류를 스킵하거나 부모 현대 국가 continentId 기준으로 적용한다. sortBy는 합류·historical 결과에도 적용(population/area 없는 역사국가는 뒤로 tiebreak)하거나, 무효 컨텍스트에서 해당 셀렉트를 disabled+title 사유('과거 국가는 이름순 고정') 처리한다.

<details><summary>검증 노트</summary>

코드로 전 항목 확증. (1) country-list-state.context.tsx:131-135 historical 분기는 continentFilter·sortBy 모두 무시하고 이름순 고정 — 사실. (2) 126-129 matchesHistoricalSearch는 name/enName만 검사, continentFilter 미반영 — 사실이며, historicalToUnified(unified-types.ts:89-112)가 continentId를 아예 매핑하지 않아 역사국가 대륙필터는 부모 현대국가 경유 없이는 불가능(권고안의 방향과 일치). (3) 150-156 검색 분기는 countryTypeFilter 무검사로 역사국가 합류 후 무조건 localeCompare 이름순 — '현대' 명시+검색 시 과거 합류, '인구순' 무음 override 모두 사실. (4) 하류 방어 없음: country-list.tsx:174-214가 filtered의 type!=='modern' 행을 그대로 '과거 국가' 섹션으로 렌더(207-214), 유형 재필터·대륙 리셋 로직 부재 — 재현 시나리오 구조적 성립. (5) 필터 UI는 country-list-filters.tsx:138-173 셀렉트 3종 전부 disabled 없이 항상 활성, 모바일(country-mobile-ui.tsx:120-145)도 동일. 유일한 반론 후보인 filters:105 주석('검색 중 역사국가 합류하므로 배지 숨김')은 합류가 '전체' 맥락의 의도적 발견 기능임을 보여주지만 'modern' 계약 위반과 정렬·대륙 우회는 어디서도 방어/고지되지 않아 발견을 기각하지 못함. severity P2·effort S·line 150 모두 타당.

</details>

### F4 [P2/S/CONFIRMED] 대륙 미로드·고아 continentId 시 국가가 통째로 유실(never-drop 위반) — 빈 화면 깜빡임 레이스 포함

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:194` · 렌즈: correctness, ux-ia

groupedByContinent(country-list.tsx:172-215)는 line 180에서 `country.continentId ?? UNKNOWN`으로 groups에 넣지만, 결과 조립은 orderedContinents(194-198)와 '__unknown__'(199-206)만 push — continentId가 로드된 continents 배열에 없는 국가는 어느 섹션에도 못 들어가 조용히 사라진다(키보드 nav flatRowIds:251-266도 같은 그룹 구조에서 파생). 트리거 (a) useContinents 지연/실패: use-content-core-data.hook.ts:46이 `useContinents()`에서 data만 구조분해하고 isLoading(115행)은 `isLoadingCountries || isLoadingHistorical`뿐이라 스켈레톤 게이트(country-list.tsx:397 `isLoading && unifiedCountries.length === 0`)에 대륙 로딩이 빠짐 → 국가 fetch 완료·대륙 미완 구간에 filtered.length>0이라 빈 상태 컴포넌트도 안 뜨고, continentId 있는 국가 전부 드랍 = 사실상 빈 목록(continentId null 국가만 '미분류'로 잔존). useContinents는 initialData 없는 순수 useQuery 3개 병렬 중 하나라 콜드 캐시에서 순서 보장 없음. (b) 대륙 삭제: DB는 hard delete + Country.continent `onDelete: SetNull`(libs/db/prisma/country.prisma:78, continent.prisma.repository.ts:68)이라 '영구 유실'은 아니고 국가 refetch 후 미분류로 복귀하지만, useDeleteContinent(use-continents.hook.ts:162-172)가 continents 목록만 무효화하고 국가 쿼리는 안 건드려 refetch 전까지 해당 대륙 소속 국가들이 사이드바에서 일시 유실되는 stale 창이 실재한다. 헤더 카운트(country-list.tsx:334-338)는 필터 비활성 시 unifiedCountries.length 전체 수를 표시해 '카운트는 그대로인데 행이 없는' 불일치가 드러남. 사건 목록에서 이미 고친 그룹핑 never-drop 결함과 동일 계열.

**권고:** orderedContinents·'__unknown__' push 후 groups에 남은 미매칭 키의 국가를 '미분류' 섹션에 합류시켜 어떤 시점에도 드랍이 없게 하고(never-drop), isLoading에 대륙 쿼리 로딩도 포함(또는 대륙 미로드 시 그룹핑 보류)한다. 둘 다 적용이 가장 안전.

<details><summary>검증 노트</summary>

코드로 전부 확증. (1) 드랍 로직 사실: country-list.tsx:180이 continentId를 키로 groups에 넣지만 결과 조립은 orderedContinents(194-198)·'__unknown__'(199-206)·historicalMatches(208-214)만 push — 로드된 continents에 없는 continentId 국가는 조용히 유실되고 키보드 nav flatRowIds도 같은 구조에서 파생돼 방어 계층 없음. (2) 레이스 사실: use-content-core-data.hook.ts:46이 useContinents에서 data만 구조분해(isLoading 미사용), 115행 isLoading은 isLoadingCountries||isLoadingHistorical뿐, useContinents(use-continents.hook.ts:55-61)는 initialData/placeholder 없는 순수 useQuery → 국가 완료·대륙 미완 구간에 스켈레톤(397행 게이트) 꺼지고 filtered.length>0라 빈 상태도 안 떠 continentId 있는 국가 전부 드랍. (3) 카운트 불일치 사실: 334-338행이 필터 비활성 시 unifiedCountries.length 전체 수 표시. 단 (b) '영구 유실'은 과장 — DB가 hard delete + onDelete:SetNull이라 refetch 후 미분류로 복귀(정정 참조). 실제 (b)는 useDeleteContinent가 국가 쿼리를 미무효화해 생기는 일시적 stale 드랍. 시각적 깜빡임 자체는 런타임 미확인이나 로직 경로는 결정적이라 CONFIRMED.

</details>

### F7 [P2/S/CONFIRMED] 헤더 카운트 배지의 분모가 현대 국가뿐 — '과거' 필터에서 거짓 분수(193/195), 검색 시 분자>분모 가능

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:334` · 렌즈: ux-ia, correctness, architecture

country-list.tsx:334-338 `count={ hasFilterActive && filtered.length !== unifiedCountries.length ? `${filtered.length}/${unifiedCountries.length}` : unifiedCountries.length }`. unifiedCountries는 현대만(use-content-core-data.hook.ts:79-82). (1) '과거' 필터 시 분자=역사 전체·분모=현대 수로 서로 다른 모집단의 분수(역사 193 vs 현대 195면 '193/195' — 필터로 2개 줄어든 것처럼 읽힘), (2) 검색 시 역사 합류로 분자가 분모 초과 가능('210/195'), (3) 평시 총계도 역사 제외라 '국가 목록 195' 배지와 '과거 국가 193개 보기' 배지가 합산이 안 맞는 인상. (4) 우연히 filtered.length===unifiedCountries.length면 필터 중인데도 총계만 표시되는 오해 소지.

**권고:** 분모를 현재 유형 필터의 모집단으로 일치: 전체/현대 → 현대 수, '과거' → historicalCount(Context 기제공), 검색 시 → 현대+역사 합집합 수. 필터 활성 여부와 무관하게 '표시 N / 모집단 M' 의미를 고정하고 title 툴팁으로 의미를 명시한다.

<details><summary>검증 노트</summary>

인용 코드(country-list.tsx:334-338)와 4개 하위 주장 전부 코드로 확증. (1) unifiedCountries는 use-content-core-data.hook.ts:79-82에서 countries.map(modernToUnified)로 현대만 포함. (2) '과거' 필터 시 country-list-state.context.tsx:131-135가 filtered=historicalUnified를 반환하고 hasFilterActive(country-list.tsx:130-131)는 countryTypeFilter!=='all'로 참 → 배지가 '역사수/현대수'라는 이종 모집단 분수를 결정적으로 표시. (3) 검색 시 context.tsx:150-155가 현대 매칭+역사 매칭을 합류하는데 분모는 현대 총수 고정이라 분자>분모 산술적으로 성립, 방어 없음. (4) 평시 헤더 배지(현대만)와 필터바 '과거 국가 N개 보기'(country-list-filters.tsx:190, historicalCount) 동시 노출로 합산 불일치 인상도 사실. (5) filtered.length===unifiedCountries.length 우연 일치 시 필터 중에도 총계만 표시되는 조건식도 사실. SidebarHeader(sidebar-header.tsx:15,32)는 count를 그대로 렌더할 뿐이고 Context의 historicalCount는 헤더에 미배선 — 다른 계층의 방어 없음. 보너스: use-content-core-data.hook.ts:26-27의 인터페이스 주석("현대+옵션 역사 통합 목록")이 구현(현대만)과 어긋난 stale 주석으로 혼동을 강화. severity P2 적정('과거' 필터 주요 경로에서 항상 틀린 정보 표시), recommendation의 historicalCount는 Context에 기제공되어 effort S 타당.

</details>

### G1-1 [P2/M/CONFIRMED] 국가 목록 fetch 실패가 '등록된 국가가 없어요' 빈 상태로 위장 — 에러 상태·재시도 수단 전무, 전역 retry:false라 일회 실패가 영구화

`apps/web-admin/src/widgets/content-shell/model/use-content-core-data.hook.ts:43` · 렌즈: gap

use-content-core-data.hook.ts:43-45가 `const { data: apiCountries, isLoading: isLoadingCountries } = useCountries()`처럼 두 목록 쿼리에서 data/isLoading만 구조분해하고 isError·error·refetch를 전면 폐기한다(grep 결과 country-list·content-shell 트리 전체에 에러 참조 0건 — 유일한 히트는 country-list-context-menu.tsx:154의 danger 색상). fetch 실패 시 isLoading=false·data=undefined가 되어 country-list.tsx:397 분기(`isLoading && unifiedCountries.length === 0 ? <CountryListSkeleton/> : filtered.length === 0 ? <CountryListEmpty/>`)가 CountryListEmpty를 렌더 — '등록된 국가가 없어요'(country-list-empty.tsx:37) 카피와 '새 국가 등록' CTA(:72-73)가 서버/네트워크 장애를 데이터 부재로 오인시키고, 목록이 비어 보인다는 이유로 중복 등록까지 유도할 수 있다. 악화 요인: shared/queryClient.ts:8-9가 전역 `retry: false`·`refetchOnWindowFocus: false`라 자동 재시도도 포커스 복귀 재조회도 없고, 쿼리에 throwOnError가 없어 app.tsx:244의 SmartErrorBoundary(렌더 에러 전용)에도 안 잡힘 — 복구 경로가 /history 섹션 완전 이탈 후 재진입 또는 전체 새로고침뿐. 셸이 sub-route 전환에도 유지되므로 상세 페이지를 오가는 정상 사용 중에는 리마운트 재조회조차 발생하지 않는다. react-query v5(^5.90.16)의 networkMode 기본값 'online'에서는 오프라인 첫 진입 시 쿼리가 paused(isFetching=false→isLoading=false)가 되어 스켈레톤도 아닌 빈 상태가 즉시 뜬다. country-mobile-ui 오버레이도 동일하게 에러 참조 0건.

**권고:** HistoryCoreData 반환에 isError(두 쿼리 OR)와 refetchAll(두 쿼리 refetch 합성)을 추가하고 CountryListStateContext로 전달. country-list.tsx:397 분기를 3원으로 확장 — isError && filtered.length === 0이면 CountryListError 컴포넌트(EmptyFilterState 스타일 재사용: '목록을 불러오지 못했어요' 카피 + refetchAll을 호출하는 '다시 시도' 버튼, 등록 CTA는 제외) 렌더. 빈 상태의 '등록된 국가가 없어요' 단정 카피는 에러가 배제된 경우에만 노출. 모바일 오버레이(country-mobile-ui)에도 같은 분기 적용. 선택적으로 목록 2종 쿼리만 retry: 1~2 부여 검토.

<details><summary>검증 노트</summary>

전 주장 실코드 검증 일치: use-content-core-data.hook.ts:43-45가 data/isLoading만 구조분해하고 HistoryCoreData에 isError/refetch 부재; country-list.tsx:397 분기가 에러 시(isLoading=false·data=undefined) CountryListEmpty('등록된 국가가 없어요'+등록 CTA, country-list-empty.tsx:37·72-73)를 렌더; queryClient.ts:8-9 전역 retry:false·refetchOnWindowFocus:false에 개별 쿼리 오버라이드·throwOnError 없어 SmartErrorBoundary(app/app.tsx:244) 미포착; 3개 트리 에러 참조 grep 0건(유일 히트=context-menu:154 danger 색상, 서술 그대로); react-query ^5.90.16 v5의 isLoading=isPending&&isFetching이라 오프라인 paused 시 빈 상태 즉시 렌더 주장도 정확; 모바일(country-mobile-ui.tsx:170)은 에러 분기는 물론 스켈레톤 분기조차 없어 더 취약. 추가 확인으로 web-admin 전체에 axios 응답 인터셉터·QueryCache onError 0건 — 실패가 토스트로도 표면화되지 않아 '빈 상태 위장'이 완전하며 기존 방어 전무. 반박 실패.

</details>

### G1-2 [P2/M/CONFIRMED] 역사 국가 쿼리만 실패하면 '과거' 필터·검색 합류·미연결 배지가 부분 데이터를 완전한 것처럼 무음 표시 — `?? []`가 실패를 빈 목록으로 강제

`apps/web-admin/src/widgets/country/country-list/country-list-state.context.tsx:89` · 렌즈: gap

두 목록 쿼리는 독립이라 한쪽만 실패할 수 있는데 use-content-core-data.hook.ts:115의 `isLoading: isLoadingCountries || isLoadingHistorical`은 로딩만 합산하고 실패는 구분 신호가 없다. 역사 쿼리 실패 시 apiHistoricalCountries=undefined인데 country-list-state.context.tsx:89의 `;(apiHistoricalCountries ?? []).forEach(...)`가 이를 빈 배열로 강제해 historicalUnified가 현대 국가 응답에 딸린(bridged) 항목만으로 구성됨 — '과거' 필터(:131-134)는 미연결 역사국가가 전부 빠진 부분 목록(또는 거짓 빈 상태)을 정상처럼 반환하고, 검색 합류(:150-155)·카운트 배지(historicalCount, :191)·unlinkedHistoricalIds(:115의 동일 `?? []` → 빈 Set이라 미연결 배지 전멸)도 함께 조용히 결손된다. 반대로 현대 쿼리만 실패하면 '전체' 뷰는 빈 상태로 위장되면서 '과거' 필터는 역사 API 목록만으로 반쪽 동작 — 같은 장애가 필터에 따라 다르게 위장되는 비일관까지 발생. 총체 실패(발견 1)와 달리 이 케이스는 빈 상태조차 안 뜨고 '성공처럼 보이는 부분 데이터'가 렌더되므로 사용자·저작자가 결손을 인지할 방법이 전무하다.

**권고:** use-content-core-data가 쿼리별 플래그(isErrorCountries·isErrorHistorical·각 refetch)를 분리 노출. 역사 쿼리 실패 시 '과거' 필터·검색 합류 상단에 인라인 배너('역사 국가 목록을 불러오지 못했어요 — 일부만 표시 중' + 재시도 버튼)를 렌더하고, historicalCount 배지와 미연결 배지는 결손 상태임을 알 수 없으므로 에러 동안 비표시(또는 ~ 표기)로 강등. `?? []` 무음 강제 지점 2곳(:89, :115)에 에러 분기 주석을 남겨 실패=빈 목록 동치화를 차단.

<details><summary>검증 노트</summary>

모든 인용 라인 실측 일치: use-content-core-data.hook.ts:43-45가 두 쿼리에서 data/isLoading만 구조분해하고 :115가 로딩만 합산(에러 신호 전무), country-list-state.context.tsx:89·:115의 `?? []`가 에러 상태(undefined)를 빈 배열로 강제. 실패 모드는 이론이 아니라 실제로 잘 터짐 — shared/queryClient.ts:8이 전역 retry:false(+refetchOnWindowFocus:false)라 1회 실패 즉시 에러 확정·자가치유 없음, API 래퍼(historical-countries.ts:40-41)는 rethrow라 삼킴 없음. 에러를 표면화하는 레이어 전무 확인: country-list·content-shell 전체에 isError 사용 0건, QueryCache onError/토스트 없음, app.tsx:244 ErrorBoundary는 render throw만(throwOnError 미설정). 파급도 전부 실증 — '과거' 필터(:131-135) 부분목록 정상위장, 검색 합류(:150-156) 역사 결과 무음 결손, historicalCount(:191)→country-list-filters.tsx:107·190 scent 행 과소/소멸, 빈 unlinkedHistoricalIds→filters.tsx:109·195와 country-list-row.tsx:97 배지 전멸. 역방향 비대칭도 확인: 현대 실패 시 countries=[](hook:49)로 country-list.tsx:397 스켈레톤 이후 빈 목록 위장, '과거' 필터는 반쪽 동작. P2·line 89·effort M 모두 적정.

</details>

### G1-3 [P3/S/CONFIRMED] 스켈레톤 게이트가 현대 목록 길이로만 판정 — '과거' 필터에서 역사 API 로딩 중 스켈레톤 없이 거짓 빈 상태 플래시 또는 미연결 국가 빠진 부분 목록 노출

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:397` · 렌즈: gap

country-list.tsx:397의 게이트 `isLoading && unifiedCountries.length === 0`에서 unifiedCountries는 현대 국가만의 변환(use-content-core-data.hook.ts:79-82, modernToUnified)이다. 현대 응답이 역사 응답보다 먼저 도착하면 isLoading=true(isLoadingHistorical, :115)인데도 length>0이라 스켈레톤을 탈출하고, '과거' 필터 상태의 filtered는 그 시점 historicalUnified(country-list-state.context.tsx:87-100 — apiHistoricalCountries가 아직 undefined라 현대 응답에 내장된 bridged 항목만)로 계산된다. 결과: 내장 역사국가가 없으면 '등록된 과거 국가가 없어요'(country-list-empty.tsx:34) 거짓 플래시 후 목록이 뒤늦게 등장, 있으면 미연결 역사국가가 전부 빠진 부분 목록이 로딩 표시 없이 노출되다가 항목이 불쑥 늘어난다. '전체' 필터에서도 같은 창에서 historicalCount 배지·검색 합류 결과가 로딩 신호 없이 뒤늦게 변한다. 발견 1·2(에러 축)와 별개인 순수 로딩-게이트 키잉 결함.

**권고:** 스켈레톤 게이트를 활성 필터의 데이터 소스 기준으로 판정: use-content-core-data가 isLoadingCountries·isLoadingHistorical을 분리 노출하고, countryTypeFilter==='historical'이면 `isLoadingHistorical && filtered.length === 0`을, 그 외에는 기존 조건을 사용. 역사 데이터가 아직 로딩 중인데 부분 목록을 이미 표시하는 창(과거 필터·검색 합류)에는 목록 하단에 소형 로딩 인디케이터를 덧붙여 '더 오는 중' 신호를 제공.

<details><summary>검증 노트</summary>

코드 전 구간 실독으로 결함 체인 확인: (1) country-list.tsx:397 게이트가 `isLoading && unifiedCountries.length === 0`인데 unifiedCountries는 use-content-core-data.hook.ts:79-82에서 현대 국가만의 변환(countries.map(modernToUnified))이고, (2) isLoading은 :115에서 `isLoadingCountries || isLoadingHistorical` 합성 — 두 쿼리는 별개 useQuery(별개 엔드포인트)라 도착 순서 비결정이므로 현대 응답 선착 시 역사 로딩 중에도 스켈레톤을 탈출한다. (3) 그 시점 'historical' 필터의 filtered는 country-list-state.context.tsx:87-100의 historicalUnified가 `apiHistoricalCountries ?? []` 폴백으로 현대 응답 내장 bridged 항목만 담아, 내장 0건이면 country-list-empty.tsx:34의 '등록된 과거 국가가 없어요' 거짓 플래시, 있으면 미연결 역사국가가 빠진 부분 목록이 로딩 신호 없이 노출됨을 확인. (4) country-list-filters.tsx에 로딩 중 필터 비활성화가 전무해 방어 없음. 유일한 완화 요인은 countryTypeFilter가 비영속 useState('all')(context :77-78)이라 '과거' 필터 증상은 초기 로딩 창 내 사용자 전환이 전제라는 점이나, '전체' 필터 축 증상(historicalCount 배지·검색 합류 지연 변동)은 사용자 행동 없이 발생하며 발견이 이미 P3로 책정해 과대평가가 아니다. 라인·severity·effort 정정 불요.

</details>

### G2-1 [P3/S/CONFIRMED] useContentCoreData가 react-query 캐시의 중첩 배열을 in-place .sort()로 변이 — 타 소비처 7곳이 조용히 재정렬된 데이터를 봄

`apps/web-admin/src/widgets/content-shell/model/use-content-core-data.hook.ts:69` · 렌즈: gap

use-content-core-data.hook.ts:69-75의 `historicalCountries: (country.historicalCountries || []).sort(…)`가 useCountries() 응답의 중첩 배열을 제자리 정렬로 변이한다. useCountries(features/country/api/use-countries.hook.ts:59-66)는 select 변환이 없어 data가 react-query 캐시 소유 객체 그 자체이고(staleTime 5분·gcTime 30분), shared/api/countries.ts:19-27도 SDK 응답을 그대로 반환하므로 이 sort는 캐시 엔트리를 직접 오염시킨다 — react-query 불변성 계약 위반. 파급: (1) 같은 ['countries','list'] 캐시를 구독하는 tenure-register-panel.tsx:417, sovereign-reign-register-panel.tsx:335, dynasty-rule-form.tsx:101, command-palette.tsx:71, use-registration-feed.hook.ts:56, use-continent-page.hook.ts:32, url-sync.ts:79 전부가 /history 셸 마운트 전후로 중첩 배열 순서가 달라지는 변이된 캐시를 관찰한다(단, 실사 결과 이들 7곳은 현재 중첩 배열을 순서무관하게 읽거나 별도 쿼리 useHistoricalCountriesByModernCountry를 쓰므로 오늘 깨지는 곳은 없음 — 잠복 위험). 순서 의존이 실재하는 곳은 linked-historical-countries-section.widget.tsx:589 `const list = country.historicalCountries ?? []` — 자체 재정렬 없이 받은 순서 그대로 렌더하며, country prop이 country-detail-shell.tsx:94-97 countriesById→변이된 캐시 배열로 이어져 표시 순서가 이 은닉 변이에 의존한다. (2) 백그라운드 refetch마다 replaceEqualDeep이 서버 순서 응답과 변이(재정렬)된 캐시를 비교 — 순서가 다르면 서버 데이터 무변경에도 새 참조가 전 구독처에 전파돼 스퓨리어스 리렌더가 발생하고 직후 memo가 다시 제자리 정렬하는 사이클이 반복된다. (3) useUpdateCountry의 setQueryData 얕은 병합(use-countries.hook.ts:148-154 `{ ...c, ...updated }`)이 변이된 중첩 배열을 새 캐시 엔트리로 승계한다. (4) 변이가 useMemo 즉 렌더 단계 부수효과라 StrictMode·동시 렌더링 순수성 가정을 위반한다.

**권고:** 정렬 전에 사본을 만들어 캐시 원본을 보존: `historicalCountries: [...(country.historicalCountries ?? [])].sort((a, b) => …)` 한 줄 수정 (lib 타깃이 ES2023 이상이면 `(country.historicalCountries ?? []).toSorted(…)`도 가능). 이렇게 하면 캐시는 서버 순서를 유지해 타 소비처의 순서 비결정성과 refetch 시 structural sharing 오염·스퓨리어스 리렌더 사이클이 함께 해소된다. 사이드바가 원하는 최신순 정렬은 useMemo 산출물(사본)에만 남는다.

<details><summary>검증 노트</summary>

실코드로 전 주장 검증. use-content-core-data.hook.ts:69-75가 useCountries() 캐시(select 무변환, shared/api/countries.ts는 SDK 응답 그대로 반환)의 중첩 historicalCountries 배열을 in-place .sort()로 변이함을 확인 — react-query 캐시 오염 실재. 소비처 7곳의 파일·라인 전부 정확(tenure-register-panel:417, sovereign-reign:335, dynasty-rule-form:101, command-palette:71, use-registration-feed:56, use-continent-page:32, url-sync:79, 모두 countryKeys.lists() 구독). linked-historical-countries-section:589의 `country.historicalCountries ?? []` 무정렬 렌더와 그 country가 shell→countriesById→변이된 배열로 이어지는 경로도 확인. setQueryData 얕은 병합(use-countries.hook.ts:148-154)·렌더단계 부수효과·refetch 시 replaceEqualDeep 처른(조건부 서술로 정확히 헤지됨)도 성립. tsconfig lib이 es2017이라 toSorted 불가 조건부 권고도 정확. 유일한 소폭 과장: 7곳 중 현재 중첩 배열 '순서'를 민감하게 읽는 곳은 없음(패널들은 별도 useHistoricalCountriesByModernCountry 쿼리, 피드는 순서무관 Map) — 다만 변이된 캐시 관찰 자체는 사실이라 발견 성립에 영향 없음. 가시적 사용자 버그가 아직 없으므로 P3·S 유지 타당.

</details>

## 배치 2 — 선택 추적·빠른접근 정합

### F1 [P2/M/CONFIRMED] 딥링크·팔레트 선택 시 사이드바 무동작 — 접힌 그룹 자동 펼침 부재 + 로드 레이스 + 80ms 매직 타이머

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:275` · 렌즈: ux-ia, correctness, performance, architecture

첫 진입 기본값이 sentinel 'all'(전체 접힘, country-list.tsx:72-81)인데 선택 변경 effect(275-284)는 80ms setTimeout 1회 후 전역 document.getElementById(`country-${selectedId}`)로 scrollIntoView만 시도한다. (a) 선택 국가가 접힌 그룹 안이면 행이 언마운트(:475 `!isGroupCollapsed && …map`)라 null→무동작이며, selectedId로 그룹을 펼치는 코드가 어디에도 없다(collapsedGroups 관리 주체는 이 파일뿐). (b) URL 직접 진입 시 selectedId는 마운트 시점 확정(country-detail-shell.tsx:85)인데 행은 데이터 로드 후 렌더 — deps가 [selectedId]뿐이라 재시도 없음. (c) 기본(무필터) 상태에서 역사국가는 filtered에서 제외(country-list-state.context.tsx:138)라 메인 목록에 행 자체가 없어 무동작(검색 매칭·'과거' 필터 시에는 행·id가 생겨 동작). (d) 핀/최근 행은 id 미부여(country-list-row.tsx:102)라 스크롤 타깃 없음. 80ms는 근거 없는 매직 넘버고 키보드 nav의 focusRow(rAF, use-list-keyboard-nav.ts:39)와 스크롤 트리거가 이원화돼 있다. 완화 요인: 셸이 선택 국가를 최근 store에 push(country-detail-shell.tsx:89-91)하고 __recent__/__pinned__ 섹션은 'all' sentinel에서도 펼침 유지(country-list.tsx:84-87)라, 딥링크·⌘K 진입 사용자도 데이터 로드 후 상단 '최근' 섹션에서 선택 국가를 하이라이트로 볼 수는 있다. 그러나 해당 국가가 어느 대륙 그룹에 속하는지의 위치 맥락은 수동으로 그룹을 펼치기 전까지 발견 불가하고, 자동 스크롤 effect는 설계 목적인 외부 진입 시나리오 전부에서 무동작이다. 또한 행에 scroll-margin이 없어 sticky 그룹 헤더(country-list.styles.ts:697)에 스크롤 결과가 가려질 수 있다.

**권고:** selectedId 변경 시 해당 국가의 continentId 그룹(역사국가는 부모 현대 국가 그룹 또는 '__historical__')을 collapsedGroups에서 제거해 자동 펼침(sentinel은 그 그룹만 펼치게 materialize, localStorage 미저장으로 명시적 접힘 의도 보존)한 뒤, rAF에서 listRef.current.querySelector로 스코프 한정 스크롤. deps에 데이터 준비 신호(filtered.length/isLoading)를 추가해 로드 완료 후 1회 재시도. sticky 그룹 헤더에 가리지 않게 행에 scroll-margin-top 부여.

<details><summary>검증 노트</summary>

코드로 전 항목 실증: (a) sentinel 'all'(country-list.tsx:72-81) + 접힌 그룹 행 언마운트(:475)로 getElementById null→무동작, selectedId 기반 그룹 펼침 코드 부재(전역 grep으로 'country-list-collapsed-groups' 관리 주체가 이 파일뿐임을 확인). (b) selectedId=params.countryId 마운트 확정(country-detail-shell.tsx:85), effect deps [selectedId]뿐·80ms 1회(:275-284)로 로드 후 재시도 없음. (d) 핀/최근 행 id 미부여(country-list-row.tsx:102) 정확. focusRow rAF(use-list-keyboard-nav.ts:39) vs setTimeout 80ms 이원화도 사실. sticky 헤더(country-list.styles.ts:697)에 scroll-margin 부재로 권고안도 유효. 단 2건 정정: (1) 셸이 선택 국가를 최근 store에 push(country-detail-shell.tsx:89-91)하고 __recent__/__pinned__은 'all'에서도 펼침 유지(country-list.tsx:84-87)라 딥링크 사용자도 상단 '최근' 섹션에서 선택 국가를 하이라이트로 봄 — '접힌 대륙 헤더 7줄뿐'·'1차 존재 이유가 무너진다'는 과장. 잃는 것은 대륙 그룹 내 위치 맥락과 스크롤. (2) '(c) 역사국가 항상 무동작'도 과함 — 검색 매칭·'과거' 필터 시 행이 렌더되고 id 부여됨(:102는 isQuickAccess만 제외). 기본(무필터) 상태 한정이 정확. 스크롤 effect가 설계 목적 시나리오(외부 진입)에서 전부 무동작인 명확한 결함이므로 P2 유지.

</details>

### F5 [P2/S/CONFIRMED] 미연결 역사국가는 핀·최근에 추가해도 빠른접근 섹션에서 조용히 사라짐 — 자체 flatById가 원인(countriesById 미활용 중복 구축)

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:137` · 렌즈: correctness, state-persistence, performance

quickAccessItems의 flatById(country-list.tsx:133-157)가 unifiedCountries(현대, use-content-core-data.hook.ts:79-82)와 그 하위 historicalCountries만 순회 — 현대 국가에 브리지되지 않은 미연결 역사국가(unlinkedHistoricalIds가 1급 상태로 다루는 부류)는 맵에 없어 filter(150·154)에서 탈락한다. 그런데 '과거' 필터 행(country-list-row.tsx:181-192 PinButton)·우클릭 메뉴(country-list-context-menu.tsx:68-77)에서는 핀 토글이 열려 있고 별도 활성 표시된다 — 핀은 localStorage에 영속되지만 '고정' 섹션에 결코 안 나타나는 silent failure. 최근(방문)도 동일 탈락. command-palette는 itemsById에 전체를 포함해 정상 해소(비대칭). 부가: use-content-core-data.hook.ts:90-106의 countriesById가 이미 현대+raw 역사+하위 역사 3원 합집합 인덱스를 만드는데 Context 미노출이라 매번 flatById를 전수 재구축하는 성능 중복이자 이 결함의 원인이고, `{...h, type:'historical'} as unknown as UnifiedCountry` 캐스팅(141-144)도 historicalToUnified를 우회한다.

**권고:** flatById 자체 제작을 버리고 core의 countriesById를 CountryListStateContextValue에 노출해 `pinnedIds.map((id) => countriesById.get(id))`로 해소한다(O(1), 순회 로직 제거). 수동 스프레드 캐스팅은 historicalToUnified 경유로 교체해 변환 단일출처를 지킨다.

<details><summary>검증 노트</summary>

코드만으로 전 항목 확증. (1) country-list.tsx:133-157 flatById는 unifiedCountries(use-content-core-data.hook.ts:79-82 — countries.map(modernToUnified)로 현대만)와 현대 국가의 historicalCountries만 순회 — apiHistoricalCountries에만 있는 미연결 역사국가는 맵에 없어 148-150(핀)·151-155(최근)의 filter에서 조용히 탈락. (2) '과거' 필터 시 filtered=historicalUnified(country-list-state.context.tsx:87-100, apiHistoricalCountries 포함)라 미연결 행이 렌더되고, CountryListRow는 PinButton을 무조건 렌더(181-192)·우클릭 메뉴 핀 항목(context-menu 68-77)도 열려 있으며 같은 행에 '연결 안 됨' 배지(170-174)까지 표시 — 핀은 zustand persist 'pinned-countries'로 localStorage 영속되지만 고정 섹션에 결코 안 나타남. (3) 최근도 country-detail-shell.tsx:88-91이 selectedId(역사국가 포함)를 pushRecent하므로 동일 탈락. (4) command-palette.tsx:80-92 itemsById는 useHistoricalCountries 전체 포함 — 비대칭 사실. (5) use-content-core-data.hook.ts:90-106 countriesById가 3원 합집합 인덱스를 이미 만들지만 CountryListStateContextValue(context 21-47)에 미노출 — 매번 flatById 재구축 사실. (6) 141-144 스프레드 캐스팅이 historicalToUnified(unified-types.ts:89-112 whitelist 프로젝션) 우회 사실. 다른 계층 방어 없음, 재현 시나리오(과거 필터에서 핀→필터 해제→고정 섹션 미표시) 성립. severity P2(핀 자체는 저장되어 데이터손실·접근불능은 아니므로 P1 아님)·effort S·라인 137 모두 적정, 정정 불요.

</details>

### F12 [P2/S/CONFIRMED] 마우스 클릭 후 화살표 키를 누르면 목록 맨 위로 점프 — focusedIndex와 DOM 포커스 불일치

`apps/web-admin/src/widgets/country/country-list/model/use-list-keyboard-nav.ts:52` · 렌즈: a11y

use-list-keyboard-nav.ts:31의 focusedIndex는 focusRow를 통해서만 갱신되는데 행 클릭 시(tabIndex=-1 div라 클릭으로 포커스를 받음) 동기화되지 않는다. 이후 ArrowDown을 누르면 line 52 `const idx = focusedIndex >= 0 ? focusedIndex : 0`이 0으로 평가되어 focusRow(1) — 방금 클릭한 행과 무관하게 평탄화 인덱스 1번 행으로 점프한다. 행 keydown은 컨테이너 onKeyDown(country-list.tsx:395)으로 버블되므로 이 경로가 실제로 실행된다. 마우스+키보드 혼용 시 내비게이션이 매번 리셋되는 명확한 버그.

**권고:** handleListKeyDown에서 focusedIndex 대신 document.activeElement의 data-row-index를 우선 읽어 현재 인덱스를 도출하거나, 행에 onFocus 핸들러를 달아 focusedIndex를 동기화한다(rowIndex는 이미 prop으로 전달되고 있어 배선만 추가).

<details><summary>검증 노트</summary>

모든 인용이 실코드와 일치. use-list-keyboard-nav.ts:31에서 focusedIndex는 초기값 -1이고 focusRow(37행)에서만 갱신되는데, 유일한 소비처인 country-list.tsx:268은 handleListKeyDown/handleSearchKeyDown만 구조분해하여 클릭·선택 경로에서 focusRow/setFocusedIndex를 호출하는 곳이 전무(전역 grep 확인). 행은 styled.div(country-list.styles.ts:768)에 tabIndex=-1·data-row-index 부여(country-list-row.tsx:104-105)로 클릭 시 포커스를 받지만 onFocus 핸들러가 없어 동기화 불가. keydown은 컨테이너 onKeyDown(country-list.tsx:395, 인용 라인 정확)으로 버블되고, line 52의 `focusedIndex >= 0 ? focusedIndex : 0`이 0으로 평가되어 focusRow(1) — 클릭한 행과 무관한 평탄화 인덱스 1로 점프. 코드만으로 결정론적으로 확증됨. 부가: 이전에 키보드 nav를 쓴 적이 있으면 -1이 아닌 stale 인덱스에서 재개되는 변종도 동일 근인(detail의 '매번 리셋' 서술과 부합). selectedId 스크롤 effect(275-284행)는 scrollIntoView만 하고 focusedIndex를 건드리지 않아 방어 계층 없음. P2·S 적정, 권고안(activeElement의 data-row-index 우선 판독 또는 행 onFocus 배선) 실행 가능.

</details>

### F59 [P3/S/CONFIRMED] 존재하지 않는 국가 id도 최근 방문에 push되고, 삭제된 국가 id는 핀·최근에서 영구 잔존(purge 부재)

`apps/web-admin/src/pages/country/country-detail-shell.tsx:90` · 렌즈: state-persistence

country-detail-shell.tsx:89-91 `useEffect(() => { if (selectedId) pushRecentCountry(selectedId) }, ...)`가 URL 파라미터를 존재 검증 없이 push한다 — notFound 판정(99행)과 무관하게 실행되므로 오래된 북마크·오타 URL·삭제된 국가 링크 방문도 dead id를 recentIds 맨 앞에 영속시키고, MAX_RECENT_COUNTRIES=8 cap에서 살아있는 항목을 밀어낸다(표시는 slice(0,5)라 dead id가 많으면 '최근' 섹션이 5개 미만으로 위축). 국가 삭제 플로우(use-country-form-handlers.hook.ts:64-75 deleteFromDetail)도 pinned/recent 스토어를 건드리지 않아 삭제된 id가 pinnedIds에 무기한 잔존. 표시 측은 lookup filter(country-list.tsx:148-155)로 방어되어 화면 오류는 없지만 영속 배열이 유령 id로 채워지는 정리 부재는 그대로다.

**권고:** (1) push 가드: `if (selectedId && countriesById.has(selectedId)) pushRecentCountry(selectedId)` — 셸이 이미 countriesById를 가져 한 줄 수정(로딩 중 미push는 다음 렌더에서 자연 보충). (2) purge: deleteFromDetail 성공 시 pinned 스토어에 remove(id) 액션을 추가해 호출하고 recentIds에서도 제거. (3) 선택적 lazy GC: 핵심 데이터 로드 완료 시 pinnedIds ∩ countriesById 1회 필터.

<details><summary>검증 노트</summary>

모든 인용이 소스와 일치. (1) country-detail-shell.tsx:89-91의 push는 존재 검증 없이 실행되고 notFound(99행)와 무관 — dead id가 recentIds 맨 앞에 영속됨을 코드로 확증. (2) recent-countries.store.ts:5 MAX_RECENT_COUNTRIES=8 cap에서 push가 slice(0,8)하므로 dead id가 살아있는 항목을 밀어냄. (3) country-list.tsx:148-155 lookup filter가 표시를 방어하나 recent의 slice(0,5)는 존재 필터 이후라 dead id가 많으면 섹션이 5개 미만으로 위축 — 인용 정확. command-palette.tsx:97-99도 동일 lookup filter로 방어되어 렌더 크래시 없음(P3 프레이밍과 일치). (4) deleteFromDetail(use-country-form-handlers.hook.ts:64-75)과 그 하위 remove 구현 둘 다(use-country-form-modal.hook.ts:104-123, use-historical-country-form-modal.hook.ts:128-151) confirm+mutate+toast만 수행, 전체 grep 결과 pinnedIds는 사용자 toggle 외 제거 경로 없음·recentIds는 push/전체 clear뿐 — purge 부재를 방어하는 계층 없음. pinned 스토어에 remove(id) 액션 부재도 사실이라 권고안 전제 성립. severity P3·effort S·line 90 모두 적정.

</details>

## 배치 3 — 역사국가 표시 정합 (BC·모바일)

### F6 [P2/S/CONFIRMED] 역사국가 popover 존속연도가 BC-safe 공용 포맷터를 우회한 원시 숫자 — BC 국가가 AD 하강 연대로 오독

`apps/web-admin/src/widgets/country/country-list/ui/country-list-children-popover.tsx:287` · 렌즈: ux-ia, correctness

country-list-children-popover.tsx:287-292가 `{historical.startYear}{endYear ? `–${endYear}` : ''}`로 era 필드를 무시하고 raw 연도만 출력한다. 경량 DTO(HistoricalCountrySimpleResponseDto)에 startEra/endEra가 내려오는데도 미사용 — 로마 왕국(BC 753–BC 509)이 '753–509', 로마 공화국(BC 509–BC 27)이 '509–27'로 AD 하강 연대처럼 읽힌다. 같은 트리의 CountryListRow(country-list-row.tsx:91-95)는 F7/F37 규약대로 formatCountryPeriod를 경유해 지면 간 표기가 어긋나고, country-period.ts 주석 스스로 이 오독을 포맷터 신설 근거 결함으로 명시했다. 부수 1: endYear만 있고 startYear가 없으면 falsy 가드로 기간이 아예 안 보임. 부수 2: 같은 결함 계열로 use-content-core-data.hook.ts:69-75의 자식 정렬이 `a.endYear || a.startYear || 0` 원시 비교라 BC 국가의 '최신순' 순서가 뒤틀린다.

**권고:** popover 자식 행 기간을 formatCountryPeriod(historical, { variant: 'short' })로 교체(경량 DTO가 CountryPeriodShape 충족)하고, use-content-core-data의 historicalCountries 정렬도 country-period.ts의 toSignedYear/compareByCountryStart 계열로 교체한다(부호 연도 진실 원칙).

<details><summary>검증 노트</summary>

전 주장 코드로 확증. (1) country-list-children-popover.tsx:287-292가 인용 그대로 era 무시 raw 연도 출력(`{historical.startYear}{historical.endYear ? `–${endYear}` : ''}`), 파일 내 era/포맷터 사용 전무. (2) 경량 DTO HistoricalCountrySimpleResponseDto(historical-country-simple.response.ts:39/45/63/69)에 startEra/endEra 존재, CountryResponseDto.historicalCountries(country.response.ts:63)→SDK Awaited 타입→CountryHistoricalEntry로 프론트까지 도달(historicalToUnified가 in-가드 없이 country.startEra 접근, tsc 통과가 구조적 증거). (3) 같은 트리 country-list-row.tsx:91-95는 "BC 국가가 AD로 오독되지 않도록 ... (F7/F37)" 주석과 함께 formatCountryPeriod(variant:'short') 경유 — 지면 간 표기 어긋남 사실. (4) country-period.ts 헤더 주석이 "BC 국가가 AD 하강 연대로 오독되거나(로마 계보 역순 화살표)"를 신설 근거로 명시. (5) 부수1: 287행 `historical.startYear &&` falsy 가드로 endYear-only면 기간 미표시 사실. (6) 부수2: use-content-core-data.hook.ts:69-73의 `a.endYear || a.startYear || 0` 원시 내림차순 정렬 사실 — BC 509가 509로 비교돼 AD 476보다 '최신' 취급되고, popover의 children이 이 정렬 결과를 그대로 소비하므로 popover 행 순서 자체도 뒤틀림(발견보다 한 걸음 더 직접적). 방어 계층 없음: 훅→modernToUnified→popover 사이 어디서도 era 보정·포맷 없음. 권고안 유효: 경량 DTO가 CountryPeriodShape(느슨한 구조 타입) 충족하므로 formatCountryPeriod drop-in 가능, 정렬은 toSignedYear로 교체 가능. severity P2(표시 오독·데이터손실 아님)·effort S 적정, 라인 287 정확.

</details>

### F25 [P3/S/CONFIRMED] 역사국가 popover의 강조색이 항상 회색 fallback — 대륙 색 전달 누락

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:569` · 렌즈: correctness

country-list.tsx:569-573에서 popover accentColor를 `getContinentColor({ continentId: parent.continentId ?? null })`로 계산하는데, getContinentColor(continent-colors.ts:37-49)는 continentId로는 SPECIAL_GROUP_COLORS('__pinned__' 등 4종)만 조회하고 실제 대륙 색은 continentName 기반(NAME_COLOR_MAP)이다. 대륙 UUID는 어느 맵에도 없어 항상 FALLBACK_COLOR('#a1a1aa') 반환. 본 목록에서는 그룹 accent를 continentId+continentName 둘 다 넘겨 계산(country-list.tsx:412-415)해 행 IsoBadge 틴트(country-list-row.tsx:127-132)가 대륙 색을 띠는데, 그 행에서 연 popover의 IsoBadge(헤더 country-list-children-popover.tsx:221·자식 행 :274-281)는 전부 회색으로 어긋난다. 참고: popover 자식 행에 넘기는 $accentColor(:248)는 ListRow CSS가 소비하지 않는 dead prop(country-list.styles.ts:771 선언만)이라 행 강조는 원래 theme 색이며, 실제 시각 피해는 IsoBadge에 한정된다.

**권고:** popover를 여는 시점(handleShowChildren 또는 행 렌더)에 이미 계산된 그룹 accent를 함께 전달하거나, continents에서 continentId→name을 조회해 getContinentColor에 continentName을 채워 넘긴다.

<details><summary>검증 노트</summary>

코드로 확증. country-list.tsx:569-573은 popover accentColor에 continentId만 넘기고 continentName을 안 넘김. getContinentColor(continent-colors.ts:37-49)는 id로는 SPECIAL_GROUP_COLORS 4종(__pinned__ 등)만 조회하고 실제 대륙 색은 NAME_COLOR_MAP(이름 키)에만 있어, 대륙 UUID는 어느 맵에도 없어 항상 FALLBACK_COLOR '#a1a1aa' 반환. 반면 본 목록 그룹 accent는 country-list.tsx:412-415에서 continentId+continentName 둘 다 넘겨 실제 색이 나옴 — 행(IsoBadge 틴트)과 popover의 색 어긋남 시나리오 성립. 다른 계층의 방어 없음. 단 detail 2곳 정정: (1) 목록 행의 대륙 색은 '스트립'이 아니라 IsoBadge 틴트+그룹헤더 dot으로 표출됨(ListRow의 $accentColor는 country-list.styles.ts:771에 선언만 되고 CSS에서 미사용), (2) popover 내 '행 강조'도 같은 이유로 dead prop이라 실제 회색화 피해는 IsoBadge(헤더+자식 행)에 한정됨.

</details>

### F10 [P2/M/CONFIRMED] 모바일 목록의 역사국가 행 깨짐(🏳️·'- · 수도 미상')·유형 필터 부재·공유 컨텍스트 트랩 — 데스크톱과 정보구조 패리티 붕괴

`apps/web-admin/src/widgets/country/country-mobile-ui/ui/country-mobile-ui.tsx:119` · 렌즈: ux-ia, architecture, parity

CountryMobileUI는 데스크톱과 같은 컨텍스트·filtered를 공유하지만(country-mobile-ui.tsx:4,24-34) 필터 행(119-156)에 대륙·정렬 select만 있고 유형(countryTypeFilter) 컨트롤·'과거 국가 N개 보기' 배지가 없다 — 역사국가 진입 수단이 전무해 정확한 이름 검색 외 도달 불가. 반대로 상태 공유 트랩: 데스크톱에서 'historical'을 켠 채 뷰포트가 1024px 이하가 되면 과거 국가만 나오는데 알리는 UI도 해제 수단도 없다(초기화 146-155는 query·continentFilter만 리셋). 검색 합류된 역사국가 행은 현대 전용 렌더라 깨진다: flagEmoji 없음→🏳️(222-224), '- · 수도 미상'(230-232), 존속기간 미표시. 행이 flagEmoji 기반인 것 자체가 데스크톱의 'flagEmoji 미사용 — ISO 박스/SVG fallback' 규약(country-list-row.tsx:7)과 분열. 핀/최근·대륙 그룹핑·미연결 배지도 미지원이고 빈 상태 카피는 CountryListEmpty와 별도 사본(170-209).

**권고:** (1) 모바일 필터 행에 유형 select 추가(setCountryTypeFilter가 이미 공유되므로 배선만), (2) 초기화에 setCountryTypeFilter('all') 포함, (3) 행 렌더를 country.type 분기 — 역사국가는 FaLandmark 배지+formatCountryPeriod 존속기간, 가능하면 데스크톱 CountryListRow 재사용(최소 ISO 규약 공유), (4) 빈 상태는 CountryListEmpty 재사용으로 사본 제거. 핀/최근·그룹핑 패리티는 후속 분리 가능.

<details><summary>검증 노트</summary>

전 인용 라인 실측 일치: (1) country-mobile-ui.tsx:25-34 컨텍스트 공유 + content-shell.tsx:95-111에서 CountryMobileUI가 데스크톱 CountryList와 동일 CountryListStateProvider 내부 렌더 확인. (2) 모바일 필터 행(119-156)은 대륙(120-132)·정렬(133-145) select뿐 — 데스크톱 country-list-filters.tsx:139-143 유형 select·188-190 '과거 국가 N개 보기' 배지 모두 부재. (3) 초기화(146-155)는 query·continentFilter만 리셋하고 노출 게이트(146)·결과바(159)도 유형 필터를 미검사. (4) 트랩 성립: 사이드바는 ≤1024px CSS 숨김(sidebar-sheet.tsx:4, content-shell.styles.ts:50)·모바일 UI는 같은 브레이크포인트 CSS 표시(country-mobile-ui.styles.ts:13)로 양쪽 모두 마운트 유지 → provider React state가 리사이즈에도 지속, 'historical' 잔존 시 해제 수단 전무. (5) 행 깨짐 재현: context 150-156에서 검색 시 역사국가 합류, historicalToUnified(unified-types.ts:89-112)는 flagEmoji/isoCode/capital 미충전 → 222-224 '🏳️'·230-232 '- · 수도 미상' 그대로, RowBottom(236-247)은 population/areaSqKm 전용이라 역사국가 메타 전무 — 모바일 검색만으로도 재현(순수 모바일 시나리오 성립, 리사이즈 불요). (6) country-list-row.tsx:7 'flagEmoji 미사용' 주석 인용 정확. (7) 빈 상태 170-209는 CountryListEmpty와 별도 사본이며 historical/modern 분기 카피 누락. 방어 계층 없음(모바일 전용 가드·행 type 분기 부재). severity P2·effort M 적정 — 상태는 인메모리라 새로고침으로 탈출 가능해 P1 아님. 유일한 미세 과장: 검색이 includes 부분일치라 '정확한 이름 검색'은 부분 검색도 가능하나 '검색이 유일한 역사국가 진입 경로'라는 본질은 정확.

</details>

## 배치 4 — 인물 캐시 무효화 정합

### G3-1 [P2/S/CONFIRMED] invalidatePersonCaches 사본 간 드리프트 이미 발생 — 모달·편집 페이지가 정본 대비 4키 누락인데 주석은 '동일 세트' 자칭, 모달 수정 경로에서 국가 대시보드·수장 섹션·사건 상세가 stale

`apps/web-admin/src/widgets/country/country-list/ui/person-register-view-modal.tsx:59` · 렌즈: gap

person-register-view-modal.tsx:59-72의 invalidatePersonCaches는 5키(personKeys.all·['person-detail']·['person-family-tree']·['person-contemporaries']·['person-reign-adjacency'])만 무효화하며 66행 주석이 "(detail-panel invalidatePersonCaches와 동일 세트)"라고 자칭한다. person-edit.page.tsx:97-110 사본도 동일 5키에 "모달 버전…과 동일 세트"(97행)·"detail-panel…과 동일 세트"(104행) 주석. 그러나 정본인 person-detail-panel.tsx:905-929는 실제로 9키 슈퍼셋 — ['event-detail'](917행, "사건 상세의…person.profileImageUrl을 박아 두므로 함께 무효화해야"), ['persons-by-country'](919행), ['persons-by-dynasty'](920행), ['persons-by-tenure-country'](921행)를 추가로 무효화한다. 즉 '동일 세트' 주석은 이미 거짓이며 복붙 드리프트가 실체화됐다. 실사용 피해: person-detail.page.tsx:34-37이 이 모달을 editPersonId로 수정 모드 실사용 — 모달로 인물의 이름·아바타·생몰을 수정하면 (1) 국가 대시보드 ['persons-by-country', countryId]는 staleTime 5분(use-country-dashboard-stats.ts:187-190)이라 무효화 없이는 리마운트해도 수정 전 데이터 유지, (2) 국가 상세 수장 섹션 ['persons-by-tenure-country', …](heads-of-state-section.widget.tsx:623)와 가문 구성원 ['persons-by-dynasty'](dynasty-members-infographic-modal.tsx:136 등 2곳), 사건 상세 참여자 썸네일(event-detail)이 미갱신. 국가 사이드바 + 메뉴(country-list.tsx:541)에서 등록한 직후에도 같은 누락이 적용된다.

**권고:** 즉효 수정은 모달·person-edit.page 사본에 누락 4키(['event-detail']·['persons-by-country']·['persons-by-dynasty']·['persons-by-tenure-country'])를 추가하고 '동일 세트' 주석을 실체와 일치시키는 것. 단 근본책은 아래 중앙 헬퍼 승격 발견과 묶어 한 번에 처리 — 헬퍼 하나로 치환하면 이 드리프트 계열이 구조적으로 재발 불가가 된다. 수정 후 시나리오 검증: 국가 상세에서 수장 인물을 모달로 이름 변경 → 수장 섹션·대시보드 인물 통계가 즉시 갱신되는지 확인.

<details><summary>검증 노트</summary>

전 인용 실측 일치. 모달(person-register-view-modal.tsx:59-72)·person-edit.page.tsx:99-110은 5키만 무효화하며 '동일 세트' 주석(66행·97/104행)이 실재하고, 정본 person-detail-panel.tsx:905-929는 ['event-detail'](917)·['persons-by-country'](919)·['persons-by-dynasty'](920)·['persons-by-tenure-country'](921)를 추가한 9키 슈퍼셋 — 드리프트 실체 확인. 폼(PersonRegisterView)은 invalidateQueries 0건이고 누락 3키(persons-by-*)의 무효화 지점은 detail-panel 내부 콜백뿐이라 모달 수정 경로에 보상 경로 없음(grep 전수 확인). 실사용도 확인: person-detail.page.tsx:34-37 editPersonId 수정 모드·country-list.tsx:541 사이드바 등록. 피해는 주장보다 오히려 강함 — shared/queryClient.ts:10의 전역 staleTime 3분+refetchOnWindowFocus:false로 명시 staleTime 없는 heads-of-state 쿼리(623행)까지 리마운트 시 3분간 수정 전 데이터 유지, 대시보드는 staleTime 5분(use-country-dashboard-stats.ts:190). P2·effort S·59행 앵커 모두 적정.

</details>

### G3-2 [P3/S/CONFIRMED] 인물 캐시 무효화 세트가 중앙 헬퍼 없이 4곳+변형 1곳 복붙 — invalidateTenureQueries 규약과 비대칭, 쿼리 키도 personKeys 밖 stringly-typed 산재

`apps/web-admin/src/widgets/country/country-list/ui/person-register-view-modal.tsx:59` · 렌즈: gap

재임 캐시는 shared/api/invalidate-tenure.ts의 invalidateTenureQueries 단일 헬퍼가 정본('모든 mutation의 onSuccess가 이 헬퍼를 거치게 해 일관성을 보장한다' doc 명시)인데, 인물 캐시 무효화는 헬퍼 없이 함수 통째 복붙이다: (1) person-register-view-modal.tsx:59-72, (2) person-edit.page.tsx:99-110, (3) person-detail-panel.tsx:905-929(정본·최대 세트: 무조건 9키+조건부 ['persons', personId]), 그리고 변형으로 (4) use-countries.hook.ts:159-161이 국가 mutation 후 ['persons']·['person-detail']·['persons-by-country'] 3키 사본, (5) person-politics-section.tsx:200-202가 ['person-detail', personId] 단일키 협소 변형, (6) entities/person/api.ts:119-175의 mutation 훅들도 인라인 부분 세트를 각자 보유. 각 사본의 주석('detail-panel invalidatePersonCaches와 동일 세트' — modal:66·edit-page:104)은 손 동기화 흔적이며 이미 거짓이 됐다: detail-panel에만 event-detail·persons-by-country·persons-by-dynasty·persons-by-tenure-country 4키가 있어 modal·edit-page 사본과 드리프트 발생(별도 발견). 키 정의 측도 같은 문제: entities/person/api.ts:35의 personKeys.detailFull=['person-detail', id]이 있는데 사본들은 raw 리터럴 ['person-detail']을 쓰고, 'person-family-tree'는 키 팩토리가 아예 없어 genealogy.page.tsx:598-600이 "인물 상세 패널과 동일 키" 주석으로만 person-detail-panel.tsx:531과 문자열 결합을 유지한다. 'person-contemporaries'·'person-reign-adjacency'는 shared/api/person-contemporaries.ts:112·person-reign-adjacency.ts:114에 키 팩토리(*Keys.all)가 이미 존재하지만 무효화처 전원(invalidate-tenure.ts:68·71 포함)이 raw 리터럴을 써 미배선 상태. 새 인물 쿼리 키 추가 시 소비처·무효화처 양쪽에서 grep 의존 수동 동기화가 필요한 구조.

**권고:** entities/person/api.ts에 invalidatePersonCaches(queryClient, personId?) 헬퍼를 승격하고 detail-panel의 9키 최대 세트를 정본으로 채택(옵션 인자로 event-detail 등 무거운 키 스킵 허용). 동시에 personKeys에 familyTree(id)·contemporaries·reignAdjacency 키 팩토리를 등재해 genealogy.page:600·person-detail-panel:531 등 소비처의 raw 문자열을 치환. 이후 4개 사본 + use-countries.hook의 3키 변형을 헬퍼 호출 한 줄로 치환하고 '동일 세트' 주석 삭제. invalidate-tenure.ts와 같은 위치 규약을 원하면 shared/api/invalidate-person.ts도 가능하나, personKeys가 entities/person/api.ts에 있으므로 키와 헬퍼를 한 파일에 두는 쪽이 드리프트 방지에 유리.

<details><summary>검증 노트</summary>

전 주장 실측 일치: (1) invalidatePersonCaches 함수 통째 사본 3곳 — person-register-view-modal.tsx:59-72(주석 66행 '동일 세트' 실재), person-edit.page.tsx:99-110(97·104행 주석 실재), person-detail-panel.tsx:905-929(무조건 9키+조건부 1키 최대 세트) — 라인·인용 모두 정확. (2) use-countries.hook.ts:159-161의 ['persons']·['person-detail']·['persons-by-country'] 3키 변형 실재. (3) '동일 세트' 주석은 이미 거짓 — detail-panel에만 event-detail·persons-by-country·persons-by-dynasty·persons-by-tenure-country가 있어 정확히 4키 드리프트. (4) personKeys(entities/person/api.ts:35)에 detailFull=['person-detail', id]가 있는데 사본들은 raw 리터럴 사용, 'person-family-tree'는 키 팩토리 전무·genealogy.page.tsx:598-600이 주석으로만 person-detail-panel.tsx:531과 결합 유지. (5) invalidate-tenure.ts(shared/api) 중앙 헬퍼 규약 실재('모든 mutation이 이 헬퍼를 거치게' doc 명시)·인물 측 대응 헬퍼 부재 grep 확인. 반박 시도 중 오히려 보강 증거 발견: entities/person/api.ts:119-175 mutation 훅들의 인라인 부분 세트, person-politics-section.tsx:200-202 단일키 협소 변형, person-contemporaries/reign-adjacency는 shared/api에 키 팩토리(*Keys.all)가 이미 있으나 무효화처 전원이 raw 리터럴 사용(정의만 있고 미배선). 유일한 흠은 title '4곳+변형 1곳' 집계가 detail(사본3+변형1)과 미세 불일치이나 politics-section 변형 포함 시 과소집계로 실체 무영향. P3·S 타당.

</details>

## 배치 5 — 접근성 코어

### F11 [P2/M/CONFIRMED] listbox에 Tab으로 진입 불가 — roving tabindex/aria-activedescendant 둘 다 부재

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:392` · 렌즈: a11y

country-list.tsx:390-395 S.VirtualList가 role="listbox" tabIndex={-1}, country-list-row.tsx:104 모든 행이 tabIndex={-1}이다. 어떤 option도 tabIndex=0을 갖지 않고 컨테이너에 aria-activedescendant도 없어 Tab으로는 목록의 어떤 행에도 도달할 수 없다. 의도된 유일한 진입 경로는 검색 인풋에서 ArrowDown(use-list-keyboard-nav.ts:97-105, country-list-filters.tsx:125 배선)뿐인데 시각적 힌트가 전혀 없어 발견 불가능. Tab은 그룹 헤더·핀 버튼·chevron 버튼으로만 흘러가고 정작 국가 선택(option)은 건너뛴다. 부수 결함으로, 핀 버튼에 Tab 도달 후 키 입력이 컨테이너 onKeyDown으로 버블되어 focusedIndex=-1→idx=0으로 처리되므로(use-list-keyboard-nav.ts:52) 핀 버튼 위에서 Enter를 누르면 preventDefault가 버튼 활성화를 막고 onSelect(rowIds[0])로 목록 첫 행이 엉뚱하게 선택된다(66-69행). ARIA listbox 규약 위반이자 키보드 사용자에게 목록 접근이 사실상 막히는 결함.

**권고:** roving tabindex 도입: 선택된 행(없으면 첫 행)에 tabIndex=0, 나머지 -1, 포커스 이동 시 tabIndex 이전(use-list-keyboard-nav의 focusRow에서 처리 가능). 또는 컨테이너 tabIndex=0 + aria-activedescendant 방식. 검색 인풋 ArrowDown 진입은 보조 경로로 유지.

<details><summary>검증 노트</summary>

인용 전부 실코드와 일치: country-list.tsx:392·394에서 S.VirtualList가 role="listbox" tabIndex={-1}, country-list-row.tsx:104에서 모든 option 행이 tabIndex={-1}, widget 전체에 aria-activedescendant 0건·tabIndex=0인 option 없음(grep 확인), styled attrs 주입도 없음. 진입 경로는 검색 인풋 ArrowDown(use-list-keyboard-nav.ts:97-105, country-list-filters.tsx:125 배선)뿐이며 placeholder "국가 검색..." 외 시각 힌트 없음. Tab은 그룹 헤더 버튼·핀 버튼·chevron으로만 흐르고 option은 건너뜀 — 모두 사실. 유일한 미세 과언: 핀 버튼에 Tab 도달 후 ArrowDown이 컨테이너로 버블되어 우연히 nav 진입 가능하나, 이 경로는 발견 불가능하고 focusedIndex=-1→idx=0 처리 탓에 핀 버튼 위 Enter가 preventDefault로 버튼 활성화를 막고 rowIds[0](엉뚱한 첫 행)을 선택하는 부수 결함까지 있어 발견을 보강한다. 검색 ArrowDown이라는 동작하는 키보드 경로가 존재하므로 P1(완전 접근불능)은 아니고 P2 적정.

</details>

### F13 [P2/M/CONFIRMED] listbox 역할 구조 위반 — 그룹 헤더 <button>이 listbox 직계 자식, option 내부에 핀·chevron 버튼 중첩

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:418` · 렌즈: a11y, correctness

country-list.tsx:392의 S.VirtualList(styled.div)가 role="listbox"인데, :418-429의 ContinentSectionHeader(country-list.styles.ts:684 styled.button, role 없음)가 React.Fragment 안에 렌더되어 listbox의 직계 DOM 자식이 된다. ARIA상 listbox 자식은 option/group만 허용되고 option은 children-presentational인데, country-list-row.tsx:103에서 role="option"(styled.div ListRow) 내부 181-215행에 PinButton·HasChildrenChevron <button>이 중첩된다 — 스펙상 option 하위는 presentational로 평탄화되어 SR이 옵션 개수를 잘못 세거나 헤더를 무시/오독하고, 중첩 버튼이 위젯으로 전달되지 않거나 옵션 이름에 뒤섞인다. listbox 내부 탭스톱(헤더·핀·chevron — 모두 tabIndex 미지정 native button)이 SR 포커스 모드 및 단일 탭스톱 composite 기대와 충돌한다. 키보드 nav는 country-list.tsx:268-272에서 useListKeyboardNav를 expandableIds/onExpand 미배선으로 호출해 ArrowRight/Left가 no-op(use-list-keyboard-nav.ts:70-81 가드)이고 핀 토글·chevron 열기 대응 키가 없다. 단, 핀·chevron 버튼 자체는 Tab 순서에 있고 PinButton의 opacity:0 은닉도 ${ListRow}:focus-within 규칙(styles:928-931)으로 포커스 시 노출되므로 시력 있는 키보드 사용자는 Tab으로 도달 가능 — "마우스 전용"이 아니라 "화살표 nav 모델 밖 + SR 도달 불가"가 정확한 서술이다.

**권고:** 패턴 재선택: (a) 대륙 섹션을 role="group"+aria-labelledby로 감싸고 헤더 버튼을 listbox 밖 구조로 빼거나, (b) 행 내부 보조 액션이 필수인 현 UI에는 nav>ul/li + 행 전체 button 시맨틱이 적합 — role=option/aria-selected를 aria-current로 대체하면 중첩 버튼이 전부 합법(권장). 또는 role="tree"/treeitem 재선언. 핀/펼침 단축키(p, →)를 use-list-keyboard-nav에 추가.

<details><summary>검증 노트</summary>

코드로 전부 확증: (1) country-list.tsx:392 VirtualList(styled.div, styles:666)에 role="listbox"; (2) ContinentSectionHeader는 styled.button(styles:684, role 없음)이고 React.Fragment 안에 렌더되어 listbox 직계 DOM 자식(country-list.tsx:417-474) — ARIA상 listbox 자식은 option/group만 허용되므로 구조 위반; (3) country-list-row.tsx:103 ListRow(styled.div)에 role="option", 내부 181-215행에 PinButton·HasChildrenChevron <button> 중첩 — option은 children-presentational이라 스펙상 중첩 버튼이 AT에 전달되지 않음; (4) country-list.tsx:268-272에서 useListKeyboardNav를 expandableIds/onExpand 없이 배선해 ArrowRight/Left가 no-op(use-list-keyboard-nav.ts:70-81 가드)이고 핀/펼침 전용 키 부재. 단 하나 과장: "마우스 전용 기능"은 부정확 — 두 버튼은 tabIndex=-1이 없는 native button이라 Tab 도달 가능하고, PinButton opacity:0도 ${ListRow}:focus-within 규칙(styles:928-931)으로 포커스 시 노출됨. 문제의 본질은 listbox 화살표 nav 모델에 대응 키가 없고 SR에서는 presentational 평탄화로 도달 불가라는 것. severity P2·line 418 적정.

</details>

### F14 [P2/M/CONFIRMED] 역사국가 popover가 키보드로 완전히 조작 불가 — 포커스 이동·트랩·복귀 전무, option 역할 오용, dismiss 자체구현 규약 위반

`apps/web-admin/src/widgets/country/country-list/ui/country-list-children-popover.tsx:176` · 렌즈: a11y, ux-ia

country-list-children-popover.tsx:176-181에서 role="dialog"로 body에 포탈되지만 열릴 때 포커스를 안으로 옮기지 않고 트랩·닫힘 시 anchor(chevron) 복귀도 없다. 내부 자식 행은 241-246 `role="option"` `tabIndex={-1}`로 listbox 조상 없는 잘못된 ARIA이며 키보드 내비 훅도 미연결 — chevron(Enter)으로 열 수는 있어도 안의 역사국가를 단 하나도 선택할 수 없다(포털이라 Tab 순서도 어긋남). Esc·외부클릭은 153-174 document 리스너 자체구현으로 add-menu(29-45)·context-menu(45-66)와 3중 중복이며 useModalBehavior 계열 토대(프로젝트 규약: Esc·포커스트랩 전담, 직접 구현 금지)를 쓰지 않는다. 미연결이 아닌 역사국가는 '과거' 필터·검색 우회로가 있어 완전 접근불능(P1)은 아니나 주 진입 경로가 마우스 전용.

**권고:** 열릴 때 첫 행(또는 헤더)으로 포커스 이동, ↑↓/Enter/Esc 순회, 닫힘 시 chevron으로 포커스 복귀 — 가능하면 useModalBehavior 재사용으로 Esc·트랩 위임. 내부 행은 role="option" 제거 후 button 목록으로 바꾸거나 popover 내부를 독립 role="listbox"로 감싼다. Esc/외부클릭은 공용 dismiss 훅으로 추출(F55와 연계).

<details><summary>검증 노트</summary>

코드만으로 전 항목 확증. (1) country-list-children-popover.tsx:176-183 createPortal+role="dialog"(179)이며 파일 전체에 .focus()/autoFocus/useModalBehavior 부재 — 열림 시 포커스 이동·트랩·anchor 복귀 전무. (2) 241-245 자식 행은 role="option"+tabIndex={-1}인데 S.ListRow는 styled.div(styles:768), 컨테이너 S.ChildrenScroll(JSX 236)은 role 없는 div라 listbox 조상 없는 ARIA 오용 맞음. popover 내부에 포커스 가능한 요소가 0개(버튼 없음, 행은 div tabIndex=-1)라 키보드로 단 하나도 선택 불가가 사실. (3) country-list.tsx:251-266 flatRowIds는 group.countries만 평탄화(주석 249 "sub-row 평탄화 제거"), popover에 onKeyDown 전무 — 키보드 훅 미연결 확증. (4) chevron은 native type="button"(row.tsx:194-202)이라 Enter로 열림 가능 주장도 사실. (5) dismiss 자체구현 3중 중복 확증: popover 154-174, add-menu 29-45, context-menu 45-66 모두 document mousedown/keydown 직접 등록. (6) 완화 경로 확증: country-list-state.context.tsx:131-132에서 '과거' 필터가 historicalUnified(87-96에서 연결된 역사국가 포함 병합) 반환 + 검색 합류(153) — 연결된 역사국가도 필터/검색으로 도달 가능하므로 P1 아닌 P2가 적정. 인용 라인·재현 시나리오·severity·effort 모두 정확, 정정 불요.

</details>

### F15 [P2/M/CONFIRMED] 컨텍스트 메뉴·역사국가 편집이 사실상 마우스 전용 — 키보드 대체 수단 부재, 메뉴 자체도 키보드 규약 미구현

`apps/web-admin/src/widgets/country/country-list/ui/country-list-context-menu.tsx:45` · 렌즈: a11y

메뉴 진입: country-list.tsx:301-307이 onContextMenu(우클릭)로만 열고 e.clientX/clientY를 좌표로 쓴다. macOS에는 키보드 contextmenu 이벤트 경로가 없어 키보드 진입이 불가능하고, Windows Menu 키 발화 시에도 좌표가 브라우저 의존적(Firefox는 (0,0)→메뉴가 좌상단, Chromium은 포커스 요소 기준일 수 있음)이라 설계된 키보드 경로가 없다. 편집 액션: country-list-row.tsx:111-115 onDoubleClick → onEditHistorical, 메뉴 '편집'(country-list-context-menu.tsx:80-90, 배선 country-list.tsx:555-559) — 둘 다 마우스 제스처뿐이고 use-list-keyboard-nav.ts는 ↑↓/Home/End/Enter(선택)/←→(펼침)만 처리해 키보드 사용자는 목록에서 역사국가 편집 진입이 불가능하다('고정'은 행 내 실제 button인 PinButton으로, 편집은 상세 페이지 경유로만 대체 가능). 메뉴 자체도 country-list-context-menu.tsx:96-116에서 role="menu"/menuitem 선언에도 열릴 때 포커스 이동 없음·화살표 순회 없음·닫힘 시 포커스 복귀 없음이라 보조기술을 오도하며, Esc는 45-66 document 리스너 자체구현으로 공용 useModalBehavior를 우회한다.

**권고:** 행 keydown에 Shift+F10/ContextMenu 키 처리를 추가하고 좌표는 행 getBoundingClientRect 기준 산출. 메뉴 열릴 때 첫 menuitem에 focus, ↑↓+Home/End 순회, 닫힐 때 트리거 행으로 복귀. 역사국가 행 포커스 시 별도 키(F2) 또는 메뉴 경유 편집 경로 보장.

<details><summary>검증 노트</summary>

핵심 주장 전부 코드로 확증. (1) 메뉴 진입: country-list.tsx:301-307이 onContextMenu 전용으로 e.clientX/clientY를 좌표로 사용, 발화 지점은 country-list-row.tsx:110과 children-popover의 동일 프롭뿐이며 Shift+F10/ContextMenu 키 처리는 위젯·페이지 전체 grep 0건. (2) 편집: country-list-row.tsx:111-115 onDoubleClick과 메뉴 '편집'(context-menu.tsx:80-90, 배선 country-list.tsx:555-559)이 전부이고, use-list-keyboard-nav.ts:49-94는 ↑↓/Home/End/Enter/←→만 처리해 F2·편집 키 부재 — 목록 스코프에서 키보드 편집 진입 불가 성립. PinButton은 실제 button이라 '고정' 대체 가능하다는 단서도 정확. (3) 메뉴 규약: context-menu.tsx:99 role="menu"·:108 role="menuitem" 선언에도 열릴 때 focus 이동·화살표 순회·닫힘 시 포커스 복귀가 전무하고 Esc는 45-66 document 리스너 자체구현, useModalBehavior 등 상위 계층 방어 없음. 단 하나의 과잉 단정만 정정: Windows Menu 키 발화 시 clientX/Y=(0,0)은 Firefox 계열 동작이고 Chromium은 포커스 요소 좌표로 발화할 수 있어 브라우저 의존적(런타임 미확인). 또한 셸이 상세 페이지 편집(onEdit=editFromDetail, country-detail-shell.tsx:167)을 제공하므로 기능 전체 접근 불능은 아니며 발견의 "목록에서" 한정이 정확한 스코프. P2 적정(role 선언 후 키보드 무동작 = WCAG 2.1.1 위반 + 보조기술 오도, 대체 경로 존재로 P1 아님).

</details>

### F23 [P3/M/CONFIRMED] 키보드 nav의 →/← 확장 API 미배선 — 전체 접힘 시 목록 탐색이 죽고, 접힌 그룹·역사국가 popover를 화살표로 열 수단 없음

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:251` · 렌즈: ux-ia, architecture

flatRowIds는 펼쳐진 그룹의 행만 담는다(country-list.tsx:251-266, :255에서 접힌 그룹 skip). 첫 진입(sentinel 'all'=전체접힘, :77·:88)에 핀·최근이 모두 비면 — isGroupCollapsedById(:84-87)가 __pinned__/__recent__는 'all'에서도 펼침 유지하므로 국가를 한 번이라도 방문해 최근이 생기면 해소되는, 진짜 첫 방문/스토리지 초기화 한정 상태 — 빈 배열이라 검색창 ↓(use-list-keyboard-nav.ts:97-105)와 리스트 키 핸들러(:51 `if (rowIds.length === 0) return`)가 전부 무동작이고, 접힌 그룹의 행은 렌더 자체가 안 되므로(:475) Tab으로 그룹 헤더 버튼(:418 <button>)을 건너 Enter로 펼치는 것 외 키보드 진입로가 없다. 훅은 onExpand/onCollapse·expandableIds·expandedIds 옵션(:16-19)과 ArrowRight/Left 처리(:70-82)를 이미 구현했으나 유일한 호출부(country-list.tsx:268-272)는 containerRef·rowIds·onSelect만 전달 — 전부 데드 파라미터고, expandableIds가 undefined라 :72 조건이 항상 false여서 행 포커스에서 →를 눌러도 역사국가 popover(country-list-row.tsx:199 chevron onClick 전용)가 안 열린다. 그룹 헤더도 flatRowIds에 없어(:259는 country id만 push) 화살표 순회 대상이 아니다. 훅 주석(7행)이 약속한 →/← 동작과 배선이 어긋난 계약 불일치.

**권고:** flatRowIds에 그룹 헤더를 항목으로 포함('group:' prefix)하고 헤더에서 Enter/→=펼침·←=접힘을 onExpand/onCollapse로 배선(훅 API는 이미 존재). expandableIds(자식 있는 현대 국가)·onExpand(popover 열기+첫 자식 행 포커스)·onCollapse(닫기)도 배선. 최소 수정은 rowIds가 비면 검색창 ↓에서 첫 그룹 헤더로 포커스 폴백. 안 쓸 파라미터는 제거해 계약을 일치.

<details><summary>검증 노트</summary>

전 인용 라인 실검증 일치: flatRowIds는 country-list.tsx:255에서 접힌 그룹을 skip하고 첫 진입 sentinel 'all'(:77, :88)이면 대륙 그룹 전부 collapsed. use-list-keyboard-nav.ts:51의 rowIds.length===0 조기반환과 :99의 검색창 ↓ 가드로 빈 배열 시 전부 무동작. 훅은 onExpand/onCollapse/expandableIds/expandedIds(:16-19)와 ArrowRight/Left(:70-82)를 구현했으나 유일한 호출부(country-list.tsx:268-272)는 containerRef·rowIds·onSelect만 전달 — expandableIds가 undefined라 :72 조건이 항상 false여서 →로 popover를 열 수 없고, popover는 country-list-row.tsx:199 chevron onClick 전용. 그룹 헤더는 flatRowIds에 없고(:259는 c.id만 push) 접힌 그룹 행은 렌더 자체가 안 됨(:475). 훅 주석 7행의 →/← 약속과 배선 불일치도 사실. 다른 계층의 방어 없음.

</details>

### F27 [P3/S/CONFIRMED] 검색 인풋에 라벨 부재 — placeholder만으로 접근 가능한 이름 의존

`apps/web-admin/src/widgets/country/country-list/ui/country-list-filters.tsx:120` · 렌즈: a11y

country-list-filters.tsx:120-126의 S.SearchInput은 `type="text" placeholder="국가 검색..."`만 있고 aria-label·연결된 label이 없다(styled 정의도 순수 styled.input으로 aria 주입 없음, 부모도 label 래핑 없음). placeholder는 accessible name 폴백으로는 동작하지만 값 입력 시 사라지고 스펙상 라벨 대용으로 부적합. 같은 파일의 필터 셀렉트 3종(144·155·168)과 지우기 버튼(128, aria-label="지우기")은 접근 가능한 이름을 갖고 있어 이 인풋만 비대칭.

**권고:** `aria-label="국가 검색"` 추가 및 `type="search"` 변경(SR이 검색 필드로 안내, 모바일 키보드 최적화).

<details><summary>검증 노트</summary>

country-list-filters.tsx:120-126의 S.SearchInput에 aria-label·연결 label이 없음을 실측 확인. styled 정의(country-list.styles.ts:449)는 순수 styled.input으로 .attrs() aria 주입 없고, 부모(country-list.tsx:349)도 label 래핑 없이 프롭만 전달 — 어떤 계층도 방어하지 않음. 같은 파일 필터 셀렉트 3종(144·155·168)과 지우기 버튼(128)은 aria-label을 갖고 있어 비대칭 주장도 사실. placeholder 폴백으로 접근 불능은 아니므로 P3·S 적정. 유일한 사실오차는 셀렉트 aria-label 라인 중 '대륙'이 156이 아닌 155라는 점.

</details>

### F28 [P3/S/CONFIRMED] 검색·필터 결과 변경의 스크린리더 공지 부재 — aria-live 영역 없음

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:334` · 렌즈: a11y

필터 결과 수는 country-list.tsx:334-338에서 SidebarHeader count로 시각 표시될 뿐, 검색 타이핑·필터 변경 시 결과가 몇 건으로 좁혀졌는지 알리는 aria-live 영역이 어디에도 없다. 결과 0건일 때도 CountryListEmpty(399-405)가 조용히 그려질 뿐이라 SR 사용자는 입력해도 아무 피드백을 받지 못한다.

**권고:** 필터 행 아래 visually-hidden `aria-live="polite"` 영역을 두고 "국가 N개" 또는 "검색 결과 없음"을 300ms 정도 디바운스해 공지한다.

<details><summary>검증 노트</summary>

코드로 전부 확증됨. (1) country-list.tsx:334-338에서 filtered.length가 SidebarHeader count prop으로만 전달되고, sidebar-header.tsx:32는 <Count>{count}</Count> 단순 시각 렌더로 live region 아님. (2) country-list/ 위젯 디렉토리 전체(filters·empty·row 포함)와 content-shell/ 전체에 aria-live·role="status"·aria-atomic·visually-hidden이 grep 무일치(0건) — 다른 계층의 방어 없음. (3) country-list-empty.tsx는 styled div+텍스트만으로 role="status" 없이 country-list.tsx:399-405에서 조건부 렌더됨(인용 정확). (4) 검색 입력과 role="listbox" 목록 간 combobox 연동(aria-controls/activedescendant)도 없어 타이핑 시 SR 무피드백 시나리오 성립. 참고로 같은 country 네임스페이스의 country-detail·country-form-shell에는 aria-live="polite" 패턴이 이미 존재해 권고안(visually-hidden polite 영역+디바운스)도 프로젝트 관례와 부합. severity P3·line 334·effort S 모두 적정.

</details>

### F29 [P3/S/CONFIRMED] 대륙 그룹 헤더 aria-expanded에 aria-controls 부재 + 빠른접근 안내가 title 속성 전용

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:423` · 렌즈: a11y

country-list.tsx:418-429 ContinentSectionHeader(styled.button)는 `aria-expanded={!isGroupCollapsed}`(423)만 있고 제어 대상 영역과의 aria-controls 연결이 없다. 행들이 React.Fragment(417) 안에 헤더와 형제로 나열될 뿐 id를 가진 그룹 컨테이너 요소가 없어 연결할 대상 자체가 부재(행 단위 `id="country-<id>"`만 존재, country-list-row.tsx:102). 부모 S.VirtualList는 role="listbox"(392)·행은 role="option"인데 섹션 헤더 button이 listbox 직계 자식으로 끼어 있어 ARIA 콘텐츠 모델도 위반. 또한 424-428의 빠른접근 그룹 동작 안내("빠른 접근 — 자식 펼침은 본 그룹에서")가 title 속성에만 있어 터치 사용자는 접근 불가하고, 스크린리더는 title이 접근 가능한 설명(description) 폴백으로 읽힐 수 있으나 비일관·신뢰 불가.

**권고:** 그룹 행들을 id 있는 컨테이너(role="group")로 감싸 헤더에 aria-controls 연결(F13의 구조 개편과 함께 처리). title 전용 안내는 aria-description 병기 또는 UI 텍스트로 승격.

<details><summary>검증 노트</summary>

country-list.tsx:423에 aria-expanded만 있고 aria-controls 부재 확인. 행들은 React.Fragment(417)로 헤더와 형제 나열되어 id 있는 그룹 컨테이너 자체가 없음(행 단위 id=country-*만 존재, country-list-row.tsx:102). 424-428의 빠른접근 안내는 title 속성 전용으로 인용 그대로이며 대체 수단 없음. 부모 VirtualList가 role="listbox"(392)라 권고한 role="group" 래퍼는 ARIA 유효 — 오히려 현 구조는 listbox 직계 자식에 button이 끼어 콘텐츠 모델 위반이라 발견을 보강. 어떤 계층도 방어하지 않음. 단 "스크린리더는 접근 불가"는 과장 — title은 접근 가능한 설명로 폴백 노출되어 다수 SR이 읽음(비일관·신뢰 불가가 정확).

</details>

### F30 [P3/S/CONFIRMED] 패널 접기/펼치기 시 키보드 포커스 유실 — 누른 버튼이 언마운트되고 포커스가 body로 떨어짐

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:522` · 렌즈: a11y

country-list.tsx:330 `{!collapsed && (...)}` 분기 때문에 SidebarHeader의 접기 버튼(sidebar-header.tsx:37-44)을 누르면 버튼 자신이 언마운트되어 포커스가 body로 유실되고, CollapsedToggleBtn(country-list.tsx:524-531)으로 펼칠 때도 동일하다. 키보드 사용자는 토글할 때마다 문서 처음부터 다시 Tab해야 한다. 부가: 523행 `<S.CollapsedRail aria-label="국가 목록 (접힘)">`은 role 없는 div라 aria-label이 무시된다.

**권고:** collapsed 전환 후 useEffect+ref로 상대편 토글 버튼에 focus() 이동(접기→CollapsedToggleBtn, 펼치기→SidebarHeader 접기 버튼). CollapsedRail은 aria-label 제거 또는 시맨틱 role 부여.

<details><summary>검증 노트</summary>

인용 전부 사실로 확인. country-list.tsx:330의 `{!collapsed && (` 분기가 SidebarHeader(접기 버튼 포함)를 언마운트하고, sidebar-header.tsx:37-44의 CollapseBtn은 클릭 즉시 자기 자신이 사라진다 — 포커스된 요소의 DOM 제거 시 포커스가 body로 떨어지는 것은 브라우저 표준 동작이라 코드만으로 확증됨. 역방향도 동일: CollapsedToggleBtn(524-531행)은 `{collapsed && (`(522행) 분기 안이라 펼칠 때 언마운트. 방어 계층 전무 확인 — 상태 소유자 useListCollapsed(content-shell/model/use-list-collapsed.hook.ts)는 state+localStorage만 관리하고, content-shell.tsx·pages/country/country-detail-shell.tsx(190-198행)·country-list.tsx 어디에도 collapsed 전환 시 포커스를 복원하는 코드가 없다(grep focus 0건). 부가 지적도 사실: CollapsedRail은 styled.div(country-list.styles.ts:990)로 role 없는 generic 요소라 aria-label이 접근성 트리에 노출되지 않는다. severity P3·effort S 적정, 라인·권고안 정정 불필요.

</details>

### F31 [P3/M/CONFIRMED] IsoBadge 대륙색 ISO 텍스트 저대비 — 라이트에서 아프리카 ≈1.9~2.1:1·오세아니아 ≈2.5:1, 다크에서 __historical__ #92400e ≈2.6:1

`apps/web-admin/src/widgets/country/country-list/model/continent-colors.ts:14` · 렌즈: a11y, design-visual

IsoBadge는 대륙색 원색을 9-10px 볼드 모노 텍스트로, withAlpha(색,0.14)를 배경으로 inline style 주입한다(country-list-row.tsx:127-135, country-list.styles.ts:958-976). 라이트 모드(사이드바 #ffffff·행 transparent) 실측 대비: 아프리카 #f59e0b 1.93:1, 오세아니아 #14b8a6 2.19:1(흰 배경 기준 2.49), 남아메리카 2.96, 아시아 3.14, 유럽 3.15(흰 배경 기준 3.68), 핀 #eab308 1.75, 최근 #06b6d4 2.14 — 대륙색 전원이 소형 볼드 텍스트 AA(4.5:1) 미달로 ISO 코드 판독성 저하. 다크 모드(#171717)는 대체로 통과하나 전원은 아님 — 북아메리카 #8b5cf6 4.23:1(틴트 배지 배경 기준 3.65), 아시아·유럽도 배지 배경 기준 ~4.15. 과거 국가 액센트 __historical__=#92400e(continent-colors.ts:31)는 다크에서 2.53:1(배지 배경 2.32)로 탁하게 가라앉는데, 역사국가 배지는 ISO 텍스트가 아닌 FaLandmark SVG 아이콘(country-list-row.tsx:144-146)이라 비텍스트 3:1 기준으로도 미달. 배지가 aria-hidden이고 국가명이 인접해 있어 접근 차단은 아니나, 저시력 사용자에게 보조 식별 단서가 사실상 소실됨. 대륙 dot(7px)·strip은 장식이라 무방.

**권고:** NAME_COLOR_MAP을 {base, textLight, textDark} 구조로 확장 — 라이트용 텍스트는 각 색의 600-700 톤(아프리카 #b45309, 오세아니아 #0f766e 등, 또는 color-mix(in srgb, accent 60%, #1f2937)), 다크용은 400 톤, __historical__ 다크는 #b45309/#d97706 계열로 밝힘. dot·strip·withAlpha 배경은 base 유지.

<details><summary>검증 노트</summary>

코드로 전부 확증됨. (1) 인용 정확: country-list-row.tsx:127-135가 inline style로 color=accentColor·background=withAlpha(accentColor,0.14)를 IsoBadge에 주입, 배지는 9-10px/700 모노 텍스트(country-list.styles.ts:958-976), __historical__=#92400e(continent-colors.ts:31), 라이트 배경 #ffffff·다크 #171717(shared/styles/theme.ts:55,136), ListRow 배경 transparent라 배지가 사실상 흰/다크 배경 위에 뜸. (2) 방어 계층 없음 — inline style이 테마 기본색을 무조건 덮고, quick-access·children popover도 동일 accentColor 경로. aria-hidden(row:136)은 스크린리더용일 뿐 시각 대비(WCAG 1.4.3)는 그대로 적용. (3) WCAG 공식으로 재계산한 결과 라이트 아프리카 1.93:1(주장 1.9~2.1 일치)·유럽 3.68(흰 배경 기준, 주장 3.7 일치)·다크 #92400e 2.53(주장 2.6 근사)로 수치 실질 일치. 정정 2건: 오세아니아 라이트는 흰 배경 기준 2.49지만 실제 배지 배경(틴트) 기준 2.19로 더 나쁨; '다크는 전반 4.5:1 통과' 주장은 부정확 — 북아메리카 #8b5cf6이 #171717 대비 4.23(배지 배경 기준 3.65), 아시아/유럽도 배지 배경 기준 ~4.15로 미달. 또 역사국가 배지는 ISO 텍스트가 아니라 FaLandmark SVG 아이콘(row:144-146)이라 비텍스트 3:1 기준 적용 — 그래도 2.3~2.5:1로 미달이라 결론 불변. P3(이름 텍스트가 인접한 중복 단서, 장식적 성격)·effort M·recommendation 구조 모두 타당.

</details>

### F32 [P3/S/CONFIRMED] 등록(+) 드롭다운이 role="menu"인데 메뉴 키보드 규약(포커스 이동·화살표 순회) 미구현

`apps/web-admin/src/widgets/country/country-list/ui/country-list-add-menu.tsx:77` · 렌즈: a11y

country-list-add-menu.tsx:71-110에서 role="menu"/menuitem을 선언하고 트리거에 aria-haspopup·aria-expanded(54-60)까지 달았지만, 열릴 때 첫 항목 포커스 이동이 없고 ↑↓ 내비게이션도 없다. Tab으로는 DOM 순서상 도달 가능하나 menu 역할 선언 시 SR이 화살표 순회·자동 포커스를 기대하므로 실제 동작과 안내가 어긋난다. Esc 처리(36-38)는 자체구현.

**권고:** 열릴 때 첫 menuitem에 focus, ↑↓ 순환·Home/End·문자 첫글자 점프를 구현하거나, 3개 항목뿐이므로 role=menu를 제거하고 단순 disclosure(aria-expanded+일반 버튼 목록) 패턴으로 낮춰 선언과 동작을 일치.

<details><summary>검증 노트</summary>

모든 인용이 실제 코드와 일치. country-list-add-menu.tsx:77에 role="menu", 79/90/101에 role="menuitem", 57-58에 aria-haspopup="menu"/aria-expanded가 선언되어 있으나, 열림 처리(60행 setOpen 토글)에 focus() 호출·autoFocus·항목 ref가 전혀 없고 키보드 처리는 36-38행 document 레벨 Escape 리스너(자체구현)뿐 — 화살표/Home/End 내비게이션 부재 확증. 방어 계층도 없음: country-list.tsx:340-345에서 SidebarHeader의 action 슬롯으로 그대로 렌더될 뿐이며 useModalBehavior·roving tabindex 등 공용 프리미티브 미사용. 항목이 native button이라 Tab 도달 가능하다는 서술도 정확하여 P3(접근불능 아닌 선언·동작 불일치)·effort S 모두 타당. 부가 사실(발견 오류 아님): Esc 닫힘 시 트리거로 포커스 복원도 없어 disclosure 패턴 전환 권고가 이 문제까지 자연 해소함.

</details>

## 배치 6 — 성능·렌더 효율

### F16 [P2/M/CONFIRMED] 검색 키 입력마다 사이드바 전 행(~380) 리렌더 — 단일 광역 컨텍스트 + 행별 컨텍스트 구독 + 행 미-memo의 결합

`apps/web-admin/src/widgets/country/country-list/country-list-state.context.tsx:180` · 렌즈: performance

CountryListStateProvider value는 useMemo 되어 있으나(country-list-state.context.tsx:180-218) query·filtered·showPersonRegisterModal 등 19개 필드(setter 6종 포함, 인터페이스 :21-47)가 한 객체라 검색어 한 글자마다 새 value가 만들어져 모든 소비자가 리렌더된다. 소비자는 CountryListInner 전체(country-list.tsx:69), CountryListFilters(country-list-filters.tsx:102), CountryMobileUI(country-mobile-ui.tsx:34 — country-detail-shell.tsx:220에서 무조건 마운트, 데스크톱 숨김은 CSS display:none뿐이라 상시 리렌더), 모든 CountryListRow(country-list-row.tsx:85가 unlinkedHistoricalIds 구독), 그리고 country-dashboard.tsx:335. CountryListRow는 React.memo가 아니고(:71) memo를 붙여도 행별 컨텍스트 구독이 무효화하며, CountryList의 React.memo(country-list.tsx:583)는 props만 방어해 기존 방어막이 없다. 검색 시 현대+역사 합류(context.tsx:150-155)·필터 활성 시 전 그룹 자동 펼침(country-list.tsx:408-411)이고 VirtualList는 가상화 없는 일반 div(country-list.styles.ts:666)라 첫 키 입력에 매칭 행 전량(최대 ~380: 역사 193건은 context.tsx:85 주석으로 뒷받침) 일괄 마운트·리렌더. 파일 주석의 격리 목적(context.tsx:5)은 우측 페인에만 달성되고 사이드바 내부는 미격리. 목록과 무관한 showPersonRegisterModal(:45-46)이 동거해 모달 열기/닫기만으로도 전 행+필터+모바일 UI가 리렌더된다.

**권고:** (1) 컨텍스트 2분할: 자주 바뀌는 입력 상태와 파생 목록·정적 데이터·액션 분리, showPersonRegisterModal은 로컬 state로 이동. (2) CountryListRow를 React.memo로 감싸고 isUnlinked·isSelected·isChildrenPopoverOpen을 boolean prop으로 좁혀 주입. (3) query에 useDeferredValue(또는 startTransition) 적용으로 타이핑 응답성과 목록 갱신 분리.

<details><summary>검증 노트</summary>

모든 핵심 인용이 코드로 확증됨. (1) value는 단일 useMemo 객체로 query·filtered·showPersonRegisterModal이 deps에 포함(context.tsx:180-218)되어 키 입력마다 새 객체 → 전 소비자 리렌더. (2) 소비자 4곳 실재: CountryListInner(country-list.tsx:69)·CountryListFilters(:102)·CountryMobileUI(:25-34)·CountryListRow(:85, unlinkedHistoricalIds 구독). CountryMobileUI는 country-detail-shell.tsx:220에서 무조건 마운트되고 데스크톱 숨김은 CSS display:none뿐(country-mobile-ui.styles.ts:254-257)이라 '데스크톱 상시 마운트' 주장도 사실. (3) CountryListRow는 memo 아님(:71)이고 CountryList의 React.memo(:583)는 props만 방어 — 컨텍스트 경유 리렌더에 기존 방어막 없음, useDeferredValue/startTransition도 부재. (4) 검색 시 현대+역사 합류(context.tsx:150-155), VirtualList는 가상화 없는 일반 styled div(styles.ts:666)라 매칭 행 전량 마운트, 역사 193건은 파일 자체 주석(:85)으로 뒷받침. (5) 격리 목적 주석(context.tsx:5)·모달 상태 동거(:45-46,:80,:199-200)도 확인. 소소한 사실 정정 2건: 필드 수는 17이 아닌 19개(setter 6종 포함), '전 그룹 자동 펼침'의 렌더 경로 라인은 :255(키보드 nav 평탄화)가 아닌 country-list.tsx:408-411. 추가로 발견이 누락한 소비자 country-dashboard.tsx:335도 존재해 영향 범위는 오히려 더 넓음. P2·M 적정.

</details>

### F33 [P3/S/CONFIRMED] CountryList의 React.memo가 셸의 비안정 콜백으로 사실상 무효화 — 죽은 최적화

`apps/web-admin/src/pages/country/country-detail-shell.tsx:135` · 렌즈: performance, architecture

CountryList는 React.memo로 export되지만(country-list.tsx:583) country-detail-shell.tsx:135의 handleSelectCountry가 useCallback 없는 plain 함수라 onSelect prop 참조가 매 렌더 바뀌어 memo 비교가 항상 실패한다. 또한 editHistoricalFromList는 useCallback이지만 deps에 historicalForm 객체 전체가 들어가는데(use-country-form-handlers.hook.ts:49), useHistoricalCountryFormModal이 return에서 매 렌더 새 객체 리터럴을 반환(useMemo 부재)하므로 이 콜백(onEditHistorical prop)도 매 렌더 재생성된다 — 독립적인 제2의 memo 파괴자. 셸은 useLocation·react-query(useContentCoreData, 윈도 포커스 refetch 포함)·폼 모달 state·isMobileListOpen state 때문에 빈번히 리렌더되고, 그때마다 사이드바 전체(필터+전 행)가 다시 그려진다. 나머지 props(openCreate 2종=deps [] useCallback, onToggleCollapse=useListCollapsed 안정 콜백, collapsed/selectedId=원시값)와 CountryListInner가 소비하는 CountryListStateProvider context value(useMemo + react-query structural sharing으로 안정)는 모두 안정하므로, 이 두 콜백만 안정화하면 memo는 실제로 복원된다. 단 react-router v6 navigate는 pathname 변경 시 참조가 바뀔 수 있어 useCallback([navigate])로도 라우트 전환 시 리렌더는 남지만, 모달/refetch發 리렌더 차단이라는 핵심 이득은 유지된다.

**권고:** `handleSelectCountry`를 `useCallback((id: string) => navigate(pathKeys.countryDetail(id)), [navigate])`로 감싸고, useCountryFormHandlers 반환 콜백(openCreate·editHistoricalFromList 계열)의 참조 안정성 확인(반환 객체 useMemo화 또는 의존 좁히기). 유지가 어려우면 memo 자체를 제거해 죽은 최적화를 없앤다.

<details><summary>검증 노트</summary>

코드로 전 구간 확증. (1) country-list.tsx:583 `React.memo(CountryListInner)` 존재. (2) country-detail-shell.tsx:135-136 `handleSelectCountry`가 useCallback 없는 plain 화살표 함수라 onSelect(193행) 참조가 셸 렌더마다 갱신 → memo 얕은비교 항상 실패. (3) 셸은 useLocation(73)·useContentCoreData(react-query, 77-83)·폼 모달 state·isMobileListOpen state를 보유해 라우트 전환·포커스 refetch·모달 조작마다 실제로 리렌더됨. (4) 반박 시도로 나머지 props와 context를 전수 확인: openCreate 2종은 deps [] useCallback, onToggleCollapse는 useListCollapsed의 안정 useCallback, CountryListInner가 소비하는 CountryListStateProvider value는 useMemo + useContentCoreData 파생 useMemo + react-query structural sharing으로 안정 — 따라서 "콜백만 안정화하면 memo 복원" 주장도 성립하며 context 우회 리렌더로 기각되지 않음. 발견의 조건부 서술("훅이 안정 객체를 반환하지 않으면")은 실측 결과 사실로 확정: useHistoricalCountryFormModal은 return에서 매 렌더 새 객체 리터럴 반환(useMemo 없음) → editHistoricalFromList(deps [apiHistoricalCountries, historicalForm])도 매 렌더 재생성되는 제2의 memo 파괴자. severity P3·effort S·line 135 모두 타당.

</details>

### F34 [P3/S/CONFIRMED] 리팩터 잔재 — 정적 key 하나뿐인 AnimatePresence(mode=wait)·동일 인라인 스타일 div 2중 래핑·도달 불가한 MainGrid $noSidebar 분기

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:364` · 렌즈: performance, architecture

country-list.tsx:364-379의 AnimatePresence(mode='wait', initial={false}) 안에 key='list' 고정 motion.div 하나만 렌더된다. key 불변·조건부 unmount 없음(접힘 시엔 AnimatePresence 자체가 함께 사라져 exit 재생 불가)이라 enter/exit 어느 쪽도 실행될 수 없다 — 과거 사이드바 탭 전환 UI의 잔재(데드 스타일 SidebarModeTabNav가 방증). 그 안 380-388의 plain div가 motion.div와 동일한 flex:1/minHeight:0/overflow:hidden 인라인 스타일을 중복 선언하며 2중 래핑 — 리스트 핫 패스에 framer-motion 구독 컴포넌트+매 렌더 스타일 객체 재생성+DOM 깊이만 더한다. 부가: content-shell.tsx:100-104가 `$noSidebar`를 상수 true로 넘겨 content-shell.styles.ts:9-28의 '15% 30% 1fr' 3컬럼 분기가 도달 불가 데드 브랜치이고 prop 이름도 실제 의미(고정폭 사이드바)와 반대.

**권고:** AnimatePresence·motion.div·내부 중복 div를 제거하고 S.SidebarTabBody 바로 아래 S.ListContainer를 렌더(styled 하나로 대체). MainGrid의 $noSidebar prop과 데드 분기 삭제. 뷰 전환 페이드가 장래 필요하면 전환 대상 key와 함께 재도입.

<details><summary>검증 노트</summary>

전 항목 코드로 확증. (1) country-list.tsx:364-378 — AnimatePresence(initial={false}, mode='wait') 안에 key='list' 고정 motion.div 단독 렌더, key 불변·조건부 unmount 없음. 접힘 시 line 330 {!collapsed && ...} 블록째 unmount라 exit 불가, remount 시 initial={false}가 enter 억제 → 애니메이션 실행 경로 전무. (2) lines 380-388 plain div가 motion.div와 flex:1/minHeight:0/flex-column/overflow:hidden 인라인 중복 — 나아가 내부 S.ListContainer(styles:293-300)와 바깥 S.SidebarTabBody(styles:307-313)까지 같은 flex 체인 4겹 반복이라 detail이 오히려 보수적. (3) SidebarModeTabNav는 styles:317 정의뿐 전체 grep 사용처 0건 — 데드 스타일 방증 성립. (4) content-shell.tsx:101이 $noSidebar를 bare prop(상수 true)으로 전달하고 codebase 유일 MainGrid 사용처 — styles.ts:27 '15% 30%' 및 :46 '18% 35%' 분기 도달 불가, $noSidebar=true가 고정 360px 사이드바를 만들어 이름이 의미와 반대인 것도 사실. 권고(SidebarTabBody 직하 ListContainer)는 제거 대상이 전부 동일 선언 반복이라 레이아웃 안전. P3·line 364·effort S 적정.

</details>

### F35 [P3/S/CONFIRMED] 역사국가 popover가 캡처 단계 window scroll마다 setState — 스크롤 프레임마다 리렌더, rAF 스로틀 없음

`apps/web-admin/src/widgets/country/country-list/ui/country-list-children-popover.tsx:123` · 렌즈: performance

country-list-children-popover.tsx:123-131이 `window.addEventListener('scroll', handler, true)`(캡처)로 모든 스크롤 이벤트에서 updatePosition을 호출하고, updatePosition(89-115)은 getBoundingClientRect 후 매번 setPos로 새 객체를 set한다. 사이드바 스크롤 중 popover가 열려 있으면 스크롤 이벤트 빈도(프레임당 1회 이상)로 React 리렌더가 발생하며 위치가 같아도 새 객체라 bail-out이 없다. IntersectionObserver(135-151)가 anchor 이탈 시 닫아주긴 하지만 이탈 전 추적 구간에서는 그대로 비용을 낸다.

**권고:** updatePosition을 requestAnimationFrame으로 스로틀(예약된 프레임 있으면 skip)하고 setPos 전에 이전 top/left/arrowTop과 비교해 동일하면 생략. 또는 state 대신 popRef.current.style.transform 직접 갱신으로 React 리렌더 자체를 우회.

<details><summary>검증 노트</summary>

인용 전부 실코드와 일치: country-list-children-popover.tsx:126이 window 캡처 scroll에 무스로틀 handler를 걸고, updatePosition(89-115)은 getBoundingClientRect 후 114행에서 항상 새 객체로 setPos하여 위치 불변이어도 bail-out 없이 스크롤 이벤트당 리렌더가 발생한다. 리스너를 이 컴포넌트가 직접 등록하므로 상위 계층 방어는 존재하지 않으며, IntersectionObserver(135-151)는 anchor 이탈 시 닫기만 할 뿐 추적 구간 비용은 그대로다. 추가로 캡처 등록이라 popover 자체 내부 스크롤(S.ChildrenScroll)도 window 캡처에 걸려 anchor가 안 움직이는 경우에도 강제 레이아웃 읽기+리렌더가 발생 — 발견이 오히려 보수적이다. 컴포넌트가 소형 포트탈이라 체감 손상은 제한적이므로 P3·effort S 판정 적정, 라인 123 적절.

</details>

### F36 [P3/S/CONFIRMED] 행마다 pinnedIds.includes O(n) 배열 탐색 — Set 미사용 (최근목록 필터·컨텍스트 메뉴도 동일)

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:489` · 렌즈: performance

country-list.tsx:489에서 모든 행 렌더마다 `pinned={pinnedIds.includes(country.id)}` 선형 탐색을 수행하고, 컨텍스트 메뉴(551)와 quickAccessItems의 recent 필터(152 `recentIds.filter((id) => !pinnedIds.includes(id))`)도 동일하다. 핀 개수가 작아 절대 비용은 크지 않으나(행 ~380 × 핀 k) 행 렌더 핫 패스에 있고 Set 파생 한 줄로 제거 가능하며, 행 memo화(F16) 시 prop 계산 안정화에도 필요하다.

**권고:** `const pinnedIdSet = React.useMemo(() => new Set(pinnedIds), [pinnedIds])`를 만들어 행 prop은 `pinnedIdSet.has(country.id)`, recent 필터·메뉴도 Set 조회로 교체.

<details><summary>검증 노트</summary>

인용 3곳 모두 실제 코드와 일치: country-list.tsx 489-491행 `pinned={pinnedIds.includes(country.id)}`(행 렌더 핫 패스), 551행 컨텍스트 메뉴 `pinnedIds.includes(contextMenu.country.id)`, 152행 `recentIds.filter((id) => !pinnedIds.includes(id))`. 방어 부재도 확인: pinned-countries.store.ts:6에서 pinnedIds는 string[] 배열이고 store 내부(isPinned:22, toggle:17)까지 전부 선형 탐색이며 Set 파생은 어디에도 없음. CountryListRow는 React.memo 미적용이라 부모 렌더마다 행 prop 계산이 실제 수행됨. 다만 절대 비용은 발견의 자체 한정대로 작음 — 152행은 useMemo(133행) 내부라 dep 변경 시에만 재계산되고, 첫 진입은 'all' sentinel 전체 접힘이라 렌더되는 행이 적으며, 551행은 메뉴 열림 시 1회 호출. P3/S 판정과 Set 파생 recommendation 모두 타당.

</details>

### F37 [P3/S/CONFIRMED] S.VirtualList는 이름과 달리 가상화가 아님 — 페인트만 content-visibility로 방어, React 렌더 비용 미방어를 이름이 가림

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:666` · 렌즈: performance

country-list.styles.ts:666-682 VirtualList는 `overflow-y: auto` 단순 스크롤 div다. 실제 방어는 ListRow의 `content-visibility: auto; contain-intrinsic-size: auto 56px`(788-791, '가상화-라이트' 주석)로 화면 밖 행의 레이아웃·페인트만 브라우저가 건너뛴다. React 계층은 그대로: country-list.tsx:407-508이 전 행을 eager 렌더하고, CountryListRow(country-list-row.tsx, 221줄)는 memo 미적용이며, 검색어가 CountryListStateProvider의 plain useState(country-list-state.context.tsx:75)라 키 입력마다 전 행이 리렌더된다(CountryList 전체 memo는 내부 상태 변화에 무력). 'VirtualList'라는 이름은 windowing이 이미 되어 있다는 오독을 낳아, 역사국가 시드가 계속 늘어나는 추세에서 실제 병목 원인 파악을 늦춘다.

**권고:** 이름을 ScrollList(또는 ListScroll)로 바꾸고 content-visibility 전략 주석을 스타일 쪽에 이전. F16의 행 memo화·useDeferredValue를 먼저 적용하고, 이후에도 검색 합류 목록(~380행+)에서 입력 지연이 실측되면 react-window 등 실제 windowing 도입 검토(flatRowIds 평탄화 구조가 이미 있어 전환 비용 중간).

<details><summary>검증 노트</summary>

코드로 전부 확증. (1) country-list.styles.ts:666-682 VirtualList는 `overflow-y: auto` 단순 스크롤 div — windowing 없음(line 671). ListRow의 `content-visibility: auto; contain-intrinsic-size: auto 56px`와 '가상화-라이트' 주석은 788-791로 인용 정확. (2) 타 계층 방어 부재 확인: country-list.tsx:390-513이 전 행을 eager 렌더(react-window 등 미사용), country-list-row.tsx(221줄)는 React.memo 미적용, CountryList 전체 memo(country-list.tsx:583)는 부모발 리렌더만 차단 — 검색어가 country-list-state.context.tsx:75 plain useState라 키 입력마다 Provider 서브트리 전체(전 행) 리렌더되는 F16 연쇄가 성립하며 debounce/useDeferredValue 없음. (3) 유일한 사실 흠: detail의 '~380행 컴포넌트'는 모호 — 행 컴포넌트 파일은 221줄이고 380은 데이터 행 수 추정치로 코드 검증 불가. 핵심 주장(이름과 실체 불일치, React 렌더 비용 미방어)에는 영향 없음. severity P3·effort S 적정.

</details>

### F61 [P3/S/CONFIRMED] 검색 입력 디바운스 부재 — 사건 카탈로그(250ms+spinner)·인물 인포그래픽의 shared useDebouncedValue 규약 미적용

`apps/web-admin/src/widgets/country/country-list/ui/country-list-filters.tsx:124` · 렌즈: parity

country-list-filters.tsx:124가 onChange마다 즉시 onQueryChange를 호출해 Context filtered(현대+역사 ~440건 합류 정렬, country-list-state.context.tsx:124-178)와 그룹핑·평탄화 memo가 키 입력마다 재계산되고 목록 전체가 리렌더된다. 자매인 사건 카탈로그는 shared/hooks/use-debounced-value로 250ms 디바운스+isSearchPending spinner를 표준화(events.page.tsx:257-258, catalog-toolbar.tsx:125-129)했고 인물 인포그래픽도 같은 훅 사용(infographic-content.tsx:15). 데이터가 작아 체감 문제는 크지 않으나 이미 존재하는 공용 훅을 두고 사이드바만 미적용인 규약 이탈(F16의 리렌더 비용을 증폭).

**권고:** 입력값은 로컬 state로 즉시 반영하고 useDebouncedValue(입력, 200~250ms) 결과만 Context setQuery로 전달. 사건 카탈로그처럼 pending 중 검색 아이콘 자리 spinner는 선택 적용.

<details><summary>검증 노트</summary>

country-list-filters.tsx:124가 onChange마다 onQueryChange를 즉시 호출함을 확인. 방어 계층 부재도 확인: country-list.tsx:58-59가 Context setQuery를 그대로 전달하고, country-list-state.context.tsx:75가 raw useState, filtered memo(정확히 124-178행)가 query 변경마다 현대 필터+역사 합류(150-155행)+localeCompare('ko') 정렬을 재계산. Context value memo가 query·filtered에 의존하므로 키 입력마다 목록 소비자 전체 리렌더도 사실. 패리티 인용 3건 모두 정확(events.page.tsx:257-258 useDebouncedValue 250ms+isSearchPending, catalog-toolbar.tsx:125-129 spinner 분기, infographic-content.tsx:15 import·79행 200ms 사용). shared/hooks/use-debounced-value.ts는 country-detail 자매 위젯 포함 8개+ 파일에서 사용 중이라 사이드바만 미적용인 규약 이탈이 맞음. 심지어 context 87행 memo 주석("검색어 입력마다 193건을 다시 변환하던 중복 제거")이 키 입력당 비용을 기존에 인지했음을 보여줌. severity P3·effort S 적정("~440건"은 추정치이나 ~ 표기로 헤지됨, 193 역사+현대 국가 규모와 정합).

</details>

## 배치 7 — 시각·디자인 시스템 정합

### F17 [P2/S/CONFIRMED] 필터 셀렉트 화살표가 data URI 안 currentColor라 다크모드에서 검정 렌더 — 사실상 안 보임 (+죽은 border 삼항)

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:557` · 렌즈: design-visual

country-list.styles.ts:557 FilterSelect의 background-image data URI SVG가 `stroke='currentColor'`를 쓰는데, CSS background-image SVG는 요소 color를 상속받지 못해 currentColor가 초기값(검정)으로 굳는다. 다크 테마에서 select 배경이 background.secondary(#212121)라 검정 화살표는 거의 안 보인다(유형·대륙·정렬 3개 모두 해당). 프로젝트에는 정확히 이 문제를 해결한 공용 컴포넌트가 이미 있다 — shared/ui/form-select-native/form-select-native.tsx:25-28의 chevronDataUri('#a1a1aa')는 테마별 stroke 색을 URI에 인코딩. 부수: 같은 블록 547-549 `border: 1px solid ${({ $active }) => $active ? 'transparent' : 'transparent'}`는 양 분기 동일한 무의미 삼항(활성 표시 의도 미완의 흔적).

**권고:** background-image를 FormSelectNative의 chevronDataUri 패턴(테마 모드별 stroke 색 인코딩)으로 교체하거나 FilterSelect를 FormSelectNative 확장으로 재구성. 죽은 삼항 border는 실제 활성 보더 또는 `1px solid transparent`로 정리(F21과 연계).

<details><summary>검증 노트</summary>

모든 인용이 실코드와 일치. country-list.styles.ts:557의 FilterSelect background-image data URI에 stroke='currentColor'가 실재하며, CSS background-image로 로드된 SVG는 격리 문서라 currentColor가 초기값(검정)으로 고정되는 것은 표준 브라우저 동작. 다크 테마 background.secondary=#212121(theme.ts:137 다크 블록), $active 시 activeLight=#1e1e3a로 양쪽 모두 어두워 검정 화살표가 사실상 비가시. appearance:none(562-563)으로 네이티브 화살표도 제거되어 이 data-URI 화살표가 유일한 드롭다운 어포던스인데 이를 보완하는 래퍼 아이콘·전역 스타일 등 다른 방어 계층 없음. country-list-filters.tsx:138/151/165에서 유형·대륙·정렬 3개 셀렉트 모두 FilterSelect 사용 확인. 대조 컴포넌트 form-select-native.tsx:25-28의 chevronDataUri('#a1a1aa' 다크/'#64748b' 라이트) 패턴도 실재. 부수 지적인 547-549 죽은 삼항(border 양 분기 'transparent', theme 미사용 구조분해)도 원문 그대로 확인. severity P2·line 557·effort S 모두 적정.

</details>

### F38 [P3/M/CONFIRMED] country-list.styles.ts(1544줄)의 약 1/3(32개 export·400~500줄)이 데드 스타일 — canon 위반 자체 SelectModal 블록·inert sticky 포함

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:1361` · 렌즈: correctness, performance, design-visual, architecture

import하는 7개 파일(country-list 위젯 5 + country-mobile-ui + historical-country-detail.widget) 전수 대조 결과 미참조 export 32개(파일 내부 `${...}` 참조 포함 0): SelectModalOverlay/SelectModal/SelectModalHeader·Title·Close·Content/SelectOption·Icon·TextGroup·Label·Desc(1361-1544, 약 185줄), ControlsRow·Left·Right·AddIconButton(339-410), FilterButton(578-633), ListCollapseButton(229-289), ChildrenPane(108-133, B-4 Finder 컬럼 잔재 — popover 전환으로 폐기), SidebarFilterSlot·SidebarModeTabNav·SidebarTabCount(302-335, UnderlineTabNav import도 이것에만 사용), QuickAccessSection·Header(938-952), RowCheckbox·ExpandButton·StarIcon(872-907), HistoricalCountBadge(1101-1115, filters는 동명 로컬 스타일 별도 정의), RadioDot·AttachmentDot·TimeText·MetaInline·SubYear. SelectModal 블록은 shared/ui/select-modal(자체 styles 사용, select-modal.tsx:8)과 개념 중복이면서 glassCardMixin 대신 rgba(33,33,33,0.92) 수제 표면·z-index 1000/1001 하드코딩(Z_INDEX 토큰 무시, 1370-1390)·다크 radius 20/라이트 16 비대칭(1380·1399) — 죽은 코드이면서 복붙 시 모달 canon 위반 전파 위험. 부수: historical-country-detail.widget.tsx:18-20의 `import * as ListStyles` spread는 실사용 키 0(실사용은 AnalyticsDashboard·DetailPaneRelative 2종) — 죽은 import가 위젯 간 수평 결합만 남김; FilterRow stickyBar(416)는 스크롤 컨테이너(VirtualList) 밖이라 sticky inert; FilterResultBar `top:113px`(641) 매직넘버는 mobile-ui 전용. 모두 styled() 팩토리라 모듈 로드 시 생성 비용·번들 크기·'어느 스타일이 실사용인가'를 가리는 유지보수 비용을 유발.

**권고:** 32개 데드 export와 SelectModal 블록 일괄 삭제 — 단 country-mobile-ui가 FlagBadge·Meta·Dot·NameText·RowBottom·FilterResultBar·FilterResultText·FilterResultCount를 실사용하므로 삭제 전 그렙 필수, 삭제 후 tsc·변경 파일 lint 검증. historical-country-detail의 ListStyles spread import도 제거해 수평 의존 한 줄을 끊는다. 남는 스타일은 행·필터·팬 셸 등 사용 단위 파일로 분할 검토('Deprecated — 호환 유지' FlagBadge는 실사용 확인되어 유지). 모달 필요 시 @/shared/ui/modal+glassCardMixin 사용.

<details><summary>검증 노트</summary>

전수 정적 대조로 발견의 핵심 주장 전부 확증. (1) 파일 1544줄·임포터 7개(모두 namespace import, 동적 접근·배럴 재수출 없음) 확인 후 87개 export를 7파일 별칭(S./ListS./CountryStyles.)+파일 내부 참조까지 프로그램적으로 대조한 결과 미사용 정확히 32개, 발견의 열거와 1:1 일치. (2) SelectModal 블록(1361-1544): rgba(33,33,33,0.92) 수제 표면(1390, canon glassCardMixin=rgba(20,20,20,0.92)), z-index 1000/1001 하드코딩(1373/1381, shared/styles/z-index.ts Z_INDEX 토큰 존재), 다크 radius 20(1380)/라이트 16(1399) 비대칭 — 모두 실재하며 shared/ui/select-modal(select-modal.tsx:8, useModalBehavior 사용)과 개념 중복. (3) historical-country-detail.widget.tsx:18-20 spread 확인, CountryStyles 실사용 키는 AnalyticsDashboard·DetailPaneRelative 2종뿐이며 둘 다 country-detail.styles.ts(6·31행) 소속 → ListStyles 기여 키 0. (4) FilterRow stickyBar(416)는 ListPane(overflow:hidden, 208행) 안 CountryListFilters에 있고 유일한 스크롤러는 하위 VirtualList(overflow-y:auto, 671행) → sticky inert가 구조상 확정. (5) FilterResultBar top:113px(641)는 country-mobile-ui.tsx:160 단독 사용, UnderlineTabNav import는 데드 SidebarModeTabNav(317) 전용, filters 로컬 동명 HistoricalCountBadge(country-list-filters.tsx:31), FlagBadge Deprecated 주석·mobile 실사용, 권고의 mobile 8종 실사용 모두 사실. 사소한 부정확 2건은 정정 불요 수준: 302-335 범위에 살아있는 SidebarTabBody(307-316)가 끼어 있으나 발견은 데드 3종만 명시했고, '약 400~500줄'은 실측 약 536줄로 소폭 과소('약' 표기 허용범위). P3/M 적정.

</details>

### F39 [P3/M/CONFIRMED] 사이드바 부유 표면 3종(popover·추가메뉴·컨텍스트메뉴)이 전부 bespoke — glassCardMixin 미경유, radius 14/10/10px 제각각, 다크 그림자 소실

`apps/web-admin/src/widgets/country/country-list/ui/country-list-children-popover.tsx:335` · 렌즈: design-visual

popover Inner(country-list-children-popover.tsx:335-344)는 `background: theme.colors.background.primary`(다크 #171717 솔리드)+`border-radius: 14px` 자체 표면 — 규약은 표면 단일진실 glassCardMixin(다크 rgba(20,20,20,0.92)+blur24)+radius 16px. Pop 그림자(313-314)는 `drop-shadow(0 1px 2px rgba(0,0,0,0.06)) drop-shadow(0 14px 30px rgba(0,0,0,0.18))` 고정 상수라 다크(#171717 배경 위)에선 대비가 거의 없어 평면적으로 붙어 보인다(glassCardMixin 다크 그림자 0 10px 40px rgba(0,0,0,0.5)·theme.colors.shadow 토큰과 불일치). add-menu Menu(country-list-add-menu.tsx:145-157)와 context-menu Menu(country-list-context-menu.tsx:122-131)는 background.primary+border.default+radius 10px+box-shadow 조합의 별도 복제본 — 같은 사이드바에서 떠오르는 세 표면이 radius·그림자 모델(drop-shadow filter vs box-shadow)이 전부 다르고 어느 것도 glassCardMixin을 경유하지 않아 글래스로 통일된 모달들과 이질적이다.

**권고:** 세 표면을 glassCardMixin+border-radius 16px(또는 드롭다운 전용 공용 서피스 믹스인을 shared/styles/mixins.ts에 1개 신설)로 통일하고 add-menu·context-menu가 같은 정의를 공유하게 스타일을 한 곳으로 승격. popover는 --pop-bg/--pop-border CSS 변수를 글래스 값(rgba(20,20,20,0.92)/rgba(255,255,255,0.1))으로 갱신해 말꼬리 SVG 색을 맞추고(반투명이면 화살표 seam 검증), 다크 그림자는 theme.colors.shadow.lg 계열로 강화.

<details><summary>검증 노트</summary>

전 인용 라인 실검증 일치. popover Inner(335-344)는 background.primary(다크 #171717 솔리드, theme.ts:136)+radius 14px, Pop(313-314)은 테마 분기 없는 고정 drop-shadow(0.06/0.18 알파) — glassCardMixin 다크(rgba(20,20,20,0.92)+blur24+0 10px 40px rgba(0,0,0,0.5), mixins.ts:58-64) 인용도 정확. add-menu(145-157)·context-menu(122-131)는 background.primary+border.default+radius 10px+box-shadow(shadow.md 토큰)의 별도 복제본으로 확인, 세 표면 모두 glassCardMixin 미import·공용층 방어 없음. web-admin CLAUDE.md 글래스 통일 작업이 select/date-picker 등 드롭다운형 표면까지 포함했으므로 이 3종 미포함은 실제 일관성 결손. 유일한 뉘앙스: 메뉴 2종의 그림자는 theme.colors.shadow.md 토큰이라 테마 인지적이며 '다크 그림자 소실'은 popover 한정 — detail이 이미 그렇게 서술하고 있어 정정 불요. popover의 drop-shadow filter는 말꼬리 SVG 그림자용으로 기술적 필요가 있어 통일 시 recommendation의 seam 검증 단서가 타당. P3·M·라인 335 모두 적절.

</details>

### F40 [P3/M/CONFIRMED] 3분기 유형 필터(전체/현대/과거)가 segmentToggleMixin canon 대신 native select

`apps/web-admin/src/widgets/country/country-list/ui/country-list-filters.tsx:138` · 렌즈: design-visual

country-list-filters.tsx:138-149의 유형 필터는 옵션 3개(전체/현대/과거)짜리 한 줄 선택 컨트롤로 디자인 canon('토글=segmentToggleMixin, bespoke 토글 금지')의 전형적 적용 대상인데 native FilterSelect(styled.select, country-list.styles.ts:542)로 구현돼 있다. shared/ui/segment-control(segmentToggleMixin 기반)이 이미 존재하며, 그 docstring이 스스로 "라디오/필터/3-way 선택 등 공용"이라 명시해 이 케이스가 정확히 의도된 용도다. 활성 상태 표현은 FilterSelect도 activeLight 채움+active 글자색(country-list.styles.ts:553-556)을 쓰지만 canon의 primary 활성 보더가 없다 — 547-549행이 `$active ? 'transparent' : 'transparent'` 죽은 삼항으로 보더를 항상 투명 처리(잔재 코드). 대륙·정렬 셀렉트는 옵션 수가 가변·많아 select 유지가 타당하나, 유형 3분기는 세그먼트가 규약이자 발견성에도 낫다(현재 '과거' 필터는 셀렉트를 열어야 보여 182-191의 '과거 국가 N개 보기' 배지가 우회 진입로로 추가된 상태 — 파일 헤더 주석 4-5행이 도입 사유 F37을 명시).

**권고:** 유형 필터를 shared/ui/segment-control(SegmentControl) 3분기로 교체. 세그먼트 전환 시 '과거 국가 N' 카운트를 세그먼트 라벨에 병기하면 DiscoveryRow의 HistoricalCountBadge 우회 UI를 축소할 수 있다.

<details><summary>검증 노트</summary>

핵심 주장 전부 코드로 확증. (1) country-list-filters.tsx:138-149 유형 필터는 native styled.select(S.FilterSelect, country-list.styles.ts:542) 3옵션 — 사실. (2) shared/ui/segment-control이 segmentToggleMixin 기반으로 존재하며 docstring(2행)이 "라디오/필터/3-way 선택 등 공용"이라 명시 — 3분기 유형 필터가 정확히 명시된 적용 대상이라 발견 근거가 강화됨. (3) '과거' 필터 발견성 문제로 182-191행 HistoricalCountBadge 우회 진입로가 추가된 상태(헤더 주석 4-5행이 도입 사유 F37 명시) — 사실. 단 detail에 사실 오류 1건: FilterSelect의 active 표현은 "색만" 바뀌는 게 아니라 activeLight 배경 채움(555-556행)도 canon과 동일하게 적용되며, canon(segmentToggleMixin 67-72행)과의 실제 차이는 primary 보더 부재뿐 — 547-549행의 `$active ? 'transparent' : 'transparent'` 죽은 삼항이 보더를 항상 투명 처리. severity P3·effort M 적정.

</details>

### F41 [P3/S/CONFIRMED] 필터 초기화 버튼 hover 배경 이중 선언 — 라이트모드에서 흰색 위 흰색이라 hover 피드백 소실

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:519` · 렌즈: design-visual

country-list.styles.ts:516-523 ClearAllFiltersButton의 &:hover 블록에 background가 두 번 선언돼 있다. 첫 선언 `background: theme.colors.hover`(라이트 #f1f5f9, theme.ts:69)가 바로 다음 줄 `background: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)'`(519-522)로 덮여 죽은 코드다. 버튼이 렌더되는 FilterRow는 stickyBar 믹스인(styles:416→75-88)으로 라이트에서 background.primary(#ffffff)이므로 rgba(255,255,255,0.95) hover 배경은 시각적으로 완전히 보이지 않는다(다크는 rgba(23,23,23,0.9) 위 rgba(255,255,255,0.1)라 정상). 단, 517줄의 color 전환(text.tertiary→text.primary)은 살아 있어 소실되는 것은 배경 hover 피드백에 한정된다.

**권고:** 중복 선언 중 뒤쪽(모드 분기 rgba)을 삭제하고 `background: theme.colors.hover` 단일 선언으로 되돌린다 — 라이트 #f1f5f9/다크 #212121 모두 배경과 구분된다.

<details><summary>검증 노트</summary>

코드로 전부 확증됨. country-list.styles.ts:516-523의 &:hover 블록에 background가 실제로 두 번 선언돼 있고(518 theme.colors.hover → 519-522 모드 분기 rgba가 덮음), 버튼은 country-list-filters.tsx:112/136/176에서 FilterRow(stickyBar 믹스인, 라이트 background.primary=#ffffff, styles:85·theme.ts:55) 내부에 렌더되므로 라이트모드 rgba(255,255,255,0.95)는 흰 배경 위에서 시각적으로 구분 불가. theme.ts:69 라이트 hover=#f1f5f9, :150 다크 hover=#212121로 권고안의 색 주장도 정확. 다른 계층의 방어(!important·후속 오버라이드) 없음. 다크는 rgba(255,255,255,0.1)가 rgba(23,23,23,0.9) 위에서 보이므로 '다크는 정상'도 사실.

</details>

### F42 [P3/M/CONFIRMED] 다크 사이드바 배경 3톤 분열 — 페인 rgba(23,23,23,0.85)·sticky바 0.9·그룹헤더 불투명 #171717이 스크롤 시 seam 생성

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:703` · 렌즈: design-visual

다크 배경 선언이 세 갈래로 분열: ListPane(country-list.styles.ts:215) `rgba(23,23,23,0.85)+blur(20)`, stickyBar(:80) `rgba(23,23,23,0.9)+blur(16)`, ContinentSectionHeader(:702-707) `theme.colors.background.primary`(다크 불투명 #171717)+blur(8). 셋 다 글래스 정본 glassCardMixin(rgba(20,20,20,0.92)+blur(24), mixins.ts:59-61)과 불일치하는 이 위젯만의 제3의 글래스 값이다('다크 배경 10종 난립→통일' 이력과 같은 계열의 표류). 다만 현재는 시각적 seam이 없다: rgba(23,23,23,α)는 #171717과 동일 RGB이고, 이 라우트의 다크 백드롭은 항상 균일한 #171717(app.tsx:194 body inline style이 country-detail-shell.tsx:42의 body #ffffff 규칙을 오버라이드, #global-bg는 숨김)이라 세 배경이 픽셀 동일하게 합성되고 행 배경도 transparent다. 실질 문제는 (1) 정본 이탈이 잠재 상태로 축적 — 백드롭이 #171717 균일이 아니게 되는 순간(예: 사진 배경 노출·라이트 백드롭 유출) 3톤이 즉시 가시화, (2) 균일/불투명 백드롭 위 backdrop-filter 3종(blur 20/16/8+saturate)이 시각 효과 0인 채 컴포지팅 비용만 지불(특히 불투명 그룹 헤더의 blur(8)은 완전한 죽은 선언), (3) country-detail-shell.tsx:42의 body #ffffff 강제는 inline style에 항상 지고 있는 죽은 규칙으로 백드롭 계약을 오독하게 만든다.

**권고:** 페인·sticky바·그룹헤더의 다크 배경을 한 상수(권장: 글래스 정본 rgba(20,20,20,…) 계열 알파 2단계)로 통일. ContinentSectionHeader는 반투명+blur로 페인과 동일 톤을 쓰거나(스크롤 밴드 제거) 불투명 유지 시 blur 선언 제거.

<details><summary>검증 노트</summary>

인용 라인·값은 전부 사실: ListPane 다크 rgba(23,23,23,0.85)+blur20(country-list.styles.ts:215-217), stickyBar rgba(23,23,23,0.9)+blur16(:80), ContinentSectionHeader theme.colors.background.primary(다크 #171717, theme.ts:136)+blur8(:702-707), 글래스 정본은 rgba(20,20,20,0.92)+blur24(mixins.ts:59-61) — '제3의 글래스 값' 드리프트 및 '불투명 배경 위 blur 무의미' 주장 모두 코드로 확증. 단, 핵심 harm인 '스크롤 시 seam'은 성립하지 않음: rgba(23,23,23,α)는 #171717과 동일 RGB이고, 다크에서 페인 뒤 백드롭은 항상 #171717 균일(app.tsx:194가 body에 inline style로 background.primary 지정 — country-detail-shell.tsx:42의 body #ffffff 규칙을 이겨냄; #global-bg는 이 라우트에서 display:none, ContentContainer도 transparent 또는 #171717)이라 세 배경 모두 픽셀 동일한 #171717로 합성됨. 행 배경도 transparent라 스티키 헤더 아래로 스크롤해도 톤 밴드가 생기지 않음. 따라서 시각적 seam이 아니라 '잠재적 드리프트+죽은 blur 선언(무효과 GPU 비용)'으로 정정한 P3 일관성 발견으로 생존.

</details>

### F43 [P3/S/CONFIRMED] 핀 표식 색 이원화 — 별 버튼 #f59e0b(앰버) vs 고정 그룹 #eab308(옐로), 토큰 미경유

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:919` · 렌즈: design-visual

같은 '핀' 개념에 두 색: PinButton(country-list.styles.ts:919,934)은 #f59e0b 하드코딩, 고정 그룹 헤더 아이콘은 SPECIAL_GROUP_COLORS.__pinned__=#eab308(continent-colors.ts:29). 행의 핀 별과 바로 위 '고정' 섹션 아이콘이 미묘하게 다른 노랑으로 렌더된다. 두 값 모두 theme 토큰(warning: 라이트 #f59e0b 계열/다크 #ffd60a)을 경유하지 않는 임의 하드코딩.

**권고:** 핀 색 상수를 한 곳(continent-colors.ts 또는 theme)에 단일 정의하고 PinButton과 SPECIAL_GROUP_COLORS.__pinned__가 같은 값을 참조하게 한다.

<details><summary>검증 노트</summary>

모든 인용이 코드와 정확히 일치. country-list.styles.ts:919·934의 PinButton은 '#f59e0b' 하드코딩, continent-colors.ts:29의 SPECIAL_GROUP_COLORS.__pinned__='#eab308'이 country-list.tsx:412(getContinentColor)→450(style={{color: accent}})을 거쳐 고정 그룹 헤더 FiStar에 실제 적용됨 — 같은 핀 개념에 인접한 두 노랑이 공존. theme.ts:65 라이트 warning='#f59e0b'(정확히 동일값), :146 다크 warning='#ffd60a'로 토큰 주장도 사실이며, 다크 모드에서 PinButton이 라이트 앰버로 고정되는 점까지 성립. 두 값을 연결하는 공용 상수·방어 계층은 없음. 정적 코드만으로 완전 확증 가능.

</details>

### F44 [P3/S/CONFIRMED] '연결 안 됨' 앰버 배지 스타일이 2개 파일에 하드코딩 사본 중복 — theme.colors.alert.warning 토큰 무시 (+대륙명 후행 공백 키 워크어라운드)

`apps/web-admin/src/widgets/country/country-list/ui/country-list-row.tsx:25` · 렌즈: design-visual, architecture

country-list-row.tsx:25-38 UnlinkedBadge와 country-list-filters.tsx:59-72 UnlinkedHint가 동일 앰버 팔레트(rgba(245,158,11,0.32)/#fde68a/#fef3c7/#fbbf24/#92400e)를 각자 복제 하드코딩한다. theme에는 같은 의미의 alert.warning 토큰(다크 fg #fbbf24·border rgba(250,204,21,0.4), theme.ts:177-182)이 이미 있고, 두 배지의 padding·radius도 달라(0 5px·4px 사각 vs 3px 8px·999px 필) 같은 의미의 표식이 지면마다 다르다. 단 토큰은 양 모드 bg가 'transparent'(톤다운 설계)라 현재 배지의 채움 배경(rgba(245,158,11,0.14)/#fef3c7)은 토큰만으로 재현 불가 — 추출 시 bg 파생 규칙을 함께 정해야 한다. 같은 계열: continent-colors.ts:12·61의 '북아메리카 '(후행 공백) 키가 색·순서 맵 양쪽에 데이터 워크어라운드로 존재하고, getContinentColor(45행)·getContinentOrder(76행)가 trim 없이 직접 조회하며 호출부(country-list.tsx:187·412·569)도 raw name을 넘겨 공백 있는 대륙명은 조용히 fallback 회색(#a1a1aa)·순서 999가 된다.

**권고:** UnlinkedBadge를 위젯 내 공용 파일(ui/unlinked-badge.ts)로 추출해 theme.colors.alert.warning 토큰 기반 단일 정의로 만들고 row·filters 양쪽이 import. continent-colors는 lookup 전 name.trim() 적용 후 후행 공백 키 제거.

<details><summary>검증 노트</summary>

모든 인용이 코드와 일치. (1) country-list-row.tsx:25-38 UnlinkedBadge와 country-list-filters.tsx:59-72 UnlinkedHint가 동일 앰버 팔레트(다크 rgba(245,158,11,0.32)/rgba(245,158,11,0.14)/#fbbf24, 라이트 #fde68a/#fef3c7/#92400e)를 각자 하드코딩 — 공용 소스 없음(grep으로 두 파일 외 사용처 없음 확인). 형태 차이(0 5px·4px 사각 vs 3px 8px·999px 필)도 사실. (2) theme.ts:177-182에 다크 alert.warning fg #fbbf24·border rgba(250,204,21,0.4) 토큰 실존 — 인용 값 정확. (3) continent-colors.ts:12·61 '북아메리카 '(후행 공백) 키가 색·순서 맵 양쪽에 존재하고, getContinentColor(45행)·getContinentOrder(76행) 모두 trim 없이 직접 키 조회, country-list.tsx 호출부(187·412·569행)도 raw name 전달이라 다른 계층 방어 없음 — 공백 이름은 조용히 #a1a1aa 폴백. severity P3·effort S 적정. 한 가지 뉘앙스: alert.warning 토큰은 양 모드 bg가 'transparent'(톤다운 설계, theme.ts:94 주석)라 현재 배지의 채움 배경과 픽셀 동일하지 않음 — 토큰 기반 추출 시 fg에 alpha를 입혀 bg를 파생하거나 무배경 채택을 명시적으로 결정해야 함.

</details>

### F45 [P3/S/CONFIRMED] 죽은 시각 프롭 — ListRow $accentColor(주석은 '대륙색 strip' 약속, CSS 미구현)·CodeText $unread

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:771` · 렌즈: design-visual

country-list.styles.ts:768-831 ListRow는 `$accentColor?: string`을 받지만 CSS 본문 어디서도 참조하지 않는다. country-list-row.tsx:57 주석('행 좌측 strip 색 — 대륙 색 (V2). 미지정 시 transparent')과 달리 행 좌측 대륙색 스트립은 렌더되지 않으며 row(108)·popover(248) 양쪽이 헛되이 값을 전달한다. CodeText(1126)의 $unread 프롭도 CSS 미사용인데 두 곳(row 150·popover 283)에서 `$unread={false}`로 전달된다. accentColor 값 자체는 IsoBadge 인라인 스타일(row 129-134)로만 소비되므로, 그룹을 접으면 대륙색 정보가 헤더 dot 하나로만 남는 현 상태에서 스트립 부재는 시각 신호 손실이기도 하다.

**권고:** 둘 중 하나로 정리: (a) V2 의도대로 `box-shadow: inset 2px 0 0 ${$accentColor}` 또는 ::before 스트립 구현, (b) $accentColor·$unread 프롭·전달부·주석 삭제. IsoBadge가 이미 대륙색을 전달하므로 (b)가 노이즈가 적다.

<details><summary>검증 노트</summary>

코드로 전량 확증. country-list.styles.ts:771에서 ListRow가 $accentColor를 선언하나 CSS 본문(774-831)의 어떤 인터폴레이션도 참조하지 않음(인터폴레이션은 $compact·$active·$historicalActive·theme뿐, 793행 box-shadow는 theme border 구분선). country-list-row.tsx:57 주석('행 좌측 strip 색 — 대륙 색 (V2). 미지정 시 transparent') 인용 정확, 스트립 미구현. 전달부는 row 108행·popover 248행 실재. CodeText(1126)의 $unread도 CSS 본문(1127-1137) 미사용이며 $unread={false} 전달은 row.tsx:150·popover.tsx:283 정확히 두 곳. 다른 계층의 방어 없음 — accentColor는 IsoBadge 인라인 스타일로만 시각화되며(발견이 이미 인지), 그룹 접힘 시 ContinentDot(country-list.tsx:463-466)만 남는다는 부가 주장도 사실. P3·S 적정.

</details>

### F46 [P3/S/CONFIRMED] 아이콘 크기 지정 방식 혼재(SVG 속성 vs CSS)와 행 우측 컨트롤 히트타깃 비대칭(18px vs 30px)

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:435` · 렌즈: design-visual

같은 chevron 계열이 country-list.tsx:434-436(그룹 caret, width/height 속성 10 하드코딩·12px 컨테이너), country-list.styles.ts:1066-1068(HasChildrenChevron, CSS 14px·30px 버튼), 필터 검색 아이콘 14px CSS(444), 클리어 12 속성(filters.tsx:129), 추가 트리거 20 속성(add-menu.tsx:62)으로 크기·지정 방식이 제각각. 행 우측에선 PinButton이 18px 버튼에 11px 별(styles:909-921, row.tsx:191)인데 바로 옆 HasChildrenChevron은 30px 버튼 — 인접 컨트롤 히트타깃이 1.7배 차이 나고 핀은 최소 터치 타깃(24px) 미달.

**권고:** 아이콘 크기는 컨테이너 CSS(`> svg { width/height }`)로 통일하고 속성 하드코딩 제거. RowRight 컨트롤은 공통 26-28px 히트박스로 맞추고 글리프만 12-14px로 차등.

<details><summary>검증 노트</summary>

전 인용 라인 실측 일치: caret SVG 속성 10 하드코딩(country-list.tsx:434-436)+12px 컨테이너(styles:724-725), HasChildrenChevron 30px 버튼(styles:1035-1036)+CSS 14px svg(1065-1068), 검색 아이콘 CSS 14px(styles:444), 클리어 속성 12(filters.tsx:129), 추가 트리거 속성 20(add-menu.tsx:62), PinButton 18px(styles:913-914)+별 11px(row.tsx:191). RowRight(gap 4px) 내 인접 컨트롤 18px vs 30px = 1.67배 정확, 핀은 padding 0·히트영역 확장 없음으로 24px 최소 타깃 미달. 다른 계층 방어 없음 — 정적 CSS 값이라 코드만으로 확증. P3·S 적정.

</details>

### F47 [P3/S/CONFIRMED] 스켈레톤이 실제 행과 다른 형태(카드형 radius 10 vs 플랫 행) — 로드 완료 시 시각 점프

`apps/web-admin/src/widgets/country/country-list/ui/country-list-skeleton.tsx:53` · 렌즈: design-visual

country-list-skeleton.tsx:48-64 SkelRow는 `border-radius: 10px + background.secondary` 카드형에 32px 아바타지만, 실제 행(country-list.styles.ts:768-793)은 배경 투명·inset 헤어라인(-1px box-shadow)의 플랫 리스트에 22/26px IsoBadge다. 그룹 헤더도 실제로는 caret+dot+타이틀+카운트인데 스켈레톤은 텍스트 블록 1개. 로딩→완료 전환 시 실루엣이 크게 바뀌어 스켈레톤의 목적(형태 예고)이 약하다. 재임·재위 카드 리디자인에서 확정한 flat-list-rows 방향과도 어긋남.

**권고:** SkelRow를 실제 행 실루엣(radius 0·투명 배경·inset 헤어라인, 26px 사각 아바타, 두 줄 텍스트 블록)에 맞추고, 그룹 헤더 스켈레톤에 caret·dot 자리 원형 2개 추가(F18의 첫 화면 형태 정합과 연계).

<details><summary>검증 노트</summary>

코드만으로 전부 확증됨. 스켈레톤(country-list-skeleton.tsx:48-64)은 SkelRow radius 10px + background.secondary 카드형·32px 아바타·gap 6px인데, 실제 행(country-list.styles.ts:768-793 ListRow)은 radius 없음·기본 배경 transparent·inset 0 -1px box-shadow 헤어라인의 플랫 리스트이고 IsoBadge는 22/26px(styles.ts:962-963)로 32px가 아님. 그룹 헤더도 실제는 ContinentCaret+LeadIcon/Dot+Title+Count 구성(country-list.tsx:430-473)인데 스켈레톤은 텍스트 블록 1개뿐. 스켈레톤은 로딩 경로에서 실제 렌더되며(country-list.tsx:397-398) 다른 계층의 방어 없음. severity P3·effort S·라인 53 모두 적정.

</details>

### F48 [P3/S/CONFIRMED] 빈 상태의 ➕ 이모지 아이콘과 bespoke 표면 — emptyCardMixin·react-icons 체계 이탈

`apps/web-admin/src/widgets/country/country-list/ui/country-list-empty.tsx:73` · 렌즈: design-visual

country-list-empty.tsx:73이 AddButton 아이콘으로 ➕ 이모지를 쓴다. 사이드바 전체가 react-icons(Fi/Fa) SVG 체계인데 이모지는 OS별 렌더가 다르고 색 제어가 불가한 유일한 이질 요소. 또 EmptyFilterState(country-list.styles.ts:1246-1266)·AddButton(1307-1346)은 rgba 하드코딩 bespoke 글래스인데, mixins.ts:114에 정확히 이 용도의 emptyCardMixin('빈 상태 카드')이 이미 정의돼 있다.

**권고:** ➕를 FiPlus로 교체하고 EmptyFilterState 표면을 emptyCardMixin(theme) 경유로 변경. AddButton도 배경/보더 rgba 하드코딩 대신 토큰·믹스인으로 정리.

<details><summary>검증 노트</summary>

전 항목 코드로 확증. (1) country-list-empty.tsx:73에 `<S.AddButtonIcon>➕</S.AddButtonIcon>` 실존 — 같은 파일조차 FiSearch(react-icons)를 쓰는데 버튼 아이콘만 이모지. 위젯 UI 6파일 전부 Fi/Fa 임포트이고 이모지 grep 결과 ➕가 유일해 '유일한 이질 요소' 주장도 사실. (2) EmptyFilterState(country-list.styles.ts:1246-1266)·AddButton(1307-1346)은 rgba(255,255,255,0.03~0.12) 하드코딩 bespoke 글래스로 인용 라인범위 정확. (3) emptyCardMixin은 mixins.ts:114에 '빈 상태 카드' 주석과 함께 실존하며 section-page-layout.tsx:339에서 실사용 중인 살아있는 규약. (4) 부모/훅 어디에도 방어 없음, AddButton 소비처는 이 파일뿐이라 권고안의 blast radius 0. 유일한 구현 참고사항: emptyCardMixin 라이트모드는 솔리드라 현행 라이트 글래스(rgba 0.6)와 미세하게 달라지나 이것이 통일의 목적. severity P3·effort S 모두 적정.

</details>

### F49 [P3/S/CONFIRMED] primary 브랜드색 rgba(99,106,242,…) 하드코딩 — activeLight·primary 토큰 미경유

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:277` · 렌즈: design-visual

country-list.styles.ts:274-284 ListCollapseButton hover 다크 분기가 `rgba(99, 106, 242, 0.2)`(배경, 277)·`rgba(99, 106, 242, 0.4)`(보더, 282)를 직접 쓴다 — 다크 primary #636af2(theme.ts:142)의 수동 알파 전개로 primary·activeLight(#1e1e3a) 토큰 우회(라이트 분기는 이미 background.secondary·activeLight 토큰 사용, 하드코딩은 다크 전용). FilterButton(578-633, rgba 588~624)·SelectOption(1466-1509, rgba 1477~1500)에도 다크 99,106,242/라이트 99,102,241 이중 전개가 반복되고, AddIconButton(374-409)의 box-shadow(393-394)도 동일. 단, 이 4블록은 전부 소비처 0인 사장 코드다: 모든 소비자가 `import * as S` 네임스페이스인데 `.ListCollapseButton`/`.FilterButton`/`.SelectOption`/`.AddIconButton` 참조가 src 전역에 전무하며, 실제 사이드바 접기 UI는 content-shell SidebarHeader(onCollapse, country-list.tsx:346)와 접힘 레일의 S.CollapsedToggleBtn(country-list.tsx:524)이다. 따라서 렌더되는 표면이 없어 "브랜드색 변경 시 표류" 임팩트는 시각적으로 성립하지 않고, 권고는 토큰 교체가 아니라 F38 데드 코드 정리에서 4블록 일괄 삭제로 정정한다(삭제 전 재활성화가 결정되는 블록이 있으면 그때 activeLight/primary 토큰으로 재작성).

**권고:** 라이브 코드(ListCollapseButton)는 hover 배경을 theme.colors.activeLight, 보더를 theme.colors.primary(필요 시 withAlpha(theme.colors.primary, 0.4))로 교체. 사장 블록은 F38의 데드 코드 정리에서 함께 삭제.

<details><summary>검증 노트</summary>

하드코딩 자체는 코드로 확증: country-list.styles.ts 277·282행(ListCollapseButton hover 다크 분기)이 rgba(99,106,242,0.2/0.4)를 직접 쓰고, theme.ts:142 다크 primary '#636af2'=rgb(99,106,242)·:61 라이트 '#6366f1'=rgb(99,102,241)·:149 activeLight '#1e1e3a'와 대조해 "수동 알파 전개로 토큰 우회" 판정도 정확. FilterButton(588~624행)·SelectOption(1477~1500행)의 이중 전개·사장 코드 판단도 맞음(소비처 0 — state-type-modal의 S.SelectOption은 country-form.styles 출처). 단 발견의 라이브/사장 구분이 틀림: ListCollapseButton도 src 전역 참조 0건인 사장 코드(모든 소비자가 import * as S 네임스페이스인데 .ListCollapseButton 사용 전무; 실제 접기 UI는 content-shell SidebarHeader의 onCollapse(country-list.tsx:346)와 S.CollapsedToggleBtn(country-list.tsx:524)). AddIconButton(393-394행)에도 동일 전개가 있고 역시 소비처 0. 결국 인용 블록 전부 렌더되지 않아 "브랜드색 변경 시 표류" 임팩트는 미성립 — 조치는 토큰 교체가 아니라 F38 데드 코드 정리에서 일괄 삭제로 정정.

</details>

## 배치 8 — UX 폴리시·발견성

### F18 [P3/S/CONFIRMED] 빠른접근(핀·최근)이 대륙 필터만 걸어도 통째로 숨고, 첫 진입(전체 접힘)엔 애초에 비어 사이드바가 헤더만 남음

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:130` · 렌즈: ux-ia

country-list.tsx:130-134 `hasFilterActive = !!query || !!continentFilter || countryTypeFilter !== 'all'` → true면 quickAccessItems가 빈 배열. 검색 중 숨김은 표준이지만 대륙 필터는 '탐색 범위 좁히기'일 뿐인데 사용자의 앵커(핀)까지 사라진다 — 핀이 그 대륙 소속이어도 마찬가지. 또 첫 진입은 핀·최근이 없고 전 그룹이 접혀 있어(sentinel 'all') 실제 첫 화면이 대륙 헤더 7줄+카운트뿐인 '내용 없는 목록'. 로딩 스켈레톤(country-list-skeleton.tsx)은 아바타 행 8개 형태라 로드 완료 순간 행들이 전부 사라지고 접힌 헤더로 바뀌는 형태 점프도 있다.

**권고:** (1) 숨김 조건에서 continentFilter 제외 — 핀 섹션은 대륙 필터와 무관하게 유지(또는 해당 대륙 핀만 필터링 유지), (2) 첫 진입 UX로 첫 대륙 그룹(유럽)만 펼친 기본값을 검토하거나 접힌 헤더에 대표 국가 미리보기('유럽 45 — 독일, 프랑스, …')로 scent 제공, (3) 스켈레톤을 실제 첫 화면 형태(헤더 위주)와 정합(F47과 연계).

<details><summary>검증 노트</summary>

세 하위 주장 모두 코드로 확증. (1) country-list.tsx:130-131의 hasFilterActive에 continentFilter가 포함되고, 133-134에서 빈 배열 반환, 220-224(groupedWithQuickAccess)에서 hasFilterActive면 핀·최근 그룹을 무조건 제외 — 핀의 대륙 소속을 보는 분기나 상위 계층 방어 없음. (2) 72-81행 localStorage 부재 시 sentinel 'all', 88행에서 모든 대륙 그룹 접힘 처리, 첫 진입엔 핀·최근 항목이 없어 226-241행의 length>0 조건으로 그룹 자체가 미생성, 기본 필터 상태(context 75-78행)에선 자동 펼침(408-411행)도 미발동 → 첫 화면이 접힌 헤더+카운트만인 것 사실. (3) country-list-skeleton.tsx:10 SKELETON_ROWS=8, 헤더1+아바타 행 8개 구조로 인용 정확 — 첫 진입 로드 완료 시 행 전부 소실→접힌 헤더로 전환되는 형태 불일치 성립. 유일한 미세 부정확은 '대륙 헤더 7줄'이 데이터 의존 근사치라는 점뿐이며 본질 무관. 필터 시 숨김이 주석상 의도된 설계인 점도 발견이 이미 인지('검색 중 숨김은 표준이지만')하고 대륙 필터 케이스만 비판하므로 P3(UX 폴리시)·effort S·line 130 모두 적정.

</details>

### F19 [P3/S/CONFIRMED] 빈 상태 CTA가 '과거' 필터에서도 현대 국가 폼을 열고 안내 카피도 실제 동작과 모순

`apps/web-admin/src/widgets/country/country-list/ui/country-list-empty.tsx:71` · 렌즈: ux-ia, architecture

CountryListEmpty는 onAdd(현대 국가 폼)만 받고(country-list-empty.tsx:71-75) countryTypeFilter==='historical' 빈 상태에서도 버튼('새 국가 등록' 라벨 고정)이 현대 국가 등록 모달을 연다. CountryList 배선(country-list.tsx:400-405)도 onAdd만 넘기고 onAddHistorical을 전달하지 않아 컴포넌트 차원에서 고칠 수단이 없다. 카피(54-60) "과거(역사적) 국가를 등록한 뒤, 현대 국가 편집에서 '연결할 현대 국가'로 지정하면 여기에 표시됩니다"는 거짓 — 실제 '과거' 필터 목록은 연결 여부와 무관하게 historicalUnified 전체를 보여주고(country-list-state.context.tsx:131-134) 미연결은 오히려 '연결 안 됨' 배지로 나온다.

**권고:** onAddHistorical prop을 추가해 historical 분기에서 '과거 국가 등록' CTA·핸들러로 분기하고 country-list.tsx 배선도 갱신. 카피는 실제 동작에 맞게 수정('아직 등록된 과거 국가가 없어요. 첫 역사 국가를 등록해보세요' + 연결은 부가 안내).

<details><summary>검증 노트</summary>

인용 전부 실코드와 일치. (1) country-list-empty.tsx:12-17 props는 onAdd 하나뿐, 71-75 CTA는 필터 분기 없이 고정 라벨 "새 국가 등록"으로 onAdd 호출 — country-detail-shell.tsx:194에서 onAdd=countryForm.openCreate(현대 국가 폼)로 확인. (2) 방어 계층 없음: country-list.tsx:400-405는 onAdd만 전달하며, 정작 CountryList는 onAddHistorical prop(34,49)과 handleAddHistorical(293)을 이미 보유하고 상단 CountryListAddMenu(342)에는 배선함 — 셸도 historicalForm.openCreate(195)를 내려주고 있어 수정이 prop 1개 추가로 끝남(effort S 적정). (3) 카피 모순도 사실: country-list-state.context.tsx:131-134는 historical 필터 시 historicalUnified 전체(87-100, apiHistoricalCountries 합집합)를 브리지 여부 무관 반환하고, 미연결 항목은 country-list-row.tsx:97·172에서 "연결 안 됨" 배지로 표시 — "연결하면 여기에 표시됩니다"는 거짓이며 연결이 필요한 지면은 현대 행 chevron 트리(context 106 주석 명시)임. 재현 성립: 역사국가 0건 + '과거' 필터 → filtered.length===0(country-list.tsx:399) → 빈 상태 CTA가 현대 국가 폼을 엶. severity P3(헤더 추가 메뉴에 역사 국가 등록 우회로 존재)·line 71·effort S 모두 적정, 정정 사항 없음.

</details>

### F20 [P3/S/CONFIRMED] 미연결 역사국가 배지가 '과거' 필터 진입 후에만 보임 — 저작 유도 신호의 발견성이 한 겹 늦음

`apps/web-admin/src/widgets/country/country-list/ui/country-list-filters.tsx:108` · 렌즈: ux-ia

'연결 안 됨' 행 배지는 country.type==='historical' 행에서만 렌더되고(country-list-row.tsx:96-97,170-174) 요약 힌트도 `countryTypeFilter === 'historical'`일 때만 노출(country-list-filters.tsx:108-109 showUnlinkedHint). 기본('전체') 상태의 유도 배지는 '과거 국가 193개 보기'로 개수만 알려줄 뿐 미연결 존재는 숨긴다. 미연결 국가는 현대 행 chevron 트리에 아예 안 나타나므로(F37 주석, country-list-state.context.tsx:103-107) 저작자가 문제를 인지하려면 우연히 '과거' 필터에 들어가야 한다 — 배지의 목적(저작 유도)과 노출 시점이 어긋난다.

**권고:** 미연결이 1개 이상이면 '전체' 필터에서도 DiscoveryRow에 '연결 안 됨 N' 배지를 함께 노출하고, 클릭 시 '과거' 필터+미연결 우선 정렬(또는 미연결만 보기)로 진입. showUnlinkedHint 조건에서 countryTypeFilter 제약만 풀면 되는 소규모 변경.

<details><summary>검증 노트</summary>

인용 전부 실코드와 일치: 행 배지는 historical 행 전용(country-list-row.tsx:96-97, 170-174)이고 '전체'/'현대' 모드에선 filtered가 modern만 반환해(country-list-state.context.tsx:137-139) 역사 행 자체가 렌더되지 않으며, showUnlinkedHint는 countryTypeFilter==='historical' 게이트(country-list-filters.tsx:108-109)가 사실. grep으로 unlinkedHistoricalIds 소비 지면이 이 두 곳뿐임을 확인 — 헤더·빈상태 등 다른 계층의 방어 없음. '전체' 모드 DiscoveryRow는 "과거 국가 N개 보기"(190행) 개수만 노출해 미연결 존재를 숨긴다는 주장도 정확. 미연결 국가가 chevron 트리에 못 뜨는 것은 unlinked 정의(어느 현대 국가의 historicalCountries에도 없음, context.tsx:108-122)상 구조적 필연. 유일한 반례 경로는 '전체' 모드 검색 합류(context.tsx:150-156)로 미연결 행이 배지와 함께 뜰 수 있으나, 존재를 모르는 국가명을 검색해야 하므로 발견성 논지를 반박하지 못함. severity P3·라인 108 적정, 권고(게이트 완화+클릭 진입)도 소규모 변경으로 실행 가능(단 UnlinkedHint는 현재 span이라 클릭化에 버튼 전환 필요).

</details>

### F21 [P3/S/CONFIRMED] 기본 정렬 '면적순'이 무언인데 정렬 셀렉트만 활성 표시($active) 부재 — 현재 정렬 상태가 UI에 안 드러남

`apps/web-admin/src/widgets/country/country-list/ui/country-list-filters.tsx:165` · 렌즈: ux-ia

기본값은 country-list-state.context.tsx:79 `useState<SortBy>('area')` — 이름순이 아닌 면적순이 무언 기본. 유형·대륙 셀렉트는 $active로 activeLight 배경을 받지만(country-list-filters.tsx:143,154) 정렬 셀렉트(165-173)는 $active 자체를 전달하지 않아 어떤 값이든 '기본 상태'로 보인다. 스타일 정의부 border는 `$active ? 'transparent' : 'transparent'`(country-list.styles.ts:547-549) 죽은 삼항 — 색·배경(553-556)은 $active에 반응하므로 border만 활성 표시 의도 미완의 흔적. 첫 방문자가 대륙 그룹을 펼치면 각 그룹 내부가 면적 내림차순(예: 아메리카 그룹은 캐나다→미국→브라질 순)인데 그 이유를 알 방법이 폭 100px(max-width, styles:566) 셀렉트의 '면적순' 텍스트뿐이고, 정렬은 일반 useState라 세션 간 persist도 없어 매 진입 리셋된다.

**권고:** 정렬 셀렉트에 `$active={sortBy !== 'name'}`(또는 명시 기본값 대비 비기본 시 활성)를 전달해 비기본 정렬을 시각화하고 죽은 border 삼항을 실제 활성 보더로 수정. 기본값을 이름순으로 바꾸거나 유지 시 '면적순(기본)' 라벨로 의도를 드러낸다. 정렬값 localStorage persist 검토(F58과 연계).

<details><summary>검증 노트</summary>

모든 코드 인용이 실제와 일치: (1) country-list-state.context.tsx:79 `useState<SortBy>('area')` — 면적순 무언 기본이며 일반 useState라 persist 없어 매 진입 리셋 사실. (2) country-list-filters.tsx:143·154에서 유형·대륙 셀렉트는 $active를 전달하지만 정렬 셀렉트(165-173)는 $active 자체가 없어, country-list.styles.ts:555-556의 activeLight 배경/active 색 활성 표시를 영원히 받지 못함. (3) styles.ts:547-549의 `$active ? 'transparent' : 'transparent'` 죽은 삼항 인용 그대로 존재 — border 활성 표시 의도 미완 흔적이라는 해석도 타당(색·배경은 $active에 반응하나 border만 죽음). (4) max-width:100px(styles:566)도 사실. 부모/공용 계층에 정렬 상태를 별도 시각화·영속하는 방어 코드 없음. 단 하나의 사실 오류: 재현 예시 '러시아·캐나다·미국·중국 순' 연속 나열은 country-list.tsx:160-199의 대륙별 그룹핑 때문에 실제로는 서로 다른 그룹에 흩어져 연속으로 보이지 않음(그룹 내부만 면적 내림차순) — 핵심 주장은 유효하나 예시만 느슨. P3·effort S 적정.

</details>

### F22 [P3/S/CONFIRMED] 접힘 rail 어포던스 부족 — 28px 버튼 하나만 클릭 가능, rail 본체는 죽은 영역·컨텍스트 신호 전무

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:522` · 렌즈: ux-ia

접힘 시 CollapsedRail(country-list.tsx:522-536)은 상단 펼치기 버튼(28×28, country-list.styles.ts:1003-1004)과 opacity 0.5 장식용 지도 아이콘(aria-hidden, styles:1026)뿐이다. rail은 height:100%(styles:996)로 세로 전체를 차지하지만 본체 클릭·더블클릭으로 펼치는 수단이 없고(styled.div, onClick 없음) 현재 선택 국가·핀 개수 같은 신호도 전무하다. 접힘 상태는 localStorage('country-list-collapsed', use-list-collapsed.hook.ts)로 영속되어 재진입 시에도 48px rail(content-shell.styles.ts:23)만 남으며, 유일한 타깃이 상단 구석 28px chevron이라 Fitts 비용이 크다. 시각적 라벨은 없다(aria-label="국가 목록 (접힘)"은 있어 스크린리더는 식별 가능 — 문제는 시각 어포던스). 참고로 styles:229에 가장자리 floating 펼침 버튼(ListCollapseButton)이 정의돼 있으나 어디서도 렌더되지 않는 dead code로, 개선 시 재활용 후보.

**권고:** rail 전체를 클릭 타깃으로(onClick=onToggleCollapse, cursor:pointer, hover 배경) 만들고 세로 쓰기 라벨('국가 목록')을 추가. 여유가 되면 핀 국가 상위 3~5개 IsoBadge를 세로 노출해 접힌 상태에서도 원클릭 전환 제공(macOS 사이드바 축소 패턴).

<details><summary>검증 노트</summary>

코드로 전부 확증. country-list.tsx:522-536의 CollapsedRail은 styled.div(onClick 없음)로 CollapsedToggleBtn(28×28, styles:1003-1004)과 aria-hidden CollapsedHint(opacity 0.5, styles:1026)만 렌더하며 rail 본체는 height:100%(styles:996)임에도 클릭 수단이 없다. 부모 계층 방어도 없음: ContentShell은 left 슬롯을 48px 그리드 컬럼(content-shell.styles.ts:23)에 그대로 렌더할 뿐 자체 펼치기 어포던스가 없고, use-list-collapsed 훅에 키보드 바인딩 없음, 커맨드 팔레트에도 사이드바 토글 액션 없음. styles:229의 ListCollapseButton(가장자리 floating 펼침 버튼)은 정의만 있고 어디서도 렌더되지 않는 dead code. 접힘 상태는 localStorage('country-list-collapsed')로 영속되므로 재현 시나리오 성립. 선택 국가·핀 신호 전무도 사실. severity P3·effort S·line 522 모두 적정.

</details>

### F62 [P3/S/CONFIRMED] '/' 검색 포커스 단축키 부재 — 사건 카탈로그에는 있는 진입 가속 패턴

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:268` · 렌즈: parity

사건 카탈로그는 편집 요소 밖에서 '/'를 누르면 검색창 포커스(use-catalog-keyboard.ts:51)하고 입력창 우측에 kbd 힌트('/')까지 노출한다(catalog-toolbar.tsx:155-158). 국가 사이드바는 검색창→↓로 목록 진입(use-list-keyboard-nav.ts:97-105)은 있지만 반대 방향(어디서든 검색창으로)이 없어, 목록 중심 페이지인데도 검색 시작에 마우스가 필요하다.

**권고:** 국가 셸(country-detail-shell 또는 CountryList)에 편집 요소 가드를 포함한 '/' keydown 리스너를 추가해 검색 인풋 포커스. SearchInput에 kbd 힌트 노출. use-catalog-keyboard.ts:44-52의 inEditable 가드 로직 재사용.

<details><summary>검증 노트</summary>

모든 인용이 실제 코드와 일치. (1) 사건 카탈로그의 '/' 검색 포커스는 use-catalog-keyboard.ts:51-53에 inEditable 가드와 함께 실존하고, kbd 힌트도 catalog-toolbar.tsx:155-158에 정확히 존재. (2) 국가 사이드바는 use-list-keyboard-nav.ts:97-105의 handleSearchKeyDown이 ArrowDown(검색창→목록 진입)만 처리하고 역방향('/'→검색창)은 없음. (3) 타 계층 방어 부재 확인: `key === '/'` 전역 grep 결과 country 위젯·country-detail-shell(pages/country/, 키보드 리스너 0건)·filters(onSearchKeyDown만) 어디에도 없고, 전역 command palette는 Cmd/Ctrl+K 전용(use-command-palette-shortcut.ts:12)이라 사이드바 검색 포커스를 대체하지 않음. 재현은 코드 구조상 자명(편집 요소 밖 '/' 입력 시 아무 핸들러도 없음). line 268은 useListKeyboardNav 배선 지점으로 대표 라인 적절, P3/S 타당. 미세 지적: recommendation의 "use-catalog-keyboard.ts:44-52 가드 재사용"에서 isInEditableElement 헬퍼는 실제 16-23행(모듈 스코프)에 정의되어 있음(사용부는 47·51행) — detail의 사실오류는 아님.

</details>

## 배치 9 — 상태 영속·계정 스코프

### F8 [P2/M/CONFIRMED] 핀·최근·그룹접힘 localStorage 영속 상태가 계정 미스코프 — 계정 전환 시 이전 사용자의 핀/방문기록 노출·잔존 (앱 전반 규약 부재)

`apps/web-admin/src/widgets/country/country-list/model/pinned-countries.store.ts:24` · 렌즈: ux-ia, correctness, architecture, state-persistence, parity

pinned-countries.store.ts:24-27(persist name 'pinned-countries')·command-palette recent-countries.store.ts:28-33('recent-countries')·country-list.tsx:76,110('country-list-collapsed-groups')·use-list-collapsed.hook.ts:9('country-list-collapsed') 전부 계정 식별자 없는 전역 키다. entities/session/session.store.ts:60의 reset은 토큰·username만 비우고 이들 키를 정리하지 않아, 같은 브라우저에서 다른 계정으로 로그인하면 이전 계정의 핀·최근 방문 국가(=활동 흔적)가 사이드바 '고정'·'최근' 섹션(country-list.tsx:124-157)과 ⌘K 팔레트에 그대로 노출·수정된다. 자매인 사건 카탈로그도 'papyrus_event_bookmarks'(use-bookmarks.hook.ts:6)·'papyrus_recent_events'(use-recent-events.hook.ts:6)로 동일 미스코프 — 앱 전반 규약 부재. 과거 리뷰(person draft PII)에서 동일 계열이 P2로 확정된 선례. 접힘 상태 키는 취향 수준이라 민감도 낮음.

**권고:** shared에 계정 스코프 키 헬퍼(accountScopedKey(base) → `${base}:${accountId}`)를 두고 두 스토어의 persist name(또는 커스텀 storage 래퍼)에 적용 — zustand는 로그인 후 `persist.setOptions({name}) + rehydrate()` 패턴 가능. 최소한 로그아웃/계정 전환 시 `persist.clearStorage()`·recent clear·collapsed removeItem을 세션 reset 경로에 일괄 호출(S). 기존 키는 1회 마이그레이션으로 승계하고, 같은 헬퍼를 사건 북마크/최근에도 확산해 규약 통일.

<details><summary>검증 노트</summary>

인용 6개 파일·라인 전부 실측 일치: 'pinned-countries'(pinned-countries.store.ts:24-27)·'recent-countries'(recent-countries.store.ts:28-33)·'country-list-collapsed-groups'(country-list.tsx:76/110-111)·'country-list-collapsed'(use-list-collapsed.hook.ts:9)·'papyrus_event_bookmarks'(use-bookmarks.hook.ts:6)·'papyrus_recent_events'(use-recent-events.hook.ts:6) 모두 계정 식별자 없는 전역 localStorage 키. 타 계층 방어 부재도 확인: session.store.ts:60 reset은 token·username만 null 처리하고 hybridStorage.removeItem은 'session-storage' 자기 키만 지우며, 로그아웃 핸들러(widgets/header/user-menu.ui.tsx:100-105)는 reset()+navigate만 수행 — 코드베이스 전체에 localStorage.clear/persist.clearStorage 호출 0건, accountScopedKey 류 헬퍼 0건("규약 부재" 사실). 노출 지면 실재: 사이드바 빠른접근(country-list.tsx:124-157 pinnedIds/recentIds→quickAccessItems)과 ⌘K 팔레트(command-palette.tsx:67·97·160, 쿼리 공백 시 recentIds 렌더). 전역 키+미정리+렌더 배선이 코드만으로 확증되어 계정 전환 시 이전 계정 핀·최근 노출 시나리오가 무조건 성립. P2는 과거 person draft PII 미스코프 P2 선례와 정합, effort M 타당 — 정정 없음.

</details>

### F24 [P3/M/CONFIRMED] 'all' sentinel materialize가 토글 시점 대륙 스냅샷에 고정 — 대륙 로드 전 토글 시 전 대륙 영구 펼침, 이후 추가 대륙은 기본과 반대로 펼침 등장

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:97` · 렌즈: correctness, state-persistence

toggleGroup(country-list.tsx:93-121)은 'all'을 `continents.map((c) => c.id)`+'__unknown__'+'__historical__'의 collapsed Set으로 materialize해 즉시 localStorage 'country-list-collapsed-groups'에 저장한다(109-116). (a) continents 쿼리가 국가보다 늦은 창(대륙 로딩이 isLoading 게이트 미포함이라 목록·핀 그룹은 이미 렌더)에서 '고정'/'최근' 헤더를 토글하면 continents=[] 스냅샷으로 materialize → 모든 실제 대륙이 '펼침'으로 영구 고착(콜드 로드+느린 네트워크/대륙 API 오류에서 재현). (b) 저장 이후 새로 등록된 대륙 id는 Set에 없어 기본 펼침 등장 — 첫 방문 기본값(전체 접힘)과 정반대 semantics. 저장 포맷이 collapsed 나열이라 '미지의 id=접힘' 의도를 표현할 수 없는 구조적 문제.

**권고:** 저장 semantics 반전: collapsed Set 대신 expanded Set(펼친 그룹 나열)을 저장하고 '목록에 없는 id=접힘'을 기본으로 — sentinel·materialize가 불필요해지고 신규 대륙도 자동 접힘. 기존 키는 버전드 키('country-list-expanded-groups')로 교체해 충돌 회피, __pinned__/__recent__만 기본 펼침 예외. 단기로는 continents.length===0이면 materialize·localStorage 기록을 보류하고 토글만 오버레이 처리.

<details><summary>검증 노트</summary>

코드만으로 전 항목 확증. (1) country-list.tsx:93-121에서 'all' sentinel을 continents.map((c)=>c.id)+__unknown__+__historical__로 materialize하고 즉시 localStorage 'country-list-collapsed-groups'에 저장(109-116) — 인용 정확. (2) 타이밍 창 실재: use-content-core-data.hook.ts:46이 useContinents()에서 data만 구조분해(isLoading 미사용)하고 115행 isLoading은 countries||historical만 합성 → 국가 로드 후 continents=[]인 창에서 목록 렌더(country-list.tsx:397 게이트 통과). 이 창에서 __pinned__/__recent__(zustand persist, collapsed 키와 독립 — 그룹 토글 이력 없이 핀 보유 가능)·__unknown__ 헤더가 토글 가능하고, prev==='all'에서 토글 시 빈 continents 스냅샷으로 materialize·영속 → 실제 대륙 id 전부 누락된 Set이 저장돼 대륙 로드 후 전부 펼침. grep 결과 해당 키는 이 파일에서만 읽고 써 재조정(reconcile) 계층 없음. 대륙 API 오류 시 창이 무기한이라 재현 견고. (3) isGroupCollapsedById(89행)가 collapsedGroups.has(id)라 저장 이후 신규 대륙 id는 기본 펼침 — 첫 방문 'all'(전체 접힘) 기본과 정반대이며, collapsed 나열 포맷은 '미지 id=접힘'을 구조적으로 표현 불가. 사소한 뉘앙스: continents=[] 창에서는 실제 대륙 헤더 자체가 렌더되지 않아(groupedByContinent가 orderedContinents 기준으로만 그룹 방출, 194-198행) 트리거는 고정/최근/미분류 헤더 경유로만 성립하는데, 발견의 재현 시나리오('고정'/'최근' 토글)가 정확히 이를 기술. severity P3(데이터 손실 없는 영속 상태 오염)·effort M(semantics 반전+버전드 키) 모두 적정.

</details>

### F58 [P3/M/CONFIRMED] 검색·필터·정렬 상태 URL 미반영 — 새로고침·영역 이탈 시 소실, detailTab·사건(use-catalog-url-sync)·인물(url-sync) 규약과 비대칭

`apps/web-admin/src/widgets/country/country-list/country-list-state.context.tsx:75` · 렌즈: state-persistence, parity

query/continentFilter/countryTypeFilter/sortBy는 country-list-state.context.tsx:75-79의 순수 useState. layout route(country.route.tsx:91-95) 덕에 /country 하위 전환은 생존하지만 (a) 새로고침, (b) /persons-timeline 등 다른 영역 이탈 후 복귀 시 전부 초기화된다('과거' 필터로 작업하다 잠깐 다녀오면 전체 목록으로 리셋). 필터된 목록의 URL 공유도 불가. 같은 페이지의 다른 상태는 이미 URL이 정본 — detailTab은 경로 세그먼트(use-content-location.hook.ts:73-94, 주석 'URL이 진실의 원천. state 중복 금지'), 사건 상세 국가 퀵뷰는 ?country= sync. 자매 규약도 확립돼 있다: 사건 카탈로그는 q·cat·country·century·bookmarks를 URLSearchParams 양방향 동기화(use-catalog-url-sync.ts:102-115), 인물 대시보드도 view·q·era·region 전 필터 URL 유지(persons-timeline.page.tsx:8-11, url-sync.ts). 부수: sortBy 기본값('area')은 세션 간 미유지인데 그룹 접힘은 localStorage 유지 — 영속 정책도 제각각.

**권고:** use-catalog-url-sync 패턴대로 ?q=&type=&continent=&sort= 4개 파라미터를 Provider에서 useSearchParams와 양방향 동기화(입력 debounce+replace 네비게이션으로 히스토리 오염 방지, 기본값은 param 생략, 자기 쓰기 에코 가드 포함). URL 오염이 부담이면 차선으로 sortBy·countryTypeFilter만 계정 스코프 localStorage 유지, query는 휘발 유지.

<details><summary>검증 노트</summary>

country-list-state.context.tsx:75-79에서 query/continentFilter/countryTypeFilter/sortBy('area' 기본)가 순수 useState임을 확인했고, widget 전체 grep에서 useSearchParams·URL 동기화·필터 영속 코드가 전무함(localStorage는 그룹 접힘 'country-list-collapsed-groups'와 핀 store뿐). Provider는 content-shell.tsx:96에서 마운트되며 country-detail-shell(country.route.tsx:91-95 layout route)이 렌더하므로 /country 하위 전환은 생존하지만, /persons-timeline 등 다른 라우트로 이탈하면 라우트 트리 교체로 Provider가 언마운트되어 복귀 시 전부 초기화 — 재현 시나리오 (a)(b) 모두 성립. 비대칭 근거도 전부 실재: use-content-location.hook.ts:6 'URL이 진실의 원천(source of truth). state 중복 금지' 주석과 DETAIL_TAB_PATTERNS(~71-94) 경로 세그먼트 매칭, use-catalog-url-sync.ts 102-125의 q·cat·country·century·bookmarks(+event·continent) 양방향 동기화(lastSelfWriteRef 에코 가드 포함), persons-timeline.page.tsx:8-11 헤더의 view·q·era·region URL 동기화 명시와 url-sync.ts 실구현. 부수 주장(sortBy 휘발 vs 그룹 접힘 localStorage 유지의 영속 정책 불일치)도 사실. 유일한 미세 오차는 인용 주석의 실제 위치가 파일 헤더(6행)라는 점뿐으로 정정 불요 수준. severity P3(일관성/UX 개선, 버그 아님)·effort M(양방향 동기화+debounce+에코 가드) 적정.

</details>

### F60 [P3/S/CONFIRMED] zustand persist 탭 간 미동기 — 다른 탭의 핀 토글이 last-write-wins 전체 덮어쓰기로 소실, pinned 스토어 migrate 부재

`apps/web-admin/src/widgets/country/country-list/model/pinned-countries.store.ts:24` · 렌즈: state-persistence

pinned-countries.store.ts:11-29와 recent-countries.store.ts:14-35 모두 storage 이벤트 구독이 없어 탭 A에서 핀을 고정해도 탭 B에 반영되지 않고, 이후 탭 B에서 아무 핀이나 토글하면 탭 B의 stale in-memory 배열 전체가 직렬화되어 탭 A의 변경이 통째로 유실된다(toggle이 배열 전체를 다시 쓰는 구조라 병합 여지 없음). 관리자 앱 특성상 다중 탭이 흔해 실제 발생 가능한 조용한 데이터 소실. 부수: pinned 스토어는 version: 1만 있고 migrate가 없어(recent-countries.store.ts:32에는 있음) 향후 버전 bump 시 zustand가 기존 핀을 경고와 함께 전부 폐기한다 — 현재 version:1은 생성 커밋부터 존재해(git log 확인) 당장의 손실은 없으나 두 스토어의 방어 수준이 비대칭.

**권고:** 공용 유틸로 `window.addEventListener('storage', (event) => { if (event.key === STORE_KEY) store.persist.rehydrate() })`를 두 스토어에 등록해 타 탭 변경을 재수화(zustand persist 공식 API). pinned 스토어에도 recent과 동일한 migrate 폴백을 추가해 버전 bump 시 무음 폐기 방지.

<details><summary>검증 노트</summary>

모든 인용이 코드와 일치. (1) pinned-countries.store.ts:11-29·recent-countries.store.ts:14-35 어느 쪽에도 storage 이벤트 구독이 없고, apps/web-admin/src 전체 grep에서 addEventListener('storage')·persist.rehydrate 호출이 0건 — 다른 계층의 방어 부재 확인. (2) toggle(15-21행)이 pinnedIds 배열 전체를 set으로 다시 쓰고 zustand persist는 매 set마다 전체 상태를 직렬화하므로, 탭 B의 stale in-memory 배열이 탭 A의 변경을 통째로 덮어쓰는 last-write-wins 시나리오는 zustand persist의 문서화된 결정적 동작(크로스탭 동기화 미내장)으로 코드만으로 성립. (3) migrate 비대칭 사실: pinned는 version:1만(24-27행), recent는 32행에 migrate 폴백 존재. (4) git show 0dc658a8d(파일 생성 커밋)로 version:1이 최초부터 존재했음을 확인 — "당장의 손실 없음" 부기도 정확. 핀/최근은 편의 기능이고 다중 탭 시나리오 한정 조용한 소실이므로 severity P3·effort S 적정, 권고안(storage 이벤트→persist.rehydrate 재수화 + migrate 추가)도 zustand 공식 API로 실행 가능.

</details>

### F67 [P3/M/CONFIRMED] 그룹 접힘 상태 영속화 2벌 — 국가(Set+'all' sentinel)와 인물 필터(Record+기본값 병합)가 같은 문제를 다른 코드로

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:72` · 렌즈: parity

국가 사이드바는 'country-list-collapsed-groups' 키에 Set을 JSON 배열로 저장하고 첫 진입은 'all' sentinel로 전체 접힘 처리(단 __pinned__/__recent__ 그룹은 'all'이어도 펼침 유지, country-list.tsx:84-87)하며 toggle 시 continents+특수그룹으로 materialize하는 약 50줄 로직을 컴포넌트 인라인으로 갖는다(country-list.tsx:72-121). 인물 필터 패널은 'person-filter-collapsed-groups' 키에 Record<GroupId,boolean>을 저장하고 DEFAULT_COLLAPSED와 병합하는 파일 로컬 useCollapsedGroups 훅을 갖는다(person-filter-panel.tsx:18-53). 직렬화 포맷(배열 vs Record)·기본값 정책('all' sentinel vs DEFAULT_COLLAPSED 병합)·훅화 여부(인라인 vs 로컬 훅)가 전부 달라, 아코디언 사이드바가 늘 때마다 세 번째 변형이 나올 구조. 참고로 content-shell/model에는 이미 패널 단위 boolean 접기 공용 훅 useListCollapsed(use-list-collapsed.hook.ts)가 storageKey 옵션 패턴으로 존재하므로, 그룹 단위 useCollapsedGroups 공용 훅을 같은 위치·같은 패턴으로 두는 것이 기존 컨벤션과 부합한다.

**권고:** content-shell/model에 `useCollapsedGroups(storageKey, { defaultCollapsed: 'all' | Set | Record })` 공용 훅을 만들어 두 소비자를 이관. 국가의 'all' sentinel(데이터 로드 전 깜빡임 방지)은 옵션으로 흡수(F24의 expanded Set 반전 semantics를 공용 훅에 반영).

<details><summary>검증 노트</summary>

두 구현 모두 코드로 확증. country-list.tsx:72-121은 'country-list-collapsed-groups' 키에 Set→JSON 배열 직렬화 + 'all' sentinel + toggle 시 materialize를 컴포넌트 인라인으로 보유(76-80, 97-116행). person-filter-panel.tsx:18-53은 'person-filter-collapsed-groups' 키에 Record<GroupId,boolean> + DEFAULT_COLLAPSED 병합의 파일 로컬 useCollapsedGroups 훅. grep 결과 이 2벌이 전부이며 공용 추상화 부재. 참고로 content-shell/model에 이미 useListCollapsed(패널 단위 boolean 접기, storageKey 옵션) 훅이 있어 그룹 단위는 커버하지 않지만 권고안의 배치 위치(content-shell/model 공용 훅)가 기존 컨벤션과 정확히 부합함을 확인. 사소한 사실오류 2건 정정: 인라인 로직은 74줄이 아니라 약 50줄(72-121행)이고, 'all' sentinel은 __pinned__/__recent__를 제외한 그룹만 접음(84-87행).

</details>

## 배치 10 — 아키텍처·중복 정리 (장기)

### F9 [P3/M/CONFIRMED] 범용 ContentShell이 CountryListStateProvider를 하드 내장 — 국가 무관 페이지에서도 국가 3종 fetch·파생계산, 셸과 프로바이더의 데이터 훅 이중 구독

`apps/web-admin/src/widgets/content-shell/ui/content-shell.tsx:96` · 렌즈: architecture, parity

content-shell.tsx:20이 country-list의 context를 수평 import하고 96행에서 fullScreen 여부와 무관하게 항상 Provider로 감싼다. Provider는 useContentCoreData를 직접 호출(country-list-state.context.tsx:66)해 useCountries+useHistoricalCountries+useContinents를 무조건 fetch(3훅 모두 enabled 게이트 없음 확인)하고, historicalUnified·filtered·unlinkedHistoricalIds 파생계산(context 87-178)까지 국가 무관 페이지에서도 수행한다(useCountryListState 소비자는 country 위젯 3곳뿐 — grep 확인). 페이지별 실제 낭비: timeline-view.page.tsx:72(fullScreen, 좌측 슬롯 없음, ethnicity 위젯 국가훅 0건)에서는 3종 fetch 전부 순수 낭비. persons-timeline.page.tsx:126(좌측은 LeftFilterSlot 인물 필터)에서는 countries가 url-sync.ts:79의 동일 features 훅과 dedup되어 순수 낭비는 아니나, url-sync.ts:80이 entities 레이어 useHistoricalCountries(쿼리키 ['historical-countries'] vs features ['historical-countries','list'])를 쓰므로 Provider의 features 레이어 fetch가 같은 엔드포인트의 중복 네트워크 호출로 추가되고 continents는 순수 Provider 유발 — country-api-dual-layer 문제의 재판이자 악화. 동시에 country-detail-shell.tsx:77-83이 useContentCoreData()를 별도로 또 호출해 훅 인스턴스가 2개 — react-query가 네트워크는 dedup하지만 변환·unified·countriesById useMemo 체인(use-content-core-data.hook.ts:48-106)은 인스턴스별 중복 실행(~190+193건 × 2, 193건은 context.tsx:85 주석 실측치).

**권고:** CountryListStateProvider를 ContentShell에서 분리해 국가 라우트(country-detail-shell)에서만 마운트하거나, ContentShell에 provider 슬롯/opt-in prop을 둔다. country-detail-shell은 context 값(countriesById 포함 확장)을 소비해 useContentCoreData 직접 호출을 제거 — 데이터 훅 인스턴스를 1개로 수렴. 국가 데이터가 필요한 타 페이지는 useContentCoreData만 개별 호출.

<details><summary>검증 노트</summary>

인용 전부 실코드로 확증: content-shell.tsx:20 수평 import·96행 fullScreen 무관 무조건 Provider 래핑, context.tsx:66 useContentCoreData 직접 호출·87-178 파생계산, 3개 fetch 훅(use-countries 59-66·use-historical-countries 78-84·use-continents 55-61) 모두 enabled 게이트 없음, country-detail-shell.tsx:77-83 별도 호출로 훅 인스턴스 2개·use-content-core-data 48-106 useMemo 체인 인스턴스별 중복 실행, useCountryListState 소비자는 widgets/country 3위젯뿐(grep 재확인), persons-timeline:126·timeline-view:72 라인 정확. 방어층 없음(staleTime 5분은 콜드캐시 첫 방문을 못 막음). 단 detail에 사실오류 2건: (1) persons-timeline은 좌측 슬롯을 마운트함(LeftFilterSlot 인물 필터) — '좌측 슬롯 미마운트'는 timeline-view(fullScreen)만 해당. (2) persons-timeline의 countries fetch는 url-sync.ts:79가 같은 features 레이어 useCountries를 써서 dedup되므로 순수 낭비 아님 — 대신 url-sync.ts:80이 entities 레이어 useHistoricalCountries(다른 쿼리키)라 Provider가 같은 엔드포인트 중복 네트워크 호출을 추가(continents는 순수 낭비). severity는 버그/UX결함이 아닌 아키텍처·효율 개선(셸 doc 주석이 의도된 설계임을 보여줌)이므로 기준상 P2→P3 정정.

</details>

### F50 [P3/L/CONFIRMED] widgets 간 수평·역방향 결합 — content-shell ↔ country-list 상호 import(패키지 순환), country-list → command-palette, 3개 위젯이 내부 파일 직접 참조

`apps/web-admin/src/widgets/content-shell/ui/content-shell.tsx:20` · 렌즈: architecture

두 가지 정정: (1) country-detail-shell.tsx:27은 pages/country/ 소속 페이지라 page→widget 하향 import로 FSD상 정당하며 수평 결합 사례가 아님(import 존재 자체는 사실). (2) 내부 파일 직접 참조 3곳 중 country-mobile-ui(4·7행)와 historical-country-detail.widget(18-20행)은 country-list와 같은 widgets/country 그룹 내 형제 하위위젯이라 그룹 간 수평 결합보다는 한 단계 낮은 강도 — 진짜 그룹 간 수평 결합은 person-politics-section.tsx:47이며, 발견에 미기재된 person-infographic/ui/infographic-content.tsx:17(country-list/ui/person-register-view-modal)도 동일 계열로 추가됨. 핵심 주장인 content-shell ↔ country-list 패키지(슬라이스) 수준 순환은 정확: content-shell.tsx:20 ↔ country-list.tsx:8(배럴)·country-list-state.context.tsx:17(model 딥임포트). 파일 수준 런타임 순환은 없으나, context가 배럴이 아닌 model 파일을 딥임포트해야만 파일 순환을 피할 수 있는 구조라는 점이 순환 실재의 방증.

**권고:** 방향 정리: (1) useContentCoreData·recent/pinned store를 entities/country(또는 shared) 레이어로 강등해 양쪽 위젯이 아래를 보게 한다. (2) SidebarHeader처럼 재사용되는 프레젠테이션 조각은 shared/ui로 이동. (3) country-list.styles 중 타 위젯이 쓰는 행/필터 스타일은 공용 모듈로 추출해 네임스페이스 spread 참조를 끊는다.

<details><summary>검증 노트</summary>

인용된 import 전부 실파일에서 확인됨. content-shell.tsx:20이 country-list의 CountryListStateProvider를, 역으로 country-list.tsx:8이 '@/widgets/content-shell' 배럴(SidebarHeader)을, country-list-state.context.tsx:17이 content-shell/model/use-content-core-data.hook 내부 파일을 딥임포트 — 슬라이스 수준 양방향 순환 성립(파일 수준 런타임 순환은 아니며, context가 배럴 대신 model 파일을 딥임포트해 파일 순환을 수동 회피하는 구조 자체가 순환의 방증). country-list.tsx:7→command-palette, country-mobile-ui.tsx:4·7, historical-country-detail.widget.tsx:18-20의 ListStyles spread(:20), person-politics-section.tsx:47 모두 사실. 추가로 person-infographic/ui/infographic-content.tsx:17도 country-list/ui를 직접 참조해 파급 범위 '4곳'은 과장 아님. 다른 계층의 방어 장치(공용 하위 레이어 추상화) 없음.

</details>

### F51 [P3/S/CONFIRMED] country-list가 '전역 등록 허브' 겸직 — + 메뉴에 인물 등록 혼입(IA 스코프 이탈), 인물·정당 등록 모달이 country-list/ui에 오배치돼 타 위젯이 역수입

`apps/web-admin/src/widgets/country/country-list/ui/country-list-add-menu.tsx:101` · 렌즈: ux-ia, architecture, parity

country-list-add-menu.tsx:101-109에서 '국가 목록' 헤더(country-list.tsx:333)의 + 메뉴가 현대 국가·역사 국가·인물 3종을 제공한다. 앞의 둘은 이 목록에 즉시 나타나지만 인물은 등록해도 사이드바에 아무 변화가 없다 — country-list.tsx:544가 onSuccess={() => setShowPersonRegisterModal(false)}로 생성된 personId를 버리고 모달만 닫아 내비게이션도 없으며, 메뉴 설명(107행 '역사적 인물')도 국가와 무관해 '여기서 만들면 여기에 생긴다'는 지역성 기대를 깬다. 같은 뿌리로 PersonRegisterViewModal·PoliticalPartyRegisterViewModal이 country-list/ui에 상주하며 외부 5곳이 딥경로로 역수입한다: 인물 모달은 persons-timeline.page.tsx:23·person-detail.page.tsx:7·person-infographic/ui/infographic-content.tsx:17, 정당 모달은 person-politics-section.tsx:47·country-political-parties-block.widget.tsx:73(수평 widget import 포함). 두 래퍼 모두 country-list 내부 모듈 import가 0건이라 이 디렉토리와의 실질 접점이 전혀 없다. 단 person-register-view-modal.tsx는 순수 래퍼라기보다 133줄 글루 계층(인물 캐시 무효화 세트 59-72행·dirty/sections 상태·requiredFields 보유)이고, 셸 CountryFormShell이 widgets/country/country-form 소속이라 이동 후에도 country-form 수평 의존은 남는다 — 이동 목적지 선정 시 고려 필요. 정당 모달은 RegisterModal 셸 래핑 52줄이 맞다. 파일 이동·리네임 시 무관한 인물/타임라인 페이지가 함께 깨지는 결합.

**권고:** 제품 결정에 따라 (a) 인물 항목을 메뉴에서 제거하고 인물 등록은 인물 지면·⌘K로 유도하거나, (b) 유지 시 '국가'/'기타' 구분선을 넣고 설명을 '이 목록에는 표시되지 않음'으로 보정. 별개로 두 모달 래퍼를 widgets/person·정당 도메인 위치(또는 shared/ui)로 이동하고 소비처 import 경로 갱신 — 순수 이동이라 회귀 위험 낮음.

<details><summary>검증 노트</summary>

모든 핵심 주장 코드로 확증: (1) country-list-add-menu.tsx:101-109 인물 항목·설명 '역사적 인물'(107행) 정확, 헤더는 country-list.tsx:333 title="국가 목록". (2) country-list.tsx:544 onSuccess={() => setShowPersonRegisterModal(false)} — personId를 버리고 모달만 닫아 등록 후 사이드바 무변화·무내비게이션 확증(목록은 국가 전용). (3) 역수입 3건 모두 라인 정확(persons-timeline.page.tsx:23, person-politics-section.tsx:47, country-political-parties-block.widget.tsx:73)이며 오히려 과소 집계 — person-detail.page.tsx:7, person-infographic/ui/infographic-content.tsx:17도 동일 딥경로 import로 외부 소비처 총 5곳. (4) 두 래퍼 모두 country-list 내부 모듈 import 0건, 정당 모달 52줄 확인. 다른 계층의 방어 없음(배럴 export도 없어 전부 딥경로 직결). severity P3·effort S 타당.

</details>

### F52 [P3/S/CONFIRMED] SortBy 타입이 두 곳에 중복 export — country-list.tsx의 것은 데드 사본, 모바일은 인라인 유니온 캐스트로 3중화

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:27` · 렌즈: architecture

country-list.tsx:27 `export type SortBy = 'name' | 'population' | 'area'`와 country-list-state.context.tsx:19에 동일 타입이 중복 export된다. grep 결과 country-list.tsx의 SortBy를 import하는 곳 0곳(filters는 context 것 사용, country-list.tsx 자신도 자기 선언을 안 쓰고 context 값을 받음). country-mobile-ui.tsx:135-138은 둘 다 안 쓰고 `e.target.value as 'name' | 'population' | 'area'` 인라인 하드코딩 — 사실상 3중 정의라 옵션 추가 시 세 곳이 어긋난다.

**권고:** country-list.tsx:27 export 삭제, 정본을 한 곳(컨텍스트 또는 entities/country/model)으로 통일. 모바일 인라인 캐스트도 정본 타입 import로 교체.

<details><summary>검증 노트</summary>

코드로 전부 확증. (1) country-list.tsx:27과 country-list-state.context.tsx:19에 동일 SortBy 유니온이 중복 export됨. (2) ui/country-list의 SortBy를 import하는 곳 0곳 — 모듈 자체를 import하는 유일한 파일(country-detail-shell.tsx:30)은 CountryList만 가져오고 barrel 재수출도 없으며, country-list.tsx 내부도 자기 선언을 안 쓰고 컨텍스트에서 추론된 타입을 받음(라인 65). filters는 country-list-state.context의 것을 import(country-list-filters.tsx:18-21). (3) country-mobile-ui.tsx:136-138의 `e.target.value as 'name' | 'population' | 'area'` 인라인 캐스트 확인 — 어느 정본도 import하지 않는 3번째 정의이며, 컨텍스트 유니온에 옵션 추가 시 좁은→넓은 캐스트라 컴파일이 통과해 조용히 어긋나는 시나리오 성립. severity P3·라인 27 적절.

</details>

### F53 [P3/S/CONFIRMED] 타입 우회 캐스트 다발 — historicalToUnified 헬퍼가 있는데 'as unknown as UnifiedCountry' 수동 변환, 이미 타입에 있는 필드까지 불필요 캐스트

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:141` · 렌즈: architecture

entities/country/model/unified-types.ts:89-112에 CountryHistoricalEntry까지 받는 historicalToUnified가 있고 use-content-core-data.hook.ts:96,102는 이를 사용함에도, country-list.tsx:141-144와 country-list-children-popover.tsx:254-262는 `{...h, type:'historical'} as unknown as UnifiedCountry` 수동 스프레드 캐스트로 이탈한다(런타임 결과는 헬퍼와 동등하나 `as unknown as` 이중 캐스트가 타입 검사를 완전히 무력화해 향후 타입 드리프트를 은폐). country-list.tsx:569-572의 `(childrenPopover.parent as { continentId?: string | null }).continentId`는 parent가 state 선언(311-314)에서 이미 UnifiedCountry 타입이고 UnifiedCountry가 continentId 옵셔널 필드를 가져(unified-types.ts:36) 캐스트 불필요. country-list.tsx:86 `(collapsedGroups as Set<string>)`도 `!== 'all'` 체크 뒤라 내로잉으로 충분. country-list-state.context.tsx:117-118 `(hc as { parentModernCountryIds?: string[] })`와 use-content-core-data.hook.ts:53,66-68의 fullName·defaultNameDisplayOrder 구조 캐스트는 해당 필드가 서버 DTO에 이미 정식 선언되어 있어(historical-country.response.ts:31, country.response.ts:12·56 — SDK가 이 타입을 직접 import) 전부 불필요한 잔재다.

**권고:** 수동 스프레드 2곳을 historicalToUnified 호출로 교체하고 불필요 캐스트 2곳 삭제. parentModernCountryIds·fullName·defaultNameDisplayOrder는 entities의 DTO/도메인 타입에 정식 필드로 선언해 구조 캐스트 제거.

<details><summary>검증 노트</summary>

캐스트 5곳 모두 실재 확인: country-list.tsx:141-144·country-list-children-popover.tsx:254-262의 `as unknown as UnifiedCountry` 수동 스프레드(같은 소스를 다루는 use-content-core-data.hook.ts:96,102는 이미 historicalToUnified 사용 — 두 곳만 이탈), country-list.tsx:569-572(parent는 state 선언 311-314행에서 이미 UnifiedCountry, continentId는 unified-types.ts:36에 존재), country-list.tsx:86(`!== 'all'` 내로잉으로 충분), country-list-state.context.tsx:117-118·use-content-core-data.hook.ts:53,66-68. 단 detail의 사실오류 2건 정정: (1) "description/latitude 분기 유실"은 틀림 — 경량 DTO(historical-country-simple.response.ts:87,93)는 latitude/longitude를 갖고 description은 없어 스프레드가 헬퍼와 런타임 동등, 문제는 유실이 아니라 `as unknown as`가 타입검사를 무력화하는 것. (2) "DTO에 정식 추가하지 않고 우회"도 틀림 — parentModernCountryIds(historical-country.response.ts:31)·fullName(country.response.ts:12)·defaultNameDisplayOrder(country.response.ts:56) 모두 서버 DTO에 이미 선언되어 있고 SDK가 이 타입을 직접 import하므로 프론트 파생 타입에도 존재, 해당 캐스트들은 우회가 아니라 불필요 잔재(삭제만 하면 됨). P3·S는 적정.

</details>

### F54 [P3/M/CONFIRMED] 이중 배선 비일관 — 같은 트리에서 props drilling과 context 직접 구독 혼재, showPersonRegisterModal이 공용 컨텍스트에 상주(사용처 1곳)

`apps/web-admin/src/widgets/country/country-list/country-list-state.context.tsx:44` · 렌즈: architecture

CountryList는 query/sortBy 등을 context에서 읽어(country-list.tsx:54-69) CountryListFilters에 11개 props로 다시 내리는데(349-361; 그중 context 유래 drilling 9개, onClearFilters·onSearchKeyDown 2개만 목록 결합 콜백), 정작 filters는 같은 context를 직접 구독해 historicalCount·unlinkedHistoricalIds를 따로 읽는다(country-list-filters.tsx:102, props 인터페이스 74-87과 공존 — 파일 상단 5-7행 주석이 직접 구독을 의도적 선택으로 문서화하고 있어 두 경로 혼재가 명시적으로 굳어진 상태). CountryListRow도 country/pinned는 props, unlinkedHistoricalIds는 context 직접(country-list-row.tsx:85)으로 두 경로 혼재 — 같은 상태의 배선 경로가 컴포넌트마다 달라 추적 비용이 크다. showPersonRegisterModal은 '페이지 전역에서 열기' 주석과 함께 컨텍스트에 있으나(country-list-state.context.tsx:44-46) 사용처는 country-list.tsx 한 곳뿐(67·542행) — ContentShell(content-shell.tsx:96)이 provider를 마운트하므로 persons-timeline·timeline-views 등 CountryList를 렌더하지 않는 페이지도 불필요한 모달 state를 들고 다니며, context value useMemo 의존성에 showPersonRegisterModal이 포함(216행)되어 모달 토글 시 모든 consumer(가시 행 전부·country-dashboard:335·country-mobile-ui:34)가 리렌더된다(F16의 리렌더 원인이기도 함).

**권고:** 필터 상태는 컨텍스트 직접 구독으로 통일해 CountryList→Filters 10개 prop drilling 제거(Filters props는 onSearchKeyDown 등 목록 결합 콜백만 유지), showPersonRegisterModal은 CountryList 로컬 state로 강등.

<details><summary>검증 노트</summary>

모든 핵심 주장이 코드로 확증됨. (1) country-list.tsx:54-69에서 context 구독 후 349-361에서 Filters로 재-drilling, (2) country-list-filters.tsx:102의 동일 context 직접 구독(props 74-87과 공존), (3) country-list-row.tsx:85의 혼재 배선, (4) showPersonRegisterModal 주석·필드(context 44-46행)와 소비처 country-list.tsx 1곳뿐, (5) content-shell.tsx:96이 provider를 마운트해 persons-timeline·timeline-views 등 CountryList 없는 페이지도 모달 state 보유, (6) context value useMemo 의존성에 showPersonRegisterModal 포함(216행)이라 모달 토글 시 모든 consumer(가시 행 전부·country-dashboard·country-mobile-ui) 리렌더 — F16 기전 성립. 방어 계층 없음(CountryList의 React.memo는 자체 context 구독으로 무력). 유일한 사실 오차는 prop 개수(10개→실제 11개, 그중 context 유래 9개).

</details>

### F55 [P3/S/CONFIRMED] 팝오버·드롭다운 3곳이 동일한 dismiss 로직(mousedown 외부클릭+Esc+등록 지연)을 각자 복붙 — shared useOnClickOutside 미사용

`apps/web-admin/src/widgets/country/country-list/ui/country-list-add-menu.tsx:29` · 렌즈: architecture, parity

country-list-children-popover.tsx:153-174, country-list-add-menu.tsx:29-45, country-list-context-menu.tsx:45-66이 document mousedown 외부 클릭 판정+Escape keydown+'현재 클릭이 즉시 닫지 않도록' setTimeout(0) 등록 지연이라는 사실상 동일 패턴을 각자 구현한다(add-menu만 지연 누락으로 미묘하게 다름). shared/hooks/use-on-click-outside.hook.ts가 이미 존재하고 header 위젯들(notification-bell, user-menu, sound-settings)이 사용 중이며, 사건 카탈로그 recent-events-dropdown(51-65행)도 수제라 앱 전반에서 두 계열이 공존한다. 프로젝트가 모달에 useModalBehavior를 강제하듯 비모달 표면에는 공용 훅이 없어 사본이 늘어나는 구조 — 세부 차이(다음 틱 등록, contextmenu 커버 여부)가 사본에 흩어져 수정 시 세 곳을 모두 기억해야 한다.

**권고:** useOnClickOutside 확장(+Esc 옵션) 또는 usePopoverDismiss({ref, anchorEl?, onClose, listenContextMenu?}) 공용 훅을 shared에 추출해 3곳 교체. '여는 우클릭 즉시 닫힘 방지'는 defer 옵션으로 흡수하고 사건 recent-events-dropdown도 후속 수렴 후보로.

<details><summary>검증 노트</summary>

3개 파일 전부 실독 확인: add-menu 29-45(mousedown 외부판정+Esc, 지연 없음), children-popover 154-174(+setTimeout(0) 지연·anchor 제외), context-menu 45-66(+contextmenu 리스너·setTimeout(0) 지연) — 인용 라인·세부 차이 서술 모두 정확. shared/hooks/use-on-click-outside.hook.ts 실존(mousedown 전용, Esc 미지원 → 확장 권고도 타당)하고 grep 결과 소비처가 정확히 header 3위젯(notification-bell·sound-settings·user-menu)뿐. recent-events-dropdown.tsx 51-65도 수제 사본임을 확인. 부모/공용 계층의 기존 방어 없음(각자 document 리스너 직접 등록). 코드만으로 전면 확증되는 중복/일관성 발견이며 P3·S 적정.

</details>

### F56 [P3/M/CONFIRMED] 우클릭 컨텍스트 메뉴 미완성 — 주석은 '편집/고정/삭제 등'이지만 실제는 고정+역사국가 편집뿐, danger variant는 데드 코드

`apps/web-admin/src/widgets/country/country-list/ui/country-list-context-menu.tsx:68` · 렌즈: architecture

country-list-context-menu.tsx:2 주석과 ContextMenuItem 인터페이스(17-24, variant 'danger'·disabled 지원)는 삭제까지 염두에 둔 설계지만 items 구성(68-90)은 고정 토글과 (역사국가 한정) 편집뿐이다. 현대 국가는 우클릭해도 편집 항목이 없고(country-list.tsx:555-559에서 historical만 onEdit 전달) 삭제는 어떤 유형에도 없다. variant/danger 색 분기(153-154)와 disabled 스타일(166-169)은 도달 불가 데드 분기. 셸에는 onDelete(country-detail-shell.tsx:63→deleteFromDetail)와 현대 국가 편집 경로(editFromDetail, use-country-form-handlers.hook.ts:52)가 이미 존재 — 편집은 배선만 하면 되지만 deleteFromDetail은 selectedCountry 기준으로 타입 분기(hook:64-75)하므로 임의 행에 쓰려면 대상 국가 기준 분기로 소폭 리팩터가 필요하다.

**권고:** 셸의 editFromDetail·deleteFromDetail을 CountryList props로 내려 현대 국가 편집·삭제(명령형 confirm 표준 경유) 항목을 추가하거나, 당분간 계획이 없다면 인터페이스의 variant/disabled와 주석을 실제 기능에 맞게 축소.

<details><summary>검증 노트</summary>

인용 전부 실코드와 일치: 주석(line 2)은 '편집/고정/삭제 등'을 표방하나 items(68-90)는 고정 토글+조건부 편집뿐이고 삭제 항목 없음. country-list.tsx:555-559에서 historical 타입일 때만 onEdit(onEditHistorical) 전달 — 현대 국가는 우클릭 시 고정만 노출. ContextMenuItem의 variant 'danger'/disabled(17-24)를 설정하는 항목이 전무해 MenuItem의 danger 색 분기(153-154)·disabled 스타일(166-169)은 도달 불가 데드 코드. 셸에는 onDelete(country-detail-shell.tsx:63→deleteFromDetail)와 현대 국가 편집 경로 editFromDetail(use-country-form-handlers.hook.ts:52-62, countryForm.openEdit 분기)이 실존하며 CountryList에는 onEditHistorical만 내려감(shell:196) — 미배선 사실. 단 정밀도 보정 하나: deleteFromDetail(hook:64-75)은 인자 id가 아닌 selectedCountry?.type으로 분기하므로 임의 행 재사용에는 소폭 리팩터 필요('배선만'은 편집에만 정확) — effort M이 이를 커버. severity P3(기능 미완성·폴리시, 버그 아님) 적정.

</details>

### F57 [P3/S/CONFIRMED] 신규 작성 코드에 한 글자 변수 잔존 — ESLint error 규칙 위반으로 파일 수정 시 lint 실패 예정

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:100` · 렌즈: architecture

web-admin ESLint(no-restricted-syntax, eslint.config.mjs:43-50)는 한 글자 식별자를 error로 잡되 i·j·_·id·fs·db·z·e·x·y·t·S·p·a·T는 예외다. 실측(npx eslint) 결과 개선 대상 파일에 위반 잔존: country-list.tsx 33건 — 100 `const s = new Set...`·`(c) => c.id`, 124-126 `(s) => s.pinnedIds`/`(s) => s.toggle`/`(s) => s.recentIds`, 137 `for (const c of ...)`, 140 `for (const h of ...)`, 그 외 138-142·150·154 `(c)`·187 `b`·256-259 `c`; country-list-add-menu.tsx:60 `(o) => !o` 2건; country-detail-shell.tsx 88 `(s) => s.push`·142-143 `(c)` 7건. 반면 인용됐던 country-list-children-popover.tsx:33 `let p`·165 `const t`, pinned-countries.store.ts:18 `(x)`는 예외 문자(p·t·x)라 lint 0건 — 위반 아님. 워크플로(변경 파일 단독 lint)는 레거시 기존 오류를 허용하고 신규 0건만 요구하므로 하드 블록은 아니나, 이 파일들을 수정하면 매번 41건 오류 속에서 신규/레거시 선별 노이즈가 발생한다.

**권고:** 개선 작업 첫 커밋에서 해당 파일들의 한 글자 변수를 풀네임(nextSet, countryItem, historicalEntry, storeState, timerId 등)으로 일괄 치환하고 변경 파일 단독 lint 0건 확인.

<details><summary>검증 노트</summary>

실제 npx eslint 실행으로 핵심 주장 확증: country-list.tsx 33건(100·124-126·137·140 전부 적중), country-list-add-menu.tsx:60 2건, country-detail-shell.tsx 7건(88·142-143)의 no-restricted-syntax error가 실재한다. 단 인용 5개 파일 중 2개는 오탐 — eslint.config.mjs:47의 예외 목록(i,j,_,id,fs,db,z,e,x,y,t,S,p,a,T) 때문에 children-popover의 `let p`(33)·`const t`(165), pinned-countries.store.ts의 `(x)`(18)는 lint 0건. 또한 워크플로는 기존 레거시 오류를 허용(변경분 신규만 0 요구)하므로 "걸린다"보다는 "신규/레거시 선별 노이즈 발생"이 정확하다.

</details>

### F63 [P3/S/CONFIRMED] 접힘 rail UI 이중 구현 — country-list와 LeftFilterSlot이 같은 패턴을 각자 소유(주석으로 '동일 패턴' 자인, 이미 드리프트 시작)

`apps/web-admin/src/widgets/country/country-list/ui/country-list.styles.ts:990` · 렌즈: parity

국가 사이드바의 CollapsedRail/CollapsedToggleBtn/CollapsedHint(country-list.styles.ts:990-1028)와 인물 필터의 CollapsedRail/CollapseBtn(left-filter-slot.styles.ts:27-54)이 사실상 동일 스타일(28×28 버튼·radius 8px, tertiary 색, 동일 hover 배경·색 전환, gap 12px 세로 rail)의 복제본이다. country-list.styles.ts:988 주석이 "인물 필터(LeftFilterSlot)의 collapsed UI와 동일 패턴"이라고 스스로 밝혀 공용화 대상임을 인지한 채 복제된 상태. 렌더 측도 country-list.tsx:522-536과 left-filter-slot.tsx:31-47이 같은 구조(FiChevronRight 펼치기 버튼+힌트 아이콘)를 중복 구현하며, 이미 드리프트가 시작됐다: rail 패딩(14px 0 vs 16px 0)이 다르고, 힌트 아이콘 처리도 갈렸다 — country는 styled CollapsedHint(28px 컨테이너+opacity 0.5+aria-hidden)로 감싸지만 filter-slot은 `<FiFilter size={16} opacity={0.5} />`를 래퍼·aria-hidden 없이 노출(left-filter-slot.tsx:43).

**권고:** content-shell에 `<CollapsedRail icon={...} onExpand={...} label={...}/>` 공용 컴포넌트를 추가(SidebarHeader와 나란히)하고 두 소비자를 이관. 향후 organizations 등 새 사이드바가 접기를 얻을 때 재사용 지점이 된다(F22의 어포던스 개선을 공용 컴포넌트에 반영).

<details><summary>검증 노트</summary>

코드 확인 결과 핵심 주장 전부 사실: country-list.styles.ts:990-1028의 CollapsedRail/CollapsedToggleBtn/CollapsedHint와 left-filter-slot.styles.ts:27-54의 CollapsedRail/CollapseBtn이 동일 스타일(28×28 버튼·radius 8px·tertiary·동일 hover·gap 12px 세로 rail) 복제본이고, :988 주석이 "인물 필터(LeftFilterSlot)의 collapsed UI와 동일 패턴"이라고 자인하며, 렌더 측(country-list.tsx:522-536 vs left-filter-slot.tsx:31-47)도 같은 구조(FiChevronRight 16 펼치기 버튼+힌트 아이콘)를 중복 구현한다. 패딩 드리프트(14px vs 16px)도 사실. 단 "버튼 radius가 미세하게 달라"는 오류 — 양쪽 모두 border-radius 8px로 동일하고, 실제 두 번째 드리프트는 힌트 아이콘 처리(country는 CollapsedHint 28px 래퍼+aria-hidden, filter-slot은 래퍼·aria-hidden 없는 bare FiFilter)다. 공용 방어 계층 없음이 확인됐고, country-list.tsx:8이 이미 content-shell에서 SidebarHeader를 import하므로 권고안(content-shell 공용화)도 기존 경로를 따라 실행 가능하다.

</details>

### F64 [P3/M/CONFIRMED] 모바일 시트 규약 분열 — 인물은 공용 SidebarSheet(포커스트랩·Esc·스크롤락), 국가는 수제 bottom sheet(전부 없음)

`apps/web-admin/src/widgets/country/country-mobile-ui/ui/country-mobile-ui.tsx:46` · 렌즈: parity

persons-timeline은 content-shell의 SidebarSheet를 사용해 useFocusTrap+Esc+body 스크롤락+aria-modal/labelledby를 얻는다(sidebar-sheet.tsx:37-50,71-73). 반면 국가 페이지 모바일 목록 CountryMobileUI는 자체 MobileListOverlay+MobileListPane(country-mobile-ui.tsx:46-68)으로 backdrop 클릭·드래그 dismiss만 있고 Esc 닫기·포커스 트랩·body 스크롤락·role=dialog가 모두 없다. 같은 셸(ContentShell) 아래 두 페이지가 '모바일 좌측 패널 대체 시트'라는 동일 문제를 다른 토대로 풀고 있으며 국가 쪽이 a11y 열위. 프로젝트 모달 규약(useModalBehavior 계열 토대 필수, 직접 구현 금지) 관점에서도 수제 구현이 이탈.

**권고:** CountryMobileUI 오버레이 골격을 SidebarSheet로 교체(하단 슬라이드가 필요하면 SidebarSheet에 side='bottom' prop 추가)하거나, 최소한 useFocusTrap·Esc·use-body-scroll-lock.hook을 배선해 기능 패리티 확보.

<details><summary>검증 노트</summary>

인용 전부 코드로 실증됨. sidebar-sheet.tsx: useFocusTrap(37행)·Esc+body 스크롤락 effect(39-50행)·role="dialog"/aria-modal/aria-labelledby(71-73행)이 정확하고, persons-timeline.page.tsx가 실제 SidebarSheet를 사용(27-28·185행). country-mobile-ui.tsx 46-68행은 수제 AnimatePresence+MobileListOverlay(backdrop onClick 53행)+MobileListPane(드래그 dismiss 63-67행)이며 파일 전체에 Esc 핸들러·포커스 트랩·body 스크롤락·role/aria-modal이 전무. 부모 country-detail-shell.tsx와 styles 파일 grep에서도 방어 코드 0건(styles의 overflow:hidden은 패널 내부 클리핑일 뿐 body 락 아님). CountryMobileUI는 country-detail-shell.tsx:220에서 실제 렌더되는 살아있는 코드. 재현은 코드 부재로 구조적으로 성립(런타임 불요). P3/M 유지 적정 — 닫기 버튼·backdrop·드래그 3중 dismiss가 있어 접근불능은 아니고 패리티·a11y 토대 결손. 참고: web-admin CLAUDE.md의 "sidebar-sheet=모달 아님 제외"는 글래스 표면 통일 대상 제외일 뿐 행동 토대(useModalBehavior 계열) 면제가 아니므로 권고안과 충돌 없음.

</details>

### F65 [P3/M/CONFIRMED] '최근 본 항목' 구현 3분열 — 국가=command-palette 내 zustand persist, 사건=shared 수제 훅, 인물=부재 (+위젯 수평 import)

`apps/web-admin/src/widgets/country/country-list/ui/country-list.tsx:7` · 렌즈: parity

최근 항목 저장이 도메인마다 다른 메커니즘: 국가는 command-palette 위젯 내부의 zustand persist store(recent-countries.store.ts, max 8, version 1+migrate 지원), 사건은 shared 수제 훅 useRecentEvents(localStorage 'papyrus_recent_events', max 10, 버전 관리 없음), 인물은 부재. 노출 방식도 국가=사이드바 인라인 '최근' 섹션(country-list.tsx:237), 사건=툴바 드롭다운(recent-events-dropdown.tsx)으로 상이. country-list.tsx:7이 `from '@/widgets/command-palette'`로 recent store를 가져와 위젯 간 수평 의존을 만든다. (정정: country-detail-shell.tsx:27의 동일 import는 pages 레이어→widgets라 FSD상 합법적 하향 의존이며 수평 위반은 country-list 한 곳뿐 — 다만 '최근 국가'가 팔레트 전용 개념이 아님을 보여주는 근거로는 유효.)

**권고:** shared(또는 entities 레벨)에 `createRecentEntityStore(name, max)` 팩토리를 두고 recent-countries를 command-palette 밖으로 이동, 사건 useRecentEvents도 같은 팩토리로 수렴(version·migrate·max 정책 통일). command-palette와 country-list는 공용 store를 각자 소비(F50의 방향 정리와 연계).

<details><summary>검증 노트</summary>

코드로 전부 확증됨. country-list.tsx:7이 '@/widgets/command-palette'에서 useRecentCountriesStore를 import(위젯 간 수평 의존 사실), 국가=zustand persist(recent-countries.store.ts, max 8, version 1+migrate), 사건=shared 수제 훅(use-recent-events.hook.ts, 'papyrus_recent_events', max 10, 버전 없음), 인물=최근 본 항목 메커니즘 부재(전수 grep 확인; dashboard의 RecentPersonItem은 서버 파생 최근 등록, 별개 개념). 노출 방식 상이(국가=사이드바 인라인 '최근' 그룹 country-list.tsx:237, 사건=툴바 드롭다운 recent-events-dropdown.tsx 주석 명시)도 사실. 방어 계층 없음.

</details>

### F66 [P3/S/CONFIRMED] (승격 후보) use-list-keyboard-nav — 국가 사이드바만 가진 리스트 키보드 내비를 shared로

`apps/web-admin/src/widgets/country/country-list/model/use-list-keyboard-nav.ts:22` · 렌즈: parity

use-list-keyboard-nav.ts는 ↑↓/Home/End/Enter·Space/→←(확장·접기)+검색창↓ 첫 행 진입(96-105행)까지 갖춘 범용 훅인데 country-list/model에 갇혀 있고 소비처도 country-list.tsx 한 곳뿐이다. 시그니처(12-20행: containerRef/rowIds/onSelect/onExpand/onCollapse/expandableIds/expandedIds)가 이미 domain-free라 이동 비용이 낮다. 자매 지면 중 사건 카탈로그는 별도 훅(use-catalog-keyboard.ts useCatalogListNavigation 79-140행, 키 분기 95-111행)으로 ↑↓/Home/End/Enter를 재구현했고 — 단 모델이 다름(국가=data-row-index roving focus, 카탈로그=window 리스너+선택상태+scrollIntoView) — organizations-list.page.tsx의 수제 목록 패널(ListPanel/CardList 57·164·599-707행)에는 키보드 내비가 아예 없다(onKeyDown/tabIndex 전무). event-list-compact 위젯은 행 단위 Enter/Space(event-list-item.tsx:182-189)+상위 카탈로그 훅 위임으로 내비가 있으므로 '부재'가 아니라 '중복 구현'이 문제다.

**권고:** 훅을 shared/hooks(또는 content-shell/model)로 승격하고 country-list는 re-export로 무파괴 이관. 이후 organizations 목록·event-list 위젯에 적용해 사이드바 키보드 규약 통일(F11·F12·F23 수정을 승격판에 반영).

<details><summary>검증 노트</summary>

핵심 주장 모두 코드로 확증: (1) use-list-keyboard-nav.ts:12-20 시그니처가 domain-free(rowIds/onSelect/expandableIds…)이고 49-105행에 ↑↓/Home/End/Enter·Space/→←/검색창↓ 전부 구현, 소비처는 country-list.tsx 단 한 곳(grep 확인). (2) use-catalog-keyboard.ts의 useCatalogListNavigation(79-140행)이 ↑↓/Home/End/Enter를 window 리스너로 재구현 — 인용 95-111행 정확. (3) organizations-list.page.tsx(827줄)는 수제 ListPanel/CardList(57·164·599-707행)에 onKeyDown/tabIndex/ArrowDown 전무. 단 detail의 "event-list 위젯 목록에는 키보드 내비가 아예 없다"는 사실오류 — event-list-item.tsx:182-189가 tabIndex=0+Enter/Space를 갖고 유일 소비처인 events.page.tsx:343이 useCatalogListNavigation을 배선하므로 카탈로그 목록엔 내비가 존재(문제는 부재가 아니라 중복). P3/S/라인22는 타당.

</details>

### F68 [P3/L/CONFIRMED] 공용 사이드바 토대의 낮은 침투율 — ContentShell 3페이지·SidebarHeader 2곳뿐, organizations 등은 전면 수제 패널

`apps/web-admin/src/widgets/content-shell/ui/sidebar-header.tsx:22` · 렌즈: parity

재사용 실측: ContentShell을 실제 렌더하는 소비자는 country-detail-shell.tsx:186, persons-timeline.page.tsx:126, timeline-view.page.tsx:72(73행 fullScreen이라 좌측 미사용) 3곳뿐이고, SidebarHeader는 country-list.tsx:332와 left-filter-slot.tsx:51 2곳, useListCollapsed는 widgets/content-shell/index.ts:12에서 export는 되어 있으나 외부 소비자 0곳(content-shell.tsx:79만 사용)이다. 반면 organizations-list.page.tsx:57은 자체 ListPanel/PanelHeader/Toolbar(48-109행, `const ListPanel = styled.div<{ hasDetail: boolean }>`)로 마스터-디테일 목록 패널을 수제 구현(카운트 배지·접기·키보드 내비·스켈레톤 전무 — 827줄 전체 grep 0건)했고, 사건 목록(widgets/event-list/ui/filter-panel.tsx)과 companies-list.page.tsx도 content-shell 참조가 전혀 없어 셸 밖이다. '국가 사이드바 개선'으로 좋은 패턴(SidebarHeader+count, 접기 rail, 스켈레톤, 빈 상태 분기, 키보드 내비)을 다듬어도 현 구조로는 다른 페이지에 전파되지 않는다.

**권고:** 이번 개선에서 사이드바 부품(헤더·접기 rail·키보드 내비·접힘그룹 훅·스켈레톤)을 content-shell 쪽 '사이드바 키트'로 승격하는 것을 산출물에 포함하고, organizations 목록 패널을 첫 이관 대상으로 지정해 침투율을 검증. 전면 이관은 별도 트랙(L)으로.

<details><summary>검증 노트</summary>

전 수치 실측 일치: ContentShell 실렌더 3곳(country-detail-shell.tsx:186 left슬롯·persons-timeline.page.tsx:126 left슬롯·timeline-view.page.tsx:72-73 fullScreen이라 좌측 미사용, 나머지 grep 히트는 주석/라우트 래퍼), SidebarHeader 소비 2곳(country-list.tsx:332·left-filter-slot.tsx:51, person-select-modal의 FilterSidebarHeader:1275는 무관한 로컬 styled.div). organizations-list.page.tsx는 57행 ListPanel styled.div<{hasDetail}> 포함 48~109행에 Layout/PanelHeader/Toolbar 수제 구현이며 827줄 전체에서 content-shell import·카운트 배지·접기·키보드 내비·스켈레톤 grep 0건. event-list 위젯 filter-panel(widgets/event-list/ui/filter-panel.tsx)과 companies-list.page.tsx도 content-shell 참조 0건. 유일한 미세 부정확: useListCollapsed는 index.ts:12에서 공개 export됨(외부 소비자 0곳이라 실질은 동일) — correctedDetail로 정정. severity P3·effort L·라인 22 적절.

</details>

