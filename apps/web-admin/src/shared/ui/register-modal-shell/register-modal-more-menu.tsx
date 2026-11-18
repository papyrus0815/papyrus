import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  FiCheck,
  FiColumns,
  FiList,
  FiMoreHorizontal,
} from 'react-icons/fi'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'
import { kitC } from '@/shared/ui/register-form-kit/register-form-kit'

export interface ModalMoreToggleOption {
  key: string
  label: string
  description?: string
  checked: boolean
  onChange: (nextChecked: boolean) => void
}

export interface ModalMoreActionOption {
  key: string
  label: string
  icon?: React.ReactNode
  badge?: string
  active?: boolean
  danger?: boolean
  disabled?: boolean
  closeOnSelect?: boolean
  onClick: () => void
}

export interface RegisterModalMoreMenuProps {
  layoutMode?: 'split' | 'single'
  onChangeLayoutMode?: (nextMode: 'split' | 'single') => void
  toggles?: ModalMoreToggleOption[]
  actions?: ModalMoreActionOption[]
  ariaLabel?: string
  title?: string
  hasActiveIndicator?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

interface PopoverCoords {
  top: number
  left: number
}

const MENU_WIDTH = 264
const POPOVER_Z = Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 30

export const RegisterModalMoreMenu: React.FC<RegisterModalMoreMenuProps> = ({
  layoutMode,
  onChangeLayoutMode,
  toggles = [],
  actions = [],
  ariaLabel = '모달 설정 더보기',
  title = '화면 배치 및 입력 설정',
  hasActiveIndicator = false,
  onOpenChange,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [coords, setCoords] = useState<PopoverCoords | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const setOpenWithNotify = useCallback(
    (nextVal: boolean | ((prevVal: boolean) => boolean)) => {
      setMenuOpen((prevVal) => {
        const resolved =
          typeof nextVal === 'function' ? nextVal(prevVal) : nextVal
        if (resolved !== prevVal) {
          onOpenChange?.(resolved)
        }
        return resolved
      })
    },
    [onOpenChange],
  )

  const updateCoords = useCallback(() => {
    const triggerEl = triggerRef.current
    if (!triggerEl || typeof window === 'undefined') return
    const rect = triggerEl.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const idealLeft = rect.right - MENU_WIDTH
    const clampedLeft = Math.max(
      12,
      Math.min(idealLeft, viewportWidth - MENU_WIDTH - 12),
    )
    setCoords({
      top: rect.bottom + 6,
      left: clampedLeft,
    })
  }, [])

  useLayoutEffect(() => {
    if (!menuOpen) return
    updateCoords()
  }, [menuOpen, updateCoords])

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (mouseEvent: MouseEvent) => {
      const targetNode = mouseEvent.target as Node | null
      if (!targetNode) return
      if (triggerRef.current?.contains(targetNode)) return
      if (popoverRef.current?.contains(targetNode)) return
      setOpenWithNotify(false)
    }

    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        keyEvent.stopPropagation()
        setOpenWithNotify(false)
        triggerRef.current?.focus()
      }
    }

