import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { FiCheck, FiMoreHorizontal } from 'react-icons/fi'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerElevated,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import { Z_INDEX } from '@/shared/styles/z-index'

export interface PopoverMenuActionItem {
  type?: 'item'
  id: string
  label: string
  icon?: React.ReactNode
  checked?: boolean
  danger?: boolean
  disabled?: boolean
  closeOnSelect?: boolean
  onSelect: () => void
}

export interface PopoverMenuDividerEntry {
  type: 'divider'
  id: string
}

export interface PopoverMenuSectionEntry {
  type: 'section'
  id: string
  label: string
}

export type PopoverMenuEntry =
  | PopoverMenuActionItem
  | PopoverMenuDividerEntry
  | PopoverMenuSectionEntry

export interface PopoverMenuProps {
  /** 선언형 메뉴 항목 목록 (children과 함께 또는 단독 사용 가능) */
  items?: PopoverMenuEntry[]
  /** 필터 폼 등 커스텀 팝오버 본문 */
  children?: React.ReactNode | ((closeMenu: () => void) => React.ReactNode)
  /** 필터 적용 중 등 활성 상태 강조 */
  active?: boolean
  /** 트리거 버튼 크기 */
  size?: 'sm' | 'md'
  /** 팝오버 최소 너비(px) */
  minWidth?: number
  /** 팝오버 최대 너비(px) */
  maxWidth?: number
  /** 접근성 라벨 */
  ariaLabel?: string
  /** 툴팁 타이틀 */
  title?: string
  /** 비활성화 */
  disabled?: boolean
  /** 정렬 기준 (기본: 우측 정렬) */
  align?: 'left' | 'right'
  /** 이벤트 버블링 차단 여부 (테이블 행 내부 버튼 등) */
  stopPropagation?: boolean
  /** 커스텀 트리거 렌더러 */
  renderTrigger?: (args: {
    isOpen: boolean
    toggle: (evt: React.MouseEvent) => void
    ref: React.RefObject<HTMLButtonElement | null>
  }) => React.ReactNode
}

const VIEWPORT_MARGIN = 12
const POPOVER_GAP = 6

