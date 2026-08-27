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
      include: {
        country: COUNTRY_REF_SELECT,
        historicalCountry: COUNTRY_REF_SELECT,
      },
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
      include: {
        country: COUNTRY_REF_SELECT,
        historicalCountry: COUNTRY_REF_SELECT,
      },
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

    const row = await this.prisma.politicalSystem.create({
      data: {
        ...this.writable(rest),
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
        accountId: accountId ?? null,
      },
      include: {
        country: COUNTRY_REF_SELECT,
        historicalCountry: COUNTRY_REF_SELECT,
      },
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

    const row = await this.prisma.politicalSystem.update({
      where: { id },
      data: this.writable(dto),
      include: {
        country: COUNTRY_REF_SELECT,
        historicalCountry: COUNTRY_REF_SELECT,
      },
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
      'headOfStateTitle',
      'headOfStateHasPower',
      'headOfGovernmentTitle',
      'headOfGovernmentHasPower',
      'stateStructure',
      'partySystem',
      'notes',
    ]
    for (const key of keys) {
      if (dto[key] !== undefined) data[key] = dto[key]
    }
    return data
  }
}
