/**
 * 사건 당시 수장 — 참여국마다 사건이 시작될 때의 **국가원수**와, 사건 기간 안에 바뀐 국가원수.
 *
 * 원천은 사건 목록의 즉위 표지와 같은 직위 보유 피드(`GET /government-positions/office-holding-timeline`)다.
 * 군주 재위와 대통령 재임이 한 테이블에 있고, 군주도 positionType이 HEAD_OF_STATE라 축은 직위 정의의
 * positionType으로 가른다(정부수반은 HEAD_OF_GOVERNMENT 명시만 — 도쿠가와 쇼군·푸앵카레 총리 재위 행이 이 경우).
 *
 * 날짜는 정수 키(연·월·일)로 견준다 — BC는 음수 연도, 모르는 월·일은 시작이면 앞쪽(1월 1일),
 * 끝이면 뒤쪽(12월 31일)으로 넓혀 '그때 재위 중'을 놓치지 않는다.
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

type Era = 'BC' | 'AD' | string | null | undefined

/** 피드 한 행 중 여기서 쓰는 필드 */
export interface OfficeHoldingRow {
  id: string
  personId: string
  countryId?: string | null
  historicalCountryId?: string | null
  positionType?: string | null
  isMonarchical?: boolean | null
  title?: string | null
  regnalName?: string | null
  startDate?: string | null
  startDatePrecision?: string | null
  startEra?: Era
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endDate?: string | null
  endEra?: Era
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  positionDefinition?: { title?: string | null; positionType?: string | null; isMonarchical?: boolean | null } | null
  person?: {
    id: string
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    isAlive?: boolean | null
    deathDate?: string | null
  } | null
}

/** 현대 국가 → 그 시기의 역사 국가로 잇기 위한 역사 국가 목록 항목 */
export interface BridgeCountry {
  id: string
  startEra?: Era
  startYear?: number | null
  endEra?: Era
  endYear?: number | null
  parentModernCountryIds?: string[] | null
}

/** 카드 한 장의 대상 — 현대 국가(C) 또는 역사 국가(H) */
export interface HeadsTarget {
  kind: 'C' | 'H'
  id: string
}

export interface HeadAtTime {
  recordId: string
  personId: string
  /** 왕호가 있으면 왕호(빌헬름 2세), 없으면 인물 표시명 */
  name: string
  /** 직위 정의 이름(황제·국왕·대통령) */
  title: string | null
  startYear: number
  startMonth: number | null
}

export interface CountryHeads {
  /** 사건 시작 시점의 국가원수 — 기록이 없으면 null */
  atStart: HeadAtTime | null
  /** 사건 기간 안에 새로 오른 국가원수(시간순, 같은 사람이 이어 맡은 것은 뺀다) */
  changes: HeadAtTime[]
}

const signed = (year: number, era: Era) => (era === 'BC' ? -Math.abs(year) : year)
const keyOf = (year: number, month: number, day: number) => year * 10000 + month * 100 + day

interface Bound {
  key: number
  year: number
  month: number | null
}

/** 시작 시점 — 모르는 월·일은 앞쪽으로 */
function lowerBound(
  era: Era,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  iso: string | null | undefined,
  precision?: string | null,
): Bound | null {
  const dropMonth = precision === 'year'
  const dropDay = dropMonth || precision === 'month'
  let parts: { year: number; month: number | null; day: number | null } | null = null
  if (year != null) parts = { year: signed(year, era), month: month ?? null, day: day ?? null }
  else {
    const parsed = parseIsoDateParts(iso)
    if (parsed) parts = { year: parsed.year, month: parsed.month, day: parsed.day }
  }
  if (!parts) return null
  const knownMonth = dropMonth ? null : parts.month
  const knownDay = dropDay ? null : parts.day
  return { key: keyOf(parts.year, knownMonth ?? 1, knownDay ?? 1), year: parts.year, month: knownMonth }
}

/** 끝 시점 — 모르는 월·일은 뒤쪽으로 */
function upperKey(
  era: Era,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  iso: string | null | undefined,
): number | null {
  if (year != null) return keyOf(signed(year, era), month ?? 12, day ?? 31)
  const parsed = parseIsoDateParts(iso)
  return parsed ? keyOf(parsed.year, parsed.month, parsed.day) : null
}

/** 국가원수 축인가 — 정부수반(HEAD_OF_GOVERNMENT 명시)만 뺀다 */
export function isHeadOfStateRow(row: OfficeHoldingRow): boolean {
  const type = row.positionDefinition?.positionType ?? row.positionType ?? null
  if (type === 'HEAD_OF_GOVERNMENT') return false
  return type === 'HEAD_OF_STATE' || Boolean(row.isMonarchical ?? row.positionDefinition?.isMonarchical)
}

interface Span {
  row: OfficeHoldingRow
  start: Bound
  endKey: number
}

