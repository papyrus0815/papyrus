import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator'

export const SIDE_UNIT_ROLES = ['MAIN_EFFORT', 'SUPPORTING', 'RESERVE', 'DEFENSE', 'OTHER'] as const
export type SideUnitRoleValue = (typeof SIDE_UNIT_ROLES)[number]

/** 진영에 부대 투입 — 부대는 미리 있거나 군사 부대 API로 막 만든 것 */
export class AddSideUnitDto {
  @ApiProperty({ description: '군사 부대 id' })
  @IsString()
  @IsNotEmpty()
  militaryUnitId!: string

  @ApiProperty({ required: false, nullable: true, description: '작전 당시 배속 상급 부대 id 오버라이드(선택)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  parentUnitId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '작전 당시 부대 지휘관 인물 id 오버라이드(선택)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  commanderId?: string | null

  @ApiProperty({ required: false, nullable: true, enum: SIDE_UNIT_ROLES, description: '주공·조공·예비·수비·기타' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(SIDE_UNIT_ROLES)
  role?: SideUnitRoleValue | null

  @ApiProperty({ required: false, nullable: true, description: '한 줄 메모' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  note?: string | null
}

/** 투입 줄 고치기 — 보낸 칸만 바꾼다 */
export class UpdateSideUnitDto {
  @ApiProperty({ required: false, nullable: true, description: '작전 당시 배속 상급 부대 id 오버라이드(선택)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  parentUnitId?: string | null

  @ApiProperty({ required: false, nullable: true, description: '작전 당시 부대 지휘관 인물 id 오버라이드(선택)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  commanderId?: string | null

  @ApiProperty({ required: false, nullable: true, enum: SIDE_UNIT_ROLES })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(SIDE_UNIT_ROLES)
  role?: SideUnitRoleValue | null

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  note?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}
