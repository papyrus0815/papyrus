/**
 * 가문 통치기록 등록·수정 폼 — 통치 기록 모달 안에 인라인으로 열리는 경량 폼.
 * 국가(역사/현대) 선택 + 기간(InlineDateField×2, BC 지원) + 종료 사유 + 비고.
 * 재위(SovereignReign) 패널을 포크하지 않음 — enum·EventPicker·regnalName 등 오염 회피(전용 경량 폼).
 * 수정 시 통치 국가는 불변(바꾸려면 삭제 후 재등록).
 */
import { useMemo, useState } from 'react'

import styled from 'styled-components'

import { useCountries } from '@/features/country/api'
import {
  useCreateDynastyRule,
  useUpdateDynastyRuleReason,
} from '@/features/dynasty/use-dynasties.hook'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import {
  type PartialDateParts,
  buildPartialDateString,
  emptyPartialDateParts,
  isPartialRangeInverted,
  parsePartialDateString,
  partialDateFromStructured,
  partialPartsToDateInfo,
} from '@/shared/lib/partial-date-string'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import { notify } from '@/shared/ui/toast'

import type { RuleKind, UnifiedRule } from './dynasty-rules-modal'

type Props = {
  dynastyId: string
  /** null이면 신규 등록, 있으면 수정(국가·kind 고정). */
  editing: UnifiedRule | null
  onDone: () => void
  onCancel: () => void
}

function partsFromRule(
  year: number | null,
  month: number | null,
  day: number | null,
  era: string | null,
): PartialDateParts {
  return parsePartialDateString(
    partialDateFromStructured(year, month, day, era),
  )
}

