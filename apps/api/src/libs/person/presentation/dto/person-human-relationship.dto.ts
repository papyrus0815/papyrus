import { PersonHumanRelationshipType } from '@prisma/client'
import { Type } from 'class-transformer'
import {
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
 */
export class CreatePersonHumanRelationshipDto {
  @IsUUID()
  relatedPersonId!: string

  @IsEnum(PersonHumanRelationshipType)
  relationshipType!: PersonHumanRelationshipType

  /** 친밀도 1~5 */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  affinityLevel!: number

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
}

export class UpdatePersonHumanRelationshipDto {
  @IsOptional()
  @IsEnum(PersonHumanRelationshipType)
  relationshipType?: PersonHumanRelationshipType

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  affinityLevel?: number

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
}
