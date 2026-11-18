import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  OrganizationCountryRole,
  OrganizationType,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import type {
  IOrganizationRepository,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationEntity,
  OrganizationListFilter,
  CreateOrganizationHierarchyData,
  OrganizationHierarchyEntity,
  OrganizationTreeNode,
  OrganizationMemberEntity,
  AddOrganizationMemberData,
  OrganizationCountryMembershipEntity,
  CountryOrganizationMembershipEntity,
  OrganizationMembershipStatusPhase,
  UpsertOrganizationCountryMembershipData,
  UpdateOrganizationCountryMembershipData,
  OrganizationRelatedEventEntity,
} from '../domain/organization.repository'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'
import { formatEventDate } from '../../event/domain/event-date'
import {
  formatSeriesEditionBadge,
  signedYearOfEdition,
} from '../../event/domain/event-series-forecast'

/** 응답에 연결 국가/역사국가·본부 도시·전신/후신 기구 요약 및 집계를 실어주는 공용 include */
const COUNTRY_SUMMARY_INCLUDE = {
  country: { select: { id: true, name: true, flagEmoji: true } },
  historicalCountry: { select: { id: true, name: true } },
  headquartersCity: { select: { id: true, name: true } },
  predecessor: { select: { id: true, name: true, shortName: true } },
  successors: {
    select: { id: true, name: true, shortName: true },
    orderBy: [{ foundedDate: 'asc' }, { name: 'asc' }],
  },
  _count: { select: { memberships: true, eventSeries: true } },
} satisfies Prisma.OrganizationInclude

const COUNTRY_MEMBERSHIP_INCLUDE = {
  country: { select: { id: true, name: true, flagEmoji: true } },
  historicalCountry: { select: { id: true, name: true } },
} satisfies Prisma.OrganizationCountryMembershipInclude

interface StructuredPartialDate {
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  day: number | null
  date: Date | null
}

function normalizeStructuredDate(
  era: 'BC' | 'AD' | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  label: string,
): StructuredPartialDate {
  if (year == null) {
    return { era: null, year: null, month: null, day: null, date: null }
  }
  if (!Number.isInteger(year) || year < 1 || year > 99999) {
    throw new BadRequestException(`유효하지 않은 ${label} 연도입니다.`)
  }
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
    throw new BadRequestException(`유효하지 않은 ${label} 월입니다.`)
  }
  if (day != null && (!Number.isInteger(day) || day < 1 || day > 31)) {
    throw new BadRequestException(`유효하지 않은 ${label} 일입니다.`)
  }
  const normalizedEra: 'BC' | 'AD' = era === 'BC' ? 'BC' : 'AD'
  const normalizedMonth = month ?? null
  const normalizedDay = normalizedMonth != null ? (day ?? null) : null
  const date =
    normalizedEra === 'AD' && year >= 1000 && year <= 9999
      ? new Date(
          Date.UTC(year, (normalizedMonth ?? 1) - 1, normalizedDay ?? 1),
        )
      : null
  return {
    era: normalizedEra,
    year,
    month: normalizedMonth,
    day: normalizedDay,
    date,
  }
}

function structuredChronoKey(d: StructuredPartialDate, isEnd: boolean): number | null {
  if (d.year == null) return null
  const sy = d.era === 'BC' ? -d.year : d.year
  const m = d.month ?? (isEnd ? 12 : 1)
  const day = d.day ?? (isEnd ? 31 : 1)
  return sy * 10000 + m * 100 + day
}

const VALID_ORG_COUNTRY_ROLES = new Set<string>(
  Object.values(OrganizationCountryRole),
)

function normalizeStatusHistory(
  raw: unknown,
): OrganizationMembershipStatusPhase[] | null {
  if (!Array.isArray(raw)) return null
  const phases: OrganizationMembershipStatusPhase[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    const role =
      typeof obj.role === 'string' && VALID_ORG_COUNTRY_ROLES.has(obj.role)
        ? (obj.role as OrganizationCountryRole)
        : null
    if (!role) continue
    const startYear =
      typeof obj.startYear === 'number' &&
      Number.isInteger(obj.startYear) &&
      obj.startYear >= 1 &&
      obj.startYear <= 9999
        ? obj.startYear
        : null
    const endYear =
      typeof obj.endYear === 'number' &&
      Number.isInteger(obj.endYear) &&
      obj.endYear >= 1 &&
      obj.endYear <= 9999
        ? obj.endYear
        : null
    const startEra: 'BC' | 'AD' | null =
      startYear != null ? (obj.startEra === 'BC' ? 'BC' : 'AD') : null
    const endEra: 'BC' | 'AD' | null =
      endYear != null ? (obj.endEra === 'BC' ? 'BC' : 'AD') : null
    if (startYear != null && endYear != null) {
      const sy = startEra === 'BC' ? -startYear : startYear
      const ey = endEra === 'BC' ? -endYear : endYear
      if (sy > ey) {
        throw new BadRequestException(
          '지위 변천 이력의 종료 연도가 시작 연도보다 앞설 수 없습니다.',
        )
      }
    }
    const notes =
      typeof obj.notes === 'string' && obj.notes.trim()
        ? obj.notes.trim()
        : null
    phases.push({
      role,
      startEra,
      startYear,
      endEra,
      endYear,
      notes,
    })
  }
  return phases.length > 0 ? phases : null
}

