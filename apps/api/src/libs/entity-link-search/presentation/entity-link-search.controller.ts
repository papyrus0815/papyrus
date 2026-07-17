import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@prisma/prisma.service'

import { getActorAccountId } from '../../shared/actor-context'
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
  middleName?: string | null
  nameDisplayOrder?: string | null
  country?: { defaultNameDisplayOrder?: string | null; isoCode?: string | null } | null
}): string {
  // 순서 우선순위는 프론트 getPersonDisplayName과 동일: 개인 오버라이드 → 국가 기본 → 동양식.
  // 중간이름은 이름 묶음에 붙는다 — western: 이름 중간 성 / korean: 성 이름 중간.
  const resolved = p.nameDisplayOrder ?? p.country?.defaultNameDisplayOrder
  const order: 'western' | 'korean' = resolved === 'western' ? 'western' : 'korean'
  const parts =
    order === 'western'
      ? [p.name, p.middleName, p.surname]
      : [p.surname, p.name, p.middleName]
  return parts.filter(Boolean).join(' ').trim() || p.name
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

    // 소유자 스코프: person/event 상세 조회는 소유자 전용이라(person.findById 404, event 403)
    // 검색에서 비소유 엔티티를 미리 배제해야 링크 클릭 시의 데드엔드(404/403)를 막는다.
    // actor 값은 person.accountId · event.createdById 양쪽과 동일한 req.user.id.
    // company/country 등 전역 엔티티는 소유 개념이 없어 스코프하지 않는다.
    const actorAccountId = getActorAccountId()

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
      companies,
      countries,
      historicalCountries,
      dynasties,
      militaryUnits,
      parties,
      personGroups,
    ] = await Promise.all([
      this.prisma.person.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: term } },
                { surname: { contains: term } },
                { middleName: { contains: term } },
                { originalName: { contains: term } },
              ],
            },
            // 소유 인물만 — 비소유/무소속(accountId=null) 인물은 상세 조회가 404라 링크해도 죽음.
            ...(actorAccountId ? [{ accountId: actorAccountId }] : []),
          ],
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          surname: true,
          middleName: true,
          nameDisplayOrder: true,
          birthDate: true,
          profileImageUrl: true,
          country: { select: { defaultNameDisplayOrder: true, isoCode: true } },
        },
      }),
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          title: { contains: term },
          // 본인 사건만 — getEventById가 createdById 불일치 시 403이라, 타계정 사건 링크는 데드엔드.
          ...(actorAccountId ? { createdById: actorAccountId } : {}),
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, startDate: true },
      }),
      // 기업 — 명칭 정본은 Organization(type=COMPANY)이라 organization 경유 검색.
      // 단 반환 id는 Company.id(딥링크 /companies/:id 타깃 — Organization.id면 404).
      this.prisma.company.findMany({
        where: {
          organization: {
            ...(partyFilter ? { countryId: partyFilter } : {}),
            OR: [
              { name: { contains: term } },
              { localName: { contains: term } },
              { shortName: { contains: term } },
            ],
          },
        },
        take: 6,
        orderBy: { organization: { name: 'asc' } },
        select: {
          id: true,
          organization: {
            select: {
              name: true,
              localName: true,
              country: { select: { name: true } },
            },
          },
        },
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
    for (const company of companies) {
      items.push({
        type: 'company',
        id: company.id, // Company.id (딥링크 타깃)
        name: company.organization.name,
        subtitle:
          company.organization.country?.name ??
          company.organization.localName ??
          undefined,
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
