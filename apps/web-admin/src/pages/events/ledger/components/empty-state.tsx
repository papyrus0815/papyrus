/**
 * Ledger 공통 빈 상태/에러 상태 컴포넌트.
 * 피벗·페이지 단위에서 동일한 시각으로 표시한다.
 */
import React from 'react'

import { FiAlertCircle, FiInbox } from 'react-icons/fi'
import styled from 'styled-components'

import { DIGIT_DISPLAY } from '../styles/ledger-tokens'

interface Props {
  title: string
  hint?: string
  variant?: 'empty' | 'error'
  action?: React.ReactNode
}

export const EmptyState: React.FC<Props> = ({
  title,
  hint,
  variant = 'empty',
  action,
}) => (
  <Wrap>
    <IconCircle $variant={variant}>
      {variant === 'error' ? <FiAlertCircle size={18} /> : <FiInbox size={18} />}
    </IconCircle>
    <Title>{title}</Title>
    {hint && <Hint>{hint}</Hint>}
    {action && <Actions>{action}</Actions>}
  </Wrap>
)

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

const IconCircle = styled.div<{ $variant: 'empty' | 'error' }>`
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ $variant }) =>
    $variant === 'error'
      ? 'rgba(220, 38, 38, 0.1)'
      : 'rgba(99, 102, 241, 0.08)'};
  color: ${({ $variant }) => ($variant === 'error' ? '#b91c1c' : '#4f46e5')};
`

const Title = styled.div`
  ${DIGIT_DISPLAY}
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Hint = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 360px;
  line-height: 1.5;
`

const Actions = styled.div`
  margin-top: 6px;
  display: inline-flex;
  gap: 8px;
`
