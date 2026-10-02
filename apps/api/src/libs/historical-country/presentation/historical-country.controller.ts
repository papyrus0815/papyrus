import {
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PrismaClient } from '@prisma/client'
import { HistoricalCountryService } from '../application/historical-country.service'
import { CreateHistoricalCountryDto } from './dto/create-historical-country.dto'
import { UpdateHistoricalCountryDto } from './dto/update-historical-country.dto'
import { HistoricalCountryResponseDto } from './dto/historical-country.response'
import type {
  FirstRulerDto,
  FoundingSummaryDto,
  LinkedCountryDto,
  StatehoodAgentDto,
} from './dto/founding-summary.response'
import { CreateStatehoodAgentDto, UpdateStatehoodAgentDto } from './dto/statehood-agent.dto'
import { HistoricalCountry } from '../domain/historical-country.entity'
import { CreateHistoricalCountryTransitionDto } from './dto/create-transition.dto'
import { UpdateHistoricalCountryTransitionDto } from './dto/update-transition.dto'
import type { HistoricalCountryTransitionResponseDto } from './dto/transition.response'
import type { HistoricalCountryTransitionRecord } from '../domain/historical-country-transition.repository'
import {
  CreateHistoricalCountryMembershipDto,
  UpdateHistoricalCountryMembershipDto,
  type HistoricalCountryMembershipResponseDto,
} from './dto/membership.dto'
import {
  CreateHistoricalCountryRelationDto,
  UpdateHistoricalCountryRelationDto,
  type HistoricalCountryRelationResponseDto,
} from './dto/relation.dto'

/**
 * 역사적 국가 API (개인 정보 플랫폼: 로그인한 계정 소유 데이터만)
 */
import {
  assertPointOrder,
  normalizePoint,
  parseLegacyIsoPoint,
  type StructuredPoint,
  type StructuredPointInput,
} from '../../shared/structured-point'

@ApiTags('historical-countries')
@Controller('historical-countries')
@UseGuards(AuthGuard('jwt'))
export class HistoricalCountryController {
  constructor(
    private readonly historicalCountryService: HistoricalCountryService,
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * 역사적 국가 목록 조회 (본인 등록분만).
   * 쿼리: entityKind (STATE|REGIME|PERIOD), stateType (예: SHOGUNATE) 로 필터 가능.
   *
   * @returns 역사적 국가 목록
   * @tag historical-countries
   */
  @Get()
  async getAllHistoricalCountries(
    @Request() req: any,
    @Query('entityKind') entityKind?: string,
    @Query('stateType') stateType?: string,
  ): Promise<HistoricalCountryResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const filter =
      entityKind || stateType
        ? { entityKind: entityKind || undefined, stateType: stateType || undefined }
        : undefined
    const countries =
      await this.historicalCountryService.getAllHistoricalCountries(accountId, filter)
    return countries.map((country) =>
      this.toResponseDto(country, country.parentModernCountryIds),
    )
  }

