/**
 * 사건 참여 인물(PersonEvent)의 두 가지 파생 — 사건 쪽 저장·인물 쪽 연결·사건 상세 읽기가 함께 쓴다.
 *
 * 1) 참여 자격 국가 추론 — 사람이 적지 않아도 모호하지 않으면 채운다.
 *    ① 인물의 역사국가 국적이 사건 참여국(또는 주 무대) → 그 역사국가
 *    ② 인물의 현대국가 국적이 사건 참여국 → 그 현대국가
 *    ③ 역사국가가 아직 없고, 인물의 현대국가와 브리지로 이어진 역사국가가 참여국 중 **딱 하나** → 그 역사국가
 *    (마이그레이션 20260930180000의 백필과 같은 규칙)
 *
 * 2) 사건 당시 직위 — 역할 칸에 '제42대 미국 대통령(1993~2001)'처럼 직위·기간을 손으로 다시
 *    적던 것을, 재임·재위 기록에서 사건 날짜에 맞는 것을 찾아 보여 준다(저장하지 않는 파생).
 */
import { reignWhere, tenureWhere } from '../../person/infrastructure/office-holding.query'
import type { Prisma, PrismaClient } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

export interface ParticipationCountry {
  countryId: string | null
  historicalCountryId: string | null
}

/** 여러 인물의 참여 자격 국가를 한 번에 추론 — 추론 불가면 두 값 모두 null */
export async function inferParticipationCountries(
  db: Db,
  eventId: string,
  personIds: string[],
): Promise<Map<string, ParticipationCountry>> {
  const result = new Map<string, ParticipationCountry>()
  if (personIds.length === 0) return result

  const [event, persons] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        historicalCountryId: true,
        countryRelations: { select: { countryId: true, historicalCountryId: true } },
      },
    }),
    db.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, countryId: true, historicalCountryId: true },
    }),
  ])
  if (!event) return result

  const eventModern = new Set(
    event.countryRelations
      .map((relation) => relation.countryId)
      .filter((id): id is string => !!id),
  )
  const eventHistorical = new Set(
    event.countryRelations
      .map((relation) => relation.historicalCountryId)
      .filter((id): id is string => !!id),
  )
  if (event.historicalCountryId) eventHistorical.add(event.historicalCountryId)

  // ③ 브리지: 사건의 역사 참여국 → 이어진 현대국
  const bridges =
    eventHistorical.size > 0
      ? await db.historicalCountryModernCountry.findMany({
          where: { historicalCountryId: { in: [...eventHistorical] } },
          select: { historicalCountryId: true, modernCountryId: true },
        })
      : []
  const historicalByModern = new Map<string, Set<string>>()
  for (const bridge of bridges) {
    const set = historicalByModern.get(bridge.modernCountryId) ?? new Set<string>()
    set.add(bridge.historicalCountryId)
    historicalByModern.set(bridge.modernCountryId, set)
  }

  for (const person of persons) {
    let historicalCountryId: string | null =
      person.historicalCountryId && eventHistorical.has(person.historicalCountryId)
        ? person.historicalCountryId
        : null
    const countryId: string | null =
      person.countryId && eventModern.has(person.countryId) ? person.countryId : null
    if (!historicalCountryId && person.countryId) {
      const bridged = historicalByModern.get(person.countryId)
      if (bridged && bridged.size === 1) historicalCountryId = [...bridged][0]
    }
    result.set(person.id, { countryId, historicalCountryId })
  }
  return result
}

// ─── 사건 당시 직위 ──────────────────────────────────────────────────────────

/** 부호 연·월·일 → 비교 키 범위. 모르는 부분은 그 단위 전체로 넓힌다 */
export function keyRange(
  year: number | null,
  month: number | null,
  day: number | null,
): [number, number] | null {
  if (year == null) return null
  const base = year * 10000
  if (month == null) return [base + 101, base + 1231]
  if (day == null) return [base + month * 100 + 1, base + month * 100 + 31]
  const key = base + month * 100 + day
  return [key, key]
}

export type DateParts = { year: number | null; month: number | null; day: number | null }

/** 구조화 날짜(BC 안전) 우선, 없으면 DATETIME */
export function partsOf(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  date: Date | null | undefined,
): DateParts {
  if (year != null) {
    return { year: era === 'BC' ? -year : year, month: month ?? null, day: day ?? null }
  }
  if (date) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    }
  }
  return { year: null, month: null, day: null }
}

