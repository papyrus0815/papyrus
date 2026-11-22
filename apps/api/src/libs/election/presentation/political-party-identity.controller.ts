/**
 * 정당 정체성 곁가지 — 이름 이력(별칭)·법적 지위 기간.
 * 설계: docs/political-party-model-review.md §4.2·4.4 (B1)
 *
 * 정당은 계정 소유가 없는 공유 정본이다(정당 CRUD와 같은 규칙 — JWT만 요구).
 */
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
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import {
  PoliticalPartyAliasType,
  PoliticalPartyLegalStatusKind,
  Prisma,
} from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'

import {
  type StructuredDateColumns,
  type StructuredDateInput,
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  readStructuredDate,
  structuredDateData,
} from '../domain/party-structured-date.util'

const ALIAS_TYPE_VALUES = new Set<string>(Object.values(PoliticalPartyAliasType))
const LEGAL_STATUS_VALUES = new Set<string>(Object.values(PoliticalPartyLegalStatusKind))
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

export interface PoliticalPartyAliasBody {
  name: string
  /** ACRONYM·ALIAS·FORMER_NAME·LOCAL_NAME·OFFICIAL·TRANSLATION·COMMON */
  type: string
  /** ISO 639 — ko, en, it, de, zh-Hant… */
  languageCode?: string | null
  /** 같은 유형·언어 안의 대표 — 켜면 나머지는 꺼진다 */
  isPrimary?: boolean
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
  sortOrder?: number
}

export type UpdatePoliticalPartyAliasBody = Partial<PoliticalPartyAliasBody>

export interface PoliticalPartyLegalStatusBody {
  /** LEGAL·SOLE_LEGAL·RULING_STATE_PARTY·BANNED·UNDERGROUND·IN_EXILE·SUSPENDED·CONSTITUTIONALLY_DISSOLVED·OTHER */
  status: string
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  /** 지속 중 — 끝이 비어 있는 것과 '모른다'를 가른다. 켜면 끝을 비운다 */
  isCurrent?: boolean
  lawId?: string | null
  eventId?: string | null
  note?: string | null
  sortOrder?: number
}

export type UpdatePoliticalPartyLegalStatusBody = Partial<PoliticalPartyLegalStatusBody>

/** 시작일 오름차순(모르면 뒤) → 순서 */
const periodOrderBy = [
  { startEra: 'asc' as const },
  { startYear: 'asc' as const },
  { startMonth: 'asc' as const },
  { startDay: 'asc' as const },
  { sortOrder: 'asc' as const },
]

