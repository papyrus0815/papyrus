/**
 * List Styled Components
 * 이벤트 리스트 관련 스타일 — ledger polish 톤(평면, 단색, 축소된 모션) 적용.
 */
import styled, { css } from 'styled-components'

import type { HistoricalEventCategory } from '../create/events.types'
import {
  BRAND,
  CATEGORY_BADGE_COLORS,
  LIST_DENSITY,
  MOTION,
  LIST_STEPS,
  ROW_TYPE,
  SURFACE,
  rowHairline,
  SHADOW,
  metaText,
  type ListDensity,
} from './theme'

/**
 * 밀도 토큰 → CSS 변수 선언문.
 *
 * 소비처(행·그룹 헤더·스켈레톤)는 변수만 읽는다. 밀도 분기를 컴포넌트마다 흩뿌리지 않기
 * 위해 스크롤 컨테이너가 **한 번만** 선언한다.
 */
const densityVars = (density: ListDensity) => {
  const box = LIST_DENSITY[density]
  const type = ROW_TYPE[density]
  return css`
    --row-min-h: ${box.rowMinH}px;
    --row-pad-y: ${box.rowPadY}px;
    --row-pad-l: ${box.rowPadL}px;
    --row-pad-r: ${box.rowPadR}px;
    --row-col-gap: ${box.colGap}px;
    --row-act-btn: ${box.actBtn}px;
    --row-disc-btn: ${box.discBtn}px;
    --col-date: ${box.colDate}px;
    --col-chip: ${box.colChip}px;
    --col-dur: ${box.colDur}px;
    --col-flags: ${box.colFlags}px;
    --col-act: ${box.colAct}px;
    /* 7트랙(요약 열) 이상 대역에서만 소비된다 — 6트랙에서 제목은 여전히 1fr이다.
       넓은 카드에서 신축 역할이 제목 → 요약으로 넘어가므로 제목에 상한이 생긴다.

       ⚠️ 제목은 fr이 **아니라 순수 길이**다. cqw의 기준면은 eventcard(= CatalogSection)
       단일 요소라, 연도 그룹마다 RowList DOM이 갈려도 전 행이 같은 계산값을 갖는다 —
       "fr 트랙은 격자당 1개" 규약 무위반. 단계 플립 없이 연속으로 자라므로 임계 경계에서
       제목이 점프하지도 않는다. step 1 대역(카드 1322~1740)에서는 22cqw가 하한을 못 넘어
       계산값이 항상 하한 = 도입 전과 픽셀 동일이다.
       ⚠️ 이 주석 안에서 백틱을 쓰지 말 것 — styled 템플릿 리터럴이 끊겨 TS1005가 난다. */
    --col-title: clamp(${box.colTitle}px, 22cqw, ${box.colTitleMax}px);
    /* 광폭 단계(LIST_STEPS.ledger / .atlas)에서만 소비 */
    --col-date-wide: ${box.colDateWide}px;
    --col-dur-wide: ${box.colDurWide}px;
    --col-flags-wide: ${box.colFlagsWide}px;
    --col-flags-ultra: ${box.colFlagsUltra}px;
    --col-kw: ${box.colKw}px;
    --col-reg: ${box.colReg}px;
    --row-indent: ${box.indent}px;
    --row-title: ${type.title};
    --row-meta: ${type.meta};
    --row-chip: ${type.chip};
    --year-h: ${box.yearH}px;
    --year-mt: ${box.yearMt}px;
    --year-mb: ${box.yearMb}px;
    --century-gap: ${box.centuryGap}px;
    /* ⚠️ 아래 두 개는 **기존 변수** — 이름·소비처 불변, 값만 밀도에 묶는다.
       YearDivider가 top: var(--century-header-h)로 세기 헤더에 붙어 있다. */
    /* 열 헤더 높이 — sticky 3겹 사다리(열 → 세기 → 연도)의 첫 단.
       ⚠️ 세기 헤더 top과 연도 헤더 top(calc) **두 곳 모두**에 배선해야 한다.
       한 곳만 넣으면 띠가 겹치거나 사이에 슬릿이 생긴다. */
    --col-header-h: ${box.colHeaderH}px;
    --century-header-h: ${box.centuryH}px;
    --rail-inset: ${box.railInset}px;
  `
}

/**
 * 타임라인 레일 — 좌측 거터 안에 1px 수직선.
 *
 * 좌표는 세 변수가 한 세트로 소유한다: `--rail-gutter`(패딩) · `--rail-x`(축선) ·
 * `--rail-inset`(= 거터 − 축선, 밀도 토큰이 공급). 디바이더 도트와 오클루전 띠가 전부
 * `--rail-inset`을 읽으므로 밴드가 거터를 바꾸면 자동 추종한다.
 *
 * `background-attachment: local`로 스크롤 콘텐츠와 함께 흐른다(fixed/scroll와 달리
 * 콘텐츠 길이만큼 늘어나 위/아래 어디로 스크롤해도 축이 끊기지 않음).
 *
 * 축 위 눈금은 **세기·연도 앵커 도트뿐**이다 — 행 단위 도트·커넥터는 배치 C1에서 폐지했다.
 */
