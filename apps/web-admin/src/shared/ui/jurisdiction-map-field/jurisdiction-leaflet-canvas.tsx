/**
 * 사령부·부대 관할·작전구역 및 본영·예하부대 공간 지도 (Leaflet + Google Maps 타일)
 * - edit 모드: 클릭하여 다각형(위수지역·군관구·작전해역) 또는 선(담당 전선·방어선) 꼭짓점 추가, 드래그 미세 조정, 꼭짓점 우클릭 삭제
 * - view 모드: 본영 핀 + 관할·작전구역 도형 + 예하부대 주둔지 핀 통합 렌더링
 */
import { useEffect, useMemo } from 'react'

import Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import type {
  GarrisonMapPoint,
  JurisdictionGeometryType,
  SubUnitMapPin,
} from './jurisdiction-map.types'

delete (Leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl
Leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const roundCoord = (coord: number) => Number(coord.toFixed(6))

export interface JurisdictionLeafletCanvasProps {
  mode: 'edit' | 'view'
  geometryType: JurisdictionGeometryType
  coordinates: Array<[number, number]>
  accentColor?: string
  mapLayer: 'roadmap' | 'hybrid'
  garrisonPoint?: GarrisonMapPoint | null
  subUnitPins?: ReadonlyArray<SubUnitMapPin>
  flyTarget?: { lat: number; lng: number; token: number } | null
  height: number
  onAddVertex?: (point: [number, number]) => void
  onMoveVertex?: (index: number, point: [number, number]) => void
  onRemoveVertex?: (index: number) => void
  onSelectSubUnit?: (unitId: string) => void
}

function MapClickHandler({
  enabled,
  onAddVertex,
}: {
  enabled: boolean
  onAddVertex?: (point: [number, number]) => void
}) {
  useMapEvents({
    click: (evt) => {
      if (!enabled || !onAddVertex) return
      onAddVertex([roundCoord(evt.latlng.lat), roundCoord(evt.latlng.lng)])
    },
  })
  return null
}

function InvalidateOnResize() {
  const mapInstance = useMap()
  useEffect(() => {
    const container = mapInstance.getContainer()
    const observer = new ResizeObserver(() => mapInstance.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [mapInstance])
  return null
}

function InitialBoundsController({
  coordinates,
  garrisonPoint,
  subUnitPins,
}: {
  coordinates: Array<[number, number]>
  garrisonPoint?: GarrisonMapPoint | null
  subUnitPins?: ReadonlyArray<SubUnitMapPin>
}) {
  const mapInstance = useMap()

  useEffect(() => {
    const allPoints: Array<[number, number]> = [...coordinates]
    if (garrisonPoint) {
      allPoints.push([garrisonPoint.lat, garrisonPoint.lng])
    }
    if (subUnitPins) {
      for (const pin of subUnitPins) {
        allPoints.push([pin.lat, pin.lng])
      }
    }
    if (allPoints.length >= 2) {
      const bounds = Leaflet.latLngBounds(allPoints)
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 })
      }
    } else if (allPoints.length === 1) {
      mapInstance.setView(allPoints[0], 9)
    }
    // 초기 마운트 시 한 번만 전체 범위를 맞춘다 (편집 중 점 찍을 때 화면이 튀지 않게)
  }, [mapInstance])

  return null
}

function FlyController({
  flyTarget,
}: {
  flyTarget?: { lat: number; lng: number; token: number } | null
}) {
  const mapInstance = useMap()
  useEffect(() => {
    if (!flyTarget || flyTarget.token === 0) return
    mapInstance.flyTo([flyTarget.lat, flyTarget.lng], Math.max(mapInstance.getZoom(), 7), {
      duration: 0.55,
    })
  }, [flyTarget, mapInstance])
  return null
}

