import { Injectable } from '@nestjs/common'
import { EventContextRole, PrismaClient } from '@prisma/client'

import { assertEventOwnership } from '../domain/event-ownership'
import type { EventContextDomain } from '../presentation/dto/event-context-link.dto'

export interface EventContextLinkInput {
  domain: EventContextDomain
  entityId: string
  role?: EventContextRole
  sideId?: string | null
  note?: string | null
}

export interface EventContextLinkView {
  id: string
  eventId: string
  domain: EventContextDomain
  entityId: string
  title: string
  subtitle: string | null
  role: EventContextRole
  sideId: string | null
  sideName: string | null
  sideColor: string | null
  note: string | null
  sortOrder: number
}

export interface EventContextCatalogItem {
  id: string
  domain: EventContextDomain
  title: string
  subtitle: string | null
}

@Injectable()
export class EventContextLinkService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(eventId: string): Promise<EventContextLinkView[]> {
    const rows = await this.prisma.eventContextLink.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        side: { select: { id: true, name: true, color: true } },
        law: {
          select: {
            id: true,
            name: true,
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
          },
        },
        socialPhenomenon: {
          select: {
            id: true,
            title: true,
            category: true,
            country: { select: { name: true } },
            modernCountry: { select: { name: true } },
          },
        },
        naturalFeature: {
          select: {
            id: true,
            name: true,
            type: true,
            region: true,
            country: { select: { name: true } },
          },
        },
        infrastructure: {
          select: {
            id: true,
            name: true,
            type: true,
            region: true,
            country: { select: { name: true } },
          },
        },
        climate: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
            category: { select: { name: true } },
          },
        },
        companyFacility: {
          select: {
            id: true,
            name: true,
            facilityType: true,
            city: { select: { name: true } },
            company: { select: { organization: { select: { name: true } } } },
          },
        },
      },
    })

    const views: EventContextLinkView[] = []
    for (const row of rows) {
      let domain: EventContextDomain = 'LAW'
      let entityId = ''
      let title = ''
      let subtitle: string | null = null

      if (row.law) {
        domain = 'LAW'
        entityId = row.law.id
        title = row.law.name
        subtitle = row.law.historicalCountry?.name ?? row.law.country?.name ?? '법령·명령'
      } else if (row.socialPhenomenon) {
        domain = 'SOCIAL_PHENOMENON'
        entityId = row.socialPhenomenon.id
        title = row.socialPhenomenon.title
        subtitle =
          row.socialPhenomenon.country?.name ??
          row.socialPhenomenon.modernCountry?.name ??
          row.socialPhenomenon.category
      } else if (row.naturalFeature) {
        domain = 'NATURAL_FEATURE'
        entityId = row.naturalFeature.id
        title = row.naturalFeature.name
        subtitle = [row.naturalFeature.country.name, row.naturalFeature.region, row.naturalFeature.type]
          .filter(Boolean)
          .join(' · ')
      } else if (row.infrastructure) {
        domain = 'INFRASTRUCTURE'
        entityId = row.infrastructure.id
        title = row.infrastructure.name
        subtitle = [row.infrastructure.country.name, row.infrastructure.region, row.infrastructure.type]
          .filter(Boolean)
          .join(' · ')
      } else if (row.climate) {
        domain = 'CLIMATE'
        entityId = row.climate.id
        title = row.climate.name
        subtitle = row.climate.description ? row.climate.description.slice(0, 60) : '기후·기상'
      } else if (row.resource) {
        domain = 'RESOURCE'
        entityId = row.resource.id
        title = row.resource.name
        subtitle = row.resource.category.name
      } else if (row.companyFacility) {
        domain = 'COMPANY_FACILITY'
        entityId = row.companyFacility.id
        title = row.companyFacility.name ?? '기업 시설'
        subtitle = [
          row.companyFacility.company.organization.name,
          row.companyFacility.city?.name,
          row.companyFacility.facilityType,
        ]
          .filter(Boolean)
          .join(' · ')
      } else {
        continue
      }

      views.push({
        id: row.id,
        eventId: row.eventId,
        domain,
        entityId,
        title,
        subtitle,
        role: row.role,
        sideId: row.sideId ?? null,
        sideName: row.side?.name ?? null,
        sideColor: row.side?.color ?? null,
        note: row.note ?? null,
        sortOrder: row.sortOrder,
      })
    }
    return views
  }

  async getCatalog(): Promise<EventContextCatalogItem[]> {
    const [laws, phenomena, features, infrastructures, climates, resources, facilities] = await Promise.all([
      this.prisma.law.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          country: { select: { name: true } },
          historicalCountry: { select: { name: true } },
        },
      }),
      this.prisma.socialPhenomenon.findMany({
        orderBy: { title: 'asc' },
        select: {
          id: true,
          title: true,
          category: true,
          country: { select: { name: true } },
          modernCountry: { select: { name: true } },
        },
      }),
      this.prisma.naturalFeature.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          type: true,
          region: true,
          country: { select: { name: true } },
        },
      }),
      this.prisma.infrastructure.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          type: true,
          region: true,
          country: { select: { name: true } },
        },
      }),
      this.prisma.climate.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
        },
      }),
      this.prisma.resource.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.companyFacility.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          facilityType: true,
          city: { select: { name: true } },
          company: { select: { organization: { select: { name: true } } } },
        },
      }),
    ])

    return [
      ...laws.map((item) => ({
        id: item.id,
        domain: 'LAW' as const,
        title: item.name,
        subtitle: item.historicalCountry?.name ?? item.country?.name ?? '법령·명령',
      })),
      ...phenomena.map((item) => ({
        id: item.id,
        domain: 'SOCIAL_PHENOMENON' as const,
        title: item.title,
        subtitle: item.country?.name ?? item.modernCountry?.name ?? item.category,
      })),
      ...features.map((item) => ({
        id: item.id,
        domain: 'NATURAL_FEATURE' as const,
        title: item.name,
        subtitle: [item.country.name, item.region, item.type].filter(Boolean).join(' · '),
      })),
      ...infrastructures.map((item) => ({
        id: item.id,
        domain: 'INFRASTRUCTURE' as const,
        title: item.name,
        subtitle: [item.country.name, item.region, item.type].filter(Boolean).join(' · '),
      })),
      ...climates.map((item) => ({
        id: item.id,
        domain: 'CLIMATE' as const,
        title: item.name,
        subtitle: item.description ? item.description.slice(0, 60) : '기후·기상',
      })),
      ...resources.map((item) => ({
        id: item.id,
        domain: 'RESOURCE' as const,
        title: item.name,
        subtitle: item.category.name,
      })),
      ...facilities.map((item) => ({
        id: item.id,
        domain: 'COMPANY_FACILITY' as const,
        title: item.name ?? '기업 시설',
        subtitle: [item.company.organization.name, item.city?.name, item.facilityType].filter(Boolean).join(' · '),
      })),
    ]
  }

  async sync(actorId: string, eventId: string, inputs: EventContextLinkInput[]): Promise<EventContextLinkView[]> {
    await assertEventOwnership(this.prisma, eventId, actorId, {
      action: '수정',
      deleted: 'not-found',
    })

    await this.prisma.$transaction(async (tx) => {
      await tx.eventContextLink.deleteMany({ where: { eventId } })
      for (const [index, input] of inputs.entries()) {
        await tx.eventContextLink.create({
          data: {
            eventId,
            sideId: input.sideId || null,
            role: input.role ?? EventContextRole.OTHER,
            lawId: input.domain === 'LAW' ? input.entityId : null,
            socialPhenomenonId: input.domain === 'SOCIAL_PHENOMENON' ? input.entityId : null,
            naturalFeatureId: input.domain === 'NATURAL_FEATURE' ? input.entityId : null,
            infrastructureId: input.domain === 'INFRASTRUCTURE' ? input.entityId : null,
            climateId: input.domain === 'CLIMATE' ? input.entityId : null,
            resourceId: input.domain === 'RESOURCE' ? input.entityId : null,
            companyFacilityId: input.domain === 'COMPANY_FACILITY' ? input.entityId : null,
            note: input.note?.trim() || null,
            sortOrder: index,
          },
        })
      }
    })

    return this.list(eventId)
  }
}
