/**
 * 구조화 날짜 입력(era + 크기값 연/월/일) → 저장용 6값(DateTime + era + precision + year/month/day).
 *
 * person.controller의 mapSpouseDateInput/buildUtcDateFromParts 로직을 공용화한 것 —
 * 배우자 혼인일과 동일한 계약으로 재위(SovereignReign) 등 다른 도메인도 BC·고대·연단위를 저장한다.
 *
 * 규약(스푸스 선례 동형):
 * - year는 *크기값*(양수), BC/AD는 era로 구분.
 * - DateTime은 AD 1000~9999 완전일자만 채운다 — MySQL DATETIME 공식 범위 밖은 드라이버가
 *   2자리 연도 규칙(44→2044)·pre-standard TZ 드리프트로 조용히 손상시키므로 구조화 Int가 진실.
 * - 네이티브 `new Date(iso)` 문자열 파싱 금지(BC '-0044-…'가 AD 2044로 둔갑) — 직접 파싱.
 */
export function buildUtcDateFromParts(
  year: number,
  month?: number,
  day?: number,
): Date {
  const date = new Date(Date.UTC(2000, (month || 1) - 1, day || 1))
  date.setUTCFullYear(year)
  return date
}

export interface StructuredDateResult {
  date: Date | null
  era: 'BC' | 'AD' | null
  precision: string | null
  year: number | null
  month: number | null
  day: number | null
}

export function mapStructuredDateInput(
  structured:
    | { era: 'BC' | 'AD'; year: number; month?: number; day?: number }
    | null
    | undefined,
  legacyIso: string | null | undefined,
): StructuredDateResult {
  const fromParts = (
    era: 'BC' | 'AD',
    year: number,
    month?: number,
    rawDay?: number,
  ): StructuredDateResult => {
    // 월 없는 일은 버림(정밀도 사다리) — precision='year'인데 day 컬럼이 찬 모순 행 방지.
    const day = month == null ? undefined : rawDay
    return {
      date:
        era === 'AD' && year >= 1000 && year <= 9999
          ? buildUtcDateFromParts(year, month, day)
          : null,
      era,
      precision: month == null ? 'year' : day == null ? 'month' : 'day',
      year,
      month: month ?? null,
      day: day ?? null,
    }
  }
  if (structured) {
    return fromParts(
      structured.era,
      structured.year,
      structured.month,
      structured.day,
    )
  }
  if (legacyIso) {
    const neg = legacyIso.startsWith('-')
    const match = (neg ? legacyIso.slice(1) : legacyIso).match(
      /^(\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/,
    )
    const year = match ? parseInt(match[1], 10) : 0
    if (match && year) {
      return fromParts(
        neg ? 'BC' : 'AD',
        year,
        match[2] ? parseInt(match[2], 10) : undefined,
        match[3] ? parseInt(match[3], 10) : undefined,
      )
    }
  }
  return { date: null, era: null, precision: null, year: null, month: null, day: null }
}

/**
 * 명시 정밀도를 결과에 적용 — 연보처럼 ISO(항상 일자까지)와 정밀도를 따로 받는 입력용.
 * 'year'면 월·일을, 'month'면 일을 비우고 DATETIME(서기 1000~9999만)을 다시 만든다.
 */
export function applyDatePrecision(
  result: StructuredDateResult,
  precision: string | null | undefined,
): StructuredDateResult {
  if (!precision || result.year == null || result.era == null) return result
  const month = precision === 'year' ? null : result.month
  const day = precision === 'day' ? result.day : null
  return {
    ...result,
    month,
    day,
    precision,
    date:
      result.era === 'AD' && result.year >= 1000 && result.year <= 9999
        ? buildUtcDateFromParts(result.year, month ?? undefined, day ?? undefined)
        : null,
  }
}

/**
 * 구조화 날짜 → 부호 날짜 문자열('1773-09-01', '-0044-03-15'). 모르는 월·일은 01.
 * 응답용 — 웹은 앞의 연-월-일을 그대로 떼어 쓴다(BC·TZ 안전).
 */
export function toSignedDateString(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): string | null {
  if (year == null) return null
  const pad = (value: number, width: number) => String(value).padStart(width, '0')
  return `${era === 'BC' ? '-' : ''}${pad(year, 4)}-${pad(month ?? 1, 2)}-${pad(day ?? 1, 2)}`
}

/** 구조화 날짜 → 비교 키(부호 연·월·일). 연도 모르면 null */
export function structuredDateKey(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): number | null {
  if (year == null) return null
  const signed = era === 'BC' ? -year : year
  return signed * 10000 + (month ?? 1) * 100 + (day ?? 1)
}
