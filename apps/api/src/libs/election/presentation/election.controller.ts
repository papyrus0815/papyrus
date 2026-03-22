import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { serializeElectionBigInt } from '../election-serialize.util'

const electionInclude = {
  candidacies: {
    include: {
      person: { select: { id: true, name: true, surname: true } },
      party: { select: { id: true, name: true, shortName: true } },
      electoralDistrict: { select: { id: true, name: true, code: true } },
      result: true,
    },
    orderBy: { id: 'asc' as const },
  },
  ballotOptions: {
    include: { result: true },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.ElectionInclude

@ApiTags('elections')
@Controller('elections')
@UseGuards(AuthGuard('jwt'))
export class ElectionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ) {
    const where: Prisma.ElectionWhereInput = {}
    if (countryId) where.countryId = countryId
    if (historicalCountryId) where.historicalCountryId = historicalCountryId
    const rows = await this.prisma.election.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { pollDate: 'desc' },
      include: {
        candidacies: { select: { id: true } },
        ballotOptions: { select: { id: true } },
      },
    })
    return serializeElectionBigInt(rows)
  }

  @Get(':electionId/candidacies')
  async listCandidacies(@Param('electionId') electionId: string) {
    const rows = await this.prisma.electionCandidacy.findMany({
      where: { electionId },
      include: {
        person: { select: { id: true, name: true, surname: true } },
        party: { select: { id: true, name: true, shortName: true } },
        electoralDistrict: { select: { id: true, name: true, code: true } },
        result: true,
      },
      orderBy: [{ ballotOrder: 'asc' as const }, { id: 'asc' as const }],
    })
    return serializeElectionBigInt(rows)
  }

  @Post(':electionId/candidacies')
  async createCandidacy(
    @Param('electionId') electionId: string,
    @Body()
    body: {
      personId?: string | null
      partyId?: string | null
      electoralDistrictId?: string | null
      nominationType: string
      ballotOrder?: number | null
      listRank?: number | null
      withdrawnDate?: string | null
      notes?: string | null
    },
  ) {
    await this.ensureElection(electionId)
    const row = await this.prisma.electionCandidacy.create({
      data: {
        electionId,
        personId: body.personId ?? undefined,
        partyId: body.partyId ?? undefined,
        electoralDistrictId: body.electoralDistrictId ?? undefined,
        nominationType: body.nominationType as any,
        ballotOrder: body.ballotOrder ?? undefined,
        listRank: body.listRank ?? undefined,
        withdrawnDate: body.withdrawnDate ? new Date(body.withdrawnDate) : undefined,
        notes: body.notes ?? undefined,
      },
      include: {
        person: { select: { id: true, name: true, surname: true } },
        party: { select: { id: true, name: true, shortName: true } },
        electoralDistrict: { select: { id: true, name: true, code: true } },
        result: true,
      },
    })
    return serializeElectionBigInt(row)
  }

  @Patch(':electionId/candidacies/:candidacyId')
  async updateCandidacy(
    @Param('electionId') electionId: string,
    @Param('candidacyId') candidacyId: string,
    @Body()
    body: Partial<{
      personId: string | null
      partyId: string | null
      electoralDistrictId: string | null
      nominationType: string
      ballotOrder: number | null
      listRank: number | null
      withdrawnDate: string | null
      notes: string | null
    }>,
  ) {
    const existing = await this.prisma.electionCandidacy.findFirst({
      where: { id: candidacyId, electionId },
    })
    if (!existing) throw new NotFoundException('후보 정보를 찾을 수 없습니다.')
    const data: Record<string, unknown> = {}
    if (body.personId !== undefined) data.personId = body.personId
    if (body.partyId !== undefined) data.partyId = body.partyId
    if (body.electoralDistrictId !== undefined) data.electoralDistrictId = body.electoralDistrictId
    if (body.nominationType !== undefined) data.nominationType = body.nominationType
    if (body.ballotOrder !== undefined) data.ballotOrder = body.ballotOrder
    if (body.listRank !== undefined) data.listRank = body.listRank
    if (body.withdrawnDate !== undefined)
      data.withdrawnDate = body.withdrawnDate ? new Date(body.withdrawnDate) : null
    if (body.notes !== undefined) data.notes = body.notes

    const row = await this.prisma.electionCandidacy.update({
      where: { id: candidacyId },
      data: data as any,
      include: {
        person: { select: { id: true, name: true, surname: true } },
        party: { select: { id: true, name: true, shortName: true } },
        electoralDistrict: { select: { id: true, name: true, code: true } },
        result: true,
      },
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':electionId/candidacies/:candidacyId')
  async deleteCandidacy(
    @Param('electionId') electionId: string,
    @Param('candidacyId') candidacyId: string,
  ) {
    const existing = await this.prisma.electionCandidacy.findFirst({
      where: { id: candidacyId, electionId },
    })
    if (!existing) throw new NotFoundException('후보 정보를 찾을 수 없습니다.')
    await this.prisma.electionCandidacy.delete({ where: { id: candidacyId } })
  }

  @Put(':electionId/candidacies/:candidacyId/result')
  async upsertResult(
    @Param('electionId') electionId: string,
    @Param('candidacyId') candidacyId: string,
    @Body()
    body: {
      votes?: string | null
      voteSharePercent?: string | null
      resultRank?: number | null
      elected?: boolean
      seatsWon?: number | null
      notes?: string | null
    },
  ) {
    const existing = await this.prisma.electionCandidacy.findFirst({
      where: { id: candidacyId, electionId },
    })
    if (!existing) throw new NotFoundException('후보 정보를 찾을 수 없습니다.')

    const votes =
      body.votes != null && body.votes !== '' ? BigInt(body.votes) : undefined

    const row = await this.prisma.electionResult.upsert({
      where: { candidacyId },
      create: {
        candidacyId,
        votes: votes ?? undefined,
        voteSharePercent:
          body.voteSharePercent != null && body.voteSharePercent !== ''
            ? new Prisma.Decimal(body.voteSharePercent)
            : undefined,
        resultRank: body.resultRank ?? undefined,
        elected: body.elected ?? false,
        seatsWon: body.seatsWon ?? undefined,
        notes: body.notes ?? undefined,
      },
      update: {
        votes: votes !== undefined ? votes : undefined,
        voteSharePercent:
          body.voteSharePercent !== undefined
            ? body.voteSharePercent != null && body.voteSharePercent !== ''
              ? new Prisma.Decimal(body.voteSharePercent)
              : null
            : undefined,
        resultRank: body.resultRank !== undefined ? body.resultRank : undefined,
        elected: body.elected !== undefined ? body.elected : undefined,
        seatsWon: body.seatsWon !== undefined ? body.seatsWon : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    })
    return serializeElectionBigInt(row)
  }

  @Get(':electionId/ballot-options')
  async listBallotOptions(@Param('electionId') electionId: string) {
    await this.ensureElection(electionId)
    const rows = await this.prisma.electionBallotOption.findMany({
      where: { electionId },
      include: { result: true },
      orderBy: { sortOrder: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Post(':electionId/ballot-options')
  async createBallotOption(
    @Param('electionId') electionId: string,
    @Body()
    body: {
      label: string
      shortLabel?: string | null
      sortOrder?: number
      notes?: string | null
    },
  ) {
    await this.ensureElection(electionId)
    const row = await this.prisma.electionBallotOption.create({
      data: {
        electionId,
        label: body.label,
        shortLabel: body.shortLabel ?? undefined,
        sortOrder: body.sortOrder ?? 0,
        notes: body.notes ?? undefined,
      },
      include: { result: true },
    })
    return serializeElectionBigInt(row)
  }

  @Patch(':electionId/ballot-options/:optionId')
  async updateBallotOption(
    @Param('electionId') electionId: string,
    @Param('optionId') optionId: string,
    @Body()
    body: Partial<{
      label: string
      shortLabel: string | null
      sortOrder: number
      notes: string | null
    }>,
  ) {
    const existing = await this.prisma.electionBallotOption.findFirst({
      where: { id: optionId, electionId },
    })
    if (!existing) throw new NotFoundException('투표 안을 찾을 수 없습니다.')
    const data: Record<string, unknown> = {}
    if (body.label !== undefined) data.label = body.label
    if (body.shortLabel !== undefined) data.shortLabel = body.shortLabel
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    if (body.notes !== undefined) data.notes = body.notes
    const row = await this.prisma.electionBallotOption.update({
      where: { id: optionId },
      data: data as any,
      include: { result: true },
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':electionId/ballot-options/:optionId')
  async deleteBallotOption(
    @Param('electionId') electionId: string,
    @Param('optionId') optionId: string,
  ) {
    const existing = await this.prisma.electionBallotOption.findFirst({
      where: { id: optionId, electionId },
    })
    if (!existing) throw new NotFoundException('투표 안을 찾을 수 없습니다.')
    await this.prisma.electionBallotOption.delete({ where: { id: optionId } })
  }

  @Put(':electionId/ballot-options/:optionId/result')
  async upsertBallotOptionResult(
    @Param('electionId') electionId: string,
    @Param('optionId') optionId: string,
    @Body()
    body: {
      votes?: string | null
      voteSharePercent?: string | null
      notes?: string | null
    },
  ) {
    const opt = await this.prisma.electionBallotOption.findFirst({
      where: { id: optionId, electionId },
    })
    if (!opt) throw new NotFoundException('투표 안을 찾을 수 없습니다.')
    const votes =
      body.votes != null && body.votes !== '' ? BigInt(body.votes) : undefined

    const row = await this.prisma.electionBallotOptionResult.upsert({
      where: { ballotOptionId: optionId },
      create: {
        ballotOptionId: optionId,
        votes: votes ?? undefined,
        voteSharePercent:
          body.voteSharePercent != null && body.voteSharePercent !== ''
            ? new Prisma.Decimal(body.voteSharePercent)
            : undefined,
        notes: body.notes ?? undefined,
      },
      update: {
        votes: votes !== undefined ? votes : undefined,
        voteSharePercent:
          body.voteSharePercent !== undefined
            ? body.voteSharePercent != null && body.voteSharePercent !== ''
              ? new Prisma.Decimal(body.voteSharePercent)
              : null
            : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    })
    return serializeElectionBigInt(row)
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const row = await this.prisma.election.findUnique({
      where: { id },
      include: electionInclude,
    })
    if (!row) throw new NotFoundException('선거를 찾을 수 없습니다.')
    return serializeElectionBigInt(row)
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string
      shortName?: string | null
      electionType: string
      status?: string
      pollDate: string
      pollEndDate?: string | null
      countryId?: string | null
      historicalCountryId?: string | null
      scopeAdministrativeDivisionId?: string | null
      description?: string | null
      notes?: string | null
      accountId?: string | null
    },
  ) {
    const row = await this.prisma.election.create({
      data: {
        name: body.name,
        shortName: body.shortName ?? undefined,
        electionType: body.electionType as any,
        status: (body.status as any) ?? undefined,
        pollDate: new Date(body.pollDate),
        pollEndDate: body.pollEndDate ? new Date(body.pollEndDate) : undefined,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
        scopeAdministrativeDivisionId: body.scopeAdministrativeDivisionId ?? undefined,
        description: body.description ?? undefined,
        notes: body.notes ?? undefined,
        accountId: body.accountId ?? undefined,
      },
      include: electionInclude,
    })
    return serializeElectionBigInt(row)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string
      shortName: string | null
      electionType: string
      status: string
      pollDate: string
      pollEndDate: string | null
      countryId: string | null
      historicalCountryId: string | null
      scopeAdministrativeDivisionId: string | null
      description: string | null
      notes: string | null
    }>,
  ) {
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.shortName !== undefined) data.shortName = body.shortName
    if (body.electionType !== undefined) data.electionType = body.electionType
    if (body.status !== undefined) data.status = body.status
    if (body.pollDate !== undefined) data.pollDate = new Date(body.pollDate)
    if (body.pollEndDate !== undefined)
      data.pollEndDate = body.pollEndDate ? new Date(body.pollEndDate) : null
    if (body.countryId !== undefined) data.countryId = body.countryId
    if (body.historicalCountryId !== undefined) data.historicalCountryId = body.historicalCountryId
    if (body.scopeAdministrativeDivisionId !== undefined)
      data.scopeAdministrativeDivisionId = body.scopeAdministrativeDivisionId
    if (body.description !== undefined) data.description = body.description
    if (body.notes !== undefined) data.notes = body.notes

    const row = await this.prisma.election.update({
      where: { id },
      data: data as any,
      include: electionInclude,
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.election.delete({ where: { id } })
  }

  private async ensureElection(id: string) {
    const e = await this.prisma.election.findUnique({ where: { id }, select: { id: true } })
    if (!e) throw new NotFoundException('선거를 찾을 수 없습니다.')
  }
}