function makeVertexIcon(index: number, color: string) {
  return Leaflet.divIcon({
    className: 'papyrus-jurisdiction-vertex',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.38);color:#fff;font-size:9.5px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;">${index + 1}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function makeHqIcon(color: string) {
  return Leaflet.divIcon({
    className: 'papyrus-unit-hq-pin',
    html: `<div style="width:24px;height:24px;border-radius:7px;background:${color};border:2px solid #ffffff;box-shadow:0 2px 6px rgba(15,23,42,0.42);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;">★</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function makeSubUnitIcon(color: string) {
  return Leaflet.divIcon({
    className: 'papyrus-sub-unit-pin',
    html: `<div style="width:18px;height:18px;border-radius:5px;background:#ffffff;border:2px solid ${color};box-shadow:0 1px 4px rgba(15,23,42,0.32);color:${color};font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;">▪</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export default function JurisdictionLeafletCanvas({
  mode,
  geometryType,
  coordinates,
  accentColor = '#2563eb',
  mapLayer,
  garrisonPoint,
  subUnitPins = [],
  flyTarget,
  height,
  onAddVertex,
  onMoveVertex,
  onRemoveVertex,
  onSelectSubUnit,
}: JurisdictionLeafletCanvasProps) {
  const initialCenter: [number, number] = useMemo(() => {
    if (coordinates.length > 0) return coordinates[0]
    if (garrisonPoint) return [garrisonPoint.lat, garrisonPoint.lng]
    if (subUnitPins.length > 0) return [subUnitPins[0].lat, subUnitPins[0].lng]
    return [37.5665, 126.978]
  }, [])

  const initialZoom =
    coordinates.length > 0 || garrisonPoint || subUnitPins.length > 0 ? 7 : 3

  const hqIcon = useMemo(() => makeHqIcon(accentColor), [accentColor])
  const subIcon = useMemo(() => makeSubUnitIcon(accentColor), [accentColor])

  const tileUrl =
    mapLayer === 'hybrid'
      ? 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=ko&gl=KR'
      : 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko&gl=KR'

  return (
    <div
      style={{
        height,
        width: '100%',
        cursor: mode === 'edit' ? 'crosshair' : 'grab',
      }}
    >
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
        worldCopyJump
      >
        <TileLayer
          key={mapLayer}
          attribution="&copy; Google Maps"
          url={tileUrl}
          subdomains={['0', '1', '2', '3']}
        />
        <InvalidateOnResize />
        <InitialBoundsController
          coordinates={coordinates}
          garrisonPoint={garrisonPoint}
          subUnitPins={subUnitPins}
        />
        <FlyController flyTarget={flyTarget} />
        <MapClickHandler enabled={mode === 'edit'} onAddVertex={onAddVertex} />

        {geometryType === 'POLYGON' && coordinates.length >= 3 ? (
          <Polygon
            positions={coordinates}
            pathOptions={{
              color: accentColor,
              weight: 2.5,
              fillColor: accentColor,
              fillOpacity: 0.18,
            }}
          />
        ) : coordinates.length >= 2 ? (
          <Polyline
            positions={coordinates}
            pathOptions={{
              color: accentColor,
              weight: 3,
              dashArray: geometryType === 'LINE' ? '8 5' : undefined,
            }}
          />
        ) : null}

        {garrisonPoint ? (
          <Marker
            position={[garrisonPoint.lat, garrisonPoint.lng]}
            icon={hqIcon}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <strong>본영 · 주둔지</strong>
              {garrisonPoint.label ? `: ${garrisonPoint.label}` : ''}
            </Tooltip>
          </Marker>
        ) : null}

        {mode === 'view' &&
          subUnitPins.map((subPin) => (
            <Marker
              key={subPin.id}
              position={[subPin.lat, subPin.lng]}
              icon={subIcon}
              eventHandlers={
                onSelectSubUnit
                  ? { click: () => onSelectSubUnit(subPin.id) }
                  : undefined
              }
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <strong>
                  {subPin.name}
                  {subPin.abbreviation ? ` (${subPin.abbreviation})` : ''}
                </strong>
                {subPin.garrison ? ` · ${subPin.garrison}` : ''}
              </Tooltip>
            </Marker>
          ))}

        {mode === 'edit' &&
          coordinates.map((coord, idx) => (
            <Marker
              key={`vtx-${idx}`}
              position={coord}
              draggable
              icon={makeVertexIcon(idx, accentColor)}
              eventHandlers={{
                dragend: (dragEvt) => {
                  const latlng = (dragEvt.target as Leaflet.Marker).getLatLng()
                  onMoveVertex?.(idx, [
                    roundCoord(latlng.lat),
                    roundCoord(latlng.lng),
                  ])
                },
                contextmenu: () => {
                  onRemoveVertex?.(idx)
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                지점 {idx + 1} (드래그로 이동 · 우클릭 삭제)
              </Tooltip>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}
