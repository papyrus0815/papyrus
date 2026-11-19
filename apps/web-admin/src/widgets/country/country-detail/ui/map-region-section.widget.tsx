import { useCallback, useMemo } from 'react'

import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  type AdministrativeDivision,
  useAdministrativeDivisions,
} from '@/entities/country/api.administrative-divisions'
import { useInfrastructures } from '@/entities/country/api.infrastructure'
import { useNaturalFeatures } from '@/entities/country/api.natural-feature'
import { DIGIT_DISPLAY } from '@/entities/event/ui/ledger-tokens'
import { SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'

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

const TabCount = styled.span<{ $active?: boolean }>`
  margin-left: 5px;
  font-size: 11px;
  font-weight: 700;
  opacity: ${({ $active }) => ($active ? 0.95 : 0.65)};
  ${DIGIT_DISPLAY}
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
      <SectionTabHeader
        variant="plain"
        title="행정구역 · 지리"
        description="행정구역 계층 편제와 시기별 개편 체계, 자연 지형, 국가 기간시설을 인포그래픽과 지도로 탐색합니다."
      />

      <UnderlineTabNav
        role="tablist"
        aria-label="행정구역 보기 전환"
        style={{ marginBottom: 0 }}
      >
        <UnderlineTabButton
          type="button"
          role="tab"
          aria-selected={viewMode === 'administrative'}
          $active={viewMode === 'administrative'}
          onClick={() => setViewMode('administrative')}
        >
          행정구역
          {divisionTotal > 0 && (
            <TabCount $active={viewMode === 'administrative'}>
              {divisionTotal.toLocaleString('ko-KR')}
            </TabCount>
          )}
        </UnderlineTabButton>
        <UnderlineTabButton
          type="button"
          role="tab"
          aria-selected={viewMode === 'nature'}
          $active={viewMode === 'nature'}
          onClick={() => setViewMode('nature')}
        >
          자연 지리
          {natureItems.length > 0 && (
            <TabCount $active={viewMode === 'nature'}>
              {natureItems.length.toLocaleString('ko-KR')}
            </TabCount>
          )}
        </UnderlineTabButton>
        <UnderlineTabButton
          type="button"
          role="tab"
          aria-selected={viewMode === 'infrastructure'}
          $active={viewMode === 'infrastructure'}
          onClick={() => setViewMode('infrastructure')}
        >
          인프라
          {infraItems.length > 0 && (
            <TabCount $active={viewMode === 'infrastructure'}>
              {infraItems.length.toLocaleString('ko-KR')}
            </TabCount>
          )}
        </UnderlineTabButton>
      </UnderlineTabNav>

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
