/**
 * 인물 등록/수정 폼의 "국가 소속(다중)" 입력.
 * - 주 국적(countryId)과 별개로 출생지·복무·망명·이중국적 등 여러 소속을 행 단위로 추가/삭제.
 * - 추가는 아래 검색 칸에서 국가를 고르는 한 동작(고르면 그 국가로 행이 생긴다).
 * - 국가 선택은 칸 안에서 검색하는 드롭다운(InlineSearchSelect) — 주 국적 칸과 같은 옵션(country-search-options).
 *   예전엔 행마다 국가 피커 모달을 왕복했다. 행에 기간이 있으면 그 시기, 없으면 생몰년 시기의 역사국가가 앞에 온다.
 * - 시작/종료일은 폼 전역과 동일한 공용 DatePickerModal(era 인식)로 통일.
 *   · 서버 DTO가 @IsDateString(ISO, AD)이라 BC 확장연도(`-YYYY-...`)는 저장 불가 →
 *     모달에서 BC를 고르면 차단·안내한다. (BC 지원은 백엔드 date 포맷 완화가 선행돼야 함)
 */
import React, { useEffect, useMemo, useState } from 'react'

import { FiTrash2, FiCalendar, FiAlertCircle, FiInfo } from 'react-icons/fi'
import styled from 'styled-components'

import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { type CountryHintYearRange } from '@/shared/lib/country-picker-filter'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  FieldLabel,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import {
  FieldError,
  FONT,
  RADIUS,
  inputFocusMixin,
  mobileInputFontMixin,
} from '../_form-primitives'
import {
  buildCountrySearchOptions,
  COUNTRY_OPTION_LIMIT,
  type CountryOptionSource,
  encodeCountryValue,
} from '../country-search-options'

import { InlineSearchSelect } from './inline-search-select'

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
  /**
   * 우선순위 — 폼 편집 UI는 없지만 수정 왕복 시 보존(미보존 시 서버가 전부 1로 평탄화).
   * 0은 주 국적 슬롯이라 이 행 목록에는 들어오지 않음.
   */
  priority?: number
}

/** Prisma PersonCountryAffiliationType 미러 — 라벨은 상세 패널과 통일 */
export const AFFILIATION_TYPE_OPTIONS: ReadonlyArray<{
  value: string
  label: string
}> = [
  { value: 'CITIZENSHIP', label: '국적/시민권' },
  { value: 'BIRTH_PLACE', label: '출생 국가' },
  { value: 'PRIMARY_RESIDENCE', label: '거주/활동지' },
  { value: 'SERVED', label: '복무/봉사' },
  { value: 'EXILE', label: '망명' },
  { value: 'OTHER', label: '기타' },
]

let rowSeq = 0
/**
 * 행 key 발급 — 모듈 카운터에 랜덤 suffix를 더해, draft 복원으로 이전 세션의 키가
 * 그대로 들어와도(스냅샷에 key 직렬화됨) 새 행과 충돌하지 않게 한다.
 * key가 중복되면 patchRow/removeRow가 두 행에 같이 적용되는 오동작이 생김.
 */
