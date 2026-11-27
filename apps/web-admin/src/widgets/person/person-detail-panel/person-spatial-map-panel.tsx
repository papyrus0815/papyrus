/**
 * 인물 생애 공간 통합 Google 지도 뷰포트
 * - 출생지 · 사망지 · 묘소/안장지 · 복수 학설(일설) 지점을 탭으로 즉시 전환
 * - 개별 지점: Google 지도(일반/위성), 배율 프리셋, 좌표 복사, Google 거리뷰(Street View), 새 탭 열기
 * - 복수 좌표 보유 시: '전체 동선' 탭에서 출생→사망(→묘소) 다중 마커 및 직선 거리(km) 표시
 */
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'

import {
  FiCheck,
  FiCopy,
  FiExternalLink,
  FiEye,
  FiLayers,
  FiMapPin,
  FiNavigation,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  type GoogleMapLayerMode,
  type PersonPlaceCertainty,
  type PersonPlaceEstimateRole,
  type PersonPlaceRole,
  type PlaceSummary,
  buildPersonPlaceGoogleMapsUrls,
  computeHaversineDistanceKm,
} from '@/shared/lib/person-place-google-map.lib'
import { formatHeadquartersCoordinate } from '@/shared/ui/headquarters-location-field/headquarters-google-map.lib'

import type { TrajectoryPinItem } from './person-trajectory-canvas'

const LazyTrajectoryCanvas = lazy(() => import('./person-trajectory-canvas'))

export interface PersonSpatialStop {
  key: string
  role: PersonPlaceRole
  roleLabel: string
  estimateRole: PersonPlaceEstimateRole
  certainty: PersonPlaceCertainty
  /** 당대 지명 표기 (주 라벨) */
  displayLabel: string
  /** 현대 정본 지명·주소 (보조 라벨) */
  modernSubtitle: string | null
  countryName: string | null
  dateLabel?: string | null
  note?: string | null
  place: PlaceSummary | null
  fallbackLat?: number | null
  fallbackLng?: number | null
}

interface PersonSpatialMapPanelProps {
  personName: string
  stops: PersonSpatialStop[]
  activeStopKey: string
  onSelectStopKey: (key: string) => void
  onClose: () => void
}

const PERSON_ZOOM_PRESETS = [
  { key: 'site', label: '세부·터', zoom: 16 },
  { key: 'city', label: '도시', zoom: 12 },
  { key: 'region', label: '광역', zoom: 7 },
] as const

export const ALL_TRAJECTORY_KEY = '__ALL_TRAJECTORY__'

