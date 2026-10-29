import { useEffect, useRef, useState } from 'react'

import { FiMoreHorizontal, FiPlus, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerBackground,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'

export interface PersonActionsMenuProps {
  onAdd?: () => void
  onDelete: () => void
}

/**
 * 인물 상세 상단 줄 끝의 ⋯ — 부가·파괴적 동작(새 인물 등록, 인물 삭제) 수납.
 * 사건 상세의 EventActionsMenu와 동일한 28×28 원형 헤어라인 트리거 + 드롭다운 규약.
 */
export function PersonActionsMenu({ onAdd, onDelete }: PersonActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const hostRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (pointerEvent: MouseEvent) => {
      if (!hostRef.current?.contains(pointerEvent.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <Host ref={hostRef}>
      <Trigger
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="인물 메뉴"
        title="인물 메뉴"
        onClick={() => setOpen((prev) => !prev)}
      >
        <FiMoreHorizontal aria-hidden />
      </Trigger>
      {open && (
        <Menu role="menu">
          {onAdd && (
            <MenuItem
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onAdd()
              }}
            >
              <FiPlus aria-hidden />새 인물 등록
            </MenuItem>
          )}
          <MenuItem
            type="button"
            role="menuitem"
            $danger
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            <FiTrash2 aria-hidden />
            인물 삭제
          </MenuItem>
        </Menu>
      )}
    </Host>
  )
}

const Host = styled.span`
  position: relative;
  display: inline-flex;
`

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease;

  svg {
    width: 15px;
    height: 15px;
  }

  &:hover,
  &[aria-expanded='true'] {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  min-width: 160px;
  padding: 4px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0, 0, 0, 0.5)'
      : '0 8px 24px rgba(15, 23, 42, 0.1)'};
`

const MenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.error : theme.colors.text.primary};
  cursor: pointer;
  text-align: left;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &:hover {
    background: ${({ theme, $danger }) =>
      $danger
        ? theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.14)'
          : 'rgba(239, 68, 68, 0.08)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.05)'};
  }
`
