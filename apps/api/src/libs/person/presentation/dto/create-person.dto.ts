import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsArray, ValidateNested, IsNumber, IsIn, ValidateIf, IsInt, Min, Max, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * 배우자 관계 DTO (인물 생성/수정 시)
 */
export class SpouseRelationDto {
  @IsString()
  spouseId!: string

  @IsOptional()
  @IsDateString()
  marriageStartDate?: string

  @IsOptional()
  @IsDateString()
  marriageEndDate?: string

  @IsOptional()
  @IsString()
  note?: string
}

/**
 * 전기(생애 서술) 섹션 DTO (인물 생성/수정 시).
 * EventSection 패턴 미러 — 저장 시 sections 배열을 통째로 delete-and-recreate.
 */
export class BiographySectionDto {
  @IsString()
  title!: string

  @IsString()
  content!: string

  @IsOptional()
  @IsNumber()
  order?: number

  @IsOptional()
  @IsString()
  sectionType?: string
}

/**
 * 국가 소속 유형 (Prisma PersonCountryAffiliationType 미러)
 */
export enum CountryAffiliationType {
  BIRTH_PLACE = 'BIRTH_PLACE',
  CITIZENSHIP = 'CITIZENSHIP',
  PRIMARY_RESIDENCE = 'PRIMARY_RESIDENCE',
  SERVED = 'SERVED',
  EXILE = 'EXILE',
  OTHER = 'OTHER',
}

/**
 * 국가 소속 DTO (인물 생성/수정 시).
 * 주 국적(countryId)과 별개로 출생지·복무·망명·이중국적 등 다중 소속을 표현.
 * 저장 시 (주 국적 priority 0 CITIZENSHIP 제외) 기존 소속을 통째로 delete-and-recreate.
 * countryId·historicalCountryId 중 하나는 채워야 함.
 */
export class CountryAffiliationDto {
  @IsEnum(CountryAffiliationType)
  affiliationType!: CountryAffiliationType

  @IsOptional()
  @IsString()
  countryId?: string

  @IsOptional()
  @IsString()
  historicalCountryId?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  /** 우선순위 (낮을수록 우선, 0은 주 국적 슬롯이라 추가 소속은 1 이상 권장) */
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number

  @IsOptional()
  @IsString()
  note?: string
}

/**
 * 기원 열거형
 */
export enum Era {
  BC = 'BC',
  AD = 'AD',
}

/**
 * 사망 유형 열거형
 */
export enum DeathType {
  NATURAL = 'NATURAL',
  ILLNESS = 'ILLNESS',
  ASSASSINATION = 'ASSASSINATION',
  EXECUTION = 'EXECUTION',
  BATTLE = 'BATTLE',
  ACCIDENT = 'ACCIDENT',
  SUICIDE = 'SUICIDE',
  UNKNOWN = 'UNKNOWN',
  OTHER = 'OTHER',
}

/**
 * 날짜 정보 DTO
 */
export class DateInfoDto {
  @IsEnum(Era)
  era!: Era

  @IsNumber()
  year!: number

  @IsOptional()
  @IsNumber()
  month?: number

  @IsOptional()
  @IsNumber()
  day?: number
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
   * 이름 표시 순서: korean(성+이름), western(이름+성).
   * null·미지정이면 개인 설정을 저장하지 않음(국가 기본값 폴백 — 개인>국가>기본 우선순위)
   * @example "western"
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsIn(['korean', 'western'])
  nameDisplayOrder?: 'korean' | 'western' | null

  /**
   * 원어 이름 (Original Name). null 가능 (빈값 저장 시)
   * @example "Franklin D. Roosevelt"
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  originalName?: string | null

  /**
   * 성의 뜻 (예: 金 = 쇠 금). null 가능
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  surnameMeaning?: string | null

  /**
   * 이름의 뜻 (예: 承 = 이을 승, 煐 = 빛날 영). null 가능
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  nameMeaning?: string | null

  /**
   * 중간이름의 뜻. null 가능
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
   * 출생 기원 (BC/AD) - 단순 필드
   * @example "AD"
   */
  @IsOptional()
  @IsEnum(Era)
  birthEra?: Era

  /**
   * 출생일 (선택) - ISO 날짜 문자열
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
   * 출생 관련 메모 (탄생 설화·유복자·조산 등 맥락). deathNote의 출생 대칭.
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  birthNote?: string | null

  /**
   * 사망 정보 (객체 형식)
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DateInfoDto)
  death?: DateInfoDto

  /**
   * 사망 기원 (BC/AD) - 단순 필드
   * @example "AD"
   */
  @IsOptional()
  @IsEnum(Era)
  deathEra?: Era

  /**
   * 사망일 (선택) - ISO 날짜 문자열
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
  @MaxLength(300) // DB death_cause VarChar(300) — 초과 시 Prisma 500 대신 400으로 거른다
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
  influence?: number

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
   * 별칭 목록 (아명·출생명·자·아호·필명 등). type으로 성격 구분.
   * 저장 시 통째로 delete-and-recreate.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NicknameDto)
  nicknames?: NicknameDto[]

  /**
   * 이벤트 목록에 생몰년 표시 여부
   */
  @IsOptional()
  @IsBoolean()
  showLifespanOnEventList?: boolean

  //--- 왕/군주 관련 필드
  /**
   * 왕호/재위명 (예: Louis, Henry, 선덕)
   * @example "Louis"
   */
  @IsOptional()
  @IsString()
  regnalName?: string

  /**
   * 묘호 (동아시아 군주, 예: 세종, 태종, 고종)
   * @example "세종"
   */
  @IsOptional()
  @IsString()
  templeName?: string

  /**
   * 시호 (예: 문종, 무열왕, 효종)
   * @example "세종장헌영문예무인성명효대왕"
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
   * 사생아·서출 여부 — 가계도 카드 별표(*) 마커. 기본 false.
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
   * 출생지 도시 ID (선택) — 등록된 도시(City)
   */
  @IsOptional()
  @IsString()
  birthCityId?: string

  /**
   * 사망지 도시 ID (선택) — 등록된 도시(City)
   */
  @IsOptional()
  @IsString()
  deathCityId?: string

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
   * 출생지 텍스트 (선택) — 역사적 지명 등 직접 입력값
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  @MaxLength(255) // DB birth_place_text VarChar(255)
  birthPlaceText?: string | null

  /**
   * 사망지 텍스트 (선택) — 역사적 지명 등 직접 입력값
   */
  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  @MaxLength(255) // DB death_place_text VarChar(255)
  deathPlaceText?: string | null

  /**
   * 배우자 관계 목록 (선택)
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
   * 국가 소속 목록 (선택, 있으면 주 국적 외 소속을 통째로 반영).
   * 주 국적(countryId)과 별개의 출생지·복무·망명·이중국적 등.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountryAffiliationDto)
  countryAffiliations?: CountryAffiliationDto[]
}
