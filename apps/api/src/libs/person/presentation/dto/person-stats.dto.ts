import { PersonTrait } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

const STAT_KEYS = [
  'politics',
  'military',
  'diplomacy',
  'intellect',
  'charisma',
  'administration',
] as const
export type StatKey = (typeof STAT_KEYS)[number]
export const PERSON_STAT_KEYS = STAT_KEYS

/**
 * 인물 능력치(6축) — 사용자별 평가.
 * 한 사용자는 한 인물당 한 세트만 가짐 (upsert 방식).
 * 각 차원은 0~100 정수, NULL = 미평가.
 */
export class UpsertPersonStatsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  politics?: number | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  military?: number | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  diplomacy?: number | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  intellect?: number | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  charisma?: number | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  administration?: number | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export interface PersonStatsResponseDto {
  id: string
  personId: string
  accountId: string
  politics: number | null
  military: number | null
  diplomacy: number | null
  intellect: number | null
  charisma: number | null
  administration: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 한 인물에 부착한 성격 태그(다중) — 전체 교체식 upsert.
 * 빈 배열을 보내면 모두 제거.
 */
export class UpsertPersonTraitsDto {
  @IsArray()
  @ArrayUnique(
    (item: { trait: PersonTrait }) => item.trait,
    { message: '같은 trait가 중복으로 들어있습니다.' },
  )
  items!: PersonTraitItemDto[]
}

export class PersonTraitItemDto {
  @IsEnum(PersonTrait)
  trait!: PersonTrait

  /** 강도 1~3, null/생략 = 미설정 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  intensity?: number | null

  @IsOptional()
  @IsString()
  note?: string | null
}

export interface PersonTraitAssignmentDto {
  id: string
  trait: PersonTrait
  intensity: number | null
  note: string | null
}

/**
 * 능력치 + 성격 태그 합본 upsert. 단일 트랜잭션으로 처리되어 부분 성공이 발생하지 않음.
 * - stats 생략 = 능력치 변경 없음 (기존 유지)
 * - traits 생략 = 태그 변경 없음 (기존 유지)
 * - 둘 다 생략 = no-op
 */
export class UpsertPersonEvaluationDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertPersonStatsDto)
  stats?: UpsertPersonStatsDto

  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertPersonTraitsDto)
  traits?: UpsertPersonTraitsDto
}

export interface PersonEvaluationResponseDto {
  stats: PersonStatsResponseDto | null
  traits: PersonTraitAssignmentDto[]
}
