/**
 * List Styled Components
 * 이벤트 리스트 관련 스타일 — ledger polish 톤(평면, 단색, 축소된 모션) 적용.
 */
import styled, { css } from 'styled-components'

import type { HistoricalEventCategory } from '../create/events.types'
import { BRAND, CATEGORY_BADGE_COLORS, MOTION, SHADOW } from './theme'

/**
 * 타임라인 레일 — 좌측 gutter(70px) 한가운데(32px)에 1px 수직선.
 *
 * `background-attachment: local`로 스크롤 콘텐츠와 함께 흐르도록 함. (fixed/scroll와 달리
 * 콘텐츠 길이만큼 늘어나서 위/아래 어디로 스크롤해도 레일이 끊기지 않음.)
 *
 * Year/Century divider의 도트(left:32px)와 CollapsedPlaceholder::after(left:-38px)가
 * 모두 이 레일 좌표에 정렬됨 — 시간축의 *눈금*과 *압축 구간*으로 읽힌다.
 */
export const CompactList = styled.div`
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
  padding: 4px 12px 120px 70px;
  position: relative;

  background-image: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(
          to right,
          transparent 31px,
          rgba(147, 197, 253, 0.14) 31px,
          rgba(147, 197, 253, 0.14) 32px,
          transparent 32px
        )`
      : `linear-gradient(
          to right,
          transparent 31px,
          rgba(37, 99, 235, 0.16) 31px,
          rgba(37, 99, 235, 0.16) 32px,
          transparent 32px
        )`};
  background-attachment: local;
  background-repeat: no-repeat;

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
export const YearDivider = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 22px -12px 8px -38px;
  padding: 8px 12px 8px 38px;
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
  top: 44px;
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

  /* sticky 시 라벨 쪽만 흐릿한 frosted bg — 본문 텍스트 위에 떠도 가독 유지.
   * 도트(left:0) 와 padding-left:38 사이는 transparent — 레일이 그대로 보임. */
  &::after {
    content: '';
    position: absolute;
    left: 38px;
    top: 0;
    right: 0;
    bottom: 0;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(15, 15, 18, 0.7)'
        : 'rgba(255, 255, 255, 0.78)'};
    backdrop-filter: blur(8px) saturate(160%);
    -webkit-backdrop-filter: blur(8px) saturate(160%);
    z-index: -1;
  }

  &:first-child {
    margin-top: 0;
    border-top: none;
  }

  /* span = 라벨 (chevron + 연도 + 카운트) — 도트 옆 인라인 */
  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};

    svg {
      color: ${({ theme }) => theme.colors.text.tertiary};
      flex-shrink: 0;
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
  }
`

/* 연도 옆 카운트 — chip 제거, 회색 datum-style 숫자 */
export const CollapsedCount = styled.span`
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  margin: 28px -38px 8px -38px;
  padding: 10px 16px 10px 38px;
  width: calc(100% + 38px);
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

  &:first-child {
    margin-top: 0;
  }

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
      color: #94a3b8;
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
  margin: 2px 0 6px 0;
  padding: 8px 14px;
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
            transparent 5px,
            rgba(147, 197, 253, 0.045) 5px,
            rgba(147, 197, 253, 0.045) 9px
          );
          border: 1px dashed rgba(147, 197, 253, 0.18);
        `
      : css`
          background-color: rgba(37, 99, 235, 0.02);
          background-image: repeating-linear-gradient(
            -45deg,
            transparent 0,
            transparent 5px,
            rgba(37, 99, 235, 0.045) 5px,
            rgba(37, 99, 235, 0.045) 9px
          );
          border: 1px dashed rgba(37, 99, 235, 0.22);
        `}

  /* 레일 → placeholder 연결선 */
  &::before {
    content: '';
    position: absolute;
    left: -38px;
    top: 50%;
    width: 38px;
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
    left: -38px;
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
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: -0.005em;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#64748b' : '#94a3b8'};
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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#94a3b8')};

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
          color: #64748b;
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
export const CatalogSection = styled.section`
  display: flex;
  flex-direction: column;
  height: 100%;
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

export const HeadOfStateSection = styled.div<{ $depth: number }>`
  margin-top: 8px;
  padding: 10px 12px;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.04),
    rgba(37, 99, 235, 0.03)
  );
  border-radius: 8px;
  border: 1px solid rgba(37, 99, 235, 0.1);
  margin-left: ${({ $depth }) => $depth * 24}px;
`

