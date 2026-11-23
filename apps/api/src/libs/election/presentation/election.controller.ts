import {
  BadRequestException,
  Body,
  ConflictException,
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
  OrganizationScope,
  OrganizationType,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { EventService } from '../../event/application/event.service'
import { assertEventOwnership } from '../../event/domain/event-ownership'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'
import { buildPartyResultComparisonVsPrevious } from '../domain/election-party-comparison.util'
import { findPreviousComparableElection } from '../domain/find-previous-election.util'
import { areJurisdictionsCompatible } from '../domain/law-jurisdiction.util'
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
      // 이름 순서(동양식/서양식) 판정에 필요한 필드까지 — 표시 쪽이 getPersonDisplayName으로 조합한다
      person: {
        select: {
          id: true,
          name: true,
          surname: true,
          middleName: true,
          nameDisplayOrder: true,
          country: { select: { defaultNameDisplayOrder: true } },
        },
      },
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
  chamber: {
    select: {
      id: true,
      name: true,
      localName: true,
      role: true,
      composition: true,
      sizes: { orderBy: { startYear: 'asc' as const } },
    },
  },
  alliances: {
    orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }],
    include: {
      allianceOrganization: { select: { id: true, name: true, shortName: true } },
    },
  },
} satisfies Prisma.ElectionInclude

/** 연합 표시 색 — #RRGGBB만(좌석도 묶음 선) */
const ALLIANCE_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

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
  /** 어느 원의 선거인가 — 원 카탈로그(chamber.id). null이면 끊는다 */
  chamberId?: string | null
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
  /** 이 선거의 선거 연합 id — null이면 연합에서 뺀다 */
  allianceId?: string | null
}

export interface CreateElectionAllianceBody {
  name: string
  shortName?: string | null
  /** #RRGGBB */
  color?: string | null
  sortOrder?: number
  notes?: string | null
  /** 소속 정당 id — 이 선거에 정당 집계가 있는 정당만. 다른 연합에 있던 정당은 옮겨 온다 */
  memberPartyIds?: string[]
  /** 지속 연합(정치 연합 조직) — 여러 선거에 걸친 연합의 이번 회차일 때. null이면 끊는다 */
  allianceOrganizationId?: string | null
  /** 지속 연합 조직을 이 이름으로 새로 만들어 잇는다(allianceOrganizationId보다 우선) */
  newAllianceOrganizationName?: string | null
}

export interface UpdateElectionAllianceBody {
  name?: string
  shortName?: string | null
  color?: string | null
  sortOrder?: number
  notes?: string | null
  /** 주면 소속을 이 목록으로 통째 바꾼다(빠진 정당은 연합 없음으로) */
  memberPartyIds?: string[]
  allianceOrganizationId?: string | null
  newAllianceOrganizationName?: string | null
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
  /** 어느 원의 선거인가 — 원 카탈로그(chamber.id). null이면 끊는다 */
  chamberId?: string | null
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

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