export function DynastyRuleForm({
  dynastyId,
  editing,
  onDone,
  onCancel,
}: Props) {
  const isEditing = Boolean(editing)
  const createRule = useCreateDynastyRule()
  const updateRule = useUpdateDynastyRuleReason()

  const [kind, setKind] = useState<RuleKind>(editing?.kind ?? 'historical')
  const [countryId, setCountryId] = useState<string | null>(null)
  const [countryName, setCountryName] = useState<string>(
    editing?.countryName ?? '',
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [start, setStart] = useState<PartialDateParts>(
    editing
      ? partsFromRule(
          editing.startYear,
          editing.startMonth,
          editing.startDay,
          editing.startEra,
        )
      : emptyPartialDateParts(),
  )
  const [end, setEnd] = useState<PartialDateParts>(
    editing
      ? partsFromRule(
          editing.endYear,
          editing.endMonth,
          editing.endDay,
          editing.endEra,
        )
      : emptyPartialDateParts(),
  )
  const [endReason, setEndReason] = useState(editing?.endReason ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [datePickerSide, setDatePickerSide] = useState<'start' | 'end' | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const patchStart = (patch: Partial<PartialDateParts>) =>
    setStart((prev) => ({ ...prev, ...patch }))
  const patchEnd = (patch: Partial<PartialDateParts>) =>
    setEnd((prev) => ({ ...prev, ...patch }))

  const { data: modernCountries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()

  // CountrySearchModal은 CountryOption[](id/name/startYear/endYear)를 요구.
  const modernOptions = useMemo(
    () =>
      (modernCountries as Array<{ id: string; name: string }>).map((country) => ({
        id: country.id,
        name: country.name,
      })),
    [modernCountries],
  )
  const historicalOptions = useMemo(
    () =>
      (
        historicalCountries as Array<{
          id: string
          name: string
          startYear?: number | null
          endYear?: number | null
        }>
      ).map((country) => ({
        id: country.id,
        name: country.name,
        startYear: country.startYear ?? null,
        endYear: country.endYear ?? null,
      })),
    [historicalCountries],
  )

  const dateInverted = isPartialRangeInverted(start, end)
  const isSaving = createRule.isPending || updateRule.isPending

  const handleSave = async () => {
    setError(null)
    if (!isEditing && !countryId) {
      setError('통치 국가를 선택해주세요.')
      return
    }
    const startDateInfo = partialPartsToDateInfo(start) ?? null
    const endDateInfo = partialPartsToDateInfo(end) ?? null
    const reasonBody = {
      startDateInfo,
      endDateInfo,
      endReason: endReason.trim() || null,
      notes: notes.trim() || null,
    }
    try {
      if (isEditing && editing) {
        await updateRule.mutateAsync({
          dynastyId,
          ruleId: editing.id,
          kind: editing.kind,
          body: reasonBody,
        })
      } else if (kind === 'historical') {
        await createRule.mutateAsync({
          dynastyId,
          kind: 'historical',
          body: { historicalCountryId: countryId as string, ...reasonBody },
        })
      } else {
        await createRule.mutateAsync({
          dynastyId,
          kind: 'modern',
          body: { countryId: countryId as string, ...reasonBody },
        })
      }
      notify.success(isEditing ? '통치기록을 저장했습니다.' : '통치기록을 등록했습니다.')
      onDone()
    } catch {
      setError('저장에 실패했습니다.')
    }
  }

  return (
    <>
      <FormRoot>
        {error && <FormError role="alert">{error}</FormError>}

        {/* 국가 — 신규만 선택, 수정은 고정 표시 */}
        {isEditing ? (
          <Field>
            <FieldLabel>통치 국가</FieldLabel>
            <FixedCountry>
              <KindTag $modern={editing?.kind === 'modern'}>
                {editing?.kind === 'modern' ? '현대국가' : '역사국가'}
              </KindTag>
              {countryName}
            </FixedCountry>
          </Field>
        ) : (
          <Field>
            <FieldLabel>통치 국가</FieldLabel>
            <KindToggle>
              <KindBtn
                type="button"
                $active={kind === 'historical'}
                onClick={() => {
                  setKind('historical')
                  setCountryId(null)
                  setCountryName('')
                }}
              >
                역사국가
              </KindBtn>
              <KindBtn
                type="button"
                $active={kind === 'modern'}
                onClick={() => {
                  setKind('modern')
                  setCountryId(null)
                  setCountryName('')
                }}
              >
                현대국가
              </KindBtn>
            </KindToggle>
            <PickCountryBtn type="button" onClick={() => setPickerOpen(true)}>
              {countryName || '국가 선택…'}
            </PickCountryBtn>
          </Field>
        )}

        <Field>
          <FieldLabel>통치 기간</FieldLabel>
          <DateRow>
            <DateCol>
              <SmallLabel>통치 시작</SmallLabel>
              <InlineDateField
                ariaLabel="통치 시작일"
                era={start.era}
                year={start.year}
                month={start.month}
                day={start.day}
                onEra={(era) => patchStart({ era })}
                onYear={(year) => patchStart({ year })}
                onMonth={(month) => patchStart({ month })}
                onDay={(day) => patchStart({ day })}
                onOpenPicker={() => setDatePickerSide('start')}
              />
            </DateCol>
            <DateCol>
              <SmallLabel>통치 종료 (비우면 진행/미상)</SmallLabel>
              <InlineDateField
                ariaLabel="통치 종료일"
                era={end.era}
                year={end.year}
                month={end.month}
                day={end.day}
                onEra={(era) => patchEnd({ era })}
                onYear={(year) => patchEnd({ year })}
                onMonth={(month) => patchEnd({ month })}
                onDay={(day) => patchEnd({ day })}
                onOpenPicker={() => setDatePickerSide('end')}
                error={dateInverted}
              />
            </DateCol>
          </DateRow>
          {dateInverted && (
            <InvertWarn role="alert">
              종료일이 시작일보다 앞섭니다. 확인해 주세요.
            </InvertWarn>
          )}
        </Field>

        <Field>
          <FieldLabel>통치 종료 사유</FieldLabel>
          <TextInput
            type="text"
            value={endReason}
            maxLength={200}
            placeholder="예: 왕조 교체, 공화정 전환, 병합"
            onChange={(event) => setEndReason(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel>비고</FieldLabel>
          <TextArea
            rows={2}
            value={notes}
            placeholder="특이사항"
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <Actions>
          <CancelBtn type="button" onClick={onCancel} disabled={isSaving}>
            취소
          </CancelBtn>
          <SaveBtn type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중…' : isEditing ? '저장' : '등록'}
          </SaveBtn>
        </Actions>
      </FormRoot>

      {pickerOpen && (
        <CountrySearchModal
          isOpen
          onClose={() => setPickerOpen(false)}
          title="통치 국가 선택"
          modernCountries={modernOptions}
          historicalCountries={historicalOptions}
          modernOnly={kind === 'modern'}
          historicalOnly={kind === 'historical'}
          selectedCountryId={countryId}
          onSelect={(country) => {
            setCountryId(country.id)
            setCountryName(country.name)
            setPickerOpen(false)
          }}
        />
      )}

      {datePickerSide &&
        (() => {
          const parts = datePickerSide === 'start' ? start : end
          const initialDate =
            parts.year && parts.month && parts.day
              ? buildPartialDateString(parts)
              : undefined
          const apply = datePickerSide === 'start' ? patchStart : patchEnd
          return (
            <DatePickerModal
              isOpen
              initialDate={initialDate}
              title={datePickerSide === 'start' ? '통치 시작일' : '통치 종료일'}
              onSelect={(date) => {
                apply(parsePartialDateString(date))
                setDatePickerSide(null)
              }}
              onClose={() => setDatePickerSide(null)}
            />
          )
        })()}
    </>
  )
}

/* ─── styles ────────────────────────────────────────────────────────────── */

const FormRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const FormError = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.error};
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SmallLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FixedCountry = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const KindTag = styled.span<{ $modern: boolean }>`
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  color: ${({ theme, $modern }) =>
    $modern ? theme.colors.text.secondary : theme.colors.primary};
  background: ${({ theme, $modern }) =>
    $modern ? theme.colors.background.tertiary : theme.colors.activeLight};
`

const KindToggle = styled.div`
  display: inline-flex;
  gap: 4px;
`

const KindBtn = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
`

const PickCountryBtn = styled.button`
  padding: 8px 12px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  color: ${({ theme }) => theme.colors.text.primary};
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const DateRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`

const DateCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const InvertWarn = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.error};
`

const TextInput = styled.input`
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const CancelBtn = styled.button`
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`

const SaveBtn = styled.button`
  padding: 7px 18px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.button.text};
  background: ${({ theme }) => theme.colors.primary};
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`
