import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@prisma/prisma.service'

export type EthnicityResponseDto = {
  id: string
  name: string
  nameLocal: string | null
  description: string | null
  thumbnailUrl: string | null
  parentId: string | null
  parent?: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export type CreateEthnicityDto = {
  name: string
  nameLocal?: string | null
  description?: string | null
  thumbnailUrl?: string | null
  parentId?: string | null
}

export type UpdateEthnicityDto = {
  name?: string
  nameLocal?: string | null
  description?: string | null
  thumbnailUrl?: string | null
  parentId?: string | null
}

function toResponse(row: {
  id: string
  name: string
  nameLocal: string | null
  description: string | null
  thumbnailUrl: string | null
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  parent?: { id: string; name: string } | null
}): EthnicityResponseDto {
  return {
    id: row.id,
    name: row.name,
    nameLocal: row.nameLocal ?? null,
    description: row.description ?? null,
    thumbnailUrl: row.thumbnailUrl ?? null,
    parentId: row.parentId ?? null,
    parent: row.parent ? { id: row.parent.id, name: row.parent.name } : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export interface SetCountryEthnicitiesBody {
  ethnicityIds: string[]
}

export interface SetHistoricalCountryEthnicitiesBody {
  ethnicityIds: string[]
}

@ApiTags('ethnicities')
@Controller('ethnicities')
@UseGuards(AuthGuard('jwt'))
export class EthnicityController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 전체 민족 목록 (선택: countryId 또는 historicalCountryId로 해당 국가 구성 민족만)
   */
  @Get()
  async getAll(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<EthnicityResponseDto[]> {
    if (countryId) {
      const country = await this.prisma.country.findUnique({
        where: { id: countryId },
        include: { ethnicities: { include: { parent: { select: { id: true, name: true } } } } },
      })
      if (!country) return []
      return country.ethnicities.map((e) => toResponse({ ...e, parent: e.parent ?? null }))
    }
    if (historicalCountryId) {
      const hist = await this.prisma.historicalCountry.findUnique({
        where: { id: historicalCountryId },
        include: { ethnicities: { include: { parent: { select: { id: true, name: true } } } } },
      })
      if (!hist) return []
      return hist.ethnicities.map((e) => toResponse({ ...e, parent: e.parent ?? null }))
    }
    const list = await this.prisma.ethnicity.findMany({
      orderBy: { name: 'asc' },
      include: { parent: { select: { id: true, name: true } } },
    })
    return list.map((row) => toResponse({ ...row, parent: row.parent ?? null }))
  }

  /**
   * 현대 국가에 연결된 민족 ID 목록 설정 (덮어쓰기)
   */
  @Put('country/:countryId')
  async setCountryEthnicities(
    @Param('countryId') countryId: string,
    @Body() body: SetCountryEthnicitiesBody,
  ): Promise<EthnicityResponseDto[]> {
    const country = await this.prisma.country.findUnique({ where: { id: countryId } })
    if (!country) throw new NotFoundException(`Country with id ${countryId} not found`)
    await this.prisma.country.update({
      where: { id: countryId },
      data: {
        ethnicities: {
          set: (body.ethnicityIds ?? []).map((id) => ({ id })),
        },
      },
    })
    const updated = await this.prisma.country.findUnique({
      where: { id: countryId },
      include: { ethnicities: { include: { parent: { select: { id: true, name: true } } } } },
    })
    return (updated?.ethnicities ?? []).map((e) => toResponse({ ...e, parent: e.parent ?? null }))
  }

  /**
   * 역사적 국가에 연결된 민족 ID 목록 설정 (덮어쓰기)
   */
  @Put('historical-country/:historicalCountryId')
  async setHistoricalCountryEthnicities(
    @Param('historicalCountryId') historicalCountryId: string,
    @Body() body: SetHistoricalCountryEthnicitiesBody,
  ): Promise<EthnicityResponseDto[]> {
    const hist = await this.prisma.historicalCountry.findUnique({
      where: { id: historicalCountryId },
    })
    if (!hist) throw new NotFoundException(`Historical country with id ${historicalCountryId} not found`)
    await this.prisma.historicalCountry.update({
      where: { id: historicalCountryId },
      data: {
        ethnicities: {
          set: (body.ethnicityIds ?? []).map((id) => ({ id })),
        },
      },
    })
    const updated = await this.prisma.historicalCountry.findUnique({
      where: { id: historicalCountryId },
      include: { ethnicities: { include: { parent: { select: { id: true, name: true } } } } },
    })
    return (updated?.ethnicities ?? []).map((e) => toResponse({ ...e, parent: e.parent ?? null }))
  }

  /**
   * 단건 조회
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<EthnicityResponseDto | null> {
    const row = await this.prisma.ethnicity.findUnique({
      where: { id },
      include: { parent: { select: { id: true, name: true } } },
    })
    return row ? toResponse({ ...row, parent: row.parent ?? null }) : null
  }

  /**
   * 민족 생성
   */
  @Post()
  async create(@Body() body: CreateEthnicityDto): Promise<EthnicityResponseDto> {
    const row = await this.prisma.ethnicity.create({
      data: {
        name: body.name,
        nameLocal: body.nameLocal ?? undefined,
        description: body.description ?? undefined,
        thumbnailUrl: body.thumbnailUrl ?? undefined,
        parentId: body.parentId ?? undefined,
      },
      include: { parent: { select: { id: true, name: true } } },
    })
    return toResponse({ ...row, parent: row.parent ?? null })
  }

  /**
   * 민족 수정
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateEthnicityDto,
  ): Promise<EthnicityResponseDto> {
    const existing = await this.prisma.ethnicity.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Ethnicity with id ${id} not found`)
    const row = await this.prisma.ethnicity.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.nameLocal !== undefined && { nameLocal: body.nameLocal }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
      },
      include: { parent: { select: { id: true, name: true } } },
    })
    return toResponse({ ...row, parent: row.parent ?? null })
  }

  /**
   * 민족 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.prisma.ethnicity.delete({ where: { id } })
  }
}
