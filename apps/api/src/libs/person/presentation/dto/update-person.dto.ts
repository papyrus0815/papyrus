import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, ValidateNested, IsIn, ValidateIf, IsArray, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { Era, DeathType, DateInfoDto, SpouseRelationDto, BiographySectionDto, CountryAffiliationDto } from './create-person.dto'

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
   * 이름 표시 순서: korean(성+이름), western(이름+성).
   * null이면 개인 설정 해제(국가 기본값으로 폴백 — 개인>국가>기본 우선순위)
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsIn(['korean', 'western'])
  nameDisplayOrder?: 'korean' | 'western' | null

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
   * 출생 정보 (객체 형식). null이면 출생일·출생 기원(birthDate·birthEra) 해제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @ValidateNested()
  @Type(() => DateInfoDto)
  birth?: DateInfoDto | null

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
   * 사망 정보 (객체 형식). null이면 사망일·사망 기원(deathDate·deathEra) 해제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @ValidateNested()
  @Type(() => DateInfoDto)
  death?: DateInfoDto | null

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
   * 사망 유형 (자연사, 병사, 암살 등)
   */
  @IsOptional()
  @IsEnum(DeathType)
  deathType?: DeathType

  /**
   * 사망 원인 상세 (예: "폐렴 합병증", "독살 의혹")
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  deathCause?: string | null

  /**
   * 사망 관련 메모 (맥락, 논란, 비고 등)
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  deathNote?: string | null

  /**
   * 생존 여부
   */
  @IsOptional()
  @IsBoolean()
  isAlive?: boolean

  /**
   * 역사적 영향력 (0–100)
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  influence?: number | null

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
   * 프로필 이미지 URL (선택). null이면 저장된 썸네일 삭제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  profileImageUrl?: string | null

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
   * 가문 ID (선택). null이면 해제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  dynastyId?: string | null

  /**
   * 종교 ID (선택). null이면 해제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  religionId?: string | null

  /**
   * 교파 ID (선택)
   */
  @IsOptional()
  @IsString()
  denominationId?: string

  /**
   * 아버지 ID (선택). null이면 해제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  fatherId?: string | null

  /**
   * 어머니 ID (선택). null이면 해제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  motherId?: string | null

  /**
   * 사생아·서출 여부 — 가계도 카드 별표(*) 마커.
   */
  @IsOptional()
  @IsBoolean()
  illegitimate?: boolean

  /**
   * 국가 ID (선택)
   */
  @IsOptional()
  @IsString()
  countryId?: string

  /**
   * 출생지 도시 ID (선택). null이면 해제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  birthCityId?: string | null

  /**
   * 사망지 도시 ID (선택). null이면 해제
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  deathCityId?: string | null

  /**
   * 출생지 행정구역 ID (선택) — 도시 없이 행정구역만 저장할 때
   */
  @IsOptional()
  @IsString()
  birthAdminDivisionId?: string

  /**
   * 사망지 행정구역 ID (선택) — 도시 없이 행정구역만 저장할 때
   */
  @IsOptional()
  @IsString()
  deathAdminDivisionId?: string

  /**
   * 출생지 직접 입력 텍스트 (역사적 지명 등)
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  birthPlaceText?: string | null

  /**
   * 사망지 직접 입력 텍스트 (역사적 지명 등)
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  deathPlaceText?: string | null

  /**
   * 배우자 관계 목록 (선택, 있으면 기존 삭제 후 일괄 반영)
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpouseRelationDto)
  spouseRelations?: SpouseRelationDto[]

  /**
   * 전기(생애 서술) 섹션 목록 (선택, 있으면 기존 삭제 후 일괄 반영)
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BiographySectionDto)
  sections?: BiographySectionDto[]

  /**
   * 국가 소속 목록 (선택, 있으면 주 국적 외 소속을 통째로 교체).
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountryAffiliationDto)
  countryAffiliations?: CountryAffiliationDto[]
}
