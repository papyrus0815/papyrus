import { Era } from '@prisma/client'
import { Country } from './country.entity'
import { LinkedHistoricalKind } from './linked-historical-classify'

export interface HistoricalCountrySimple {
  id: string
  name: string
  enName: string | null
  thumbnailUrl: string | null
  stateType: string
  startEra: Era | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endEra: Era | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  latitude: number | null
  longitude: number | null
  /**
   * 연결 기간 — 이 나라가 이 현대 국가의 땅에 있었던 기간(비면 존속 기간 전체).
   * 예) 중화민국: 중국 쪽 1912-01~1949-12, 대만 쪽 1945-10~. (domain/modern-link-period.ts)
   */
  linkStartEra?: Era | null
  linkStartYear?: number | null
  linkStartMonth?: number | null
  linkEndEra?: Era | null
  linkEndYear?: number | null
  linkEndMonth?: number | null
  /**
   * 표시용 관계 분류(전신/구성국/유산). 상세 조회 경로(findById)에서만 파생·채워지며,
   * 목록·피커 경로에서는 null. 표시 전용 — 스코프 합산과 무관.
   */
  linkKind?: LinkedHistoricalKind | null
}

export interface CountryRepository {
  findAll(accountId?: string): Promise<Country[]>
  findById(id: string, accountId?: string): Promise<Country | null>
  findByName(name: string, accountId?: string): Promise<Country | null>
  findHistoricalCountriesByModernCountryId(
    countryId: string,
  ): Promise<HistoricalCountrySimple[]>
  create(data: Omit<Country, 'id'>): Promise<Country>
  update(id: string, data: Partial<Omit<Country, 'id'>>): Promise<Country>
  delete(id: string): Promise<void>
}
