/**
 * 상위 흐름 띠 계산 유틸 — 하위 사건이 상위 사건의 시간 흐름에서 어디에 놓이는지 계산한다.
 *
 * 기존 비례 축(0~100%) 점·막대 그래프는 상위 기간(예: 1차세계대전 4년 4개월)에 비해
 * 등록된 하위 사건이 일부 구간(7월 위기 39일)에만 몰려 있을 때 전체의 2.4% 폭에 점 18개가
 * 한 덩어리로 겹치고 나머지 97.6%가 빈 줄이 되어 해독이 불가능했다.
 * 또한 상위 시작일 이전 사건(전사·배경 위기)은 경과 라벨이 null로 빠져 맥락이 끊겼다.
 *
 * 여기서는:
 *  1) 정밀도(연·월·일, 1월 1일 센티넬 포함)를 존중해 상위 대비 시점('상위 시작 5일 전',
 *     '상위 시작 당일', '시작 44일째', '상위 종료 3개월 후')을 계산하고,
 *  2) 순서 칩 트랙에 표시할 짧은 날짜·전체 날짜 라벨을 만든다.
 */
import { effectiveRangePrecision, parseIsoDateParts } from '@/shared/lib/iso-date'

import { compareEventStart } from './detail-network.lib'
import { formatSpanLabel } from './development-timeline.lib'
import { type EventPhase, phaseReach } from './event-phase.lib'

export interface FlowDatedItem {
  id: string
  title: string
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
}

export interface FlowStepItem {
  id: string
  order: number
  title: string
  current: boolean
  /** 칩 안에 짧게 찍을 시작 시점 (예: '1914.7.23', '1789.5', '977년') */
  shortDate: string | null
  /** 툴팁용 전체 기간 표기 (예: '1914.7.14 ~ 1914.7.22') */
  dateLabel: string
}

export interface ParentFlowLayout {
  count: number
  position: number
  prev: FlowDatedItem | null
  next: FlowDatedItem | null
  steps: FlowStepItem[]
  relativeTiming: string | null
  phase: string | null
  parentSpanLabel: string
}

type Precision = 'year' | 'month' | 'day'

const PRECISION_RANK: Record<Precision, number> = {
  year: 0,
  month: 1,
  day: 2,
}

const toPrecision = (raw?: string | null): Precision =>
  raw === 'year' || raw === 'month' ? raw : 'day'

const coarserPrecision = (left: Precision, right: Precision): Precision =>
  PRECISION_RANK[left] <= PRECISION_RANK[right] ? left : right

const MS_PER_DAY = 86_400_000

/**
 * 달력 연·월·일 → UTC 기준 일련 일수.
 * `Date.UTC(0..99)`의 1900년대 보정을 피하기 위해 `setUTCFullYear`를 사용한다(BC 음수 연도 포함).
 */
export function utcDaySerial(year: number, month: number, day: number): number {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return Math.round(date.getTime() / MS_PER_DAY)
}

function formatYearToken(year: number, withUnit = false): string {
  if (year < 0) return withUnit ? `기원전 ${-year}년` : `기원전 ${-year}`
  return withUnit ? `${year}년` : String(year)
}

/** 순서 칩에 들어갈 짧은 시작 시점 표기 */
export function formatStepShortDate(source: FlowDatedItem): string | null {
  const parts = parseIsoDateParts(source.startDate)
  if (!parts) return null
  const { startPrecision } = effectiveRangePrecision(
    source.startDate,
    source.endDate,
    source.startDatePrecision,
    source.endDatePrecision,
  )
  const precision = toPrecision(startPrecision)
  if (precision === 'year') return formatYearToken(parts.year, true)
  if (precision === 'month') return `${formatYearToken(parts.year)}.${parts.month}`
  return `${formatYearToken(parts.year)}.${parts.month}.${parts.day}`
}

