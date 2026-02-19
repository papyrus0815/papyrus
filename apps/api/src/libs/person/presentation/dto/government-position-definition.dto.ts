import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator'
import { GovernmentPositionType } from '@prisma/client'

export class CreateGovernmentPositionDefinitionDto {
  @IsString()
  title!: string

  @IsOptional()
  @IsString()
  titleEn?: string | null

  @IsOptional()
  @IsString()
  titleLocal?: string | null

  @IsEnum(GovernmentPositionType)
  positionType!: GovernmentPositionType

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number | null

  @IsOptional()
  @IsString()
  departmentName?: string | null

  @IsOptional()
  @IsUUID()
  organizationId?: string | null

  @IsOptional()
  @IsUUID()
  countryId?: string | null

  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null

  @IsOptional()
  @IsDateString()
  establishedDate?: string | null

  @IsOptional()
  @IsDateString()
  abolishedDate?: string | null
}

export class UpdateGovernmentPositionDefinitionDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  titleEn?: string | null

  @IsOptional()
  @IsString()
  titleLocal?: string | null

  @IsOptional()
  @IsEnum(GovernmentPositionType)
  positionType?: GovernmentPositionType

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number | null

  @IsOptional()
  @IsString()
  departmentName?: string | null

  @IsOptional()
  @IsUUID()
  organizationId?: string | null

  @IsOptional()
  @IsUUID()
  countryId?: string | null

  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null

  @IsOptional()
  @IsDateString()
  establishedDate?: string | null

  @IsOptional()
  @IsDateString()
  abolishedDate?: string | null
}
