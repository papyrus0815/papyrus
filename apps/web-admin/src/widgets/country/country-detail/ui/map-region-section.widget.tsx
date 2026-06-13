import { useState } from 'react'

import { SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'

import { MapRegionAdministrativeView } from './map-region-administrative-view'
import { MapRegionInfrastructureView } from './map-region-infrastructure-view'
import { MapRegionNatureView } from './map-region-nature-view'

type ViewMode = 'administrative' | 'nature' | 'infrastructure'

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

/**
 * 지도 & 행정구역 섹션 — 보기 전환 탭 + 모드별 뷰 위임.
 * 개수 통계는 각 뷰의 KPI 스트립이 담당한다 (상단 중복 stat 바 제거).
 */
export function MapRegionSection({
  country,
  mapLocation,
  onCityClick,
}: MapRegionSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('administrative')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        // 좁은 화면에서 좌우 패딩을 줄여 콘텐츠 폭 확보
        padding: '32px clamp(12px, 3vw, 32px) 48px',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative',
      }}
    >
      <SectionTabHeader
        variant="plain"
        title="행정구역"
        description="행정구역, 자연 지리, 인프라를 지도와 목록으로 확인할 수 있습니다."
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
        </UnderlineTabButton>
        <UnderlineTabButton
          type="button"
          role="tab"
          aria-selected={viewMode === 'nature'}
          $active={viewMode === 'nature'}
          onClick={() => setViewMode('nature')}
        >
          자연 지리
        </UnderlineTabButton>
        <UnderlineTabButton
          type="button"
          role="tab"
          aria-selected={viewMode === 'infrastructure'}
          $active={viewMode === 'infrastructure'}
          onClick={() => setViewMode('infrastructure')}
        >
          인프라
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
    </div>
  )
}
