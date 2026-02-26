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

  @media (max-width: 480px) {
    gap: 2px;
    flex-wrap: wrap;
  }
`

const TopNavItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #475569;
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #6366f1;
  }

  &[aria-current='page'] {
    color: #4f46e5;
    background: #eef2ff;
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

  ${TopNavItem}[aria-current='page'] & {
    color: #4f46e5;
  }
`
