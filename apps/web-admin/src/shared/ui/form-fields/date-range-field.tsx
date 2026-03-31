/**
 * 취임일·퇴임일 등 기간 날짜 필드 - 달력(캘린더) input 공통
 * 라벨 + 취임일 버튼 + 퇴임일 버튼 + DatePickerModal 두 개
 */
import React, { useState } from 'react'
import { FiCalendar, FiChevronDown } from 'react-icons/fi'

import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  Required,
} from '@/shared/ui/register-form-layout'

function formatDateDisplay(iso: string): string {
  if (!iso) return ''
  if (iso.startsWith('-')) {
    const match = iso.match(/^-(\d+)-(\d+)-(\d+)/)
    const [, y, m, d] = match || []
    return y && m && d
      ? `BC ${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`
      : iso
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export interface DateRangeFieldProps {
  label?: string
  required?: boolean
  startValue: string
  endValue: string
  onStartChange: (date: string) => void
  onEndChange: (date: string) => void
  startPlaceholder?: string
  endPlaceholder?: string
  /** 취임일 선택 후 퇴임일 모달 자동 오픈 (기본 true) */
  openEndAfterStart?: boolean
  /** true면 FieldRow/FieldLabel 없이 컨트롤(날짜 버튼)만 렌더 (모달 등에서 레이블을 직접 쓸 때) */
  renderControlOnly?: boolean
  /** DatePickerModal 제목 (기본: 취임일 선택 / 퇴임일 선택) */
  startPickerTitle?: string
  endPickerTitle?: string
}

export const DateRangeField: React.FC<DateRangeFieldProps> = ({
  label = '취임일 · 퇴임일',
  required = false,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startPlaceholder = '취임일',
  endPlaceholder = '퇴임일 (선택)',
  openEndAfterStart = true,
  renderControlOnly = false,
  startPickerTitle = '취임일 선택',
  endPickerTitle = '퇴임일 선택',
}) => {
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)

  const handleStartSelect = (date: string) => {
    onStartChange(date)
    setStartModalOpen(false)
    if (openEndAfterStart) setEndModalOpen(true)
  }

  const handleEndSelect = (date: string) => {
    onEndChange(date)
    setEndModalOpen(false)
  }

  const dateButtons = (
    <DateFieldsRow>
      <DateFieldBtn
        type="button"
        onClick={() => setStartModalOpen(true)}
        $hasValue={!!startValue}
      >
        <FiCalendar size={16} />
        <span>{startValue ? formatDateDisplay(startValue) : startPlaceholder}</span>
        <FiChevronDown size={20} />
      </DateFieldBtn>
      <DateFieldBtn
        type="button"
        onClick={() => setEndModalOpen(true)}
        $hasValue={!!endValue}
      >
        <FiCalendar size={16} />
        <span>{endValue ? formatDateDisplay(endValue) : endPlaceholder}</span>
        <FiChevronDown size={20} />
      </DateFieldBtn>
    </DateFieldsRow>
  )

  return (
    <>
      {renderControlOnly ? (
        <div style={{ width: '100%', minWidth: 0 }}>{dateButtons}</div>
      ) : (
        <FieldRow>
          <FieldLabel>
            {label}
            {required && <Required aria-label="필수" />}
          </FieldLabel>
          <FieldControl $variant="datePair">
            {dateButtons}
          </FieldControl>
        </FieldRow>
      )}

      <DatePickerModal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        title={startPickerTitle}
        initialDate={startValue || undefined}
        onSelect={handleStartSelect}
      />
      <DatePickerModal
        isOpen={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        title={endPickerTitle}
        initialDate={endValue || undefined}
        onSelect={handleEndSelect}
      />
    </>
  )
}
