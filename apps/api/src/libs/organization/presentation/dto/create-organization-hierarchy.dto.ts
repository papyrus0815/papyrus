import { IsString, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator'
import { OrganizationRelationType } from '@prisma/client'

export class CreateOrganizationHierarchyDto {
  @IsUUID()
  parentOrganizationId!: string

  @IsUUID()
  childOrganizationId!: string

  @IsEnum(OrganizationRelationType)
  relationType!: OrganizationRelationType

  @IsOptional()
  @IsDateString()
  startDate?: string | null

  @IsOptional()
  @IsDateString()
  endDate?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}
