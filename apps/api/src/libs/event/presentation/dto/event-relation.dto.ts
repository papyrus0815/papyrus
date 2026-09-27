import { ApiProperty } from '@nestjs/swagger'
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator'

/**
 * 관련 사건(EventRelation) — 상위/하위(계보 소속)와 별개인 '별개 사건끼리의 연결'.
 *
 * 한 쌍에 한 행. 방향이 있는 유형(LED_TO·INFLUENCED·RESPONSE_TO)은 저장 행의
 * eventId → relatedEventId 방향으로 읽고, 반대편 사건에서는 역방향 문구로 보여 준다.
 * API는 '지금 보고 있는 사건' 기준의 direction(outgoing|incoming)으로 주고받아,
 * 호출자가 저장 행의 어느 쪽에 서 있는지 몰라도 되게 한다.
 */

/** Prisma EventRelationType과 같은 값(프론트 라벨 표는 shared/api 래퍼가 소유) */
export const EVENT_RELATION_TYPES = [
  'LED_TO',
  'INFLUENCED',
  'RESPONSE_TO',
  'CONCURRENT',
  'RELATED',
] as const
export type EventRelationTypeValue = (typeof EVENT_RELATION_TYPES)[number]

/** 방향 — 지금 사건이 관계의 출발점이면 outgoing(예: '계기가 됨'), 도착점이면 incoming */
export const EVENT_RELATION_DIRECTIONS = ['outgoing', 'incoming'] as const
export type EventRelationDirection = (typeof EVENT_RELATION_DIRECTIONS)[number]

/** 관계 설명 최대 길이 — 계층 연결 사유(EVENT_LINK_REASON_MAX)와 같은 한두 문장 기준 */
export const EVENT_RELATION_DESCRIPTION_MAX = 500

export class CreateEventRelationDto {
  @ApiProperty({ description: '연결할 상대 사건 ID' })
  @IsString()
  @IsNotEmpty()
  relatedEventId!: string

  @ApiProperty({ enum: EVENT_RELATION_TYPES, description: '관계 유형' })
  @IsEnum(EVENT_RELATION_TYPES)
  relationType!: EventRelationTypeValue

  @ApiProperty({
    enum: EVENT_RELATION_DIRECTIONS,
    required: false,
    description:
      '지금 사건 기준 방향 — outgoing(기본): 이 사건 → 상대, incoming: 상대 → 이 사건. 무방향 유형에선 무시된다.',
  })
  @IsOptional()
  @IsIn(EVENT_RELATION_DIRECTIONS)
  direction?: EventRelationDirection

  @ApiProperty({ required: false, nullable: true, description: '관계 설명(한두 문장)' })
  @IsOptional()
  @ValidateIf((dto: CreateEventRelationDto) => dto.description !== null)
  @IsString()
  @MaxLength(EVENT_RELATION_DESCRIPTION_MAX)
  description?: string | null
}

/** 3상 규약 — undefined=그대로, null=비움, 값=설정 */
export class UpdateEventRelationDto {
  @ApiProperty({ enum: EVENT_RELATION_TYPES, required: false })
  @IsOptional()
  @IsEnum(EVENT_RELATION_TYPES)
  relationType?: EventRelationTypeValue

  @ApiProperty({
    enum: EVENT_RELATION_DIRECTIONS,
    required: false,
    description: '지금 사건 기준 방향 — 바꾸면 저장 행의 양 끝을 뒤집는다',
  })
  @IsOptional()
  @IsIn(EVENT_RELATION_DIRECTIONS)
  direction?: EventRelationDirection

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((dto: UpdateEventRelationDto) => dto.description !== null)
  @IsString()
  @MaxLength(EVENT_RELATION_DESCRIPTION_MAX)
  description?: string | null
}

/** 관계 상대 사건 요약 — 목록 한 줄에 필요한 것만 */
export class EventRelationCounterpartDto {
  @ApiProperty() id!: string
  @ApiProperty() title!: string
  @ApiProperty({ nullable: true, enum: ['BC', 'AD'] }) startEra!: 'BC' | 'AD' | null
  @ApiProperty({ nullable: true }) startYear!: number | null
  @ApiProperty({ nullable: true }) startMonth!: number | null
  @ApiProperty({ nullable: true }) startDay!: number | null
  @ApiProperty({ nullable: true, description: 'ISO — AD 1000년 이후만' }) startDate!: string | null
  @ApiProperty({
    nullable: true,
    description: "날짜 정밀도('year'|'month'|'day') — 연도만 아는 사건의 월·일(1·1)을 표시하지 않게",
  })
  startDatePrecision!: string | null
  @ApiProperty({ nullable: true }) categoryName!: string | null
}

export class EventRelationItemDto {
  @ApiProperty() id!: string
  @ApiProperty({ enum: EVENT_RELATION_TYPES }) relationType!: EventRelationTypeValue
  @ApiProperty({
    enum: EVENT_RELATION_DIRECTIONS,
    description: '지금 사건 기준 방향(무방향 유형도 저장 행 기준으로 채워진다)',
  })
  direction!: EventRelationDirection
  @ApiProperty({ nullable: true }) description!: string | null
  @ApiProperty({ type: EventRelationCounterpartDto }) event!: EventRelationCounterpartDto
  @ApiProperty() createdAt!: string
}
