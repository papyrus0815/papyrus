import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator'
import { MilitaryEventDto } from './military-event.dto'

export class CreateEventDto {
  @ApiProperty({ description: '사건명' })
  @IsString()
  @IsNotEmpty()
  title!: string

  @ApiProperty({ description: '개요 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ description: '시작일', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string

  @ApiProperty({ description: '종료일', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string

  @ApiProperty({ description: '위치 (자유 텍스트)', required: false })
  @IsString()
  @IsOptional()
  location?: string

  @ApiProperty({ description: '카테고리 ID', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string

  @ApiProperty({ description: '카테고리 이름 (카테고리 ID 대신 사용 가능)', required: false })
  @IsString()
  @IsOptional()
  categoryName?: string

  @ApiProperty({ description: '배경', required: false })
  @IsString()
  @IsOptional()
  background?: string

  @ApiProperty({ description: '여파', required: false })
  @IsString()
  @IsOptional()
  aftermath?: string

  @ApiProperty({ description: '상위 사건 ID', required: false })
  @IsString()
  @IsOptional()
  parentEventId?: string

  @ApiProperty({ description: '썸네일 이미지 URL', required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string

  @ApiProperty({ description: '도시 ID', required: false })
  @IsString()
  @IsOptional()
  cityId?: string

  @ApiProperty({ description: '행정구역 ID', required: false })
  @IsString()
  @IsOptional()
  administrativeDivisionId?: string

  @ApiProperty({ description: '역사적 국가 ID', required: false })
  @IsString()
  @IsOptional()
  historicalCountryId?: string

  @ApiProperty({
    description: '관련 인물 목록',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        personId: { type: 'string' },
        role: { type: 'string' },
        note: { type: 'string' },
      },
    },
  })
  @IsOptional()
  relatedPersons?: Array<{
    personId: string
    role?: string
    note?: string
  }>

  @ApiProperty({
    description: '관련 사건 목록 (상위 사건 외)',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  relatedEventIds?: string[]

  @ApiProperty({
    description: '섹션 기반 내용 (제목과 내용이 포함된 섹션 배열)',
    required: false,
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections?: any

  @ApiProperty({
    description: '교전 세력 정보 (레거시 - JSON)',
    required: false,
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  belligerents?: any

  @ApiProperty({
    description: '피해 규모 정보 (레거시 - JSON)',
    required: false,
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  casualties?: any

  @ApiProperty({
    description: '군사적 상세 정보 (레거시 - JSON)',
    required: false,
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  militaryDetails?: any

  @ApiProperty({
    description: '교전세력 그래프 (레거시 - JSON)',
    required: false,
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  belligerentsGraph?: any

  @ApiProperty({
    description: '전쟁 비용',
    required: false,
  })
  @IsString()
  @IsOptional()
  warCost?: string

  @ApiProperty({
    description: '정규화된 군사 정보 (새로운 구조)',
    type: MilitaryEventDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => MilitaryEventDto)
  @IsOptional()
  militaryEvent?: MilitaryEventDto

  @ApiProperty({
    description: '회담/외교 이벤트 정보 (JSON)',
    required: false,
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conferenceEvent?: any
}

