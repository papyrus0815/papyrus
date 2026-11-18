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

import { Z_INDEX } from '@/shared/styles/z-index'

import { GOV_BRAND, govTabularNums } from './government-ledger.styles'

export interface GovMoreSegmentOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface GovMoreSegmentGroup {
  key: string
  label: string
  value: string
  options: GovMoreSegmentOption[]
  onChange: (nextValue: string) => void
}

export interface GovMoreToggleItem {
  key: string
  label: string
  description?: string
  checked: boolean
  onChange: (nextChecked: boolean) => void
}

export interface GovMoreActionItem {
  key: string
  label: string
  icon?: React.ReactNode
  badge?: string
  active?: boolean
  danger?: boolean
  disabled?: boolean
  closeOnSelect?: boolean
  onClick: (mouseEvent: React.MouseEvent<HTMLButtonElement>) => void
}

export interface GovMorePopoverProps {
  segments?: GovMoreSegmentGroup[]
  toggles?: GovMoreToggleItem[]
  customContent?: React.ReactNode
  actions?: GovMoreActionItem[]
  ariaLabel?: string
  title?: string
  triggerLabel?: string
  triggerSize?: 'md' | 'sm'
  hasActiveIndicator?: boolean
  menuWidth?: number
  onOpenChange?: (isOpen: boolean) => void
}

interface PopoverPosition {
  top: number
  left: number
}

const DEFAULT_MENU_WIDTH = 268
const POPOVER_Z = Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 35

