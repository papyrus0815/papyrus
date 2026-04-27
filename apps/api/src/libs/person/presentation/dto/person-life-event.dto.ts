import { ApiProperty } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsUUID,
  IsIn,
  IsInt,
  MaxLength,
} from 'class-validator'

/**
 * 인물 연보(PersonLifeEvent) 카테고리 — 자유 문자열이지만 프론트 표시 일관성 위해 상수로 제한.
 */
export const PERSON_LIFE_EVENT_CATEGORIES = [
  'EDUCATION',
  'TRAVEL',
  'PUBLICATION',
  'EXILE',
  'AWARD',
  'PERSONAL',
  'CAREER',
  'MILITARY',
  'POLITICAL',
  'DIPLOMATIC',
  'RELIGIOUS',
  'HEALTH',
  'FAMILY',
  'OTHER',
] as const

export type PersonLifeEventCategory = (typeof PERSON_LIFE_EVENT_CATEGORIES)[number]

const DATE_PRECISIONS = ['year', 'month', 'day'] as const

/**
 * 인물 연보 생성 DTO
 */
export class CreatePersonLifeEventDto {
  @ApiProperty({ description: '인물 ID' })
  @IsUUID()
  personId!: string

  @ApiProperty({ description: '제목', example: '파리 유학' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @ApiProperty({ description: '상세 설명', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({
    description: '카테고리',
    enum: PERSON_LIFE_EVENT_CATEGORIES,
    required: false,
  })
  @IsOptional()
  @IsIn(PERSON_LIFE_EVENT_CATEGORIES as unknown as string[])
  category?: PersonLifeEventCategory

  @ApiProperty({ description: '시작일 (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiProperty({
    description: '시작일 정밀도',
    enum: DATE_PRECISIONS,
    required: false,
  })
  @IsOptional()
  @IsIn(DATE_PRECISIONS as unknown as string[])
  startDatePrecision?: 'year' | 'month' | 'day'

  @ApiProperty({ description: '종료일 (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiProperty({
    description: '종료일 정밀도',
    enum: DATE_PRECISIONS,
    required: false,
  })
  @IsOptional()
  @IsIn(DATE_PRECISIONS as unknown as string[])
  endDatePrecision?: 'year' | 'month' | 'day'

  @ApiProperty({ description: '같은 시점 정렬용 순서', required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number
}

/**
 * 인물 연보 수정 DTO — personId는 변경 불가, 나머지는 전부 선택.
 */
export class UpdatePersonLifeEventDto {
  @ApiProperty({ description: '제목', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string

  @ApiProperty({ description: '상세 설명', required: false })
  @IsOptional()
  @IsString()
  description?: string | null

  @ApiProperty({
    description: '카테고리',
    enum: PERSON_LIFE_EVENT_CATEGORIES,
    required: false,
  })
  @IsOptional()
  @IsIn([...(PERSON_LIFE_EVENT_CATEGORIES as unknown as string[]), null as unknown as string])
  category?: PersonLifeEventCategory | null

  @ApiProperty({ description: '시작일 (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string | null

  @ApiProperty({
    description: '시작일 정밀도',
    enum: DATE_PRECISIONS,
    required: false,
  })
  @IsOptional()
  @IsIn([...(DATE_PRECISIONS as unknown as string[]), null as unknown as string])
  startDatePrecision?: 'year' | 'month' | 'day' | null

  @ApiProperty({ description: '종료일 (ISO)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string | null

  @ApiProperty({
    description: '종료일 정밀도',
    enum: DATE_PRECISIONS,
    required: false,
  })
  @IsOptional()
  @IsIn([...(DATE_PRECISIONS as unknown as string[]), null as unknown as string])
  endDatePrecision?: 'year' | 'month' | 'day' | null

  @ApiProperty({ description: '같은 시점 정렬용 순서', required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number | null
}

export interface PersonLifeEventResponseDto {
  id: string
  personId: string
  title: string
  description?: string | null
  category?: string | null
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
  sortOrder?: number | null
  accountId?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 통합 연보 타임라인 항목 — kind 로 구분.
 * - 'life-event': 인물 자유 서술형 연보 (PersonLifeEvent)
 * - 'event-participation': 사건 참여 (PersonEvent + 사건 정보 + 인물 시점 role/note)
 */
export interface PersonTimelineLifeEventItem extends PersonLifeEventResponseDto {
  kind: 'life-event'
}

export interface PersonTimelineEventParticipationItem {
  kind: 'event-participation'
  /** PersonEvent 행 PK */
  id: string
  personId: string
  eventId: string
  /** 그 사건에서의 역할 (자유 텍스트, 예: "1군단 사령관") */
  role?: string | null
  /** 그 인물 시점의 사건 서술 (장문 가능) */
  note?: string | null
  createdAt: string
  updatedAt: string
  event: {
    id: string
    title: string
    description?: string | null
    startDate?: string | null
    startDatePrecision?: string | null
    endDate?: string | null
    endDatePrecision?: string | null
    location?: string | null
    parentEventId?: string | null
    categoryId?: string | null
    category?: { id: string; name: string } | null
  }
}

export type PersonTimelineItem =
  | PersonTimelineLifeEventItem
  | PersonTimelineEventParticipationItem
