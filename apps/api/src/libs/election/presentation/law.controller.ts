import {
  BadRequestException,
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
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { serializeElectionBigInt } from '../election-serialize.util'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'
import { assertLawMatchesPoliticalPartyJurisdictionAsync } from '../domain/law-jurisdiction.util'

/** 응답에 연결 국가/역사국가 요약({id,name})을 실어주는 공용 include */
const LAW_COUNTRY_INCLUDE = {
  lawType: { select: { id: true, name: true } },
  country: { select: { id: true, name: true } },
  historicalCountry: { select: { id: true, name: true } },
} satisfies Prisma.LawInclude

function parseOptionalPositiveInt(
  v: unknown,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (v === null || v === undefined) return { ok: true, value: null }
  if (typeof v === 'number') {
    if (!Number.isInteger(v) || v < 1)
      return { ok: false, message: '조·항은 1 이상의 정수만 입력할 수 있습니다.' }
    return { ok: true, value: v }
  }
  if (typeof v === 'string') {
    const t = v.trim()
    if (t === '') return { ok: true, value: null }
    const n = parseInt(t, 10)
    if (!Number.isFinite(n) || String(n) !== t || n < 1)
      return { ok: false, message: '조·항은 1 이상의 정수만 입력할 수 있습니다.' }
    return { ok: true, value: n }
  }
  return { ok: false, message: '조·항 번호 형식이 올바르지 않습니다.' }
}

function parseOptionalDate(
  raw: unknown,
  label: string,
): { ok: true; value: Date | null } | { ok: false; message: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) {
      return { ok: false, message: `${label} 날짜 형식이 올바르지 않습니다.` }
    }
    return { ok: true, value: raw }
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return { ok: true, value: null }
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? `${trimmed}T00:00:00.000Z`
      : trimmed
    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, message: `${label} 날짜 형식이 올바르지 않습니다.` }
    }
    return { ok: true, value: parsed }
  }
  return { ok: false, message: `${label} 날짜 형식이 올바르지 않습니다.` }
}

