import { useState } from 'react'

import { FiCheck, FiEdit2 } from 'react-icons/fi'
import styled from 'styled-components'

import { formatDateRange } from '@/pages/events/utils/events.utils'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'

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
 * - 진입 시 앱 전반의 표준 {@link DateRangeField}(BC/AD 달력 모달)로 스왑한다.
 *   날짜 버튼을 누르면 등록 폼·인물·국가에서 쓰는 것과 동일한 DatePickerModal이 뜬다.
 * - 달력은 일 단위까지 고르므로, 편집한 쪽의 정밀도는 'day'로 맞춰 선택값이 그대로 표시되게 한다.
 */
export function InlineDateRange({
  startDate,
  startDatePrecision,
  endDate,
  endDatePrecision,
  onSave,
}: InlineDateRangeProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <EditRow>
        <DateRangeField
          renderControlOnly
          startValue={startDate ?? ''}
          endValue={endDate ?? ''}
          onStartChange={(date) =>
            onSave({ startDate: date, startDatePrecision: 'day' })
          }
          onEndChange={(date) =>
            onSave({ endDate: date, endDatePrecision: 'day' })
          }
          startPlaceholder="시작일"
          endPlaceholder="종료일 (선택)"
          startPickerTitle="시작 일자 선택"
          endPickerTitle="종료 일자 선택"
          openEndAfterStart={false}
        />
        <DoneButton
          type="button"
          onClick={() => setEditing(false)}
          aria-label="기간 편집 완료"
        >
          <FiCheck />
          완료
        </DoneButton>
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

const ReadRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

const ReadValue = styled.span`
  ${I.editableTrigger}
`

const EditRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  /* DateRangeField(grid)가 좁은 메타 영역에서 과대해지지 않도록 폭 제한. */
  max-width: 100%;

  & > div {
    flex: 1 1 280px;
    min-width: 0;
  }
`

const DoneButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.14s ease;

  &:hover {
    opacity: 0.9;
  }

  svg {
    width: 13px;
    height: 13px;
  }
`
