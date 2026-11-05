import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { EventCountryRole, Prisma, PrismaClient } from '@prisma/client'

import { normalizePoint, pointToColumns } from '../../shared/structured-point'
import { assertEventOwnership } from '../domain/event-ownership'
import type {
  CountryTerritoryChangeDto,
  TerritoryPartyDto,
  TerritoryTransferDto,
  TerritoryTransferInputDto,
  TerritoryTransferMethodValue,
} from '../presentation/dto/territory-transfer.dto'
import { EventCountryParticipantService } from './event-country-participant.service'

/**
 * 영토 이전 — "이 사건으로 어느 땅이 누구에게서 누구에게로 넘어갔나".
 *
 * 예전엔 '영토 약 21만km²(국토의 30%) 상실'처럼 참여국 역할 설명(자유 글)에만 있었다. 이 표가 생기며
 * 사건 쪽(누가 얼마를 가져갔나)과 나라 쪽(영토 변천)을 같은 줄에서 읽는다(docs/event-territory-transfer-review.md).
 *
 * ## 불변식(이 서비스가 강제)
 * - 한쪽 나라는 현대 | 역사 | 자유 이름 중 **많아야 하나**. 내준 쪽·받은 쪽 중 적어도 하나는 있다.
 * - 내준 나라 = 받은 나라 금지(같은 FK).
 * - 쓰기는 사건 소유자만, 소프트삭제된 사건엔 409.
 * - 저장은 목록 동기화(PUT) — 진영·국면과 같은 규약. 요청에서 빠진 줄은 지운다.
 *
 * ## 참여국 채우기
 * 줄에 나온 등록된 나라가 참여국에 없으면 더한다 — 내준 나라 = 피해국, 받은 나라 = 수혜국, 둘 다(교환) = 참여국.
 * **이미 있는 참여국은 손대지 않는다**(큐레이션된 역할·서술 보존). 쓰기는 참여국 단일 통로(addMissing)로.
 */
@Injectable()
export class EventTerritoryTransferService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly participants: EventCountryParticipantService,
  ) {}

  private readonly include = {
    fromCountry: { select: { name: true } },
    fromHistoricalCountry: { select: { name: true } },
    toCountry: { select: { name: true } },
    toHistoricalCountry: { select: { name: true } },
    treaty: { select: { id: true, name: true, signDate: true } },
  } satisfies Prisma.EventTerritoryTransferInclude

  async list(eventId: string): Promise<TerritoryTransferDto[]> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
    if (!event) throw new NotFoundException('사건을 찾을 수 없습니다.')
    const rows = await this.prisma.eventTerritoryTransfer.findMany({
      where: { eventId },
      include: this.include,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(toDto)
  }

  async sync(
    userId: string,
    eventId: string,
    inputs: TerritoryTransferInputDto[],
    fillParticipants = true,
  ): Promise<TerritoryTransferDto[]> {
    await assertEventOwnership(this.prisma, eventId, userId, { action: '수정', deleted: 'conflict' })
    const desired = inputs.map((input, index) => normalizeInput(input, index))
    await this.assertReferencesExist(desired)

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.eventTerritoryTransfer.findMany({ where: { eventId }, select: { id: true } })
      const existingIds = new Set(existing.map((row) => row.id))
      const keepIds = new Set(desired.map((row) => row.id).filter((id): id is string => Boolean(id)))
      for (const id of keepIds) {
        if (!existingIds.has(id)) throw new BadRequestException('이 사건의 영토 이전 줄이 아닙니다 — 화면을 새로 고치세요.')
      }
      const removed = existing.filter((row) => !keepIds.has(row.id)).map((row) => row.id)
      if (removed.length > 0) await tx.eventTerritoryTransfer.deleteMany({ where: { id: { in: removed } } })
      for (const row of desired) {
        const { id, ...data } = row
        if (id) await tx.eventTerritoryTransfer.update({ where: { id }, data })
        else await tx.eventTerritoryTransfer.create({ data: { ...data, eventId } })
      }
      if (fillParticipants) {
        await this.participants.addMissing(tx, eventId, participantRolesOf(desired))
      }
    })
    return this.list(eventId)
  }

  /** 나라 쪽 '영토 변천' — 얻은 줄·잃은 줄, 소프트삭제된 사건은 뺀다 */
  async listForParty(party: { countryId?: string; historicalCountryId?: string }): Promise<CountryTerritoryChangeDto[]> {
    const fromWhere = party.countryId ? { fromCountryId: party.countryId } : { fromHistoricalCountryId: party.historicalCountryId }
    const toWhere = party.countryId ? { toCountryId: party.countryId } : { toHistoricalCountryId: party.historicalCountryId }
    const rows = await this.prisma.eventTerritoryTransfer.findMany({
      where: { OR: [fromWhere, toWhere], event: { deletedAt: null } },
      include: {
        ...this.include,
        event: {
          select: {
            id: true,
            title: true,
            startEra: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            startDate: true,
          },
        },
      },
    })
    const isTo = (row: (typeof rows)[number]) =>
      party.countryId ? row.toCountryId === party.countryId : row.toHistoricalCountryId === party.historicalCountryId
    return rows.map((row) => ({
      ...toDto(row),
      direction: isTo(row) ? 'gained' : 'lost',
      event: {
        id: row.event.id,
        title: row.event.title,
        startEra: row.event.startEra,
        startYear: row.event.startYear,
        startMonth: row.event.startMonth,
        startDay: row.event.startDay,
        startDate: row.event.startDate?.toISOString() ?? null,
      },
    }))
  }

  /** 나라·조약 id가 실제로 있나 — 없는 id를 보내면 FK 오류(500) 대신 400 */
  private async assertReferencesExist(rows: NormalizedTransfer[]) {
    const countryIds = new Set<string>()
    const historicalIds = new Set<string>()
    const treatyIds = new Set<string>()
    for (const row of rows) {
      for (const id of [row.fromCountryId, row.toCountryId]) if (id) countryIds.add(id)
      for (const id of [row.fromHistoricalCountryId, row.toHistoricalCountryId]) if (id) historicalIds.add(id)
      if (row.treatyId) treatyIds.add(row.treatyId)
    }
    const [countries, historicals, treaties] = await Promise.all([
      countryIds.size ? this.prisma.country.count({ where: { id: { in: [...countryIds] } } }) : 0,
      historicalIds.size ? this.prisma.historicalCountry.count({ where: { id: { in: [...historicalIds] } } }) : 0,
      treatyIds.size ? this.prisma.treaty.count({ where: { id: { in: [...treatyIds] } } }) : 0,
    ])
    if (countries !== countryIds.size) throw new BadRequestException('없는 현대 국가가 들어 있습니다.')
    if (historicals !== historicalIds.size) throw new BadRequestException('없는 역사 국가가 들어 있습니다.')
    if (treaties !== treatyIds.size) throw new BadRequestException('없는 조약이 들어 있습니다.')
  }
}

