import { HistoricalRelationType } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator'

export class CreateHistoricalCountryRelationDto {
  @IsUUID()
  subjectCountryId!: string

  @IsUUID()
  objectCountryId!: string

  @IsEnum(HistoricalRelationType)
  relationType!: HistoricalRelationType

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string
}

export class UpdateHistoricalCountryRelationDto {
  @IsOptional()
  @IsEnum(HistoricalRelationType)
  relationType?: HistoricalRelationType

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string
}

export interface HistoricalCountryRelationResponseDto {
  id: string
  subjectCountryId: string
  objectCountryId: string
  relationType: HistoricalRelationType
  startDate: string | null
  endDate: string | null
  subjectCountryName?: string
  objectCountryName?: string
  createdAt: string
  updatedAt: string
}
