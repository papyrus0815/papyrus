/**
 * 카탈로그가 의존하는 참조 데이터 일괄 로드:
 * - 사건 카테고리 (DB)
 * - 현대 국가 / 역사적 국가
 * - 대륙 (사건 필터에서 country.continentId로 매칭)
 *
 * 마운트 1회만 fetch. 실패 시 빈 배열로 안전하게 폴백.
 */
import { useEffect, useState } from 'react'

import { getAllContinents } from '@/shared/api/continents'
import type { ContinentResponseDto } from '@/shared/api/continents'
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
  const [continents, setContinents] = useState<ContinentResponseDto[]>([])

  useEffect(() => {
    Promise.all([
      getAllEventCategories(),
      getAllCountries(),
      getAllHistoricalCountries(),
      getAllContinents(),
    ])
      .then(
        ([
          categories,
          countriesData,
          historicalCountriesData,
          continentsData,
        ]) => {
          setDbCategories(categories)
          setCountries(countriesData)
          setHistoricalCountries(historicalCountriesData)
          setContinents(continentsData)
        },
      )
      .catch(() => {
        setDbCategories([])
        setCountries([])
        setHistoricalCountries([])
        setContinents([])
      })
  }, [])

  return { dbCategories, countries, historicalCountries, continents }
}