type NormalizedTransfer = {
  id?: string
  fromCountryId: string | null
  fromHistoricalCountryId: string | null
  fromName: string | null
  toCountryId: string | null
  toHistoricalCountryId: string | null
  toName: string | null
  regionName: string
  method: TerritoryTransferMethodValue
  areaKm2: number | null
  population: number | null
  treatyId: string | null
  effectiveEra: 'BC' | 'AD' | null
  effectiveYear: number | null
  effectiveMonth: number | null
  effectiveDay: number | null
  effectivePrecision: string | null
  note: string | null
  sortOrder: number
}

const blankToNull = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

/** 한 줄 정규화·검증 — 400 문구에 몇 번째 줄인지 */
export function normalizeInput(input: TerritoryTransferInputDto, index: number): NormalizedTransfer {
  const label = `${index + 1}번째 줄`
  const from = {
    countryId: blankToNull(input.fromCountryId),
    historicalCountryId: blankToNull(input.fromHistoricalCountryId),
    name: blankToNull(input.fromName),
  }
  const to = {
    countryId: blankToNull(input.toCountryId),
    historicalCountryId: blankToNull(input.toHistoricalCountryId),
    name: blankToNull(input.toName),
  }
  for (const [side, party] of [['내준 나라', from], ['받은 나라', to]] as const) {
    const filled = [party.countryId, party.historicalCountryId, party.name].filter(Boolean).length
    if (filled > 1) throw new BadRequestException(`${label}: ${side}는 하나만 — 현대 국가·역사 국가·이름 중 하나`)
  }
  const fromFilled = Boolean(from.countryId || from.historicalCountryId || from.name)
  const toFilled = Boolean(to.countryId || to.historicalCountryId || to.name)
  if (!fromFilled && !toFilled) throw new BadRequestException(`${label}: 내준 나라나 받은 나라 중 하나는 있어야 합니다`)
  if (
    (from.countryId && from.countryId === to.countryId) ||
    (from.historicalCountryId && from.historicalCountryId === to.historicalCountryId)
  ) {
    throw new BadRequestException(`${label}: 내준 나라와 받은 나라가 같습니다`)
  }
  const regionName = input.regionName?.trim() ?? ''
  if (!regionName) throw new BadRequestException(`${label}: 지역 이름이 비었습니다`)

  const hasPoint = input.effectiveYear != null
  if (!hasPoint && (input.effectiveMonth != null || input.effectiveDay != null)) {
    throw new BadRequestException(`${label}: 발효 시점에 연도가 없습니다`)
  }
  const point = hasPoint
    ? normalizePoint(
        {
          era: input.effectiveEra ?? 'AD',
          year: input.effectiveYear!,
          month: input.effectiveMonth ?? null,
          day: input.effectiveDay ?? null,
        },
        `${label} 발효 시점`,
      )
    : null
  const columns = pointToColumns(point)

  return {
    ...(input.id ? { id: input.id } : {}),
    fromCountryId: from.countryId,
    fromHistoricalCountryId: from.historicalCountryId,
    fromName: from.name,
    toCountryId: to.countryId,
    toHistoricalCountryId: to.historicalCountryId,
    toName: to.name,
    regionName,
    method: input.method,
    areaKm2: input.areaKm2 ?? null,
    population: input.population ?? null,
    treatyId: blankToNull(input.treatyId),
    effectiveEra: columns.era,
    effectiveYear: columns.year,
    effectiveMonth: columns.month,
    effectiveDay: columns.day,
    effectivePrecision: columns.precision,
    note: blankToNull(input.note),
    sortOrder: index,
  }
}

