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

@ApiTags('electoral-districts')
@Controller('electoral-districts')
@UseGuards(AuthGuard('jwt'))
export class ElectoralDistrictController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ) {
    const where: Record<string, unknown> = {}
    if (countryId) where.countryId = countryId
    if (historicalCountryId) where.historicalCountryId = historicalCountryId
    const rows = await this.prisma.electoralDistrict.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const row = await this.prisma.electoralDistrict.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('선거구를 찾을 수 없습니다.')
    return serializeElectionBigInt(row)
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string
      code?: string | null
      countryId?: string | null
      historicalCountryId?: string | null
      parentId?: string | null
      administrativeDivisionId?: string | null
      notes?: string | null
    },
  ) {
    const row = await this.prisma.electoralDistrict.create({
      data: {
        name: body.name,
        code: body.code ?? undefined,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
        parentId: body.parentId ?? undefined,
        administrativeDivisionId: body.administrativeDivisionId ?? undefined,
        notes: body.notes ?? undefined,
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
      code: string | null
      countryId: string | null
      historicalCountryId: string | null
      parentId: string | null
      administrativeDivisionId: string | null
      notes: string | null
    }>,
  ) {
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.code !== undefined) data.code = body.code
    if (body.countryId !== undefined) data.countryId = body.countryId
    if (body.historicalCountryId !== undefined) data.historicalCountryId = body.historicalCountryId
    if (body.parentId !== undefined) data.parentId = body.parentId
    if (body.administrativeDivisionId !== undefined)
      data.administrativeDivisionId = body.administrativeDivisionId
    if (body.notes !== undefined) data.notes = body.notes

    const row = await this.prisma.electoralDistrict.update({
      where: { id },
      data: data as any,
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.electoralDistrict.delete({ where: { id } })
  }
}
