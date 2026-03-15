import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator'

export class CreateGovernmentPositionDefinitionDto {
  @IsString()
  title!: string

  @IsOptional()
  @IsString()
  titleEn?: string | null

  @IsOptional()
  @IsString()
  titleLocal?: string | null

  @IsString()
  positionType!: string // GovernmentPositionType enum

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number | null

  /** 중앙부처 카테고리 연결 (관리자 등록 직위) */
  @IsOptional()
  @IsUUID()
  categoryId?: string | null

  /** 행정기구 연결 (사용자 등록 직위) */
  @IsOptional()
  @IsUUID()
  organizationId?: string | null

  @IsOptional()
  @IsDateString()
  establishedDate?: string | null

  @IsOptional()
  @IsDateString()
  abolishedDate?: string | null
}

export class UpdateGovernmentPositionDefinitionDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  titleEn?: string | null

  @IsOptional()
  @IsString()
  titleLocal?: string | null

  @IsOptional()
  @IsString()
  positionType?: string

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number | null

  /** 중앙부처 카테고리 연결 (관리자 등록 직위) */
  @IsOptional()
  @IsUUID()
  categoryId?: string | null

  /** 행정기구 연결 (사용자 등록 직위) */
  @IsOptional()
  @IsUUID()
  organizationId?: string | null

  @IsOptional()
  @IsDateString()
  establishedDate?: string | null

  @IsOptional()
  @IsDateString()
  abolishedDate?: string | null
}
