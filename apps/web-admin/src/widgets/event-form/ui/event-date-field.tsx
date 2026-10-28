/**
 * 사건 시작·종료 날짜 칸 — 칸 안에서 연·월·일을 바로 치고, 달력은 아이콘으로 연다.
 *
 * 예전엔 칸 전체가 달력 버튼이라 날짜 하나를 넣으려면 칸 → 드롭다운 → 숫자 입력 → 적용(Enter)
 * 세 단계를 거쳐야 했다. 인물 생몰·역사국가 존속 칸(InlineDateField appearance='field')은 이미
 * 직접 입력인데, 그 모양의 원형이던 사건 칸만 버튼으로 남아 있었다 — 같은 부품을 쓴다.
 *
 * 칸이 치는 중간 상태(연도 없이 월, 2월 30일)는 폼 값(ISO + 정밀도)으로 표현할 수 없다. 그래서
 * 친 글자는 이 칸이 들고, 유효할 때만 `onChange(iso, precision)`를 보내며, 무효면 빈 값과
 * 함께 `onInputErrorChange(문구)`로 알린다 — 폼은 그 오류로 저장을 막는다.
 */
import React, { useEffect, useId, useRef, useState } from 'react'

import {
  DatePickerModal,
  type DatePickerPrecision,
} from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'

import {
  partsFromIso,
  partsToIso,
  type EventDateParts,
} from '../lib/event-date-parts'

export interface EventDateFieldProps {
  /** 폼 값 — `-0044-03-15` 꼴(BC는 '-'), 비었으면 '' */
  value: string
  precision: DatePickerPrecision
  /** 정밀도를 저장할 수 있는 폼이면 연도만·연·월도 받는다 */
  allowPartial: boolean
  onChange: (iso: string, precision: DatePickerPrecision) => void
  /** 직접 입력이 날짜가 못 될 때의 문구(없으면 null) */
  onInputErrorChange: (message: string | null) => void
  ariaLabel: string
  pickerTitle: string
  /** 칸에 오류 테두리 — 입력 오류 외에 순서 역전 같은 폼 오류도 */
  error?: boolean
  ariaDescribedBy?: string
  /** 달력 범위(시작 ≤ 종료) — 직접 입력은 폼의 순서 검사가 맡는다 */
  minDate?: string
  maxDate?: string
  /** 달력에서 골라 닫힌 직후 — 다음 칸으로 포커스를 넘기는 데 쓴다 */
  onPickedFromCalendar?: () => void
  /** 칸(드롭다운 기준 요소)의 id — 바깥에서 이 칸으로 포커스를 옮길 때 */
  anchorId?: string
}

export function EventDateField({
  value,
  precision,
  allowPartial,
  onChange,
  onInputErrorChange,
  ariaLabel,
  pickerTitle,
  error,
  ariaDescribedBy,
  minDate,
  maxDate,
  onPickedFromCalendar,
  anchorId: anchorIdProp,
}: EventDateFieldProps) {
  const generatedId = useId()
  const anchorId = anchorIdProp ?? generatedId
  const [pickerOpen, setPickerOpen] = useState(false)
  const [parts, setParts] = useState<EventDateParts>(() => partsFromIso(value, precision))
  const [inputError, setInputError] = useState<string | null>(null)
  /** 마지막으로 내보낸 값 — 바깥 값이 이것과 다르면(편집 로드·초기화) 칸을 다시 채운다 */
  const lastEmittedRef = useRef(`${value}|${precision}`)

  useEffect(() => {
    const incoming = `${value}|${precision}`
    if (incoming === lastEmittedRef.current) return
    lastEmittedRef.current = incoming
    setParts((current) => partsFromIso(value, precision, current.era))
    setInputError(null)
    onInputErrorChange(null)
    // 바깥 값이 바뀔 때만 돈다(콜백은 의존성에서 일부러 뺐다 — 정체성이 바뀔 때마다 칸을 덮지 않게)
  }, [value, precision])

  const apply = (next: EventDateParts) => {
    setParts(next)
    const result = partsToIso(next, { allowPartial })
    const message = result.kind === 'error' ? result.message : null
    setInputError(message)
    onInputErrorChange(message)
    // 무효·빈 칸은 빈 값으로 — 시작은 필수 검사가, 종료는 위 오류가 저장을 막는다
    const iso = result.kind === 'ok' ? result.iso : ''
    const nextPrecision = result.kind === 'ok' ? result.precision : precision
    lastEmittedRef.current = `${iso}|${nextPrecision}`
    if (iso !== value || nextPrecision !== precision) onChange(iso, nextPrecision)
  }

  return (
    <>
      <InlineDateField
        appearance="field"
        anchorId={anchorId}
        pickerOpen={pickerOpen}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        error={error || Boolean(inputError)}
        era={parts.era}
        year={parts.year}
        month={parts.month}
        day={parts.day}
        onEra={(era) => apply({ ...parts, era })}
        onYear={(year) => apply({ ...parts, year })}
        onMonth={(month) => apply({ ...parts, month })}
        onDay={(day) => apply({ ...parts, day })}
        onOpenPicker={() => setPickerOpen(true)}
      />
      {pickerOpen && (
        <DatePickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(date, pickedPrecision) => {
            apply(partsFromIso(date, pickedPrecision))
            setPickerOpen(false)
            onPickedFromCalendar?.()
          }}
          // 칸이 비었거나 무효면 바깥 값(종료는 시작일)으로 달력을 연다
          initialDate={value || minDate}
          allowPartial={allowPartial}
          initialPrecision={precision}
          minDate={minDate}
          maxDate={maxDate}
          title={pickerTitle}
          // 모달 대신 칸 아래 드롭다운 — 폼을 가리지 않고 고른 뒤 바로 이어 쓴다
          anchorEl={document.getElementById(anchorId)}
        />
      )}
    </>
  )
}
