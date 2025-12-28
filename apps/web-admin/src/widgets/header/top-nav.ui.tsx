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
  gap: 24px;
  padding: 0;

  @media (max-width: 480px) {
    gap: 12px;
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
  color: #5f6368;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.06s ease;

  &:hover {
    background: var(--color-primary-100);
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }

  &[aria-current='page'] {
    color: var(--color-primary);
    background: var(--color-primary-100);
    font-weight: 600;
  }
`

const TopIcon = styled.span`
  width: 16px;
  height: 16px;
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
  color: #5f6368;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;

  ${TopNavItem}[aria-current='page'] & {
    color: var(--color-primary);
  }
`