/** 사건 시점(기간 전체) → 인물별 '당시 직위' 라벨(재위 먼저, 최대 3개) */
export async function resolveOfficesAtEvent(
  db: Db,
  event: {
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    startDate?: Date | null
    endEra?: string | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
    endDate?: Date | null
  },
  personIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  if (personIds.length === 0) return result
  const startParts = partsOf(
    event.startEra,
    event.startYear,
    event.startMonth,
    event.startDay,
    event.startDate,
  )
  const startRange = keyRange(startParts.year, startParts.month, startParts.day)
  if (!startRange) return result
  const endParts = partsOf(
    event.endEra,
    event.endYear,
    event.endMonth,
    event.endDay,
    event.endDate,
  )
  const endRange = keyRange(endParts.year, endParts.month, endParts.day)
  const eventSpanStart = startRange[0]
  const eventSpanEnd =
    endRange && endRange[1] >= startRange[0] ? endRange[1] : startRange[1]

  const overlaps = (start: DateParts, end: DateParts) => {
    const startRangeItem = keyRange(start.year, start.month, start.day)
    if (!startRangeItem) return false
    const endRangeItem = keyRange(end.year, end.month, end.day)
    // 끝이 없으면 진행 중 — 시작 이후 전부
    const endKey = endRangeItem ? endRangeItem[1] : Number.MAX_SAFE_INTEGER
    return startRangeItem[0] <= eventSpanEnd && endKey >= eventSpanStart
  }

  const [reigns, tenures, unitCommands, militaryCareers] = await Promise.all([
    // 재위 = 군주직 재임 행 (직위 보유 단일 모델 이행 2단계)
    db.governmentPositionTenure.findMany({
      where: reignWhere({ personId: { in: personIds } }),
      select: {
        personId: true,
        startEra: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        startDate: true,
        endEra: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        endDate: true,
        regnalName: true,
        title: true,
        rankTitle: true,
        positionDefinition: { select: { title: true } },
        administrationDepartment: { select: { name: true } },
        militaryUnit: { select: { name: true } },
        country: { select: { name: true } },
        historicalCountry: { select: { name: true } },
      },
    }),
    db.governmentPositionTenure.findMany({
      where: tenureWhere({ personId: { in: personIds } }),
      select: {
        personId: true,
        startEra: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        startDate: true,
        endEra: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        endDate: true,
        title: true,
        rankTitle: true,
        positionDefinition: { select: { title: true } },
        administrationDepartment: { select: { name: true } },
        militaryUnit: { select: { name: true } },
        country: { select: { name: true } },
        historicalCountry: { select: { name: true } },
      },
    }),
    db.militaryUnitCommander.findMany({
      where: { personId: { in: personIds } },
      select: {
        personId: true,
        rank: true,
        role: true,
        startDate: true,
        endDate: true,
        unit: {
          select: {
            name: true,
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
          },
        },
      },
    }),
    db.militaryCareer.findMany({
      where: { personId: { in: personIds } },
      select: {
        personId: true,
        position: true,
        startDate: true,
        endDate: true,
        rank: { select: { title: true } },
        militaryUnit: {
          select: {
            name: true,
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
          },
        },
        organization: { select: { name: true } },
      },
    }),
  ])

  const push = (personId: string, label: string) => {
    const list = result.get(personId) ?? []
    if (!list.includes(label) && list.length < 3) list.push(label)
    result.set(personId, list)
  }

  for (const reign of reigns) {
    const start = partsOf(reign.startEra, reign.startYear, reign.startMonth, reign.startDay, reign.startDate)
    const end = partsOf(reign.endEra, reign.endYear, reign.endMonth, reign.endDay, reign.endDate)
    if (!overlaps(start, end)) continue
    const countryName = reign.historicalCountry?.name ?? reign.country?.name ?? ''
    const office = reign.title ?? reign.positionDefinition?.title ?? '군주'
    const name = reign.regnalName ? ` ${reign.regnalName}` : ''
    push(reign.personId, `${countryName} ${office}${name}`.trim())
  }
  for (const tenure of tenures) {
    const start = partsOf(tenure.startEra, tenure.startYear, tenure.startMonth, tenure.startDay, tenure.startDate)
    const end = partsOf(tenure.endEra, tenure.endYear, tenure.endMonth, tenure.endDay, tenure.endDate)
    if (!overlaps(start, end)) continue
    const countryName = tenure.historicalCountry?.name ?? tenure.country?.name ?? ''
    const office = tenure.title ?? tenure.positionDefinition?.title
    if (!office) continue
    const institutionName = tenure.militaryUnit?.name ?? tenure.administrationDepartment?.name ?? ''
    const institutionPart =
      institutionName && !office.includes(institutionName) ? `${institutionName} ` : ''
    const rankSuffix = tenure.rankTitle ? ` (${tenure.rankTitle})` : ''
    push(tenure.personId, `${countryName} ${institutionPart}${office}${rankSuffix}`.trim())
  }
  for (const cmd of unitCommands) {
    const start = partsOf(null, null, null, null, cmd.startDate)
    const end = partsOf(null, null, null, null, cmd.endDate)
    if (!overlaps(start, end)) continue
    const countryName = cmd.unit.historicalCountry?.name ?? cmd.unit.country?.name ?? ''
    const roleLabel = cmd.role ?? '지휘관'
    const rankSuffix = cmd.rank ? ` (${cmd.rank})` : ''
    push(cmd.personId, `${countryName} ${cmd.unit.name} ${roleLabel}${rankSuffix}`.trim())
  }
  for (const career of militaryCareers) {
    const start = partsOf(null, null, null, null, career.startDate)
    const end = partsOf(null, null, null, null, career.endDate)
    if (!overlaps(start, end)) continue
    const countryName =
      career.militaryUnit?.historicalCountry?.name ??
      career.militaryUnit?.country?.name ??
      ''
    const orgName = career.militaryUnit?.name ?? career.organization?.name ?? ''
    const posLabel = career.position ?? ''
    const rankSuffix = career.rank?.title ? ` (${career.rank.title})` : ''
    const full = [countryName, orgName, posLabel].filter(Boolean).join(' ') + rankSuffix
    if (full.trim()) push(career.personId, full.trim())
  }
  return result
}

