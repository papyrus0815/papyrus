import styled from 'styled-components'

import { UnderlineTabNav } from '@/shared/ui/underline-tabs'

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  padding: 10px 24px 12px;
`

/** 최상단 국가 상세 탭 — UnderlineTab* + 스크롤 영역만 확장 */
export const TopUnderlineTabNav = styled(UnderlineTabNav)`
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
`

export const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`
