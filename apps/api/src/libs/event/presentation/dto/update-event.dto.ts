import { EVENT_DOMAIN_VALUES, type EventDomainValue } from '../../domain/event-domain'
import { EVENT_TYPE_VALUES, type EventTypeValue } from '../../domain/event-type'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ValidateIf,
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
import { EventCountryParticipantDto } from './event-country-participant.dto'
import { RelatedPersonRowPatchDto } from './related-person-row-patch.dto'

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
   * 사건 종류 전환. 묶음→단일은 하위가 하나도 없을 때만, 단일→묶음은 전개 단락이 없을 때만
   * (있으면 POST /events/:id/split 로 나눈다). 규칙은 domain/event-kind.ts.
   */
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
      '참여국 전체 목록 — undefined=손대지 않음, []=전부 제거. 줄 단위 필드는 3상(생략=유지/null=비움/값=설정). 주도국은 role=INITIATOR.',
    required: false,
    type: () => [EventCountryParticipantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventCountryParticipantDto)
  relatedCountries?: EventCountryParticipantDto[]

  @ApiProperty({
    description:
      '참여국 **행 단위 머지** — 나열된 줄(국가 키)의 보낸 필드만 고친다(3상). 목록·순서 무변경, 없는 줄이면 409. ' +
      '한 나라만 고칠 때 전체 목록을 보내면 다른 곳에서 그새 고친 값을 덮는다 — 이 길을 쓴다.',
    required: false,
    type: () => [EventCountryParticipantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventCountryParticipantDto)
  relatedCountriesPatch?: EventCountryParticipantDto[]

  @ApiProperty({
    description: '참여 인물 **행 단위 머지** — 나열된 인물의 보낸 필드만(3상). 목록·순서 무변경, 없는 인물이면 409.',
    required: false,
    type: () => [RelatedPersonRowPatchDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedPersonRowPatchDto)
  relatedPersonsPatch?: RelatedPersonRowPatchDto[]

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

