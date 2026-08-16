import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsArray,
  IsIn,
} from 'class-validator'
import { MilitaryEventDto } from './military-event.dto'
import { HierarchyReasonEntryDto } from './hierarchy-reason.dto'

export class CreateEventDto {
  @ApiProperty({ description: '사건명' })
  @IsString()
  @IsNotEmpty()
  title!: string

  @ApiProperty({ description: '개요 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ description: '시작일 (ISO. BC는 음수 연도 "-0221-01-01" 형태 허용)', required: false })
  @IsString()
  @IsOptional()
  startDate?: string

  @ApiProperty({ description: '시작일 정밀도: year(년만), month(년·월), day(년·월·일)', required: false, enum: ['year', 'month', 'day'] })
  @IsOptional()
  @IsString()
  @IsIn(['year', 'month', 'day'])
  startDatePrecision?: string

  @ApiProperty({ description: '종료일 (ISO. BC는 음수 연도 "-0221-01-01" 형태 허용)', required: false })
  @IsString()
  @IsOptional()
  endDate?: string

  @ApiProperty({ description: '종료일 정밀도: year(년만), month(년·월), day(년·월·일)', required: false, enum: ['year', 'month', 'day'] })
  @IsOptional()
  @IsString()
  @IsIn(['year', 'month', 'day'])
  endDatePrecision?: string

  @ApiProperty({ description: '위치 (자유 텍스트)', required: false })
  @IsString()
  @IsOptional()
  location?: string

  @ApiProperty({
    description: '키워드 (동일 사건 매핑용, 추후 검색/매칭에 사용)',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[]

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

  @ApiProperty({
    description: '상위 사건 ID. 미지정·null이면 최상위 사건으로 생성된다.',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  parentEventId?: string | null

  @ApiProperty({
    description:
      "'최상위(앵커) 사건' 판정 오버라이드. 미지정이면 파생 판정(자손 ≥ 1). " +
      "ANCHOR = 자손 0이어도 앵커, PLAIN = 자손이 있어도 앵커 제외.",
    required: false,
    enum: ['ANCHOR', 'PLAIN'],
  })
  @IsIn(['ANCHOR', 'PLAIN'])
  @IsOptional()
  anchorOverride?: 'ANCHOR' | 'PLAIN'

  @ApiProperty({
    description: '이미지 목록',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string' },
        caption: { type: 'string' },
        source: { type: 'string' },
        order: { type: 'number' },
        isPrimary: { type: 'boolean' },
      },
    },
  })
  @IsOptional()
  eventImages?: Array<{
    imageUrl: string
    caption?: string
    source?: string
    order?: number
    isPrimary?: boolean
  }>

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
    description: '관련 현대 국가 ID 목록',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  relatedCountryIds?: string[]

  @ApiProperty({
    description: '관련 역사적 국가 ID 목록',
    required: false,
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  relatedHistoricalCountryIds?: string[]

  @ApiProperty({
    description:
      '메인(주도) 현대 국가 ID — 이 사건의 대표 국가. 저장 시 EventCountryRelation.role=INITIATOR로 마킹되어 Timeline 국가/대륙 모드의 lane 배치에 사용됨.',
    required: false,
  })
  @IsOptional()
  primaryCountryId?: string

  @ApiProperty({
    description: '메인(주도) 역사적 국가 ID — 위와 동일 의미, 역사적 국가용',
    required: false,
  })
  @IsOptional()
  primaryHistoricalCountryId?: string

  @ApiProperty({
    description: '섹션 목록',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        order: { type: 'number' },
        sectionType: { type: 'string' },
      },
    },
  })
  @IsOptional()
  eventSections?: Array<{
    title: string
    content: string
    order?: number
    sectionType?: string
  }>

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

  @ApiProperty({
    description: '하위 사건 목록 (기본 정보만 - 빠른 등록용)',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '사건명' },
        startDate: { type: 'string', description: '시작일' },
        endDate: { type: 'string', description: '종료일' },
        description: { type: 'string', description: '간단한 설명' },
        location: { type: 'string', description: '위치' },
        thumbnail: { type: 'string', description: '썸네일 이미지 URL' },
      },
    },
  })
  @IsOptional()
  childEvents?: Array<{
    title: string
    startDate?: string
    endDate?: string
    description?: string
    location?: string
        images?: Array<{ imageUrl: string; isPrimary?: boolean }>
  }>

  @ApiProperty({
    description: '하위 사건 ID 목록 (기존 사건을 하위로 연결)',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  childEventIds?: string[]

  @ApiProperty({
    description:
      '추가 상위 사건 ID 목록 — 주 상위(parentEventId) 외 다중 상위(EventParentLink 엣지). ' +
      '주 상위가 있을 때만 허용(INV-2)·주 상위와 중복 금지(INV-1)·자기참조 금지(INV-3), 위반 시 409.',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extraParentEventIds?: string[]

  @ApiProperty({
    description:
      '생성과 동시에 기입하는 연결 사유(이 사건=자식) — 유효 쌍은 이번 요청으로 연결되는 ' +
      '주 상위(parentEventId)·추가 상위(extraParentEventIds)뿐. 연결되지 않은 상위에 ' +
      '사유 업서트 시 400, 같은 상위 중복 제출 시 400. 신설 사건엔 지울 행이 없어 ' +
      'reason null/공백 항목은 no-op. childLinkReasons(이 사건=부모)는 생성 범위 외 — ' +
      '자식 연결 사유는 자식 쪽 편집(PUT parentLinkReasons)으로 단일화된 규약이라 받지 않는다.',
    required: false,
    type: [HierarchyReasonEntryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HierarchyReasonEntryDto)
  parentLinkReasons?: HierarchyReasonEntryDto[]
}

