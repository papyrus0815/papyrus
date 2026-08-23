/**
 * `/history/country/:countryId/*` 의 URL ↔ 탭 매핑·네비게이션을 단일 훅으로 캡슐화.
 *
 * - `initialDetailTab`: URL의 `detailTab`을 위젯에 전달할 수 있도록 변환
 *   (heads-of-state는 라우터 loader가 redirect)
 * - `handleDetailTabChange`: 위젯 → URL 갱신 (단일 콜백, dashboard 포함 모든 탭 처리)
 */
import { useCallback } from 'react'

import { useNavigate } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import type { CountryDetailTabKey } from '@/widgets/country/country-detail/ui/country-detail.widget'

import type { CountryDetailTab } from './use-content-location.hook'

/** URL 경로상 detailTab → 위젯 initialDetailTab 매핑. */
function urlTabToWidgetTab(
  urlTab: CountryDetailTab,
): CountryDetailTabKey | undefined {
  switch (urlTab) {
    case 'dashboard':
      return 'dashboard'
    case 'persons':
      return 'persons'
    case 'events':
      return 'events'
    case 'heads-of-state':
      return 'heads'
    case 'linked-historical':
      return 'linked-historical'
    case 'regions':
      return 'regions'
    case 'government':
      return 'government'
    case 'elections':
      return 'elections'
    case 'laws':
      return 'laws'
    case 'ethnicity':
      return 'ethnicity'
    case 'treaty':
      return 'treaty'
    default:
      return undefined
  }
}

/**
 * 위젯 탭 → URL 빌더 매핑.
 * - 'dashboard'는 명시적으로 `/dashboard` 세그먼트 — `/`(루트)와 구분.
 * - null/undefined는 상세 루트(`/`)로 폴백.
 */
function tabToPath(countryId: string, tab: CountryDetailTabKey | null): string {
  switch (tab) {
    case 'heads':
    case 'government':
      return pathKeys.countryGovernment(countryId)
    case 'linked-historical':
      return pathKeys.countryHistorical(countryId)
    case 'regions':
      return pathKeys.countryRegions(countryId)
    case 'elections':
      return pathKeys.countryElections(countryId)
    case 'laws':
      return pathKeys.countryLaws(countryId)
    case 'persons':
      return pathKeys.countryPersons(countryId)
    case 'events':
      return pathKeys.countryEvents(countryId)
    case 'ethnicity':
      return pathKeys.countryEthnicity(countryId)
    case 'treaty':
      return pathKeys.countryTreaty(countryId)
    case 'dashboard':
      return pathKeys.countryDashboard(countryId)
    default:
      return pathKeys.countryDetail(countryId)
  }
}

interface RoutingArgs {
  selectedId: string | null
  detailTab: CountryDetailTab
}

interface RoutingResult {
  initialDetailTab: CountryDetailTabKey | undefined
  handleDetailTabChange: (tab: CountryDetailTabKey | null) => void
}

/**
 * 페이지가 사용하는 URL ↔ 탭 매핑 헬퍼.
 *
 * deprecated URL(heads-of-state)의 redirect는 라우터 loader 단계에서 처리되므로
 * 이 hook은 순수 매핑만 담당한다.
 */
export function useCountryDetailRouting({
  selectedId,
  detailTab,
}: RoutingArgs): RoutingResult {
  const navigate = useNavigate()

  // URL → 위젯 prop
  const initialDetailTab = urlTabToWidgetTab(detailTab)

  // 위젯 → URL
  const handleDetailTabChange = useCallback(
    (tab: CountryDetailTabKey | null) => {
      if (!selectedId) return
      navigate(tabToPath(selectedId, tab))
    },
    [navigate, selectedId],
  )

  return { initialDetailTab, handleDetailTabChange }
}
