/**
 * 사건 상세 히어로 윗줄 끝의 ⋯ — 사건 단위 동작(지금은 '휴지통으로 옮기기').
 *
 * 삭제가 사건 목록 드로어에만 있어, 상세를 보다가 지우려면 목록으로 돌아가 그 사건을 다시 찾아야 했다.
 */
import { useEffect, useRef, useState } from 'react'

import { FiMoreHorizontal, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent, ledgerBackground, ledgerHairlineStrong, RADIUS } from '@/entities/event/ui/ledger-tokens'

export function EventActionsMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const hostRef = useRef<HTMLSpanElement>(null)

  /* 바깥 클릭·Esc로 닫기 */
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (pointerEvent: MouseEvent) => {
      if (!hostRef.current?.contains(pointerEvent.target as Node)) setOpen(false)
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
        aria-label="사건 메뉴"
        title="사건 메뉴"
        onClick={() => setOpen((prev) => !prev)}
      >
        <FiMoreHorizontal aria-hidden />
      </Trigger>
      {open && (
        <Menu role="menu">
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
            휴지통으로 옮기기
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
  z-index: 20;
  min-width: 168px;
  padding: 4px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(15, 23, 42, 0.1)'};
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
  text-align: left;
  color: ${({ theme, $danger }) => ($danger ? theme.colors.error : theme.colors.text.primary)};
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
  }
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
    outline: none;
  }
`
