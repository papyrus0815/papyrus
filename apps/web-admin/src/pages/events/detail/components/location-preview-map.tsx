/**
 * 상세 개요의 작은 위치 지도 — 핀 하나, 조작 없음(누르면 위치 모달이 큰 지도로 연다).
 * 예전엔 핀을 꽂아도 화면엔 '지도'·'Google 지도' 글자 링크뿐이라 꽂은 보람이 보이지 않았다.
 * leaflet이 무거워 핀이 있을 때만 lazy로 싣는다.
 */
import Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'

import { type LatLng } from './location-picker-map'

// Vite에서 기본 마커 아이콘 경로가 깨지는 문제 — 다른 지도 모듈과 같은 패치
delete (Leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
Leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface LocationPreviewMapProps {
  point: LatLng
  height: number
}

export default function LocationPreviewMap({ point, height }: LocationPreviewMapProps) {
  return (
    <div style={{ height, width: '100%', pointerEvents: 'none' }}>
      <MapContainer
        key={`${point.lat},${point.lng}`}
        center={[point.lat, point.lng]}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[point.lat, point.lng]} />
      </MapContainer>
    </div>
  )
}
