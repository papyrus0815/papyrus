import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator'
import { HistoricalStateType, Era, TransitionEventType, HistoricalEntityKind, TransitionScope } from '@prisma/client'

/**
 * 역사적 국가 수정 DTO
 */
export class UpdateHistoricalCountryDto {
  /**
   * 국가명 (한글)
   * @example "조선"
   */
  @IsOptional()
  @IsString()
  name?: string

  /**
   * 국가명 (영문). null이면 비움
   * @example "Joseon"
   */
  @IsOptional()
  @IsString()
  enName?: string | null

  /**
   * 국가명 유래 (어원·명칭 유래 설명)
   */
  @IsOptional()
  @IsString()
  nameOrigin?: string | null

  /**
   * 설명
   * @example "조선은 1392년부터 1897년까지 존재한 한국의 왕조입니다."
   */
  @IsOptional()
  @IsString()
  description?: string | null

  /**
   * 역사 서술 (자유 텍스트, 마크다운)
   */
  @IsOptional()
  @IsString()
  history?: string | null

  /**
   * 썸네일 URL
   * @example "https://example.com/joseon.jpg"
   */
  @IsOptional()
  @IsString()
  thumbnailUrl?: string | null

  /**
   * 존속 시작 기원 (기원전/기원후)
   * @example "AD"
   */
  @IsOptional()
  @IsEnum(Era)
  startEra?: Era | null

  /**
   * 존속 시작 연도
   * @example 1392
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  startYear?: number | null

  /**
   * 존속 시작 월 (1~12)
   * @example 7
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number | null

  /**
   * 존속 시작 일 (1~31)
   * @example 17
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  startDay?: number | null

  /**
   * 존속 종료 기원 (기원전/기원후)
   * @example "AD"
   */
  @IsOptional()
  @IsEnum(Era)
  endEra?: Era | null

  /**
   * 존속 종료 연도
   * @example 1897
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  endYear?: number | null

  /**
   * 존속 종료 월 (1~12)
   * @example 10
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number | null

  /**
   * 존속 종료 일 (1~31)
   * @example 12
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  endDay?: number | null

  /**
   * 국가 형태
   * @example "KINGDOM"
   */
  @IsOptional()
  @IsEnum(HistoricalStateType)
  stateType?: HistoricalStateType

  /**
   * 정치체 성격: 주권 국가(STATE) / 정권(REGIME) / 시대(PERIOD)
   */
  @IsOptional()
  @IsEnum(HistoricalEntityKind)
  entityKind?: HistoricalEntityKind | null

  /**
   * 연결할 현대 국가 ID 목록 (선택, 여러 개 가능)
   * @example ["country-uuid-1", "country-uuid-2"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentModernCountryIds?: string[]

  /**
   * 상위 역사적 국가 ID 목록 (후임). 이 국가가 어떤 국가로 이어졌는지.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentHistoricalCountryIds?: string[]

  @IsOptional()
  @IsEnum(TransitionEventType)
  transitionEventType?: TransitionEventType

  @IsOptional()
  @IsEnum(TransitionScope)
  transitionScope?: TransitionScope | null
}