export const GovMorePopover: React.FC<GovMorePopoverProps> = ({
  segments = [],
  toggles = [],
  customContent,
  actions = [],
  ariaLabel = '설정 및 더보기 메뉴',
  title = '설정 및 더보기',
  triggerLabel,
  triggerSize = 'md',
  hasActiveIndicator = false,
  menuWidth = DEFAULT_MENU_WIDTH,
  onOpenChange,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [coords, setCoords] = useState<PopoverPosition | null>(null)
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
    const viewportHeight = window.innerHeight
    const idealLeft = rect.right - menuWidth
    const clampedLeft = Math.max(
      12,
      Math.min(idealLeft, viewportWidth - menuWidth - 12),
    )

    const measuredHeight = popoverRef.current?.offsetHeight ?? 260
    const fitsBelow = rect.bottom + 6 + measuredHeight <= viewportHeight - 12
    const nextTop = fitsBelow
      ? rect.bottom + 6
      : Math.max(12, rect.top - measuredHeight - 6)

    setCoords({
      top: nextTop,
      left: clampedLeft,
    })
  }, [menuWidth])

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

  const visibleSegments = segments.filter(
    (segmentGroup) => segmentGroup.options.length > 0,
  )
  const visibleActions = actions.filter((actionItem) => !actionItem.disabled)
  const hasSegments = visibleSegments.length > 0
  const hasToggles = toggles.length > 0
  const hasCustom = Boolean(customContent)
  const hasActions = visibleActions.length > 0

  if (!hasSegments && !hasToggles && !hasCustom && !hasActions) {
    return null
  }

  return (
    <>
      <TriggerButton
        ref={triggerRef}
        type="button"
        $open={menuOpen}
        $size={triggerSize}
        $hasLabel={Boolean(triggerLabel)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={title}
        onClick={(clickEvent) => {
          clickEvent.stopPropagation()
          setOpenWithNotify((prevVal) => !prevVal)
        }}
      >
        <FiMoreHorizontal size={triggerSize === 'sm' ? 15 : 16} aria-hidden />
        {triggerLabel ? <span>{triggerLabel}</span> : null}
        {hasActiveIndicator ? <ActiveDot aria-hidden /> : null}
      </TriggerButton>

      {menuOpen && coords && typeof document !== 'undefined'
        ? createPortal(
            <PopoverSurface
              ref={popoverRef}
              role="menu"
              aria-label={ariaLabel}
              style={{
                top: coords.top,
                left: coords.left,
                width: menuWidth,
              }}
              onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
              {hasSegments ? (
                <PopoverBlock $withDivider={false}>
                  {visibleSegments.map((segmentGroup) => (
                    <SegmentGroupWrap key={segmentGroup.key}>
                      <SectionCaption>{segmentGroup.label}</SectionCaption>
                      <SegmentedTrack
                        role="group"
                        aria-label={segmentGroup.label}
                        $count={segmentGroup.options.length}
                      >
                        {segmentGroup.options.map((optItem) => {
                          const isSelected =
                            segmentGroup.value === optItem.value
                          return (
                            <SegmentedOptionBtn
                              key={optItem.value}
                              type="button"
                              $active={isSelected}
                              aria-pressed={isSelected}
                              onClick={() =>
                                segmentGroup.onChange(optItem.value)
                              }
                            >
                              {optItem.icon ? (
                                <span className="seg-icon" aria-hidden>
                                  {optItem.icon}
                                </span>
                              ) : null}
                              <span>{optItem.label}</span>
                            </SegmentedOptionBtn>
                          )
                        })}
                      </SegmentedTrack>
                    </SegmentGroupWrap>
                  ))}
                </PopoverBlock>
              ) : null}

              {hasCustom ? (
                <PopoverBlock $withDivider={hasSegments}>
                  {customContent}
                </PopoverBlock>
              ) : null}

              {hasToggles ? (
                <PopoverBlock $withDivider={hasSegments || hasCustom}>
                  <SectionCaption>표시 옵션</SectionCaption>
                  {toggles.map((toggleItem) => (
                    <ToggleRowButton
                      key={toggleItem.key}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={toggleItem.checked}
                      onClick={() => toggleItem.onChange(!toggleItem.checked)}
                    >
                      <ToggleTextStack>
                        <span className="toggle-title">{toggleItem.label}</span>
                        {toggleItem.description ? (
                          <span className="toggle-desc">
                            {toggleItem.description}
                          </span>
                        ) : null}
                      </ToggleTextStack>
                      <CheckIndicator $checked={toggleItem.checked} aria-hidden>
                        {toggleItem.checked ? <FiCheck size={11} /> : null}
                      </CheckIndicator>
                    </ToggleRowButton>
                  ))}
                </PopoverBlock>
              ) : null}

              {hasActions ? (
                <PopoverBlock
                  $withDivider={hasSegments || hasCustom || hasToggles}
                >
                  {visibleActions.map((actionItem) => (
                    <ActionRowButton
                      key={actionItem.key}
                      type="button"
                      role="menuitem"
                      $danger={actionItem.danger}
                      $active={actionItem.active}
                      onClick={(mouseEvent) => {
                        actionItem.onClick(mouseEvent)
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
                        <ActionCountBadge>{actionItem.badge}</ActionCountBadge>
                      ) : null}
                    </ActionRowButton>
                  ))}
                </PopoverBlock>
              ) : null}
            </PopoverSurface>,
            document.body,
          )
        : null}
    </>
  )
}

const TriggerButton = styled.button<{
  $open: boolean
  $size: 'md' | 'sm'
  $hasLabel: boolean
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-shrink: 0;
  height: ${({ $size }) => ($size === 'sm' ? '30px' : '34px')};
  min-width: ${({ $size }) => ($size === 'sm' ? '30px' : '34px')};
  padding: ${({ $hasLabel }) => ($hasLabel ? '0 10px' : '0')};
  border-radius: 8px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  border: 1px solid
    ${({ $open, theme }) =>
      $open
        ? theme.mode === 'dark'
          ? GOV_BRAND.primaryBorderDark
          : GOV_BRAND.primaryBorder
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ $open, theme }) =>
    $open
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.03)'
        : '#ffffff'};
  color: ${({ $open, theme }) =>
    $open
      ? theme.mode === 'dark'
        ? GOV_BRAND.primaryInkDark
        : GOV_BRAND.primaryInk
      : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;

  &:hover,
  &:focus-visible {
    background: ${({ $open, theme }) =>
      $open
        ? theme.mode === 'dark'
          ? GOV_BRAND.primarySoftDark
          : GOV_BRAND.primarySoft
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.07)'
          : '#f8fafc'};
    color: ${({ $open, theme }) =>
      $open
        ? theme.mode === 'dark'
          ? GOV_BRAND.primaryInkDark
          : GOV_BRAND.primaryInk
        : theme.colors.text.primary};
    outline: none;
  }
