/**
 * 시간축 좌표 변환 유틸. 시간축은 Date 기반이지만 화면엔 연 단위로 충분하므로
 * `julianYear`(소수점 연도)로 정규화해 픽셀에 매핑한다.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DAYS_PER_YEAR = 365.2425

/**
 * Date 또는 ISO 문자열을 "소수점 연도"로 변환 — 1969-07-20 → 1969.55…
 * BC를 음수로 표기 (BC 1년 → 0, BC 2년 → -1, …) — JS Date는 BC 표현이 어색하니 ISO 문자열에 음수가 들어오면
 * 직접 파싱한다.
 */
export function toJulianYear(input: string | Date): number {
  if (typeof input === 'string') {
    // ISO에서 음수 연도("-0044-03-15") 처리 — JS Date는 음수 처리는 가능하나 timezone 상 헷갈리므로 직접 파싱
    const m = input.match(/^(-?\d{1,6})-(\d{2})-(\d{2})/)
    if (m && m[1] && m[2] && m[3]) {
      const year = parseInt(m[1], 10)
      const month = parseInt(m[2], 10)
      const day = parseInt(m[3], 10)
      // 해당 연도 1월 1일을 0으로, 다음 해 1월 1일을 1로 두고 day-of-year로 보간
      const dayOfYear = approxDayOfYear(month, day)
      return year + dayOfYear / DAYS_PER_YEAR
    }
    const d = new Date(input)
    return d.getUTCFullYear() + dayOfYearUTC(d) / DAYS_PER_YEAR
  }
  return input.getUTCFullYear() + dayOfYearUTC(input) / DAYS_PER_YEAR
}

function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1)
  return (d.getTime() - start) / MS_PER_DAY
}

function approxDayOfYear(month: number, day: number): number {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  const idx = Math.max(0, Math.min(11, month - 1))
  return (cum[idx] ?? 0) + Math.max(0, day - 1)
}

/** 연도(소수점 가능)를 픽셀로 매핑 */
export function yearToX(
  year: number,
  range: { startYear: number; endYear: number },
  width: number,
): number {
  const span = range.endYear - range.startYear
  if (span <= 0) return 0
  return ((year - range.startYear) / span) * width
}

/** 픽셀을 연도로 역변환 */
export function xToYear(
  x: number,
  range: { startYear: number; endYear: number },
  width: number,
): number {
  const span = range.endYear - range.startYear
  if (span <= 0 || width <= 0) return range.startYear
  return range.startYear + (x / width) * span
}
