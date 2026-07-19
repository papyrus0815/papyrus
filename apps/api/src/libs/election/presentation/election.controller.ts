import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import {
  ElectionType,
  LegislatureTermClosureKind,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { buildPartyResultComparisonVsPrevious } from '../domain/election-party-comparison.util'
import { findPreviousComparableElection } from '../domain/find-previous-election.util'
import { serializeElectionBigInt } from '../election-serialize.util'

const electionInclude = {
  country: { select: { id: true, name: true } },
  historicalCountry: { select: { id: true, name: true } },
  event: {
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      deletedAt: true,
    },
  },
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
  partyResults: {
    include: {
      party: {
        select: { id: true, name: true, shortName: true, brandColor: true },
      },
    },
    orderBy: { party: { name: 'asc' as const } },
  },
} satisfies Prisma.ElectionInclude

const ELECTION_TYPE_VALUES = new Set<string>(Object.values(ElectionType))
const CLOSURE_KIND_VALUES = new Set<string>(
  Object.values(LegislatureTermClosureKind),
)

export interface UpdateElectionBody {
  name?: string
  shortName?: string | null
  electionType?: string
  status?: string
  pollDate?: string
  pollEndDate?: string | null
  legislatureTermStart?: string | null
  legislatureTermEnd?: string | null
  resultingLegislatureClosureKind?: string | null
  resultingLegislatureClosureDate?: string | null
  resultingLegislatureDissolutionNotes?: string | null
  voterTurnoutPercent?: string | number | null
  totalSeats?: number | null
  countryId?: string | null
  historicalCountryId?: string | null
  scopeAdministrativeDivisionId?: string | null
  convocationOrdinal?: number | null
  description?: string | null
  eventId?: string | null
}

export interface CreateCandidacyBody {
  personId?: string | null
  partyId?: string | null
  electoralDistrictId?: string | null
  nominationType: string
  ballotOrder?: number | null
  listRank?: number | null
  withdrawnDate?: string | null
  notes?: string | null
}

export interface UpdateCandidacyBody {
  personId?: string | null
  partyId?: string | null
  electoralDistrictId?: string | null
  nominationType?: string
  ballotOrder?: number | null
  listRank?: number | null
  withdrawnDate?: string | null
  notes?: string | null
}

export interface UpsertCandidacyResultBody {
  votes?: string | null
  voteSharePercent?: string | null
  resultRank?: number | null
  elected?: boolean
  seatsWon?: number | null
  notes?: string | null
}

export interface CreateBallotOptionBody {
  label: string
  shortLabel?: string | null
  sortOrder?: number
  notes?: string | null
}

export interface UpdateBallotOptionBody {
  label?: string
  shortLabel?: string | null
  sortOrder?: number
  notes?: string | null
}

export interface UpsertBallotOptionResultBody {
  votes?: string | null
  voteSharePercent?: string | null
  notes?: string | null
}

export interface UpsertPartyResultBody {
  votes?: string | null
  voteSharePercent?: string | null
  seatsWon?: number | null
  notes?: string | null
}

export interface CreateElectionBody {
  name: string
  shortName?: string | null
  electionType: string
  status?: string
  pollDate: string
  pollEndDate?: string | null
  legislatureTermStart?: string | null
  legislatureTermEnd?: string | null
  resultingLegislatureClosureKind?: string | null
  resultingLegislatureClosureDate?: string | null
  resultingLegislatureDissolutionNotes?: string | null
  voterTurnoutPercent?: string | number | null
  totalSeats?: number | null
  countryId?: string | null
  historicalCountryId?: string | null
  scopeAdministrativeDivisionId?: string | null
  convocationOrdinal?: number | null
  description?: string | null
  /** 사건(Event) 정본 연결 */
  eventId?: string | null
  // accountId는 클라이언트가 지정할 수 없다 — 항상 JWT 주체에서 도출한다.
}

