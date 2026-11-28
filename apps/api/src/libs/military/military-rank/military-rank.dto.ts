import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'

export const MILITARY_RANK_CATEGORIES = [
  'MARSHAL',
  'GENERAL',
  'FIELD_OFFICER',
  'COMPANY_OFFICER',
  'WARRANT_OFFICER',
  'NCO',
  'ENLISTED',
  'TRADITIONAL',
] as const

export type MilitaryRankCategoryDto = (typeof MILITARY_RANK_CATEGORIES)[number]

export const MILITARY_BRANCH_VALUES = [
  'ARMY',
  'NAVY',
  'AIR_FORCE',
  'MARINE_CORPS',
  'COAST_GUARD',
  'SPACE_FORCE',
  'JOINT',
  'OTHER',
] as const

export type MilitaryBranchDto = (typeof MILITARY_BRANCH_VALUES)[number]

export interface MilitaryRankResponseDto {
  id: string
  name: string
  nameLocal: string | null
  nameEn: string | null
  abbreviation: string | null
  category: MilitaryRankCategoryDto
  rankOrder: number
  natoCode: string | null
  branch: MilitaryBranchDto | null
  countryId: string | null
  historicalCountryId: string | null
  insigniaUrl: string | null
  description: string | null
  isUniversal: boolean
  country?: { id: string; name: string; flagEmoji?: string | null } | null
  historicalCountry?: { id: string; name: string } | null
}

export class CreateMilitaryRankDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(150)
  nameLocal?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(150)
  nameEn?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(40)
  abbreviation?: string | null

  @IsOptional()
  @IsIn(MILITARY_RANK_CATEGORIES as unknown as string[])
  category?: MilitaryRankCategoryDto

  @IsOptional()
  @IsInt()
  @Min(1)
  rankOrder?: number

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(20)
  natoCode?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsIn(MILITARY_BRANCH_VALUES as unknown as string[])
  branch?: MilitaryBranchDto | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  countryId?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  historicalCountryId?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(500)
  insigniaUrl?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  description?: string | null
}

export class UpdateMilitaryRankDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(150)
  nameLocal?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(150)
  nameEn?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(40)
  abbreviation?: string | null

  @IsOptional()
  @IsIn(MILITARY_RANK_CATEGORIES as unknown as string[])
  category?: MilitaryRankCategoryDto

  @IsOptional()
  @IsInt()
  @Min(1)
  rankOrder?: number

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(20)
  natoCode?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsIn(MILITARY_BRANCH_VALUES as unknown as string[])
  branch?: MilitaryBranchDto | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  countryId?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  historicalCountryId?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  @MaxLength(500)
  insigniaUrl?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  description?: string | null
}

export interface PersonPromotionResponseDto {
  id: string
  personId: string
  militaryRankId: string
  countryId: string | null
  historicalCountryId: string | null
  branch: MilitaryBranchDto | null
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  day: number | null
  precision: string | null
  isPosthumous: boolean
  isBrevet: boolean
  note: string | null
  militaryRank: MilitaryRankResponseDto
}

export class CreatePersonPromotionDto {
  @IsString()
  @IsNotEmpty()
  personId!: string

  @IsString()
  @IsNotEmpty()
  militaryRankId!: string

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  countryId?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  historicalCountryId?: string | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsIn(MILITARY_BRANCH_VALUES as unknown as string[])
  branch?: MilitaryBranchDto | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsIn(['BC', 'AD'])
  era?: 'BC' | 'AD' | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsInt()
  @Min(1)
  year?: number | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsInt()
  month?: number | null

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsInt()
  day?: number | null

  @IsOptional()
  @IsBoolean()
  isPosthumous?: boolean

  @IsOptional()
  @IsBoolean()
  isBrevet?: boolean

  @IsOptional()
  @ValidateIf((_o: unknown, v: unknown) => v != null)
  @IsString()
  note?: string | null
}
