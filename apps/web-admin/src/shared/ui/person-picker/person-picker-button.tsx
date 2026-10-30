/**
 * 인물 한 명을 고르는 버튼 — 누르면 공용 인물 고르기가 열린다. 모달 열림·인물 목록은 스스로 든다.
 * 폼 칸(창립자·대표 등)에 끼워 쓴다. 예전엔 칸마다 저마다의 드롭다운 검색(이름만)을 만들어 썼다.
 */
import { useState } from 'react'

import { FiUser, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { PersonPickerModal } from './person-picker-modal'
import { type PersonPickerContext } from './person-picker.lib'

export function PersonPickerButton({
  value,
  selectedLabel,
  onChange,
  placeholder = '인물 고르기',
  title = '인물 선택',
  label,
  context,
  disabled = false,
}: {
  /** 고른 인물 id — 비었으면 '' 또는 null */
  value: string | null | undefined
  /** 고른 인물 이름(표시용) — 상위가 들고 있다 */
  selectedLabel?: string | null
  /** 고르기·비우기 — 비우면 ('', '') */
  onChange: (personId: string, personName: string) => void
  placeholder?: string
  /** 모달 제목 */
  title?: string
  /** 접근성 이름 — 칸 이름(예: '창립자') */
  label?: string
  context?: PersonPickerContext
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const hasValue = Boolean(value)
  return (
    <>
      <Field>
        <Trigger
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-label={label ? `${label}: ${hasValue ? (selectedLabel ?? '선택됨') : '고르기'}` : undefined}
          $empty={!hasValue}
        >
          <FiUser size={15} aria-hidden />
          <span>{hasValue ? (selectedLabel ?? '선택된 인물') : placeholder}</span>
        </Trigger>
        {hasValue && !disabled && (
          <Clear type="button" onClick={() => onChange('', '')} aria-label={`${label ?? '인물'} 비우기`}>
            <FiX size={14} />
          </Clear>
        )}
      </Field>
      {open && (
        <PersonPickerModal
          title={title}
          selectedPersonId={value ?? ''}
          context={context}
          onSelect={(personId, personName) => onChange(personId, personName)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

const Field = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const Trigger = styled.button<{ $empty: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.primary};
  font: inherit;
  font-size: 14px;
  text-align: left;
  color: ${({ $empty, theme }) => ($empty ? theme.colors.text.tertiary : theme.colors.text.primary)};
  font-weight: ${({ $empty }) => ($empty ? 400 : 600)};
  cursor: pointer;
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const Clear = styled.button`
  display: inline-flex;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