export const HeadOfStateTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: rgba(37, 99, 235, 0.8);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
  svg {
    width: 12px;
    height: 12px;
  }
`

export const HeadOfStateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const HeadOfStateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(37, 99, 235, 0.1);
          &:hover {
            border-color: rgba(37, 99, 235, 0.2);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `
      : css`
          background: white;
          border: 1px solid rgba(37, 99, 235, 0.08);
          &:hover {
            border-color: rgba(37, 99, 235, 0.2);
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.08);
          }
        `}
`

export const HeadOfStateAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.15),
    rgba(37, 99, 235, 0.1)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: rgba(37, 99, 235, 0.9);
  flex-shrink: 0;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const HeadOfStateInfo = styled.div`
  flex: 1;
  min-width: 0;
`

export const HeadOfStateName = styled.div`
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const HeadOfStateDetails = styled.div`
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(20, 19, 34, 0.6)'};
`

export const HeadOfStateCountry = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: rgba(37, 99, 235, 0.08);
  border-radius: 4px;
  font-weight: 500;
  color: rgba(37, 99, 235, 0.9);
`

export const HeadOfStatePosition = styled.span`
  font-weight: 500;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(20, 19, 34, 0.7)'};
`

export const HeadOfStateTenure = styled.span`
  font-size: 9px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
`

export const TenureStartYearRow = styled.div`
  margin: 4px 0 8px 12px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(37, 99, 235, 0.75);
  background: rgba(37, 99, 235, 0.06);
  border-radius: 6px;
  border-left: 2px solid rgba(37, 99, 235, 0.25);
`

export const TenureEndYearRow = styled.div`
  margin: 4px 0 8px 12px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(37, 99, 235, 0.75);
  background: rgba(37, 99, 235, 0.06);
  border-radius: 6px;
  border-left: 2px solid rgba(37, 99, 235, 0.25);
`

export const TenureGroupHeader = styled.div<{
  $depth: number
  $clickable?: boolean
}>`
  margin: 12px 0 6px 0;
  padding: 8px 12px;
  background: rgba(37, 99, 235, 0.04);
  border-radius: 6px;
  border-left: 3px solid rgba(37, 99, 235, 0.5);
  position: relative;
  margin-left: ${({ $depth }) => $depth * 24}px;
  display: flex;
  align-items: center;
  gap: 8px;
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    width: 100%;
    text-align: left;
    border: none;
    border-left: 3px solid rgba(37, 99, 235, 0.5);
    transition: background 0.2s ease;
    &:hover { background: rgba(37, 99, 235, 0.08); }
  `}
`

export const TenureGroupTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: rgba(37, 99, 235, 0.8);
  display: flex;
  align-items: center;
  gap: 6px;
  svg {
    width: 13px;
    height: 13px;
  }
`

export const TenureGroupInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  flex: 1;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const TenureGroupExpandButton = styled.button`
  padding: 4px 8px;
  background: rgba(37, 99, 235, 0.1);
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 6px;
  color: rgba(37, 99, 235, 0.9);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  margin-left: auto;
  svg {
    width: 12px;
    height: 12px;
  }
  &:hover {
    background: rgba(37, 99, 235, 0.15);
    border-color: rgba(37, 99, 235, 0.3);
  }
`

export const TenureDetailsPanel = styled.div`
  margin: 0 0 8px 0;
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid rgba(37, 99, 235, 0.25);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
        `
      : css`
          background: rgba(249, 250, 251, 0.9);
        `}
`

export const TenureDetailsHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const TenureSectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const TenureSectionDescription = styled.div`
  font-size: 10px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
`

export const TenureDetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`

export const TenureDetailLabel = styled.span`
  min-width: 44px;
  color: rgba(37, 99, 235, 0.9);
  font-weight: 600;
`

export const TenureDetailValue = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(20, 19, 34, 0.7)'};
`

export const TenureTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const TenureTimelineItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(37, 99, 235, 0.1);
        `
      : css`
          background: #fff;
          border: 1px solid rgba(37, 99, 235, 0.08);
        `}
`

export const TenureTimelinePeriod = styled.span`
  font-size: 10px;
  min-width: 72px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
`

export const TenureTimelineTitle = styled.span`
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const TenureTimelineMeta = styled.span`
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(20, 19, 34, 0.6)'};
`

export const HeadsOfStateYearGroup = styled.div`
  margin: 10px 0 12px 0;
  padding: 0;
  width: 100%;
  display: block;
