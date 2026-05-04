/**
 * 미니멀 segmented control — 라디오/필터/3-way 선택 등 공용.
 *
 * 디자인:
 * - 6px radius, subtle gray bg
 * - 활성: 인디고 보더 + primary text
 * - 그라데이션·box-shadow·pill 모양 사용 X
 *
 * 사용:
 * ```tsx
 * <SegmentControl
 *   value={gender}
 *   onChange={setGender}
 *   options={[
 *     { value: 'M', label: '남성' },
 *     { value: 'F', label: '여성' },
 *   ]}
 * />
 * ```
 */
import React from 'react'

import styled from 'styled-components'

export interface SegmentOption<V extends string = string> {
  value: V
  label: React.ReactNode
  disabled?: boolean
}

interface SegmentControlProps<V extends string = string> {
  value: V | undefined
  onChange: (value: V) => void
  options: SegmentOption<V>[]
  /** 에러 상태 (검증 실패) */
  error?: boolean
  /** ARIA 라벨 */
  ariaLabel?: string
}

const Wrap = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Btn = styled.button<{ $active?: boolean; $error?: boolean }>`
  padding: 6px 12px;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 500 : 400)};
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ $active, $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : $active
          ? theme.colors.primary
          : theme.colors.border.default};

  &:hover:not(:disabled) {
    border-color: ${({ $active, $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : $active
          ? theme.colors.primary
          : theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export function SegmentControl<V extends string = string>({
  value,
  onChange,
  options,
  error,
  ariaLabel,
}: SegmentControlProps<V>) {
  return (
    <Wrap role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <Btn
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          $active={value === opt.value}
          $error={error}
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Btn>
      ))}
    </Wrap>
  )
}
