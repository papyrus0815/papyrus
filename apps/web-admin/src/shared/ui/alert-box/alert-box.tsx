/**
 * 폼 내 인라인 알림 박스 (warning/danger/info/success).
 * theme.colors.alert 토큰을 사용해 다크모드 자동 처리.
 */
import React from 'react'

import styled from 'styled-components'

export type AlertVariant = 'warning' | 'danger' | 'info' | 'success'

interface AlertBoxProps {
  variant?: AlertVariant
  /** 좌측 아이콘 또는 이모지 */
  icon?: React.ReactNode
  children: React.ReactNode
  /** 모든 div 속성 (style 등) */
  style?: React.CSSProperties
  className?: string
}

const Box = styled.div<{ $variant: AlertVariant }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.5;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $variant, theme }) => theme.colors.alert[$variant].bg};
  color: ${({ $variant, theme }) => theme.colors.alert[$variant].fg};
  border: 1px solid ${({ $variant, theme }) => theme.colors.alert[$variant].border};
  margin-top: 6px;

  strong {
    font-weight: 700;
  }
`

const IconWrap = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  line-height: 1;
  padding-top: 1px;
`

export function AlertBox({
  variant = 'info',
  icon,
  children,
  style,
  className,
}: AlertBoxProps) {
  return (
    <Box $variant={variant} style={style} className={className}>
      {icon && <IconWrap>{icon}</IconWrap>}
      <span>{children}</span>
    </Box>
  )
}
