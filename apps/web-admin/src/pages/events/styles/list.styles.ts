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
  ROW_TYPE,
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
  padding: 4px 12px 120px var(--rail-gutter);
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
  background-size: 100% calc(100% - var(--rail-tail));

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(37, 99, 235, 0.2);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(37, 99, 235, 0.3);
  }

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
    padding: 4px 10px max(120px, env(safe-area-inset-bottom)) var(--rail-gutter);
  }
`

export type ListItemImportance = 'critical' | 'major' | 'normal'

/**
 * 카드 — 평면 톤. hover translateX/box-shadow lift 제거.
 * 도트 외곽 링은 surface 색에 의존 → CSS 변수 `--surface-bg`로 외부 주입 가능하도록 두되,
 * 기본은 PageScene/drawer 양쪽에서 안전한 currentColor 흉내 (theme 분기).
 *
 * importance 좌측 보더 (active 4px / critical 4px / major 3px) 우선순위 유지.
 */
export const CompactListItem = styled.div<{
  $active: boolean
  $depth: number
  $importance?: ListItemImportance
}>`
  border-radius: 12px;
  padding: 0;
  margin-left: ${({ $depth }) => $depth * 24}px;
  cursor: pointer;
  transition: border-color ${MOTION.fast}, background ${MOTION.fast};
  position: relative;
  display: flex;

  /* importance에 따라 카드 최소 높이 차등 — 한눈 스캔 시 위계 인지 */
  min-height: ${({ $importance }) =>
    $importance === 'critical'
      ? '84px'
      : $importance === 'major'
        ? '68px'
        : '52px'};

  /* 좌측 importance 강조 보더 — active > critical > major 순 우선 */
  border-left: ${({ $active, $importance }) =>
    $active
      ? `4px solid ${BRAND.primary}`
      : $importance === 'critical'
        ? `4px solid ${BRAND.primary}`
        : $importance === 'major'
          ? '3px solid rgba(245, 158, 11, 0.7)'
          : '1.5px solid transparent'};

  /* 타임라인 연결선 — hover 시 폭 변화 미세하게만 */
  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => -41 - $depth * 24}px;
    top: 50%;
    width: ${({ $depth }) => 38 + $depth * 24}px;
    height: 2px;
    background: ${BRAND.primarySoftHover};
    transition: width ${MOTION.fast};
  }

  &:hover::before {
    width: ${({ $depth }) => 40 + $depth * 24}px;
  }

  ${({ theme, $active, $depth }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active
            ? BRAND.primarySoftDark
            : $depth > 0
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(255, 255, 255, 0.04)'};
          border: 1.5px solid
            ${$active
              ? BRAND.primaryBorderHover
              : $depth > 0
                ? 'rgba(37, 99, 235, 0.1)'
                : 'rgba(255, 255, 255, 0.07)'};
          border-left: ${$active
            ? `4px solid ${BRAND.primary}`
            : `1.5px solid ${$depth > 0 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.07)'}`};
          box-shadow: ${$active ? SHADOW.smDark : SHADOW.none};
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: ${$active
              ? BRAND.primaryFillDark
              : 'rgba(255, 255, 255, 0.06)'};
          }
          /* 도트 — 외곽 링 색을 currentColor 기반으로 (drawer/PageScene surface와 무관하게 매끈) */
          &::after {
            content: '';
            position: absolute;
            left: ${-41 - $depth * 24}px;
            top: 50%;
            transform: translateY(-50%);
            width: ${$active ? '10px' : '8px'};
            height: ${$active ? '10px' : '8px'};
            background: ${$active ? BRAND.primary : 'rgba(30, 30, 40, 0.9)'};
            border: 2px solid
              ${$active ? BRAND.primary : BRAND.primaryBorderHover};
            border-radius: 50%;
            transition: background ${MOTION.fast};
            z-index: 1;
          }
          &:hover::after {
            background: ${BRAND.primary};
          }
        `
      : css`
          background: ${$active
            ? BRAND.primarySoft
            : $depth > 0
              ? 'rgba(248, 250, 252, 0.8)'
              : '#ffffff'};
          border: 1.5px solid
            ${$active
              ? BRAND.primaryBorderHover
              : $depth > 0
                ? 'rgba(37, 99, 235, 0.08)'
                : 'rgba(20, 19, 34, 0.08)'};
          border-left: ${$active
            ? `4px solid ${BRAND.primary}`
            : `1.5px solid ${$depth > 0 ? 'rgba(37, 99, 235, 0.08)' : 'rgba(20, 19, 34, 0.08)'}`};
          box-shadow: ${$active ? SHADOW.sm : SHADOW.xs};
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: ${$active ? BRAND.primarySoftHover : '#fafbfd'};
          }
          &::after {
            content: '';
            position: absolute;
            left: ${-41 - $depth * 24}px;
            top: 50%;
            transform: translateY(-50%);
            width: ${$active ? '10px' : '8px'};
            height: ${$active ? '10px' : '8px'};
            background: ${$active ? BRAND.primary : '#ffffff'};
            border: 2px solid
              ${$active ? BRAND.primary : BRAND.primaryBorderHover};
            border-radius: 50%;
            transition: background ${MOTION.fast};
            z-index: 1;
          }
          &:hover::after {
            background: ${BRAND.primary};
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::before,
    &::after {
      transition: none;
    }
  }

  @media (max-width: 768px) {
    min-height: ${({ $depth }) => Math.max(80, 100 - $depth * 10)}px;
  }