`

const ActiveDot = styled.span`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary};
`

const PopoverSurface = styled.div`
  position: fixed;
  z-index: ${POPOVER_Z};
  max-width: calc(100vw - 24px);
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#181a20' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 18px 40px -12px rgba(0, 0, 0, 0.65)'
      : '0 16px 36px -12px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.06)'};
  overflow: hidden;
`

const PopoverBlock = styled.div<{ $withDivider: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-top: ${({ $withDivider, theme }) =>
    $withDivider
      ? `1px solid ${
          theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(15, 23, 42, 0.07)'
        }`
      : 'none'};
`

const SegmentGroupWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  & + & {
    margin-top: 4px;
  }
`

const SectionCaption = styled.div`
  padding: 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SegmentedTrack = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => Math.max($count, 1)}, 1fr);
  gap: 3px;
  padding: 3px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'};
`

const SegmentedOptionBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#262932'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  white-space: nowrap;
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0, 0, 0, 0.4)'
        : '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};

  .seg-icon {
    display: inline-flex;
    align-items: center;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ToggleRowButton = styled.button`
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
  font-family: inherit;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc'};
    outline: none;
  }
`

const ToggleTextStack = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  .toggle-title {
    font-size: 12.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .toggle-desc {
    font-size: 11px;
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CheckIndicator = styled.span<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1px solid
    ${({ $checked, theme }) =>
      $checked
        ? theme.mode === 'dark'
          ? GOV_BRAND.primaryDark
          : GOV_BRAND.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.18)'
          : '#cbd5e1'};
  background: ${({ $checked, theme }) =>
    $checked
      ? theme.mode === 'dark'
        ? GOV_BRAND.primaryDark
        : GOV_BRAND.primary
      : 'transparent'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#0f172a' : '#ffffff')};
`

const ActionRowButton = styled.button<{
  $danger?: boolean
  $active?: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : 'transparent'};
  color: ${({ $danger, $active, theme }) =>
    $danger
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#dc2626'
      : $active
        ? theme.mode === 'dark'
          ? GOV_BRAND.primaryInkDark
          : GOV_BRAND.primaryInk
        : theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  text-align: left;
  cursor: pointer;

  .action-main {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${({ $danger, $active, theme }) =>
      $danger
        ? theme.mode === 'dark'
          ? '#fca5a5'
          : '#dc2626'
        : $active
          ? theme.mode === 'dark'
            ? GOV_BRAND.primaryInkDark
            : GOV_BRAND.primaryInk
          : theme.colors.text.tertiary};
  }

  &:hover,
  &:focus-visible {
    background: ${({ $danger, theme }) =>
      $danger
        ? theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.14)'
          : '#fef2f2'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : '#f8fafc'};
    outline: none;
  }
`

const ActionCountBadge = styled.span`
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  ${govTabularNums}
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 팝오버 내부 커스텀 필터 필드용 헬퍼 스타일 */
export const GovMoreFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  & + & {
    margin-top: 6px;
  }
`

export const GovMoreFieldLabel = styled.label`
  padding: 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const GovMoreNativeSelect = styled.select`
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.1)'};
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary};
  }
`

export const GovMoreTextInput = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  ${govTabularNums}
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.1)'};
  outline: none;

  &::placeholder {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary};
  }
`