`

export const HeadsOfStateYearGroupLabel = styled.div`
  margin: 0 0 8px 0;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  color: rgba(37, 99, 235, 0.85);
  width: 100%;
  display: block;
`

export const HeadsOfStateYearGroupToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 4px 0;
  padding: 6px 10px;
  width: 100%;
  border: none;
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.06);
  border-left: 3px solid rgba(37, 99, 235, 0.35);
  font-size: 11px;
  font-weight: 600;
  color: rgba(37, 99, 235, 0.85);
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
  &:hover {
    background: rgba(37, 99, 235, 0.1);
  }
`

export const OtherHeadsOfStateList = styled.div`
  margin: 0 0 6px 0;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid rgba(37, 99, 235, 0.3);
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
        `
      : css`
          background: rgba(249, 250, 251, 1);
        `}
`

export const OtherHeadOfStateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  transition: all 0.2s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(37, 99, 235, 0.08);
          &:hover {
            border-color: rgba(37, 99, 235, 0.15);
            background: rgba(255, 255, 255, 0.06);
          }
        `
      : css`
          background: white;
          border: 1px solid rgba(37, 99, 235, 0.08);
          &:hover {
            border-color: rgba(37, 99, 235, 0.15);
            background: rgba(249, 250, 251, 1);
          }
        `}
`

export const OtherHeadAvatar = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.12),
    rgba(37, 99, 235, 0.08)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: rgba(37, 99, 235, 0.8);
  flex-shrink: 0;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const OtherHeadInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#475569')};
  strong {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
  }
  span {
    color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.4)'
        : 'rgba(20, 19, 34, 0.6)'};
  }
`

export const TenureGroupAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.15),
    rgba(37, 99, 235, 0.1)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: rgba(37, 99, 235, 1);
  flex-shrink: 0;
  overflow: hidden;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'white'};
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const TenureGroupDetails = styled.div`
  flex: 1;
  display: none;
`

export const TenureGroupName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const TenureGroupMeta = styled.div`
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
`

export const TenureGroupBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: rgba(37, 99, 235, 0.08);
  border-radius: 4px;
  font-weight: 500;
  color: rgba(37, 99, 235, 0.9);
  font-size: 10px;
  svg {
    width: 10px;
    height: 10px;
  }
`

/**
 * Tenure 그룹 내부 카드.
 *
 * 이전 버그: `border-left: 4px solid linear-gradient(...)` — `border` 속성은 gradient를
 * 받지 않아 *완전히 무효*. 좌측 보더가 사라져 시각적으로 group 인지가 약했음.
 * → `border-left`는 단색만 사용. 그라데이션 효과는 ::before pseudo로 구현 가능하지만
 *    평면 톤 정책이라 단색 alpha로 충분.
 */
export const CompactListItemInTenure = styled(CompactListItem)`
  position: relative;
  margin-left: ${({ $depth }) => $depth * 24 + 8}px;

  background: ${({ $active, $depth }) =>
    $active
      ? BRAND.primarySoftHover
      : $depth > 0
        ? 'rgba(248, 250, 252, 0.9)'
        : 'rgba(249, 250, 251, 1)'};

  border-color: ${({ $active }) =>
    $active ? BRAND.primaryBorderHover : 'rgba(37, 99, 235, 0.15)'};

  /* 단색 only — gradient 무효 버그 수정 */
  border-left: 4px solid
    ${({ $active }) =>
      $active ? BRAND.primary : 'rgba(37, 99, 235, 0.35)'};

  &::before {
    left: ${({ $depth }) => -49 - $depth * 24}px;
    width: ${({ $depth }) => 46 + $depth * 24}px;
  }

  &::after {
    left: ${({ $depth }) => -49 - $depth * 24}px;
  }

  &:hover {
    background: ${({ $active }) =>
      $active ? BRAND.primaryFill : '#fafbfd'};
    border-color: ${BRAND.primaryBorderHover};
  }
`

export const TenureGroupFooter = styled.div`
  margin: 6px 0 12px 0;
  padding: 6px 12px;
  background: rgba(37, 99, 235, 0.03);
  border-radius: 4px;
  border-left: 3px solid rgba(37, 99, 235, 0.25);
  font-size: 11px;
  color: rgba(37, 99, 235, 0.7);
  font-weight: 500;
  text-align: center;
`
