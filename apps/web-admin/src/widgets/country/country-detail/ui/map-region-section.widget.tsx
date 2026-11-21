import { useCallback, useMemo } from 'react'

import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  type AdministrativeDivision,
  useAdministrativeDivisions,
} from '@/entities/country/api.administrative-divisions'
import { useInfrastructures } from '@/entities/country/api.infrastructure'
import { useNaturalFeatures } from '@/entities/country/api.natural-feature'
import { SectionSubNav } from '@/shared/ui/section-sub-nav/section-sub-nav'

import { countryTabCanvasPadding } from './country-ledger-primitives'
import { MapRegionAdministrativeView } from './map-region-administrative-view'
import { MapRegionInfrastructureView } from './map-region-infrastructure-view'
import { MapRegionNatureView } from './map-region-nature-view'

type ViewMode = 'administrative' | 'nature' | 'infrastructure'

const VIEW_MODES: ReadonlyArray<ViewMode> = [
  'administrative',
  'nature',
  'infrastructure',
]

interface MapRegionSectionProps {
  country: {
    id: string
    latitude?: number | null
    longitude?: number | null
    name: string
    flagEmoji?: string | null
  }
  mapLocation?: { latitude: number; longitude: number; name: string } | null
  onCityClick: (city: {
    id: string
    name: string
    population: string
    latitude: number
    longitude: number
    area?: string
    gdp?: string
    industry?: string
  }) => void
}

function countDivisionTree(nodes: AdministrativeDivision[]): number {
  let total = 0
  for (const node of nodes) {
    total += 1
    if (node.children?.length) total += countDivisionTree(node.children)
  }
  return total
}

const SectionCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  ${countryTabCanvasPadding}
  min-height: calc(100vh - 200px);
  position: relative;
`

/**
 * 지도 & 행정구역 섹션 — 보기 전환 탭(건수 배지) + 모드별 Event-Ledger 아틀라스 뷰 위임.
 */
export function MapRegionSection({
  country,
  mapLocation,
  onCityClick,
}: MapRegionSectionProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawViewMode = searchParams.get('region_view')
  const viewMode: ViewMode =
    rawViewMode && (VIEW_MODES as readonly string[]).includes(rawViewMode)
      ? (rawViewMode as ViewMode)
      : 'administrative'

  const setViewMode = useCallback(
    (nextMode: ViewMode) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (nextMode === 'administrative') next.delete('region_view')
          else next.set('region_view', nextMode)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // 하위 뷰와 동일한 React Query 캐시 키를 공유하여 추가 요청 없이 탭 건수 표시
  const { data: divisions = [] } = useAdministrativeDivisions(country.id, null)
  const { data: natureItems = [] } = useNaturalFeatures(country.id)
  const { data: infraItems = [] } = useInfrastructures(country.id)

  const divisionTotal = useMemo(
    () => countDivisionTree(divisions),
    [divisions],
  )

  return (
    <SectionCanvas>
      <SectionSubNav<ViewMode>
        ariaLabel="행정구역 보기 전환"
        tabs={[
          {
            key: 'administrative',
            label: '행정구역',
            count: divisionTotal > 0 ? divisionTotal : null,
            title: '행정구역 계층 편제와 시기별 개편 체계',
          },
          {
            key: 'nature',
            label: '자연 지리',
            count: natureItems.length > 0 ? natureItems.length : null,
            title: '산·강·호수 등 자연 지형',
          },
          {
            key: 'infrastructure',
            label: '인프라',
            count: infraItems.length > 0 ? infraItems.length : null,
            title: '철도·항만·발전소 등 국가 기간시설',
          },
        ]}
        activeTab={viewMode}
        onTabChange={setViewMode}
      />

      {viewMode === 'administrative' && (
        <MapRegionAdministrativeView
          country={country}
          mapLocation={mapLocation}
          onCityClick={onCityClick}
        />
      )}
      {viewMode === 'nature' && <MapRegionNatureView country={country} />}
      {viewMode === 'infrastructure' && (
        <MapRegionInfrastructureView country={country} />
      )}
    </SectionCanvas>
  )
}
