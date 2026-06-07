/**
 * ISO 날짜 문자열을 *타임존 안전하게* 다루는 유틸.
 *
 * 사건 날짜는 서버에 UTC 자정 기준으로 저장된다(예: 7월 4일 → "2024-07-04T00:00:00.000Z").
 * 이걸 표시할 때 `new Date(iso).getDate()`처럼 네이티브 로컬 게터를 쓰면, UTC보다 서쪽
 * (음수 오프셋, 예: 미주) 타임존에서 그 시점이 아직 "7월 3일 저녁"이라 하루가 빠진다.
 * 그래서 문자열에서 연/월/일을 *직접* 뽑아 보는 사람 타임존과 무관하게 만든다
 * (백엔드 parseEventDate, ledger startYearOf 와 동일한 접근).
 */

export interface IsoDateParts {
  /** 부호 있는 연도 — BC는 음수 */
  year: number
  /** 1~12 */
  month: number
  /** 1~31 */
  day: number
  /** 0~23 */
  hour: number
  /** 0~59 */
  minute: number
}

/**
 * ISO(음수 BC 포함, 시간 부분 선택) 문자열 → 달력 구성요소. 파싱 불가면 null.
 * 표준 `±YYYY-MM-DD[THH:MM...]`는 문자열에서 직접 추출(타임존 무관),
 * 그 외 비표준 입력만 네이티브 폴백하되 UTC 게터로 읽어 최소한의 TZ 안전성은 유지.
 */
export function parseIsoDateParts(value?: string | null): IsoDateParts | null {
  if (!value) return null
  const neg = value.startsWith('-')
  const body = neg ? value.slice(1) : value
  const m = body.match(/^(\d{1,6})-(\d{1,2})-(\d{1,2})(?:T(\d{2}):(\d{2}))?/)
  if (m) {
    return {
      year: parseInt(m[1], 10) * (neg ? -1 : 1),
      month: parseInt(m[2], 10),
      day: parseInt(m[3], 10),
      hour: m[4] ? parseInt(m[4], 10) : 0,
      minute: m[5] ? parseInt(m[5], 10) : 0,
    }
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

/** ISO 문자열 → "YYYY-MM-DD"(BC는 "-YYYY-MM-DD"). 파싱 불가면 ''. 타임존 무관. */
export function isoToDateInput(value?: string | null): string {
  const p = parseIsoDateParts(value)
  if (!p) return ''
  const sign = p.year < 0 ? '-' : ''
  const yyyy = String(Math.abs(p.year)).padStart(4, '0')
  const mm = String(p.month).padStart(2, '0')
  const dd = String(p.day).padStart(2, '0')
  return `${sign}${yyyy}-${mm}-${dd}`
}

/** ISO 문자열 → "HH:MM". 자정(00:00)이면 ''(시간 미입력 취급). 타임존 무관. */
export function isoToTimeInput(value?: string | null): string {
  const p = parseIsoDateParts(value)
  if (!p) return ''
  if (p.hour === 0 && p.minute === 0) return ''
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}
