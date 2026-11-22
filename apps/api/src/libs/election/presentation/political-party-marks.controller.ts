/**
 * 정당 표지(이미지)·표현(표어·당가)·당사 이력(B4, docs/political-party-model-review.md §4.5).
 *
 * 같은 종류 안의 대표는 하나(표지·표현), 지속 중 당사는 하나. 대표 LOGO·현재 당사 도시는 정당 본체 캐시로 맞춘다.
 */
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
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import {
  PoliticalPartyExpressionKind,
  PoliticalPartySymbolKind,
  Prisma,
} from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'

import { refreshPartyHeadquartersCache, refreshPartyLogoCache } from '../domain/party-marks.util'
import {
  type StructuredDateColumns,
  type StructuredDateInput,
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  readStructuredDate,
  structuredDateData,
} from '../domain/party-structured-date.util'

const SYMBOL_KINDS = new Set<string>(Object.values(PoliticalPartySymbolKind))
const EXPRESSION_KINDS = new Set<string>(Object.values(PoliticalPartyExpressionKind))
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

export interface PartySymbolBody {
  kind: string
  /** 업로드 경로(/uploads/…) 또는 http(s) URL */
  imageUrl: string
  caption?: string | null
  isPrimary?: boolean
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  sortOrder?: number
}

export interface PartyExpressionBody {
  kind: string
  originalText: string
  languageCode?: string | null
  translation?: string | null
  mediaUrl?: string | null
  isPrimary?: boolean
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
  sortOrder?: number
}

export interface PartyHeadquartersBody {
  cityId?: string | null
  buildingName?: string | null
  address?: string | null
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  isCurrent?: boolean
  note?: string | null
  sortOrder?: number
}

const periodOrder = (row: { startEra: string | null; startYear: number | null; startMonth: number | null; startDay: number | null }) =>
  row.startYear == null
    ? Number.POSITIVE_INFINITY
    : (row.startEra === 'BC' ? -row.startYear : row.startYear) * 10000 + (row.startMonth ?? 1) * 100 + (row.startDay ?? 1)

function sortByPeriod<Row extends { startEra: string | null; startYear: number | null; startMonth: number | null; startDay: number | null }>(
  rows: Row[],
): Row[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => periodOrder(left.row) - periodOrder(right.row) || left.index - right.index)
    .map(({ row }) => row)
}

