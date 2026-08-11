import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator'
import { GovernmentPositionType } from '@prisma/client'

export class CreateGovernmentPositionDefinitionDto {
  @IsString()
  title!: string

  @IsOptional()
  @IsString()
  titleEn?: string | null

  @IsOptional()
  @IsString()
  titleLocal?: string | null

  /** 직위 유형 — Prisma enum을 그대로 검증(문자열 오타가 그대로 저장되던 것 차단) */
  @IsEnum(GovernmentPositionType)
  positionType!: GovernmentPositionType

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number | null

  /** 군주·주권 칭호 여부 — true면 "관직 재임" 피커에서 제외(재위로 등록) */
  @IsOptional()
  @IsBoolean()
  isMonarchical?: boolean

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

/**
 * 관직 정의 적용 범위 생성 DTO.
 * 현대 국가·역사적 국가 중 적어도 하나는 있어야 한다(서비스에서 400으로 검증).
 * 스코프가 하나도 없는 정의 = 전역이라는 규칙이라, 이 DTO로 붙이는 순간 그 정의는
 * 다른 국가의 피커에서 사라진다.
 */
export class CreateGovernmentPositionDefinitionScopeDto {
  @IsOptional()
  @IsUUID()
  countryId?: string | null

  @IsOptional()
  @IsUUID()
  historicalCountryId?: string | null

  /** 그 나라에서의 현지 표기 (예: 쇼군 → 征夷大将軍) */
  @IsOptional()
  @IsString()
  localTitle?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
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
  @IsEnum(GovernmentPositionType)
  positionType?: GovernmentPositionType

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number | null

  /** 군주·주권 칭호 여부 — true면 "관직 재임" 피커에서 제외(재위로 등록) */
  @IsOptional()
  @IsBoolean()
  isMonarchical?: boolean

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
