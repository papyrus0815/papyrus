import {
  AnalystRating,
  CatalystDateConfidence,
  CompanyHistoryType,
  DriverImpact,
  DriverImportance,
  DriverRole,
  FacilityType,
  OutlookConfidence,
  OutlookOutcome,
  OutlookStance,
  ScenarioKind,
  ValuationMethod,
} from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

/**
 * 금액 상한 — DB 컬럼 정밀도 안에서 안전한 헤드룸(현실 최대치보다 훨씬 큼).
 * 로컬 MySQL이 non-strict면 범위초과를 무음 clamp(손상)하므로 DB 전에 거부한다.
 *  - 주가: Decimal(20,4) → 1e15 (현실 주가 < 1e6)
 *  - 시총·매출: Decimal(24,2) → 1e21 (현실 시총 < 1e13)
 */
const MAX_PRICE = 1e15
const MAX_CAP = 1e21

/**
 * 기업 자식 엔티티 입력 DTO (UpdateCompanyDto 중첩 배열용).
 * 전체배열 delete-and-recreate 규약이라 id는 받지 않는다(서버가 재발급).
 * 옵셔널 FK·날짜는 프론트 빈 select가 ''로 오므로 @ValidateIf 가드로 검증 스킵.
 */

/** 기업 시설 입력 (손자 facilityHistories/laws/builtNavalVessels는 1차 backlog) */
export class CompanyFacilityInputDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(FacilityType)
  facilityType?: FacilityType | null

  @IsOptional()
  @IsString()
  name?: string | null

  @IsOptional()
  @IsString()
  address?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @IsString()
  constructionBackground?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  constructionStartDate?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  constructionEndDate?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  openedAt?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  closedAt?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  cityId?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  administrativeDivisionId?: string | null
}

/** 기업 연혁 입력 (eventId 연결은 integration-2 별도 작업) */
export class CompanyHistoryInputDto {
  /** 연혁 종류 (제품 발표·재무 등). 미지정 시 GENERAL. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(CompanyHistoryType)
  type?: CompanyHistoryType | null

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  occurredAt?: string | null

  @IsOptional()
  @IsString()
  content?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  /** 당시 주가 (해당 시점 종가 등). */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  stockPrice?: number | null

  /** 당시 시가총액. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_CAP)
  marketCap?: number | null

  /** 통화 코드 (예: USD, KRW). */
  @IsOptional()
  @IsString()
  currency?: string | null

  @IsOptional()
  @IsInt()
  order?: number | null
}

/** 기업-업종 연결 입력 */
export class CompanyCategoryInputDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  fromDate?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  toDate?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}

/** 기업 제품 입력 (제품·기술 카탈로그) */
export class CompanyProductInputDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  category?: string | null

  @IsOptional()
  @IsString()
  productLine?: string | null

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  announcedAt?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  releasedAt?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  discontinuedAt?: string | null

  @IsOptional()
  @IsString()
  imageUrl?: string | null

  @IsOptional()
  @IsInt()
  order?: number | null
}

/** 기업 주가·재무 시점 입력 (시계열) */
export class CompanyStockPointInputDto {
  @IsDateString()
  date!: string

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  price?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_CAP)
  marketCap?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_CAP)
  revenue?: number | null

  @IsOptional()
  @IsString()
  currency?: string | null

  @IsOptional()
  @IsString()
  source?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  /** 증시 동향(시장 거시 — 지수·매크로·섹터). 회사 미시 비고인 note와 분리. */
  @IsOptional()
  @IsString()
  marketNote?: string | null
}

/** 증권사 목표주가·투자의견 입력 */
export class CompanyAnalystRatingInputDto {
  @IsString()
  @IsNotEmpty()
  firm!: string

  @IsOptional()
  @IsString()
  analyst?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  targetPrice?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  priorTargetPrice?: number | null

  @IsOptional()
  @IsString()
  currency?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(AnalystRating)
  rating?: AnalystRating | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  publishedAt?: string | null

  @IsOptional()
  @IsString()
  reportTitle?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  sourceUrl?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @IsInt()
  order?: number | null
}

/** 전망 핵심 변수(드라이버) 입력 */
export class CompanyOutlookDriverInputDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(DriverRole)
  role?: DriverRole | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(DriverImpact)
  impact?: DriverImpact | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(DriverImportance)
  importance?: DriverImportance | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  eventDate?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @IsInt()
  order?: number | null
}

/** 전망 시나리오(낙관/기본/비관) 입력 */
export class CompanyOutlookScenarioInputDto {
  @IsEnum(ScenarioKind)
  kind!: ScenarioKind

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  targetPrice?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number | null

  @IsOptional()
  @IsString()
  summary?: string | null

  @IsOptional()
  @IsInt()
  order?: number | null
}

/** 전망 촉매(예정 이벤트) 입력 */
export class CompanyOutlookCatalystInputDto {
  @IsString()
  @IsNotEmpty()
  title!: string

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  expectedDate?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(CatalystDateConfidence)
  dateConfidence?: CatalystDateConfidence | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(DriverImpact)
  impact?: DriverImpact | null

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @IsInt()
  order?: number | null
}

/** 향후 전망 입력 (핵심 변수·시나리오·촉매 중첩) */
export class CompanyOutlookInputDto {
  @IsOptional()
  @IsString()
  horizon?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  asOf?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  targetDate?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(OutlookStance)
  stance?: OutlookStance | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(OutlookConfidence)
  confidence?: OutlookConfidence | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  targetPrice?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  expectedLow?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  expectedHigh?: number | null

  @IsOptional()
  @IsString()
  currency?: string | null

  @IsOptional()
  @IsString()
  rationale?: string | null

  @IsOptional()
  @IsString()
  source?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  priorTargetPrice?: number | null

  //--- 밸류에이션 근거
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(ValuationMethod)
  valuationMethod?: ValuationMethod | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  targetMultiple?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  perShareBasis?: number | null

  @IsOptional()
  @IsString()
  basisLabel?: string | null

  //--- 사후 검증
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  actualPrice?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsEnum(OutlookOutcome)
  outcome?: OutlookOutcome | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsDateString()
  resolvedAt?: string | null

  @IsOptional()
  @IsInt()
  order?: number | null

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyOutlookDriverInputDto)
  drivers?: CompanyOutlookDriverInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyOutlookScenarioInputDto)
  scenarios?: CompanyOutlookScenarioInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyOutlookCatalystInputDto)
  catalysts?: CompanyOutlookCatalystInputDto[]
}
