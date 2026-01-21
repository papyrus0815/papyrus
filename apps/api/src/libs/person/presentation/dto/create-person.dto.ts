import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * 기원 열거형
 */
export enum Era {
  BC = 'BC',
  AD = 'AD',
}

/**
 * 별명 DTO
 */
export class NicknameDto {
  @IsString()
  nickname!: string

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsNumber()
  priority?: number
}

/**
 * 프로필 이미지 DTO
 */
export class ProfileImageDto {
  @IsString()
  url!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsNumber()
  priority?: number
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
   * 중간 이름 (Middle Name)
   * @example "Fitzgerald"
   */
  @IsOptional()
  @IsString()
  middleName?: string

  /**
   * 성 (선택)
   * @example "이"
   */
  @IsOptional()
  @IsString()
  surname?: string

  /**
   * 원어 이름 (Original Name)
   * @example "Franklin D. Roosevelt"
   */
  @IsOptional()
  @IsString()
  originalName?: string

  /**
   * 별명/호/필명 목록
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NicknameDto)
  nicknames?: NicknameDto[]

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
   * 출생일 미상 여부
   */
  @IsOptional()
  @IsBoolean()
  isBirthDateUnknown?: boolean

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
   * 사망일 미상 여부
   */
  @IsOptional()
  @IsBoolean()
  isDeathDateUnknown?: boolean

  /**
   * 생존 여부
   */
  @IsOptional()
  @IsBoolean()
  isAlive?: boolean

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
   * 메인 프로필 이미지 URL (선택)
   */
  @IsOptional()
  @IsString()
  profileImageUrl?: string

  /**
   * 프로필 이미지 목록
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileImageDto)
  profileImages?: ProfileImageDto[]

  /**
   * 이벤트 목록에 생몰년 표시 여부
   */
  @IsOptional()
  @IsBoolean()
  showLifespanOnEventList?: boolean

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
   * 직업 ID (선택) - @deprecated Career 테이블 사용 권장
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
