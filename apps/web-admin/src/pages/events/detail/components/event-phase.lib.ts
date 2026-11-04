/**
 * 국면 — 묶음 사건 안의 구획(목차). 사건이 아니라서 깊이를 늘리지 않고, 하위 사건은 상위 바로 아래에 둔 채
 * '몇 국면'인지만 정한다. 손으로 넣은 국면(phaseId)이 우선, 없으면 시작일이 국면 기간에 드는 국면(날짜로 자동).
 *
 * 날짜 축은 부호 연도(BC 음수) × 10000 + 월 × 100 + 일. 국면 시작의 빈 월·일은 1월 1일, 끝의 빈 월·일은
 * 12월 31일로 둔다(연도만 적은 국면이 그해 전체를 덮게). 끝을 비운 국면은 다음 국면 시작 전날까지.
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import { isDayPrecise } from './event-facts.lib'

export interface PhasePoint {
  era?: 'BC' | 'AD' | null
  year?: number | null
  month?: number | null
  day?: number | null
}

export interface EventPhase {
  id: string
  title: string
  order: number
  startEra?: 'BC' | 'AD' | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: 'BC' | 'AD' | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  description?: string | null
}

export interface PhaseChild {
  id: string
  phaseId?: string | null
  startDate?: string | null
  startDatePrecision?: string | null
  startEra?: string | null
  startYear?: number | null
  /** 끝 — 여러 국면에 걸친 하위(1792–1797 전쟁)를 '2–4국면'으로 말하려고 */
  endDate?: string | null
  endDatePrecision?: string | null
}

const signed = (era: string | null | undefined, year: number) => (era === 'BC' ? -year : year)
const keyOf = (year: number, month: number, day: number) =>
  year < 0 ? year * 10000 - (1231 - (month * 100 + day)) : year * 10000 + month * 100 + day

/** 국면 시작 키 — 빈 월·일은 그해(그달) 첫날 */
export function phaseStartKey(phase: EventPhase): number | null {
  if (phase.startYear == null) return null
  return keyOf(signed(phase.startEra, phase.startYear), phase.startMonth ?? 1, phase.startDay ?? 1)
}

/** 국면 끝 키 — 빈 월·일은 그해(그달) 마지막 날 */
export function phaseEndKey(phase: EventPhase): number | null {
  if (phase.endYear == null) return null
  return keyOf(signed(phase.endEra, phase.endYear), phase.endMonth ?? 12, phase.endDay ?? 31)
}

/** 하위 사건 시작 키 — 연도만 아는 사건은 그해 7월 1일(1월 1일로 두면 앞 국면에 끌려간다) */
export function childStartKey(child: PhaseChild): number | null {
  const parts = parseIsoDateParts(child.startDate)
  if (parts) {
    if (child.startDatePrecision === 'month') return keyOf(parts.year, parts.month, 15)
    if (child.startDatePrecision === 'year' || !isDayPrecise(child.startDate as string, child.startDatePrecision)) {
      return keyOf(parts.year, 7, 1)
    }
    return keyOf(parts.year, parts.month, parts.day)
  }
  if (child.startYear != null) return keyOf(signed(child.startEra, child.startYear), 7, 1)
  return null
}

export interface PhaseAssignment {
  phaseId: string | null
  /** 손으로 넣은 국면인가(아니면 날짜로 자동) */
  manual: boolean
}

/** 국면 순서대로, 끝을 비운 국면은 다음 국면 시작 전까지로 채운 [시작, 끝] 구간 */
export function phaseRanges(phases: ReadonlyArray<EventPhase>): Array<{ phase: EventPhase; from: number; to: number }> {
  const sorted = [...phases].sort((left, right) => left.order - right.order)
  return sorted.map((phase, index) => {
    const from = phaseStartKey(phase) ?? Number.NEGATIVE_INFINITY
    const nextStart = sorted.slice(index + 1).map(phaseStartKey).find((key): key is number => key != null)
    const to = phaseEndKey(phase) ?? (nextStart != null ? nextStart - 1 : Number.POSITIVE_INFINITY)
    return { phase, from, to }
  })
}

