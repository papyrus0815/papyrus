import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'

/**
 * 참여 인물 한 줄 고치기(행 단위 머지) — personId만 필수, 나머지는 3상:
 * 생략=유지 · null(또는 빈 문자열)=비움 · 값=설정. 목록·순서는 건드리지 않는다.
 */
export class RelatedPersonRowPatchDto {
  @ApiProperty({ description: '고칠 참여 인물 id(이 사건에 이미 걸린 인물)' })
  @IsString()
  personId!: string

  @ApiProperty({ description: '무엇을 했나 — 100자 이내', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(100)
  role?: string | null

  @ApiProperty({ description: '비고', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  note?: string | null

  @ApiProperty({ description: '참여 자격 현대국', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  countryId?: string | null

  @ApiProperty({ description: '참여 자격 역사국', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  historicalCountryId?: string | null

  @ApiProperty({ description: '진영(이 사건의 진영) — 명시 덮어쓰기', required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  sideId?: string | null
}
