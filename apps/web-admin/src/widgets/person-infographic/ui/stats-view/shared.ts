/**
 * stats-view sub-tab 공용 styled + 유틸.
 *
 * 5개 sub-tab(개요·매트릭스·그룹·갤럭시·비교)이 공유하는 컴포넌트만 모음.
 * sub-tab 전용은 각 파일 내부에 둠.
 */
import styled, { useTheme } from 'styled-components'

/**
 * recharts 축/라벨/툴팁의 인라인 색을 테마 토큰으로 — 다크모드에서 하드코딩 회색·
 * 흰 배경 툴팁이 안 보이던 문제 보정. (recharts는 styled prop을 못 받아 값으로 주입)
 */
export function useChartTheme() {
  const theme = useTheme()
  return {
    tick: theme.colors.text.tertiary,
    axisLabel: theme.colors.text.secondary,
    border: theme.colors.border.default,
    tooltipBg: theme.colors.background.primary,
    tooltipText: theme.colors.text.tertiary,
    text: theme.colors.text.primary,
  }
}

export const EmptyHint = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ChartShell = styled.div<{ $h: number }>`
  width: 100%;
  height: ${({ $h }) => $h}px;
`

// 매트릭스/그룹 레이더/갤럭시가 공유하는 controls 영역
export const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`

export const ControlGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

export const ControlLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ControlSelect = styled.select`
  padding: 6px 10px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
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

// 트레이트 톤 컬러 — overview·트레이트 페어 분석에서 공유
export const traitToneFg: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: '#0e7490',
  neutral: '#475569',
  negative: '#9f1239',
}

export const traitToneBg: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'rgba(207, 250, 254, 0.7)',
  neutral: 'rgba(241, 245, 249, 0.85)',
  negative: 'rgba(255, 228, 230, 0.85)',
}
