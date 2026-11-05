import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { DateInfoDto, MarriageEndReason, MarriageRank } from './create-person.dto'

export type FamilyLinkKind =
  | 'father'
  | 'mother'
  | 'adoptiveFather'
  | 'adoptiveMother'
  | 'spouse'
  | 'child'
  | 'sibling'

export type SiblingLineageKind = 'FULL' | 'PATERNAL_HALF' | 'MATERNAL_HALF' | 'ADOPTIVE'

/**
 * 가족 관계 단건 연결(Link) 도메인 명령 DTO.
 * `PUT /persons/:id` 전체 배열 교체나 클라이언트 측 타 인물 FK 직접 변이를 대체하는 원자적 Use-Case DTO.
 */
export class LinkPersonFamilyDto {
  @IsIn([
    'father',
    'mother',
    'adoptiveFather',
    'adoptiveMother',
    'spouse',
    'child',
    'sibling',
  ])
  kind!: FamilyLinkKind

  @IsString()
  targetId!: string

  /** spouse 전용: 혼인 서열/형태 */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsEnum(MarriageRank)
  marriageRank?: MarriageRank | null

  /** spouse 전용: 혼인 종료/해소 사유 */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsEnum(MarriageEndReason)
  marriageEndReason?: MarriageEndReason | null

  /** spouse 전용: 서열 귀속 배우자 ID (생략 시 targetId로 자동 설정) */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  rankHolderId?: string | null

  /** spouse 전용: 혼인 시작일 */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @ValidateNested()
  @Type(() => DateInfoDto)
  marriageStart?: DateInfoDto | null

  /** spouse 전용: 혼인 종료일 */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @ValidateNested()
  @Type(() => DateInfoDto)
  marriageEnd?: DateInfoDto | null

  /** spouse 전용: 혼인 관계 비고/메모 */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  note?: string | null

  /** child 전용: 반대편 부모(배우자) ID 동시 지정 */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  otherParentId?: string | null

  /** child 전용: 양자/양녀(출계·입양)로 연결할지 여부 (기본 false = 친생) */
  @IsOptional()
  @IsBoolean()
  isAdoptive?: boolean

  /** child 전용: 출생 서열 (전체 통합 1-base) */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsInt()
  @Min(1)
  birthOrder?: number | null

  /** child 전용: 성별 내 출생 서열 (아들끼리/딸끼리 1-base, 예: 3남 = 3) */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsInt()
  @Min(1)
  genderBirthOrder?: number | null

  /** sibling 전용: 친형제(FULL) / 이복형제(PATERNAL_HALF) / 이부형제(MATERNAL_HALF) / 입양형제(ADOPTIVE). 기본 FULL */
  @IsOptional()
  @IsIn(['FULL', 'PATERNAL_HALF', 'MATERNAL_HALF', 'ADOPTIVE'])
  siblingLineage?: SiblingLineageKind

  /** 부모 슬롯이 모호할 때(성별 미지정 인물의 자녀 추가 시) 명시적 슬롯 지정 */
  @IsOptional()
  @IsIn(['fatherId', 'motherId', 'adoptiveFatherId', 'adoptiveMotherId'])
  explicitParentSlot?: 'fatherId' | 'motherId' | 'adoptiveFatherId' | 'adoptiveMotherId'

  /** 프론트엔드 간소 슬롯 지정 ('father' | 'mother') */
  @IsOptional()
  @IsIn(['father', 'mother'])
  parentSlot?: 'father' | 'mother'
}

/**
 * 배우자 단건 부분 수정(PATCH) DTO — 전체 배열 재전송 없이 특정 배우자 관계만 원자적 갱신
 */
export class UpdatePersonSpouseRelationDto {
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsEnum(MarriageRank)
  marriageRank?: MarriageRank | null

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsEnum(MarriageEndReason)
  marriageEndReason?: MarriageEndReason | null

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  rankHolderId?: string | null

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @ValidateNested()
  @Type(() => DateInfoDto)
  marriageStart?: DateInfoDto | null

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @ValidateNested()
  @Type(() => DateInfoDto)
  marriageEnd?: DateInfoDto | null

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  note?: string | null
}

/**
 * 자녀 가족 메타(출생 서열·성별 서열·소생 부모·서출 여부) 단건 원자적 수정 DTO
 */
export class UpdatePersonChildMetaDto {
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsInt()
  @Min(1)
  birthOrder?: number | null

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsInt()
  @Min(1)
  genderBirthOrder?: number | null

  @IsOptional()
  @IsBoolean()
  illegitimate?: boolean

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  otherParentId?: string | null
}