function formatBeforeSpan(days: number | null, months: number, years: number): string | null {
  if (days !== null) {
    if (days <= 0) return null
    if (days <= 92) return `상위 시작 ${days}일 전`
  }
  if (months > 0 && months < 24) return `상위 시작 ${months}개월 전`
  const wholeYears = Math.max(1, days !== null ? Math.round(days / 365.25) : months >= 12 ? Math.floor(months / 12) : years)
  return `상위 시작 ${wholeYears}년 전`
}

function formatAfterSpan(days: number | null, months: number, years: number): string | null {
  if (days !== null) {
    if (days <= 0) return null
    if (days <= 92) return `상위 종료 ${days}일 후`
  }
  if (months > 0 && months < 24) return `상위 종료 ${months}개월 후`
  const wholeYears = Math.max(1, days !== null ? Math.round(days / 365.25) : months >= 12 ? Math.floor(months / 12) : years)
  return `상위 종료 ${wholeYears}년 후`
}

/**
 * 상위 사건 기간 대비 현재 하위 사건의 시점 설명.
 * - 상위 시작 이전: '상위 시작 5일 전' · '상위 시작 3개월 전' · '상위 시작 2년 전'
 * - 상위 종료 이후: '상위 종료 10일 후' · '상위 종료 4개월 후'
 * - 상위 기간 중: '상위 시작 당일' · '시작 44일째' · '시작 3개월째' · '시작 2년째'
 */
export function relativeTimingLabel(parent: FlowDatedItem, current: FlowDatedItem): string | null {
  const parentStart = parseIsoDateParts(parent.startDate)
  const currentStart = parseIsoDateParts(current.startDate)
  if (!parentStart || !currentStart) return null

  const parentEff = effectiveRangePrecision(
    parent.startDate,
    parent.endDate,
    parent.startDatePrecision,
    parent.endDatePrecision,
  )
  const currentEff = effectiveRangePrecision(
    current.startDate,
    current.endDate,
    current.startDatePrecision,
    current.endDatePrecision,
  )

  const startPrecision = coarserPrecision(
    toPrecision(parentEff.startPrecision),
    toPrecision(currentEff.startPrecision),
  )

  const monthDiffFromStart =
    (currentStart.year - parentStart.year) * 12 + (currentStart.month - parentStart.month)
  const yearDiffFromStart = currentStart.year - parentStart.year

  // 1. 상위 시작일 이전 판정
  if (startPrecision === 'day') {
    const parentDay = utcDaySerial(parentStart.year, parentStart.month, parentStart.day)
    const currentDay = utcDaySerial(currentStart.year, currentStart.month, currentStart.day)
    if (currentDay < parentDay) {
      const daysBefore = parentDay - currentDay
      const approxMonths = Math.max(1, Math.floor(daysBefore / 30.4375))
      return formatBeforeSpan(daysBefore, approxMonths, parentStart.year - currentStart.year)
    }
  } else if (startPrecision === 'month') {
    if (monthDiffFromStart < 0) {
      return formatBeforeSpan(null, -monthDiffFromStart, parentStart.year - currentStart.year)
    }
  } else if (yearDiffFromStart < 0) {
    return formatBeforeSpan(null, 0, -yearDiffFromStart)
  }

  // 2. 상위 종료일 이후 판정
  const parentEnd = parseIsoDateParts(parent.endDate)
  if (parentEnd) {
    const endPrecision = coarserPrecision(
      toPrecision(parentEff.endPrecision),
      toPrecision(currentEff.startPrecision),
    )
    const monthDiffFromEnd =
      (currentStart.year - parentEnd.year) * 12 + (currentStart.month - parentEnd.month)
    const yearDiffFromEnd = currentStart.year - parentEnd.year

    if (endPrecision === 'day') {
      const parentEndDay = utcDaySerial(parentEnd.year, parentEnd.month, parentEnd.day)
      const currentDay = utcDaySerial(currentStart.year, currentStart.month, currentStart.day)
      if (currentDay > parentEndDay) {
        const daysAfter = currentDay - parentEndDay
        const approxMonths = Math.max(1, Math.floor(daysAfter / 30.4375))
        return formatAfterSpan(daysAfter, approxMonths, yearDiffFromEnd)
      }
    } else if (endPrecision === 'month') {
      if (monthDiffFromEnd > 0) {
        return formatAfterSpan(null, monthDiffFromEnd, yearDiffFromEnd)
      }
    } else if (yearDiffFromEnd > 0) {
      return formatAfterSpan(null, 0, yearDiffFromEnd)
    }
  }

  // 3. 상위 기간 중 경과 판정
  if (startPrecision === 'day') {
    const parentDay = utcDaySerial(parentStart.year, parentStart.month, parentStart.day)
    const currentDay = utcDaySerial(currentStart.year, currentStart.month, currentStart.day)
    const elapsedDays = currentDay - parentDay
    if (elapsedDays === 0) return '상위 시작 당일'
    if (elapsedDays < 92) return `시작 ${elapsedDays + 1}일째`
    const elapsedMonths = Math.floor(elapsedDays / 30.4375)
    if (elapsedMonths < 24) return `시작 ${Math.max(1, elapsedMonths)}개월째`
    return `시작 ${Math.floor(elapsedDays / 365.25)}년째`
  }

  if (startPrecision === 'month') {
    if (monthDiffFromStart === 0) return '시작 첫 달'
    if (monthDiffFromStart < 24) return `시작 ${monthDiffFromStart}개월째`
    return `시작 ${Math.floor(monthDiffFromStart / 12)}년째`
  }

  if (yearDiffFromStart <= 0) return null
  return `시작 ${yearDiffFromStart}년째`
}

