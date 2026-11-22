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
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@prisma/prisma.service'
import { Request } from 'express'
import { serializeElectionBigInt } from '../election-serialize.util'
import { CreatePartyMembershipDto } from './dto/create-party-membership.dto'
import { UpdatePartyMembershipDto } from './dto/update-party-membership.dto'
import {
  assertMembershipWithinPersonLifespan,
} from './party-membership-dates.util'
import {
  type StructuredDateColumns,
  type StructuredDateInput,
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  readStructuredDate,
  structuredDateData,
  structuredDateFromLegacyIso,
  structuredDateMirror,
} from '../domain/party-structured-date.util'
import { removePartyCitations } from '../domain/party-evidence.util'

/**
 * 인물별 정당 소속·선거 후보 (persons 라우트 보조)
 */
@ApiTags('persons')
@Controller('persons')
@UseGuards(AuthGuard('jwt'))
export class PersonElectionController {
  constructor(private readonly prisma: PrismaService) {}

  private async ensurePersonOwned(personId: string, req: Request) {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    if (!accountId) throw new UnauthorizedException()
    const person = await this.prisma.person.findFirst({
      where: { id: personId, accountId },
      select: {
        id: true,
        birthDate: true,
        birthEra: true,
        isBirthDateUnknown: true,
        deathDate: true,
        deathEra: true,
        isDeathDateUnknown: true,
        isAlive: true,
      },
    })
    if (!person) throw new NotFoundException('인물을 찾을 수 없거나 권한이 없습니다.')
    return person
  }

  private async ensurePartyExists(partyId: string) {
    if (!this.prisma.politicalParty?.findUnique) return
    const party = await this.prisma.politicalParty.findUnique({
      where: { id: partyId },
      select: { id: true },
    })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }

