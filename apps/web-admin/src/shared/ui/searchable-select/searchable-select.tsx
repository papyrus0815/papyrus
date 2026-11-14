import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { FiCheck, FiChevronDown, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { scrollbarMixin } from '@/shared/styles/mixins'
import { Z_INDEX } from '@/shared/styles/z-index'

export interface SearchableSelectOption {
  value: string
  label: string
  /** 구획 머리글 라벨 — 같은 그룹의 옵션끼리 묶어 표시 */
  group?: string
  /** 우측 보조 배지/메타 텍스트 (예: 시대명, 약칭) */
  meta?: string
  /** 하단 보조 설명 텍스트 */
  description?: string
  /** 좌측 아이콘·이모지 */
  icon?: React.ReactNode
  /** 추가 검색 키워드 (영문명·약칭·유형 코드 등) */
  keywords?: string
}

export interface SearchableSelectProps {
  id?: string
  options: SearchableSelectOption[]
  value: string
  onChange: (
    nextValue: string,
    selectedOption?: SearchableSelectOption,
  ) => void
  placeholder?: string
  searchPlaceholder?: string
  ariaLabel?: string
  disabled?: boolean
  clearable?: boolean
  emptyMessage?: string
  noMatchMessage?: string
  size?: 'sm' | 'md'
  maxWidth?: string | number
}

interface DropdownPosition {
  top?: number
  bottom?: number
  left: number
  width: number
  maxHeight: number
}

const POPOVER_Z_INDEX = Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 20

function foldSearchText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = '선택하세요',
  searchPlaceholder = '이름·약칭·유형 검색…',
  ariaLabel,
  disabled = false,
  clearable = true,
  emptyMessage = '선택 가능한 항목이 없습니다',
  noMatchMessage = '일치하는 검색 결과가 없습니다',
  size = 'md',
  maxWidth,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState<DropdownPosition | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerBtnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const selectedOption = useMemo(
    () =>
      value ? options.find((item) => item.value === value) : undefined,
    [options, value],
  )

  const selectableOptions = useMemo(
    () => options.filter((item) => item.value !== ''),
    [options],
  )

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return selectableOptions
    const foldedQuery = foldSearchText(trimmed)
    return selectableOptions.filter((optionItem) => {
      if (foldSearchText(optionItem.label).includes(foldedQuery)) return true
      if (
        optionItem.meta &&
        foldSearchText(optionItem.meta).includes(foldedQuery)
      ) {
        return true
      }
      if (
        optionItem.description &&
        foldSearchText(optionItem.description).includes(foldedQuery)
      ) {
        return true
      }
      if (
        optionItem.group &&
        foldSearchText(optionItem.group).includes(foldedQuery)
      ) {
        return true
      }
      if (
        optionItem.keywords &&
        foldSearchText(optionItem.keywords).includes(foldedQuery)
      ) {
        return true
      }
      return false
    })
  }, [selectableOptions, query])

  const computePosition = useCallback(() => {
    const anchorEl = rootRef.current
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const margin = 12
    const gap = 6
    const desiredWidth = Math.min(
      Math.max(rect.width, 280),
      viewportW - margin * 2,
    )
    const clampedLeft = Math.max(
      margin,
      Math.min(rect.left, viewportW - desiredWidth - margin),
    )

    const spaceBelow = viewportH - rect.bottom - margin
    const spaceAbove = rect.top - margin
    const openUpward = spaceBelow < 240 && spaceAbove > spaceBelow

    if (openUpward) {
      setPosition({
        bottom: viewportH - rect.top + gap,
        left: clampedLeft,
        width: desiredWidth,
        maxHeight: Math.min(360, Math.max(160, spaceAbove - gap)),
      })
    } else {
      setPosition({
        top: rect.bottom + gap,
        left: clampedLeft,
        width: desiredWidth,
        maxHeight: Math.min(360, Math.max(160, spaceBelow - gap)),
      })
    }
  }, [])

  const closeDropdown = useCallback((restoreFocus = false) => {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
    if (restoreFocus) {
      requestAnimationFrame(() => {
        triggerBtnRef.current?.focus()
      })
    }
  }, [])

  const openDropdown = useCallback(() => {
    if (disabled) return
    computePosition()
    setOpen(true)
    const selectedIdx = value
      ? selectableOptions.findIndex((item) => item.value === value)
      : -1
    setActiveIndex(selectedIdx)
  }, [computePosition, disabled, selectableOptions, value])

  useLayoutEffect(() => {
    if (!open) return
    computePosition()
    const focusTimer = requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(focusTimer)
  }, [open, computePosition])

  useEffect(() => {
    if (!open) return

    const handleScroll = (scrollEvent: Event) => {
      if (
        popoverRef.current &&
        scrollEvent.target instanceof Node &&
        popoverRef.current.contains(scrollEvent.target)
      ) {
        return
      }
      computePosition()
    }

    const handleResize = () => {
      computePosition()
    }

    const handlePointerDown = (pointerEvent: MouseEvent) => {
      const targetNode = pointerEvent.target as Node | null
      if (!targetNode) return
      if (rootRef.current?.contains(targetNode)) return
      if (popoverRef.current?.contains(targetNode)) return
      closeDropdown(false)
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open, computePosition, closeDropdown])

  useEffect(() => {
    const maxIdx = filteredOptions.length - 1
    setActiveIndex((prevIdx) => (prevIdx > maxIdx ? maxIdx : prevIdx))
  }, [filteredOptions.length])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    const itemEl = document.getElementById(`${listboxId}-opt-${activeIndex}`)
    itemEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, listboxId])

  const selectItem = (optionItem: SearchableSelectOption) => {
    onChange(optionItem.value, optionItem)
    closeDropdown(true)
  }

  const handleClear = (clickEvent: React.MouseEvent) => {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()
    if (disabled) return
    onChange('', undefined)
    setQuery('')
  }

  const handleTriggerKeyDown = (keyEvent: React.KeyboardEvent) => {
    if (disabled) return
    if (
      keyEvent.key === 'ArrowDown' ||
      keyEvent.key === 'Enter' ||
      keyEvent.key === ' '
    ) {
      keyEvent.preventDefault()
      if (!open) {
        openDropdown()
      }
    } else if (keyEvent.key === 'Escape' && open) {
      keyEvent.preventDefault()
      keyEvent.stopPropagation()
      closeDropdown(true)
    }
  }

  const handleSearchKeyDown = (keyEvent: React.KeyboardEvent) => {
    const maxIdx = filteredOptions.length - 1
    if (keyEvent.key === 'ArrowDown') {
      keyEvent.preventDefault()
      setActiveIndex((prevIdx) => Math.min(prevIdx + 1, maxIdx))
    } else if (keyEvent.key === 'ArrowUp') {
      keyEvent.preventDefault()
      setActiveIndex((prevIdx) => Math.max(prevIdx - 1, 0))
    } else if (keyEvent.key === 'Enter') {
      keyEvent.preventDefault()
      keyEvent.stopPropagation()
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        selectItem(filteredOptions[activeIndex])
      } else if (filteredOptions.length === 1) {
        selectItem(filteredOptions[0])
      }
    } else if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault()
      keyEvent.stopPropagation()
      closeDropdown(true)
    } else if (keyEvent.key === 'Tab') {
      closeDropdown(false)
    }
  }

  const renderGroupedRows = () => {
    const elements: React.ReactNode[] = []
    let lastGroup: string | undefined
    let initialized = false

    filteredOptions.forEach((optionItem, optionIndex) => {
      if (!initialized || optionItem.group !== lastGroup) {
        lastGroup = optionItem.group
        initialized = true
        if (optionItem.group) {
          elements.push(
            <GroupHeader key={`grp-${optionItem.group}-${optionIndex}`}>
              {optionItem.group}
            </GroupHeader>,
          )
        }
      }

      const isSelected = optionItem.value === value
      const isHighlighted = optionIndex === activeIndex

      elements.push(
        <OptionItem
          key={optionItem.value}
          id={`${listboxId}-opt-${optionIndex}`}
          type="button"
          role="option"
          aria-selected={isSelected}
          $active={isHighlighted}
          $selected={isSelected}
          onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
          onMouseEnter={() => setActiveIndex(optionIndex)}
          onClick={() => selectItem(optionItem)}
        >
          <OptionMain>
            <OptionTopRow>
              {optionItem.icon ? (
                <OptionIconWrap>{optionItem.icon}</OptionIconWrap>
              ) : null}
              <OptionLabelText $selected={isSelected}>
                {optionItem.label}
              </OptionLabelText>
              {optionItem.meta ? (
                <OptionMetaBadge>{optionItem.meta}</OptionMetaBadge>
              ) : null}
            </OptionTopRow>
            {optionItem.description ? (
              <OptionDesc>{optionItem.description}</OptionDesc>
            ) : null}
          </OptionMain>
          {isSelected ? (
            <CheckMark aria-hidden="true">
              <FiCheck size={15} />
            </CheckMark>
          ) : null}
        </OptionItem>,
      )
    })

    return elements
  }

  const listMaxHeight = position ? Math.max(110, position.maxHeight - 54) : 260

  return (
    <RootWrap ref={rootRef} $maxWidth={maxWidth}>
      <TriggerShell $open={open} $disabled={disabled} $size={size}>
        <TriggerMainButton
          ref={triggerBtnRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label={ariaLabel ?? placeholder}
          onClick={() => {
            if (open) {
              closeDropdown(false)
            } else {
              openDropdown()
            }
          }}
          onKeyDown={handleTriggerKeyDown}
          $hasValue={Boolean(selectedOption)}
          $size={size}
        >
          <TriggerContent>
            {selectedOption?.icon ? (
              <OptionIconWrap>{selectedOption.icon}</OptionIconWrap>
            ) : null}
            <TriggerLabel $hasValue={Boolean(selectedOption)}>
              {selectedOption ? selectedOption.label : placeholder}
            </TriggerLabel>
            {selectedOption?.meta ? (
              <OptionMetaBadge>{selectedOption.meta}</OptionMetaBadge>
            ) : null}
          </TriggerContent>
        </TriggerMainButton>

        <TriggerTrailing>
          {clearable && selectedOption && !disabled ? (
            <ClearButton
              type="button"
              aria-label="선택 해제"
              title="선택 해제"
              onClick={handleClear}
            >
              <FiX size={14} />
            </ClearButton>
          ) : null}
          <ChevronIndicator
            $open={open}
            aria-hidden="true"
            onClick={() => {
              if (disabled) return
              if (open) {
                closeDropdown(false)
              } else {
                openDropdown()
              }
            }}
          >
            <FiChevronDown size={16} />
          </ChevronIndicator>
        </TriggerTrailing>
      </TriggerShell>

      {open &&
        position &&
        typeof document !== 'undefined' &&
        createPortal(
          <PopoverSurface
            ref={popoverRef}
            style={{
              top: position.top !== undefined ? `${position.top}px` : undefined,
              bottom:
                position.bottom !== undefined
                  ? `${position.bottom}px`
                  : undefined,
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxHeight: `${position.maxHeight}px`,
            }}
          >
            <SearchHeader>
              <SearchIconWrap aria-hidden="true">
                <FiSearch size={14} />
              </SearchIconWrap>
              <SearchField
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  activeIndex >= 0 && activeIndex < filteredOptions.length
                    ? `${listboxId}-opt-${activeIndex}`
                    : undefined
                }
                placeholder={searchPlaceholder}
                value={query}
                onChange={(changeEvent) => {
                  setQuery(changeEvent.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleSearchKeyDown}
              />
              {query ? (
                <QueryClearBtn
                  type="button"
                  aria-label="검색어 지우기"
                  onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                  onClick={() => {
                    setQuery('')
                    setActiveIndex(-1)
                    searchInputRef.current?.focus()
                  }}
                >
                  <FiX size={13} />
                </QueryClearBtn>
              ) : (
                <CountHint>{filteredOptions.length}개</CountHint>
              )}
            </SearchHeader>

            <OptionsViewport
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel ?? placeholder}
              style={{ maxHeight: `${listMaxHeight}px` }}
            >
              {selectableOptions.length === 0 ? (
                <EmptyNotice>{emptyMessage}</EmptyNotice>
              ) : filteredOptions.length === 0 ? (
                <EmptyNotice>{noMatchMessage}</EmptyNotice>
              ) : (
                renderGroupedRows()
              )}
            </OptionsViewport>
          </PopoverSurface>,
          document.body,
        )}
    </RootWrap>
  )
}

