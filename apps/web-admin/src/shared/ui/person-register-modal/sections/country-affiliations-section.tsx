/**
 * 인물 등록/수정 폼의 "국가 소속(다중)" 입력.
 * - 주 국적(countryId)과 별개로 출생지·복무·망명·이중국적 등 여러 소속을 행 단위로 추가/삭제.
 * - 국가 선택은 부모가 소유한 CountrySelectModal을 onPickCountry(rowKey)로 위임.
 * - 시작/종료일은 폼 전역과 동일한 공용 DatePickerModal(era 인식)로 통일.
 *   · 서버 DTO가 @IsDateString(ISO, AD)이라 BC 확장연도(`-YYYY-...`)는 저장 불가 →
 *     모달에서 BC를 고르면 차단·안내한다. (BC 지원은 백엔드 date 포맷 완화가 선행돼야 함)
 */
import React, { useState } from 'react'

import { FiPlus, FiTrash2, FiChevronDown, FiCalendar, FiAlertCircle } from 'react-icons/fi'
import styled from 'styled-components'

import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  FieldLabel,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import { FieldError, FONT, RADIUS, SelectBtn } from '../_form-primitives'

/** 국가 소속 한 행의 폼 상태 (저장 시 DTO로 변환) */
export type CountryAffiliationRow = {
  /** React 키 (로컬 전용, 서버 전송 X) */
  key: string
  affiliationType: string
  countryId?: string
  historicalCountryId?: string
  /** 선택한 국가 표시명 */
  countryLabel: string
  /** YYYY-MM-DD (선택) */
  startDate?: string
  endDate?: string
  note?: string
}

/** Prisma PersonCountryAffiliationType 미러 — 라벨은 상세 패널과 통일 */
export const AFFILIATION_TYPE_OPTIONS: ReadonlyArray<{
  value: string
  label: string
}> = [
  { value: 'CITIZENSHIP', label: '국적/시민권' },
  { value: 'BIRTH_PLACE', label: '출생지' },
  { value: 'PRIMARY_RESIDENCE', label: '거주/활동지' },
  { value: 'SERVED', label: '복무/봉사' },
  { value: 'EXILE', label: '망명' },
  { value: 'OTHER', label: '기타' },
]

let rowSeq = 0
export function makeAffiliationRow(
  partial?: Partial<CountryAffiliationRow>,
): CountryAffiliationRow {
  rowSeq += 1
  return {
    key: `aff-${rowSeq}`,
    affiliationType: 'CITIZENSHIP',
    countryLabel: '',
    ...partial,
  }
}

/** 행에 국가가 지정됐는지 (둘 중 하나라도) */
const hasCountry = (row: CountryAffiliationRow) =>
  !!(row.countryId || row.historicalCountryId)

/** 행에 국가 외 입력(날짜·비고)이 있는지 — 국가 누락 경고 판단용 */
const hasDataButNoCountry = (row: CountryAffiliationRow) =>
  !hasCountry(row) && !!(row.startDate || row.endDate || row.note?.trim())

/** YYYY-MM-DD 표시 포맷 (YYYY.MM.DD). 빈 값이면 placeholder. */
const fmtDate = (iso?: string) => (iso ? iso.replace(/-/g, '.') : '')

/**
 * 행 검증 — 저장 전 사용자에게 보일 사유.
 * · 국가 미선택인데 날짜/비고가 있으면 저장 시 조용히 버려지므로 경고.
 * · 시작 > 종료면 기간 오류. (AD ISO는 사전식 비교로 충분)
 */
function rowError(row: CountryAffiliationRow): string | null {
  if (hasDataButNoCountry(row)) return '국가를 선택해야 이 소속이 저장됩니다.'
  if (row.startDate && row.endDate && row.startDate > row.endDate)
    return '종료일이 시작일보다 빠릅니다.'
  return null
}

export interface CountryAffiliationsSectionProps {
  fid: (key: string) => string
  rows: CountryAffiliationRow[]
  setRows: React.Dispatch<React.SetStateAction<CountryAffiliationRow[]>>
  /** 행의 국가 선택 모달 열기 (부모가 공용 CountrySelectModal 제어) */
  onPickCountry: (rowKey: string) => void
  markDirty: () => void
}