export interface CreateLawBody {
  name: string
  summary?: string | null
  articleNumber?: number | null
  paragraphNumber?: number | null
  startDate?: string | null
  endDate?: string | null
  note?: string | null
  lawTypeId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

export interface UpdateLawBody {
  name?: string
  summary?: string | null
  articleNumber?: number | null
  paragraphNumber?: number | null
  startDate?: string | null
  endDate?: string | null
  note?: string | null
  lawTypeId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

/**
 * 법령 최소 CRUD — 선거·정당과의 연결에서 `lawId` 선택용
 */
@ApiTags('laws')
@Controller('laws')
@UseGuards(AuthGuard('jwt'))
export class LawController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<any> {
    // 역사국가 필터가 지정되면 해당 시대를 우선 조회하고, 현대 국가 단독 필터일 때만
    // 브리지로 연결된 역사국가 소속까지 OR 확장(검토서 F14 — person·election·party와 동일 소속 정의).
    const where: Prisma.LawWhereInput = {
      ...(historicalCountryId
        ? { historicalCountryId }
        : countryId
          ? await resolveCountryScopeOr(this.prisma, countryId)
          : {}),
    }
    const rows = await this.prisma.law.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
      include: LAW_COUNTRY_INCLUDE,
    })
    return serializeElectionBigInt(rows)
  }

  @Post()
  async create(
    @Body()
    body: CreateLawBody,
  ): Promise<any> {
    const article = parseOptionalPositiveInt(body.articleNumber)
    if (!article.ok) throw new BadRequestException(article.message)
    const paragraph = parseOptionalPositiveInt(body.paragraphNumber)
    if (!paragraph.ok) throw new BadRequestException(paragraph.message)
    if (paragraph.value != null && article.value == null) {
      throw new BadRequestException(
        '항을 입력하려면 조 번호를 먼저 입력하세요.',
      )
    }
    const startDate = parseOptionalDate(body.startDate, '제정·시행일')
    if (!startDate.ok) throw new BadRequestException(startDate.message)
    const endDate = parseOptionalDate(body.endDate, '폐지일')
    if (!endDate.ok) throw new BadRequestException(endDate.message)
    if (
      startDate.value &&
      endDate.value &&
      startDate.value.getTime() > endDate.value.getTime()
    ) {
      throw new BadRequestException(
        '제정·시행일이 폐지일보다 뒤일 수 없습니다.',
      )
    }
    const row = await this.prisma.law.create({
      data: {
        name: body.name,
        summary: body.summary ?? undefined,
        articleNumber: article.value ?? undefined,
        paragraphNumber: paragraph.value ?? undefined,
        startDate: startDate.value ?? undefined,
        endDate: endDate.value ?? undefined,
        note: body.note ?? undefined,
        lawTypeId: body.lawTypeId ?? undefined,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
      },
      include: LAW_COUNTRY_INCLUDE,
    })
    return serializeElectionBigInt(row)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: UpdateLawBody,
  ): Promise<any> {
    const existing = await this.prisma.law.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('법령을 찾을 수 없습니다.')
    const data: Prisma.LawUpdateInput = {}
    if (body.name !== undefined) data.name = body.name
    if (body.summary !== undefined) data.summary = body.summary
    if (body.note !== undefined) data.note = body.note
    if (body.startDate !== undefined) {
      const parsedStart = parseOptionalDate(body.startDate, '제정·시행일')
      if (!parsedStart.ok) throw new BadRequestException(parsedStart.message)
      data.startDate = parsedStart.value
    }
    if (body.endDate !== undefined) {
      const parsedEnd = parseOptionalDate(body.endDate, '폐지일')
      if (!parsedEnd.ok) throw new BadRequestException(parsedEnd.message)
      data.endDate = parsedEnd.value
    }
    const effStart =
      body.startDate !== undefined
        ? (data.startDate as Date | null)
        : existing.startDate
    const effEnd =
      body.endDate !== undefined
        ? (data.endDate as Date | null)
        : existing.endDate
    if (effStart && effEnd && effStart.getTime() > effEnd.getTime()) {
      throw new BadRequestException(
        '제정·시행일이 폐지일보다 뒤일 수 없습니다.',
      )
    }
    let finalArticle = existing.articleNumber
    let finalParagraph = existing.paragraphNumber
    if (body.articleNumber !== undefined) {
      const article = parseOptionalPositiveInt(body.articleNumber)
      if (!article.ok) throw new BadRequestException(article.message)
      data.articleNumber = article.value
      finalArticle = article.value
    }
    if (body.paragraphNumber !== undefined) {
      const paragraph = parseOptionalPositiveInt(body.paragraphNumber)
      if (!paragraph.ok) throw new BadRequestException(paragraph.message)
      data.paragraphNumber = paragraph.value
      finalParagraph = paragraph.value
    }
    if (finalParagraph != null && finalArticle == null) {
      throw new BadRequestException(
        '항을 입력하려면 조 번호를 먼저 입력하세요.',
      )
    }
    if (body.lawTypeId !== undefined) {
      data.lawType = body.lawTypeId
        ? { connect: { id: body.lawTypeId } }
        : { disconnect: true }
    }
    if (body.countryId !== undefined || body.historicalCountryId !== undefined) {
      const nextLawJurisdiction = {
        countryId:
          body.countryId !== undefined ? body.countryId : existing.countryId,
        historicalCountryId:
          body.historicalCountryId !== undefined
            ? body.historicalCountryId
            : existing.historicalCountryId,
      }
      if (this.prisma.politicalPartyLaw?.findMany) {
        const linkedParties = await this.prisma.politicalPartyLaw.findMany({
          where: { lawId: id },
          include: {
            party: {
              select: { countryId: true, historicalCountryId: true },
            },
          },
        })
        for (const link of linkedParties) {
          await assertLawMatchesPoliticalPartyJurisdictionAsync(
            this.prisma,
            nextLawJurisdiction,
            link.party,
          )
        }
      }
      if (body.countryId !== undefined) {
        data.country = body.countryId
          ? { connect: { id: body.countryId } }
          : { disconnect: true }
      }
      if (body.historicalCountryId !== undefined) {
        data.historicalCountry = body.historicalCountryId
          ? { connect: { id: body.historicalCountryId } }
          : { disconnect: true }
      }
    }
    const row = await this.prisma.law.update({
      where: { id },
      data,
      include: LAW_COUNTRY_INCLUDE,
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    const existing = await this.prisma.law.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('법령을 찾을 수 없습니다.')
    await this.prisma.$transaction([
      this.prisma.politicalPartyLaw.deleteMany({ where: { lawId: id } }),
      this.prisma.law.delete({ where: { id } }),
    ])
  }
}
