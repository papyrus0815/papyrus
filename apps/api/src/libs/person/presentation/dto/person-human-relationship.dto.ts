import { PersonHumanRelationshipType, PersonRelationshipTag } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator'

/**
 * 인물 간 인간관계 생성
 * - MENTOR: subjectIsMentor=true면 :personId가 스승, false면 :personId가 제자
 * - 그 외 유형: 두 인물 ID 중 작은 쪽이 from으로 저장됨
 *
 * 친밀도: -2(매우 적대) ~ +2(매우 우호). null/미전달 가능 (특히 MENTOR).
 */
export class CreatePersonHumanRelationshipDto {
  @IsUUID()
  relatedPersonId!: string

  @IsEnum(PersonHumanRelationshipType)
  relationshipType!: PersonHumanRelationshipType

  /** 친밀도 -2..+2, 미설정 가능 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-2)
  @Max(2)
  affinityLevel?: number | null

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsString()
  note?: string

  @ValidateIf((o) => o.relationshipType === PersonHumanRelationshipType.MENTOR)
  @IsOptional()
  subjectIsMentor?: boolean

  /** 세분화 태그 (FRIEND, RIVAL, LOVER 등). 빈 배열/생략 모두 허용 */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(PersonRelationshipTag, { each: true })
  tags?: PersonRelationshipTag[]

  /**
   * GENERAL 전용. true면 양쪽 합의된 대칭 관계(UUID 정규화 후 저장),
   * false면 :personId(주체) 시점의 관계로 저장. 미전달 시 false.
   */
  @IsOptional()
  @IsBoolean()
  isMutual?: boolean

  /** 근거 사건(연보) ID 목록 — 이 관계의 근거가 되는 PersonLifeEvent들 */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  sourceLifeEventIds?: string[]
}

export class UpdatePersonHumanRelationshipDto {
  @IsOptional()
  @IsEnum(PersonHumanRelationshipType)
  relationshipType?: PersonHumanRelationshipType

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-2)
  @Max(2)
  affinityLevel?: number | null

  @IsOptional()
  @IsString()
  startDate?: string | null

  @IsOptional()
  @IsString()
  endDate?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  /** MENTOR로 바꾸거나 MENTOR 유지 시 스승/제자 방향 */
  @IsOptional()
  subjectIsMentor?: boolean

  /** 세분화 태그 — 전달 시 전체 교체. 생략 시 변경 없음. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(PersonRelationshipTag, { each: true })
  tags?: PersonRelationshipTag[]

  /** 양쪽 합의된 대칭 관계 여부. 변경 시 from/to 정규화가 다시 계산됨. */
  @IsOptional()
  @IsBoolean()
  isMutual?: boolean

  /** 근거 사건 ID 목록 — 전달 시 전체 교체. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  sourceLifeEventIds?: string[]
}
