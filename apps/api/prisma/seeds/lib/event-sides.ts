/**
 * 사건 진영(EventSide) 시드 헬퍼 — 진영·소속·측정값을 한 번에 멱등 반영한다.
 *
 * 설계: docs/event-detail-data-foundation.md D1·D3.
 * 진영은 참여자를 묶는 층이다. 그래서 '어느 나라가 어느 편'은 참여국 줄(EventCountryRelation)의
 * sideId로 쓰고, 진영 소속 국가를 따로 두 번 적지 않는다(옛 CountryInSide는 이 줄로 흡수됐다).
 * 병력·사상자는 문자열이 아니라 측정값(Observation)이며, 원문 문장은 인용의 quote로 보존한다.
 *
 * 멱등 키
 * - 진영: (사건, 진영명)
 * - 소속: (사건, 국가) — 참여국 줄이 없으면 만든다
 * - 측정값: (대상, 지표, 단서) — 같은 대상·지표라도 단서가 다르면 다른 값(정의·범위가 다르다)
 */
import {
  CitationTargetType,
  Era,
  EventCountryRole,
  MetricValueKind,
  ObservationSubjectType,
  ParticipationType,
  Prisma,
  SideLevel,
  SourceKind,
} from '@prisma/client'

import type { PrismaService } from '../../prisma.service'

export interface SeedPeriod {
  era: 'BC' | 'AD'
  year: number
  month?: number
  day?: number
}

export interface ObservationSeed {
  metricKey: string
  value?: string
  low?: string
  high?: string
  approx?: boolean
  atLeast?: boolean
  qualifier?: string
  currencyCode?: string
  start?: SeedPeriod
  end?: SeedPeriod
  /** 근거 원문 — 인용의 quote로 보존한다 */
  quote: string
}

export interface SideMemberSeed {
  /** 역사 국가 이름 또는 현대 국가 이름 — 둘 중 하나 */
  historicalCountry?: string
  country?: string
  participation?: ParticipationType
  join?: SeedPeriod
  joinReason?: string
  withdraw?: SeedPeriod
  withdrawReason?: string
  /** 참여국 줄을 새로 만들 때만 쓰는 역할 */
  roleIfNew?: EventCountryRole
  /** 참여국 줄에 서술이 비어 있을 때만 채운다(사람이 다듬은 서술을 덮지 않는다) */
  roleDescription?: string
  /** 비고에 덧붙일 이관 기록(지휘관 문장 등). 이미 들어 있으면 다시 붙이지 않는다 */
  noteAppend?: string
  observations?: ObservationSeed[]
}

export interface SideSeed {
  name: string
  level: SideLevel
  color?: string
  description?: string
  members: SideMemberSeed[]
  observations?: ObservationSeed[]
}

export interface SourceSeed {
  kind: SourceKind
  title: string
  note?: string
}

const PRECISION = (period: SeedPeriod) =>
  period.day != null ? 'day' : period.month != null ? 'month' : 'year'

function sortKey(period: { era: string | null; year: number | null; month?: number | null; day?: number | null }) {
  if (period.year == null) return null
  const signed = period.era === 'BC' ? -period.year : period.year
  return signed * 10_000 + (period.month ?? 1) * 100 + (period.day ?? 1)
}

/** 사건 시작과 같은 가담 시점은 저장하지 않는다 — '사건 시작과 다를 때만' 의미가 있다 */
function joinColumns(period: SeedPeriod | undefined, eventStartKey: number | null) {
  if (!period || sortKey(period) === eventStartKey) {
    return { joinEra: null, joinYear: null, joinMonth: null, joinDay: null, joinPrecision: null }
  }
  return {
    joinEra: period.era as Era,
    joinYear: period.year,
    joinMonth: period.month ?? null,
    joinDay: period.day ?? null,
    joinPrecision: PRECISION(period),
  }
}

function withdrawColumns(period: SeedPeriod | undefined) {
  if (!period) {
    return { withdrawEra: null, withdrawYear: null, withdrawMonth: null, withdrawDay: null, withdrawPrecision: null }
  }
  return {
    withdrawEra: period.era as Era,
    withdrawYear: period.year,
    withdrawMonth: period.month ?? null,
    withdrawDay: period.day ?? null,
    withdrawPrecision: PRECISION(period),
  }
}

