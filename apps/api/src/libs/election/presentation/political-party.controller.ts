import {
  Body,
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
import { EventMethod, GovernmentPositionType } from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'
import { NotificationService } from '../../notification/application/notification.service'
import { assertLawMatchesPoliticalPartyJurisdiction } from '../domain/law-jurisdiction.util'
import {
  buildTenureJurisdictionWhere,
  membershipOverlapsTenure,
} from '../domain/party-top-leaders.util'
import { serializeElectionBigInt } from '../election-serialize.util'

export interface AddPartyLawBody {
  lawId: string
  relevanceNote?: string | null
  sortOrder?: number
}

export interface CreatePoliticalPartyBody {
  name: string
  shortName?: string | null
  localName?: string | null
  ideology?: string | null
  position?: string | null
  description?: string | null
  foundedDate?: string | null
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
  description?: string | null
  foundedDate?: string | null
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

    if (countryId) {
      // 현대 국가 → 연결된 역사 국가까지 OR 포함
      const linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
        .findMany({
          where: { modernCountryId: countryId },
          select: { historicalCountryId: true },
        })
        .then((rows) => rows.map((r) => r.historicalCountryId))

      if (linkedHistoricalIds.length > 0) {
        where = {
          OR: [
            { countryId },
            { historicalCountryId: { in: linkedHistoricalIds } },
          ],
        }
      } else {
        where.countryId = countryId
      }
    } else if (historicalCountryId) {
      where.historicalCountryId = historicalCountryId
    }

    const rows = await this.prisma.politicalParty.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
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

    const topLeaderPositionFilter = {
      positionType: {
        in: [
          GovernmentPositionType.HEAD_OF_STATE,
          GovernmentPositionType.HEAD_OF_GOVERNMENT,
        ],
      },
    }

    const [memberships, candidates, fromCabinetHead] = await Promise.all([
      this.prisma.politicalPartyMembership.findMany({
        where: { partyId: id },
        select: { personId: true, startDate: true, endDate: true },
      }),
      this.prisma.governmentPositionTenure.findMany({
        where: {
          AND: [jurisdictionWhere, topLeaderPositionFilter],
        },
        include: tenureInclude,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.governmentPositionTenure.findMany({
        where: {
          AND: [
            jurisdictionWhere,
            topLeaderPositionFilter,
            {
              headOfCabinet: {
                is: {
                  politicalParties: { some: { partyId: id } },
                },
              },
            },
          ],
        },
        include: tenureInclude,
        orderBy: { startDate: 'desc' },
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

    const merged = Array.from(byId.values()).sort(
      (a, b) => b.startDate.getTime() - a.startDate.getTime(),
    )

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
    assertLawMatchesPoliticalPartyJurisdiction(law, party)
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

  @Get(':id')
  async getById(@Param('id') id: string): Promise<any> {
    const row = await this.prisma.politicalParty.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('정당을 찾을 수 없습니다.')
    return serializeElectionBigInt(row)
  }

  @Post()
  async create(
    @Body()
    body: CreatePoliticalPartyBody,
  ): Promise<any> {
    const row = await this.prisma.politicalParty.create({
      data: {
        name: body.name,
        shortName: body.shortName ?? undefined,
        localName: body.localName ?? undefined,
        ideology: body.ideology ?? undefined,
        position: body.position as any,
        description: body.description ?? undefined,
        foundedDate: body.foundedDate ? new Date(body.foundedDate) : undefined,
        dissolvedDate: body.dissolvedDate ? new Date(body.dissolvedDate) : undefined,
        logoUrl: body.logoUrl ?? undefined,
        brandColor: body.brandColor ?? undefined,
        headquartersCityId: body.headquartersCityId ?? undefined,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
      },
    })
    await this.notificationService.notifyPoliticalParty(row.name, EventMethod.CREATE, row.id)
    return serializeElectionBigInt(row)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: UpdatePoliticalPartyBody,
  ): Promise<any> {
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.shortName !== undefined) data.shortName = body.shortName
    if (body.localName !== undefined) data.localName = body.localName
    if (body.ideology !== undefined) data.ideology = body.ideology
    if (body.position !== undefined) data.position = body.position
    if (body.description !== undefined) data.description = body.description
    if (body.foundedDate !== undefined)
      data.foundedDate = body.foundedDate ? new Date(body.foundedDate) : null
    if (body.dissolvedDate !== undefined)
      data.dissolvedDate = body.dissolvedDate ? new Date(body.dissolvedDate) : null
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl
    if (body.brandColor !== undefined) data.brandColor = body.brandColor
    if (body.headquartersCityId !== undefined) data.headquartersCityId = body.headquartersCityId
    if (body.countryId !== undefined) data.countryId = body.countryId
    if (body.historicalCountryId !== undefined) data.historicalCountryId = body.historicalCountryId

    const row = await this.prisma.politicalParty.update({
      where: { id },
      data: data as any,
    })
    await this.notificationService.notifyPoliticalParty(row.name, EventMethod.UPDATE, row.id)
    return serializeElectionBigInt(row)
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    const row = await this.prisma.politicalParty.delete({ where: { id } })
    await this.notificationService.notifyPoliticalParty(row.name, EventMethod.DELETE, id)
  }

  private async ensureParty(id: string) {
    const p = await this.prisma.politicalParty.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!p) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }
}
