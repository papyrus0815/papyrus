import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AggregateType, EventMethod, Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { NotificationService } from '../../notification/application/notification.service'
import { formatEventDate } from '../domain/event-date'
import type { EventDomainValue } from '../domain/event-domain'
import type { EventTypeValue } from '../domain/event-type'
import {
  computeEventSeriesForecast,
  defaultReferenceDate,
  detectMissingSeriesEditions,
  formatSeriesCadenceLabel,
  formatSeriesEditionBadge,
  isFutureEdition,
  signedYearOfEdition,
  type ForecastEditionInput,
  type ForecastHostCountry,
} from '../domain/event-series-forecast'
import type {
  CreateEventSeriesDto,
  EventSeriesContextDto,
  EventSeriesDetailDto,
  EventSeriesEditionSummaryDto,
  EventSeriesItemDto,
  UpdateEventSeriesDto,
} from '../presentation/dto/event-series.dto'

const SERIES_RELATIONS_SELECT = {
  organization: {
    select: {
      id: true,
      name: true,
      shortName: true,
      type: true,
      logoUrl: true,
      status: true,
      dissolvedDate: true,
      _count: { select: { memberships: true } },
      memberships: {
        where: {
          countryId: { not: null },
          endYear: null,
          role: { in: ['FOUNDER', 'MEMBER', 'SECRETARIAT_HOST'] },
        },
        orderBy: [{ sortOrder: 'asc' }, { startYear: 'asc' }, { createdAt: 'asc' }],
        select: {
          countryId: true,
          country: { select: { id: true, name: true, flagEmoji: true } },
        },
      },
    },
  },
  country: { select: { id: true, name: true, flagEmoji: true } },
  historicalCountry: { select: { id: true, name: true } },
  nextHostCountry: { select: { id: true, name: true, flagEmoji: true } },
} satisfies Prisma.EventSeriesInclude

