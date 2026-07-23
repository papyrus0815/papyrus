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
