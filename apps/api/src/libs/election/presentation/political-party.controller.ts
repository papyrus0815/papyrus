import {
  asOfficeHolding,
  tenureWhere,
} from '../../person/infrastructure/office-holding.query'
import { structuredDateKey } from '../../person/domain/structured-date.util'
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import {
  EventMethod,
  GovernmentPositionType,
  PoliticalPartyKind,
} from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'
import { NotificationService } from '../../notification/application/notification.service'
import {
  assertLawMatchesPoliticalPartyJurisdictionAsync,
} from '../domain/law-jurisdiction.util'
import {
  buildTenureJurisdictionWhere,
  membershipOverlapsTenure,
} from '../domain/party-top-leaders.util'
import { serializeElectionBigInt } from '../election-serialize.util'
import {
  type StructuredDateColumns,
  type StructuredDateInput,
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  readStructuredDate,
  structuredDateData,
  structuredDateFromLegacyIso,
  structuredDateMirror,
} from '../domain/party-structured-date.util'
import { dateYearRangePreview } from '../../shared/notification-preview.util'

export interface AddPartyLawBody {
  lawId: string
  relevanceNote?: string | null
  sortOrder?: number
}

const PARTY_KIND_VALUES = new Set<string>(Object.values(PoliticalPartyKind))

export interface CreatePoliticalPartyBody {
  name: string
  shortName?: string | null
  localName?: string | null
  ideology?: string | null
  position?: string | null
  /** 종류 — PARTY(기본)·MOVEMENT·FACTION·PARLIAMENTARY_GROUP·ELECTORAL_LIST·OTHER */
  kind?: string | null
  description?: string | null
  /** 구조화 창당일(BC·연 정밀도) — 있으면 foundedDate보다 우선 */
  founded?: StructuredDateInput | null
  /** 구조화 해산일 */
  dissolved?: StructuredDateInput | null
  /** @deprecated ISO — 구 클라이언트 호환. founded가 정본 */
  foundedDate?: string | null
  /** @deprecated ISO — dissolved가 정본 */
  dissolvedDate?: string | null
  logoUrl?: string | null
  headquartersCityId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  brandColor?: string | null
}

export interface UpdatePoliticalPartyBody {
  name?: string
  shortName?: string | null
  localName?: string | null
  ideology?: string | null
  position?: string | null
  kind?: string | null
  description?: string | null
  founded?: StructuredDateInput | null
  dissolved?: StructuredDateInput | null
  /** @deprecated ISO — founded가 정본 */
  foundedDate?: string | null
  /** @deprecated ISO — dissolved가 정본 */
  dissolvedDate?: string | null
  logoUrl?: string | null
  headquartersCityId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  brandColor?: string | null
}

/**
 * 정당 CRUD (선거·당원 UI에서 선택용)
 */
