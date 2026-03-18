/**
 * 가이드 툴팁 스타일 컴포넌트
 * event-create.styles.ts(pages)에서 위젯 레이어로 이동
 */
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

export const GuideIconButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1.5px solid rgba(139, 92, 246, 0.15);
  background: rgba(139, 92, 246, 0.04);
  color: #8b5cf6;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
  margin-left: auto;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    background: rgba(139, 92, 246, 0.08);
    color: #7c3aed;
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

export const GuideTooltip = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 46px;
  right: 0;
  width: 380px;
  max-width: calc(100vw - 40px);
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 12px;
  box-shadow:
    0 4px 20px rgba(15, 23, 42, 0.12),
    0 12px 40px rgba(15, 23, 42, 0.08);
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  padding: 18px;
  z-index: ${Z_INDEX.DROPDOWN};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  transform: ${({ $visible }) =>
    $visible ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top right;

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 10px;
    width: 12px;
    height: 12px;
    background: ${({ theme }) => theme.colors.background.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-bottom: none;
    border-right: none;
    transform: rotate(45deg);
  }

  @media (max-width: 640px) {
    width: calc(100vw - 40px);
    right: 0;

    &::before {
      right: 10px;
    }
  }
`

export const GuideTooltipHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const GuideTooltipTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: #8b5cf6;
    width: 16px;
    height: 16px;
  }
`

export const GuideTooltipClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

export const GuideTooltipContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const GuideTip = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

export const TipNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #8b5cf6;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
`

export const TipTitle = styled.h5`
  margin: 0 0 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const TipDescription = styled.p`
  margin: 0 0 6px 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const TipExample = styled.div`
  padding: 6px 8px;
  background: rgba(139, 92, 246, 0.06);
  border-radius: 6px;
  font-size: 11px;
  color: #7c3aed;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  border-left: 2px solid rgba(139, 92, 246, 0.3);
`
