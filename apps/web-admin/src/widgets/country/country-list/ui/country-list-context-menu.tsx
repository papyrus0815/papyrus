/**
 * 행 우클릭 컨텍스트 메뉴 — 편집/고정/삭제 등 자주 쓰는 액션.
 *
 * 행 컴포넌트에서 onContextMenu로 좌표 + country를 넘겨 호출.
 * 편집은 역사 국가만 onEditHistorical 호출 (현대 국가는 별도 폼).
 */
import React, { useEffect, useRef } from 'react'

import { createPortal } from 'react-dom'

import { FaEdit, FaRegStar, FaStar } from 'react-icons/fa'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { Z_INDEX } from '@/shared/styles/z-index'

interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

interface CountryListContextMenuProps {
  country: UnifiedCountry
  pinned: boolean
  position: { x: number; y: number }
  onClose: () => void
  onTogglePin: (id: string) => void
  onEdit?: (country: UnifiedCountry) => void
}

export function CountryListContextMenu({
  country,
  pinned,
  position,
  onClose,
  onTogglePin,
  onEdit,
}: CountryListContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // 다음 틱부터 listener 등록 (현재 우클릭이 즉시 닫지 않도록)
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('contextmenu', handler)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('contextmenu', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const items: ContextMenuItem[] = [
    {
      id: 'pin',
      label: pinned ? '고정 해제' : '고정',
      icon: pinned ? <FaStar /> : <FaRegStar />,
      onClick: () => {
        onTogglePin(country.id)
        onClose()
      },
    },
  ]

  if (onEdit) {
    items.push({
      id: 'edit',
      label: '편집',
      icon: <FaEdit />,
      onClick: () => {
        onEdit(country)
        onClose()
      },
    })
  }

  // 화면 밖으로 안 나가게 좌표 보정 (대략적)
  const left = Math.min(position.x, window.innerWidth - 180)
  const top = Math.min(position.y, window.innerHeight - items.length * 40 - 16)

  return createPortal(
    <Menu
      ref={menuRef}
      role="menu"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuTitle>{country.name}</MenuTitle>
      {items.map((item) => (
        <MenuItem
          key={item.id}
          type="button"
          role="menuitem"
          $variant={item.variant ?? 'default'}
          onClick={item.onClick}
          disabled={item.disabled}
        >
          {item.icon && <ItemIcon>{item.icon}</ItemIcon>}
          <ItemLabel>{item.label}</ItemLabel>
        </MenuItem>
      ))}
    </Menu>,
    document.body,
  )
}

const Menu = styled.div`
  position: fixed;
  min-width: 170px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  box-shadow: 0 8px 24px ${({ theme }) => theme.colors.shadow.md};
  padding: 4px;
  z-index: ${Z_INDEX.DROPDOWN};
`

const MenuTitle = styled.div`
  padding: 6px 10px 8px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MenuItem = styled.button<{ $variant: 'default' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.error : theme.colors.text.primary};
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font-size: 13px;

  &:hover:not(:disabled),
  &:focus-visible {
    background: ${({ theme }) => theme.colors.hover};
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ItemIcon = styled.span`
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};

  > svg {
    width: 12px;
    height: 12px;
  }
`

const ItemLabel = styled.span`
  flex: 1;
`
