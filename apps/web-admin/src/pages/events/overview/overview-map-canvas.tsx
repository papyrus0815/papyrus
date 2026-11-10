/**
 * 조망 지도의 Leaflet 캔버스 — leaflet이 무거워 '지도' 보기를 열 때만 싣는다(overview-map-panel이 lazy).
 *
 * 핀 = 흰 원 + 묶음 색 테두리 + 번호(전개와 같은 번호). 글자를 색 면 위에 두지 않아 어느 묶음 색에서도 읽힌다.
 * 같은 자리(소수 넷째 자리)에 여럿이면 한 핀에 'N건' — 파리처럼 수십 건이 한 점에 겹쳐 숨지 않게. 누르면 목록.
 */
import 'leaflet/dist/leaflet.css'

import { useEffect, useMemo } from 'react'

import Leaflet from 'leaflet'
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'

export interface MapPin {
  id: string
  number: string
  title: string
  dateLabel: string | null
  lat: number
  lng: number
  color: string
  dimmed: boolean
}

export interface MapVectorFeature {
  id: string
  eventId: string
  geometryType: 'POINT' | 'ARROW' | 'LINE' | 'POLYGON'
  title: string
  description: string | null
  color: string
  sideName: string | null
  deployedUnitName: string | null
  coordinates: Array<[number, number]>
}

interface OverviewMapCanvasProps {
  pins: ReadonlyArray<MapPin>
  features?: ReadonlyArray<MapVectorFeature>
  draftFeature?: MapVectorFeature | null
  onMapClick?: ((lat: number, lng: number) => void) | null
  /** 시간 순으로 잇기 — 핀 순서(전개 번호 순)대로 한 줄 */
  route: boolean
  hotId: string | null
  onOpen: (id: string) => void
  onHover: (id: string | null) => void
  height: number
}

interface PinCluster {
  key: string
  lat: number
  lng: number
  pins: MapPin[]
}

const clusterKey = (pin: MapPin) => `${pin.lat.toFixed(4)},${pin.lng.toFixed(4)}`

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

function computeBearingDeg(fromPt: [number, number], toPt: [number, number]): number {
  const deltaLat = toPt[0] - fromPt[0]
  const deltaLng = (toPt[1] - fromPt[1]) * Math.cos(((fromPt[0] + toPt[0]) / 2) * (Math.PI / 180))
  const angleRad = Math.atan2(deltaLng, deltaLat)
  return (angleRad * 180) / Math.PI
}

function arrowHeadIcon(color: string, bearingDeg: number): Leaflet.DivIcon {
  const html =
    `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;` +
    `transform:rotate(${bearingDeg.toFixed(1)}deg);color:${escapeHtml(color)};` +
    `text-shadow:0 0 2px #fff,0 0 4px #fff;font-size:15px;line-height:1;">▲</div>`
  return Leaflet.divIcon({ html, className: '', iconSize: [18, 18], iconAnchor: [9, 9] })
}

/** 핀 모양 — divIcon HTML(지도 위 DOM이라 styled-components가 닿지 않아 인라인) */
function pinIcon(cluster: PinCluster, hot: boolean): Leaflet.DivIcon {
  const first = cluster.pins[0]
  const many = cluster.pins.length > 1
  const allDimmed = cluster.pins.every((pin) => pin.dimmed)
  const size = hot ? 30 : 24
  const label = many ? `${cluster.pins.length}건` : first.number
  const width = many ? Math.max(size, 14 + label.length * 8) : size
  const html =
    `<span style="display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;` +
    `min-width:${width}px;height:${size}px;padding:0 ${many ? 7 : 0}px;border-radius:${size}px;` +
    `background:#fff;border:3px solid ${first.color};color:#0f172a;font:700 ${hot ? 12 : 11}px/1 system-ui,sans-serif;` +
    `box-shadow:0 0 0 2px rgba(255,255,255,0.9),0 1px 3px rgba(15,23,42,0.35);opacity:${allDimmed ? 0.35 : 1};` +
    `white-space:nowrap">${escapeHtml(label)}</span>`
  return Leaflet.divIcon({ html, className: '', iconSize: [width, size], iconAnchor: [width / 2, size / 2] })
}

/** 핀이 바뀌면 전부 보이게 맞춘다(하나면 그 자리 확대) */
function FitToPins({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  const signature = points.map((point) => point.join(',')).join(';')
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) map.setView(points[0], 8)
    else map.fitBounds(Leaflet.latLngBounds(points), { padding: [36, 36], maxZoom: 9 })
    // 좌표 목록 내용이 같으면 다시 맞추지 않는다(호버로 재렌더될 때 지도가 튀지 않게)
  }, [map, signature])
  return null
}

function MapClickListener({ onMapClick }: { onMapClick?: ((lat: number, lng: number) => void) | null }) {
  useMapEvents({
    click(clickEvent) {
      if (onMapClick) {
        onMapClick(clickEvent.latlng.lat, clickEvent.latlng.lng)
      }
    },
  })
  return null
}