  /**
   * 여러 역사적 국가의 계승·변천 목록 일괄 조회 (ids 쿼리: 쉼표 구분)
   * @tag historical-countries
   */
  @Get('by-ids/transitions')
  async getTransitionsByHistoricalCountryIds(
    @Query('ids') idsQuery: string,
    @Request() req: any,
  ): Promise<HistoricalCountryTransitionResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const ids = idsQuery ? idsQuery.split(',').map((s) => s.trim()).filter(Boolean) : []
    const list =
      await this.historicalCountryService.getTransitionsByHistoricalCountryIds(ids, accountId)
    return list.map((t) => this.transitionToResponseDto(t))
  }

  /**
   * 여러 역사적 국가의 소속·구성 목록 일괄 조회 (ids 쿼리: 쉼표 구분)
   * @tag historical-countries
   */
  @Get('by-ids/memberships')
  async getMembershipsByHistoricalCountryIds(
    @Query('ids') idsQuery: string,
    @Request() req: any,
  ): Promise<HistoricalCountryMembershipResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const ids = idsQuery ? idsQuery.split(',').map((s) => s.trim()).filter(Boolean) : []
    const list =
      await this.historicalCountryService.getMembershipsByHistoricalCountryIds(ids, accountId)
    return list.map((m) => this.membershipToResponseDto(m))
  }

  /**
   * 여러 역사적 국가의 수평 관계 목록 일괄 조회 (ids 쿼리: 쉼표 구분)
   * @tag historical-countries
   */
  @Get('by-ids/relations')
  async getRelationsByHistoricalCountryIds(
    @Query('ids') idsQuery: string,
    @Request() req: any,
  ): Promise<HistoricalCountryRelationResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const ids = idsQuery ? idsQuery.split(',').map((s) => s.trim()).filter(Boolean) : []
    const list =
      await this.historicalCountryService.getRelationsByHistoricalCountryIds(ids, accountId)
    return list.map((r) => this.relationToResponseDto(r))
  }

  /**
   * 해당 역사적 국가가 관여된 계승·변천 목록 조회 (전임 또는 후임)
   *
   * @param id 역사적 국가 ID
   * @returns 계승·변천 목록
   * @tag historical-countries
   */
  /**
   * 건국·멸망 요약 — 개요 탭 '건국'·'멸망' 카드용. 새로 저장하는 값 없이 기존 기록에서 파생한다.
   *
   * - 초대 군주: 재위 중 제1대(regnalNumber=1 — 국가 통산 대수 규약, 없으면 termNumber=1),
   *   그런 기록이 없으면 가장 이른 재위(basis='earliest').
   * - 초대 국가원수·정부수반: 재임 중 통산 1대(termNumber=1), 없으면 가장 이른 재임.
   *   군주 직(정의 isMonarchical) 재임은 재위 표와 겹치므로 뺀다.
   * - 전신·후신: 계승 관계(transition)의 양쪽.
   *
   * ⚠️ 라우트는 @Get(':id')보다 먼저 선언한다(구체 경로 우선).
   */
  @Get(':id/founding-summary')
  async getFoundingSummary(@Param('id') id: string): Promise<FoundingSummaryDto> {
    const country = await this.prisma.historicalCountry.findUnique({
      where: { id },
      select: { foundingNote: true, dissolutionNote: true },
    })
    if (!country) throw new NotFoundException('역사 국가를 찾을 수 없습니다.')

    const personSelect = {
      id: true,
      name: true,
      surname: true,
      middleName: true,
      nameDisplayOrder: true,
      regnalName: true,
      profileImageUrl: true,
    } as const
    const signed = (era: string | null | undefined, year: number | null | undefined) =>
      year == null ? Number.POSITIVE_INFINITY : era === 'BC' ? -year : year

    const firstRulers: FirstRulerDto[] = []

    const reigns = await this.prisma.sovereignReign.findMany({
      where: { historicalCountryId: id },
      select: {
        id: true,
        regnalName: true,
        regnalNumber: true,
        termNumber: true,
        startEra: true,
        startYear: true,
        startDate: true,
        endEra: true,
        endYear: true,
        endDate: true,
        positionDefinition: { select: { title: true } },
        person: { select: personSelect },
      },
    })
    const reignStart = (reign: (typeof reigns)[number]) =>
      reign.startYear != null
        ? signed(reign.startEra, reign.startYear)
        : reign.startDate
          ? reign.startDate.getUTCFullYear()
          : Number.POSITIVE_INFINITY
    const numberedReign =
      reigns.find((reign) => reign.regnalNumber === 1) ??
      reigns.find((reign) => reign.termNumber === 1)
    const reignsByStart = [...reigns]
      .filter((reign) => Number.isFinite(reignStart(reign)))
      .sort((left, right) => reignStart(left) - reignStart(right))
    const firstReign = numberedReign ?? reignsByStart[0] ?? reigns[0]
    const toReignRuler = (
      reign: (typeof reigns)[number],
      basis: FirstRulerDto['basis'],
    ): FirstRulerDto => ({
      kind: 'monarch',
      recordId: reign.id,
      regnalName: reign.regnalName ?? null,
      title: reign.positionDefinition?.title ?? null,
      basis,
      startEra: (reign.startEra as 'BC' | 'AD' | null) ?? (reign.startDate ? 'AD' : null),
      startYear: reign.startYear ?? reign.startDate?.getUTCFullYear() ?? null,
      endEra: (reign.endEra as 'BC' | 'AD' | null) ?? (reign.endDate ? 'AD' : null),
      endYear: reign.endYear ?? reign.endDate?.getUTCFullYear() ?? null,
      person: reign.person,
    })
    if (firstReign) {
      firstRulers.push(toReignRuler(firstReign, numberedReign ? 'numbered' : 'earliest'))
    }
    // 마지막 군주 — 가장 늦게 즉위한 기록. 초대와 같은 행이면(재위 기록 1건) 되풀이하지 않는다.
    const lastRulers: FirstRulerDto[] = []
    const lastReign = reignsByStart[reignsByStart.length - 1]
    if (lastReign && lastReign.id !== firstReign?.id) {
      lastRulers.push(toReignRuler(lastReign, 'latest'))
    }

    const tenures = await this.prisma.governmentPositionTenure.findMany({
      where: {
        historicalCountryId: id,
        NOT: { positionDefinition: { isMonarchical: true } },
      },
      select: {
        id: true,
        title: true,
        termNumber: true,
        positionType: true,
        startDate: true,
        endDate: true,
        positionDefinition: { select: { title: true, positionType: true } },
        person: { select: personSelect },
      },
      orderBy: { startDate: 'asc' },
    })
    for (const [type, kind] of [
      ['HEAD_OF_STATE', 'headOfState'],
      ['HEAD_OF_GOVERNMENT', 'headOfGovernment'],
    ] as const) {
      const ofType = tenures.filter(
        (tenure) => (tenure.positionDefinition?.positionType ?? tenure.positionType) === type,
      )
      const numbered = ofType.find((tenure) => tenure.termNumber === 1)
      const first = numbered ?? ofType[0]
      if (!first) continue
      const toTenureRuler = (
        tenure: (typeof ofType)[number],
        basis: FirstRulerDto['basis'],
      ): FirstRulerDto => ({
        kind,
        recordId: tenure.id,
        regnalName: null,
        title: tenure.positionDefinition?.title?.trim() || tenure.title?.trim() || null,
        basis,
        startEra: 'AD',
        startYear: tenure.startDate.getUTCFullYear(),
        endEra: tenure.endDate ? 'AD' : null,
        endYear: tenure.endDate ? tenure.endDate.getUTCFullYear() : null,
        person: tenure.person,
      })
      firstRulers.push(toTenureRuler(first, numbered ? 'numbered' : 'earliest'))
      // startDate 오름차순이라 끝 행이 마지막 재임
      const last = ofType[ofType.length - 1]
      if (last && last.id !== first.id) lastRulers.push(toTenureRuler(last, 'latest'))
    }

    const countrySelect = {
      id: true,
      name: true,
      startEra: true,
      startYear: true,
      endEra: true,
      endYear: true,
    } as const
    const transitions = await this.prisma.historicalCountryTransition.findMany({
      where: { OR: [{ predecessorId: id }, { successorId: id }] },
      select: {
        predecessorId: true,
        eventType: true,
        predecessor: { select: countrySelect },
        successor: { select: countrySelect },
      },
    })
    const toLinked = (
      linked: (typeof transitions)[number]['predecessor'],
      eventType: string,
    ): LinkedCountryDto => ({
      id: linked.id,
      name: linked.name,
      eventType,
      startEra: (linked.startEra as 'BC' | 'AD' | null) ?? null,
      startYear: linked.startYear ?? null,
      endEra: (linked.endEra as 'BC' | 'AD' | null) ?? null,
      endYear: linked.endYear ?? null,
    })
    const byStart = (left: LinkedCountryDto, right: LinkedCountryDto) =>
      signed(left.startEra, left.startYear) - signed(right.startEra, right.startYear)

    const agents = await this.findStatehoodAgents(id)

    return {
      foundingNote: country.foundingNote ?? null,
      dissolutionNote: country.dissolutionNote ?? null,
      founders: agents.filter((agent) => agent.side === 'FOUNDING'),
      dissolvers: agents.filter((agent) => agent.side === 'DISSOLUTION'),
      firstRulers,
      lastRulers,
      predecessors: transitions
        .filter((transition) => transition.predecessorId !== id)
        .map((transition) => toLinked(transition.predecessor, transition.eventType))
        .sort(byStart),
      successors: transitions
        .filter((transition) => transition.predecessorId === id)
        .map((transition) => toLinked(transition.successor, transition.eventType))
        .sort(byStart),
    }
  }

  /** 건국·멸망 주체 목록 — founding-summary와 같은 모양 */
  private async findStatehoodAgents(historicalCountryId: string): Promise<StatehoodAgentDto[]> {
    const rows = await this.prisma.historicalCountryStatehoodAgent.findMany({
      where: { historicalCountryId },
      orderBy: [{ side: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        person: {
          select: {
            id: true,
            name: true,
            surname: true,
            middleName: true,
            nameDisplayOrder: true,
            regnalName: true,
            profileImageUrl: true,
          },
        },
        agentHistoricalCountry: {
          select: { id: true, name: true, startEra: true, startYear: true, endEra: true, endYear: true },
        },
        agentCountry: { select: { id: true, name: true } },
      },
    })
    return rows.map((row) => {
      const hc = row.agentHistoricalCountry
      const base = {
        id: row.id,
        side: row.side,
        person: null,
        startEra: null,
        startYear: null,
        endEra: null,
        endYear: null,
        note: row.note ?? null,
        sortOrder: row.sortOrder,
      } as const
      if (row.person) {
        return { ...base, kind: 'person', refId: row.person.id, name: row.person.name, person: row.person }
      }
      if (hc) {
        return {
          ...base,
          kind: 'historicalCountry',
          refId: hc.id,
          name: hc.name,
          startEra: (hc.startEra as 'BC' | 'AD' | null) ?? null,
          startYear: hc.startYear ?? null,
          endEra: (hc.endEra as 'BC' | 'AD' | null) ?? null,
          endYear: hc.endYear ?? null,
        }
      }
      if (row.agentCountry) {
        return { ...base, kind: 'country', refId: row.agentCountry.id, name: row.agentCountry.name }
      }
      return { ...base, kind: 'name', refId: null, name: row.name ?? '' }
    })
  }

  /**
   * 건국·멸망 주체 추가 — 이 나라를 누가 세웠나 / 누구에게 멸망했나.
   * 주체는 인물·역사 국가·현대 국가·이름 중 정확히 하나. 대상 국가의 소유자만.
   * @tag historical-countries
   */
  @Post(':id/statehood-agents')
  async createStatehoodAgent(
    @Param('id') id: string,
    @Body() dto: CreateStatehoodAgentDto,
    @Request() req: any,
  ): Promise<StatehoodAgentDto> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.historicalCountryService.getHistoricalCountryById(id, accountId)

    const name = dto.name?.trim() || undefined
    const provided = [dto.personId, dto.agentHistoricalCountryId, dto.agentCountryId, name].filter(
      (value) => value != null,
    )
    if (provided.length !== 1) {
      throw new BadRequestException('주체는 인물·역사 국가·현대 국가·이름 중 하나만 지정해야 합니다.')
    }
    if (dto.agentHistoricalCountryId === id) {
      throw new BadRequestException('자기 자신을 건국·멸망 주체로 지정할 수 없습니다.')
    }

    // 참조 대상은 존재해야 하고, 다른 계정 소유면 막는다(공유 정본 accountId=null은 허용)
    const referenced = dto.personId
      ? await this.prisma.person.findUnique({ where: { id: dto.personId }, select: { accountId: true } })
      : dto.agentHistoricalCountryId
        ? await this.prisma.historicalCountry.findUnique({
            where: { id: dto.agentHistoricalCountryId },
            select: { accountId: true },
          })
        : dto.agentCountryId
          ? await this.prisma.country.findUnique({
              where: { id: dto.agentCountryId },
              select: { accountId: true },
            })
          : { accountId: null }
    if (!referenced) throw new NotFoundException('지정한 주체를 찾을 수 없습니다.')
    if (referenced.accountId != null && accountId != null && referenced.accountId !== accountId) {
      throw new ForbiddenException('다른 계정 소유 항목은 주체로 지정할 수 없습니다.')
    }

    const duplicate = await this.prisma.historicalCountryStatehoodAgent.findFirst({
      where: {
        historicalCountryId: id,
        side: dto.side,
        personId: dto.personId ?? null,
        agentHistoricalCountryId: dto.agentHistoricalCountryId ?? null,
        agentCountryId: dto.agentCountryId ?? null,
        name: name ?? null,
      },
      select: { id: true },
    })
    if (duplicate) throw new BadRequestException('이미 지정된 주체입니다.')

    const last = await this.prisma.historicalCountryStatehoodAgent.findFirst({
      where: { historicalCountryId: id, side: dto.side },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    const created = await this.prisma.historicalCountryStatehoodAgent.create({
      data: {
        historicalCountryId: id,
        side: dto.side,
        personId: dto.personId ?? null,
        agentHistoricalCountryId: dto.agentHistoricalCountryId ?? null,
        agentCountryId: dto.agentCountryId ?? null,
        name: name ?? null,
        note: dto.note?.trim() || null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
      select: { id: true },
    })
    const agents = await this.findStatehoodAgents(id)
    return agents.find((agent) => agent.id === created.id)!
  }

  /** 건국·멸망 주체의 역할 메모·순서 수정 — 대상 국가의 소유자만 */
  @Patch('statehood-agents/:agentId')
  async updateStatehoodAgent(
    @Param('agentId') agentId: string,
    @Body() dto: UpdateStatehoodAgentDto,
    @Request() req: any,
  ): Promise<StatehoodAgentDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const row = await this.findOwnedStatehoodAgent(agentId, accountId)
    await this.prisma.historicalCountryStatehoodAgent.update({
      where: { id: agentId },
      data: {
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    })
    const agents = await this.findStatehoodAgents(row.historicalCountryId)
    return agents.find((agent) => agent.id === agentId)!
  }

  /** 건국·멸망 주체 삭제 — 대상 국가의 소유자만 */
  @Delete('statehood-agents/:agentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStatehoodAgent(@Param('agentId') agentId: string, @Request() req: any): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.findOwnedStatehoodAgent(agentId, accountId)
    await this.prisma.historicalCountryStatehoodAgent.delete({ where: { id: agentId } })
  }

  private async findOwnedStatehoodAgent(agentId: string, accountId: string | undefined) {
    const row = await this.prisma.historicalCountryStatehoodAgent.findUnique({
      where: { id: agentId },
      select: { id: true, historicalCountryId: true },
    })
    if (!row) throw new NotFoundException('건국·멸망 주체를 찾을 수 없습니다.')
    // 대상 국가 소유 검사 — 남의 나라면 403/404를 서비스가 던진다
    await this.historicalCountryService.getHistoricalCountryById(row.historicalCountryId, accountId)
    return row
  }

  @Get(':id/transitions')
  async getTransitionsByHistoricalCountryId(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<HistoricalCountryTransitionResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const list =
      await this.historicalCountryService.getTransitionsByHistoricalCountryId(id, accountId)
    return list.map((t) => this.transitionToResponseDto(t))
  }

  @Get(':id/memberships')
  async getMembershipsByHistoricalCountryId(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<HistoricalCountryMembershipResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const list =
      await this.historicalCountryService.getMembershipsByHistoricalCountryId(id, accountId)
    return list.map((m) => this.membershipToResponseDto(m))
  }

  @Get(':id/relations')
  async getRelationsByHistoricalCountryId(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<HistoricalCountryRelationResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const list =
      await this.historicalCountryService.getRelationsByHistoricalCountryId(id, accountId)
    return list.map((r) => this.relationToResponseDto(r))
  }

  /**
   * 역사적 국가 상세 조회 (본인 등록분만)
   *
   * @param id 역사적 국가 ID
   * @returns 역사적 국가 정보
   * @tag historical-countries
   */
  @Get(':id')
  async getHistoricalCountryById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<HistoricalCountryResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const country =
      await this.historicalCountryService.getHistoricalCountryById(id, accountId)
    const [parentModernCountryIds, parentHistoricalCountryIds, transitionEventType] =
      await Promise.all([
        this.historicalCountryService.getModernCountryIdsByHistoricalCountryId(id),
        this.historicalCountryService.getParentHistoricalCountryIdsByMemberId(id),
        this.historicalCountryService.getTransitionEventTypeByPredecessorId(id),
      ])
    return this.toResponseDto(
      country,
      parentModernCountryIds,
      parentHistoricalCountryIds,
      transitionEventType ?? undefined,
    )
  }

  /**
   * 계승/변천 관계 생성 (전임·후임 국가 모두 본인 소유)
   *
   * @param dto 계승·변천 생성 정보
   * @returns 생성된 계승·변천
   * @tag historical-countries
   */
  @Post('memberships')
  async createMembership(
    @Body() dto: CreateHistoricalCountryMembershipDto,
    @Request() req: any,
  ): Promise<HistoricalCountryMembershipResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const m = await this.historicalCountryService.createMembership(
      {
        historicalCountryId: dto.historicalCountryId,
        memberCountryId: dto.memberCountryId,
        role: dto.role,
        isLeadingMember: dto.isLeadingMember ?? null,
        ...resolveMembershipPeriod(dto),
      },
      accountId,
    )
    return this.membershipToResponseDto(m)
  }

  @Post('relations')
  async createRelation(
    @Body() dto: CreateHistoricalCountryRelationDto,
    @Request() req: any,
  ): Promise<HistoricalCountryRelationResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const r = await this.historicalCountryService.createRelation(
      {
        subjectCountryId: dto.subjectCountryId,
        objectCountryId: dto.objectCountryId,
        relationType: dto.relationType,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
      accountId,
    )
    return this.relationToResponseDto(r)
  }

  @Post('transitions')
  async createTransition(
    @Body() dto: CreateHistoricalCountryTransitionDto,
    @Request() req: any,
  ): Promise<HistoricalCountryTransitionResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const t = await this.historicalCountryService.createTransition(
      {
        predecessorId: dto.predecessorId,
        successorId: dto.successorId,
        eventType: dto.eventType,
        transitionScope: dto.transitionScope ?? undefined,
      },
      accountId,
    )
    return this.transitionToResponseDto(t)
  }

  /**
   * 역사적 국가 생성 (현재 계정 소유로 등록)
   *
   * @param dto 역사적 국가 생성 정보
   * @returns 생성된 역사적 국가
   * @tag historical-countries
   */
  @Post()
  async createHistoricalCountry(
    @Body() dto: CreateHistoricalCountryDto,
    @Request() req: any,
  ): Promise<HistoricalCountryResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const country = await this.historicalCountryService.createHistoricalCountry(
      {
        name: dto.name,
        enName: dto.enName,
        nameOrigin: dto.nameOrigin,
        description: dto.description,
        history: dto.history,
        thumbnailUrl: dto.thumbnailUrl,
        startEra: dto.startEra,
        startYear: dto.startYear,
        startMonth: dto.startMonth,
        startDay: dto.startDay,
        endEra: dto.endEra,
        endYear: dto.endYear,
        endMonth: dto.endMonth,
        endDay: dto.endDay,
        stateType: dto.stateType,
        entityKind: dto.entityKind ?? undefined,
        parentModernCountryIds: dto.parentModernCountryIds,
        parentHistoricalCountryIds: dto.parentHistoricalCountryIds,
        transitionEventType: dto.transitionEventType,
        transitionScope: dto.transitionScope ?? undefined,
      },
      accountId,
    )
    return this.toResponseDto(country)
  }

  /**
   * 계승/변천 관계 수정
   *
   * @param tid 계승·변천 ID
   * @param dto 수정 정보
   * @returns 수정된 계승·변천
   * @tag historical-countries
   */
  @Put('transitions/:tid')
  async updateTransition(
    @Param('tid') tid: string,
    @Body() dto: UpdateHistoricalCountryTransitionDto,
    @Request() req: any,
  ): Promise<HistoricalCountryTransitionResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const t = await this.historicalCountryService.updateTransition(tid, dto, accountId)
    return this.transitionToResponseDto(t)
  }

  @Put('memberships/:mid')
  async updateMembership(
    @Param('mid') mid: string,
    @Body() dto: UpdateHistoricalCountryMembershipDto,
    @Request() req: any,
  ): Promise<HistoricalCountryMembershipResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const m = await this.historicalCountryService.updateMembership(
      mid,
      {
        role: dto.role,
        isLeadingMember: dto.isLeadingMember,
        ...resolveMembershipPeriod(dto),
      },
      accountId,
    )
    return this.membershipToResponseDto(m)
  }

  @Put('relations/:rid')
  async updateRelation(
    @Param('rid') rid: string,
    @Body() dto: UpdateHistoricalCountryRelationDto,
    @Request() req: any,
  ): Promise<HistoricalCountryRelationResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const r = await this.historicalCountryService.updateRelation(
      rid,
      {
        relationType: dto.relationType,
        startDate: dto.startDate != null ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate != null ? new Date(dto.endDate) : undefined,
      },
      accountId,
    )
    return this.relationToResponseDto(r)
  }

  /**
   * 역사적 국가 수정
   *
   * @param id 역사적 국가 ID
   * @param dto 역사적 국가 수정 정보
   * @returns 수정된 역사적 국가
   * @tag historical-countries
   */
  @Put(':id')
  async updateHistoricalCountry(
    @Param('id') id: string,
    @Body() dto: UpdateHistoricalCountryDto,
    @Request() req: any,
  ): Promise<HistoricalCountryResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    const country = await this.historicalCountryService.updateHistoricalCountry(
      id,
      {
        name: dto.name,
        enName: dto.enName,
        nameOrigin: dto.nameOrigin,
        description: dto.description,
        history: dto.history,
        foundingNote: dto.foundingNote,
        dissolutionNote: dto.dissolutionNote,
        thumbnailUrl: dto.thumbnailUrl,
        startEra: dto.startEra,
        startYear: dto.startYear,
        startMonth: dto.startMonth,
        startDay: dto.startDay,
        endEra: dto.endEra,
        endYear: dto.endYear,
        endMonth: dto.endMonth,
        endDay: dto.endDay,
        stateType: dto.stateType,
        entityKind: dto.entityKind,
        parentModernCountryIds: dto.parentModernCountryIds,
        parentHistoricalCountryIds: dto.parentHistoricalCountryIds,
        transitionEventType: dto.transitionEventType,
        transitionScope: dto.transitionScope,
      },
      accountId,
    )
    return this.toResponseDto(country)
  }

  /**
   * 계승/변천 관계 삭제
   *
   * @param tid 계승·변천 ID
   * @tag historical-countries
   */
  @Delete('transitions/:tid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTransition(
    @Param('tid') tid: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.historicalCountryService.deleteTransition(tid, accountId)
  }

  @Delete('memberships/:mid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMembership(
    @Param('mid') mid: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.historicalCountryService.deleteMembership(mid, accountId)
  }

  @Delete('relations/:rid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRelation(
    @Param('rid') rid: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.historicalCountryService.deleteRelation(rid, accountId)
  }

  /**
   * 역사적 국가 삭제
   *
   * @param id 역사적 국가 ID
   * @tag historical-countries
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHistoricalCountry(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.historicalCountryService.deleteHistoricalCountry(id, accountId)
  }

  private toResponseDto(
    country: HistoricalCountry,
    parentModernCountryIds?: string[],
    parentHistoricalCountryIds?: string[],
    transitionEventType?: string,
  ): HistoricalCountryResponseDto {
    return {
      id: country.id,
      name: country.name,
      enName: country.enName,
      nameOrigin: country.nameOrigin,
      description: country.description,
      history: country.history ?? null,
      foundingNote: country.foundingNote ?? null,
      dissolutionNote: country.dissolutionNote ?? null,
      thumbnailUrl: country.thumbnailUrl,

      // 존속 시작 정보
      startEra: country.startEra,
      startYear: country.startYear,
      startMonth: country.startMonth,
      startDay: country.startDay,

      // 존속 종료 정보
      endEra: country.endEra,
      endYear: country.endYear,
      endMonth: country.endMonth,
      endDay: country.endDay,

      stateType: country.stateType,
      entityKind: country.entityKind,
      parentModernCountryIds,
      parentHistoricalCountryIds,
      transitionEventType: transitionEventType as HistoricalCountryResponseDto['transitionEventType'],
      createdAt: country.createdAt.toISOString(),
      updatedAt: country.updatedAt.toISOString(),
    }
  }

  private transitionToResponseDto(t: HistoricalCountryTransitionRecord): HistoricalCountryTransitionResponseDto {
    return {
      id: t.id,
      predecessorId: t.predecessorId,
      successorId: t.successorId,
      eventType: t.eventType as HistoricalCountryTransitionResponseDto['eventType'],
      transitionScope: t.transitionScope,
      successorStartDate: t.successorStartDate,
      predecessorName: t.predecessorName,
      successorName: t.successorName,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }
  }

  private membershipToResponseDto(m: import('../domain/historical-country-membership.repository').HistoricalCountryMembershipRecord): HistoricalCountryMembershipResponseDto {
    return {
      id: m.id,
      historicalCountryId: m.historicalCountryId,
      memberCountryId: m.memberCountryId,
      role: m.role,
      isLeadingMember: m.isLeadingMember,
      start: m.start,
      end: m.end,
      membershipStartDate: m.membershipStartDate?.toISOString() ?? null,
      membershipEndDate: m.membershipEndDate?.toISOString() ?? null,
      parentName: m.parentName,
      memberName: m.memberName,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }
  }

  private relationToResponseDto(r: import('../domain/historical-country-relation.repository').HistoricalCountryRelationRecord): HistoricalCountryRelationResponseDto {
    return {
      id: r.id,
      subjectCountryId: r.subjectCountryId,
      objectCountryId: r.objectCountryId,
      relationType: r.relationType,
      startDate: r.startDate?.toISOString() ?? null,
      endDate: r.endDate?.toISOString() ?? null,
      subjectCountryName: r.subjectCountryName,
      objectCountryName: r.objectCountryName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }
  }
}

/**
 * 소속 기간 입력 → 구조화 시점(3상). 구조화(start/end)가 우선이고, 레거시 ISO 문자열은
 * `new Date()` 없이 손으로 파싱한다(BC 둔갑·서기 1~99년 20xx 둔갑 방지).
 * 반환 객체에 키가 없으면 '건드리지 않음'이다.
 */
function resolveMembershipPeriod(dto: {
  start?: StructuredPointInput | null
  end?: StructuredPointInput | null
  membershipStartDate?: string
  membershipEndDate?: string
}): { start?: StructuredPoint | null; end?: StructuredPoint | null } {
  const pick = (
    structured: StructuredPointInput | null | undefined,
    legacy: string | undefined,
    label: string,
  ): StructuredPoint | null | undefined => {
    if (structured !== undefined) return structured ? normalizePoint(structured, label) : null
    if (legacy) return parseLegacyIsoPoint(legacy, label)
    return undefined
  }
  const start = pick(dto.start, dto.membershipStartDate, 'start')
  const end = pick(dto.end, dto.membershipEndDate, 'end')
  if (start !== undefined && end !== undefined) assertPointOrder(start, end)
  return {
    ...(start !== undefined && { start }),
    ...(end !== undefined && { end }),
  }
}
