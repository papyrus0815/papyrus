import { useState } from 'react'

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
  /** 선택된 행정구역의 전체 경로 검색어 (예: "경기도 수원시") — 좌표가 없는 구역 선택 시 구글 지도 검색에 사용 */
  selectedDivisionQuery?: string | null
  /** 선택된 행정구역 표시명 */
  selectedDivisionName?: string | null
  onMarkerClick?: (id: string) => void
}

const DEFAULT_ZOOM = { withLocation: 12, withoutLocation: 6 }

export function MapCard({
  palette,
  country,
  mapLocation,
  zoom = DEFAULT_ZOOM,
  markers,
  selectedMarkerId = null,
  selectedDivisionQuery = null,
  selectedDivisionName = null,
  onMarkerClick,
}: MapCardProps) {
  const [viewMode, setViewMode] = useState<'auto' | 'google' | 'pins'>('auto')

  const useMarkers = Boolean(markers && markers.length > 0)
  const hasCountryCoords =
    country.latitude != null &&
    country.longitude != null &&
    Number.isFinite(Number(country.latitude)) &&
    Number.isFinite(Number(country.longitude))
  const hasAnyPinCoords = useMarkers || hasCountryCoords

  const selectedHasPin =
    selectedMarkerId != null &&
    Boolean(markers?.some((m) => m.id === selectedMarkerId))

  // 선택된 행정구역이 있으나 그 구역 자체엔 아직 좌표가 없는 경우 → 구글 지도 검색 모드로 자동 포커스
  const shouldAutoGoogleForUnpinnedSelection =
    viewMode === 'auto' &&
    Boolean(selectedDivisionQuery) &&
    !selectedHasPin &&
    !mapLocation

  const activeMode: 'google' | 'pins' = !hasAnyPinCoords
    ? 'google'
    : viewMode === 'google' || shouldAutoGoogleForUnpinnedSelection
      ? 'google'
      : 'pins'

  const location = mapLocation ?? {
    latitude: country.latitude ?? 0,
    longitude: country.longitude ?? 0,
    name: country.name,
  }

  // Google Maps Embed URL 계산
  const googleEmbedSpec = (() => {
    const searchParams = new URLSearchParams()
    if (mapLocation) {
      const coordStr = `${Number(mapLocation.latitude).toFixed(6)},${Number(mapLocation.longitude).toFixed(6)}`
      searchParams.set('q', coordStr)
      searchParams.set('ll', coordStr)
      searchParams.set('z', '11')
    } else if (selectedDivisionQuery) {
      const q = `${country.name.trim()} ${selectedDivisionQuery.trim()}`
      searchParams.set('q', q)
      searchParams.set('z', '10')
    } else if (hasCountryCoords) {
      const coordStr = `${Number(country.latitude).toFixed(6)},${Number(country.longitude).toFixed(6)}`
      searchParams.set('q', country.name.trim() || coordStr)
      searchParams.set('ll', coordStr)
      searchParams.set('z', '6')
    } else {
      searchParams.set('q', country.name.trim())
      searchParams.set('z', '5')
    }
    searchParams.set('hl', 'ko')
    searchParams.set('output', 'embed')

    const externalQuery = mapLocation
      ? `${Number(mapLocation.latitude).toFixed(6)},${Number(mapLocation.longitude).toFixed(6)}`
      : selectedDivisionQuery
        ? `${country.name.trim()} ${selectedDivisionQuery.trim()}`
        : hasCountryCoords
          ? `${Number(country.latitude).toFixed(6)},${Number(country.longitude).toFixed(6)}`
          : country.name.trim()

    return {
      embedUrl: `https://maps.google.com/maps?${searchParams.toString()}`,
      externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(externalQuery)}`,
    }
  })()

  return (
    <section aria-label="지도">
      <div
        style={{
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: palette.shadowNone,
        }}
      >
        {/* 상단 컨트롤 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px 12px',
            padding: '8px 14px',
            background: palette.bgSecondary,
            borderBottom: `1px solid ${palette.border}`,
            color: palette.textSecondary,
            fontSize: 12,
          }}
        >
          <span>
            {selectedDivisionName ? (
              <>
                선택 구역: <strong style={{ color: palette.textPrimary }}>{selectedDivisionName}</strong>
                {mapLocation ? (
                  <>
                    {' '}
                    · 좌표 ({Number(mapLocation.latitude).toFixed(4)}°,{' '}
                    {Number(mapLocation.longitude).toFixed(4)}°)
                  </>
                ) : (
                  <> · 중심 좌표 미등록 (구글 지도 명칭 검색 포커스)</>
                )}
              </>
            ) : hasAnyPinCoords ? (
              <>
                <strong style={{ color: palette.textPrimary }}>{country.name}</strong>{' '}
                행정구역 지도 · 좌표 보유 핀 {markers?.length ?? 0}곳
              </>
            ) : (
              <>
                구역 중심 좌표가 아직 등록되지 않아{' '}
                <strong style={{ color: palette.textPrimary }}>{country.name}</strong>{' '}
                검색 기준 구글 지도를 표시합니다.
              </>
            )}
          </span>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginLeft: 'auto',
            }}
          >
            {hasAnyPinCoords && (
              <div
                role="tablist"
                aria-label="행정구역 지도 표시 모드"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 2,
                  borderRadius: 7,
                  border: `1px solid ${palette.border}`,
                  background: palette.bg,
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'google'}
                  onClick={() => setViewMode('google')}
                  style={{
                    padding: '3px 9px',
                    border: 'none',
                    borderRadius: 5,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background:
                      activeMode === 'google'
                        ? palette.primarySubtle
                        : 'transparent',
                    color:
                      activeMode === 'google'
                        ? palette.primary
                        : palette.textSecondary,
                  }}
                >
                  구글 지도
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'pins'}
                  onClick={() => setViewMode('pins')}
                  style={{
                    padding: '3px 9px',
                    border: 'none',
                    borderRadius: 5,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background:
                      activeMode === 'pins'
                        ? palette.primarySubtle
                        : 'transparent',
                    color:
                      activeMode === 'pins'
                        ? palette.primary
                        : palette.textSecondary,
                  }}
                >
                  핀 지도 ({markers?.length ?? (hasCountryCoords ? 1 : 0)})
                </button>
              </div>
            )}

            <a
              href={googleEmbedSpec.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '4px 9px',
                borderRadius: 6,
                border: `1px solid ${palette.border}`,
                color: palette.textSecondary,
                fontSize: 11.5,
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Google 지도 크게 보기 ↗
            </a>
          </div>
        </div>

        {/* 지도 뷰포트 */}
        <div style={{ height: 300 }}>
          {activeMode === 'google' ? (
            <iframe
              key={googleEmbedSpec.embedUrl}
              title={`${country.name} 구글 지도`}
              src={googleEmbedSpec.embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              style={{
                width: '100%',
                height: '100%',
                border: 0,
                display: 'block',
              }}
            />
          ) : useMarkers && markers ? (
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
