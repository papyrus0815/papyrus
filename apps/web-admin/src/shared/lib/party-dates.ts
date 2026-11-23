/**
 * 정당 날짜 — 구조화 칸(era/year/month/day)이 진실, foundedDate/dissolvedDate(DATETIME)는 AD1000+ 거울.
 *
 * 화면은 이 파일만 거친다. 거울을 직접 읽으면 '1913년'(연 정밀)이 '1913년 1월 1일'로 보이고,
 * 기원전 정당(옵티마테스)은 날짜가 아예 없는 것처럼 보인다.
 *
 * 값 모양은 부분 정밀 부호 문자열('1921-11-09' | '1913' | '-0133') — partial-date-string과 같은 규약.
 */
import { formatDateWithPrecision } from './iso-date'
import { partialDateFromStructured, partialDateToDateInfo } from './partial-date-string'

interface PartyDateFields {
  foundedEra?: string | null
  foundedYear?: number | null
  foundedMonth?: number | null
  foundedDay?: number | null
  foundedDate?: string | null
  dissolvedEra?: string | null
  dissolvedYear?: number | null
  dissolvedMonth?: number | null
  dissolvedDay?: number | null
  dissolvedDate?: string | null
}

interface PeriodFields {
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  isCurrent?: boolean | null
}