  @Get(':personId/political-party-memberships')
  @ApiOperation({ summary: '인물 당원 소속 목록' })
  async listMemberships(@Param('personId') personId: string, @Req() req: Request): Promise<any> {
    await this.ensurePersonOwned(personId, req)
    const rows = await this.prisma.politicalPartyMembership.findMany({
      where: { personId },
      include: {
        party: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: { startDate: 'desc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Post(':personId/political-party-memberships')
  @ApiOperation({ summary: '당원 소속 추가' })
  @ApiBody({ type: CreatePartyMembershipDto })
  async createMembership(
    @Param('personId') personId: string,
    @Req() req: Request,
    @Body() body: CreatePartyMembershipDto,
  ): Promise<any> {
    const person = await this.ensurePersonOwned(personId, req)
    await this.ensurePartyExists(body.partyId)

    const start = this.resolveMembershipDate(body.start, body.startDate, '소속 시작') ?? readStructuredDate({}, 'start')
    const end = this.resolveMembershipDate(body.end, body.endDate, '소속 끝') ?? readStructuredDate({}, 'end')
    assertStructuredRangeOrder(start, end, '종료일은 시작일 이후여야 합니다.')
    assertMembershipWithinPersonLifespan(structuredDateMirror(start), structuredDateMirror(end), person)

    const roleCategory =
      body.roleCategory != null ? body.roleCategory : undefined
    const isLeadership = roleCategory === 'LEADERSHIP'

    const row = await this.prisma.politicalPartyMembership.create({
      data: {
        personId,
        partyId: body.partyId,
        ...this.membershipDateData('start', start),
        ...this.membershipDateData('end', end),
        roleCategory: roleCategory as any ?? undefined,
        leadershipTier: isLeadership
          ? body.leadershipTier != null
            ? (body.leadershipTier as any)
            : undefined
          : null,
        /* 당직 종류·대수는 지도부일 때만 의미 — 아니면 비운다 */
        officeKind: isLeadership ? (body.officeKind ?? null) : null,
        officeOrdinal: isLeadership ? (body.officeOrdinal ?? null) : null,
        isFounder: body.isFounder ?? false,
        roleTitle: body.roleTitle ?? undefined,
        notes: body.notes ?? undefined,
      },
      include: {
        party: { select: { id: true, name: true, shortName: true } },
      },
    })
    return serializeElectionBigInt(row)
  }

  @Patch(':personId/political-party-memberships/:membershipId')
  @ApiOperation({ summary: '당원 소속 수정' })
  @ApiBody({ type: UpdatePartyMembershipDto })
  async updateMembership(
    @Param('personId') personId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: Request,
    @Body() body: UpdatePartyMembershipDto,
  ): Promise<any> {
    const person = await this.ensurePersonOwned(personId, req)
    const existing = await this.prisma.politicalPartyMembership.findFirst({
      where: { id: membershipId, personId },
    })
    if (!existing) throw new NotFoundException('당원 기록을 찾을 수 없습니다.')
    if (body.partyId !== undefined) {
      await this.ensurePartyExists(body.partyId)
    }

    const startInput = this.resolveMembershipDate(body.start, body.startDate, '소속 시작')
    const endInput = this.resolveMembershipDate(body.end, body.endDate, '소속 끝')
    const nextStart = startInput ?? readStructuredDate(existing, 'start')
    const nextEnd = endInput ?? readStructuredDate(existing, 'end')
    assertStructuredRangeOrder(nextStart, nextEnd, '종료일은 시작일 이후여야 합니다.')
    assertMembershipWithinPersonLifespan(structuredDateMirror(nextStart), structuredDateMirror(nextEnd), person)

    const data: Record<string, unknown> = {}
    if (body.partyId !== undefined) data.partyId = body.partyId
    if (startInput) Object.assign(data, this.membershipDateData('start', startInput))
    if (endInput) Object.assign(data, this.membershipDateData('end', endInput))

    const roleCategoryInBody = body.roleCategory !== undefined
    const leadershipTierInBody = body.leadershipTier !== undefined

    if (roleCategoryInBody) {
      data.roleCategory = body.roleCategory as any
    }

    const effectiveRole = roleCategoryInBody
      ? body.roleCategory
      : existing.roleCategory

    if (effectiveRole !== 'LEADERSHIP') {
      /* 지도부가 아니면 당직 칸은 비운다 */
      if (roleCategoryInBody) {
        data.officeKind = null
        data.officeOrdinal = null
      }
    } else {
      if (body.officeKind !== undefined) data.officeKind = body.officeKind ?? null
      if (body.officeOrdinal !== undefined) data.officeOrdinal = body.officeOrdinal ?? null
    }
    if (body.isFounder !== undefined) data.isFounder = body.isFounder

    if (roleCategoryInBody && body.roleCategory !== 'LEADERSHIP') {
      data.leadershipTier = null
    } else if (leadershipTierInBody) {
      if (effectiveRole === 'LEADERSHIP') {
        data.leadershipTier = body.leadershipTier
          ? (body.leadershipTier as any)
          : null
      } else {
        data.leadershipTier = null
      }
    }
    if (body.roleTitle !== undefined) data.roleTitle = body.roleTitle
    if (body.notes !== undefined) data.notes = body.notes

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('변경할 항목이 없습니다.')
    }

    const row = await this.prisma.politicalPartyMembership.update({
      where: { id: membershipId },
      data: data as any,
      include: {
        party: { select: { id: true, name: true, shortName: true } },
      },
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':personId/political-party-memberships/:membershipId')
  @ApiOperation({ summary: '당원 소속 삭제' })
  async deleteMembership(
    @Param('personId') personId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: Request,
  ): Promise<any> {
    await this.ensurePersonOwned(personId, req)
    const existing = await this.prisma.politicalPartyMembership.findFirst({
      where: { id: membershipId, personId },
    })
    if (!existing) throw new NotFoundException('당원 기록을 찾을 수 없습니다.')
    await this.prisma.$transaction(async (tx) => {
      await removePartyCitations(tx, 'PARTY_MEMBERSHIP', [membershipId])
      await tx.politicalPartyMembership.delete({ where: { id: membershipId } })
    })
  }

  /** 구조화(start)가 정본, 없으면 레거시 ISO(startDate). 둘 다 undefined면 undefined(건드리지 않음) */
  private resolveMembershipDate(
    structured: StructuredDateInput | null | undefined,
    legacyIso: string | null | undefined,
    fieldLabel: string,
  ): StructuredDateColumns | undefined {
    if (structured !== undefined) return parseStructuredDateInput(structured, fieldLabel)
    if (legacyIso !== undefined) return structuredDateFromLegacyIso(legacyIso, fieldLabel)
    return undefined
  }

  /** 구조화 칸 + DATETIME 거울(startDate/endDate — 재임 겹침·정렬이 읽는다) */
  private membershipDateData(prefix: 'start' | 'end', columns: StructuredDateColumns) {
    return { ...structuredDateData(prefix, columns), [`${prefix}Date`]: structuredDateMirror(columns) }
  }

  @Get(':personId/election-candidacies')
  @ApiOperation({ summary: '인물 선거 후보 이력' })
  async listCandidacies(@Param('personId') personId: string, @Req() req: Request): Promise<any> {
    await this.ensurePersonOwned(personId, req)
    const rows = await this.prisma.electionCandidacy.findMany({
      where: { personId },
      include: {
        party: { select: { id: true, name: true, shortName: true } },
        electoralDistrict: { select: { id: true, name: true, code: true } },
        election: {
          select: {
            id: true,
            name: true,
            shortName: true,
            pollDate: true,
            electionType: true,
            countryId: true,
            historicalCountryId: true,
          },
        },
        result: true,
      },
      orderBy: { election: { pollDate: 'desc' } },
    })
    return serializeElectionBigInt(rows)
  }
}