export function CountryAffiliationsSection({
  fid,
  rows,
  setRows,
  onPickCountry,
  markDirty,
}: CountryAffiliationsSectionProps) {
  /** 현재 열려 있는 날짜 모달 대상 (행 key + 어떤 필드). null이면 닫힘. */
  const [dateModal, setDateModal] = useState<{
    rowKey: string
    field: 'startDate' | 'endDate'
  } | null>(null)
  /** BC 선택 차단 안내를 띄울 행 key */
  const [bcBlockedRow, setBcBlockedRow] = useState<string | null>(null)

  const patchRow = (key: string, patch: Partial<CountryAffiliationRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    markDirty()
  }
  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key))
    markDirty()
  }
  const addRow = () => {
    setRows((prev) => [...prev, makeAffiliationRow()])
    markDirty()
  }

  const openDateModal = (
    rowKey: string,
    field: 'startDate' | 'endDate',
  ) => {
    setBcBlockedRow(null)
    setDateModal({ rowKey, field })
  }

  const handleDatePicked = (iso: string) => {
    if (!dateModal) return
    // 서버 @IsDateString가 BC(`-YYYY-...`)를 거부 — 차단하고 안내.
    if (iso.startsWith('-')) {
      setBcBlockedRow(dateModal.rowKey)
      setDateModal(null)
      return
    }
    patchRow(dateModal.rowKey, { [dateModal.field]: iso })
    setDateModal(null)
  }

  const activeRow = dateModal
    ? rows.find((row) => row.key === dateModal.rowKey)
    : undefined

  return (
    <FormRows>
      <FieldRow>
        <FieldLabel htmlFor={fid('countryAffiliations')}>
          추가 국가 소속
        </FieldLabel>
        <ControlWide>
          <HintText>
            주 국적 외에 출생지·복무·망명·이중국적 등을 추가합니다. (현대/역사적 국가 모두 가능)
          </HintText>

          {rows.length > 0 && (
            <RowList>
              {rows.map((row, idx) => {
                const err = rowError(row)
                const missingCountry = hasDataButNoCountry(row)
                return (
                  <RowCard key={row.key} $invalid={!!err}>
                    <RowTop>
                      <TypeSelectWrap>
                        <TypeSelect
                          aria-label={`소속 유형 ${idx + 1}`}
                          value={row.affiliationType}
                          onChange={(e) =>
                            patchRow(row.key, {
                              affiliationType: e.target.value,
                            })
                          }
                        >
                          {AFFILIATION_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </TypeSelect>
                        <SelectCaret>
                          <FiChevronDown size={16} />
                        </SelectCaret>
                      </TypeSelectWrap>

                      <SelectBtn
                        type="button"
                        $hasValue={!!row.countryLabel}
                        $error={missingCountry}
                        onClick={() => onPickCountry(row.key)}
                      >
                        <span>{row.countryLabel || '국가 선택'}</span>
                        <FiChevronDown size={18} />
                      </SelectBtn>

                      <RemoveBtn
                        type="button"
                        aria-label={`소속 ${idx + 1} 삭제`}
                        onClick={() => removeRow(row.key)}
                      >
                        <FiTrash2 size={16} />
                      </RemoveBtn>
                    </RowTop>

                    <RowBottom>
                      <DateTriggerBtn
                        type="button"
                        $hasValue={!!row.startDate}
                        aria-label={`소속 ${idx + 1} 시작일 선택`}
                        onClick={() => openDateModal(row.key, 'startDate')}
                      >
                        <FiCalendar size={13} />
                        <span>{fmtDate(row.startDate) || '시작일'}</span>
                      </DateTriggerBtn>
                      <DateSep aria-hidden>~</DateSep>
                      <DateTriggerBtn
                        type="button"
                        $hasValue={!!row.endDate}
                        aria-label={`소속 ${idx + 1} 종료일 선택`}
                        onClick={() => openDateModal(row.key, 'endDate')}
                      >
                        <FiCalendar size={13} />
                        <span>{fmtDate(row.endDate) || '종료일'}</span>
                      </DateTriggerBtn>
                      {row.startDate && (
                        <DateClearBtn
                          type="button"
                          aria-label={`소속 ${idx + 1} 날짜 지우기`}
                          onClick={() =>
                            patchRow(row.key, {
                              startDate: undefined,
                              endDate: undefined,
                            })
                          }
                        >
                          날짜 지우기
                        </DateClearBtn>
                      )}
                      <NoteInput
                        type="text"
                        aria-label={`소속 ${idx + 1} 비고`}
                        placeholder="비고 (선택)"
                        value={row.note ?? ''}
                        onChange={(e) =>
                          patchRow(row.key, {
                            note: e.target.value || undefined,
                          })
                        }
                      />
                    </RowBottom>

                    {err && (
                      <FieldError role="alert">
                        <FiAlertCircle size={13} />
                        {err}
                      </FieldError>
                    )}
                    {bcBlockedRow === row.key && (
                      <FieldError role="alert">
                        <FiAlertCircle size={13} />
                        기원전(BC) 날짜는 아직 저장할 수 없습니다. (서버 지원 예정)
                      </FieldError>
                    )}
                  </RowCard>
                )
              })}
            </RowList>
          )}

          <AddBtn type="button" onClick={addRow}>
            <FiPlus size={16} />
            소속 추가
          </AddBtn>
        </ControlWide>
      </FieldRow>

      {dateModal && (
        <DatePickerModal
          isOpen
          onClose={() => setDateModal(null)}
          onSelect={handleDatePicked}
          initialDate={
            (dateModal.field === 'startDate'
              ? activeRow?.startDate
              : activeRow?.endDate) || undefined
          }
          title={dateModal.field === 'startDate' ? '시작일 선택' : '종료일 선택'}
        />
      )}
    </FormRows>
  )
}

const ControlWide = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const HintText = styled.p`
  margin: 0;
  font-size: ${FONT.meta};
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const RowCard = styled.div<{ $invalid?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid
    ${({ $invalid, theme }) =>
      $invalid ? theme.colors.alert.danger.fg : theme.colors.border.default};
  border-radius: ${RADIUS.card};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa'};
`

const RowTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const TypeSelectWrap = styled.div`
  position: relative;
  flex: 0 0 132px;
`

const TypeSelect = styled.select`
  width: 100%;
  appearance: none;
  padding: 9px 28px 9px 10px;
  font-size: ${FONT.label};
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SelectCaret = styled.span`
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  pointer-events: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
`

const RemoveBtn = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  color: ${({ theme }) => theme.colors.alert.danger.fg};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.alert.danger.border};
  }
`

const RowBottom = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const DateTriggerBtn = styled.button<{ $hasValue?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: ${FONT.label};
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const DateSep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${FONT.meta};
`

const DateClearBtn = styled.button`
  padding: 4px 6px;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const NoteInput = styled.input`
  flex: 1 1 140px;
  min-width: 0;
  padding: 7px 10px;
  font-size: ${FONT.label};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const AddBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: ${FONT.label};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.4)' : '#c7d2fe'};
  border-radius: ${RADIUS.control};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#e0e7ff'};
  }
`