`

export const CompactListBody = styled.div`
  display: flex;
  gap: 0;
  width: 100%;
  height: 100%;
  min-height: inherit;
`

export const CompactThumbnail = styled.div<{
  $depth: number
  $isEmpty?: boolean
}>`
  width: ${({ $depth }) => Math.max(60, 90 - $depth * 10)}px;
  align-self: stretch;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 12px 0 0 12px;
  overflow: hidden;
  background-color: ${({ $isEmpty }) =>
    $isEmpty ? 'rgba(37, 99, 235, 0.05)' : 'transparent'};

  ${({ $isEmpty }) =>
    $isEmpty &&
    `
    display: flex;
    align-items: center;
    justify-content: center;

    &::before {
      content: '';
      width: 24px;
      height: 24px;
      background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="rgba(37, 99, 235, 0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpolyline points="21 15 16 10 5 21"/%3E%3C/svg%3E');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.4;
    }
  `}

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $isEmpty }) =>
      $isEmpty
        ? 'none'
        : 'linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.05) 100%)'};
  }
`

export const CompactCategoryBadge = styled.span<{
  $category: HistoricalEventCategory
}>`
  position: absolute;
  bottom: 6px;
  left: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  z-index: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $category }) => {
    const color = CATEGORY_BADGE_COLORS[$category]
    return `${color}E6`
  }};
`

export const CompactListContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  min-width: 0;
`

export const CompactListHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  min-width: 0;
`

/* 평면 톤 — hover scale 제거. */
export const ExpandButton = styled.button`
  border-radius: 6px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: ${BRAND.primary};
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  flex-shrink: 0;
  margin-top: 1px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${BRAND.primarySoftDark};
          border: 1px solid rgba(37, 99, 235, 0.25);
          &:hover {
            background: ${BRAND.primaryFillDark};
            border-color: ${BRAND.primaryBorderHover};
          }
        `
      : css`
          background: #fff;
          border: 1px solid ${BRAND.primaryBorder};
          &:hover {
            background: ${BRAND.primarySoftHover};
            border-color: ${BRAND.primaryBorderHover};
          }
        `}

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const ExpandSpacer = styled.span`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
`

export const CompactCategoryDot = styled.span<{
  $category: HistoricalEventCategory
  $depth: number
}>`
  width: ${({ $depth }) => 10 - $depth * 1}px;
  height: ${({ $depth }) => 10 - $depth * 1}px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  border: ${({ $depth }) =>
    $depth > 0 ? '1.5px solid rgba(255, 255, 255, 0.8)' : 'none'};
  background: ${({ $category }) => CATEGORY_BADGE_COLORS[$category]};
  opacity: ${({ $depth }) => Math.max(0.5, 1 - $depth * 0.12)};
`

export const CompactListTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};

  @media (max-width: 768px) {
    font-size: 14px;
    line-height: 1.5;
  }
`

export const CompactListMeta = styled.div<{ $depth: number }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};

  span {
    line-height: 1;
  }

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

