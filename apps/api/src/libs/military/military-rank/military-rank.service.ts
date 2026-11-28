import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
// eslint-disable-next-line @nx/enforce-module-boundaries
import { PrismaService } from '@prisma/prisma.service'
import {
  Era,
  MilitaryBranch,
  MilitaryRankCategory,
  type Prisma,
} from '@prisma/client'

import {
  type CreateMilitaryRankDto,
  type CreatePersonPromotionDto,
  MILITARY_BRANCH_VALUES,
  MILITARY_RANK_CATEGORIES,
  type MilitaryBranchDto,
  type MilitaryRankCategoryDto,
  type MilitaryRankResponseDto,
  type PersonPromotionResponseDto,
  type UpdateMilitaryRankDto,
} from './military-rank.dto'

const DEFAULT_ORDER_BY_CATEGORY: Record<MilitaryRankCategoryDto, number> = {
  MARSHAL: 100,
  GENERAL: 80,
  FIELD_OFFICER: 45,
  COMPANY_OFFICER: 25,
  WARRANT_OFFICER: 18,
  NCO: 14,
  ENLISTED: 7,
  TRADITIONAL: 75,
}

@Injectable()
export class MilitaryRankService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponseDto(row: any): MilitaryRankResponseDto {
    return {
      id: row.id,
      name: row.name,
      nameLocal: row.nameLocal ?? null,
      nameEn: row.nameEn ?? null,
      abbreviation: row.abbreviation ?? null,
      category: row.category as MilitaryRankCategoryDto,
      rankOrder: row.rankOrder,
      natoCode: row.natoCode ?? null,
      branch: (row.branch as MilitaryBranchDto | null) ?? null,
      countryId: row.countryId ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
      insigniaUrl: row.insigniaUrl ?? null,
      description: row.description ?? null,
      isUniversal: !row.countryId && !row.historicalCountryId,
      country: row.country ?? null,
      historicalCountry: row.historicalCountry ?? null,
    }
  }

  /**
   * 계급 목록 검색 및 국가·시대·군종 맞춤 정렬
   * - includeUniversal !== false 이면 보편 계급(countryId/historicalCountryId = null) + 지정된 국가/역사국가 계급을 함께 반환
   * - 해당 역사국가/국가 전용 계급이 보편 계급보다 우선 노출되며, 같은 그룹 안에서는 서열(rankOrder DESC) 순 정렬
   */
  async list(params?: {
    q?: string
    countryId?: string
    historicalCountryId?: string
    branch?: string
    category?: string
    includeUniversal?: boolean
  }): Promise<MilitaryRankResponseDto[]> {
    const q = params?.q?.trim()
    const cid = params?.countryId?.trim() || null
    const hid = params?.historicalCountryId?.trim() || null
    const includeUniversal = params?.includeUniversal !== false

    const validBranch =
      params?.branch &&
      (MILITARY_BRANCH_VALUES as readonly string[]).includes(params.branch)
        ? (params.branch as MilitaryBranch)
        : null

    const validCategory =
      params?.category &&
      (MILITARY_RANK_CATEGORIES as readonly string[]).includes(params.category)
        ? (params.category as MilitaryRankCategory)
        : null

    const scopeOr: Prisma.MilitaryRankWhereInput[] = []
    if (includeUniversal) {
      scopeOr.push({ countryId: null, historicalCountryId: null })
    }
    if (hid) {
      scopeOr.push({ historicalCountryId: hid })
    }
    if (cid) {
      scopeOr.push({ countryId: cid })
      // 현대국가가 주어졌을 때 연결된 역사국가 계급도 후보에 포함 (단, hid가 명시되지 않은 경우)
      if (!hid && this.prisma.historicalCountryModernCountry?.findMany) {
        const links = await this.prisma.historicalCountryModernCountry.findMany({
          where: { modernCountryId: cid },
          select: { historicalCountryId: true },
        })
        const linkedHids = links.map((l) => l.historicalCountryId).filter(Boolean)
        if (linkedHids.length > 0) {
          scopeOr.push({ historicalCountryId: { in: linkedHids } })
        }
      }
    }

    const andClauses: Prisma.MilitaryRankWhereInput[] = []
    if (cid || hid || !includeUniversal) {
      if (scopeOr.length > 0) {
        andClauses.push({ OR: scopeOr })
      }
    }
    if (validBranch) {
      andClauses.push({
        OR: [{ branch: null }, { branch: validBranch }],
      })
    }
    if (validCategory) {
      andClauses.push({ category: validCategory })
    }
    if (q) {
      andClauses.push({
        OR: [
          { name: { contains: q } },
          { nameLocal: { contains: q } },
          { nameEn: { contains: q } },
          { abbreviation: { contains: q } },
          { natoCode: { contains: q } },
        ],
      })
    }

    const rows = await this.prisma.militaryRank.findMany({
      where: andClauses.length > 0 ? { AND: andClauses } : undefined,
      include: {
        country: { select: { id: true, name: true, flagEmoji: true } },
        historicalCountry: { select: { id: true, name: true } },
      },
      orderBy: [{ rankOrder: 'desc' }, { name: 'asc' }],
    })

    // 지정된 역사국가/국가 전용 계급을 동일 서열 구간에서 우선 배치하되 전체 서열(rankOrder DESC) 골격 유지
    const sorted = [...rows].sort((a, b) => {
      if (b.rankOrder !== a.rankOrder) return b.rankOrder - a.rankOrder
      const aScopeScore =
        hid && a.historicalCountryId === hid
          ? 2
          : cid && a.countryId === cid
            ? 1
            : 0
      const bScopeScore =
        hid && b.historicalCountryId === hid
          ? 2
          : cid && b.countryId === cid
            ? 1
            : 0
      if (bScopeScore !== aScopeScore) return bScopeScore - aScopeScore
      if (validBranch) {
        const aBranchMatch = a.branch === validBranch ? 1 : 0
        const bBranchMatch = b.branch === validBranch ? 1 : 0
        if (bBranchMatch !== aBranchMatch) return bBranchMatch - aBranchMatch
      }
      return a.name.localeCompare(b.name, 'ko')
    })

    return sorted.map((r) => this.toResponseDto(r))
  }

  /**
   * 새 계급 생성 또는 동일 스코프 중복 시 기존 정본 반환 (인라인 빠른 생성 친화적)
   */
  async createOrResolve(dto: CreateMilitaryRankDto): Promise<MilitaryRankResponseDto> {
    const cleanName = dto.name.trim()
    if (!cleanName) {
      throw new BadRequestException('계급명을 입력해 주세요.')
    }
    const cid = dto.countryId?.trim() || null
    const hid = dto.historicalCountryId?.trim() || null
    const branch = (dto.branch as MilitaryBranch | null | undefined) ?? null

    const existing = await this.prisma.militaryRank.findFirst({
      where: {
        name: cleanName,
        countryId: cid,
        historicalCountryId: hid,
        branch,
      },
      include: {
        country: { select: { id: true, name: true, flagEmoji: true } },
        historicalCountry: { select: { id: true, name: true } },
      },
    })
    if (existing) {
      return this.toResponseDto(existing)
    }

    const category: MilitaryRankCategoryDto = dto.category ?? 'GENERAL'
    const rankOrder = dto.rankOrder ?? DEFAULT_ORDER_BY_CATEGORY[category] ?? 50

    const created = await this.prisma.militaryRank.create({
      data: {
        name: cleanName,
        nameLocal: dto.nameLocal?.trim() || null,
        nameEn: dto.nameEn?.trim() || null,
        abbreviation: dto.abbreviation?.trim() || null,
        category: category as MilitaryRankCategory,
        rankOrder,
        natoCode: dto.natoCode?.trim() || null,
        branch,
        countryId: cid,
        historicalCountryId: hid,
        insigniaUrl: dto.insigniaUrl?.trim() || null,
        description: dto.description?.trim() || null,
      },
      include: {
        country: { select: { id: true, name: true, flagEmoji: true } },
        historicalCountry: { select: { id: true, name: true } },
      },
    })
    return this.toResponseDto(created)
  }

  async update(
    id: string,
    dto: UpdateMilitaryRankDto,
  ): Promise<MilitaryRankResponseDto> {
    const existing = await this.prisma.militaryRank.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException(`군 계급을 찾을 수 없습니다: ${id}`)
    }
    const updated = await this.prisma.militaryRank.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.nameLocal !== undefined && {
          nameLocal: dto.nameLocal?.trim() || null,
        }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn?.trim() || null }),
        ...(dto.abbreviation !== undefined && {
          abbreviation: dto.abbreviation?.trim() || null,
        }),
        ...(dto.category !== undefined && {
          category: dto.category as MilitaryRankCategory,
        }),
        ...(dto.rankOrder !== undefined && { rankOrder: dto.rankOrder }),
        ...(dto.natoCode !== undefined && {
          natoCode: dto.natoCode?.trim() || null,
        }),
        ...(dto.branch !== undefined && {
          branch: (dto.branch as MilitaryBranch | null) ?? null,
        }),
        ...(dto.countryId !== undefined && {
          countryId: dto.countryId?.trim() || null,
        }),
        ...(dto.historicalCountryId !== undefined && {
          historicalCountryId: dto.historicalCountryId?.trim() || null,
        }),
        ...(dto.insigniaUrl !== undefined && {
          insigniaUrl: dto.insigniaUrl?.trim() || null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
      },
      include: {
        country: { select: { id: true, name: true, flagEmoji: true } },
        historicalCountry: { select: { id: true, name: true } },
      },
    })
    return this.toResponseDto(updated)
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.militaryRank.findUnique({
      where: { id },
      include: {
        _count: { select: { tenures: true, promotions: true } },
      },
    })
    if (!existing) {
      throw new NotFoundException(`군 계급을 찾을 수 없습니다: ${id}`)
    }
    if (existing._count.tenures > 0 || existing._count.promotions > 0) {
      throw new ConflictException(
        `이 계급을 참조하는 보직(${existing._count.tenures}건) 또는 진급 이력(${existing._count.promotions}건)이 있어 삭제할 수 없습니다.`,
      )
    }
    await this.prisma.militaryRank.delete({ where: { id } })
  }

  // ─── 인물 진급 이력 (PersonPromotion) ────────────────────────────────────

  async listPromotionsByPerson(
    personId: string,
  ): Promise<PersonPromotionResponseDto[]> {
    const rows = await this.prisma.personPromotion.findMany({
      where: { personId },
      include: {
        militaryRank: {
          include: {
            country: { select: { id: true, name: true, flagEmoji: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }, { day: 'asc' }],
    })
    return rows.map((row) => ({
      id: row.id,
      personId: row.personId,
      militaryRankId: row.militaryRankId,
      countryId: row.countryId ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
      branch: (row.branch as MilitaryBranchDto | null) ?? null,
      era: (row.era as 'BC' | 'AD' | null) ?? null,
      year: row.year ?? null,
      month: row.month ?? null,
      day: row.day ?? null,
      precision: row.precision ?? null,
      isPosthumous: row.isPosthumous,
      isBrevet: row.isBrevet,
      note: row.note ?? null,
      militaryRank: this.toResponseDto(row.militaryRank),
    }))
  }

  async addPromotion(
    dto: CreatePersonPromotionDto,
  ): Promise<PersonPromotionResponseDto> {
    const precision =
      dto.year == null
        ? null
        : dto.month == null
          ? 'year'
          : dto.day == null
            ? 'month'
            : 'day'

    const created = await this.prisma.personPromotion.create({
      data: {
        personId: dto.personId,
        militaryRankId: dto.militaryRankId,
        countryId: dto.countryId?.trim() || null,
        historicalCountryId: dto.historicalCountryId?.trim() || null,
        branch: (dto.branch as MilitaryBranch | null | undefined) ?? null,
        era: dto.year != null ? ((dto.era ?? 'AD') as Era) : null,
        year: dto.year ?? null,
        month: dto.month ?? null,
        day: dto.day ?? null,
        precision,
        isPosthumous: Boolean(dto.isPosthumous),
        isBrevet: Boolean(dto.isBrevet),
        note: dto.note?.trim() || null,
      },
      include: {
        militaryRank: {
          include: {
            country: { select: { id: true, name: true, flagEmoji: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
        },
      },
    })
    return {
      id: created.id,
      personId: created.personId,
      militaryRankId: created.militaryRankId,
      countryId: created.countryId ?? null,
      historicalCountryId: created.historicalCountryId ?? null,
      branch: (created.branch as MilitaryBranchDto | null) ?? null,
      era: (created.era as 'BC' | 'AD' | null) ?? null,
      year: created.year ?? null,
      month: created.month ?? null,
      day: created.day ?? null,
      precision: created.precision ?? null,
      isPosthumous: created.isPosthumous,
      isBrevet: created.isBrevet,
      note: created.note ?? null,
      militaryRank: this.toResponseDto(created.militaryRank),
    }
  }

  async deletePromotion(id: string): Promise<void> {
    await this.prisma.personPromotion.delete({ where: { id } })
  }
}
