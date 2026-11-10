import {
  BadRequestException,
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
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'

const GLOSSARY_TERM_NAME_MAX_LENGTH = 1000

function truncateName(name: string): string {
  const t = name.trim()
  return t.length > GLOSSARY_TERM_NAME_MAX_LENGTH
    ? t.slice(0, GLOSSARY_TERM_NAME_MAX_LENGTH)
    : t
}

/** 응답에 연결 국가/역사국가 요약({id,name})을 실어주는 공용 include */
const GLOSSARY_COUNTRY_INCLUDE = {
  country: { select: { id: true, name: true } },
  historicalCountry: { select: { id: true, name: true } },
} satisfies Prisma.GlossaryTermInclude

/** 연결 국가/역사국가 요약 (id→이름 별도 조회 없이 표시) */
export type GlossaryCountryRefDto = {
  id: string
  name: string
}

export type GlossaryTermResponseDto = {
  id: string
  name: string
  description: string | null
  countryId: string | null
  historicalCountryId: string | null
  /** 현대 국가 요약(있으면) */
  country: GlossaryCountryRefDto | null
  /** 역사국가 요약(있으면) — 표시는 역사 우선 */
  historicalCountry: GlossaryCountryRefDto | null
  eventId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateGlossaryTermDto = {
  name: string
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  /** 문서 전용: 이 사건에만 사용 */
  eventId?: string | null
}

export type UpdateGlossaryTermDto = {
  name?: string
  description?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  eventId?: string | null
}

function toResponse(row: {
  id: string
  name: string
  description: string | null
  countryId: string | null
  historicalCountryId: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
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
    country: row.country ?? null,
    historicalCountry: row.historicalCountry ?? null,
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

  private async resolveCountryAxis(
    countryId?: string | null,
    historicalCountryId?: string | null,
  ): Promise<{ countryId: string | null; historicalCountryId: string | null }> {
    let cid = countryId && countryId.trim() !== '' ? countryId.trim() : null
    const hid =
      historicalCountryId && historicalCountryId.trim() !== ''
        ? historicalCountryId.trim()
        : null

    if (cid && this.prisma.country?.findUnique) {
      const c = await this.prisma.country.findUnique({
        where: { id: cid },
        select: { id: true },
      })
      if (!c) {
        throw new NotFoundException('소속 국가(countryId)를 찾을 수 없습니다.')
      }
    }

    if (hid) {
      if (this.prisma.historicalCountry?.findUnique) {
        const hc = await this.prisma.historicalCountry.findUnique({
          where: { id: hid },
          select: { id: true },
        })
        if (!hc) {
          throw new NotFoundException(
            '소속 역사적 국가(historicalCountryId)를 찾을 수 없습니다.',
          )
        }
      }
      if (this.prisma.historicalCountryModernCountry?.findMany) {
        const links =
          await this.prisma.historicalCountryModernCountry.findMany({
            where: { historicalCountryId: hid },
            select: { modernCountryId: true },
          })
        const modernIds = [
          ...new Set(links.map((l) => l.modernCountryId).filter(Boolean)),
        ]
        if (cid && modernIds.length > 0 && !modernIds.includes(cid)) {
          throw new BadRequestException(
            '선택한 역사적 국가가 지정한 현대 국가와 연결되어 있지 않습니다.',
          )
        }
        if (!cid && modernIds.length === 1) {
          cid = modernIds[0]
        }
      }
    }

    return { countryId: cid, historicalCountryId: hid }
  }

  private async assertEventExistsIfProvided(
    eventId?: string | null,
  ): Promise<string | null> {
    const trimmed = eventId?.trim() || null
    if (trimmed && this.prisma.event?.findFirst) {
      const ev = await this.prisma.event.findFirst({
        where: { id: trimmed, deletedAt: null },
        select: { id: true },
      })
      if (!ev) {
        throw new NotFoundException('연결할 사건(eventId)을 찾을 수 없습니다.')
      }
    }
    return trimmed
  }

  /**
   * 용어 목록 (선택: countryId / historicalCountryId / q 검색, eventId로 전역+문서전용 함께 조회)
   */
  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('eventId') eventId?: string,
    @Query('q') q?: string,
  ): Promise<GlossaryTermResponseDto[]> {
    const andFilters: Prisma.GlossaryTermWhereInput[] = []
    if (countryId) {
      andFilters.push(await resolveCountryScopeOr(this.prisma, countryId))
    } else if (historicalCountryId) {
      andFilters.push({ historicalCountryId })
    }
    if (q && q.trim()) {
      andFilters.push({ name: { contains: q.trim() } })
    }
    if (eventId?.trim()) {
      // 사건 저작: 전역 + 그 사건 전용 용어
      andFilters.push({
        OR: [{ eventId: null }, { eventId: eventId.trim() }],
      })
    } else {
      // 비-사건 문맥(인물 전기·신규 사건 저작 등)에서는 **전역 용어만** 노출한다.
      // 미지정 시 eventId 무제약이면 특정 사건 전용 용어가 무관한 문서 검색으로 새어 나오고,
      // 그 용어를 링크한 뒤 원 사건이 삭제되면 eventId onDelete:Cascade로 용어가 함께 삭제돼
      // 본문 .term 이 dangling(설명 불러오기 실패)이 된다.
      andFilters.push({ eventId: null })
    }

    const where: Prisma.GlossaryTermWhereInput =
      andFilters.length === 1 ? andFilters[0] : { AND: andFilters }

    const list = await this.prisma.glossaryTerm.findMany({
      where,
      orderBy: { name: 'asc' },
      include: GLOSSARY_COUNTRY_INCLUDE,
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
      include: GLOSSARY_COUNTRY_INCLUDE,
    })
    if (!row) throw new NotFoundException(`Glossary term with id ${id} not found`)
    return toResponse(row)
  }

  @Post()
  async create(@Body() dto: CreateGlossaryTermDto): Promise<GlossaryTermResponseDto> {
    const name = truncateName(dto.name ?? '')
    if (!name) {
      throw new BadRequestException('용어 이름을 입력해 주세요.')
    }
    const axis = await this.resolveCountryAxis(
      dto.countryId,
      dto.historicalCountryId,
    )
    const eventId = await this.assertEventExistsIfProvided(dto.eventId)

    const row = await this.prisma.glossaryTerm.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        countryId: axis.countryId,
        historicalCountryId: axis.historicalCountryId,
        eventId,
      },
      include: GLOSSARY_COUNTRY_INCLUDE,
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

    let resolvedName: string | undefined
    if (dto.name !== undefined) {
      resolvedName = truncateName(dto.name)
      if (!resolvedName) {
        throw new BadRequestException('용어 이름을 입력해 주세요.')
      }
    }

    let resolvedAxis: {
      countryId: string | null
      historicalCountryId: string | null
    } | null = null
    if (dto.countryId !== undefined || dto.historicalCountryId !== undefined) {
      const nextCid =
        dto.countryId !== undefined ? dto.countryId : existing.countryId
      const nextHid =
        dto.historicalCountryId !== undefined
          ? dto.historicalCountryId
          : existing.historicalCountryId
      resolvedAxis = await this.resolveCountryAxis(nextCid, nextHid)
    }

    let resolvedEventId: string | null | undefined
    if (dto.eventId !== undefined) {
      resolvedEventId = await this.assertEventExistsIfProvided(dto.eventId)
    }

    const row = await this.prisma.glossaryTerm.update({
      where: { id },
      data: {
        ...(resolvedName !== undefined && { name: resolvedName }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(resolvedAxis && {
          countryId: resolvedAxis.countryId,
          historicalCountryId: resolvedAxis.historicalCountryId,
        }),
        ...(resolvedEventId !== undefined && { eventId: resolvedEventId }),
      },
      include: GLOSSARY_COUNTRY_INCLUDE,
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
