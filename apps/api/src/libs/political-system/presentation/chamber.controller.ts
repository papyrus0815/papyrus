/**
 * 의회의 원(院) 카탈로그 — B7, docs/political-party-model-review.md.
 *
 * 정체(PoliticalSystem)·선거·정당 의석 측정값이 가리키는 정본. 정당·이념처럼 공유 정본이라 계정 소유가 없다.
 * 정원은 원에 붙은 이력(ChamberSize) — 선거법이 바뀔 때마다 한 줄.
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
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { ChamberComposition, ChamberRole, Prisma } from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'

import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'
import {
  type StructuredDateInput,
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  readStructuredDate,
  structuredDateData,
} from '../../election/domain/party-structured-date.util'

const ROLE_VALUES = new Set<string>(Object.values(ChamberRole))
const COMPOSITION_VALUES = new Set<string>(Object.values(ChamberComposition))

export interface ChamberBody {
  name: string
  localName?: string | null
  shortName?: string | null
  role: string
  composition?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  predecessorId?: string | null
  note?: string | null
  sortOrder?: number
}

export type UpdateChamberBody = Partial<ChamberBody>

export interface ChamberSizeBody {
  seats: number
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

export type UpdateChamberSizeBody = Partial<ChamberSizeBody>

const chamberInclude = {
  sizes: { orderBy: [{ startYear: 'asc' as const }, { sortOrder: 'asc' as const }] },
  predecessor: { select: { id: true, name: true, localName: true } },
  successors: { select: { id: true, name: true, localName: true } },
  country: { select: { id: true, name: true } },
  historicalCountry: { select: { id: true, name: true } },
  _count: {
    select: {
      elections: true,
      observations: true,
      tenures: true,
      passedLaws: true,
      ratifiedTreatySignatories: true,
      systemsAsLower: true,
      systemsAsUpper: true,
      systemsAsWarConsent: true,
      approvedWarDeclarations: true,
    },
  },
} satisfies Prisma.ChamberInclude

@ApiTags('chambers')
@Controller('chambers')
@UseGuards(AuthGuard('jwt'))
export class ChamberController {
  constructor(private readonly prisma: PrismaService) {}

  /** 국가의 원 — 현대 국가는 연결된 역사 국가의 원까지(정당 목록과 같은 브리지 스코프) */
  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('query') query?: string,
  ): Promise<any> {
    let where: Prisma.ChamberWhereInput = {}
    if (historicalCountryId) where = { historicalCountryId }
    else if (countryId) where = (await resolveCountryScopeOr(this.prisma, countryId)) as Prisma.ChamberWhereInput
    const term = query?.trim()
    const rows = await this.prisma.chamber.findMany({
      where: {
        AND: [
          where,
          term ? { OR: [{ name: { contains: term } }, { localName: { contains: term } }, { shortName: { contains: term } }] } : {},
        ],
      },
      include: chamberInclude,
      orderBy: [{ startYear: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      take: term ? 40 : undefined,
    })
    return rows
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<any> {
    const row = await this.prisma.chamber.findUnique({ where: { id }, include: chamberInclude })
    if (!row) throw new NotFoundException('원을 찾을 수 없습니다.')
    return row
  }

  @Post()
  async create(@Body() body: ChamberBody): Promise<any> {
    const name = this.parseName(body.name)
    if (!body.countryId && !body.historicalCountryId) throw new BadRequestException('국가(현대 또는 역사)를 정하세요.')
    const start = parseStructuredDateInput(body.start, '시작')
    const end = parseStructuredDateInput(body.end, '끝')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    if (body.predecessorId) await this.assertChamber(body.predecessorId)
    const resolvedCountryId = await this.resolveDualFillCountryId(body.countryId, body.historicalCountryId)
    return this.prisma.chamber.create({
      data: {
        name,
        localName: body.localName?.trim() || null,
        shortName: body.shortName?.trim() || null,
        role: this.parseRole(body.role),
        composition: this.parseComposition(body.composition),
        countryId: resolvedCountryId,
        historicalCountryId: body.historicalCountryId || null,
        ...structuredDateData('start', start),
        ...structuredDateData('end', end),
        predecessorId: body.predecessorId || null,
        note: body.note?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      },
      include: chamberInclude,
    })
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateChamberBody): Promise<any> {
    const existing = await this.prisma.chamber.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('원을 찾을 수 없습니다.')
    const data: Prisma.ChamberUncheckedUpdateInput = {}
    if (body.name !== undefined) data.name = this.parseName(body.name)
    if (body.localName !== undefined) data.localName = body.localName?.trim() || null
    if (body.shortName !== undefined) data.shortName = body.shortName?.trim() || null
    if (body.role !== undefined) data.role = this.parseRole(body.role)
    if (body.composition !== undefined) data.composition = this.parseComposition(body.composition)
    if (body.countryId !== undefined) data.countryId = body.countryId || null
    if (body.historicalCountryId !== undefined) data.historicalCountryId = body.historicalCountryId || null
    const nextCountry = body.countryId !== undefined ? body.countryId : existing.countryId
    const nextHistorical = body.historicalCountryId !== undefined ? body.historicalCountryId : existing.historicalCountryId
    if (!nextCountry && !nextHistorical) throw new BadRequestException('국가(현대 또는 역사)를 정하세요.')
    if (body.historicalCountryId !== undefined && body.countryId === undefined && nextHistorical) {
      data.countryId = await this.resolveDualFillCountryId(existing.countryId, nextHistorical)
    }
    const start = body.start !== undefined ? parseStructuredDateInput(body.start, '시작') : readStructuredDate(existing, 'start')
    const end = body.end !== undefined ? parseStructuredDateInput(body.end, '끝') : readStructuredDate(existing, 'end')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    if (body.start !== undefined) Object.assign(data, structuredDateData('start', start))
    if (body.end !== undefined) Object.assign(data, structuredDateData('end', end))
    if (body.predecessorId !== undefined) {
      if (body.predecessorId) await this.assertNoLineageCycle(id, body.predecessorId)
      data.predecessorId = body.predecessorId || null
    }
    if (body.note !== undefined) data.note = body.note?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

    const updated = await this.prisma.chamber.update({ where: { id }, data, include: chamberInclude })

    /* 원 이름·원어가 바뀌면 이 원을 참조하는 정체(PoliticalSystem)의 표시 캐시도 함께 갱신한다 */
    if (
      (body.name !== undefined || body.localName !== undefined) &&
      this.prisma.politicalSystem?.updateMany
    ) {
      const cachedLabel = updated.localName ? `${updated.name}(${updated.localName})` : updated.name
      await Promise.all([
        this.prisma.politicalSystem.updateMany({
          where: { lowerChamberId: id },
          data: { lowerHouseName: cachedLabel },
        }),
        this.prisma.politicalSystem.updateMany({
          where: { upperChamberId: id },
          data: { upperHouseName: cachedLabel },
        }),
      ])
    }

    return updated
  }

  /** 지우면 선거·정체·의석 측정값의 원 연결은 비워진다(FK SetNull) — 화면이 그 수를 먼저 알린다 */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.assertChamber(id)
    await this.prisma.chamber.delete({ where: { id } })
  }

  // ── 정원 이력 ──

  @Post(':id/sizes')
  async createSize(@Param('id') chamberId: string, @Body() body: ChamberSizeBody): Promise<any> {
    await this.assertChamber(chamberId)
    const seats = this.parseSeats(body.seats)
    const start = parseStructuredDateInput(body.start, '시작')
    const end = parseStructuredDateInput(body.end, '끝')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    return this.prisma.chamberSize.create({
      data: {
        chamberId,
        seats,
        ...structuredDateData('start', start),
        ...structuredDateData('end', end),
        note: body.note?.trim() || null,
      },
    })
  }

  @Patch(':id/sizes/:sizeId')
  async updateSize(
    @Param('id') chamberId: string,
    @Param('sizeId') sizeId: string,
    @Body() body: UpdateChamberSizeBody,
  ): Promise<any> {
    const existing = await this.prisma.chamberSize.findFirst({ where: { id: sizeId, chamberId } })
    if (!existing) throw new NotFoundException('정원 이력을 찾을 수 없습니다.')
    const data: Prisma.ChamberSizeUncheckedUpdateInput = {}
    if (body.seats !== undefined) data.seats = this.parseSeats(body.seats)
    const start = body.start !== undefined ? parseStructuredDateInput(body.start, '시작') : readStructuredDate(existing, 'start')
    const end = body.end !== undefined ? parseStructuredDateInput(body.end, '끝') : readStructuredDate(existing, 'end')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    if (body.start !== undefined) Object.assign(data, structuredDateData('start', start))
    if (body.end !== undefined) Object.assign(data, structuredDateData('end', end))
    if (body.note !== undefined) data.note = body.note?.trim() || null
    return this.prisma.chamberSize.update({ where: { id: sizeId }, data })
  }

  @Delete(':id/sizes/:sizeId')
  async removeSize(@Param('id') chamberId: string, @Param('sizeId') sizeId: string): Promise<void> {
    const existing = await this.prisma.chamberSize.findFirst({ where: { id: sizeId, chamberId }, select: { id: true } })
    if (!existing) throw new NotFoundException('정원 이력을 찾을 수 없습니다.')
    await this.prisma.chamberSize.delete({ where: { id: sizeId } })
  }

  // ── 내부 ──

  private parseName(raw: string | undefined): string {
    const name = raw?.trim() ?? ''
    if (!name) throw new BadRequestException('원 이름을 입력하세요.')
    if (name.length > 150) throw new BadRequestException('원 이름은 150자 이하여야 합니다.')
    return name
  }

  private parseRole(raw: string | undefined): ChamberRole {
    if (!raw || !ROLE_VALUES.has(raw)) throw new BadRequestException(`원의 자리가 올바르지 않습니다: ${raw ?? '(없음)'}`)
    return raw as ChamberRole
  }

  private parseComposition(raw: string | null | undefined): ChamberComposition | null {
    if (raw == null || raw === '') return null
    if (!COMPOSITION_VALUES.has(raw)) throw new BadRequestException(`구성 방식이 올바르지 않습니다: ${raw}`)
    return raw as ChamberComposition
  }

  private parseSeats(raw: unknown): number {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 100000) {
      throw new BadRequestException('정원은 1 이상의 정수입니다.')
    }
    return raw
  }

  private async assertChamber(id: string): Promise<void> {
    const row = await this.prisma.chamber.findUnique({ where: { id }, select: { id: true } })
    if (!row) throw new NotFoundException('원을 찾을 수 없습니다.')
  }

  private async resolveDualFillCountryId(
    countryId: string | null | undefined,
    historicalCountryId: string | null | undefined,
  ): Promise<string | null> {
    const cid = countryId?.trim() || null
    const hid = historicalCountryId?.trim() || null
    if (cid) return cid
    if (!hid || !this.prisma.historicalCountryModernCountry?.findMany) return null
    const links = await this.prisma.historicalCountryModernCountry.findMany({
      where: { historicalCountryId: hid },
      select: { modernCountryId: true },
      take: 2,
    })
    return links.length === 1 ? links[0].modernCountryId : null
  }

  /** 계보 순환 — 자기 자신이나 자기의 후신을 전신으로 삼지 않게 */
  private async assertNoLineageCycle(id: string, predecessorId: string): Promise<void> {
    if (id === predecessorId) throw new BadRequestException('자기 자신을 전신으로 삼을 수 없습니다.')
    await this.assertChamber(predecessorId)
    let cursor: string | null = predecessorId
    const seen = new Set<string>()
    while (cursor && !seen.has(cursor)) {
      if (cursor === id) throw new BadRequestException('원의 계보에 순환이 생깁니다.')
      seen.add(cursor)
      const row: { predecessorId: string | null } | null = await this.prisma.chamber.findUnique({
        where: { id: cursor },
        select: { predecessorId: true },
      })
      cursor = row?.predecessorId ?? null
    }
  }
}
