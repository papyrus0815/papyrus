import { IsOptional, IsEnum, IsUUID } from 'class-validator'
import { OrganizationType } from '@prisma/client'

export class ListOrganizationsQueryDto {
  @IsOptional()
  @IsUUID()
  countryId?: string

  @IsOptional()
  @IsUUID()
  historicalCountryId?: string

  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType
}
