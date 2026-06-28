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

/**
 * 부호 있는 연도 → 세기 (BC는 *음수* 세기).
 * 양수: 1~100년 → 1세기, 101~200 → 2세기, 1900 → 19, 2000 → 20.
 * BC(음수·0): 1~100 BC → -1세기, 101~200 BC → -2세기 (연도 0은 천문학적으로 1 BC).
 *
 * 기존엔 `Math.ceil(year/100)`만 써서 (1) BC·연도0이 0/-0(falsy)이 돼 truthy 가드에
 * 누락되고 (2) 목록·대시보드의 `floor(year/100)+1`과 끝자리 00년에서 1세기 어긋났다.
 * 이 함수를 단일 출처로 모든 뷰가 공유한다.
 */
export function getCentury(year: number): number {
  if (year > 0) return Math.ceil(year / 100)
  return -Math.ceil(Math.abs(year) / 100) || -1
}

/** ISO 문자열 → 세기(BC 음수). 파싱 불가면 null. TZ 안전. */
export function getCenturyFromIso(value?: string | null): number | null {
  const p = parseIsoDateParts(value)
  if (!p) return null
  return getCentury(p.year)
}

/** 부호 있는 연도 → 10년대(decade) 시작 연도. 예: 1995 → 1990, -44 → -50. */
export function getDecade(year: number): number {
  return Math.floor(year / 10) * 10
}

/**
 * ISO 문자열 → 시간순 정렬용 정수 키. BC(음수 연도)까지 안정 정렬.
 * 부호연도×10000 + 월×100 + 일. 파싱 불가면 null.
 *
 * 네이티브 `new Date(iso).getTime()`은 BC 형식(`-0044-..`)에서 부호 소실/오연도/NaN을
 * 내 정렬을 뒤섞었다. 정수 키 비교로 대체한다.
 */
export function dateSortKey(value?: string | null): number | null {
  const p = parseIsoDateParts(value)
  if (!p) return null
  return p.year * 10000 + p.month * 100 + p.day
}

/**
 * 시간순 비교자(오름차순). 파싱 불가(미상)는 *항상 뒤로* 보낸다(방향 무관).
 * 내림차순이 필요하면 호출부에서 결과 부호를 뒤집되, 미상은 별도로 뒤에 두는 게 보통이라
 * 방향까지 고려하려면 `compareByDate(a, b, dir)`를 쓰라.
 */
export function compareByDate(
  aIso?: string | null,
  bIso?: string | null,
  direction: 'asc' | 'desc' = 'asc',
): number {
  const a = dateSortKey(aIso)
  const b = dateSortKey(bIso)
  if (a === null && b === null) return 0
  if (a === null) return 1 // 미상은 항상 뒤
  if (b === null) return -1
  const cmp = a - b
  return direction === 'asc' ? cmp : -cmp
}

/** start~end ISO의 연 단위 기간. end 없거나 어느 쪽이든 파싱 불가면 0. BC 지원. */
export function isoYearSpan(
  start?: string | null,
  end?: string | null,
): number {
  const s = parseIsoDateParts(start)
  const e = parseIsoDateParts(end)
  if (!s || !e) return 0
  return e.year - s.year
}

/**
 * start~end ISO의 일(day) 단위 기간(절댓값). end 없거나 어느 쪽이든 파싱 불가면 null.
 * 부호 연도를 그대로 `setUTCFullYear`에 넣어 프롤렙틱 그레고리력으로 계산한다 —
 * 양 끝점을 동일하게 해석하므로 BC·고대 연도에서도 차이는 정확하다(isoYearSpan과 동일 규약).
 *
 * 네이티브 `new Date('-0220-01-01')`은 4자리 음수 연도를 Invalid Date(NaN)로 만들어
 * 일수 계산을 깨뜨리므로 직접 구성한다.
 */
export function isoDaySpan(
  start?: string | null,
  end?: string | null,
): number | null {
  const startParts = parseIsoDateParts(start)
  const endParts = parseIsoDateParts(end)
  if (!startParts || !endParts) return null
  const toUtcMs = (parts: IsoDateParts): number => {
    const date = new Date(0)
    date.setUTCFullYear(parts.year, parts.month - 1, parts.day)
    date.setUTCHours(0, 0, 0, 0)
    return date.getTime()
  }
  return Math.ceil(
    Math.abs(toUtcMs(endParts) - toUtcMs(startParts)) / 86_400_000,
  )
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

/**
 * 단일 날짜를 정밀도에 맞게 포맷 (년만 알 때, 년·월만 알 때 등).
 * BC/연도0/끝자리 정합은 parseIsoDateParts에 위임 — 네이티브 Date 파싱 금지.
 *
 * (이전엔 pages/events/utils에 있던 것을 공용 inline-edit/날짜표시가 함께 쓰도록
 *  단일 출처를 여기로 옮김. events.utils는 이 함수를 re-export.)
 */
export function formatDateWithPrecision(
  dateStr: string,
  precision?: string | null,
): string {
  const parts = parseIsoDateParts(dateStr)
  if (!parts) return dateStr
  const { year, month, day } = parts
  const prec = precision === 'year' || precision === 'month' ? precision : 'day'
  if (prec === 'year') return `${year}년`
  if (prec === 'month') return `${year}년 ${month}월`
  return `${year}년 ${month}월 ${day}일`
}

/**
 * 날짜 범위 포맷 (정밀도 지원: 년만/년·월/년·월·일).
 */
export function formatDateRange(
  start: string,
  end?: string,
  startPrecision?: string | null,
  endPrecision?: string | null,
): string {
  const startStr = formatDateWithPrecision(start, startPrecision)
  if (!end) return startStr
  const endStr = formatDateWithPrecision(end, endPrecision)
  return `${startStr} ~ ${endStr}`
}
