import { HistoricalCountry } from './historical-country.entity'
import { HistoricalStateType, Era } from '@prisma/client'

/**
 * 역사적 국가 생성 데이터
 */
export interface CreateHistoricalCountryData {
  name: string
  enName?: string
  description?: string
  thumbnailUrl?: string
  startEra?: Era
  startYear?: number
  startMonth?: number
  startDay?: number
  endEra?: Era
  endYear?: number
  endMonth?: number
  endDay?: number
  stateType: HistoricalStateType
  parentModernCountryIds?: string[] // 현대 국가 ID 배열
}

/**
 * 역사적 국가 수정 데이터
 */
export interface UpdateHistoricalCountryData {
  name?: string
  enName?: string
  description?: string | null
  thumbnailUrl?: string | null
  startEra?: Era | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: Era | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  stateType?: HistoricalStateType
  parentModernCountryIds?: string[] // 현대 국가 ID 배열
}

/**
 * 역사적 국가 Repository 인터페이스
 */
export interface IHistoricalCountryRepository {
  /**
   * 모든 역사적 국가 조회
   */
  findAll(): Promise<HistoricalCountry[]>

  /**
   * ID로 역사적 국가 조회
   */
  findById(id: string): Promise<HistoricalCountry | null>

  /**
   * 역사적 국가에 연결된 현대 국가 ID 목록 조회
   */
  findModernCountryIdsByHistoricalCountryId(id: string): Promise<string[]>

  /**
   * 역사적 국가 생성
   */
  create(data: CreateHistoricalCountryData): Promise<HistoricalCountry>

  /**
   * 역사적 국가 수정
   */
  update(
    id: string,
    data: UpdateHistoricalCountryData,
  ): Promise<HistoricalCountry>

  /**
   * 역사적 국가 삭제
   */
  delete(id: string): Promise<void>
}
