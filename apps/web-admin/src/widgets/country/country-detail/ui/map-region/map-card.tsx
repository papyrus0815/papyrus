import { GoogleMap, type MapMarker } from '@/shared/ui/google-map/google-map'

import * as Styled from '../map-region-section.styles'
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
 * 지도 섹션 — SectionLabel + GoogleMap 카드 + 좌표 없을 때의 플레이스홀더.
 * 3개 뷰가 동일한 구조를 반복하던 부분.
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

  return (
    <section aria-label="지도">
      <Styled.MapRegionSectionLabel>지도</Styled.MapRegionSectionLabel>
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
        {hasCoords ? (
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
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: palette.bgSecondary,
            }}
          >
            <span
              style={{
                color: palette.textSecondary,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              지도 정보가 없습니다
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
