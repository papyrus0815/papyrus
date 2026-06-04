/**
 * 인물 등록/수정 폼의 "국가 소속(다중)" 입력.
 * - 주 국적(countryId)과 별개로 출생지·복무·망명·이중국적 등 여러 소속을 행 단위로 추가/삭제.
 * - 국가 선택은 부모가 소유한 CountrySelectModal을 onPickCountry(rowKey)로 위임.
 */
import React from 'react'

import { FiPlus, FiTrash2, FiChevronDown } from 'react-icons/fi'
import styled from 'styled-components'

import {
  FieldLabel,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import { SelectBtn } from '../_form-primitives'

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
    key: `aff-${Date.now()}-${rowSeq}`,
    affiliationType: 'CITIZENSHIP',
    countryLabel: '',
    ...partial,
  }
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
  const patchRow = (key: string, patch: Partial<CountryAffiliationRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    )
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
              {rows.map((row, idx) => (
                <RowCard key={row.key}>
                  <RowTop>
                    <TypeSelectWrap>
                      <TypeSelect
                        aria-label={`소속 유형 ${idx + 1}`}
                        value={row.affiliationType}
                        onChange={(e) =>
                          patchRow(row.key, { affiliationType: e.target.value })
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
                    <DateField>
                      <DateLabel>시작</DateLabel>
                      <DateInput
                        type="date"
                        value={row.startDate ?? ''}
                        onChange={(e) =>
                          patchRow(row.key, {
                            startDate: e.target.value || undefined,
                          })
                        }
                      />
                    </DateField>
                    <DateField>
                      <DateLabel>종료</DateLabel>
                      <DateInput
                        type="date"
                        value={row.endDate ?? ''}
                        onChange={(e) =>
                          patchRow(row.key, {
                            endDate: e.target.value || undefined,
                          })
                        }
                      />
                    </DateField>
                    <NoteInput
                      type="text"
                      placeholder="비고 (선택)"
                      value={row.note ?? ''}
                      onChange={(e) =>
                        patchRow(row.key, { note: e.target.value || undefined })
                      }
                    />
                  </RowBottom>
                </RowCard>
              ))}
            </RowList>
          )}

          <AddBtn type="button" onClick={addRow}>
            <FiPlus size={16} />
            소속 추가
          </AddBtn>
        </ControlWide>
      </FieldRow>
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
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
`

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const RowCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
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
  font-size: 13px;
  color: #111827;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

const SelectCaret = styled.span`
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  pointer-events: none;
  color: #9ca3af;
  display: inline-flex;
`

const RemoveBtn = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #f0d2d2;
  border-radius: 8px;
  background: #fff;
  color: #dc2626;
  cursor: pointer;
  &:hover {
    background: #fef2f2;
  }
`

const RowBottom = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const DateField = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const DateLabel = styled.span`
  font-size: 12px;
  color: #6b7280;
`

const DateInput = styled.input`
  padding: 7px 8px;
  font-size: 13px;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

const NoteInput = styled.input`
  flex: 1 1 140px;
  min-width: 0;
  padding: 7px 10px;
  font-size: 13px;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

const AddBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: #e0e7ff;
  }
`
