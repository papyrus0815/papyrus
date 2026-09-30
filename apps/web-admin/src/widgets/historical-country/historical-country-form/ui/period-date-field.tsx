/**
 * 존속 시작·종료 한 칸 — 사건 등록 폼의 날짜 칸 모양(달력 아이콘 · 연.월.일 · 서기/기원전)에
 * 칸 바로 아래 드롭다운 달력. 인물 등록 폼 생몰 칸(InlineDateField appearance='field')과 같은 부품.
 *
 * 달력만으로 바꾸지 않는 이유: 달력은 일자까지 강제하는데, 역사 국가는 '연도만'(대개)·기원전이
 * 흔하다. 칸 안에서 직접 치는 입력이 그대로라 정밀도가 유실되지 않는다.
 *
 * 값 모양은 폼 스키마 그대로(era 'BC'|'AD'|undefined, 숫자 연·월·일). 연도를 처음 치면 기원을
 * 서기로 채우고, 연·월·일이 모두 비면 기원도 비운다(빈 시점에 'AD'만 저장되지 않게).
 */
import React, { useId, useState } from 'react'

import type { Era } from '@/entities/historical-country/api'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  buildInitialDate,
  parseDateString,
} from '@/shared/ui/person-register-modal/person-register-view.helpers'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'

export interface PeriodDateValue {
  era: Era | undefined
  year: number | undefined
  month: number | undefined
  day: number | undefined
}

interface PeriodDateFieldProps extends PeriodDateValue {
  ariaLabel: string
  pickerTitle: string
  error?: boolean
  ariaDescribedBy?: string
  onChange: (next: PeriodDateValue) => void
}

const toText = (value: number | undefined) =>
  value === undefined || value === null ? '' : String(value)
const toNumber = (text: string) => (text === '' ? undefined : Number(text))

export function PeriodDateField({
  era,
  year,
  month,
  day,
  ariaLabel,
  pickerTitle,
  error,
  ariaDescribedBy,
  onChange,
}: PeriodDateFieldProps) {
  const anchorId = useId()
  const [pickerOpen, setPickerOpen] = useState(false)
  const shownEra: Era = era ?? 'AD'

  /** 한 부분만 바뀐 값 — 연·월·일이 전부 비면 기원도 비운다 */
  const emit = (patch: Partial<PeriodDateValue>) => {
    const next: PeriodDateValue = { era, year, month, day, ...patch }
    const empty =
      next.year === undefined && next.month === undefined && next.day === undefined
    onChange({ ...next, era: empty ? undefined : (next.era ?? 'AD') })
  }

  return (
    <>
      <InlineDateField
        appearance="field"
        anchorId={anchorId}
        pickerOpen={pickerOpen}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        error={error}
        era={shownEra}
        year={toText(year)}
        month={toText(month)}
        day={toText(day)}
        onEra={(nextEra) => emit({ era: nextEra })}
        onYear={(text) => emit({ year: toNumber(text) })}
        onMonth={(text) => emit({ month: toNumber(text) })}
        onDay={(text) => emit({ day: toNumber(text) })}
        onOpenPicker={() => setPickerOpen(true)}
      />
      {pickerOpen && (
        <DatePickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(date: string) => {
            const parsed = parseDateString(date)
            onChange({
              era: parsed.era,
              year: parsed.year,
              month: parsed.month,
              day: parsed.day,
            })
            setPickerOpen(false)
          }}
          initialDate={buildInitialDate(
            shownEra,
            toText(year),
            toText(month),
            toText(day),
          )}
          title={pickerTitle}
          anchorEl={document.getElementById(anchorId)}
        />
      )}
    </>
  )
}