@ApiTags('political-parties')
@Controller('political-parties')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyMarksController {
  constructor(private readonly prisma: PrismaService) {}

  // ── 표지 ──

  @Get(':id/symbols')
  async listSymbols(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    const rows = await this.prisma.politicalPartySymbol.findMany({
      where: { partyId },
      orderBy: [{ kind: 'asc' }, { isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows
  }

  @Post(':id/symbols')
  async createSymbol(@Param('id') partyId: string, @Body() body: PartySymbolBody): Promise<any> {
    await this.ensureParty(partyId)
    const kind = this.parseKind(body.kind, SYMBOL_KINDS, '표지 종류') as PoliticalPartySymbolKind
    const imageUrl = this.parseImageUrl(body.imageUrl)
    const { start, end } = this.parsePeriod(body.start, body.end)
    return this.prisma.$transaction(async (tx) => {
      if (body.isPrimary) await tx.politicalPartySymbol.updateMany({ where: { partyId, kind, isPrimary: true }, data: { isPrimary: false } })
      const row = await tx.politicalPartySymbol.create({
        data: {
          partyId,
          kind,
          imageUrl,
          caption: body.caption?.trim() || null,
          isPrimary: Boolean(body.isPrimary),
          ...structuredDateData('start', start),
          ...structuredDateData('end', end),
          sortOrder: body.sortOrder ?? 0,
        },
      })
      await refreshPartyLogoCache(tx, partyId)
      return row
    })
  }

  @Patch(':id/symbols/:symbolId')
  async updateSymbol(
    @Param('id') partyId: string,
    @Param('symbolId') symbolId: string,
    @Body() body: Partial<PartySymbolBody>,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartySymbol.findFirst({ where: { id: symbolId, partyId } })
    if (!existing) throw new NotFoundException('표지를 찾을 수 없습니다.')
    const data: Prisma.PoliticalPartySymbolUncheckedUpdateInput = {}
    const kind = body.kind !== undefined ? (this.parseKind(body.kind, SYMBOL_KINDS, '표지 종류') as PoliticalPartySymbolKind) : existing.kind
    if (body.kind !== undefined) data.kind = kind
    if (body.imageUrl !== undefined) data.imageUrl = this.parseImageUrl(body.imageUrl)
    if (body.caption !== undefined) data.caption = body.caption?.trim() || null
    if (body.isPrimary !== undefined) data.isPrimary = body.isPrimary
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    this.applyPeriod(data, existing, body.start, body.end)
    const willBePrimary = body.isPrimary ?? existing.isPrimary
    return this.prisma.$transaction(async (tx) => {
      if (willBePrimary) {
        await tx.politicalPartySymbol.updateMany({
          where: { partyId, kind, isPrimary: true, id: { not: symbolId } },
          data: { isPrimary: false },
        })
      }
      const row = await tx.politicalPartySymbol.update({ where: { id: symbolId }, data })
      await refreshPartyLogoCache(tx, partyId)
      return row
    })
  }

  @Delete(':id/symbols/:symbolId')
  async deleteSymbol(@Param('id') partyId: string, @Param('symbolId') symbolId: string): Promise<void> {
    const existing = await this.prisma.politicalPartySymbol.findFirst({ where: { id: symbolId, partyId }, select: { id: true } })
    if (!existing) throw new NotFoundException('표지를 찾을 수 없습니다.')
    await this.prisma.$transaction(async (tx) => {
      await tx.politicalPartySymbol.delete({ where: { id: symbolId } })
      await refreshPartyLogoCache(tx, partyId)
    })
  }

  // ── 표현 ──

  @Get(':id/expressions')
  async listExpressions(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    const rows = await this.prisma.politicalPartyExpression.findMany({
      where: { partyId },
      orderBy: [{ kind: 'asc' }, { isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows
  }

  @Post(':id/expressions')
  async createExpression(@Param('id') partyId: string, @Body() body: PartyExpressionBody): Promise<any> {
    await this.ensureParty(partyId)
    const kind = this.parseKind(body.kind, EXPRESSION_KINDS, '표현 종류') as PoliticalPartyExpressionKind
    const originalText = this.requireText(body.originalText, '원문(노래는 제목)')
    const { start, end } = this.parsePeriod(body.start, body.end)
    return this.prisma.$transaction(async (tx) => {
      if (body.isPrimary) {
        await tx.politicalPartyExpression.updateMany({ where: { partyId, kind, isPrimary: true }, data: { isPrimary: false } })
      }
      return tx.politicalPartyExpression.create({
        data: {
          partyId,
          kind,
          originalText,
          languageCode: this.parseLanguageCode(body.languageCode),
          translation: body.translation?.trim() || null,
          mediaUrl: this.parseOptionalUrl(body.mediaUrl),
          isPrimary: Boolean(body.isPrimary),
          ...structuredDateData('start', start),
          ...structuredDateData('end', end),
          note: body.note?.trim() || null,
          sortOrder: body.sortOrder ?? 0,
        },
      })
    })
  }

  @Patch(':id/expressions/:expressionId')
  async updateExpression(
    @Param('id') partyId: string,
    @Param('expressionId') expressionId: string,
    @Body() body: Partial<PartyExpressionBody>,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyExpression.findFirst({ where: { id: expressionId, partyId } })
    if (!existing) throw new NotFoundException('표현을 찾을 수 없습니다.')
    const data: Prisma.PoliticalPartyExpressionUncheckedUpdateInput = {}
    const kind =
      body.kind !== undefined ? (this.parseKind(body.kind, EXPRESSION_KINDS, '표현 종류') as PoliticalPartyExpressionKind) : existing.kind
    if (body.kind !== undefined) data.kind = kind
    if (body.originalText !== undefined) data.originalText = this.requireText(body.originalText, '원문(노래는 제목)')
    if (body.languageCode !== undefined) data.languageCode = this.parseLanguageCode(body.languageCode)
    if (body.translation !== undefined) data.translation = body.translation?.trim() || null
    if (body.mediaUrl !== undefined) data.mediaUrl = this.parseOptionalUrl(body.mediaUrl)
    if (body.isPrimary !== undefined) data.isPrimary = body.isPrimary
    if (body.note !== undefined) data.note = body.note?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    this.applyPeriod(data, existing, body.start, body.end)
    const willBePrimary = body.isPrimary ?? existing.isPrimary
    return this.prisma.$transaction(async (tx) => {
      if (willBePrimary) {
        await tx.politicalPartyExpression.updateMany({
          where: { partyId, kind, isPrimary: true, id: { not: expressionId } },
          data: { isPrimary: false },
        })
      }
      return tx.politicalPartyExpression.update({ where: { id: expressionId }, data })
    })
  }

  @Delete(':id/expressions/:expressionId')
  async deleteExpression(@Param('id') partyId: string, @Param('expressionId') expressionId: string): Promise<void> {
    const existing = await this.prisma.politicalPartyExpression.findFirst({ where: { id: expressionId, partyId }, select: { id: true } })
    if (!existing) throw new NotFoundException('표현을 찾을 수 없습니다.')
    await this.prisma.politicalPartyExpression.delete({ where: { id: expressionId } })
  }

  // ── 당사 ──

  @Get(':id/headquarters')
  async listHeadquarters(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    const rows = await this.prisma.politicalPartyHeadquarters.findMany({
      where: { partyId },
      include: { city: { select: { id: true, name: true, localName: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return sortByPeriod(rows)
  }

  @Post(':id/headquarters')
  async createHeadquarters(@Param('id') partyId: string, @Body() body: PartyHeadquartersBody): Promise<any> {
    await this.ensureParty(partyId)
    const isCurrent = Boolean(body.isCurrent)
    const start = parseStructuredDateInput(body.start, '시작')
    const end = isCurrent ? readStructuredDate({}, 'end') : parseStructuredDateInput(body.end, '끝')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    const cityId = await this.parseCityId(body.cityId)
    const buildingName = body.buildingName?.trim() || null
    if (!cityId && !buildingName && !body.address?.trim()) {
      throw new BadRequestException('도시·건물·주소 중 하나는 있어야 합니다.')
    }
    return this.prisma.$transaction(async (tx) => {
      if (isCurrent) await tx.politicalPartyHeadquarters.updateMany({ where: { partyId, isCurrent: true }, data: { isCurrent: false } })
      const row = await tx.politicalPartyHeadquarters.create({
        data: {
          partyId,
          cityId,
          buildingName,
          address: body.address?.trim() || null,
          ...structuredDateData('start', start),
          ...structuredDateData('end', end),
          isCurrent,
          note: body.note?.trim() || null,
          sortOrder: body.sortOrder ?? 0,
        },
        include: { city: { select: { id: true, name: true, localName: true } } },
      })
      await refreshPartyHeadquartersCache(tx, partyId)
      return row
    })
  }

  @Patch(':id/headquarters/:hqId')
  async updateHeadquarters(
    @Param('id') partyId: string,
    @Param('hqId') hqId: string,
    @Body() body: Partial<PartyHeadquartersBody>,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyHeadquarters.findFirst({ where: { id: hqId, partyId } })
    if (!existing) throw new NotFoundException('당사 기록을 찾을 수 없습니다.')
    const data: Prisma.PoliticalPartyHeadquartersUncheckedUpdateInput = {}
    if (body.cityId !== undefined) data.cityId = await this.parseCityId(body.cityId)
    if (body.buildingName !== undefined) data.buildingName = body.buildingName?.trim() || null
    if (body.address !== undefined) data.address = body.address?.trim() || null
    if (body.note !== undefined) data.note = body.note?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    const isCurrent = body.isCurrent ?? existing.isCurrent
    if (body.isCurrent !== undefined) data.isCurrent = isCurrent
    const start = body.start !== undefined ? parseStructuredDateInput(body.start, '시작') : readStructuredDate(existing, 'start')
    let end: StructuredDateColumns = body.end !== undefined ? parseStructuredDateInput(body.end, '끝') : readStructuredDate(existing, 'end')
    if (isCurrent) end = readStructuredDate({}, 'end')
    if (body.start !== undefined) Object.assign(data, structuredDateData('start', start))
    if (body.end !== undefined || isCurrent) Object.assign(data, structuredDateData('end', end))
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    return this.prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.politicalPartyHeadquarters.updateMany({
          where: { partyId, isCurrent: true, id: { not: hqId } },
          data: { isCurrent: false },
        })
      }
      const row = await tx.politicalPartyHeadquarters.update({
        where: { id: hqId },
        data,
        include: { city: { select: { id: true, name: true, localName: true } } },
      })
      await refreshPartyHeadquartersCache(tx, partyId)
      return row
    })
  }

  @Delete(':id/headquarters/:hqId')
  async deleteHeadquarters(@Param('id') partyId: string, @Param('hqId') hqId: string): Promise<void> {
    const existing = await this.prisma.politicalPartyHeadquarters.findFirst({ where: { id: hqId, partyId }, select: { id: true } })
    if (!existing) throw new NotFoundException('당사 기록을 찾을 수 없습니다.')
    await this.prisma.$transaction(async (tx) => {
      await tx.politicalPartyHeadquarters.delete({ where: { id: hqId } })
      await refreshPartyHeadquartersCache(tx, partyId)
    })
  }

  // ── 내부 ──

  private async ensureParty(partyId: string): Promise<void> {
    const party = await this.prisma.politicalParty.findUnique({ where: { id: partyId }, select: { id: true } })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }

  private parseKind(raw: string | undefined, allowed: Set<string>, label: string): string {
    if (!raw || !allowed.has(raw)) throw new BadRequestException(`${label}가 올바르지 않습니다: ${raw ?? '(없음)'}`)
    return raw
  }

  private parseImageUrl(raw: string | undefined): string {
    const url = raw?.trim() ?? ''
    if (!url) throw new BadRequestException('이미지를 올리세요.')
    if (url.length > 500) throw new BadRequestException('이미지 경로가 너무 깁니다.')
    if (!url.startsWith('/') && !/^https?:\/\//i.test(url)) {
      throw new BadRequestException('이미지는 업로드 경로(/…) 또는 http(s) 주소여야 합니다.')
    }
    return url
  }

  private parseOptionalUrl(raw: string | null | undefined): string | null {
    const url = raw?.trim() ?? ''
    if (!url) return null
    if (url.length > 500) throw new BadRequestException('링크가 너무 깁니다.')
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) throw new BadRequestException('링크는 http(s) 주소여야 합니다.')
    return url
  }

  private requireText(raw: string | undefined, label: string): string {
    const text = raw?.trim() ?? ''
    if (!text) throw new BadRequestException(`${label}을 입력하세요.`)
    return text
  }

  private parseLanguageCode(raw: string | null | undefined): string | null {
    const code = raw?.trim() ?? ''
    if (!code) return null
    if (!LANGUAGE_CODE_PATTERN.test(code) || code.length > 10) {
      throw new BadRequestException('언어 코드는 ISO 639 형식이어야 합니다(예: it, ko, de).')
    }
    return code
  }

  private async parseCityId(raw: string | null | undefined): Promise<string | null> {
    if (!raw) return null
    const city = await this.prisma.city.findUnique({ where: { id: raw }, select: { id: true } })
    if (!city) throw new BadRequestException('도시를 찾을 수 없습니다.')
    return city.id
  }

  private parsePeriod(rawStart: StructuredDateInput | null | undefined, rawEnd: StructuredDateInput | null | undefined) {
    const start = parseStructuredDateInput(rawStart, '시작')
    const end = parseStructuredDateInput(rawEnd, '끝')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    return { start, end }
  }

  private applyPeriod(
    data: Record<string, unknown>,
    existing: Record<string, unknown>,
    rawStart: StructuredDateInput | null | undefined,
    rawEnd: StructuredDateInput | null | undefined,
  ): void {
    const start = rawStart !== undefined ? parseStructuredDateInput(rawStart, '시작') : readStructuredDate(existing, 'start')
    const end = rawEnd !== undefined ? parseStructuredDateInput(rawEnd, '끝') : readStructuredDate(existing, 'end')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    if (rawStart !== undefined) Object.assign(data, structuredDateData('start', start))
    if (rawEnd !== undefined) Object.assign(data, structuredDateData('end', end))
  }
}
