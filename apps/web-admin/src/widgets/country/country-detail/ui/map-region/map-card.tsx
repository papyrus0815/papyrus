import { GoogleMap, type MapMarker } from '@/shared/ui/google-map/google-map'

import { type RegionPalette } from './use-region-palette'

interface MapCardProps {
  palette: RegionPalette
  country: { name: string; latitude?: number | null; longitude?: number | null }
  mapLocation?: { latitude: number; longitude: number; name: string } | null
  /** 좌표가 있을 때 GoogleMap의 zoom — mapLocation이 있으면 가까이, 없으면 국가 단위 */
  zoom?: { withLocation: number; withoutLocation: number }
  /** 다중 핀 모드 — markers가 비어있지 않으면 mapLocation은 무시 */
  markers?: MapMarker[]
  selectedMarkerId?: string | null
  onMarkerClick?: (id: string) => void
}

const DEFAULT_ZOOM = { withLocation: 12, withoutLocation: 6 }

/**
 * 지도 카드 — GoogleMap + 좌표 없을 때의 플레이스홀더.
 *
 * 좌표가 하나도 없으면 320px 빈 박스 대신 *한 줄 안내 스트립*으로 접는다 —
 * 데이터 없는 지도가 리스트·상세를 화면 밖으로 밀어내지 않도록.
 */
export function MapCard({
  palette,
  country,
  mapLocation,
  zoom = DEFAULT_ZOOM,
  markers,
  selectedMarkerId = null,
  onMarkerClick,
}: MapCardProps) {
  const useMarkers = markers && markers.length > 0
  const location = mapLocation ?? {
    latitude: country.latitude ?? 0,
    longitude: country.longitude ?? 0,
    name: country.name,
  }
  const hasCoords = useMarkers
    ? true
    : country.latitude != null && country.longitude != null

  if (!hasCoords) {
    return (
      <section aria-label="지도">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: palette.bgSecondary,
            border: `1px dashed ${palette.border}`,
            borderRadius: 12,
            color: palette.textSecondary,
            fontSize: 12.5,
          }}
        >
          <span aria-hidden>🗺</span>
          <span>
            아직 표시할 좌표가 없습니다 — 구역 상세의 <strong>중심 좌표</strong>
            를 채우면 여기에 지도가 나타납니다.
          </span>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="지도">
      <div
        style={{
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: palette.shadowNone,
          height: 320,
        }}
      >
        <div style={{ height: '100%', minHeight: 320 }}>
          {useMarkers ? (
            <GoogleMap
              markers={markers}
              selectedId={selectedMarkerId}
              onMarkerClick={onMarkerClick}
              zoom={zoom.withLocation}
            />
          ) : (
            <GoogleMap
              latitude={location.latitude}
              longitude={location.longitude}
              name={location.name}
              zoom={mapLocation ? zoom.withLocation : zoom.withoutLocation}
            />
          )}
        </div>
      </div>
    </section>
  )
}
