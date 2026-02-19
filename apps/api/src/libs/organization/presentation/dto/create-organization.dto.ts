import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator'
import { OrganizationType, OrganizationScope } from '@prisma/client'

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
  @IsUUID()
  headquartersCityId?: string | null

  @IsOptional()
  @IsUUID()
  countryId?: string | null

  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null
}