async function ensureSource(prisma: PrismaService, source: SourceSeed): Promise<string> {
  const existing = await prisma.source.findFirst({
    where: { kind: source.kind, title: source.title },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.source.create({
    data: { kind: source.kind, title: source.title, note: source.note ?? null },
    select: { id: true },
  })
  return created.id
}

async function upsertObservation(
  prisma: PrismaService,
  subjectType: ObservationSubjectType,
  subjectId: string,
  seed: ObservationSeed,
  sortOrder: number,
  sourceId: string,
): Promise<void> {
  const metric = await prisma.metricDefinition.findUnique({
    where: { key: seed.metricKey },
    select: { id: true, valueKind: true },
  })
  if (!metric) throw new Error(`알 수 없는 지표: ${seed.metricKey}`)
  let currencyId: string | null = null
  if (metric.valueKind === MetricValueKind.MONEY) {
    if (!seed.currencyCode) throw new Error(`금액 지표에 통화가 없습니다: ${seed.metricKey}`)
    const currency = await prisma.currency.findUnique({ where: { code: seed.currencyCode }, select: { id: true } })
    if (!currency) throw new Error(`알 수 없는 통화: ${seed.currencyCode}`)
    currencyId = currency.id
  }
  const decimal = (raw?: string) => (raw == null ? null : new Prisma.Decimal(raw))
  const data = {
    value: decimal(seed.value),
    low: decimal(seed.low),
    high: decimal(seed.high),
    approx: seed.approx ?? false,
    atLeast: seed.atLeast ?? false,
    qualifier: seed.qualifier ?? null,
    currencyId,
    startEra: (seed.start?.era as Era | undefined) ?? null,
    startYear: seed.start?.year ?? null,
    startMonth: seed.start?.month ?? null,
    startDay: seed.start?.day ?? null,
    startPrecision: seed.start ? PRECISION(seed.start) : null,
    endEra: (seed.end?.era as Era | undefined) ?? null,
    endYear: seed.end?.year ?? null,
    endMonth: seed.end?.month ?? null,
    endDay: seed.end?.day ?? null,
    endPrecision: seed.end ? PRECISION(seed.end) : null,
    sortOrder,
  }
  const existing = await prisma.observation.findFirst({
    where: { subjectType, subjectId, metricId: metric.id, qualifier: seed.qualifier ?? null },
    select: { id: true },
  })
  const id = existing
    ? (await prisma.observation.update({ where: { id: existing.id }, data, select: { id: true } })).id
    : (
        await prisma.observation.create({
          data: { subjectType, subjectId, metricId: metric.id, ...data },
          select: { id: true },
        })
      ).id
  const citation = await prisma.citation.findFirst({
    where: { targetType: CitationTargetType.OBSERVATION, targetId: id, sourceId },
    select: { id: true },
  })
  if (citation) {
    await prisma.citation.update({ where: { id: citation.id }, data: { quote: seed.quote } })
  } else {
    await prisma.citation.create({
      data: { targetType: CitationTargetType.OBSERVATION, targetId: id, sourceId, quote: seed.quote },
    })
  }
}

/**
 * 사건 하나의 진영을 반영한다. 반환: 진영 수 · 소속 수 · 측정값 수.
 */
export async function applyEventSides(
  prisma: PrismaService,
  eventId: string,
  sides: SideSeed[],
  source: SourceSeed,
): Promise<{ sides: number; members: number; observations: number }> {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { startEra: true, startYear: true, startMonth: true, startDay: true },
  })
  const eventStartKey = sortKey({
    era: event.startEra,
    year: event.startYear,
    month: event.startMonth,
    day: event.startDay,
  })
  const sourceId = await ensureSource(prisma, source)
  let members = 0
  let observations = 0

  for (const [sideIndex, side] of sides.entries()) {
    const existingSide = await prisma.eventSide.findFirst({
      where: { eventId, name: side.name },
      select: { id: true },
    })
    const sideData = {
      level: side.level,
      color: side.color ?? null,
      description: side.description ?? null,
      sortOrder: sideIndex,
    }
    const sideId = existingSide
      ? (await prisma.eventSide.update({ where: { id: existingSide.id }, data: sideData, select: { id: true } })).id
      : (await prisma.eventSide.create({ data: { eventId, name: side.name, ...sideData }, select: { id: true } })).id

    for (const [index, seed] of (side.observations ?? []).entries()) {
      await upsertObservation(prisma, ObservationSubjectType.EVENT_SIDE, sideId, seed, index, sourceId)
      observations++
    }

    for (const member of side.members) {
      const where = member.historicalCountry
        ? { historicalCountryId: (await findHistoricalCountry(prisma, member.historicalCountry)) }
        : { countryId: (await findCountry(prisma, member.country!)) }
      let participant = await prisma.eventCountryRelation.findFirst({
        where: { eventId, ...where },
        select: { id: true, role: true, roleDescription: true, note: true },
      })
      if (!participant) {
        const last = await prisma.eventCountryRelation.aggregate({
          where: { eventId },
          _max: { sortOrder: true },
          _count: true,
        })
        participant = await prisma.eventCountryRelation.create({
          data: {
            eventId,
            ...where,
            role: member.roleIfNew ?? EventCountryRole.PARTICIPANT,
            roleDescription: member.roleDescription ?? null,
            sortOrder: last._count === 0 ? 0 : (last._max.sortOrder ?? 0) + 1,
          },
          select: { id: true, role: true, roleDescription: true, note: true },
        })
      }
      /*
       * 무손실 — 참여국 줄에 사람이 다듬은 서술이 이미 있으면 진영 쪽 서술은 덮지 않고 비고에 덧붙인다.
       * (옛 CountryInSide.description이 참여국 서술과 다른 내용을 담은 경우가 있었다.)
       */
      const appendices = [
        member.roleDescription &&
        participant.roleDescription &&
        participant.roleDescription.trim() !== member.roleDescription.trim()
          ? `진영 이관 서술: ${member.roleDescription}`
          : null,
        member.noteAppend ?? null,
      ].filter((text): text is string => !!text && !(participant.note ?? '').includes(text))
      const note = appendices.length > 0 ? [participant.note, ...appendices].filter(Boolean).join('\n\n') : participant.note
      await prisma.eventCountryRelation.update({
        where: { id: participant.id },
        data: {
          sideId,
          participation: member.participation ?? null,
          ...joinColumns(member.join, eventStartKey),
          joinReason: member.joinReason ?? null,
          ...withdrawColumns(member.withdraw),
          withdrawReason: member.withdrawReason ?? null,
          /* 진영이 '편'을 말하므로 동맹·적대 역할은 참여국으로 내린다(D1) */
          ...(participant.role === EventCountryRole.ALLY || participant.role === EventCountryRole.ADVERSARY
            ? { role: EventCountryRole.PARTICIPANT }
            : {}),
          ...(participant.roleDescription ? {} : { roleDescription: member.roleDescription ?? null }),
          note,
        },
      })
      members++
      for (const [index, seed] of (member.observations ?? []).entries()) {
        await upsertObservation(prisma, ObservationSubjectType.EVENT_PARTICIPANT, participant.id, seed, index, sourceId)
        observations++
      }
    }
  }
  return { sides: sides.length, members, observations }
}

async function findHistoricalCountry(prisma: PrismaService, name: string): Promise<string> {
  const rows = await prisma.historicalCountry.findMany({ where: { name }, select: { id: true } })
  if (rows.length !== 1) throw new Error(`역사 국가 '${name}'이(가) ${rows.length}건 — 정확히 1건이어야 합니다`)
  return rows[0].id
}

async function findCountry(prisma: PrismaService, name: string): Promise<string> {
  const rows = await prisma.country.findMany({ where: { name }, select: { id: true } })
  if (rows.length !== 1) throw new Error(`국가 '${name}'이(가) ${rows.length}건 — 정확히 1건이어야 합니다`)
  return rows[0].id
}
