import { useState } from 'react'

import { FiEdit2 } from 'react-icons/fi'
import styled from 'styled-components'

import { formatDateWithPrecision } from '@/shared/lib/iso-date'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { notify } from '@/shared/ui/toast'

import * as S from './inline.styles'

interface InlineDateProps {
  /** ISO 문자열(단일 시점) 또는 null */
  value?: string | null
  onSave: (next: string) => void
  /** 비어 있을 때 read 라벨. */
  emptyLabel?: string
  /** DatePickerModal 제목. */
  pickerTitle?: string
  /** 스크린리더용 필드명 — 트리거 "{label} 편집". 미지정 시 "날짜 편집" 폴백. */
  label?: string
  /**
   * BC("-YYYY-…") 선택 차단(opt-in). plain DateTime 컬럼은 BC(음수연도)는 물론 AD1000
   * 이전도 저장 못 해 new Date()가 무음으로 AD 미래 날짜로 둔갑한다 — 그런 컬럼에 쓰는
   * 소비처(기업 연혁·제품·시설·주가 등)에서 켜서 손상을 막는다. (이벤트 등 BC 지원처는 끔)
   */
  blockBc?: boolean
}

/**
 * 명시 ✎ 트리거 단일 날짜.
 *
 * - read 라벨은 클릭해도 아무 일 없음 — 옆 ✎만 진입.
 * - 진입 시 앱 표준 {@link DatePickerModal}(BC/AD 달력)이 뜬다. 선택 즉시 onSave.
 * - 범위가 아니라 단일 시점(예: 연혁 발생일)용. 범위는 InlineDateRange 사용.
 */
export function InlineDate({
  value,
  onSave,
  emptyLabel = '날짜 미입력',
  pickerTitle = '일자 선택',
  label,
  blockBc = false,
}: InlineDateProps) {
  const [open, setOpen] = useState(false)

  const dateText = value ? formatDateWithPrecision(value, 'day') : null
  const isEmpty = !dateText

  return (
    <ReadRow data-edit-host>
      <ReadValue data-empty={isEmpty || undefined}>
        {dateText ?? emptyLabel}
      </ReadValue>
      <S.InlineEditButton
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label ? `${label} 편집` : '날짜 편집'}
      >
        <FiEdit2 />
      </S.InlineEditButton>
      <DatePickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={pickerTitle}
        initialDate={value || undefined}
        onSelect={(date) => {
          if (blockBc && date.startsWith('-')) {
            // 손상 방지 — 모달은 열어 두어 다른 날짜를 다시 고를 수 있게 한다.
            notify.error('기원전(BC) 날짜는 이 기록에 사용할 수 없습니다.')
            return
          }
          setOpen(false)
          if (date !== (value ?? '')) onSave(date)
        }}
      />
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
