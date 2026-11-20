import type {
  MilitaryUnitDatePartsDto,
  MilitaryUnitLineageDto,
  MilitaryUnitTenureItem,
} from '@/shared/api/military-unit'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'

import { MILITARY_ECHELON_ORDER } from './constants'

export function extractUnitSignedYear(
  parts: MilitaryUnitDatePartsDto | null | undefined,
  isoValue: string | null | undefined,
): number | null {
  if (parts && typeof parts.year === 'number' && parts.year > 0) {
    return parts.era === 'BC' ? -Math.abs(parts.year) : parts.year
  }
  const parsed = parseSignedDateParts(isoValue)
  return parsed ? parsed.signedYear : null
}

export function formatUnitDateParts(
  parts: MilitaryUnitDatePartsDto | null | undefined,
  isoValue: string | null | undefined,
): string {
  if (parts && typeof parts.year === 'number' && parts.year > 0) {
    const prefix = parts.era === 'BC' ? 'BC ' : ''
    const monthPart =
      parts.month != null ? `.${String(parts.month).padStart(2, '0')}` : ''
    const dayPart =
      parts.month != null && parts.day != null
        ? `.${String(parts.day).padStart(2, '0')}`
        : ''
    return `${prefix}${parts.year}${monthPart}${dayPart}`
  }
  if (isoValue) {
    const parsed = parseSignedDateParts(isoValue)
    if (parsed) {
      const prefix = parsed.signedYear < 0 ? 'BC ' : ''
      const absYear = Math.abs(parsed.signedYear)
      return `${prefix}${absYear}.${String(parsed.month).padStart(2, '0')}.${String(parsed.day).padStart(2, '0')}`
    }
    return isoValue.slice(0, 10)
  }
  return ''
}

export function formatUnitPeriodSpan(unit: {
  established?: MilitaryUnitDatePartsDto | null
  disbanded?: MilitaryUnitDatePartsDto | null
  establishedDate?: string | null
  disbandedDate?: string | null
  isActive?: boolean | null
}): {
  estLabel: string
  disLabel: string
  isDisbanded: boolean
  periodLabel: string
} {
  const estLabel = formatUnitDateParts(unit.established, unit.establishedDate)
  const disLabel = formatUnitDateParts(unit.disbanded, unit.disbandedDate)
  const isDisbanded = unit.isActive === false || Boolean(disLabel)
  const periodLabel =
    estLabel || disLabel
      ? `${estLabel || '?'} ~ ${disLabel || (unit.isActive === false ? '해체' : '현재')}`
      : unit.isActive === false
        ? '해체 (연도 미상)'
        : '연도 미등록'
  return { estLabel, disLabel, isDisbanded, periodLabel }
}

export function parseSnapshotYearInput(rawInput: string): number | null {
  const trimmed = rawInput.trim()
  if (!trimmed) return null
  const bcMatch = /^(?:bc|기원전)\s*(\d{1,5})$/i.exec(trimmed)
  if (bcMatch) {
    const abs = Number(bcMatch[1])
    return abs > 0 ? -abs : null
  }
  const numMatch = /^([+-]?\d{1,5})$/.exec(trimmed)
  if (numMatch) {
    const val = Number(numMatch[1])
    return Number.isFinite(val) && val !== 0 ? val : null
  }
  return null
}

export function formatSignedYearKo(signedYear: number): string {
  return signedYear < 0 ? `BC ${Math.abs(signedYear)}년` : `${signedYear}년`
}

export function formatTransitionTimeLabel(
  item: Pick<MilitaryUnitLineageDto, 'era' | 'year' | 'month'>,
): string | null {
  if (!item.year || item.year <= 0) return null
  const prefix = item.era === 'BC' ? 'BC ' : ''
  const monthPart =
    item.month != null ? `.${String(item.month).padStart(2, '0')}` : ''
  return `${prefix}${item.year}${monthPart}`
}

export function formatTenureDatePart(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  isoFallback: string | null | undefined,
): string {
  if (year && year > 0) {
    const prefix = era === 'BC' ? 'BC ' : ''
    const monthPart = month != null ? `.${String(month).padStart(2, '0')}` : ''
    const dayPart =
      month != null && day != null ? `.${String(day).padStart(2, '0')}` : ''
    return `${prefix}${year}${monthPart}${dayPart}`
  }
  if (isoFallback) {
    return isoFallback.slice(0, 10).replace(/-/g, '.')
  }
  return ''
}

export function formatTenureSpan(tenure: MilitaryUnitTenureItem): string {
  const startStr = formatTenureDatePart(
    tenure.startEra,
    tenure.startYear,
    tenure.startMonth,
    tenure.startDay,
    tenure.startDate,
  )
  const endStr = formatTenureDatePart(
    tenure.endEra,
    tenure.endYear,
    tenure.endMonth,
    tenure.endDay,
    tenure.endDate,
  )
  if (startStr && endStr) return `${startStr} ~ ${endStr}`
  if (startStr) return `${startStr} ~`
  if (endStr) return `~ ${endStr}`
  return '기간 미상'
}

export function getCommanderChronologyKey(
  tenure: MilitaryUnitTenureItem,
): number {
  if (tenure.startYear && tenure.startYear > 0) {
    const signedYr =
      tenure.startEra === 'BC' ? -Math.abs(tenure.startYear) : tenure.startYear
    return (
      signedYr * 10_000 +
      (tenure.startMonth ?? 1) * 100 +
      (tenure.startDay ?? 1)
    )
  }
  if (tenure.startDate) {
    const parsed = parseSignedDateParts(tenure.startDate)
    if (parsed) {
      return parsed.signedYear * 10_000 + parsed.month * 100 + parsed.day
    }
  }
  if (tenure.ordinal != null) {
    return 900_000_000 + tenure.ordinal
  }
  return Number.MAX_SAFE_INTEGER
}

export function formatStructuredEventSpan(ev: {
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
}): string {
  const formatPoint = (
    era?: string | null,
    yr?: number | null,
    mo?: number | null,
    dy?: number | null,
  ) => {
    if (!yr || yr <= 0) return null
    const prefix = era === 'BC' ? 'BC ' : ''
    const monthPart = mo != null ? `.${String(mo).padStart(2, '0')}` : ''
    const dayPart =
      mo != null && dy != null ? `.${String(dy).padStart(2, '0')}` : ''
    return `${prefix}${yr}${monthPart}${dayPart}`
  }
  const startPoint = formatPoint(
    ev.startEra,
    ev.startYear,
    ev.startMonth,
    ev.startDay,
  )
  const endPoint = formatPoint(ev.endEra, ev.endYear, ev.endMonth, ev.endDay)
  if (startPoint && endPoint && startPoint !== endPoint) {
    return `${startPoint} ~ ${endPoint}`
  }
  return startPoint ?? endPoint ?? '연도 미상'
}

export function sortUnitsByEchelon<
  T extends { unitType?: string | null; name: string },
>(units: ReadonlyArray<T>): T[] {
  return [...units].sort((leftUnit, rightUnit) => {
    const leftRank = leftUnit.unitType
      ? (MILITARY_ECHELON_ORDER[leftUnit.unitType] ?? 50)
      : 50
    const rightRank = rightUnit.unitType
      ? (MILITARY_ECHELON_ORDER[rightUnit.unitType] ?? 50)
      : 50
    if (leftRank !== rightRank) return leftRank - rightRank
    return leftUnit.name.localeCompare(rightUnit.name, 'ko')
  })
}
