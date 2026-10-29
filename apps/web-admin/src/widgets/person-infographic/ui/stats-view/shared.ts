/**
 * stats-view sub-tab 공용 styled + 유틸.
 *
 * 5개 sub-tab(개요·매트릭스·그룹·갤럭시·비교)이 공유하는 컴포넌트만 모음.
 * sub-tab 전용은 각 파일 내부에 둠.
 */
import type { CSSProperties } from 'react'
import styled, { useTheme } from 'styled-components'

import { BRAND, hairline, MOTION_FAST, surface } from '../_shared/catalog.styles'

/**
 * recharts 축/라벨/툴팁의 인라인 색을 테마 토큰으로 — 다크모드에서 하드코딩 회색·
 * 흰 배경 툴팁이 안 보이던 문제 보정. (recharts는 styled prop을 못 받아 값으로 주입)
 */
export function useChartTheme() {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  return {
    isDark,
    tick: theme.colors.text.tertiary,
    axisLabel: theme.colors.text.secondary,
    border: theme.colors.border.default,
    tooltipBg: isDark ? '#1c1c20' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.1)',
    tooltipShadow: isDark
      ? '0 8px 24px rgba(0, 0, 0, 0.45)'
      : '0 8px 24px rgba(15, 23, 42, 0.12)',
    tooltipText: theme.colors.text.tertiary,
    text: theme.colors.text.primary,
  }
}

export type ChartTheme = ReturnType<typeof useChartTheme>

/** Recharts `<Tooltip contentStyle={getTooltipStyle(chart)} />` 다크모드·라이트모드 공통 스타일 */
export function getTooltipStyle(chart: ChartTheme): CSSProperties {
  return {
    fontSize: 12,
    borderRadius: 10,
    backgroundColor: chart.tooltipBg,
    color: chart.text,
    border: `1px solid ${chart.tooltipBorder}`,
    boxShadow: chart.tooltipShadow,
    padding: '8px 11px',
  }
}

export const EmptyHint = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SurfaceCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid ${hairline};
  background: ${surface};
  min-width: 0;
`

export const ToolbarCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid ${hairline};
  background: ${surface};
`

/** 데스크톱 좌(차트)·우(비교 테이블) 2단 레이아웃 */
export const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const ChartShell = styled.div<{ $h: number }>`
  width: 100%;
  height: ${({ $h }) => $h}px;
`

// 매트릭스/그룹 레이더/비교가 공유하는 controls 영역
export const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  width: 100%;
`

export const ControlGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
`

export const ControlLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ControlSelect = styled.select`
  height: 32px;
  padding: 0 28px 0 10px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${hairline};
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  background-image: ${({ theme }) => {
    const stroke = theme.mode === 'dark' ? '%23a1a1aa' : '%2364748b'
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${stroke}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`
  }};
  background-repeat: no-repeat;
  background-position: right 9px center;
  color: ${({ theme }) => theme.colors.text.primary};
  appearance: none;
  cursor: pointer;
  transition: border-color ${MOTION_FAST}, box-shadow ${MOTION_FAST};

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.2)'};
  }
  &:focus-visible {
    outline: none;
    border-color: ${BRAND.primary};
    box-shadow: ${BRAND.focusRing};
  }
`

export const CountHint = styled.span`
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ChartHint = styled.p`
  margin: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`

// 그룹 레이더 / 갤럭시 / 비교에서 공통으로 쓰는 legend
export const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
`

export const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
`

export const LegendName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const LegendCount = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// 트레이트 톤 컬러 — overview·트레이트 페어 분석에서 공유 (라이트/다크 대응)
export const traitToneFg: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: '#0e7490',
  neutral: '#475569',
  negative: '#9f1239',
}

export const traitToneFgDark: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: '#67e8f9',
  neutral: '#cbd5e1',
  negative: '#fda4af',
}

export const traitToneBg: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'rgba(207, 250, 254, 0.7)',
  neutral: 'rgba(241, 245, 249, 0.85)',
  negative: 'rgba(255, 228, 230, 0.85)',
}

export const traitToneBgDark: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'rgba(6, 182, 212, 0.18)',
  neutral: 'rgba(148, 163, 184, 0.16)',
  negative: 'rgba(244, 63, 94, 0.18)',
}
