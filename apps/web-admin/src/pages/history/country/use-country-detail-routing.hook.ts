/**
 * `/history/country/:countryId/*` 의 URL ↔ 탭 매핑·네비게이션을 단일 훅으로 캡슐화한다.
 *
 * - `initialDetailTab`: URL의 `detailTab`을 그대로 위젯에 전달할 수 있도록 변환 (persons/events/heads-of-state는 페이지에서 따로 분기)
 * - `handleDetailTabChange`: 위젯 → URL 갱신 (단일 콜백, dashboard 포함 모든 탭 처리)
 * - `redirectFromDeprecatedTabs`: 페이지 마운트 시 deprecated 탭(persons, ?tab=heads)을 신규 URL로 redirect
 */
import { useCallback, useEffect } from 'react'

import { useNavigate, useSearchParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import type { CountryDetailTabKey } from '@/widgets/country/country-detail/ui/country-detail.widget'

import type { CountryDetailTab } from './use-history-location.hook'

/** URL 경로상 detailTab → 위젯 initialDetailTab 매핑. */
function urlTabToWidgetTab(
  urlTab: CountryDetailTab,
): CountryDetailTabKey | undefined {
  switch (urlTab) {
    case 'dashboard':
      return 'dashboard'
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
      return pathKeys.history.countryGovernment(countryId)
    case 'linked-historical':
      return pathKeys.history.countryHistorical(countryId)
    case 'regions':
      return pathKeys.history.countryRegions(countryId)
    case 'elections':
      return pathKeys.history.countryElections(countryId)
    case 'laws':
      return pathKeys.history.countryLaws(countryId)
    case 'ethnicity':
      return pathKeys.history.countryEthnicity(countryId)
    case 'treaty':
      return pathKeys.history.countryTreaty(countryId)
    case 'dashboard':
      return pathKeys.history.countryDashboard(countryId)
    default:
      return pathKeys.history.countryDetail(countryId)
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
 * 페이지가 사용하는 라우팅 헬퍼들을 묶음.
 *
 * 페이지 마운트 시 deprecated URL(persons / ?tab=heads)에서 신규 URL로 redirect 하는
 * 효과도 같이 트리거 — 두 개의 useEffect가 따로 fire하지 않도록 단일 effect로 통합한다.
 */
export function useCountryDetailRouting({
  selectedId,
  detailTab,
}: RoutingArgs): RoutingResult {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ─── deprecated URL → 신규 URL redirect ─────────────────────────────────
  // /persons + ?tab=heads → /government (역대 수반 탭은 행정조직 탭으로 통합됨)
  // /persons (그 외) → /history/dashboard/persons?countries=<id> (인물 탭은 헤더 인물 페이지로 통합됨)
  //
  // 두 분기를 한 effect에 두어 동일 마운트에서 navigate가 두 번 fire 되지 않도록 한다.
  useEffect(() => {
    if (!selectedId) return
    if (detailTab !== 'persons') return

    if (searchParams.get('tab') === 'heads') {
      navigate(pathKeys.history.countryGovernment(selectedId), {
        replace: true,
      })
      return
    }

    navigate(
      `${pathKeys.history.dashboardPersons()}?countries=${encodeURIComponent(selectedId)}`,
      { replace: true },
    )
  }, [selectedId, detailTab, searchParams, navigate])

  // ─── URL → 위젯 prop ────────────────────────────────────────────────────
  const initialDetailTab = urlTabToWidgetTab(detailTab)

  // ─── 위젯 → URL ─────────────────────────────────────────────────────────
  const handleDetailTabChange = useCallback(
    (tab: CountryDetailTabKey | null) => {
      if (!selectedId) return
      navigate(tabToPath(selectedId, tab))
    },
    [navigate, selectedId],
  )

  return { initialDetailTab, handleDetailTabChange }
}