/** 하위 사건마다 국면 — 손 지정이 이 국면 목록에 있으면 그것, 아니면 시작일로 */
export function assignPhases(
  phases: ReadonlyArray<EventPhase>,
  children: ReadonlyArray<PhaseChild>,
): Map<string, PhaseAssignment> {
  const ranges = phaseRanges(phases)
  const known = new Set(phases.map((phase) => phase.id))
  const result = new Map<string, PhaseAssignment>()
  for (const child of children) {
    if (child.phaseId && known.has(child.phaseId)) {
      result.set(child.id, { phaseId: child.phaseId, manual: true })
      continue
    }
    const key = childStartKey(child)
    const hit = key == null ? undefined : ranges.find((range) => key >= range.from && key <= range.to)
    result.set(child.id, { phaseId: hit?.phase.id ?? null, manual: false })
  }
  return result
}

/** '1791.10–1792.3' · '1792.8.10–' · '기원전 49–기원전 44' */
export function phaseRangeLabel(phase: EventPhase): string {
  const point = (era: string | null | undefined, year?: number | null, month?: number | null, day?: number | null) => {
    if (year == null) return ''
    const head = era === 'BC' ? `기원전 ${year}` : String(year)
    return [head, month, month != null ? day : null].filter((part) => part != null).join('.')
  }
  const start = point(phase.startEra, phase.startYear, phase.startMonth, phase.startDay)
  const end = point(phase.endEra, phase.endYear, phase.endMonth, phase.endDay)
  if (!start && !end) return ''
  return `${start}–${end}`
}

/**
 * 국면 기간 입력 — '1791.10' · '1792.8.10' · '1792-08-10' · '기원전 49' · 'BC 49'. 비면 null(기간 없음),
 * 읽을 수 없으면 undefined(입력 오류).
 */
export function parsePhasePoint(text: string): PhasePoint | null | undefined {
  const trimmed = text.trim()
  if (!trimmed) return null
  const bc = /^(기원전|BC|B\.C\.)\s*/i.test(trimmed)
  const body = trimmed.replace(/^(기원전|BC|B\.C\.)\s*/i, '').replace(/년|월/g, '.').replace(/일/g, '').replace(/\s+/g, '')
  const match = body.match(/^(\d{1,4})(?:[.\-/](\d{1,2}))?(?:[.\-/](\d{1,2}))?\.?$/)
  if (!match) return undefined
  const year = Number(match[1])
  const month = match[2] ? Number(match[2]) : null
  const day = match[3] ? Number(match[3]) : null
  if (year < 1 || (month != null && (month < 1 || month > 12)) || (day != null && (day < 1 || day > 31))) return undefined
  return { era: bc ? 'BC' : 'AD', year, month, day }
}

/** 입력칸에 되돌려 쓰는 표기 — parsePhasePoint의 역 */
export function formatPhasePoint(era?: string | null, year?: number | null, month?: number | null, day?: number | null): string {
  if (year == null) return ''
  const head = era === 'BC' ? `기원전 ${year}` : String(year)
  return [head, month, month != null ? day : null].filter((part) => part != null).join('.')
}

export interface DatedPhase {
  phase: EventPhase
  /** 1부터 — '2국면' */
  position: number
  startDate: string | null
  startDatePrecision: 'year' | 'month' | 'day' | null
  endDate: string | null
  endDatePrecision: 'year' | 'month' | 'day' | null
}

const pad = (value: number, width: number) => String(value).padStart(width, '0')
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

/** 국면 시작 → 사건 날짜 꼴(부호 연도 ISO + 정밀도) — 시간축(toAxisSpan)에 그대로 얹는다 */
function startIso(era: string | null | undefined, year: number, month?: number | null, day?: number | null) {
  const signedYear = signed(era, year)
  const iso = `${signedYear < 0 ? '-' : ''}${pad(Math.abs(signedYear), 4)}-${pad(month ?? 1, 2)}-${pad(day ?? 1, 2)}`
  const precision: DatedPhase['startDatePrecision'] = day != null ? 'day' : month != null ? 'month' : 'year'
  return { iso, precision }
}

/** 국면 끝 — 빈 월·일은 그해(그달) 마지막 날까지 덮게 */
function endIso(era: string | null | undefined, year: number, month?: number | null, day?: number | null) {
  const signedYear = signed(era, year)
  const endMonth = month ?? 12
  const endDay = day ?? lastDay(Math.abs(signedYear), endMonth)
  const iso = `${signedYear < 0 ? '-' : ''}${pad(Math.abs(signedYear), 4)}-${pad(endMonth, 2)}-${pad(endDay, 2)}`
  return { iso, precision: 'day' as const }
}

