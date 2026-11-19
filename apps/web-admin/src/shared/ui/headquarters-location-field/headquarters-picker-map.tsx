/**
 * 청사 · 본부 소재지 핀 선택 지도 (OpenStreetMap + Leaflet)
 * - 클릭하면 핀이 꽂히고, 마커를 드래그해 미세 조정할 수 있다.
 * - 검색 결과나 좌표를 선택해 flyToken이 증가할 때만 부드럽게 시점을 이동한다.
 */
import { useEffect, useMemo, useRef } from 'react'

import Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import type { HeadquartersPoint } from './headquarters-google-map.lib'

delete (Leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl
Leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface HeadquartersPickerMapProps {
  point: HeadquartersPoint | null
  onPick: (point: HeadquartersPoint) => void
  flyToken: number
  height: number
}

const roundCoord = (coordValue: number) => Number(coordValue.toFixed(6))

function ClickToPick({
  onPick,
}: {
  onPick: (point: HeadquartersPoint) => void
}) {
  useMapEvents({
    click: (clickEvent) =>
      onPick({
        lat: roundCoord(clickEvent.latlng.lat),
        lng: roundCoord(clickEvent.latlng.lng),
      }),
  })
  return null
}

function FlyToPoint({
  point,
  token,
}: {
  point: HeadquartersPoint | null
  token: number
}) {
  const mapInstance = useMap()
  const pointRef = useRef(point)
  pointRef.current = point

  useEffect(() => {
    const targetPoint = pointRef.current
    if (token === 0 || !targetPoint) return
    mapInstance.flyTo(
      [targetPoint.lat, targetPoint.lng],
      Math.max(mapInstance.getZoom(), 14),
      { duration: 0.55 },
    )
  }, [token, mapInstance])

  return null
}

function InvalidateOnResize() {
  const mapInstance = useMap()
  useEffect(() => {
    const containerEl = mapInstance.getContainer()
    const resizeObserver = new ResizeObserver(() =>
      mapInstance.invalidateSize(),
    )
    resizeObserver.observe(containerEl)
    return () => resizeObserver.disconnect()
  }, [mapInstance])
  return null
}

export default function HeadquartersPickerMap({
  point,
  onPick,
  flyToken,
  height,
}: HeadquartersPickerMapProps) {
  const markerRef = useRef<Leaflet.Marker>(null)
  const initialPointRef = useRef(point)
  const initialCenter: [number, number] = initialPointRef.current
    ? [initialPointRef.current.lat, initialPointRef.current.lng]
    : [37.5749, 126.9752]
  const initialZoom = initialPointRef.current ? 15 : 3

  const markerEvents = useMemo(
    () => ({
      dragend: () => {
        const position = markerRef.current?.getLatLng()
        if (position) {
          onPick({
            lat: roundCoord(position.lat),
            lng: roundCoord(position.lng),
          })
        }
      },
    }),
    [onPick],
  )

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
        worldCopyJump
      >
        <TileLayer
          attribution="&copy; Google Maps"
          url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko&gl=KR"
          subdomains={['0', '1', '2', '3']}
        />
        <ClickToPick onPick={onPick} />
        <FlyToPoint point={point} token={flyToken} />
        <InvalidateOnResize />
        {point ? (
          <Marker
            position={[point.lat, point.lng]}
            draggable
            eventHandlers={markerEvents}
            ref={markerRef}
            title="드래그하여 청사 위치 미세 조정"
          />
        ) : null}
      </MapContainer>
    </div>
  )
}
