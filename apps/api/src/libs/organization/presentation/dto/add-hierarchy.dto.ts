import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator'
import { OrganizationRelationType } from '@prisma/client'

export class AddHierarchyDto {
  @IsUUID()
  parentOrganizationId!: string

  @IsUUID()
  childOrganizationId!: string

  @IsEnum(OrganizationRelationType)
  relationType!: OrganizationRelationType

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  notes?: string
}
