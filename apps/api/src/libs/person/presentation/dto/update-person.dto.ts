import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator'
import { Era } from './create-person.dto'

/**
 * 인물 수정 DTO
 */
export class UpdatePersonDto {
  /**
   * 이름 (선택)
   */
  @IsOptional()
  @IsString()
  name?: string

  /**
   * 성 (선택)
   */
  @IsOptional()
  @IsString()
  surname?: string

  /**
   * 출생 기원 (BC/AD)
   */
  @IsOptional()
  @IsEnum(Era)
  birthEra?: Era

  /**
   * 출생일 (선택)
   */
  @IsOptional()
  @IsDateString()
  birthDate?: string

  /**
   * 사망 기원 (BC/AD)
   */
  @IsOptional()
  @IsEnum(Era)
  deathEra?: Era

  /**
   * 사망일 (선택)
   */
  @IsOptional()
  @IsDateString()
  deathDate?: string

  /**
   * 성별 (선택)
   */
  @IsOptional()
  @IsString()
  gender?: string

  /**
   * 생애 소개 (선택)
   */
  @IsOptional()
  @IsString()
  biography?: string

  /**
   * 프로필 이미지 URL (선택)
   */
  @IsOptional()
  @IsString()
  profileImageUrl?: string

  /**
   * 가문 ID (선택)
   */
  @IsOptional()
  @IsString()
  dynastyId?: string

  /**
   * 종교 ID (선택)
   */
  @IsOptional()
  @IsString()
  religionId?: string

  /**
   * 교파 ID (선택)
   */
  @IsOptional()
  @IsString()
  denominationId?: string

  /**
   * 아버지 ID (선택)
   */
  @IsOptional()
  @IsString()
  fatherId?: string

  /**
   * 어머니 ID (선택)
   */
  @IsOptional()
  @IsString()
  motherId?: string

  /**
   * 직업 ID (선택)
   */
  @IsOptional()
  @IsString()
  jobId?: string

  /**
   * 국가 ID (선택)
   */
  @IsOptional()
  @IsString()
  countryId?: string
}