    if (historicalCountryId) {
      where.historicalCountryId = historicalCountryId
    } else if (countryId) {
      // 현대 국가 → 연결된 역사 국가까지 OR 포함(브리지 스코프 공용 헬퍼)
      where = (await resolveCountryScopeOr(
        this.prisma,
        countryId,
      )) as Prisma.ElectionWhereInput
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
        // 목록에서 소속 국가(현대/역사) 이름·id 요약 — 프론트가 별도 조회 없이
        // 어느 FK가 찼는지로 현대/역사 판별 가능(검토서 F13)
        country: { select: { id: true, name: true } },
        historicalCountry: { select: { id: true, name: true } },
        candidacies: { select: { id: true } },
        ballotOptions: { select: { id: true } },
        // 연결 사건 요약 — 사건 쪽 '선거 연결' 후보가 '이미 ‘X’에 연결됨'을 보이게(한 선거=한 사건이라 고르면 옮겨 간다)
        event: { select: { id: true, title: true, deletedAt: true } },
      },
    })
    return serializeElectionBigInt(
      rows.map((r) => this.sanitizeElectionEvent(r)),
    )
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
    const election = await this.ensureElectionOwner(
      electionId,
      this.actorAccountId(req),
    )
    await this.validateCandidacyReferences(election, {
      personId: body.personId,
      partyId: body.partyId,
      electoralDistrictId: body.electoralDistrictId,
    })

    const row = await this.prisma.electionCandidacy.create({
      data: {
        electionId,
        personId: body.personId ?? undefined,
        partyId: body.partyId ?? undefined,
        electoralDistrictId: body.electoralDistrictId ?? undefined,
        nominationType: body.nominationType as any,
        ballotOrder: body.ballotOrder ?? undefined,
        listRank: body.listRank ?? undefined,
        withdrawnDate: body.withdrawnDate
          ? this.parseDateOrThrow(body.withdrawnDate, '사퇴일')
          : undefined,
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
    const election = await this.ensureElectionOwner(
      electionId,
      this.actorAccountId(req),
    )
    const existing = await this.prisma.electionCandidacy.findFirst({
      where: { id: candidacyId, electionId },
    })
    if (!existing) throw new NotFoundException('후보 정보를 찾을 수 없습니다.')

    await this.validateCandidacyReferences(election, {
      personId: body.personId,
      partyId: body.partyId,
      electoralDistrictId: body.electoralDistrictId,
    })

    const data: Record<string, unknown> = {}
    if (body.personId !== undefined) data.personId = body.personId
    if (body.partyId !== undefined) data.partyId = body.partyId
    if (body.electoralDistrictId !== undefined) data.electoralDistrictId = body.electoralDistrictId
    if (body.nominationType !== undefined) data.nominationType = body.nominationType
    if (body.ballotOrder !== undefined) data.ballotOrder = body.ballotOrder
    if (body.listRank !== undefined) data.listRank = body.listRank
    if (body.withdrawnDate !== undefined)
      data.withdrawnDate = body.withdrawnDate
        ? this.parseDateOrThrow(body.withdrawnDate, '사퇴일')
        : null
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

    const votes = this.parseOptionalNonNegativeBigInt(body.votes)
    const voteShareDecimal = this.parseOptionalPercentageDecimal(
      body.voteSharePercent,
      '득표율',
    )
    if (body.seatsWon != null && body.seatsWon < 0) {
      throw new BadRequestException('의석수는 0 이상이어야 합니다.')
    }
    if (body.resultRank != null && body.resultRank < 1) {
      throw new BadRequestException('순위는 1 이상이어야 합니다.')
    }

    const row = await this.prisma.electionResult.upsert({
      where: { candidacyId },
      create: {
        candidacyId,
        votes: votes ?? undefined,
        voteSharePercent: voteShareDecimal ?? undefined,
        resultRank: body.resultRank ?? undefined,
        elected: body.elected ?? false,
        seatsWon: body.seatsWon ?? undefined,
        notes: body.notes ?? undefined,
      },
      update: {
        votes: votes !== undefined ? votes : undefined,
        voteSharePercent:
          body.voteSharePercent !== undefined ? voteShareDecimal : undefined,
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
    const votes = this.parseOptionalNonNegativeBigInt(body.votes)
    const voteShareDecimal = this.parseOptionalPercentageDecimal(
      body.voteSharePercent,
      '득표율',
    )

    const row = await this.prisma.electionBallotOptionResult.upsert({
      where: { ballotOptionId: optionId },
      create: {
        ballotOptionId: optionId,
        votes: votes ?? undefined,
        voteSharePercent: voteShareDecimal ?? undefined,
        notes: body.notes ?? undefined,
      },
      update: {
        votes: votes !== undefined ? votes : undefined,
        voteSharePercent:
          body.voteSharePercent !== undefined ? voteShareDecimal : undefined,
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
    const election = await this.ensureElectionOwner(
      electionId,
      this.actorAccountId(req),
    )
    const party = await this.prisma.politicalParty.findUnique({ where: { id: partyId } })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')

    const partyCompatible = await areJurisdictionsCompatible(
      this.prisma,
      {
        countryId: election.countryId ?? null,
        historicalCountryId: election.historicalCountryId ?? null,
      },
      {
        countryId: party.countryId ?? null,
        historicalCountryId: party.historicalCountryId ?? null,
      },
    )
    if (!partyCompatible) {
      throw new BadRequestException(
        '정당의 소속 국가가 이 선거의 소속 국가와 일치하지 않습니다.',
      )
    }

    const votes = this.parseOptionalNonNegativeBigInt(body.votes)
    const voteShareDecimal = this.parseOptionalPercentageDecimal(
      body.voteSharePercent,
      '득표율',
    )
    if (body.seatsWon != null && body.seatsWon < 0) {
      throw new BadRequestException('의석수는 0 이상이어야 합니다.')
    }
    if (body.allianceId != null) {
      const alliance = await this.prisma.electionAlliance.findFirst({
        where: { id: body.allianceId, electionId },
        select: { id: true },
      })
      if (!alliance) {
        throw new BadRequestException('이 선거의 연합이 아닙니다.')
      }
    }

    const row = await this.prisma.electionPartyResult.upsert({
      where: {
        uq_election_party_result_election_party: { electionId, partyId },
      },
      create: {
        electionId,
        partyId,
        votes: votes ?? undefined,
        voteSharePercent: voteShareDecimal ?? undefined,
        seatsWon: body.seatsWon ?? undefined,
        notes: body.notes ?? undefined,
        allianceId: body.allianceId ?? undefined,
      },
      update: {
        votes:
          body.votes !== undefined
            ? votes ?? null
            : undefined,
        voteSharePercent:
          body.voteSharePercent !== undefined ? voteShareDecimal : undefined,
        seatsWon: body.seatsWon !== undefined ? body.seatsWon : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        allianceId: body.allianceId !== undefined ? body.allianceId : undefined,
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

  // ── 선거 연합·블록 ──────────────────────────────────────────────
  // 각 정당이 따로 출마하되 하나로 묶여 싸운 연합. 소속은 정당 집계 행의 allianceId라
  // 한 정당은 한 선거에서 한 연합에만 든다(집계가 선거·정당당 1행).

  @Post(':electionId/alliances')
  async createAlliance(
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Body()
    body: CreateElectionAllianceBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
    const name = this.normalizeAllianceName(body.name)
    const color = this.normalizeAllianceColor(body.color)
    const memberPartyIds = await this.assertAllianceMembers(
      electionId,
      body.memberPartyIds,
    )
    try {
      const alliance = await this.prisma.$transaction(async (tx) => {
        const allianceOrganizationId = await this.resolveAllianceOrganization(tx, electionId, body)
        const created = await tx.electionAlliance.create({
          data: {
            electionId,
            allianceOrganizationId: allianceOrganizationId ?? null,
            name,
            shortName: body.shortName?.trim() || null,
            color,
            sortOrder: body.sortOrder ?? 0,
            notes: body.notes?.trim() || null,
          },
        })
        if (memberPartyIds && memberPartyIds.length > 0) {
          await tx.electionPartyResult.updateMany({
            where: { electionId, partyId: { in: memberPartyIds } },
            data: { allianceId: created.id },
          })
        }
        return created
      })
      return alliance
    } catch (error) {
      this.rethrowAllianceNameConflict(error)
      throw error
    }
  }

  @Patch(':electionId/alliances/:allianceId')
  async updateAlliance(
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('allianceId') allianceId: string,
    @Body()
    body: UpdateElectionAllianceBody,
  ): Promise<any> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
    const existing = await this.prisma.electionAlliance.findFirst({
      where: { id: allianceId, electionId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('선거 연합을 찾을 수 없습니다.')
    const data: Prisma.ElectionAllianceUpdateInput = {}
    if (body.name !== undefined) data.name = this.normalizeAllianceName(body.name)
    if (body.shortName !== undefined) data.shortName = body.shortName?.trim() || null
    if (body.color !== undefined) data.color = this.normalizeAllianceColor(body.color)
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null
    const memberPartyIds = await this.assertAllianceMembers(
      electionId,
      body.memberPartyIds,
    )
    try {
      return await this.prisma.$transaction(async (tx) => {
        const allianceOrganizationId = await this.resolveAllianceOrganization(tx, electionId, body)
        if (allianceOrganizationId !== undefined) {
          data.allianceOrganization = allianceOrganizationId
            ? { connect: { id: allianceOrganizationId } }
            : { disconnect: true }
        }
        const updated = await tx.electionAlliance.update({
          where: { id: allianceId },
          data,
        })
        if (memberPartyIds) {
          await tx.electionPartyResult.updateMany({
            where: {
              electionId,
              allianceId,
              partyId: { notIn: memberPartyIds },
            },
            data: { allianceId: null },
          })
          if (memberPartyIds.length > 0) {
            await tx.electionPartyResult.updateMany({
              where: { electionId, partyId: { in: memberPartyIds } },
              data: { allianceId },
            })
          }
        }
        return updated
      })
    } catch (error) {
      this.rethrowAllianceNameConflict(error)
      throw error
    }
  }

  /** 지속 연합 후보 — 정치 연합 조직(POLITICAL_ALLIANCE). 두 세그먼트라 `:id`에 가리지 않는다 */
  @Get(':electionId/alliance-organization-candidates')
  async allianceOrganizationCandidates(
    @Param('electionId') electionId: string,
    @Query('query') rawQuery?: string,
  ): Promise<any> {
    const query = rawQuery?.trim() ?? ''
    return this.prisma.organization.findMany({
      where: {
        type: OrganizationType.POLITICAL_ALLIANCE,
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
      select: {
        id: true,
        name: true,
        shortName: true,
        foundedDate: true,
        dissolvedDate: true,
        _count: { select: { electionAlliances: true } },
      },
      orderBy: { name: 'asc' },
      take: 30,
    })
  }

  @Delete(':electionId/alliances/:allianceId')
  async deleteAlliance(
    @Request() req: any,
    @Param('electionId') electionId: string,
    @Param('allianceId') allianceId: string,
  ): Promise<void> {
    await this.ensureElectionOwner(electionId, this.actorAccountId(req))
    const existing = await this.prisma.electionAlliance.findFirst({
      where: { id: allianceId, electionId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('선거 연합을 찾을 수 없습니다.')
    // 소속 정당 집계는 FK SetNull로 '연합 없음'이 된다(집계 자체는 남음)
    await this.prisma.electionAlliance.delete({ where: { id: allianceId } })
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
      ...this.sanitizeElectionEvent(row),
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
    const pollDate = this.parseDateOrThrow(body.pollDate, '투표일')
    const pollEndDate = body.pollEndDate
      ? this.parseDateOrThrow(body.pollEndDate, '투표 종료일')
      : null
    const legislatureTermStart = body.legislatureTermStart
      ? this.parseDateOrThrow(body.legislatureTermStart, '의회 임기 시작일')
      : null
    const legislatureTermEnd = body.legislatureTermEnd
      ? this.parseDateOrThrow(body.legislatureTermEnd, '의회 임기 만료일')
      : null
    const resultingLegislatureClosureDate = body.resultingLegislatureClosureDate
      ? this.parseDateOrThrow(
          body.resultingLegislatureClosureDate,
          '의회 실제 종료일',
        )
      : null

    this.assertElectionDateAndNumberRules({
      pollDate,
      pollEndDate,
      legislatureTermStart,
      legislatureTermEnd,
      resultingLegislatureClosureDate,
      totalSeats: body.totalSeats,
      convocationOrdinal: body.convocationOrdinal,
    })
    const turnoutDecimal = this.parseOptionalPercentageDecimal(
      body.voterTurnoutPercent,
      '투표율',
    )

    const row = await this.prisma.election.create({
      data: {
        name: body.name,
        shortName: body.shortName ?? undefined,
        electionType: body.electionType as any,
        status: (body.status as any) ?? undefined,
        pollDate,
        pollEndDate: pollEndDate ?? undefined,
        legislatureTermStart: legislatureTermStart ?? undefined,
        legislatureTermEnd: legislatureTermEnd ?? undefined,
        resultingLegislatureClosureKind:
          body.resultingLegislatureClosureKind === undefined
            ? undefined
            : body.resultingLegislatureClosureKind === null
              ? null
              : this.parseClosureKind(body.resultingLegislatureClosureKind),
        resultingLegislatureClosureDate:
          resultingLegislatureClosureDate ?? undefined,
        resultingLegislatureDissolutionNotes:
          body.resultingLegislatureDissolutionNotes ?? undefined,
        voterTurnoutPercent: turnoutDecimal ?? undefined,
        totalSeats: body.totalSeats ?? undefined,
        chamberId: (await this.assertChamberId(body.chamberId)) ?? undefined,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
        scopeAdministrativeDivisionId: body.scopeAdministrativeDivisionId ?? undefined,
        convocationOrdinal: body.convocationOrdinal ?? undefined,
        description: body.description ?? undefined,
        eventId: (await this.checkLinkableEvent(body.eventId, accountId)) ?? undefined,
        // 소유자는 JWT 주체 고정 (body 값은 신뢰하지 않는다)
        accountId: accountId ?? undefined,
      },
      include: electionInclude,
    })
    return serializeElectionBigInt(this.sanitizeElectionEvent(row))
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: UpdateElectionBody,
  ): Promise<any> {
    const existing = await this.ensureElectionOwner(id, this.actorAccountId(req))
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.shortName !== undefined) data.shortName = body.shortName
    if (body.electionType !== undefined) data.electionType = body.electionType
    if (body.status !== undefined) data.status = body.status
    if (body.pollDate !== undefined)
      data.pollDate = this.parseDateOrThrow(body.pollDate, '투표일')
    if (body.pollEndDate !== undefined)
      data.pollEndDate = body.pollEndDate
        ? this.parseDateOrThrow(body.pollEndDate, '투표 종료일')
        : null
    if (body.legislatureTermStart !== undefined)
      data.legislatureTermStart = body.legislatureTermStart
        ? this.parseDateOrThrow(body.legislatureTermStart, '의회 임기 시작일')
        : null
    if (body.legislatureTermEnd !== undefined)
      data.legislatureTermEnd = body.legislatureTermEnd
        ? this.parseDateOrThrow(body.legislatureTermEnd, '의회 임기 만료일')
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
        ? this.parseDateOrThrow(
            body.resultingLegislatureClosureDate,
            '의회 실제 종료일',
          )
        : null
    if (body.resultingLegislatureDissolutionNotes !== undefined)
      data.resultingLegislatureDissolutionNotes =
        body.resultingLegislatureDissolutionNotes
    if (body.voterTurnoutPercent !== undefined)
      data.voterTurnoutPercent = this.parseOptionalPercentageDecimal(
        body.voterTurnoutPercent,
        '투표율',
      )
    if (body.totalSeats !== undefined) data.totalSeats = body.totalSeats
    if (body.chamberId !== undefined) {
      /* 이 갱신은 국가 FK를 스칼라로 쓰는 unchecked 입력 — 관계(connect)와 섞지 않는다 */
      data.chamberId = await this.assertChamberId(body.chamberId)
    }
    if (body.countryId !== undefined) data.countryId = body.countryId
    if (body.historicalCountryId !== undefined) data.historicalCountryId = body.historicalCountryId
    if (body.scopeAdministrativeDivisionId !== undefined)
      data.scopeAdministrativeDivisionId = body.scopeAdministrativeDivisionId
    if (body.convocationOrdinal !== undefined) data.convocationOrdinal = body.convocationOrdinal
    if (body.description !== undefined) data.description = body.description
    if (body.eventId !== undefined) {
      data.eventId = await this.checkLinkableEvent(body.eventId, this.actorAccountId(req))
    }

    const nextPollDate =
      body.pollDate !== undefined
        ? (data.pollDate as Date)
        : existing.pollDate
    const nextPollEndDate =
      body.pollEndDate !== undefined
        ? (data.pollEndDate as Date | null)
        : existing.pollEndDate
    const nextTermStart =
      body.legislatureTermStart !== undefined
        ? (data.legislatureTermStart as Date | null)
        : existing.legislatureTermStart
    const nextTermEnd =
      body.legislatureTermEnd !== undefined
        ? (data.legislatureTermEnd as Date | null)
        : existing.legislatureTermEnd
    const nextClosureDate =
      body.resultingLegislatureClosureDate !== undefined
        ? (data.resultingLegislatureClosureDate as Date | null)
        : existing.resultingLegislatureClosureDate
    const nextTotalSeats =
      body.totalSeats !== undefined ? body.totalSeats : existing.totalSeats
    const nextConvocationOrdinal =
      body.convocationOrdinal !== undefined
        ? body.convocationOrdinal
        : existing.convocationOrdinal

    this.assertElectionDateAndNumberRules({
      pollDate: nextPollDate,
      pollEndDate: nextPollEndDate,
      legislatureTermStart: nextTermStart,
      legislatureTermEnd: nextTermEnd,
      resultingLegislatureClosureDate: nextClosureDate,
      totalSeats: nextTotalSeats,
      convocationOrdinal: nextConvocationOrdinal,
    })

    const row = await this.prisma.election.update({
      where: { id },
      data: data as any,
      include: electionInclude,
    })
    return serializeElectionBigInt(this.sanitizeElectionEvent(row))
  }

  /**
   * 선거의 서사 사건 만들기 — 이 선거를 사건 목록·연표에 올린다.
   * 예전엔 사건을 따로 등록하고 그 UUID를 선거 폼에 붙여 넣어야 해서 연결이 0건이었다.
   * 제목·설명·투표일·나라를 선거에서 가져와 분야 정치·세부 선거로 만들고 곧바로 잇는다.
   * 이미 살아 있는 사건이 연결돼 있으면 409(한 선거의 서사 정본은 하나).
   * @tag elections
   */
  @Post(':id/narrative-event')
  async createNarrativeEvent(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ eventId: string; eventTitle: string }> {
    const accountId = this.actorAccountId(req)
    await this.ensureElectionOwner(id, accountId)
    const election = await this.prisma.election.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        pollDate: true,
        pollEndDate: true,
        countryId: true,
        historicalCountryId: true,
        event: { select: { id: true, deletedAt: true } },
      },
    })
    if (!election) throw new NotFoundException('선거를 찾을 수 없습니다.')
    if (election.event && !election.event.deletedAt) {
      throw new ConflictException('이미 연결된 사건이 있습니다 — 연결을 끊은 뒤 다시 만드세요')
    }

    /* 투표일 → 사건 날짜(일 정밀도). 선거는 모두 근현대라 DATETIME 범위(AD 1000~) 안이다 */
    const dayOf = (value: Date) => ({
      date: new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())),
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    })
    const start = dayOf(election.pollDate)
    const end =
      election.pollEndDate && election.pollEndDate.getTime() > election.pollDate.getTime()
        ? dayOf(election.pollEndDate)
        : null

    const event = await this.eventService.createEvent(
      {
        title: election.name,
        description: election.description ?? undefined,
        startDate: start.date,
        startDatePrecision: 'day',
        startEra: 'AD',
        startYear: start.year,
        startMonth: start.month,
        startDay: start.day,
        endDate: end?.date,
        endDatePrecision: end ? 'day' : undefined,
        endEra: end ? 'AD' : undefined,
        endYear: end?.year,
        endMonth: end?.month,
        endDay: end?.day,
        domain: 'POLITICS',
        type: 'ELECTION',
        kind: 'SINGLE',
        createdById: accountId,
      } as Parameters<EventService['createEvent']>[0],
      {
        relatedCountries: election.countryId
          ? [{ countryId: election.countryId }]
          : election.historicalCountryId
            ? [{ historicalCountryId: election.historicalCountryId }]
            : undefined,
      },
    )
    await this.prisma.election.update({ where: { id }, data: { eventId: event.id } })
    return { eventId: event.id, eventTitle: event.title }
  }

  /**
   * 연결할 사건 검사 — 있고, 지워지지 않았고, 본인이 등록한 사건만. 예전엔 아무 UUID나 받아
   * 남의 사건·없는 사건에도 걸렸다. null·빈 문자열은 연결 해제(null).
   */
  private async checkLinkableEvent(
    eventId: string | null | undefined,
    accountId: string | undefined,
  ): Promise<string | null | undefined> {
    if (eventId === undefined) return undefined
    const trimmed = eventId?.trim()
    if (!trimmed) return null
    await assertEventOwnership(this.prisma, trimmed, accountId, {
      action: '선거에 연결',
      deleted: 'not-found',
    })
    return trimmed
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
  private normalizeAllianceName(raw: string | undefined): string {
    const name = raw?.trim() ?? ''
    if (!name) throw new BadRequestException('연합 명칭을 입력하세요.')
    if (name.length > 200) {
      throw new BadRequestException('연합 명칭은 200자 이하여야 합니다.')
    }
    return name
  }

  private normalizeAllianceColor(raw: string | null | undefined): string | null {
    const color = raw?.trim() ?? ''
    if (!color) return null
    const withHash = color.startsWith('#') ? color : `#${color}`
    if (!ALLIANCE_COLOR_PATTERN.test(withHash)) {
      throw new BadRequestException('연합 색은 #RRGGBB 형식이어야 합니다.')
    }
    return withHash.toUpperCase()
  }

  /** 원 — 있는지만 본다(국가가 바뀌는 선거도 있어 국가 일치는 강제하지 않는다) */
  private async assertChamberId(raw: string | null | undefined): Promise<string | null | undefined> {
    if (raw === undefined) return undefined
    if (raw === null || raw === '') return null
    const chamber = await this.prisma.chamber.findUnique({ where: { id: raw }, select: { id: true } })
    if (!chamber) throw new BadRequestException('원을 찾을 수 없습니다.')
    return raw
  }

  /**
   * 지속 연합 조직 — undefined=그대로, null=끊음, 문자열=그 조직(정치 연합 유형만).
   * 새 이름이 오면 선거의 국가로 정치 연합 조직을 만들어 잇는다(같은 이름이 있으면 409 — 목록에서 고르게).
   */
  private async resolveAllianceOrganization(
    tx: Prisma.TransactionClient,
    electionId: string,
    body: { allianceOrganizationId?: string | null; newAllianceOrganizationName?: string | null },
  ): Promise<string | null | undefined> {
    const newName = body.newAllianceOrganizationName?.trim() ?? ''
    if (newName) {
      if (newName.length > 200) throw new BadRequestException('연합 조직 이름은 200자 이하여야 합니다.')
      const duplicate = await tx.organization.findFirst({ where: { name: newName }, select: { id: true } })
      if (duplicate) throw new ConflictException(`「${newName}」 조직이 이미 있습니다 — 목록에서 고르세요.`)
      const election = await tx.election.findUnique({
        where: { id: electionId },
        select: { countryId: true, historicalCountryId: true },
      })
      const created = await tx.organization.create({
        data: {
          name: newName,
          type: OrganizationType.POLITICAL_ALLIANCE,
          scope: OrganizationScope.NATIONAL,
          countryId: election?.countryId ?? null,
          historicalCountryId: election?.historicalCountryId ?? null,
        },
        select: { id: true },
      })
      return created.id
    }
    if (body.allianceOrganizationId === undefined) return undefined
    if (body.allianceOrganizationId === null || body.allianceOrganizationId === '') return null
    const organization = await tx.organization.findUnique({
      where: { id: body.allianceOrganizationId },
      select: { type: true },
    })
    if (!organization) throw new BadRequestException('지속 연합 조직이 없습니다.')
    if (organization.type !== OrganizationType.POLITICAL_ALLIANCE) {
      throw new BadRequestException('지속 연합은 정치 연합 유형의 조직만 이을 수 있습니다.')
    }
    return body.allianceOrganizationId
  }

  /** 소속 정당은 이 선거에 정당 집계가 있어야 한다 — 소속이 집계 행에 저장되므로 */
  private async assertAllianceMembers(
    electionId: string,
    partyIds: string[] | undefined,
  ): Promise<string[] | undefined> {
    if (partyIds === undefined) return undefined
    if (!Array.isArray(partyIds)) {
      throw new BadRequestException('memberPartyIds는 배열이어야 합니다.')
    }
    const unique = [...new Set(partyIds.filter((partyId) => typeof partyId === 'string' && partyId))]
    if (unique.length === 0) return []
    const found = await this.prisma.electionPartyResult.findMany({
      where: { electionId, partyId: { in: unique } },
      select: { partyId: true },
    })
    if (found.length !== unique.length) {
      throw new BadRequestException(
        '정당 집계가 없는 정당은 연합에 넣을 수 없습니다. 먼저 정당 집계를 추가하세요.',
      )
    }
    return unique
  }

  private rethrowAllianceNameConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('이 선거에 같은 이름의 연합이 이미 있습니다.')
    }
  }

  private async ensureElectionOwner(id: string, accountId?: string) {
    const election = await this.prisma.election.findUnique({
      where: { id },
      select: {
        id: true,
        accountId: true,
        countryId: true,
        historicalCountryId: true,
        pollDate: true,
        pollEndDate: true,
        legislatureTermStart: true,
        legislatureTermEnd: true,
        resultingLegislatureClosureDate: true,
        totalSeats: true,
        convocationOrdinal: true,
      },
    })
    if (!election) throw new NotFoundException('선거를 찾을 수 없습니다.')
    // 주체를 특정할 수 없으면(토큰에 sub 없음) 통과시키지 않는다 — 우회 경로 차단
    if (accountId == null || election.accountId !== accountId) {
      throw new ForbiddenException('본인이 등록한 선거만 수정·삭제할 수 있습니다.')
    }
    return election
  }

  private sanitizeElectionEvent<T extends { event?: { deletedAt?: Date | null } | null }>(
    row: T,
  ): T {
    if (!row || row.event == null) return row
    if (row.event.deletedAt != null) {
      return { ...row, event: null }
    }
    return row
  }

  private parseDateOrThrow(raw: string, label: string): Date {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`${label} 날짜 형식이 올바르지 않습니다.`)
    }
    return d
  }

  private parseOptionalNonNegativeBigInt(
    raw: string | number | null | undefined,
  ): bigint | null | undefined {
    if (raw === undefined) return undefined
    if (raw === null || raw === '') return null
    try {
      const val = BigInt(raw)
      if (val < 0n) {
        throw new BadRequestException('득표수는 0 이상의 정수여야 합니다.')
      }
      return val
    } catch (e) {
      if (e instanceof BadRequestException) throw e
      throw new BadRequestException('득표수는 0 이상의 정수여야 합니다.')
    }
  }

  private parseOptionalPercentageDecimal(
    raw: string | number | null | undefined,
    label: string,
  ): Prisma.Decimal | null | undefined {
    if (raw === undefined) return undefined
    if (raw === null || raw === '') return null
    const num = Number(raw)
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      throw new BadRequestException(
        `${label}은(는) 0 이상 100 이하의 값이어야 합니다.`,
      )
    }
    return new Prisma.Decimal(String(raw))
  }

  private assertElectionDateAndNumberRules(input: {
    pollDate?: Date | null
    pollEndDate?: Date | null
    legislatureTermStart?: Date | null
    legislatureTermEnd?: Date | null
    resultingLegislatureClosureDate?: Date | null
    totalSeats?: number | null
    convocationOrdinal?: number | null
  }): void {
    if (
      input.pollDate != null &&
      input.pollEndDate != null &&
      input.pollEndDate.getTime() < input.pollDate.getTime()
    ) {
      throw new BadRequestException('투표 종료일은 투표 시작일 이후여야 합니다.')
    }
    if (
      input.legislatureTermStart != null &&
      input.legislatureTermEnd != null &&
      input.legislatureTermEnd.getTime() < input.legislatureTermStart.getTime()
    ) {
      throw new BadRequestException(
        '의회 임기 만료일은 임기 시작일 이후여야 합니다.',
      )
    }
    if (
      input.legislatureTermStart != null &&
      input.resultingLegislatureClosureDate != null &&
      input.resultingLegislatureClosureDate.getTime() <
        input.legislatureTermStart.getTime()
    ) {
      throw new BadRequestException(
        '의회 실제 종료일은 임기 시작일 이후여야 합니다.',
      )
    }
    if (input.totalSeats != null && input.totalSeats < 0) {
      throw new BadRequestException('총 의석수는 0 이상이어야 합니다.')
    }
    if (input.convocationOrdinal != null && input.convocationOrdinal < 1) {
      throw new BadRequestException('대수(회차)는 1 이상이어야 합니다.')
    }
  }

  private async validateCandidacyReferences(
    election: {
      countryId?: string | null
      historicalCountryId?: string | null
    },
    refs: {
      personId?: string | null
      partyId?: string | null
      electoralDistrictId?: string | null
    },
  ): Promise<void> {
    const electionScope = {
      countryId: election.countryId ?? null,
      historicalCountryId: election.historicalCountryId ?? null,
    }
    if (refs.personId && this.prisma.person?.findUnique) {
      const person = await this.prisma.person.findUnique({
        where: { id: refs.personId },
        select: { id: true },
      })
      if (!person) throw new NotFoundException('인물을 찾을 수 없습니다.')
    }
    if (refs.partyId && this.prisma.politicalParty?.findUnique) {
      const party = await this.prisma.politicalParty.findUnique({
        where: { id: refs.partyId },
        select: { id: true, countryId: true, historicalCountryId: true },
      })
      if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
      const compatible = await areJurisdictionsCompatible(
        this.prisma,
        electionScope,
        {
          countryId: party.countryId ?? null,
          historicalCountryId: party.historicalCountryId ?? null,
        },
      )
      if (!compatible) {
        throw new BadRequestException(
          '정당의 소속 국가가 이 선거의 소속 국가와 일치하지 않습니다.',
        )
      }
    }
    if (refs.electoralDistrictId && this.prisma.electoralDistrict?.findUnique) {
      const district = await this.prisma.electoralDistrict.findUnique({
        where: { id: refs.electoralDistrictId },
        select: { id: true, countryId: true, historicalCountryId: true },
      })
      if (!district) throw new NotFoundException('선거구를 찾을 수 없습니다.')
      const compatible = await areJurisdictionsCompatible(
        this.prisma,
        electionScope,
        {
          countryId: district.countryId ?? null,
          historicalCountryId: district.historicalCountryId ?? null,
        },
      )
      if (!compatible) {
        throw new BadRequestException(
          '선거구의 소속 국가가 이 선거의 소속 국가와 일치하지 않습니다.',
        )
      }
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
