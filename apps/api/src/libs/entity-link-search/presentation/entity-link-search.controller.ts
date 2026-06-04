import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@prisma/prisma.service'

import {
  EntityLinkSearchItemDto,
  EntityLinkSearchResponseDto,
} from './entity-link-search.dto'

export { EntityLinkSearchItemDto, EntityLinkSearchResponseDto }

/** 인물 묶음 유형 한국어 라벨 (검색 결과 subtitle용) */
const GROUP_TYPE_LABEL: Record<string, string> = {
  GENERATION: '세대·코호트',
  COHORT: '기수·동기',
  FOUNDING: '창립·창건',
  FACTION: '계파·파벌',
  SCHOOL: '학파·사조',
  CIRCLE: '동인·사단',
  MOVEMENT: '운동·진영',
  OTHER: '집단',
}

function displayPersonName(p: {
  name: string
  surname: string | null
  country?: { defaultNameDisplayOrder?: string | null; isoCode?: string | null } | null
}): string {
  const d = p.country?.defaultNameDisplayOrder
  let order: 'western' | 'korean'
  if (d === 'western') order = 'western'
  else if (d === 'korean') order = 'korean'
  else order = 'korean'
  if (order === 'western')
    return [p.name, p.surname].filter(Boolean).join(' ').trim() || p.name
  return [p.surname, p.name].filter(Boolean).join(' ').trim() || p.name
}

/**
 * 리치텍스트 엔티티 연결용 통합 검색 (DB `contains`, 타입별 상한)
 * GET /entity-link-search?q=&countryId=
 */
@ApiTags('entity-link-search')
@Controller('entity-link-search')
@UseGuards(AuthGuard('jwt'))
export class EntityLinkSearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(
    @Query('q') q?: string,
    @Query('countryId') countryId?: string,
  ): Promise<EntityLinkSearchResponseDto> {
    const term = (q ?? '').trim()
    if (term.length < 1) {
      return { items: [] }
    }

    const partyFilter = countryId?.trim()
    const partyWhere = {
      AND: [
        {
          OR: [
            { name: { contains: term } },
            { shortName: { contains: term } },
            { localName: { contains: term } },
          ],
        },
        ...(partyFilter ? [{ countryId: partyFilter }] : []),
      ],
    }

    const groupWhere = {
      AND: [
        { name: { contains: term } },
        ...(partyFilter ? [{ countryId: partyFilter }] : []),
      ],
    }

    const [
      persons,
      events,
      countries,
      historicalCountries,
      dynasties,
      militaryUnits,
      parties,
      personGroups,
    ] = await Promise.all([
      this.prisma.person.findMany({
        where: {
          OR: [
            { name: { contains: term } },
            { surname: { contains: term } },
            { originalName: { contains: term } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          surname: true,
          birthDate: true,
          profileImageUrl: true,
          country: { select: { defaultNameDisplayOrder: true, isoCode: true } },
        },
      }),
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          title: { contains: term },
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, startDate: true },
      }),
      this.prisma.country.findMany({
        where: {
          OR: [
            { name: { contains: term } },
            { localName: { contains: term } },
            { fullName: { contains: term } },
          ],
        },
        take: 6,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, localName: true },
      }),
      this.prisma.historicalCountry.findMany({
        where: {
          OR: [{ name: { contains: term } }, { enName: { contains: term } }],
        },
        take: 6,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, enName: true },
      }),
      this.prisma.dynasty.findMany({
        where: { name: { contains: term } },
        take: 6,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true },
      }),
      this.prisma.militaryUnit.findMany({
        where: {
          OR: [
            { name: { contains: term } },
            { nickname: { contains: term } },
          ],
        },
        take: 6,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          country: { select: { name: true } },
        },
      }),
      this.prisma.politicalParty.findMany({
        where: partyWhere,
        take: 8,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          shortName: true,
          countryId: true,
        },
      }),
      this.prisma.personGroup.findMany({
        where: groupWhere,
        take: 6,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, type: true, countryId: true },
      }),
    ])

    const items: EntityLinkSearchItemDto[] = []

    for (const p of persons) {
      items.push({
        type: 'person',
        id: p.id,
        name: displayPersonName(p),
        subtitle: p.birthDate
          ? `${p.birthDate.getFullYear()}년`
          : undefined,
        imageUrl: p.profileImageUrl ?? null,
      })
    }
    for (const e of events) {
      items.push({
        type: 'event',
        id: e.id,
        name: e.title,
        subtitle: e.startDate
          ? `${e.startDate.getFullYear()}년`
          : undefined,
      })
    }
    for (const c of countries) {
      items.push({
        type: 'country',
        id: c.id,
        name: c.name,
        subtitle: c.localName ?? undefined,
      })
    }
    for (const h of historicalCountries) {
      items.push({
        type: 'historicalCountry',
        id: h.id,
        name: h.name,
        subtitle: h.enName ?? undefined,
      })
    }
    for (const d of dynasties) {
      const desc = d.description?.trim()
      items.push({
        type: 'dynasty',
        id: d.id,
        name: d.name,
        subtitle: desc ? `${desc.slice(0, 40)}…` : undefined,
      })
    }
    for (const m of militaryUnits) {
      items.push({
        type: 'militaryUnit',
        id: m.id,
        name: m.name,
        subtitle: m.country?.name ?? undefined,
      })
    }
    for (const pp of parties) {
      items.push({
        type: 'politicalParty',
        id: pp.id,
        name: pp.name,
        subtitle: pp.shortName?.trim() || undefined,
        countryId: pp.countryId,
      })
    }
    for (const grp of personGroups) {
      items.push({
        type: 'personGroup',
        id: grp.id,
        name: grp.name,
        subtitle: GROUP_TYPE_LABEL[grp.type] ?? undefined,
        countryId: grp.countryId,
      })
    }

    return { items }
  }
}