/**
 * 줄들에서 참여국 역할 — 내주기만 = 피해국, 받기만 = 수혜국, 둘 다(교환·되찾기) = 참여국.
 * 등록된 나라만(자유 이름은 참여국이 될 수 없다).
 */
export function participantRolesOf(
  rows: ReadonlyArray<Pick<NormalizedTransfer, 'fromCountryId' | 'fromHistoricalCountryId' | 'toCountryId' | 'toHistoricalCountryId'>>,
): Array<{ countryId: string | null; historicalCountryId: string | null; role: EventCountryRole }> {
  const parties = new Map<string, { countryId: string | null; historicalCountryId: string | null; gives: boolean; gets: boolean }>()
  const touch = (countryId: string | null, historicalCountryId: string | null, side: 'gives' | 'gets') => {
    if (!countryId && !historicalCountryId) return
    const key = countryId ? `m:${countryId}` : `h:${historicalCountryId}`
    const party = parties.get(key) ?? { countryId, historicalCountryId, gives: false, gets: false }
    party[side] = true
    parties.set(key, party)
  }
  for (const row of rows) {
    touch(row.fromCountryId, row.fromHistoricalCountryId, 'gives')
    touch(row.toCountryId, row.toHistoricalCountryId, 'gets')
  }
  return [...parties.values()].map((party) => ({
    countryId: party.countryId,
    historicalCountryId: party.historicalCountryId,
    role:
      party.gives && party.gets
        ? EventCountryRole.PARTICIPANT
        : party.gives
          ? EventCountryRole.VICTIM
          : EventCountryRole.BENEFICIARY,
  }))
}

type RowWithParties = {
  id: string
  eventId: string
  fromCountryId: string | null
  fromHistoricalCountryId: string | null
  fromName: string | null
  toCountryId: string | null
  toHistoricalCountryId: string | null
  toName: string | null
  regionName: string
  method: TerritoryTransferMethodValue
  areaKm2: number | null
  population: number | null
  effectiveEra: 'BC' | 'AD' | null
  effectiveYear: number | null
  effectiveMonth: number | null
  effectiveDay: number | null
  effectivePrecision: string | null
  note: string | null
  sortOrder: number
  fromCountry: { name: string } | null
  fromHistoricalCountry: { name: string } | null
  toCountry: { name: string } | null
  toHistoricalCountry: { name: string } | null
  treaty: { id: string; name: string; signDate: Date | null } | null
}

function party(countryId: string | null, historicalCountryId: string | null, freeName: string | null, country: { name: string } | null, historical: { name: string } | null): TerritoryPartyDto {
  return { countryId, historicalCountryId, name: country?.name ?? historical?.name ?? freeName }
}

function toDto(row: RowWithParties): TerritoryTransferDto {
  return {
    id: row.id,
    eventId: row.eventId,
    from: party(row.fromCountryId, row.fromHistoricalCountryId, row.fromName, row.fromCountry, row.fromHistoricalCountry),
    to: party(row.toCountryId, row.toHistoricalCountryId, row.toName, row.toCountry, row.toHistoricalCountry),
    regionName: row.regionName,
    method: row.method,
    areaKm2: row.areaKm2,
    population: row.population,
    treaty: row.treaty
      ? { id: row.treaty.id, name: row.treaty.name, signDate: row.treaty.signDate?.toISOString() ?? null }
      : null,
    effectiveEra: row.effectiveEra,
    effectiveYear: row.effectiveYear,
    effectiveMonth: row.effectiveMonth,
    effectiveDay: row.effectiveDay,
    effectivePrecision: row.effectivePrecision,
    note: row.note,
    sortOrder: row.sortOrder,
  }
}
