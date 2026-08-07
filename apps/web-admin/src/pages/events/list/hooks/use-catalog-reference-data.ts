/**
 * 카탈로그가 의존하는 참조 데이터 로드:
 * - 사건 카테고리 (DB)
 * - 현대 국가 / 역사적 국가
 * - 대륙 (사건 필터에서 country.continentId로 매칭)
 *
 * react-query 기반 — 전역 캐시·dedup·staleTime을 활용하고, 쿼리별로 독립이라
 * 한 엔드포인트가 실패해도 나머지 참조 데이터는 유지된다(이전 Promise.all+useState는
 * 하나만 죽어도 catch가 4개를 모두 []로 비웠음). 자주 안 바뀌는 데이터라 staleTime 길게.
 *
 * ## 왜 상태까지 반환하나 (검토 GAP-5)
 *
 * 예전엔 `data ?? []`만 돌려줬다. 그래서 필터 UI에서 **'잘못된 링크'와 '참조 데이터가
 * 아직 안 옴'과 '영영 실패'가 완전히 같은 화면**이었다 — 셋 다 '알 수 없음' 또는
 * 빈 옵션 목록이다. 참조 데이터는 비동기라 *필터가 걸린 공유 링크를 열 때마다* 이
 * 구간을 지나가고, 그 사이 사용자는 "이 필터가 깨졌다"고 판단한다.
 *
 * 축별로 `{ data, isLoading, isError, isSuccess, refetch }`를 돌려주면 소비처가
 *  ⑴ 라벨을 '불러오는 중' / '이름 조회 실패' / '알 수 없음'으로 구분하고(→ `resolveReferenceState`)
 *  ⑵ **로드가 성공으로 끝난 뒤에만** 미해결 id를 낙하시킬 수 있다.
 * ⑵의 게이트가 없으면 로딩 중에 정상 필터를 지워 버린다.
 */
import { useQuery } from '@tanstack/react-query'

import type { ContinentResponseDto } from '@/shared/api/continents'
import { getAllContinents } from '@/shared/api/continents'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { getAllEventCategories } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'

const REF_STALE_TIME = 5 * 60_000 // 5분 — 참조 데이터는 거의 안 바뀜

/**
 * 미로드 상태의 빈 배열은 **모듈 스코프 고정 참조**여야 한다.
 * `data ?? []`처럼 렌더마다 새 배열을 만들면 이 값을 deps로 쓰는 하위 useMemo
 * (국가 옵션·브리지 역인덱스 등)가 매 렌더 무효화된다.
 */
const EMPTY_CATEGORIES: EventCategoryDto[] = []
const EMPTY_COUNTRIES: CountryResponseDto[] = []
const EMPTY_HISTORICAL_COUNTRIES: HistoricalCountryResponseDto[] = []
const EMPTY_CONTINENTS: ContinentResponseDto[] = []

/** 한 참조 축의 데이터와 상태 */
export interface ReferenceChannel<T> {
  data: T[]
  isLoading: boolean
  isError: boolean
  /** 로드가 **성공으로 끝났는가** — 미해결 id 낙하의 유일한 게이트 */
  isSuccess: boolean
  refetch: () => void
}

export interface CatalogReferenceData {
  categories: ReferenceChannel<EventCategoryDto>
  countries: ReferenceChannel<CountryResponseDto>
  historicalCountries: ReferenceChannel<HistoricalCountryResponseDto>
  continents: ReferenceChannel<ContinentResponseDto>
}

export function useCatalogReferenceData(): CatalogReferenceData {
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
    categories: {
      data: categoriesQuery.data ?? EMPTY_CATEGORIES,
      isLoading: categoriesQuery.isLoading,
      isError: categoriesQuery.isError,
      isSuccess: categoriesQuery.isSuccess,
      refetch: categoriesQuery.refetch,
    },
    countries: {
      data: countriesQuery.data ?? EMPTY_COUNTRIES,
      isLoading: countriesQuery.isLoading,
      isError: countriesQuery.isError,
      isSuccess: countriesQuery.isSuccess,
      refetch: countriesQuery.refetch,
    },
    historicalCountries: {
      data: historicalCountriesQuery.data ?? EMPTY_HISTORICAL_COUNTRIES,
      isLoading: historicalCountriesQuery.isLoading,
      isError: historicalCountriesQuery.isError,
      isSuccess: historicalCountriesQuery.isSuccess,
      refetch: historicalCountriesQuery.refetch,
    },
    continents: {
      data: continentsQuery.data ?? EMPTY_CONTINENTS,
      isLoading: continentsQuery.isLoading,
      isError: continentsQuery.isError,
      isSuccess: continentsQuery.isSuccess,
      refetch: continentsQuery.refetch,
    },
  }
}
