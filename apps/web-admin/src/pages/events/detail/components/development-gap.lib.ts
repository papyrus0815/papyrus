/**
 * 묶음 전개의 시간 간격 — 하위 사건이 **며칠 이어졌는지**와 **앞 사건 시작 며칠 뒤에 일어났는지**.
 *
 * 간격은 앞 사건의 **시작일**부터 센다. 종료일부터 세면 앞 사건이 진행 중일 때 시작한 사건(실데이터 181쌍 중 23쌍,
 * 1차대전 7월 위기 대부분)이 음수가 된다 — 그 경우는 '앞 사건 진행 중'으로 따로 말한다.
 *
 * 정밀도는 숨기지 않는다: 둘 다 일까지 알면 '+9일', 한쪽이라도 월까지면 '+약 3개월', 연까지면 '+약 2년'.
 * 정밀도 NULL인 1월 1일은 '연도만 안다'로 본다(장부·formatDateRange와 같은 판정).
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import { astronomicalYear, dayNumber, durationLabel, isDayPrecise } from './event-facts.lib'

export interface DatedNode {
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
}

type Precision = 'day' | 'month' | 'year'
const RANK: Record<Precision, number> = { year: 0, month: 1, day: 2 }

interface Point {
  year: number
  month: number
  day: number
  precision: Precision
  serial: number
}

function pointOf(iso: string | null | undefined, precision: string | null | undefined): Point | null {
  if (!iso) return null
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  const resolved: Precision =
    precision === 'year' || precision === 'month' ? precision : isDayPrecise(iso, precision) ? 'day' : 'year'
  const year = astronomicalYear(parts.year)
  return { year, month: parts.month, day: parts.day, precision: resolved, serial: dayNumber(year, parts.month, parts.day) }
}

const coarser = (left: Precision, right: Precision): Precision => (RANK[left] <= RANK[right] ? left : right)

/** 두 날짜 사이 달력 개월 수(끝의 일이 시작의 일보다 앞이면 한 달 덜) */
const monthsBetween = (from: Point, to: Point, useDay: boolean) =>
  (to.year - from.year) * 12 + (to.month - from.month) - (useDay && to.day < from.day ? 1 : 0)

/** '1년 2개월'·'3개월'·'5년' — 2년 이상은 해만 */
function monthsText(months: number): string {
  if (months < 12) return `${months}개월`
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years >= 2 || rest === 0) return `${years}년`
  return `${years}년 ${rest}개월`
}

/**
 * 진행 기간 — '3일간'·'2년 5개월 19일'·'약 3개월'. 하루짜리·끝 없음·역순은 null(날짜 줄이 이미 말한다).
 * 60일 미만은 그날까지 포함해 센다(7월 23일~25일 = 3일간). 그 이상은 장부 기간과 같은 셈법.
 */
export function spanText(node: DatedNode): string | null {
  const start = pointOf(node.startDate, node.startDatePrecision)
  const end = pointOf(node.endDate, node.endDatePrecision)
  if (!start || !end || end.serial < start.serial) return null
  const precision = coarser(start.precision, end.precision)
  if (precision === 'day') {
    const days = end.serial - start.serial + 1
    if (days <= 1) return null
    if (days < 60) return `${days}일간`
    return durationLabel(node.startDate, node.endDate, node.startDatePrecision, node.endDatePrecision)
  }
  if (precision === 'month') {
    const months = monthsBetween(start, end, false) + 1
    return months <= 1 ? null : `약 ${monthsText(months)}`
  }
  const years = end.year - start.year + 1
  return years <= 1 ? null : `약 ${years}년`
}

export interface GapInfo {
  /** '+9일'·'같은 날'·'+1년 2개월'·'+약 3개월' */
  text: string
  /** 앞 사건이 아직 진행 중일 때 시작 */
  ongoing: boolean
  /** 툴팁 — 무엇으로부터 센 간격인지 */
  title: string
}

/** 바로 앞 사건(같은 상위 아래 화면 차례) 시작부터 이 사건 시작까지 */
export function gapText(previous: DatedNode, next: DatedNode): GapInfo | null {
  const from = pointOf(previous.startDate, previous.startDatePrecision)
  const to = pointOf(next.startDate, next.startDatePrecision)
  if (!from || !to || to.serial < from.serial) return null
  const precision = coarser(from.precision, to.precision)

  let text: string
  if (precision === 'day') {
    const days = to.serial - from.serial
    text = days === 0 ? '같은 날' : days < 60 ? `+${days}일` : `+${monthsText(monthsBetween(from, to, true))}`
  } else if (precision === 'month') {
    const months = monthsBetween(from, to, false)
    text = months === 0 ? '같은 달' : `+약 ${monthsText(months)}`
  } else {
    const years = to.year - from.year
    if (years === 0) return null
    text = `+약 ${years}년`
  }

  const previousEnd = pointOf(previous.endDate, previous.endDatePrecision)
  const ongoing = Boolean(
    precision === 'day' &&
      previousEnd?.precision === 'day' &&
      to.serial > from.serial &&
      previousEnd.serial > to.serial,
  )
  const title = text === '같은 날' || text === '같은 달' ? `앞 사건과 ${text} 시작` : `앞 사건 시작 ${text.replace('+', '')} 뒤`
  return { text, ongoing, title: ongoing ? `${title} — 앞 사건이 아직 진행 중` : title }
}

/**
 * 형제 목록(화면 차례)의 간격 — 각 행을 **앞에 나온 형제 중 가장 늦게 시작한 사건**과 견준다.
 *
 * 화면 차례가 늘 날짜순은 아니다: 상위 시작일에 걸친 하위는 '기간 중' 구획으로 넘어가 7월 25일 사건들 뒤에
 * 7월 7일 사건이 선다(1차대전). 바로 위 행과 견주면 그다음 7월 28일 선전포고가 '+21일'이 되어 거짓이 된다.
 * 바로 위 행보다 먼저 시작한(차례가 거꾸로 된) 행에는 간격을 달지 않는다 — 무엇으로부터 센 값인지 읽히지 않는다.
 */
export function siblingGaps(siblings: ReadonlyArray<DatedNode>): Array<GapInfo | null> {
  const keyOf = (node: DatedNode) => pointOf(node.startDate, node.startDatePrecision)?.serial ?? null
  let anchor: DatedNode | null = null
  let anchorKey = Number.NEGATIVE_INFINITY
  return siblings.map((node, position) => {
    const key = keyOf(node)
    let gap: GapInfo | null = null
    if (position > 0 && key != null && anchor) {
      const previousKey = keyOf(siblings[position - 1])
      if (previousKey == null || previousKey <= key) gap = gapText(anchor, node)
    }
    if (key != null && key >= anchorKey) {
      anchor = node
      anchorKey = key
    }
    return gap
  })
}