const EDITION_EVENT_SELECT = {
  id: true,
  title: true,
  seriesEdition: true,
  seriesEditionLabel: true,
  startDate: true,
  startDatePrecision: true,
  startEra: true,
  startYear: true,
  startMonth: true,
  startDay: true,
  endDate: true,
  endDatePrecision: true,
  endEra: true,
  endYear: true,
  endMonth: true,
  endDay: true,
  location: true,
  kind: true,
  domain: true,
  type: true,
  countryRelations: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      role: true,
      country: { select: { id: true, name: true, flagEmoji: true } },
      historicalCountry: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.EventSelect

function trimOrNull(val?: string | null): string | null | undefined {
  if (val === undefined) return undefined
  const t = val?.trim()
  return t ? t : null
}

function editionChronoKey(ev: {
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startDate?: Date | null
  seriesEdition?: number | null
}): number {
  let sy = signedYearOfEdition(ev)
  let m = ev.startMonth ?? 1
  let d = ev.startDay ?? 1
  if (sy == null && ev.startDate) {
    sy = ev.startDate.getUTCFullYear()
    m = ev.startDate.getUTCMonth() + 1
    d = ev.startDate.getUTCDate()
  }
  if (sy == null) return Number.NEGATIVE_INFINITY
  return sy * 10000 + m * 100 + d
}

function parseStringArrayJson(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const ids = raw
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
  return ids.length > 0 ? [...new Set(ids)] : null
}

@Injectable()
export class EventSeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private toEditionSummary(
    ev: any,
    ref = defaultReferenceDate(),
  ): { dto: EventSeriesEditionSummaryDto; forecastInput: ForecastEditionInput } {
    const startYear =
      ev.startYear ?? (ev.startDate ? ev.startDate.getUTCFullYear() : null)
    const startMonth =
      ev.startMonth ?? (ev.startDate ? ev.startDate.getUTCMonth() + 1 : null)
    const startDay =
      ev.startDay ?? (ev.startDate ? ev.startDate.getUTCDate() : null)
    const startEra = ev.startEra ?? (startYear != null ? 'AD' : null)

    const initiatorRel =
      (ev.countryRelations ?? []).find((r: any) => r.role === 'INITIATOR') ??
      null
    const hostCountry = initiatorRel?.country
      ? {
          id: initiatorRel.country.id,
          name: initiatorRel.country.name,
          flagEmoji: initiatorRel.country.flagEmoji ?? null,
          isHistorical: false,
        }
      : initiatorRel?.historicalCountry
        ? {
            id: initiatorRel.historicalCountry.id,
            name: initiatorRel.historicalCountry.name,
            flagEmoji: null,
            isHistorical: true,
          }
        : null

    const forecastInput: ForecastEditionInput = {
      id: ev.id,
      title: ev.title,
      seriesEdition: ev.seriesEdition ?? null,
      seriesEditionLabel: ev.seriesEditionLabel ?? null,
      startEra,
      startYear,
      startMonth,
      startDay,
      startDatePrecision: ev.startDatePrecision ?? null,
      location: ev.location ?? null,
      hostCountry: hostCountry
        ? {
            id: hostCountry.id,
            name: hostCountry.name,
            flagEmoji: hostCountry.flagEmoji ?? null,
          }
        : null,
    }

    const dto: EventSeriesEditionSummaryDto = {
      id: ev.id,
      title: ev.title,
      seriesEdition: ev.seriesEdition ?? null,
      seriesEditionLabel: ev.seriesEditionLabel ?? null,
      editionBadge: formatSeriesEditionBadge({
        seriesEdition: ev.seriesEdition,
        seriesEditionLabel: ev.seriesEditionLabel,
      }),
      startDate: formatEventDate(
        ev.startDate,
        ev.startEra,
        ev.startYear,
        ev.startMonth,
        ev.startDay,
      ),
      startDatePrecision: ev.startDatePrecision ?? null,
      endDate: formatEventDate(
        ev.endDate,
        ev.endEra,
        ev.endYear,
        ev.endMonth,
        ev.endDay,
      ),
      endDatePrecision: ev.endDatePrecision ?? null,
      location: ev.location ?? null,
      kind: ev.kind === 'COLLECTION' ? 'COLLECTION' : 'SINGLE',
      domain: ev.domain as EventDomainValue,
      type: (ev.type as EventTypeValue) ?? null,
      hostCountry,
      participantCount: (ev.countryRelations ?? []).length,
      isFuture: isFutureEdition(forecastInput, ref),
    }

    return { dto, forecastInput }
  }

  private async buildCustomCountryMap(
    rows: ReadonlyArray<{ hostRotationCountryIds?: unknown }>,
  ): Promise<Map<string, ForecastHostCountry>> {
    const ids = new Set<string>()
    for (const row of rows) {
      const parsed = parseStringArrayJson(row.hostRotationCountryIds)
      if (parsed) {
        for (const id of parsed) ids.add(id)
      }
    }
    if (ids.size === 0) return new Map()
    const countries = await this.prisma.country.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true, flagEmoji: true },
    })
    return new Map(
      countries.map((c) => [
        c.id,
        { id: c.id, name: c.name, flagEmoji: c.flagEmoji ?? null },
      ]),
    )
  }

  private resolveRotationCandidates(
    row: any,
    customCountryMap: Map<string, ForecastHostCountry>,
  ): ForecastHostCountry[] {
    const customIds = parseStringArrayJson(row.hostRotationCountryIds)
    if (customIds && customIds.length > 0) {
      const orgMap = new Map<string, ForecastHostCountry>()
      for (const m of row.organization?.memberships ?? []) {
        if (m.country) {
          orgMap.set(m.country.id, {
            id: m.country.id,
            name: m.country.name,
            flagEmoji: m.country.flagEmoji ?? null,
          })
        }
      }
      return customIds
        .map((id) => customCountryMap.get(id) ?? orgMap.get(id) ?? null)
        .filter((c): c is ForecastHostCountry => c != null)
    }

    const fromOrg: ForecastHostCountry[] = []
    for (const m of row.organization?.memberships ?? []) {
      if (m.country) {
        fromOrg.push({
          id: m.country.id,
          name: m.country.name,
          flagEmoji: m.country.flagEmoji ?? null,
        })
      }
    }
    return fromOrg
  }

  private toSeriesDetailDto(
    row: any,
    rawEvents: any[],
    customCountryMap: Map<string, ForecastHostCountry> = new Map(),
  ): EventSeriesDetailDto {
    const ref = defaultReferenceDate()
    const sortedEvents = [...rawEvents].sort((a, b) => {
      const diff = editionChronoKey(a) - editionChronoKey(b)
      if (diff !== 0) return diff
      return (a.seriesEdition ?? 0) - (b.seriesEdition ?? 0)
    })

    const mapped = sortedEvents.map((ev) => this.toEditionSummary(ev, ref))
    const editions = mapped.map((m) => m.dto)
    const forecastInputs = mapped.map((m) => m.forecastInput)

    const orgDissolved = Boolean(
      row.organization &&
        (row.organization.status === 'DISSOLVED' ||
          row.organization.dissolvedDate != null),
    )

    const hostRotationEnabled = Boolean(row.hostRotationEnabled)
    const hostRotationCountryIds = parseStringArrayJson(
      row.hostRotationCountryIds,
    )
    const rotationCandidates = hostRotationEnabled
      ? this.resolveRotationCandidates(row, customCountryMap)
      : []

    const forecast = computeEventSeriesForecast(
      {
        title: row.title,
        status: row.status,
        cadenceKind: row.cadenceKind,
        intervalMonths: row.intervalMonths,
        typicalMonth: row.typicalMonth,
        typicalMonthSecondary: row.typicalMonthSecondary,
        endedYear: row.endedYear,
        nextScheduleState: row.nextScheduleState,
        nextEditionNumber: row.nextEditionNumber,
        nextYear: row.nextYear,
        nextMonth: row.nextMonth,
        nextDay: row.nextDay,
        nextHostCountry: row.nextHostCountry ?? null,
        nextLocation: row.nextLocation ?? null,
        nextNote: row.nextNote ?? null,
        hostRotationEnabled,
        rotationCandidates,
        organizationDissolved: orgDissolved,
      },
      forecastInputs,
      ref,
    )

    const missingRanges = detectMissingSeriesEditions(editions)

    const pastOrCurrent = editions.filter((ed) => !ed.isFuture)
    const latestEdition =
      pastOrCurrent[pastOrCurrent.length - 1] ??
      editions[editions.length - 1] ??
      null

    return {
      id: row.id,
      title: row.title,
      shortTitle: row.shortTitle ?? null,
      originalTitle: row.originalTitle ?? null,
      description: row.description ?? null,
      defaultDomain: row.defaultDomain as EventDomainValue,
      defaultEventType: (row.defaultEventType as EventTypeValue) ?? null,
      organizationId: row.organizationId ?? null,
      organization: row.organization
        ? {
            id: row.organization.id,
            name: row.organization.name,
            shortName: row.organization.shortName ?? null,
            type: row.organization.type,
            logoUrl: row.organization.logoUrl ?? null,
          }
        : null,
      countryId: row.countryId ?? null,
      country: row.country ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
      historicalCountry: row.historicalCountry ?? null,
      cadenceKind: row.cadenceKind,
      intervalMonths: row.intervalMonths ?? null,
      typicalMonth: row.typicalMonth ?? null,
      typicalMonthSecondary: row.typicalMonthSecondary ?? null,
      hostRotationRule: row.hostRotationRule ?? null,
      hostRotationEnabled,
      hostRotationCountryIds,
      status: row.status,
      startedEra: row.startedEra ?? null,
      startedYear: row.startedYear ?? null,
      endedEra: row.endedEra ?? null,
      endedYear: row.endedYear ?? null,
      nextScheduleState: row.nextScheduleState,
      nextEditionNumber: row.nextEditionNumber ?? null,
      nextYear: row.nextYear ?? null,
      nextMonth: row.nextMonth ?? null,
      nextDay: row.nextDay ?? null,
      nextHostCountryId: row.nextHostCountryId ?? null,
      nextHostCountry: row.nextHostCountry ?? null,
      nextLocation: row.nextLocation ?? null,
      nextNote: row.nextNote ?? null,
      editionCount: editions.length,
      latestEdition,
      missingRanges,
      forecast,
      editions,
      organizationMemberCount: row.organization?._count?.memberships ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private async validateForeignKeys(dto: {
    organizationId?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
    nextHostCountryId?: string | null
  }): Promise<void> {
    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
        select: { id: true },
      })
      if (!org) throw new NotFoundException('주관 조직을 찾을 수 없습니다.')
    }
    if (dto.countryId) {
      const c = await this.prisma.country.findUnique({
        where: { id: dto.countryId },
        select: { id: true },
      })
      if (!c) throw new NotFoundException('소속 현대 국가를 찾을 수 없습니다.')
    }
    if (dto.historicalCountryId) {
      const hc = await this.prisma.historicalCountry.findUnique({
        where: { id: dto.historicalCountryId },
        select: { id: true },
      })
      if (!hc)
        throw new NotFoundException('소속 역사 국가를 찾을 수 없습니다.')
    }
    if (dto.nextHostCountryId) {
      const nc = await this.prisma.country.findUnique({
        where: { id: dto.nextHostCountryId },
        select: { id: true },
      })
      if (!nc)
        throw new NotFoundException('차기 개최국(nextHostCountryId)을 찾을 수 없습니다.')
    }
  }

  async list(
    filter: {
      organizationId?: string
      countryId?: string
      historicalCountryId?: string
      hostedByCountryId?: string
      status?: string
      domain?: string
      q?: string
    },
    userId?: string,
  ): Promise<EventSeriesItemDto[]> {
    const q = filter.q?.trim()
    const where: Prisma.EventSeriesWhereInput = {
      ...(userId
        ? { OR: [{ accountId: null }, { accountId: userId }] }
        : { accountId: null }),
      ...(filter.organizationId ? { organizationId: filter.organizationId } : {}),
      ...(filter.countryId ? { countryId: filter.countryId } : {}),
      ...(filter.historicalCountryId
        ? { historicalCountryId: filter.historicalCountryId }
        : {}),
      ...(filter.status ? { status: filter.status as any } : {}),
      ...(filter.domain ? { defaultDomain: filter.domain as any } : {}),
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: q } },
                  { shortTitle: { contains: q } },
                  { originalTitle: { contains: q } },
                ],
              },
            ],
          }
        : {}),
    }

    const rows = await this.prisma.eventSeries.findMany({
      where,
      include: {
        ...SERIES_RELATIONS_SELECT,
        events: {
          where: {
            deletedAt: null,
            ...(userId ? { createdById: userId } : {}),
          },
          select: EDITION_EVENT_SELECT,
        },
      },
      orderBy: [{ title: 'asc' }],
    })

    const customCountryMap = await this.buildCustomCountryMap(rows)
    const items = rows.map((row) => {
      const detail = this.toSeriesDetailDto(row, row.events, customCountryMap)
      const { editions: _omitEditions, organizationMemberCount: _omitCount, ...item } = detail
      return item
    })

    if (filter.hostedByCountryId) {
      const targetCountryId = filter.hostedByCountryId.trim()
      return items.filter(
        (item) =>
          item.forecast.kind !== 'ENDED' &&
          item.forecast.kind !== 'SUSPENDED' &&
          (item.forecast.hostCountry?.id === targetCountryId ||
            item.nextHostCountryId === targetCountryId),
      )
    }

    return items
  }

  async getById(id: string, userId?: string): Promise<EventSeriesDetailDto> {
    const row = await this.prisma.eventSeries.findFirst({
      where: {
        id,
        ...(userId
          ? { OR: [{ accountId: null }, { accountId: userId }] }
          : { accountId: null }),
      },
      include: {
        ...SERIES_RELATIONS_SELECT,
        events: {
          where: {
            deletedAt: null,
            ...(userId ? { createdById: userId } : {}),
          },
          select: EDITION_EVENT_SELECT,
        },
      },
    })
    if (!row) {
      throw new NotFoundException('정기 사건·회의 시리즈를 찾을 수 없습니다.')
    }
    const customCountryMap = await this.buildCustomCountryMap([row])
    return this.toSeriesDetailDto(row, row.events, customCountryMap)
  }

  async create(
    dto: CreateEventSeriesDto,
    userId?: string,
  ): Promise<EventSeriesDetailDto> {
    const title = dto.title.trim()
    if (!title) {
      throw new BadRequestException('시리즈 명칭을 입력하세요.')
    }
    await this.validateForeignKeys(dto)

    const cadenceKind = dto.cadenceKind ?? 'PERIODIC'
    const intervalMonths =
      cadenceKind === 'IRREGULAR'
        ? null
        : dto.intervalMonths !== undefined
          ? dto.intervalMonths
          : 12

    const created = await this.prisma.eventSeries.create({
      data: {
        title,
        shortTitle: trimOrNull(dto.shortTitle) ?? null,
        originalTitle: trimOrNull(dto.originalTitle) ?? null,
        description: trimOrNull(dto.description) ?? null,
        defaultDomain: (dto.defaultDomain ?? 'DIPLOMACY') as any,
        defaultEventType:
          dto.defaultEventType === undefined
            ? ('SUMMIT' as any)
            : (dto.defaultEventType as any),
        organizationId: dto.organizationId || null,
        countryId: dto.countryId || null,
        historicalCountryId: dto.historicalCountryId || null,
        cadenceKind: cadenceKind as any,
        intervalMonths,
        typicalMonth: dto.typicalMonth ?? null,
        typicalMonthSecondary: dto.typicalMonthSecondary ?? null,
        hostRotationRule: trimOrNull(dto.hostRotationRule) ?? null,
        hostRotationEnabled: Boolean(dto.hostRotationEnabled),
        hostRotationCountryIds:
          dto.hostRotationCountryIds && dto.hostRotationCountryIds.length > 0
            ? (dto.hostRotationCountryIds as any)
            : Prisma.DbNull,
        status: (dto.status ?? 'ACTIVE') as any,
        startedEra: (dto.startedEra ?? 'AD') as any,
        startedYear: dto.startedYear ?? null,
        endedEra: (dto.endedEra ?? 'AD') as any,
        endedYear: dto.endedYear ?? null,
        nextScheduleState: (dto.nextScheduleState ?? 'AUTO') as any,
        nextEditionNumber: dto.nextEditionNumber ?? null,
        nextYear: dto.nextYear ?? null,
        nextMonth: dto.nextMonth ?? null,
        nextDay: dto.nextDay ?? null,
        nextHostCountryId: dto.nextHostCountryId || null,
        nextLocation: trimOrNull(dto.nextLocation) ?? null,
        nextNote: trimOrNull(dto.nextNote) ?? null,
        accountId: userId ?? null,
      },
      include: SERIES_RELATIONS_SELECT,
    })

    await this.notificationService.create({
      entityLabel: created.title,
      method: EventMethod.CREATE,
      ownerType: AggregateType.EVENT_SERIES,
      recordId: created.id,
      preview: formatSeriesCadenceLabel({
        cadenceKind: created.cadenceKind,
        intervalMonths: created.intervalMonths,
        typicalMonth: created.typicalMonth,
        typicalMonthSecondary: created.typicalMonthSecondary,
      }),
    })

    const customCountryMap = await this.buildCustomCountryMap([created])
    return this.toSeriesDetailDto(created, [], customCountryMap)
  }

  async update(
    id: string,
    dto: UpdateEventSeriesDto,
    userId?: string,
  ): Promise<EventSeriesDetailDto> {
    const existing = await this.prisma.eventSeries.findUnique({
      where: { id },
      select: { id: true, accountId: true, cadenceKind: true },
    })
    if (!existing) {
      throw new NotFoundException('정기 사건·회의 시리즈를 찾을 수 없습니다.')
    }
    if (existing.accountId && existing.accountId !== userId) {
      throw new ForbiddenException('본인이 등록한 시리즈만 수정할 수 있습니다.')
    }

    await this.validateForeignKeys(dto)

    const nextCadence = dto.cadenceKind ?? existing.cadenceKind
    const updated = await this.prisma.eventSeries.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.shortTitle !== undefined
          ? { shortTitle: trimOrNull(dto.shortTitle) }
          : {}),
        ...(dto.originalTitle !== undefined
          ? { originalTitle: trimOrNull(dto.originalTitle) }
          : {}),
        ...(dto.description !== undefined
          ? { description: trimOrNull(dto.description) }
          : {}),
        ...(dto.defaultDomain !== undefined
          ? { defaultDomain: dto.defaultDomain as any }
          : {}),
        ...(dto.defaultEventType !== undefined
          ? { defaultEventType: dto.defaultEventType as any }
          : {}),
        ...(dto.organizationId !== undefined
          ? { organizationId: dto.organizationId || null }
          : {}),
        ...(dto.countryId !== undefined
          ? { countryId: dto.countryId || null }
          : {}),
        ...(dto.historicalCountryId !== undefined
          ? { historicalCountryId: dto.historicalCountryId || null }
          : {}),
        ...(dto.cadenceKind !== undefined
          ? { cadenceKind: dto.cadenceKind as any }
          : {}),
        ...(nextCadence === 'IRREGULAR'
          ? { intervalMonths: null }
          : dto.intervalMonths !== undefined
            ? { intervalMonths: dto.intervalMonths }
            : {}),
        ...(dto.typicalMonth !== undefined
          ? { typicalMonth: dto.typicalMonth }
          : {}),
        ...(dto.typicalMonthSecondary !== undefined
          ? { typicalMonthSecondary: dto.typicalMonthSecondary }
          : {}),
        ...(dto.hostRotationRule !== undefined
          ? { hostRotationRule: trimOrNull(dto.hostRotationRule) }
          : {}),
        ...(dto.hostRotationEnabled !== undefined
          ? { hostRotationEnabled: Boolean(dto.hostRotationEnabled) }
          : {}),
        ...(dto.hostRotationCountryIds !== undefined
          ? {
              hostRotationCountryIds:
                dto.hostRotationCountryIds && dto.hostRotationCountryIds.length > 0
                  ? (dto.hostRotationCountryIds as any)
                  : Prisma.DbNull,
            }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status as any } : {}),
        ...(dto.startedEra !== undefined
          ? { startedEra: dto.startedEra as any }
          : {}),
        ...(dto.startedYear !== undefined
          ? { startedYear: dto.startedYear }
          : {}),
        ...(dto.endedEra !== undefined ? { endedEra: dto.endedEra as any } : {}),
        ...(dto.endedYear !== undefined ? { endedYear: dto.endedYear } : {}),
        ...(dto.nextScheduleState !== undefined
          ? { nextScheduleState: dto.nextScheduleState as any }
          : {}),
        ...(dto.nextEditionNumber !== undefined
          ? { nextEditionNumber: dto.nextEditionNumber }
          : {}),
        ...(dto.nextYear !== undefined ? { nextYear: dto.nextYear } : {}),
        ...(dto.nextMonth !== undefined ? { nextMonth: dto.nextMonth } : {}),
        ...(dto.nextDay !== undefined ? { nextDay: dto.nextDay } : {}),
        ...(dto.nextHostCountryId !== undefined
          ? { nextHostCountryId: dto.nextHostCountryId || null }
          : {}),
        ...(dto.nextLocation !== undefined
          ? { nextLocation: trimOrNull(dto.nextLocation) }
          : {}),
        ...(dto.nextNote !== undefined
          ? { nextNote: trimOrNull(dto.nextNote) }
          : {}),
      },
      include: {
        ...SERIES_RELATIONS_SELECT,
        events: {
          where: {
            deletedAt: null,
            ...(userId ? { createdById: userId } : {}),
          },
          select: EDITION_EVENT_SELECT,
        },
      },
    })

    await this.notificationService.create({
      entityLabel: updated.title,
      method: EventMethod.UPDATE,
      ownerType: AggregateType.EVENT_SERIES,
      recordId: updated.id,
      preview: formatSeriesCadenceLabel({
        cadenceKind: updated.cadenceKind,
        intervalMonths: updated.intervalMonths,
        typicalMonth: updated.typicalMonth,
        typicalMonthSecondary: updated.typicalMonthSecondary,
      }),
    })

    const customCountryMap = await this.buildCustomCountryMap([updated])
    return this.toSeriesDetailDto(updated, updated.events, customCountryMap)
  }

  async delete(id: string, userId?: string): Promise<void> {
    const existing = await this.prisma.eventSeries.findUnique({
      where: { id },
      select: { id: true, title: true, accountId: true },
    })
    if (!existing) {
      throw new NotFoundException('정기 사건·회의 시리즈를 찾을 수 없습니다.')
    }
    if (existing.accountId && existing.accountId !== userId) {
      throw new ForbiddenException('본인이 등록한 시리즈만 삭제할 수 있습니다.')
    }
    await this.prisma.eventSeries.delete({ where: { id } })
    await this.notificationService.create({
      entityLabel: existing.title,
      method: EventMethod.DELETE,
      ownerType: AggregateType.EVENT_SERIES,
      recordId: existing.id,
    })
  }

  /**
   * 사건 상세 응답에 실을 소속 시리즈 맥락(이전·다음 회차 + 차기 개최 안내).
   * seriesId가 없거나 접근 불가면 null.
   */
  async buildSeriesContextForEvent(
    seriesId: string | null | undefined,
    currentEventId: string,
    userId?: string,
  ): Promise<EventSeriesContextDto | null> {
    if (!seriesId) return null
    try {
      const detail = await this.getById(seriesId, userId)
      const idx = detail.editions.findIndex((ed) => ed.id === currentEventId)
      const current = idx >= 0 ? detail.editions[idx] : null
      const prev = idx > 0 ? detail.editions[idx - 1] : null
      const next =
        idx >= 0 && idx < detail.editions.length - 1
          ? detail.editions[idx + 1]
          : null

      return {
        id: detail.id,
        title: detail.title,
        shortTitle: detail.shortTitle,
        defaultDomain: detail.defaultDomain,
        defaultEventType: detail.defaultEventType,
        organizationId: detail.organizationId,
        organizationName: detail.organization?.name ?? null,
        cadenceLabel: detail.forecast.cadenceLabel,
        editionCount: detail.editionCount,
        position: idx >= 0 ? idx + 1 : 1,
        currentEditionBadge: current?.editionBadge ?? null,
        prevEdition: prev
          ? {
              id: prev.id,
              title: prev.title,
              editionBadge: prev.editionBadge,
              startDate: prev.startDate,
            }
          : null,
        nextEdition: next
          ? {
              id: next.id,
              title: next.title,
              editionBadge: next.editionBadge,
              startDate: next.startDate,
            }
          : null,
        editionsTimeline: detail.editions.map((ed) => ({
          id: ed.id,
          title: ed.title,
          editionBadge: ed.editionBadge,
          seriesEdition: ed.seriesEdition,
          startDate: ed.startDate,
          hostCountryName: ed.hostCountry?.name ?? null,
          hostCountryFlagEmoji: ed.hostCountry?.flagEmoji ?? null,
          isFuture: ed.isFuture,
        })),
        missingRanges: detail.missingRanges,
        forecast: detail.forecast,
      }
    } catch {
      return null
    }
  }
}
