/**
 * 정당 × 이념 카탈로그 연결 · 스펙트럼 기간(B2, docs/political-party-model-review.md §4.3).
 *
 * - 이념 연결: 집합·순서는 PUT(모달 칩 목록), 연결별 대표·기간·메모는 PATCH. 바뀔 때마다 ideology 표시 캐시를 다시 쓴다.
 * - 스펙트럼 기간: 지속 중(isCurrent) 행은 정당에 하나만, 그 행의 스펙트럼이 정당 대표 position이 된다.
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
  Put,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { PoliticalPosition, Prisma } from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'

import {
  ensureOnePrimary,
  refreshPartyIdeologyCache,
  syncPartyIdeologies,
} from '../domain/party-ideology.util'
import {
  type StructuredDateColumns,
  type StructuredDateInput,
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  readStructuredDate,
  structuredDateData,
} from '../domain/party-structured-date.util'
import { removePartyCitations } from '../domain/party-evidence.util'

const POSITION_VALUES = new Set<string>(Object.values(PoliticalPosition))

export interface SetPartyIdeologiesBody {
  /** 순서 = 표시 순서. 빠진 이념은 연결이 풀린다(남는 연결의 기간·메모는 보존) */
  ideologyIds: string[]
}

export interface UpdatePartyIdeologyLinkBody {
  isPrimary?: boolean
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

export interface PartyPositionPeriodBody {
  position: string
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  isCurrent?: boolean
  note?: string | null
  sortOrder?: number
}

export type UpdatePartyPositionPeriodBody = Partial<PartyPositionPeriodBody>

const linkInclude = {
  ideology: {
    select: {
      id: true,
      name: true,
      englishName: true,
      category: true,
      parent: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.PoliticalPartyIdeologyInclude

@ApiTags('political-parties')
@Controller('political-parties')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyIdeologyController {
  constructor(private readonly prisma: PrismaService) {}

  // ── 이념 연결 ──

  @Get(':id/ideologies')
  async listIdeologies(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    return this.prisma.politicalPartyIdeology.findMany({
      where: { partyId },
      include: linkInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  @Put(':id/ideologies')
  async setIdeologies(@Param('id') partyId: string, @Body() body: SetPartyIdeologiesBody): Promise<any> {
    await this.ensureParty(partyId)
    const ideologyIds = await this.assertIdeologyIds(body.ideologyIds)
    await this.prisma.$transaction((tx) => syncPartyIdeologies(tx, partyId, ideologyIds))
    return this.listIdeologies(partyId)
  }

  @Patch(':id/ideologies/:linkId')
  async updateIdeologyLink(
    @Param('id') partyId: string,
    @Param('linkId') linkId: string,
    @Body() body: UpdatePartyIdeologyLinkBody,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyIdeology.findFirst({ where: { id: linkId, partyId } })
    if (!existing) throw new NotFoundException('이념 연결을 찾을 수 없습니다.')
    const data: Prisma.PoliticalPartyIdeologyUncheckedUpdateInput = {}
    const start =
      body.start !== undefined ? parseStructuredDateInput(body.start, '내건 시작') : readStructuredDate(existing, 'start')
    const end = body.end !== undefined ? parseStructuredDateInput(body.end, '내건 끝') : readStructuredDate(existing, 'end')
    if (body.start !== undefined) Object.assign(data, structuredDateData('start', start))
    if (body.end !== undefined) Object.assign(data, structuredDateData('end', end))
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    if (body.note !== undefined) data.note = body.note?.trim() || null
    return this.prisma.$transaction(async (tx) => {
      if (body.isPrimary === true) {
        await tx.politicalPartyIdeology.updateMany({ where: { partyId, id: { not: linkId } }, data: { isPrimary: false } })
        data.isPrimary = true
      } else if (body.isPrimary === false) {
        data.isPrimary = false
      }
      await tx.politicalPartyIdeology.update({ where: { id: linkId }, data })
      await ensureOnePrimary(tx, partyId)
      return tx.politicalPartyIdeology.findUnique({ where: { id: linkId }, include: linkInclude })
    })
  }

  @Delete(':id/ideologies/:linkId')
  async deleteIdeologyLink(@Param('id') partyId: string, @Param('linkId') linkId: string): Promise<void> {
    const existing = await this.prisma.politicalPartyIdeology.findFirst({
      where: { id: linkId, partyId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('이념 연결을 찾을 수 없습니다.')
    await this.prisma.$transaction(async (tx) => {
      await removePartyCitations(tx, 'PARTY_IDEOLOGY', [linkId])
      await tx.politicalPartyIdeology.delete({ where: { id: linkId } })
      await ensureOnePrimary(tx, partyId)
      await refreshPartyIdeologyCache(tx, partyId)
    })
  }

  // ── 스펙트럼 기간 ──

  @Get(':id/position-periods')
  async listPositionPeriods(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    const rows = await this.prisma.politicalPartyPositionPeriod.findMany({
      where: { partyId },
      orderBy: [{ startYear: 'asc' }, { startMonth: 'asc' }, { startDay: 'asc' }, { sortOrder: 'asc' }],
    })
    return this.sortByEraAware(rows)
  }

  @Post(':id/position-periods')
  async createPositionPeriod(@Param('id') partyId: string, @Body() body: PartyPositionPeriodBody): Promise<any> {
    await this.ensureParty(partyId)
    const position = this.parsePosition(body.position)
    const isCurrent = Boolean(body.isCurrent)
    const start = parseStructuredDateInput(body.start, '시작')
    const end = isCurrent ? readStructuredDate({}, 'end') : parseStructuredDateInput(body.end, '끝')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    return this.prisma.$transaction(async (tx) => {
      if (isCurrent) await this.clearOtherCurrent(tx, partyId, null)
      const row = await tx.politicalPartyPositionPeriod.create({
        data: {
          partyId,
          position,
          ...structuredDateData('start', start),
          ...structuredDateData('end', end),
          isCurrent,
          note: body.note?.trim() || null,
          sortOrder: body.sortOrder ?? 0,
        },
      })
      if (isCurrent) await tx.politicalParty.update({ where: { id: partyId }, data: { position } })
      return row
    })
  }

  @Patch(':id/position-periods/:periodId')
  async updatePositionPeriod(
    @Param('id') partyId: string,
    @Param('periodId') periodId: string,
    @Body() body: UpdatePartyPositionPeriodBody,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyPositionPeriod.findFirst({ where: { id: periodId, partyId } })
    if (!existing) throw new NotFoundException('스펙트럼 기간을 찾을 수 없습니다.')
    const data: Prisma.PoliticalPartyPositionPeriodUncheckedUpdateInput = {}
    const position = body.position !== undefined ? this.parsePosition(body.position) : existing.position
    if (body.position !== undefined) data.position = position
    const isCurrent = body.isCurrent ?? existing.isCurrent
    if (body.isCurrent !== undefined) data.isCurrent = isCurrent
    const start =
      body.start !== undefined ? parseStructuredDateInput(body.start, '시작') : readStructuredDate(existing, 'start')
    let end: StructuredDateColumns =
      body.end !== undefined ? parseStructuredDateInput(body.end, '끝') : readStructuredDate(existing, 'end')
    if (isCurrent) end = readStructuredDate({}, 'end')
    if (body.start !== undefined) Object.assign(data, structuredDateData('start', start))
    if (body.end !== undefined || isCurrent) Object.assign(data, structuredDateData('end', end))
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    if (body.note !== undefined) data.note = body.note?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    return this.prisma.$transaction(async (tx) => {
      if (isCurrent) await this.clearOtherCurrent(tx, partyId, periodId)
      const row = await tx.politicalPartyPositionPeriod.update({ where: { id: periodId }, data })
      if (isCurrent) await tx.politicalParty.update({ where: { id: partyId }, data: { position } })
      return row
    })
  }

  @Delete(':id/position-periods/:periodId')
  async deletePositionPeriod(@Param('id') partyId: string, @Param('periodId') periodId: string): Promise<void> {
    const existing = await this.prisma.politicalPartyPositionPeriod.findFirst({
      where: { id: periodId, partyId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('스펙트럼 기간을 찾을 수 없습니다.')
    /* 대표 position은 그대로 둔다 — 대표값은 정당 정보 수정에서 고른다 */
    await this.prisma.$transaction(async (tx) => {
      await removePartyCitations(tx, 'PARTY_POSITION_PERIOD', [periodId])
      await tx.politicalPartyPositionPeriod.delete({ where: { id: periodId } })
    })
  }

  // ── 내부 ──

  private async ensureParty(partyId: string): Promise<void> {
    const party = await this.prisma.politicalParty.findUnique({ where: { id: partyId }, select: { id: true } })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }

  private async assertIdeologyIds(raw: string[] | undefined): Promise<string[]> {
    if (!Array.isArray(raw)) throw new BadRequestException('ideologyIds는 배열이어야 합니다.')
    const ids = [...new Set(raw.filter((id) => typeof id === 'string' && id))]
    if (ids.length === 0) return []
    const found = await this.prisma.ideology.count({ where: { id: { in: ids } } })
    if (found !== ids.length) throw new BadRequestException('없는 이념이 섞여 있습니다.')
    return ids
  }

  private parsePosition(raw: string | undefined): PoliticalPosition {
    if (!raw || !POSITION_VALUES.has(raw)) throw new BadRequestException(`스펙트럼 값이 올바르지 않습니다: ${raw ?? '(없음)'}`)
    return raw as PoliticalPosition
  }

  private async clearOtherCurrent(tx: Prisma.TransactionClient, partyId: string, exceptId: string | null): Promise<void> {
    await tx.politicalPartyPositionPeriod.updateMany({
      where: { partyId, isCurrent: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isCurrent: false },
    })
  }

  /** DB 정렬은 기원(BC/AD)을 모른다 — 부호 연도로 다시 정렬, 시작 모르면 맨 뒤 */
  private sortByEraAware<Row extends { startEra: string | null; startYear: number | null; startMonth: number | null; startDay: number | null }>(
    rows: Row[],
  ): Row[] {
    const key = (row: Row) =>
      row.startYear == null
        ? Number.POSITIVE_INFINITY
        : (row.startEra === 'BC' ? -row.startYear : row.startYear) * 10000 + (row.startMonth ?? 1) * 100 + (row.startDay ?? 1)
    return rows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => key(left.row) - key(right.row) || left.index - right.index)
      .map(({ row }) => row)
  }
}
