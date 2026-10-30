/**
 * 상단 툴바 필터 드롭다운 — 시대·지역·분야 scope를 체크리스트로 토글.
 *
 * 사건 목록의 [카테고리|대륙|국가] 필터 그룹과 같은 자리·같은 모양.
 * 상태는 filter.store의 scopes를 직접 읽고 써서 좌측 필터 레일·URL과 양방향 일치한다.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'

import { FiCheck, FiChevronDown, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  usePersonInfographicFilterStore,
  type ScopeKind,
} from '../../model/filter.store'

import { BRAND, hairline, metaText, MOTION_FAST } from './catalog.styles'

export interface ScopeOption {
  value: string
  label: string
  color?: string
  count: number
}

interface ScopeDropdownProps {
  kind: ScopeKind
  label: string
  icon: ReactNode
  options: ScopeOption[]
  searchable?: boolean
}

export function ScopeDropdown({
  kind,
  label,
  icon,
  options,
  searchable = false,
}: ScopeDropdownProps) {
  const selected = usePersonInfographicFilterStore((state) => state.scopes[kind])
  const toggleScope = usePersonInfographicFilterStore((state) => state.toggleScope)
  const clearScopeKind = usePersonInfographicFilterStore(
    (state) => state.clearScopeKind,
  )
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) {
      setKeyword('')
      return
    }
    if (searchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, searchable])

  const filteredOptions = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [options, keyword])

  const activeCount = selected.length
  const triggerText =
    activeCount === 0
      ? label
      : activeCount === 1
        ? options.find((option) => option.value === selected[0])?.label ?? selected[0]
        : `${label} ${activeCount}`

  return (
    <Root ref={rootRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        $active={activeCount > 0}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={
          activeCount > 0 ? `${label} 필터, ${activeCount}개 선택됨` : `${label} 필터`
        }
        onClick={() => setOpen((prev) => !prev)}
      >
        {icon}
        <span>{triggerText}</span>
        <FiChevronDown size={12} aria-hidden />
      </Trigger>
      {open && (
        <Menu id={menuId} role="group" aria-label={`${label} 선택`} $wide={searchable}>
          <MenuHead>
            <span>
              {label}
              {options.length > 0 && ` (${options.length})`}
            </span>
            {activeCount > 0 && (
              <MenuClear type="button" onClick={() => clearScopeKind(kind)}>
                선택 해제
              </MenuClear>
            )}
          </MenuHead>
          {searchable && (
            <MenuSearchWrap>
              <FiSearch size={12} aria-hidden />
              <MenuSearchInput
                ref={searchInputRef}
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={`${label} 검색…`}
                aria-label={`${label} 옵션 검색`}
              />
              {keyword && (
                <MenuSearchClear
                  type="button"
                  onClick={() => {
                    setKeyword('')
                    searchInputRef.current?.focus()
                  }}
                  aria-label="검색어 지우기"
                >
                  <FiX size={11} />
                </MenuSearchClear>
              )}
            </MenuSearchWrap>
          )}
          <MenuList>
            {filteredOptions.length === 0 ? (
              <EmptyHint>일치하는 항목이 없습니다</EmptyHint>
            ) : (
              filteredOptions.map((option) => {
                const checked = selected.includes(option.value)
                return (
                  <Option
                    key={option.value}
                    type="button"
                    aria-pressed={checked}
                    $checked={checked}
                    disabled={option.count === 0 && !checked}
                    onClick={() => toggleScope(kind, option.value)}
                  >
                    <Check $checked={checked} aria-hidden>
                      {checked && <FiCheck size={11} strokeWidth={3} />}
                    </Check>
                    {option.color && <Swatch style={{ background: option.color }} />}
                    <OptionLabel>{option.label}</OptionLabel>
                    <OptionCount>{option.count.toLocaleString()}</OptionCount>
                  </Option>
                )
              })
            )}
          </MenuList>
        </Menu>
      )}
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  display: inline-flex;
`

const Trigger = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primarySoftDark
        : BRAND.primarySoft
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primaryHover
      : theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  white-space: nowrap;
  cursor: pointer;
  transition: background ${MOTION_FAST}, color ${MOTION_FAST};

  /* 그룹 외곽 radius에 맞춰 양 끝만 둥글게 */
  ${Root}:first-child > & {
    border-radius: 7px 0 0 7px;
  }
  ${Root}:last-child > & {
    border-radius: 0 7px 7px 0;
  }

  & > svg:first-child {
    color: ${({ $active, theme }) =>
      $active ? BRAND.primary : theme.colors.text.tertiary};
    transition: color ${MOTION_FAST};
  }
  & > span {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
    position: relative;
    z-index: 1;
  }
`

const Menu = styled.div<{ $wide?: boolean }>`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: ${({ $wide }) => ($wide ? '228px' : '200px')};
  max-width: 280px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid ${hairline};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1c1f' : '#ffffff')};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0, 0, 0, 0.48)'
      : '0 8px 24px rgba(15, 23, 42, 0.1)'};
`

const MenuList = styled.div`
  max-height: 290px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const MenuSearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px;
  margin: 0 4px 6px;
  border-radius: 6px;
  border: 1px solid ${hairline};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.tertiary};

  &:focus-within {
    border-color: ${BRAND.primaryBorderHover};
    box-shadow: ${BRAND.focusRing};
  }
`

const MenuSearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const MenuSearchClear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const EmptyHint = styled.div`
  padding: 16px 8px;
  text-align: center;
  font-size: 12px;
  color: ${metaText};
`

const MenuHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 6px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MenuClear = styled.button`
  border: none;
  background: none;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${BRAND.primary};
  cursor: pointer;
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const Option = styled.button<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 6px;
  background: ${({ $checked, theme }) =>
    $checked ? (theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft) : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const Check = styled.span<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 1.5px solid
    ${({ $checked, theme }) =>
      $checked ? BRAND.primary : theme.mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.25)'};
  background: ${({ $checked }) => ($checked ? BRAND.primary : 'transparent')};
  color: #ffffff;
`

const Swatch = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`

const OptionLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const OptionCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
