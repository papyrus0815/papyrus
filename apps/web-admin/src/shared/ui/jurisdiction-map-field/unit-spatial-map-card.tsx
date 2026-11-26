import React, { lazy, Suspense, useState } from 'react'

import { FiLayers, FiMapPin } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
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
 * 사령부·부대 상세 지면의 공간 작전지도 블록 (무카드 오픈 헤더 + 라운드 캔버스).
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
        mapHeight={compact ? 200 : 230}
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

  const resolvedAccent = jurisdictionGeometry?.color || accentColor
  const summaryParts: string[] = []
  if (garrisonPoint) {
    summaryParts.push(garrison?.trim() || '본영 좌표 지정')
  }
  if (hasGeometry && jurisdictionGeometry) {
    summaryParts.push(
      jurisdictionGeometry.type === 'POLYGON' ? '관할구역' : '담당전선',
    )
  }
  if (subUnitPins.length > 0) {
    summaryParts.push(`예하 ${subUnitPins.length}곳`)
  }

  return (
    <MapBlock>
      <MapHeadRow>
        <MapHeadLeft>
          <MapEyebrow>
            <FiMapPin size={12} />
            <span>위치 · 관할 지도</span>
          </MapEyebrow>
          {summaryParts.length > 0 ? (
            <MapMetaText>{summaryParts.join(' · ')}</MapMetaText>
          ) : null}
        </MapHeadLeft>

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
      </MapHeadRow>

      <MapFrame>
        <Suspense
          fallback={
            <MapLoading $height={compact ? 200 : 240}>
              지도를 불러오는 중…
            </MapLoading>
          }
        >
          <LazyJurisdictionLeafletCanvas
            mode="view"
            geometryType={jurisdictionGeometry?.type ?? 'POLYGON'}
            coordinates={hasGeometry ? jurisdictionGeometry!.coordinates : []}
            accentColor={resolvedAccent}
            mapLayer={mapLayer}
            garrisonPoint={garrisonPoint}
            subUnitPins={subUnitPins}
            height={compact ? 200 : 240}
            onSelectSubUnit={onSelectSubUnit}
          />
        </Suspense>
      </MapFrame>
    </MapBlock>
  )
}

const MapBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const MapHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
`

const MapHeadLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const MapEyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MapMetaText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LayerSwitch = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  flex-shrink: 0;
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
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  font: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ $active, theme }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const MapFrame = styled.div`
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const MapLoading = styled.div<{ $height: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${({ $height }) => $height}px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