export function PopoverMenu({
  items,
  children,
  active = false,
  size = 'md',
  minWidth = 200,
  maxWidth = 320,
  ariaLabel = '설정 및 작업 메뉴',
  title,
  disabled = false,
  align = 'right',
  stopPropagation = true,
  renderTrigger,
}: PopoverMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    ready: boolean
  }>({
    top: 0,
    left: 0,
    ready: false,
  })

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleMenu = useCallback(
    (evt: React.MouseEvent) => {
      if (stopPropagation) {
        evt.stopPropagation()
      }
      if (disabled) return
      setIsOpen((prev) => !prev)
    },
    [disabled, stopPropagation],
  )

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current
    const panelEl = panelRef.current
    if (!triggerEl || !panelEl) return

    const triggerRect = triggerEl.getBoundingClientRect()
    const panelRect = panelEl.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    let nextLeft =
      align === 'right'
        ? triggerRect.right - panelRect.width
        : triggerRect.left

    if (nextLeft + panelRect.width > viewportW - VIEWPORT_MARGIN) {
      nextLeft = viewportW - VIEWPORT_MARGIN - panelRect.width
    }
    if (nextLeft < VIEWPORT_MARGIN) {
      nextLeft = VIEWPORT_MARGIN
    }

    const spaceBelow = viewportH - triggerRect.bottom - POPOVER_GAP - VIEWPORT_MARGIN
    const spaceAbove = triggerRect.top - POPOVER_GAP - VIEWPORT_MARGIN
    const shouldFlipUp =
      panelRect.height > spaceBelow && spaceAbove > spaceBelow

    let nextTop = shouldFlipUp
      ? triggerRect.top - POPOVER_GAP - panelRect.height
      : triggerRect.bottom + POPOVER_GAP

    if (nextTop < VIEWPORT_MARGIN) {
      nextTop = VIEWPORT_MARGIN
    }
    if (nextTop + panelRect.height > viewportH - VIEWPORT_MARGIN) {
      nextTop = Math.max(
        VIEWPORT_MARGIN,
        viewportH - VIEWPORT_MARGIN - panelRect.height,
      )
    }

    setCoords({ top: nextTop, left: nextLeft, ready: true })
  }, [align])

  useLayoutEffect(() => {
    if (!isOpen) {
      setCoords((prev) => (prev.ready ? { ...prev, ready: false } : prev))
      return
    }
    updatePosition()
    const rafId = window.requestAnimationFrame(updatePosition)
    return () => window.cancelAnimationFrame(rafId)
  }, [isOpen, updatePosition])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (evt: MouseEvent) => {
      const target = evt.target as Node | null
      if (!target) return
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        evt.stopPropagation()
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    const handleWindowChange = () => {
      updatePosition()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('scroll', handleWindowChange, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('scroll', handleWindowChange, true)
    }
  }, [isOpen, updatePosition])

  const renderedChildren =
    typeof children === 'function' ? children(closeMenu) : children

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ isOpen, toggle: toggleMenu, ref: triggerRef })
      ) : (
        <DefaultDotsButton
          ref={triggerRef}
          type="button"
          $size={size}
          $active={isOpen || active}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          title={title ?? ariaLabel}
          onClick={toggleMenu}
        >
          <FiMoreHorizontal size={size === 'sm' ? 14 : 16} />
        </DefaultDotsButton>
      )}

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <PortalPanel
              ref={panelRef}
              role={children ? 'dialog' : 'menu'}
              aria-label={ariaLabel}
              $top={coords.top}
              $left={coords.left}
              $ready={coords.ready}
              $minWidth={minWidth}
              $maxWidth={maxWidth}
              onClick={(evt) => {
                if (stopPropagation) evt.stopPropagation()
              }}
            >
              {items && items.length > 0
                ? items.map((entry) => {
                    if (entry.type === 'divider') {
                      return <PopoverMenuDivider key={entry.id} />
                    }
                    if (entry.type === 'section') {
                      return (
                        <PopoverMenuSectionLabel key={entry.id}>
                          {entry.label}
                        </PopoverMenuSectionLabel>
                      )
                    }
                    return (
                      <PopoverMenuItem
                        key={entry.id}
                        type="button"
                        role="menuitem"
                        $danger={entry.danger}
                        disabled={entry.disabled}
                        onClick={() => {
                          if (entry.disabled) return
                          entry.onSelect()
                          if (entry.closeOnSelect !== false) {
                            closeMenu()
                          }
                        }}
                      >
                        {entry.icon ? <IconSlot>{entry.icon}</IconSlot> : null}
                        <ItemLabel>{entry.label}</ItemLabel>
                        {entry.checked ? (
                          <CheckSlot>
                            <FiCheck size={13} />
                          </CheckSlot>
                        ) : null}
                      </PopoverMenuItem>
                    )
                  })
                : null}
              {renderedChildren}
            </PortalPanel>,
            document.body,
          )
        : null}
    </>
  )
}

const DefaultDotsButton = styled.button<{
  $size: 'sm' | 'md'
  $active: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => ($size === 'sm' ? '26px' : '32px')};
  height: ${({ $size }) => ($size === 'sm' ? '26px' : '32px')};
  padding: 0;
  border-radius: ${({ $size }) => ($size === 'sm' ? '6px' : '8px')};
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const PortalPanel = styled.div<{
  $top: number
  $left: number
  $ready: boolean
  $minWidth: number
  $maxWidth: number
}>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  z-index: ${Z_INDEX.DROPDOWN + 20};
  min-width: ${({ $minWidth }) => $minWidth}px;
  max-width: min(${({ $maxWidth }) => $maxWidth}px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerElevated(theme.mode)};
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.22);
  display: flex;
  flex-direction: column;
  gap: 2px;
  visibility: ${({ $ready }) => ($ready ? 'visible' : 'hidden')};
  opacity: ${({ $ready }) => ($ready ? 1 : 0)};
  transition: opacity 0.1s ease;
`

export const PopoverMenuSectionLabel = styled.div`
  padding: 5px 8px 3px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PopoverMenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? '#dc2626' : theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $danger }) =>
      $danger ? 'rgba(220, 38, 38, 0.1)' : ledgerHoverFill(theme.mode)};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

export const PopoverMenuDivider = styled.div`
  height: 1px;
  margin: 4px 2px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

const IconSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.85;
`

const ItemLabel = styled.span`
  flex: 1;
  min-width: 0;
`

const CheckSlot = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  margin-left: auto;
`
