import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
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
} from '@prisma/client'

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
}