export function makeAffiliationRow(
  partial?: Partial<CountryAffiliationRow>,
): CountryAffiliationRow {
  rowSeq += 1
  return {
    key: `aff-${rowSeq}-${Math.random().toString(36).slice(2, 8)}`,
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
/** '1773-09-01' → '1773.09.01', '-0044-03-15' → '기원전 44.03.15' */
const fmtDate = (iso?: string) => {
  const parts = parseIsoDateParts(iso)
  if (!parts) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  const yearText = parts.year < 0 ? `기원전 ${-parts.year}` : String(parts.year)
  return `${yearText}.${pad(parts.month)}.${pad(parts.day)}`
}

/** 시작 > 종료 — 부호 연-월-일 비교(문자열 비교는 기원전에서 거꾸로 나온다) */
const isReversed = (start?: string, end?: string) => {
  const startKey = dateSortKey(start)
  const endKey = dateSortKey(end)
  return startKey != null && endKey != null && startKey > endKey
}

/**
 * 행 검증 — 저장 전 사용자에게 보일 사유.
 * · 국가 미선택인데 날짜/비고가 있으면 저장 시 조용히 버려지므로 경고.
 * · 시작 > 종료면 기간 오류. (AD ISO는 사전식 비교로 충분)
 */
function rowError(row: CountryAffiliationRow): string | null {
  if (hasDataButNoCountry(row)) return '국가를 선택해야 이 소속이 저장됩니다.'
  if (isReversed(row.startDate, row.endDate))
    return '종료일이 시작일보다 빠릅니다.'
  return null
}

/**
 * 제출 차단용 — 종료일이 시작일보다 빠른 행이 하나라도 있으면 true.
 * (국가 미선택 행은 buildPayload가 조용히 걸러내므로 차단 대상에서 제외 — 인라인 경고만)
 */
export function hasAffiliationDateError(
  rows: CountryAffiliationRow[],
): boolean {
  return rows.some(
    (row) => isReversed(row.startDate, row.endDate),
  )
}

/** 유형 드롭다운 옵션 — 국가 칸과 같은 콤보박스(예전엔 네이티브 select라 다크·높이가 따로 놀았다) */
const AFFILIATION_TYPE_SEARCH_OPTIONS = AFFILIATION_TYPE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}))

/**
 * 소속 행의 국가 칸 — 그 행의 기간이 있으면 그 시기, 없으면 생몰년 시기의 역사국가를 앞으로.
 * 행마다 옵션을 따로 만든다(기간이 행마다 다르다).
 */
function AffiliationCountrySelect({
  id,
  ariaLabel,
  row,
  modernCountries,
  historicalCountries,
  lifespanHint,
  primaryCountryValue,
  error,
  onPick,
}: {
  id: string
  ariaLabel: string
  row: CountryAffiliationRow
  modernCountries: ReadonlyArray<CountryOptionSource>
  historicalCountries: ReadonlyArray<CountryOptionSource>
  lifespanHint: CountryHintYearRange | null
  primaryCountryValue: string
  error: boolean
  onPick: (picked: { id: string; name: string; isHistorical: boolean } | null) => void
}) {
  const rowStart = signedYearFromIsoLike(row.startDate)
  const rowEnd = signedYearFromIsoLike(row.endDate)
  const options = useMemo(() => {
    const hint = rowStart != null || rowEnd != null ? { startYear: rowStart, endYear: rowEnd } : lifespanHint
    return buildCountrySearchOptions(modernCountries, historicalCountries, hint, { primaryValue: primaryCountryValue })
  }, [modernCountries, historicalCountries, lifespanHint, primaryCountryValue, rowStart, rowEnd])
  return (
    <InlineSearchSelect
      id={id}
      ariaLabel={ariaLabel}
      placeholder="국가 검색 (현대·역사)"
      options={options}
      value={encodeCountryValue(row)}
      selectedLabelFallback={row.countryLabel}
      limit={COUNTRY_OPTION_LIMIT}
      error={error}
      ariaInvalid={error}
      onChange={(next) => {
        if (!next) {
          onPick(null)
          return
        }
        const picked = options.find((option) => option.value === next)
        if (picked) onPick({ id: picked.id, name: picked.name, isHistorical: picked.isHistorical })
      }}
    />
  )
}

export interface CountryAffiliationsSectionProps {
  fid: (key: string) => string
  rows: CountryAffiliationRow[]
  setRows: React.Dispatch<React.SetStateAction<CountryAffiliationRow[]>>
  /** 국가 목록 — 주 국적 칸과 같은 원본 */
  modernCountries: ReadonlyArray<CountryOptionSource>
  historicalCountries: ReadonlyArray<CountryOptionSource>
  /** 생몰년 시기 — 기간 없는 행의 국가 정렬 힌트 */
  lifespanHint: CountryHintYearRange | null
  /** 주 국적 값('m:'/'h:') — 목록에 '주 국적' 표지, 같은 국가를 국적/시민권으로 또 적으면 안내 */
  primaryCountryValue: string
  /** 시작/종료일 피커 열림 여부 보고 — 부모의 ⌘Enter 제출 가드(anyModalOpen)에 포함용 */
  onDateModalOpenChange?: (open: boolean) => void
  markDirty: () => void
}