// ─── 앞뒤 안 맞는 연결 경고(표시만, 막지 않음) ─────────────────────────────

const formatSignedYear = (year: number) => (year < 0 ? `기원전 ${-year}` : `${year}`)

/** DATETIME + era → 부호 연도(Person 생몰처럼 구조화 칸이 없는 경우) */
export function signedYearOfDate(
  era: string | null | undefined,
  date: Date | null | undefined,
): number | null {
  if (!date) return null
  const year = date.getUTCFullYear()
  return era === 'BC' ? -year : year
}

/**
 * 사건이 걸친 연도 — 시작(부호 연도)과 끝. 끝을 모르면 시작 한 해로 본다.
 * 경고는 이 기간 전체와 견준다 — 예전엔 시작 연도 하나만 봐서, 프랑스 혁명(1789~1799)에 걸린
 * 프랑스 제1공화국(1792~1804)이 "존속 밖"으로 떴다(존속 경고 17건 중 7건이 이런 오탐).
 */
export interface EventYearSpan {
  start: number | null
  end: number | null
}

/** 사건 기간과 [from, to]가 한 해도 겹치지 않으면 true — 양끝을 모르면 그쪽은 열려 있다 */
function isOutside(span: EventYearSpan, from: number | null, to: number | null): boolean {
  if (span.start == null) return false
  const spanEnd = span.end != null && span.end >= span.start ? span.end : span.start
  const endsBefore = from != null && spanEnd < from
  const startsAfter = to != null && span.start > to
  return endsBefore || startsAfter
}

const rangeLabel = (from: number | null, to: number | null) =>
  `${from != null ? formatSignedYear(from) : '?'}~${to != null ? formatSignedYear(to) : ''}`

/**
 * 참여 인물의 생몰년과 사건 기간이 한 해도 겹치지 않으면 안내 문구, 아니면 null.
 * 태어난 해·죽은 해 안의 사건은 맞는 것으로 본다(연도 단위 비교).
 */
export function describeLifespanMismatch(
  span: EventYearSpan,
  birthYear: number | null,
  deathYear: number | null,
): string | null {
  if (birthYear == null && deathYear == null) return null
  if (!isOutside(span, birthYear, deathYear)) return null
  return `생몰(${rangeLabel(birthYear, deathYear)}) 밖의 사건입니다`
}

/**
 * 역사국가의 존속 기간과 사건 기간이 한 해도 겹치지 않으면 안내 문구, 아니면 null.
 * 건국·멸망 역할(FOUNDED·DISSOLVED)은 경계에 걸치는 게 정상이라 보지 않는다
 * (예: 중화민국 수립 전의 신해혁명).
 */
export function describeExistenceMismatch(
  span: EventYearSpan,
  role: string | null | undefined,
  startYear: number | null,
  endYear: number | null,
): string | null {
  if (role === 'FOUNDED' || role === 'DISSOLVED') return null
  if (startYear == null && endYear == null) return null
  if (!isOutside(span, startYear, endYear)) return null
  return `존속(${rangeLabel(startYear, endYear)}) 밖의 사건입니다`
}

// ─── 사건 당시 사망·전사·처형·피살 파생 ─────────────────────────────────────

export interface DeathAtEventInfo {
  /** 표시 라벨 — '전사' · '처형' · '피살' · '자결' · '병사' · '사고사' · '사망' */
  label: string
  /** 사망 시점 짧은 표기 — '1919.1.15' */
  dateLabel: string | null
  /** 사망 원인 상세(Person.deathCause) */
  cause: string | null
}