@Injectable()
export class OrganizationPrismaRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private assertValidDateOrder(
    start: Date | null | undefined,
    end: Date | null | undefined,
    startLabel: string,
    endLabel: string,
  ): void {
    if (start && Number.isNaN(start.getTime())) {
      throw new BadRequestException(`유효하지 않은 ${startLabel} 날짜입니다.`)
    }
    if (end && Number.isNaN(end.getTime())) {
      throw new BadRequestException(`유효하지 않은 ${endLabel} 날짜입니다.`)
    }
    if (start && end && start.getTime() > end.getTime()) {
      throw new BadRequestException(
        `${endLabel}이 ${startLabel}보다 앞설 수 없습니다.`,
      )
    }
  }

  private assertStructuredDateOrder(
    start: StructuredPartialDate,
    end: StructuredPartialDate,
  ): void {
    const sk = structuredChronoKey(start, false)
    const ek = structuredChronoKey(end, true)
    if (sk != null && ek != null && sk > ek) {
      throw new BadRequestException('탈퇴·종료 시점이 가입·시작 시점보다 앞설 수 없습니다.')
    }
  }

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

  private async resolvePredecessorOrganizationId(
    selfId: string | null,
    rawPredecessorId: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (rawPredecessorId === undefined) return undefined
    const predId = rawPredecessorId?.trim() || null
    if (!predId) return null
    if (selfId && predId === selfId) {
      throw new BadRequestException('자기 자신을 전신 기구로 지정할 수 없습니다.')
    }
    if (!this.prisma.organization?.findUnique) return predId

    const pred = await this.prisma.organization.findUnique({
      where: { id: predId },
      select: { id: true, predecessorOrganizationId: true },
    })
    if (!pred) {
      throw new NotFoundException('전신 기구(predecessorOrganizationId)를 찾을 수 없습니다.')
    }

    if (selfId) {
      let cursor = pred.predecessorOrganizationId
      const visited = new Set<string>([pred.id])
      while (cursor) {
        if (cursor === selfId) {
          throw new BadRequestException(
            '전신·후신 기구 계보가 순환(Cycle)할 수 없습니다.',
          )
        }
        if (visited.has(cursor)) break
        visited.add(cursor)
        const anc = await this.prisma.organization.findUnique({
          where: { id: cursor },
          select: { predecessorOrganizationId: true },
        })
        cursor = anc?.predecessorOrganizationId ?? null
      }
    }
    return predId
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    const row = await this.prisma.organization.findUnique({
      where: { id },
      include: COUNTRY_SUMMARY_INCLUDE,
    })
    return row ? this.toEntity(row) : null
  }

  async findMany(filter: OrganizationListFilter): Promise<OrganizationEntity[]> {
    // 현대 국가 필터는 브리지로 연결된 역사국가 소속까지 OR 확장(검토서 F14 —
    // person·election·party와 같은 소속 정의를 공유해 대시보드 숫자 정합).
    // 역사국가 단독 필터는 정확 일치.
    const excludedTypes: OrganizationType[] = []
    if (filter.excludeCompanies) excludedTypes.push('COMPANY')
    if (filter.excludePoliticalParties) excludedTypes.push('POLITICAL_PARTY')
    if (filter.excludeGovernmentAgencies) excludedTypes.push('GOVERNMENT_AGENCY')

    const where: Prisma.OrganizationWhereInput = {
      ...(filter.countryId != null
        ? await resolveCountryScopeOr(this.prisma, filter.countryId)
        : filter.historicalCountryId != null
          ? { historicalCountryId: filter.historicalCountryId }
          : {}),
      ...(filter.types && filter.types.length > 0
        ? { type: { in: filter.types } }
        : filter.type != null
          ? { type: filter.type }
          : excludedTypes.length > 0
            ? { type: { notIn: excludedTypes } }
            : {}),
      ...(filter.scope != null && { scope: filter.scope }),
    }
    const rows = await this.prisma.organization.findMany({
      where,
      include: COUNTRY_SUMMARY_INCLUDE,
      orderBy: { name: 'asc' },
    })
    return rows.map((r) => this.toEntity(r))
  }

  async create(data: CreateOrganizationData): Promise<OrganizationEntity> {
    if (data.type === 'COMPANY') {
      throw new BadRequestException(
        '기업(COMPANY)은 기구·조직이 아닌 전용 기업 관리(/companies)를 통해 등록해 주세요.',
      )
    }
    if (data.type === 'POLITICAL_PARTY') {
      throw new BadRequestException(
        '정당(POLITICAL_PARTY)은 전용 정당 관리(/political-parties)를 통해 등록해 주세요.',
      )
    }
    if (data.type === 'GOVERNMENT_AGENCY') {
      throw new BadRequestException(
        '국가 행정기관·부처(GOVERNMENT_AGENCY)는 전용 정부·기관 관리(/government?tab=departments)를 통해 등록해 주세요.',
      )
    }
    this.assertValidDateOrder(
      data.foundedDate,
      data.dissolvedDate,
      '조직 설립일',
      '조직 해산일',
    )
    const axis = await this.resolveCountryAxis(
      data.countryId,
      data.historicalCountryId,
    )
    if (data.headquartersCityId && this.prisma.city?.findUnique) {
      const city = await this.prisma.city.findUnique({
        where: { id: data.headquartersCityId },
        select: { id: true },
      })
      if (!city) {
        throw new NotFoundException(
          '본부 소재 도시(headquartersCityId)를 찾을 수 없습니다.',
        )
      }
    }

    const predecessorId = await this.resolvePredecessorOrganizationId(
      null,
      data.predecessorOrganizationId,
    )

    const row = await this.prisma.organization.create({
      data: {
        name: data.name,
        shortName: data.shortName,
        localName: data.localName,
        type: data.type,
        scope: data.scope,
        description: data.description,
        foundedDate: data.foundedDate,
        dissolvedDate: data.dissolvedDate,
        websiteUrl: data.websiteUrl,
        logoUrl: data.logoUrl,
        ideology: data.ideology,
        headquartersCityId: data.headquartersCityId,
        ...(predecessorId !== undefined
          ? { predecessorOrganizationId: predecessorId }
          : {}),
        countryId: axis.countryId,
        historicalCountryId: axis.historicalCountryId,
      },
      include: COUNTRY_SUMMARY_INCLUDE,
    })
    return this.toEntity(row)
  }

  async update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<OrganizationEntity> {
    if (data.type === 'COMPANY') {
      throw new BadRequestException(
        '기업(COMPANY) 유형으로는 변경할 수 없습니다. 전용 기업 관리(/companies)를 이용해 주세요.',
      )
    }
    if (data.type === 'POLITICAL_PARTY') {
      throw new BadRequestException(
        '정당(POLITICAL_PARTY) 유형으로는 변경할 수 없습니다. 전용 정당 관리(/political-parties)를 이용해 주세요.',
      )
    }
    if (data.type === 'GOVERNMENT_AGENCY') {
      throw new BadRequestException(
        '국가 행정기관·부처(GOVERNMENT_AGENCY) 유형으로는 변경할 수 없습니다. 전용 정부·기관 관리(/government?tab=departments)를 이용해 주세요.',
      )
    }
    let existing: {
      id: string
      foundedDate: Date | null
      dissolvedDate: Date | null
      countryId: string | null
      historicalCountryId: string | null
    } | null = null
    if (this.prisma.organization?.findUnique) {
      existing = await this.prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          foundedDate: true,
          dissolvedDate: true,
          countryId: true,
          historicalCountryId: true,
        },
      })
      if (!existing) {
        throw new NotFoundException(`조직을 찾을 수 없습니다 (ID: ${id})`)
      }
    }

    const effectiveFounded =
      data.foundedDate !== undefined
        ? data.foundedDate
        : (existing?.foundedDate ?? null)
    const effectiveDissolved =
      data.dissolvedDate !== undefined
        ? data.dissolvedDate
        : (existing?.dissolvedDate ?? null)
    this.assertValidDateOrder(
      effectiveFounded,
      effectiveDissolved,
      '조직 설립일',
      '조직 해산일',
    )

    let resolvedCountryId = data.countryId
    let resolvedHistoricalCountryId = data.historicalCountryId
    if (data.countryId !== undefined || data.historicalCountryId !== undefined) {
      const nextCid =
        data.countryId !== undefined
          ? data.countryId
          : (existing?.countryId ?? null)
      const nextHid =
        data.historicalCountryId !== undefined
          ? data.historicalCountryId
          : (existing?.historicalCountryId ?? null)
      const axis = await this.resolveCountryAxis(nextCid, nextHid)
      resolvedCountryId = axis.countryId
      resolvedHistoricalCountryId = axis.historicalCountryId
    }

    if (data.headquartersCityId && this.prisma.city?.findUnique) {
      const city = await this.prisma.city.findUnique({
        where: { id: data.headquartersCityId },
        select: { id: true },
      })
      if (!city) {
        throw new NotFoundException(
          '본부 소재 도시(headquartersCityId)를 찾을 수 없습니다.',
        )
      }
    }

    const predecessorId = await this.resolvePredecessorOrganizationId(
      id,
      data.predecessorOrganizationId,
    )

    const row = await this.prisma.organization.update({
      where: { id },
      data: {
        name: data.name,
        shortName: data.shortName,
        localName: data.localName,
        type: data.type,
        scope: data.scope,
        description: data.description,
        foundedDate: data.foundedDate,
        dissolvedDate: data.dissolvedDate,
        websiteUrl: data.websiteUrl,
        logoUrl: data.logoUrl,
        ideology: data.ideology,
        headquartersCityId: data.headquartersCityId,
        ...(predecessorId !== undefined
          ? { predecessorOrganizationId: predecessorId }
          : {}),
        countryId: resolvedCountryId,
        historicalCountryId: resolvedHistoricalCountryId,
      },
      include: COUNTRY_SUMMARY_INCLUDE,
    })
    return this.toEntity(row)
  }

  async delete(id: string): Promise<void> {
    if (this.prisma.organization?.findUnique) {
      const existing = await this.prisma.organization.findUnique({
        where: { id },
        select: { id: true, name: true },
      })
      if (!existing) {
        throw new NotFoundException(`조직을 찾을 수 없습니다 (ID: ${id})`)
      }
    }

    const [posDefCount, companyCount, eventRelCount, eventSeriesCount] =
      await Promise.all([
        this.prisma.governmentPositionDefinition?.count
          ? this.prisma.governmentPositionDefinition.count({
              where: { organizationId: id },
            })
          : Promise.resolve(0),
        this.prisma.company?.count
          ? this.prisma.company.count({
              where: { organizationId: id },
            })
          : Promise.resolve(0),
        this.prisma.eventOrganizationRelation?.count
          ? this.prisma.eventOrganizationRelation.count({
              where: { organizationId: id },
            })
          : Promise.resolve(0),
        this.prisma.eventSeries?.count
          ? this.prisma.eventSeries.count({
              where: { organizationId: id },
            })
          : Promise.resolve(0),
      ])
    const refs: string[] = []
    if (posDefCount > 0) refs.push(`관직 정의 ${posDefCount}건`)
    if (companyCount > 0) refs.push(`기업 ${companyCount}건`)
    if (eventRelCount > 0) refs.push(`사건 조직 관계 ${eventRelCount}건`)
    if (eventSeriesCount > 0) refs.push(`정기 회의·행사 시리즈 ${eventSeriesCount}건`)
    if (refs.length > 0) {
      throw new ConflictException(
        `이 조직을 참조 중인 기록(${refs.join(', ')})이 있어 삭제할 수 없습니다.`,
      )
    }

    await this.prisma.organization.delete({ where: { id } })
  }

  async addHierarchy(
    data: CreateOrganizationHierarchyData,
  ): Promise<OrganizationHierarchyEntity> {
    if (data.parentOrganizationId === data.childOrganizationId) {
      throw new BadRequestException(
        '자기 자신을 상위 또는 하위 조직으로 연결할 수 없습니다.',
      )
    }
    this.assertValidDateOrder(
      data.startDate,
      data.endDate,
      '계층 관계 시작일',
      '계층 관계 종료일',
    )

    if (this.prisma.organization?.findUnique) {
      const [parentOrg, childOrg] = await Promise.all([
        this.prisma.organization.findUnique({
          where: { id: data.parentOrganizationId },
          select: { id: true },
        }),
        this.prisma.organization.findUnique({
          where: { id: data.childOrganizationId },
          select: { id: true },
        }),
      ])
      if (!parentOrg) {
        throw new NotFoundException(
          '상위 조직(parentOrganizationId)을 찾을 수 없습니다.',
        )
      }
      if (!childOrg) {
        throw new NotFoundException(
          '하위 조직(childOrganizationId)을 찾을 수 없습니다.',
        )
      }
    }

    if (this.prisma.organizationHierarchy?.findFirst) {
      const dup = await this.prisma.organizationHierarchy.findFirst({
        where: {
          parentOrganizationId: data.parentOrganizationId,
          childOrganizationId: data.childOrganizationId,
        },
        select: { id: true },
      })
      if (dup) {
        throw new ConflictException(
          '이미 동일한 상하위 조직 관계가 등록되어 있습니다.',
        )
      }
    }

    if (this.prisma.organizationHierarchy?.findMany) {
      const queue = [data.parentOrganizationId]
      const visited = new Set<string>()
      while (queue.length > 0) {
        const curr = queue.shift()!
        if (curr === data.childOrganizationId) {
          throw new BadRequestException(
            '상하위 조직 계층 관계가 순환(Cycle)합니다.',
          )
        }
        if (visited.has(curr)) continue
        visited.add(curr)
        const parentEdges =
          await this.prisma.organizationHierarchy.findMany({
            where: { childOrganizationId: curr },
            select: { parentOrganizationId: true },
          })
        for (const edge of parentEdges) {
          if (!visited.has(edge.parentOrganizationId)) {
            queue.push(edge.parentOrganizationId)
          }
        }
      }
    }

    const row = await this.prisma.organizationHierarchy.create({
      data: {
        parentOrganizationId: data.parentOrganizationId,
        childOrganizationId: data.childOrganizationId,
        relationType: data.relationType,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes,
      },
    })
    return {
      id: row.id,
      parentOrganizationId: row.parentOrganizationId,
      childOrganizationId: row.childOrganizationId,
      relationType: row.relationType,
      startDate: row.startDate,
      endDate: row.endDate,
      notes: row.notes,
    }
  }

  async removeHierarchy(parentId: string, childId: string): Promise<void> {
    await this.prisma.organizationHierarchy.deleteMany({
      where: {
        parentOrganizationId: parentId,
        childOrganizationId: childId,
      },
    })
  }

  async findChildren(
    organizationId: string,
  ): Promise<OrganizationHierarchyEntity[]> {
    const rows = await this.prisma.organizationHierarchy.findMany({
      where: { parentOrganizationId: organizationId },
    })
    return rows.map((r) => ({
      id: r.id,
      parentOrganizationId: r.parentOrganizationId,
      childOrganizationId: r.childOrganizationId,
      relationType: r.relationType,
      startDate: r.startDate,
      endDate: r.endDate,
      notes: r.notes,
    }))
  }

  async findParents(
    organizationId: string,
  ): Promise<OrganizationHierarchyEntity[]> {
    const rows = await this.prisma.organizationHierarchy.findMany({
      where: { childOrganizationId: organizationId },
    })
    return rows.map((r) => ({
      id: r.id,
      parentOrganizationId: r.parentOrganizationId,
      childOrganizationId: r.childOrganizationId,
      relationType: r.relationType,
      startDate: r.startDate,
      endDate: r.endDate,
      notes: r.notes,
    }))
  }

  async findTree(filter: OrganizationListFilter): Promise<OrganizationTreeNode[]> {
    const list = await this.findMany(filter)
    const edges = await this.prisma.organizationHierarchy.findMany({
      where: {
        parent: {
          id: { in: list.map((o) => o.id) },
        },
        child: {
          id: { in: list.map((o) => o.id) },
        },
      },
    })
    const childToParents = new Map<string, string[]>()
    for (const e of edges) {
      const parents = childToParents.get(e.childOrganizationId) ?? []
      parents.push(e.parentOrganizationId)
      childToParents.set(e.childOrganizationId, parents)
    }
    const roots = list.filter((o) => !childToParents.has(o.id))
    const buildNode = (
      org: OrganizationEntity,
      parentIds: string[],
    ): OrganizationTreeNode => {
      const childrenEdges = edges.filter(
        (e) => e.parentOrganizationId === org.id,
      )
      const children = childrenEdges
        .map((e) => list.find((o) => o.id === e.childOrganizationId))
        .filter(
          (o): o is OrganizationEntity =>
            o != null && !parentIds.includes(o.id) && o.id !== org.id,
        )
        .map((o) => buildNode(o, [...parentIds, org.id]))
      return {
        ...org,
        children,
        parentIds,
      }
    }
    return roots.map((r) => buildNode(r, []))
  }

  async findMembers(organizationId: string): Promise<OrganizationMemberEntity[]> {
    const personSelect = {
      id: true,
      name: true,
      surname: true,
      originalName: true,
      profileImageUrl: true,
    } as const

    const [tenures, roles] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: { positionDefinition: { organizationId } },
        select: {
          id: true,
          personId: true,
          title: true,
          positionDefinition: { select: { title: true } },
          person: { select: personSelect },
        },
        orderBy: [{ startKey: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.organizationPersonRole.findMany({
        where: { organizationId },
        select: {
          id: true,
          personId: true,
          roleTitle: true,
          person: { select: personSelect },
        },
        orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
      }),
    ])

    const byPersonId = new Map<string, OrganizationMemberEntity>()
    for (const tenure of tenures) {
      if (!byPersonId.has(tenure.personId)) {
        byPersonId.set(tenure.personId, {
          id: tenure.id,
          personId: tenure.personId,
          roleTitle:
            tenure.title?.trim() ||
            tenure.positionDefinition.title?.trim() ||
            null,
          source: 'TENURE',
          person: tenure.person,
        })
      }
    }
    for (const role of roles) {
      if (!byPersonId.has(role.personId)) {
        byPersonId.set(role.personId, {
          id: role.id,
          personId: role.personId,
          roleTitle: role.roleTitle?.trim() || null,
          source: 'ROLE',
          person: role.person,
        })
      }
    }
    return [...byPersonId.values()]
  }

  async addMemberRole(
    organizationId: string,
    data: AddOrganizationMemberData,
  ): Promise<OrganizationMemberEntity> {
    const personSelect = {
      id: true,
      name: true,
      surname: true,
      originalName: true,
      profileImageUrl: true,
    } as const

    const normalizedTitle = data.roleTitle?.trim() || '소속 위원'
    const existing = await this.prisma.organizationPersonRole.findFirst({
      where: { organizationId, personId: data.personId },
      select: { id: true },
    })

    const saved = existing
      ? await this.prisma.organizationPersonRole.update({
          where: { id: existing.id },
          data: {
            roleTitle: normalizedTitle,
            ...(data.notes !== undefined ? { notes: data.notes } : {}),
          },
          select: {
            id: true,
            personId: true,
            roleTitle: true,
            person: { select: personSelect },
          },
        })
      : await this.prisma.organizationPersonRole.create({
          data: {
            organizationId,
            personId: data.personId,
            roleTitle: normalizedTitle,
            notes: data.notes ?? null,
          },
          select: {
            id: true,
            personId: true,
            roleTitle: true,
            person: { select: personSelect },
          },
        })

    return {
      id: saved.id,
      personId: saved.personId,
      roleTitle: saved.roleTitle?.trim() || null,
      source: 'ROLE',
      person: saved.person,
    }
  }

  async removeMemberRole(
    organizationId: string,
    personId: string,
  ): Promise<void> {
    await this.prisma.organizationPersonRole.deleteMany({
      where: { organizationId, personId },
    })
  }

  async findCountryMemberships(
    organizationId: string,
  ): Promise<OrganizationCountryMembershipEntity[]> {
    const rows = await this.prisma.organizationCountryMembership.findMany({
      where: { organizationId },
      include: COUNTRY_MEMBERSHIP_INCLUDE,
      orderBy: [
        { sortOrder: 'asc' },
        { startYear: 'asc' },
        { createdAt: 'asc' },
      ],
    })
    return rows.map((r) => this.toCountryMembershipEntity(r))
  }

  async findMembershipsByCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<CountryOrganizationMembershipEntity[]> {
    const cid = params.countryId?.trim() || null
    const hid = params.historicalCountryId?.trim() || null
    if (!cid && !hid) return []

    const rows = await this.prisma.organizationCountryMembership.findMany({
      where: hid ? { historicalCountryId: hid } : { countryId: cid },
      include: {
        ...COUNTRY_MEMBERSHIP_INCLUDE,
        organization: {
          select: {
            id: true,
            name: true,
            shortName: true,
            type: true,
            scope: true,
            logoUrl: true,
            foundedDate: true,
            dissolvedDate: true,
            _count: { select: { memberships: true, eventSeries: true } },
          },
        },
      },
      orderBy: [
        { endYear: 'asc' },
        { startYear: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return rows.map((row) => ({
      ...this.toCountryMembershipEntity(row),
      organization: {
        id: row.organization.id,
        name: row.organization.name,
        shortName: row.organization.shortName ?? null,
        type: row.organization.type,
        scope: row.organization.scope ?? null,
        logoUrl: row.organization.logoUrl ?? null,
        foundedDate: row.organization.foundedDate ?? null,
        dissolvedDate: row.organization.dissolvedDate ?? null,
        countryMemberCount: row.organization._count?.memberships ?? 0,
        eventSeriesCount: row.organization._count?.eventSeries ?? 0,
      },
    }))
  }

  async upsertCountryMembership(
    organizationId: string,
    data: UpsertOrganizationCountryMembershipData,
  ): Promise<OrganizationCountryMembershipEntity> {
    const rawCid =
      data.countryId && data.countryId.trim() !== '' ? data.countryId.trim() : null
    const rawHid =
      data.historicalCountryId && data.historicalCountryId.trim() !== ''
        ? data.historicalCountryId.trim()
        : null

    if (!rawCid && !rawHid) {
      throw new BadRequestException(
        '회원국으로 연결할 현대 국가 또는 역사적 국가를 선택해야 합니다.',
      )
    }

    // 한 조직 내 동일 현대국가에 여러 역사국가가 동시에 가입할 수 있으므로(예: 독일 연방의 프로이센·작센),
    // historicalCountryId가 주어지면 역사국가 축으로 저장하고 countryId는 비운다.
    const hid = rawHid
    const cid = hid ? null : rawCid

    if (cid && this.prisma.country?.findUnique) {
      const c = await this.prisma.country.findUnique({
        where: { id: cid },
        select: { id: true },
      })
      if (!c) {
        throw new NotFoundException('회원국으로 연결할 국가를 찾을 수 없습니다.')
      }
    }
    if (hid && this.prisma.historicalCountry?.findUnique) {
      const hc = await this.prisma.historicalCountry.findUnique({
        where: { id: hid },
        select: { id: true },
      })
      if (!hc) {
        throw new NotFoundException(
          '회원국으로 연결할 역사적 국가를 찾을 수 없습니다.',
        )
      }
    }

    const start = normalizeStructuredDate(
      data.startEra,
      data.startYear,
      data.startMonth,
      data.startDay,
      '가입·시작',
    )
    const end = normalizeStructuredDate(
      data.endEra,
      data.endYear,
      data.endMonth,
      data.endDay,
      '탈퇴·종료',
    )
    this.assertStructuredDateOrder(start, end)

    const existing = await this.prisma.organizationCountryMembership.findFirst({
      where: {
        organizationId,
        ...(cid ? { countryId: cid } : { historicalCountryId: hid }),
      },
      select: { id: true, sortOrder: true },
    })

    const role: OrganizationCountryRole = data.role ?? 'MEMBER'
    const notes = data.notes !== undefined ? (data.notes?.trim() || null) : null
    const statusHistory =
      data.statusHistory !== undefined
        ? normalizeStatusHistory(data.statusHistory)
        : undefined

    const saved = existing
      ? await this.prisma.organizationCountryMembership.update({
          where: { id: existing.id },
          data: {
            role,
            startEra: start.era,
            startYear: start.year,
            startMonth: start.month,
            startDay: start.day,
            startDate: start.date,
            endEra: end.era,
            endYear: end.year,
            endMonth: end.month,
            endDay: end.day,
            endDate: end.date,
            ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
            ...(data.notes !== undefined ? { notes } : {}),
            ...(statusHistory !== undefined
              ? {
                  statusHistory: statusHistory
                    ? (statusHistory as any)
                    : Prisma.DbNull,
                }
              : {}),
          },
          include: COUNTRY_MEMBERSHIP_INCLUDE,
        })
      : await this.prisma.organizationCountryMembership.create({
          data: {
            organizationId,
            countryId: cid,
            historicalCountryId: hid,
            role,
            startEra: start.era,
            startYear: start.year,
            startMonth: start.month,
            startDay: start.day,
            startDate: start.date,
            endEra: end.era,
            endYear: end.year,
            endMonth: end.month,
            endDay: end.day,
            endDate: end.date,
            sortOrder: data.sortOrder ?? 0,
            notes,
            statusHistory: statusHistory ? (statusHistory as any) : Prisma.DbNull,
          },
          include: COUNTRY_MEMBERSHIP_INCLUDE,
        })

    return this.toCountryMembershipEntity(saved)
  }

  async updateCountryMembership(
    organizationId: string,
    membershipId: string,
    data: UpdateOrganizationCountryMembershipData,
  ): Promise<OrganizationCountryMembershipEntity> {
    const existing = await this.prisma.organizationCountryMembership.findUnique({
      where: { id: membershipId },
    })
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundException('조직 회원국 기록을 찾을 수 없습니다.')
    }

    const nextStartYear =
      data.startYear !== undefined ? data.startYear : existing.startYear
    const nextStartEra =
      data.startEra !== undefined ? data.startEra : existing.startEra
    const nextStartMonth =
      data.startMonth !== undefined ? data.startMonth : existing.startMonth
    const nextStartDay =
      data.startDay !== undefined ? data.startDay : existing.startDay

    const nextEndYear =
      data.endYear !== undefined ? data.endYear : existing.endYear
    const nextEndEra =
      data.endEra !== undefined ? data.endEra : existing.endEra
    const nextEndMonth =
      data.endMonth !== undefined ? data.endMonth : existing.endMonth
    const nextEndDay =
      data.endDay !== undefined ? data.endDay : existing.endDay

    const start = normalizeStructuredDate(
      nextStartEra,
      nextStartYear,
      nextStartMonth,
      nextStartDay,
      '가입·시작',
    )
    const end = normalizeStructuredDate(
      nextEndEra,
      nextEndYear,
      nextEndMonth,
      nextEndDay,
      '탈퇴·종료',
    )
    this.assertStructuredDateOrder(start, end)

    const statusHistory =
      data.statusHistory !== undefined
        ? normalizeStatusHistory(data.statusHistory)
        : undefined

    const saved = await this.prisma.organizationCountryMembership.update({
      where: { id: membershipId },
      data: {
        ...(data.role !== undefined ? { role: data.role } : {}),
        startEra: start.era,
        startYear: start.year,
        startMonth: start.month,
        startDay: start.day,
        startDate: start.date,
        endEra: end.era,
        endYear: end.year,
        endMonth: end.month,
        endDay: end.day,
        endDate: end.date,
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.notes !== undefined
          ? { notes: data.notes?.trim() || null }
          : {}),
        ...(statusHistory !== undefined
          ? {
              statusHistory: statusHistory
                ? (statusHistory as any)
                : Prisma.DbNull,
            }
          : {}),
      },
      include: COUNTRY_MEMBERSHIP_INCLUDE,
    })

    return this.toCountryMembershipEntity(saved)
  }

  async removeCountryMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<void> {
    const existing = await this.prisma.organizationCountryMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, organizationId: true },
    })
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundException('조직 회원국 기록을 찾을 수 없습니다.')
    }
    await this.prisma.organizationCountryMembership.delete({
      where: { id: membershipId },
    })
  }

  async findRelatedEvents(
    organizationId: string,
    userId?: string,
  ): Promise<OrganizationRelatedEventEntity[]> {
    if (!userId) return []

    const rows = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        createdById: userId,
        OR: [
          { organizationRelations: { some: { organizationId } } },
          { series: { organizationId } },
        ],
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        startDatePrecision: true,
        startEra: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        endDate: true,
        endDatePrecision: true,
        endEra: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        location: true,
        domain: true,
        type: true,
        kind: true,
        seriesId: true,
        seriesEdition: true,
        seriesEditionLabel: true,
        series: {
          select: { id: true, title: true },
        },
        organizationRelations: {
          where: { organizationId },
          select: { role: true },
        },
        countryRelations: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            role: true,
            country: { select: { id: true, name: true, flagEmoji: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
        },
      },
    })

    const sorted = [...rows].sort((a, b) => {
      const syA = signedYearOfEdition(a)
      const syB = signedYearOfEdition(b)
      if (syA == null && syB == null) return a.title.localeCompare(b.title, 'ko')
      if (syA == null) return 1
      if (syB == null) return -1
      const keyA =
        syA * 10000 +
        (a.startMonth ?? (a.startDate ? a.startDate.getUTCMonth() + 1 : 1)) * 100 +
        (a.startDay ?? (a.startDate ? a.startDate.getUTCDate() : 1))
      const keyB =
        syB * 10000 +
        (b.startMonth ?? (b.startDate ? b.startDate.getUTCMonth() + 1 : 1)) * 100 +
        (b.startDay ?? (b.startDate ? b.startDate.getUTCDate() : 1))
      if (keyB !== keyA) return keyB - keyA
      return (b.seriesEdition ?? 0) - (a.seriesEdition ?? 0)
    })

    return sorted.map((ev) => {
      const hostRel =
        ev.countryRelations.find((cr) => cr.role === 'INITIATOR') ??
        (ev.countryRelations.length === 1 ? ev.countryRelations[0] : null)
      const hostCountry = hostRel?.historicalCountry
        ? {
            id: hostRel.historicalCountry.id,
            name: hostRel.historicalCountry.name,
            flagEmoji: hostRel.country?.flagEmoji ?? null,
            isHistorical: true,
          }
        : hostRel?.country
          ? {
              id: hostRel.country.id,
              name: hostRel.country.name,
              flagEmoji: hostRel.country.flagEmoji ?? null,
              isHistorical: false,
            }
          : null

      return {
        id: ev.id,
        title: ev.title,
        startDate: formatEventDate(
          ev.startDate,
          ev.startEra,
          ev.startYear,
          ev.startMonth,
          ev.startDay,
        ),
        startDatePrecision: ev.startDatePrecision ?? null,
        endDate: formatEventDate(
          ev.endDate,
          ev.endEra,
          ev.endYear,
          ev.endMonth,
          ev.endDay,
        ),
        location: ev.location ?? null,
        domain: ev.domain,
        type: ev.type ?? null,
        kind: ev.kind,
        organizationRole: ev.organizationRelations[0]?.role ?? null,
        seriesId: ev.series?.id ?? ev.seriesId ?? null,
        seriesTitle: ev.series?.title ?? null,
        editionBadge: formatSeriesEditionBadge(ev),
        hostCountry,
        participantCount: ev.countryRelations.length,
      }
    })
  }

  private toCountryMembershipEntity(row: {
    id: string
    organizationId: string
    countryId: string | null
    historicalCountryId: string | null
    role: OrganizationCountryRole
    startEra: 'BC' | 'AD' | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
    startDate: Date | null
    endEra: 'BC' | 'AD' | null
    endYear: number | null
    endMonth: number | null
    endDay: number | null
    endDate: Date | null
    sortOrder: number
    notes: string | null
    statusHistory?: unknown
    country?: { id: string; name: string; flagEmoji: string | null } | null
    historicalCountry?: { id: string; name: string } | null
  }): OrganizationCountryMembershipEntity {
    let parsedHistory: OrganizationMembershipStatusPhase[] | null = null
    try {
      parsedHistory = normalizeStatusHistory(row.statusHistory)
    } catch {
      parsedHistory = null
    }
    return {
      id: row.id,
      organizationId: row.organizationId,
      countryId: row.countryId,
      historicalCountryId: row.historicalCountryId,
      role: row.role,
      startEra: row.startEra,
      startYear: row.startYear,
      startMonth: row.startMonth,
      startDay: row.startDay,
      startDate: row.startDate,
      endEra: row.endEra,
      endYear: row.endYear,
      endMonth: row.endMonth,
      endDay: row.endDay,
      endDate: row.endDate,
      sortOrder: row.sortOrder,
      notes: row.notes,
      statusHistory: parsedHistory,
      country: row.country ?? null,
      historicalCountry: row.historicalCountry ?? null,
    }
  }

  private toEntity(row: {
    id: string
    name: string
    shortName: string | null
    localName: string | null
    type: any
    scope: any
    description: string | null
    foundedDate: Date | null
    dissolvedDate: Date | null
    websiteUrl: string | null
    logoUrl: string | null
    ideology: string | null
    headquartersCityId: string | null
    headquartersCity?: { id: string; name: string } | null
    predecessorOrganizationId?: string | null
    predecessor?: { id: string; name: string; shortName: string | null } | null
    successors?: Array<{ id: string; name: string; shortName: string | null }>
    countryId: string | null
    historicalCountryId: string | null
    country?: { id: string; name: string; flagEmoji?: string | null } | null
    historicalCountry?: { id: string; name: string } | null
    _count?: { memberships?: number; eventSeries?: number }
    createdAt: Date
    updatedAt: Date
  }): OrganizationEntity {
    return {
      id: row.id,
      name: row.name,
      shortName: row.shortName,
      localName: row.localName,
      type: row.type,
      scope: row.scope,
      description: row.description,
      foundedDate: row.foundedDate,
      dissolvedDate: row.dissolvedDate,
      websiteUrl: row.websiteUrl,
      logoUrl: row.logoUrl,
      ideology: row.ideology,
      headquartersCityId: row.headquartersCityId,
      headquartersCity: row.headquartersCity ?? null,
      predecessorOrganizationId: row.predecessorOrganizationId ?? null,
      predecessor: row.predecessor ?? null,
      successors: row.successors ?? [],
      countryId: row.countryId,
      historicalCountryId: row.historicalCountryId,
      country: row.country ?? null,
      historicalCountry: row.historicalCountry ?? null,
      countryMemberCount: row._count?.memberships ?? 0,
      eventSeriesCount: row._count?.eventSeries ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
