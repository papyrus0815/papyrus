import styled from 'styled-components'

import { UnderlineTabNav } from '@/shared/ui/underline-tabs'

export const StickyContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const CompactContextBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 24px 0;
  min-width: 0;
`

export const CompactCountryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  margin-left: -8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  cursor: pointer;
  min-width: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

export const CompactFlag = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 16px;
  border-radius: 3px;
  overflow: hidden;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const CompactName = styled.strong`
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CompactMeta = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

export const CompactActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

export const CompactActionBtn = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 10px 24px 12px;
`

/** 최상단 국가 상세 탭 — UnderlineTab* + 스크롤 영역만 확장 */
export const TopUnderlineTabNav = styled(UnderlineTabNav)`
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  align-items: center;
`

export const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`

export const TabGroupDivider = styled.span`
  display: inline-block;
  width: 1px;
  height: 14px;
  margin: 0 4px;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'};
`

export const TabLabelWrap = styled.span<{ $empty?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  opacity: ${({ $empty }) => ($empty ? 0.62 : 1)};
  transition: opacity 0.15s ease;

  button:hover & {
    opacity: 1;
  }
`

export const TabCountBadge = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.28)'
        : 'rgba(99, 102, 241, 0.14)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
  color: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : theme.colors.text.secondary};
`