const DEATH_TYPE_LABEL: Record<string, string> = {
  BATTLE: '전사',
  EXECUTION: '처형',
  ASSASSINATION: '피살',
  SUICIDE: '자결',
  ACCIDENT: '사고사',
  ILLNESS: '병사',
  NATURAL: '사망',
  UNKNOWN: '사망',
}

const VIOLENT_DEATH_TYPES = new Set(['BATTLE', 'EXECUTION', 'ASSASSINATION', 'SUICIDE'])

function extractEventDateParts(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  date: Date | null | undefined,
  precision: string | null | undefined,
): DateParts {
  const prec = precision ?? 'day'
  const base = partsOf(era, year, month, day, date)
  if (base.year == null) return base
  const resolvedMonth =
    prec === 'year' ? null : (base.month ?? (date ? date.getUTCMonth() + 1 : null))
  const resolvedDay =
    prec === 'day' ? (base.day ?? (date ? date.getUTCDate() : null)) : null
  return { year: base.year, month: resolvedMonth, day: resolvedDay }
}

/**
 * 참여 인물이 이 사건 도중(또는 교전·진압 직후 체포·부상으로 수일 내) 사망했으면
 * `{ label, dateLabel, cause }`를 돌려준다. 저장하지 않는 읽기 파생.
 */
export function describeDeathAtEvent(
  event: {
    kind?: string | null
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    startDate?: Date | null
    startDatePrecision?: string | null
    endEra?: string | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
    endDate?: Date | null
    endDatePrecision?: string | null
  },
  person: {
    deathEra?: string | null
    deathDate?: Date | null
    deathDatePrecision?: string | null
    deathType?: string | null
    deathCause?: string | null
  },
): DeathAtEventInfo | null {
  if (!person.deathDate) return null
  const deathYear = signedYearOfDate(person.deathEra, person.deathDate)
  if (deathYear == null) return null

  const deathPrecision = person.deathDatePrecision ?? 'day'
  const deathMonth = deathPrecision === 'year' ? null : person.deathDate.getUTCMonth() + 1
  const deathDay = deathPrecision === 'day' ? person.deathDate.getUTCDate() : null

  const start = extractEventDateParts(
    event.startEra,
    event.startYear,
    event.startMonth,
    event.startDay,
    event.startDate,
    event.startDatePrecision,
  )
  if (start.year == null) return null

  const rawEnd = extractEventDateParts(
    event.endEra,
    event.endYear,
    event.endMonth,
    event.endDay,
    event.endDate,
    event.endDatePrecision,
  )
  const end = rawEnd.year != null ? rawEnd : start

  // 다년 묶음 사건(예: 제1차 세계 대전)에서는 개별 하위 전투·사건에서 표시하므로 생략
  if (event.kind === 'COLLECTION' && end.year! - start.year > 1) return null

  const isViolent = VIOLENT_DEATH_TYPES.has(person.deathType ?? '')

  if (
    start.year > 0 &&
    end.year! > 0 &&
    start.month != null &&
    start.day != null &&
    end.month != null &&
    end.day != null &&
    deathYear > 0 &&
    deathMonth != null &&
    deathDay != null
  ) {
    const startMs = Date.UTC(start.year, start.month - 1, start.day)
    const endMs = Date.UTC(end.year!, end.month - 1, end.day)
    const deathMs = Date.UTC(deathYear, deathMonth - 1, deathDay)
    const durationDays = Math.max(0, Math.round((endMs - startMs) / 86_400_000))
    if (durationDays > 365) return null
    // 단기 교전·봉기·진압 직후 포로 처형·부상 사망(예: 1.10~12 진압 후 1.15 리프크네히트·룩셈부르크 처형)은 7일 유예
    const graceDays = isViolent && durationDays <= 60 ? 7 : 0
    if (deathMs < startMs || deathMs > endMs + graceDays * 86_400_000) return null
  } else {
    // 연·월 단위 정밀도일 때는 전사·처형·피살·자결 같은 비자연사만 매칭(같은 해 자연사 오탐 방지)
    if (!isViolent || end.year! - start.year > 1) return null
    const startRange = keyRange(start.year, start.month, start.day)
    const endRange = keyRange(end.year, end.month, end.day)
    const deathRange = keyRange(deathYear, deathMonth, deathDay)
    if (!startRange || !endRange || !deathRange) return null
    if (deathRange[1] < startRange[0] || deathRange[0] > endRange[1]) return null
  }

  const yearStr = formatSignedYear(deathYear)
  const dateLabel =
    deathMonth != null
      ? deathDay != null
        ? `${yearStr}.${deathMonth}.${deathDay}`
        : `${yearStr}.${deathMonth}`
      : yearStr

  return {
    label: DEATH_TYPE_LABEL[person.deathType ?? ''] ?? '사망',
    dateLabel,
    cause: person.deathCause?.trim() || null,
  }
}
