/**
 * Detail Panel Styled Components
 * 상세 패널 관련 스타일 — ledger polish 적용 (transform/lift 제거, 토큰 사용).
 *
 * 표시 책임 분리:
 *   - desktop (>=1200px): CatalogSplit grid의 두 번째 컬럼이 호스트
 *   - mobile (<1200px): CatalogDetailDrawer가 호스트 (PageStyles.DetailPanelHost)
 *   → DetailPanel 자체는 *어디에 있든 항상 표시*. 이전 `display:none` 분기는 drawer 안에서도
 *      숨기는 버그였음 — 제거.
 */
import styled, { css } from 'styled-components'

import type { HistoricalEventCategory } from '../create/events.types'
import { BRAND, CATEGORY_BADGE_COLORS, DANGER, MOTION, SHADOW } from './theme'

/**
 * Detail panel root — `<section>` (이전 `<aside>`는 drawer dialog 안에 들어가면 SR semantics 충돌).
 * mobile drawer 안에서도 표시되어야 하므로 `display:none` 분기 제거.
 */
export const DetailPanel = styled.section`
  height: 100%;
  border-radius: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
        `}

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.primarySoftHover};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${BRAND.primaryFill};
  }

  /* drawer 안에서는 자체 border 제거 (drawer가 border-left 가짐) */
  @media (max-width: 1200px) {
    border: none;
    border-radius: 0;
  }
`

/**
 * 상세 패널 본문.
 *
 * ⚠️ **측정(measure) 보호가 필요하다.** 전폭 전환에서 패널 폭이 440px 고정 →
 * `clamp(400px, 22vw, 620px)`로 유동이 됐다(layout.styles의 CatalogSplit). 상한이 없으면
 * 3440에서 본문 한 줄이 과하게 길어져, "목록은 105자/줄인데 패널은 30자/줄"이라는 예전
 * 역전이 **반대 방향으로** 재발한다.
 *
 * ch 단위는 폰트 크기를 따라가므로 한글에서도 대략 맞는다(72ch ≈ 한글 36자 안팎).
 * 히어로 이미지·메타 그리드는 패널 폭 전체를 쓰고, **텍스트 블록만** 이 상한을 받는다 —
 * 그래서 여기가 아니라 문단·서술 컴포넌트에 거는 것이 아니라, 컨테이너에서 중앙정렬로
 * 처리한다(자식이 stretch면 이미지도 같이 좁아진다).
 */
export const DetailPanelContent = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;

  /* 읽기 지면 상한 — 패널이 넓어질 때만 실제로 걸린다(좁을 땐 no-op). */
  > * {
    max-width: 72ch;
    margin-inline: auto;
    width: 100%;
  }

  /* 히어로는 지면 전체를 쓴다 — 상한을 받으면 좌우에 흰 띠가 생긴다 */
  > figure {
    max-width: none;
  }
`

/**
 * Hero image / category chip은 새 `HeroFigure` + `CategoryChip`으로 대체됨 (위젯에서 사용).
 * 이전 컴포넌트는 사용처 0이라 제거.
 */

export const DetailPanelEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 24px;
  position: relative;
  @media (max-width: 768px) { min-height: 320px; padding: 32px 20px; }
`

/* EmptyResults(40px+18px)와 비례 통일 */
export const DetailPanelEmptyIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
    color: ${BRAND.primary};
  }
`

export const DetailPanelEmptyContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

export const DetailPanelEmptyTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#1e293b'};
  @media (max-width: 768px) { font-size: 14px; }
`

export const DetailPanelEmptyDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#64748b')};
  animation: textPulse 3s ease-in-out infinite;

  @keyframes textPulse {
    0%, 100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }

  /* 운동 민감 사용자 — pulse 정지 */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.85;
  }

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

/**
 * 헤더 — sticky top. 본문 길어져도 제목/액션 항상 보임.
 * 배경색은 panel surface와 동일 (불투명) — 스크롤 시 본문이 비치지 않게.
 */
export const DetailPanelHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  position: sticky;
  top: 0;
  z-index: 2;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: #0f0f12;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #ffffff;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        `}

  @media (max-width: 768px) {
    padding: 14px 16px;
  }
