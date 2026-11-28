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

import { resolveLinkedHistoricalCountryIds } from '../../country/domain/country-scope.util'
import {
  doesIntervalOverlapConstituentWindows,
  extractRecordPeriodKeys,
  groupConstituentWindowsByMemberId,
  parseIncludeConstituentsFlag,
  resolveConstituentPolityWindows,
} from '../../shared/historical-constituent-rollup'

import type {
  BatchCreateWarDeclarationDto,
  CreateNarrativeEventInlineDto,
  CreateWarDeclarationDto,
  EraDto,
  UpdateWarDeclarationDto,
  WarDeclarationDirectionFilterDto,
  WarDeclarationKindDto,
  WarDeclarationResponseDto,
  WarTerminationKindDto,
} from './dto/war-declaration.dto'

const VALID_KINDS: ReadonlySet<WarDeclarationKindDto> = new Set([
  'FORMAL_DECLARATION',
  'ULTIMATUM_EXPIRY',
  'ALLIANCE_ENTRY',
  'UNDECLARED_HOSTILITIES',
  'CO_BELLIGERENCY',
  'DIPLOMATIC_SEVERANCE',
])

const VALID_TERMINATIONS: ReadonlySet<WarTerminationKindDto> = new Set([
  'PEACE_TREATY',
  'ARMISTICE',
  'SURRENDER',
  'STATE_EXTINCTION',
  'UNILATERAL_DECLARATION',
  'ONGOING',
])

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

