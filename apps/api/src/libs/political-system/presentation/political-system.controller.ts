import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'
import {
  doesIntervalOverlapConstituentWindows,
  extractRecordPeriodKeys,
  groupConstituentWindowsByMemberId,
  parseIncludeConstituentsFlag,
  resolveConstituentPolityWindows,
} from '../../shared/historical-constituent-rollup'

import type {
  CreatePoliticalSystemDto,
  PoliticalSystemResponseDto,
  PromotePoliticalSystemHeadPositionsDto,
  PromotePoliticalSystemHeadPositionsResponseDto,
  UpdatePoliticalSystemDto,
} from './dto/political-system.dto'

/** 목록·정렬·기간 검증용 부호 연·월·일 키. BC는 음수 — 문자열·절댓값 비교는 BC를 뒤집는다. */
function signedDateKey(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  edge: 'start' | 'end',
): number {
  if (year == null) return Number.POSITIVE_INFINITY
  const sign = era === 'BC' ? -1 : 1
  const m = month ?? (edge === 'start' ? 1 : 12)
  const d = day ?? (edge === 'start' ? 1 : 31)
  return sign * year * 10000 + m * 100 + d
}

const COUNTRY_REF_SELECT = { select: { id: true, name: true } } as const

/** 직함은 관직 정의 카탈로그가 정본 — 표시에 필요한 칸만 딸려 보낸다 */
const POSITION_REF_SELECT = {
  select: {
    id: true,
    title: true,
    titleLocal: true,
    positionType: true,
    isMonarchical: true,
  },
} as const

/** 응답 include 한 벌 — 목록·단건·생성·수정이 같은 모양을 내려야 한다 */
const RESPONSE_INCLUDE = {
  country: COUNTRY_REF_SELECT,
  historicalCountry: COUNTRY_REF_SELECT,
  headOfStatePosition: POSITION_REF_SELECT,
  headOfGovernmentPosition: POSITION_REF_SELECT,
  commanderInChiefPosition: POSITION_REF_SELECT,
  lowerChamber: { select: { id: true, name: true, localName: true, role: true } },
  upperChamber: { select: { id: true, name: true, localName: true, role: true } },
  warConsentChamber: { select: { id: true, name: true, localName: true, role: true } },
  constitutionLaw: {
    select: { id: true, name: true, startDate: true, endDate: true },
  },
  foundingEvent: {
    select: {
      id: true,
      title: true,
      startEra: true,
      startYear: true,
      startMonth: true,
      startDay: true,
      deletedAt: true,
    },
  },
} as const

/**
 * 정체(政體) CRUD — 대통령제/의원내각제, 단원제/양원제 등.
 *
 * 국가에 붙은 붙박이 필드가 아니라 기간을 가진 레코드다. 한 국가에 여러 줄이 붙는다
 * (프랑스 제3·4·5공화국). 현대 국가·과거 국가 양쪽에 붙는다.
 */
