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

const GLOSSARY_TERM_NAME_MAX_LENGTH = 1000

function truncateName(name: string): string {
  const t = name.trim()
  return t.length > GLOSSARY_TERM_NAME_MAX_LENGTH
    ? t.slice(0, GLOSSARY_TERM_NAME_MAX_LENGTH)
    : t
}

export type GlossaryTermResponseDto = {
  id: string
  name: string
  description: string | null
  countryId: string | null
  historicalCountryId: string | null
  postId: string | null
  eventId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateGlossaryTermDto = {
  name: string
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  /** 문서 전용: 이 포스트에만 사용 */
  postId?: string | null
  /** 문서 전용: 이 사건에만 사용 */
  eventId?: string | null
}

export type UpdateGlossaryTermDto = {
  name?: string
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  postId?: string | null
  eventId?: string | null
}

function toResponse(row: {
  id: string
  name: string
  description: string | null
  countryId: string | null
  historicalCountryId: string | null
  postId: string | null
  eventId: string | null
  createdAt: Date
  updatedAt: Date
}): GlossaryTermResponseDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    countryId: row.countryId ?? null,
    historicalCountryId: row.historicalCountryId ?? null,
    postId: row.postId ?? null,
    eventId: row.eventId ?? null,
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
   * 용어 목록 (선택: countryId / historicalCountryId / q 검색, postId/eventId로 전역+문서전용 함께 조회)
   */
  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('postId') postId?: string,
    @Query('eventId') eventId?: string,
    @Query('q') q?: string,
  ): Promise<GlossaryTermResponseDto[]> {
    const where: {
      countryId?: string | null
      historicalCountryId?: string | null
      name?: { contains: string }
      OR?: Array<{ postId: null; eventId: null } | { postId: string } | { eventId: string }>
    } = {}
    if (countryId) where.countryId = countryId
    if (historicalCountryId) where.historicalCountryId = historicalCountryId
    if (q && q.trim()) where.name = { contains: q.trim() }
    if (postId?.trim()) {
      where.OR = [
        { postId: null, eventId: null },
        { postId: postId.trim() },
      ]
    }
    if (eventId?.trim()) {
      where.OR = [
        { postId: null, eventId: null },
        { eventId: eventId.trim() },
      ]
    }

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
        name: truncateName(dto.name),
        description: dto.description?.trim() || null,
        countryId: dto.countryId || null,
        historicalCountryId: dto.historicalCountryId || null,
        postId: dto.postId?.trim() || null,
        eventId: dto.eventId?.trim() || null,
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
        ...(dto.name !== undefined && { name: truncateName(dto.name) }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.countryId !== undefined && { countryId: dto.countryId || null }),
        ...(dto.historicalCountryId !== undefined && {
          historicalCountryId: dto.historicalCountryId || null,
        }),
        ...(dto.postId !== undefined && { postId: dto.postId?.trim() || null }),
        ...(dto.eventId !== undefined && { eventId: dto.eventId?.trim() || null }),
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
