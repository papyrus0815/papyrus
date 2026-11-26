/**
 * 섹션·탭 주 액션 버튼 — '법령 등록', '새 사건 등록', '선거 등록', '기업 등록' 등
 * 화면의 주 생성·등록 CTA를 하나의 컴포넌트로 통일한다.
 *
 * 색상은 라이트·다크 모드 모두 애플리케이션 메인 보라·인디고(`theme.colors.primary`,
 * 호버 `theme.colors.button.hover`) + 흰색 텍스트(`#ffffff`)를 유지해 어느 지면에서도
 * 동일한 브랜드 주 액션 위계를 갖는다.
 */
import React from 'react'

import styled, { css } from 'styled-components'

export type PrimaryActionButtonSize = 'sm' | 'md' | 'lg'

export interface PrimaryActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 버튼 크기: sm(30px 컴팩트), md(34px 툴바 표준 · 기본), lg(36px 빈 화면·모달) */
  $size?: PrimaryActionButtonSize
  /** 선행 아이콘 슬롯 (children 앞에 직접 아이콘을 넣어도 동일하게 정렬됨) */
  icon?: React.ReactNode
}

const sizeStyles = ($size: PrimaryActionButtonSize = 'md') => {
  if ($size === 'sm') {
    return css`
      height: 30px;
      padding: 0 11px;
      border-radius: 6px;
      font-size: 12px;

      svg {
        width: 13px;
        height: 13px;
      }
    `
  }
  if ($size === 'lg') {
    return css`
      height: 36px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 13px;

      svg {
        width: 15px;
        height: 15px;
      }
    `
  }
  return css`
    height: 34px;
    padding: 0 13px;
    border-radius: 8px;
    font-size: 12.5px;

    svg {
      width: 14px;
      height: 14px;
    }

    @media (max-width: 768px) {
      height: 40px;
    }
  `
}

const StyledPrimaryActionButton = styled.button<{
  $size?: PrimaryActionButtonSize
}>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-family: inherit;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1;
  white-space: nowrap;
  box-shadow: none;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background-color 0.14s ease,
    opacity 0.14s ease,
    box-shadow 0.14s ease;

  ${({ $size }) => sizeStyles($size)}

  svg {
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }

  &:active:not(:disabled) {
    opacity: 0.92;
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${({ theme }) => theme.colors.background.primary},
      0 0 0 4px ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }
`

export const PrimaryActionButton = React.forwardRef<
  HTMLButtonElement,
  PrimaryActionButtonProps
>(function PrimaryActionButton(
  { type = 'button', $size = 'md', icon, children, ...rest },
  ref,
) {
  return (
    <StyledPrimaryActionButton ref={ref} type={type} $size={$size} {...rest}>
      {icon}
      {children}
    </StyledPrimaryActionButton>
  )
})
