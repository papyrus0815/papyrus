import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { Era } from '@prisma/client'
import { mapStructuredDateInput } from '../../person/domain/structured-date.util'
import { DynastyService } from '../application/dynasty.service'
import {
  CreateDynastyDto,
  CreateDynastyHistoricalRuleDto,
  CreateDynastyModernRuleDto,
  DateInfo,
  DynastyDetailResponseDto,
  DynastyResponseDto,
  UpdateDynastyDto,
  UpdateDynastyRuleReasonDto,
} from './dto'

type DynastyDetailRow = Awaited<ReturnType<DynastyService['findDetail']>>

/** findDetail 결과 → DynastyDetailResponseDto (getDetail·rule 편집 응답 공용). */
function toDetailResponse(d: DynastyDetailRow): DynastyDetailResponseDto {
  return {
    ...toResponseDto(d),
    historicalRules: d.historicalRules,
    modernRules: d.modernRules,
    memberCount: d.memberCount,
    members: d.members,
  }
}

type DynastyRow = Awaited<ReturnType<DynastyService['findById']>>

/**
 * 구조화 채널(우선) 또는 레거시 ISO를 6컬럼(DateTime+precision+era/year/month/day)으로 정규화.
 * DateTime은 AD1000~9999 완전일자만 채움 — BC/고대/연단위는 date=null이고 era/year가 진실.
 */
function dateSlice(
  info: DateInfo | null | undefined,
  legacyIso: string | null | undefined,
) {
  const r = mapStructuredDateInput(info ?? null, legacyIso ?? null)
  return {
    date: r.date,
    precision: r.precision,
    era: r.era as Era | null,
    year: r.year,
    month: r.month,
    day: r.day,
  }
}

/**
 * DateInfo → 통치기록 날짜 컬럼(era/year/month/day). date/precision 드롭 — Rule엔 DATETIME·precision 컬럼 없음.
 * modern=true면 era를 AD로 coerce(현대국가 startEra/endEra @default(AD)를 null이 덮어쓰는 것 방지).
 */
function ruleDateColumns(
  info: DateInfo | null | undefined,
  opts: { modern: boolean },
) {
  const r = mapStructuredDateInput(info ?? null, null)
  const era = (r.era as Era | null) ?? (opts.modern ? 'AD' : null)
  return { era, year: r.year, month: r.month, day: r.day }
}

/** 통치기록 신규 등록 필드 — 날짜 축을 항상 매핑(빈 축도 modern은 AD로 명시). */
function buildRuleCreateFields(
  dto: {
    startDateInfo?: DateInfo | null
    endDateInfo?: DateInfo | null
    startReason?: string | null
    endReason?: string | null
    notes?: string | null
  },
  modern: boolean,
) {
  const s = ruleDateColumns(dto.startDateInfo, { modern })
  const e = ruleDateColumns(dto.endDateInfo, { modern })
  return {
    startEra: s.era,
    startYear: s.year,
    startMonth: s.month,
    startDay: s.day,
    endEra: e.era,
    endYear: e.year,
    endMonth: e.month,
    endDay: e.day,
    startReason: dto.startReason,
    endReason: dto.endReason,
    notes: dto.notes,
  }
}

/** 통치기록 수정 필드 — 날짜는 provided-gate(제공된 축만 매핑, 미제공 축은 미포함=Prisma 무시). */
function buildRuleUpdateFields(
  dto: {
    startDateInfo?: DateInfo | null
    endDateInfo?: DateInfo | null
    startReason?: string | null
    endReason?: string | null
    notes?: string | null
  },
  modern: boolean,
) {
  const fields: {
    startEra?: Era | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    endEra?: Era | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
    startReason?: string | null
    endReason?: string | null
    notes?: string | null
  } = { startReason: dto.startReason, endReason: dto.endReason, notes: dto.notes }
  if (dto.startDateInfo !== undefined) {
    const s = ruleDateColumns(dto.startDateInfo, { modern })
    fields.startEra = s.era
    fields.startYear = s.year
    fields.startMonth = s.month
    fields.startDay = s.day
  }
  if (dto.endDateInfo !== undefined) {
    const e = ruleDateColumns(dto.endDateInfo, { modern })
    fields.endEra = e.era
    fields.endYear = e.year
    fields.endMonth = e.month
    fields.endDay = e.day
  }
  return fields
}

