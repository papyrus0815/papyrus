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
  /** 툴팁에서 '앞 사건' 대신 이름으로 부르려고 — 없으면 '앞 사건' */
  title?: string | null
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

export type GapPace = 'fast' | 'medium' | 'slow'

export interface GapInfo {
  /** '9일 뒤'·'같은 날'·'1년 2개월 뒤'·'약 3개월 뒤' — 두 행 사이에 놓여 '위 사건에서 아래 사건까지'로 읽힌다 */
  text: string
  /** 견준 형제의 자리 — 화면 바로 위 행이 아니면 그 번호를 함께 적는다(siblingGaps만 채운다) */
  anchorIndex?: number
  /** 앞 사건이 아직 진행 중일 때 시작 */
  ongoing: boolean
  /** 툴팁 — 무엇으로부터 센 간격인지 */
  title: string
  /** 시간 간격에 따른 행 사이 호흡 단계 (당일~1주: fast, 1주~2개월: medium, 2개월 초과: slow) */
  pace?: GapPace
}

/** 바로 앞 사건(같은 상위 아래 화면 차례) 시작부터 이 사건 시작까지 */
export function gapText(previous: DatedNode, next: DatedNode): GapInfo | null {
  const from = pointOf(previous.startDate, previous.startDatePrecision)
  const to = pointOf(next.startDate, next.startDatePrecision)
  if (!from || !to || to.serial < from.serial) return null
  const precision = coarser(from.precision, to.precision)

  let text: string
  let pace: GapPace = 'medium'
  if (precision === 'day') {
    const days = to.serial - from.serial
    text = days === 0 ? '같은 날' : days < 60 ? `${days}일 뒤` : `${monthsText(monthsBetween(from, to, true))} 뒤`
    pace = days <= 14 ? 'fast' : days <= 180 ? 'medium' : 'slow'
  } else if (precision === 'month') {
    const months = monthsBetween(from, to, false)
    text = months === 0 ? '같은 달' : `약 ${monthsText(months)} 뒤`
    pace = months === 0 ? 'fast' : months <= 6 ? 'medium' : 'slow'
  } else {
    const years = to.year - from.year
    if (years === 0) return null
    text = `약 ${years}년 뒤`
    pace = 'slow'
  }

  const previousEnd = pointOf(previous.endDate, previous.endDatePrecision)
  const ongoing = Boolean(
    precision === 'day' &&
      previousEnd?.precision === 'day' &&
      to.serial > from.serial &&
      previousEnd.serial > to.serial,
  )
  /* 제목이 들어갈 자리('앞 사건')에 조사를 붙이지 않는다 — 제목 끝 글자에 따라 이/가·과/와가 틀린다 */
  const title = text === '같은 날' || text === '같은 달' ? `앞 사건 — ${text} 시작` : `앞 사건 시작 ${text}`
  return { text, ongoing, title: ongoing ? `${title} (그 사건이 아직 진행 중)` : title, pace }
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
  let anchorIndex = -1
  let anchorKey = Number.NEGATIVE_INFINITY
  return siblings.map((node, position) => {
    const key = keyOf(node)
    let gap: GapInfo | null = null
    if (position > 0 && key != null && anchor) {
      const previousKey = keyOf(siblings[position - 1])
      if (previousKey == null || previousKey <= key) {
        const found = gapText(anchor, node)
        gap = found ? { ...found, anchorIndex } : null
      }
      /* 화면 바로 위 행이 기준이 아닐 수 있다 — 무엇과 견준 값인지 툴팁에 이름으로 */
      const anchorTitle = (anchor as DatedNode).title?.trim()
      if (gap && anchorTitle) gap = { ...gap, title: gap.title.split('앞 사건').join(`'${anchorTitle}'`) }
    }
    if (key != null && key >= anchorKey) {
      anchor = node
      anchorIndex = position
      anchorKey = key
    }
    return gap
  })
}

/** 끝 시점 — 연·월만 아는 끝은 그해·그달의 마지막 날로(1월 1일로 두면 공백을 최대 1년 부풀린다) */
function endPointOf(iso: string | null | undefined, precision: string | null | undefined): Point | null {
  const point = pointOf(iso, precision)
  if (!point) return null
  if (point.precision === 'year') return { ...point, month: 12, day: 31, serial: dayNumber(point.year, 12, 31) }
  if (point.precision === 'month') return { ...point, serial: dayNumber(point.year, point.month + 1, 0) }
  return point
}

/** 1년 넘게 기록이 비면 행 사이에 공백을 세운다 */
const QUIET_DAYS = 365

