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

/** 목록·정렬용 부호 연도. BC는 음수 — 문자열·절댓값 비교는 BC를 뒤집는다. */
function signedYear(era: string | null, year: number | null): number {
  if (year == null) return Number.POSITIVE_INFINITY
  return era === 'BC' ? -year : year
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

    if (countryId) {
      where = (await resolveCountryScopeOr(
        this.prisma,
        countryId,
      )) as Prisma.PoliticalSystemWhereInput
    } else if (historicalCountryId) {
      where.historicalCountryId = historicalCountryId
    }

    const rows = await this.prisma.politicalSystem.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: RESPONSE_INCLUDE,
    })

    // 정렬은 부호 연도로 — Prisma orderBy는 startYear만 보므로 BC가 뒤집힌다.
    // 연도 미상은 항상 끝(signedYear가 +Infinity).
    return rows.sort(
      (left, right) =>
        signedYear(left.startEra, left.startYear) -
        signedYear(right.startEra, right.startYear),
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

    if (!countryId && !historicalCountryId) {
      throw new BadRequestException(
        'countryId 또는 historicalCountryId 중 하나는 있어야 합니다',
      )
    }
    this.assertPeriodOrder(rest)
    await this.assertPositionRefs(rest)

    const row = await this.prisma.politicalSystem.create({
      data: {
        ...this.writable(rest),
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
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
    await this.assertOwnership(id, req)
    this.assertPeriodOrder(dto)
    await this.assertPositionRefs(dto)

    const row = await this.prisma.politicalSystem.update({
      where: { id },
      data: this.writable(dto),
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
      select: { accountId: true },
    })
    if (!existing) throw new NotFoundException('정체를 찾을 수 없습니다')
    if (existing.accountId && existing.accountId !== accountId) {
      throw new ForbiddenException('이 정체를 수정할 권한이 없습니다')
    }
  }

  /**
   * 카탈로그 참조 검증. 없는 id면 FK 위반이 500으로 새고, 유형이 어긋난 정의
   * (예: 국가원수 칸에 각료 정의)를 그대로 받으면 화면 라벨이 거짓이 된다.
   */
  private async assertPositionRefs(dto: UpdatePoliticalSystemDto) {
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
      select: { id: true, positionType: true },
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
    }
  }

  /** 시작이 끝보다 뒤면 거른다 — BC 때문에 부호 연도로 비교해야 한다. */
  private assertPeriodOrder(dto: UpdatePoliticalSystemDto) {
    const start = signedYear(dto.startEra ?? null, dto.startYear ?? null)
    const end = signedYear(dto.endEra ?? null, dto.endYear ?? null)
    if (Number.isFinite(start) && Number.isFinite(end) && start > end) {
      throw new BadRequestException('시작 연도가 종료 연도보다 뒤일 수 없습니다')
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
