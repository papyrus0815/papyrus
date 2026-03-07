import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, ValidateNested, IsIn, ValidateIf, IsArray } from 'class-validator'
import { Type } from 'class-transformer'
import { Era, DateInfoDto, SpouseRelationDto } from './create-person.dto'

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
   * 중간 이름 (선택)
   */
  @IsOptional()
  @IsString()
  middleName?: string

  /**
   * 성 (선택)
   */
  @IsOptional()
  @IsString()
  surname?: string

  /**
   * 이름 표시 순서: korean(성+이름), western(이름+성)
   */
  @IsOptional()
  @IsIn(['korean', 'western'])
  nameDisplayOrder?: 'korean' | 'western'

  /**
   * 원어 이름 (선택). null이면 저장된 값 삭제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  originalName?: string | null

  /**
   * 성의 뜻 (선택). null이면 저장된 값 삭제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  surnameMeaning?: string | null

  /**
   * 이름의 뜻 (선택). null이면 저장된 값 삭제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  nameMeaning?: string | null

  /**
   * 중간이름의 뜻 (선택). null이면 저장된 값 삭제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  middleNameMeaning?: string | null

  /**
   * 출생 정보 (객체 형식)
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DateInfoDto)
  birth?: DateInfoDto

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
   * 출생일 미상 여부
   */
  @IsOptional()
  @IsBoolean()
  isBirthDateUnknown?: boolean

  /**
   * 사망 정보 (객체 형식)
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DateInfoDto)
  death?: DateInfoDto

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
   * 이벤트 목록에 생몰년 표시 여부
   */
  @IsOptional()
  @IsBoolean()
  showLifespanOnEventList?: boolean

  //--- 왕/군주 관련 필드
  /**
   * 왕호/재위명
   */
  @IsOptional()
  @IsString()
  regnalName?: string

  /**
   * 묘호 (동아시아 군주)
   */
  @IsOptional()
  @IsString()
  templeName?: string

  /**
   * 시호
   */
  @IsOptional()
  @IsString()
  posthumousName?: string

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

  /**
   * 출생지 도시 ID (선택)
   */
  @IsOptional()
  @IsString()
  birthCityId?: string

  /**
   * 사망지 도시 ID (선택)
   */
  @IsOptional()
  @IsString()
  deathCityId?: string

  /**
   * 배우자 관계 목록 (선택, 있으면 기존 삭제 후 일괄 반영)
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpouseRelationDto)
  spouseRelations?: SpouseRelationDto[]
}
