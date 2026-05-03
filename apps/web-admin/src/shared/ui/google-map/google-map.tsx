/**
 * 지도 컴포넌트 (Leaflet + OSM 타일).
 *
 * - 기존 `latitude/longitude/name`: 단일 위치 모드 (호환 유지)
 * - `markers[]`: 다중 핀 모드 — `selectedId`로 강조, `onMarkerClick`으로 선택 이벤트
 * - 둘 다 주면 single은 무시되고 markers 우선
 */
import { useEffect } from 'react'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import MarkerClusterGroup from 'react-leaflet-cluster'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import styled from 'styled-components'

// Leaflet 기본 마커 아이콘 경로 — Vite 환경에서 깨지는 문제 패치
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export interface MapMarker {
  id: string
  latitude: number
  longitude: number
  name: string
}

interface GoogleMapProps {
  /** 단일 위치 모드 — markers가 있으면 무시 */
  latitude?: number
  longitude?: number
  name?: string
  zoom?: number
  /** 다중 핀 모드 */
  markers?: MapMarker[]
  selectedId?: string | null
  onMarkerClick?: (id: string) => void
  /** 다중 모드에서 모든 핀이 보이도록 자동 fit. 기본 true. */
  autoFit?: boolean
}

const MapWrapper = styled.div`
  width: 100%;
  height: 400px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .leaflet-container {
    width: 100%;
    height: 100%;
  }
`

const NoLocationMessage = styled.div`
  width: 100%;
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #9ca3af;
  font-size: 14px;
  gap: 8px;
`

/** 모드 전환·선택 변경 시 지도 시점 동기화 */
function MapSync({
  markers,
  selectedId,
  singleLat,
  singleLng,
  zoom,
  autoFit,
}: {
  markers: MapMarker[]
  selectedId: string | null
  singleLat?: number
  singleLng?: number
  zoom: number
  autoFit: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (markers.length > 0) {
      const sel = selectedId
        ? markers.find((m) => m.id === selectedId)
        : null
      if (sel) {
        map.setView([sel.latitude, sel.longitude], Math.max(zoom, 10), {
          animate: true,
        })
      } else if (autoFit && markers.length > 0) {
        const bounds = L.latLngBounds(
          markers.map((m) => [m.latitude, m.longitude]),
        )
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 })
      }
    } else if (singleLat != null && singleLng != null) {
      map.setView([singleLat, singleLng], zoom, { animate: true })
    }
  }, [map, markers, selectedId, singleLat, singleLng, zoom, autoFit])

  return null
}

export function GoogleMap({
  latitude,
  longitude,
  name,
  zoom = 13,
  markers,
  selectedId = null,
  onMarkerClick,
  autoFit = true,
}: GoogleMapProps) {
  const useMarkers = markers && markers.length > 0
  const hasSingle = !useMarkers && latitude != null && longitude != null

  if (!useMarkers && !hasSingle) {
    return (
      <NoLocationMessage>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            fill="currentColor"
          />
        </svg>
        <div>위치 정보가 없습니다</div>
      </NoLocationMessage>
    )
  }

  // 초기 중심
  const initialCenter: [number, number] = useMarkers
    ? [markers![0]!.latitude, markers![0]!.longitude]
    : [Number(latitude), Number(longitude)]

  return (
    <MapWrapper>
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapSync
          markers={markers ?? []}
          selectedId={selectedId}
          singleLat={hasSingle ? Number(latitude) : undefined}
          singleLng={hasSingle ? Number(longitude) : undefined}
          zoom={zoom}
          autoFit={autoFit}
        />

        {useMarkers ? (
          <MarkerClusterGroup
            chunkedLoading
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
            maxClusterRadius={40}
          >
            {markers!.map((m) => {
              const isSelected = selectedId === m.id
              if (isSelected) {
                return (
                  <Marker
                    key={m.id}
                    position={[m.latitude, m.longitude]}
                    eventHandlers={{
                      click: () => onMarkerClick?.(m.id),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -32]} opacity={0.95}>
                      {m.name}
                    </Tooltip>
                    <Popup>{m.name}</Popup>
                  </Marker>
                )
              }
              return (
                <CircleMarker
                  key={m.id}
                  center={[m.latitude, m.longitude]}
                  radius={6}
                  pathOptions={{
                    color: '#6366f1',
                    fillColor: '#6366f1',
                    fillOpacity: 0.8,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => onMarkerClick?.(m.id),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    {m.name}
                  </Tooltip>
                  <Popup>{m.name}</Popup>
                </CircleMarker>
              )
            })}
          </MarkerClusterGroup>
        ) : (
          hasSingle && (
            <Marker position={[Number(latitude), Number(longitude)]}>
              <Popup>{name}</Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </MapWrapper>
  )
}
