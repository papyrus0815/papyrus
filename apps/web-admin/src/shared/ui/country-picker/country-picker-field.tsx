/**
 * 국가 선택 칸 — 폼 안에서 `<select>` 자리를 대신하는 트리거.
 *
 * 국가 `<select>`는 검색·현대/역사 구분·존속기간 표기가 없어 역사국가 수백 개를 한 줄로
 * 늘어놓았다. 이 칸을 누르면 {@link CountryPicker}가 열린다(피커는 호출부가 렌더).
 * 고른 값이 있으면 이름과 비우기(✕)를 함께 보인다.
 */
import React from 'react'

import { FiChevronDown, FiX } from 'react-icons/fi'
import styled from 'styled-components'

export interface CountryPickerFieldProps {
  /** `<label htmlFor>`와 잇는 id — 트리거 버튼에 붙는다 */
  id?: string
  /** 고른 국가 — 없으면 placeholder */
  value: { name: string; flagEmoji?: string | null; isHistorical?: boolean } | null
  placeholder?: string
  onOpen: () => void
  /** 주어지면 값이 있을 때 비우기(✕) 버튼이 뜬다 */
  onClear?: () => void
  disabled?: boolean
}

export function CountryPickerField({
  id,
  value,
  placeholder = '국가 선택',
  onOpen,
  onClear,
  disabled = false,
}: CountryPickerFieldProps) {
  return (
    <FieldBox $disabled={disabled}>
      <Trigger id={id} type="button" aria-haspopup="dialog" disabled={disabled} onClick={onOpen}>
        <TriggerText $placeholder={!value}>
          {value ? (value.flagEmoji ? `${value.flagEmoji} ${value.name}` : value.name) : placeholder}
        </TriggerText>
        {value?.isHistorical && <KindTag>역사</KindTag>}
        <FiChevronDown aria-hidden="true" size={16} />
      </Trigger>
      {value && onClear && !disabled && (
        <ClearButton type="button" aria-label={`${value.name} 비우기`} onClick={onClear}>
          <FiX size={14} />
        </ClearButton>
      )}
    </FieldBox>
  )
}

const FieldBox = styled.div<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.primary};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition:
    border-color 0.18s,
    box-shadow 0.18s;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px
      ${({ theme }) => (theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)')};
  }
`

const Trigger = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.6rem 0.75rem;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.9375rem;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
  /* 포커스 링은 칸(FieldBox:focus-within)이 그린다 */
  &:focus,
  &:focus-visible {
    outline: none;
  }
`

const TriggerText = styled.span<{ $placeholder: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme, $placeholder }) =>
    $placeholder ? theme.colors.text.tertiary : theme.colors.text.primary};
`

const KindTag = styled.span`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
`

const ClearButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-right: 6px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`
