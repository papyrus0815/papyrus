import React from 'react'

import styled from 'styled-components'

export interface TopNavItemSpec {
  key: string
  label: string
  icon: React.ReactNode
  onClick?: () => void
  active?: boolean
}

export function TopNavBar({ items }: { items: TopNavItemSpec[] }) {
  return (
    <TopNav>
      {items.map((item) => (
        <TopNavItem
          key={item.key}
          onClick={item.onClick}
          aria-current={item.active ? 'page' : undefined}
          aria-label={item.label}
          title={item.label}
        >
          <TopIcon>{item.icon}</TopIcon>
          <TopLabel>{item.label}</TopLabel>
        </TopNavItem>
      ))}
    </TopNav>
  )
}

const TopNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0;
  /* 메뉴 항목이 11개라 중간 너비(768~1080px)에서 가로 폭을 초과할 수 있다.
     min-width:0 + overflow-x로 좌우 영역을 밀어내는 대신 내부에서 흡수한다.
     (라벨 숨김으로 대부분 폭에서 스크롤은 거의 발생하지 않는 안전망 용도) */
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  /* 라벨을 숨길 만큼 좁은 폭에서는 아이콘만 가로로 촘촘히 배치 */
  @media (max-width: 1080px) {
    gap: 2px;
  }
`

const TopNavItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;

  /* 1080px 이하: 라벨을 숨기고 아이콘 전용으로 축소해 11개가 모두 들어가게 한다. */
  @media (max-width: 1080px) {
    padding: 8px 10px;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary};
  }

  &[aria-current='page'] {
    color: ${({ theme }) => theme.colors.active};
    background: ${({ theme }) => theme.colors.activeLight};
    font-weight: 600;
  }
`

const TopIcon = styled.span`
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 100%;
    height: 100%;
  }
`

const TopLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: inherit;
  letter-spacing: 0.01em;
  white-space: nowrap;

  @media (max-width: 1080px) {
    display: none;
  }
`
