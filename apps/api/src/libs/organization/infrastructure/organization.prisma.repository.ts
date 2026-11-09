import { Injectable } from '@nestjs/common'
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
        countryId: data.countryId,
        historicalCountryId: data.historicalCountryId,
      },
      include: COUNTRY_SUMMARY_INCLUDE,
    })
    return this.toEntity(row)
  }

  async update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<OrganizationEntity> {
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
        countryId: data.countryId,
        historicalCountryId: data.historicalCountryId,
      },
      include: COUNTRY_SUMMARY_INCLUDE,
    })
    return this.toEntity(row)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organization.delete({ where: { id } })
  }

  async addHierarchy(
    data: CreateOrganizationHierarchyData,
  ): Promise<OrganizationHierarchyEntity> {
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
        .filter((o): o is OrganizationEntity => o != null)
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
