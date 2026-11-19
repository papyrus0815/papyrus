/**
 * 작은 좌표 픽킹용 지도. 클릭 시 onPick(lat, lng).
 * 현재 좌표가 있으면 미리 마커 표시.
 */
import { useEffect } from 'react'

import Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'

// 아이콘 경로 패치 (다른 GoogleMap 모듈에서 이미 했을 수도 있지만 안전하게 재실행)
delete (Leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl
Leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface CoordPickerMapProps {
  /** 현재 좌표 (마커 표시용) */
  lat: number | null
  lng: number | null
  /** 클릭 시 좌표 전달 */
  onPick: (lat: number, lng: number) => void
  /** 좌표 없을 때 fallback 중심 */
  fallbackLat?: number | null
  fallbackLng?: number | null
  height?: number
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click: (event) => {
      onPick(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      )
    },
  })
  return null
}

function MapViewSync({
  lat,
  lng,
  height,
}: {
  lat: number | null
  lng: number | null
  height: number
}) {
  const map = useMap()

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      map.invalidateSize({ animate: false })
    })
    return () => cancelAnimationFrame(rafId)
  }, [map, height])

  useEffect(() => {
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      map.setView([lat, lng], Math.max(map.getZoom(), 9), { animate: true })
    }
  }, [map, lat, lng])

  return null
}

export function CoordPickerMap({
  lat,
  lng,
  onPick,
  fallbackLat,
  fallbackLng,
  height = 220,
}: CoordPickerMapProps) {
  const center: [number, number] = [
    lat ?? fallbackLat ?? 0,
    lng ?? fallbackLng ?? 0,
  ]
  const initialZoom = lat != null && lng != null ? 10 : 4

  return (
    <div
      style={{
        height,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
      }}
    >
      <MapContainer
        center={center}
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; Google Maps"
          url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko&gl=KR"
          subdomains={['0', '1', '2', '3']}
        />
        <ClickHandler onPick={onPick} />
        <MapViewSync lat={lat} lng={lng} height={height} />
        {lat != null && lng != null && <Marker position={[lat, lng]} />}
      </MapContainer>
    </div>
  )
}
