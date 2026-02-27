import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator'
import { HistoricalStateType, Era, TransitionEventType } from '@prisma/client'

/**
 * 역사적 국가 생성 DTO
 */
export class CreateHistoricalCountryDto {
  /**
   * 국가명 (한글)
   * @example "조선"
   */
  @IsString()
  name!: string

  /**
   * 국가명 (영문, 선택)
   * @example "Joseon"
   */
  @IsOptional()
  @IsString()
  enName?: string

  /**
   * 설명
   * @example "조선은 1392년부터 1897년까지 존재한 한국의 왕조입니다."
   */
  @IsOptional()
  @IsString()
  description?: string

  /**
   * 썸네일 URL
   * @example "https://example.com/joseon.jpg"
   */
  @IsOptional()
  @IsString()
  thumbnailUrl?: string

  /**
   * 존속 시작 기원 (기원전/기원후)
   * @example "AD"
   */
  @IsOptional()
  @IsEnum(Era)
  startEra?: Era

  /**
   * 존속 시작 연도
   * @example 1392
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  startYear?: number

  /**
   * 존속 시작 월 (1~12)
   * @example 7
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number

  /**
   * 존속 시작 일 (1~31)
   * @example 17
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  startDay?: number

  /**
   * 존속 종료 기원 (기원전/기원후)
   * @example "AD"
   */
  @IsOptional()
  @IsEnum(Era)
  endEra?: Era

  /**
   * 존속 종료 연도
   * @example 1897
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  endYear?: number

  /**
   * 존속 종료 월 (1~12)
   * @example 10
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number

  /**
   * 존속 종료 일 (1~31)
   * @example 12
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  endDay?: number

  /**
   * 국가 형태
   * @example "KINGDOM"
   */
  @IsEnum(HistoricalStateType)
  stateType!: HistoricalStateType

  /**
   * 연결할 현대 국가 ID 목록 (선택, 여러 개 가능)
   * @example ["country-uuid-1", "country-uuid-2"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentModernCountryIds?: string[]

  /**
   * 상위 역사적 국가 ID 목록 (후임). 이 국가가 어떤 국가로 이어졌는지. 예: 고려 → 조선 시 고려가 [조선] 설정
   * @example ["historical-country-uuid-1"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentHistoricalCountryIds?: string[]

  /**
   * 상위(후임) 설정 시 변천 유형 (상위가 1개 이상일 때 사용)
   */
  @IsOptional()
  @IsEnum(TransitionEventType)
  transitionEventType?: TransitionEventType

  /**
   * 상위(후임) 설정 시 변천 날짜 (ISO date, 예: 1392-07-17)
   */
  @IsOptional()
  @IsString()
  transitionEventDate?: string
}
