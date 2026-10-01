/**
 * 인물 쪽에서 사건 참여(PersonEvent)를 잇고 끊는 서비스.
 *
 * 예전엔 참여 인물을 **사건 쪽에서만** 쓸 수 있었다 — 인물 상세에는 자유 서술 '연보 추가'만 있어,
 * '이 인물이 X 전쟁에 참전'을 연보에 한 번, 사건에 또 한 번 적었다. 이 서비스는 같은 표
 * (person_event, @@unique(personId,eventId))를 인물 쪽에서 쓴다 — 사건 상세의 참여 인물과 한 몸.
 *
 * 후보(추천): 검색어가 없으면 "이 인물의 나라가 관련된, 생애 동안의 사건"을 먼저 보여 준다.
 * 사용자가 대부분 검색 없이 한 번 눌러 연결하도록.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../../../prisma/prisma.service'

import { resolveLinkedHistoricalCountryIds } from '../../country/domain/country-scope.util'
import {
  inferParticipationCountries,
  keyRange,
  partsOf,
  type DateParts,
} from '../../event/application/person-participation'

/** 후보 한 줄 */
export interface PersonEventCandidateDto {
  id: string
  title: string
  /** 부호 연도(BC 음수). 날짜가 없으면 null */
  year: number | null
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  startDate: string | null
  /** 관련국 이름(최대 3) — 같은 제목 사건을 가르는 단서 */
  countryNames: string[]
  /** 이미 이 인물과 연결됐는지 */
  linked: boolean
  /** 연결돼 있으면 그 역할 */
  role: string | null
}

export interface PersonEventCandidatesDto {
  /** 'suggested' = 검색어 없이 생애·국가로 고른 추천, 'search' = 제목 검색 결과 */
  mode: 'suggested' | 'search'
  /** 추천 기준 한 줄(예: '대한민국 · 1917~1979') — 추천일 때만 */
  basis: string | null
  items: PersonEventCandidateDto[]
}

/** 재임·재위 카드 한 장에 붙는 '이 기간의 사건' 제안 */
export interface RecordEventSuggestionDto {
  id: string
  title: string
  year: number | null
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  startDate: string | null
  countryNames: string[]
  /** 이 인물이 참여 인물로 연결된 사건인지(맨 앞에 선다) */
  participated: boolean
}

export interface RecordEventSuggestionsDto {
  /** recordId → 제안(최대 8) */
  byRecordId: Record<string, RecordEventSuggestionDto[]>
}

export interface PersonEventLinkDto {
  personId: string
  eventId: string
  role: string | null
  note: string | null
}

const SEARCH_LIMIT = 40
const SUGGEST_LIMIT = 40
/** 후보 계산에 읽는 사건 상한 — 계정당 사건 수가 이보다 크면 최근 것부터 */
const SCAN_LIMIT = 3000

type EventRow = {
  id: string
  title: string
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  startDate: Date | null
  historicalCountryId: string | null
  countryRelations: Array<{
    countryId: string | null
    historicalCountryId: string | null
    country: { name: string } | null
    historicalCountry: { name: string } | null
  }>
}

/** 사건 부호 연도 — 구조화(BC 안전) 우선, 없으면 DATETIME 폴백 */
function eventSignedYear(event: EventRow): number | null {
  if (event.startYear != null) {
    return event.startEra === 'BC' ? -event.startYear : event.startYear
  }
  return event.startDate ? event.startDate.getUTCFullYear() : null
}

/** 인물 생몰 부호 연도 — Person은 birthEra/deathEra + DATETIME */
function personSignedYear(
  era: string | null,
  date: Date | null,
): number | null {
  if (!date) return null
  const year = date.getUTCFullYear()
  return era === 'BC' ? -year : year
}

const formatYear = (year: number) => (year < 0 ? `기원전 ${-year}` : `${year}`)

@Injectable()
export class PersonEventLinkService {
  constructor(private readonly prisma: PrismaService) {}