export default function OverviewMapCanvas({
  pins,
  features = [],
  draftFeature = null,
  onMapClick = null,
  route,
  hotId,
  onOpen,
  onHover,
  height,
}: OverviewMapCanvasProps) {
  const clusters = useMemo<PinCluster[]>(() => {
    const byKey = new Map<string, PinCluster>()
    for (const pin of pins) {
      const key = clusterKey(pin)
      const cluster = byKey.get(key) ?? { key, lat: pin.lat, lng: pin.lng, pins: [] }
      cluster.pins.push(pin)
      byKey.set(key, cluster)
    }
    return [...byKey.values()]
  }, [pins])
  const points = useMemo(() => {
    const pinPts = clusters.map((cluster) => [cluster.lat, cluster.lng] as [number, number])
    const featurePts = features.flatMap((feature) => feature.coordinates)
    return [...pinPts, ...featurePts]
  }, [clusters, features])
  const routePoints = useMemo(() => pins.filter((pin) => !pin.dimmed).map((pin) => [pin.lat, pin.lng] as [number, number]), [pins])
  const allFeatures = useMemo(
    () => (draftFeature && draftFeature.coordinates.length > 0 ? [...features, draftFeature] : features),
    [features, draftFeature],
  )

  return (
    <div style={{ height, width: '100%', isolation: 'isolate', cursor: onMapClick ? 'crosshair' : undefined }}>
      <MapContainer
        center={points[0] ?? [48.85, 2.35]}
        zoom={5}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%', borderRadius: 12, cursor: onMapClick ? 'crosshair' : undefined }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPins points={points} />
        <MapClickListener onMapClick={onMapClick} />
        {allFeatures.map((feature) => {
          const metaLine = [feature.sideName, feature.deployedUnitName ? `⚔️ ${feature.deployedUnitName}` : null]
            .filter(Boolean)
            .join(' · ')
          if (feature.geometryType === 'POLYGON' && feature.coordinates.length >= 3) {
            return (
              <Polygon
                key={feature.id}
                positions={feature.coordinates}
                pathOptions={{
                  color: feature.color,
                  fillColor: feature.color,
                  fillOpacity: 0.18,
                  weight: 2,
                  dashArray: '4 4',
                }}
              >
                <Tooltip sticky>
                  <strong>🕸️ {feature.title}</strong>
                  {metaLine && <div>{metaLine}</div>}
                  {feature.description && <div>{feature.description}</div>}
                </Tooltip>
              </Polygon>
            )
          }
          if (feature.geometryType === 'LINE' && feature.coordinates.length >= 2) {
            return (
              <Polyline
                key={feature.id}
                positions={feature.coordinates}
                pathOptions={{
                  color: feature.color,
                  weight: 3,
                  opacity: 0.85,
                  dashArray: '8 6',
                }}
              >
                <Tooltip sticky>
                  <strong>➖ {feature.title}</strong>
                  {metaLine && <div>{metaLine}</div>}
                  {feature.description && <div>{feature.description}</div>}
                </Tooltip>
              </Polyline>
            )
          }
          if (feature.geometryType === 'ARROW' && feature.coordinates.length >= 2) {
            const lastCoord = feature.coordinates[feature.coordinates.length - 1]
            const prevCoord = feature.coordinates[feature.coordinates.length - 2]
            const bearing = computeBearingDeg(prevCoord, lastCoord)
            return (
              <Polyline
                key={feature.id}
                positions={feature.coordinates}
                pathOptions={{
                  color: feature.color,
                  weight: 3.5,
                  opacity: 0.9,
                }}
              >
                <Tooltip sticky>
                  <strong>➔ {feature.title}</strong>
                  {metaLine && <div>{metaLine}</div>}
                  {feature.description && <div>{feature.description}</div>}
                </Tooltip>
                <Marker
                  position={lastCoord}
                  icon={arrowHeadIcon(feature.color, bearing)}
                  interactive={false}
                />
              </Polyline>
            )
          }
          return null
        })}
        {draftFeature &&
          draftFeature.coordinates.map((coord, pointIdx) => (
            <CircleMarker
              key={`draft-pt-${pointIdx}`}
              center={coord}
              radius={5}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: draftFeature.color,
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                점 #{pointIdx + 1}: {coord[0].toFixed(4)}, {coord[1].toFixed(4)}
              </Tooltip>
            </CircleMarker>
          ))}
        {route && routePoints.length >= 2 && (
          <Polyline positions={routePoints} pathOptions={{ color: '#334155', weight: 2, opacity: 0.55, dashArray: '4 6' }} />
        )}
        {clusters.map((cluster) => {
          const hot = cluster.pins.some((pin) => pin.id === hotId)
          const single = cluster.pins.length === 1 ? cluster.pins[0] : null
          return (
            <Marker
              key={cluster.key}
              position={[cluster.lat, cluster.lng]}
              icon={pinIcon(cluster, hot)}
              zIndexOffset={hot ? 1000 : 0}
              eventHandlers={{
                click: () => {
                  if (single) onOpen(single.id)
                },
                mouseover: () => onHover(cluster.pins[0].id),
                mouseout: () => onHover(null),
              }}
              title={single ? `${single.number}. ${single.title}` : `이 자리 ${cluster.pins.length}건`}
              alt={single ? single.title : `${cluster.pins.length}건`}
            >
              {single ? (
                <Tooltip direction="top" offset={[0, -12]}>
                  <strong>
                    {single.number}. {single.title}
                  </strong>
                  {single.dateLabel && <div>{single.dateLabel}</div>}
                </Tooltip>
              ) : (
                <Popup>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
                    {cluster.pins.map((pin) => (
                      <button
                        key={pin.id}
                        type="button"
                        onClick={() => onOpen(pin.id)}
                        style={{
                          display: 'flex',
                          gap: 6,
                          padding: '2px 0',
                          border: 0,
                          background: 'none',
                          font: 'inherit',
                          textAlign: 'left',
                          cursor: 'pointer',
                          opacity: pin.dimmed ? 0.45 : 1,
                        }}
                      >
                        <span style={{ color: pin.color, fontWeight: 700 }}>{pin.number}</span>
                        <span>
                          {pin.title}
                          {pin.dateLabel && <span style={{ color: '#64748b' }}> · {pin.dateLabel}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </Popup>
              )}
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
