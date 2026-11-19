import { useState } from 'react'

import {
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiMaximize2,
  FiMinimize2,
} from 'react-icons/fi'

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
  /** 기본 뷰포트 높이 (px) — 아틀라스 우측 상단 컴팩트 기본값 230 */
  defaultHeight?: number
}

const DEFAULT_ZOOM = { withLocation: 11, withoutLocation: 6 }

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
  defaultHeight = 230,
}: MapCardProps) {
  const [viewMode, setViewMode] = useState<'auto' | 'google' | 'pins'>('auto')
  const [expanded, setExpanded] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

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

  const mapHeight = expanded ? 380 : defaultHeight

  return (
    <section aria-label="지도">
      <div
        style={{
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: 'none',
        }}
      >
        {/* 상단 컨트롤 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px 10px',
            padding: '7px 12px',
            background: palette.bgSecondary,
            borderBottom: collapsed ? 'none' : `1px solid ${palette.border}`,
            color: palette.textSecondary,
            fontSize: 11.5,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedDivisionName ? (
              <>
                선택 포커스:{' '}
                <strong style={{ color: palette.text }}>
                  {selectedDivisionName}
                </strong>
                {mapLocation ? (
                  <span style={{ opacity: 0.85 }}>
                    {' '}
                    · {Number(mapLocation.latitude).toFixed(4)}°,{' '}
                    {Number(mapLocation.longitude).toFixed(4)}°
                  </span>
                ) : (
                  <span style={{ opacity: 0.85 }}> · 명칭 검색 포커스</span>
                )}
              </>
            ) : hasAnyPinCoords ? (
              <>
                <strong style={{ color: palette.text }}>
                  {country.name}
                </strong>{' '}
                지리 뷰포트 · 좌표 핀{' '}
                <strong style={{ color: palette.primary }}>
                  {markers?.length ?? (hasCountryCoords ? 1 : 0)}
                </strong>
                곳
              </>
            ) : (
              <>
                <strong style={{ color: palette.text }}>
                  {country.name}
                </strong>{' '}
                구글 지도 검색 뷰포트
              </>
            )}
          </span>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 'auto',
            }}
          >
            {!collapsed && hasAnyPinCoords && (
              <div
                role="tablist"
                aria-label="지도 표시 모드"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 2,
                  borderRadius: 6,
                  border: `1px solid ${palette.border}`,
                  background: palette.bg,
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'pins'}
                  onClick={() => setViewMode('pins')}
                  style={{
                    padding: '2px 8px',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontVariantNumeric: 'tabular-nums',
                    background:
                      activeMode === 'pins'
                        ? palette.bgSelected
                        : 'transparent',
                    color:
                      activeMode === 'pins'
                        ? palette.primary
                        : palette.textSecondary,
                  }}
                >
                  핀 지도 ({markers?.length ?? (hasCountryCoords ? 1 : 0)})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === 'google'}
                  onClick={() => setViewMode('google')}
                  style={{
                    padding: '2px 8px',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background:
                      activeMode === 'google'
                        ? palette.bgSelected
                        : 'transparent',
                    color:
                      activeMode === 'google'
                        ? palette.primary
                        : palette.textSecondary,
                  }}
                >
                  구글 지도
                </button>
              </div>
            )}

            {!collapsed && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? '지도 기본 높이로 축소' : '지도 크게 펼치기'}
                aria-label={expanded ? '지도 축소' : '지도 확장'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 24,
                  padding: '0 7px',
                  borderRadius: 5,
                  border: `1px solid ${palette.border}`,
                  background: palette.bg,
                  color: palette.textSecondary,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {expanded ? <FiMinimize2 size={11} /> : <FiMaximize2 size={11} />}
                <span>{expanded ? '축소' : '확장'}</span>
              </button>
            )}

            <a
              href={googleEmbedSpec.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="새 탭에서 Google 지도 열기"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 24,
                padding: '0 7px',
                borderRadius: 5,
                border: `1px solid ${palette.border}`,
                background: palette.bg,
                color: palette.textSecondary,
                fontSize: 11,
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span>외부 지도</span>
              <FiExternalLink size={11} />
            </a>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? '지도 펼치기' : '지도 접기'}
              aria-label={collapsed ? '지도 펼치기' : '지도 접기'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                padding: 0,
                borderRadius: 5,
                border: `1px solid ${palette.border}`,
                background: palette.bg,
                color: palette.textSecondary,
                cursor: 'pointer',
              }}
            >
              {collapsed ? (
                <FiChevronDown size={13} />
              ) : (
                <FiChevronUp size={13} />
              )}
            </button>
          </div>
        </div>

        {/* 지도 뷰포트 */}
        {!collapsed && (
          <div style={{ height: mapHeight }}>
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
                height="100%"
              />
            ) : (
              <GoogleMap
                latitude={location.latitude}
                longitude={location.longitude}
                name={location.name}
                zoom={mapLocation ? zoom.withLocation : zoom.withoutLocation}
                height="100%"
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
