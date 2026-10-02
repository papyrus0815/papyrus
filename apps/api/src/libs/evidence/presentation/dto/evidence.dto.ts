import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

import { StructuredPointDto } from '../../../shared/structured-point.dto'

export { StructuredPointDto }

export const SOURCE_KIND_VALUES = [
  'BOOK',
  'ARTICLE',
  'NEWS',
  'OFFICIAL',
  'DATASET',
  'WEBSITE',
  'ARCHIVE',
  'LEGACY_UNVERIFIED',
  'OTHER',
] as const
export type SourceKindValue = (typeof SOURCE_KIND_VALUES)[number]

export const OBSERVATION_SUBJECT_VALUES = [
  'EVENT',
  'EVENT_SIDE',
  'EVENT_PARTICIPANT',
  'COUNTRY',
  'HISTORICAL_COUNTRY',
  'ORGANIZATION',
  'PERSON',
] as const
export type ObservationSubjectValue = (typeof OBSERVATION_SUBJECT_VALUES)[number]

export class CreateSourceDto {
  @IsIn(SOURCE_KIND_VALUES as unknown as string[])
  kind!: SourceKindValue

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  authors?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(300)
  publisher?: string | null

  @IsOptional()
  @IsInt()
  publishedYear?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  url?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  identifier?: string | null

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  accessedOn?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}

/** 출처 수정 — 3상(생략=유지, null=비움) */
export class UpdateSourceDto {
  @IsOptional()
  @IsIn(SOURCE_KIND_VALUES as unknown as string[])
  kind?: SourceKindValue

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title?: string

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  authors?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(300)
  publisher?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  publishedYear?: number | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  url?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  identifier?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  accessedOn?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  note?: string | null
}

/**
 * 인용 한 줄 — 기존 출처(sourceId) 또는 새 출처(source) 중 하나.
 * 자연키는 (출처, locator) — 같은 출처의 같은 쪽을 두 번 인용하지 않는다.
 */
export class CitationInputDto {
  @IsOptional()
  @IsString()
  sourceId?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSourceDto)
  source?: CreateSourceDto

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  locator?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  quote?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  note?: string | null
}

export class CreateObservationDto {
  @IsIn(OBSERVATION_SUBJECT_VALUES as unknown as string[])
  subjectType!: ObservationSubjectValue

  @IsString()
  @IsNotEmpty()
  subjectId!: string

  /** 지표 — MetricDefinition.key */
  @IsString()
  @IsNotEmpty()
  metricKey!: string

  @IsOptional()
  @IsString()
  value?: string | null

  @IsOptional()
  @IsString()
  low?: string | null

  @IsOptional()
  @IsString()
  high?: string | null

  @IsOptional()
  @IsBoolean()
  approx?: boolean

  @IsOptional()
  @IsBoolean()
  atLeast?: boolean

  @IsOptional()
  @IsString()
  qualifier?: string | null

  /** MONEY 지표의 통화 — ref_currency.code */
  @IsOptional()
  @IsString()
  currencyCode?: string | null

  @IsOptional()
  @ValidateNested()
  @Type(() => StructuredPointDto)
  start?: StructuredPointDto | null

  @IsOptional()
  @ValidateNested()
  @Type(() => StructuredPointDto)
  end?: StructuredPointDto | null

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @IsInt()
  sortOrder?: number

  /** 출처 — **1개 이상 필수** */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CitationInputDto)
  citations!: CitationInputDto[]
}

/**
 * 측정값 수정 — 3상. 수치 칸(value·low·high·approx·atLeast)은 **묶음으로** 다룬다:
 * 하나라도 오면 다섯 칸을 새 값 조합으로 다시 검증한다(일부만 바꿔 모순 상태가 되는 것을 막는다).
 */
export class UpdateObservationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  metricKey?: string

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  value?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  low?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  high?: string | null

  @IsOptional()
  @IsBoolean()
  approx?: boolean

  @IsOptional()
  @IsBoolean()
  atLeast?: boolean

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  qualifier?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  currencyCode?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => StructuredPointDto)
  start?: StructuredPointDto | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => StructuredPointDto)
  end?: StructuredPointDto | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  note?: string | null

  @IsOptional()
  @IsInt()
  sortOrder?: number

  /** 주면 전체 교체(자연키 머지 — 살아남은 인용은 건드리지 않는다). 주면 1개 이상 */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CitationInputDto)
  citations?: CitationInputDto[]
}