export const CompactList = styled.div.attrs(
  /* 실측 하네스가 스크롤 컨테이너를 잡을 손잡이. 스타일 훅이 아니라 검증용이며,
     이게 없어서 4차 검토의 측정 스크립트가 매번 부모를 거슬러 올라가야 했다. */
  () => ({ 'data-list-scroller': '' }) as Record<string, string>,
)`
  display: flex;
  flex-direction: column;
  /* gap 0 — 사건 분리 신호는 각 Stop의 hairline border-bottom으로 옮김.
   * 이전 gap:10 + transparent bg 조합은 "윗 사건 Row2"와 "아래 사건 Row1"이
   * 바로 붙어 보여 사건 단위 인지가 흐려졌음. */
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* 좌측 거터 70 → 36px.
   *
   * 거터가 70px를 점유하던 이유는 행마다 찍히던 카테고리 도트와 도트→행 커넥터였다.
   * 그 도트가 나르는 유일한 정보(카테고리)는 145px 옆 칩이 이미 한글 텍스트로 말하고
   * 있었고, 다크에서는 최빈 3개 카테고리가 1.78~2.85:1로 WCAG 1.4.11에 미달해
   * 252행 중 161행(64%)이 배경에 잠겼다. 행 도트·커넥터를 폐지하면 거터가 실어야 할
   * 것은 세기·연도 앵커 도트뿐이라 36px이면 충분하다.
   *
   * 축소분 34px은 날짜 슬롯 승격(36 → 66px)에 재투자된다 — 리딩 거터 총량은 줄지 않는다. */
  /* 하단 여백 120 → 32px. 120px은 모바일 FAB(56px) 회피가 목적인데 데스크톱에는
     FAB가 없어 아무것도 피하지 않았다 — 마지막 세기에 도착하면 화면 3분의 1이
     안내문과 빈칸이었다. 모바일에서만 안전 영역과 함께 되살린다. */
  /* 좌 36 / 우 12의 24px 비대칭은 근거가 없다. 전폭에서는 행 잉크가 우측 보더에 12px까지
     붙어 '오른쪽이 잘렸다'로 읽힌다(짧은 행에서는 여백이 보완해 주던 문제다). */
  padding: 4px 20px 32px var(--rail-gutter);
  position: relative;

  /* 레일 3좌표는 한 세트로 움직인다 — 거터(패딩) · 축선 x · 인셋(=거터-축선).
   * 인셋은 밀도 토큰이 공급하고(--rail-inset), 나머지 둘은 밴드가 정한다.
   * 셋을 따로 고치면 디바이더 도트가 축선에서 어긋난다(모바일에서 실제로 겪었던 회귀). */
  --rail-gutter: 36px;
  --rail-x: 17px;
  /* 마지막 사건 아래로 레일이 계속 이어져 목록이 끝나지 않는 것처럼 보이던 문제.
   * 축을 하단 패딩만큼 잘라 종단을 만든다. */
  --rail-tail: 104px;

  /* 행·그룹 헤더·스켈레톤이 공유하는 기하 변수 — 밀도 토큰이 단일 출처.
   * --rail-inset(디바이더·커넥터를 레일 도트에 정렬)과 --century-header-h(연도 sticky
   * 헤더의 top 오프셋)도 여기에 편입됐다 — 이름과 소비처는 그대로다.
   * ⚠️ 이 주석 안에서 백틱을 쓰지 말 것 — styled 템플릿 리터럴이 끊겨 TS1005가 난다. */
  ${densityVars('cozy')}
  &[data-density='compact'] {
    ${densityVars('compact')}
  }
  &[data-density='roomy'] {
    ${densityVars('roomy')}
  }

  /* 축선 — 좌표는 --rail-x가 소유하므로 밴드가 거터를 바꾸면 자동 추종한다.
   *
   * alpha를 0.20/0.22 → 0.32/0.34로 올린다. 행 도트를 폐지하기 전에는 축(1.38:1)이
   * 그 위의 눈금(도트)보다 흐린 역전 상태였다 — 이제 축이 유일한 선이므로 자기 몫의
   * 대비를 가져야 한다. */
  background-image: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(
          to right,
          transparent var(--rail-x),
          rgba(147, 197, 253, 0.32) var(--rail-x),
          rgba(147, 197, 253, 0.32) calc(var(--rail-x) + 1px),
          transparent calc(var(--rail-x) + 1px)
        )`
      : `linear-gradient(
          to right,
          transparent var(--rail-x),
          rgba(37, 99, 235, 0.34) var(--rail-x),
          rgba(37, 99, 235, 0.34) calc(var(--rail-x) + 1px),
          transparent calc(var(--rail-x) + 1px)
        )`};
  background-attachment: local;
  background-repeat: no-repeat;
  /* 종단 — 하단 패딩 구간에는 축을 그리지 않는다. local 첨부라 높이는 콘텐츠 전체 길이다. */
  /* 잉크는 1px인데 100% 폭 그라디언트 셰이더가 도는 건 순 낭비다(전폭에서 3,300px).
     no-repeat이 이미 걸려 있어 시각 결과는 픽셀 동일하다. */
  background-size: calc(var(--rail-x) + 2px) calc(100% - var(--rail-tail));

  /* 스크롤바 — 중립 크롬. 브랜드 파랑 20%는 라이트 표면 대비 1.33:1로 사실상 안 보였고,
     브랜드 hue를 중립 크롬에 쓰는 것 자체가 BRAND 규약(primary CTA·활성 상태 전용) 위반이다.
     ⚠️ 폭 6 → 10은 카드 크롬을 바꾸므로 theme.ts LIST_STEPS를 같이 재유도해야 한다. */
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(15, 23, 42, 0.28)'};
    border-radius: 5px;
    /* 트랙에 붙지 않게 안쪽으로 — 배경색 보더는 표면색을 따라간다 */
    border: 2px solid transparent;
    background-clip: content-box;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.34)'
        : 'rgba(15, 23, 42, 0.40)'};
    background-clip: content-box;
  }
  /* Firefox는 표준 속성이 없으면 OS 기본(약 15px)을 그려 임계 산식이 어긋난다. */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(15, 23, 42, 0.28)'}
    transparent;
  /* 스크롤바 유무로 행 폭이 흔들리지 않게 자리를 미리 예약한다 */
  scrollbar-gutter: stable;
  /* 목록 끝에서 스크롤이 조상으로 체이닝되던 문제 — 드로어에는 이미 있고 목록에만 없었다 */
  overscroll-behavior: contain;

  @media (max-width: 768px) {
    max-height: none;
  }

  /* ── 대역 사다리 ──────────────────────────────────────────────────────────
   *
   * 예전에는 임계가 640 하나뿐이라 641~1023px가 '적응 없는 붕괴 대역'이었다.
   * 실측 641px에서 제목 잘림 125/252행·국가칩 중간 절단 127행인데, 640px에서는
   * 각각 1행/0행 — 1px 좁히면 좋아지는 역전 자체가 중간 단계가 없다는 증거였다.
   * iPad 세로(834)·iPhone 가로(844)·1440 노트북 200% 확대(720)가 전부 여기 착지한다.
   *
   * 고정 트랙 합을 대역마다 줄여 제목 트랙에 폭을 돌려준다.
   * 어떤 대역에서도 열을 **없애지는 않는다** — 기간·국가는 정보이고, 뷰포트가 좁다는
   * 이유로 정보를 통째로 감추면 그게 바로 이전 라운드가 지적당한 패턴이다. */
  @media (max-width: 1179px) {
    --col-date: 62px;
    --col-chip: 56px;
    --col-dur: 52px;
    --col-flags: 96px;
    --col-act: 58px;
    --row-col-gap: 10px;
  }

  @media (max-width: 1024px) {
    --rail-gutter: 24px;
    --rail-x: 11px;
    && {
      --rail-inset: 13px;
    }
  }

  @media (max-width: 899px) {
    --col-date: 58px;
    --col-chip: 52px;
    --col-dur: 48px;
    --col-flags: 60px;
    --col-act: 56px;
    --row-col-gap: 8px;
  }

  /* 모바일 — 좁은 폭에서 거터를 더 줄이고 축선을 12px로 동기화. */
  @media (max-width: 640px) {
    /* 모바일 거터(24px)·레일(12px)에 맞춰 인셋 축소 → 디바이더/커넥터가 레일에 재정렬.
     *
     * ⚠️ 앰퍼샌드를 두 번 겹쳐 특이도를 2배로 올린다. 밀도 변수를 속성 선택자
     * [data-density=...](0,2,0)로 선언하기 때문에, 여기서 단일 앰퍼샌드(0,1,0)로 쓰면
     * 모바일에서 밀도 선택자가 이겨 레일 인셋이 데스크톱 값(24~38px)으로 되돌아간다 —
     * 디바이더가 화면 밖으로 삐져나가던 그 회귀다. */
    && {
      --rail-inset: 12px;
    }
    --rail-gutter: 24px;
    --rail-x: 11px;
    /* 배경 그라디언트는 --rail-x를 읽으므로 여기서 재선언할 필요가 없다
       (이전에는 11/12px 리터럴을 두 번째로 적어 두 좌표가 따로 놀았다). */
    padding: 4px 10px max(96px, env(safe-area-inset-bottom)) var(--rail-gutter);
  }

  /* ≤400px — 메타 줄이 1px 차이로 넘쳐 3줄로 무너지던 구간(실측 320px).
     행 좌우 패딩에서 8px를 회수해 임계를 넘긴다. */
  @media (max-width: 400px) {
    --row-pad-l: 10px;
    --row-pad-r: 8px;
    /* 들여쓰기 24px는 320px 화면에서 폭의 7.5%다. 하위 사건 행이 그만큼 오른쪽으로
       밀려 메타 줄이 넘치고 3줄이 됐다(실측: 320px에서 depth 1 행만 94px).
       계층은 여전히 읽히되 폭을 덜 먹는 12px로. */
    --row-indent: 12px;
  }
