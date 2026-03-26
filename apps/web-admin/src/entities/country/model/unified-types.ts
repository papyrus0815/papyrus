/**
 * 통합 국가 타입 (현대 + 역사)
 */

import type { Country } from '../api'
import type { HistoricalCountry } from '@/entities/historical-country/api'

/**
 * 국가 타입 구분
 */
export type CountryType = 'modern' | 'historical'

/**
 * 통합 국가 엔티티
 * 현대 국가와 역사적 국가를 하나의 인터페이스로 표현
 */
export interface UnifiedCountry {
  id: string
  name: string
  type: CountryType

  // 공통 필드
  thumbnailUrl?: string | null

  // 현대 국가 전용 필드
  fullName?: string | null
  localName?: string | null
  isoCode?: string | null
  flagEmoji?: string | null
  capital?: string | null
  population?: string | null
  areaSqKm?: number | null
  continentId?: string | null
  latitude?: number | null
  longitude?: number | null
  /** 인물 이름 표시 순서 (현대 국가) */
  defaultNameDisplayOrder?: 'korean' | 'western' | null

  // 역사적 국가 목록 (현대 국가에만 존재)
  historicalCountries?: HistoricalCountry[]

  // 역사적 국가 전용 필드
  enName?: string | null
  description?: string | null
  stateType?: string
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  endEra?: string | null
}

/**
 * 현대 국가를 통합 타입으로 변환
 */
export function modernToUnified(country: Country): UnifiedCountry {
  return {
    id: country.id,
    name: country.name,
    type: 'modern',
    fullName: (country as any).fullName ?? undefined,
    localName: country.localName,
    isoCode: country.isoCode,
    flagEmoji: country.flagEmoji,
    capital: country.capital,
    population: country.population,
    areaSqKm: country.areaSqKm,
    thumbnailUrl: country.thumbnailUrl,
    continentId: country.continentId,
    latitude: country.latitude,
    longitude: country.longitude,
    historicalCountries: country.historicalCountries,
    defaultNameDisplayOrder:
      (country as { defaultNameDisplayOrder?: 'korean' | 'western' | null })
        .defaultNameDisplayOrder ?? null,
  }
}

/**
 * 역사적 국가를 통합 타입으로 변환
 */
export function historicalToUnified(
  country: HistoricalCountry,
): UnifiedCountry {
  return {
    id: country.id,
    name: country.name,
    type: 'historical',
    enName: country.enName,
    description: country.description,
    thumbnailUrl: country.thumbnailUrl,
    stateType: country.stateType,
    startYear: country.startYear,
    startMonth: country.startMonth,
    startDay: country.startDay,
    startEra: country.startEra,
    endYear: country.endYear,
    endMonth: country.endMonth,
    endDay: country.endDay,
    endEra: country.endEra,
    latitude: country.latitude,
    longitude: country.longitude,
  }
}

/**
 * 국가 타입 필터 옵션
 */
export type CountryTypeFilter = 'all' | 'modern' | 'historical'

/**
 * 국가 타입 필터 레이블
 */
export const COUNTRY_TYPE_LABELS: Record<CountryTypeFilter, string> = {
  all: '전체',
  modern: '현대',
  historical: '과거',
}