  /** 인물 소유권 — 본인 계정 인물이거나 계정 미지정(공용) 인물만 */
  private async assertPersonWritable(personId: string, accountId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: {
        id: true,
        accountId: true,
        birthDate: true,
        birthEra: true,
        deathDate: true,
        deathEra: true,
        countryId: true,
        historicalCountryId: true,
        country: { select: { name: true } },
        historicalCountry: { select: { name: true } },
        countryAffiliations: {
          select: { countryId: true, historicalCountryId: true },
        },
      },
    })
    if (!person) throw new NotFoundException('인물을 찾을 수 없습니다.')
    if (person.accountId != null && person.accountId !== accountId) {
      throw new ForbiddenException('본인이 등록한 인물만 사건을 연결할 수 있습니다.')
    }
    return person
  }

  /** 사건 소유권 — 본인이 등록한, 지워지지 않은 사건만 */
  private async assertEventLinkable(eventId: string, accountId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, createdById: true, deletedAt: true },
    })
    if (!event || event.deletedAt) throw new NotFoundException('사건을 찾을 수 없습니다.')
    if (event.createdById !== accountId) {
      throw new ForbiddenException('본인이 등록한 사건에만 연결할 수 있습니다.')
    }
  }

  /**
   * 연결 후보 — q가 있으면 제목 검색, 없으면 생애·국가 기반 추천.
   * 이미 연결된 사건은 늘 맨 위에 '연결됨'으로 함께 온다(모달 안에서 역할 수정·해제).
   */
  async getCandidates(
    personId: string,
    accountId: string,
    rawQuery?: string,
  ): Promise<PersonEventCandidatesDto> {
    const person = await this.assertPersonWritable(personId, accountId)
    const query = (rawQuery ?? '').trim()

    const [events, links] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          createdById: accountId,
          deletedAt: null,
          ...(query && { title: { contains: query } }),
        },
        select: {
          id: true,
          title: true,
          startEra: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          startDate: true,
          historicalCountryId: true,
          countryRelations: {
            select: {
              countryId: true,
              historicalCountryId: true,
              country: { select: { name: true } },
              historicalCountry: { select: { name: true } },
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: SCAN_LIMIT,
      }) as Promise<EventRow[]>,
      this.prisma.personEvent.findMany({
        where: { personId },
        select: { eventId: true, role: true },
      }),
    ])
    const roleByEvent = new Map(links.map((link) => [link.eventId, link.role]))

    const toDto = (event: EventRow): PersonEventCandidateDto => ({
      id: event.id,
      title: event.title,
      year: eventSignedYear(event),
      startEra: event.startEra,
      startYear: event.startYear,
      startMonth: event.startMonth,
      startDay: event.startDay,
      startDate: event.startDate ? event.startDate.toISOString() : null,
      countryNames: event.countryRelations
        .map((relation) => relation.country?.name ?? relation.historicalCountry?.name)
        .filter((name): name is string => !!name)
        .slice(0, 3),
      linked: roleByEvent.has(event.id),
      role: roleByEvent.get(event.id) ?? null,
    })
    const byYear = (left: PersonEventCandidateDto, right: PersonEventCandidateDto) =>
      (left.year ?? Number.MAX_SAFE_INTEGER) - (right.year ?? Number.MAX_SAFE_INTEGER)

    if (query) {
      const items = events.map(toDto)
      items.sort(
        (left, right) => Number(right.linked) - Number(left.linked) || byYear(left, right),
      )
      return { mode: 'search', basis: null, items: items.slice(0, SEARCH_LIMIT) }
    }

    // ── 추천: 인물의 나라(주 국적·소속, 현대국이면 브리지로 이어진 역사국 포함) × 생애 ──
    const modernIds = new Set<string>()
    const historicalIds = new Set<string>()
    if (person.countryId) modernIds.add(person.countryId)
    if (person.historicalCountryId) historicalIds.add(person.historicalCountryId)
    for (const affiliation of person.countryAffiliations) {
      if (affiliation.countryId) modernIds.add(affiliation.countryId)
      if (affiliation.historicalCountryId) historicalIds.add(affiliation.historicalCountryId)
    }
    for (const modernId of modernIds) {
      const linkedHistorical = await resolveLinkedHistoricalCountryIds(this.prisma, modernId)
      for (const id of linkedHistorical) historicalIds.add(id)
    }
    const hasCountry = modernIds.size + historicalIds.size > 0

    const birthYear = personSignedYear(person.birthEra, person.birthDate)
    const deathYear = personSignedYear(person.deathEra, person.deathDate)
    // 생몰이 없으면 연도 창을 두지 않는다. 사망만 모르면(생존·미상) 출생 이후 전부.
    const fromYear = birthYear
    const toYear = deathYear

    const inCountry = (event: EventRow) =>
      !hasCountry ||
      (event.historicalCountryId != null && historicalIds.has(event.historicalCountryId)) ||
      event.countryRelations.some(
        (relation) =>
          (relation.countryId != null && modernIds.has(relation.countryId)) ||
          (relation.historicalCountryId != null &&
            historicalIds.has(relation.historicalCountryId)),
      )
    const inLifetime = (event: EventRow) => {
      const year = eventSignedYear(event)
      if (year == null) return fromYear == null && toYear == null
      if (fromYear != null && year < fromYear) return false
      if (toYear != null && year > toYear) return false
      return true
    }

    const linkedItems = events.filter((event) => roleByEvent.has(event.id)).map(toDto)
    const suggested = events
      .filter((event) => !roleByEvent.has(event.id) && inCountry(event) && inLifetime(event))
      .map(toDto)
      .sort(byYear)
      .slice(0, SUGGEST_LIMIT)

    const countryLabel =
      person.country?.name ?? person.historicalCountry?.name ?? null
    const lifeLabel =
      fromYear != null || toYear != null
        ? `${fromYear != null ? formatYear(fromYear) : '?'}~${toYear != null ? formatYear(toYear) : ''}`
        : null
    const basis = [countryLabel, lifeLabel].filter(Boolean).join(' · ') || null

    return {
      mode: 'suggested',
      basis,
      items: [...linkedItems.sort(byYear), ...suggested],
    }
  }

  /**
   * 재임·재위별 '이 기간의 사건' 제안 — 업적(achievement)으로 한 번에 잇도록.
   * 기간이 겹치고 (그 직위의 나라가 참여했거나 이 인물이 참여한) 사건, 이미 업적·즉위 사건으로
   * 이은 것은 뺀다. 인물이 참여한 사건 먼저, 그다음 시간순. 카드마다 최대 8.
   */
  async getRecordEventSuggestions(
    personId: string,
    accountId: string,
  ): Promise<RecordEventSuggestionsDto> {
    await this.assertPersonWritable(personId, accountId)
    const [tenures, reigns, events] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: { personId },
        select: {
          id: true,
          countryId: true,
          historicalCountryId: true,
          startDate: true,
          endDate: true,
          accessionEventId: true,
          achievements: { select: { eventId: true } },
        },
      }),
      this.prisma.sovereignReign.findMany({
        where: { personId },
        select: {
          id: true,
          countryId: true,
          historicalCountryId: true,
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
          accessionEventId: true,
          achievements: { select: { eventId: true } },
        },
      }),
      this.prisma.event.findMany({
        where: { createdById: accountId, deletedAt: null },
        select: {
          id: true,
          title: true,
          startEra: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          startDate: true,
          historicalCountryId: true,
          countryRelations: {
            select: {
              countryId: true,
              historicalCountryId: true,
              country: { select: { name: true } },
              historicalCountry: { select: { name: true } },
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          persons: { where: { personId }, select: { id: true } },
        },
        take: SCAN_LIMIT,
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    type RecordShape = {
      id: string
      countryId: string | null
      historicalCountryId: string | null
      start: DateParts
      end: DateParts
      excluded: Set<string>
    }
    const records: RecordShape[] = [
      ...tenures.map((tenure) => ({
        id: tenure.id,
        countryId: tenure.countryId,
        historicalCountryId: tenure.historicalCountryId,
        start: partsOf(null, null, null, null, tenure.startDate),
        end: partsOf(null, null, null, null, tenure.endDate),
        excluded: new Set(
          [tenure.accessionEventId, ...tenure.achievements.map((row) => row.eventId)].filter(
            (id): id is string => !!id,
          ),
        ),
      })),
      ...reigns.map((reign) => ({
        id: reign.id,
        countryId: reign.countryId,
        historicalCountryId: reign.historicalCountryId,
        start: partsOf(reign.startEra, reign.startYear, reign.startMonth, reign.startDay, reign.startDate),
        end: partsOf(reign.endEra, reign.endYear, reign.endMonth, reign.endDay, reign.endDate),
        excluded: new Set(
          [reign.accessionEventId, ...reign.achievements.map((row) => row.eventId)].filter(
            (id): id is string => !!id,
          ),
        ),
      })),
    ]

    // 현대국 직위면 브리지로 이어진 역사국 사건도 그 나라 사건으로 본다
    const bridgedByModern = new Map<string, Set<string>>()
    for (const modernId of new Set(records.map((record) => record.countryId).filter(Boolean) as string[])) {
      bridgedByModern.set(
        modernId,
        new Set(await resolveLinkedHistoricalCountryIds(this.prisma, modernId)),
      )
    }

    const eventRows = events.map((event) => {
      const parts = partsOf(event.startEra, event.startYear, event.startMonth, event.startDay, event.startDate)
      return {
        event,
        range: keyRange(parts.year, parts.month, parts.day),
        year: parts.year,
        participated: event.persons.length > 0,
        modernIds: new Set(
          event.countryRelations.map((relation) => relation.countryId).filter(Boolean) as string[],
        ),
        historicalIds: new Set(
          [
            event.historicalCountryId,
            ...event.countryRelations.map((relation) => relation.historicalCountryId),
          ].filter(Boolean) as string[],
        ),
      }
    })

    const byRecordId: Record<string, RecordEventSuggestionDto[]> = {}
    for (const record of records) {
      const startRange = keyRange(record.start.year, record.start.month, record.start.day)
      if (!startRange) {
        byRecordId[record.id] = []
        continue
      }
      const endRange = keyRange(record.end.year, record.end.month, record.end.day)
      const recordEnd = endRange ? endRange[1] : Number.MAX_SAFE_INTEGER
      const bridged = record.countryId ? bridgedByModern.get(record.countryId) : undefined

      const matches = eventRows.filter((row) => {
        if (!row.range || record.excluded.has(row.event.id)) return false
        if (row.range[0] > recordEnd || row.range[1] < startRange[0]) return false
        const sameCountry =
          (record.countryId != null && row.modernIds.has(record.countryId)) ||
          (record.historicalCountryId != null && row.historicalIds.has(record.historicalCountryId)) ||
          (bridged != null && [...row.historicalIds].some((id) => bridged.has(id)))
        return sameCountry || row.participated
      })
      matches.sort(
        (left, right) =>
          Number(right.participated) - Number(left.participated) ||
          (left.year ?? 0) - (right.year ?? 0),
      )
      byRecordId[record.id] = matches.slice(0, 8).map((row) => ({
        id: row.event.id,
        title: row.event.title,
        year: row.year,
        startEra: row.event.startEra,
        startYear: row.event.startYear,
        startMonth: row.event.startMonth,
        startDay: row.event.startDay,
        startDate: row.event.startDate ? row.event.startDate.toISOString() : null,
        countryNames: row.event.countryRelations
          .map((relation) => relation.country?.name ?? relation.historicalCountry?.name)
          .filter((name): name is string => !!name)
          .slice(0, 3),
        participated: row.participated,
      }))
    }
    return { byRecordId }
  }

  /** 연결(없으면 만들고, 있으면 역할·비고만 갱신) — 여러 번 눌러도 같은 결과 */
  async link(
    personId: string,
    eventId: string,
    accountId: string,
    body: { role?: string | null; note?: string | null },
  ): Promise<PersonEventLinkDto> {
    await this.assertPersonWritable(personId, accountId)
    await this.assertEventLinkable(eventId, accountId)
    const role = body.role === undefined ? undefined : body.role?.trim() || null
    const note = body.note === undefined ? undefined : body.note?.trim() || null
    if (role && role.length > 100) {
      throw new BadRequestException('역할은 100자 이내로 적어 주세요.')
    }
    const existing = await this.prisma.personEvent.findUnique({
      where: { personId_eventId: { personId, eventId } },
      select: { id: true },
    })
    // 새 연결이면 사건 참여 인물 목록의 끝에 서고, 참여 자격 국가는 국적으로 추론한다
    const createExtras = existing
      ? { sortOrder: 0, countryId: null, historicalCountryId: null }
      : await (async () => {
          const last = await this.prisma.personEvent.aggregate({
            where: { eventId },
            _max: { sortOrder: true },
          })
          const inferred = (
            await inferParticipationCountries(this.prisma, eventId, [personId])
          ).get(personId)
          return {
            sortOrder: (last._max.sortOrder ?? -1) + 1,
            countryId: inferred?.countryId ?? null,
            historicalCountryId: inferred?.historicalCountryId ?? null,
          }
        })()
    const row = await this.prisma.personEvent.upsert({
      where: { personId_eventId: { personId, eventId } },
      create: {
        personId,
        eventId,
        role: role ?? null,
        note: note ?? null,
        ...createExtras,
      },
      update: {
        ...(role !== undefined && { role }),
        ...(note !== undefined && { note }),
      },
    })
    return { personId, eventId, role: row.role, note: row.note }
  }

  /** 연결 해제 — 연결이 없어도 성공(멱등) */
  async unlink(personId: string, eventId: string, accountId: string): Promise<void> {
    await this.assertPersonWritable(personId, accountId)
    await this.assertEventLinkable(eventId, accountId)
    await this.prisma.personEvent.deleteMany({ where: { personId, eventId } })
  }
}