`

/**
 * 행 격자의 **단일 출처**.
 *
 * 소비처: `Body`(event-list-item.tsx) · `SkeletonBody`(event-compact-list.tsx).
 * 세 곳이 각자 트랙을 선언하면 다음 격자 변경에서 반드시 갈린다 — 실제로 스켈레톤이
 * `display:flex; max-width:880px`로 남아 있어서, 전폭에서 로딩(880px) → 데이터(3,294px)
 * 가로 점프가 났다.
 *
 * ── 열 사다리 ────────────────────────────────────────────────────────────────
 * 폭이 늘면 **먼저 고정 열이 켜지거나 넓어져 폭을 지출하고, 잔량만 싱크(`[sum]`)로 간다.**
 * 이것이 캡 없이도 '행 안쪽 빈 밴드'가 안 생기는 이유다. 반대로 싱크를 끄면 fr이 사라져
 * 죽은 폭이 즉시 부활하므로 **싱크는 어느 단계에서도 끌 수 없다.**
 *
 * ── 불변식 ────────────────────────────────────────────────────────────────────
 * ⑴ 어느 단계에서도 `minmax(0, 1fr)`는 **정확히 1개**다.
 * ⑵ 나머지 트랙은 전부 순수 길이(px 또는 clamp/cqw)다. `subgrid`·`auto`·`max-content`·
 *    `min-content`·`fit-content`는 0개 — 연도 그룹마다 RowList DOM이 갈려도 모든 행 박스
 *    폭이 같고, 따라서 1fr 계산값도 전 행 동일하다. 이것이 subgrid 없이 열을 세우는
 *    유일한 정공법이다.
 * ⑶ 열 **순서는 전 단계 동일**하다. 단계가 바꾸는 것은 '어떤 열이 있는가'와 고정 폭뿐이라,
 *    셀은 전부 `grid-column: <라인이름>`으로 배치되고 JSX는 단계를 모른다.
 * ⑷ `[sumend]`는 요약 트랙 **직후**의 라인 이름이다. 설명이 없는 행에서 제목이
 *    `grid-column: title / sumend`로 요약 자리를 삼켜, 빈 셀이 행 *중간*에 남지 않게 한다.
 *    step 0에는 `[sum]`이 없어 `[sumend]`가 제목 직후라 그 선언이 자동으로 no-op이 된다.
 *    ⚠️ `span`을 라인 이름으로 쓰지 말 것 — `grid-column: span N` 키워드와 충돌한다.
 */
export const rowGridTemplate = css`
  display: grid;
  column-gap: var(--row-col-gap);
  /* 베이스라인 정렬 — center는 칩 라인박스(15.75px)와 제목(18.2px)이 어긋나
     전 행에서 1.51px 드리프트를 만든다. 상자형 셀만 center로 예외 처리한다. */
  align-items: baseline;

  /* ── step 0 (카드 < summary) — 6트랙. 신축은 제목. */
  grid-template-columns:
    [date] var(--col-date)
    [cat] var(--col-chip)
    [title] minmax(0, 1fr)
    [sumend dur] var(--col-dur)
    [flags] var(--col-flags)
    [act] var(--col-act);

  /* ── step 1 summary — 7트랙. 신축이 제목 → 설명으로. 임계·트랙 폭 모두 현행 그대로.
       제목 자연 폭 p50이 177px이라 6트랙에서 카드를 넓히면 트랙만 커지고 잉크는 안 커졌다
       — 흡수체를 하나 더 세워야 캡을 풀 수 있고, 그 자리에 설명(목록 응답에 이미 실려
       오면서 0픽셀도 안 그려지던 필드)을 놓는다. */
  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
    grid-template-columns:
      [date] var(--col-date)
      [cat] var(--col-chip)
      [title] minmax(0, var(--col-title))
      [sum] minmax(0, 1fr)
      [sumend dur] var(--col-dur)
      [flags] var(--col-flags)
      [act] var(--col-act);
  }

  /* ── step 2 ledger — 8트랙. 키워드 열이 켜지고, 기간(다년 사건이 앞자리부터 잘리던 폭)과
       관련국이 넓어진다. */
  @container eventcard (min-width: ${LIST_STEPS.ledger}px) {
    --col-dur: var(--col-dur-wide);
    --col-flags: var(--col-flags-wide);
    grid-template-columns:
      [date] var(--col-date)
      [cat] var(--col-chip)
      [title] minmax(0, var(--col-title))
      [sum] minmax(0, 1fr)
      [sumend kw] var(--col-kw)
      [dur] var(--col-dur)
      [flags] var(--col-flags)
      [act] var(--col-act);
  }

  /* ── step 3 atlas — 9트랙. 등록 시각이 켜지고(‘등록순’ 정렬의 근거가 화면에 0픽셀이던
       문제), 날짜(BC·YYYY.M.D 극단값)와 관련국이 한 번 더 넓어진다. */
  @container eventcard (min-width: ${LIST_STEPS.atlas}px) {
    --col-date: var(--col-date-wide);
    --col-dur: var(--col-dur-wide);
    --col-flags: var(--col-flags-ultra);
    grid-template-columns:
      [date] var(--col-date)
      [cat] var(--col-chip)
      [title] minmax(0, var(--col-title))
      [sum] minmax(0, 1fr)
      [sumend kw] var(--col-kw)
      [dur] var(--col-dur)
      [flags] var(--col-flags)
      [reg] var(--col-reg)
      [act] var(--col-act);
  }
