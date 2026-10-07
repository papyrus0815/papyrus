/**
 * 최상위 사건 조망 — 조판.
 *
 * 상세(문서)와 다른 지면이다: 읽는 폭(68ch)이 아니라 **콘텐츠 영역 전체**를 쓰고, 본문 대신
 * 패널 격자가 선다. 색은 사건 지면 공통 토큰(ledger-tokens)만 쓴다.
 */
import styled, { css } from 'styled-components'

import {
  ledgerAccent,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'

import type { RoleTone } from './event-overview.lib'

/** 배역 색 — 넷만. 다크는 밝은 쌍 */
export const ROLE_TONE_COLOR: Record<RoleTone, { light: string; dark: string; label: string }> = {
  lead: { light: '#4f46e5', dark: '#a5b4fc', label: '주도' },
  target: { light: '#b91c1c', dark: '#f87171', label: '대상·피해' },
  statehood: { light: '#4d7c0f', dark: '#a3e635', label: '건국·멸망' },
  neutral: { light: '#64748b', dark: '#94a3b8', label: '참여·기타' },
}

export const toneColor = (tone: RoleTone, mode: 'light' | 'dark') =>
  mode === 'dark' ? ROLE_TONE_COLOR[tone].dark : ROLE_TONE_COLOR[tone].light

export const Page = styled.div`
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  padding: 24px clamp(16px, 2.4vw, 32px) 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};

  /* 브라우저 전체 화면 — 배경이 투명이면 검은 바탕 위에 글자만 뜬다 */
  &:fullscreen {
    overflow-y: auto;
  }
`

// ─── 머리 ──────────────────────────────────────────────────────────────────

export const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 24px;
`

export const HeaderText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const Kicker = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const Title = styled.h1`
  margin: 0;
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 800;
  line-height: 1.25;
  word-break: keep-all;
`

export const HeaderMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  text-decoration: none;
  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

export const ActionButton = styled.button`
  ${buttonBase}
`

/** [조망 | 문서] — 지금 보는 쪽이 채워진다 */
export const ViewSwitch = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 10px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

export const ViewSwitchItem = styled.button<{ $active: boolean }>`
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(0,0,0,0.12)' : 'none')};
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

// ─── 핵심 숫자 ─────────────────────────────────────────────────────────────

export const StatRow = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px;
`

export const Stat = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const StatLabel = styled.dt`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const StatValue = styled.dd`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
`

export const StatNote = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 필터 줄 ───────────────────────────────────────────────────────────────

export const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const FilterChip = styled.button`
  ${buttonBase}
  height: 28px;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.text.primary};
`

// ─── 패널 격자 ─────────────────────────────────────────────────────────────

export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const Panel = styled.section<{ $wide?: boolean }>`
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
  min-width: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 14px;
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const PanelHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
`

export const PanelTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
`

export const PanelNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const Empty = styled.p`
  margin: 0;
  padding: 10px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 가로로 넘치는 표·도표만 가로 스크롤 — 지면 전체는 가로로 밀리지 않는다 */
export const Scroll = styled.div`
  overflow-x: auto;
  min-width: 0;
`

// ─── 간트 ──────────────────────────────────────────────────────────────────

export const GANTT_LABEL_WIDTH = 'clamp(180px, 26%, 340px)'

export const GanttGrid = styled.div`
  display: grid;
  grid-template-columns: ${GANTT_LABEL_WIDTH} minmax(420px, 1fr);
  min-width: 640px;
`

export const GanttAxis = styled.div`
  position: relative;
  height: 22px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const GanttTick = styled.span`
  position: absolute;
  bottom: 4px;
  transform: translateX(-50%);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

export const GanttLabel = styled.div<{ $depth: number; $dim: boolean; $hot: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 5px 10px 5px ${({ $depth }) => 4 + Math.max(0, $depth - 1) * 16}px;
  font-size: 13px;
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const GanttNumber = styled.span`
  flex-shrink: 0;
  min-width: 20px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: right;
`

export const CategoryDot = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

export const RowTitleLink = styled.a`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
    border-radius: 3px;
  }
`

export const GanttTrack = styled.div<{ $dim: boolean; $hot: boolean }>`
  position: relative;
  min-height: 30px;
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

/** 상위 사건 자신의 기간 — 모든 줄 뒤에 깔리는 띠 */
export const ParentBand = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  pointer-events: none;
`

export const GridLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  pointer-events: none;
`

export const Bar = styled.div<{ $color: string; $uncertain: boolean; $point: boolean }>`
  position: absolute;
  top: 50%;
  height: ${({ $point }) => ($point ? '10px' : '12px')};
  min-width: ${({ $point }) => ($point ? '10px' : '4px')};
  transform: translate(${({ $point }) => ($point ? '-50%' : '0')}, -50%);
  border-radius: ${({ $point }) => ($point ? '50%' : '4px')};
  ${({ $uncertain, $color }) =>
    $uncertain
      ? css`
          background: transparent;
          border: 1.5px dashed ${$color};
        `
      : css`
          background: ${$color};
        `}
`

export const BarLabel = styled.span`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  padding-left: 8px;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
`

// ─── 매트릭스 ──────────────────────────────────────────────────────────────

export const MatrixTable = styled.table`
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
  th,
  td {
    border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

export const MatrixHeadCell = styled.th<{ $hot?: boolean }>`
  min-width: 28px;
  padding: 4px 2px;
  font-weight: 600;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
  text-align: center;
`

export const MatrixCountryCell = styled.th`
  position: sticky;
  left: 0;
  z-index: 1;
  text-align: left;
  padding: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  font-weight: 500;
`

export const CountryButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 240px;
  padding: 5px 10px 5px 4px;
  border: none;
  background: ${({ $active, theme }) => ($active ? ledgerHoverFill(theme.mode) : 'transparent')};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  text-align: left;
  cursor: pointer;
  span:first-of-type {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

export const CountBadge = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const MatrixCell = styled.td<{ $hot: boolean }>`
  text-align: center;
  padding: 3px 2px;
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
`

export const RoleMark = styled.span<{ $color: string }>`
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: ${({ $color }) => $color};
`

export const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

// ─── 막대 분포 ─────────────────────────────────────────────────────────────

export const BarList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const BarItem = styled.li``

/** 한 줄 전체가 버튼(눌러서 거르기) — 거를 수 없는 막대는 as="div" */
export const BarRow = styled.button<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: minmax(64px, 30%) minmax(0, 1fr) 28px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 3px 4px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) => ($active ? ledgerHoverFill(theme.mode) : 'transparent')};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

export const BarName = styled.span<{ $active?: boolean }>`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
`

export const BarTrack = styled.span`
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

export const BarFill = styled.span<{ $color: string; $pct: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`

export const BarCount = styled.span`
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 시기 밀도 — 세로 막대 */
export const Histogram = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 120px;
  padding-top: 8px;
`

export const HistogramColumn = styled.div`
  flex: 1;
  min-width: 6px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  height: 100%;
`

export const HistogramBar = styled.div<{ $pct: number }>`
  height: ${({ $pct }) => $pct}%;
  min-height: ${({ $pct }) => ($pct > 0 ? '3px' : '0')};
  border-radius: 3px 3px 0 0;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const HistogramAxis = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 목록형 표 (인물·수치·점검) ────────────────────────────────────────────

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  th {
    text-align: left;
    font-weight: 600;
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
    padding: 6px 8px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
    white-space: nowrap;
  }
  td {
    padding: 6px 8px;
    border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    vertical-align: top;
  }
`

export const CheckHead = styled.th`
  text-align: center !important;
`

export const CheckCell = styled.td<{ $state: 'full' | 'partial' | 'empty' }>`
  text-align: center;
  font-weight: 700;
  color: ${({ $state, theme }) =>
    $state === 'full'
      ? theme.colors.success
      : $state === 'partial'
        ? theme.colors.alert.warning
        : theme.colors.text.tertiary};
`

export const ChecklistRow = styled.tr<{ $hot: boolean }>`
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
`

export const EmptyCount = styled.span`
  display: block;
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

/** 문서 보기 중인 최상위 사건 — 조망으로 돌아가는 길 */
export const DocumentViewBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin: 12px clamp(16px, 2.4vw, 32px) 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
