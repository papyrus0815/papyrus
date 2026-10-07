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
  padding: 28px clamp(16px, 2.6vw, 40px) 72px;
  display: flex;
  flex-direction: column;
  gap: 28px;
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
  font-size: clamp(26px, 3vw, 38px);
  letter-spacing: -0.02em;
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

/**
 * 채움 정도 색 — 막대 **칠**용 단색. 테마의 alert.warning은 배경용 옅은 색이라 막대에 쓰면
 * 40~69% 행의 막대가 비어 보였다.
 */
const fillColor = (pct: number, mode: 'light' | 'dark') =>
  pct >= 70
    ? mode === 'dark' ? '#4ade80' : '#16a34a'
    : pct >= 40
      ? mode === 'dark' ? '#fbbf24' : '#d97706'
      : mode === 'dark' ? '#f87171' : '#dc2626'

// ─── 핵심 숫자 ─────────────────────────────────────────────────────────────
// 상자 다섯 개 대신 한 줄의 숫자 띠 — 숫자가 주인공이고 테두리는 칸 사이 세로선 하나뿐.

export const StatRow = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  /* 칸 사이 세로선은 부모에서 — 자식의 '& + &'는 props가 다른 형제(흐린 칸)와 매칭이 안 된다 */
  > * + * {
    padding-left: 18px;
    border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
  /* 좁은 폭은 2열 고정 — auto-fit로 줄이 바뀌면 줄 첫 칸에도 세로선이 붙었다 */
  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    > * + * {
      padding-left: 0;
      border-left: none;
    }
    > *:nth-child(even) {
      padding-left: 16px;
      border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    }
    > *:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    }
  }
`

export const Stat = styled.div<{ $muted?: boolean }>`
  padding: 14px 18px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  opacity: ${({ $muted }) => ($muted ? 0.55 : 1)};
`

export const StatLabel = styled.dt`
  order: 2;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const StatValue = styled.dd`
  order: 1;
  margin: 0;
  font-size: clamp(26px, 2.4vw, 34px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.1;
`

export const StatNote = styled.span`
  order: 3;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 충실도 막대 — 숫자 밑에 얇게 */
export const Meter = styled.span`
  order: 4;
  display: block;
  height: 4px;
  margin-top: 6px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

export const MeterFill = styled.span<{ $pct: number }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: ${({ $pct, theme }) => fillColor($pct, theme.mode)};
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
  gap: 36px 40px;
  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

/**
 * 패널은 상자가 아니다 — 위쪽 선 하나와 제목. 상자 7개 + 숫자 상자 5개가 같은 무게로 서면
 * 무엇이 주인공인지 사라진다(첫 판 실측).
 */
export const Panel = styled.section<{ $wide?: boolean }>`
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
  min-width: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  padding-top: 14px;
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
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
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

export const GANTT_LABEL_WIDTH = 'clamp(200px, 30%, 420px)'

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
  width: 100%;
  table-layout: auto;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
  th,
  td {
    border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

export const MatrixHeadCell = styled.th<{ $hot?: boolean }>`
  min-width: 30px;
  padding: 6px 2px;
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
  width: 1%;
  text-align: left;
  padding: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  font-weight: 500;
`

export const CountryButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 240px;
  padding: 6px 12px 6px 6px;
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
  padding: 5px 2px;
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
`

/**
 * 배역 표시 — 주도·대상·건국멸망은 **채운** 칸, 그 밖의 관여는 **속 빈** 칸.
 * 대부분이 '참여'라 같은 무게로 채우면 회색이 매트릭스를 덮어 주도·대상이 묻혔다.
 */
export const RoleMark = styled.span<{ $color: string; $hollow?: boolean }>`
  display: inline-block;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border-radius: 5px;
  background: ${({ $color, $hollow }) => ($hollow ? 'transparent' : $color)};
  border: ${({ $color, $hollow }) => ($hollow ? `2px solid ${$color}` : 'none')};
  vertical-align: middle;
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
  justify-content: center;
  gap: 6px;
  height: 150px;
  padding-top: 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

/** 칸이 셋뿐이어도 막대가 패널을 다 먹지 않게 폭 상한 */
export const HistogramColumn = styled.div`
  flex: 1;
  max-width: 64px;
  min-width: 6px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  height: 100%;
  position: relative;
`

export const HistogramCount = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const HistogramLabels = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  span {
    flex: 1;
    max-width: 64px;
    min-width: 6px;
    text-align: center;
    white-space: nowrap;
  }
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
        ? fillColor(50, theme.mode)
        : theme.colors.text.tertiary};
  opacity: ${({ $state }) => ($state === 'empty' ? 0.45 : 1)};
`

/** 행별 채움 — 9칸 중 몇 칸 */
export const FillCell = styled.td`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  span {
    display: inline-block;
    vertical-align: middle;
  }
`

export const FillBar = styled.span<{ $pct: number }>`
  width: 56px;
  height: 6px;
  margin-right: 8px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $pct }) => $pct}%;
    border-radius: 999px;
    background: ${({ $pct, theme }) => fillColor($pct, theme.mode)};
  }
`

export const ChecklistRow = styled.tr<{ $hot: boolean }>`
  background: ${({ $hot, theme }) => ($hot ? ledgerHoverFill(theme.mode) : 'transparent')};
`

/** 열별 빈 칸 수 — 점검표의 결론이라 머리글에서 눈에 띄게. 절반 넘게 비면 경고색 */
export const EmptyCount = styled.span<{ $severe: boolean }>`
  display: inline-block;
  margin-top: 4px;
  min-width: 22px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $severe, theme }) => ($severe ? theme.colors.error : theme.colors.text.secondary)};
  background: ${({ $severe, theme }) =>
    $severe ? (theme.mode === 'dark' ? 'rgba(248,113,113,0.14)' : 'rgba(185,28,28,0.08)') : ledgerSubtleFill(theme.mode)};
`

/** 비어 있는 기록 묶음 — 큰 패널 둘이 '없습니다'만 말하던 자리를 한 줄로 */
export const EmptyStrip = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
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
