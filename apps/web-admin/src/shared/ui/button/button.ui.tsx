import React from 'react'
import styled from 'styled-components'

const StyledButton = styled.button`
  background: ${({ theme }) =>
    theme.colors.gradient?.primary ||
    theme.colors.button?.primary ||
    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'};
  color: ${({ theme }) => theme.colors.white || '#ffffff'};
  border: none;
  padding: 12px 24px;
  border-radius: ${({ theme }) => theme.borderRadius?.lg || '0.75rem'};
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px
    ${({ theme }) => theme.colors.shadow?.sm || 'rgba(0, 0, 0, 0.1)'};
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${({ theme }) =>
      theme.colors.gradient?.secondary ||
      theme.colors.button?.hover ||
      'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'};
    transform: translateY(-1px);
    box-shadow: 0 8px 15px -3px
      ${({ theme }) => theme.colors.shadow?.md || 'rgba(0, 0, 0, 0.15)'};
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 6px -1px
      ${({ theme }) => theme.colors.shadow?.sm || 'rgba(0, 0, 0, 0.1)'};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.button?.disabled || '#9ca3af'};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    opacity: 0.6;
  }

  &:focus {
    outline: none;
    ring: 2px solid ${({ theme }) => theme.colors.primary || '#6366f1'};
    ring-offset: 2px;
  }
`

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  label?: string
  variant?: string
}

export default function Button({
  children,
  label,
  variant,
  ...props
}: ButtonProps) {
  return <StyledButton {...props}>{children || label}</StyledButton>
}