`

/*
 * (제거됨) 레거시 카드 시스템 styled export 26개 — 전부 참조 0이었다(합계 617줄 = 이
 * 파일의 3분의 1). 목록 시각을 고치러 온 사람이 가장 먼저 여는 파일에서, 그 3분의 1이
 * 화면에 0픽셀도 그리지 않는 코드였다.
 *
 *   CompactListItem · CompactListBody · CompactThumbnail · CompactCategoryBadge ·
 *   CompactListContent · CompactListHeader · ExpandButton · ExpandSpacer ·
 *   CompactCategoryDot · CompactListTitle · CompactListMeta · TimelineDateWrapper ·
 *   TimelineDateRow · TimelineDuration · DateDivider · SimpleYearLabel ·
 *   CompactListSummary · ImportanceBadge · SummaryIconButton · ResultControls ·
 *   ToolbarMeta · ToolbarToggle · ToolbarToggleText · ToolbarToggleLabel ·
 *   ToolbarToggleDescription · SortDirectionToggle
 *
 * ⚠️ 이 중 여럿은 **폐지가 확정된 신호**를 담고 있었다(행 단위 카테고리 도트, 중요도 별,
 *    SHADOW.sm hover lift). 살아 있으면 다음 검토가 그것들을 현행 규약으로 읽는다.
 *    되살리지 말 것 — 필요하면 지금 규약(행 격자 + 밀도 토큰) 위에서 새로 만들 것.
 */
/**
 * sticky 열 헤더 — 스크롤 컨테이너의 첫 자식.
 *
 * 초광폭에서 행이 최대 9트랙까지 벌어지는데 "이 열이 무엇인가"를 말하는 지면이 없으면
 * 키워드 칩과 관련국 칩, 기간과 등록 시각이 서로 구별되지 않는다. 26px 마이크로 헤더가
 * 그 질문에 답하는 가장 싼 수단이다.
 *
 * ⚠️ 트랙은 rowGridTemplate **같은 출처**를 읽는다 — subgrid가 필요 없고 fr 트랙도 여전히
 *    1개다. 라벨은 각자 grid-column으로 배치되므로 열이 꺼지면 라벨도 함께 사라진다.
 *
 * ⚠️ sticky 3겹 사다리(열 → 세기 → 연도)의 **첫 단**이다. --col-header-h를 세기 헤더의
 *    top과 연도 헤더의 top(calc) 두 곳에 배선하지 않으면 띠가 겹치거나 사이에 슬릿이 생긴다.
 *    이 축은 예전 검토가 "적층 34겹 → 1겹"으로 고친 바로 그 축이라 특히 조심할 것.
 */
export const ColumnHeader = styled.div`
  ${rowGridTemplate}
  align-items: center;
  position: sticky;
  top: 0;
  /* 세기 6 · 연도 5 위 */
  z-index: 7;
  box-sizing: border-box;
  min-height: var(--col-header-h, 26px);
  /* 행과 같은 좌우 인셋 — 라벨 x가 셀 x와 어긋나면 헤더가 오히려 오독을 만든다.
     좌측은 레일까지 당기고(margin) 그만큼 안쪽으로 되민다(padding). */
  margin: 0 calc(-1 * var(--row-pad-r)) 2px calc(-1 * var(--rail-inset));
  padding: 0 var(--row-pad-r) 0 calc(var(--rail-inset) + var(--row-pad-l));
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: ${metaText};
  /* ⚠️ 반투명 금지 — 아래 행이 비친다(세기 헤더가 같은 이유로 솔리드로 고쳐져 있다) */
  background: ${({ theme }) =>
    theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised};
  border-bottom: 1px solid ${rowHairline};

  /* 밀도 컨트롤이 숨는 임계와 정합 — 좁은 폭에서는 행이 2줄/압축 규약이라 열이 없다 */
  @media (max-width: 899px) {
    display: none;
  }
`

/**
 * 열 헤더의 라벨 한 칸.
 *
 * ⚠️ `$showFrom`은 선택이 아니라 **필수 규약**이다. 존재하지 않는 라인 이름으로
 * `grid-column`을 걸면 CSS가 조용히 **암묵 트랙**을 만들어 헤더가 행보다 넓어진다.
 * 그래서 늦게 켜지는 열(sum·kw·reg)은 자기 단계에 도달할 때까지 박스를 만들지 않는다 —
 * 행 셀(`Snippet`·`KeywordCell`·`RegisteredCell`)이 쓰는 것과 **같은 게이트**다.
 */
export const ColumnHeaderCell = styled.span<{
  $col: string
  $align?: 'right'
  /** 이 라벨이 켜지는 컨테이너 폭(LIST_STEPS 값). 생략 = step 0부터 항상 존재하는 열 */
  $showFrom?: number
}>`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: ${({ $align }) => $align ?? 'left'};

  ${({ $col, $showFrom }) =>
    $showFrom === undefined
      ? css`
          grid-column: ${$col};
        `
      : css`
          display: none;

          @container eventcard (min-width: ${$showFrom}px) {
            display: block;
            grid-column: ${$col};
          }
        `}
`

export type ListItemImportance = 'critical' | 'major' | 'normal'

/* 평면 톤 — hover scale 제거. */
/* 좌측 leading line — 의미 없는 ━━━ 글리프(SR에 읽힘) 제거 후 CSS pseudo border로 대체. */
export const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  border-top-color: ${({ theme }) =>
    theme.mode === 'dark' ? '#2563eb' : '#94a3b8'};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

/* 평면 톤 — hover scale/box-shadow 변화 제거. 도트 색만 단색 유지. */
/**
 * 연도 구분 — 트렌디 톤. dot/ring/chip 모두 제거, 단순 텍스트 + 회색 카운트 + 작은 chevron.
 * sticky로 현재 연도가 화면 상단에 고정 (top: 38px — CenturyDivider 아래에 stack).
 */
/**
 * 연도 헤더 — 타임라인 *눈금 + 라벨* 형태.
 *
 * 풀 블리드 frosted 띠 제거. 좌측 레일(32px)에 외곽선 도트만 두고
 * "1985년 N건" 라벨은 도트 옆 인라인. sticky로 스크롤 중에도 현재 연도가 위에 붙음.
 * sticky 시 살짝의 frosted bg로 아래 콘텐츠 occlusion만 방지.
 */
/**
 * 연도 헤더 v2 — 사건 분리 hairline과 시각 구별 강화.
 *
 * 변경 핵심:
 *  - 위쪽 풀 블리드 1px hairline(border-top) → "새 연도 섹션 시작" 명시 시그널
 *  - 라벨 크기 12 → 14, 솔리드 indigo 도트(이전 outline)로 anchor 강화
 *  - 위 여백 14 → 22, 아래 여백 2 → 8 — 사건 단위 hairline과 위계 분리
 */
/**
 * 세기 섹션 / 연도 섹션 래퍼.
 *
 * **sticky의 containing block을 만드는 것이 유일한 존재 이유다.**
 * 이전엔 세기·연도 헤더가 스크롤 컨테이너(CompactList)의 직접 자식이라 sticky 범위가
 * *목록 전체*였다. 그래서 스크롤을 지나친 헤더가 하나도 밀려나지 않고 전부 같은
 * top 오프셋에 쌓였다 — 실측상 scrollTop 6000에서 연도 헤더 **34개**가 동시에 stuck.
 * 오클루전 띠가 alpha 0.95라 겹칠수록 아래 헤더의 글자가 비쳐 유령 텍스트가 됐다.
 * 각 그룹을 자기 박스로 감싸면 그룹이 화면을 벗어날 때 헤더도 함께 밀려난다.
 *
 * display: contents는 쓸 수 없다 — 박스가 생성되지 않아 containing block도 안 생긴다.
 */
export const CenturySection = styled.div`
  display: flex;
  flex-direction: column;
  /* 세기 사이 간격 — 이전엔 CenturyDivider의 margin-top: 28px이 담당했으나
   * 이제 헤더가 항상 섹션의 first-child라 그 규칙이 전 세기에 걸린다. 간격은 섹션 간으로 옮긴다. */
  & + & {
    margin-top: var(--century-gap);
  }
