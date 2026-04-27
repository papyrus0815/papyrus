/**
 * 카탈로그가 의존하는 참조 데이터 일괄 로드:
 * - 사건 카테고리 (DB)
 * - 현대 국가 / 역사적 국가
 *
 * 마운트 1회만 fetch. 실패 시 빈 배열로 안전하게 폴백.
 */
import { useEffect, useState } from 'react'

import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import {
  type EventCategoryDto,
  getAllEventCategories,
} from '@/shared/api/event-categories'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'

export function useCatalogReferenceData() {
  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>([])
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])

  useEffect(() => {
    Promise.all([
      getAllEventCategories(),
      getAllCountries(),
      getAllHistoricalCountries(),
    ])
      .then(([categories, countriesData, historicalCountriesData]) => {
        setDbCategories(categories)
        setCountries(countriesData)
        setHistoricalCountries(historicalCountriesData)
      })
      .catch(() => {
        setDbCategories([])
        setCountries([])
        setHistoricalCountries([])
      })
  }, [])

  return { dbCategories, countries, historicalCountries }
}
