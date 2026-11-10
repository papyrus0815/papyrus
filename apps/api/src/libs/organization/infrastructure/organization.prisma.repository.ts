import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
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
} from '../domain/organization.repository'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'

/** 응답에 연결 국가/역사국가 요약({id,name})을 실어주는 공용 include */
const COUNTRY_SUMMARY_INCLUDE = {
  country: { select: { id: true, name: true } },
  historicalCountry: { select: { id: true, name: true } },
} satisfies Prisma.OrganizationInclude

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
    const where: Prisma.OrganizationWhereInput = {
      ...(filter.countryId != null
        ? await resolveCountryScopeOr(this.prisma, filter.countryId)
        : filter.historicalCountryId != null
          ? { historicalCountryId: filter.historicalCountryId }
          : {}),
      ...(filter.type != null && { type: filter.type }),
    }
    const rows = await this.prisma.organization.findMany({
      where,
      include: COUNTRY_SUMMARY_INCLUDE,
      orderBy: { name: 'asc' },
    })
    return rows.map((r) => this.toEntity(r))
  }

  async create(data: CreateOrganizationData): Promise<OrganizationEntity> {
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

    const [posDefCount, companyCount, eventRelCount] = await Promise.all([
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
    ])
    const refs: string[] = []
    if (posDefCount > 0) refs.push(`관직 정의 ${posDefCount}건`)
    if (companyCount > 0) refs.push(`기업 ${companyCount}건`)
    if (eventRelCount > 0) refs.push(`사건 조직 관계 ${eventRelCount}건`)
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
    countryId: string | null
    historicalCountryId: string | null
    country?: { id: string; name: string } | null
    historicalCountry?: { id: string; name: string } | null
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
      countryId: row.countryId,
      historicalCountryId: row.historicalCountryId,
      country: row.country ?? null,
      historicalCountry: row.historicalCountry ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
