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
import React, { useRef } from 'react'

import styled from 'styled-components'

import {
  segmentGroupMixin,
  segmentItemMixin,
} from '../person-register-modal/_form-primitives'
import { KitChipGroup, KitChoiceChip } from '../register-form-kit/register-form-kit'

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
  /** 오류 메시지 요소 id(radiogroup에 aria-describedby로 연결) */
  ariaDescribedBy?: string
  /**
   * 'chips' — 사건 등록 폼 카테고리 칩과 같은 **떨어진 알약**(등록 폼용, register-form-kit).
   * 'segments'(기본) — 테 하나 안에 이어 붙은 세그먼트. 기존 호출부 무변경.
   */
  appearance?: 'segments' | 'chips'
}

const Wrap = styled.div<{ $error?: boolean }>`
  ${({ theme, $error }) => segmentGroupMixin(theme, $error)}
  flex-wrap: wrap;
`

const Btn = styled.button<{ $active?: boolean }>`
  ${({ theme, $active }) => segmentItemMixin(theme, $active)}
`

export function SegmentControl<V extends string = string>({
  value,
  onChange,
  options,
  error,
  ariaLabel,
  ariaDescribedBy,
  appearance = 'segments',
}: SegmentControlProps<V>) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

  // roving tabindex — 선택 항목(없으면 첫 활성 항목)만 탭 스톱으로 두어 그룹을 단일 탭 정지로.
  const selectedIndex = options.findIndex((option) => option.value === value)
  const firstEnabledIndex = options.findIndex((option) => !option.disabled)
  const tabStopIndex = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex

  const selectAt = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    buttonsRef.current[index]?.focus()
  }

  // 화살표 이동은 비활성 옵션을 건너뛰고 순환(라디오그룹 표준: 포커스=선택).
  const move = (direction: 1 | -1, from: number) => {
    const count = options.length
    if (count === 0) return
    let next = from
    for (let step = 0; step < count; step += 1) {
      next = (next + direction + count) % count
      if (!options[next].disabled) {
        selectAt(next)
        return
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const base = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex
    if (base < 0) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      move(1, base)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1, base)
    } else if (event.key === 'Home') {
      event.preventDefault()
      selectAt(firstEnabledIndex)
    } else if (event.key === 'End') {
      event.preventDefault()
      for (let index = options.length - 1; index >= 0; index -= 1) {
        if (!options[index].disabled) {
          selectAt(index)
          break
        }
      }
    }
  }

  if (appearance === 'chips') {
    return (
      <KitChipGroup
        role="radiogroup"
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        aria-describedby={ariaDescribedBy}
        onKeyDown={handleKeyDown}
      >
        {options.map((opt, index) => (
          <KitChoiceChip
            key={opt.value}
            ref={(el) => {
              buttonsRef.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            tabIndex={index === tabStopIndex ? 0 : -1}
            $selected={value === opt.value}
            disabled={opt.disabled}
            $error={error}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </KitChoiceChip>
        ))}
      </KitChipGroup>
    )
  }

  return (
    <Wrap
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={error || undefined}
      aria-describedby={ariaDescribedBy}
      onKeyDown={handleKeyDown}
      $error={error}
    >
      {options.map((opt, index) => (
        <Btn
          key={opt.value}
          ref={(el) => {
            buttonsRef.current[index] = el
          }}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          tabIndex={index === tabStopIndex ? 0 : -1}
          $active={value === opt.value}
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Btn>
      ))}
    </Wrap>
  )
}
