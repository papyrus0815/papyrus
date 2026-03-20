import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

/** 조약 유형 (Prisma TreatyType 과 동일) */
export const TREATY_TYPE_VALUES = [
  'NON_AGGRESSION',
  'ALLIANCE',
  'TRADE',
  'TERRITORIAL',
  'PEACE',
  'FRIENDSHIP',
  'DISARMAMENT',
  'BORDER',
  'SECRET',
  'MULTILATERAL',
  'OTHER',
] as const

export type TreatyTypeValue = (typeof TREATY_TYPE_VALUES)[number]

export const TREATY_PARTICIPATION_VALUES = [
  'SIGNATORY',
  'GUARANTOR',
  'MEDIATOR',
  'RATIFIER',
  'OBSERVER',
] as const

export type TreatyParticipationTypeValue = (typeof TREATY_PARTICIPATION_VALUES)[number]

/** 서명국 입력 (조약 생성 시 treatyId 없음) */
export class CreateTreatySignatoryNestedDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  countryId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  historicalCountryId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  personId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  cabinetId?: string | null

  @IsOptional()
  @IsString()
  role?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  positionDefinitionId?: string | null

  @IsOptional()
  @IsIn(TREATY_PARTICIPATION_VALUES)
  participationType?: TreatyParticipationTypeValue

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  signedAt?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}

export class CreateTreatyBodyDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  alias?: string | null

  @IsIn(TREATY_TYPE_VALUES)
  type!: TreatyTypeValue

  @IsDateString()
  signDate!: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  effectiveDate?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  expiryDate?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  violationDate?: string | null

  @IsOptional()
  @IsString()
  violationReason?: string | null

  @IsOptional()
  @IsString()
  location?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  signingAdministrativeDivisionId?: string | null

  @IsOptional()
  @IsString()
  summary?: string | null

  @IsOptional()
  @IsString()
  background?: string | null

  @IsOptional()
  @IsString()
  aftermath?: string | null

  /** 있으면 트랜잭션으로 조약 + 서명국 일괄 생성 */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreatySignatoryNestedDto)
  signatories?: CreateTreatySignatoryNestedDto[]

  /** true면 동일 이름+서명일(일 단위) 중복 검사를 건너뜀 (기본: 중복 시 400) */
  @IsOptional()
  @IsBoolean()
  allowDuplicateSignDate?: boolean
}

export class UpdateTreatyBodyDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  alias?: string | null

  @IsOptional()
  @IsIn(TREATY_TYPE_VALUES)
  type?: TreatyTypeValue

  @IsOptional()
  @IsDateString()
  signDate?: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  effectiveDate?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  expiryDate?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  violationDate?: string | null

  @IsOptional()
  @IsString()
  violationReason?: string | null

  @IsOptional()
  @IsString()
  location?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  signingAdministrativeDivisionId?: string | null

  @IsOptional()
  @IsString()
  summary?: string | null

  @IsOptional()
  @IsString()
  background?: string | null

  @IsOptional()
  @IsString()
  aftermath?: string | null
}

export class CreateTreatySignatoryBodyDto {
  @IsString()
  treatyId!: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  countryId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  historicalCountryId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  personId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  cabinetId?: string | null

  @IsOptional()
  @IsString()
  role?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  positionDefinitionId?: string | null

  @IsOptional()
  @IsIn(TREATY_PARTICIPATION_VALUES)
  participationType?: TreatyParticipationTypeValue

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  signedAt?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}

export class UpdateTreatySignatoryBodyDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  countryId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  historicalCountryId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  personId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  cabinetId?: string | null

  @IsOptional()
  @IsString()
  role?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  positionDefinitionId?: string | null

  @IsOptional()
  @IsIn(TREATY_PARTICIPATION_VALUES)
  participationType?: TreatyParticipationTypeValue

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  signedAt?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}

export class CreateTreatyTermBodyDto {
  @IsString()
  treatyId!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number

  @IsOptional()
  @IsString()
  title?: string | null

  @IsString()
  @IsNotEmpty()
  content!: string

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean
}

export class UpdateTreatyTermBodyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number

  @IsOptional()
  @IsString()
  title?: string | null

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean
}

export class AddTreatyImageBodyDto {
  @IsString()
  treatyId!: string

  @IsString()
  @IsNotEmpty()
  imageUrl!: string

  @IsOptional()
  @IsString()
  caption?: string | null

  @IsOptional()
  @IsString()
  source?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}

/** GET /treaties 쿼리 */
export class FindTreatiesQueryDto {
  @IsOptional()
  @IsString()
  countryId?: string

  @IsOptional()
  @IsString()
  historicalCountryId?: string

  @IsOptional()
  @IsString()
  cabinetId?: string

  @IsOptional()
  @IsIn(TREATY_TYPE_VALUES)
  type?: TreatyTypeValue

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  skip?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  take?: number
}
