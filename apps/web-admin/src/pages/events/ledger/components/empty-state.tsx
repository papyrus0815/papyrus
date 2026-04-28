/**
 * Ledger 공통 빈 상태/에러/로딩 상태 컴포넌트.
 * 피벗·페이지 단위에서 동일한 시각으로 표시한다.
 */
import React from 'react'

import { FiAlertCircle, FiFilter, FiInbox, FiLoader } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import {
  DIGIT_DISPLAY,
  fontTier,
  ledgerAccent,
  ledgerAccentSubtle,
} from '../styles/ledger-tokens'

export type EmptyVariant = 'empty' | 'error' | 'loading' | 'filtering'

interface Props {
  title: string
  hint?: string
  variant?: EmptyVariant
  action?: React.ReactNode
}

const ICONS: Record<EmptyVariant, React.ComponentType<{ size?: number }>> = {
  empty: FiInbox,
  error: FiAlertCircle,
  loading: FiLoader,
  filtering: FiFilter,
}

export const EmptyState: React.FC<Props> = ({
  title,
  hint,
  variant = 'empty',
  action,
}) => {
  const Icon = ICONS[variant]
  return (
    <Wrap>
      <IconCircle $variant={variant}>
        <Icon size={18} />
      </IconCircle>
      <Title>{title}</Title>
      {hint && <Hint>{hint}</Hint>}
      {action && <Actions>{action}</Actions>}
    </Wrap>
  )
}

const spin = keyframes`
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
`

const Wrap = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 24px;
  text-align: center;
`

const IconCircle = styled.div<{ $variant: EmptyVariant }>`
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ $variant, theme }) =>
    $variant === 'error'
      ? 'rgba(220, 38, 38, 0.1)'
      : ledgerAccentSubtle(theme.mode)};
  color: ${({ $variant, theme }) =>
    $variant === 'error' ? '#b91c1c' : ledgerAccent(theme.mode)};

  /* 로딩 시 스피너 회전 */
  & svg {
    ${({ $variant }) =>
      $variant === 'loading'
        ? `animation: ${spin} 1s linear infinite;`
        : ''}
  }
`

const Title = styled.div`
  ${DIGIT_DISPLAY}
  ${fontTier('HEADING')}
  color: ${({ theme }) => theme.colors.text.primary};
`

const Hint = styled.div`
  ${fontTier('BODY')}
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 360px;
  line-height: 1.5;
`

const Actions = styled.div`
  margin-top: 6px;
  display: inline-flex;
  gap: 8px;
`