function spanOf(row: OfficeHoldingRow): Span | null {
  const start = lowerBound(row.startEra, row.startYear, row.startMonth, row.startDay, row.startDate, row.startDatePrecision)
  if (!start) return null
  let endKey = upperKey(row.endEra, row.endYear, row.endMonth, row.endDay, row.endDate)
  if (endKey == null) {
    /* 끝이 비었으면 — 살아 있으면 현직, 아니면 사망까지, 그것도 모르면 즉위한 해까지만(조선 왕이 현대 동시대로 새지 않게) */
    if (row.person?.isAlive) endKey = Number.POSITIVE_INFINITY
    else {
      const death = parseIsoDateParts(row.person?.deathDate)
      endKey = death ? keyOf(death.year, death.month, death.day) : keyOf(start.year, 12, 31)
    }
  }
  return { row, start, endKey }
}

function toHead(span: Span): HeadAtTime {
  const { row } = span
  const personName = row.person ? getPersonDisplayName(row.person as Parameters<typeof getPersonDisplayName>[0], { omitMiddleName: true }) : ''
  return {
    recordId: row.id,
    personId: row.personId,
    name: row.regnalName?.trim() || personName || '이름 미상',
    title: row.positionDefinition?.title?.trim() || row.title?.trim() || null,
    startYear: span.start.year,
    startMonth: span.start.month,
  }
}

/** 사건 기간 — 끝이 없으면 시작한 날(하루짜리) */
export function eventWindow(event: {
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
}): { startKey: number; endKey: number; startYear: number; endYear: number } | null {
  const start = lowerBound(null, null, null, null, event.startDate, event.startDatePrecision)
  if (!start) return null
  const end = parseIsoDateParts(event.endDate)
  const endKey = end ? keyOf(end.year, end.month, end.day) : start.key
  return { startKey: start.key, endKey: Math.max(endKey, start.key), startYear: start.year, endYear: end?.year ?? start.year }
}

/** 현대 국가가 그 해에 이어지는 역사 국가들 */
export function bridgedHistoricalIds(
  modernCountryId: string,
  year: number,
  historicalCountries: ReadonlyArray<BridgeCountry>,
): string[] {
  return historicalCountries
    .filter((country) => country.parentModernCountryIds?.includes(modernCountryId))
    .filter((country) => {
      const from = country.startYear != null ? signed(country.startYear, country.startEra) : null
      const to = country.endYear != null ? signed(country.endYear, country.endEra) : null
      return (from == null || from <= year) && (to == null || year <= to)
    })
    .map((country) => country.id)
}

/**
 * 나라 하나의 당시 국가원수.
 * @param skipHistoricalIds 이미 따로 카드가 있는 역사 국가 — 현대 국가 카드가 같은 사람을 또 싣지 않게
 */
export function headsForCountry(
  target: HeadsTarget,
  rows: ReadonlyArray<OfficeHoldingRow>,
  window: { startKey: number; endKey: number; startYear: number },
  historicalCountries: ReadonlyArray<BridgeCountry> = [],
  skipHistoricalIds: ReadonlySet<string> = new Set(),
): CountryHeads {
  const bridged =
    target.kind === 'C'
      ? new Set(
          bridgedHistoricalIds(target.id, window.startYear, historicalCountries).filter((id) => !skipHistoricalIds.has(id)),
        )
      : null
  const matches = (row: OfficeHoldingRow) =>
    target.kind === 'H'
      ? row.historicalCountryId === target.id
      : row.countryId === target.id || Boolean(row.historicalCountryId && bridged?.has(row.historicalCountryId))

  const spans = rows
    .filter((row) => matches(row) && isHeadOfStateRow(row))
    .map(spanOf)
    .filter((span): span is Span => span !== null)
    .sort((left, right) => left.start.key - right.start.key)

  /* 시작 시점 재위 중 — 여럿이면(공동 통치·겹친 기록) 가장 늦게 오른 사람 */
  const atStartSpan =
    [...spans].reverse().find((span) => span.start.key <= window.startKey && span.endKey >= window.startKey) ?? null

  const changes: HeadAtTime[] = []
  let previousPersonId = atStartSpan?.row.personId ?? null
  for (const span of spans) {
    if (span.start.key <= window.startKey || span.start.key > window.endKey) continue
    if (span.row.personId === previousPersonId) continue
    changes.push(toHead(span))
    previousPersonId = span.row.personId
  }
  return { atStart: atStartSpan ? toHead(atStartSpan) : null, changes }
}

/** '1855.3' · '1855' · '기원전 44' */
export function formatHeadPoint(head: Pick<HeadAtTime, 'startYear' | 'startMonth'>): string {
  const year = head.startYear < 0 ? `기원전 ${Math.abs(head.startYear)}` : String(head.startYear)
  return head.startMonth ? `${year}.${head.startMonth}` : year
}

/** 카드 한 줄 툴팁 — 기간 중 교체를 빠짐없이 */
export function describeHeads(heads: CountryHeads): string {
  const parts: string[] = []
  if (heads.atStart) parts.push(`${heads.atStart.name}${heads.atStart.title ? ` (${heads.atStart.title})` : ''} — 사건 시작 시점`)
  for (const change of heads.changes) {
    parts.push(`${formatHeadPoint(change)} ${change.name}${change.title ? ` (${change.title})` : ''}`)
  }
  return parts.join('\n')
}
