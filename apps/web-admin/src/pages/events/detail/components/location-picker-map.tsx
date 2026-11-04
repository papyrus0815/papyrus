/**
 * 사건 위치 고르기 지도 — 클릭하면 핀, 핀은 끌어 옮긴다. 검색 결과를 고르면 그 자리로 날아간다.
 * 타일은 국가 지도와 같은 OpenStreetMap(좌표를 DB에 두어도 되는 출처 — 구글 지도 좌표는 30일 넘게 보관 불가).
 * leaflet이 무거워 모달이 열릴 때만 lazy로 싣는다.
 */
import { useEffect, useMemo, useRef } from 'react'

import Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

// Vite에서 기본 마커 아이콘 경로가 깨지는 문제 — 다른 지도 모듈과 같은 패치
delete (Leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
Leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export interface LatLng {
  lat: number
  lng: number
}

interface LocationPickerMapProps {
  point: LatLng | null
  onPick: (point: LatLng) => void
  /** 바뀌면 그 점으로 날아간다 — 검색 결과를 골랐을 때만 올린다(클릭·끌기로는 시점을 흔들지 않게) */
  flyToken: number
  height: number
}

const round = (value: number) => Number(value.toFixed(6))

function ClickToPick({ onPick }: { onPick: (point: LatLng) => void }) {
  useMapEvents({
    click: (clickEvent) => onPick({ lat: round(clickEvent.latlng.lat), lng: round(clickEvent.latlng.lng) }),
  })
  return null
}

function FlyTo({ point, token }: { point: LatLng | null; token: number }) {
  const map = useMap()
  /* token이 바뀔 때만 난다 — point는 ref로 그 순간 값을 읽는다(끌기로 point가 바뀔 때마다 날면 시점이 튄다) */
  const pointRef = useRef(point)
  pointRef.current = point
  useEffect(() => {
    const target = pointRef.current
    if (token === 0 || !target) return
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 11), { duration: 0.6 })
  }, [token, map])
  return null
}

/** 모달 안에서 처음 그릴 때 크기를 0으로 잡아 회색 타일만 남는 문제 — 크기가 정해진 뒤 다시 잰다 */
function InvalidateOnResize() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

export default function LocationPickerMap({ point, onPick, flyToken, height }: LocationPickerMapProps) {
  const markerRef = useRef<Leaflet.Marker>(null)
  /* 처음 시점 — 핀이 있으면 그 자리 가까이, 없으면 세계 */
  const initial = useRef(point)
  const center: [number, number] = initial.current ? [initial.current.lat, initial.current.lng] : [30, 20]
  const zoom = initial.current ? 10 : 2

  const markerEvents = useMemo(
    () => ({
      dragend: () => {
        const position = markerRef.current?.getLatLng()
        if (position) onPick({ lat: round(position.lat), lng: round(position.lng) })
      },
    }),
    [onPick],
  )

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }} scrollWheelZoom worldCopyJump>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPick onPick={onPick} />
        <FlyTo point={point} token={flyToken} />
        <InvalidateOnResize />
        {point && (
          <Marker
            position={[point.lat, point.lng]}
            draggable
            eventHandlers={markerEvents}
            ref={markerRef}
            title="끌어서 옮기기"
          />
        )}
      </MapContainer>
    </div>
  )
}
