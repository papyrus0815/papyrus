/**
 * List Styled Components
 * 이벤트 리스트 관련 스타일 — ledger polish 톤(평면, 단색, 축소된 모션) 적용.
 */
import styled, { css } from 'styled-components'

import { HIDEABLE_COLUMNS } from '@/features/event-list/lib'

import type { HistoricalEventCategory } from '../create/events.types'
import {
  BRAND,
  CATEGORY_BADGE_COLORS,
  COLUMN_HEAD_BAND,
  GROUP_BAND,
  GROUP_BAND_HOVER,
  LIST_DENSITY,
  MOTION,
  LIST_STEPS,
  ROW_TYPE,
  SURFACE,
  RAIL_AXIS,
  RAIL_CONNECTOR,
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
    /*
     * 기간 트랙의 **램프** — summary 대역에서 카드가 넓어지는 만큼 축이 해상도를 받는다.
     *
     * 이 대역의 신축 트랙은 제목 하나라 기간 1px = 제목 1px이다. 그런데 그 교환비는
     * 카드 폭에 따라 값이 다르다(theme.ts colDurSummaryMax의 실측표): 카드 1275에서는
     * 32px을 더 주면 제목 17행이 더 잘리고, 카드 1432에서는 3행, 1744에서는 0행이다.
     * 그래서 계단(단계별 상수)이 아니라 직선으로 준다 — 두 점(카드 1275 = 하한,
     * 카드 1400 = 상한)을 지나는 식이 22cqw − 176px이고, clamp가 양 끝을 잡는다.
     * ledger 이상은 자기 토큰(--col-dur-wide / -ultra)이 이 값을 덮는다.
     */
    @container eventcard (min-width: ${LIST_STEPS.summary}px) {
      --col-dur: clamp(
        ${box.colDur}px,
        22cqw - 176px,
        ${box.colDurSummaryMax}px
      );
    }
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
    --col-dur-ultra: ${box.colDurUltra}px;
    --col-flags-wide: ${box.colFlagsWide}px;
    --col-flags-ultra: ${box.colFlagsUltra}px;
    --col-kw: ${box.colKw}px;
    --col-reg: ${box.colReg}px;

    /* ── 열 트랙식 — 끌 수 있는 열은 **컨테이너가** 소유한다 ─────────────────
     *
     * 왜 행(rowGridTemplate)이 아니라 여기인가: 표시 설정의 '이 열 숨기기'는 스크롤
     * 컨테이너에 걸리는데, 행이 자기 트랙식을 들고 있으면 **더 가까운 선언**인 행 쪽이
     * 이겨서 설정이 화면에 아무 일도 못 한다. 그래서 트랙식과 단계별 폭 전환
     * (--col-*-wide / -ultra)을 통째로 올렸다 — 행은 이제 트랙 '이름'만 알고 폭은 모른다.
     *
     * ⚠️ 커스텀 속성 값 안의 var()는 **선언된 요소**(= 이 컨테이너)에서 해석된다.
     *    단계 전환을 행에 남겨 두면 행이 --col-dur를 덮어도 --track-dur는 안 따라와,
     *    광폭에서 기간 열이 좁은 폭 값으로 굳는다. 한 요소 안이므로 선언 **순서**는
     *    무관하다 — 아래 컨테이너 쿼리가 --col-dur를 덮으면 --track-dur도 그 값을 읽는다.
     */
    --track-end: var(--col-date);
    --track-cat: var(--col-chip);
    --track-kw: var(--col-kw);
    --track-dur: var(--col-dur);
    --track-flags: var(--col-flags);
    --track-reg: var(--col-reg);

    /* 광폭(ledger) — 기간·관련국이 넓어지고, 키워드·관련국이 **신축 트랙**이 된다
       (제목 1.5 : 키워드 1 : 관련국 1). 예전엔 이 두 줄이 rowGridTemplate 안에 있었다. */
    @container eventcard (min-width: ${LIST_STEPS.ledger}px) {
      --col-dur: var(--col-dur-wide);
      --col-flags: var(--col-flags-wide);
      --track-kw: minmax(var(--col-kw), 1fr);
      --track-flags: minmax(var(--col-flags), 1fr);
    }

    /* 초광폭(atlas) — 날짜(BC·YYYY.M.D 극단값)와 기간 해상도, 관련국 이름이 한 번 더. */
    @container eventcard (min-width: ${LIST_STEPS.atlas}px) {
      --col-date: var(--col-date-wide);
      --col-dur: var(--col-dur-ultra);
      --col-flags: var(--col-flags-ultra);
    }
    --row-indent: ${box.indent}px;
    --row-title: ${type.title};
    --row-meta: ${type.meta};
    --row-chip: ${type.chip};
    --year-h: ${box.yearH}px;
    --year-mt: ${box.yearMt}px;
    --year-mb: ${box.yearMb}px;
    /* 그룹 머리글 라벨 — 행 제목(--row-title)보다 한 단씩 위. 이 단조가 깨지면
       연 헤더가 다시 '행처럼' 읽힌다(도입 전 실측: 연 라벨 14px/700 = 행 제목 14px/700). */
    --year-label: ${box.yearLabel}px;
    --century-label: ${box.centuryLabel}px;
    --century-gap: ${box.centuryGap}px;
    /* ⚠️ 아래 두 개는 **기존 변수** — 이름·소비처 불변, 값만 밀도에 묶는다.
       (세기 헤더가 sticky이던 시절 YearDivider의 top이 이 값을 읽었다. 지금은 세기 밴드의
       min-height 전용이다.) */
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
  /*
   * ⚠️ 상단 패딩 **0**. sticky 자식의 top:0은 스크롤 컨테이너의 **패딩 상자** 기준이라,
   * padding-top이 있으면 그 두께만큼이 '아무도 덮지 않는 슬릿'이 되고 스크롤되는 행이
   * 그 틈으로 지나간다(다크에서 특히 또렷하다 — 카드 표면이 rgba(255,255,255,0.02)라
   * 지나가는 글자가 그대로 비친다). 4px이었고, 실측에서 행 글자 윗머리가 열 헤더 위로
   * 보였다. 숨 쉴 틈은 열 헤더 자신의 패딩이 만든다.
   */
  /* 우측 패딩은 변수로 — 띠(열 머리글·세기·연도·행)가 **카드 안쪽 모서리까지** 번지려면
     자기 음수 마진으로 이 값을 정확히 상쇄해야 한다(bleedToEdges). 리터럴로 두면 한쪽만
     고쳤을 때 띠가 컨테이너 보더 앞에서 멈춰 흰 띠가 남는다 — 사용자 지적 그대로다. */
  --list-pad-r: 20px;
  padding: 0 var(--list-pad-r) 32px var(--rail-gutter);
  position: relative;

  /* 레일 3좌표는 한 세트로 움직인다 — 거터(패딩) · 축선 x · 인셋(=거터-축선).
   * 인셋은 밀도 토큰이 공급하고(--rail-inset), 나머지 둘은 밴드가 정한다.
   * 셋을 따로 고치면 디바이더 도트가 축선에서 어긋난다(모바일에서 실제로 겪었던 회귀). */
  /* 36px이었다. 레일이 '축 + 눈금' 2층에서 '축(세기·연) + 사건 + 하위 + 손자' 4층이 되며
     오른쪽 예산이 모자랐다(축선 17 + 6×3 = 35가 옛 거터 36에 닿았다). 늘린 4px은
     2,526px 행에서 0.16%다. ⚠️ --rail-inset(밀도 토큰)도 함께 40−17=23으로 옮겼다. */
  --rail-gutter: 48px;
  --rail-x: 17px;
  /**
   * 계층 한 단이 레일에서 오른쪽으로 밀리는 거리.
   *
   * 축 위 눈금이 depth와 무관하게 전부 같은 x에 서 있었다(사용자 지적: "타임라인선이
   * 그냥 일자로 내려온다"). 이제 레일이 **트리**다 — 축선에 세기·연 앵커가 서고,
   * 그 해의 사건이 한 단, 하위 사건이 또 한 단 안으로 들어간다.
   *   축선 17 ─┬─ 사건 23 ─┬─ 하위 29 ─── 손자 35
   * 제목 들여쓰기(20px)를 그대로 쓸 수는 없다 — 거터 예산이 31px뿐이다.
   *
   * ⚠️ 6px이었다. 그 폭에서는 축선과 계층 줄기가 **6px 떨어진 두 세로선**이라, 트리가
   * 아니라 '색이 다른 이중 괘선'으로 읽혔다(실측 확인). 선 사이를 벌리는 것 말고는
   * 고칠 방법이 없어 거터를 40 → 48px로 늘리고 한 단을 10px로 잡았다.
   */
  --rail-depth-step: 10px;
  /* 마지막 사건 아래로 레일이 계속 이어져 목록이 끝나지 않는 것처럼 보이던 문제.
   * 축을 하단 패딩만큼 잘라 종단을 만든다. */
  --rail-tail: 104px;

  /* 행·그룹 헤더·스켈레톤이 공유하는 기하 변수 — 밀도 토큰이 단일 출처.
   * --rail-inset(디바이더·커넥터를 레일 도트에 정렬)과 --century-header-h(세기 밴드의
   * min-height. 세기 헤더가 sticky에서 빠진 뒤로는 연도 sticky top 계산에서 빠졌다)도
   * 여기에 편입됐다 — 이름과 소비처는 그대로다.
   * ⚠️ 이 주석 안에서 백틱을 쓰지 말 것 — styled 템플릿 리터럴이 끊겨 TS1005가 난다. */
  ${densityVars('cozy')}
  &[data-density='compact'] {
    ${densityVars('compact')}
  }
  &[data-density='roomy'] {
    ${densityVars('roomy')}
  }

  /**
   * 사용자가 끈 열 — data-hidden-cols="kw reg"(공백 구분, ~= 로 한 토큰씩 본다).
   *
   * 한 열당 두 가지를 한다. ⑴ 트랙식을 0px로 눌러 격자에서 폭을 회수하고(광폭에서
   * 신축 트랙이던 키워드·관련국도 같은 선언 하나로 fr째 사라진다 — 트랙 **식 전체**가
   * 변수에 들어 있기 때문이다), ⑵ 그 열의 셀을 전부 숨긴다.
   *
   * ⚠️ 0px이지 빈 값이 아니다. --track-kw 를 빈 값으로 두어 트랙을 통째 지우면
   *    [sumend kw] [dur] 처럼 라인 이름이 연달아 붙어 트랙 목록 문법이 깨진다. 0px은 column-gap
   *    한 칸(10~12px)을 남기지만, 열 하나가 주던 150~200px에 비하면 잔돈이다.
   *
   * ⚠️ 셀 선택자는 [data-col=...] 하나로 충분하다 — 셀 자신의 켜짐 규칙은 컨테이너
   *    쿼리 안에 있어도 특이도가 (0,1,0)이고, 이 규칙은 (0,2,0)이라 항상 이긴다.
   */
  ${HIDEABLE_COLUMNS.map(
    (column) => css`
      &[data-hidden-cols~='${column}'] {
        --track-${column}: 0px;

        [data-col='${column}'] {
          display: none;
        }
      }
    `,
  )}

  /* 축선 — 좌표는 --rail-x가 소유하므로 밴드가 거터를 바꾸면 자동 추종한다.
   *
   * alpha를 0.20/0.22 → 0.32/0.34로 올린다. 행 도트를 폐지하기 전에는 축(1.38:1)이
   * 그 위의 눈금(도트)보다 흐린 역전 상태였다 — 이제 축이 유일한 선이므로 자기 몫의
   * 대비를 가져야 한다. */
  background-image: ${({ theme }) =>
    railAxisOverlay(theme.mode === 'dark')};
  background-attachment: local;
  background-repeat: no-repeat;
  /* 종단 — 하단 패딩 구간에는 축을 그리지 않는다. local 첨부라 높이는 콘텐츠 전체 길이다. */
  /* 잉크는 1px인데 100% 폭 그라디언트 셰이더가 도는 건 순 낭비다(전폭에서 3,300px).
     no-repeat이 이미 걸려 있어 시각 결과는 픽셀 동일하다. */
  background-size: calc(var(--rail-x) + 2px)
    calc(
      100% - var(--rail-tail) - var(--col-header-h, 26px) -
        var(--col-header-gap, 8px)
    );
  /* 축은 **표가 시작하는 곳**에서 시작한다 — 안 그러면 컨테이너 상단 패딩 구간에
     축 토막이 남아 열 헤더('날짜') 위에 정체불명의 눈금처럼 떠 있다(스크롤 최상단에서만
     보이던 잔상). local 첨부라 스크롤하면 어차피 화면 밖이므로 부작용이 없다. */
  /* 머리글 아래 숨 틈(--col-header-gap)도 건너뛴다 — 그 8px에 남은 축 토막이 첫 세기 도트
     위로 삐져나와, 축이 '도트에서 시작'하지 않고 머리글 밑에서 흘러내리는 것처럼 보였다.
     나머지 절반(밴드 위쪽)은 CenturyDivider가 첫 세기에서 스스로 비운다. */
  background-position: 0
    calc(var(--col-header-h, 26px) + var(--col-header-gap, 8px));

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
    /* 68px = 'YYYY.M.D'(tabular-nums 12px)의 실폭. 이 아래로 내리면 시작·종료가
       '1018.10.3…'으로 잘린다 — 두 열이 같은 문법을 쓰므로 하한도 하나다. */
    --col-date: 70px;
    --col-chip: 56px;
    /*
     * 52px이었다. 이 열은 문자열이 아니라 **한 해를 가로지르는 축**이라 폭이 곧
     * 해상도다 — 52px에서 한 달은 4.3px이고, 그건 이 열을 만들 때 "한 달이 최소
     * 7px은 돼야 4월과 6월이 눈으로 갈린다"며 기각했던 바로 그 값이다.
     * 실측(1066px·335행): 막대 중앙값 6px·60%가 8px 미만이라 사실상 점의 열이었고,
     * 그 점들이 말할 수 있는 유일한 것(연 안에서의 위치)조차 읽히지 않았다.
     * 96px이면 한 달 8px. 대가는 제목 트랙 44px(428 → 384)이고 잘린 제목은
     * 335행 중 12 → 14행으로 2행 늘 뿐이다(실측).
     */
    --col-dur: 96px;
    --col-flags: 96px;
    --col-act: 58px;
    --row-col-gap: 10px;
  }

  @media (max-width: 1024px) {
    --rail-gutter: 24px;
    --rail-x: 11px;
    /* 좁은 대역의 한 단.
     *
     * ⚠️ 4px이었다. 눈금이 축 위로 올라온 뒤로 이 값은 **하위 눈금이 축선에서 비켜나는
     * 거리**가 됐는데, 4px에서는 속 빈 눈금의 지면색 링(반지름 5px)이 축선을 덮어
     * 행마다 축이 끊기고 점이 ⊖처럼 보였다(실측 1024px). 링 반지름 + 1px 이상 필요하다.
     * 거터 24 − 축선 11 = 13px 예산 안에서 7px이 최대치다(하위 18 · 손자 25). */
    --rail-depth-step: 7px;
    && {
      --rail-inset: 13px;
    }
  }

  @media (max-width: 899px) {
    /* 위와 같은 하한(68px). 이 대역은 step 0이라 종료 열이 없고, 그래서 날짜 열이
       이 행의 시간을 말하는 **유일한 칸**이다 — 여기서 자르면 되살릴 곳이 없다. */
    --col-date: 68px;
    --col-chip: 52px;
    /* 위 대역과 같은 근거 — 한 달 7px이 이 축의 하한이다(84 / 12 = 7). */
    --col-dur: 84px;
    /*
     * 60px이었다. 그 폭에는 **이름 칩 하나도 안 들어간다** — 역사국가 칩은 이모지가
     * 없어 국가명 텍스트가 곧 칩이고('러시아 제국' 47px), 여기에 '+N'(21px)과 간격
     * (6px)을 더하면 74px이 필요하다. 그래서 칩 개수를 1로 줄여도 그 하나가 33px로
     * 눌려 '러시아 …'가 됐다(실측 880px: 185행 중 73행 = 39%).
     * 88px이면 같은 행이 13행(7%)으로 떨어진다. 대가는 제목 트랙 28px(잘린 제목
     * 25 → 29행)이고, 국가명을 통째로 못 읽는 것보다 제목 한두 글자가 싸다.
     */
    --col-flags: 88px;
    --col-act: 56px;
    --row-col-gap: 8px;
    /*
     * ⚠️ 열 헤더가 사라지는 대역이다(ColumnHeader는 여기서 display:none). 그런데
     * --col-header-h는 밀도 토큰 값(26px) 그대로라, 세기 헤더가 top:26px에 붙어
     * **26px짜리 빈 띠**가 남았다 — 그 띠로 행이 통째로 지나가 헤더 위에 유령 행이
     * 떠다녔다(실측 860px 다크에서 한 줄이 그대로 읽혔다). 헤더가 없으면 높이도 0이다.
     * 레일 배경(background-position·size)도 같은 변수를 읽으므로 함께 맞는다.
     */
    --col-header-h: 0px;
    /* 머리글이 없으면 그 아래 숨 틈도 없다 — 레일 시점 계산이 같은 쌍을 읽는다. */
    --col-header-gap: 0px;
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
    /*
     * 모바일에서는 한 단을 **0**으로 눕힌다 — 하위 구슬이 줄기(축선) 위로 돌아온다.
     *
     * 이 대역은 RailBranch(가지선)를 display:none으로 끄고 계층을 행 들여쓰기에 맡기는
     * 곳이다. 그런데 레일 문법이 '구슬은 언제나 선 위에 얹힌다'로 바뀌었으므로, 선을
     * 끈 채 한 단(7px)만 남기면 하위 구슬이 아무 선에도 얹히지 않고 축선 옆에 뜬다.
     * 한 단을 0으로 두면 구슬은 줄기 위에 앉고 크기(5 → 4px)만으로 하위임을 말한다.
     * ⚠️ event-list-item.tsx의 RailBranch ≤640 규칙과 한 쌍이다 — 한쪽만 바꾸지 말 것.
     */
    --rail-depth-step: 0px;
    /*
     * 그룹 라벨은 모바일에서 한 단 내린다. 데스크톱 값(세기 23px)을 390px 화면에 그대로
     * 들고 가면 '20세기 (1901–2000) 81건 · 하위 31'이 **세 줄로 접혀** 세기 밴드가 110px
     * 짜리 블록이 된다(실측) — 화면의 7분의 1을 머리글 하나가 먹는다.
     * 줄어들어도 행 제목(11~13px)보다는 확실히 크므로 위계는 유지된다.
     */
    --century-label: 18px;
    --year-label: 15px;
    /* 배경 그라디언트는 --rail-x를 읽으므로 여기서 재선언할 필요가 없다
       (이전에는 11/12px 리터럴을 두 번째로 적어 두 좌표가 따로 놀았다). */
    --list-pad-r: 10px;
    padding: 0 var(--list-pad-r) max(96px, env(safe-area-inset-bottom))
      var(--rail-gutter);
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
/**
 * 레일 축선을 **면 위에 다시 그리는** 그라디언트.
 *
 * 불투명한 밴드가 전폭으로 번지면 스크롤러 배경에 그려진 축선을 그 높이만큼 덮는다 —
 * 안 그리면 밴드마다 축이 40~50px씩 끊겨 점선처럼 보인다. 좌표는 --rail-x 하나가 소유하므로
 * 거터를 바꿔도 따라온다.
 */
export const railAxisOverlay = (isDark: boolean) => {
  const ink = isDark ? RAIL_AXIS.dark : RAIL_AXIS.light
  return `linear-gradient(
      to right,
      transparent var(--rail-x),
      ${ink} var(--rail-x),
      ${ink} calc(var(--rail-x) + 1px),
      transparent calc(var(--rail-x) + 1px)
    )`
}

/**
 * 카드 안쪽 모서리까지 번지는 **면(面) 규약**.
 *
 * 목록의 모든 가로 면(열 머리글 · 세기/연도 밴드 · 행 배경과 괘선)은 컨테이너의 안쪽
 * 가장자리에서 시작해 반대쪽 가장자리에서 끝난다. 예전에는 저마다 다른 만큼만 번져
 * 왼쪽 17px · 오른쪽 9px의 흰 띠가 남았고, 카드가 12px 라운드 보더를 두르고 있어
 * **모서리 네 곳이 빈 흰 노치**로 보였다(사용자 지적: "border 처리된 부분 모서리를
 * 차지하지도 않는다"). 실측 좌단이 카드 147 · 띠 165 · 행 184로 셋, 우단도 셋이었다.
 *
 * 규약: 면은 음수 마진으로 컨테이너 패딩을 **정확히** 상쇄하고, 잉크는 같은 양을
 * 패딩으로 되돌려 받는다 — 면은 전폭, 글자 위치는 종전과 픽셀 동일.
 *
 * ⚠️ 면이 전폭이 되면 스크롤러 배경에 그려진 레일 축선을 **덮는다**. 불투명한 면
 *    (밴드)은 자기 배경에 축선을 다시 그려야 한다(YearDivider ::after · CenturyDivider
 *    background). 행은 기본이 투명이라 덮지 않는다.
 */
export const bleedToEdges = css`
  margin-left: calc(-1 * var(--rail-gutter));
  margin-right: calc(-1 * var(--list-pad-r, 20px));
`

export const rowGridTemplate = css`
  display: grid;
  column-gap: var(--row-col-gap);
  /* 베이스라인 정렬 — center는 칩 라인박스(15.75px)와 제목(18.2px)이 어긋나
     전 행에서 1.51px 드리프트를 만든다. 상자형 셀만 center로 예외 처리한다. */
  align-items: baseline;
  /* 베이스라인 덩어리는 격자 기본값으로는 **위**에 붙는다. 행의 min-height가 내용보다
     클 때(설명 없는 행) 남는 높이가 전부 아래로 몰려 글이 위로 치우쳐 보이므로,
     덩어리째 세로 가운데에 놓는다. 내용이 높이를 넘기면 이 선언은 아무 일도 안 한다. */
  align-content: center;

  /* ── step 0 (카드 < summary) — 6트랙. 신축은 제목. */
  grid-template-columns:
    [date] var(--col-date)
    [cat] var(--track-cat)
    [title] minmax(0, 1fr)
    [sumend dur] var(--track-dur)
    [flags] var(--track-flags)
    [act] var(--col-act);

  /* ── step 1 summary — **종료 열과 키워드 열이 켜진다**(9트랙).
   *
   * 종료: 날짜 열 바로 뒤에 같은 폭(--col-date)으로 선다. 폭을 맞추는 이유는 둘이 **한 쌍**
   * 이기 때문이다 — 같은 폭·같은 우측정렬이면 두 열이 한 범위의 양 끝으로 읽힌다.
   * 실측 299행: 실제 종료일 131(44%) · 당일 152(51%) · 빈칸 16(5%). 빈칸이 곧 '종료 미상'
   * 이라는 사실이다(이 목록은 예전부터 종료 미상과 당일 종료를 구별해 왔다 —
   * formatDuration 주석).
   */
  /* (키워드)
   *
   * 이 단계는 원래 '설명이 켜지는 폭'이었다. 설명을 걷어낸 뒤 그 자리에 남은 것은
   * 제목 뒤의 빈 폭뿐이라(1,062px 카드에서 실측 약 300px), 같은 폭을 **짧은 칩 열**이
   * 가져간다. 키워드는 ledger(1752)에서 내려왔다 — 거기 있던 이유가 '설명이 이미 이
   * 대역의 폭을 쓰고 있어서'였기 때문이다.
   *
   * 신축은 제목 1.5 : 키워드 1. 제목이 더 받는 이유는 그게 유일한 자연어 열이라서다.
   */
  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
    /* ⚠️ 이 대역에서는 키워드가 **고정 폭**이다. fr을 주면 남는 폭이 제목과 나뉘는데,
       카드 1,180px(대역 하단)에서는 그 나눔 뒤 제목에 251px밖에 안 남는다(한글 21자).
       광폭에서나 나눌 값이지 여기서는 전부 제목 몫이다.
       ⚠️ 한때 여기서 150px로 더 줄였다가 되돌렸다 — 칩 2개가 각 50px로 눌려
       '이란-이스라…' · '참…'처럼 **무엇을 가리키는지 알 수 없는 조각**만 남았다.
       열을 좁히는 것이 아니라 칩 개수를 줄이는 것이 맞는 처방인데, 개수는 컨테이너가
       아니라 뷰포트로 재고 있어(keywordMax) 이 대역에서 2로 고정이다. */
    grid-template-columns:
      [date] var(--col-date)
      [end] var(--track-end)
      [cat] var(--track-cat)
      [title] minmax(0, 1fr)
      [sumend kw] var(--track-kw)
      [dur] var(--track-dur)
      [flags] var(--track-flags)
      [act] var(--col-act);
  }

  /* ── step 2 ledger — 8트랙. 키워드 열이 켜지고, 기간(다년 사건이 앞자리부터 잘리던 폭)과
       관련국이 넓어진다.
   *
   * ⚠️ 여기서부터 **신축 트랙이 셋**이다(제목 1.5 : 키워드 1 : 관련국 1).
   *
   * 예전엔 제목만 1fr이었고, 남는 폭은 전부 제목 뒤 설명이 먹었다. 설명을 걷어낸 뒤
   * 그 계약을 그대로 두면 2,526px 행에서 제목 트랙이 1,642px이 되고 제목 잉크는 중앙값
   * 220px이라 **행마다 1,400px이 빈다**. 폭에 상한을 걸어 지면 오른쪽을 비우는 처방은
   * 이전 라운드에서 880 → 1120 → 1880으로 세 번 시도하고 폐기했다(사용자 판정).
   *
   * 그래서 남는 폭을 **글자를 더 싣는 두 열**에 나눠 준다: 키워드는 칩 개수가 폭에 따라
   * 2 → 4 → 6으로 늘고(keywordMax), 관련국은 국기 대신 **이름**이 들어간다. 제목이 여전히
   * 가장 큰 몫(1.5)을 받는 이유는 그게 유일한 자연어 열이고 최장 잉크가 613px이기 때문이다 —
   * 이 배분에서는 어떤 제목도 잘리지 않는다.
   */
  @container eventcard (min-width: ${LIST_STEPS.ledger}px) {
    /* (이동) --col-dur/--col-flags 폭 전환과 fr 승격은 densityVars로 올라갔다 —
       숨김 설정이 행 선언에 가리지 않게 하려면 트랙식의 소유자가 하나여야 한다. */
    grid-template-columns:
      [date] var(--col-date)
      [end] var(--track-end)
      [cat] var(--track-cat)
      [title] minmax(0, 1.5fr)
      [sumend kw] var(--track-kw)
      [dur] var(--track-dur)
      [flags] var(--track-flags)
      [act] var(--col-act);
  }

  /* ── step 3 atlas — 9트랙. 등록 시각이 켜지고(‘등록순’ 정렬의 근거가 화면에 0픽셀이던
       문제), 날짜(BC·YYYY.M.D 극단값)와 관련국이 한 번 더 넓어진다. */
  @container eventcard (min-width: ${LIST_STEPS.atlas}px) {
    /* (이동) 날짜·기간·관련국의 폭 전환은 densityVars로. 기간은 이 단계에서 폭이
       늘면 새 정보가 아니라 **해상도**가 는다(한 달 ≈ 19px = 분기 격자 한 칸 58px). */
    grid-template-columns:
      [date] var(--col-date)
      [end] var(--track-end)
      [cat] var(--track-cat)
      [title] minmax(0, 1.5fr)
      [sumend kw] var(--track-kw)
      [dur] var(--track-dur)
      [flags] var(--track-flags)
      [reg] var(--track-reg)
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
     좌측은 레일까지 당기고(margin) 그만큼 안쪽으로 되민다(padding).

     ⚠️ 우측 패딩은 **두 몫**이다. 음수 마진(-row-pad-r)이 띠를 목록 패딩 위로 흘려보낸
     만큼(1) 되밀고, 행의 바깥 상자(Stop)가 자기 격자를 안쪽으로 들인 만큼(2) 한 번 더
     들여야 헤더 격자와 행 격자의 **폭이 같아진다**.
     (2)가 빠져 있어 헤더 콘텐츠 상자가 행보다 12px 넓었고, 유일한 신축 트랙인 제목이
     그 12px을 먹어(883.6 vs 871.6) 제목 오른쪽의 모든 열이 통째로 12px 밀려 있었다 —
     '기간'·'관련국'·'등록' 세 라벨이 자기 열 위가 아니라 옆 칸 경계 위에 서 있었다는
     뜻이다(실측: 관련국 라벨 우단 1488 vs 칩 트랙 우단 1476). */
  ${bleedToEdges}
  /* 2px이었다. 머리글 띠와 첫 세기 밴드가 맞붙어, 표의 '머리'와 '첫 장'이 한 덩어리로
     읽혔다. 8px은 행 사이(0)보다 크고 세기 사이(--century-gap)보다 작아, 세로 간격의
     3단 사다리(행 0 < 머리글 8 < 세기 38~56)에서 자기 칸을 갖는다. */
  /* 값은 CompactList의 --col-header-gap(레일 시점이 같은 값을 읽는다). */
  margin-bottom: var(--col-header-gap, 8px);
  /* 잉크는 컨테이너 패딩 + 행 자신의 안쪽 패딩만큼 되돌려 받는다 — 라벨 x가 행 셀과
     픽셀 단위로 같아야 머리글이 '그 열'을 가리킨다(어긋났던 12px 회귀 이력 참고). */
  padding: 0 calc(var(--list-pad-r, 20px) + var(--row-pad-r)) 0
    calc(var(--rail-gutter) + var(--row-pad-l));
  /* 10.5px/700이었다. 10.5px에서 700은 한글 글자 속이 메워져 '작고 진한 얼룩'으로 읽힌다 —
     크기를 반 픽셀 올리고 굵기를 한 단 낮춰, 대비는 아래 color로 올린다(같은 잉크량으로
     글자 모양이 살아난다). 반픽셀은 위계를 0비트 실어 나르므로 스케일에서 뺀다. */
  font-size: 11px;
  /* 600 → 700. 띠가 지면색이고(회색 판 폐기 규약) 높이도 24px이라, 이 줄이 '표의 머리'
     라고 말하는 것은 글자 자체뿐이다. 그 글자가 흐린 600이면 머리글이 있다는 사실이
     안 읽힌다(사용자 지적: "헤더가 너무 없어보인다"). 면을 되살리는 대신 잉크를 올린다. */
  font-weight: 700;
  /*
   * 표 머리글은 **양의 트래킹**을 쓴다. 11px에 -0.005em(음수)이 걸려 있어 글자가 서로
   * 붙었고, 6열짜리 표의 유일한 범례가 화면에서 가장 흐린 텍스트였다. 크기를 조금 줄이는
   * 대신 자간을 벌리고 굵기를 올려 '데이터가 아니라 라벨'로 읽히게 한다 — 같은 수법을
   * 폐기된 타임라인 축 헤더가 쓰고 있었고 거기서는 제대로 동작했다.
   */
  letter-spacing: 0.08em;
  /*
   * ⚠️ text.tertiary였다 — 라이트 **2.54:1**로 AA(4.5:1) 미달이다. 이 지면이 이미
   * META_TEXT를 만들어 쓰는 이유가 정확히 그것인데(그 토큰 주석 참고), 정작 표의 유일한
   * 범례인 열 머리글만 그 판단 밖에 남아 화면에서 가장 흐린 텍스트였다. 같은 토큰으로
   * 옮긴다 — 라이트 4.83:1 / 다크 7.48:1.
   *
   * ⚠️ 다시 한 단 올렸다(metaText → text.secondary). 위 font-weight 주석과 같은 이유다 —
   * 이 띠에는 면도 테두리도 없으므로 존재감을 글자가 혼자 진다.
   */
  color: ${({ theme }) => theme.colors.text.secondary};
  /* ⚠️ 반투명 금지 — 아래 행이 비친다(세기 헤더가 같은 이유로 솔리드로 고쳐져 있다).
     지면색(흰색)이었는데, 그러면 이 띠가 '표의 머리'가 아니라 **또 하나의 행**으로 보인다.
     밴드 계열의 가장 옅은 단을 줘서 스크롤 중 머리글 블록이 한 덩어리로 읽히게 한다. */
  background: ${({ theme }) =>
    theme.mode === 'dark' ? COLUMN_HEAD_BAND.dark : COLUMN_HEAD_BAND.light};
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
export const ColumnHeaderCell = styled.span.attrs<{ $col: string }>(
  /* 머리글 라벨도 자기 열의 손잡이를 갖는다 — 열을 끄면 트랙과 셀과 라벨이 **한 선언**
     (CompactList의 data-hidden-cols)으로 함께 사라진다. */
  ({ $col }) => ({ 'data-col': $col }) as Record<string, string>,
)<{
  $col: string
  $align?: 'right' | 'center'
  /** 이 라벨이 켜지는 컨테이너 폭(LIST_STEPS 값). 생략 = step 0부터 항상 존재하는 열 */
  $showFrom?: number
  /**
   * 제목 열 전용 — 셀 안쪽 서브격자의 디스클로저 트랙만큼 라벨을 들여쓴다.
   *
   * 제목 셀은 `[ind][disc][text]` 3트랙이라 **실제 제목 잉크**는 셀 좌단이 아니라
   * `--row-disc-btn`만큼 안쪽에서 시작한다. 라벨을 셀 좌단에 두면 머리글만 혼자
   * 24px 왼쪽으로 튀어나와, 6열짜리 표에서 유일하게 어긋난 열이 된다(실측 25px).
   */
  $textIndent?: boolean
  /** 현재 정렬을 만드는 열 — 라벨 한 단 진하게 + 방향 글리프(ColumnSortCaret) */
  $sorted?: boolean
  /** 라벨 아래 축(DurationAxis)을 다는 칸 — 셀 밖으로 나가는 잉크가 있어 잘라내지 않는다 */
  $axis?: boolean
  /**
   * 눌러서 이 열로 정렬할 수 있는 칸.
   *
   * ⚠️ 머리글 띠 전체가 `aria-hidden`인 **시각 보조**라, 여기에 포커스 가능한 버튼을
   * 두면 접근성 트리에서 지워진 탭 정지점이 생긴다. 그래서 이 칸은 끝까지 `span`이고
   * 마우스 전용 **보조** 진입점이다 — 네 축 전부와 키보드 경로는 도구줄의 ⋯ 표시 설정
   * 메뉴가 책임진다. 둘은 같은 핸들러를 부른다.
   */
  $clickable?: boolean
}>`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  ${({ $axis }) =>
    $axis &&
    css`
      /* 축이 머리글 띠의 **아래 선**에 서야 '열의 바닥에 그은 자'로 읽힌다 —
         그러려면 셀이 가운데 정렬된 글자 높이가 아니라 띠 높이를 다 차지해야 한다.
         세로 가운데 정렬은 그래서 flex가 대신 맡는다. */
      position: relative;
      overflow: visible;
      align-self: stretch;
      display: flex;
      align-items: center;
      justify-content: center;
    `}
  text-align: ${({ $align }) => $align ?? 'left'};
  /* 정렬 중인 열만 본문 색으로 올라온다 — 나머지 라벨과 **한 단** 차이. 두 단 이상
     벌리면 머리글 줄 안에서 그 열만 제목처럼 읽힌다. */
  ${({ $sorted, theme }) =>
    $sorted &&
    css`
      color: ${theme.colors.text.secondary};
      font-weight: 700;
    `}
  ${({ $textIndent }) =>
    $textIndent &&
    css`
      padding-left: var(--row-disc-btn);
    `}
  ${({ $clickable, theme }) =>
    $clickable &&
    css`
      cursor: pointer;
      /* 라벨만 바뀌는 hover — 머리글 띠에 배경을 깔면 sticky 상태에서 아래 행이 비쳐
         보이던 문제(불투명 규약)를 다시 건드린다. 잉크 한 단으로만 말한다. */
      &:hover {
        color: ${theme.colors.text.primary};
      }
    `}

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

/**
 * 정렬 방향 글리프 — 열 머리글 라벨 뒤에 붙는 작은 삼각형.
 *
 * 아이콘 컴포넌트가 아니라 글자인 이유: 이 줄의 다른 모든 잉크가 11px 텍스트라
 * SVG를 얹으면 베이스라인이 혼자 어긋난다(라벨은 baseline 정렬 격자 안에 있다).
 */
/**
 * 「기간」 열 머리글의 **연 축** — 한 번만 그린다.
 *
 * 행의 기간 트랙은 그 행이 속한 연 그룹의 1월 1일~12월 31일이 좌우 끝이다. 그런데 트랙
 * 안에는 좌표계가 없어서, 실측 298행 중 164행(55%)이 6px 점 하나로 그려지는 동안 그 점이
 * 트랙의 **어디**에 찍혔는지 읽을 방법이 없었다(≤12px까지 넓히면 194행 = 65%).
 *
 * 예전엔 같은 눈금을 **행마다** 그렸고, 293행 × 5선 = 1,465개의 세로 획이 정작 값(점·막대)
 * 보다 먼저 읽혀 폐기됐다(SpanBar 위쪽 주석). 축은 한 번, 데이터는 행마다 — 그래서 여기다.
 *
 * ⚠️ 라벨과 같은 잉크를 쓰지 않는다. 눈금이 '기간'이라는 글자만큼 진하면 머리글 줄에서
 * 축이 라벨을 이긴다. 바탕 트랙선(행)보다는 한 단 진하고 라벨보다는 흐린 자리에 둔다.
 * ⚠️ `background-position`의 백분율은 **상자 기준**이라 0%·100%가 트랙 양 끝에 정확히
 * 선다(연 경계). 25/50/75%는 4·7·10월 1일과 최대 0.25px 어긋난다 — 눈금 폭이 1px이라
 * 무시할 수 있다.
 */
export const DurationAxis = styled.span`
  position: absolute;
  right: 0;
  /*
   * 라벨 **아래**로 내려 깐다.
   *
   * 0이었다. 그런데 머리글 셀의 높이는 글자 한 줄(15px)이라 bottom:0이 곧
   * 텍스트의 베이스라인이고, 5개 눈금 중 셋(25%·75%·100%)이 '1월'·'기간'·'12월'
   * 사이의 **빈칸에 떨어져 쉼표처럼 읽혔다** — 머리글이 '1월 , 기간 ▾ , 12월,'로
   * 보였다. 자는 라벨 옆이 아니라 라벨 밑에 있어야 자로 읽힌다.
   * -7px이면 30px 머리글 띠의 바닥선에 눈금이 앉는다($axis 칸은 잘라내지 않는다).
   */
  bottom: -7px;
  left: 0;
  height: 4px;
  pointer-events: none;

  ${({ theme }) => {
    /* 머리글 띠(라이트 #ffffff · 다크 #141414) 위에서 WCAG 1.4.11(3:1)을 넘기는 최소치
       근처 — 라이트 0.46 = #959595 = 3.08:1 · 다크 0.34 = #646464 = 3.17:1.
       축은 값이 아니라 눈금이지만, 이 열에서 **위치를 읽게 하는 유일한 기준선**이라
       배경 장식(행의 바탕 트랙선 0.07)이 아니라 그래픽 객체 쪽 기준을 쓴다. */
    const ink =
      theme.mode === 'dark' ? 'rgba(255,255,255,0.34)' : 'rgba(20,19,34,0.46)'
    const tick = `linear-gradient(${ink}, ${ink})`
    /* 연 경계(0·100%)는 4px, 분기 눈금(25·50·75%)은 3px — 축의 끝과 안이 갈린다. */
    return css`
      background-image: ${tick}, ${tick}, ${tick}, ${tick}, ${tick};
      background-repeat: no-repeat;
      background-size: 1px 4px, 1px 3px, 1px 3px, 1px 3px, 1px 4px;
      background-position: 0 100%, 25% 100%, 50% 100%, 75% 100%, 100% 100%;
    `
  }}
`

/**
 * 기간 축의 **양 끝 라벨** — `1월` · `12월`.
 *
 * 축이 무엇인지는 그동안 머리글 셀의 `title` 속성(마우스를 1초 올려야 뜨는 말풍선)
 * 에만 적혀 있었다. 즉 화면에는 눈금 다섯 개만 있고 **그 눈금이 한 해를 가른다는
 * 사실은 0픽셀**이었다 — 자에 숫자가 없으면 그건 자가 아니라 무늬다.
 *
 * 두 글자씩 두 개만 둔다. 4·7·10월까지 적으면 30px 머리글에 라벨이 다섯 개가 되어
 * 머리글 줄에서 축이 라벨('기간')을 이긴다. 가운데 눈금의 뜻은 양 끝이 정해지면
 * 자동으로 읽힌다(등간격 = 분기).
 *
 * ⚠️ 절대 배치다 — 셀은 `justify-content: center`라 라벨을 흐름에 두면 '기간'이
 * 가운데에서 밀려난다.
 */
export const AxisEndLabel = styled.span<{ $side: 'start' | 'end' }>`
  display: none;

  /* 기간 트랙이 104px 이상인 대역부터 — 그 아래(48~96px)에서는 두 라벨과 '기간'이
     서로 겹친다. */
  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
    display: block;
    position: absolute;
    ${({ $side }) => ($side === 'start' ? 'left: 1px;' : 'right: 1px;')}
    top: 50%;
    transform: translateY(-50%);
    /* 9px · opacity 0.75였다. 실측 대비 4.06:1(다크)로 9px 글자가 읽히는 값이 아니라,
       머리글 줄에서 '1월'·'12월'이 글자가 아니라 **쉼표 같은 얼룩**으로 보였다.
       이 두 라벨은 기간 열이 '한 해'라는 사실을 화면에 적는 유일한 잉크인데, 읽히지
       않으면 그 열은 점 하나짜리 칸으로만 읽힌다. 한 단 키우고 불투명도를 올린다. */
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0;
    color: ${metaText};
    opacity: 0.92;
    pointer-events: none;
    white-space: nowrap;
  }
`

/**
 * 정렬 글리프 — 정렬 중인 열은 방향을, 그 밖의 정렬 가능한 열은 **흐린 ▾**를 단다.
 *
 * idle 글리프는 '이 칸은 누르면 줄이 선다'는 안내다. 0.18은 라벨(11px/700)의 잉크를
 * 흐리지 않으면서 존재는 읽히는 값이고, 머리글에 hover가 오면 한 단 진해져 어느 칸을
 * 누르려는지 확인시켜 준다(터치에는 hover가 없으므로 idle 상태만으로도 성립해야 한다).
 */
export const ColumnSortCaret = styled.span<{ $idle?: boolean }>`
  margin-left: 3px;
  font-size: 7px;
  line-height: 1;
  vertical-align: 1px;
  letter-spacing: 0;
  opacity: ${({ $idle }) => ($idle ? 0.18 : 0.75)};
  transition: opacity ${MOTION.fast};

  ${({ $idle }) =>
    $idle &&
    css`
      [data-col]:hover > & {
        opacity: 0.5;
      }
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
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
 * 군주 즉위 표지 — 연대 흐름 사이의 '👑 ◁[세종 즉위 1418–1450]'.
 *
 * 축 위 왕관이 **말하는** 말풍선으로 그린다. 예전엔 배경 없는 메타 한 줄이었는데,
 * 사건 행 사이에 끼면 행의 부스러기(설명 줄이 밀려 내려온 것)처럼 읽혔고, 왕관과 글이
 * 32px 떨어져 있어 둘이 한 표지라는 연결도 약했다. 말풍선은 ① 자기 윤곽으로 행과 다른
 * 종류의 것임을 말하고 ② 꼬리가 왕관을 가리켜 '이 축 위 지점의 주석'임을 말한다.
 * 사건 행보다 가볍게 — 내용 폭만 차지하는 작은 상자, 옅은 호박 면(왕관과 같은 계열).
 * 읽기 위계는 세 단 — 이름(본문색·굵게) > 기간(보조색) > 나라·햇수(메타색).
 */
export const ReignMarker = styled.div<{
  /** 즉위만 있는 해 — 연 머리글과 말풍선을 한 줄로 합친 행 */
  $asYear?: boolean
  $beforeCentury?: boolean
}>`
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 12px;
  row-gap: 4px;
  ${bleedToEdges}
  /* 좌단 = 행 내용과 같은 x(레일 거터 + 행 안쪽 여백) — 즉위일이 행 날짜 열에 선다.
     즉위만 있는 해(연 라벨 행)는 연 머리글과 같은 x(레일 거터)에서 시작한다. */
  padding: 6px var(--list-pad-r, 20px) 6px
    ${({ $asYear }) =>
      $asYear
        ? 'var(--rail-gutter)'
        : 'calc(var(--rail-gutter) + var(--row-pad-l, 10px))'};
  column-gap: var(--row-col-gap, 12px);

  @media (max-width: 640px) {
    padding-left: var(--rail-gutter);
    /* 날짜(또는 연 라벨)와 말풍선을 한 줄에 둔다 — 감싸면 날짜가 말풍선 위로 홀로 올라가
       꼬리가 가리킬 대상을 잃는다. 좁으면 말풍선 **안**에서 줄을 바꾼다. */
    flex-wrap: nowrap;
  }
  /* 세기 머리글 바로 앞이면 그 세기에 붙어 읽히지 않게 띄운다 — 표지는 앞 시대의 끝이다 */
  margin-bottom: ${({ $beforeCentury }) => ($beforeCentury ? '14px' : '0')};
  /* 연 머리글 자리를 대신하므로 머리글과 같은 위 여백을 받는다 */
  ${({ $asYear }) =>
    $asYear &&
    css`
      margin-top: var(--year-mt);
    `}
  font-size: calc(var(--row-meta, 12px) + 0.5px);
  line-height: 1.55;
  letter-spacing: 0;
  color: ${metaText};
`

/** 축 위 왕관 — 연 도트와 같은 좌표. 표면색 원판이 축을 끊고, 얇은 호박 테가 눈금을 만든다 */
/** 공화국 원수·정부 수반(대통령·총리) 표지의 강조색 — 군주 호박과 구별되는 파랑 */
const civicInk = (dark: boolean) => (dark ? '#93c5fd' : '#1d4ed8')
const royalInk = (dark: boolean) => (dark ? '#f0b64a' : '#b45309')

export const ReignMarkerIcon = styled.span<{ $civic?: boolean }>`
  position: absolute;
  left: var(--rail-x);
  top: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised};
  box-shadow: inset 0 0 0 1px
    ${({ theme, $civic }) =>
      $civic
        ? theme.mode === 'dark'
          ? 'rgba(147, 197, 253, 0.45)'
          : 'rgba(29, 78, 216, 0.3)'
        : theme.mode === 'dark'
          ? 'rgba(240, 182, 74, 0.45)'
          : 'rgba(180, 83, 9, 0.35)'};
  color: ${({ theme, $civic }) =>
    $civic ? civicInk(theme.mode === 'dark') : royalInk(theme.mode === 'dark')};
  z-index: 1;
  pointer-events: none;

  svg {
    width: 9px;
    height: 9px;
  }
`

/**
 * 즉위일 — **행 날짜 열과 같은 칸·같은 옷**(우측 정렬, 등폭 숫자, 행 날짜 크기).
 *
 * 연 그룹 안의 말풍선은 즉위일 순으로 행 사이에 끼워지는데(8.10 행과 5.14 행 사이 =
 * 6.15 즉위), 날짜를 싣지 않아 **왜 그 자리인지**를 말하지 못했다. 날짜 열에 세우면
 * 표지가 행과 같은 시간축 위에서 읽힌다. 연도만 아는 즉위는 빈 칸으로 자리만 지킨다 —
 * 말풍선 x가 행마다 흔들리지 않게.
 */
export const ReignMarkerDate = styled.span<{ $civic?: boolean }>`
  flex: none;
  width: var(--col-date, 72px);
  text-align: right;
  font-size: var(--row-meta, 12px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme, $civic }) =>
    $civic ? civicInk(theme.mode === 'dark') : royalInk(theme.mode === 'dark')};

  @media (max-width: 640px) {
    width: auto;
    &:empty {
      display: none;
    }
  }
`


/**
 * 즉위만 있는 해의 연 라벨 — 연 머리글(YearDivider > span)과 같은 옷.
 *
 * 사건 없는 즉위 연도는 예전에 '● 1587년' 머리글 한 줄 + '👑 말풍선' 한 줄, 축 표지 둘로
 * 약 80px을 썼다. 머리글은 말풍선이 이미 말하는 연도 말고는 담은 것이 없고, 펼칠 행도
 * 없어 셰브론은 아무 일도 하지 않았다. 한 줄로 합치고 셰브론 폭만큼 들여 다른 연 라벨과
 * 같은 x에 세운다.
 */
export const ReignYearLabel = styled.span`
  flex: none;
  /* 셰브론(13px) + 라벨 gap(6px) — 다른 연 라벨의 글자 시작점과 맞춘다 */
  margin-left: 19px;
  /* 라벨 칸의 오른쪽 끝을 행 날짜 열의 오른쪽 끝에 맞춘다 — 그래야 이 줄의 말풍선도
     연 그룹 안 말풍선(날짜 열 뒤)과 **같은 x**에서 시작한다. 예전엔 라벨 바로 뒤에 붙어
     두 종류의 말풍선이 22px 어긋나 목록을 내려가며 지그재그로 읽혔다.
     'BC 1046년'처럼 긴 라벨은 min이라 칸을 넘겨 자란다. */
  min-width: calc(var(--row-pad-l, 10px) + var(--col-date, 72px) - 19px);
  font-size: var(--year-label, 13px);
  font-weight: 700;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};

  @media (max-width: 640px) {
    min-width: 0;
  }
`

/**
 * 말풍선 — 같은 자리 즉위들을 가운뎃점으로 이어 쓴 상자.
 *
 * 꼬리는 45° 돌린 정사각형의 왼쪽·아래 테두리다. 면이 상자 테두리를 덮어야 이음매가
 * 안 보이므로 **면은 불투명**이어야 한다(반투명 tint면 꼬리와 상자가 겹친 곳만 진해진다).
 */
export const ReignMarkerList = styled.span`
  /*
   * 중립 떠 있는 알약 — 호박색으로 **칠한** 상자였다. 132개가 목록 전체에 반복되니 면
   * 자체가 소음이었고(포스트잇 같은 인상), 강조가 면·테·날짜·왕관 네 곳에 흩어져
   * 어디에도 초점이 없었다. 면은 지면 위 한 단 떠 있는 중립색 + 머리카락 테 + 부드러운
   * 그림자로 물리고, 호박색은 **동사('즉위')·날짜·왕관**에만 남긴다.
   * ⚠️ 면·테는 불투명이어야 한다 — 꼬리(회전 정사각형)가 상자 테를 덮어 이음매를 지운다.
   */
  --bubble-bg: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d20' : '#ffffff')};
  --bubble-line: ${({ theme }) =>
    theme.mode === 'dark' ? '#303036' : '#e7e5e4'};
  position: relative;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0;
  row-gap: 3px;
  max-width: 100%;
  /* 꼬리가 앞의 날짜(또는 연 라벨)를 가리킨다 — 열 간격 안에 꼬리가 든다. */
  margin-left: 0;
  min-width: 0;
  min-height: 30px;
  padding: 3px 12px;
  border: 1px solid var(--bubble-line);
  /* 한 줄이면 완전한 알약(높이 30의 절반), 줄이 넘어가도 모서리가 과하게 부풀지 않는 값 */
  border-radius: 15px;
  background: var(--bubble-bg);
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 1px 2px rgba(0, 0, 0, 0.45)'
      : // 번짐은 행 위아래 여백(6px) 안에 든다 — 넘치면 구간 경계에서 잘려 각진 띠가 남았다
        '0 1px 2px rgba(28, 25, 23, 0.06), 0 2px 6px -2px rgba(28, 25, 23, 0.1)'};

  /* 초상으로 시작하는 항목이 첫 항목이면 알약 왼쪽 안쪽 여백을 초상이 채운다(아바타 칩) */
  &:has(> :first-child > img:first-child) {
    padding-left: 4px;
  }

  &::before {
    content: '';
    position: absolute;
    left: -5px;
    top: 50%;
    width: 8px;
    height: 8px;
    background: var(--bubble-bg);
    border-left: 1px solid var(--bubble-line);
    border-bottom: 1px solid var(--bubble-line);
    transform: translateY(-50%) rotate(45deg);
  }

  @media (forced-colors: active) {
    border-color: CanvasText;
    &::before {
      display: none;
    }
  }

`

/** 동군연합 등으로 묶인 항목의 나라 꼬리표들 */
export const ReignMarkerCountries = styled.span`
  display: inline-flex;
  align-items: baseline;
  /* 나라 → 이름 사이는 항목 안 간격(5px)보다 한 단 넓게 — 둘이 한 낱말로 붙어 읽히지 않게 */
  margin-right: 2px;
`

export const ReignMarkerItem = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;

  /* 한 항목(나라 꼬리표 여럿 + 이름 + 기간)이 390px 폭을 넘는다 — 조각 단위로 줄을 바꾼다 */
  @media (max-width: 640px) {
    flex-wrap: wrap;
    row-gap: 2px;
  }

  /* 항목 사이는 **세로 괘선** — 가운뎃점은 이제 나라 사이(독일 제국 · 프로이센 왕국)와
     기간·햇수 사이가 쓰므로, 항목 경계까지 같은 점이면 어디서 한 군주가 끝나는지 안 보인다.
     구분자는 **앞 항목 끝**에 붙인다 — 뒤 항목 머리에 두면 말풍선 안에서 줄이 넘어갈 때
     새 줄이 구분자로 시작했다(390px 실측). */
  &:not(:last-child)::after {
    content: '';
    align-self: center;
    width: 1px;
    height: 11px;
    margin: 0 7px;
    background: var(--bubble-line);
  }
`

/** 군주 이름 — 표지의 주인공. 누르면 공용 인물 모달 */
export const ReignMarkerName = styled.span`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: default;

  &:is(button) {
    cursor: pointer;
    border-radius: 3px;
    text-decoration: underline;
    text-decoration-color: transparent;
    text-underline-offset: 3px;
    transition: text-decoration-color 0.12s ease, color 0.12s ease;

    &:hover {
      color: ${({ theme }) => (theme.mode === 'dark' ? '#f0b64a' : '#b45309')};
      text-decoration-color: currentColor;
    }

    &:focus-visible {
      outline: 2px solid
        ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
      outline-offset: 2px;
    }
  }
`

export const ReignMarkerSpan = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;
`

/** '즉위' — 이름에 붙는 동사. 메타색·한 단 작게 */
export const ReignMarkerLabel = styled.span<{ $civic?: boolean }>`
  font-size: 0.92em;
  font-weight: 600;
  /* 표지의 유일한 색 글자 — 날짜·축 표지와 같은 색으로 '무슨 표지인가'를 말한다
     (군주 즉위 = 호박, 대통령·총리 취임 = 파랑) */
  color: ${({ theme, $civic }) =>
    $civic ? civicInk(theme.mode === 'dark') : royalInk(theme.mode === 'dark')};
`

/** 직함 — '대통령'·'총리'. 이름 앞 보조색 글자(나라와 같은 무게) */
export const ReignMarkerRole = styled.span`
  font-size: 0.92em;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

/** 재위 기간 — 보조색·등폭 숫자 */
export const ReignMarkerYears = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

/**
 * 섞여 든 나라(주류 나라는 생략) — 이름 앞 **맨 글자**.
 *
 * 채운 꼬리표였는데, 채운 말풍선 안의 채운 알약이라 상자가 두 겹이었고 동군연합에서는
 * 알약 둘(약 150px)이 군주 이름보다 먼저·더 크게 읽혔다. 말풍선의 주인공은 사람이다 —
 * 나라는 한 단 작은 보조색 글자로 물러난다.
 */
export const ReignMarkerCountry = styled.span`
  font-size: 0.92em;
  color: ${({ theme }) => theme.colors.text.secondary};

  & + &::before {
    content: '·';
    margin: 0 4px;
    color: ${metaText};
  }
`

/**
 * 초상 — 말풍선 글자 줄 높이 안에 드는 20px 원. 얼굴이 원의 위쪽에 오는 초상화가 많아
 * 위쪽 기준으로 자른다. 옅은 테로 호박 면과 가른다.
 */
export const ReignMarkerPortrait = styled.img`
  flex: none;
  align-self: center;
  width: 22px;
  height: 22px;
  margin-right: 3px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center 20%;
  box-shadow: 0 0 0 1px var(--bubble-line);
  background: var(--bubble-line);
`

/** 재위 햇수 — 기간 뒤 메타 글자. 가운뎃점으로 기간과 가른다 */
export const ReignMarkerLength = styled.span`
  color: ${metaText};
  font-variant-numeric: tabular-nums;

  &::before {
    content: '·';
    margin-right: 5px;
  }
`

export const YearSection = styled.div`
  display: flex;
  flex-direction: column;

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
  ${bleedToEdges}
  margin-top: var(--year-mt);
  margin-bottom: var(--year-mb);
  /* 세로 패딩 6 → 3. 머리글이 51개에서 119개로 늘어난 만큼(모든 연 그룹) 한 벌의
     높이를 줄여 총량을 지킨다 — 라벨은 13px 한 줄이라 3px 패딩으로 충분하다. */
  padding: 3px calc(var(--list-pad-r, 20px) + 12px) 3px var(--rail-gutter);
  min-height: var(--year-h);
  border: none;
  /*
   * 선 3단 사다리 — 행 괘선 0.08 < 연 경계 0.13 < 세기 리더 룰 0.20.
   *
   * ⚠️ 연 경계를 행 괘선 **이하**로 내리면 안 된다. 예전엔 둘 다 0.08로 같아서 그룹
   * 경계와 행 경계가 구별되지 않았고, 한때 0.055까지 내렸더니 이번엔 그룹 경계가 행
   * 경계보다 약해져 위계가 거꾸로 섰다. 세기는 굵기가 아니라 **장치**(라벨에서 우측
   * 끝까지 달리는 리더 룰)로 한 단계 더 올라간다 — 행도 연도도 갖지 않는 모양이다.
   */
  /*
   * (제거) border-top 1px.
   *
   * 그룹 경계를 '선'으로 말하는 동안은 행 경계와 같은 문법을 쓰는 셈이라, 굵기를 아무리
   * 조절해도 '조금 더 진한 행 구분선'을 넘지 못했다. 구분은 이제 ::after가 까는
   * **면(밴드)** 이 맡는다 — 행이 가질 수 없는 신호이고 세로 예산도 0px 더 쓰지 않는다.
   */
  border: none;
  border-radius: 0;
  cursor: pointer;
  text-align: left;
  background: transparent;
  position: sticky;
  /* 사다리의 **두 번째이자 마지막** 단 — 열 머리글 바로 아래 붙는다.
     (세기 헤더가 sticky에서 빠지며 + --century-header-h 항이 사라졌다. 근거는 CenturyDivider) */
  top: var(--col-header-h, 26px);
  z-index: 5;
  transition: background 0.15s ease-out;
  align-self: stretch;

  /* 레일 위 솔리드 indigo 도트 — 시각 anchor. 이전 outline은 약했음.
     ⚠️ 좌표는 --rail-x(카드 안쪽 가장자리 기준)다. 밴드가 전폭으로 번지기 전에는 밴드의
     좌단이 곧 축선이라 left:0이었다 — 그때 값을 남겨 두면 도트가 보더에 붙는다. */
  &::before {
    content: '';
    position: absolute;
    left: var(--rail-x);
    top: 50%;
    transform: translate(-50%, -50%);
    width: 7px;
    height: 7px;
    border-radius: 50%;
    /*
     * 축 위의 **앵커** — 지면에서 파랑이 남는 두 자리 중 하나(다른 하나는 세기).
     *
     * 규약이 바뀌었다: 반복하는 것(행 눈금 301개)은 중립, **구조를 만드는 것만 파랑**.
     * 그래서 이 도트는 행 눈금보다 진해야 한다 — 2.63:1이었고 새 축선(3.03:1)보다도
     * 흐려서, 축 위에 앵커가 얹힌 게 아니라 축이 앵커를 덮고 지나가는 것처럼 보였다.
     * 라이트 5.17:1 · 다크 7.11:1(행 눈금 5.03 / 4.99보다 위, 세기보다 아래).
     *
     * ⚠️ 다크에서 **세기보다 밝았다**(연 7.11 vs 세기 #2563eb 3.71) — 눈금 3단이 다크에서만
     * 뒤집혀 있었다. 세기 도트를 다크 전용 밝은 파랑으로 올려 같이 고쳤다(CenturyDivider).
     */
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(147, 197, 253, 0.80)' : BRAND.primary};
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
    /*
     * ⚠️ 자기 margin-top까지 위로 덮는다. 세기 헤더와 연 헤더가 둘 다 stuck인 구간에서
     * 그 사이 --year-mt(16px)만큼이 **아무도 덮지 않는 슬릿**이었고, 스크롤되는 행의
     * 윗머리가 그 틈으로 비쳤다. 행 레일 눈금이 되살아난 뒤로는 지나가는 점까지 보여
     * 연 앵커 바로 아래 유령 눈금이 하나 더 있는 것처럼 읽혔다.
     *
     * stuck이 아닐 때 이 구간은 **빈 여백**이다(앞 행의 hairline은 그보다 위에 있다) —
     * 지면색으로 칠해도 시각 결과가 같다.
     */
    top: calc(-1 * var(--year-mt));
    right: 0;
    bottom: 0;
    /*
     * ⚠️ 좌측은 축선 **너머**까지 덮는다(이 버튼의 좌단이 곧 축선이므로 -6px).
     * 예전엔 left 가 --rail-inset 이라 축선 오른쪽에서 시작했는데, 행 레일 눈금이
     * 되살아나자 **본문은 가려지는데 눈금만 뚫고 나오는** 상태가 됐다 — stuck 헤더
     * 아래로 유령 점이 떠다녔다(실측: 행 51~97px이 41~91px 띠에 가려지는데 y=74의
     * 점은 축선 위라 무방비).
     *
     * 덮은 만큼 축선을 **다시 그린다** — 안 그리면 헤더마다 축이 50px씩 끊긴다.
     * 축선 x는 이 띠 안에서 6px(= -left)이고, 그 위에 ::before 앵커가 얹힌다.
     */
    left: 0;
    background:
      ${({ theme }) => railAxisOverlay(theme.mode === 'dark')},
      ${({ theme }) =>
        theme.mode === 'dark' ? GROUP_BAND.dark.year : GROUP_BAND.light.year};
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
    /*
     * 한때 14px/700 primary로 **행 제목과 픽셀 단위로 같았고**, 그걸 17px/800으로 키워
     * 갈랐다. 크기로 이긴 대가가 '오버'였다 — 머리글이 목록보다 커졌다.
     *
     * 지금은 **다른 종류의 글자**로 가른다: 행보다 작고(13 vs 14), 흐리고(tertiary),
     * 자간이 벌어진(+0.04em) 라벨. 행 제목은 절대 그런 옷을 입지 않으므로 크기를 키우지
     * 않고도 동률이 깨진다. 크기는 밀도 토큰이 소유한다(--year-label).
     */
    font-size: var(--year-label, 13px);
    font-weight: 700;
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
    /* metaText였다. '행보다 작고 흐린 라벨'이라는 처방은 맞았지만 흐리기를 너무 멀리
       밀어서, 연 머리글이 자기가 여는 **섹션의 이름**이 아니라 각주처럼 보였다.
       크기는 여전히 행 제목보다 작고 자간도 벌어져 있으므로, 색만 한 단 올려도
       '행과 같은 옷'으로 되돌아가지 않는다. */
    color: ${({ theme }) => theme.colors.text.secondary};

    svg {
      color: ${metaText};
      flex-shrink: 0;
      align-self: center;
      /* 행 디스클로저(0.15s)와 같은 토큰 — 같은 제스처가 두 속도로 갈리지 않게 */
      transition: transform ${MOTION.fast};
    }
  }

  /* ⚠️ hover는 ::after 밴드 **위에** 얹혀야 보인다 — 요소 자신의 background는 음수 z의
     ::after에 덮인다(이 요소가 z-index로 스태킹 컨텍스트를 만든다). 그래서 hover도
     ::after의 색을 바꾼다. */
  &:hover::after {
    background:
      ${({ theme }) => railAxisOverlay(theme.mode === 'dark')},
      ${({ theme }) =>
        theme.mode === 'dark'
          ? GROUP_BAND_HOVER.dark.year
          : GROUP_BAND_HOVER.light.year};
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
  /*
   * ⚠️ 하단 마진 **0**. --year-mb(6px)였는데, 그 6px은 세기 밴드와 연 밴드 사이에서
   * **아무도 칠하지 않는 띠**였다 — 두 헤더가 동시에 stuck인 구간(세기 섹션 내내)에서
   * 그 틈으로 스크롤되는 행이 지나간다. 연 헤더의 ::after는 자기 margin-top(--year-mt)
   * 까지만 위로 덮으므로 이 6px은 사각지대다.
   * 0으로 두면 연 밴드가 세기 밴드에 바로 잇닿아 2단 머리글 블록이 되고, 슬릿이 원천적으로
   * 생기지 않는다(연 헤더 위 숨 틈은 ::after가 칠하는 --year-mt 구간이 그대로 맡는다).
   */
  ${bleedToEdges}
  margin-top: 0;
  margin-bottom: 0;
  padding: 8px calc(var(--list-pad-r, 20px) + 16px) 8px var(--rail-gutter);
  /* --century-header-h를 '선언된 상수'가 아니라 '실제 높이'로 만든다.
   * (세기 헤더가 sticky이던 시절엔 연 헤더의 top이 이 값에 붙어 있어 상수와 실측 높이가
   *  어긋나면 두 띠 사이에 슬릿이 생겼다. 지금은 밴드 높이를 밀도 토큰에 묶는 역할이다.) */
  box-sizing: border-box;
  min-height: var(--century-header-h, 44px);
  /* hairline 2줄 제거 — 세기·연도 헤더가 **같은 굵기** hairline을 쓰던 탓에 목록
     최상단 130px에 동일한 선이 3줄 쌓여, 시대 분기점이라는 사건이 오히려 희석됐다.
     세기 경계는 이제 여백과 타입 크기가 만든다(연도 hairline은 그대로 둔다). */
  border: none;
  border-radius: 0;
  cursor: pointer;
  text-align: left;
  /*
   * ⚠️ sticky가 **아니다**(top: --col-header-h · z-index 6이었다).
   *
   * 고정된 세기 띠가 나르는 정보는 0이다 — 바로 아래 고정된 연도 띠가 '1914년'이라고
   * 말하는 순간 세기는 이미 결정된다. 대가는 컸다: 열 머리글 26 + 세기 44 + 연도 34 =
   * **104px**(1000px 뷰포트의 10%)이 스크롤 내내 고정 크롬으로 묶였고, 명도가 다른 띠
   * 세 개가 쌓여 머리글 블록이 한 덩어리로 읽히지 않았다(사용자 지적: "스크롤 내릴 때
   * 세기·연도 부분이 어색하다").
   *
   * 세기 띠는 흐름 안의 **장(章) 표지**로 남는다 — 그 자리에 도달할 때 한 번 크게 말하고
   * 지나간다. 고정 크롬은 104 → 60px.
   *
   * ⚠️ 되살리려면 YearDivider의 top(= --col-header-h)도 같이 되돌릴 것. 두 값은
   *    한 쌍이다 — 한쪽만 바꾸면 띠가 겹치거나 사이에 슬릿이 생긴다.
   */
  position: relative;
  z-index: 1;
  /* ⚠️ 반투명 금지. 연 헤더는 같은 이유로 이미 솔리드로 고쳐져 있었는데(alpha 0.94에서도
     아래 행이 5~6% 비친다) 세기 헤더만 0.78/0.82로 남아 있었다. 세기 헤더는 섹션 전체
     구간에서 상시 stuck이라 비침이 가장 오래 노출되는 표면이고, blur까지 겹쳐 라벨 뒤에
     회색 얼룩을 만들었다. 실측 표면색으로 완전히 덮는다. */
  /* 세기 밴드 — 연 밴드보다 한 단 진하다. 두 머리글이 같은 표면색이면 남는 차이가
     라벨 크기와 도트뿐이라, 스크롤 중에 '시대가 바뀌었나 해가 바뀌었나'를 매번
     견줘 읽어야 했다. 면의 농도가 그 질문에 먼저 답한다. */
  /* ⚠️ 축선을 **면 위에 다시 그린다** — 전폭 번짐으로 이 밴드가 축을 덮기 때문이다. */
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background:
            ${railAxisOverlay(true)},
            ${GROUP_BAND.dark.century};
          color: ${theme.colors.text.primary};
        `
      : css`
          background:
            ${railAxisOverlay(false)},
            ${GROUP_BAND.light.century};
          color: ${theme.colors.text.primary};
        `}
  transition: background 0.15s ease-out;

  /*
   * 리더 룰 — 라벨 클러스터에서 지면 우측 끝까지. 세기 밴드는 1,400px 폭에 라벨 하나만
   * 얹혀 있어 나머지가 통째로 빈 띠였고, 정작 **경계선은 연도 헤더에만** 있었다
   * (연도가 세기보다 강한 구분으로 보이던 위계 역전). 룰을 여기에 세워 세기가 표 전체를
   * 가로지르는 구분임을 말하고, 연도 쪽 hairline은 한 단계 낮춘다.
   *
   * flex 막내라 남는 폭을 전부 먹는다 — JSX 변경 0.
   */
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    min-width: 24px;
    /* 밴드를 걷어낸 뒤 이 룰이 세기 경계의 **유일한** 장치다. 그만큼 한 단 낮춰도
       충분히 보이고(행 괘선 0.08 대비 여전히 두 배), 면이 없어진 자리에서 선까지
       진하면 이번엔 선이 혼자 도드라진다. */
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(15, 23, 42, 0.13)'};
  }

  /* 레일 축선 위 솔리드 큰 도트 — 시대 분기. 좌표는 --rail-x(카드 안쪽 가장자리 기준). */
  &::before {
    content: '';
    position: absolute;
    left: var(--rail-x);
    top: 50%;
    transform: translate(-50%, -50%);
    /* 행 5 : 연 7 : 세기 10 — 축 위 눈금 3단. */
    width: 10px;
    height: 10px;
    border-radius: 50%;
    /* ⚠️ 다크에서도 #2563eb(3.71:1)를 쓰고 있었다 — 같은 축의 연 앵커가 7.11:1이라
       3단 중 맨 위가 가운데보다 어두웠다. 다크는 밝은 파랑 원색(10.63:1)으로. */
    background: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : BRAND.primary};
    /*
     * 지면색 링 하나만 남긴다(축선 위에 얹히므로 필요하다).
     *
     * ⚠️ 한때 15px + 브랜드 외곽링의 **이중 링**이었다. '크기만 다르면 큰 점인지 작은
     * 점인지 매번 견줘야 한다'는 근거였는데, 그건 머리글이 회색 밴드에 얹혀 있어 라벨
     * 자체가 약할 때의 보상이었다. 라벨이 제 옷(크기·색·자간)을 입은 지금 도트는
     * 눈금이면 충분하고, 이중 링은 목록에서 가장 무거운 장식이 된다.
     */
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised};
    z-index: 1;
    pointer-events: none;
  }


  /* (제거됨) 예전의 '& + button' — 세기 직후 첫 연도 divider 상단선 제거.
   * YearSection 래퍼가 생기며 형제 관계가 끊겼다. 같은 역할을 YearSection의
   * '&:first-of-type > button'이 이어받는다. */

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? `${railAxisOverlay(true)}, ${GROUP_BAND_HOVER.dark.century}`
        : `${railAxisOverlay(false)}, ${GROUP_BAND_HOVER.light.century}`};
  }

  /* 첫 세기 — 축은 이 도트의 중심에서 시작한다. 밴드가 위쪽 절반에도 축을 다시 그리면
   * 목록 최상단에서 도트 위로 축 토막이 솟아, 시간축이 도트가 아니라 머리글(모바일은 카드
   * 윗변)에서 흘러내리는 것처럼 보였다. 특이도가 더 높아 :hover의 background 단축형이
   * 크기·위치를 되돌리지 못한다. */
  ${CenturySection}:not(${CenturySection} + ${CenturySection}) > & {
    background-position: 0 100%;
    background-size: 100% 50%;
    background-repeat: no-repeat;
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
  /* 세기 : 행 제목 : 연도 = 21 : 14 : 13(cozy)로 **세 단 단조**.
     한때 20 : 14 : 14로 아래 두 단이 같았고(연 머리글이 행과 구별되지 않던 근인),
     2026-09-25 실측에서도 연 14 = 행 14로 다시 동률이 돼 있었다 — 연 라벨을 한 단
     내려 되돌린다(머리글은 행보다 **작고** 흐리고 자간이 벌어진 다른 종류의 글자다).
     크기는 밀도 토큰이 소유한다(--century-label · --year-label). */
  font-size: var(--century-label, 18px);
  /* 800은 레포 전체에서 여기 한 곳뿐이었다 — 위계는 크기가 이미 만들고 있고,
     굵기까지 최대치를 쓰면 화면에서 가장 큰 텍스트가 필요 이상으로 무거워진다. */
  font-weight: 700;
  /* 같은 레포가 "한글에 라틴 트래킹을 그대로 쓰지 않는다"를 명문화해 놓고, 정작 화면에서
     가장 큰 텍스트가 -0.02em으로 그 규약을 어기고 있었다. */
  letter-spacing: -0.01em;
  /* 세기 숫자가 자릿수에 따라 흔들리지 않게 — 형제(연도·건수)에는 이미 걸려 있었다 */
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  /* 한글은 기본 줄바꿈이 **글자 단위**라, 좁은 폭에서 '21세 / 기'처럼 낱말이 쪼개졌다.
     낱말 단위로만 꺾는다 — 연도 범위는 CenturyDividerYears가 통째로 넘긴다. */
  word-break: keep-all;

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
  /* '(1901–' / '2000)'으로 토큰 중간에서 접히던 것 — 좁은 폭에서는 통째로 다음 줄에
     가거나 리더 룰이 줄어들면 된다. 연도 범위가 두 줄에 걸치면 값처럼 읽히지 않는다. */
  white-space: nowrap;
`

/* 카운트 — chip 외곽 제거, 단색 회색 숫자만 (datum-style) */
export const CenturyDividerCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.005em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
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
  /* (제거) 자체 장식 축 — 2px 회색 그라디언트 선 + 16px 속 빈 원, 그리고 그 자리를 위한
     margin-left 40px. 목록 축(1px · RAIL_AXIS · --rail-x)과 **굵기·색·x가 모두 다른 두 번째
     축**이라, 결과가 0건이 되는 순간 시간축이 옆으로 튀고 최소 높이(420px)에서 카드
     한가운데서 뚝 끊겼다. 원도 안내 문구와 높이가 맞지 않아 무엇을 가리키는지 없었다.
     빈 상태는 '사건이 없다'는 **문장**이다 — 시간축 장식 없이 카드 중앙에 둔다.
     (목록 축 자체는 스크롤러 배경이라 빈 상태에서는 원래 그려지지 않는다.) */

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
  /* 좁은 카드에서 '초 / 기화해보세요'처럼 낱말 중간에서 꺾이던 것 — 한글도 낱말 단위로 */
  word-break: keep-all;

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