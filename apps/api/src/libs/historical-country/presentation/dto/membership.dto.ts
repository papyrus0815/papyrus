import { HistoricalMembershipRole } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsUUID, ValidateIf, ValidateNested } from 'class-validator'

import type { StructuredPoint } from '../../../shared/structured-point'
import { StructuredPointDto } from '../../../shared/structured-point.dto'

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

  /** 소속 시작 — 구조화(BC·연 정밀도 가능). 주면 아래 레거시 ISO보다 우선. null=비움 */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => StructuredPointDto)
  start?: StructuredPointDto | null

  /** 소속 종료 — 구조화. null=비움 */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => StructuredPointDto)
  end?: StructuredPointDto | null

  /** @deprecated 레거시 ISO 날짜 — start를 쓸 것 */
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

  /** 소속 시작 — 구조화(BC·연 정밀도 가능). 주면 아래 레거시 ISO보다 우선. null=비움 */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => StructuredPointDto)
  start?: StructuredPointDto | null

  /** 소속 종료 — 구조화. null=비움 */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => StructuredPointDto)
  end?: StructuredPointDto | null

  /** @deprecated 레거시 ISO 날짜 — start를 쓸 것 */
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
  /** 소속 시작·종료 — 구조화가 진실 */
  start: StructuredPoint | null
  end: StructuredPoint | null
  /** 하위 호환 — AD 1000+ 완전 날짜일 때만 값이 있다 */
  membershipStartDate: string | null
  membershipEndDate: string | null
  parentName?: string
  memberName?: string
  createdAt: string
  updatedAt: string
}