`

/**
 * 기록 공백 표지 — 연 그룹 사이가 10년 이상 벌어질 때만 나타난다.
 *
 * 여백만 키우면 '왜 벌어졌는지'를 사용자가 추론해야 하고, 라벨만 달면 스크롤 감각과
 * 어긋난다. 둘을 함께 둔다 — 여백은 순서(더 크다)를, 라벨은 정확한 값을 싣는다.
 * 축(레일) 위에 그리지 않고 콘텐츠 폭에 두어 '시간축을 끊는 눈금'이 아니라
 * '이 구간에 데이터가 없다'는 **데이터에 대한 진술**로 읽히게 한다.
 */
export const GapMarker = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px calc(-1 * var(--rail-inset));
  padding-left: var(--rail-inset);
  font-size: var(--row-meta, 12px);
  font-weight: 500;
  letter-spacing: 0;
  color: ${metaText};
  font-variant-numeric: tabular-nums;
  user-select: none;

  /* 점선 rule — 실선은 그룹 hairline과 같은 무게라 '경계'로 오독된다. */
  &::after {
    content: '';
    flex: 1;
    height: 0;
    border-top: 1px dashed
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.14)'
          : 'rgba(15, 23, 42, 0.14)'};
  }
`

export const YearSection = styled.div`
  display: flex;
  flex-direction: column;

  /* 공백 크기에 비례한 추가 여백 — 인라인 변수로 그룹마다 주입한다.
     선언이 없으면 0이라 기존 리듬 그대로다. */
  margin-top: var(--gap-space, 0);

  /* 세기 헤더 직후 첫 연도 헤더 — 세기 하단 hairline과 이중선이 되지 않게 상단선 제거.
   * (이전 규칙 'CenturyDivider + button'은 래퍼 도입으로 형제 관계가 끊겨 대체된다.) */
  &:first-of-type > button {
    border-top: none;
    margin-top: 12px;
  }

  /* 연 그룹의 마지막 행 — 다음 헤더가 자기 상단 hairline을 그리므로 이중선 방지.
   * (이전 규칙 'Stop:has(+ button)'도 형제 관계가 끊겨 대체된다.)
   * ⚠️ 행은 RowList 안에 있다(role=list 구조를 적법하게 만들기 위한 래퍼) — 섹션의
   * 직속 마지막 자식은 RowList 자신이므로 한 단계 더 들어가야 한다. */
  & > *:last-child,
  & > *:last-child > *:last-child {
    border-bottom: none;
  }
`

/**
 * 그룹 헤딩 — **시각적으로는 숨기고 접근성 트리에만 남긴다**.
 *
 * 세기·연도 구분자는 접기 버튼이라 role이 button이어야 하고, 한 요소가 heading과 button을
 * 동시에 가질 수는 없다. 그래서 이 화면에는 heading이 페이지 전체에 단 1개뿐이었고
 * 스크린리더 사용자가 세기·연도 섹션 사이를 헤딩 탐색으로 건너뛸 방법이 없었다(검토 A11Y-3).
 *
 * 헤딩을 별도 요소로 두면 ⑴ 헤딩 탐색이 살아나고 ⑵ 그 id로 섹션(role=group)과 행 목록을
 * aria-labelledby로 묶어 '이 행이 어느 연도/세기에 속하는가'가 프로그램적으로 전달된다.
 * 버튼을 감싸지 않고 형제로 두는 이유는 sticky 때문 — 버튼을 heading으로 감싸면 sticky의
 * containing block이 그 heading이 되어 고정이 아예 동작하지 않는다.
 */
export const GroupHeading = styled.h3`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

/**
 * 한 연도 그룹의 행 목록.
 *
 * `role="list"`는 자식으로 listitem만 허용한다. 예전엔 스크롤 컨테이너 자체가 list라
 * 그 안의 세기·연도 접기 버튼 99개가 전부 허용되지 않는 자식이었다(실측: list 직속 자식
 * 333개 = listitem 233 + button 99 + status 1). 행만 감싸는 list를 따로 두어
 * 구조를 적법하게 만들고, 헤딩과 aria-labelledby로 묶는다.
 */
export const RowList = styled.div`
  display: flex;
  flex-direction: column;
`

export const YearDivider = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  /* 세로 예산의 31%가 연도 헤더였다(88개 × 63px = 5,500px, 스크롤 총량 17,903px 중).
     밀도 토큰이 소유하게 해 조밀 모드에서 실제로 줄어들게 한다. */
  margin: var(--year-mt) -12px var(--year-mb) calc(-1 * var(--rail-inset));
  padding: 6px 12px 6px var(--rail-inset);
  min-height: var(--year-h);
  border: none;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  border-radius: 0;
  cursor: pointer;
  text-align: left;
  background: transparent;
  position: sticky;
  /* 사다리의 세 번째 단 — 열 헤더 + 세기 헤더 높이만큼 내려온다 */
  top: calc(var(--col-header-h, 26px) + var(--century-header-h, 44px));
  z-index: 5;
  transition: background 0.15s ease-out;
  align-self: stretch;

  /* 레일 위 솔리드 indigo 도트 — 시각 anchor. 이전 outline은 약했음. */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${BRAND.primary};
    box-shadow: 0 0 0 2.5px
      ${({ theme }) => (theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised)};
    z-index: 1;
    pointer-events: none;
  }

  /* sticky 시 라벨 쪽 오클루전 띠 — 본문 텍스트 위에 떠도 가독 유지.
   * 도트(left:0)와 라벨 시작(padding-left) 사이는 transparent — 레일이 그대로 보임.
   *
   * ⚠️ left는 반드시 var(--rail-inset). 이전엔 38px 데스크톱 값이 하드코딩돼 있어
   * 모바일(--rail-inset: 12px)에서 라벨 앞 26px에 배경이 없었고, 스크롤 시 그 구간으로
   * 본문 제목이 비쳐 라벨과 겹쳐 읽혔다.
   *
   * ⚠️ 반투명 금지. alpha 0.94~0.95는 한 겹만으로도 아래 행이 5~6% 비친다(헤더가 여러 겹
   * stuck되던 시절엔 유령 텍스트로 누적됐다). 실측 표면색으로 완전 불투명하게 덮는다 —
   * 라이트 #ffffff / 다크 #141414(카드 #0f0f0f + rgba(255,255,255,0.02) 합성 결과). */
  &::after {
    content: '';
    position: absolute;
    left: var(--rail-inset);
    top: 0;
    right: 0;
    bottom: 0;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised};
    z-index: -1;
  }

  /* (제거됨) 예전의 '&:first-child { margin-top:0; border-top:none }'.
   * YearSection 래퍼 도입 후에는 **모든** 연도 헤더가 자기 섹션의 first-child라
   * 이 규칙이 전 헤더에 걸려 연 그룹 사이 구분선이 통째로 사라졌다.
   * 목록 최상단 처리는 CenturySection(첫 섹션은 margin-top 없음)과
   * YearSection:first-of-type(세기 직후 상단선 제거)이 나눠 맡는다. */

  /* 라벨 (chevron + 연도) — 도트 옆 인라인.
   *
   * ⚠️ 반드시 **자식 결합자**여야 한다. 후손 선택자(span)면 이 규칙이 안쪽 CollapsedCount
   * (자기 클래스, 특이도 0,1,0)까지 이겨서 카운트가 14px/700 primary로 렌더된다 —
   * 그러면 '2026년 6'이 한국어에서 **'2026년 6월'로 읽힌다**. 바로 아래 행들이 '7.27'처럼
   * 월.일을 쓰고 있어 오독이 강화됐고, aria-label은 정확했기 때문에 시각 층에서만
   * 발생하는 결함이었다. */
  & > span {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};

    svg {
      color: ${metaText};
      flex-shrink: 0;
      align-self: center;
      /* 행 디스클로저(0.15s)와 같은 토큰 — 같은 제스처가 두 속도로 갈리지 않게 */
      transition: transform ${MOTION.fast};
    }
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(15, 23, 42, 0.03)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    svg {
      transition: none;
    }
  }
`

