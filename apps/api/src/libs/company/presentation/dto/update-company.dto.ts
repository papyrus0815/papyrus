import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
  ValidateIf,
} from 'class-validator'
import {
  COMPANY_STATUS_VALUES,
  type CompanyStatusValue,
} from './company.response'
import {
  CompanyAnalystRatingInputDto,
  CompanyCategoryInputDto,
  CompanyFacilityInputDto,
  CompanyHistoryInputDto,
  CompanyOutlookInputDto,
  CompanyProductInputDto,
  CompanyStockPointInputDto,
} from './company-children.dto'

/**
 * 기업 수정 DTO (class — GlobalValidationPipe가 forbidNonWhitelisted로 검증).
 * 모든 속성에 데코가 있어야 한다(없으면 전송 시 400). 명칭·상태·국가·날짜 등 공유필드는
 * 서비스가 정본 Organization으로 라우팅하고, facilities/histories/categories는 Company-side
 * 자식으로 전체배열 delete-and-recreate된다(undefined면 해당 자식 미변경).
 */
export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  shortName?: string | null

  @IsOptional()
  @IsString()
  localName?: string | null

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsIn(COMPANY_STATUS_VALUES)
  status?: CompanyStatusValue | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsDateString()
  foundedAt?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsDateString()
  dissolvedAt?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  // 스킴 검증 — javascript:/data: 등이 <a href>로 렌더되는 stored XSS 차단(http(s)만 허용).
  @Matches(/^https?:\/\//i, {
    message: 'websiteUrl must start with http:// or https://',
  })
  websiteUrl?: string | null

  @IsOptional()
  @IsString()
  logoUrl?: string | null

  /** 자유 확장 — 데코 없으면 forbidNonWhitelisted가 거부하므로 @IsOptional 필수.
      임의 스칼라/거대 문자열 적재를 막아 객체만 허용(mass-assignment 완화). */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsObject()
  extra?: unknown

  /** 재무·주가 분석 코멘터리(리치텍스트 HTML) */
  @IsOptional()
  @IsString()
  financialCommentary?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  founderId?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  countryId?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  historicalCountryId?: string | null

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  headquartersCityId?: string | null

  /** (수정 시 무시) 다리는 생성 시 고정 — 전송돼도 400 방지 위해 허용만. */
  @IsOptional()
  @IsString()
  organizationId?: string | null

  //--- 자식 엔티티 (전체배열 교체; 생략 시 미변경)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyFacilityInputDto)
  facilities?: CompanyFacilityInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyHistoryInputDto)
  histories?: CompanyHistoryInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyCategoryInputDto)
  categories?: CompanyCategoryInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyProductInputDto)
  products?: CompanyProductInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyStockPointInputDto)
  stockPoints?: CompanyStockPointInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyAnalystRatingInputDto)
  analystRatings?: CompanyAnalystRatingInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyOutlookInputDto)
  outlooks?: CompanyOutlookInputDto[]
}
