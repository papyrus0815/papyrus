import { type KeyboardEvent, useEffect, useRef, useState } from 'react'

import { FiEdit2 } from 'react-icons/fi'
import styled from 'styled-components'

import { formatDateRange } from '@/pages/events/utils/events.utils'

import * as I from './inline.styles'

export type DatePrecision = 'year' | 'month' | 'day'

export interface DateRangePatch {
  startDate?: string
  startDatePrecision?: DatePrecision
  endDate?: string
  endDatePrecision?: DatePrecision
}

interface InlineDateRangeProps {
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
  onSave: (patch: DateRangePatch) => void
}

/**
 * 명시 ✎ 트리거 날짜 범위.
 *
 * - read 라벨은 클릭해도 아무 일 없음 — 옆 ✎만 진입.
 * - 진입 시 4-필드(시작·정밀도·종료·정밀도) inline swap. 외부 클릭/Enter 저장, Esc 취소.
 */
export function InlineDateRange({
  startDate,
  startDatePrecision,
  endDate,
  endDatePrecision,
  onSave,
}: InlineDateRangeProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<{
    startDate: string
    startPrecision: DatePrecision
    endDate: string
    endPrecision: DatePrecision
  }>(() => initial({ startDate, startDatePrecision, endDate, endDatePrecision }))
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (editing) {
      setDraft(initial({ startDate, startDatePrecision, endDate, endDatePrecision }))
    }
  }, [editing, startDate, startDatePrecision, endDate, endDatePrecision])

  /* 외부 클릭 → 저장. */
  useEffect(() => {
    if (!editing) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(e.target as Node)) return
      commit()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, draft])

  const commit = () => {
    setEditing(false)
    if (!draft.startDate) return
    const patch: DateRangePatch = {}
    if (draft.startDate !== (startDate ?? '')) patch.startDate = draft.startDate
    if (draft.startPrecision !== ((startDatePrecision as DatePrecision) ?? 'day')) {
      patch.startDatePrecision = draft.startPrecision
    }
    if (draft.endDate !== (endDate ?? '')) patch.endDate = draft.endDate
    if (
      draft.endPrecision !== ((endDatePrecision as DatePrecision) ?? 'day') &&
      draft.endDate
    ) {
      patch.endDatePrecision = draft.endPrecision
    }
    if (Object.keys(patch).length === 0) return
    onSave(patch)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(initial({ startDate, startDatePrecision, endDate, endDatePrecision }))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  if (editing) {
    return (
      <EditRow ref={containerRef} onKeyDown={onKeyDown}>
        <DateInput
          type="date"
          value={draft.startDate}
          onChange={(e) =>
            setDraft((s) => ({ ...s, startDate: e.target.value }))
          }
          autoFocus
          aria-label="시작일"
        />
        <PrecisionSelect
          value={draft.startPrecision}
          onChange={(e) =>
            setDraft((s) => ({
              ...s,
              startPrecision: e.target.value as DatePrecision,
            }))
          }
          aria-label="시작일 정밀도"
        >
          <option value="day">년·월·일</option>
          <option value="month">년·월</option>
          <option value="year">년만</option>
        </PrecisionSelect>
        <DateSep>~</DateSep>
        <DateInput
          type="date"
          value={draft.endDate}
          onChange={(e) =>
            setDraft((s) => ({ ...s, endDate: e.target.value }))
          }
          aria-label="종료일"
        />
        <PrecisionSelect
          value={draft.endPrecision}
          onChange={(e) =>
            setDraft((s) => ({
              ...s,
              endPrecision: e.target.value as DatePrecision,
            }))
          }
          disabled={!draft.endDate}
          aria-label="종료일 정밀도"
        >
          <option value="day">년·월·일</option>
          <option value="month">년·월</option>
          <option value="year">년만</option>
        </PrecisionSelect>
      </EditRow>
    )
  }

  const dateLabel = startDate
    ? formatDateRange(
        startDate,
        endDate ?? undefined,
        startDatePrecision,
        endDatePrecision,
      )
    : null

  const isEmpty = !dateLabel
  return (
    <ReadRow data-edit-host>
      <ReadValue data-empty={isEmpty || undefined}>
        {dateLabel ?? '기간 미입력'}
      </ReadValue>
      <I.InlineEditButton
        type="button"
        onClick={() => setEditing(true)}
        aria-label="기간 편집"
      >
        <FiEdit2 />
      </I.InlineEditButton>
    </ReadRow>
  )
}

function initial({
  startDate,
  startDatePrecision,
  endDate,
  endDatePrecision,
}: {
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
}) {
  return {
    startDate: toInputDate(startDate),
    startPrecision: (startDatePrecision as DatePrecision) ?? 'day',
    endDate: toInputDate(endDate),
    endPrecision: (endDatePrecision as DatePrecision) ?? 'day',
  }
}

function toInputDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const ReadRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

const ReadValue = styled.span`
  ${I.editableTrigger}
`

const EditRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const DateInput = styled.input`
  font-family: inherit;
  font-size: 13px;
  padding: 3px 6px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
`

const PrecisionSelect = styled.select`
  font-family: inherit;
  font-size: 12px;
  padding: 3px 4px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
`

const DateSep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
`