const RootWrap = styled.div<{ $maxWidth?: string | number }>`
  position: relative;
  width: 100%;
  max-width: ${({ $maxWidth }) =>
    typeof $maxWidth === 'number'
      ? `${$maxWidth}px`
      : ($maxWidth ?? 'none')};
`

const TriggerShell = styled.div<{
  $open: boolean
  $disabled: boolean
  $size: 'sm' | 'md'
}>`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: ${({ $size }) => ($size === 'sm' ? '34px' : '38px')};
  border-radius: 8px;
  border: 1px solid
    ${({ $open, theme }) =>
      $open ? '#2563eb' : theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1a1a1a' : '#ffffff'};
  box-shadow: ${({ $open }) =>
    $open ? '0 0 0 3px rgba(37, 99, 235, 0.14)' : 'none'};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: ${({ $open, $disabled, theme }) =>
      $disabled
        ? theme.mode === 'dark'
          ? '#2a2a2a'
          : '#e2e8f0'
        : $open
          ? '#2563eb'
          : theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.22)'
            : '#cbd5e1'};
  }
`

const TriggerMainButton = styled.button<{
  $hasValue: boolean
  $size: 'sm' | 'md'
}>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  text-align: left;
  padding: ${({ $size }) => ($size === 'sm' ? '5px 8px 5px 10px' : '7px 6px 7px 12px')};
  font-family: inherit;
  font-size: ${({ $size }) => ($size === 'sm' ? '12.5px' : '13.5px')};
  background: transparent;
  border: none;
  outline: none;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
