import {
  effectiveRangePrecision,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'

/**
 * 전개 행 날짜 — **앞 행과 같은 부분은 쓰지 않는다.**
 *
 * 예전엔 행마다 '1941년 6월 22일 03:15'를 통째로 적어, 개전일 13행이 같은 날짜를 13번 말했고
 * 제헌국민의회기 31행 중 12행이 '1789년'으로 시작했다. 같은 형제 목록의 바로 앞 행과 견줘
 * - 해가 같으면 연도를 뺀다('6.17')
 * - 날이 같으면 시각만 남긴다('03:15 ~ 21:00', 시각이 없으면 '같은 날')
 * - 해가 바뀌는 행은 연도를 굵게(yearText) — 따로 연 표지 줄을 세우지 않아도 해 경계가 읽힌다.
 * 끝은 시작과 견준다(같은 날이면 시각만, 같은 해면 연도 없이). 표기는 짧은 꼴(1789.5.5) 하나.
 */
export interface DatedRow {
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
}

export interface CompactDate {
  /** 굵게 쓸 연도 — 앞 행과 해가 같으면 null */
  yearText: string | null
  /** 연도 뒤(또는 연도 없이) 이어지는 나머지 — '.6.22 03:15 ~ 6.23' · '6.17' · '03:15' */
  rest: string
  /** 화면 읽기용 전체 표기 — 생략 없이 */
  full: string
}

type Precision = 'year' | 'month' | 'day'

interface Point {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  precision: Precision
}

const toPrecision = (value: string | null | undefined): Precision =>
  value === 'year' || value === 'month' ? value : 'day'

function pointOf(
  iso: string | null | undefined,
  precision: string | null | undefined,
): Point | null {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  return {
    ...parts,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    precision: toPrecision(precision),
  }
}

/** 그 달의 마지막 날 — 윤년 포함(기원전도 같은 그레고리력 규칙으로 센다) */
function lastDayOf(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

/**
 * 한 행의 시작·끝 지점 — 정밀도가 비어 있으면 저장 관례로 읽는다.
 * - 1월 1일(~12월 31일) = 연도만 아는 값('1789') — `effectiveRangePrecision`과 같은 판정
 * - **1일 ~ 그 달 말일 = 월만 아는 기간**('976.1 ~ 7월'). 세 하인리히 전쟁(974~978)처럼 구조화 연·월로 넣은 사건이
 *   '976.7.1 ~ 12.31'로 지어낸 일자를 말했다(정밀도 NULL이 시작 262건·끝 210건).
 * 정밀도를 명시한('day') 날짜는 건드리지 않는다.
 */
function pointsOf(row: DatedRow): { start: Point | null; end: Point | null } {
  const { startPrecision, endPrecision } = effectiveRangePrecision(
    row.startDate,
    row.endDate,
    row.startDatePrecision,
    row.endDatePrecision,
  )
  const start = pointOf(row.startDate, startPrecision)
  const end = pointOf(row.endDate, endPrecision)
  const monthSpan =
    !row.startDatePrecision &&
    !row.endDatePrecision &&
    start &&
    end &&
    !(startPrecision === 'year' && endPrecision === 'year') &&
    start.day === 1 &&
    end.day === lastDayOf(end.year, end.month) &&
    start.hour === 0 &&
    start.minute === 0
  if (monthSpan) {
    return { start: { ...start, precision: 'month' }, end: { ...end, precision: 'month' } }
  }
  return { start, end }
}

const yearLabel = (year: number) =>
  year < 0 ? `기원전 ${-year}` : String(year)
const pad = (value: number) => String(value).padStart(2, '0')
const timeOf = (point: Point) =>
  point.precision === 'day' && (point.hour !== 0 || point.minute !== 0)
    ? `${pad(point.hour)}:${pad(point.minute)}`
    : ''
const sameDay = (left: Point, right: Point) =>
  left.precision === 'day' &&
  right.precision === 'day' &&
  left.year === right.year &&
  left.month === right.month &&
  left.day === right.day

/** 연도 뒤 꼬리 — '.6.22' · '.6' · '' */
function tailAfterYear(point: Point): string {
  if (point.precision === 'year') return ''
  if (point.precision === 'month') return `.${point.month}`
  return `.${point.month}.${point.day}`
}

/** 연도 없이 — '6.22' · '6월' */
function withoutYear(point: Point): string {
  return point.precision === 'month'
    ? `${point.month}월`
    : `${point.month}.${point.day}`
}

function joinTime(date: string, time: string): string {
  return [date, time].filter(Boolean).join(' ')
}

/** 끝 — 시작과 견줘 같은 날이면 시각만, 같은 해면 연도 없이, 아니면 전부 */
function endText(start: Point, end: Point | null): string {
  if (!end) return ''
  if (sameDay(start, end)) {
    const time = timeOf(end)
    return time && time !== timeOf(start) ? ` ~ ${time}` : ''
  }
  /* 같은 달만 아는 기간 — '1916.2 ~ 2월'처럼 두 번 쓰지 않는다 */
  if (
    start.precision === 'month' &&
    end.precision === 'month' &&
    start.year === end.year &&
    start.month === end.month
  )
    return ''
  if (end.precision === 'year')
    return end.year === start.year && start.precision === 'year'
      ? ''
      : ` ~ ${yearLabel(end.year)}`
  const body =
    end.year === start.year
      ? withoutYear(end)
      : `${yearLabel(end.year)}${tailAfterYear(end)}`
  return ` ~ ${joinTime(body, timeOf(end))}`
}

export function compactRowDate(
  row: DatedRow,
  previous: DatedRow | null,
): CompactDate | null {
  const { start, end } = pointsOf(row)
  if (!start) return null
  const before = previous ? pointsOf(previous).start : null
  const tail = endText(start, end)
  const time = timeOf(start)
  const full = `${yearLabel(start.year)}${tailAfterYear(start)}${time ? ` ${time}` : ''}${tail}`

  /* 연도만 아는 행은 연도가 곧 전부 — 생략하지 않는다 */
  if (!before || start.precision === 'year' || before.year !== start.year) {
    return {
      yearText: yearLabel(start.year),
      rest: `${tailAfterYear(start)}${time ? ` ${time}` : ''}${tail}`,
      full,
    }
  }
  /* 같은 날 — 시각이 있으면 시각만. 시각 없이 다른 날로 이어지면 '같은 날 ~ 7.25'가 어색해 날짜를 쓴다 */
  if (sameDay(before, start) && (time || !tail)) {
    return { yearText: null, rest: `${time || '같은 날'}${tail}`, full }
  }
  return {
    yearText: null,
    rest: `${joinTime(withoutYear(start), time)}${tail}`,
    full,
  }
}

/** 생략 없는 짧은 꼴 — '1789.5.5 ~ 1791.9.3' · '1941.6.22 03:15'. 머리 부제·구획 기준 시점 등 행 밖에서 */
export function shortDateText(row: DatedRow): string | null {
  return compactRowDate(row, null)?.full ?? null
}

/** 시작만 — 목차 줄 앞 표지('6.17'). 정밀도 판정은 끝까지 본 행 전체로(1일 ~ 말일이면 '7월') */
export function compactStartText(row: DatedRow, previous: DatedRow | null): string | null {
  const { start } = pointsOf(row)
  if (!start) return null
  const before = previous ? pointsOf(previous).start : null
  if (!before || start.precision === 'year' || before.year !== start.year) {
    return `${yearLabel(start.year)}${tailAfterYear(start)}`
  }
  return withoutYear(start)
}

const rankOf = (point: Point, edge: 'start' | 'end') => {
  const month = point.precision === 'year' ? (edge === 'start' ? 1 : 12) : point.month
  const day =
    point.precision === 'day' ? point.day : edge === 'start' ? 1 : lastDayOf(point.year, month)
  return (point.year * 100 + month) * 100 + day
}

/**
 * 여러 행이 덮는 기간 — 가장 이른 시작 ~ 가장 늦은 끝, 각자의 실효 정밀도 그대로.
 * 머리 부제가 쓴다(예전엔 정밀도 NULL을 'day'로 바꿔 세 하인리히 전쟁이 '974.1.1 ~ 978.12.31'이었다).
 */
export function shortSpanText(rows: ReadonlyArray<DatedRow>): string | null {
  let first: Point | null = null
  let last: Point | null = null
  for (const row of rows) {
    const { start, end } = pointsOf(row)
    if (!start) continue
    const finish = end ?? start
    if (!first || rankOf(start, 'start') < rankOf(first, 'start')) first = start
    if (!last || rankOf(finish, 'end') > rankOf(last, 'end')) last = finish
  }
  if (!first || !last) return null
  const time = timeOf(first)
  return `${yearLabel(first.year)}${tailAfterYear(first)}${time ? ` ${time}` : ''}${endText(first, last)}`
}
