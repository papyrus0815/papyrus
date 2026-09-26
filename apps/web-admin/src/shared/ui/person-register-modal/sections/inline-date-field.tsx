/**
 * 인라인 날짜 입력 — 출생일/사망일을 모달 대신 폼 안에서 직접 타이핑.
 * AD/BC 토글(canon segmentToggleMixin) + 연/월/일 숫자 입력 + 달력 보조 버튼(정밀 선택은 DatePickerModal).
 * BC 처리: 문자열 era/year/month/day를 그대로 보관(네이티브 Date 파싱 안 함).
 * 미상/생존 중 등 비활성 상태는 disabled로 안내 박스만 표시.
 */
import React, { useRef } from 'react'

import { FiCalendar } from 'react-icons/fi'
import styled from 'styled-components'

import type { Era } from '@/shared/api/persons'

import {
  FONT,
  RADIUS,
  segmentGroupMixin,
  segmentItemMixin,
} from '../_form-primitives'

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
  /**
   * 'field' — 사건 등록 폼의 날짜 칸과 같은 **한 칸**(달력 아이콘 · 연.월.일 · 서기/기원전).
   * 칸을 누르면 연도로, 아이콘을 누르면 칸 아래 드롭다운 달력(호출부가 anchorId로 붙인다).
   * 칸 안에서 직접 치는 입력은 그대로라 '연도만'·기원전 저장이 달력 없이도 된다.
   * 'segments'(기본) — 예전 모양(AD|BC 토글 + 테 두른 연·월·일 + 달력 버튼). 다른 호출부 무변경.
   */
  appearance?: 'segments' | 'field'
  /** 'field'일 때 칸(드롭다운 기준 요소)의 id */
  anchorId?: string
  /** 'field'일 때 드롭다운이 이 칸에서 열려 있는지 — 칸에 포커스 링을 유지 */
  pickerOpen?: boolean
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
  appearance = 'segments',
  anchorId,
  pickerOpen,
}: InlineDateFieldProps) {
  const yearRef = useRef<HTMLInputElement>(null)
  if (disabled) {
    return appearance === 'field' ? (
      <FieldBox id={anchorId} $disabled aria-label={ariaLabel}>
        <FiCalendar size={14} aria-hidden="true" />
        <FieldDisabledText>{disabledLabel}</FieldDisabledText>
      </FieldBox>
    ) : (
      <DisabledBox aria-label={ariaLabel}>{disabledLabel}</DisabledBox>
    )
  }
  if (appearance === 'field') {
    return (
      <FieldBox
        id={anchorId}
        role="group"
        aria-label={ariaLabel}
        $error={error}
        data-open={pickerOpen || undefined}
        // 칸의 빈 곳(입력칸 사이·오른쪽 여백)을 눌러도 입력이 시작되게 — 사건 날짜 칸처럼 칸 전체가 표적
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            yearRef.current?.focus()
          }
        }}
      >
        <FieldIconBtn
          type="button"
          onClick={onOpenPicker}
          aria-label="달력으로 선택"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen ?? false}
          title="달력으로 선택"
        >
          <FiCalendar size={14} />
        </FieldIconBtn>
        <BareInput
          ref={yearRef}
          $w={40}
          inputMode="numeric"
          placeholder="연도"
          aria-label="연도"
          aria-invalid={error || undefined}
          aria-describedby={ariaDescribedBy}
          value={year}
          onChange={(event) => onYear(digits(event.target.value, 4))}
        />
        <FieldSep>.</FieldSep>
        <BareInput
          $w={22}
          inputMode="numeric"
          placeholder="월"
          aria-label="월"
          aria-invalid={error || undefined}
          value={month}
          onChange={(event) => onMonth(digits(event.target.value, 2))}
        />
        <FieldSep>.</FieldSep>
        <BareInput
          $w={22}
          inputMode="numeric"
          placeholder="일"
          aria-label="일"
          aria-invalid={error || undefined}
          value={day}
          onChange={(event) => onDay(digits(event.target.value, 2))}
        />
        <EraSwitch
          type="button"
          $bc={era === 'BC'}
          onClick={() => onEra(era === 'BC' ? 'AD' : 'BC')}
          aria-label={`기원 ${era === 'BC' ? '기원전' : '서기'} — 눌러서 바꾸기`}
          title="서기 ↔ 기원전"
        >
          {era === 'BC' ? '기원전' : '서기'}
        </EraSwitch>
      </FieldBox>
    )
  }
  return (
    <Wrap role="group" aria-label={ariaLabel}>
      <EraToggle>
        <EraBtn
          type="button"
          $active={era === 'AD'}
          aria-pressed={era === 'AD'}
          onClick={() => onEra('AD')}
        >
          AD
        </EraBtn>
        <EraBtn
          type="button"
          $active={era === 'BC'}
          aria-pressed={era === 'BC'}
          onClick={() => onEra('BC')}
        >
          BC
        </EraBtn>
      </EraToggle>
      <Fields>
        <DateInput
          $w={60}
          $error={error}
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
          $w={44}
          $error={error}
          inputMode="numeric"
          placeholder="월"
          aria-label="월"
          aria-invalid={error || undefined}
          value={month}
          onChange={(event) => onMonth(digits(event.target.value, 2))}
        />
        <Sep>.</Sep>
        <DateInput
          $w={44}
          $error={error}
          inputMode="numeric"
          placeholder="일"
          aria-label="일"
          aria-invalid={error || undefined}
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

/*
 * 기원 토글과 연·월·일을 **한 줄**에 둔다 — 토글이 제 줄을 따로 차지해 날짜 하나가 두 줄
 * (AD|BC / 년.월.일)로 보였다. 좁은 칸에선 줄바꿈해 예전 모양으로 돌아간다.
 * 모든 컨트롤 높이는 CONTROL_H 하나(토글·입력·달력 버튼 윗선이 어긋나지 않게).
 */
const CONTROL_H = '34px'

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
`

const EraToggle = styled.div`
  ${({ theme }) => segmentGroupMixin(theme)}
  box-sizing: border-box;
  height: ${CONTROL_H};
`

const EraBtn = styled.button<{ $active?: boolean }>`
  ${({ theme, $active }) => segmentItemMixin(theme, $active)}
  padding: 0 9px;
`

const Fields = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const DateInput = styled.input<{ $w: number; $error?: boolean }>`
  box-sizing: border-box;
  width: ${({ $w }) => $w}px;
  height: ${CONTROL_H};
  padding: 0 6px;
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
  width: ${CONTROL_H};
  height: ${CONTROL_H};
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
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: ${CONTROL_H};
  padding: 0 12px;
  font-size: ${FONT.body};
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
`

// ─── appearance='field' — 사건 등록 폼 날짜 칸(DateInputWrapper)과 같은 한 칸 ────────

const FieldBox = styled.div<{ $error?: boolean; $disabled?: boolean }>`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 2px;
  width: 100%;
  height: 40px;
  padding: 0 8px 0 4px;
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.default};
  border-radius: ${RADIUS.control};
  background: ${({ theme, $disabled }) =>
    $disabled
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.02)'
        : '#f8fafc'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#fff'};
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'text')};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  > svg {
    margin: 0 6px 0 8px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }

  &:hover {
    border-color: ${({ $error, $disabled, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : $disabled
          ? theme.colors.border.default
          : theme.colors.border.medium};
  }

  /* 칸 안 어느 입력에 있든, 또는 이 칸의 달력이 열려 있는 동안 — 칸 전체가 포커스 링 */
  &:focus-within,
  &[data-open] {
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const FieldIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-right: 4px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
  &:focus-visible {
    outline: none;
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

/** 테 없는 숫자 칸 — 칸(FieldBox) 하나가 테를 가진다 */
const BareInput = styled.input<{ $w: number }>`
  width: ${({ $w }) => $w}px;
  padding: 4px 0;
  text-align: center;
  font-size: ${FONT.body};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: none;
  border-radius: 4px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    background: ${({ theme }) => theme.colors.activeLight};
  }
  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const FieldSep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${FONT.body};
`

/** 서기/기원전 — 칸 오른쪽 끝의 작은 글 스위치(기원전일 때만 강조) */
const EraSwitch = styled.button<{ $bc: boolean }>`
  margin-left: auto;
  padding: 3px 8px;
  flex-shrink: 0;
  font-size: ${FONT.meta};
  font-weight: ${({ $bc }) => ($bc ? 600 : 500)};
  color: ${({ $bc, theme }) =>
    $bc ? theme.colors.active : theme.colors.text.tertiary};
  background: ${({ $bc, theme }) => ($bc ? theme.colors.activeLight : 'transparent')};
  border: none;
  border-radius: ${RADIUS.pill};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.active};
    background: ${({ theme }) => theme.colors.activeLight};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const FieldDisabledText = styled.span`
  font-size: ${FONT.body};
  color: ${({ theme }) => theme.colors.text.tertiary};
`
