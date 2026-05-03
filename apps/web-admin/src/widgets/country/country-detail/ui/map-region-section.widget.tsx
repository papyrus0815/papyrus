import { useState } from 'react'

import { getMapRegionSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'

import { useAdministrativeDivisions } from '@/entities/country/api.administrative-divisions'

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
 * 지도 & 행정구역 섹션 — 탭 + KPI 스트립을 묶고, 모드별 뷰를 위임 렌더한다.
 */
export function MapRegionSection({
  country,
  mapLocation,
  onCityClick,
}: MapRegionSectionProps) {
  const { mode } = useThemeStore()
  const C = getMapRegionSectionPalette(mode === 'dark')

  const [viewMode, setViewMode] = useState<ViewMode>('administrative')
  const { data: divisions = [] } = useAdministrativeDivisions(country.id)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        padding: '36px 32px 48px',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative',
      }}
    >
      <SectionTabHeader
        variant="plain"
        title="행정구역"
        description="행정구역, 자연 지리, 인프라를 지도와 목록으로 확인할 수 있습니다."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            flexWrap: 'wrap',
            padding: '20px 28px',
            background: C.bg,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.textSecondary,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              현재 보기
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: C.text,
                letterSpacing: '-0.03em',
              }}
            >
              {viewMode === 'administrative'
                ? '행정구역'
                : viewMode === 'nature'
                  ? '자연 지리'
                  : '인프라'}
            </span>
          </div>
          {viewMode === 'administrative' && (
            <>
              <span
                style={{
                  width: 1,
                  height: 24,
                  background: C.divider,
                  borderRadius: 1,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.textSecondary,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  1차 행정구역
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.text,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {divisions.length}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: C.textSecondary,
                      marginLeft: 2,
                    }}
                  >
                    개
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

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
