import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsIn,
  ValidateIf,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  OrganizationType,
  OrganizationScope,
  OrganizationCountryRole,
} from '@prisma/client'

export class CreateOrganizationMemberDto {
  @IsUUID()
  personId!: string

  @IsOptional()
  @IsString()
  roleTitle?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class OrganizationMembershipStatusPhaseDto {
  @IsEnum(OrganizationCountryRole)
  role!: OrganizationCountryRole

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  startEra?: 'BC' | 'AD' | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  startYear?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  endEra?: 'BC' | 'AD' | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  endYear?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  notes?: string | null
}

export class CreateOrganizationCountryMembershipDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  countryId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  historicalCountryId?: string | null

  @IsOptional()
  @IsEnum(OrganizationCountryRole)
  role?: OrganizationCountryRole

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  startEra?: 'BC' | 'AD' | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  startYear?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  startDay?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  endEra?: 'BC' | 'AD' | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  endYear?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  endDay?: number | null

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsString()
  notes?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationMembershipStatusPhaseDto)
  statusHistory?: OrganizationMembershipStatusPhaseDto[] | null
}

export class UpdateOrganizationCountryMembershipDto {
  @IsOptional()
  @IsEnum(OrganizationCountryRole)
  role?: OrganizationCountryRole

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  startEra?: 'BC' | 'AD' | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  startYear?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  startDay?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['BC', 'AD'])
  endEra?: 'BC' | 'AD' | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  endYear?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(31)
  endDay?: number | null

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsString()
  notes?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationMembershipStatusPhaseDto)
  statusHistory?: OrganizationMembershipStatusPhaseDto[] | null
}

export class CreateOrganizationDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  shortName?: string | null

  @IsOptional()
  @IsString()
  localName?: string | null

  @IsEnum(OrganizationType)
  type!: OrganizationType

  @IsOptional()
  @IsEnum(OrganizationScope)
  scope?: OrganizationScope | null

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsDateString()
  foundedDate?: string | null

  @IsOptional()
  @IsDateString()
  dissolvedDate?: string | null

  @IsOptional()
  @IsString()
  websiteUrl?: string | null

  @IsOptional()
  @IsString()
  logoUrl?: string | null

  @IsOptional()
  @IsString()
  ideology?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  headquartersCityId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUUID()
  predecessorOrganizationId?: string | null

  @IsOptional()
  @IsUUID()
  countryId?: string | null

  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrganizationMemberDto)
  members?: CreateOrganizationMemberDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrganizationCountryMembershipDto)
  countryMemberships?: CreateOrganizationCountryMembershipDto[]
}