@ApiTags('political-parties')
@Controller('political-parties')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<any> {
    let where: Record<string, unknown> = {}

    if (historicalCountryId) {
      where.historicalCountryId = historicalCountryId
    } else if (countryId) {
      // 현대 국가 → 연결된 역사 국가까지 OR 포함(브리지 스코프 공용 헬퍼)
      where = await resolveCountryScopeOr(this.prisma, countryId)
    }

    const rows = await this.prisma.politicalParty.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
      include: {
        // 목록에서 소속 국가(현대/역사) 이름·id 요약 — 프론트가 별도 조회 없이
        // 어느 FK가 찼는지로 현대/역사 판별 가능(검토서 F13)
        country: { select: { id: true, name: true } },
        historicalCountry: { select: { id: true, name: true } },
        _count: {
          select: {
            memberships: true,
            leaderships: true,
            electionPartyResults: true,
            cabinetAffiliations: true,
            eventRelations: true,
            transitionsFrom: true,
            transitionsTo: true,
          },
        },
      },
    })
    return serializeElectionBigInt(rows)
  }

  /** `:id`보다 먼저 등록 — `lineage`가 id로 오인되지 않도록 */
  @Get(':id/lineage')
  async getLineage(@Param('id') id: string): Promise<any> {
    const row = await this.prisma.politicalParty.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('정당을 찾을 수 없습니다.')
    const [outgoing, incoming] = await Promise.all([
      this.prisma.politicalPartyTransition.findMany({
        where: { fromPartyId: id },
        include: {
          toParty: {
            select: { id: true, name: true, shortName: true, brandColor: true },
          },
        },
        orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.politicalPartyTransition.findMany({
        where: { toPartyId: id },
        include: {
          fromParty: {
            select: { id: true, name: true, shortName: true, brandColor: true },
          },
        },
        orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
      }),
    ])
    return serializeElectionBigInt({
      successors: outgoing,
      predecessors: incoming,
    })
  }

  /**
   * 이 정당과 연결된 국가원수·정부수반 재임 (당선 선거 정당 또는 재임 기간과 겹치는 당원 소속)
   */
  @Get(':id/top-leaders')
  async listTopLeaders(@Param('id') id: string): Promise<any> {
    const party = await this.prisma.politicalParty.findUnique({
      where: { id },
      select: { id: true, countryId: true, historicalCountryId: true },
    })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')

    const jurisdictionWhere = await buildTenureJurisdictionWhere(
      this.prisma,
      party,
    )
    if (!jurisdictionWhere) return []

    const tenureInclude = {
      positionDefinition: true,
      country: true,
      historicalCountry: true,
      person: {
        select: {
          id: true,
          name: true,
          surname: true,
          middleName: true,
          nameDisplayOrder: true,
          profileImageUrl: true,
          fatherId: true,
          motherId: true,
          dynastyId: true,
          dynasty: { select: { id: true, name: true } },
          birthCityId: true,
          birthAdminDivisionId: true,
          birthPlaceText: true,
          birthCity: { select: { id: true, name: true } },
          birthAdminDivision: { select: { id: true, name: true } },
          country: {
            select: {
              defaultNameDisplayOrder: true,
              isoCode: true,
            },
          },
        },
      },
      electionCandidacy: {
        select: {
          id: true,
          partyId: true,
          election: { select: { id: true, name: true, pollDate: true } },
          party: { select: { id: true, name: true } },
        },
      },
    }

    const topLeaderTypes = [
      GovernmentPositionType.HEAD_OF_STATE,
      GovernmentPositionType.HEAD_OF_GOVERNMENT,
    ]
    const topLeaderPositionFilter = {
      OR: [
        { positionType: { in: topLeaderTypes } },
        { positionDefinition: { is: { positionType: { in: topLeaderTypes } } } },
      ],
    }

    const [memberships, candidates, fromCabinetHead] = await Promise.all([
      this.prisma.politicalPartyMembership.findMany({
        where: { partyId: id },
        select: { personId: true, startDate: true, endDate: true },
      }),
      this.prisma.governmentPositionTenure.findMany({
        // 군주직 재임(이행된 재위)은 정당 수반 후보가 아니다 — 이행 전과 같은 범위
        where: tenureWhere({
          AND: [jurisdictionWhere, topLeaderPositionFilter],
        }),
        include: tenureInclude,
        orderBy: [{ startDate: 'desc' }, { startYear: 'desc' }],
      }),
      this.prisma.governmentPositionTenure.findMany({
        where: {
          AND: [
            jurisdictionWhere,
            topLeaderPositionFilter,
            {
              headedCabinets: {
                some: {
                  politicalParties: { some: { partyId: id } },
                },
              },
            },
          ],
        },
        include: tenureInclude,
        orderBy: [{ startDate: 'desc' }, { startYear: 'desc' }],
      }),
    ])

    const linked = candidates.filter((tenure) => {
      const ecPartyId = tenure.electionCandidacy?.partyId
      if (ecPartyId === id) return true
      return memberships.some(
        (m) =>
          m.personId === tenure.personId &&
          membershipOverlapsTenure(m, tenure),
      )
    })

    const byId = new Map<string, (typeof linked)[number]>()
    for (const t of linked) byId.set(t.id, t)
    for (const t of fromCabinetHead) {
      if (!byId.has(t.id)) byId.set(t.id, t)
    }

    const tenureSortKey = (t: (typeof linked)[number]): number => {
      const structured = structuredDateKey(
        (t as any).startEra,
        (t as any).startYear,
        (t as any).startMonth,
        (t as any).startDay,
      )
      if (structured != null) return structured
      if (t.startDate instanceof Date && !Number.isNaN(t.startDate.getTime())) {
        return (
          t.startDate.getUTCFullYear() * 10000 +
          (t.startDate.getUTCMonth() + 1) * 100 +
          t.startDate.getUTCDate()
        )
      }
      return Number.NEGATIVE_INFINITY
    }

    const merged = Array.from(byId.values())
      .sort((a, b) => tenureSortKey(b) - tenureSortKey(a))
      .map((t) => asOfficeHolding(t))

    return serializeElectionBigInt(merged)
  }

  /** 역대 선거 성적 — 이 정당의 ElectionPartyResult를 선거 메타와 함께 */
  @Get(':id/election-results')
  async listElectionResults(@Param('id') id: string): Promise<any> {
    await this.ensureParty(id)
    const rows = await this.prisma.electionPartyResult.findMany({
      where: { partyId: id },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            shortName: true,
            electionType: true,
            status: true,
            pollDate: true,
            convocationOrdinal: true,
            totalSeats: true,
          },
        },
      },
      orderBy: { election: { pollDate: 'desc' } },
    })
    return serializeElectionBigInt(rows)
  }

  /** 소속 인물 — 이 정당의 PoliticalPartyMembership 목록 */
  @Get(':id/memberships')
  async listMemberships(@Param('id') id: string): Promise<any> {
    await this.ensureParty(id)
    const rows = await this.prisma.politicalPartyMembership.findMany({
      where: { partyId: id },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            surname: true,
            middleName: true,
            nameDisplayOrder: true,
            profileImageUrl: true,
            country: { select: { defaultNameDisplayOrder: true } },
          },
        },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    })
    return serializeElectionBigInt(rows)
  }

  /** 내각 참여 — 이 정당의 CabinetPoliticalParty 목록 */
  @Get(':id/cabinet-affiliations')
  async listCabinetAffiliations(@Param('id') id: string): Promise<any> {
    await this.ensureParty(id)
    const rows = await this.prisma.cabinetPoliticalParty.findMany({
      where: { partyId: id },
      include: {
        cabinet: {
          select: {
            id: true,
            name: true,
            headTenure: {
              select: { startDate: true, endDate: true },
            },
          },
        },
      },
      orderBy: { cabinet: { headTenure: { startDate: 'desc' } } },
    })
    return serializeElectionBigInt(rows)
  }

  @Get(':id/laws')
  async listPartyLaws(@Param('id') id: string): Promise<any> {
    await this.ensureParty(id)
    const rows = await this.prisma.politicalPartyLaw.findMany({
      where: { partyId: id },
      include: {
        law: {
          select: {
            id: true,
            name: true,
            summary: true,
            countryId: true,
            historicalCountryId: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Post(':id/laws')
  async addPartyLaw(
    @Param('id') id: string,
    @Body()
    body: AddPartyLawBody,
  ): Promise<any> {
    const party = await this.prisma.politicalParty.findUnique({
      where: { id },
      select: { id: true, countryId: true, historicalCountryId: true },
    })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
    const law = await this.prisma.law.findUnique({ where: { id: body.lawId } })
    if (!law) throw new NotFoundException('법령을 찾을 수 없습니다.')
    await assertLawMatchesPoliticalPartyJurisdictionAsync(
      this.prisma,
      law,
      party,
    )
    if (this.prisma.politicalPartyLaw?.findFirst) {
      const existingLink = await this.prisma.politicalPartyLaw.findFirst({
        where: { partyId: id, lawId: body.lawId },
        select: { id: true },
      })
      if (existingLink) {
        throw new ConflictException('이미 이 정당에 연결된 법령입니다.')
      }
    }
    const row = await this.prisma.politicalPartyLaw.create({
      data: {
        partyId: id,
        lawId: body.lawId,
        relevanceNote: body.relevanceNote ?? undefined,
        sortOrder: body.sortOrder ?? 0,
      },
      include: {
        law: {
          select: {
            id: true,
            name: true,
            summary: true,
            countryId: true,
            historicalCountryId: true,
          },
        },
      },
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':id/laws/:linkId')
  async removePartyLaw(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyLaw.findFirst({
      where: { id: linkId, partyId: id },
    })
    if (!existing) throw new NotFoundException('연결을 찾을 수 없습니다.')
    await this.prisma.politicalPartyLaw.delete({ where: { id: linkId } })
  }

  /** 관련 사건 — 이 정당이 주체·참여·창당·해산·피해 등으로 연결된 사건 목록 */
  @Get(':id/events')
  async listPartyEvents(@Param('id') id: string): Promise<any> {
    await this.ensureParty(id)
    const rows = await this.prisma.eventPoliticalPartyRelation.findMany({
      where: {
        partyId: id,
        event: { deletedAt: null },
      },
      include: {
        side: {
          select: { id: true, name: true, color: true, outcome: true },
        },
        event: {
          select: {
            id: true,
            title: true,
            domain: true,
            type: true,
            startDate: true,
            startEra: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            endDate: true,
            endEra: true,
            endYear: true,
            endMonth: true,
            endDay: true,
          },
        },
      },
      orderBy: [
        { event: { startYear: 'desc' } },
        { event: { startMonth: 'desc' } },
        { event: { startDay: 'desc' } },
        { createdAt: 'desc' },
      ],
    })
    return serializeElectionBigInt(
      rows.map((row) => ({
        relationId: row.id,
        role: row.role,
        roleDescription: row.roleDescription ?? null,
        note: row.note ?? null,
        side: row.side ?? null,
        event: {
          ...row.event,
          startDate: row.event.startDate ? row.event.startDate.toISOString() : null,
          endDate: row.event.endDate ? row.event.endDate.toISOString() : null,
        },
      })),
    )
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<any> {
    const row = await this.prisma.politicalParty.findUnique({
      where: { id },
      include: {
        country: { select: { id: true, name: true } },
        historicalCountry: { select: { id: true, name: true } },
        aliases: true,
        _count: {
          select: {
            memberships: true,
            leaderships: true,
            electionPartyResults: true,
            cabinetAffiliations: true,
            eventRelations: true,
            transitionsFrom: true,
            transitionsTo: true,
          },
        },
      },
    })
    if (!row) throw new NotFoundException('정당을 찾을 수 없습니다.')
    return serializeElectionBigInt(row)
  }

  @Post()
  async create(
    @Body()
    body: CreatePoliticalPartyBody,
  ): Promise<any> {
    const founded = this.resolvePartyDate(body.founded, body.foundedDate, '창당일')
    const dissolved = this.resolvePartyDate(body.dissolved, body.dissolvedDate, '해산일')
    const foundedColumns = founded ?? readStructuredDate({}, 'founded')
    const dissolvedColumns = dissolved ?? readStructuredDate({}, 'dissolved')
    assertStructuredRangeOrder(foundedColumns, dissolvedColumns, '해산일은 창당일 이후여야 합니다.')

    const row = await this.prisma.politicalParty.create({
      data: {
        name: body.name,
        shortName: body.shortName ?? undefined,
        localName: body.localName ?? undefined,
        ideology: body.ideology ?? undefined,
        position: body.position as any,
        kind: this.parsePartyKind(body.kind) ?? undefined,
        description: body.description ?? undefined,
        ...this.partyDateData('founded', foundedColumns),
        ...this.partyDateData('dissolved', dissolvedColumns),
        logoUrl: body.logoUrl ?? undefined,
        brandColor: body.brandColor ?? undefined,
        headquartersCityId: body.headquartersCityId ?? undefined,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
      },
    })
    await this.notificationService.notifyPoliticalParty(
      row.name,
      EventMethod.CREATE,
      row.id,
      row.localName ?? dateYearRangePreview(row.foundedDate),
    )
    return serializeElectionBigInt(row)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: UpdatePoliticalPartyBody,
  ): Promise<any> {
    const existing = await this.prisma.politicalParty.findUnique({
      where: { id },
      select: {
        id: true,
        foundedEra: true,
        foundedYear: true,
        foundedMonth: true,
        foundedDay: true,
        foundedPrecision: true,
        dissolvedEra: true,
        dissolvedYear: true,
        dissolvedMonth: true,
        dissolvedDay: true,
        dissolvedPrecision: true,
        countryId: true,
        historicalCountryId: true,
      },
    })
    if (!existing) throw new NotFoundException('정당을 찾을 수 없습니다.')

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.shortName !== undefined) data.shortName = body.shortName
    if (body.localName !== undefined) data.localName = body.localName
    if (body.ideology !== undefined) data.ideology = body.ideology
    if (body.position !== undefined) data.position = body.position
    if (body.kind !== undefined) data.kind = this.parsePartyKind(body.kind) ?? PoliticalPartyKind.PARTY
    if (body.description !== undefined) data.description = body.description
    const founded = this.resolvePartyDate(body.founded, body.foundedDate, '창당일')
    const dissolved = this.resolvePartyDate(body.dissolved, body.dissolvedDate, '해산일')
    if (founded) Object.assign(data, this.partyDateData('founded', founded))
    if (dissolved) Object.assign(data, this.partyDateData('dissolved', dissolved))
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl
    if (body.brandColor !== undefined) data.brandColor = body.brandColor
    if (body.headquartersCityId !== undefined) data.headquartersCityId = body.headquartersCityId
    if (body.countryId !== undefined) data.countryId = body.countryId
    if (body.historicalCountryId !== undefined) data.historicalCountryId = body.historicalCountryId

    assertStructuredRangeOrder(
      founded ?? readStructuredDate(existing, 'founded'),
      dissolved ?? readStructuredDate(existing, 'dissolved'),
      '해산일은 창당일 이후여야 합니다.',
    )

    const row = await this.prisma.politicalParty.update({
      where: { id },
      data: data as any,
    })
    await this.notificationService.notifyPoliticalParty(
      row.name,
      EventMethod.UPDATE,
      row.id,
      row.localName ?? dateYearRangePreview(row.foundedDate),
    )
    return serializeElectionBigInt(row)
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    await this.ensureParty(id)
    const row = await this.prisma.politicalParty.delete({ where: { id } })
    await this.notificationService.notifyPoliticalParty(
      row.name,
      EventMethod.DELETE,
      id,
      row.localName ?? dateYearRangePreview(row.foundedDate),
    )
  }

  /**
   * 창당·해산일 입력 해석 — 구조화(founded)가 정본, 없으면 레거시 ISO(foundedDate).
   * 둘 다 undefined면 undefined(수정 시 '건드리지 않음').
   */
  private resolvePartyDate(
    structured: StructuredDateInput | null | undefined,
    legacyIso: string | null | undefined,
    fieldLabel: string,
  ): StructuredDateColumns | undefined {
    if (structured !== undefined) return parseStructuredDateInput(structured, fieldLabel)
    if (legacyIso !== undefined) return structuredDateFromLegacyIso(legacyIso, fieldLabel)
    return undefined
  }

  /** 구조화 칸 + DATETIME 거울(foundedDate/dissolvedDate) */
  private partyDateData(prefix: 'founded' | 'dissolved', columns: StructuredDateColumns) {
    return {
      ...structuredDateData(prefix, columns),
      [`${prefix}Date`]: structuredDateMirror(columns),
    }
  }

  private parsePartyKind(raw: string | null | undefined): PoliticalPartyKind | null {
    if (raw == null || raw === '') return null
    if (!PARTY_KIND_VALUES.has(raw)) {
      throw new BadRequestException(`정당 종류가 올바르지 않습니다: ${raw}`)
    }
    return raw as PoliticalPartyKind
  }

  private async ensureParty(id: string) {
    const p = await this.prisma.politicalParty.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!p) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }
}
