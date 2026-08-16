# 사건 타임라인 v4 개선 검토

> 2026-08-11. 대상: `widgets/event-timeline/` v4(시대 드릴다운, docs/event-timeline-redesign.md)
> + 페이지 통합(events.page·URL). 방법: 6렌즈 병렬 검토(모델 수학 / React 정합 / 페이지·URL /
> UX·IA / 접근성·키보드 / 시각·테마) 후 교차 검증. 렌즈 간 판정이 갈린 1건(R3)은 코드 직접
> 대조로 확정. 모델 결함 2건(R4·R18)은 검토 단계에서 **실행 재현**됨.
>
> 표기: 🄲 = 실행 재현 또는 코드 직접 검증 완료. 총 43건 = P1 3 · P2 14 · P3 26.

## 총평

원 불만(조작 복잡성·이름 가시성)은 구조적으로 해소됐다 — 이번 발견은 대부분 새 구조의
마감 결함이다. 그러나 P1 3건은 모두 **핵심 제스처인 '드릴'을 직접 깨는** 것들이라
(드릴 후 화면 위치·포커스·Esc), 실화면 검증 전에 반드시 수정해야 한다.

## P1 — 드릴 상호작용을 깨는 결함

- **R1** 🄲 `ui/event-timeline.tsx`(ScrollRegion) — **창 전환 시 scrollTop을 리셋하지 않는다.**
  전체 단계에서 리스트를 깊이 내려 본 뒤 드릴하면 이전 스크롤이 유지되고, 새 콘텐츠가 짧으면
  바닥 클램프로 리스트 꼬리·중간이 첫 화면이 된다("눌렀는데 화면이 깨졌다").
  → ScrollRegion ref + `currentWindow` 변경 effect에서 `scrollTop = 0`(연도 flash 경로 제외).
- **R2** `ui/era-navigator.tsx` — **창 전환마다 키보드 포커스가 body로 유실**(WCAG 2.4.3).
  ⑴ Enter 드릴 → cells 전면 교체로 눌린 버튼 언마운트 ⑵ 브레드크럼 클릭 → 그 crumb이
  current가 되며 `disabled` ⑶ ‹› 스텝 경계 도달 → 누른 버튼이 disabled ⑷ Backspace 상위 이동.
  → 창 전환을 ref 플래그로 표시하고 effect에서 첫 활성 버킷(없으면 브레드크럼)으로 refocus.
- **R3** 🄲 `ui/era-navigator.tsx`(handleRowKeyDown) — **Esc 이중 동작.** `preventDefault`만
  하고 전파를 막지 않는데, 페이지 전역 핸들러(`use-catalog-keyboard.ts`)는 버튼 타깃을
  의도적으로 가드에서 제외하고 `defaultPrevented`도 보지 않는다 → 버킷 포커스 + 사건 선택
  상태에서 Esc 한 번에 **상위 창 이동 + 선택 해제(드로어 닫힘)가 동시에** 발생.
  → 위젯 쪽에서 `stopPropagation()`(페이지 핸들러 수정은 다른 Esc 계약과 얽혀 위험).

## P2

- **R4** 🄲 `model/timeline-model.ts`(buildTimelinePoints) — **연도 0 데이터가 모수 일치
  불변식을 3중으로 깬다.** `0000-06-01`이 year 0으로 통과 → `getCentury(0)=-1`이라 전체
  단계에선 BC 1세기에 카운트되지만 드릴하면 구간·리스트 모두에서 사라짐. 부수:
  `windowContainingPoint`→`d0`→라벨 `기원전 0–-9년`·URL 왕복 실패(창밖 배너의 이동 버튼이
  깨진 창으로 보냄). → year 0을 -1(천문학 0년=BC 1)로 정규화(end에도), 스펙 추가.
- **R5** `model/timeline-model.ts`(parseTimelineWindow) — **tlw 크기 클램프 부재.** `c999`가
  '수용'되므로 serialize가 되쓰기해 "무효값은 첫 write에서 정리" 규약이 유일하게 안 걸리는
  축이 된다(`parseCenturyParam`의 `|c|≤21`과 비대칭). → 세기·span10 모두 |세기|≤21 클램프.
