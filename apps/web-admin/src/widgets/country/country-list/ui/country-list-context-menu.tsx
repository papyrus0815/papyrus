/**
 * 행 우클릭 컨텍스트 메뉴 — 고정 / 편집 등 빠른 액션.
 * 사건 상세 EventActionsMenu와 동일한 6px 플랫 메뉴 규격.
 */
import React, { useEffect, useRef } from 'react'

import { createPortal } from 'react-dom'

import { FiEdit2, FiStar } from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  MOTION,
  RADIUS,
  ledgerBackground,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import { DANGER, metaText } from '@/pages/events/styles/theme'
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
      icon: (
        <FiStar
          size={13}
          fill={pinned ? 'currentColor' : 'none'}
          aria-hidden
        />
      ),
      onClick: () => {
        onTogglePin(country.id)
        onClose()
      },
    },
  ]

  if (onEdit) {
    items.push({
      id: 'edit',
      label: '정보 수정',
      icon: <FiEdit2 size={13} aria-hidden />,
      onClick: () => {
        onEdit(country)
        onClose()
      },
    })
  }

  const left = Math.min(position.x, window.innerWidth - 180)
  const top = Math.min(position.y, window.innerHeight - items.length * 36 - 24)

  return createPortal(
    <Menu
      ref={menuRef}
      role="menu"
      data-country-context-menu="true"
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
  min-width: 168px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0, 0, 0, 0.55)'
      : '0 8px 24px rgba(15, 23, 42, 0.1)'};
  padding: 4px;
  z-index: ${Z_INDEX.DROPDOWN + 10};
`

const MenuTitle = styled.div`
  padding: 5px 10px 6px;
  font-size: 11px;
  font-weight: 600;
  ${metaText}
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MenuItem = styled.button<{ $variant: 'default' | 'danger' }>`
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  color: ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.text.secondary : theme.colors.text.primary};
  border-radius: 4px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  font-size: 12.5px;
  font-weight: 500;
  transition:
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover:not(:disabled),
  &:focus-visible {
    background: ${({ $variant, theme }) =>
      $variant === 'danger' ? DANGER.soft : ledgerHoverFill(theme.mode)};
    color: ${({ $variant, theme }) =>
      $variant === 'danger' ? theme.colors.error : theme.colors.text.primary};
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
`

const ItemLabel = styled.span`
  flex: 1;
`