function buildMirrorDateTime(
  era: EraDto | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): Date | null {
  if (!year || era === 'BC' || year < 1000 || year > 9999) return null
  const m = month && month >= 1 && month <= 12 ? month : 1
  const d = day && day >= 1 && day <= 31 ? day : 1
  const iso = `${String(year).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00.000Z`
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function derivePrecision(
  explicit: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): string | null {
  if (year == null) return null
  if (explicit === 'year' || explicit === 'month' || explicit === 'day') {
    return explicit
  }
  if (day != null) return 'day'
  if (month != null) return 'month'
  return 'year'
}

export function buildDefaultWarDeclarationTitle(
  declaringName: string,
  targetName: string,
  kind: WarDeclarationKindDto,
): string {
  switch (kind) {
    case 'ULTIMATUM_EXPIRY':
      return `${declaringName}의 대(對)${targetName} 최후통첩 및 개전`
    case 'ALLIANCE_ENTRY':
      return `${declaringName}의 대(對)${targetName} 참전 선언`
    case 'UNDECLARED_HOSTILITIES':
      return `${declaringName}의 대(對)${targetName} 무선전 개전`
    case 'CO_BELLIGERENCY':
      return `${declaringName}의 대(對)${targetName} 재참전·공동교전 선언`
    case 'DIPLOMATIC_SEVERANCE':
      return `${declaringName}의 대(對)${targetName} 국교 단절`
    case 'FORMAL_DECLARATION':
    default:
      return `${declaringName}의 대(對)${targetName} 선전포고`
  }
}

export const WAR_DECLARATION_INCLUDE = {
  declaringCountry: {
    select: { id: true, name: true, flagEmoji: true, thumbnailUrl: true },
  },
  declaringHistoricalCountry: {
    select: { id: true, name: true, thumbnailUrl: true },
  },
  targetCountry: {
    select: { id: true, name: true, flagEmoji: true, thumbnailUrl: true },
  },
  targetHistoricalCountry: {
    select: { id: true, name: true, thumbnailUrl: true },
  },
  cabinet: {
    select: { id: true, name: true },
  },
  decidedByPerson: {
    select: {
      id: true,
      name: true,
      surname: true,
      middleName: true,
      nameDisplayOrder: true,
      profileImageUrl: true,
      country: { select: { defaultNameDisplayOrder: true } },
    },
  },
  decidedByTenure: {
    select: {
      id: true,
      title: true,
      rankTitle: true,
      positionType: true,
      positionDefinition: {
        select: { id: true, title: true, positionType: true },
      },
    },
  },
  approvedChamber: {
    select: {
      id: true,
      name: true,
      shortName: true,
      localName: true,
      role: true,
    },
  },
  warEvent: {
    select: {
      id: true,
      title: true,
      domain: true,
      type: true,
      startDate: true,
      startEra: true,
      startYear: true,
      startMonth: true,
      startDay: true,
      endDate: true,
      endEra: true,
      endYear: true,
      endMonth: true,
      endDay: true,
      deletedAt: true,
    },
  },
  ultimatumEvent: {
    select: {
      id: true,
      title: true,
      description: true,
      domain: true,
      type: true,
      startDate: true,
      startEra: true,
      startYear: true,
      startMonth: true,
      startDay: true,
      endDate: true,
      endEra: true,
      endYear: true,
      endMonth: true,
      endDay: true,
      deletedAt: true,
    },
  },
  narrativeEvent: {
    select: {
      id: true,
      title: true,
      description: true,
      domain: true,
      type: true,
      startDate: true,
      startEra: true,
      startYear: true,
      startMonth: true,
      startDay: true,
      endDate: true,
      endEra: true,
      endYear: true,
      endMonth: true,
      endDay: true,
      deletedAt: true,
    },
  },
  peaceTreaty: {
    select: {
      id: true,
      name: true,
      alias: true,
      type: true,
      signDate: true,
      effectiveDate: true,
    },
  },
} as const satisfies Prisma.WarDeclarationInclude

type LoadedWarDeclarationRow = Prisma.WarDeclarationGetPayload<{
  include: typeof WAR_DECLARATION_INCLUDE
}>

export function toWarDeclarationResponseDto(
  row: LoadedWarDeclarationRow,
): WarDeclarationResponseDto {
  const declaringName =
    row.declaringHistoricalCountry?.name ??
    row.declaringCountry?.name ??
    '미상 국가'
  const targetName =
    row.targetHistoricalCountry?.name ?? row.targetCountry?.name ?? '미상 국가'
  const kind = row.kind as WarDeclarationKindDto
  const customTitle = row.title?.trim() || null
  const displayTitle =
    customTitle ?? buildDefaultWarDeclarationTitle(declaringName, targetName, kind)

  const sanitizeEvent = (
    ev:
      | LoadedWarDeclarationRow['warEvent']
      | LoadedWarDeclarationRow['ultimatumEvent']
      | LoadedWarDeclarationRow['narrativeEvent'],
  ) => {
    if (!ev || ev.deletedAt != null) return null
    return {
      id: ev.id,
      title: ev.title,
      description: 'description' in ev ? (ev.description ?? null) : undefined,
      domain: ev.domain,
      type: ev.type ?? null,
      startDate: ev.startDate ? ev.startDate.toISOString() : null,
      startEra: (ev.startEra as EraDto | null) ?? null,
      startYear: ev.startYear ?? null,
      startMonth: ev.startMonth ?? null,
      startDay: ev.startDay ?? null,
      endDate: ev.endDate ? ev.endDate.toISOString() : null,
      endEra: (ev.endEra as EraDto | null) ?? null,
      endYear: ev.endYear ?? null,
      endMonth: ev.endMonth ?? null,
      endDay: ev.endDay ?? null,
    }
  }

  return {
    id: row.id,
    declaringCountryId: row.declaringCountryId ?? null,
    declaringCountry: row.declaringCountry
      ? {
          id: row.declaringCountry.id,
          name: row.declaringCountry.name,
          flagEmoji: row.declaringCountry.flagEmoji ?? null,
          thumbnailUrl: row.declaringCountry.thumbnailUrl ?? null,
        }
      : null,
    declaringHistoricalCountryId: row.declaringHistoricalCountryId ?? null,
    declaringHistoricalCountry: row.declaringHistoricalCountry
      ? {
          id: row.declaringHistoricalCountry.id,
          name: row.declaringHistoricalCountry.name,
          thumbnailUrl: row.declaringHistoricalCountry.thumbnailUrl ?? null,
        }
      : null,
    targetCountryId: row.targetCountryId ?? null,
    targetCountry: row.targetCountry
      ? {
          id: row.targetCountry.id,
          name: row.targetCountry.name,
          flagEmoji: row.targetCountry.flagEmoji ?? null,
          thumbnailUrl: row.targetCountry.thumbnailUrl ?? null,
        }
      : null,
    targetHistoricalCountryId: row.targetHistoricalCountryId ?? null,
    targetHistoricalCountry: row.targetHistoricalCountry
      ? {
          id: row.targetHistoricalCountry.id,
          name: row.targetHistoricalCountry.name,
          thumbnailUrl: row.targetHistoricalCountry.thumbnailUrl ?? null,
        }
      : null,
    kind,
    title: customTitle,
    displayTitle,
    casusBelli: row.casusBelli ?? null,
    summary: row.summary ?? null,

    declaredDate: row.declaredDate ? row.declaredDate.toISOString() : null,
    declaredEra: (row.declaredEra as EraDto | null) ?? null,
    declaredYear: row.declaredYear ?? null,
    declaredMonth: row.declaredMonth ?? null,
    declaredDay: row.declaredDay ?? null,
    declaredPrecision: row.declaredPrecision ?? null,

    severanceEra: (row.severanceEra as EraDto | null) ?? null,
    severanceYear: row.severanceYear ?? null,
    severanceMonth: row.severanceMonth ?? null,
    severanceDay: row.severanceDay ?? null,

    cabinetId: row.cabinetId ?? null,
    cabinet: row.cabinet
      ? { id: row.cabinet.id, name: row.cabinet.name ?? null }
      : null,
    decidedByPersonId: row.decidedByPersonId ?? null,
    decidedByPerson: row.decidedByPerson
      ? {
          id: row.decidedByPerson.id,
          name: row.decidedByPerson.name ?? null,
          surname: row.decidedByPerson.surname ?? null,
          middleName: row.decidedByPerson.middleName ?? null,
          nameDisplayOrder: row.decidedByPerson.nameDisplayOrder ?? null,
          profileImageUrl: row.decidedByPerson.profileImageUrl ?? null,
          defaultNameDisplayOrder:
            row.decidedByPerson.country?.defaultNameDisplayOrder ?? null,
        }
      : null,
    decidedByTenureId: row.decidedByTenureId ?? null,
    decidedByTenure: row.decidedByTenure
      ? {
          id: row.decidedByTenure.id,
          title: row.decidedByTenure.title ?? null,
          rankTitle: row.decidedByTenure.rankTitle ?? null,
          positionType: row.decidedByTenure.positionType,
          positionDefinition: row.decidedByTenure.positionDefinition
            ? {
                id: row.decidedByTenure.positionDefinition.id,
                title: row.decidedByTenure.positionDefinition.title,
                positionType: row.decidedByTenure.positionDefinition.positionType,
              }
            : null,
        }
      : null,

    approvedChamberId: row.approvedChamberId ?? null,
    approvedChamber: row.approvedChamber
      ? {
          id: row.approvedChamber.id,
          name: row.approvedChamber.name,
          shortName: row.approvedChamber.shortName ?? null,
          localName: row.approvedChamber.localName ?? null,
          role: row.approvedChamber.role,
        }
      : null,
    yeas: row.yeas ?? null,
    nays: row.nays ?? null,
    abstentions: row.abstentions ?? null,

    warEventId: row.warEvent && row.warEvent.deletedAt == null ? row.warEventId : null,
    warEvent: sanitizeEvent(row.warEvent),
    ultimatumEventId:
      row.ultimatumEvent && row.ultimatumEvent.deletedAt == null
        ? row.ultimatumEventId
        : null,
    ultimatumEvent: sanitizeEvent(row.ultimatumEvent),
    narrativeEventId:
      row.narrativeEvent && row.narrativeEvent.deletedAt == null
        ? row.narrativeEventId
        : null,
    narrativeEvent: sanitizeEvent(row.narrativeEvent),

    terminationKind: (row.terminationKind as WarTerminationKindDto | null) ?? null,
    endedDate: row.endedDate ? row.endedDate.toISOString() : null,
    endedEra: (row.endedEra as EraDto | null) ?? null,
    endedYear: row.endedYear ?? null,
    endedMonth: row.endedMonth ?? null,
    endedDay: row.endedDay ?? null,
    endedPrecision: row.endedPrecision ?? null,
    peaceTreatyId: row.peaceTreatyId ?? null,
    peaceTreaty: row.peaceTreaty
      ? {
          id: row.peaceTreaty.id,
          name: row.peaceTreaty.name,
          alias: row.peaceTreaty.alias ?? null,
          type: row.peaceTreaty.type,
          signDate: row.peaceTreaty.signDate.toISOString(),
          effectiveDate: row.peaceTreaty.effectiveDate
            ? row.peaceTreaty.effectiveDate.toISOString()
            : null,
        }
      : null,
    terminationNote: row.terminationNote ?? null,

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@ApiTags('war-declarations')
@Controller('war-declarations')
@UseGuards(AuthGuard('jwt'))
export class WarDeclarationController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 선전포고 · 개전 원장 목록 조회.
   *
   * - `countryId` 지정 시: 현대 국가 + 브리지 연결 과거 국가를 묶어 선포국(`ISSUED`)·대상국(`RECEIVED`) 양방향 조회
   * - `historicalCountryId` 지정 시: 해당 과거 국가(+ `includeConstituents=true` 시 구성 정치체) 양방향 조회
   * - `warEventId` / `narrativeEventId` / `peaceTreatyId` 필터 지원
   *
   * @tag war-declarations
   */
  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('includeConstituents') includeConstituents?: string,
    @Query('direction') direction?: WarDeclarationDirectionFilterDto,
    @Query('kind') kind?: WarDeclarationKindDto,
    @Query('warEventId') warEventId?: string,
    @Query('ultimatumEventId') ultimatumEventId?: string,
    @Query('narrativeEventId') narrativeEventId?: string,
    @Query('peaceTreatyId') peaceTreatyId?: string,
  ): Promise<WarDeclarationResponseDto[]> {
    const dir: WarDeclarationDirectionFilterDto =
      direction === 'ISSUED' || direction === 'RECEIVED' ? direction : 'ALL'

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

    const andClauses: Prisma.WarDeclarationWhereInput[] = []

    if (historicalCountryId) {
      const targetHistIds =
        constituentByMemberId.size > 0
          ? [historicalCountryId, ...constituentByMemberId.keys()]
          : [historicalCountryId]
      const histCond =
        targetHistIds.length > 1 ? { in: targetHistIds } : historicalCountryId

      if (dir === 'ISSUED') {
        andClauses.push({ declaringHistoricalCountryId: histCond })
      } else if (dir === 'RECEIVED') {
        andClauses.push({ targetHistoricalCountryId: histCond })
      } else {
        andClauses.push({
          OR: [
            { declaringHistoricalCountryId: histCond },
            { targetHistoricalCountryId: histCond },
          ],
        })
      }
    } else if (countryId) {
      const linkedHistoricalIds = await resolveLinkedHistoricalCountryIds(
        this.prisma,
        countryId,
      )
      const issuedOr: Prisma.WarDeclarationWhereInput[] = [
        { declaringCountryId: countryId },
        ...(linkedHistoricalIds.length > 0
          ? [{ declaringHistoricalCountryId: { in: linkedHistoricalIds } }]
          : []),
      ]
      const receivedOr: Prisma.WarDeclarationWhereInput[] = [
        { targetCountryId: countryId },
        ...(linkedHistoricalIds.length > 0
          ? [{ targetHistoricalCountryId: { in: linkedHistoricalIds } }]
          : []),
      ]
      if (dir === 'ISSUED') {
        andClauses.push({ OR: issuedOr })
      } else if (dir === 'RECEIVED') {
        andClauses.push({ OR: receivedOr })
      } else {
        andClauses.push({ OR: [...issuedOr, ...receivedOr] })
      }
    }

    if (kind && VALID_KINDS.has(kind)) {
      andClauses.push({ kind })
    }
    if (warEventId?.trim()) {
      andClauses.push({ warEventId: warEventId.trim() })
    }
    if (ultimatumEventId?.trim()) {
      andClauses.push({ ultimatumEventId: ultimatumEventId.trim() })
    }
    if (narrativeEventId?.trim()) {
      andClauses.push({ narrativeEventId: narrativeEventId.trim() })
    }
    if (peaceTreatyId?.trim()) {
      andClauses.push({ peaceTreatyId: peaceTreatyId.trim() })
    }

    const rawRows = await this.prisma.warDeclaration.findMany({
      where: andClauses.length > 0 ? { AND: andClauses } : undefined,
      include: WAR_DECLARATION_INCLUDE,
    })

    const filteredRows =
      historicalCountryId && constituentByMemberId.size > 0
        ? rawRows.filter((row) => {
            if (
              row.declaringHistoricalCountryId === historicalCountryId ||
              row.targetHistoricalCountryId === historicalCountryId
            ) {
              return true
            }
            const memberId =
              (row.declaringHistoricalCountryId &&
              constituentByMemberId.has(row.declaringHistoricalCountryId)
                ? row.declaringHistoricalCountryId
                : null) ??
              (row.targetHistoricalCountryId &&
              constituentByMemberId.has(row.targetHistoricalCountryId)
                ? row.targetHistoricalCountryId
                : null)
            if (!memberId) return false
            const windows = constituentByMemberId.get(memberId)
            if (!windows) return false
            const bounds = extractRecordPeriodKeys({
              startEra: row.declaredEra,
              startYear: row.declaredYear,
              startMonth: row.declaredMonth,
              startDay: row.declaredDay,
              endEra: row.endedEra ?? row.declaredEra,
              endYear: row.endedYear ?? row.declaredYear,
              endMonth: row.endedMonth ?? row.declaredMonth,
              endDay: row.endedDay ?? row.declaredDay,
            })
            return doesIntervalOverlapConstituentWindows(
              bounds.startKey,
              bounds.endKey,
              windows,
              'institution',
            )
          })
        : rawRows

    return filteredRows
      .sort(
        (left, right) =>
          signedDateKey(
            left.declaredEra,
            left.declaredYear,
            left.declaredMonth,
            left.declaredDay,
            'start',
          ) -
            signedDateKey(
              right.declaredEra,
              right.declaredYear,
              right.declaredMonth,
              right.declaredDay,
              'start',
            ) || left.createdAt.getTime() - right.createdAt.getTime(),
      )
      .map(toWarDeclarationResponseDto)
  }

  /** @tag war-declarations */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<WarDeclarationResponseDto> {
    const row = await this.prisma.warDeclaration.findUnique({
      where: { id },
      include: WAR_DECLARATION_INCLUDE,
    })
    if (!row) {
      throw new NotFoundException('선전포고·개전 기록을 찾을 수 없습니다')
    }
    return toWarDeclarationResponseDto(row)
  }

  /** @tag war-declarations */
  @Post()
  async create(
    @Body() dto: CreateWarDeclarationDto,
    @Request() req: any,
  ): Promise<WarDeclarationResponseDto> {
    const accountId: string | undefined = req.user?.id ?? req.user?.sub

    const declaring = await this.resolvePartyXor('선포국', {
      countryId: dto.declaringCountryId,
      historicalCountryId: dto.declaringHistoricalCountryId,
    })
    const target = await this.resolvePartyXor('대상국', {
      countryId: dto.targetCountryId,
      historicalCountryId: dto.targetHistoricalCountryId,
    })
    this.assertNotSameParty(declaring, target)

    const kind: WarDeclarationKindDto = dto.kind ?? 'FORMAL_DECLARATION'
    if (!VALID_KINDS.has(kind)) {
      throw new BadRequestException('올바르지 않은 개전 행위 유형입니다')
    }
    if (dto.terminationKind && !VALID_TERMINATIONS.has(dto.terminationKind)) {
      throw new BadRequestException('올바르지 않은 종결 방식입니다')
    }

    const declaredEra: EraDto | null =
      dto.declaredYear != null ? (dto.declaredEra ?? 'AD') : null
    const endedEra: EraDto | null =
      dto.endedYear != null ? (dto.endedEra ?? declaredEra ?? 'AD') : null
    const severanceEra: EraDto | null =
      dto.severanceYear != null ? (dto.severanceEra ?? declaredEra ?? 'AD') : null

    this.validateStructuredDates({
      declaredEra,
      declaredYear: dto.declaredYear ?? null,
      declaredMonth: dto.declaredMonth ?? null,
      declaredDay: dto.declaredDay ?? null,
      endedEra,
      endedYear: dto.endedYear ?? null,
      endedMonth: dto.endedMonth ?? null,
      endedDay: dto.endedDay ?? null,
      severanceYear: dto.severanceYear ?? null,
      severanceMonth: dto.severanceMonth ?? null,
      severanceDay: dto.severanceDay ?? null,
      yeas: dto.yeas ?? null,
      nays: dto.nays ?? null,
      abstentions: dto.abstentions ?? null,
    })

    const refs = await this.validateAndResolveOptionalRefs(dto)

    const declaredPrecision = derivePrecision(
      dto.declaredPrecision,
      dto.declaredYear,
      dto.declaredMonth,
      dto.declaredDay,
    )
    const declaredDate = buildMirrorDateTime(
      declaredEra,
      dto.declaredYear,
      dto.declaredMonth,
      dto.declaredDay,
    )
    const endedPrecision = derivePrecision(
      dto.endedPrecision,
      dto.endedYear,
      dto.endedMonth,
      dto.endedDay,
    )
    const endedDate = buildMirrorDateTime(
      endedEra,
      dto.endedYear,
      dto.endedMonth,
      dto.endedDay,
    )

    let narrativeEventId = refs.narrativeEventId
    if (!narrativeEventId && dto.createNarrativeEvent && accountId) {
      narrativeEventId = await this.createLinkedNarrativeEvent({
        inline: dto.createNarrativeEvent,
        declaring,
        target,
        kind,
        customTitle: dto.title?.trim() || null,
        declaredDate,
        declaredEra,
        declaredYear: dto.declaredYear ?? null,
        declaredMonth: dto.declaredMonth ?? null,
        declaredDay: dto.declaredDay ?? null,
        declaredPrecision,
        warEventId: refs.warEventId,
        createdById: accountId,
      })
    }

    const created = await this.prisma.warDeclaration.create({
      data: {
        declaringCountryId: declaring.countryId,
        declaringHistoricalCountryId: declaring.historicalCountryId,
        targetCountryId: target.countryId,
        targetHistoricalCountryId: target.historicalCountryId,
        kind,
        title: dto.title?.trim() || null,
        casusBelli: dto.casusBelli?.trim() || null,
        summary: dto.summary?.trim() || null,
        declaredDate,
        declaredEra,
        declaredYear: dto.declaredYear ?? null,
        declaredMonth: dto.declaredMonth ?? null,
        declaredDay: dto.declaredDay ?? null,
        declaredPrecision,
        severanceEra,
        severanceYear: dto.severanceYear ?? null,
        severanceMonth: dto.severanceMonth ?? null,
        severanceDay: dto.severanceDay ?? null,
        cabinetId: refs.cabinetId,
        decidedByPersonId: refs.decidedByPersonId,
        decidedByTenureId: refs.decidedByTenureId,
        approvedChamberId: refs.approvedChamberId,
        yeas: dto.yeas ?? null,
        nays: dto.nays ?? null,
        abstentions: dto.abstentions ?? null,
        warEventId: refs.warEventId,
        ultimatumEventId: refs.ultimatumEventId,
        narrativeEventId,
        terminationKind: dto.terminationKind ?? null,
        endedDate,
        endedEra,
        endedYear: dto.endedYear ?? null,
        endedMonth: dto.endedMonth ?? null,
        endedDay: dto.endedDay ?? null,
        endedPrecision,
        peaceTreatyId: refs.peaceTreatyId,
        terminationNote: dto.terminationNote?.trim() || null,
        accountId: accountId ?? null,
      },
      include: WAR_DECLARATION_INCLUDE,
    })

    if (narrativeEventId) {
      await this.syncNarrativeEventParticipants(
        narrativeEventId,
        declaring,
        target,
      )
    }
    if (
      refs.warEventId &&
      dto.syncWarParticipantJoin !== false &&
      dto.declaredYear != null
    ) {
      await this.syncParentWarParticipantJoin({
        warEventId: refs.warEventId,
        declaring,
        declaredEra: declaredEra ?? 'AD',
        declaredYear: dto.declaredYear,
        declaredMonth: dto.declaredMonth ?? null,
        declaredDay: dto.declaredDay ?? null,
        declaredPrecision,
        casusBelli: dto.casusBelli?.trim() || null,
      })
    }
    if (refs.warEventId && dto.endedYear != null) {
      await this.syncParentWarParticipantLeave({
        warEventId: refs.warEventId,
        declaring,
        endedEra: endedEra ?? 'AD',
        endedYear: dto.endedYear,
        endedMonth: dto.endedMonth ?? null,
        endedDay: dto.endedDay ?? null,
        endedPrecision,
        terminationNote: dto.terminationNote?.trim() || null,
      })
    }

    return toWarDeclarationResponseDto(created)
  }

  /**
   * 다자 동시 선전포고·개전 일괄 생성.
   *
   * 1개 선포국 → 여러 대상국(예: 영국의 대불가리아·헝가리·루마니아 선전포고) 또는
   * 여러 선포국 → 1개 대상국(예: 영·프의 대러시아 공동 선전포고)을 한 번에 등록하되,
   * 국가별 종전일·조약이 각자 다를 수 있으므로 정본은 원자적 1:1 행들로 생성한다.
   *
   * @tag war-declarations
   */
  @Post('batch')
  async createBatch(
    @Body() dto: BatchCreateWarDeclarationDto,
    @Request() req: any,
  ): Promise<WarDeclarationResponseDto[]> {
    const accountId: string | undefined = req.user?.id ?? req.user?.sub

    if (!Array.isArray(dto.declaringParties) || dto.declaringParties.length === 0) {
      throw new BadRequestException('선포국을 1개 이상 지정해 주세요')
    }
    if (!Array.isArray(dto.targetParties) || dto.targetParties.length === 0) {
      throw new BadRequestException('대상국을 1개 이상 지정해 주세요')
    }
    if (dto.declaringParties.length * dto.targetParties.length > 30) {
      throw new BadRequestException('한 번에 최대 30건까지만 일괄 생성할 수 있습니다')
    }

    const declaringList = await Promise.all(
      dto.declaringParties.map((p) => this.resolvePartyXor('선포국', p)),
    )
    const targetList = await Promise.all(
      dto.targetParties.map((p) => this.resolvePartyXor('대상국', p)),
    )
    for (const d of declaringList) {
      for (const t of targetList) {
        this.assertNotSameParty(d, t)
      }
    }

    const kind: WarDeclarationKindDto = dto.kind ?? 'FORMAL_DECLARATION'
    if (!VALID_KINDS.has(kind)) {
      throw new BadRequestException('올바르지 않은 개전 행위 유형입니다')
    }
    if (dto.terminationKind && !VALID_TERMINATIONS.has(dto.terminationKind)) {
      throw new BadRequestException('올바르지 않은 종결 방식입니다')
    }

    const declaredEra: EraDto | null =
      dto.declaredYear != null ? (dto.declaredEra ?? 'AD') : null
    const endedEra: EraDto | null =
      dto.endedYear != null ? (dto.endedEra ?? declaredEra ?? 'AD') : null
    const severanceEra: EraDto | null =
      dto.severanceYear != null ? (dto.severanceEra ?? declaredEra ?? 'AD') : null

    this.validateStructuredDates({
      declaredEra,
      declaredYear: dto.declaredYear ?? null,
      declaredMonth: dto.declaredMonth ?? null,
      declaredDay: dto.declaredDay ?? null,
      endedEra,
      endedYear: dto.endedYear ?? null,
      endedMonth: dto.endedMonth ?? null,
      endedDay: dto.endedDay ?? null,
      severanceYear: dto.severanceYear ?? null,
      severanceMonth: dto.severanceMonth ?? null,
      severanceDay: dto.severanceDay ?? null,
      yeas: dto.yeas ?? null,
      nays: dto.nays ?? null,
      abstentions: dto.abstentions ?? null,
    })

    const refs = await this.validateAndResolveOptionalRefs(dto)

    const declaredPrecision = derivePrecision(
      dto.declaredPrecision,
      dto.declaredYear,
      dto.declaredMonth,
      dto.declaredDay,
    )
    const declaredDate = buildMirrorDateTime(
      declaredEra,
      dto.declaredYear,
      dto.declaredMonth,
      dto.declaredDay,
    )
    const endedPrecision = derivePrecision(
      dto.endedPrecision,
      dto.endedYear,
      dto.endedMonth,
      dto.endedDay,
    )
    const endedDate = buildMirrorDateTime(
      endedEra,
      dto.endedYear,
      dto.endedMonth,
      dto.endedDay,
    )

    let sharedNarrativeEventId = refs.narrativeEventId
    if (!sharedNarrativeEventId && dto.createNarrativeEvent && accountId) {
      const declLabel = declaringList.map((d) => d.name).join('·')
      const targLabel = targetList.map((t) => t.name).join('·')
      sharedNarrativeEventId = await this.createLinkedNarrativeEvent({
        inline: dto.createNarrativeEvent,
        declaring: { ...declaringList[0], name: declLabel },
        target: { ...targetList[0], name: targLabel },
        kind,
        customTitle: dto.title?.trim() || null,
        declaredDate,
        declaredEra,
        declaredYear: dto.declaredYear ?? null,
        declaredMonth: dto.declaredMonth ?? null,
        declaredDay: dto.declaredDay ?? null,
        declaredPrecision,
        warEventId: refs.warEventId,
        createdById: accountId,
      })
    }

    const createdRows: LoadedWarDeclarationRow[] = []
    for (const declaring of declaringList) {
      for (const target of targetList) {
        const created = await this.prisma.warDeclaration.create({
          data: {
            declaringCountryId: declaring.countryId,
            declaringHistoricalCountryId: declaring.historicalCountryId,
            targetCountryId: target.countryId,
            targetHistoricalCountryId: target.historicalCountryId,
            kind,
            title:
              declaringList.length === 1 && targetList.length === 1
                ? dto.title?.trim() || null
                : null,
            casusBelli: dto.casusBelli?.trim() || null,
            summary: dto.summary?.trim() || null,
            declaredDate,
            declaredEra,
            declaredYear: dto.declaredYear ?? null,
            declaredMonth: dto.declaredMonth ?? null,
            declaredDay: dto.declaredDay ?? null,
            declaredPrecision,
            severanceEra,
            severanceYear: dto.severanceYear ?? null,
            severanceMonth: dto.severanceMonth ?? null,
            severanceDay: dto.severanceDay ?? null,
            cabinetId: declaringList.length === 1 ? refs.cabinetId : null,
            decidedByPersonId:
              declaringList.length === 1 ? refs.decidedByPersonId : null,
            decidedByTenureId:
              declaringList.length === 1 ? refs.decidedByTenureId : null,
            approvedChamberId:
              declaringList.length === 1 ? refs.approvedChamberId : null,
            yeas: declaringList.length === 1 ? (dto.yeas ?? null) : null,
            nays: declaringList.length === 1 ? (dto.nays ?? null) : null,
            abstentions:
              declaringList.length === 1 ? (dto.abstentions ?? null) : null,
            warEventId: refs.warEventId,
            ultimatumEventId: refs.ultimatumEventId,
            narrativeEventId: sharedNarrativeEventId,
            terminationKind: dto.terminationKind ?? null,
            endedDate,
            endedEra,
            endedYear: dto.endedYear ?? null,
            endedMonth: dto.endedMonth ?? null,
            endedDay: dto.endedDay ?? null,
            endedPrecision,
            peaceTreatyId: refs.peaceTreatyId,
            terminationNote: dto.terminationNote?.trim() || null,
            accountId: accountId ?? null,
          },
          include: WAR_DECLARATION_INCLUDE,
        })
        createdRows.push(created)

        if (sharedNarrativeEventId) {
          await this.syncNarrativeEventParticipants(
            sharedNarrativeEventId,
            declaring,
            target,
          )
        }
        if (
          refs.warEventId &&
          dto.syncWarParticipantJoin !== false &&
          dto.declaredYear != null
        ) {
          await this.syncParentWarParticipantJoin({
            warEventId: refs.warEventId,
            declaring,
            declaredEra: declaredEra ?? 'AD',
            declaredYear: dto.declaredYear,
            declaredMonth: dto.declaredMonth ?? null,
            declaredDay: dto.declaredDay ?? null,
            declaredPrecision,
            casusBelli: dto.casusBelli?.trim() || null,
          })
        }
      }
    }

    return createdRows.map(toWarDeclarationResponseDto)
  }

  /** @tag war-declarations */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWarDeclarationDto,
    @Request() req: any,
  ): Promise<WarDeclarationResponseDto> {
    const existing = await this.assertOwnership(id, req)
    const accountId: string | undefined = req.user?.id ?? req.user?.sub

    const declaringChanged =
      dto.declaringCountryId !== undefined ||
      dto.declaringHistoricalCountryId !== undefined
    const targetChanged =
      dto.targetCountryId !== undefined ||
      dto.targetHistoricalCountryId !== undefined

    const declaring = declaringChanged
      ? await this.resolvePartyXor('선포국', {
          countryId: dto.declaringCountryId,
          historicalCountryId: dto.declaringHistoricalCountryId,
        })
      : {
          countryId: existing.declaringCountryId,
          historicalCountryId: existing.declaringHistoricalCountryId,
          name: '',
        }

    const target = targetChanged
      ? await this.resolvePartyXor('대상국', {
          countryId: dto.targetCountryId,
          historicalCountryId: dto.targetHistoricalCountryId,
        })
      : {
          countryId: existing.targetCountryId,
          historicalCountryId: existing.targetHistoricalCountryId,
          name: '',
        }

    this.assertNotSameParty(declaring, target)

    const nextKind: WarDeclarationKindDto =
      dto.kind !== undefined
        ? dto.kind
        : (existing.kind as WarDeclarationKindDto)
    if (!VALID_KINDS.has(nextKind)) {
      throw new BadRequestException('올바르지 않은 개전 행위 유형입니다')
    }
    if (
      dto.terminationKind !== undefined &&
      dto.terminationKind !== null &&
      !VALID_TERMINATIONS.has(dto.terminationKind)
    ) {
      throw new BadRequestException('올바르지 않은 종결 방식입니다')
    }

    const nextDeclaredYear =
      dto.declaredYear !== undefined ? dto.declaredYear : existing.declaredYear
    const nextDeclaredMonth =
      nextDeclaredYear == null
        ? null
        : dto.declaredMonth !== undefined
          ? dto.declaredMonth
          : existing.declaredMonth
    const nextDeclaredDay =
      nextDeclaredYear == null || nextDeclaredMonth == null
        ? null
        : dto.declaredDay !== undefined
          ? dto.declaredDay
          : existing.declaredDay
    const nextDeclaredEra: EraDto | null =
      nextDeclaredYear != null
        ? ((dto.declaredEra !== undefined
            ? dto.declaredEra
            : (existing.declaredEra as EraDto | null)) ?? 'AD')
        : null

    const nextEndedYear =
      dto.endedYear !== undefined ? dto.endedYear : existing.endedYear
    const nextEndedMonth =
      nextEndedYear == null
        ? null
        : dto.endedMonth !== undefined
          ? dto.endedMonth
          : existing.endedMonth
    const nextEndedDay =
      nextEndedYear == null || nextEndedMonth == null
        ? null
        : dto.endedDay !== undefined
          ? dto.endedDay
          : existing.endedDay
    const nextEndedEra: EraDto | null =
      nextEndedYear != null
        ? ((dto.endedEra !== undefined
            ? dto.endedEra
            : (existing.endedEra as EraDto | null)) ??
          nextDeclaredEra ??
          'AD')
        : null

    const nextSeveranceYear =
      dto.severanceYear !== undefined
        ? dto.severanceYear
        : existing.severanceYear
    const nextSeveranceMonth =
      nextSeveranceYear == null
        ? null
        : dto.severanceMonth !== undefined
          ? dto.severanceMonth
          : existing.severanceMonth
    const nextSeveranceDay =
      nextSeveranceYear == null || nextSeveranceMonth == null
        ? null
        : dto.severanceDay !== undefined
          ? dto.severanceDay
          : existing.severanceDay
    const nextSeveranceEra: EraDto | null =
      nextSeveranceYear != null
        ? ((dto.severanceEra !== undefined
            ? dto.severanceEra
            : (existing.severanceEra as EraDto | null)) ??
          nextDeclaredEra ??
          'AD')
        : null

    const nextYeas = dto.yeas !== undefined ? dto.yeas : existing.yeas
    const nextNays = dto.nays !== undefined ? dto.nays : existing.nays
    const nextAbstentions =
      dto.abstentions !== undefined ? dto.abstentions : existing.abstentions

    this.validateStructuredDates({
      declaredEra: nextDeclaredEra,
      declaredYear: nextDeclaredYear,
      declaredMonth: nextDeclaredMonth,
      declaredDay: nextDeclaredDay,
      endedEra: nextEndedEra,
      endedYear: nextEndedYear,
      endedMonth: nextEndedMonth,
      endedDay: nextEndedDay,
      severanceYear: nextSeveranceYear,
      severanceMonth: nextSeveranceMonth,
      severanceDay: nextSeveranceDay,
      yeas: nextYeas,
      nays: nextNays,
      abstentions: nextAbstentions,
    })

    const refs = await this.validateAndResolveOptionalRefs({
      cabinetId:
        dto.cabinetId !== undefined ? dto.cabinetId : existing.cabinetId,
      decidedByPersonId:
        dto.decidedByPersonId !== undefined
          ? dto.decidedByPersonId
          : existing.decidedByPersonId,
      decidedByTenureId:
        dto.decidedByTenureId !== undefined
          ? dto.decidedByTenureId
          : existing.decidedByTenureId,
      approvedChamberId:
        dto.approvedChamberId !== undefined
          ? dto.approvedChamberId
          : existing.approvedChamberId,
      warEventId:
        dto.warEventId !== undefined ? dto.warEventId : existing.warEventId,
      ultimatumEventId:
        dto.ultimatumEventId !== undefined
          ? dto.ultimatumEventId
          : existing.ultimatumEventId,
      narrativeEventId:
        dto.narrativeEventId !== undefined
          ? dto.narrativeEventId
          : existing.narrativeEventId,
      peaceTreatyId:
        dto.peaceTreatyId !== undefined
          ? dto.peaceTreatyId
          : existing.peaceTreatyId,
    })

    const nextDeclaredPrecision = derivePrecision(
      dto.declaredPrecision !== undefined
        ? dto.declaredPrecision
        : existing.declaredPrecision,
      nextDeclaredYear,
      nextDeclaredMonth,
      nextDeclaredDay,
    )
    const nextDeclaredDate = buildMirrorDateTime(
      nextDeclaredEra,
      nextDeclaredYear,
      nextDeclaredMonth,
      nextDeclaredDay,
    )
    const nextEndedPrecision = derivePrecision(
      dto.endedPrecision !== undefined
        ? dto.endedPrecision
        : existing.endedPrecision,
      nextEndedYear,
      nextEndedMonth,
      nextEndedDay,
    )
    const nextEndedDate = buildMirrorDateTime(
      nextEndedEra,
      nextEndedYear,
      nextEndedMonth,
      nextEndedDay,
    )

    let narrativeEventId = refs.narrativeEventId
    if (!narrativeEventId && dto.createNarrativeEvent && accountId) {
      const fullDeclaring = declaring.name
        ? declaring
        : await this.resolvePartyXor('선포국', declaring)
      const fullTarget = target.name
        ? target
        : await this.resolvePartyXor('대상국', target)
      narrativeEventId = await this.createLinkedNarrativeEvent({
        inline: dto.createNarrativeEvent,
        declaring: fullDeclaring,
        target: fullTarget,
        kind: nextKind,
        customTitle:
          dto.title !== undefined
            ? dto.title?.trim() || null
            : existing.title?.trim() || null,
        declaredDate: nextDeclaredDate,
        declaredEra: nextDeclaredEra,
        declaredYear: nextDeclaredYear,
        declaredMonth: nextDeclaredMonth,
        declaredDay: nextDeclaredDay,
        declaredPrecision: nextDeclaredPrecision,
        warEventId: refs.warEventId,
        createdById: accountId,
      })
    }

    const updated = await this.prisma.warDeclaration.update({
      where: { id },
      data: {
        declaringCountryId: declaring.countryId,
        declaringHistoricalCountryId: declaring.historicalCountryId,
        targetCountryId: target.countryId,
        targetHistoricalCountryId: target.historicalCountryId,
        kind: nextKind,
        ...(dto.title !== undefined && { title: dto.title?.trim() || null }),
        ...(dto.casusBelli !== undefined && {
          casusBelli: dto.casusBelli?.trim() || null,
        }),
        ...(dto.summary !== undefined && {
          summary: dto.summary?.trim() || null,
        }),
        declaredDate: nextDeclaredDate,
        declaredEra: nextDeclaredEra,
        declaredYear: nextDeclaredYear,
        declaredMonth: nextDeclaredMonth,
        declaredDay: nextDeclaredDay,
        declaredPrecision: nextDeclaredPrecision,
        severanceEra: nextSeveranceEra,
        severanceYear: nextSeveranceYear,
        severanceMonth: nextSeveranceMonth,
        severanceDay: nextSeveranceDay,
        cabinetId: refs.cabinetId,
        decidedByPersonId: refs.decidedByPersonId,
        decidedByTenureId: refs.decidedByTenureId,
        approvedChamberId: refs.approvedChamberId,
        yeas: nextYeas,
        nays: nextNays,
        abstentions: nextAbstentions,
        warEventId: refs.warEventId,
        ultimatumEventId: refs.ultimatumEventId,
        narrativeEventId,
        ...(dto.terminationKind !== undefined && {
          terminationKind: dto.terminationKind,
        }),
        endedDate: nextEndedDate,
        endedEra: nextEndedEra,
        endedYear: nextEndedYear,
        endedMonth: nextEndedMonth,
        endedDay: nextEndedDay,
        endedPrecision: nextEndedPrecision,
        peaceTreatyId: refs.peaceTreatyId,
        ...(dto.terminationNote !== undefined && {
          terminationNote: dto.terminationNote?.trim() || null,
        }),
      },
      include: WAR_DECLARATION_INCLUDE,
    })

    if (narrativeEventId) {
      await this.syncNarrativeEventParticipants(
        narrativeEventId,
        declaring,
        target,
      )
    }
    if (
      refs.warEventId &&
      dto.syncWarParticipantJoin !== false &&
      nextDeclaredYear != null
    ) {
      await this.syncParentWarParticipantJoin({
        warEventId: refs.warEventId,
        declaring,
        declaredEra: nextDeclaredEra ?? 'AD',
        declaredYear: nextDeclaredYear,
        declaredMonth: nextDeclaredMonth,
        declaredDay: nextDeclaredDay,
        declaredPrecision: nextDeclaredPrecision,
        casusBelli:
          dto.casusBelli !== undefined
            ? dto.casusBelli?.trim() || null
            : existing.casusBelli ?? null,
      })
    }
    if (refs.warEventId && nextEndedYear != null) {
      await this.syncParentWarParticipantLeave({
        warEventId: refs.warEventId,
        declaring,
        endedEra: nextEndedEra ?? 'AD',
        endedYear: nextEndedYear,
        endedMonth: nextEndedMonth,
        endedDay: nextEndedDay,
        endedPrecision: nextEndedPrecision,
        terminationNote:
          dto.terminationNote !== undefined
            ? dto.terminationNote?.trim() || null
            : existing.terminationNote ?? null,
      })
    }

    return toWarDeclarationResponseDto(updated)
  }

  /** @tag war-declarations */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    await this.assertOwnership(id, req)
    await this.prisma.warDeclaration.delete({ where: { id } })
  }

  private async assertOwnership(id: string, req: any) {
    const accountId: string | undefined = req.user?.id ?? req.user?.sub
    const existing = await this.prisma.warDeclaration.findUnique({
      where: { id },
    })
    if (!existing) {
      throw new NotFoundException('선전포고·개전 기록을 찾을 수 없습니다')
    }
    if (existing.accountId && existing.accountId !== accountId) {
      throw new ForbiddenException('이 선전포고·개전 기록을 수정할 권한이 없습니다')
    }
    return existing
  }

  private async resolvePartyXor(
    label: string,
    input: { countryId?: string | null; historicalCountryId?: string | null },
  ): Promise<{
    countryId: string | null
    historicalCountryId: string | null
    name: string
  }> {
    const cid = input.countryId?.trim() || null
    const hid = input.historicalCountryId?.trim() || null
    if (!cid && !hid) {
      throw new BadRequestException(
        `${label}(현대 국가 또는 역사적 국가)을 지정해 주세요`,
      )
    }
    if (cid && hid) {
      throw new BadRequestException(
        `${label}에는 현대 국가와 역사적 국가 중 하나만 지정할 수 있습니다`,
      )
    }
    if (cid) {
      const country = await this.prisma.country.findUnique({
        where: { id: cid },
        select: { id: true, name: true },
      })
      if (!country) {
        throw new BadRequestException(`${label} 현대 국가를 찾을 수 없습니다`)
      }
      return { countryId: cid, historicalCountryId: null, name: country.name }
    }
    const hist = await this.prisma.historicalCountry.findUnique({
      where: { id: hid! },
      select: { id: true, name: true },
    })
    if (!hist) {
      throw new BadRequestException(`${label} 역사적 국가를 찾을 수 없습니다`)
    }
    return { countryId: null, historicalCountryId: hid!, name: hist.name }
  }

  private assertNotSameParty(
    declaring: { countryId: string | null; historicalCountryId: string | null },
    target: { countryId: string | null; historicalCountryId: string | null },
  ) {
    if (
      (declaring.countryId && declaring.countryId === target.countryId) ||
      (declaring.historicalCountryId &&
        declaring.historicalCountryId === target.historicalCountryId)
    ) {
      throw new BadRequestException(
        '선포국과 대상국이 동일한 국가일 수 없습니다',
      )
    }
  }

  private validateStructuredDates(params: {
    declaredEra: EraDto | null
    declaredYear: number | null
    declaredMonth: number | null
    declaredDay: number | null
    endedEra: EraDto | null
    endedYear: number | null
    endedMonth: number | null
    endedDay: number | null
    severanceYear: number | null
    severanceMonth: number | null
    severanceDay: number | null
    yeas: number | null
    nays: number | null
    abstentions: number | null
  }) {
    const checkEdge = (
      label: string,
      y: number | null,
      m: number | null,
      d: number | null,
    ) => {
      if (y != null && (!Number.isInteger(y) || y < 1)) {
        throw new BadRequestException(`${label} 연도는 1 이상의 정수여야 합니다`)
      }
      if (m != null && (!Number.isInteger(m) || m < 1 || m > 12)) {
        throw new BadRequestException(`${label} 월은 1~12 사이여야 합니다`)
      }
      if (d != null && (!Number.isInteger(d) || d < 1 || d > 31)) {
        throw new BadRequestException(`${label} 일은 1~31 사이여야 합니다`)
      }
      if (y == null && (m != null || d != null)) {
        throw new BadRequestException(`${label} 연도 없이 월·일만 입력할 수 없습니다`)
      }
      if (m == null && d != null) {
        throw new BadRequestException(`${label} 월 없이 일만 입력할 수 없습니다`)
      }
    }

    checkEdge(
      '개전·선포일',
      params.declaredYear,
      params.declaredMonth,
      params.declaredDay,
    )
    checkEdge(
      '교전 종료일',
      params.endedYear,
      params.endedMonth,
      params.endedDay,
    )
    checkEdge(
      '단교일',
      params.severanceYear,
      params.severanceMonth,
      params.severanceDay,
    )

    for (const [label, val] of [
      ['찬성 표수', params.yeas],
      ['반대 표수', params.nays],
      ['기권 표수', params.abstentions],
    ] as const) {
      if (val != null && (!Number.isInteger(val) || val < 0)) {
        throw new BadRequestException(`${label}는 0 이상의 정수여야 합니다`)
      }
    }

    if (params.declaredYear != null && params.endedYear != null) {
      const startKey = signedDateKey(
        params.declaredEra ?? 'AD',
        params.declaredYear,
        params.declaredMonth,
        params.declaredDay,
        'start',
      )
      const endKey = signedDateKey(
        params.endedEra ?? params.declaredEra ?? 'AD',
        params.endedYear,
        params.endedMonth,
        params.endedDay,
        'end',
      )
      if (startKey > endKey) {
        throw new BadRequestException(
          '교전 종료 시점이 선전포고 시점보다 앞설 수 없습니다',
        )
      }
    }
  }

  private async validateAndResolveOptionalRefs(dto: {
    cabinetId?: string | null
    decidedByPersonId?: string | null
    decidedByTenureId?: string | null
    approvedChamberId?: string | null
    warEventId?: string | null
    ultimatumEventId?: string | null
    narrativeEventId?: string | null
    peaceTreatyId?: string | null
  }) {
    let cabinetId = dto.cabinetId?.trim() || null
    let decidedByPersonId = dto.decidedByPersonId?.trim() || null
    const decidedByTenureId = dto.decidedByTenureId?.trim() || null
    const approvedChamberId = dto.approvedChamberId?.trim() || null
    const warEventId = dto.warEventId?.trim() || null
    const ultimatumEventId = dto.ultimatumEventId?.trim() || null
    const narrativeEventId = dto.narrativeEventId?.trim() || null
    const peaceTreatyId = dto.peaceTreatyId?.trim() || null

    if (decidedByTenureId && this.prisma.governmentPositionTenure?.findUnique) {
      const tenure = await this.prisma.governmentPositionTenure.findUnique({
        where: { id: decidedByTenureId },
        select: { id: true, personId: true, cabinetId: true },
      })
      if (!tenure) {
        throw new BadRequestException('지정한 재임·재위 기록을 찾을 수 없습니다')
      }
      if (decidedByPersonId && tenure.personId !== decidedByPersonId) {
        throw new BadRequestException(
          '지정한 재임·재위 기록이 선택한 인물의 보직과 일치하지 않습니다',
        )
      }
      if (!decidedByPersonId) {
        decidedByPersonId = tenure.personId
      }
      if (!cabinetId && tenure.cabinetId) {
        cabinetId = tenure.cabinetId
      }
    } else if (decidedByPersonId && this.prisma.person?.findUnique) {
      const person = await this.prisma.person.findUnique({
        where: { id: decidedByPersonId },
        select: { id: true },
      })
      if (!person) {
        throw new BadRequestException('지정한 결정·서명 인물을 찾을 수 없습니다')
      }
    }

    if (cabinetId && this.prisma.cabinet?.findUnique) {
      const cab = await this.prisma.cabinet.findUnique({
        where: { id: cabinetId },
        select: { id: true },
      })
      if (!cab) {
        throw new BadRequestException('지정한 내각·행정부를 찾을 수 없습니다')
      }
    }

    if (approvedChamberId && this.prisma.chamber?.findUnique) {
      const chamber = await this.prisma.chamber.findUnique({
        where: { id: approvedChamberId },
        select: { id: true },
      })
      if (!chamber) {
        throw new BadRequestException('지정한 의회 원을 찾을 수 없습니다')
      }
    }

    if (warEventId && this.prisma.event?.findUnique) {
      const warEv = await this.prisma.event.findUnique({
        where: { id: warEventId },
        select: { id: true, deletedAt: true },
      })
      if (!warEv || warEv.deletedAt != null) {
        throw new BadRequestException('지정한 상위 전쟁 사건을 찾을 수 없습니다')
      }
    }

    if (ultimatumEventId && this.prisma.event?.findUnique) {
      const ultEv = await this.prisma.event.findUnique({
        where: { id: ultimatumEventId },
        select: { id: true, deletedAt: true },
      })
      if (!ultEv || ultEv.deletedAt != null) {
        throw new BadRequestException('지정한 선행 최후통첩 사건을 찾을 수 없습니다')
      }
    }

    if (narrativeEventId && this.prisma.event?.findUnique) {
      const narrEv = await this.prisma.event.findUnique({
        where: { id: narrativeEventId },
        select: { id: true, deletedAt: true },
      })
      if (!narrEv || narrEv.deletedAt != null) {
        throw new BadRequestException('지정한 보조 서술 사건을 찾을 수 없습니다')
      }
    }

    if (peaceTreatyId && this.prisma.treaty?.findUnique) {
      const treaty = await this.prisma.treaty.findUnique({
        where: { id: peaceTreatyId },
        select: { id: true },
      })
      if (!treaty) {
        throw new BadRequestException('지정한 종전·강화 조약을 찾을 수 없습니다')
      }
    }

    return {
      cabinetId,
      decidedByPersonId,
      decidedByTenureId,
      approvedChamberId,
      warEventId,
      ultimatumEventId,
      narrativeEventId,
      peaceTreatyId,
    }
  }

  private async createLinkedNarrativeEvent(params: {
    inline: CreateNarrativeEventInlineDto
    declaring: {
      countryId: string | null
      historicalCountryId: string | null
      name: string
    }
    target: {
      countryId: string | null
      historicalCountryId: string | null
      name: string
    }
    kind: WarDeclarationKindDto
    customTitle: string | null
    declaredDate: Date | null
    declaredEra: EraDto | null
    declaredYear: number | null
    declaredMonth: number | null
    declaredDay: number | null
    declaredPrecision: string | null
    warEventId: string | null
    createdById: string
  }): Promise<string> {
    const resolvedTitle =
      params.inline.title?.trim() ||
      params.customTitle ||
      buildDefaultWarDeclarationTitle(
        params.declaring.name,
        params.target.name,
        params.kind,
      )
    const domain =
      params.inline.domain === 'MILITARY' || params.inline.domain === 'POLITICS'
        ? params.inline.domain
        : 'DIPLOMACY'

    let parentEventId: string | null = null
    if (params.warEventId && this.prisma.event?.findUnique) {
      const parentWar = await this.prisma.event.findUnique({
        where: { id: params.warEventId },
        select: { id: true, kind: true, deletedAt: true },
      })
      if (parentWar && parentWar.deletedAt == null && parentWar.kind === 'COLLECTION') {
        parentEventId = parentWar.id
      }
    }

    const createdEvent = await this.prisma.event.create({
      data: {
        title: resolvedTitle.slice(0, 100),
        description: params.inline.description?.trim() || null,
        background: params.inline.background?.trim() || null,
        aftermath: params.inline.aftermath?.trim() || null,
        domain,
        type: 'WAR_DECLARATION',
        kind: 'SINGLE',
        startDate: params.declaredDate,
        startEra: params.declaredEra,
        startYear: params.declaredYear,
        startMonth: params.declaredMonth,
        startDay: params.declaredDay,
        startDatePrecision: params.declaredPrecision,
        parentEventId,
        historicalCountryId: params.declaring.historicalCountryId,
        createdById: params.createdById,
      },
      select: { id: true },
    })
    return createdEvent.id
  }

  /**
   * 보조 서술 사건(`narrativeEventId`)이 연결되었을 때, 사건의 참여국 목록에도
   * 선포국(INITIATOR)·대상국(TARGET)이 누락 없이 반영되도록 정합성을 맞춘다.
   */
  private async syncNarrativeEventParticipants(
    narrativeEventId: string,
    declaring: { countryId: string | null; historicalCountryId: string | null },
    target: { countryId: string | null; historicalCountryId: string | null },
  ) {
    if (!this.prisma.eventCountryRelation?.findMany) return
    const existingRels = await this.prisma.eventCountryRelation.findMany({
      where: { eventId: narrativeEventId },
      select: {
        id: true,
        countryId: true,
        historicalCountryId: true,
        role: true,
        sortOrder: true,
      },
    })
    let nextSort =
      existingRels.reduce((max, rel) => Math.max(max, rel.sortOrder ?? 0), -1) +
      1

    for (const [party, desiredRole] of [
      [declaring, 'INITIATOR'],
      [target, 'TARGET'],
    ] as const) {
      const match = existingRels.find(
        (rel) =>
          (party.countryId && rel.countryId === party.countryId) ||
          (party.historicalCountryId &&
            rel.historicalCountryId === party.historicalCountryId),
      )
      if (!match) {
        await this.prisma.eventCountryRelation.create({
          data: {
            eventId: narrativeEventId,
            countryId: party.countryId,
            historicalCountryId: party.historicalCountryId,
            role: desiredRole,
            sortOrder: nextSort++,
          },
        })
      } else if (match.role === 'PARTICIPANT') {
        await this.prisma.eventCountryRelation.update({
          where: { id: match.id },
          data: { role: desiredRole },
        })
      }
    }
  }

  /**
   * 상위 전쟁(`warEventId`)이 지정되었을 때, 선포국이 그 전쟁의 참여국에 이미 등록되어 있고
   * 참전 시점(`joinYear`)이 비어 있으며 전쟁 시작일 이후 후발 참전한 경우 자동으로 참전 시점을 채운다.
   */
  private async syncParentWarParticipantJoin(params: {
    warEventId: string
    declaring: { countryId: string | null; historicalCountryId: string | null }
    declaredEra: EraDto
    declaredYear: number
    declaredMonth: number | null
    declaredDay: number | null
    declaredPrecision: string | null
    casusBelli: string | null
  }) {
    if (!this.prisma.event?.findUnique || !this.prisma.eventCountryRelation?.findFirst) {
      return
    }
    const warEv = await this.prisma.event.findUnique({
      where: { id: params.warEventId },
      select: {
        id: true,
        startEra: true,
        startYear: true,
        startMonth: true,
        startDay: true,
      },
    })
    if (!warEv) return

    const warStartKey = signedDateKey(
      warEv.startEra ?? 'AD',
      warEv.startYear,
      warEv.startMonth,
      warEv.startDay,
      'start',
    )
    const declKey = signedDateKey(
      params.declaredEra,
      params.declaredYear,
      params.declaredMonth,
      params.declaredDay,
      'start',
    )
    // 전쟁 발발일 이후에 후발 참전한 경우에만 join 필드를 채운다
    if (!Number.isFinite(warStartKey) || declKey <= warStartKey) return

    const warParticipant = await this.prisma.eventCountryRelation.findFirst({
      where: {
        eventId: params.warEventId,
        ...(params.declaring.countryId
          ? { countryId: params.declaring.countryId }
          : { historicalCountryId: params.declaring.historicalCountryId }),
      },
      select: { id: true, joinYear: true, joinReason: true },
    })
    if (warParticipant && warParticipant.joinYear == null) {
      await this.prisma.eventCountryRelation.update({
        where: { id: warParticipant.id },
        data: {
          joinEra: params.declaredEra,
          joinYear: params.declaredYear,
          joinMonth: params.declaredMonth,
          joinDay: params.declaredDay,
          joinPrecision: params.declaredPrecision,
          ...(params.casusBelli &&
            !warParticipant.joinReason && { joinReason: params.casusBelli }),
        },
      })
    }
  }

  /**
   * 단독 강화·중도 항복 등으로 상위 전쟁 종전일보다 먼저 교전을 종결한 경우,
   * 상위 전쟁 참여국의 이탈 시점(`leaveYear` 등)이 비어 있으면 자동 보강한다.
   */
  private async syncParentWarParticipantLeave(params: {
    warEventId: string
    declaring: { countryId: string | null; historicalCountryId: string | null }
    endedEra: EraDto
    endedYear: number
    endedMonth: number | null
    endedDay: number | null
    endedPrecision: string | null
    terminationNote: string | null
  }) {
    if (
      !this.prisma.event?.findUnique ||
      !this.prisma.eventCountryRelation?.findFirst
    ) {
      return
    }
    const warEv = await this.prisma.event.findUnique({
      where: { id: params.warEventId },
      select: {
        id: true,
        endEra: true,
        endYear: true,
        endMonth: true,
        endDay: true,
      },
    })
    if (!warEv || warEv.endYear == null) return

    const warEndKey = signedDateKey(
      warEv.endEra ?? 'AD',
      warEv.endYear,
      warEv.endMonth,
      warEv.endDay,
      'end',
    )
    const leaveKey = signedDateKey(
      params.endedEra,
      params.endedYear,
      params.endedMonth,
      params.endedDay,
      'end',
    )
    if (!Number.isFinite(warEndKey) || leaveKey >= warEndKey) return

    const warParticipant = await this.prisma.eventCountryRelation.findFirst({
      where: {
        eventId: params.warEventId,
        ...(params.declaring.countryId
          ? { countryId: params.declaring.countryId }
          : { historicalCountryId: params.declaring.historicalCountryId }),
      },
      select: { id: true, withdrawYear: true, withdrawReason: true },
    })
    if (warParticipant && warParticipant.withdrawYear == null) {
      await this.prisma.eventCountryRelation.update({
        where: { id: warParticipant.id },
        data: {
          withdrawEra: params.endedEra,
          withdrawYear: params.endedYear,
          withdrawMonth: params.endedMonth,
          withdrawDay: params.endedDay,
          withdrawPrecision: params.endedPrecision,
          ...(params.terminationNote &&
            !warParticipant.withdrawReason && {
              withdrawReason: params.terminationNote,
            }),
        },
      })
    }
  }
}