export function buildParentFlowLayout(
  parent: FlowDatedItem & { phases?: ReadonlyArray<EventPhase> | null },
  siblings: ReadonlyArray<FlowDatedItem>,
  currentEvent: FlowDatedItem & { phaseId?: string | null },
): ParentFlowLayout | null {
  const ordered = siblings
    .slice()
    .sort((first, second) => compareEventStart(first.startDate, second.startDate))
  const index = ordered.findIndex((sibling) => sibling.id === currentEvent.id)
  if (index < 0 || ordered.length < 2) return null

  const parentEff = effectiveRangePrecision(
    parent.startDate,
    parent.endDate,
    parent.startDatePrecision,
    parent.endDatePrecision,
  )
  const parentSpanLabel = formatSpanLabel({
    id: parent.id,
    title: parent.title,
    startDate: parent.startDate,
    startDatePrecision: parentEff.startPrecision,
    endDate: parent.endDate,
    endDatePrecision: parentEff.endPrecision,
  })

  const phases = [...(parent.phases ?? [])].sort((left, right) => left.order - right.order)
  const reach = phases.length
    ? phaseReach(phases, {
        id: currentEvent.id,
        phaseId: currentEvent.phaseId ?? null,
        startDate: currentEvent.startDate ?? null,
        startDatePrecision: currentEvent.startDatePrecision ?? null,
        endDate: currentEvent.endDate ?? null,
        endDatePrecision: currentEvent.endDatePrecision ?? null,
      })
    : null
  const matchedPhase = reach?.from != null ? phases[reach.from - 1] : null

  const steps: FlowStepItem[] = ordered.map((sibling, stepIdx) => {
    const eff = effectiveRangePrecision(
      sibling.startDate,
      sibling.endDate,
      sibling.startDatePrecision,
      sibling.endDatePrecision,
    )
    return {
      id: sibling.id,
      order: stepIdx + 1,
      title: sibling.title,
      current: sibling.id === currentEvent.id,
      shortDate: formatStepShortDate(sibling),
      dateLabel: formatSpanLabel({
        id: sibling.id,
        title: sibling.title,
        startDate: sibling.startDate,
        startDatePrecision: eff.startPrecision,
        endDate: sibling.endDate,
        endDatePrecision: eff.endPrecision,
      }),
    }
  })

  return {
    count: ordered.length,
    position: index + 1,
    prev: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
    steps,
    relativeTiming: relativeTimingLabel(parent, currentEvent),
    phase: matchedPhase && reach?.from != null ? `${reach.from}국면 ${matchedPhase.title}` : null,
    parentSpanLabel,
  }
}