@ApiTags('political-parties')
@Controller('political-parties')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyIdentityController {
  constructor(private readonly prisma: PrismaService) {}

  // ── 이름 이력 ──────────────────────────────────────────────

  @Get(':id/aliases')
  async listAliases(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    const rows = await this.prisma.politicalPartyAlias.findMany({
      where: { partyId },
      orderBy: [{ type: 'asc' }, { isPrimary: 'desc' }, ...periodOrderBy, { name: 'asc' }],
    })
    return this.sortByEraAware(rows)
  }

  @Post(':id/aliases')
  async createAlias(
    @Param('id') partyId: string,
    @Body() body: PoliticalPartyAliasBody,
  ): Promise<any> {
    await this.ensureParty(partyId)
    const name = this.requireName(body.name)
    const type = this.parseAliasType(body.type)
    const languageCode = this.parseLanguageCode(body.languageCode)
    const start = parseStructuredDateInput(body.start, '사용 시작')
    const end = parseStructuredDateInput(body.end, '사용 끝')
    assertStructuredRangeOrder(start, end, '사용 끝이 시작보다 앞설 수 없습니다.')
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (body.isPrimary) {
          await this.clearOtherPrimaryAliases(tx, partyId, type, languageCode, null)
        }
        return tx.politicalPartyAlias.create({
          data: {
            partyId,
            name,
            type,
            languageCode,
            isPrimary: Boolean(body.isPrimary),
            ...structuredDateData('start', start),
            ...structuredDateData('end', end),
            note: body.note?.trim() || null,
            sortOrder: body.sortOrder ?? 0,
          },
        })
      })
    } catch (error) {
      this.rethrowAliasConflict(error)
      throw error
    }
  }

  @Patch(':id/aliases/:aliasId')
  async updateAlias(
    @Param('id') partyId: string,
    @Param('aliasId') aliasId: string,
    @Body() body: UpdatePoliticalPartyAliasBody,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyAlias.findFirst({ where: { id: aliasId, partyId } })
    if (!existing) throw new NotFoundException('정당 이름을 찾을 수 없습니다.')
    const data: Prisma.PoliticalPartyAliasUpdateInput = {}
    if (body.name !== undefined) data.name = this.requireName(body.name)
    const type = body.type !== undefined ? this.parseAliasType(body.type) : existing.type
    if (body.type !== undefined) data.type = type
    const languageCode =
      body.languageCode !== undefined ? this.parseLanguageCode(body.languageCode) : existing.languageCode
    if (body.languageCode !== undefined) data.languageCode = languageCode
    if (body.isPrimary !== undefined) data.isPrimary = body.isPrimary
    const start =
      body.start !== undefined ? parseStructuredDateInput(body.start, '사용 시작') : readStructuredDate(existing, 'start')
    const end = body.end !== undefined ? parseStructuredDateInput(body.end, '사용 끝') : readStructuredDate(existing, 'end')
    if (body.start !== undefined) Object.assign(data, structuredDateData('start', start))
    if (body.end !== undefined) Object.assign(data, structuredDateData('end', end))
    assertStructuredRangeOrder(start, end, '사용 끝이 시작보다 앞설 수 없습니다.')
    if (body.note !== undefined) data.note = body.note?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    const willBePrimary = body.isPrimary ?? existing.isPrimary
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (willBePrimary) {
          await this.clearOtherPrimaryAliases(tx, partyId, type, languageCode, aliasId)
        }
        return tx.politicalPartyAlias.update({ where: { id: aliasId }, data })
      })
    } catch (error) {
      this.rethrowAliasConflict(error)
      throw error
    }
  }

  @Delete(':id/aliases/:aliasId')
  async deleteAlias(@Param('id') partyId: string, @Param('aliasId') aliasId: string): Promise<void> {
    const existing = await this.prisma.politicalPartyAlias.findFirst({
      where: { id: aliasId, partyId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('정당 이름을 찾을 수 없습니다.')
    await this.prisma.politicalPartyAlias.delete({ where: { id: aliasId } })
  }

  // ── 법적 지위 ──────────────────────────────────────────────

  @Get(':id/legal-statuses')
  async listLegalStatuses(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    const rows = await this.prisma.politicalPartyLegalStatus.findMany({
      where: { partyId },
      orderBy: periodOrderBy,
      include: {
        law: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
      },
    })
    return this.sortByEraAware(rows)
  }

  @Post(':id/legal-statuses')
  async createLegalStatus(
    @Param('id') partyId: string,
    @Body() body: PoliticalPartyLegalStatusBody,
  ): Promise<any> {
    await this.ensureParty(partyId)
    const status = this.parseLegalStatus(body.status)
    const start = parseStructuredDateInput(body.start, '시작')
    const isCurrent = Boolean(body.isCurrent)
    const end = isCurrent ? readStructuredDate({}, 'end') : parseStructuredDateInput(body.end, '끝')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    await this.assertLinkTargets(body.lawId, body.eventId)
    return this.prisma.politicalPartyLegalStatus.create({
      data: {
        partyId,
        status,
        ...structuredDateData('start', start),
        ...structuredDateData('end', end),
        isCurrent,
        lawId: body.lawId || null,
        eventId: body.eventId || null,
        note: body.note?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      },
      include: {
        law: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
      },
    })
  }

  @Patch(':id/legal-statuses/:statusId')
  async updateLegalStatus(
    @Param('id') partyId: string,
    @Param('statusId') statusId: string,
    @Body() body: UpdatePoliticalPartyLegalStatusBody,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyLegalStatus.findFirst({ where: { id: statusId, partyId } })
    if (!existing) throw new NotFoundException('법적 지위 기록을 찾을 수 없습니다.')
    const data: Prisma.PoliticalPartyLegalStatusUncheckedUpdateInput = {}
    if (body.status !== undefined) data.status = this.parseLegalStatus(body.status)
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
    await this.assertLinkTargets(body.lawId, body.eventId)
    if (body.lawId !== undefined) data.lawId = body.lawId || null
    if (body.eventId !== undefined) data.eventId = body.eventId || null
    if (body.note !== undefined) data.note = body.note?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    return this.prisma.politicalPartyLegalStatus.update({
      where: { id: statusId },
      data,
      include: {
        law: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
      },
    })
  }

  @Delete(':id/legal-statuses/:statusId')
  async deleteLegalStatus(
    @Param('id') partyId: string,
    @Param('statusId') statusId: string,
  ): Promise<void> {
    const existing = await this.prisma.politicalPartyLegalStatus.findFirst({
      where: { id: statusId, partyId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('법적 지위 기록을 찾을 수 없습니다.')
    await this.prisma.politicalPartyLegalStatus.delete({ where: { id: statusId } })
  }

  // ── 내부 ──────────────────────────────────────────────────

  private async ensureParty(partyId: string): Promise<void> {
    const party = await this.prisma.politicalParty.findUnique({ where: { id: partyId }, select: { id: true } })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }

  private requireName(raw: string | undefined): string {
    const name = raw?.trim() ?? ''
    if (!name) throw new BadRequestException('이름을 입력하세요.')
    if (name.length > 150) throw new BadRequestException('이름은 150자 이하여야 합니다.')
    return name
  }

  private parseAliasType(raw: string | undefined): PoliticalPartyAliasType {
    if (!raw || !ALIAS_TYPE_VALUES.has(raw)) {
      throw new BadRequestException(`이름 유형이 올바르지 않습니다: ${raw ?? '(없음)'}`)
    }
    return raw as PoliticalPartyAliasType
  }

  private parseLegalStatus(raw: string | undefined): PoliticalPartyLegalStatusKind {
    if (!raw || !LEGAL_STATUS_VALUES.has(raw)) {
      throw new BadRequestException(`법적 지위가 올바르지 않습니다: ${raw ?? '(없음)'}`)
    }
    return raw as PoliticalPartyLegalStatusKind
  }

  private parseLanguageCode(raw: string | null | undefined): string | null {
    const code = raw?.trim() ?? ''
    if (!code) return null
    if (!LANGUAGE_CODE_PATTERN.test(code) || code.length > 10) {
      throw new BadRequestException('언어 코드는 ISO 639 형식이어야 합니다(예: ko, en, it, zh-Hant).')
    }
    return code
  }

  /** 같은 정당·유형·언어의 다른 대표 표시를 끈다 */
  private async clearOtherPrimaryAliases(
    tx: Prisma.TransactionClient,
    partyId: string,
    type: PoliticalPartyAliasType,
    languageCode: string | null,
    exceptId: string | null,
  ): Promise<void> {
    await tx.politicalPartyAlias.updateMany({
      where: {
        partyId,
        type,
        languageCode,
        isPrimary: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isPrimary: false },
    })
  }

  private async assertLinkTargets(
    lawId: string | null | undefined,
    eventId: string | null | undefined,
  ): Promise<void> {
    if (lawId) {
      const law = await this.prisma.law.findUnique({ where: { id: lawId }, select: { id: true } })
      if (!law) throw new BadRequestException('연결할 법령을 찾을 수 없습니다.')
    }
    if (eventId) {
      const event = await this.prisma.event.findFirst({
        where: { id: eventId, deletedAt: null },
        select: { id: true },
      })
      if (!event) throw new BadRequestException('연결할 사건을 찾을 수 없습니다.')
    }
  }

  private rethrowAliasConflict(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('같은 유형·언어로 같은 이름이 이미 있습니다.')
    }
  }

  /**
   * DB 정렬은 era를 문자열로 비교해(AD < BC) 기원전이 뒤로 간다 — 부호 연도로 다시 정렬.
   * 시작을 모르는 행은 맨 뒤, 같으면 DB 순서 유지.
   */
  private sortByEraAware<Row extends { startEra: string | null; startYear: number | null; startMonth: number | null; startDay: number | null }>(
    rows: Row[],
  ): Row[] {
    const key = (row: Row) =>
      row.startYear == null
        ? Number.POSITIVE_INFINITY
        : (row.startEra === 'BC' ? -row.startYear : row.startYear) * 10000 +
          (row.startMonth ?? 1) * 100 +
          (row.startDay ?? 1)
    return rows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => key(left.row) - key(right.row) || left.index - right.index)
      .map(({ row }) => row)
  }
}
