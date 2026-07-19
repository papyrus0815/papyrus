/**
 * 재임·재위 등록 패널 공용 — 현대 국가 ↔ 역사적 국가 브리지 스코프 훅
 *
 * @description
 * 재임(tenure-register-panel)·재위(sovereign-reign-register-panel) 두 패널이
 * 동일하게 필요로 하는 두 가지를 한곳에 모은다.
 * 1) 선택된 현대 국가에 속한 역사적 국가 목록 조회(모달이 열려 있을 때만)
 * 2) 현대 국가 재선택 시 역사적 국가 연결의 **보수적** 해제 정책
 *
 * 정책(두 패널 동일):
 * - 국가를 다시 고를 때 historicalCountryId를 무조건 비우지 않는다.
 *   (역사국가 전용 행을 수정하다 현대 국가를 골랐을 때 historicalCountryId가
 *   조용히 NULL로 덮여 연결이 파괴되던 문제 방지)
 * - 새로 고른 현대 국가에 그 역사국가가 속하지 않을 때만 해제한다.
 * - 목록 조회가 **성공**했을 때만 그 판단을 내린다. 조회 에러 시에는 기본값 []로
 *   belongs=false 오판이 나므로 연결을 보존한다.
 */

import { useEffect, useRef } from 'react'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'

interface UseHistoricalCountryScopeParams {
  /** 패널(모달) 열림 여부 — 닫혀 있으면 조회·해제 판단 모두 하지 않는다 */
  open: boolean
  /** 현재 선택된 현대 국가 id (미선택 시 빈 문자열) */
  countryId: string
  /** 현재 선택된 역사적 국가 id (미선택 시 null) */
  historicalCountryId: string | null
  /** 새 현대 국가에 속하지 않아 해제해야 할 때 호출 — 보통 setHistoricalCountryId(null) */
  onClearHistoricalCountry: () => void
}

export function useHistoricalCountryScope({
  open,
  countryId,
  historicalCountryId,
  onClearHistoricalCountry,
}: UseHistoricalCountryScopeParams) {
  // isSuccess 가드 — isFetched는 fetch가 에러로 끝나도 true가 돼 기본값 []로
  // belongs 검사가 돌아 역사국가 연결이 잘못 해제된다. 성공 응답일 때만 검사.
  const { data: historicalCountries = [], isSuccess: historicalCountriesLoaded } =
    useHistoricalCountriesByModernCountry(open ? countryId : '')

  // 호출부가 매 렌더 새 인라인 함수를 넘겨도 effect가 재실행되지 않도록 ref로 고정
  const clearRef = useRef(onClearHistoricalCountry)
  clearRef.current = onClearHistoricalCountry

  useEffect(() => {
    if (!open || !countryId || !historicalCountryId) return
    if (!historicalCountriesLoaded) return
    const belongs = historicalCountries.some(
      (historical) => historical.id === historicalCountryId,
    )
    if (!belongs) clearRef.current()
  }, [open, countryId, historicalCountryId, historicalCountriesLoaded, historicalCountries])

  return { historicalCountries, historicalCountriesLoaded }
}
