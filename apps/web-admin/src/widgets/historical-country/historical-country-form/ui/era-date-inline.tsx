/**
 * 시작·종료 시점 인라인 입력 — BC/AD segmented + Y/M/D number inputs.
 *
 * EraDateModal을 대체. 모달 안의 모달을 없애고 폼 본문에서 바로 입력.
 */
import React from 'react'

import styled from 'styled-components'

import { FormInput } from '@/shared/ui/form-input/form-input'

interface EraDateInlineProps {
  era: 'BC' | 'AD' | undefined
  year: number | undefined
  month: number | undefined
  day: number | undefined
  onChange: (next: {
    era: 'BC' | 'AD' | undefined
    year: number | undefined
    month: number | undefined
    day: number | undefined
  }) => void
  /** 입력 필드 id prefix (year/month/day 각각 -y/-m/-d 붙음) */
  idPrefix?: string
}

const Wrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const Segmented = styled.div`
  display: inline-flex;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
`

const SegBtn = styled.button<{ $active: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.18)'
        : '#eef2ff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  font-variant-numeric: tabular-nums;

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.18)'
          : '#eef2ff'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : '#f8fafc'};
  }

  & + & {
    border-left: 1px solid ${({ theme }) => theme.colors.border.default};
  }
`

const NumberInput = styled(FormInput)`
  text-align: center;
  font-variant-numeric: tabular-nums;
  padding: 8px 10px;
`

const Suffix = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: -4px;
`

export function EraDateInline({
  era,
  year,
  month,
  day,
  onChange,
  idPrefix = 'era-date',
}: EraDateInlineProps) {
  const update = (
    patch: Partial<{
      era: 'BC' | 'AD' | undefined
      year: number | undefined
      month: number | undefined
      day: number | undefined
    }>,
  ) => {
    onChange({ era, year, month, day, ...patch })
  }

  const parseInt = (v: string): number | undefined => {
    if (v === '') return undefined
    const n = Number(v.replace(/[^\d]/g, ''))
    return isNaN(n) ? undefined : n
  }

  return (
    <Wrap>
      <Segmented role="group" aria-label="기원 선택">
        <SegBtn
          type="button"
          $active={era === 'BC'}
          onClick={() => update({ era: era === 'BC' ? undefined : 'BC' })}
          aria-pressed={era === 'BC'}
        >
          BC
        </SegBtn>
        <SegBtn
          type="button"
          $active={era === 'AD'}
          onClick={() => update({ era: era === 'AD' ? undefined : 'AD' })}
          aria-pressed={era === 'AD'}
        >
          AD
        </SegBtn>
      </Segmented>

      <NumberInput
        id={`${idPrefix}-y`}
        type="text"
        inputMode="numeric"
        placeholder="년"
        value={year ?? ''}
        onChange={(e) => update({ year: parseInt(e.target.value) })}
        style={{ width: 80 }}
        aria-label="년"
      />
      <Suffix>년</Suffix>

      <NumberInput
        id={`${idPrefix}-m`}
        type="text"
        inputMode="numeric"
        placeholder="월"
        value={month ?? ''}
        onChange={(e) => {
          const n = parseInt(e.target.value)
          update({ month: n != null && n >= 1 && n <= 12 ? n : n })
        }}
        style={{ width: 56 }}
        aria-label="월 (1-12)"
        maxLength={2}
      />
      <Suffix>월</Suffix>

      <NumberInput
        id={`${idPrefix}-d`}
        type="text"
        inputMode="numeric"
        placeholder="일"
        value={day ?? ''}
        onChange={(e) => {
          const n = parseInt(e.target.value)
          update({ day: n != null && n >= 1 && n <= 31 ? n : n })
        }}
        style={{ width: 56 }}
        aria-label="일 (1-31)"
        maxLength={2}
      />
      <Suffix>일</Suffix>
    </Wrap>
  )
}
