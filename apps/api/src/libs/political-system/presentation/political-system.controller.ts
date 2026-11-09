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

import type {
  CreatePoliticalSystemDto,
  PoliticalSystemResponseDto,
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
  select: { id: true, title: true, titleLocal: true, positionType: true },
} as const

/** 응답 include 한 벌 — 목록·단건·생성·수정이 같은 모양을 내려야 한다 */
const RESPONSE_INCLUDE = {
  country: COUNTRY_REF_SELECT,
  historicalCountry: COUNTRY_REF_SELECT,
  headOfStatePosition: POSITION_REF_SELECT,
  headOfGovernmentPosition: POSITION_REF_SELECT,
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
  ): Promise<PoliticalSystemResponseDto[]> {
    let where: Prisma.PoliticalSystemWhereInput = {}

    if (historicalCountryId) {
      where.historicalCountryId = historicalCountryId
    } else if (countryId) {
      where = (await resolveCountryScopeOr(
        this.prisma,
        countryId,
      )) as Prisma.PoliticalSystemWhereInput
    }

    const rows = await this.prisma.politicalSystem.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: RESPONSE_INCLUDE,
    })

    // 정렬은 부호 연·월·일로 — Prisma orderBy는 startYear만 보므로 BC가 뒤집히고 동년 내 교체 순서가 섞인다.
    // 연도 미상은 항상 끝(signedDateKey가 +Infinity).
    return rows.sort(
      (left, right) =>
        signedDateKey(left.startEra, left.startYear, left.startMonth, left.startDay, 'start') -
        signedDateKey(right.startEra, right.startYear, right.startMonth, right.startDay, 'start'),
    ) as PoliticalSystemResponseDto[]
  }

  /** @tag political-systems */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<PoliticalSystemResponseDto> {
    const row = await this.prisma.politicalSystem.findUnique({
      where: { id },
      include: RESPONSE_INCLUDE,
    })
    if (!row) throw new NotFoundException('정체를 찾을 수 없습니다')
    return row as PoliticalSystemResponseDto
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
    await this.assertPositionRefs(normalizedRest, resolvedAxis)

    const row = await this.prisma.politicalSystem.create({
      data: {
        ...this.writable(normalizedRest),
        countryId: resolvedAxis.countryId,
        historicalCountryId: resolvedAxis.historicalCountryId,
        accountId: accountId ?? null,
      },
      include: RESPONSE_INCLUDE,
    })
    return row as PoliticalSystemResponseDto
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
      startMonth: dto.startMonth !== undefined ? dto.startMonth : existing.startMonth,
      startDay: dto.startDay !== undefined ? dto.startDay : existing.startDay,
      endEra: effectiveEndEra,
      endYear: effectiveEndYear,
      endMonth: dto.endMonth !== undefined ? dto.endMonth : existing.endMonth,
      endDay: dto.endDay !== undefined ? dto.endDay : existing.endDay,
    })
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
      },
      resolvedAxis,
    )

    const writeData = this.writable(dto)
    if (effectiveStartYear != null && dto.startEra === undefined && !existing.startEra) {
      writeData.startEra = effectiveStartEra
    }
    if (effectiveEndYear != null && dto.endEra === undefined && !existing.endEra) {
      writeData.endEra = effectiveEndEra
    } else if (dto.endYear === null && dto.endEra === undefined) {
      writeData.endEra = null
      if (dto.endMonth === undefined) writeData.endMonth = null
      if (dto.endDay === undefined) writeData.endDay = null
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
    return row as PoliticalSystemResponseDto
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
        startEra: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        endEra: true,
        endYear: true,
        endMonth: true,
        endDay: true,
      },
    })
    if (!existing) throw new NotFoundException('정체를 찾을 수 없습니다')
    if (existing.accountId && existing.accountId !== accountId) {
      throw new ForbiddenException('이 정체를 수정할 권한이 없습니다')
    }
    return existing
  }

  private async isAxisCompatible(
    a: { countryId?: string | null; historicalCountryId?: string | null },
    b: { countryId?: string | null; historicalCountryId?: string | null },
  ): Promise<boolean> {
    if (!a.countryId && !a.historicalCountryId) return true
    if (!b.countryId && !b.historicalCountryId) return true
    if (a.historicalCountryId && b.historicalCountryId) {
      return a.historicalCountryId === b.historicalCountryId
    }
    if (a.countryId && b.countryId && a.countryId === b.countryId) {
      return true
    }
    const targetHistoricalId = a.historicalCountryId ?? b.historicalCountryId
    const targetModernId = a.countryId ?? b.countryId
    if (targetHistoricalId && targetModernId) {
      const bridge = await this.prisma.historicalCountryModernCountry.findFirst({
        where: {
          historicalCountryId: targetHistoricalId,
          modernCountryId: targetModernId,
        },
        select: { id: true },
      })
      if (bridge) return true
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
   * 카탈로그 참조 검증. 없는 id면 FK 위반이 500으로 새고, 유형이 어긋난 정의
   * (예: 국가원수 칸에 각료 정의)나 타국 전용 스코프 정의를 그대로 받으면 정합성이 깨진다.
   */
  private async assertPositionRefs(
    dto: UpdatePoliticalSystemDto,
    targetAxis?: { countryId: string | null; historicalCountryId: string | null },
  ) {
    const checks: Array<{
      id: string
      expected: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
      label: string
    }> = []
    if (dto.headOfStatePositionId)
      checks.push({
        id: dto.headOfStatePositionId,
        expected: 'HEAD_OF_STATE',
        label: '국가원수',
      })
    if (dto.headOfGovernmentPositionId)
      checks.push({
        id: dto.headOfGovernmentPositionId,
        expected: 'HEAD_OF_GOVERNMENT',
        label: '정부수반',
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
      if (found.positionType !== check.expected) {
        throw new BadRequestException(
          `${check.label} 칸에는 ${check.label} 유형의 관직 정의만 지정할 수 있습니다`,
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

  /** 시작이 끝보다 뒤면 거른다 — BC 및 같은 해 내 월·일 순서까지 부호 키로 비교한다. */
  private assertPeriodOrder(dto: UpdatePoliticalSystemDto) {
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
      'headOfStatePositionId',
      'headOfStateTitle',
      'headOfStateHasPower',
      'headOfGovernmentPositionId',
      'headOfGovernmentTitle',
      'headOfGovernmentHasPower',
      'stateStructure',
      'partySystem',
      'notes',
    ]
    for (const key of keys) {
      if (dto[key] !== undefined) data[key] = dto[key]
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
}