/**
 * 국면을 시간축에 얹을 날짜 꼴로 — 끝을 비운 국면은 다음 국면 시작까지(마지막이면 끝 없음).
 * 시작이 없는 국면은 그릴 수 없어 뺀다.
 */
export function datedPhases(phases: ReadonlyArray<EventPhase>): DatedPhase[] {
  const sorted = [...phases].sort((left, right) => left.order - right.order)
  return sorted.flatMap((phase, index) => {
    if (phase.startYear == null) return []
    const start = startIso(phase.startEra, phase.startYear, phase.startMonth, phase.startDay)
    let end: { iso: string; precision: DatedPhase['endDatePrecision'] } | null = null
    if (phase.endYear != null) {
      end = endIso(phase.endEra, phase.endYear, phase.endMonth, phase.endDay)
    } else {
      const next = sorted.slice(index + 1).find((item) => item.startYear != null)
      if (next?.startYear != null) {
        const nextStart = startIso(next.startEra, next.startYear, next.startMonth, next.startDay)
        end = { iso: nextStart.iso, precision: nextStart.precision }
      }
    }
    return [
      {
        phase,
        position: index + 1,
        startDate: start.iso,
        startDatePrecision: start.precision,
        endDate: end?.iso ?? null,
        endDatePrecision: end?.precision ?? null,
      },
    ]
  })
}

/** 하위 사건 끝 키 — 연·월만 아는 끝은 그해(그달) 마지막 날 */
export function childEndKey(child: PhaseChild): number | null {
  const parts = parseIsoDateParts(child.endDate)
  if (!parts) return null
  if (child.endDatePrecision === 'year' || (!child.endDatePrecision && !isDayPrecise(child.endDate as string, child.endDatePrecision))) {
    return keyOf(parts.year, 12, 31)
  }
  if (child.endDatePrecision === 'month') return keyOf(parts.year, parts.month, 31)
  return keyOf(parts.year, parts.month, parts.day)
}

export interface PhaseReach {
  /** 시작이 든 국면(1부터) — 없으면 null */
  from: number | null
  /** 끝이 든 국면 — 걸치지 않으면 from과 같다 */
  to: number | null
  /** 국면 밖이면 어디쯤인가 — 첫 국면 전·국면 사이·마지막 국면 후 */
  outside: 'before' | 'between' | 'after' | null
  manual: boolean
}

/**
 * 하위 사건이 국면 어디에 놓이나 — 시작이 든 국면부터 끝이 든 국면까지('2–4국면').
 * 손으로 넣은 국면이 있으면 그 하나. 국면 밖이면 첫 국면 전/사이/후 중 어디인지.
 */
export function phaseReach(phases: ReadonlyArray<EventPhase>, child: PhaseChild): PhaseReach {
  const ranges = phaseRanges(phases)
  const positionOf = (id: string | null | undefined) => {
    const index = ranges.findIndex((range) => range.phase.id === id)
    return index >= 0 ? index + 1 : null
  }
  const assigned = assignPhases(phases, [child]).get(child.id)
  if (assigned?.manual) {
    const position = positionOf(assigned.phaseId)
    return { from: position, to: position, outside: null, manual: true }
  }
  const from = positionOf(assigned?.phaseId)
  const startKey = childStartKey(child)
  const endKey = childEndKey(child)
  let to = from
  if (from != null && endKey != null) {
    for (let index = ranges.length - 1; index >= from; index -= 1) {
      if (endKey >= ranges[index].from) {
        to = index + 1
        break
      }
    }
  }
  let outside: PhaseReach['outside'] = null
  if (from == null && startKey != null && ranges.length > 0) {
    if (startKey < ranges[0].from) outside = 'before'
    else if (startKey > ranges[ranges.length - 1].to) outside = 'after'
    else outside = 'between'
  }
  return { from, to, outside, manual: false }
}

/** '2국면' · '2–4국면' · '국면 전' */
export function phaseReachLabel(reach: PhaseReach): string {
  if (reach.from == null) {
    return reach.outside === 'before' ? '국면 전' : reach.outside === 'after' ? '국면 후' : '국면 밖'
  }
  return reach.to != null && reach.to !== reach.from ? `${reach.from}–${reach.to}국면` : `${reach.from}국면`
}
