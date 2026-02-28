import { HistoricalMembershipRole } from '@prisma/client'
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator'

export class CreateHistoricalCountryMembershipDto {
  @IsUUID()
  historicalCountryId!: string

  @IsUUID()
  memberCountryId!: string

  @IsEnum(HistoricalMembershipRole)
  role!: HistoricalMembershipRole

  @IsOptional()
  @IsBoolean()
  isLeadingMember?: boolean

  @IsOptional()
  @IsDateString()
  membershipStartDate?: string

  @IsOptional()
  @IsDateString()
  membershipEndDate?: string
}

export class UpdateHistoricalCountryMembershipDto {
  @IsOptional()
  @IsEnum(HistoricalMembershipRole)
  role?: HistoricalMembershipRole

  @IsOptional()
  @IsBoolean()
  isLeadingMember?: boolean

  @IsOptional()
  @IsDateString()
  membershipStartDate?: string

  @IsOptional()
  @IsDateString()
  membershipEndDate?: string
}

export interface HistoricalCountryMembershipResponseDto {
  id: string
  historicalCountryId: string
  memberCountryId: string
  role: HistoricalMembershipRole
  isLeadingMember: boolean | null
  membershipStartDate: string | null
  membershipEndDate: string | null
  parentName?: string
  memberName?: string
  createdAt: string
  updatedAt: string
}