export const TimelineDateWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
`

/* 좌측 leading line — 의미 없는 ━━━ 글리프(SR에 읽힘) 제거 후 CSS pseudo border로 대체. */
export const TimelineDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;

  &::before {
    content: '';
    display: inline-block;
    width: 18px;
    height: 1.5px;
    background: ${({ theme }) => (theme.mode === 'dark' ? '#334155' : '#cbd5e1')};
    border-radius: 1px;
    flex-shrink: 0;
  }
`

export const TimelineDuration = styled.div`
  font-size: 10px;
  text-align: center;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#94a3b8')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'};
`

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
    margin-top: 28px;
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
  margin: 22px -12px 8px calc(-1 * var(--rail-inset));
  padding: 8px 12px 8px var(--rail-inset);
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
  top: var(--century-header-h, 44px);
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
      ${({ theme }) => (theme.mode === 'dark' ? '#0f0f12' : '#ffffff')};
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
      theme.mode === 'dark' ? '#141414' : '#ffffff'};
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
      color: ${({ theme }) => theme.colors.text.tertiary};
      flex-shrink: 0;
      align-self: center;
      transition: transform 0.3s ease;
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
    background: ${({ theme }) => (theme.mode === 'dark' ? '#0f0f12' : '#ffffff')};
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
  justify-content: space-between;
  gap: 12px;
  /* 좌측은 레일까지 당기고 우측은 컨테이너 패딩(12px)까지 — YearDivider와 **같은 블리드**.
   * 이전엔 margin-right:-rail 과 width:calc(100% + rail)이 함께 걸려 우측 끝이
   * 콘텐츠 박스 경계에 멈췄고, YearDivider(우측 -12px까지 확장)보다 12px 짧아
   * 두 hairline의 오른쪽 끝이 계단처럼 어긋났다. width 선언을 지우고 stretch에 맡긴다. */
  /* 세기 사이 간격은 'CenturySection + CenturySection'이 담당한다 — 여기서 margin-top을
   * 주면 섹션 간격과 이중으로 더해진다. (예전엔 &:first-child로 상쇄했는데, 접근성용
   * GroupHeading이 섹션의 첫 자식이 되면서 그 규칙이 더 이상 매칭되지 않았다.) */
  margin: 0 -12px 8px calc(-1 * var(--rail-inset));
  padding: 10px 16px 10px var(--rail-inset);
  /* --century-header-h를 '선언된 상수'가 아니라 '실제 높이'로 만든다.
   * YearDivider가 top: var(--century-header-h)로 이 값에 붙으므로, 상수(44px)와 실측
   * 높이(41px)가 어긋나면 두 sticky 띠 사이에 3px 슬릿이 생긴다. */
  box-sizing: border-box;
  min-height: var(--century-header-h, 44px);
  border: none;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'};
  border-radius: 0;
  cursor: pointer;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 6;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(15, 15, 18, 0.78);
          color: ${theme.colors.text.primary};
        `
      : css`
          background: rgba(255, 255, 255, 0.82);
          color: ${theme.colors.text.primary};
        `}
  backdrop-filter: blur(10px) saturate(160%);
  -webkit-backdrop-filter: blur(10px) saturate(160%);
  transition: background 0.15s ease-out;

  /* 레일(divider padding-box left=rail) 솔리드 큰 도트 — 시대 분기 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${BRAND.primary};
    box-shadow: 0 0 0 3px
      ${({ theme }) => (theme.mode === 'dark' ? '#0f0f12' : '#ffffff')};
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
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
    align-self: center;
    transition: transform 0.3s ease;
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

export const DateDivider = styled.button`
  display: flex;
  align-items: center;
  margin: 16px 0 8px -70px;
  padding: 0;
  background: transparent;
  border: none;
  width: calc(100% + 70px);
  cursor: pointer;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 32px;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    background: rgba(37, 99, 235, 0.4);
    border-radius: 50%;
    z-index: 1;
  }

  span {
    margin-left: 52px;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 10px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            color: #64748b;
            border: 1px solid rgba(255, 255, 255, 0.07);
          `
        : css`
            color: #64748b;
            border: 1px solid rgba(203, 213, 225, 0.4);
          `}

    svg {
      transition: transform 0.2s ease;
      color: ${({ theme }) => theme.mode === 'dark' ? '#71717a' : '#94a3b8'};
    }
  }

  &:hover span {
    border-color: rgba(37, 99, 235, 0.25);
  }
`

export const SimpleYearLabel = styled.div`
  margin: 12px 0 8px 0;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  background: transparent;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#94a3b8')};
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
      theme.mode === 'dark' ? '#0f0f12' : '#ffffff'};
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

export const CompactListSummary = styled.p<{ $depth: number }>`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: break-word;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#475569')};

  @media (max-width: 768px) {
    font-size: 13px;
    line-height: 1.6;
  }
`

export const ImportanceBadge = styled.span<{ $major?: boolean }>`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $major }) =>
    $major ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
  color: ${({ $major }) => ($major ? '#d97706' : '#dc2626')};
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
export const SummaryIconButton = styled.button`
  border: none;
  background: ${BRAND.primarySoftHover};
  padding: 4px 6px;
  border-radius: 6px;
  color: ${BRAND.primary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background ${MOTION.fast}, color ${MOTION.fast};
  flex-shrink: 0;
  margin-left: 6px;

  &:hover {
    background: ${BRAND.primaryFill};
    color: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 목록 뷰 카드 컨테이너 — 타임라인 위젯의 cardBase와 시각 family 통일.
 * 1px border + 12px radius + theme bg. 내부의 CompactList가 자체 좌측 레일을 그리므로
 * 별도 ::before 그라데이션 데코는 제거(이중 라인 방지). */
/**
 * 목록 카드.
 *
 * ⚠️ 폭 상한은 **여기**가 소유한다. 예전에는 행 안쪽(Body max-width:880px)이 상한을 들고
 * 있어서, 행 hairline·hover·active tint는 컨테이너 전체 폭(1316px)을 그리는데 정보는
 * 985px에서 끝났다 — 1920에서는 행의 48%가 행 **안쪽** 빈칸이었다. 상한을 카드로 올리면
 * 같은 빈 픽셀이 카드 밖으로 나가 '여백'으로 읽힌다.
 *
 * 1120 = 격자 고정 트랙 합 370(date 66 + chip 60 + dur 56 + flags 128 + act 60)
 *      + gap 60(12×5) + 제목 트랙 608 + Stop 패딩 26 + 목록 패딩 48 + 보더 2.
 *
 * ⚠️ layout.styles.ts에도 같은 이름의 CatalogSection이 있지만 **소비처가 0인 죽은
 * export**다(유일 소비처는 event-compact-list.tsx의 List.CatalogSection). 거기를 고치면
 * 아무 일도 일어나지 않는다.
 */
export const CatalogSection = styled.section`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: min(100%, 1120px);
  max-height: calc(100vh - var(--header-height) - 60px);
  overflow: hidden;
  position: relative;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(20,19,34,0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
`

/* 평면 톤 — hover lift 제거. */
export const ResultControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: ${SHADOW.xs};
        `}
`

export const ToolbarMeta = styled.div`
  font-size: 13px;
  font-weight: 600;
  padding: 5px 10px;
  background: ${BRAND.primarySoftHover};
  border-radius: 6px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};

  span {
    color: ${BRAND.primary};
  }
`

export const ToolbarToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(37, 99, 235, 0.06);
          border: 1px solid rgba(37, 99, 235, 0.15);
        `
      : css`
          background: ${BRAND.primarySoft};
          border: 1px solid ${BRAND.primarySoftHover};
        `}
`

export const ToolbarToggleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ToolbarToggleLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
`

export const ToolbarToggleDescription = styled.span`
  font-size: 10px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
`

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
export const SortDirectionToggle = styled.button<{ $direction?: 'asc' | 'desc' }>`
  border-radius: 8px;
  padding: 0;
  width: 34px;
  height: 34px;
  color: ${BRAND.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color ${MOTION.fast}, background ${MOTION.fast};
  svg {
    transition: transform ${MOTION.base};
    transform: rotate(
      ${({ $direction }) => ($direction === 'asc' ? '180deg' : '0deg')}
    );
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: rgba(37, 99, 235, 0.1);
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid rgba(203, 213, 225, 0.6);
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: #ffffff;
          }
        `}

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