@ApiTags('political-systems')
@Controller('political-systems')
@UseGuards(AuthGuard('jwt'))
export class PoliticalSystemController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 정체 목록.
   *
   * `countryId`를 주면 그 현대 국가에 연결된 **과거 국가의 정체까지** 함께 온다
   * (브리지 스코프 공용 헬퍼 — 사건·인물 지면과 같은 규약). 대한민국을 열면 대한제국·
   * 조선의 정체도 한 시간축에 놓인다.
   *
   * @tag political-systems
   */
  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('includeConstituents') includeConstituents?: string,
  ): Promise<PoliticalSystemResponseDto[]> {
    const shouldIncludeConstituents =
      Boolean(historicalCountryId) &&
      parseIncludeConstituentsFlag(includeConstituents)

    const constituentWindows =
      historicalCountryId && shouldIncludeConstituents
        ? await resolveConstituentPolityWindows(
            this.prisma,
            historicalCountryId,
          )
        : []
    const constituentByMemberId =
      groupConstituentWindowsByMemberId(constituentWindows)

    let where: Prisma.PoliticalSystemWhereInput = {}

    if (historicalCountryId) {
      where.historicalCountryId =
        constituentByMemberId.size > 0
          ? { in: [historicalCountryId, ...constituentByMemberId.keys()] }
          : historicalCountryId
    } else if (countryId) {
      where = (await resolveCountryScopeOr(
        this.prisma,
        countryId,
      )) as Prisma.PoliticalSystemWhereInput
    }

    const rawRows = await this.prisma.politicalSystem.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: RESPONSE_INCLUDE,
    })

    const rows =
      historicalCountryId && constituentByMemberId.size > 0
        ? rawRows.filter((row) => {
            if (row.historicalCountryId === historicalCountryId) return true
            if (!row.historicalCountryId) return false
            const memberWindows = constituentByMemberId.get(
              row.historicalCountryId,
            )
            if (!memberWindows) return false
            const bounds = extractRecordPeriodKeys({
              startEra: row.startEra,
              startYear: row.startYear,
              startMonth: row.startMonth,
              startDay: row.startDay,
              endEra: row.endEra,
              endYear: row.endYear,
              endMonth: row.endMonth,
              endDay: row.endDay,
            })
            return doesIntervalOverlapConstituentWindows(
              bounds.startKey,
              bounds.endKey,
              memberWindows,
              'institution',
            )
          })
        : rawRows

    // 정렬은 부호 연·월·일로 — Prisma orderBy는 startYear만 보므로 BC가 뒤집히고 동년 내 교체 순서가 섞인다.
    // 연도 미상은 항상 끝(signedDateKey가 +Infinity).
    return rows
      .sort(
        (left, right) =>
          signedDateKey(left.startEra, left.startYear, left.startMonth, left.startDay, 'start') -
          signedDateKey(right.startEra, right.startYear, right.startMonth, right.startDay, 'start'),
      )
      .map((row) => this.sanitizeFoundingEvent(row)) as PoliticalSystemResponseDto[]
  }

  /**
   * 미연결 수기 수반 직함(`headOfStateTitle` / `headOfGovernmentTitle`)을
   * 관직 정의 카탈로그(`GovernmentPositionDefinition`)로 일괄 승격·연결한다.
   *
   * @tag political-systems
   */
  @Post('promote-head-positions')
  async promoteHeadPositions(
    @Body() dto: PromotePoliticalSystemHeadPositionsDto,
    @Request() req: any,
  ): Promise<PromotePoliticalSystemHeadPositionsResponseDto> {
    const accountId: string | undefined = req.user?.id ?? req.user?.sub
    const cid = dto.countryId?.trim() || null
    const hid = dto.historicalCountryId?.trim() || null
    if (!cid && !hid) {
      throw new BadRequestException(
        '일괄 승격 대상 국가(countryId 또는 historicalCountryId)를 지정해 주세요',
      )
    }
    const createMissing = dto.createMissingDefinitions !== false

    let scopeWhere: Prisma.PoliticalSystemWhereInput
    if (hid) {
      const constituentWindows = await resolveConstituentPolityWindows(
        this.prisma,
        hid,
      )
      const memberIds = Array.from(
        new Set([hid, ...constituentWindows.map((win) => win.memberCountryId)]),
      )
      scopeWhere = {
        historicalCountryId: memberIds.length > 1 ? { in: memberIds } : hid,
      }
    } else {
      scopeWhere = (await resolveCountryScopeOr(
        this.prisma,
        cid!,
      )) as Prisma.PoliticalSystemWhereInput
    }

    const targets = await this.prisma.politicalSystem.findMany({
      where: {
        AND: [
          scopeWhere,
          {
            OR: [
              {
                headOfStatePositionId: null,
                headOfStateTitle: { not: null },
              },
              {
                headOfGovernmentPositionId: null,
                headOfGovernmentTitle: { not: null },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        accountId: true,
        countryId: true,
        historicalCountryId: true,
        governmentForm: true,
        headOfStatePositionId: true,
        headOfStateTitle: true,
        headOfGovernmentPositionId: true,
        headOfGovernmentTitle: true,
      },
    })

    const updatedSystemIds: string[] = []
    let createdDefinitionCount = 0

    for (const sys of targets) {
      if (sys.accountId && sys.accountId !== accountId) continue
      const sysAxis = {
        countryId: sys.countryId ?? null,
        historicalCountryId: sys.historicalCountryId ?? null,
      }
      const patch: UpdatePoliticalSystemDto = {
        headOfStatePositionId: sys.headOfStatePositionId,
        headOfStateTitle: sys.headOfStateTitle,
        headOfGovernmentPositionId: sys.headOfGovernmentPositionId,
        headOfGovernmentTitle: sys.headOfGovernmentTitle,
      }

      await this.promoteFreeTextPositionRefs(patch, sysAxis)

      if (createMissing && this.prisma.governmentPositionDefinition?.create) {
        const missingSlots: Array<{
          posKey: 'headOfStatePositionId' | 'headOfGovernmentPositionId'
          titleKey: 'headOfStateTitle' | 'headOfGovernmentTitle'
          expectedType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
        }> = [
          {
            posKey: 'headOfStatePositionId',
            titleKey: 'headOfStateTitle',
            expectedType: 'HEAD_OF_STATE',
          },
          {
            posKey: 'headOfGovernmentPositionId',
            titleKey: 'headOfGovernmentTitle',
            expectedType: 'HEAD_OF_GOVERNMENT',
          },
        ]

        for (const slot of missingSlots) {
          if (patch[slot.posKey]) continue
          const remainingTitle = patch[slot.titleKey]?.trim()
          if (!remainingTitle) continue

          const inferredMonarchical =
            slot.expectedType === 'HEAD_OF_STATE' &&
            (sys.governmentForm === 'ABSOLUTE_MONARCHY' ||
              sys.governmentForm === 'CONSTITUTIONAL_MONARCHY' ||
              /국왕|여왕|황제|천황|대공|술탄|차르|샤|파라오|칸|군주|태왕|가한/i.test(
                remainingTitle,
              ))

          const createdDef =
            await this.prisma.governmentPositionDefinition.create({
              data: {
                title: remainingTitle,
                positionType: slot.expectedType,
                isMonarchical: inferredMonarchical,
                isGeneric: false,
                ...(sysAxis.countryId || sysAxis.historicalCountryId
                  ? {
                      scopes: {
                        create: {
                          countryId: sysAxis.historicalCountryId
                            ? null
                            : sysAxis.countryId,
                          historicalCountryId: sysAxis.historicalCountryId,
                        },
                      },
                    }
                  : {}),
              },
              select: { id: true },
            })
          createdDefinitionCount += 1
          patch[slot.posKey] = createdDef.id
          patch[slot.titleKey] = null
        }
      }

      const hosPromoted =
        !sys.headOfStatePositionId && Boolean(patch.headOfStatePositionId)
      const hogPromoted =
        !sys.headOfGovernmentPositionId &&
        Boolean(patch.headOfGovernmentPositionId)

      if (hosPromoted || hogPromoted) {
        await this.prisma.politicalSystem.update({
          where: { id: sys.id },
          data: {
            ...(hosPromoted
              ? {
                  headOfStatePositionId: patch.headOfStatePositionId,
                  headOfStateTitle: null,
                }
              : {}),
            ...(hogPromoted
              ? {
                  headOfGovernmentPositionId: patch.headOfGovernmentPositionId,
                  headOfGovernmentTitle: null,
                }
              : {}),
          },
        })
        updatedSystemIds.push(sys.id)
      }
    }

    return {
      updatedSystemCount: updatedSystemIds.length,
      createdDefinitionCount,
      updatedSystemIds,
    }
  }

  /** @tag political-systems */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<PoliticalSystemResponseDto> {
    const row = await this.prisma.politicalSystem.findUnique({
      where: { id },
      include: RESPONSE_INCLUDE,
    })
    if (!row) throw new NotFoundException('정체를 찾을 수 없습니다')
    return this.sanitizeFoundingEvent(row) as PoliticalSystemResponseDto
  }

  /** @tag political-systems */
  @Post()
  async create(
    @Body() dto: CreatePoliticalSystemDto,
    @Request() req: any,
  ): Promise<PoliticalSystemResponseDto> {
    const accountId: string | undefined = req.user?.id ?? req.user?.sub
    const { countryId, historicalCountryId, ...rest } = dto

    const resolvedAxis = await this.resolveCountryAxis(countryId, historicalCountryId)
    const normalizedRest: CreatePoliticalSystemDto = {
      ...rest,
      ...(rest.startYear != null && !rest.startEra && { startEra: 'AD' }),
      ...(rest.endYear != null &&
        !rest.endEra && { endEra: (rest.startEra ?? 'AD') }),
    }
    this.assertPeriodOrder(normalizedRest)
    await this.promoteFreeTextPositionRefs(normalizedRest, resolvedAxis)
    await this.assertPositionRefs(normalizedRest, resolvedAxis)
    await this.assertConstitutionAndEventRefs(normalizedRest, resolvedAxis)

    const createData = await this.withChamberCache(this.writable(normalizedRest))
    const row = await this.prisma.politicalSystem.create({
      data: {
        ...createData,
        countryId: resolvedAxis.countryId,
        historicalCountryId: resolvedAxis.historicalCountryId,
        accountId: accountId ?? null,
      },
      include: RESPONSE_INCLUDE,
    })
    if (normalizedRest.isCurrent) {
      await this.unsetSiblingCurrentSystems(row.id, resolvedAxis)
    }
    return this.sanitizeFoundingEvent(row) as PoliticalSystemResponseDto
  }

  /** @tag political-systems */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePoliticalSystemDto,
    @Request() req: any,
  ): Promise<PoliticalSystemResponseDto> {
    const existing = await this.assertOwnership(id, req)
    const axisChanged =
      dto.countryId !== undefined || dto.historicalCountryId !== undefined
    let resolvedAxis = {
      countryId: existing.countryId,
      historicalCountryId: existing.historicalCountryId,
    }
    if (axisChanged) {
      const nextRawHistoricalCountryId =
        dto.historicalCountryId !== undefined
          ? dto.historicalCountryId
          : existing.historicalCountryId
      const nextRawCountryId =
        dto.countryId !== undefined
          ? dto.countryId
          : dto.historicalCountryId !== undefined && dto.historicalCountryId
            ? undefined
            : existing.countryId
      resolvedAxis = await this.resolveCountryAxis(
        nextRawCountryId,
        nextRawHistoricalCountryId,
      )
    }

    const effectiveStartYear =
      dto.startYear !== undefined ? dto.startYear : existing.startYear
    const effectiveStartEra =
      (dto.startEra !== undefined ? dto.startEra : (existing.startEra as any)) ??
      (effectiveStartYear != null ? 'AD' : null)
    const effectiveEndYear =
      dto.endYear !== undefined ? dto.endYear : existing.endYear
    const effectiveEndEra =
      effectiveEndYear != null
        ? ((dto.endEra !== undefined ? dto.endEra : (existing.endEra as any)) ??
          effectiveStartEra ??
          'AD')
        : null

    this.assertPeriodOrder({
      startEra: effectiveStartEra,
      startYear: effectiveStartYear,
      startMonth:
        dto.startYear === null
          ? null
          : dto.startMonth !== undefined
            ? dto.startMonth
            : existing.startMonth,
      startDay:
        dto.startYear === null || dto.startMonth === null
          ? null
          : dto.startDay !== undefined
            ? dto.startDay
            : existing.startDay,
      endEra: effectiveEndEra,
      endYear: effectiveEndYear,
      endMonth:
        dto.endYear === null
          ? null
          : dto.endMonth !== undefined
            ? dto.endMonth
            : existing.endMonth,
      endDay:
        dto.endYear === null || dto.endMonth === null
          ? null
          : dto.endDay !== undefined
            ? dto.endDay
            : existing.endDay,
      lowerHouseSeats:
        dto.lowerHouseSeats !== undefined
          ? dto.lowerHouseSeats
          : existing.lowerHouseSeats,
      upperHouseSeats:
        dto.upperHouseSeats !== undefined
          ? dto.upperHouseSeats
          : existing.upperHouseSeats,
    })
    await this.promoteFreeTextPositionRefs(dto, resolvedAxis)
    await this.assertPositionRefs(
      {
        headOfStatePositionId:
          dto.headOfStatePositionId !== undefined
            ? dto.headOfStatePositionId
            : axisChanged
              ? existing.headOfStatePositionId
              : undefined,
        headOfGovernmentPositionId:
          dto.headOfGovernmentPositionId !== undefined
            ? dto.headOfGovernmentPositionId
            : axisChanged
              ? existing.headOfGovernmentPositionId
              : undefined,
        commanderInChiefPositionId:
          dto.commanderInChiefPositionId !== undefined
            ? dto.commanderInChiefPositionId
            : axisChanged
              ? existing.commanderInChiefPositionId
              : undefined,
      },
      resolvedAxis,
    )
    await this.assertConstitutionAndEventRefs(
      {
        constitutionLawId:
          dto.constitutionLawId !== undefined
            ? dto.constitutionLawId
            : axisChanged
              ? existing.constitutionLawId
              : undefined,
        foundingEventId: dto.foundingEventId,
      },
      resolvedAxis,
    )

    const writeData = await this.withChamberCache(this.writable(dto))
    if (effectiveStartYear != null && dto.startEra === undefined && !existing.startEra) {
      writeData.startEra = effectiveStartEra
    } else if (dto.startYear === null && dto.startEra === undefined) {
      writeData.startEra = null
      if (dto.startMonth === undefined) writeData.startMonth = null
      if (dto.startDay === undefined) writeData.startDay = null
    } else if (dto.startMonth === null && dto.startDay === undefined) {
      writeData.startDay = null
    }
    if (effectiveEndYear != null && dto.endEra === undefined && !existing.endEra) {
      writeData.endEra = effectiveEndEra
    } else if (dto.endYear === null && dto.endEra === undefined) {
      writeData.endEra = null
      if (dto.endMonth === undefined) writeData.endMonth = null
      if (dto.endDay === undefined) writeData.endDay = null
    } else if (dto.endMonth === null && dto.endDay === undefined) {
      writeData.endDay = null
    }
    if (axisChanged) {
      writeData.countryId = resolvedAxis.countryId
      writeData.historicalCountryId = resolvedAxis.historicalCountryId
    }

    const row = await this.prisma.politicalSystem.update({
      where: { id },
      data: writeData,
      include: RESPONSE_INCLUDE,
    })
    if (dto.isCurrent === true) {
      await this.unsetSiblingCurrentSystems(id, resolvedAxis)
    }
    return this.sanitizeFoundingEvent(row) as PoliticalSystemResponseDto
  }

  /** @tag political-systems */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    await this.assertOwnership(id, req)
    await this.prisma.politicalSystem.delete({ where: { id } })
  }

  /**
   * 소유권 확인. accountId가 비어 있는 행(공유 정본)은 누구나 손댈 수 있게 두고,
   * 주인이 있는 행은 그 계정만 고칠 수 있다.
   */
  private async assertOwnership(id: string, req: any) {
    const accountId: string | undefined = req.user?.id ?? req.user?.sub
    const existing = await this.prisma.politicalSystem.findUnique({
      where: { id },
      select: {
        accountId: true,
        countryId: true,
        historicalCountryId: true,
        headOfStatePositionId: true,
        headOfGovernmentPositionId: true,
        commanderInChiefPositionId: true,
        constitutionLawId: true,
        foundingEventId: true,
        startEra: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        endEra: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        lowerHouseSeats: true,
        upperHouseSeats: true,
      },
    })
    if (!existing) throw new NotFoundException('정체를 찾을 수 없습니다')
    if (existing.accountId && existing.accountId !== accountId) {
      throw new ForbiddenException('이 정체를 수정할 권한이 없습니다')
    }
    return existing
  }

  private async isAxisCompatible(
    leftAxis: { countryId?: string | null; historicalCountryId?: string | null },
    rightAxis: { countryId?: string | null; historicalCountryId?: string | null },
  ): Promise<boolean> {
    if (!leftAxis.countryId && !leftAxis.historicalCountryId) return true
    if (!rightAxis.countryId && !rightAxis.historicalCountryId) return true
    if (leftAxis.historicalCountryId || rightAxis.historicalCountryId) {
      return leftAxis.historicalCountryId === rightAxis.historicalCountryId
    }
    if (
      leftAxis.countryId &&
      rightAxis.countryId &&
      leftAxis.countryId === rightAxis.countryId
    ) {
      return true
    }
    return false
  }

  private async resolveCountryAxis(
    countryId: string | null | undefined,
    historicalCountryId: string | null | undefined,
  ): Promise<{ countryId: string | null; historicalCountryId: string | null }> {
    const cid = countryId?.trim() || null
    const hid = historicalCountryId?.trim() || null
    if (!cid && !hid) {
      throw new BadRequestException(
        'countryId 또는 historicalCountryId 중 하나는 있어야 합니다',
      )
    }
    if (cid) {
      const c = await this.prisma.country.findUnique({
        where: { id: cid },
        select: { id: true },
      })
      if (!c) throw new BadRequestException(`국가를 찾을 수 없습니다: ${cid}`)
    }
    if (hid) {
      const h = await this.prisma.historicalCountry.findUnique({
        where: { id: hid },
        select: { id: true },
      })
      if (!h) throw new BadRequestException(`역사적 국가를 찾을 수 없습니다: ${hid}`)
    }
    if (cid && hid) {
      const bridge = await this.prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: hid, modernCountryId: cid },
        select: { id: true },
      })
      if (!bridge) {
        throw new BadRequestException(
          '지정한 현대 국가와 역사적 국가가 서로 연결되어 있지 않습니다',
        )
      }
      return { countryId: cid, historicalCountryId: hid }
    }
    if (!cid && hid) {
      const links = await this.prisma.historicalCountryModernCountry.findMany({
        where: { historicalCountryId: hid },
        select: { modernCountryId: true },
        take: 2,
      })
      return {
        countryId: links.length === 1 ? links[0].modernCountryId : null,
        historicalCountryId: hid,
      }
    }
    return { countryId: cid, historicalCountryId: null }
  }

  /**
   * 수기 직함 텍스트(headOfStateTitle / headOfGovernmentTitle)만 넘어왔을 때
   * 관직 정의 카탈로그에 동명·동유형의 호환 정의가 이미 등록되어 있다면 자동으로 정본 PositionId FK로 승격한다.
   */
  private async promoteFreeTextPositionRefs(
    dto: UpdatePoliticalSystemDto,
    targetAxis: { countryId: string | null; historicalCountryId: string | null },
  ) {
    if (!this.prisma.governmentPositionDefinition?.findMany) return
    const axes: Array<{
      posKey: 'headOfStatePositionId' | 'headOfGovernmentPositionId'
      titleKey: 'headOfStateTitle' | 'headOfGovernmentTitle'
      expectedType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
    }> = [
      {
        posKey: 'headOfStatePositionId',
        titleKey: 'headOfStateTitle',
        expectedType: 'HEAD_OF_STATE',
      },
      {
        posKey: 'headOfGovernmentPositionId',
        titleKey: 'headOfGovernmentTitle',
        expectedType: 'HEAD_OF_GOVERNMENT',
      },
    ]

    for (const axisSpec of axes) {
      if (dto[axisSpec.posKey]) continue
      const rawTitle = dto[axisSpec.titleKey]?.trim()
      if (!rawTitle) continue

      const candidates =
        await this.prisma.governmentPositionDefinition.findMany({
          where: {
            title: rawTitle,
            positionType: axisSpec.expectedType,
            isGeneric: false,
          },
          select: {
            id: true,
            administrationDepartment: {
              select: { countryId: true, historicalCountryId: true },
            },
            scopes: {
              select: { countryId: true, historicalCountryId: true },
            },
          },
        })
      if (!Array.isArray(candidates) || candidates.length === 0) continue

      let scopedMatchId: string | null = null
      let globalMatchId: string | null = null

      for (const cand of candidates) {
        if (
          cand.administrationDepartment &&
          (cand.administrationDepartment.countryId ||
            cand.administrationDepartment.historicalCountryId)
        ) {
          const ok = await this.isAxisCompatible(
            targetAxis,
            cand.administrationDepartment,
          )
          if (!ok) continue
          scopedMatchId = scopedMatchId ?? cand.id
          continue
        }
        const activeScopes = (cand.scopes ?? []).filter((s) =>
          Boolean(s.countryId || s.historicalCountryId),
        )
        if (activeScopes.length === 0) {
          globalMatchId = globalMatchId ?? cand.id
          continue
        }
        for (const scope of activeScopes) {
          if (await this.isAxisCompatible(targetAxis, scope)) {
            scopedMatchId = scopedMatchId ?? cand.id
            break
          }
        }
      }

      const promotedId = scopedMatchId ?? globalMatchId
      if (promotedId) {
        dto[axisSpec.posKey] = promotedId
        dto[axisSpec.titleKey] = null
      }
    }
  }

  /**
   * 카탈로그 참조 검증. 없는 id면 FK 위반이 500으로 새고, 유형이 어긋난 정의
   * (예: 국가원수 칸에 각료 정의)나 타국 전용 스코프 정의를 그대로 받으면 정합성이 깨진다.
   */
  private async assertPositionRefs(
    dto: UpdatePoliticalSystemDto,
    targetAxis?: { countryId: string | null; historicalCountryId: string | null },
  ) {
    const checks: Array<{
      id: string
      allowedTypes: readonly string[]
      label: string
    }> = []
    if (dto.headOfStatePositionId)
      checks.push({
        id: dto.headOfStatePositionId,
        allowedTypes: ['HEAD_OF_STATE'],
        label: '국가원수',
      })
    if (dto.headOfGovernmentPositionId)
      checks.push({
        id: dto.headOfGovernmentPositionId,
        allowedTypes: ['HEAD_OF_GOVERNMENT'],
        label: '정부수반',
      })
    if (dto.commanderInChiefPositionId)
      checks.push({
        id: dto.commanderInChiefPositionId,
        allowedTypes: [
          'HEAD_OF_STATE',
          'HEAD_OF_GOVERNMENT',
          'MILITARY_COMMANDER',
        ],
        label: '군 최고통수권자',
      })
    if (checks.length === 0) return

    const definitions = await this.prisma.governmentPositionDefinition.findMany({
      where: { id: { in: checks.map((check) => check.id) } },
      select: {
        id: true,
        title: true,
        isGeneric: true,
        positionType: true,
        administrationDepartment: {
          select: { countryId: true, historicalCountryId: true },
        },
        scopes: {
          select: { countryId: true, historicalCountryId: true },
        },
      },
    })
    for (const check of checks) {
      const found = definitions.find((def) => def.id === check.id)
      if (!found) {
        throw new BadRequestException(
          `${check.label} 직함으로 지정한 관직 정의를 찾을 수 없습니다`,
        )
      }
      if (!check.allowedTypes.includes(found.positionType)) {
        throw new BadRequestException(
          `${check.label} 칸에는 ${check.label} 유형의 관직 정의만 지정할 수 있습니다`,
        )
      }
      if (found.isGeneric) {
        throw new BadRequestException(
          `${check.label} 칸에는 시스템 범용 더미 직위 대신 실제 수반 직위 정의(예: 대통령·총리·국왕)를 선택해 주세요`,
        )
      }
      if (targetAxis && !found.isGeneric) {
        if (
          found.administrationDepartment &&
          (found.administrationDepartment.countryId ||
            found.administrationDepartment.historicalCountryId)
        ) {
          const deptCompatible = await this.isAxisCompatible(
            targetAxis,
            found.administrationDepartment,
          )
          if (!deptCompatible) {
            throw new BadRequestException(
              `${check.label} 직함(${found.title})이 귀속된 국가 기관의 국가·시대와 이 정체의 국가·시대가 일치하지 않습니다`,
            )
          }
        }
        const activeScopes = (found.scopes ?? []).filter(
          (s) => Boolean(s.countryId || s.historicalCountryId),
        )
        if (activeScopes.length > 0) {
          let matched = false
          for (const scope of activeScopes) {
            if (await this.isAxisCompatible(targetAxis, scope)) {
              matched = true
              break
            }
          }
          if (!matched) {
            throw new BadRequestException(
              `${check.label} 직함(${found.title})의 적용 국가 범위와 이 정체의 국가·시대가 일치하지 않습니다`,
            )
          }
        }
      }
    }
  }

  /** 시작이 끝보다 뒤면 거른다 — BC 및 같은 해 내 월·일 순서, 연·월·일 및 의석수 범위까지 함께 검증한다. */
  private assertPeriodOrder(dto: UpdatePoliticalSystemDto) {
    const validateEdge = (
      label: string,
      year: number | null | undefined,
      month: number | null | undefined,
      day: number | null | undefined,
    ) => {
      if (year != null && (!Number.isInteger(year) || year < 1)) {
        throw new BadRequestException(`${label} 연도는 1 이상의 정수여야 합니다`)
      }
      if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
        throw new BadRequestException(`${label} 월은 1~12 사이여야 합니다`)
      }
      if (day != null && (!Number.isInteger(day) || day < 1 || day > 31)) {
        throw new BadRequestException(`${label} 일은 1~31 사이여야 합니다`)
      }
      if (year == null && (month != null || day != null)) {
        throw new BadRequestException(`${label} 연도 없이 월·일만 입력할 수 없습니다`)
      }
      if (month == null && day != null) {
        throw new BadRequestException(`${label} 월 없이 일만 입력할 수 없습니다`)
      }
    }

    validateEdge('시작', dto.startYear, dto.startMonth, dto.startDay)
    validateEdge('종료', dto.endYear, dto.endMonth, dto.endDay)

    if (
      dto.lowerHouseSeats != null &&
      (!Number.isInteger(dto.lowerHouseSeats) || dto.lowerHouseSeats < 0)
    ) {
      throw new BadRequestException('하원(단원) 의석수는 0 이상의 정수여야 합니다')
    }
    if (
      dto.upperHouseSeats != null &&
      (!Number.isInteger(dto.upperHouseSeats) || dto.upperHouseSeats < 0)
    ) {
      throw new BadRequestException('상원 의석수는 0 이상의 정수여야 합니다')
    }

    const termFields: Array<{ label: string; value: number | null | undefined }> = [
      { label: '국가원수 임기(년)', value: dto.headOfStateTermYears },
      { label: '국가원수 중임 상한(회)', value: dto.headOfStateTermLimit },
      { label: '하원·단원 임기(년)', value: dto.lowerHouseTermYears },
      { label: '상원 임기(년)', value: dto.upperHouseTermYears },
    ]
    for (const field of termFields) {
      if (
        field.value != null &&
        (!Number.isInteger(field.value) || field.value < 1 || field.value > 100)
      ) {
        throw new BadRequestException(`${field.label}는 1~100 사이의 정수여야 합니다`)
      }
    }
    if (
      dto.electoralThresholdPercent != null &&
      (!Number.isFinite(dto.electoralThresholdPercent) ||
        dto.electoralThresholdPercent < 0 ||
        dto.electoralThresholdPercent > 100)
    ) {
      throw new BadRequestException('봉쇄조항 기준 득표율(%)은 0~100 사이여야 합니다')
    }

    const start = signedDateKey(
      dto.startEra ?? 'AD',
      dto.startYear ?? null,
      dto.startMonth ?? null,
      dto.startDay ?? null,
      'start',
    )
    const end = signedDateKey(
      dto.endEra ?? dto.startEra ?? 'AD',
      dto.endYear ?? null,
      dto.endMonth ?? null,
      dto.endDay ?? null,
      'end',
    )
    if (Number.isFinite(start) && Number.isFinite(end) && start > end) {
      throw new BadRequestException('시작 시점이 종료 시점보다 뒤일 수 없습니다')
    }
  }

  /**
   * 원을 고르면 이름 칸은 그 원의 표시 캐시 — '대의원(Camera dei Deputati)'. 대시보드가 이 칸을 읽는다.
   * 없는 원 id는 400.
   */
  private async withChamberCache(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    for (const side of ['lower', 'upper'] as const) {
      const chamberId = data[`${side}ChamberId`]
      if (typeof chamberId !== 'string' || !chamberId) continue
      const chamber = await this.prisma.chamber.findUnique({
        where: { id: chamberId },
        select: { name: true, localName: true },
      })
      if (!chamber) throw new BadRequestException('원을 찾을 수 없습니다.')
      data[`${side}HouseName`] = chamber.localName ? `${chamber.name}(${chamber.localName})` : chamber.name
    }
    if (
      typeof data.warConsentChamberId === 'string' &&
      data.warConsentChamberId
    ) {
      const consentChamber = await this.prisma.chamber?.findUnique({
        where: { id: data.warConsentChamberId },
        select: { id: true },
      })
      if (!consentChamber) {
        throw new BadRequestException('개전·선전포고 동의 의회 원을 찾을 수 없습니다.')
      }
    }
    return data
  }

  /**
   * 보내온 키만 추린다. `undefined`인 키는 빼서 부분 갱신이 유지되고,
   * 명시적 `null`은 그대로 넘겨 값 삭제가 된다.
   */
  private writable(dto: UpdatePoliticalSystemDto) {
    const data: Record<string, unknown> = {}
    const keys: (keyof UpdatePoliticalSystemDto)[] = [
      'name',
      'startEra',
      'startYear',
      'startMonth',
      'startDay',
      'endEra',
      'endYear',
      'endMonth',
      'endDay',
      'isCurrent',
      'governmentForm',
      'legislatureType',
      'lowerHouseName',
      'lowerHouseSeats',
      'upperHouseName',
      'upperHouseSeats',
      'lowerChamberId',
      'upperChamberId',
      'headOfStatePositionId',
      'headOfStateTitle',
      'headOfStateHasPower',
      'headOfGovernmentPositionId',
      'headOfGovernmentTitle',
      'headOfGovernmentHasPower',
      'stateStructure',
      'partySystem',
      'headSelectionMethod',
      'headOfStateTermYears',
      'headOfStateTermLimit',
      'lowerHouseTermYears',
      'upperHouseTermYears',
      'electoralSystem',
      'electoralThresholdPercent',
      'warPowerAuthority',
      'warConsentChamberId',
      'commanderInChiefPositionId',
      'warPowerNotes',
      'constitutionLawId',
      'foundingEventId',
      'notes',
    ]
    for (const key of keys) {
      if (dto[key] !== undefined) data[key] = dto[key]
    }
    if (typeof data.constitutionLawId === 'string') {
      data.constitutionLawId = data.constitutionLawId.trim() || null
    }
    if (typeof data.foundingEventId === 'string') {
      data.foundingEventId = data.foundingEventId.trim() || null
    }
    if (typeof data.warConsentChamberId === 'string') {
      data.warConsentChamberId = data.warConsentChamberId.trim() || null
    }
    if (typeof data.commanderInChiefPositionId === 'string') {
      data.commanderInChiefPositionId =
        data.commanderInChiefPositionId.trim() || null
    }
    if (typeof data.warPowerNotes === 'string') {
      data.warPowerNotes = data.warPowerNotes.trim() || null
    }
    if (dto.legislatureType === 'UNICAMERAL') {
      data.upperHouseName = null
      data.upperHouseSeats = null
      data.upperChamberId = null
      data.upperHouseTermYears = null
    } else if (dto.legislatureType === 'NONE') {
      data.lowerHouseName = null
      data.lowerHouseSeats = null
      data.upperHouseName = null
      data.upperHouseSeats = null
      data.lowerChamberId = null
      data.upperChamberId = null
      data.lowerHouseTermYears = null
      data.upperHouseTermYears = null
      data.electoralSystem = null
      data.electoralThresholdPercent = null
      data.warConsentChamberId = null
    }
    if (
      dto.warPowerAuthority === 'MONARCH_PREROGATIVE' ||
      dto.warPowerAuthority === 'EXECUTIVE_EXCLUSIVE' ||
      dto.warPowerAuthority === 'RENOUNCED'
    ) {
      if (dto.warConsentChamberId === undefined) {
        data.warConsentChamberId = null
      }
    }
    /*
     * 한 직함에 두 진실을 두지 않는다. 카탈로그에서 고른 정의가 오면 같은 축의
     * 자유입력은 비운다 — 남겨 두면 정의를 바꾼 뒤에도 옛 문자열이 화면에 남는다.
     * (반대 방향은 건드리지 않는다: 자유입력만 보내는 건 정의를 떼겠다는 뜻이 아니라
     *  카탈로그에 없는 칭호를 적는 뜻일 수 있어, FK 해제는 명시적 null로만 받는다.)
     */
    if (data.headOfStatePositionId) data.headOfStateTitle = null
    if (data.headOfGovernmentPositionId) data.headOfGovernmentTitle = null
    return data
  }

  private sanitizeFoundingEvent<
    T extends { foundingEvent?: { deletedAt?: Date | null } | null },
  >(row: T): T {
    if (!row || !row.foundingEvent) return row
    if (row.foundingEvent.deletedAt != null) {
      return { ...row, foundingEvent: null }
    }
    const { deletedAt: _deletedAt, ...cleanEvent } = row.foundingEvent as Record<
      string,
      unknown
    >
    return { ...row, foundingEvent: cleanEvent as T['foundingEvent'] }
  }

  /**
   * 동일 정치체(현대 국가 직접 소속 또는 동일 역사 국가)에서 새 현행 체제(isCurrent=true)를 저장하면
   * 기존 현행 체제의 플래그를 내려 복수의 현행 체제가 동시에 남지 않게 정리한다.
   */
  private async unsetSiblingCurrentSystems(
    keepId: string,
    axis: { countryId: string | null; historicalCountryId: string | null },
  ) {
    if (!this.prisma.politicalSystem?.updateMany) return
    const scopeWhere: Prisma.PoliticalSystemWhereInput = axis.historicalCountryId
      ? { historicalCountryId: axis.historicalCountryId }
      : axis.countryId
        ? { countryId: axis.countryId, historicalCountryId: null }
        : {}
    if (Object.keys(scopeWhere).length === 0) return
    await this.prisma.politicalSystem.updateMany({
      where: {
        ...scopeWhere,
        id: { not: keepId },
        isCurrent: true,
      },
      data: { isCurrent: false },
    })
  }

  private async assertConstitutionAndEventRefs(
    dto: Pick<UpdatePoliticalSystemDto, 'constitutionLawId' | 'foundingEventId'>,
    targetAxis: { countryId: string | null; historicalCountryId: string | null },
  ) {
    const lawId = dto.constitutionLawId?.trim()
    if (lawId && this.prisma.law?.findUnique) {
      const law = await this.prisma.law.findUnique({
        where: { id: lawId },
        select: { id: true, name: true, countryId: true, historicalCountryId: true },
      })
      if (!law) {
        throw new BadRequestException('지정한 헌법·기본법 법령을 찾을 수 없습니다')
      }
      const compatible = await this.isLawCompatibleWithAxis(law, targetAxis)
      if (!compatible) {
        throw new BadRequestException(
          `법령(${law.name})의 소속 국가·시대와 이 정체의 국가·시대가 일치하지 않습니다`,
        )
      }
    }

    const eventId = dto.foundingEventId?.trim()
    if (eventId && this.prisma.event?.findUnique) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, deletedAt: true },
      })
      if (!event || event.deletedAt != null) {
        throw new BadRequestException('지정한 출범 계기 사건을 찾을 수 없습니다')
      }
    }
  }

  private async isLawCompatibleWithAxis(
    law: { countryId: string | null; historicalCountryId: string | null },
    axis: { countryId: string | null; historicalCountryId: string | null },
  ): Promise<boolean> {
    if (!law.countryId && !law.historicalCountryId) return true
    if (law.historicalCountryId && axis.historicalCountryId) {
      return law.historicalCountryId === axis.historicalCountryId
    }
    if (law.countryId && axis.countryId && law.countryId === axis.countryId) {
      return true
    }
    if (this.prisma.historicalCountryModernCountry?.findFirst) {
      if (law.historicalCountryId && axis.countryId) {
        const link = await this.prisma.historicalCountryModernCountry.findFirst({
          where: {
            historicalCountryId: law.historicalCountryId,
            modernCountryId: axis.countryId,
          },
          select: { id: true },
        })
        return Boolean(link)
      }
      if (axis.historicalCountryId && law.countryId) {
        const link = await this.prisma.historicalCountryModernCountry.findFirst({
          where: {
            historicalCountryId: axis.historicalCountryId,
            modernCountryId: law.countryId,
          },
          select: { id: true },
        })
        return Boolean(link)
      }
    }
    return false
  }
}
