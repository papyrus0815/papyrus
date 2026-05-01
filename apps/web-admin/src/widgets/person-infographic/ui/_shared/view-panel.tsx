/**
 * 뷰 공용 컨테이너 — 매트릭스/은하계가 공유하는 헤더/범례 styled.
 */
import styled from 'styled-components'

import { glassOrSolidMixin, scrollbarThinMixin } from '@/shared/styles/mixins'

export const ViewPanel = styled.div`
  border-radius: 12px;
  overflow: hidden;
  ${({ theme }) => glassOrSolidMixin(theme)}
`

export const ViewPanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const ViewPanelTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ViewPanelDesc = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ViewLegend = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-wrap: wrap;
`

export const ViewLegendItem = styled.button<{ $active?: boolean; $color: string }>`
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  color: ${({ $color }) => $color};
  background: ${({ $active, $color }) =>
    $active ? `${$color}1f` : 'transparent'};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};

  > span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
`

export const ViewLegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
`

export const ViewLegendRowLabel = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 600;
  margin-right: 6px;
`

export { scrollbarThinMixin }
