/**
 * 군주 재위 기간 ↔ 사건 기간 겹침 판정 (사건 목록의 '재위 중' 표시).
 *
 * 날짜는 전부 `부호연도×10000 + 월×100 + 일` 정수 키로 비교한다(iso-date의 dateSortKey와
 * 같은 규약). 네이티브 Date는 BC·연도<100에서 부호 소실/오연도를 내므로 쓰지 않는다.
 *
 * 정밀도가 낮은 끝점은 **넓게** 해석한다 — 연도만 아는 즉위는 그 해 1월 1일부터,
 * 연도만 아는 퇴위는 그 해 12월 31일까지. 연도만 아는 사건(01-01 sentinel)도 같은 규칙으로
 * 그 해 전체로 본다. 그래야 '1418년 즉위'와 '1418년 사건'이 겹침으로 잡힌다.
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'

/** 'BC' | 'AD' — 서버 enum 문자열 */
type EraValue = string | null | undefined

/** 인물 상세 응답(`GET /persons/:id/detail`)의 sovereignReigns 항목 중 여기서 쓰는 필드 */
export interface SovereignReignDateFields {
  id: string
  startDate?: string | null
  startDatePrecision?: string | null
  startEra?: EraValue
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endDate?: string | null
  endDatePrecision?: string | null
  endEra?: EraValue
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  regnalName?: string | null
  country?: { name?: string | null } | null
  historicalCountry?: { name?: string | null } | null
}

/** 재위 종료가 기록되지 않았을 때의 폴백 — 인물 사망일 */
export interface PersonDeathFields {
  isAlive?: boolean | null
  deathDate?: string | null
  deathDatePrecision?: string | null
  deathEra?: EraValue
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
}

export interface ReignPeriod {
  id: string
  /** 포함 하한 키 */
  startKey: number
  /** 포함 상한 키 — 현직(종료·사망 모두 미상)이면 +Infinity */
  endKey: number
  /** 부호 연도 — 라벨용 */
  startYear: number
  endYear: number | null
  /** 재위명(없으면 null) — 한 인물이 여러 나라를 다스린 경우 구별용 */
  regnalName: string | null
  countryName: string | null
}

interface DateParts {
  year: number
  month: number | null
  day: number | null
}

const signedYear = (year: number, era: EraValue) =>
  era === 'BC' ? -Math.abs(year) : year

/**
 * 구조화 축(Era/Year/Month/Day)이 우선, 없으면 DATETIME 컬럼.
 * 정밀도가 'year'/'month'면 모르는 부분은 null로 돌려 호출부가 넓게 채우게 한다.
 */
function resolveParts(
  era: EraValue,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  iso: string | null | undefined,
  precision: string | null | undefined,
): DateParts | null {
  if (year != null) {
    return {
      year: signedYear(year, era),
      month: precision === 'year' ? null : (month ?? null),
      day: precision === 'year' || precision === 'month' ? null : (day ?? null),
    }
  }
  const parsed = parseIsoDateParts(iso)
  if (!parsed) return null
  return {
    year: parsed.year,
    month: precision === 'year' ? null : parsed.month,
    day: precision === 'year' || precision === 'month' ? null : parsed.day,
  }
}

const lowerKey = (parts: DateParts) =>
  parts.year * 10000 + (parts.month ?? 1) * 100 + (parts.day ?? 1)

const upperKey = (parts: DateParts) =>
  parts.year * 10000 + (parts.month ?? 12) * 100 + (parts.day ?? 31)

/**
 * 인물의 재위 기록 → 비교 가능한 기간 목록. 즉위일을 전혀 모르는 기록은 판정 불가라 뺀다.
 * 퇴위일이 없으면 사망일로 닫고, 둘 다 없으면(현직 또는 미상) 열린 구간으로 둔다.
 */
export function toReignPeriods(
  reigns: SovereignReignDateFields[] | null | undefined,
  person?: PersonDeathFields | null,
): ReignPeriod[] {
  if (!reigns?.length) return []
  const deathParts = person
    ? resolveParts(
        person.deathEra,
        person.deathYear,
        person.deathMonth,
        person.deathDay,
        person.deathDate,
        person.deathDatePrecision,
      )
    : null

  const periods: ReignPeriod[] = []
  for (const reign of reigns) {
    const start = resolveParts(
      reign.startEra,
      reign.startYear,
      reign.startMonth,
      reign.startDay,
      reign.startDate,
      reign.startDatePrecision,
    )
    if (!start) continue
    const end =
      resolveParts(
        reign.endEra,
        reign.endYear,
        reign.endMonth,
        reign.endDay,
        reign.endDate,
        reign.endDatePrecision,
      ) ?? (person?.isAlive ? null : deathParts)

    periods.push({
      id: reign.id,
      startKey: lowerKey(start),
      endKey: end ? upperKey(end) : Number.POSITIVE_INFINITY,
      startYear: start.year,
      endYear: end?.year ?? null,
      regnalName: reign.regnalName?.trim() || null,
      countryName:
        reign.historicalCountry?.name ?? reign.country?.name ?? null,
    })
  }
  return periods.sort((left, right) => left.startKey - right.startKey)
}

/** 사건 기간(ISO + 정밀도) → [하한, 상한] 키. 시작을 모르면 null. */
export function eventRangeKeys(period: {
  start: string
  end?: string
  startPrecision?: string | null
  endPrecision?: string | null
}): [number, number] | null {
  const start = parseIsoDateParts(period.start)
  if (!start) return null
  /** 연도만 아는 값이 01-01 sentinel로 저장된 경우 — 목록 행 표시와 같은 해석 */
  const startIsYearOnly =
    period.startPrecision === 'year' ||
    (period.startPrecision == null && start.month === 1 && start.day === 1)
  const startParts: DateParts = {
    year: start.year,
    month: startIsYearOnly ? null : start.month,
    day:
      startIsYearOnly || period.startPrecision === 'month' ? null : start.day,
  }

  const end = parseIsoDateParts(period.end)
  let endParts: DateParts
  if (end) {
    const endIsYearOnly =
      period.endPrecision === 'year' ||
      (period.endPrecision == null && end.month === 1 && end.day === 1)
    endParts = {
      year: end.year,
      month: endIsYearOnly ? null : end.month,
      day: endIsYearOnly || period.endPrecision === 'month' ? null : end.day,
    }
  } else {
    endParts = startParts
  }
  const lower = lowerKey(startParts)
  const upper = Math.max(upperKey(endParts), lower)
  return [lower, upper]
}

/** 사건 기간과 겹치는 첫 재위 — 없으면 null */
export function findOverlappingReign(
  range: [number, number] | null,
  periods: ReignPeriod[],
): ReignPeriod | null {
  if (!range) return null
  const [lower, upper] = range
  return (
    periods.find(
      (period) => lower <= period.endKey && upper >= period.startKey,
    ) ?? null
  )
}

const formatSignedYear = (year: number) =>
  year < 0 ? `BC ${-year}` : String(year)

/** '1418–1450' / 'BC 221–BC 210' / '1952–' (현직·미상) */
export function formatReignSpan(period: ReignPeriod): string {
  const start = formatSignedYear(period.startYear)
  const end = period.endYear == null ? '' : formatSignedYear(period.endYear)
  return `${start}–${end}`
}
