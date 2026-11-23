/**
 * 정당 사이 관계 — 자매 정당·위성정당·계파·공동 교섭단체(B6, docs/political-party-model-review.md §4.6).
 *
 * 한 행을 두 정당이 함께 본다 — 어느 쪽 상세에서 걸든 같은 행이고, 응답은 요청한 정당 입장(상대·자리)으로 돌려준다.
 * 계보(전신·후신)는 PoliticalPartyTransition, 선거 한 번의 연합은 ElectionAlliance — 여기는 '나란히 있던 사이'.
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
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { PoliticalPartyLinkKind, Prisma } from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'

import { removePartyCitations } from '../domain/party-evidence.util'
import { LINK_KIND_VALUES, SYMMETRIC_LINK_KINDS, linkPerspective, orientLink } from '../domain/party-link.util'
import {
  type StructuredDateInput,
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  readStructuredDate,
  structuredDateData,
} from '../domain/party-structured-date.util'

export interface PartyLinkBody {
  otherPartyId: string
  kind: string
  /** 비대칭 종류에서 이 정당의 자리 — subordinate(이 정당이 상대의 위성·계파) / superior(상대가 이 정당의). 대칭 종류는 무시 */
  role?: 'subordinate' | 'superior'
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
  sortOrder?: number
}

export type UpdatePartyLinkBody = Partial<PartyLinkBody>

const partySummary = {
  select: {
    id: true,
    name: true,
    shortName: true,
    brandColor: true,
    country: { select: { id: true, name: true } },
    historicalCountry: { select: { id: true, name: true } },
  },
} as const

const linkInclude = { fromParty: partySummary, toParty: partySummary } satisfies Prisma.PoliticalPartyLinkInclude

type LinkRow = Prisma.PoliticalPartyLinkGetPayload<{ include: typeof linkInclude }>

