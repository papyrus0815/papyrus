import { ApiProperty } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  Matches,
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

/** 부호 날짜(앞에 시각이 붙어도 됨): 1773-09-01, 1773-09-01T00:00:00.000Z, -0044-03-15 */
const SIGNED_DATE_PATTERN = /^-?\d{1,6}-\d{2}-\d{2}/

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
  // 기원전('-0044-03-15')도 받는다 — IsDateString은 BC 표기를 거부해 고대 연보를 못 적었다
  @Matches(SIGNED_DATE_PATTERN, { message: '날짜는 YYYY-MM-DD(기원전은 앞에 -) 형식이어야 합니다.' })
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
  // 기원전('-0044-03-15')도 받는다 — IsDateString은 BC 표기를 거부해 고대 연보를 못 적었다
  @Matches(SIGNED_DATE_PATTERN, { message: '날짜는 YYYY-MM-DD(기원전은 앞에 -) 형식이어야 합니다.' })
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

  @ApiProperty({
    description: '관련 사건 ID(선택) — 이 연보 항목이 사건 목록의 어느 사건에 해당하는지',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  eventId?: string
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
  // 기원전('-0044-03-15')도 받는다 — IsDateString은 BC 표기를 거부해 고대 연보를 못 적었다
  @Matches(SIGNED_DATE_PATTERN, { message: '날짜는 YYYY-MM-DD(기원전은 앞에 -) 형식이어야 합니다.' })
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
  // 기원전('-0044-03-15')도 받는다 — IsDateString은 BC 표기를 거부해 고대 연보를 못 적었다
  @Matches(SIGNED_DATE_PATTERN, { message: '날짜는 YYYY-MM-DD(기원전은 앞에 -) 형식이어야 합니다.' })
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

  @ApiProperty({ description: '관련 사건 ID — null이면 연결 해제', required: false })
  @IsOptional()
  @IsUUID()
  eventId?: string | null
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
  /** 관련 사건 ID (없으면 null) */
  eventId?: string | null
  /** 관련 사건 요약 — 연보 항목에서 사건으로 바로 가기용 */
  event?: PersonLifeEventLinkedEventDto | null
  createdAt: string
  updatedAt: string
}

/** 연보 항목에 연결된 사건 요약 */
export interface PersonLifeEventLinkedEventDto {
  id: string
  title: string
  startEra?: string | null
  startYear?: number | null
  startDate?: string | null
}