`

const TriggerContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  width: 100%;
`

const TriggerLabel = styled.span<{ $hasValue: boolean }>`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: ${({ $hasValue }) => ($hasValue ? 600 : 400)};
`

const TriggerTrailing = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-right: 8px;
  flex-shrink: 0;
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    background 0.14s ease,
    color 0.14s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ChevronIndicator = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  transition: transform 0.16s ease;
`

const PopoverSurface = styled.div`
  position: fixed;
  z-index: ${POPOVER_Z_INDEX};
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1b1d24' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 18px 42px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.04)'
      : '0 16px 38px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.06)'};
  overflow: hidden;
`

const SearchHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  flex-shrink: 0;
`

const SearchIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const SearchField = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};

  &&,
  &&:focus {
    border: none;
    box-shadow: none;
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const QueryClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
  }
`

const CountHint = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const OptionsViewport = styled.div`
  overflow-y: auto;
  padding: 5px;
  ${scrollbarMixin}
`

const GroupHeader = styled.div`
  padding: 7px 10px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  user-select: none;

  &:not(:first-child) {
    margin-top: 4px;
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
    padding-top: 8px;
  }
`

const OptionItem = styled.button<{ $active: boolean; $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  background: ${({ $active, $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.22)'
        : 'rgba(37, 99, 235, 0.09)'
      : $active
        ? theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : '#f1f5f9'
        : 'transparent'};
  color: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : '#1d4ed8'
      : theme.colors.text.primary};
  transition: background 0.1s ease;
`

const OptionMain = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const OptionTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const OptionIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 13px;
`

const OptionLabelText = styled.span<{ $selected: boolean }>`
  font-size: 13.5px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const OptionMetaBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#cbd5e1' : '#475569'};
  flex-shrink: 0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const OptionDesc = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CheckMark = styled.span`
  display: inline-flex;
  align-items: center;
  color: #2563eb;
  flex-shrink: 0;
`

const EmptyNotice = styled.div`
  padding: 22px 14px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