@ApiTags('political-parties')
@Controller('political-parties')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyLinkController {
  constructor(private readonly prisma: PrismaService) {}

  /** 관계 상대 후보 — 이름·약칭·별칭으로, 나라 무관(자매 정당은 국경을 넘는다) */
  @Get(':id/link-candidates')
  async linkCandidates(@Param('id') partyId: string, @Query('query') query?: string): Promise<any> {
    await this.ensureParty(partyId)
    const term = (query ?? '').trim()
    const rows = await this.prisma.politicalParty.findMany({
      where: {
        id: { not: partyId },
        ...(term
          ? {
              OR: [
                { name: { contains: term } },
                { shortName: { contains: term } },
                { aliases: { some: { name: { contains: term } } } },
              ],
            }
          : {}),
      },
      ...partySummary,
      orderBy: { name: 'asc' },
      take: 30,
    })
    return rows
  }

  @Get(':id/links')
  async list(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    const rows = await this.prisma.politicalPartyLink.findMany({
      where: { OR: [{ fromPartyId: partyId }, { toPartyId: partyId }] },
      include: linkInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows
      .sort((left, right) => left.kind.localeCompare(right.kind) || (left.startYear ?? 99999) - (right.startYear ?? 99999))
      .map((row) => this.view(row, partyId))
  }

  @Post(':id/links')
  async create(@Param('id') partyId: string, @Body() body: PartyLinkBody): Promise<any> {
    await this.ensureParty(partyId)
    const kind = this.parseKind(body.kind)
    const otherPartyId = await this.assertOther(partyId, body.otherPartyId)
    const orientation = orientLink(kind, partyId, otherPartyId, this.parseRole(kind, body.role))
    const start = parseStructuredDateInput(body.start, '시작')
    const end = parseStructuredDateInput(body.end, '끝')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    await this.assertNoContradiction(kind, orientation, null)
    try {
      const row = await this.prisma.politicalPartyLink.create({
        data: {
          ...orientation,
          kind,
          ...structuredDateData('start', start),
          ...structuredDateData('end', end),
          note: body.note?.trim() || null,
          sortOrder: body.sortOrder ?? 0,
        },
        include: linkInclude,
      })
      return this.view(row, partyId)
    } catch (error) {
      this.rethrowDuplicate(error)
      throw error
    }
  }

  @Patch(':id/links/:linkId')
  async update(@Param('id') partyId: string, @Param('linkId') linkId: string, @Body() body: UpdatePartyLinkBody): Promise<any> {
    const existing = await this.findOwnLink(partyId, linkId)
    const perspective = linkPerspective(existing, partyId)
    const kind = body.kind !== undefined ? this.parseKind(body.kind) : existing.kind
    const otherPartyId =
      body.otherPartyId !== undefined ? await this.assertOther(partyId, body.otherPartyId) : perspective.otherPartyId
    const currentRole = perspective.role === 'peer' ? 'subordinate' : perspective.role
    const role = SYMMETRIC_LINK_KINDS.has(kind) ? 'subordinate' : this.parseRole(kind, body.role ?? currentRole)
    const orientation = orientLink(kind, partyId, otherPartyId, role)
    const start = body.start !== undefined ? parseStructuredDateInput(body.start, '시작') : readStructuredDate(existing, 'start')
    const end = body.end !== undefined ? parseStructuredDateInput(body.end, '끝') : readStructuredDate(existing, 'end')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    await this.assertNoContradiction(kind, orientation, linkId)
    const data: Prisma.PoliticalPartyLinkUncheckedUpdateInput = { ...orientation, kind }
    if (body.start !== undefined) Object.assign(data, structuredDateData('start', start))
    if (body.end !== undefined) Object.assign(data, structuredDateData('end', end))
    if (body.note !== undefined) data.note = body.note?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    try {
      const row = await this.prisma.politicalPartyLink.update({ where: { id: linkId }, data, include: linkInclude })
      return this.view(row, partyId)
    } catch (error) {
      this.rethrowDuplicate(error)
      throw error
    }
  }

  @Delete(':id/links/:linkId')
  async remove(@Param('id') partyId: string, @Param('linkId') linkId: string): Promise<void> {
    await this.findOwnLink(partyId, linkId)
    await this.prisma.$transaction(async (tx) => {
      await removePartyCitations(tx, 'PARTY_LINK', [linkId])
      await tx.politicalPartyLink.delete({ where: { id: linkId } })
    })
  }

  // ── 내부 ──

  /** 요청한 정당 입장 — 상대 정당과 이 정당의 자리(peer/subordinate/superior) */
  private view(row: LinkRow, partyId: string) {
    const { otherPartyId, role } = linkPerspective(row, partyId)
    const otherParty = row.fromPartyId === otherPartyId ? row.fromParty : row.toParty
    return {
      id: row.id,
      kind: row.kind,
      role,
      otherParty,
      otherPartyId,
      startEra: row.startEra,
      startYear: row.startYear,
      startMonth: row.startMonth,
      startDay: row.startDay,
      startPrecision: row.startPrecision,
      endEra: row.endEra,
      endYear: row.endYear,
      endMonth: row.endMonth,
      endDay: row.endDay,
      endPrecision: row.endPrecision,
      note: row.note,
      sortOrder: row.sortOrder,
    }
  }

  private async ensureParty(partyId: string): Promise<void> {
    const party = await this.prisma.politicalParty.findUnique({ where: { id: partyId }, select: { id: true } })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }

  private async findOwnLink(partyId: string, linkId: string) {
    const row = await this.prisma.politicalPartyLink.findFirst({
      where: { id: linkId, OR: [{ fromPartyId: partyId }, { toPartyId: partyId }] },
    })
    if (!row) throw new NotFoundException('정당 관계를 찾을 수 없습니다.')
    return row
  }

  private parseKind(raw: string | undefined): PoliticalPartyLinkKind {
    if (!raw || !LINK_KIND_VALUES.has(raw)) throw new BadRequestException(`관계 종류가 올바르지 않습니다: ${raw ?? '(없음)'}`)
    return raw as PoliticalPartyLinkKind
  }

  private parseRole(kind: PoliticalPartyLinkKind, raw: string | undefined): 'subordinate' | 'superior' {
    if (SYMMETRIC_LINK_KINDS.has(kind)) return 'subordinate'
    if (raw !== 'subordinate' && raw !== 'superior') {
      throw new BadRequestException('위성·계파 관계는 어느 쪽이 딸린 쪽인지(role) 정해야 합니다.')
    }
    return raw
  }

  private async assertOther(partyId: string, otherPartyId: string | undefined): Promise<string> {
    if (!otherPartyId || typeof otherPartyId !== 'string') throw new BadRequestException('상대 정당을 고르세요.')
    if (otherPartyId === partyId) throw new BadRequestException('자기 자신과는 관계를 맺을 수 없습니다.')
    const other = await this.prisma.politicalParty.findUnique({ where: { id: otherPartyId }, select: { id: true } })
    if (!other) throw new BadRequestException('상대 정당이 없습니다.')
    return otherPartyId
  }

  /** 비대칭 종류의 반대 방향(“A는 B의 위성” + “B는 A의 위성”)은 모순 */
  private async assertNoContradiction(
    kind: PoliticalPartyLinkKind,
    orientation: { fromPartyId: string; toPartyId: string },
    exceptId: string | null,
  ): Promise<void> {
    if (SYMMETRIC_LINK_KINDS.has(kind)) return
    const reverse = await this.prisma.politicalPartyLink.findFirst({
      where: {
        kind,
        fromPartyId: orientation.toPartyId,
        toPartyId: orientation.fromPartyId,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    })
    if (reverse) throw new ConflictException('반대 방향으로 같은 관계가 이미 있습니다 — 어느 쪽이 딸린 쪽인지 확인하세요.')
  }

  private rethrowDuplicate(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('두 정당 사이에 같은 종류의 관계가 이미 있습니다.')
    }
  }
}
