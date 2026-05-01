import { type ReactNode, useState } from 'react'

import { FiChevronDown } from 'react-icons/fi'
import styled from 'styled-components'

import * as I from './inline.styles'

export interface InlineSelectOption {
  value: string
  label: string
}

interface InlineSelectProps {
  value: string
  options: InlineSelectOption[]
  onSave: (next: string) => void
  /** read 모드 라벨 — value에 매칭되는 option.label 우선, 없으면 placeholder. */
  placeholder?: string
  /** read 모드 prefix(카테고리 칩 등). */
  prefix?: ReactNode
  className?: string
}

/**
 * 명시 ▾ 트리거 select 편집.
 *
 * - read 모드 라벨은 클릭해도 아무 일 없음 — 옆 ▾ 버튼만 트리거.
 * - ▾ 클릭 → native select 등장. change 시 즉시 저장. blur/Esc → 취소.
 */
export function InlineSelect({
  value,
  options,
  onSave,
  placeholder = '선택',
  prefix,
  className,
}: InlineSelectProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <I.InlineSelectEl
        autoFocus
        value={value}
        onChange={(e) => {
          const next = e.target.value
          setEditing(false)
          if (next !== value) onSave(next)
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setEditing(false)
          }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </I.InlineSelectEl>
    )
  }

  const current = options.find((opt) => opt.value === value)
  const isEmpty = !current
  return (
    <ReadHost className={className} data-edit-host>
      <ReadValue data-empty={isEmpty || undefined}>
        {prefix}
        {current ? current.label : placeholder}
      </ReadValue>
      <ChevronTrigger
        type="button"
        onClick={() => setEditing(true)}
        aria-label="선택 변경"
      >
        <FiChevronDown />
      </ChevronTrigger>
    </ReadHost>
  )
}

const ReadHost = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

const ReadValue = styled.span`
  ${I.editableTrigger}
`

/**
 * select 트리거는 ✎ 대신 ▾ chevron — 드롭다운 표준 어포던스.
 * 호스트 hover/focus-within 시에만 옅게 노출.
 */
const ChevronTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s;

  [data-edit-host]:hover &,
  [data-edit-host]:focus-within & {
    opacity: 0.6;
  }

  &:hover,
  &:focus-visible {
    opacity: 1 !important;
    outline: none;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`