- **R6** `model`(packSpanRows 행 무제한)+`ui/span-band.tsx` — **밀집 세기에서 밴드가 첫
  화면을 도배.** 기간 사건 1건 점유 ≈250px→행당 ~4건, 80건이면 ~20행(526px+)로 스크롤
  영역을 밴드가 소진 — 연표가 fold 아래로 사라짐. → 행 상한(~8) + «외 N건 — 아래 연표에서»
  접힘 라인.
- **R7** `ui/event-timeline.tsx`(hoveredEventId) — **hover 승격으로 행 하나 스칠 때마다 위젯
  전체 리렌더**(전체 창 = 전 사건 리스트). → hover 공유는 밴드 표시 창에서만, EventRow
  memo 추출, EraNavigator memo.
- **R8** `ui/window-list.tsx`·`span-band.tsx` — **모든 행·막대가 개별 tab stop**(밀집 창
  200+). LIST 뷰 3차 검토가 '탭 정지점 238→2'로 고친 결함의 재도입. → 행 roving/컨테이너
  화살표 내비 + 밴드→리스트 스킵 수단.
- **R9** 설계지점(전체 단계) — **여러 세기 걸침 대형 사건의 존재감 소실**(시작 세기 리스트
  1행뿐, 히스토그램·밴드 어디에도 흔적 없음). → 세기 그룹 헤더에 '이전 세기부터 계속 N건'
  라인(시작 기준 모수는 유지).
- **R10** `ui/era-navigator.tsx`(BucketButton flex)·`span-band.tsx` — **모바일 버킷 폭
  ~10px**(360px·세기 26개), SpanBar 높이 16px — 터치 타깃(WCAG 2.5.8) 미달. → 버킷
  `min-width` + 모바일 한정 BucketRow 가로 스크롤, SpanBar 히트박스 24px+.
- **R11** `ui/era-navigator.tsx`(ColumnSegment `min-height: 2px`) — **스택 비율 왜곡.** 20px
  컬럼에 6카테고리(15:1:1:1:1:1)면 지배 카테고리가 35% 작게, 3px 컬럼에선 소수 세그먼트
  클리핑. 밀도 지도가 곧 조작면이라 비율 거짓말은 치명. → v3 미니맵 규약(h<4 단색 폴백)
  이식 + min-height 제거.
