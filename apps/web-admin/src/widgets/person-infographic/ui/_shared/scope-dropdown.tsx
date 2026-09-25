/**
 * 상단 툴바 필터 드롭다운 — 시대·지역·분야 scope를 체크리스트로 토글.
 *
 * 사건 목록의 [카테고리|대륙|국가] 필터 그룹과 같은 자리·같은 모양.
 * 상태는 filter.store의 scopes를 직접 읽고 써서 좌측 필터 레일·URL과 양방향 일치한다.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { FiCheck, FiChevronDown } from 'react-icons/fi'
import styled from 'styled-components'

import {
  usePersonInfographicFilterStore,
  type ScopeKind,
} from '../../model/filter.store'

import { BRAND, hairline, MOTION_FAST } from './catalog.styles'

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
}

export function ScopeDropdown({ kind, label, icon, options }: ScopeDropdownProps) {
  const selected = usePersonInfographicFilterStore((state) => state.scopes[kind])
  const toggleScope = usePersonInfographicFilterStore((state) => state.toggleScope)
  const clearScopeKind = usePersonInfographicFilterStore(
    (state) => state.clearScopeKind,
  )
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
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
  }, [open])

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
        <Menu id={menuId} role="group" aria-label={`${label} 선택`}>
          <MenuHead>
            <span>{label}</span>
            {activeCount > 0 && (
              <MenuClear type="button" onClick={() => clearScopeKind(kind)}>
                선택 해제
              </MenuClear>
            )}
          </MenuHead>
          {options.map((option) => {
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
          })}
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
    color: ${BRAND.primary};
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

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 200px;
  max-height: 360px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid ${hairline};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1c1f' : '#ffffff')};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 6px 16px rgba(0, 0, 0, 0.4)'
      : '0 6px 16px rgba(15, 23, 42, 0.08)'};
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
