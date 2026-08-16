import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsString,
  IsOptional,
  IsDateString,
  IsObject,
  ValidateNested,
  IsArray,
  IsIn,
} from 'class-validator'
import { MilitaryEventDto } from './military-event.dto'
import {
  ChildReasonEntryDto,
  HierarchyReasonEntryDto,
} from './hierarchy-reason.dto'

export class UpdateEventDto {
  @ApiProperty({ description: '사건명', required: false })
  @IsString()
  @IsOptional()
  title?: string

  @ApiProperty({ description: '개요 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ description: '시작일', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string

  @ApiProperty({ description: '시작일 정밀도: year(년만), month(년·월), day(년·월·일)', required: false, enum: ['year', 'month', 'day'] })
  @IsOptional()
  @IsString()
  @IsIn(['year', 'month', 'day'])
  startDatePrecision?: string

  @ApiProperty({ description: '종료일', required: false })
  @IsDateString()
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
    description: '키워드 (동일 사건 매핑용)',
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

  /**
   * 상위 사건 ID — **3상**: 키 없음(변경 안 함) / id(지정) / null(해제해 최상위로).
   *
   * 런타임은 원래부터 3상이었는데(event.service.ts의 `=== undefined` 가드) 계약이
   * `string`이라, 타입 안전한 '최상위로 올리기' 호출이 불가능했다 — 프론트가 캐스트로
   * 뚫거나 `|| undefined`로 접어 조용한 no-op을 만들고 있었다(검토 배치5).
   */
  @ApiProperty({
    description: '상위 사건 ID. null을 보내면 상위를 해제해 최상위 사건이 된다.',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  parentEventId?: string | null

  /**
   * 앵커 오버라이드 — **3상**이다: 키 없음(변경 안 함) / 'ANCHOR' / 'PLAIN' / null(자동으로 되돌림).
   * null을 계약에 넣어야 '지정 해제'가 타입 안전하게 표현된다.
   */
  @ApiProperty({
    description:
      "'최상위(앵커) 사건' 판정 오버라이드. null을 보내면 파생 자동 판정으로 되돌린다. " +
      '키를 생략하면 변경하지 않는다.',
    required: false,
    nullable: true,
    enum: ['ANCHOR', 'PLAIN'],
  })
  @IsIn(['ANCHOR', 'PLAIN', null])
  @IsOptional()
  anchorOverride?: 'ANCHOR' | 'PLAIN' | null

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

  @ApiProperty({ description: '교전세력 정보 (레거시)', required: false })
  @IsObject()
  @IsOptional()
  belligerents?: any

  @ApiProperty({ description: '피해 규모 (레거시)', required: false })
  @IsObject()
  @IsOptional()
  casualties?: any

  @ApiProperty({ description: '군사 세부정보 (레거시)', required: false })
  @IsObject()
  @IsOptional()
  militaryDetails?: any

  @ApiProperty({ description: '교전세력 그래프 (레거시)', required: false })
  @IsObject()
  @IsOptional()
  belligerentsGraph?: any

  @ApiProperty({ description: '전쟁 비용', required: false })
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
  conferenceEvent?: any

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
      'childEventIds와 동형의 전체목록 규약: undefined=변경 없음, []=전부 해제. ' +
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
      '이 사건이 자식인 쌍의 연결 사유(주 상위·추가 상위 대칭) — 부분 업서트 규약: ' +
      'undefined=변경 없음, 나열된 쌍만 터치. reason 문자열=업서트, null=행 삭제. ' +
      '연결되지 않은 상위(유효 쌍 밖)에 사유 업서트 시 400. 같은 상위 중복 제출 시 400.',
    required: false,
    type: [HierarchyReasonEntryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HierarchyReasonEntryDto)
  parentLinkReasons?: HierarchyReasonEntryDto[]

  @ApiProperty({
    description:
      '이 사건이 부모인 쌍(주 상위 FK 자식)의 연결 사유 — 부분 업서트 규약(위와 동일). ' +
      '하위 사건 상세를 부모 페이지에서 제자리 기입하는 보스니아 플로우용.',
    required: false,
    type: [ChildReasonEntryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChildReasonEntryDto)
  childLinkReasons?: ChildReasonEntryDto[]
}

