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
}
