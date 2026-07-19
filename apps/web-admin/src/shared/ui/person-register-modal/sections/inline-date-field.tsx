/**
 * 인라인 날짜 입력 — 출생일/사망일을 모달 대신 폼 안에서 직접 타이핑.
 * AD/BC 토글(canon segmentToggleMixin) + 연/월/일 숫자 입력 + 달력 보조 버튼(정밀 선택은 DatePickerModal).
 * BC 처리: 문자열 era/year/month/day를 그대로 보관(네이티브 Date 파싱 안 함).
 * 미상/생존 중 등 비활성 상태는 disabled로 안내 박스만 표시.
 */
import React from 'react'

import { FiCalendar } from 'react-icons/fi'
import styled from 'styled-components'

import type { Era } from '@/shared/api/persons'

import { FONT, RADIUS, segmentToggleMixin } from '../_form-primitives'

interface InlineDateFieldProps {
  era: Era
  year: string
  month: string
  day: string
  onEra: (era: Era) => void
  onYear: (value: string) => void
  onMonth: (value: string) => void
  onDay: (value: string) => void
  /** 달력 보조 — DatePickerModal 열기 */
  onOpenPicker: () => void
  /** 미상/생존 중 등 입력 비활성 */
  disabled?: boolean
  disabledLabel?: string
  error?: boolean
  /** 오류 메시지 연결(role=alert 요소 id) — 역전 검증 등 외부 오류를 연도 입력에 연결 */
  ariaDescribedBy?: string
  ariaLabel: string
}

const digits = (value: string, max: number) =>
  value.replace(/[^0-9]/g, '').slice(0, max)

export function InlineDateField({
  era,
  year,
  month,
  day,
  onEra,
  onYear,
  onMonth,
  onDay,
  onOpenPicker,
  disabled,
  disabledLabel,
  error,
  ariaDescribedBy,
  ariaLabel,
}: InlineDateFieldProps) {
  if (disabled) {
    return <DisabledBox aria-label={ariaLabel}>{disabledLabel}</DisabledBox>
  }
  return (
    <Wrap role="group" aria-label={ariaLabel}>
      <EraToggle>
        <EraBtn type="button" $active={era === 'AD'} onClick={() => onEra('AD')}>
          AD
        </EraBtn>
        <EraBtn type="button" $active={era === 'BC'} onClick={() => onEra('BC')}>
          BC
        </EraBtn>
      </EraToggle>
      <Fields>
        <DateInput
          $w={54}
          inputMode="numeric"
          placeholder="년"
          aria-label="연도"
          aria-invalid={error || undefined}
          aria-describedby={ariaDescribedBy}
          value={year}
          onChange={(event) => onYear(digits(event.target.value, 4))}
        />
        <Sep>.</Sep>
        <DateInput
          $w={38}
          inputMode="numeric"
          placeholder="월"
          aria-label="월"
          value={month}
          onChange={(event) => onMonth(digits(event.target.value, 2))}
        />
        <Sep>.</Sep>
        <DateInput
          $w={38}
          inputMode="numeric"
          placeholder="일"
          aria-label="일"
          value={day}
          onChange={(event) => onDay(digits(event.target.value, 2))}
        />
        <PickerBtn
          type="button"
          onClick={onOpenPicker}
          aria-label="달력으로 선택"
          title="달력으로 선택"
        >
          <FiCalendar size={15} />
        </PickerBtn>
      </Fields>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const EraToggle = styled.div`
  display: inline-flex;
  gap: 4px;
`

const EraBtn = styled.button<{ $active?: boolean }>`
  ${({ theme, $active }) => segmentToggleMixin(theme, $active)}
  padding: 4px 10px;
`

const Fields = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const DateInput = styled.input<{ $w: number; $error?: boolean }>`
  width: ${({ $w }) => $w}px;
  padding: 7px 6px;
  text-align: center;
  font-size: ${FONT.body};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.default};
  border-radius: ${RADIUS.control};
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  }
  /* iOS 줌 방지 */
  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const Sep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${FONT.meta};
`

const PickerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: 2px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  }
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const DisabledBox = styled.div`
  display: flex;
  align-items: center;
  padding: 9px 12px;
  font-size: ${FONT.body};
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
`
