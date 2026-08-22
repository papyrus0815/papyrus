/**
 * 좌측 레일의 원형 버튼 — 디스코드 서버 아이콘과 같은 조작 모델.
 *
 * - 활성 항목은 **좌측 가장자리의 흰 pill**로 표시한다(아이콘 색만 바꾸면 스캔이 안 된다).
 * - hover 시 오른쪽에 라벨 툴팁. 레일에는 글자가 없으므로 이름을 알 길이 툴팁뿐이다.
 * - 활성/hover에서 원이 각진 사각형(radius 16px)으로 풀리는 것도 디스코드 규약.
 *
 * ⚠️ 툴팁은 body로 portal 한다. 내비 구간은 항목이 11개라 세로 스크롤을 켜는데,
 * overflow를 한 축이라도 non-visible로 만들면 **다른 축도 함께 잘려** 레일 밖으로 나가는
 * 툴팁이 사라진다. 레일 폭은 고정이므로 x는 CSS 변수로, y는 버튼 rect로 잡는다.
 */
import React, { useCallback, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import styled, { css } from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

interface RailButtonProps {
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
  /** 홈(로고)처럼 항상 강조 톤을 쓰는 버튼 */
  $accent?: boolean
  /** 배지(알림 수 등) */
  badge?: React.ReactNode
  'aria-haspopup'?: boolean
  'aria-expanded'?: boolean
}

export function RailButton({
  label,
  icon,
  active,
  onClick,
  $accent,
  badge,
  ...aria
}: RailButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [tooltipTop, setTooltipTop] = useState<number | null>(null)

  const showTooltip = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) setTooltipTop(rect.top + rect.height / 2)
  }, [])
  const hideTooltip = useCallback(() => setTooltipTop(null), [])

  return (
    <Slot
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {active && <ActivePill aria-hidden />}
      <Button
        ref={buttonRef}
        type="button"
        $active={!!active}
        $accent={!!$accent}
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        {...aria}
      >
        {icon}
        {badge}
      </Button>
      {tooltipTop !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <Tooltip role="tooltip" style={{ top: tooltipTop }}>
            {label}
          </Tooltip>,
          document.body,
        )}
    </Slot>
  )
}

const Tooltip = styled.span`
  position: fixed;
  left: calc(var(--nav-rail-width, 72px) + 6px);
  transform: translateY(-50%);
  padding: 7px 11px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#0b0b0b' : '#111827'};
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
  /* 레일(HEADER)·목록 사이드바보다 위. 다이얼로그(2000+)보다는 아래. */
  z-index: ${Z_INDEX.NAV};
`

const Slot = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
`

/** 활성 표시 — 레일 좌측 가장자리에 붙는 세로 pill */
const ActivePill = styled.span`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 26px;
  border-radius: 0 4px 4px 0;
  background: ${({ theme }) => theme.colors.text.primary};
`

const Button = styled.button<{ $active: boolean; $accent: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: ${({ $active }) => ($active ? '17px' : '50%')};
  transition:
    border-radius 0.16s ease,
    background 0.16s ease,
    color 0.16s ease;

  ${({ theme, $active, $accent }) => {
    const isDark = theme.mode === 'dark'
    const idleBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
    const activeBg = $accent
      ? theme.colors.primary
      : isDark
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(0,0,0,0.10)'
    return css`
      background: ${$active ? activeBg : idleBg};
      color: ${$active && $accent
        ? '#ffffff'
        : $active
          ? theme.colors.text.primary
          : theme.colors.text.secondary};

      &:hover {
        border-radius: 17px;
        background: ${$active ? activeBg : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'};
        color: ${$active && $accent ? '#ffffff' : theme.colors.text.primary};
      }
    `
  }}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    width: 42px;
    height: 42px;
  }
`