export const PersonSpatialMapPanel: React.FC<PersonSpatialMapPanelProps> = ({
  personName,
  stops,
  activeStopKey,
  onSelectStopKey,
  onClose,
}) => {
  const [layer, setLayer] = useState<GoogleMapLayerMode>('roadmap')
  const [customZoom, setCustomZoom] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [googleWebKey, setGoogleWebKey] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    import('@/shared/api/place')
      .then(({ placeApi }) => placeApi.getConfig())
      .then((cfg) => {
        if (alive) setGoogleWebKey(cfg.googleMapsWebApiKey)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // 선택 지점이 바뀌면 장소 기본 배율로 리셋
  useEffect(() => {
    setCustomZoom(null)
  }, [activeStopKey])

  const pinnedStops = useMemo(
    () =>
      stops
        .map((s) => {
          const lat = s.place?.latitude ?? s.fallbackLat ?? null
          const lng = s.place?.longitude ?? s.fallbackLng ?? null
          if (
            lat == null ||
            lng == null ||
            !Number.isFinite(Number(lat)) ||
            !Number.isFinite(Number(lng))
          ) {
            return null
          }
          return {
            stop: s,
            lat: Number(lat),
            lng: Number(lng),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [stops],
  )

  const trajectoryPins = useMemo<TrajectoryPinItem[]>(
    () =>
      pinnedStops.map(({ stop, lat, lng }) => {
        const isAlt = stop.estimateRole !== 'PREFERRED'
        const badgeText = isAlt
          ? '?'
          : stop.role === 'BIRTH'
            ? '출'
            : stop.role === 'DEATH'
              ? '몰'
              : stop.role === 'BURIAL'
                ? '묘'
                : '거'
        return {
          id: stop.key,
          kind: isAlt
            ? 'ALTERNATIVE'
            : stop.role === 'BIRTH'
              ? 'BIRTH'
              : stop.role === 'DEATH'
                ? 'DEATH'
                : stop.role === 'BURIAL'
                  ? 'BURIAL'
                  : 'LIFE_EVENT',
          badgeText,
          title: `${stop.roleLabel}: ${stop.displayLabel}`,
          subtitle: stop.modernSubtitle,
          dateLabel: stop.dateLabel ?? null,
          lat,
          lng,
          isAlternative: isAlt,
        }
      }),
    [pinnedStops],
  )

  const preferredOrderedCoords = useMemo(
    () =>
      pinnedStops
        .filter((x) => x.stop.estimateRole === 'PREFERRED')
        .map((x) => ({ lat: x.lat, lng: x.lng })),
    [pinnedStops],
  )

  const totalDistanceKm = useMemo(() => {
    if (preferredOrderedCoords.length < 2) return null
    let sum = 0
    for (let i = 1; i < preferredOrderedCoords.length; i++) {
      sum += computeHaversineDistanceKm(
        preferredOrderedCoords[i - 1],
        preferredOrderedCoords[i],
      )
    }
    return Math.round(sum)
  }, [preferredOrderedCoords])

  const isAllMode =
    activeStopKey === ALL_TRAJECTORY_KEY && trajectoryPins.length >= 2

  const activeStop =
    stops.find((s) => s.key === activeStopKey) ?? stops[0] ?? null

  const mapSpec = useMemo(() => {
    if (!activeStop) return null
    return buildPersonPlaceGoogleMapsUrls({
      place: activeStop.place,
      fallbackLat: activeStop.fallbackLat,
      fallbackLng: activeStop.fallbackLng,
      historicalLabel: activeStop.displayLabel,
      countryName: activeStop.countryName,
      zoom: customZoom ?? undefined,
      layer,
      googleWebApiKey: googleWebKey,
    })
  }, [activeStop, customZoom, layer, googleWebKey])

  if (!activeStop) return null

  const handleCopyCoords = async () => {
    if (mapSpec?.latitude == null || mapSpec?.longitude == null) return
    try {
      await navigator.clipboard?.writeText(
        `${mapSpec.latitude.toFixed(6)}, ${mapSpec.longitude.toFixed(6)}`,
      )
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <PanelWrap aria-label={`${personName} 생애 공간 Google 지도`}>
      <TopBar>
        <StopTabs role="tablist" aria-label="인물 공간 지점 선택">
          {stops.map((stop) => {
            const selected = !isAllMode && stop.key === activeStop.key
            const hasPin =
              (stop.place?.latitude != null && stop.place?.longitude != null) ||
              (stop.fallbackLat != null && stop.fallbackLng != null)
            return (
              <StopTabBtn
                key={stop.key}
                type="button"
                role="tab"
                aria-selected={selected}
                $active={selected}
                $tone={stop.role}
                onClick={() => onSelectStopKey(stop.key)}
              >
                <PinIndicator $pinned={hasPin} $role={stop.role} />
                <span className="role-tag">
                  {stop.roleLabel}
                  {stop.estimateRole === 'ALTERNATIVE'
                    ? '·일설'
                    : stop.estimateRole === 'DISPUTED'
                      ? '·논쟁'
                      : ''}
                </span>
                <span className="place-name">{stop.displayLabel}</span>
              </StopTabBtn>
            )
          })}

          {trajectoryPins.length >= 2 && (
            <StopTabBtn
              type="button"
              role="tab"
              aria-selected={isAllMode}
              $active={isAllMode}
              $tone="ALL"
              onClick={() => onSelectStopKey(ALL_TRAJECTORY_KEY)}
            >
              <FiNavigation size={11} />
              <span className="role-tag">전체 동선</span>
              <span className="place-name">
                {trajectoryPins.length}곳
                {totalDistanceKm != null && totalDistanceKm > 0
                  ? ` · 약 ${totalDistanceKm.toLocaleString()}km`
                  : ''}
              </span>
            </StopTabBtn>
          )}
        </StopTabs>

        <CloseIconBtn
          type="button"
          onClick={onClose}
          title="지도 닫기"
          aria-label="지도 닫기"
        >
          <FiX size={14} />
        </CloseIconBtn>
      </TopBar>

      <ControlStrip>
        <MetaSummary>
          {isAllMode ? (
            <>
              <FiNavigation size={12} />
              <span>
                출생에서 사망·묘소까지 등록 좌표 {trajectoryPins.length}곳 동시 비교
                (핀 클릭 시 Google 지도 전환)
              </span>
            </>
          ) : (
            <>
              <FiMapPin size={12} />
              <strong>{activeStop.displayLabel}</strong>
              {activeStop.modernSubtitle &&
                activeStop.modernSubtitle !== activeStop.displayLabel && (
                  <ModernSub>현 {activeStop.modernSubtitle}</ModernSub>
                )}
              {mapSpec?.latitude != null && mapSpec?.longitude != null ? (
                <CoordCopyBtn
                  type="button"
                  onClick={() => void handleCopyCoords()}
                  title="클릭하여 WGS84 위·경도 복사"
                >
                  <span>
                    {formatHeadquartersCoordinate({
                      lat: mapSpec.latitude,
                      lng: mapSpec.longitude,
                    })}
                  </span>
                  {copied ? <FiCheck size={10.5} /> : <FiCopy size={10} />}
                </CoordCopyBtn>
              ) : (
                <QueryFallbackBadge>지명 검색 모드</QueryFallbackBadge>
              )}
            </>
          )}
        </MetaSummary>

        <ControlsRight>
          <SegmentedGroup role="group" aria-label="지도 레이어">
            <SegmentBtn
              type="button"
              $active={layer === 'roadmap'}
              onClick={() => setLayer('roadmap')}
            >
              일반
            </SegmentBtn>
            <SegmentBtn
              type="button"
              $active={layer === 'hybrid'}
              onClick={() => setLayer('hybrid')}
            >
              <FiLayers size={10.5} />
              위성
            </SegmentBtn>
          </SegmentedGroup>

          {!isAllMode && mapSpec && (
            <>
              <SegmentedGroup role="group" aria-label="지도 배율">
                {PERSON_ZOOM_PRESETS.map((preset) => (
                  <SegmentBtn
                    key={preset.key}
                    type="button"
                    $active={mapSpec.effectiveZoom === preset.zoom}
                    onClick={() => setCustomZoom(preset.zoom)}
                  >
                    {preset.label}
                  </SegmentBtn>
                ))}
              </SegmentedGroup>

              {mapSpec.streetViewUrl && (
                <ExternalMapAnchor
                  href={mapSpec.streetViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Google 거리뷰(Street View)로 현장 보기"
                >
                  <FiEye size={11} />
                  <span>거리뷰</span>
                </ExternalMapAnchor>
              )}

              <ExternalMapAnchor
                href={mapSpec.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="새 탭에서 Google 지도 열기"
              >
                <span>Google 지도</span>
                <FiExternalLink size={11} />
              </ExternalMapAnchor>
            </>
          )}
        </ControlsRight>
      </ControlStrip>

      <ViewportBody>
        {isAllMode ? (
          <Suspense
            fallback={<LoadingBox>생애 동선 지도를 불러오는 중…</LoadingBox>}
          >
            <LazyTrajectoryCanvas
              pins={trajectoryPins}
              onSelectPin={(stopKey) => onSelectStopKey(stopKey)}
              connectChronologically
              layer={layer}
              googleWebApiKey={googleWebKey}
              height={290}
            />
          </Suspense>
        ) : mapSpec ? (
          <iframe
            key={mapSpec.embedUrl}
            title={`${personName} ${activeStop.roleLabel} (${activeStop.displayLabel}) Google 지도`}
            src={mapSpec.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <LoadingBox>표시할 수 있는 위치 정보가 없습니다.</LoadingBox>
        )}
      </ViewportBody>
    </PanelWrap>
  )
}

const PanelWrap = styled.section`
  margin-top: 10px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.11)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(24, 24, 27, 0.85)' : '#ffffff'};
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
`

const StopTabs = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`

const StopTabBtn = styled.button<{ $active: boolean; $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 9px;
  border-radius: 7px;
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.colors.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.09)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.03)'
        : '#ffffff'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : '#4338ca'
      : theme.colors.text.secondary};

  .role-tag {
    font-weight: 700;
  }

  .place-name {
    font-weight: 500;
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const PinIndicator = styled.span<{ $pinned: boolean; $role: string }>`
  width: 6.5px;
  height: 6.5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $pinned, $role }) =>
    !$pinned
      ? '#94a3b8'
      : $role === 'BIRTH'
        ? '#16a34a'
        : $role === 'BURIAL'
          ? '#d97706'
          : '#475569'};
`

const CloseIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ControlStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 12px;
  padding: 6px 11px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.07)'};
`

const MetaSummary = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 0;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }
`

const ModernSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CoordCopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 21px;
  padding: 0 7px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.28)'
        : 'rgba(99, 102, 241, 0.22)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.07)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  font: inherit;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
`

const QueryFallbackBadge = styled.span`
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(15, 23, 42, 0.06)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ControlsRight = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
`

const SegmentedGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 1.5px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
`

const SegmentBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 6.5px;
  border: none;
  border-radius: 4px;
  font: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.25)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : theme.colors.text.secondary};
`

const ExternalMapAnchor = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 6px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.15)'
        : 'rgba(99, 102, 241, 0.08)'};
  }
`

const ViewportBody = styled.div`
  width: 100%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#18181b' : '#f1f5f9'};

  iframe {
    width: 100%;
    height: 280px;
    border: 0;
    display: block;
  }
`

const LoadingBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 240px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