- **R12** `window-list`·`era-navigator`·`span-band` — **text.tertiary 소형 데이터 텍스트 대비
  미달**(라이트 #9ca3af ≈2.5:1, 다크 ≈3.8:1): RowLeading·GroupCount·BucketCount·BandEmpty·
  WindowEmpty·GapCell. → 정보 텍스트는 secondary 승격, tertiary는 장식 전용.
- **R13** `ui/event-timeline.tsx` — **창 변경이 SR에 무음**(WCAG 4.1.3). → sr-only
  `role="status"`에 `${describeWindow} · N건` 발화(R21과 겸용).
- **R14** `ui/span-band.tsx`(titleAttr) — **원시 ISO 날짜 노출**(BC `-0044-03-15` → SR
  "마이너스…"). 목록 IA-3 규약(표기 통일) 위반. → `formatYearLabel` 기반 조립.
- **R15** `ui/span-band.tsx`(SpanLabel $inside) — **흰 글씨가 밝은 카테고리색 위 대비 미달**
  (외교 #0ea5e9 ≈2.6:1). inside 발생 = 그 창의 최대 사건이라 체감 큼. → 반투명 배경 칩 위
  text.primary 또는 명도 기반 흑/백.
- **R16** `ui/event-timeline.tsx`(ScrollRegion) — **dvh 정본 미준수**(이 폴더 명시 규약,
  list-page.styles:520) + 320/230 상수 미캘리브레이션. → vh/dvh 폴백 쌍 + 실화면 보정.
- **R17** `ui/event-timeline.tsx` — **딥링크(`?event=`) 선택 행 자동 스크롤 부재**(v3는
  했음) — 창 안이면 배너도 없어 하이라이트가 묻힘. → 마운트·창 변경 시 1회
  `scrollIntoView({block:'center'})`.

## P3

- **R18** 🄲 `model`(fractionalYear `day/31`) — 12월 31일이 정확히 **다음 해 좌표**
  (`1880-12-31`→1881.0): 자기 창 밴드에서 제외(리스트와 불일치)·다음 창에서 잘림 표기
  누락. → `(day-1)/31`로 [0,1) 보장.
- **R19** `ui/era-navigator.tsx`(canStep next) — span10 ›가 데이터 밖 **빈 세기 구간을 최대
  10스텝** 걸어감(prev는 타이트 — 비대칭, 4개 렌즈 독립 발견). → `getCentury(next)` 멤버십
  으로 클램프.
- **R20** `ui/event-timeline.tsx` — OutsideBanner가 밴드 **아래**라 밴드가 크면 안 보임 →
  ScrollRegion 최상단으로.
- **R21** 헤더가 "지금 창에 몇 건"을 요약 안 함(총계는 전체 모수) → 브레드크럼 현재 항목에
  건수 병기("19세기 · 87건").
- **R22** 같은 모양 버킷이 단계별 다른 동작(드릴 vs 리스트 스크롤)인데 단서가 컨테이너
  aria-label뿐 → 버킷 fullLabel에 동작 문구 병기.
- **R23** GapCell이 aria-hidden+hover title뿐 — SR·키보드 도달 불가, 마우스도 hover 전엔
  "⋯" 의미 불명(3렌즈 합류) → role+aria-label 부여 또는 인접 버킷 라벨에 병합.
- **R24** `catalog-main-content.tsx:403-417` — 넓게 보기 토글 카피가 v3 "미니맵"을 지칭
  (거짓 카피) → "시대 내비게이터를 슬림으로" 갱신(+87행 주석).
- **R25** 10년 창에서 연 정밀도 행의 leading 열이 '—' 반복(52px 낭비 + SR "대시" 노이즈)
  → 그룹 내 월·일 보유 0이면 열 접기, '—' 셀 aria-hidden.
- **R26** flash `requestAnimationFrame` 미취소(타이머만 취소) → raf id ref + cleanup.
- **R27** 선택 사건이 **숨긴 카테고리**면 배너·행 모두 부재(드로어만 열림) → 배너 분기
  "숨긴 카테고리에 있습니다 · 표시".
- **R28** 창 전환 시 hoveredEventId 잔존(mouseleave 미발화) → changeWindow에서 클리어.
- **R29** `window-list.tsx` scroll-margin-top 96px — sticky 없는데 과대, 연도 점프가 96px
  아래에서 멈춤 → 8px.
- **R30** `span-band.tsx` — width 측정 전 첫 프레임에 "기간 사건 없음" 오표시 → width 0이면
  null 반환.
- **R31** flashPulse가 prefers-reduced-motion 미존중(스크롤만 존중) → 미디어쿼리로 제거.
- **R32** 행 카테고리가 색 점 하나(aria-hidden+title은 SR 도달 불가, WCAG 1.4.1) → 행
  title/sr-only에 카테고리.
- **R33** 밴드 막대·리스트 행의 `aria-pressed`는 토글이 아님 → `aria-current` 계열(v3 승계
  관례라 일괄 정리).
- **R34** ChildMark `<span aria-label>`은 role 없어 무시, "↳"가 그대로 읽힘 → role="img"
  또는 sr-only 텍스트.
- **R35** role 없는 div의 aria-label(Breadcrumb·BandWrap)은 AT가 무시 → role="group" 부여
  또는 제거.
- **R36** roving에 Home/End 부재(ARIA toolbar 패턴·v3 기능) → 추가.
- **R37** ‹›·딥링크로 빈 구간 창 진입 시 버킷 전원 disabled → toolbar 탭 정지점 0(행
  Backspace 경로도 사망) → 빈 창에서 브레드크럼 포커스 안내 또는 첫 버킷 focusable 유지.
- **R38** SpanBar active/focus 링 갭색 `#0a0a0a` — 다크 카드 합성색 ≈#141414와 어긋나
  헤일로 → #141414 또는 단일 아웃라인.
- **R39** BucketLabel 10.5px — 버킷 20+·모바일에서 전부 말줄임(v3 labelStep 상당 부재).
  BC 시드 확장 시 노출 → k번째만 라벨.
- **R40** `events.page.tsx`(handleResetAll) — releasedFilters가 창을 **뷰와 무관하게**
  카운트, 칩은 TIMELINE 뷰 전용(기존 lane과 동일 구조라 회귀 아님 — 드릴이 주 제스처라
  빈도만 증가) → 주석 명시 또는 타임라인 축 2종 뷰 게이트.
- **R41** spec 공백 — 무효 tlw의 '첫 write 정리' 계약, BC 세기(`tlw=c-1`) parse 케이스 →
  각 1줄 추가(R5 클램프 테스트와 겸용).
- **R42** `pages/events/styles/detail.styles.ts:497-600` Timeline* styled 6종 — 사용처 0
  (v3 이전부터 죽은 코드) → 삭제.
- **R43** `MIN_SPAN_PX`·`estimateLabelWidth` export인데 외부 참조 0 → 내부로 강등.

## 검토 중 기각(재발굴 금지)

리스트 가상화(LIST 3차와 동일 결론) · 밴드/리스트 중복 표기(역할 상이) · URL↔state 루프
(양방향 직렬화 가드 확인) · lastSelfWriteRef의 뒤로가기 삼킴(replace 규약) · SpanBand 훅
순서 · 자동 로드 교착(useEvents 가드 교차 확인) · CSS.escape 음수 연도 · left 라벨 폴백의
first-fit 역행 충돌(불변식 스펙이 검증) · BC fractional 방향 · `${color}E6` 알파 ·
events 폴더 자체 표면 체계(전역 다크 스케일과의 차이는 폴더 정본) · ImportanceChip 대비
(통과) · h3→h4 헤딩 계층 · react-icons 잔재(없음) · FSD 방향(pages→widgets 합법·선례 존재).

## 배치 제안

| 배치 | 내용 | 건 |
|---|---|---|
| 1 «드릴 성립» | R1 R2 R3 + R4 R5 (P1 전부 + 실행재현 모델 결함) | 5 |
| 2 «밀도·성능» | R6 R7 R8 R30 | 4 |
| 3 «접근성» | R12 R13 R14 + R23 R31~R37 | 10 |
| 4 «시각·모바일» | R10 R11 R15 R16 R38 R39 | 6 |
| 5 «탐색 다듬기» | R9 R17 R19 R20 R21 R22 R24 R25 R27 R28 | 10 |
| 6 «경계·정리·스펙» | R18 R26 R29 R40 R41 R42 R43 | 7 |

배치 1은 실화면 검증(크롬) 전에 먼저 넣는 것을 권장 — P1이 전부 드릴 제스처를 깨므로
검증 자체가 오염된다.

## 구현 이력

- **배치 1 구현 완료(2026-08-11, 미커밋)** — R1 스크롤 리셋(직렬화 토큰 비교로 같은 창
  재설정 시 오발 방지) · R2 포커스 복원(내비게이터 내부 발화만 플래그, **실제 유실 시에만**
  복원 — ‹› 연타·미상 칩처럼 트리거가 살아 있으면 안 뺏음, 빈 창은 브레드크럼 폴백) ·
  R3 Esc `stopPropagation`(전체 창에서는 페이지 계약에 양보) · R4 연도 0 → BC 1 정규화 ·
  R5 tlw `|c|≤21` 클램프. 스펙: 모델 +2케이스(연도 0 왕복·클램프), parse spec에 c999/d2101/
  BC 세기, url-sync spec에 무효 tlw 첫 write 정리(R41 일부 선반영).
  검증: tsc 0 · 해당 lint 0 · jest 77/77(timeline+catalog).
- **배치 2 구현 완료(2026-08-11, 미커밋)** — R6 밴드 행 상한 8 + 초과분 «외 N건 — 아래
  연표에서» 집계 라인(모델 `packSpanRows`가 `{spans, overflow}` 반환으로 확장, 상한 스펙
  추가) · R7 hover 국소화(자기 hover는 CSS `:hover`, React 상태는 밴드 있는 창의 교차
  강조 전용 + `TimelineListRow` React.memo + `EraNavigator` React.memo) · R8 탭 정지점
  축소(밴드 1개·리스트 1개 — roving tabindex, 밴드 ←/→·리스트 ↑/↓·Home/End, 시작
  정지점은 마지막 포커스→선택 행→첫 행) · R30 측정 전(width 0) 첫 프레임의 '기간 사건
  없음' 오표시 제거. 검증: 대상 jest 86/86 · tsc 0 · lint 0 · 전체 스위트 신규 회귀 0
  (event-register-modal 스위트는 전체 실행에서만 실패하는 플레이크 — 단독 11/11 통과,
  기존 실패 3스위트 불변).
- **배치 3 구현 완료(2026-08-11, 미커밋)** — R12 데이터 텍스트 tertiary→secondary 승격
  (RowLeading·GroupCount·BucketCount·BandEmpty·WindowEmpty·GapCell·TotalCount) ·
  R13 sr-only `role="status"` 라이브 영역으로 창 변경 발화(자동 로드 중엔 비워 스팸 방지,
  로드 완료 시 1회) · R14 밴드 title/aria를 원시 ISO → `formatYearLabel` 조립으로 ·
  R23 GapCell `role="img"`+aria-label · R31 flashPulse reduced-motion 존중 ·
  R32 행 카테고리 sr-only 병기 · R33 `aria-pressed`→`aria-current`(막대·행) ·
  R34 **기해소**(병렬 작업의 ChildMark aria-hidden+SrOnly '○○의 하위 사건'이 이미 해결) ·
  R35 Breadcrumb·BandWrap `role="group"` · R36 내비게이터 roving Home/End ·
  R37 0건 버킷을 `disabled`→`aria-disabled`+포커스 유지로 전환(빈 창 탭 정지점 0·
  Backspace 탈출 경로 사망 해소, SR이 '0건'을 들을 수 있게 됨 — roving 대상을 전 버킷으로).
  검증: 대상 jest 92/92 · tsc 0 · lint 0.
- **배치 4 구현 완료(2026-08-11, 미커밋)** — R10 모바일(≤640px) 버킷 `min-width: 34px`+
  BucketRow 가로 스크롤, SpanBar `::after`로 히트박스 26px 확장(시각 16px 유지) ·
  R11 ColumnSegment `min-height` 제거 + h<4 컬럼은 지배 카테고리 단색 폴백(v3 미니맵
  규약 이식) · R15 inside 라벨을 반투명 암막 칩(rgba(10,10,14,0.62)) 위 흰 글씨로 —
  카테고리색과 무관하게 대비 보장 · R16 ScrollRegion vh/dvh 폴백 쌍(320/230 상수는
  실화면 검증에서 보정 예정) · R38 링 갭색 #0a0a0a→#141414 · R39 버킷 12개 초과 시
  라벨 간헐 표시(>12→2칸, >20→3칸 간격, 정보는 title/aria에 상존).
- **배치 5 구현 완료(2026-08-11, 미커밋)** — R9 `continuingIntoCenturyCount` 모델 신설
  (+스펙)·전체 단계 세기 그룹 헤더에 '이전 세기부터 계속 N건' 라인 · R17 딥링크·창
  전환 시 선택 행 1회 센터 스크롤(`data-tl-event` 속성, 사용자가 행을 직접 고른 뒤에는
  점프 안 함 — userPickedRef, R1 리셋 뒤 실행되도록 선언 순서 고정) · R19 span10 ‹›를
  세기 멤버십으로 양방향 클램프(빈 세기 도보 종료) · R20 배너를 밴드 위(스크롤
  최상단)로 · R21 브레드크럼 현재 항목 건수 병기(리스트와 같은 시작 기준 모수) ·
  R22 버킷 fullLabel에 동작 문구('들어가기'/'목록으로 이동') · R24 넓게 보기 카피
  v3 미니맵→시대 내비게이터로 정정 · R25 10년 창에서 월·일 0 그룹의 leading 열 접기
  + 잔존 '—' 셀 aria-hidden · R27 숨긴 카테고리 선택 배너('{카테고리} 표시' 액션,
  창밖 배너보다 우선) · R28 창 전환 시 hover 강조 클리어.
- **배치 6 구현 완료(2026-08-11, 미커밋)** — R18 fractionalYear `(day-1)/31`로 [0,1)
  보장(+12-31 스펙) · R26 flash rAF id 보관·취소 · R29 scroll-margin-top 96→8px ·
  R40 releasedFilters의 뷰 무관 카운트는 의도된 비대칭임을 주석 명시(게이트하면
  토스트 건수·되돌리기 스냅샷이 어긋남) · R41 **기해소 확인**(배치 1 선반영: url-sync
  '첫 write 정리'+parse c-1/c999/d2101) · R42 detail.styles Timeline* styled 6종 삭제
  (사용처 0 재확인) · R43 `MIN_SPAN_PX`·`estimateLabelWidth` export 강등.
  검증: tsc 0 · 대상 jest 94/94(신규 R9·R18 스펙 포함) · 타임라인 위젯 lint 0
  (catalog-main-content·events.page 잔여 18건은 전부 편집 범위 밖 기존 레거시).
  **이로써 43건 전량 종결** — 남은 것은 크롬 실화면 검증(R16 상수 보정 포함)뿐.
