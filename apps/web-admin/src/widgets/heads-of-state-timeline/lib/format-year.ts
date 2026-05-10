/**
 * 연도 포맷 단일화. 페이지 전체에서 BC/AD 표기가 4종 이상 흩어져 있던 것을 한 곳에서 통제.
 *
 * - `formatYear(2014)` → "2014"
 * - `formatYear(-44)` → "BC 44"
 * - `formatYear(0)` → "BC/AD" (역사 연표에선 0년 없음)
 * - `formatYear(2014, { compact: true })` → "2014"
 * - `formatYear(-44, { compact: true })` → "BC44"
 * - `formatYearRange({ startYear: -44, endYear: 14 })` → "BC 44 ~ 14"
 */

export interface FormatYearOptions {
  /** 공백 없이 압축 — 좁은 영역(예: ZoomReadout)에서 사용 */
  compact?: boolean
  /** 0년을 'BC/AD' 경계 표기 — 시간축 tick에서만 권장 */
  showZeroAsBoundary?: boolean
}

export function formatYear(year: number, opts: FormatYearOptions = {}): string {
  if (opts.showZeroAsBoundary && year === 0) return 'BC/AD'
  if (year < 0) {
    const abs = Math.abs(year)
    return opts.compact ? `BC${abs}` : `BC ${abs}`
  }
  return String(year)
}

/** 시작-끝 범위 — `~` 구분, 둘 중 하나만 있어도 OK */
export function formatYearRange(args: {
  startYear?: number | null
  endYear?: number | null
  ongoing?: boolean
}): string {
  const { startYear, endYear, ongoing } = args
  const fmt = (y: number) => formatYear(y)
  if (startYear != null && endYear != null) return `${fmt(startYear)} ~ ${fmt(endYear)}`
  if (startYear != null && ongoing) return `${fmt(startYear)} ~ 현재`
  if (startYear != null) return `${fmt(startYear)} ~`
  if (endYear != null) return `~ ${fmt(endYear)}`
  return ''
}
