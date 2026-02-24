/**
 * 현대 국가와 연결된 역사적 국가 목록 조회 Hook
 *
 * @description
 * 특정 현대 국가(Modern Country)와 연결된 역사적 국가(Historical Country) 목록을 조회합니다.
 * 예: 대한민국 → 조선, 고려, 신라 등
 *
 * @usage
 * - widgets/country/country-detail/ui/CountryDetail.tsx
 *   국가 상세 페이지에서 해당 국가의 역사적 전신들을 표시
 *
 * @example
 * ```tsx
 * // 대한민국(modernCountryId)의 역사적 국가들 조회
 * const { data: historicalCountries } = useHistoricalCountriesByModernCountry('korea-id')
 * // 결과: [{ name: '조선', ... }, { name: '고려', ... }, ...]
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import * as historicalCountriesApi from '@api/functional/countries/historical_countries'
import { getApiConnection } from '@/shared/api/client'

/**
 * 현대 국가 ID로 연결된 역사적 국가 목록 조회
 *
 * @description
 * 현대 국가와 many-to-many 관계로 연결된 역사적 국가들을 조회합니다.
 * 중간 테이블: HistoricalCountryModernCountry
 *
 * @param {string} modernCountryId - 현대 국가 ID
 * @returns {UseQueryResult<HistoricalCountry[]>} 역사적 국가 목록
 *
 * @example
 * ```tsx
 * const { data: historicalCountries, isLoading } =
 *   useHistoricalCountriesByModernCountry('korea-modern-id')
 *
 * // historicalCountries: [
 * //   { id: '1', name: '조선', enName: 'Joseon', startDate: '1392-07-17', ... },
 * //   { id: '2', name: '고려', enName: 'Goryeo', startDate: '918-06-01', ... }
 * // ]
 * ```
 *
 * @note
 * - modernCountryId가 없으면 쿼리가 자동으로 비활성화됩니다.
 * - TransformInterceptor로 래핑된 응답에서 data를 자동 추출합니다.
 */
export function useHistoricalCountriesByModernCountry(modernCountryId: string) {
  return useQuery({
    queryKey: ['countries', modernCountryId, 'historical-countries'],
    queryFn: async () => {
      const response =
        (await historicalCountriesApi.getHistoricalCountriesByModernCountryId(
          getApiConnection(),
          modernCountryId,
        )) as any

      // TransformInterceptor로 래핑된 응답에서 data 추출
      return (response.data || response) as Array<{
        id: string
        name: string
        enName: string
        thumbnailUrl: string | null
        stateType: string
        startDate: string | null
        endDate: string | null
      }>
    },
    enabled: !!modernCountryId,
  })
}