export function CountryAffiliationsSection({
  fid,
  rows,
  setRows,
  modernCountries,
  historicalCountries,
  lifespanHint,
  primaryCountryValue,
  onDateModalOpenChange,
  markDirty,
}: CountryAffiliationsSectionProps) {
  /** 현재 열려 있는 날짜 모달 대상 (행 key + 어떤 필드). null이면 닫힘. */
  const [dateModal, setDateModal] = useState<{
    rowKey: string
    field: 'startDate' | 'endDate'
  } | null>(null)

  // 열림/닫힘의 모든 경로(선택·취소·BC 차단)를 한 곳에서 부모에 보고.
  // cleanup으로 섹션 언마운트("더 입력" 접힘 등) 시에도 닫힘으로 복원.
  useEffect(() => {
    onDateModalOpenChange?.(dateModal !== null)
    return () => onDateModalOpenChange?.(false)
  }, [dateModal, onDateModalOpenChange])
  /** BC 선택 차단 안내를 띄울 행 key */
  const [bcBlockedRow, setBcBlockedRow] = useState<string | null>(null)

  const patchRow = (key: string, patch: Partial<CountryAffiliationRow>) => {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...patch } : row)))
    markDirty()
  }
  const removeRow = (key: string) => {
    setRows((previous) => previous.filter((row) => row.key !== key))
    markDirty()
  }
  /*
   * 추가 = 국가를 고르는 것. 예전엔 '소속 추가'로 빈 행을 만든 뒤 그 행의 국가 칸이 저절로 열렸고,
   * 열린 목록이 바로 아래 날짜·메모 칸을 덮었다(행을 둘 만들면 목록 둘이 겹쳤다).
   * 이제 아래 검색 칸에서 국가를 고르면 그 국가로 행이 생기고, 칸은 비워져 다음 국가를 바로 받는다.
   */
  const addOptions = useMemo(
    () =>
      buildCountrySearchOptions(modernCountries, historicalCountries, lifespanHint, {
        primaryValue: primaryCountryValue,
      }),
    [modernCountries, historicalCountries, lifespanHint, primaryCountryValue],
  )
  /**
   * 방금 만든 행 — 그 행의 '유형' 칸으로 포커스를 넘긴다(칸이 포커스에서 열려 출생·복무·망명… 목록이 바로 뜬다).
   * 국가를 고른 다음 할 일이 유형 고르기인데, 예전엔 커서가 아래 추가 칸에 남아 마우스로 올라가야 했다.
   */
  const [focusTypeRowKey, setFocusTypeRowKey] = useState<string | null>(null)
  useEffect(() => {
    if (!focusTypeRowKey) return
    document.getElementById(fid(`aff-type-${focusTypeRowKey}`))?.focus()
    setFocusTypeRowKey(null)
  }, [focusTypeRowKey, fid])

  const addRowWithCountry = (value: string) => {
    const picked = addOptions.find((option) => option.value === value)
    if (!picked) return
    const row = makeAffiliationRow({
      countryId: picked.isHistorical ? undefined : picked.id,
      historicalCountryId: picked.isHistorical ? picked.id : undefined,
      countryLabel: picked.name,
    })
    setRows((prev) => [...prev, row])
    setFocusTypeRowKey(row.key)
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
          {rows.length > 0 && (
            <RowList>
              {rows.map((row, idx) => {
                const err = rowError(row)
                const missingCountry = hasDataButNoCountry(row)
                // 제출 차단 대상(종료<시작)인 행만 날짜 버튼에 aria-invalid 표시 —
                // 제출 실패 시 폼의 첫 [aria-invalid] 스크롤이 이 행을 잡도록.
                const dateInvalid =
                  isReversed(row.startDate, row.endDate)
                return (
                  <RowCard key={row.key} $invalid={!!err}>
                    <RowTop>

                      <CountryCell>
                        <AffiliationCountrySelect
                          id={fid(`aff-country-${row.key}`)}
                          ariaLabel={`소속 ${idx + 1} 국가`}
                          row={row}
                          modernCountries={modernCountries}
                          historicalCountries={historicalCountries}
                          lifespanHint={lifespanHint}
                          primaryCountryValue={primaryCountryValue}
                          error={missingCountry}
                          onPick={(picked) =>
                            patchRow(
                              row.key,
                              picked
                                ? {
                                    countryId: picked.isHistorical ? undefined : picked.id,
                                    historicalCountryId: picked.isHistorical ? picked.id : undefined,
                                    countryLabel: picked.name,
                                  }
                                : { countryId: undefined, historicalCountryId: undefined, countryLabel: '' },
                            )
                          }
                        />
                      </CountryCell>

                      <TypeCell>
                        <InlineSearchSelect
                          id={fid(`aff-type-${row.key}`)}
                          ariaLabel={`소속 유형 ${idx + 1}`}
                          options={AFFILIATION_TYPE_SEARCH_OPTIONS}
                          value={row.affiliationType}
                          clearable={false}
                          onChange={(next) => next && patchRow(row.key, { affiliationType: next })}
                        />
                      </TypeCell>

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
                        aria-invalid={dateInvalid}
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
                        aria-invalid={dateInvalid}
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
                        aria-label={`소속 ${idx + 1} 메모`}
                        placeholder="메모 (선택)"
                        value={row.note ?? ''}
                        onChange={(e) =>
                          patchRow(row.key, {
                            note: e.target.value || undefined,
                          })
                        }
                      />
                    </RowBottom>

                    {row.affiliationType === 'CITIZENSHIP' &&
                      primaryCountryValue &&
                      encodeCountryValue(row) === primaryCountryValue && (
                        <RowNotice>
                          <FiInfo size={13} />
                          주 국적과 같은 국가입니다 — 기간이 다른 국적이 아니면 이 행은 없어도 됩니다.
                        </RowNotice>
                      )}
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

          {rows.length === 0 && (
            <EmptyHint>
              출생지·거주지·복무·망명·이중국적처럼 주 국적 밖의 소속을 기간과 함께 적습니다.
            </EmptyHint>
          )}
          <AddCountryBox>
            <InlineSearchSelect
              id={fid('countryAffiliations')}
              ariaLabel="소속 추가 — 국가 검색"
              placeholder={rows.length > 0 ? '+ 국가를 더 검색해 추가' : '+ 국가를 검색해 소속 추가 (현대·역사)'}
              options={addOptions}
              value=""
              limit={COUNTRY_OPTION_LIMIT}
              onChange={(next) => next && addRowWithCountry(next)}
            />
          </AddCountryBox>
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

/* 추가 검색 칸 — 행 카드와 같은 폭, 빈 칸이 행보다 튀지 않게 옅은 점선 대신 기본 칸 그대로 */
const AddCountryBox = styled.div`
  max-width: 100%;
`

const ControlWide = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
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

/* 국가 · 유형 · 삭제 — 무엇(국가)이 먼저, 어떤 관계(유형)가 뒤. 좁은 폭에선 국가 전체 폭 위, 유형·삭제 아래 */
const RowTop = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px auto;
  grid-template-areas: 'country type remove';
  align-items: center;
  gap: 8px;

  & > button {
    grid-area: remove;
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'country country'
      'type remove';
  }
`

const TypeCell = styled.div`
  grid-area: type;
  min-width: 0;
`

const CountryCell = styled.div`
  grid-area: country;
  min-width: 0;
`

const RowNotice = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const EmptyHint = styled.p`
  margin: 0;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RemoveBtn = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 41px;
  height: 41px;
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
  /* 아래 줄 칸 높이 통일(날짜·메모 36px) */
  box-sizing: border-box;
  min-height: 36px;
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
  box-sizing: border-box;
  min-height: 36px;
  padding: 7px 10px;
  font-size: ${FONT.label};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  ${mobileInputFontMixin}
  ${({ theme }) => inputFocusMixin(theme)}
`

