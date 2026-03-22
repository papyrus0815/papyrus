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
  assertMembershipStartBeforeEnd,
  membershipInputToDate,
} from './party-membership-dates.util'

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
    })
    if (!person) throw new NotFoundException('인물을 찾을 수 없거나 권한이 없습니다.')
  }

  @Get(':personId/political-party-memberships')
  @ApiOperation({ summary: '인물 당원 소속 목록' })
  async listMemberships(@Param('personId') personId: string, @Req() req: Request) {
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
  ) {
    await this.ensurePersonOwned(personId, req)

    const startParsed = membershipInputToDate(
      body.startDate,
      body.startDate !== undefined,
    )
    const endParsed = membershipInputToDate(body.endDate, body.endDate !== undefined)
    assertMembershipStartBeforeEnd(
      startParsed === undefined ? null : startParsed,
      endParsed === undefined ? null : endParsed,
    )

    const roleCategory =
      body.roleCategory != null ? body.roleCategory : undefined
    const isLeadership = roleCategory === 'LEADERSHIP'

    const row = await this.prisma.politicalPartyMembership.create({
      data: {
        personId,
        partyId: body.partyId,
        startDate: startParsed === undefined ? undefined : startParsed,
        endDate: endParsed === undefined ? undefined : endParsed,
        roleCategory: roleCategory as any ?? undefined,
        leadershipTier: isLeadership
          ? body.leadershipTier != null
            ? (body.leadershipTier as any)
            : undefined
          : null,
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
  ) {
    await this.ensurePersonOwned(personId, req)
    const existing = await this.prisma.politicalPartyMembership.findFirst({
      where: { id: membershipId, personId },
    })
    if (!existing) throw new NotFoundException('당원 기록을 찾을 수 없습니다.')

    const startWas = body.startDate !== undefined
    const endWas = body.endDate !== undefined
    const startParsed = membershipInputToDate(body.startDate, startWas)
    const endParsed = membershipInputToDate(body.endDate, endWas)
    const nextStart = startWas ? startParsed ?? null : existing.startDate
    const nextEnd = endWas ? endParsed ?? null : existing.endDate
    assertMembershipStartBeforeEnd(nextStart, nextEnd)

    const data: Record<string, unknown> = {}
    if (body.partyId !== undefined) data.partyId = body.partyId
    if (startWas) data.startDate = startParsed ?? null
    if (endWas) data.endDate = endParsed ?? null

    const roleCategoryInBody = body.roleCategory !== undefined
    const leadershipTierInBody = body.leadershipTier !== undefined

    if (roleCategoryInBody) {
      data.roleCategory = body.roleCategory as any
    }

    const effectiveRole = roleCategoryInBody
      ? body.roleCategory
      : existing.roleCategory

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
  ) {
    await this.ensurePersonOwned(personId, req)
    const existing = await this.prisma.politicalPartyMembership.findFirst({
      where: { id: membershipId, personId },
    })
    if (!existing) throw new NotFoundException('당원 기록을 찾을 수 없습니다.')
    await this.prisma.politicalPartyMembership.delete({ where: { id: membershipId } })
  }

  @Get(':personId/election-candidacies')
  @ApiOperation({ summary: '인물 선거 후보 이력' })
  async listCandidacies(@Param('personId') personId: string, @Req() req: Request) {
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
