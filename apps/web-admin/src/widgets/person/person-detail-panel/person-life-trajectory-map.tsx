/**
 * 인물 생애 여정 지도 (Life Trajectory Atlas) — 사건·연보 탭
 * - 출생지(BIRTH) -> 연보(PersonLifeEvent.place) -> 참여 사건(Event.locationLatitude) -> 사망지(DEATH) -> 묘소(BURIAL)
 *   전 주기의 공간 지점을 시간순으로 엮어 지도에 표시하고, 선택한 지점을 Google 지도(일반/위성/거리뷰)로 검토한다.
 */
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'

import {
  FiExternalLink,
  FiEye,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiNavigation,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { PersonLifeEvent } from '@/shared/api/person-life-events'
import {
  type GoogleMapLayerMode,
  type PlaceSummary,
  buildPersonPlaceGoogleMapsUrls,
  computeHaversineDistanceKm,
} from '@/shared/lib/person-place-google-map.lib'

import type { TrajectoryPinItem, TrajectoryNodeKind } from './person-trajectory-canvas'
import type { PersonDetailData } from './types'

const LazyTrajectoryCanvas = lazy(() => import('./person-trajectory-canvas'))

export interface TrajectoryStopEntry {
  id: string
  kind: TrajectoryNodeKind
  badgeText: string
  categoryLabel: string
  title: string
  placeLabel: string
  dateLabel: string | null
  sortYear: number | null
  lat: number
  lng: number
  place?: PlaceSummary | null
  linkedEventId?: string | null
}

function parseYearFromIsoLike(iso?: string | Date | null): number | null {
  if (!iso) return null
  const str = typeof iso === 'string' ? iso : iso.toISOString()
  const m = str.match(/^(-?\d{1,6})-/)
  return m ? Number(m[1]) : null
}

export function derivePersonLifeTrajectoryStops(params: {
  person: PersonDetailData
  birthDateStr: string
  deathDateStr: string
  lifeEvents?: PersonLifeEvent[]
}): TrajectoryStopEntry[] {
  const { person: p, birthDateStr, deathDateStr, lifeEvents = [] } = params
  const stops: TrajectoryStopEntry[] = []

  // 1. 출생지
  const birthRec = (p.places ?? []).find(
    (r) => r.role === 'BIRTH' && r.estimateRole === 'PREFERRED',
  )
  const birthPlaceObj = birthRec?.place ?? p.birthPlace ?? null
  const birthLat =
    birthPlaceObj?.latitude ??
    p.birthCity?.latitude ??
    p.birthAdminDivision?.centerLat ??
    null
  const birthLng =
    birthPlaceObj?.longitude ??
    p.birthCity?.longitude ??
    p.birthAdminDivision?.centerLng ??
    null
  if (birthLat != null && birthLng != null) {
    const birthLabel =
      birthRec?.historicalLabel ||
      p.birthPlaceHistoricalLabel ||
      birthPlaceObj?.name ||
      p.birthPlaceText ||
      '출생지'
    const birthSignedYear =
      p.birthYear != null
        ? p.birthEra === 'BC'
          ? -p.birthYear
          : p.birthYear
        : null
    stops.push({
      id: 'traj-birth',
      kind: 'BIRTH',
      badgeText: '출',
      categoryLabel: '출생',
      title: birthLabel,
      placeLabel: birthPlaceObj?.name ?? birthLabel,
      dateLabel: birthDateStr || null,
      sortYear: birthSignedYear,
      lat: Number(birthLat),
      lng: Number(birthLng),
      place: birthPlaceObj,
    })
  }

  // 2. 연보 및 참여 사건 (중간 생애 지점)
  const middleStops: Omit<TrajectoryStopEntry, 'badgeText'>[] = []
  const seenEventIds = new Set<string>()

  for (const le of lifeEvents) {
    const placeLat = le.place?.latitude ?? le.event?.locationLatitude ?? null
    const placeLng = le.place?.longitude ?? le.event?.locationLongitude ?? null
    if (placeLat == null || placeLng == null) continue
    if (le.event?.id) seenEventIds.add(le.event.id)
    const label =
      le.placeHistoricalLabel ||
      le.place?.name ||
      le.event?.location ||
      le.title
    middleStops.push({
      id: `traj-le-${le.id}`,
      kind: 'LIFE_EVENT',
      categoryLabel: '연보',
      title: le.title,
      placeLabel: label,
      dateLabel: le.startDate ? le.startDate.slice(0, 10) : null,
      sortYear: parseYearFromIsoLike(le.startDate),
      lat: Number(placeLat),
      lng: Number(placeLng),
      place: le.place ?? null,
      linkedEventId: le.event?.id ?? null,
    })
  }

  const rawPersonEvents = ((p as any).events ?? []) as Array<{
    id?: string
    role?: string | null
    event?: {
      id: string
      title: string
      startEra?: string | null
      startYear?: number | null
      startDate?: string | null
      location?: string | null
      locationLatitude?: number | null
      locationLongitude?: number | null
    } | null
  }>

  for (const pe of rawPersonEvents) {
    const ev = pe.event
    if (!ev || seenEventIds.has(ev.id)) continue
    if (ev.locationLatitude == null || ev.locationLongitude == null) continue
    const signedYear =
      ev.startYear != null
        ? ev.startEra === 'BC'
          ? -ev.startYear
          : ev.startYear
        : parseYearFromIsoLike(ev.startDate)
    middleStops.push({
      id: `traj-ev-${ev.id}`,
      kind: 'EVENT',
      categoryLabel: '사건',
      title: ev.title,
      placeLabel: ev.location || ev.title,
      dateLabel: signedYear != null ? `${signedYear < 0 ? `BC ${Math.abs(signedYear)}` : signedYear}년` : null,
      sortYear: signedYear,
      lat: Number(ev.locationLatitude),
      lng: Number(ev.locationLongitude),
      place: null,
      linkedEventId: ev.id,
    })
  }

  middleStops.sort((a, b) => {
    if (a.sortYear == null && b.sortYear == null) return 0
    if (a.sortYear == null) return 1
    if (b.sortYear == null) return -1
    return a.sortYear - b.sortYear
  })

  middleStops.forEach((m, idx) => {
    stops.push({
      ...m,
      badgeText: String(idx + 1),
    })
  })

  // 3. 사망지
  const deathRec = (p.places ?? []).find(
    (r) => r.role === 'DEATH' && r.estimateRole === 'PREFERRED',
  )
  const deathPlaceObj = deathRec?.place ?? p.deathPlace ?? null
  const deathLat =
    deathPlaceObj?.latitude ??
    p.deathCity?.latitude ??
    p.deathAdminDivision?.centerLat ??
    null
  const deathLng =
    deathPlaceObj?.longitude ??
    p.deathCity?.longitude ??
    p.deathAdminDivision?.centerLng ??
    null
  if (deathLat != null && deathLng != null) {
    const deathLabel =
      deathRec?.historicalLabel ||
      p.deathPlaceHistoricalLabel ||
      deathPlaceObj?.name ||
      p.deathPlaceText ||
      '사망지'
    const deathSignedYear =
      p.deathYear != null
        ? p.deathEra === 'BC'
          ? -p.deathYear
          : p.deathYear
        : null
    stops.push({
      id: 'traj-death',
      kind: 'DEATH',
      badgeText: '몰',
      categoryLabel: '사망',
      title: deathLabel,
      placeLabel: deathPlaceObj?.name ?? deathLabel,
      dateLabel: deathDateStr || null,
      sortYear: deathSignedYear,
      lat: Number(deathLat),
      lng: Number(deathLng),
      place: deathPlaceObj,
    })
  }

  // 4. 묘소·안장지
  const burialRec = (p.places ?? []).find(
    (r) => r.role === 'BURIAL' && r.estimateRole === 'PREFERRED',
  )
  const burialPlaceObj = burialRec?.place ?? p.burialPlace ?? null
  if (burialPlaceObj?.latitude != null && burialPlaceObj?.longitude != null) {
    const burialLabel =
      burialRec?.historicalLabel ||
      p.burialPlaceHistoricalLabel ||
      burialPlaceObj.name
    stops.push({
      id: 'traj-burial',
      kind: 'BURIAL',
      badgeText: '묘',
      categoryLabel: '묘소·안장',
      title: burialLabel,
      placeLabel: burialPlaceObj.name,
      dateLabel: null,
      sortYear: null,
      lat: Number(burialPlaceObj.latitude),
      lng: Number(burialPlaceObj.longitude),
      place: burialPlaceObj,
    })
  }

  return stops
}

interface PersonLifeTrajectoryMapProps {
  personName: string
  stops: TrajectoryStopEntry[]
  onEventClick?: (eventId: string) => void
}

export const PersonLifeTrajectoryMap: React.FC<
  PersonLifeTrajectoryMapProps
> = ({ personName, stops, onEventClick }) => {
  const [selectedId, setSelectedId] = useState<string>(stops[0]?.id ?? '')
  const [layer, setLayer] = useState<GoogleMapLayerMode>('roadmap')
  const [showGoogleFocus, setShowGoogleFocus] = useState(true)
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

  useEffect(() => {
    if (!stops.some((s) => s.id === selectedId) && stops[0]) {
      setSelectedId(stops[0].id)
    }
  }, [stops, selectedId])

  const pins = useMemo<TrajectoryPinItem[]>(
    () =>
      stops.map((s) => ({
        id: s.id,
        kind: s.kind,
        badgeText: s.badgeText,
        title: `${s.categoryLabel}: ${s.title}`,
        subtitle: s.placeLabel !== s.title ? s.placeLabel : null,
        dateLabel: s.dateLabel,
        lat: s.lat,
        lng: s.lng,
      })),
    [stops],
  )

  const totalKm = useMemo(() => {
    if (stops.length < 2) return 0
    let acc = 0
    for (let i = 1; i < stops.length; i++) {
      acc += computeHaversineDistanceKm(
        { lat: stops[i - 1].lat, lng: stops[i - 1].lng },
        { lat: stops[i].lat, lng: stops[i].lng },
      )
    }
    return Math.round(acc)
  }, [stops])

  const selectedStop = stops.find((s) => s.id === selectedId) ?? stops[0] ?? null

  const googleSpec = useMemo(() => {
    if (!selectedStop) return null
    return buildPersonPlaceGoogleMapsUrls({
      place: selectedStop.place,
      fallbackLat: selectedStop.lat,
      fallbackLng: selectedStop.lng,
      historicalLabel: selectedStop.placeLabel,
      layer,
      googleWebApiKey: googleWebKey,
    })
  }, [selectedStop, layer, googleWebKey])

  if (stops.length === 0) return null

  return (
    <AtlasCard aria-label={`${personName} 생애 여정 지도`}>
      <AtlasHeader>
        <HeaderLeft>
          <FiNavigation size={13} />
          <strong>생애 공간 궤적 {stops.length}곳</strong>
          {totalKm > 0 && (
            <DistanceTag>총 직선 이동 약 {totalKm.toLocaleString()}km</DistanceTag>
          )}
        </HeaderLeft>

        <HeaderControls>
          <ToggleGroup>
            <ToggleChip
              type="button"
              $active={layer === 'roadmap'}
              onClick={() => setLayer('roadmap')}
            >
              일반
            </ToggleChip>
            <ToggleChip
              type="button"
              $active={layer === 'hybrid'}
              onClick={() => setLayer('hybrid')}
            >
              <FiLayers size={10.5} />
              위성
            </ToggleChip>
          </ToggleGroup>

          <ToggleChip
            type="button"
            $active={showGoogleFocus}
            onClick={() => setShowGoogleFocus((v) => !v)}
          >
            <FiGlobe size={11} />
            <span>{showGoogleFocus ? '선택 지점 Google 지도 켜짐' : '선택 지점 Google 지도 보기'}</span>
          </ToggleChip>
        </HeaderControls>
      </AtlasHeader>

      <AtlasBody $withFocus={showGoogleFocus}>
        <Suspense fallback={<FallbackBox>여정 지도를 불러오는 중…</FallbackBox>}>
          <LazyTrajectoryCanvas
            pins={pins}
            selectedId={selectedStop?.id ?? null}
            onSelectPin={(id) => setSelectedId(id)}
            connectChronologically
            layer={layer}
            googleWebApiKey={googleWebKey}
            height={320}
          />
        </Suspense>

        {showGoogleFocus && selectedStop && googleSpec && (
          <GoogleFocusPane>
            <FocusHeader>
              <div>
                <FocusTitle>{selectedStop.title}</FocusTitle>
                <FocusMeta>
                  {selectedStop.categoryLabel}
                  {selectedStop.dateLabel ? ` · ${selectedStop.dateLabel}` : ''}
                </FocusMeta>
              </div>
              <FocusLinks>
                {googleSpec.streetViewUrl && (
                  <SmallExtLink
                    href={googleSpec.streetViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FiEye size={11} />
                    거리뷰
                  </SmallExtLink>
                )}
                <SmallExtLink
                  href={googleSpec.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google 지도
                  <FiExternalLink size={10.5} />
                </SmallExtLink>
              </FocusLinks>
            </FocusHeader>
            <iframe
              key={googleSpec.embedUrl}
              title={`${selectedStop.title} Google 지도`}
              src={googleSpec.embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </GoogleFocusPane>
        )}
      </AtlasBody>

      <StopSequenceStrip role="list" aria-label="시간순 생애 지점 목록">
        {stops.map((stop) => {
          const active = stop.id === selectedStop?.id
          return (
            <StopPill
              key={stop.id}
              type="button"
              $active={active}
              $kind={stop.kind}
              onClick={() => setSelectedId(stop.id)}
              onDoubleClick={() => {
                if (stop.linkedEventId && onEventClick) {
                  onEventClick(stop.linkedEventId)
                }
              }}
            >
              <BadgeCircle $kind={stop.kind}>{stop.badgeText}</BadgeCircle>
              <StopPillBody>
                <span className="title">{stop.title}</span>
                {stop.dateLabel && <span className="date">{stop.dateLabel}</span>}
              </StopPillBody>
              <FiMapPin size={11} className="pin-ic" />
            </StopPill>
          )
        })}
      </StopSequenceStrip>
    </AtlasCard>
  )
}

const AtlasCard = styled.div`
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(24, 24, 27, 0.85)' : '#ffffff'};
`

const AtlasHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
`

const HeaderLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DistanceTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.16)'
      : 'rgba(99, 102, 241, 0.08)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
`

const HeaderControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const ToggleGroup = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
`

const ToggleChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 23px;
  padding: 0 8px;
  border-radius: 5px;
  border: none;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.1)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : '#4338ca'
      : theme.colors.text.secondary};
`

const AtlasBody = styled.div<{ $withFocus: boolean }>`
  display: grid;
  grid-template-columns: ${({ $withFocus }) =>
    $withFocus ? 'minmax(0, 1.15fr) minmax(0, 1fr)' : '1fr'};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

const GoogleFocusPane = styled.div`
  display: flex;
  flex-direction: column;
  border-left: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};

  iframe {
    width: 100%;
    height: 274px;
    border: 0;
    display: block;
  }
`

const FocusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  min-height: 46px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.07)'};
`

const FocusTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const FocusMeta = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FocusLinks = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const SmallExtLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  text-decoration: none;
  white-space: nowrap;
`

const FallbackBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 320px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const StopSequenceStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
`

const StopPill = styled.button<{ $active: boolean; $kind: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 8px;
  flex-shrink: 0;
  cursor: pointer;
  font: inherit;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.colors.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.09)'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.07)'
      : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};

  .pin-ic {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const BadgeCircle = styled.span<{ $kind: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
  background: ${({ $kind }) =>
    $kind === 'BIRTH'
      ? '#16a34a'
      : $kind === 'DEATH'
        ? '#475569'
        : $kind === 'BURIAL'
          ? '#d97706'
          : '#4f46e5'};
`

const StopPillBody = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.25;

  .title {
    font-size: 11.5px;
    font-weight: 600;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .date {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