/* '연도 미상' 전용 — 확정 연도(solid indigo 앵커)와 시각 무게를 구별. 도트를 hollow·muted로
 * 강등해 '이 구간은 불확실한 catch-all'임을 신호한다(1985년 같은 datum으로 오독 방지). */
export const UnknownYearDivider = styled(YearDivider)`
  /* 이 헤더는 as="div"로 렌더되는 **비대화형** 요소다. YearDivider의 hover 배경을 그대로
   * 상속하면 '접을 수 있다'고 약속해 놓고 아무 일도 하지 않는다(검토 VIS-9). */
  cursor: default;
  &:hover {
    background: transparent;
  }

  &::before {
    width: 8px;
    height: 8px;
    background: ${({ theme }) => (theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised)};
    border: 1.5px solid ${({ theme }) => theme.colors.text.tertiary};
  }
  span {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/* 연도 옆 카운트 — chip 제거, 회색 datum-style 숫자 */
/**
 * 연도 옆 카운트.
 *
 * ⚠️ 단위 '건'을 반드시 붙여 쓸 것. 숫자만 두면 '2026년 6'이 6월로 읽힌다.
 * 특이도 함정은 YearDivider 쪽에서 자식 결합자로 막았지만, 단위는 두 번째 방어선이다.
 */
export const CollapsedCount = styled.span`
  font-size: var(--row-meta, 12px);
  font-weight: 600;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
  flex-shrink: 0;
`

/**
 * 세기 구분 헤더 — 시대 단위 분리. *Linear/Vercel 스타일*: frosted glass + hairline.
 *
 * 디자인 원칙:
 *  - 그라데이션·강한 indigo 배경 제거 (트렌디 톤)
 *  - 위계는 *타이포 크기·굵기*로만 (16px 800 weight)
 *  - 1px hairline 하단 + frosted glass 배경 (sticky 시 자연스러운 부유감)
 *  - 카운트는 회색 숫자 (chip 외곽 제거)
 */
/**
 * 세기 헤더 — 시대 *분기점* 톤.
 *
 * 위/아래 1px hairline 한 쌍으로 시대 경계 분명. 좌측 레일에 큰 솔리드 도트.
 * 본문 폭 안에서만 hairline (margin -38px 시작 → 풀 블리드 X). frosted bg는 sticky 시 occlusion 방지용.
 */
export const CenturyDivider = styled.button`
  display: flex;
  align-items: center;
  /* ⚠️ space-between 금지 — 전폭 3440에서 세기 라벨과 건수가 3,000px 넘게 벌어져
     한 헤더의 두 조각이 서로 다른 정보처럼 읽혔다. 좌측 클러스터로 묶는다.
     자식(라벨/연도범위/건수)이 이미 별도 span이라 JSX 변경은 0이다. */
  justify-content: flex-start;
  gap: 10px;
  /* 좌측은 레일까지 당기고 우측은 컨테이너 패딩(12px)까지 — YearDivider와 **같은 블리드**.
   * 이전엔 margin-right:-rail 과 width:calc(100% + rail)이 함께 걸려 우측 끝이
   * 콘텐츠 박스 경계에 멈췄고, YearDivider(우측 -12px까지 확장)보다 12px 짧아
   * 두 hairline의 오른쪽 끝이 계단처럼 어긋났다. width 선언을 지우고 stretch에 맡긴다. */
  /* 세기 사이 간격은 'CenturySection + CenturySection'이 담당한다 — 여기서 margin-top을
   * 주면 섹션 간격과 이중으로 더해진다. (예전엔 &:first-child로 상쇄했는데, 접근성용
   * GroupHeading이 섹션의 첫 자식이 되면서 그 규칙이 더 이상 매칭되지 않았다.) */
  margin: 0 -12px var(--year-mb) calc(-1 * var(--rail-inset));
  padding: 8px 16px 8px var(--rail-inset);
  /* --century-header-h를 '선언된 상수'가 아니라 '실제 높이'로 만든다.
   * YearDivider가 top: var(--century-header-h)로 이 값에 붙으므로, 상수(44px)와 실측
   * 높이(41px)가 어긋나면 두 sticky 띠 사이에 3px 슬릿이 생긴다. */
  box-sizing: border-box;
  min-height: var(--century-header-h, 44px);
  /* hairline 2줄 제거 — 세기·연도 헤더가 **같은 굵기** hairline을 쓰던 탓에 목록
     최상단 130px에 동일한 선이 3줄 쌓여, 시대 분기점이라는 사건이 오히려 희석됐다.
     세기 경계는 이제 여백과 타입 크기가 만든다(연도 hairline은 그대로 둔다). */
  border: none;
  border-radius: 0;
  cursor: pointer;
  text-align: left;
  position: sticky;
  /* 열 헤더 아래에 붙는다 — sticky 3겹 사다리의 두 번째 단 */
  top: var(--col-header-h, 26px);
  z-index: 6;
  /* ⚠️ 반투명 금지. 연 헤더는 같은 이유로 이미 솔리드로 고쳐져 있었는데(alpha 0.94에서도
     아래 행이 5~6% 비친다) 세기 헤더만 0.78/0.82로 남아 있었다. 세기 헤더는 섹션 전체
     구간에서 상시 stuck이라 비침이 가장 오래 노출되는 표면이고, blur까지 겹쳐 라벨 뒤에
     회색 얼룩을 만들었다. 실측 표면색으로 완전히 덮는다. */
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${SURFACE.dark.raised};
          color: ${theme.colors.text.primary};
        `
      : css`
          background: #ffffff;
          color: ${theme.colors.text.primary};
        `}
  transition: background 0.15s ease-out;

  /* 레일(divider padding-box left=rail) 솔리드 큰 도트 — 시대 분기 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translate(-50%, -50%);
    /* 세기 16 : 연도 10 = 1.6× — 두 단계가 '조금 다른 같은 것'으로 보이던 문제. */
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${BRAND.primary};
    box-shadow: 0 0 0 3px
      ${({ theme }) => (theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised)};
    z-index: 1;
    pointer-events: none;
  }


  /* (제거됨) 예전의 '& + button' — 세기 직후 첫 연도 divider 상단선 제거.
   * YearSection 래퍼가 생기며 형제 관계가 끊겼다. 같은 역할을 YearSection의
   * '&:first-of-type > button'이 이어받는다. */

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.03)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const CenturyDividerLabel = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  /* 세기 20 : 연도 14 = 1.43×. 16px일 때는 1.14×라 스크롤 중 '시대가 바뀐 것인지
     해가 바뀐 것인지'를 라벨을 읽어야만 알 수 있었다. */
  font-size: 20px;
  /* 800은 레포 전체에서 여기 한 곳뿐이었다 — 위계는 크기(20 vs 14)가 이미 만들고 있고,
     굵기까지 최대치를 쓰면 화면에서 가장 큰 텍스트가 필요 이상으로 무거워진다. */
  font-weight: 700;
  /* 같은 레포가 "한글에 라틴 트래킹을 그대로 쓰지 않는다"를 명문화해 놓고, 정작 화면에서
     가장 큰 텍스트가 -0.02em으로 그 규약을 어기고 있었다. */
  letter-spacing: -0.01em;
  /* 세기 숫자가 자릿수에 따라 흔들리지 않게 — 형제(연도·건수)에는 이미 걸려 있었다 */
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};

  svg {
    color: ${metaText};
    flex-shrink: 0;
    align-self: center;
    /* 같은 제스처(접기/펼치기)가 그룹 헤더 0.3s vs 행 디스클로저 0.15s로 2배 갈려
       "연도 헤더는 느리다"는 인상을 줬다. 토큰으로 통일한다. */
    transition: transform ${MOTION.fast};
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`