@ApiTags('elections')
@Controller('elections')
@UseGuards(AuthGuard('jwt'))
export class ElectionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    /** `true`이면 정당 집계(`ElectionPartyResult`)가 1건 이상인 선거만 */
    @Query('hasPartyResults') hasPartyResults?: string,
    /** 콤마로 구분한 `ElectionType` 값 (예: `PRESIDENTIAL_OR_HEAD,PARLIAMENTARY_PROPORTIONAL`) */
    @Query('electionTypes') electionTypesRaw?: string,
  ): Promise<any> {
    let where: Prisma.ElectionWhereInput = {}

    if (countryId) {
      // 현대 국가 → 연결된 역사 국가까지 OR 포함
      const linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
        .findMany({
          where: { modernCountryId: countryId },
          select: { historicalCountryId: true },
        })
        .then((rows) => rows.map((r) => r.historicalCountryId))

      if (linkedHistoricalIds.length > 0) {
        where = {
          OR: [
            { countryId },
            { historicalCountryId: { in: linkedHistoricalIds } },
          ],
        }
      } else {
        where.countryId = countryId
      }
    } else if (historicalCountryId) {
      where.historicalCountryId = historicalCountryId
    }

    if (hasPartyResults === 'true' || hasPartyResults === '1') {
      where.partyResults = { some: {} }
    }

    if (electionTypesRaw?.trim()) {
      const parts = electionTypesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const inTypes = parts.filter((p): p is ElectionType =>
        ELECTION_TYPE_VALUES.has(p),
      )
      if (parts.length > 0 && inTypes.length === 0) {
        where.id = { in: [] }
      } else if (inTypes.length === 1) {
        where.electionType = inTypes[0]
      } else if (inTypes.length > 1) {
        where.electionType = { in: inTypes }
      }
    }

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
  async listCandidacies(@Param('electionId') electionId: string): Promise<any> {
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
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Body()
    body: CreateCandidacyBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
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
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('candidacyId') candidacyId: string,
    @Body()
    body: UpdateCandidacyBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
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
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('candidacyId') candidacyId: string,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
    const existing = await this.prisma.electionCandidacy.findFirst({
      where: { id: candidacyId, electionId },
    })
    if (!existing) throw new NotFoundException('후보 정보를 찾을 수 없습니다.')
    await this.prisma.electionCandidacy.delete({ where: { id: candidacyId } })
  }

  @Put(':electionId/candidacies/:candidacyId/result')
  async upsertResult(
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('candidacyId') candidacyId: string,
    @Body()
    body: UpsertCandidacyResultBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
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
  async listBallotOptions(@Param('electionId') electionId: string): Promise<any> {
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
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Body()
    body: CreateBallotOptionBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
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
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('optionId') optionId: string,
    @Body()
    body: UpdateBallotOptionBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
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
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('optionId') optionId: string,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
    const existing = await this.prisma.electionBallotOption.findFirst({
      where: { id: optionId, electionId },
    })
    if (!existing) throw new NotFoundException('투표 안을 찾을 수 없습니다.')
    await this.prisma.electionBallotOption.delete({ where: { id: optionId } })
  }

  @Put(':electionId/ballot-options/:optionId/result')
  async upsertBallotOptionResult(
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('optionId') optionId: string,
    @Body()
    body: UpsertBallotOptionResultBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
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

  @Put(':electionId/party-results/:partyId')
  async upsertPartyResult(
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('partyId') partyId: string,
    @Body()
    body: UpsertPartyResultBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
    const party = await this.prisma.politicalParty.findUnique({ where: { id: partyId } })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')

    const votes =
      body.votes != null && body.votes !== '' ? BigInt(body.votes) : undefined

    const row = await this.prisma.electionPartyResult.upsert({
      where: {
        uq_election_party_result_election_party: { electionId, partyId },
      },
      create: {
        electionId,
        partyId,
        votes: votes ?? undefined,
        voteSharePercent:
          body.voteSharePercent != null && body.voteSharePercent !== ''
            ? new Prisma.Decimal(body.voteSharePercent)
            : undefined,
        seatsWon: body.seatsWon ?? undefined,
        notes: body.notes ?? undefined,
      },
      update: {
        votes:
          body.votes !== undefined
            ? body.votes != null && body.votes !== ''
              ? BigInt(body.votes)
              : null
            : undefined,
        voteSharePercent:
          body.voteSharePercent !== undefined
            ? body.voteSharePercent != null && body.voteSharePercent !== ''
              ? new Prisma.Decimal(body.voteSharePercent)
              : null
            : undefined,
        seatsWon: body.seatsWon !== undefined ? body.seatsWon : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
      include: {
        party: {
          select: { id: true, name: true, shortName: true, brandColor: true },
        },
      },
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':electionId/party-results/:partyId')
  async deletePartyResult(
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('partyId') partyId: string,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
    try {
      await this.prisma.electionPartyResult.delete({
        where: {
          uq_election_party_result_election_party: { electionId, partyId },
        },
      })
    } catch {
      throw new NotFoundException('정당 집계를 찾을 수 없습니다.')
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<any> {
    const row = await this.prisma.election.findUnique({
      where: { id },
      include: electionInclude,
    })
    if (!row) throw new NotFoundException('선거를 찾을 수 없습니다.')

    const previousElection = await findPreviousComparableElection(
      this.prisma,
      row,
    )
    let partyResultComparisonVsPrevious: ReturnType<
      typeof buildPartyResultComparisonVsPrevious
    > | null = null
    if (previousElection) {
      const prevFull = await this.prisma.election.findUnique({
        where: { id: previousElection.id },
        include: {
          partyResults: {
            include: {
              party: {
                select: {
                  id: true,
                  name: true,
                  shortName: true,
                  brandColor: true,
                },
              },
            },
            orderBy: { party: { name: 'asc' } },
          },
        },
      })
      if (prevFull) {
        partyResultComparisonVsPrevious = buildPartyResultComparisonVsPrevious(
          row,
          prevFull,
        )
      }
    }

    return serializeElectionBigInt({
      ...row,
      partyResultComparisonVsPrevious,
    })
  }

  @Post()
  async create(
    @Request() req: any,
    @Body()
    body: CreateElectionBody,
  ): Promise<any> {
    const accountId = this.actorAccountId(req)
    const row = await this.prisma.election.create({
      data: {
        name: body.name,
        shortName: body.shortName ?? undefined,
        electionType: body.electionType as any,
        status: (body.status as any) ?? undefined,
        pollDate: new Date(body.pollDate),
        pollEndDate: body.pollEndDate ? new Date(body.pollEndDate) : undefined,
        legislatureTermStart: body.legislatureTermStart
          ? new Date(body.legislatureTermStart)
          : undefined,
        legislatureTermEnd: body.legislatureTermEnd
          ? new Date(body.legislatureTermEnd)
          : undefined,
        resultingLegislatureClosureKind:
          body.resultingLegislatureClosureKind === undefined
            ? undefined
            : body.resultingLegislatureClosureKind === null
              ? null
              : this.parseClosureKind(body.resultingLegislatureClosureKind),
        resultingLegislatureClosureDate: body.resultingLegislatureClosureDate
          ? new Date(body.resultingLegislatureClosureDate)
          : undefined,
        resultingLegislatureDissolutionNotes:
          body.resultingLegislatureDissolutionNotes ?? undefined,
        voterTurnoutPercent:
          body.voterTurnoutPercent != null && body.voterTurnoutPercent !== ''
            ? new Prisma.Decimal(String(body.voterTurnoutPercent))
            : undefined,
        totalSeats: body.totalSeats ?? undefined,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
        scopeAdministrativeDivisionId: body.scopeAdministrativeDivisionId ?? undefined,
        convocationOrdinal: body.convocationOrdinal ?? undefined,
        description: body.description ?? undefined,
        eventId: body.eventId ?? undefined,
        // 소유자는 JWT 주체 고정 (body 값은 신뢰하지 않는다)
        accountId: accountId ?? undefined,
      },
      include: electionInclude,
    })
    return serializeElectionBigInt(row)
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: UpdateElectionBody,
  ): Promise<any> {
    await this.ensureElectionOwner(id, this.actorAccountId(req))
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.shortName !== undefined) data.shortName = body.shortName
    if (body.electionType !== undefined) data.electionType = body.electionType
    if (body.status !== undefined) data.status = body.status
    if (body.pollDate !== undefined) data.pollDate = new Date(body.pollDate)
    if (body.pollEndDate !== undefined)
      data.pollEndDate = body.pollEndDate ? new Date(body.pollEndDate) : null
    if (body.legislatureTermStart !== undefined)
      data.legislatureTermStart = body.legislatureTermStart
        ? new Date(body.legislatureTermStart)
        : null
    if (body.legislatureTermEnd !== undefined)
      data.legislatureTermEnd = body.legislatureTermEnd
        ? new Date(body.legislatureTermEnd)
        : null
    if (body.resultingLegislatureClosureKind !== undefined) {
      data.resultingLegislatureClosureKind =
        body.resultingLegislatureClosureKind === null ||
        body.resultingLegislatureClosureKind === ''
          ? null
          : this.parseClosureKind(body.resultingLegislatureClosureKind)
    }
    if (body.resultingLegislatureClosureDate !== undefined)
      data.resultingLegislatureClosureDate = body.resultingLegislatureClosureDate
        ? new Date(body.resultingLegislatureClosureDate)
        : null
    if (body.resultingLegislatureDissolutionNotes !== undefined)
      data.resultingLegislatureDissolutionNotes =
        body.resultingLegislatureDissolutionNotes
    if (body.voterTurnoutPercent !== undefined)
      data.voterTurnoutPercent =
        body.voterTurnoutPercent != null && body.voterTurnoutPercent !== ''
          ? new Prisma.Decimal(String(body.voterTurnoutPercent))
          : null
    if (body.totalSeats !== undefined) data.totalSeats = body.totalSeats
    if (body.countryId !== undefined) data.countryId = body.countryId
    if (body.historicalCountryId !== undefined) data.historicalCountryId = body.historicalCountryId
    if (body.scopeAdministrativeDivisionId !== undefined)
      data.scopeAdministrativeDivisionId = body.scopeAdministrativeDivisionId
    if (body.convocationOrdinal !== undefined) data.convocationOrdinal = body.convocationOrdinal
    if (body.description !== undefined) data.description = body.description
    if (body.eventId !== undefined) data.eventId = body.eventId

    const row = await this.prisma.election.update({
      where: { id },
      data: data as any,
      include: electionInclude,
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string): Promise<any> {
    await this.ensureElectionOwner(id, this.actorAccountId(req))
    await this.prisma.election.delete({ where: { id } })
  }

  private async ensureElection(id: string) {
    const e = await this.prisma.election.findUnique({ where: { id }, select: { id: true } })
    if (!e) throw new NotFoundException('선거를 찾을 수 없습니다.')
  }

  /** JWT 주체의 계정 ID (jwt.strategy가 id·userId 둘 다 실어 준다) */
  private actorAccountId(req: any): string | undefined {
    return req?.user?.id ?? req?.user?.sub
  }

  /**
   * 쓰기 전 소유 검증 — 본인이 등록한 선거만 수정/삭제할 수 있다.
   * (역사적 국가 도메인의 403 패턴과 동일. 하위 리소스 쓰기도 부모 선거 소유자로 게이트한다.)
   */
  private async ensureElectionOwner(id: string, accountId?: string) {
    const election = await this.prisma.election.findUnique({
      where: { id },
      select: { id: true, accountId: true },
    })
    if (!election) throw new NotFoundException('선거를 찾을 수 없습니다.')
    // 주체를 특정할 수 없으면(토큰에 sub 없음) 통과시키지 않는다 — 우회 경로 차단
    if (accountId == null || election.accountId !== accountId) {
      throw new ForbiddenException('본인이 등록한 선거만 수정·삭제할 수 있습니다.')
    }
  }

  private parseClosureKind(
    raw: string | undefined | null,
  ): LegislatureTermClosureKind | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined
    if (!CLOSURE_KIND_VALUES.has(raw)) {
      throw new BadRequestException(`유효하지 않은 의회 종료 유형입니다: ${raw}`)
    }
    return raw as LegislatureTermClosureKind
  }
}
