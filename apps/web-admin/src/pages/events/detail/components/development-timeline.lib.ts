/**
 * 전개 타임라인 배치 — 하위 사건(D2 정본)을 상위 사건의 시간축에 놓는다.
 *
 * 축은 **천문 연도의 실수**다(기원전 1년 = 0, 기원전 44년 = -43). 그래야 BC↔AD를 건너는 사건도
 * 한 축에 같은 간격으로 선다. 날짜는 서버의 부호 ISO('-0044-03-15')를 parseIsoDateParts로 읽는다.
 *
 * 정밀도를 숨기지 않는다 — 연 단위만 아는 사건은 그 해 전체를, 월 단위는 그 달 전체를 덮는
 * '불확실' 구간으로 그린다(1월 1일 점으로 그리면 아는 것보다 정확한 척하게 된다).
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'

export interface TimelineSource {
  id: string
  title: string
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
}

export interface AxisSpan {
  from: number
  to: number
  /** 하루짜리(일 정밀도·끝 없음) — 점으로 그린다 */
  isPoint: boolean
  /** 연·월 정밀도라 구간이 '모름'의 폭이다 */
  uncertain: boolean
}

export interface TimelineItem extends AxisSpan {
  id: string
  title: string
  lane: number
  leftPct: number
  widthPct: number
  dateLabel: string
}

export interface TimelineLayout {
  domain: [number, number]
  parent: (AxisSpan & { leftPct: number; widthPct: number }) | null
  items: TimelineItem[]
  laneCount: number
  ticks: Array<{ pct: number; label: string }>
}

const DAY = 1 / 365.25

const astronomical = (signedYear: number) => (signedYear < 0 ? signedYear + 1 : signedYear)

type Precision = 'year' | 'month' | 'day'
const precisionOf = (raw?: string | null): Precision =>
  raw === 'year' || raw === 'month' ? raw : 'day'

function pointOf(iso: string | null | undefined, precision: Precision): { from: number; to: number } | null {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  const base = astronomical(parts.year)
  if (precision === 'year') return { from: base, to: base + 1 }
  const monthStart = base + (parts.month - 1) / 12
  if (precision === 'month') return { from: monthStart, to: monthStart + 1 / 12 }
  const day = monthStart + (parts.day - 1) * DAY
  return { from: day, to: day + DAY }
}

/** 시작·끝(정밀도 포함) → 축 위의 구간 */
export function toAxisSpan(source: TimelineSource): AxisSpan | null {
  const startPrecision = precisionOf(source.startDatePrecision)
  const start = pointOf(source.startDate, startPrecision)
  if (!start) return null
  const end = source.endDate ? pointOf(source.endDate, precisionOf(source.endDatePrecision)) : null
  const to = end && end.to > start.from ? end.to : start.to
  return {
    from: start.from,
    to,
    isPoint: startPrecision === 'day' && (!end || to - start.from <= DAY * 1.01),
    uncertain: startPrecision !== 'day' && !end,
  }
}

function formatSigned(iso: string | null | undefined, precision: Precision): string | null {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  const year = parts.year < 0 ? `기원전 ${-parts.year}` : String(parts.year)
  if (precision === 'year') return year
  if (precision === 'month') return `${year}.${parts.month}`
  return `${year}.${parts.month}.${parts.day}`
}

export function formatSpanLabel(source: TimelineSource): string {
  const start = formatSigned(source.startDate, precisionOf(source.startDatePrecision))
  if (!start) return ''
  const end = formatSigned(source.endDate, precisionOf(source.endDatePrecision))
  return end && end !== start ? `${start} ~ ${end}` : start
}

const TICK_STEPS = [1 / 12, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]

function tickLabel(value: number, step: number): string {
  const yearFloor = Math.floor(value + 1e-9)
  const signed = yearFloor <= 0 ? yearFloor - 1 : yearFloor
  const year = signed < 0 ? `기원전 ${-signed}` : String(signed)
  if (step >= 1) return year
  const month = Math.round((value - yearFloor) * 12) + 1
  return month === 1 ? year : `${month}월`
}

/**
 * 배치 — 겹치는 항목은 레인을 나눈다. 레인 판정은 **라벨 폭까지** 고려한다(막대가 짧아도 제목이
 * 옆 항목과 부딪히지 않게): 항목은 자기 시작점부터 labelReservePct만큼 자리를 차지한다.
 */
export function layoutTimeline(
  parentSource: TimelineSource,
  children: TimelineSource[],
  labelReservePct = 24,
): TimelineLayout | null {
  const parent = toAxisSpan(parentSource)
  const spans = children
    .map((child) => ({ child, span: toAxisSpan(child) }))
    .filter((entry): entry is { child: TimelineSource; span: AxisSpan } => entry.span !== null)
  if (spans.length === 0) return null

  let low = Math.min(...spans.map((entry) => entry.span.from), parent?.from ?? Infinity)
  let high = Math.max(...spans.map((entry) => entry.span.to), parent?.to ?? -Infinity)
  if (high - low < DAY * 7) high = low + DAY * 7
  const padding = (high - low) * 0.03
  low -= padding
  high += padding
  const toPct = (value: number) => ((value - low) / (high - low)) * 100

  const sorted = [...spans].sort((left, right) => left.span.from - right.span.from)
  const laneEnds: number[] = []
  const items: TimelineItem[] = sorted.map(({ child, span }) => {
    const leftPct = toPct(span.from)
    const widthPct = Math.max(toPct(span.to) - leftPct, 0)
    const occupiedTo = Math.max(leftPct + widthPct, leftPct + labelReservePct)
    let lane = laneEnds.findIndex((end) => end <= leftPct)
    if (lane < 0) {
      lane = laneEnds.length
      laneEnds.push(occupiedTo)
    } else {
      laneEnds[lane] = occupiedTo
    }
    return {
      ...span,
      id: child.id,
      title: child.title,
      lane,
      leftPct,
      widthPct,
      dateLabel: formatSpanLabel(child),
    }
  })

  const range = high - low
  const step = TICK_STEPS.find((candidate) => range / candidate <= 8) ?? 1000
  const ticks: TimelineLayout['ticks'] = []
  for (let value = Math.ceil(low / step) * step; value <= high; value += step) {
    ticks.push({ pct: toPct(value), label: tickLabel(value, step) })
  }

  return {
    domain: [low, high],
    parent: parent ? { ...parent, leftPct: toPct(parent.from), widthPct: toPct(parent.to) - toPct(parent.from) } : null,
    items,
    laneCount: laneEnds.length,
    ticks,
  }
}
