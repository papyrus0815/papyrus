/**
 * 정당 산하·연계 조직(B3, docs/political-party-model-review.md §4.7).
 *
 * 기관지·청년단·준군사조직·지도 기구·국제 조직을 이름 문자열이 아니라 조직(Organization) 또는 군부대(MilitaryUnit)에
 * 역할·기간을 달아 잇는다. 없는 조직은 이 자리에서 만든다(유형은 역할에서, 국가는 정당에서) — 문자열로 남는 일이 없게.
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
import {
  OrganizationScope,
  OrganizationType,
  PoliticalPartyOrganizationRole,
  Prisma,
} from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'

import {
  type StructuredDateInput,
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  readStructuredDate,
  structuredDateData,
} from '../domain/party-structured-date.util'

const ROLE_VALUES = new Set<string>(Object.values(PoliticalPartyOrganizationRole))

/** 역할 → 즉석 생성 조직의 유형 */
const ROLE_DEFAULT_TYPE: Record<PoliticalPartyOrganizationRole, OrganizationType> = {
  GOVERNING_ORGAN: OrganizationType.PARTY_ORGAN,
  REGIONAL_BRANCH: OrganizationType.PARTY_ORGAN,
  OVERSEAS_BRANCH: OrganizationType.PARTY_ORGAN,
  PARLIAMENTARY_GROUP: OrganizationType.PARTY_ORGAN,
  YOUTH_WING: OrganizationType.MASS_ORGANIZATION,
  STUDENT_WING: OrganizationType.MASS_ORGANIZATION,
  WOMEN_WING: OrganizationType.MASS_ORGANIZATION,
  PARAMILITARY_WING: OrganizationType.PARAMILITARY,
  OFFICIAL_MEDIA: OrganizationType.MEDIA,
  THINK_TANK: OrganizationType.NGO,
  TRADE_UNION: OrganizationType.TRADE_UNION,
  INTERNATIONAL_MEMBERSHIP: OrganizationType.POLITICAL_ALLIANCE,
  ALLIANCE_MEMBERSHIP: OrganizationType.POLITICAL_ALLIANCE,
  OTHER: OrganizationType.OTHER,
}

/** 표시 순서 — 지도 기구 → 대중 조직 → 무력 → 매체 → 정책 → 지부 → 대외 */
const ROLE_ORDER: PoliticalPartyOrganizationRole[] = [
  'GOVERNING_ORGAN',
  'YOUTH_WING',
  'STUDENT_WING',
  'WOMEN_WING',
  'PARAMILITARY_WING',
  'OFFICIAL_MEDIA',
  'THINK_TANK',
  'TRADE_UNION',
  'PARLIAMENTARY_GROUP',
  'REGIONAL_BRANCH',
  'OVERSEAS_BRANCH',
  'INTERNATIONAL_MEMBERSHIP',
  'ALLIANCE_MEMBERSHIP',
  'OTHER',
]

/** 정당에 잇지 않는 조직 유형 — 각자 정본 도메인이 따로 있다 */
const EXCLUDED_ORG_TYPES: OrganizationType[] = [
  OrganizationType.COMPANY,
  OrganizationType.GOVERNMENT_AGENCY,
  OrganizationType.POLITICAL_PARTY,
]

export interface PartyOrganizationNewOrganizationInput {
  name: string
  localName?: string | null
  /** 생략하면 역할에서 정한다 */
  type?: string | null
}

export interface CreatePartyOrganizationBody {
  role: string
  /** 셋 중 정확히 하나 */
  organizationId?: string | null
  militaryUnitId?: string | null
  newOrganization?: PartyOrganizationNewOrganizationInput | null
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
}

export interface UpdatePartyOrganizationBody {
  role?: string
  start?: StructuredDateInput | null
  end?: StructuredDateInput | null
  note?: string | null
  sortOrder?: number
}

const linkInclude = {
  organization: {
    select: {
      id: true,
      name: true,
      shortName: true,
      localName: true,
      type: true,
      foundedDate: true,
      dissolvedDate: true,
    },
  },
  militaryUnit: {
    select: { id: true, name: true, nameEn: true, unitType: true, establishedDate: true, disbandedDate: true },
  },
} satisfies Prisma.PoliticalPartyOrganizationInclude

