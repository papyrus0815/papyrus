/**
 * 지리·행정(행정구역 / 자연지리 / 인프라) 뷰가 공통으로 사용하는 벤토 인포그래픽 스타일 프리미티브.
 */
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  RADIUS,
  ledgerAccent,
  ledgerHairline,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'

export const BentoLegendWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
`

export const BentoLegendChip = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  margin: -1px -4px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

export const LegendDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

export const MetricSwitchGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
`

export const MetricSwitchBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  border: none;
  border-radius: 3px;
  padding: 2px 7px;
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

export const RankRowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const RankRowBtn = styled.button<{
  $active?: boolean
  $withBadge?: boolean
}>`
  appearance: none;
  display: grid;
  grid-template-columns: ${({ $withBadge }) =>
    $withBadge
      ? '20px auto minmax(76px, 128px) minmax(0, 1fr) auto'
      : '20px minmax(84px, 128px) minmax(0, 1fr) auto'};
  align-items: center;
  gap: ${({ $withBadge }) => ($withBadge ? '7px' : '8px')};
  width: 100%;
  padding: 3px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  ${DIGIT_DISPLAY}

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

export const RankIndex = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const RankName = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const RankTrack = styled.div`
  width: 100%;
  height: 7px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

export const RankFill = styled.div`
  height: 100%;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const RankMeta = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

export const CoverageSplit = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
`

export const CoverageRight = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

export const CoverageSubFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`