export const CenturyDividerYears = styled.span`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

/* 카운트 — chip 외곽 제거, 단색 회색 숫자만 (datum-style) */
export const CenturyDividerCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.005em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/**
 * 접힌 연도 — 타임라인 *압축 구간* 인상.
 *
 * 1. 사선 해치 패턴 배경 — "이 구간은 표시되지 않음"을 시각적으로 즉시 인지
 * 2. 좌측 도트는 레일(left:32px = placeholder 좌측에서 -38px)에 정렬, surface 외곽 링으로 *비어있는* 인상
 * 3. 도트 → placeholder 연결선은 1px dashed (시간이 흘렀음을 암시)
 * 4. 컴팩트한 한 줄 — Year/Century divider 사이의 *여백* 대용으로 가볍게
 */
export const CollapsedPlaceholder = styled.div`
  /* '압축 구간'인데 펼친 행만큼 두꺼우면 접기가 공간을 안 아낀다 → 얇은 밴드(~40→~24px)로
   * 눌러 '이 구간은 압축됨' 인상을 강화한다. */
  margin: 1px 0 4px 0;
  padding: 4px 14px;
  border-radius: 8px;
  text-align: center;
  position: relative;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background-color: rgba(37, 99, 235, 0.025);
          background-image: repeating-linear-gradient(
            -45deg,
            transparent 0,
            transparent 4px,
            rgba(147, 197, 253, 0.045) 4px,
            rgba(147, 197, 253, 0.045) 7px
          );
          border: 1px dashed rgba(147, 197, 253, 0.18);
        `
      : css`
          background-color: rgba(37, 99, 235, 0.02);
          background-image: repeating-linear-gradient(
            -45deg,
            transparent 0,
            transparent 4px,
            rgba(37, 99, 235, 0.045) 4px,
            rgba(37, 99, 235, 0.045) 7px
          );
          border: 1px dashed rgba(37, 99, 235, 0.22);
        `}

  /* 레일 → placeholder 연결선 */
  &::before {
    content: '';
    position: absolute;
    left: calc(-1 * var(--rail-inset));
    top: 50%;
    width: var(--rail-inset);
    height: 1px;
    border-top: 1px dashed
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(147, 197, 253, 0.35)'
          : 'rgba(37, 99, 235, 0.35)'};
  }

  /* 레일 위 *비어있는* 도트 — Year 도트와 같은 톤이지만 한 단계 흐리게.
   * surface 색 외곽 링으로 도트가 레일 위에 *얹힌* 듯 보이게. */
  &::after {
    content: '';
    position: absolute;
    left: calc(-1 * var(--rail-inset));
    top: 50%;
    transform: translate(-50%, -50%);
    width: 7px;
    height: 7px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised};
    border: 1.5px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(147, 197, 253, 0.4)'
          : 'rgba(37, 99, 235, 0.4)'};
    border-radius: 50%;
  }

  span {
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: -0.005em;
    /* 접힌 밴드의 유일한 콘텐츠 — 하드코딩 슬레이트(#94a3b8 2.56:1 / #64748b 4.02:1)는
     * 양쪽 테마 모두 AA 미달이라 밴드가 빈 띠처럼 보였다. 프로젝트 스케일 밖 값이기도 하다. */
    color: ${metaText};
    font-variant-numeric: tabular-nums;
  }
`

export const EmptyCatalogState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  padding: 80px 40px;
  position: relative;
  margin-left: 40px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
      to bottom,
      ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#e2e8f0'}
        0%,
      ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.25)' : '#cbd5e1'}
        50%,
      ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#e2e8f0'}
        100%
    );
  }

  &::after {
    content: '';
    position: absolute;
    left: -7px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
    border: 2px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#cbd5e1'};
    box-shadow: 0 0 0 4px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(37, 99, 235, 0.08)'
          : 'rgba(226, 232, 240, 0.3)'};
  }

  @media (max-width: 768px) {
    padding: 60px 30px;
    min-height: 360px;
  }
  @media (max-width: 480px) {
    padding: 50px 24px;
    min-height: 320px;
  }
  /* 짧은 뷰포트 — CatalogSection(overflow:hidden, max-height 제한) 안에서 420px 최소 높이가
   * 잘려 '필터 초기화/새 사건 등록' 버튼에 도달 못 하는 문제. 축소·상단 정렬로 접근성 확보. */
  @media (max-height: 720px) {
    min-height: 0;
    padding: 40px 24px;
    justify-content: flex-start;
  }
