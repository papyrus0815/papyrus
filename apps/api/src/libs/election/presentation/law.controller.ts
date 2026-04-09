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

export interface CreateLawBody {
  name: string
  summary?: string | null
  articleNumber?: number | null
  paragraphNumber?: number | null
  lawTypeId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
}

export interface UpdateLawBody {
  name?: string
  summary?: string | null
  articleNumber?: number | null
  paragraphNumber?: number | null
  lawTypeId?: string | null
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
    const where: Prisma.LawWhereInput = {}
    if (countryId) where.countryId = countryId
    if (historicalCountryId) where.historicalCountryId = historicalCountryId
    const rows = await this.prisma.law.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
      include: {
        lawType: { select: { id: true, name: true } },
      },
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
    const row = await this.prisma.law.create({
      data: {
        name: body.name,
        summary: body.summary ?? undefined,
        articleNumber: article.value ?? undefined,
        paragraphNumber: paragraph.value ?? undefined,
        lawTypeId: body.lawTypeId ?? undefined,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
      },
      include: {
        lawType: { select: { id: true, name: true } },
      },
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
    const row = await this.prisma.law.update({
      where: { id },
      data,
      include: {
        lawType: { select: { id: true, name: true } },
      },
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
