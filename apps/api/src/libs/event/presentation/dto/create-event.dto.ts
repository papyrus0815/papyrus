import type { CalendarSystemValue } from '../../domain/event.entity'
import { EVENT_DOMAIN_VALUES, type EventDomainValue } from '../../domain/event-domain'
import { EVENT_TYPE_VALUES, type EventTypeValue } from '../../domain/event-type'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ValidateIf,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsArray,
  IsIn,
  MaxLength,
} from 'class-validator'
import { MilitaryEventDto } from './military-event.dto'
import { HierarchyReasonEntryDto } from './hierarchy-reason.dto'
import { EventCountryParticipantDto } from './event-country-participant.dto'

export class CreateEventDto {
  @ApiProperty({ description: '사건명' })
  @IsString()
  @IsNotEmpty()
  title!: string

  @ApiProperty({ description: '원어 사건명 — 당대·현지 이름(Siebenjähriger Krieg · 壬辰倭亂). null·빈 문자열=비움', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(300)
  originalTitle?: string | null

  @ApiProperty({ description: '시작일 원 역법 — 구조화 날짜는 그레고리력 환산값', required: false, nullable: true, enum: ['GREGORIAN', 'JULIAN', 'KOREAN_LUNAR', 'CHINESE_LUNAR', 'JAPANESE_LUNAR', 'ISLAMIC', 'OTHER'] })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['GREGORIAN', 'JULIAN', 'KOREAN_LUNAR', 'CHINESE_LUNAR', 'JAPANESE_LUNAR', 'ISLAMIC', 'OTHER'])
  startCalendar?: CalendarSystemValue | null

  @ApiProperty({ description: "시작일 원문 표기 — '선조 25년 4월 13일'", required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100)
  startDateOriginal?: string | null

  @ApiProperty({ description: '종료일 원 역법', required: false, nullable: true, enum: ['GREGORIAN', 'JULIAN', 'KOREAN_LUNAR', 'CHINESE_LUNAR', 'JAPANESE_LUNAR', 'ISLAMIC', 'OTHER'] })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['GREGORIAN', 'JULIAN', 'KOREAN_LUNAR', 'CHINESE_LUNAR', 'JAPANESE_LUNAR', 'ISLAMIC', 'OTHER'])
  endCalendar?: CalendarSystemValue | null

  @ApiProperty({ description: '종료일 원문 표기', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100)
  endDateOriginal?: string | null

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

  @ApiProperty({
    description: '분야 — 무엇에 관한 일인가(POLITICS 정치·DIPLOMACY 외교·MILITARY 군사·ECONOMY 경제…). 2단계는 type(세부 분야)',
    required: false,
    enum: EVENT_DOMAIN_VALUES,
  })
  @IsIn(EVENT_DOMAIN_VALUES)
  // 분야는 필수 칸이라 null로 비울 수 없다 — 생략(undefined)만 '변경 없음/기본값'. IsOptional은 null도 통과시켜
  // DB NOT NULL에서 500이 났다.
  @ValidateIf((_dto, value) => value !== undefined)
  domain?: EventDomainValue

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
      '사건 종류 — SINGLE(단일: 하위 없음, 본문에 전개까지) / COLLECTION(묶음: 전개=하위 사건, ' +
      '본문은 배경·여파만). 생략하면 SINGLE. 단일→묶음 전환은 POST /events/:id/split.',
    required: false,
    enum: ['SINGLE', 'COLLECTION'],
  })
  @IsIn(['SINGLE', 'COLLECTION'])
  @IsOptional()
  kind?: 'SINGLE' | 'COLLECTION'

  @ApiProperty({
    description:
      '세부 분야(선택) — 분야의 2단계(BATTLE 전투·LAW_POLICY 법령·TREATY 조약…). 분야(domain)와 독립된 축이라 ' +
      '어떤 분야와도 짝지을 수 있고, 붙는 기록을 정한다(프론트 레지스트리). null이면 세부 없음.',
    required: false,
    nullable: true,
    enum: EVENT_TYPE_VALUES,
  })
  @IsIn(EVENT_TYPE_VALUES)
  @IsOptional()
  type?: EventTypeValue | null

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
        countryId: {
          type: 'string',
          nullable: true,
          description: '참여 자격 현대국(생략=유지·새 줄은 인물 국적으로 추론 / null=비움)',
        },
        historicalCountryId: {
          type: 'string',
          nullable: true,
          description: '참여 자격 역사국(생략=유지·새 줄은 인물 국적으로 추론 / null=비움)',
        },
      },
    },
  })
  @IsOptional()
  relatedPersons?: Array<{
    personId: string
    role?: string
    note?: string
    /** 참여 자격 현대국 — 생략=유지(새 줄은 추론) / null=비움 */
    countryId?: string | null
    /** 참여 자격 역사국 — 생략=유지(새 줄은 추론) / null=비움 */
    historicalCountryId?: string | null
    /** 진영(D1) — 생략=유지 / null=해제 */
    sideId?: string | null
  }>

  @ApiProperty({
    description:
      '참여국 — 현대·역사 국가를 한 배열에 섞어 담는다. 배열 순서가 표시 순서이고, 주도국은 role=INITIATOR로 표현한다.',
    required: false,
    type: () => [EventCountryParticipantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventCountryParticipantDto)
  relatedCountries?: EventCountryParticipantDto[]

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
    /** 기존 단락 id — 주면 그 단락을 고친다(id 유지). 없으면 새 단락 */
    id?: string
    /** 이 단락이 서술하는 하위 사건(D2) — 생략=유지, null=해제 */
    subjectEventId?: string | null
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

