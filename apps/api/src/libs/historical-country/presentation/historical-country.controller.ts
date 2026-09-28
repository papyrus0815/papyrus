import {
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
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
import type { FirstRulerDto, FoundingSummaryDto, LinkedCountryDto } from './dto/founding-summary.response'
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
    const firstReign =
      numberedReign ?? [...reigns].sort((left, right) => reignStart(left) - reignStart(right))[0]
    if (firstReign) {
      firstRulers.push({
        kind: 'monarch',
        recordId: firstReign.id,
        regnalName: firstReign.regnalName ?? null,
        title: firstReign.positionDefinition?.title ?? null,
        basis: numberedReign ? 'numbered' : 'earliest',
        startEra: (firstReign.startEra as 'BC' | 'AD' | null) ?? (firstReign.startDate ? 'AD' : null),
        startYear: firstReign.startYear ?? firstReign.startDate?.getUTCFullYear() ?? null,
        endEra: (firstReign.endEra as 'BC' | 'AD' | null) ?? (firstReign.endDate ? 'AD' : null),
        endYear: firstReign.endYear ?? firstReign.endDate?.getUTCFullYear() ?? null,
        person: firstReign.person,
      })
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
      firstRulers.push({
        kind,
        recordId: first.id,
        regnalName: null,
        title: first.positionDefinition?.title?.trim() || first.title?.trim() || null,
        basis: numbered ? 'numbered' : 'earliest',
        startEra: 'AD',
        startYear: first.startDate.getUTCFullYear(),
        endEra: first.endDate ? 'AD' : null,
        endYear: first.endDate ? first.endDate.getUTCFullYear() : null,
        person: first.person,
      })
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

    return {
      foundingNote: country.foundingNote ?? null,
      dissolutionNote: country.dissolutionNote ?? null,
      firstRulers,
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
        membershipStartDate: dto.membershipStartDate ? new Date(dto.membershipStartDate) : null,
        membershipEndDate: dto.membershipEndDate ? new Date(dto.membershipEndDate) : null,
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
        membershipStartDate: dto.membershipStartDate ? new Date(dto.membershipStartDate) : undefined,
        membershipEndDate: dto.membershipEndDate ? new Date(dto.membershipEndDate) : undefined,
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
