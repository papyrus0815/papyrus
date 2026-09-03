import React from 'react'
import styled, { keyframes, css } from 'styled-components'

const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`

const wave = keyframes`
  0% {
    left: -150%;
  }
  50% {
    left: 0%;
  }
  100% {
    left: 150%;
  }
`

const StyledSkeleton = styled.div<{
  $variant: 'circular' | 'rectangular' | 'rounded' | 'text'
  width: number | string
  height: number | string
  $animation: 'pulse' | 'wave'
}>`
  display: inline-block;
  /*
   * 다크에서 #e0e0e0(밝은 회색)을 그대로 쓰면 어두운 지면 위에 흰 덩어리가 박혀 눈이
   * 아프다. 골격은 '아직 없는 자리'를 표시할 뿐이라 배경보다 아주 조금만 밝으면 된다.
   * 다크 표면 톤은 이 코드베이스의 다른 스켈레톤(dashboard/content)과 같은
   * rgba(148,163,184,0.1) 계열로 맞춘다.
   */
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.13)' : '#e0e0e0'};
  width: ${({ width }) => (typeof width === 'number' ? `${width}px` : width)};
  height: ${({ height }) =>
    typeof height === 'number' ? `${height}px` : height};

  ${({ $variant }) => {
    switch ($variant) {
      case 'text':
        return 'border-radius: 4px;'
      case 'rectangular':
        return 'border-radius: 0;'
      case 'rounded':
        return 'border-radius: 12px;'
      case 'circular':
        return 'border-radius: 50%;'
      default:
        return 'border-radius: 4px;'
    }
  }}

  ${({ $animation, theme }) => {
    switch ($animation) {
      case 'pulse':
        return css`
          animation: ${pulse} 1.5s infinite;
        `
      case 'wave':
        return css`
          position: relative;
          overflow: hidden;

          &::before {
            position: absolute;
            top: 0;
            left: -150%;
            width: 150%;
            height: 100%;
            content: '';
            /* 물결 하이라이트도 낮춘다 — 어두운 바탕에 흰 20%는 번쩍인다 */
            background: linear-gradient(
              90deg,
              transparent,
              ${theme.mode === 'dark'
                ? 'rgb(255 255 255 / 7%)'
                : 'rgb(255 255 255 / 20%)'},
              transparent
            );
            animation: ${wave} 1.6s infinite;
          }
        `
      default:
        return ''
    }
  }}
`

export function Skeleton(props: {
  variant?: 'circular' | 'rectangular' | 'rounded' | 'text'
  width?: number | string
  height?: number | string
  animation?: 'pulse' | 'wave'
  style?: React.CSSProperties
}) {
  const {
    variant = 'text',
    width = 80,
    height = 16,
    animation = 'wave',
    style,
  } = props

  return (
    <StyledSkeleton
      $variant={variant}
      width={width}
      height={height}
      $animation={animation}
      style={style}
    />
  )
}
