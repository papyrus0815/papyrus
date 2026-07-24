/**
 * 인라인 검색 셀렉트 — 정적 옵션 목록을 모달 대신 폼 안에서 검색·선택.
 * 가문/종교처럼 "리스트에서 하나 고르기"를 SelectModal 왕복 없이 콤보박스로.
 * value:''(선택 안 함) 옵션은 드롭다운에서 숨기고, 값이 있으면 × 로 해제.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { FiChevronDown, FiPlus, FiX } from 'react-icons/fi'
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
  /** 드롭다운에 보일 최대 결과 수(긴 목록 캡). 미지정 시 전체. */
  limit?: number
  /** 지정 시 드롭다운 하단에 "+ 새로 만들기" 액션 노출 — 목록에 없으면 생성 분기. */
  onCreateNew?: () => void
  createLabel?: string
}

export function InlineSearchSelect({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
  limit,
  onCreateNew,
  createLabel = '새로 만들기',
}: InlineSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // active = 키보드로 하이라이트된 항목 인덱스. -1 = 무선택(포커스 직후 Enter가 첫 항목을
  // 실수로 선택하지 않도록). onCreateNew가 있으면 filtered.length가 '새로 만들기' 행 인덱스.
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selectedLabel = useMemo(
    // value '' 은 '선택 안 함'이 아니라 미선택 — placeholder가 보이도록 빈 라벨
    () =>
      value ? (options.find((option) => option.value === value)?.label ?? '') : '',
    [options, value],
  )

  const filtered = useMemo(() => {
    const list = options.filter((option) => option.value)
    const text = query.trim().toLowerCase()
    const matched = text
      ? list.filter((option) => option.label.toLowerCase().includes(text))
      : list
    return limit ? matched.slice(0, limit) : matched
  }, [options, query, limit])

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

  // '새로 만들기' 행이 있으면 filtered.length가 그 행 인덱스 → 방향키로 도달 가능한 최대 인덱스.
  const hasCreateRow = Boolean(onCreateNew)
  const maxActive = hasCreateRow ? filtered.length : filtered.length - 1

  // 목록이 줄어들면 active가 범위를 벗어나 dangling activedescendant가 남는다 → 클램프.
  useEffect(() => {
    setActive((prev) => (prev > maxActive ? maxActive : prev))
  }, [maxActive])

  // 방향키로 옮긴 활성 항목을 뷰포트로 스크롤(긴 목록에서 하이라이트가 스크롤 밖으로 사라지지 않게).
  useEffect(() => {
    if (!open || active < 0) return
    document
      .getElementById(`${listId}-opt-${active}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active, open, listId])

  const choose = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  const triggerCreate = () => {
    onCreateNew?.()
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, maxActive))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      // 열린 상태의 Enter는 절대 폼으로 새지 않게(조기 제출 차단) — 항상 이 컴포넌트가 소비.
      if (open) {
        event.preventDefault()
        event.stopPropagation()
        if (active >= 0 && active < filtered.length) {
          choose(filtered[active].value)
        } else if (
          hasCreateRow &&
          (active === filtered.length || filtered.length === 0)
        ) {
          // 검색 결과 0건 또는 '새로 만들기' 행에 커서 → 폼 제출 대신 생성 분기.
          triggerCreate()
        }
      }
    } else if (event.key === 'Escape') {
      if (open) {
        // 드롭다운만 닫는다 — stopPropagation으로 셸(window) Esc 리스너의 모달 닫기 가드 차단.
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        setQuery('')
      }
    } else if (event.key === 'Tab') {
      // 포커스 이탈 시 열린 드롭다운을 닫아 고아 목록 잔류 방지(Tab 이동 자체는 막지 않음).
      if (open) {
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
          aria-autocomplete="list"
          aria-controls={open ? listId : undefined}
          aria-activedescendant={
            open && active >= 0 && active < filtered.length
              ? `${listId}-opt-${active}`
              : undefined
          }
          placeholder={placeholder}
          value={open ? query : selectedLabel}
          onFocus={() => {
            setOpen(true)
            // 포커스 직후엔 무선택(-1) — Enter가 첫 항목을 실수로 선택하지 않도록.
            setActive(-1)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            // 타이핑 시엔 top match를 활성화 → Enter로 첫 결과 선택(무매칭이면 생성 분기).
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
        <Dropdown id={listId} role="listbox" aria-label={ariaLabel}>
          {filtered.length === 0 && !onCreateNew && (
            <Empty>검색 결과 없음</Empty>
          )}
          {filtered.map((option, index) => (
            <Option
              key={option.value}
              id={`${listId}-opt-${index}`}
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
          ))}
          {onCreateNew && (
            <CreateRow
              id={`${listId}-opt-${filtered.length}`}
              type="button"
              $active={active === filtered.length}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(filtered.length)}
              onClick={triggerCreate}
            >
              <FiPlus size={14} />
              {createLabel}
            </CreateRow>
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

const CreateRow = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  font-size: ${FONT.label};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.active};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.10)'
        : '#eef2ff'
      : 'transparent'};
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.10)' : '#eef2ff'};
  }
`
