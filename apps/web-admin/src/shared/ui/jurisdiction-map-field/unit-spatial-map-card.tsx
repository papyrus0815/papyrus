import React, { lazy, Suspense, useState } from 'react'

import { FiLayers, FiMapPin } from 'react-icons/fi'
import styled from 'styled-components'

import { HeadquartersMapPreview } from '@/shared/ui/headquarters-location-field'

import type {
  GarrisonMapPoint,
  JurisdictionGeometry,
  SubUnitMapPin,
} from './jurisdiction-map.types'

const LazyJurisdictionLeafletCanvas = lazy(
  () => import('./jurisdiction-leaflet-canvas'),
)

export interface UnitSpatialMapCardProps {
  unitName: string
  countryName?: string | null
  garrison?: string | null
  garrisonLatitude?: number | null
  garrisonLongitude?: number | null
  jurisdictionGeometry?: JurisdictionGeometry | null
  subUnitPins?: ReadonlyArray<SubUnitMapPin>
  accentColor?: string
  compact?: boolean
  onSelectSubUnit?: (unitId: string) => void
}

/**
 * 사령부·부대 상세 지면의 통합 공간 지도 카드.
 * - 관할·작전구역 도형(POLYGON/LINE), 본영 핀 좌표, 또는 예하부대 핀 좌표가 있으면 즉시 Leaflet 통합 전술 지도를 펼친다.
 * - 좌표 없이 주둔지 텍스트만 있는 레거시 행이면 HeadquartersMapPreview(명칭 검색)를 기본 펼침으로 보여준다.
 */
export const UnitSpatialMapCard: React.FC<UnitSpatialMapCardProps> = ({
  unitName,
  countryName,
  garrison,
  garrisonLatitude,
  garrisonLongitude,
  jurisdictionGeometry,
  subUnitPins = [],
  accentColor = '#2563eb',
  compact = false,
  onSelectSubUnit,
}) => {
  const [mapLayer, setMapLayer] = useState<'roadmap' | 'hybrid'>('roadmap')

  const hasPinnedHq =
    typeof garrisonLatitude === 'number' &&
    Number.isFinite(garrisonLatitude) &&
    typeof garrisonLongitude === 'number' &&
    Number.isFinite(garrisonLongitude)

  const hasGeometry = Boolean(
    jurisdictionGeometry &&
      ((jurisdictionGeometry.type === 'POLYGON' &&
        jurisdictionGeometry.coordinates.length >= 3) ||
        (jurisdictionGeometry.type === 'LINE' &&
          jurisdictionGeometry.coordinates.length >= 2)),
  )

  const hasVectorData =
    hasPinnedHq || hasGeometry || subUnitPins.length > 0

  if (!hasVectorData && !garrison?.trim()) {
    return null
  }

  if (!hasVectorData && garrison?.trim()) {
    return (
      <HeadquartersMapPreview
        headquarters={garrison}
        countryName={countryName}
        departmentName={unitName}
        defaultExpanded
        showHeadline
        mapHeight={compact ? 210 : 260}
      />
    )
  }

  const garrisonPoint: GarrisonMapPoint | null = hasPinnedHq
    ? {
        lat: garrisonLatitude!,
        lng: garrisonLongitude!,
        label: garrison || unitName,
      }
    : null

  return (
    <CardWrap>
      <CardBar>
        <LegendRow>
          <FiMapPin size={12.5} />
          <TitleText>주둔지 · 관할 작전지도</TitleText>
          {garrisonPoint ? (
            <LegendPill>★ 본영: {garrison || unitName}</LegendPill>
          ) : null}
          {hasGeometry && jurisdictionGeometry ? (
            <LegendPill>
              {jurisdictionGeometry.type === 'POLYGON'
                ? '관할·작전구역'
                : '담당 전선'}
            </LegendPill>
          ) : null}
          {subUnitPins.length > 0 ? (
            <LegendPill>▪ 예하 주둔지 {subUnitPins.length}곳</LegendPill>
          ) : null}
        </LegendRow>

        <LayerSwitch role="group" aria-label="지도 레이어 전환">
          <LayerBtn
            type="button"
            $active={mapLayer === 'roadmap'}
            onClick={() => setMapLayer('roadmap')}
          >
            일반
          </LayerBtn>
          <LayerBtn
            type="button"
            $active={mapLayer === 'hybrid'}
            onClick={() => setMapLayer('hybrid')}
          >
            <FiLayers size={10} /> 위성
          </LayerBtn>
        </LayerSwitch>
      </CardBar>

      <Suspense
        fallback={
          <MapLoading $height={compact ? 220 : 280}>
            작전지도를 불러오는 중…
          </MapLoading>
        }
      >
        <LazyJurisdictionLeafletCanvas
          mode="view"
          geometryType={jurisdictionGeometry?.type ?? 'POLYGON'}
          coordinates={hasGeometry ? jurisdictionGeometry!.coordinates : []}
          accentColor={jurisdictionGeometry?.color || accentColor}
          mapLayer={mapLayer}
          garrisonPoint={garrisonPoint}
          subUnitPins={subUnitPins}
          height={compact ? 220 : 280}
          onSelectSubUnit={onSelectSubUnit}
        />
      </Suspense>
    </CardWrap>
  )
}

const CardWrap = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'};
`

const CardBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 7px 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
`

const LegendRow = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TitleText = styled.strong`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LegendPill = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(15, 23, 42, 0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LayerSwitch = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
`

const LayerBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 7px;
  border: none;
  border-radius: 4px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.25)'
        : 'rgba(99, 102, 241, 0.12)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
`

const MapLoading = styled.div<{ $height: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${({ $height }) => $height}px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
