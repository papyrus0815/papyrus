/**
 * 인라인 검색 셀렉트 — 정적 옵션 목록을 모달 대신 폼 안에서 검색·선택.
 * 가문/종교처럼 "리스트에서 하나 고르기"를 SelectModal 왕복 없이 콤보박스로.
 * value:''(선택 안 함) 옵션은 드롭다운에서 숨기고, 값이 있으면 × 로 해제.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { FiChevronDown, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

import { FONT, RADIUS } from '../_form-primitives'

export interface SearchOption {
  value: string
  label: string
}

interface InlineSearchSelectProps {
  options: SearchOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
}

export function InlineSearchSelect({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: InlineSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const selectedLabel = useMemo(
    // value '' 은 '선택 안 함'이 아니라 미선택 — placeholder가 보이도록 빈 라벨
    () =>
      value ? (options.find((option) => option.value === value)?.label ?? '') : '',
    [options, value],
  )

  const filtered = useMemo(() => {
    const list = options.filter((option) => option.value)
    const text = query.trim().toLowerCase()
    if (!text) return list
    return list.filter((option) => option.label.toLowerCase().includes(text))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const choose = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      if (open && filtered[active]) {
        event.preventDefault()
        choose(filtered[active].value)
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
        setQuery('')
      }
    }
  }

  return (
    <Wrap ref={wrapRef}>
      <InputBox $open={open}>
        <Input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={open ? query : selectedLabel}
          onFocus={() => {
            setOpen(true)
            setActive(0)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
        {value && !open ? (
          <IconBtn
            type="button"
            aria-label="선택 해제"
            onClick={() => choose('')}
          >
            <FiX size={15} />
          </IconBtn>
        ) : (
          <IconChevron $open={open} aria-hidden="true">
            <FiChevronDown size={16} />
          </IconChevron>
        )}
      </InputBox>
      {open && (
        <Dropdown role="listbox" aria-label={ariaLabel}>
          {filtered.length === 0 ? (
            <Empty>검색 결과 없음</Empty>
          ) : (
            filtered.map((option, index) => (
              <Option
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                $active={index === active}
                $selected={option.value === value}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </Option>
            ))
          )}
        </Dropdown>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  position: relative;
  width: 100%;
`

const InputBox = styled.div<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ $open, theme }) =>
      $open ? theme.colors.primary : theme.colors.border.default};
  border-radius: ${RADIUS.control};
  box-shadow: ${({ $open, theme }) =>
    $open ? theme.colors.focusRing.primary : 'none'};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
`

const Input = styled.input`
  flex: 1;
  min-width: 0;
  padding: 9px 4px 9px 12px;
  font-size: ${FONT.body};
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: none;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const IconChevron = styled.span<{ $open?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.15s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  height: 100%;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(28,28,32,0.98)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  box-shadow: 0 8px 24px ${({ theme }) => theme.colors.shadow.md};
  z-index: ${Z_INDEX.DROPDOWN};
`

const Option = styled.button<{ $active?: boolean; $selected?: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  font-size: ${FONT.label};
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  color: ${({ $selected, theme }) =>
    $selected ? theme.colors.active : theme.colors.text.primary};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#f1f5f9'
      : 'transparent'};
  border: none;
  border-radius: 6px;
  cursor: pointer;
`

const Empty = styled.div`
  padding: 10px;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`
