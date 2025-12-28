import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator'

/**
 * 기원 열거형
 */
export enum Era {
  BC = 'BC',
  AD = 'AD',
}

/**
 * 인물 생성 DTO
 */
export class CreatePersonDto {
  /**
   * 이름
   * @example "세종"
   */
  @IsString()
  name!: string

  /**
   * 성 (선택)
   * @example "이"
   */
  @IsOptional()
  @IsString()
  surname?: string

  /**
   * 출생 기원 (BC/AD)
   * @example "AD"
   */
  @IsOptional()
  @IsEnum(Era)
  birthEra?: Era

  /**
   * 출생일 (선택)
   * @example "1397-05-15"
   */
  @IsOptional()
  @IsDateString()
  birthDate?: string

  /**
   * 사망 기원 (BC/AD)
   * @example "AD"
   */
  @IsOptional()
  @IsEnum(Era)
  deathEra?: Era

  /**
   * 사망일 (선택)
   * @example "1450-02-17"
   */
  @IsOptional()
  @IsDateString()
  deathDate?: string

  /**
   * 성별 (선택)
   * @example "남"
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
