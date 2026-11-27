/**
 * 인물 다중 공간 지점(출생 · 활동/사건 · 사망 · 묘소 · 일설) 인터랙티브 캔버스
 * - VITE_GOOGLE_MAPS_API_KEY(또는 서버 googleMapsWebApiKey)가 있으면 정식 Google Maps JS SDK(일반/위성 + Geodesic 동선) 렌더링
 * - API 키 미설정 환경에서는 즉시 동작하는 Leaflet 다중 핀 + 동선 폴백으로 자동 전환
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import styled from 'styled-components'

import {
  type GoogleMapLayerMode,
  loadGoogleMapsJsSdk,
} from '@/shared/lib/person-place-google-map.lib'

export type TrajectoryNodeKind =
  | 'BIRTH'
  | 'LIFE_EVENT'
  | 'EVENT'
  | 'DEATH'
  | 'BURIAL'
  | 'ALTERNATIVE'

export interface TrajectoryPinItem {
  id: string
  kind: TrajectoryNodeKind
  badgeText: string
  title: string
  subtitle?: string | null
  dateLabel?: string | null
  lat: number
  lng: number
  isAlternative?: boolean
}

interface PersonTrajectoryCanvasProps {
  pins: TrajectoryPinItem[]
  selectedId?: string | null
  onSelectPin?: (id: string) => void
  connectChronologically?: boolean
  layer?: GoogleMapLayerMode
  googleWebApiKey?: string | null
  height?: number
}

const KIND_COLORS: Record<TrajectoryNodeKind, string> = {
  BIRTH: '#16a34a',
  LIFE_EVENT: '#0ea5e9',
  EVENT: '#4f46e5',
  DEATH: '#475569',
  BURIAL: '#d97706',
  ALTERNATIVE: '#9333ea',
}

function makeDivIcon(pin: TrajectoryPinItem, selected: boolean) {
  const bg = KIND_COLORS[pin.kind] ?? '#4f46e5'
  const size = selected ? 30 : 25
  const border = pin.isAlternative
    ? '2px dashed #ffffff'
    : '2.5px solid #ffffff'
  const shadow = selected
    ? `0 0 0 4px rgba(99, 102, 241, 0.35), 0 4px 10px rgba(15, 23, 42, 0.35)`
    : '0 2px 6px rgba(15, 23, 42, 0.28)'

  return Leaflet.divIcon({
    className: 'papyrus-person-traj-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      background:${bg};
      color:#ffffff;
      border:${border};
      box-shadow:${shadow};
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:11px;
      font-weight:800;
      letter-spacing:-0.02em;
    ">${pin.badgeText}</div>`,
  })
}

function FitBoundsHelper({
  pins,
  selectedId,
}: {
  pins: TrajectoryPinItem[]
  selectedId?: string | null
}) {
  const map = useMap()

  useEffect(() => {
    if (pins.length === 0) return
    if (selectedId) {
      const target = pins.find((p) => p.id === selectedId)
      if (target) {
        map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 7), {
          duration: 0.45,
        })
        return
      }
    }
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 12)
      return
    }
    const bounds = Leaflet.latLngBounds(pins.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [42, 42], maxZoom: 13 })
  }, [map, pins, selectedId])

  return null
}

function OfficialGoogleMultiMap({
  pins,
  selectedId,
  onSelectPin,
  connectChronologically,
  layer,
  apiKey,
  height,
}: Required<
  Pick<
    PersonTrajectoryCanvasProps,
    'pins' | 'connectChronologically' | 'layer' | 'height'
  >
> & {
  apiKey: string
  selectedId?: string | null
  onSelectPin?: (id: string) => void
  onSdkError: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let cleanupMarkers: any[] = []
    let polyline: any = null

    loadGoogleMapsJsSdk(apiKey)
      .then((gmaps) => {
        if (cancelled || !containerRef.current || pins.length === 0) return
        const map = new gmaps.Map(containerRef.current, {
          center: { lat: pins[0].lat, lng: pins[0].lng },
          zoom: pins.length === 1 ? 13 : 6,
          mapTypeId: layer === 'hybrid' ? 'hybrid' : 'roadmap',
          streetViewControl: true,
          mapTypeControl: false,
          fullscreenControl: true,
        })

        const bounds = new gmaps.LatLngBounds()
        cleanupMarkers = pins.map((pin) => {
          bounds.extend({ lat: pin.lat, lng: pin.lng })
          const marker = new gmaps.Marker({
            position: { lat: pin.lat, lng: pin.lng },
            map,
            title: pin.title,
            label: {
              text: pin.badgeText,
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold',
            },
            icon: {
              path: gmaps.SymbolPath.CIRCLE,
              scale: selectedId === pin.id ? 13 : 11,
              fillColor: KIND_COLORS[pin.kind] ?? '#4f46e5',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2.2,
            },
          })
          marker.addListener('click', () => {
            onSelectPin?.(pin.id)
          })
          return marker
        })

        if (connectChronologically) {
          const ordered = pins.filter((p) => !p.isAlternative)
          if (ordered.length >= 2) {
            polyline = new gmaps.Polyline({
              path: ordered.map((p) => ({ lat: p.lat, lng: p.lng })),
              geodesic: true,
              strokeColor: '#4f46e5',
              strokeOpacity: 0.78,
              strokeWeight: 2.8,
              map,
            })
          }
        }

        if (pins.length > 1) {
          map.fitBounds(bounds, 44)
        }
      })
      .catch(() => {
        // SDK 로드 실패 시 상위 폴백
      })

    return () => {
      cancelled = true
      cleanupMarkers.forEach((m) => m.setMap?.(null))
      polyline?.setMap?.(null)
    }
  }, [apiKey, pins, selectedId, onSelectPin, connectChronologically, layer])

  return <div ref={containerRef} style={{ width: '100%', height }} />
}

export default function PersonTrajectoryCanvas({
  pins,
  selectedId = null,
  onSelectPin,
  connectChronologically = true,
  layer = 'roadmap',
  googleWebApiKey = null,
  height = 280,
}: PersonTrajectoryCanvasProps) {
  const [sdkFailed, setSdkFailed] = useState(false)

  const polylinePositions = useMemo(() => {
    if (!connectChronologically) return []
    return pins
      .filter((p) => !p.isAlternative)
      .map((p) => [p.lat, p.lng] as [number, number])
  }, [pins, connectChronologically])

  if (pins.length === 0) return null

  if (googleWebApiKey && !sdkFailed) {
    return (
      <OfficialGoogleMultiMap
        pins={pins}
        selectedId={selectedId}
        onSelectPin={onSelectPin}
        connectChronologically={connectChronologically}
        layer={layer}
        apiKey={googleWebApiKey}
        height={height}
        onSdkError={() => setSdkFailed(true)}
      />
    )
  }

  const tileUrl =
    layer === 'hybrid'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
    <CanvasWrap $height={height}>
      <MapContainer
        center={[pins[0].lat, pins[0].lng]}
        zoom={pins.length === 1 ? 12 : 5}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBoundsHelper pins={pins} selectedId={selectedId} />

        {polylinePositions.length >= 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#4f46e5',
              weight: 2.6,
              opacity: 0.78,
              dashArray: '6 5',
            }}
          />
        )}

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={makeDivIcon(pin, selectedId === pin.id)}
            eventHandlers={{
              click: () => onSelectPin?.(pin.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <strong>{pin.title}</strong>
              {pin.dateLabel ? ` (${pin.dateLabel})` : ''}
            </Tooltip>
            <Popup>
              <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                <strong>{pin.title}</strong>
                {pin.subtitle ? (
                  <div style={{ color: '#64748b', fontSize: 11.5 }}>
                    {pin.subtitle}
                  </div>
                ) : null}
                {pin.dateLabel ? (
                  <div style={{ color: '#475569', marginTop: 2, fontSize: 11 }}>
                    {pin.dateLabel}
                  </div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </CanvasWrap>
  )
}

const CanvasWrap = styled.div<{ $height: number }>`
  position: relative;
  z-index: 0;
  width: 100%;
  height: ${({ $height }) => $height}px;

  .leaflet-container {
    width: 100%;
    height: 100%;
    z-index: 0;
  }
`
