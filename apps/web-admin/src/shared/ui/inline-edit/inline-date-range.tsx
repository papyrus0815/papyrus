import { useEffect, useRef, useState } from 'react'

import { FiCheck, FiEdit2 } from 'react-icons/fi'
import styled from 'styled-components'

import { formatDateRange } from '@/shared/lib/iso-date'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'

import * as S from './inline.styles'

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
  /** read 라벨 placeholder — 비어 있을 때. 기본 '기간 미입력'. */
  emptyLabel?: string
  startPlaceholder?: string
  endPlaceholder?: string
  /** 스크린리더용 필드명 — 트리거 "{label} 편집". 미지정 시 "기간 편집" 폴백. */
  label?: string
  /** BC 선택 차단(opt-in) — plain DateTime 컬럼(기업 설립·해산 등)에 쓸 때 켠다. */
  blockBc?: boolean
  /**
   * 연도만·연월만 입력 허용(opt-in) — 정밀도 컬럼이 있는 모델(사건)에서만 켠다.
   * 켜면 달력에서 월·일을 비울 수 있고, 고른 정밀도를 그대로 저장한다.
   */
  allowPartial?: boolean
}

/** 서버 정밀도 문자열 → 3종. null·미지정은 서버 규약대로 day */
function asPrecision(value?: string | null): DatePrecision {
  return value === 'year' || value === 'month' ? value : 'day'
}

/**
 * 명시 ✎ 트리거 날짜 범위.
 *
 * - read 라벨은 클릭해도 아무 일 없음 — 옆 ✎만 진입.
 * - 진입 시 앱 전반의 표준 {@link DateRangeField}(BC/AD 달력 모달)로 스왑한다.
 * - 달력은 일 단위까지 고르므로, 편집한 쪽의 정밀도는 'day'로 맞춰 선택값이 그대로 표시되게 한다.
 */
export function InlineDateRange({
  startDate,
  startDatePrecision,
  endDate,
  endDatePrecision,
  onSave,
  emptyLabel = '기간 미입력',
  startPlaceholder = '시작일',
  endPlaceholder = '종료일 (선택)',
  label,
  blockBc = false,
  allowPartial = false,
}: InlineDateRangeProps) {
  const [editing, setEditing] = useState(false)
  // 편집은 로컬 draft에 모았다가 '완료' 시 한 번의 onSave로 커밋한다.
  // (이전엔 날짜를 누르는 즉시 onSave가 나가 시작·종료를 둘 다 고치면 mutation 2회,
  //  undo 토스트 2개가 생기고 되돌리기 한 번이 종료일만 복구했다.)
  const [draftStart, setDraftStart] = useState(startDate ?? '')
  const [draftEnd, setDraftEnd] = useState(endDate ?? '')
  const savedStartPrecision = asPrecision(startDatePrecision)
  const savedEndPrecision = asPrecision(endDatePrecision)
  const [draftStartPrecision, setDraftStartPrecision] = useState(savedStartPrecision)
  const [draftEndPrecision, setDraftEndPrecision] = useState(savedEndPrecision)

  // edit 진입(false→true) 시에만 draft를 현재 server 값으로 동기화.
  const wasEditingRef = useRef(editing)
  useEffect(() => {
    if (editing && !wasEditingRef.current) {
      setDraftStart(startDate ?? '')
      setDraftEnd(endDate ?? '')
      setDraftStartPrecision(savedStartPrecision)
      setDraftEndPrecision(savedEndPrecision)
    }
    wasEditingRef.current = editing
  }, [editing, startDate, endDate, savedStartPrecision, savedEndPrecision])

  const commit = () => {
    const patch: DateRangePatch = {}
    if (allowPartial) {
      // 정밀도를 사용자가 직접 고른다 — 고른 값 그대로. 날짜가 같아도 정밀도만 바뀌면
      // ('1950년 1월 1일' → '1950년') 저장해야 하므로 둘 중 하나라도 바뀌면 보낸다.
      if (draftStart !== (startDate ?? '') || draftStartPrecision !== savedStartPrecision) {
        patch.startDate = draftStart
        patch.startDatePrecision = draftStartPrecision
      }
      if (
        draftEnd !== (endDate ?? '') ||
        (draftEnd && draftEndPrecision !== savedEndPrecision)
      ) {
        patch.endDate = draftEnd
        patch.endDatePrecision = draftEndPrecision
      }
      if (Object.keys(patch).length > 0) onSave(patch)
      setEditing(false)
      return
    }
    // 달력은 일 단위까지 고르지만, 사료적으로 연/월만 아는 사건의 기존 정밀도를
    // 임의로 'day'로 덮지 않는다 — 기존 정밀도를 보존하고, 정밀도가 없던 필드에
    // 새 값이 들어온 경우에만 'day'로 둔다(거짓 정밀도 영속화 방지).
    if (draftStart !== (startDate ?? '')) {
      patch.startDate = draftStart
      patch.startDatePrecision =
        (startDatePrecision as DatePrecision | null) ?? 'day'
    }
    if (draftEnd !== (endDate ?? '')) {
      patch.endDate = draftEnd
      patch.endDatePrecision =
        (endDatePrecision as DatePrecision | null) ?? 'day'
    }
    if (Object.keys(patch).length > 0) onSave(patch)
    setEditing(false)
  }

  if (editing) {
    return (
      <EditRow
        onKeyDown={(event) => {
          // Esc — 미저장 draft 폐기 후 읽기 모드 복귀(다른 inline 요소와 일관).
          if (event.key === 'Escape') {
            event.preventDefault()
            setEditing(false)
          }
        }}
      >
        <DateRangeField
          renderControlOnly
          startValue={draftStart}
          endValue={draftEnd}
          onStartChange={(date) => setDraftStart(date)}
          onEndChange={(date) => setDraftEnd(date)}
          startPlaceholder={startPlaceholder}
          endPlaceholder={endPlaceholder}
          startPickerTitle="시작 일자 선택"
          endPickerTitle="종료 일자 선택"
          openEndAfterStart={false}
          blockBc={blockBc}
          {...(allowPartial && {
            startPrecision: draftStartPrecision,
            endPrecision: draftEndPrecision,
            onStartPrecisionChange: setDraftStartPrecision,
            onEndPrecisionChange: setDraftEndPrecision,
          })}
        />
        <DoneButton type="button" onClick={commit} aria-label="기간 편집 완료">
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
        {dateLabel ?? emptyLabel}
      </ReadValue>
      <S.InlineEditButton
        type="button"
        onClick={() => setEditing(true)}
        aria-label={label ? `${label} 편집` : '기간 편집'}
      >
        <FiEdit2 />
      </S.InlineEditButton>
    </ReadRow>
  )
}

const ReadRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

const ReadValue = styled.span`
  ${S.editableTrigger}
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
