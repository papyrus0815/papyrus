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

import { segmentToggleMixin } from '../person-register-modal/_form-primitives'

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
  ${({ theme, $active, $error }) => segmentToggleMixin(theme, $active, $error)}
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