@ApiTags('political-parties')
@Controller('political-parties')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyOrganizationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/organizations')
  async list(@Param('id') partyId: string): Promise<any> {
    await this.ensureParty(partyId)
    const rows = await this.prisma.politicalPartyOrganization.findMany({
      where: { partyId },
      include: linkInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    const startKey = (row: { startEra: string | null; startYear: number | null; startMonth: number | null; startDay: number | null }) =>
      row.startYear == null
        ? Number.POSITIVE_INFINITY
        : (row.startEra === 'BC' ? -row.startYear : row.startYear) * 10000 + (row.startMonth ?? 1) * 100 + (row.startDay ?? 1)
    return rows
      .map((row, index) => ({ row, index }))
      .sort(
        (left, right) =>
          ROLE_ORDER.indexOf(left.row.role) - ROLE_ORDER.indexOf(right.row.role) ||
          startKey(left.row) - startKey(right.row) ||
          left.index - right.index,
      )
      .map(({ row }) => row)
  }

  /** 후보 — 조직(이름·약칭·현지어·별칭) 또는 군부대(이름·영문) 부분 일치, 30개 */
  @Get(':id/organization-candidates')
  async candidates(
    @Param('id') partyId: string,
    @Query('q') rawQuery?: string,
    @Query('target') target?: string,
  ): Promise<any> {
    await this.ensureParty(partyId)
    const query = rawQuery?.trim() ?? ''
    if (target === 'militaryUnit') {
      const units = await this.prisma.militaryUnit.findMany({
        where: query ? { OR: [{ name: { contains: query } }, { nameEn: { contains: query } }] } : {},
        select: { id: true, name: true, nameEn: true, unitType: true, establishedDate: true },
        orderBy: { name: 'asc' },
        take: 30,
      })
      return units.map((unit) => ({ kind: 'militaryUnit', ...unit }))
    }
    const organizations = await this.prisma.organization.findMany({
      where: {
        type: { notIn: EXCLUDED_ORG_TYPES },
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { shortName: { contains: query } },
                { localName: { contains: query } },
                { aliases: { some: { name: { contains: query } } } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, shortName: true, localName: true, type: true, foundedDate: true },
      orderBy: { name: 'asc' },
      take: 30,
    })
    return organizations.map((organization) => ({ kind: 'organization', ...organization }))
  }

  @Post(':id/organizations')
  async create(@Param('id') partyId: string, @Body() body: CreatePartyOrganizationBody): Promise<any> {
    const party = await this.prisma.politicalParty.findUnique({
      where: { id: partyId },
      select: { id: true, countryId: true, historicalCountryId: true },
    })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
    const role = this.parseRole(body.role)
    const targets = [body.organizationId, body.militaryUnitId, body.newOrganization].filter(Boolean)
    if (targets.length !== 1) {
      throw new BadRequestException('조직·군부대·새 조직 중 정확히 하나를 고르세요.')
    }
    const start = parseStructuredDateInput(body.start, '시작')
    const end = parseStructuredDateInput(body.end, '끝')
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')

    try {
      return await this.prisma.$transaction(async (tx) => {
        let organizationId: string | null = null
        let militaryUnitId: string | null = null
        if (body.organizationId) {
          const organization = await tx.organization.findUnique({
            where: { id: body.organizationId },
            select: { id: true, type: true },
          })
          if (!organization) throw new BadRequestException('조직을 찾을 수 없습니다.')
          if (EXCLUDED_ORG_TYPES.includes(organization.type)) {
            throw new BadRequestException('기업·행정기관·정당은 산하 조직으로 잇지 않습니다(각자 정본 도메인).')
          }
          organizationId = organization.id
        } else if (body.militaryUnitId) {
          const unit = await tx.militaryUnit.findUnique({ where: { id: body.militaryUnitId }, select: { id: true } })
          if (!unit) throw new BadRequestException('군부대를 찾을 수 없습니다.')
          militaryUnitId = unit.id
        } else if (body.newOrganization) {
          organizationId = await this.createOrganizationFor(tx, party, role, body.newOrganization)
        }
        const created = await tx.politicalPartyOrganization.create({
          data: {
            partyId,
            role,
            organizationId,
            militaryUnitId,
            ...structuredDateData('start', start),
            ...structuredDateData('end', end),
            note: body.note?.trim() || null,
          },
          include: linkInclude,
        })
        return created
      })
    } catch (error) {
      this.rethrowConflict(error)
      throw error
    }
  }

  @Patch(':id/organizations/:linkId')
  async update(
    @Param('id') partyId: string,
    @Param('linkId') linkId: string,
    @Body() body: UpdatePartyOrganizationBody,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyOrganization.findFirst({ where: { id: linkId, partyId } })
    if (!existing) throw new NotFoundException('산하·연계 조직 연결을 찾을 수 없습니다.')
    const data: Prisma.PoliticalPartyOrganizationUncheckedUpdateInput = {}
    if (body.role !== undefined) data.role = this.parseRole(body.role)
    const start = body.start !== undefined ? parseStructuredDateInput(body.start, '시작') : readStructuredDate(existing, 'start')
    const end = body.end !== undefined ? parseStructuredDateInput(body.end, '끝') : readStructuredDate(existing, 'end')
    if (body.start !== undefined) Object.assign(data, structuredDateData('start', start))
    if (body.end !== undefined) Object.assign(data, structuredDateData('end', end))
    assertStructuredRangeOrder(start, end, '끝이 시작보다 앞설 수 없습니다.')
    if (body.note !== undefined) data.note = body.note?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    try {
      return await this.prisma.politicalPartyOrganization.update({ where: { id: linkId }, data, include: linkInclude })
    } catch (error) {
      this.rethrowConflict(error)
      throw error
    }
  }

  @Delete(':id/organizations/:linkId')
  async remove(@Param('id') partyId: string, @Param('linkId') linkId: string): Promise<void> {
    const existing = await this.prisma.politicalPartyOrganization.findFirst({
      where: { id: linkId, partyId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('산하·연계 조직 연결을 찾을 수 없습니다.')
    /* 연결만 푼다 — 조직·부대 자체는 남는다 */
    await this.prisma.politicalPartyOrganization.delete({ where: { id: linkId } })
  }

  // ── 내부 ──

  private async ensureParty(partyId: string): Promise<void> {
    const party = await this.prisma.politicalParty.findUnique({ where: { id: partyId }, select: { id: true } })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }

  private parseRole(raw: string | undefined): PoliticalPartyOrganizationRole {
    if (!raw || !ROLE_VALUES.has(raw)) throw new BadRequestException(`조직 역할이 올바르지 않습니다: ${raw ?? '(없음)'}`)
    return raw as PoliticalPartyOrganizationRole
  }

  /**
   * 즉석 조직 — 유형은 역할에서(입력이 있으면 그것), 국가는 정당에서 상속(국제 조직 가입은 국가 없이 국제 범위).
   * 같은 이름의 조직이 이미 있으면 새로 만들지 않고 409 — 목록에서 고르게 한다.
   */
  private async createOrganizationFor(
    tx: Prisma.TransactionClient,
    party: { countryId: string | null; historicalCountryId: string | null },
    role: PoliticalPartyOrganizationRole,
    input: PartyOrganizationNewOrganizationInput,
  ): Promise<string> {
    const name = input.name?.trim() ?? ''
    if (!name) throw new BadRequestException('새 조직 이름을 입력하세요.')
    if (name.length > 200) throw new BadRequestException('조직 이름은 200자 이하여야 합니다.')
    let type = ROLE_DEFAULT_TYPE[role]
    if (input.type) {
      if (!(Object.values(OrganizationType) as string[]).includes(input.type)) {
        throw new BadRequestException(`조직 유형이 올바르지 않습니다: ${input.type}`)
      }
      type = input.type as OrganizationType
      if (EXCLUDED_ORG_TYPES.includes(type)) {
        throw new BadRequestException('기업·행정기관·정당 유형은 여기서 만들 수 없습니다.')
      }
    }
    const duplicate = await tx.organization.findFirst({ where: { name }, select: { id: true } })
    if (duplicate) throw new ConflictException(`「${name}」 조직이 이미 있습니다 — 목록에서 고르세요.`)
    const international = role === 'INTERNATIONAL_MEMBERSHIP'
    const created = await tx.organization.create({
      data: {
        name,
        localName: input.localName?.trim() || null,
        type,
        scope: international ? OrganizationScope.INTERNATIONAL : OrganizationScope.NATIONAL,
        countryId: international ? null : party.countryId,
        historicalCountryId: international ? null : party.historicalCountryId,
      },
      select: { id: true },
    })
    return created.id
  }

  private rethrowConflict(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('이 정당에 같은 조직이 같은 역할로 이미 이어져 있습니다.')
    }
  }
}