/** 거울 DATETIME → 부분 문자열(구조화 칸이 없던 응답 호환) */
function fromMirror(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

/** 창당일(부분 정밀 부호 문자열). 없으면 '' */
export function partyFoundedOn(party: PartyDateFields): string {
  if (party.foundedYear != null) {
    return partialDateFromStructured(party.foundedYear, party.foundedMonth, party.foundedDay, party.foundedEra)
  }
  return fromMirror(party.foundedDate)
}

/** 해산일(부분 정밀 부호 문자열). 없으면 '' — 비면 활동 중으로 본다 */
export function partyDissolvedOn(party: PartyDateFields): string {
  if (party.dissolvedYear != null) {
    return partialDateFromStructured(party.dissolvedYear, party.dissolvedMonth, party.dissolvedDay, party.dissolvedEra)
  }
  return fromMirror(party.dissolvedDate)
}

export function isPartyDissolved(party: PartyDateFields): boolean {
  return partyDissolvedOn(party) !== ''
}

/** 부분 문자열 → 부호 연도(기원전 음수). 없으면 null */
export function partialSignedYear(partial: string): number | null {
  const info = partialDateToDateInfo(partial)
  if (!info) return null
  return info.era === 'BC' ? -info.year : info.year
}

/** 부분 문자열 → 정렬 키(부호 연·월·일). 없으면 null */
export function partialSortKey(partial: string): number | null {
  const info = partialDateToDateInfo(partial)
  if (!info) return null
  return (info.era === 'BC' ? -info.year : info.year) * 10000 + (info.month ?? 1) * 100 + (info.day ?? 1)
}

/** 부분 문자열 → '1921년 11월 9일' · '1913년' · '기원전 133년'. 없으면 '' */
export function formatPartialDate(partial: string): string {
  const info = partialDateToDateInfo(partial)
  if (!info) return ''
  const precision = info.month == null ? 'year' : info.day == null ? 'month' : 'day'
  const pad = (value: number, width: number) => String(value).padStart(width, '0')
  const signed = `${info.era === 'BC' ? '-' : ''}${pad(info.year, 4)}-${pad(info.month ?? 1, 2)}-${pad(info.day ?? 1, 2)}`
  return formatDateWithPrecision(signed, precision)
}

/** 구조화 기간 → 부분 문자열 쌍 */
export function periodStartOn(fields: PeriodFields): string {
  return fields.startYear != null
    ? partialDateFromStructured(fields.startYear, fields.startMonth, fields.startDay, fields.startEra)
    : ''
}

export function periodEndOn(fields: PeriodFields): string {
  return fields.endYear != null
    ? partialDateFromStructured(fields.endYear, fields.endMonth, fields.endDay, fields.endEra)
    : ''
}

/** 계보(전신·후신)가 일어난 때 — 구조화 칸 우선, 없으면 레거시 ISO 거울 */
export function transitionEffectiveOn(row: {
  effectiveEra?: string | null
  effectiveYear?: number | null
  effectiveMonth?: number | null
  effectiveDay?: number | null
  effectiveDate?: string | null
}): string {
  if (row.effectiveYear != null) {
    return partialDateFromStructured(row.effectiveYear, row.effectiveMonth, row.effectiveDay, row.effectiveEra)
  }
  const iso = row.effectiveDate?.trim()
  return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : ''
}

/**
 * 한 줄 입력 → 구조화 입력. '1955' · '1955-11' · '1955-11-15' · '기원전 133' · '-133'.
 * 빈 문자열은 null(지우기), 못 읽으면 undefined(형식 오류).
 */
export function parseLooseDateText(
  raw: string,
): { era: 'BC' | 'AD'; year: number; month?: number; day?: number } | null | undefined {
  const text = raw.trim()
  if (!text) return null
  const match = /^(?:(기원전|BC)\s*|(-))?(\d{1,4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/i.exec(text)
  if (!match) return undefined
  const value: PeriodDateFormValue = {
    era: match[1] || match[2] ? 'BC' : 'AD',
    year: Number(match[3]),
    month: match[4] ? Number(match[4]) : undefined,
    day: match[5] ? Number(match[5]) : undefined,
  }
  if (value.month != null && (value.month < 1 || value.month > 12)) return undefined
  if (periodDateFormError(value)) return undefined
  return structuredInputOf(value) ?? undefined
}

/** 기간 라벨 — '1928년 ~ 1943년 7월 27일', '1928년 ~ 현재', '~ 1943년', '' */
export function formatPeriodLabel(fields: PeriodFields): string {
  const start = formatPartialDate(periodStartOn(fields))
  const end = fields.isCurrent ? '현재' : formatPartialDate(periodEndOn(fields))
  if (!start && !end) return ''
  if (start && !end) return `${start} ~`
  if (!start) return `~ ${end}`
  return `${start} ~ ${end}`
}

/** 폼 날짜 칸 값({era, year, month, day}) — shared/ui/period-date-field와 같은 모양 */
export interface PeriodDateFormValue {
  era: 'BC' | 'AD' | undefined
  year: number | undefined
  month: number | undefined
  day: number | undefined
}

export const EMPTY_PERIOD_DATE: PeriodDateFormValue = {
  era: undefined,
  year: undefined,
  month: undefined,
  day: undefined,
}

/** 응답 구조화 칸 → 폼 칸 값 */
export function periodDateFormValue(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): PeriodDateFormValue {
  if (year == null) return { ...EMPTY_PERIOD_DATE }
  return {
    era: era === 'BC' ? 'BC' : 'AD',
    year,
    month: month ?? undefined,
    day: month != null ? (day ?? undefined) : undefined,
  }
}

/** 폼 칸 값 → 서버 구조화 입력. 연도가 없으면 null(지우기). 월 없는 일은 버린다 */
export function structuredInputOf(
  value: PeriodDateFormValue,
): { era: 'BC' | 'AD'; year: number; month?: number; day?: number } | null {
  if (value.year == null || !Number.isFinite(value.year) || value.year < 1) return null
  return {
    era: value.era ?? 'AD',
    year: value.year,
    ...(value.month != null ? { month: value.month } : {}),
    ...(value.month != null && value.day != null ? { day: value.day } : {}),
  }
}

/** 폼 칸 값 → 부분 문자열(미리보기·비교용) */
export function partialOfFormValue(value: PeriodDateFormValue): string {
  const input = structuredInputOf(value)
  if (!input) return ''
  return partialDateFromStructured(input.year, input.month, input.day, input.era)
}

/**
 * 폼 칸 값 검증 — 연도 없이 월·일만 친 상태, 없는 날짜. 정상이면 null.
 * 서버도 같은 검사를 하지만, 저장 전에 칸 옆에서 알려 준다.
 */
export function periodDateFormError(value: PeriodDateFormValue): string | null {
  if (value.year == null) {
    return value.month != null || value.day != null ? '연도를 입력하세요.' : null
  }
  if (value.year < 1 || value.year > 9999) return '연도는 1~9999입니다(기원전은 기원 칸에서).'
  if (value.day != null && value.month == null) return '일을 넣으려면 월이 필요합니다.'
  if (value.month != null && value.day != null) {
    const astronomicalYear = value.era === 'BC' ? 1 - value.year : value.year
    const isLeap =
      (astronomicalYear % 4 === 0 && astronomicalYear % 100 !== 0) || astronomicalYear % 400 === 0
    const monthLengths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (value.day < 1 || value.day > monthLengths[value.month - 1]) return '없는 날짜입니다.'
  }
  return null
}

/** 두 폼 값의 역전(끝 < 시작) — 공통 정밀도까지만 비교(미상 월·일로 오판하지 않음) */
export function isPeriodFormInverted(start: PeriodDateFormValue, end: PeriodDateFormValue): boolean {
  const startInput = structuredInputOf(start)
  const endInput = structuredInputOf(end)
  if (!startInput || !endInput) return false
  const signedStart = (startInput.era === 'BC' ? -1 : 1) * startInput.year
  const signedEnd = (endInput.era === 'BC' ? -1 : 1) * endInput.year
  if (signedEnd !== signedStart) return signedEnd < signedStart
  if (startInput.month == null || endInput.month == null) return false
  if (endInput.month !== startInput.month) return endInput.month < startInput.month
  if (startInput.day == null || endInput.day == null) return false
  return endInput.day < startInput.day
}