/**
 * 형제 목록(화면 차례)의 **공백** — 앞에 나온 사건들이 모두 끝난 뒤 이 사건이 시작되기까지 1년 넘게 아무 기록이 없으면
 * '12년 공백'. 간격(+N일)은 시작끼리 재지만 공백은 끝에서 잰다 — 앞 사건이 길게 이어졌다면 빈 시간이 아니다
 * (영국 동인도회사 묶음: 상관 설립 사이 12~28년). 차례가 거꾸로 된 행은 비운다.
 */
export function quietSpans(siblings: ReadonlyArray<DatedNode>): Array<string | null> {
  return quietSpansWithStart(siblings).map((quiet) => quiet?.label ?? null)
}

export interface QuietSpan {
  label: string
  /** 공백이 시작된 시점(앞 사건들이 모두 끝난 날) — 연·월·일 정수 키, BC 음수(즉위 표지 sortKey와 같은 축) */
  fromKey: number
}

/** 천문 연도 → 부호 연도(기원전 1년 = 0 → -1) */
const signedYearOf = (astronomical: number) => (astronomical <= 0 ? astronomical - 1 : astronomical)

/**
 * quietSpans + 공백이 시작된 시점 — 공백 줄을 그 사이에 든 즉위 표지보다 **앞에** 세우려면 시작점이 필요하다
 * (동인도회사: 1690년 6번 뒤 56년 공백 안에 1707·1714·1727 즉위가 있다).
 *
 * 상위 사건(parent)이 주어지고 그 전체 기간이 6개월~5년 사이인 중기 사건이면 3개월(90일) 이상 기록이 빈 구간도
 * 공백 줄로 드러내 전쟁·혁명 내부의 소강 국면이 읽히게 한다.
 */
export function quietSpansWithStart(
  siblings: ReadonlyArray<DatedNode>,
  parent?: DatedNode,
): Array<QuietSpan | null> {
  let minDays = QUIET_DAYS
  let minMonths = 12
  if (parent) {
    const parentStart = pointOf(parent.startDate, parent.startDatePrecision)
    const parentEnd = endPointOf(parent.endDate, parent.endDatePrecision)
    const parentSpanDays = parentStart && parentEnd ? parentEnd.serial - parentStart.serial : null
    if (parentSpanDays != null && parentSpanDays >= 180 && parentSpanDays <= 365 * 5) {
      minDays = 90
      minMonths = 3
    }
  }

  let lastEnd: Point | null = null
  return siblings.map((node, position) => {
    const start = pointOf(node.startDate, node.startDatePrecision)
    let quiet: QuietSpan | null = null
    if (position > 0 && start && lastEnd && start.serial - lastEnd.serial >= minDays) {
      const precision = coarser(lastEnd.precision, start.precision)
      const months = monthsBetween(lastEnd, start, precision === 'day')
      if (months >= minMonths) {
        quiet = {
          label: `${precision === 'day' ? '' : '약 '}${monthsText(months)} 공백`,
          fromKey: signedYearOf(lastEnd.year) * 10000 + lastEnd.month * 100 + lastEnd.day,
        }
      }
    }
    if (start) {
      const end = endPointOf(node.endDate, node.endDatePrecision) ?? endPointOf(node.startDate, node.startDatePrecision)
      if (end && (!lastEnd || end.serial > lastEnd.serial)) lastEnd = end
    }
    return quiet
  })
}

/**
 * 상위 기간 끝까지 남은 빈 시간 — 하위 사건이 다 끝난 뒤 상위가 끝나기까지 1년 넘게 기록이 없으면 그 길이.
 * 1차대전은 하위 18건이 1914년 8월 6일에 끝나 '4년 3개월'. 무엇을 더 채워야 하는지 보이게 하는 표지다.
 */
export function trailingQuiet(children: ReadonlyArray<DatedNode>, parent: DatedNode): string | null {
  const parentEnd = endPointOf(parent.endDate, parent.endDatePrecision)
  if (!parentEnd) return null
  let lastEnd: Point | null = null
  for (const child of children) {
    const end = endPointOf(child.endDate, child.endDatePrecision) ?? endPointOf(child.startDate, child.startDatePrecision)
    if (end && (!lastEnd || end.serial > lastEnd.serial)) lastEnd = end
  }
  if (!lastEnd || parentEnd.serial - lastEnd.serial < QUIET_DAYS) return null
  const precision = coarser(lastEnd.precision, parentEnd.precision)
  const months = monthsBetween(lastEnd, parentEnd, precision === 'day')
  return months >= 12 ? `${precision === 'day' ? '' : '약 '}${monthsText(months)}` : null
}
