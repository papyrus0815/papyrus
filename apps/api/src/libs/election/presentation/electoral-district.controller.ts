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
import { PrismaService } from '@prisma/prisma.service'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'
import { areJurisdictionsCompatible } from '../domain/law-jurisdiction.util'
import { serializeElectionBigInt } from '../election-serialize.util'

export interface CreateElectoralDistrictBody {
  name: string
  code?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  parentId?: string | null
  administrativeDivisionId?: string | null
  notes?: string | null
}

export interface UpdateElectoralDistrictBody {
  name?: string
  code?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  parentId?: string | null
  administrativeDivisionId?: string | null
  notes?: string | null
}

@ApiTags('electoral-districts')
@Controller('electoral-districts')
@UseGuards(AuthGuard('jwt'))
export class ElectoralDistrictController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<any> {
    let where: Record<string, unknown> = {}
    if (historicalCountryId) {
      where.historicalCountryId = historicalCountryId
    } else if (countryId) {
      where = await resolveCountryScopeOr(this.prisma, countryId)
    }
    const rows = await this.prisma.electoralDistrict.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<any> {
    const row = await this.prisma.electoralDistrict.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('선거구를 찾을 수 없습니다.')
    return serializeElectionBigInt(row)
  }

  @Post()
  async create(
    @Body()
    body: CreateElectoralDistrictBody,
  ): Promise<any> {
    await this.validateParentAndJurisdiction(null, body.parentId ?? null, {
      countryId: body.countryId ?? null,
      historicalCountryId: body.historicalCountryId ?? null,
    })

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
    body: UpdateElectoralDistrictBody,
  ): Promise<any> {
    const existing = await this.prisma.electoralDistrict.findUnique({
      where: { id },
    })
    if (!existing) throw new NotFoundException('선거구를 찾을 수 없습니다.')

    const nextCountryId =
      body.countryId !== undefined ? body.countryId : existing.countryId
    const nextHistoricalCountryId =
      body.historicalCountryId !== undefined
        ? body.historicalCountryId
        : existing.historicalCountryId
    const nextParentId =
      body.parentId !== undefined ? body.parentId : existing.parentId

    await this.validateParentAndJurisdiction(id, nextParentId ?? null, {
      countryId: nextCountryId ?? null,
      historicalCountryId: nextHistoricalCountryId ?? null,
    })

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
  async remove(@Param('id') id: string): Promise<any> {
    const existing = await this.prisma.electoralDistrict.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('선거구를 찾을 수 없습니다.')

    if (this.prisma.electoralDistrict.count) {
      const childCount = await this.prisma.electoralDistrict.count({
        where: { parentId: id },
      })
      if (childCount > 0) {
        throw new ConflictException(
          '하위 선거구가 연결되어 있어 삭제할 수 없습니다.',
        )
      }
    }
    if (this.prisma.electionCandidacy?.count) {
      const candidacyCount = await this.prisma.electionCandidacy.count({
        where: { electoralDistrictId: id },
      })
      if (candidacyCount > 0) {
        throw new ConflictException(
          '선거 후보 이력이 연결되어 있어 삭제할 수 없습니다.',
        )
      }
    }

    await this.prisma.electoralDistrict.delete({ where: { id } })
  }

  private async validateParentAndJurisdiction(
    selfId: string | null,
    parentId: string | null,
    jurisdiction: { countryId: string | null; historicalCountryId: string | null },
  ): Promise<void> {
    if (!parentId) return
    if (selfId && parentId === selfId) {
      throw new BadRequestException('자기 자신을 상위 선거구로 지정할 수 없습니다.')
    }

    const parent = await this.prisma.electoralDistrict.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        parentId: true,
        countryId: true,
        historicalCountryId: true,
      },
    })
    if (!parent) {
      throw new NotFoundException('상위 선거구를 찾을 수 없습니다.')
    }

    const compatible = await areJurisdictionsCompatible(
      this.prisma,
      jurisdiction,
      {
        countryId: parent.countryId ?? null,
        historicalCountryId: parent.historicalCountryId ?? null,
      },
    )
    if (!compatible) {
      throw new BadRequestException(
        '상위 선거구와 소속 국가(현대·역사)가 일치하지 않습니다.',
      )
    }

    if (selfId) {
      const visited = new Set<string>([selfId])
      let currentParentId: string | null = parent.parentId
      while (currentParentId) {
        if (visited.has(currentParentId)) {
          throw new BadRequestException(
            '상위 선거구 계층에 순환(Cycle)이 발생합니다.',
          )
        }
        visited.add(currentParentId)
        const anc = await this.prisma.electoralDistrict.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        })
        currentParentId = anc?.parentId ?? null
      }
    }
  }
}
