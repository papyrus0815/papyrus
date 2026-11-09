/** 사건 날짜 구조화 파싱 결과 */
export interface ParsedEventDate {
  /** 저장가능 DateTime — AD 1000~9999일 때만, 그 외(BC·고대)는 null */
  date: Date | null
  era: 'BC' | 'AD'
  year: number
  month: number
  day: number
}

/**
 * ISO(음수 BC 포함) 날짜 문자열 → 구조화 표현.
 * MySQL DATETIME은 1000~9999년만 저장 가능하므로, BC·고대(연<1000)는 date=null로 두고
 * 구조화 필드(era/year/month/day)만 채운다(응답에서 이 필드로 재구성).
 * 시각(`THH:MM[:SS]`)이 함께 들어오면 UTC 시·분·초까지 DateTime에 보존한다(단, year/month 정밀도면 자정으로 정규화).
 * 입력이 없거나 파싱 불가면 undefined(필드 미변경 의미).
 */
export function parseEventDate(
  iso?: string | null,
  precision?: string | null,
): ParsedEventDate | undefined {
  if (!iso) return undefined
  const neg = iso.startsWith('-')
  const body = neg ? iso.slice(1) : iso
  const matched = body.match(
    /^(\d{1,6})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  )
  let year: number
  let month: number
  let day: number
  let hour = 0
  let minute = 0
  let second = 0
  if (matched) {
    year = parseInt(matched[1], 10)
    month = parseInt(matched[2], 10)
    day = parseInt(matched[3], 10)
    hour = matched[4] ? parseInt(matched[4], 10) : 0
    minute = matched[5] ? parseInt(matched[5], 10) : 0
    second = matched[6] ? parseInt(matched[6], 10) : 0
  } else {
    const parsed = new Date(iso)
    if (Number.isNaN(parsed.getTime())) return undefined
    year = Math.abs(parsed.getUTCFullYear())
    month = parsed.getUTCMonth() + 1
    day = parsed.getUTCDate()
    hour = parsed.getUTCHours()
    minute = parsed.getUTCMinutes()
    second = parsed.getUTCSeconds()
  }
  if (precision === 'year' || precision === 'month') {
    hour = 0
    minute = 0
    second = 0
  }
  const era: 'BC' | 'AD' = neg ? 'BC' : 'AD'
  const date =
    !neg && year >= 1000 && year <= 9999
      ? new Date(Date.UTC(year, month - 1, day, hour, minute, second))
      : null
  return { date, era, year, month, day }
}

/**
 * 응답용 날짜 문자열 재구성. 저장 DateTime이 있으면 기존 동작 보존(toISOString),
 * 없으면 구조화 필드로 ISO(음수=BC) 재구성. 둘 다 없으면 null.
 */
export function formatEventDate(
  date: Date | string | null | undefined,
  era: 'BC' | 'AD' | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): string | null {
  if (date) {
    if (typeof (date as Date).toISOString === 'function') return (date as Date).toISOString()
    return date as string // 이미 문자열로 들어온 경우
  }
  if (year == null) return null
  const yyyy = String(year).padStart(4, '0')
  const mm = String(month ?? 1).padStart(2, '0')
  const dd = String(day ?? 1).padStart(2, '0')
  return `${era === 'BC' ? '-' : ''}${yyyy}-${mm}-${dd}`
}
