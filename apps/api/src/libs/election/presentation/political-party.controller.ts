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
import { PrismaService } from '@prisma/prisma.service'
import { assertLawMatchesPoliticalPartyJurisdiction } from '../domain/law-jurisdiction.util'
import { serializeElectionBigInt } from '../election-serialize.util'

/**
 * 정당 CRUD (선거·당원 UI에서 선택용)
 */
@ApiTags('political-parties')
@Controller('political-parties')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ) {
    const where: Record<string, unknown> = {}
    if (countryId) where.countryId = countryId
    if (historicalCountryId) where.historicalCountryId = historicalCountryId
    const rows = await this.prisma.politicalParty.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  /** `:id`보다 먼저 등록 — `lineage`가 id로 오인되지 않도록 */
  @Get(':id/lineage')
  async getLineage(@Param('id') id: string) {
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

  @Get(':id/laws')
  async listPartyLaws(@Param('id') id: string) {
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
    body: {
      lawId: string
      relevanceNote?: string | null
      sortOrder?: number
    },
  ) {
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
  ) {
    const existing = await this.prisma.politicalPartyLaw.findFirst({
      where: { id: linkId, partyId: id },
    })
    if (!existing) throw new NotFoundException('연결을 찾을 수 없습니다.')
    await this.prisma.politicalPartyLaw.delete({ where: { id: linkId } })
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const row = await this.prisma.politicalParty.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('정당을 찾을 수 없습니다.')
    return serializeElectionBigInt(row)
  }

  @Post()
  async create(
    @Body()
    body: {
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
    },
  ) {
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
    return serializeElectionBigInt(row)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string
      shortName: string | null
      localName: string | null
      ideology: string | null
      position: string | null
      description: string | null
      foundedDate: string | null
      dissolvedDate: string | null
      logoUrl: string | null
      headquartersCityId: string | null
      countryId: string | null
      historicalCountryId: string | null
      brandColor: string | null
    }>,
  ) {
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
    return serializeElectionBigInt(row)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.politicalParty.delete({ where: { id } })
  }

  private async ensureParty(id: string) {
    const p = await this.prisma.politicalParty.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!p) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }
}
