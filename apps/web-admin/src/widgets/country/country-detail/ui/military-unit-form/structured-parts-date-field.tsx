/**
 * 기원(AD/BC) · 연 · 월 · 일 부분 입력 전용 날짜 필드.
 *
 * 사건 등록 모달의 `EventDateField`와 동일한 `InlineDateField(appearance="field")` +
 * `DatePickerModal(allowPartial)` 조합을 사용하여:
 * - 칸 안에서 직접 연도만 / 연·월 / 연·월·일 및 서기·기원전(BC) 타이핑 가능
 * - 달력 아이콘 클릭 시 칸 바로 아래에 드롭다운 달력 표시
 */
import React, { useId, useState } from 'react'

import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import { partsFromIso } from '@/widgets/event-form/lib/event-date-parts'

import { toCalendarInitialIso } from './constants'

export interface StructuredDatePartsValue {
  era: 'AD' | 'BC'
  year: string
  month: string
  day: string
}

export interface StructuredPartsDateFieldProps {
  era: 'AD' | 'BC'
  year: string
  month: string
  day: string
  onChange: (next: StructuredDatePartsValue) => void
  ariaLabel: string
  pickerTitle: string
  error?: boolean
  ariaDescribedBy?: string
  anchorId?: string
  onOpenSound?: () => void
}

export const StructuredPartsDateField: React.FC<
  StructuredPartsDateFieldProps
> = ({
  era,
  year,
  month,
  day,
  onChange,
  ariaLabel,
  pickerTitle,
  error,
  ariaDescribedBy,
  anchorId: anchorIdProp,
  onOpenSound,
}) => {
  const generatedId = useId()
  const anchorId = anchorIdProp ?? generatedId
  const [pickerOpen, setPickerOpen] = useState(false)

  const inferredPrecision = day.trim()
    ? 'day'
    : month.trim()
      ? 'month'
      : 'year'

  return (
    <>
      <InlineDateField
        appearance="field"
        anchorId={anchorId}
        pickerOpen={pickerOpen}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        error={error}
        era={era}
        year={year}
        month={month}
        day={day}
        onEra={(nextEra) => onChange({ era: nextEra, year, month, day })}
        onYear={(nextYear) => onChange({ era, year: nextYear, month, day })}
        onMonth={(nextMonth) => onChange({ era, year, month: nextMonth, day })}
        onDay={(nextDay) => onChange({ era, year, month, day: nextDay })}
        onOpenPicker={() => {
          onOpenSound?.()
          setPickerOpen(true)
        }}
      />
      {pickerOpen ? (
        <DatePickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(selectedIso, pickedPrecision) => {
            const parsed = partsFromIso(selectedIso, pickedPrecision, era)
            onChange({
              era: parsed.era,
              year: parsed.year,
              month: parsed.month ? parsed.month.padStart(2, '0') : '',
              day: parsed.day ? parsed.day.padStart(2, '0') : '',
            })
            setPickerOpen(false)
          }}
          initialDate={toCalendarInitialIso(era, year, month, day)}
          allowPartial
          initialPrecision={inferredPrecision}
          title={pickerTitle}
          anchorEl={
            typeof document !== 'undefined'
              ? document.getElementById(anchorId)
              : null
          }
        />
      ) : null}
    </>
  )
}