function toResponseDto(d: DynastyRow): DynastyResponseDto {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    startDate: d.startDate ? d.startDate.toISOString() : null,
    endDate: d.endDate ? d.endDate.toISOString() : null,
    startDatePrecision: d.startDatePrecision,
    startEra: d.startEra,
    startYear: d.startYear,
    startMonth: d.startMonth,
    startDay: d.startDay,
    endDatePrecision: d.endDatePrecision,
    endEra: d.endEra,
    endYear: d.endYear,
    endMonth: d.endMonth,
    endDay: d.endDay,
    startReason: d.startReason,
    endReason: d.endReason,
    thumbnailUrl: d.thumbnailUrl,
    originPlace: d.originPlace,
    founderId: d.founderId,
    founder: d.founder
      ? {
          id: d.founder.id,
          name: d.founder.name,
          surname: d.founder.surname,
          birthDate: d.founder.birthDate
            ? d.founder.birthDate.toISOString()
            : null,
          deathDate: d.founder.deathDate
            ? d.founder.deathDate.toISOString()
            : null,
        }
      : null,
    founderText: d.founderText,
    crestImageUrl: d.crestImageUrl,
    motto: d.motto,
    memberCount: d.memberCount,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

/**
 * 가문(왕조) API — 로그인 필수.
 *
 * Dynasty도 `accountId`가 없는 공유 카탈로그라 소유자 게이트는 불가(마이그레이션 선행).
 * 읽기 포함 클래스 레벨 가드가 안전함을 확인: 가문 조회는 로그인 화면(가문 페이지·
 * 인물 등록 모달·리치텍스트 멘션) 안에서만 쓰이고, 비로그인 라우트인 /genealogy는
 * 가문명을 인물 응답에 실려 오는 값으로 표시할 뿐 이 API를 호출하지 않는다.
 */
@ApiTags('dynasties')
@Controller('dynasties')
@UseGuards(AuthGuard('jwt'))
export class DynastyController {
  constructor(private readonly dynastyService: DynastyService) {}

  @Get()
  async getAll(): Promise<DynastyResponseDto[]> {
    const dynasties = await this.dynastyService.findAll()
    return dynasties.map(toResponseDto)
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<DynastyResponseDto> {
    const d = await this.dynastyService.findById(id)
    return toResponseDto(d)
  }

  /** 가문 상세: 기본 + 통치 국가 + 구성원 미리보기 */
  @Get(':id/detail')
  async getDetail(@Param('id') id: string): Promise<DynastyDetailResponseDto> {
    const d = await this.dynastyService.findDetail(id)
    return toDetailResponse(d)
  }

  /**
   * 통치기록(역사국가) 등록. 갱신된 가문 상세 전체를 반환.
   */
  @Post(':id/historical-rules')
  async createHistoricalRule(
    @Param('id') id: string,
    @Body() dto: CreateDynastyHistoricalRuleDto,
  ): Promise<DynastyDetailResponseDto> {
    const d = await this.dynastyService.createHistoricalRule(id, {
      historicalCountryId: dto.historicalCountryId,
      ...buildRuleCreateFields(dto, false),
    })
    return toDetailResponse(d)
  }

  /** 통치기록(현대국가) 등록. */
  @Post(':id/modern-rules')
  async createModernRule(
    @Param('id') id: string,
    @Body() dto: CreateDynastyModernRuleDto,
  ): Promise<DynastyDetailResponseDto> {
    const d = await this.dynastyService.createModernRule(id, {
      countryId: dto.countryId,
      ...buildRuleCreateFields(dto, true),
    })
    return toDetailResponse(d)
  }

  /**
   * 통치기록(역사국가) 수정 — 기간·종료 사유·비고. 통치 국가는 불변(바꾸려면 삭제 후 재등록).
   * 갱신된 가문 상세 전체를 반환.
   */
  @Patch(':id/historical-rules/:ruleId')
  async updateHistoricalRuleReason(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateDynastyRuleReasonDto,
  ): Promise<DynastyDetailResponseDto> {
    const d = await this.dynastyService.updateHistoricalRuleReason(
      id,
      ruleId,
      buildRuleUpdateFields(dto, false),
    )
    return toDetailResponse(d)
  }

  /** 통치기록(현대국가) 수정. */
  @Patch(':id/modern-rules/:ruleId')
  async updateModernRuleReason(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateDynastyRuleReasonDto,
  ): Promise<DynastyDetailResponseDto> {
    const d = await this.dynastyService.updateModernRuleReason(
      id,
      ruleId,
      buildRuleUpdateFields(dto, true),
    )
    return toDetailResponse(d)
  }

  /** 통치기록(역사국가) 삭제. */
  @Delete(':id/historical-rules/:ruleId')
  async deleteHistoricalRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
  ): Promise<DynastyDetailResponseDto> {
    const d = await this.dynastyService.deleteHistoricalRule(id, ruleId)
    return toDetailResponse(d)
  }

  /** 통치기록(현대국가) 삭제. */
  @Delete(':id/modern-rules/:ruleId')
  async deleteModernRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
  ): Promise<DynastyDetailResponseDto> {
    const d = await this.dynastyService.deleteModernRule(id, ruleId)
    return toDetailResponse(d)
  }

  @Post()
  async create(@Body() dto: CreateDynastyDto): Promise<DynastyResponseDto> {
    const s = dateSlice(dto.startDateInfo, dto.startDate)
    const e = dateSlice(dto.endDateInfo, dto.endDate)
    const d = await this.dynastyService.create({
      name: dto.name,
      description: dto.description,
      startDate: s.date,
      startDatePrecision: s.precision,
      startEra: s.era,
      startYear: s.year,
      startMonth: s.month,
      startDay: s.day,
      endDate: e.date,
      endDatePrecision: e.precision,
      endEra: e.era,
      endYear: e.year,
      endMonth: e.month,
      endDay: e.day,
      startReason: dto.startReason,
      endReason: dto.endReason,
      thumbnailUrl: dto.thumbnailUrl,
      originPlace: dto.originPlace,
      founderId: dto.founderId,
      founderText: dto.founderText,
      crestImageUrl: dto.crestImageUrl,
      motto: dto.motto,
    })
    return toResponseDto(d)
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDynastyDto,
  ): Promise<DynastyResponseDto> {
    // 날짜 축은 구조화(startDateInfo) 또는 레거시(startDate) 중 하나라도 제공되면 6컬럼을 통째로
    // 세팅(부분갱신 정합 붕괴 방지), 둘 다 undefined면 축 전체를 건드리지 않음. 두 채널 혼용 금지.
    const startProvided =
      dto.startDateInfo !== undefined || dto.startDate !== undefined
    const endProvided = dto.endDateInfo !== undefined || dto.endDate !== undefined
    const s = startProvided ? dateSlice(dto.startDateInfo, dto.startDate) : null
    const e = endProvided ? dateSlice(dto.endDateInfo, dto.endDate) : null
    const d = await this.dynastyService.update(id, {
      name: dto.name,
      description: dto.description,
      ...(s
        ? {
            startDate: s.date,
            startDatePrecision: s.precision,
            startEra: s.era,
            startYear: s.year,
            startMonth: s.month,
            startDay: s.day,
          }
        : {}),
      ...(e
        ? {
            endDate: e.date,
            endDatePrecision: e.precision,
            endEra: e.era,
            endYear: e.year,
            endMonth: e.month,
            endDay: e.day,
          }
        : {}),
      // 문자열 사유는 Date 변환 불필요 — undefined=유지/null=클리어/string=값 그대로 전달
      startReason: dto.startReason,
      endReason: dto.endReason,
      thumbnailUrl: dto.thumbnailUrl,
      originPlace: dto.originPlace,
      founderId: dto.founderId,
      founderText: dto.founderText,
      crestImageUrl: dto.crestImageUrl,
      motto: dto.motto,
    })
    return toResponseDto(d)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.dynastyService.delete(id)
  }
}