`

/* 제목 + X 닫기 버튼 row — 제목은 flex-grow, 닫기는 flex-shrink-none */
export const DetailTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`

export const DetailTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
  flex: 1;
  min-width: 0;
`

/* 데스크톱 column 모드에서도 X로 명시적 닫기 — 모바일 drawer 헤더와 동일한 톤 */
export const DetailCloseButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-top: -2px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  }
`

export const DetailDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const DetailSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 24px;
  &:first-of-type { padding-top: 20px; }
`

export const DetailSectionTitle = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

export const DetailStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`

export const DetailStatCard = styled.div`
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
  ` : css`
    background: #fafbff;
    border: 1px solid rgba(20, 19, 34, 0.08);
  `}

  svg { color: #2563eb; flex-shrink: 0; margin-top: 2px; width: 16px; height: 16px; }
  div { display: flex; flex-direction: column; gap: 3px; }
  small { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#64748b'}; }
  strong { font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#0f172a'}; }
`

export const DetailText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const DetailFiguresList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DetailFigureCard = styled.div`
  border-radius: 10px;
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  div { display: flex; flex-direction: column; gap: 2px; }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    strong { font-size: 12px; color: #e2e8f0; }
    span { font-size: 11px; color: #64748b; }
    small { font-size: 10px; color: #475569; }
  ` : css`
    background: #fafbff;
    border: 1px solid rgba(20, 19, 34, 0.08);
    strong { font-size: 12px; color: #0f172a; }
    span { font-size: 11px; color: #475569; }
    small { font-size: 10px; color: #64748b; }
  `}
`

export const DetailFigureAvatar = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
`

export const DetailCountriesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const DetailCountryTag = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 600;
`

export const DetailChildrenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

/**
 * 하위 사건 항목의 날짜 — 제목 바로 아래 한 줄.
 * 예전엔 드로어의 하위 목록에 날짜가 아예 없어, 목록에서 보던 시간 순서와 대조할 수
 * 없었다(검토 DISC-7). `span` 규칙(요약)과 색·크기를 나눠 두 줄이 구별되게 한다.
 */
export const DetailChildDate = styled.time`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 하위 사건 목록 하단 액션 줄 — '더 보기'와 '전체 계층 구조 보기'. */
export const DetailChildrenMoreRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`

/** '나머지 N개 더 보기' — 텍스트 버튼. */
export const DetailChildrenMoreButton = styled.button`
  border: none;
  background: transparent;
  padding: 4px 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${BRAND.primary};
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;

  &:hover {
    text-decoration: underline solid;
  }
`

export const DetailChildItem = styled.button`
  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(37, 99, 235, 0.12);
          strong { font-size: 12px; font-weight: 600; color: #e2e8f0; }
          span { font-size: 11px; line-height: 1.4; color: #64748b; }
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: ${BRAND.primarySoftDark};
          }
        `
      : css`
          background: #fafbff;
          border: 1px solid rgba(37, 99, 235, 0.12);
          strong { font-size: 12px; font-weight: 600; color: #0f172a; }
          span { font-size: 11px; line-height: 1.4; color: #64748b; }
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: #f0f4ff;
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

export const DetailActions = styled.div`
  padding: 12px 16px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.02);
  ` : css`
    border-top: 1px solid rgba(37, 99, 235, 0.1);
    background: rgba(248, 250, 252, 0.5);
  `}
`

export const SecondaryActionsRow = styled.div`
  display: flex;
  gap: 8px;
`

export const SecondaryActionButton = styled.button`
  flex: 1;
  border-radius: 8px;
  padding: 8px 12px;
  color: ${BRAND.primary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  svg { width: 13px; height: 13px; }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid ${BRAND.primaryBorder};
          &:hover {
            border-color: ${BRAND.primaryBorderHover};
            background: ${BRAND.primarySoftDark};
            color: #93c5fd;
          }
        `
      : css`
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(37, 99, 235, 0.15);
          &:hover {
            border-color: rgba(37, 99, 235, 0.3);
            background: rgba(37, 99, 235, 0.06);
            color: #1d4ed8;
          }
        `}
`

export const ViewAllHierarchyButton = styled.button`
  border-radius: 8px;
  padding: 8px 12px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.2);
          &:hover {
            border-color: rgba(37, 99, 235, 0.4);
            background: rgba(37, 99, 235, 0.14);
          }
        `
      : css`
          background: rgba(37, 99, 235, 0.05);
          border: 1px solid rgba(37, 99, 235, 0.25);
          &:hover {
            border-color: rgba(37, 99, 235, 0.4);
            background: rgba(37, 99, 235, 0.1);
          }
        `}
`

/* Timeline View styled 6종(TimelineContainer·EventCard·EventDate·EventTitle·
   EventSummary·Importance)은 v3 이전부터 사용처 0의 죽은 코드 — 삭제(검토 R42).
   v4 타임라인의 스타일은 widgets/event-timeline이 소유한다. */

// Tree View
export const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const TreeNodeWrapper = styled.div<{ $depth: number }>`
  margin-left: ${({ $depth }) => $depth * 32}px;
  position: relative;

  ${({ $depth }) => $depth > 0 && `
    &::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 20px;
      width: 12px;
      height: 2px;
      background: rgba(37, 99, 235, 0.25);
    }

    &::after {
      content: '';
      position: absolute;
      left: -16px;
      top: 0;
      bottom: 50%;
      width: 2px;
      background: rgba(37, 99, 235, 0.15);
    }
  `}
`

/* TreeNodeCard — 2px 두꺼운 border + 중첩 box-shadow + hover translateX 모두 제거.
 * 좌측 1px stripe만 importance 색으로 (시각 단서 보존). */
export const TreeNodeCard = styled.div<{
  $depth: number
  $importance: 'critical' | 'major' | 'notable'
}>`
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  transition: border-color 0.15s, background 0.15s;
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)'};
  border-left: 3px solid ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.5)'
      case 'major': return 'rgba(251, 191, 36, 0.5)'
      default: return 'rgba(37, 99, 235, 0.4)'
    }
  }};
  ${({ theme, $depth }) => theme.mode === 'dark' ? css`
    background: ${$depth === 0 ? 'rgba(37, 99, 235, 0.06)' : 'rgba(255, 255, 255, 0.03)'};
    &:hover { background: ${$depth === 0 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.06)'}; }
  ` : css`
    background: ${$depth === 0 ? 'rgba(37, 99, 235, 0.04)' : '#ffffff'};
    &:hover { background: ${$depth === 0 ? 'rgba(37, 99, 235, 0.07)' : 'rgba(37, 99, 235, 0.03)'}; }
  `}
`

export const TreeNodeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
`

export const TreeNodeTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  flex: 1;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const TreeImportanceBadge = styled.span<{
  $importance: 'critical' | 'major' | 'notable'
}>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)'
      case 'major': return 'rgba(251, 191, 36, 0.15)'
      default: return 'rgba(37, 99, 235, 0.1)'
    }
  }};
  color: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return '#dc2626'
      case 'major': return '#d97706'
      default: return '#2563eb'
    }
  }};
`

export const TreeNodeDate = styled.div`
  font-size: 12px;
  color: #2563eb;
  font-weight: 600;
  margin-bottom: 6px;
`

export const TreeNodeSummary = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const TreeNodeChildren = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

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

// ─────────────────────────────────────────────────────────────────────────────
// EventDetailPanel 위젯 전용 스타일 — 이전엔 위젯 안 inline. detail.styles로 hoist.
// ─────────────────────────────────────────────────────────────────────────────

/* Hero image — 패널 폭 fit. 16px 좌우 여백만. CLS 방지를 위해 height는 skeleton과 일치. */
export const HeroFigure = styled.figure`
  margin: 12px 16px 0;
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  height: 200px;
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'};
`

export const HeroImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

export const HeroPlaceholder = styled.button`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  background: transparent;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color ${MOTION.fast}, background ${MOTION.fast},
    color ${MOTION.fast};
  font-family: inherit;

  svg {
    opacity: 0.55;
  }

  &:hover {
    border-color: ${BRAND.primaryBorder};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
    color: ${BRAND.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * Action toolbar — icon ghost group + 우측 filled primary CTA.
 * primary는 페이지 단 CreateEventButton과 동일 톤 (filled indigo).
 */
export const ActionButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;

  & > [data-cta='primary'] {
    margin-left: auto;
  }
`

type ActionVariant = 'ghost' | 'ghost-danger' | 'primary'

export const ActionButton = styled.button<{ $variant: ActionVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: -0.005em;
  border-radius: 8px;
  transition: background ${MOTION.fast}, color ${MOTION.fast},
    border-color ${MOTION.fast};

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  &:disabled {
    cursor: default;
    opacity: 0.35;
    pointer-events: none;
  }

  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      // CreateEventButton과 동일한 filled primary
      return css`
        height: 32px;
        padding: 0 12px;
        font-size: 12.5px;
        font-weight: 600;
        background: ${BRAND.primary};
        border: 1px solid ${BRAND.primary};
        color: #ffffff;
        &:hover {
          background: ${BRAND.primaryHover};
          border-color: ${BRAND.primaryHover};
        }
      `
    }
    if ($variant === 'ghost-danger') {
      return css`
        width: 32px;
        height: 32px;
        padding: 0;
        background: transparent;
        border: 1px solid transparent;
        /* 평소에도 약한 빨강 단서 — 위험 동작 인지 */
        color: ${theme.mode === 'dark' ? '#fca5a5' : DANGER.base};
        opacity: 0.7;
        &:hover {
          background: ${theme.mode === 'dark'
            ? 'rgba(239, 68, 68, 0.12)'
            : DANGER.fill};
          color: ${theme.mode === 'dark' ? '#f87171' : DANGER.base};
          border-color: ${DANGER.border};
          opacity: 1;
        }
      `
    }
    return css`
      width: 32px;
      height: 32px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      color: ${theme.colors.text.secondary};
      &:hover {
        background: ${theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.04)'};
        color: ${theme.colors.text.primary};
      }
    `
  }}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 본문 컨텐츠 영역 — sticky 헤더와 분리 */
export const InfoBlock = styled.div`
  padding: 14px 20px 16px;

  @media (max-width: 768px) {
    padding: 12px 16px 14px;
  }
`

/* InfoGrid — line-height 1.8 → 1.6 (정보 밀도 ↑) */
export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 14px;
  font-size: 13px;
  line-height: 1.6;
`

export const InfoLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

export const InfoValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`

export const InfoMutedHint = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 8px;
  white-space: nowrap;
`

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`

/**
 * Country chip — 평면 톤 통일 (이전 gradient 제거).
 * filter.styles.FilterChip / list-toolbar.ActiveFilterChip와 family.
 */
export const CountryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : BRAND.primaryHover)};
  border: 1px solid ${BRAND.primaryBorder};
`

/* 역사적 국가 — amber 톤. 페이지 안에서 오직 이 chip만 amber라 색 분리 의도 보존. */
export const HistoricalCountryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.18)'
      : 'rgba(245, 158, 11, 0.08)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
  border: 1px solid rgba(245, 158, 11, 0.3);
`

/* SectionChip — neutral, 본문 구성 표시 */
export const SectionChip = styled.span`
  display: inline-block;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 500;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.06);
          color: ${theme.colors.text.secondary};
        `
      : css`
          background: #f1f5f9;
          color: #475569;
        `}
`

/**
 * 카테고리 chip — InfoGrid 안에서 항상 표시 (이전엔 hero image 위 absolute라 이미지 없으면 사라짐).
 * 카테고리 색을 좌측 dot으로 표현 + 텍스트.
 */
export const CategoryChip = styled.span<{
  $category: HistoricalEventCategory
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 10px 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${({ $category }) =>
      CATEGORY_BADGE_COLORS[$category] ?? '#6b7280'};
    flex-shrink: 0;
  }
`

/**
 * 길이 긴 description — line-clamp + "더 보기"/"접기" 토글.
 * `$expanded` prop으로 외부에서 제어.
 */
export const DescriptionWrap = styled.div`
  position: relative;
`

export const DescriptionText = styled.p<{ $expanded: boolean }>`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};

  ${({ $expanded }) =>
    !$expanded &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`

export const DescriptionToggle = styled.button`
  margin-top: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${BRAND.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: color ${MOTION.fast};

  &:hover {
    color: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
    border-radius: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
