/**
 * 카탈로그가 의존하는 참조 데이터 로드:
 * - 사건 카테고리 (DB)
 * - 현대 국가 / 역사적 국가
 * - 대륙 (사건 필터에서 country.continentId로 매칭)
 *
 * react-query 기반 — 전역 캐시·dedup·staleTime을 활용하고, 쿼리별로 독립이라
 * 한 엔드포인트가 실패해도 나머지 참조 데이터는 유지된다(이전 Promise.all+useState는
 * 하나만 죽어도 catch가 4개를 모두 []로 비웠음). 자주 안 바뀌는 데이터라 staleTime 길게.
 */
import { useQuery } from '@tanstack/react-query'

import { getAllContinents } from '@/shared/api/continents'
import { getAllCountries } from '@/shared/api/countries'
import { getAllEventCategories } from '@/shared/api/event-categories'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'

const REF_STALE_TIME = 5 * 60_000 // 5분 — 참조 데이터는 거의 안 바뀜

export function useCatalogReferenceData() {
  const categoriesQuery = useQuery({
    queryKey: ['event-categories'],
    queryFn: getAllEventCategories,
    staleTime: REF_STALE_TIME,
  })
  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: getAllCountries,
    staleTime: REF_STALE_TIME,
  })
  const historicalCountriesQuery = useQuery({
    queryKey: ['historical-countries'],
    queryFn: getAllHistoricalCountries,
    staleTime: REF_STALE_TIME,
  })
  const continentsQuery = useQuery({
    queryKey: ['continents'],
    queryFn: getAllContinents,
    staleTime: REF_STALE_TIME,
  })

  return {
    dbCategories: categoriesQuery.data ?? [],
    countries: countriesQuery.data ?? [],
    historicalCountries: historicalCountriesQuery.data ?? [],
    continents: continentsQuery.data ?? [],
  }
}
