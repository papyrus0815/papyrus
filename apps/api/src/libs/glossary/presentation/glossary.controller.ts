import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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

export type GlossaryTermResponseDto = {
  id: string
  name: string
  description: string | null
  countryId: string | null
  historicalCountryId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateGlossaryTermDto = {
  name: string
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

export type UpdateGlossaryTermDto = {
  name?: string
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

function toResponse(row: {
  id: string
  name: string
  description: string | null
  countryId: string | null
  historicalCountryId: string | null
  createdAt: Date
  updatedAt: Date
}): GlossaryTermResponseDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    countryId: row.countryId ?? null,
    historicalCountryId: row.historicalCountryId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@ApiTags('glossary')
@Controller('glossary/terms')
@UseGuards(AuthGuard('jwt'))
export class GlossaryController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 용어 목록 (선택: countryId / historicalCountryId / q 검색)
   */
  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('q') q?: string,
  ): Promise<GlossaryTermResponseDto[]> {
    const where: {
      countryId?: string | null
      historicalCountryId?: string | null
      name?: { contains: string }
    } = {}
    if (countryId) where.countryId = countryId
    if (historicalCountryId) where.historicalCountryId = historicalCountryId
    if (q && q.trim()) where.name = { contains: q.trim() }

    const list = await this.prisma.glossaryTerm.findMany({
      where,
      orderBy: { name: 'asc' },
    })
    return list.map(toResponse)
  }

  /**
   * 용어 단건 조회 (본문 상세에서 툴팁용)
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<GlossaryTermResponseDto> {
    const row = await this.prisma.glossaryTerm.findUnique({
      where: { id },
    })
    if (!row) throw new NotFoundException(`Glossary term with id ${id} not found`)
    return toResponse(row)
  }

  @Post()
  async create(@Body() dto: CreateGlossaryTermDto): Promise<GlossaryTermResponseDto> {
    const row = await this.prisma.glossaryTerm.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        countryId: dto.countryId || null,
        historicalCountryId: dto.historicalCountryId || null,
      },
    })
    return toResponse(row)
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGlossaryTermDto,
  ): Promise<GlossaryTermResponseDto> {
    const existing = await this.prisma.glossaryTerm.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Glossary term with id ${id} not found`)

    const row = await this.prisma.glossaryTerm.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.countryId !== undefined && { countryId: dto.countryId || null }),
        ...(dto.historicalCountryId !== undefined && {
          historicalCountryId: dto.historicalCountryId || null,
        }),
      },
    })
    return toResponse(row)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    const existing = await this.prisma.glossaryTerm.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Glossary term with id ${id} not found`)
    await this.prisma.glossaryTerm.delete({ where: { id } })
  }
}