`

export const EmptyIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          svg {
            color: #64748b;
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          svg {
            color: #94a3b8;
          }
        `}

  @media (max-width: 768px) {
    width: 52px;
    height: 52px;
    margin-bottom: 14px;
    svg {
      width: 24px;
      height: 24px;
    }
  }
  @media (max-width: 480px) {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    svg {
      width: 22px;
      height: 22px;
    }
  }
`

export const EmptyContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 400px;
  text-align: center;
`

export const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};

  @media (max-width: 768px) {
    font-size: 14px;
  }
  @media (max-width: 480px) {
    font-size: 14px;
  }
`

export const EmptyDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  /* ⚠️ 이전 값(dark #475569 / light #94a3b8)은 바로 위 EmptyTitle과 라이트/다크가
   * **정확히 뒤바뀐** 상태였다 — 다크 2.43:1 / 라이트 2.56:1로 둘 다 AA 미달이고,
   * 결과 0건 화면에서 '무엇을 하라'고 알려주는 유일한 문장이 제목보다 어두웠다. */
  color: ${({ theme }) => theme.colors.text.secondary};

  @media (max-width: 768px) {
    font-size: 12px;
  }
  @media (max-width: 480px) {
    font-size: 12px;
  }
`

export const EmptyActions = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`

export const EmptyResetButton = styled.button`
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
  svg {
    width: 14px;
    height: 14px;
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          /* CTA 라벨이 3.87:1이라 버튼으로 안 읽혔다 → primary 텍스트로 승격 */
          color: ${theme.colors.text.primary};
          &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.14);
          }
        `
      : css`
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          &:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
          }
        `}

  @media (max-width: 480px) {
    padding: 9px 18px;
    font-size: 13px;
  }
`

export const EmptyCreateButton = styled.button`
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  svg {
    width: 14px;
    height: 14px;
  }
  &:active {
    transform: translateY(0);
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(37, 99, 235, 0.25);
          background: rgba(37, 99, 235, 0.1);
          color: #93c5fd;
          &:hover {
            background: rgba(37, 99, 235, 0.18);
          }
        `
      : css`
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a;
          &:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
          }
        `}

  @media (max-width: 480px) {
    padding: 10px 20px;
    font-size: 13px;
  }
`

/* 평면 톤 — hover scale 제거. */
/* 목록 뷰 카드 컨테이너 — 타임라인 위젯의 cardBase와 시각 family 통일.
 * 1px border + 12px radius + theme bg. 내부의 CompactList가 자체 좌측 레일을 그리므로
 * 별도 ::before 그라데이션 데코는 제거(이중 라인 방지). */
/**
 * 목록 카드.
 *
 * ⚠️ **폭 상한은 존재하지 않는다.** 2026-08-02 전폭 전환에서 여기 있던
 * `width: min(100%, LIST_WIDTH.inkWide)`와 셸의 `PageWrapper.max-width`를 **같은 커밋에서
 * 함께** 제거했다. 둘 중 하나만 지우면 2560에서 카드가 1840에 좌측정렬로 멈추고 툴바
 * hairline만 2540까지 가서 '우측 끝 2종'이 픽셀 단위로 재현된다 — 사용자가 신고한 바로
 * 그 그림이다. 다시 캡을 심지 말 것.
 *
 * 경위(요약): 상한은 행 Body 880 → 카드 1120 → 셸 1880을 떠돌았다. 매 단계의 진단은
 * 맞았지만("행 안쪽 빈 밴드는 깨진 행으로 읽힌다", "캡이 툴바를 못 덮으면 우측 끝이
 * 갈린다") 처방이 늘 '더 위에 캡'이었고, 캡이 있는 한 넓은 화면에서는 어딘가가 반드시
 * 빈다. 이번에는 처방을 바꾼다 — **폭을 흡수하는 열을 행에 더 세운다**
 * (`rowGridTemplate`의 열 사다리, `theme.ts` LIST_STEPS).
 * 이 요소는 그 사다리의 **기준면**(container-name: eventcard)이라는 역할만 갖는다.
 *
 * ⚠️ 이 카드 안에서 `position: fixed`를 쓰지 말 것. `container-type: inline-size`가 이
 * 요소를 fixed 자손의 컨테이닝 블록으로 만들어, 뷰포트가 아니라 카드에 갇힌다. 뷰포트
 * 고정이 필요하면 document.body 포털 + `useAnchoredPosition`을, 스크롤 컨테이너 고정이
 * 필요하면 CompactList 안 sticky를 쓴다.
 *
 * ⚠️ layout.styles.ts에도 같은 이름의 CatalogSection이 있지만 **소비처가 0인 죽은
 * export**다(유일 소비처는 event-compact-list.tsx의 List.CatalogSection). 거기를 고치면
 * 아무 일도 일어나지 않는다.
 */
export const CatalogSection = styled.section`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
  /**
   * 행이 요약 열을 켤지 판정하는 기준면.
   *
   * 뷰포트가 아니라 **카드 폭**이 기준이어야 한다 — 카드는 상세 패널 선택 여부에 따라
   * 같은 뷰포트에서도 460px 차이가 나므로 미디어 쿼리로는 판정이 불가능하다.
   *
   * ⚠️ container-type: inline-size는 layout 봉쇄를 동반해 이 요소를 fixed 자손의
   * 컨테이닝 블록으로 만든다. 목록 하위에 fixed·포털은 0건이고, 이 요소는 이미
   * position: relative라 절대배치 자손의 기준면도 그대로다(검증 완료).
   * sticky 연·세기 헤더는 스크롤 컨테이너인 CompactList에 붙으므로 무영향.
   */
  container-type: inline-size;
  container-name: eventcard;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(20,19,34,0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
`

/* 평면 톤 — hover lift 제거. */
/* filter.styles의 SortSelect와 시각 family 통일 — radius 8 / 1px / focus halo 토큰 */
export const SortSelect = styled.select`
  border-radius: 8px;
  padding: 7px 32px 7px 12px;
  height: 34px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color ${MOTION.fast}, background ${MOTION.fast};
  appearance: none;
  background-image: url('data:image/svg+xml,%3Csvg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M1 1L6 6L11 1" stroke="%232563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E');
  background-repeat: no-repeat;
  background-position: calc(100% - 10px) 50%;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background-color: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          option {
            background: #1e1e2e;
            color: #e2e8f0;
          }
          &:hover {
            border-color: ${BRAND.primaryBorder};
          }
        `
      : css`
          background-color: #f8fafc;
          border: 1px solid rgba(203, 213, 225, 0.6);
          color: #1e293b;
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background-color: #ffffff;
          }
        `}

  &:focus {
    outline: none;
    border-color: ${BRAND.primaryBorderHover};
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 평면 톤 — hover scale 제거. $direction prop으로 회전 (filter.styles.SortButton과 통일) */