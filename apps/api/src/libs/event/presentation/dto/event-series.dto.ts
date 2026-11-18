import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'
import {
  EVENT_DOMAIN_VALUES,
  type EventDomainValue,
} from '../../domain/event-domain'
import { EVENT_TYPE_VALUES, type EventTypeValue } from '../../domain/event-type'
import type {
  EventSeriesForecast,
  MissingSeriesEditionRange,
} from '../../domain/event-series-forecast'

export const EVENT_SERIES_CADENCE_VALUES = ['PERIODIC', 'IRREGULAR'] as const
export type EventSeriesCadenceValue = (typeof EVENT_SERIES_CADENCE_VALUES)[number]

export const EVENT_SERIES_STATUS_VALUES = ['ACTIVE', 'SUSPENDED', 'ENDED'] as const
export type EventSeriesStatusValue = (typeof EVENT_SERIES_STATUS_VALUES)[number]

export const EVENT_SERIES_NEXT_STATE_VALUES = [
  'AUTO',
  'CONFIRMED',
  'POSTPONED',
  'TBD',
] as const
export type EventSeriesNextStateValue =
  (typeof EVENT_SERIES_NEXT_STATE_VALUES)[number]

export class CreateEventSeriesDto {
  @ApiProperty({ description: '정기 시리즈 공식 명칭 (예: 아세안 정상회의, APEC 정상회의, 쿼드 정상회의)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(80)
  shortTitle?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  originalTitle?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  description?: string | null

  @ApiProperty({ required: false, enum: EVENT_DOMAIN_VALUES })
  @IsOptional()
  @IsIn(EVENT_DOMAIN_VALUES)
  defaultDomain?: EventDomainValue

  @ApiProperty({ required: false, nullable: true, enum: EVENT_TYPE_VALUES })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(EVENT_TYPE_VALUES)
  defaultEventType?: EventTypeValue | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  organizationId?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  countryId?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  historicalCountryId?: string | null

  @ApiProperty({ required: false, enum: EVENT_SERIES_CADENCE_VALUES })
  @IsOptional()
  @IsIn(EVENT_SERIES_CADENCE_VALUES)
  cadenceKind?: EventSeriesCadenceValue

  @ApiProperty({ description: '개최 주기 개월 수 (6=연 2회, 12=매년, 24=2년마다, 48=4년마다)', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(1200)
  intervalMonths?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  typicalMonth?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  typicalMonthSecondary?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  hostRotationRule?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hostRotationEnabled?: boolean

  @ApiProperty({ required: false, nullable: true, type: [String] })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @IsUUID(undefined, { each: true })
  hostRotationCountryIds?: string[] | null

  @ApiProperty({ required: false, enum: EVENT_SERIES_STATUS_VALUES })
  @IsOptional()
  @IsIn(EVENT_SERIES_STATUS_VALUES)
  status?: EventSeriesStatusValue

  @ApiProperty({ required: false, nullable: true, enum: ['BC', 'AD'] })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  startedEra?: 'BC' | 'AD' | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  startedYear?: number | null

  @ApiProperty({ required: false, nullable: true, enum: ['BC', 'AD'] })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  endedEra?: 'BC' | 'AD' | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  endedYear?: number | null

  @ApiProperty({ required: false, enum: EVENT_SERIES_NEXT_STATE_VALUES })
  @IsOptional()
  @IsIn(EVENT_SERIES_NEXT_STATE_VALUES)
  nextScheduleState?: EventSeriesNextStateValue

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  nextEditionNumber?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  nextYear?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  nextMonth?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  nextDay?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  nextHostCountryId?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  nextLocation?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  nextNote?: string | null
}

export class UpdateEventSeriesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(80)
  shortTitle?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  originalTitle?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  description?: string | null

  @ApiProperty({ required: false, enum: EVENT_DOMAIN_VALUES })
  @IsOptional()
  @IsIn(EVENT_DOMAIN_VALUES)
  defaultDomain?: EventDomainValue

  @ApiProperty({ required: false, nullable: true, enum: EVENT_TYPE_VALUES })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(EVENT_TYPE_VALUES)
  defaultEventType?: EventTypeValue | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  organizationId?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  countryId?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  historicalCountryId?: string | null

  @ApiProperty({ required: false, enum: EVENT_SERIES_CADENCE_VALUES })
  @IsOptional()
  @IsIn(EVENT_SERIES_CADENCE_VALUES)
  cadenceKind?: EventSeriesCadenceValue

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(1200)
  intervalMonths?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  typicalMonth?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  typicalMonthSecondary?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  hostRotationRule?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hostRotationEnabled?: boolean

  @ApiProperty({ required: false, nullable: true, type: [String] })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @IsUUID(undefined, { each: true })
  hostRotationCountryIds?: string[] | null

  @ApiProperty({ required: false, enum: EVENT_SERIES_STATUS_VALUES })
  @IsOptional()
  @IsIn(EVENT_SERIES_STATUS_VALUES)
  status?: EventSeriesStatusValue

  @ApiProperty({ required: false, nullable: true, enum: ['BC', 'AD'] })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  startedEra?: 'BC' | 'AD' | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  startedYear?: number | null

  @ApiProperty({ required: false, nullable: true, enum: ['BC', 'AD'] })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  endedEra?: 'BC' | 'AD' | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  endedYear?: number | null

  @ApiProperty({ required: false, enum: EVENT_SERIES_NEXT_STATE_VALUES })
  @IsOptional()
  @IsIn(EVENT_SERIES_NEXT_STATE_VALUES)
  nextScheduleState?: EventSeriesNextStateValue

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  nextEditionNumber?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  nextYear?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  nextMonth?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  nextDay?: number | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  nextHostCountryId?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  nextLocation?: string | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  nextNote?: string | null
}

export interface EventSeriesEditionSummaryDto {
  id: string
  title: string
  seriesEdition: number | null
  seriesEditionLabel: string | null
  editionBadge: string | null
  startDate: string | null
  startDatePrecision: string | null
  endDate: string | null
  endDatePrecision: string | null
  location: string | null
  kind: 'SINGLE' | 'COLLECTION'
  domain: EventDomainValue
  type: EventTypeValue | null
  hostCountry: {
    id: string
    name: string
    flagEmoji?: string | null
    isHistorical?: boolean
  } | null
  participantCount: number
  isFuture: boolean
}

export interface EventSeriesItemDto {
  id: string
  title: string
  shortTitle: string | null
  originalTitle: string | null
  description: string | null
  defaultDomain: EventDomainValue
  defaultEventType: EventTypeValue | null
  organizationId: string | null
  organization: {
    id: string
    name: string
    shortName: string | null
    type: string
    logoUrl: string | null
  } | null
  countryId: string | null
  country: { id: string; name: string; flagEmoji?: string | null } | null
  historicalCountryId: string | null
  historicalCountry: { id: string; name: string } | null
  cadenceKind: EventSeriesCadenceValue
  intervalMonths: number | null
  typicalMonth: number | null
  typicalMonthSecondary: number | null
  hostRotationRule: string | null
  hostRotationEnabled: boolean
  hostRotationCountryIds: string[] | null
  status: EventSeriesStatusValue
  startedEra: 'BC' | 'AD' | null
  startedYear: number | null
  endedEra: 'BC' | 'AD' | null
  endedYear: number | null
  nextScheduleState: EventSeriesNextStateValue
  nextEditionNumber: number | null
  nextYear: number | null
  nextMonth: number | null
  nextDay: number | null
  nextHostCountryId: string | null
  nextHostCountry: { id: string; name: string; flagEmoji?: string | null } | null
  nextLocation: string | null
  nextNote: string | null
  editionCount: number
  latestEdition: EventSeriesEditionSummaryDto | null
  missingRanges: MissingSeriesEditionRange[]
  forecast: EventSeriesForecast
  createdAt: string
  updatedAt: string
}

export interface EventSeriesDetailDto extends EventSeriesItemDto {
  editions: EventSeriesEditionSummaryDto[]
  organizationMemberCount: number
}

export interface EventSeriesTimelinePointDto {
  id: string
  title: string
  editionBadge: string | null
  seriesEdition: number | null
  startDate: string | null
  hostCountryName: string | null
  hostCountryFlagEmoji: string | null
  isFuture: boolean
}

/** 사건 상세 화면(SeriesFlowStrip)에 실리는 소속 시리즈 요약 + 이전/다음 회차 + 차기 개최 안내 */
export interface EventSeriesContextDto {
  id: string
  title: string
  shortTitle: string | null
  defaultDomain: EventDomainValue
  defaultEventType: EventTypeValue | null
  organizationId: string | null
  organizationName: string | null
  cadenceLabel: string
  editionCount: number
  position: number
  currentEditionBadge: string | null
  prevEdition: {
    id: string
    title: string
    editionBadge: string | null
    startDate: string | null
  } | null
  nextEdition: {
    id: string
    title: string
    editionBadge: string | null
    startDate: string | null
  } | null
  editionsTimeline: EventSeriesTimelinePointDto[]
  missingRanges: MissingSeriesEditionRange[]
  forecast: EventSeriesForecast
}
