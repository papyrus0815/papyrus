import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  Max,
  Min,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import {
  PartyMembershipLeadershipTier,
  PartyMembershipRoleCategory,
  PartyOfficeKind,
} from '@prisma/client'

import type { StructuredDateInput } from '../../domain/party-structured-date.util'

export class UpdatePartyMembershipDto {
  @ApiPropertyOptional({ description: '정당 ID' })
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsNotEmpty()
  @IsUUID()
  partyId?: string

  @ApiPropertyOptional({
    nullable: true,
    description: '소속 시작일 (ISO 8601 날짜 문자열)',
  })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined)
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  startDate?: string | null

  @ApiPropertyOptional({
    nullable: true,
    description: '소속 종료일 (ISO 8601 날짜 문자열)',
  })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined)
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  endDate?: string | null

  @ApiPropertyOptional({
    enum: PartyMembershipRoleCategory,
    description: '역할 분류 (null 불가)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsNotEmpty({ message: 'roleCategory는 null일 수 없습니다' })
  @IsEnum(PartyMembershipRoleCategory)
  roleCategory?: PartyMembershipRoleCategory | null

  @ApiPropertyOptional({
    enum: PartyMembershipLeadershipTier,
    nullable: true,
    description: '지도부일 때 위계 (null로 비움 가능)',
  })
  @IsOptional()
  @IsEnum(PartyMembershipLeadershipTier)
  leadershipTier?: PartyMembershipLeadershipTier | null

  @ApiPropertyOptional({
    nullable: true,
    description: '직함·세부 (최대 120자)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(120)
  roleTitle?: string | null

  @ApiPropertyOptional({ nullable: true, description: '메모' })
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(65535)
  notes?: string | null

  @ApiPropertyOptional({
    nullable: true,
    description: '구조화 시작일 { era: BC|AD, year, month?, day? } — 있으면 startDate(ISO)보다 우선. 기원전·연도만 수용',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsObject()
  start?: StructuredDateInput | null

  @ApiPropertyOptional({ nullable: true, description: '구조화 종료일 — start와 같은 모양' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsObject()
  end?: StructuredDateInput | null

  @ApiPropertyOptional({
    enum: PartyOfficeKind,
    nullable: true,
    description: '당직 종류 — 지도부(LEADERSHIP)일 때만 저장(당수·서기장·원내대표…)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsEnum(PartyOfficeKind)
  officeKind?: PartyOfficeKind | null

  @ApiPropertyOptional({ nullable: true, description: '제N대 — 당직 대수(1 이상)' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  @Max(9999)
  officeOrdinal?: number | null

  @ApiPropertyOptional({ description: '창당 발기인' })
  @IsOptional()
  @IsBoolean()
  isFounder?: boolean
}