    const handleReposition = () => updateCoords()

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [menuOpen, setOpenWithNotify, updateCoords])

  const visibleActions = actions.filter((actionItem) => !actionItem.disabled)
  const hasLayoutSection = Boolean(layoutMode && onChangeLayoutMode)
  const hasToggleSection = toggles.length > 0
  const hasActionSection = visibleActions.length > 0

  if (!hasLayoutSection && !hasToggleSection && !hasActionSection) {
    return null
  }

  return (
    <>
      <TriggerIconBtn
        ref={triggerRef}
        type="button"
        $open={menuOpen}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={title}
        onClick={() => setOpenWithNotify((prevVal) => !prevVal)}
      >
        <FiMoreHorizontal size={17} aria-hidden />
        {hasActiveIndicator ? <IndicatorDot aria-hidden /> : null}
      </TriggerIconBtn>

      {menuOpen && coords && typeof document !== 'undefined'
        ? createPortal(
            <PopoverCard
              ref={popoverRef}
              role="menu"
              aria-label={ariaLabel}
              style={{ top: coords.top, left: coords.left }}
            >
              {hasLayoutSection && layoutMode && onChangeLayoutMode ? (
                <LayoutSectionBlock>
                  <SectionCaption>화면 배치</SectionCaption>
                  <SegmentedTrack role="group" aria-label="화면 배치 선택">
                    <SegmentedBtn
                      type="button"
                      $active={layoutMode === 'split'}
                      aria-pressed={layoutMode === 'split'}
                      onClick={() => {
                        onChangeLayoutMode('split')
                      }}
                    >
                      <FiColumns size={12.5} aria-hidden />
                      <span>2단 분할</span>
                    </SegmentedBtn>
                    <SegmentedBtn
                      type="button"
                      $active={layoutMode === 'single'}
                      aria-pressed={layoutMode === 'single'}
                      onClick={() => {
                        onChangeLayoutMode('single')
                      }}
                    >
                      <FiList size={12.5} aria-hidden />
                      <span>1단 보기</span>
                    </SegmentedBtn>
                  </SegmentedTrack>
                </LayoutSectionBlock>
              ) : null}

              {hasToggleSection ? (
                <MenuSection $withDivider={hasLayoutSection}>
                  <SectionCaption>입력 옵션</SectionCaption>
                  {toggles.map((toggleItem) => (
                    <ToggleRowBtn
                      key={toggleItem.key}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={toggleItem.checked}
                      onClick={() => toggleItem.onChange(!toggleItem.checked)}
                    >
                      <ToggleTextCol>
                        <span className="toggle-label">{toggleItem.label}</span>
                        {toggleItem.description ? (
                          <span className="toggle-desc">
                            {toggleItem.description}
                          </span>
                        ) : null}
                      </ToggleTextCol>
                      <CheckPill $checked={toggleItem.checked} aria-hidden>
                        {toggleItem.checked ? <FiCheck size={11} /> : null}
                      </CheckPill>
                    </ToggleRowBtn>
                  ))}
                </MenuSection>
              ) : null}

              {hasActionSection ? (
                <MenuSection
                  $withDivider={hasLayoutSection || hasToggleSection}
                >
                  {visibleActions.map((actionItem) => (
                    <ActionRowBtn
                      key={actionItem.key}
                      type="button"
                      role="menuitem"
                      $danger={actionItem.danger}
                      $active={actionItem.active}
                      onClick={() => {
                        actionItem.onClick()
                        if (actionItem.closeOnSelect !== false) {
                          setOpenWithNotify(false)
                        }
                      }}
                    >
                      <span className="action-main">
                        {actionItem.icon ? (
                          <span className="action-icon" aria-hidden>
                            {actionItem.icon}
                          </span>
                        ) : null}
                        <span>{actionItem.label}</span>
                      </span>
                      {actionItem.badge ? (
                        <ActionBadge>{actionItem.badge}</ActionBadge>
                      ) : null}
                    </ActionRowBtn>
                  ))}
                </MenuSection>
              ) : null}
            </PopoverCard>,
            document.body,
          )
        : null}
    </>
  )
}

const TriggerIconBtn = styled.button<{ $open: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid
    ${({ $open, theme }) =>
      $open ? kitC(theme).border : 'transparent'};
  border-radius: 8px;
  background: ${({ $open, theme }) =>
    $open ? theme.colors.background.tertiary : 'transparent'};
  color: ${({ $open, theme }) =>
    $open ? theme.colors.text.primary : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
  }
`

const IndicatorDot = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
`

const PopoverCard = styled.div`
  position: fixed;
  z-index: ${POPOVER_Z};
  width: ${MENU_WIDTH}px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#18181b' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 16px 38px rgba(0, 0, 0, 0.55)'
      : '0 14px 34px rgba(15, 23, 42, 0.14)'};
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const LayoutSectionBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 6px 8px;

  @media (max-width: 979px) {
    display: none;
  }
`

const MenuSection = styled.div<{ $withDivider?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: ${({ $withDivider }) => ($withDivider ? '6px' : '2px')};
  border-top: ${({ $withDivider, theme }) =>
    $withDivider ? `1px solid ${theme.colors.border.light}` : 'none'};
`

const SectionCaption = styled.div`
  padding: 2px 6px 3px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const SegmentedTrack = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  border-radius: 9px;
  background: ${({ theme }) => kitC(theme).section};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SegmentedBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  transition:
    background-color 0.14s ease,
    color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ToggleRowBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background-color 0.13s ease;

  &:hover {
    background: ${({ theme }) => kitC(theme).section};
  }
`

const ToggleTextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;

  .toggle-label {
    font-size: 12.5px;
    font-weight: 500;
    color: ${({ theme }) => kitC(theme).textPrimary};
    line-height: 1.35;
  }

  .toggle-desc {
    font-size: 11px;
    color: ${({ theme }) => kitC(theme).textMuted};
    line-height: 1.35;
  }
`

const CheckPill = styled.span<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid
    ${({ $checked, theme }) =>
      $checked ? theme.colors.primary : kitC(theme).border};
  background: ${({ $checked, theme }) =>
    $checked ? theme.colors.primary : 'transparent'};
  color: #ffffff;
  transition:
    background-color 0.13s ease,
    border-color 0.13s ease;
`

const ActionRowBtn = styled.button<{ $danger?: boolean; $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 8px;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.15)'
        : 'rgba(99, 102, 241, 0.07)'
      : 'transparent'};
  color: ${({ $danger, $active, theme }) =>
    $danger
      ? theme.colors.error
      : $active
        ? theme.mode === 'dark'
          ? '#a5b4fc'
          : theme.colors.primary
        : kitC(theme).textPrimary};
  text-align: left;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.13s ease;

  .action-main {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.85;
  }

  &:hover {
    background: ${({ $danger, theme }) =>
      $danger
        ? theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.14)'
          : '#fef2f2'
        : kitC(theme).section};
  }
`

const ActionBadge = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textSecondary};
  background: ${({ theme }) => kitC(theme).section};
`
