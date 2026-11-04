import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiExternalLink, FiMapPin, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent, RADIUS } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { cityApi } from '@/shared/api/city'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { Modal, ModalFooter } from '@/shared/ui/modal'

import { type LatLng } from './location-picker-map'
import { placeQueryFromText } from './location-text.lib'

const LocationPickerMap = lazy(() => import('./location-picker-map'))

/** 위치 이름 칸 상한 — event.location VarChar(255) */
const LOCATION_MAX = 255

export interface LocationValue {
  location: string
  locationLatitude: number | null
  locationLongitude: number | null
  /** 위치 메모 — 장소 이름과 따로 두는 설명(빈 칸이면 null) */
  locationNote: string | null
}

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  initial: { location?: string | null; latitude?: number | null; longitude?: number | null; note?: string | null }
  onSave: (value: LocationValue) => void
}

/** '북위 48.8049°, 동경 2.1204°' — 숫자 두 개보다 어느 반구인지 읽힌다 */
export function formatCoordinate(point: LatLng): string {
  const latitude = `${point.lat >= 0 ? '북위' : '남위'} ${Math.abs(point.lat).toFixed(4)}°`
  const longitude = `${point.lng >= 0 ? '동경' : '서경'} ${Math.abs(point.lng).toFixed(4)}°`
  return `${latitude}, ${longitude}`
}

/** 구글 지도에서 그 점 보기 — 키 없이 쓰는 공개 URL(좌표를 구글에서 받아 저장하지 않는다) */
export function googleMapsUrl(point: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`
}

/**
 * 검색창에 붙여넣은 위·경도 문자열('48.8049, 2.1204', '북위 37.95, 동경 126.67', '48.8049° N, 2.1204° E')을
 * 좌표로 파싱한다. 유효한 위도(-90~90)·경도(-180~180)일 때만 반환한다.
 */
export function parseCoordinateInput(raw: string): LatLng | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const pattern =
    /^(?:(북위|남위)\s*)?([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSns])?\s*[,/\s]\s*(?:(동경|서경)\s*)?([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWew])?$/
  const matched = trimmed.match(pattern)
  if (!matched) return null
  const [, korLatDir, latNumStr, engLatDir, korLngDir, lngNumStr, engLngDir] = matched
  let lat = Number(latNumStr)
  let lng = Number(lngNumStr)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (korLatDir === '남위' || engLatDir?.toUpperCase() === 'S') {
    lat = -Math.abs(lat)
  } else if (korLatDir === '북위' || engLatDir?.toUpperCase() === 'N') {
    lat = Math.abs(lat)
  }
  if (korLngDir === '서경' || engLngDir?.toUpperCase() === 'W') {
    lng = -Math.abs(lng)
  } else if (korLngDir === '동경' || engLngDir?.toUpperCase() === 'E') {
    lng = Math.abs(lng)
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  }
}

/**
 * 사건 위치 고르기 — 장소 검색 → 지도에서 핀 확인·조정 → 이름(설명) 다듬기 → 저장.
 * 예전 '위치 추가'는 글만 적는 칸이라 지도에 찍을 수 없었다(525건 중 85건이 글, 좌표 0건).
 * 글(location)은 그대로 이름·설명으로 남고, 좌표는 대표 한 점이다.
 */
export function LocationPickerModal({ isOpen, onClose, initial, onSave }: LocationPickerModalProps) {
  const [label, setLabel] = useState(initial.location ?? '')
  const [point, setPoint] = useState<LatLng | null>(
    initial.latitude != null && initial.longitude != null ? { lat: initial.latitude, lng: initial.longitude } : null,
  )
  const [flyToken, setFlyToken] = useState(0)
  /*
   * 핀이 없고 위치 글만 있으면 그 글의 첫 장소로 미리 검색한다 — 글만 있는 85건을 한 번 고르기로 채우게.
   * 글이 '잉글랜드 런던 — 서머셋 하우스'처럼 여러 곳·설명을 섞으니 첫 덩어리만(location-text.lib).
   */
  const [query, setQuery] = useState(() =>
    initial.latitude == null && initial.longitude == null ? placeQueryFromText(initial.location) : '',
  )
  const prefilled = query !== '' && query === placeQueryFromText(initial.location)
  const [note, setNote] = useState(initial.note ?? '')
  const [activeIndex, setActiveIndex] = useState(0)
  /** 검색 결과 선택으로 자동 채워진 이름 — 다른 검색 결과를 고르면 새 이름으로 자연스럽게 바꾼다 */
  const autoFilledNameRef = useRef<string | null>(null)
  /** 사용자가 이미 직접 적어 둔 설명이 있을 때, 방금 고른 장소 이름으로 바꿀 수 있는 보조 제안 */
  const [suggestedPlaceName, setSuggestedPlaceName] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query.trim(), 350)
  const parsedCoord = useMemo(() => parseCoordinateInput(query), [query])

  const searchQuery = useQuery({
    queryKey: ['place-search', 'any', debouncedQuery],
    queryFn: () => cityApi.searchPlaces(debouncedQuery, undefined, { anyPlace: true }),
    enabled: isOpen && debouncedQuery.length >= 2 && parsedCoord === null,
    staleTime: 5 * 60_000,
  })
  const results = searchQuery.data ?? []
  const searching =
    parsedCoord === null &&
    query.trim().length >= 2 &&
    (searchQuery.isFetching || query.trim() !== debouncedQuery)

  const handlePick = useCallback((next: LatLng) => setPoint(next), [])

  const applyCoordinateJump = (coord: LatLng) => {
    setPoint(coord)
    setFlyToken((token) => token + 1)
    setQuery('')
    setActiveIndex(0)
  }

  const chooseResult = (result: (typeof results)[number]) => {
    setPoint({ lat: result.lat, lng: result.lng })
    setFlyToken((token) => token + 1)
    const currentTrimmed = label.trim()
    if (!currentTrimmed || currentTrimmed === autoFilledNameRef.current) {
      setLabel(result.shortName)
      autoFilledNameRef.current = result.shortName
      setSuggestedPlaceName(null)
    } else if (currentTrimmed !== result.shortName) {
      setSuggestedPlaceName(result.shortName)
    } else {
      setSuggestedPlaceName(null)
    }
    setQuery('')
    setActiveIndex(0)
  }

  const save = () =>
    onSave({
      location: label.trim(),
      locationLatitude: point?.lat ?? null,
      locationLongitude: point?.lng ?? null,
      locationNote: note.trim() || null,
    })

  const canClearAll = Boolean(
    label.trim() ||
      point ||
      initial.location?.trim() ||
      (initial.latitude != null && initial.longitude != null),
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="사건 위치" subtitle="장소를 찾거나 지도를 눌러 핀을 꽂으세요" maxWidth="720px">
      <Body>
        <SearchBox>
          <FiSearch aria-hidden />
          <SearchInput
            type="search"
            value={query}
            onChange={(changeEvent) => {
              setQuery(changeEvent.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'ArrowDown') {
                if (results.length > 0) {
                  keyEvent.preventDefault()
                  setActiveIndex((prev) => (prev + 1) % results.length)
                }
              } else if (keyEvent.key === 'ArrowUp') {
                if (results.length > 0) {
                  keyEvent.preventDefault()
                  setActiveIndex((prev) => (prev - 1 + results.length) % results.length)
                }
              } else if (keyEvent.key === 'Enter') {
                if (parsedCoord) {
                  keyEvent.preventDefault()
                  applyCoordinateJump(parsedCoord)
                } else if (results.length > 0) {
                  keyEvent.preventDefault()
                  const picked =
                    results[Math.min(activeIndex, results.length - 1)] ?? results[0]
                  if (picked) chooseResult(picked)
                }
              } else if (keyEvent.key === 'Escape' && query) {
                keyEvent.preventDefault()
                setQuery('')
                setActiveIndex(0)
              }
            }}
            placeholder="장소명 또는 위·경도 좌표 입력 — 예: 베르사유 궁전, 워털루, 48.8049, 2.1204"
            aria-label="장소 검색"
            aria-controls="location-search-results"
          />
        </SearchBox>

        {prefilled && <PrefillNote>위치 글의 첫 장소로 찾았습니다 — 맞지 않으면 검색어를 고치세요</PrefillNote>}
        {(query.trim().length >= 2 || parsedCoord !== null) && (
          <Results id="location-search-results" aria-live="polite">
            {parsedCoord && (
              <li>
                <ResultButton
                  type="button"
                  $active
                  onClick={() => applyCoordinateJump(parsedCoord)}
                >
                  <ResultName>좌표로 바로 핀 이동</ResultName>
                  <ResultDetail>{formatCoordinate(parsedCoord)}</ResultDetail>
                </ResultButton>
              </li>
            )}
            {!parsedCoord && searching && results.length === 0 && (
              <ResultNote>찾는 중…</ResultNote>
            )}
            {!parsedCoord && !searching && results.length === 0 && (
              <ResultNote>
                찾지 못했습니다 — 지금 이름이나 영어 이름으로 찾거나, 지도를 직접 누르세요
              </ResultNote>
            )}
            {results.map((result, idx) => (
              <li key={result.placeId}>
                <ResultButton
                  type="button"
                  $active={idx === activeIndex}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => chooseResult(result)}
                >
                  <ResultName>{result.shortName}</ResultName>
                  <ResultDetail>{result.displayName}</ResultDetail>
                </ResultButton>
              </li>
            ))}
          </Results>
        )}

        <MapFrame>
          <Suspense fallback={<MapLoading>지도를 불러오는 중…</MapLoading>}>
            <LocationPickerMap point={point} onPick={handlePick} flyToken={flyToken} height={320} />
          </Suspense>
        </MapFrame>

        <PointLine>
          <FiMapPin aria-hidden />
          {point ? (
            <>
              <span>{formatCoordinate(point)}</span>
              <span aria-hidden>·</span>
              <PlainButton type="button" onClick={() => setPoint(null)}>
                핀 지우기
              </PlainButton>
              <ExternalLink href={googleMapsUrl(point)} target="_blank" rel="noreferrer">
                Google 지도에서 보기 <FiExternalLink aria-hidden />
              </ExternalLink>
            </>
          ) : (
            <span>아직 핀이 없습니다 — 지도를 누르면 꽂히고, 핀은 끌어 옮길 수 있습니다</span>
          )}
        </PointLine>

        <Field>
          <FieldLabelRow>
            <FieldLabel htmlFor="event-location-label">장소 이름</FieldLabel>
            {suggestedPlaceName && suggestedPlaceName !== label.trim() && (
              <ReplaceLabelButton
                type="button"
                onClick={() => {
                  /* 원래 글(여러 곳·설명)은 버리지 않고 메모로 — 메모가 비어 있을 때만 */
                  if (!note.trim() && label.trim()) setNote(label.trim())
                  setLabel(suggestedPlaceName)
                  autoFilledNameRef.current = suggestedPlaceName
                  setSuggestedPlaceName(null)
                }}
              >
                &lsquo;{suggestedPlaceName}&rsquo;(으)로 이름 바꾸기
              </ReplaceLabelButton>
            )}
          </FieldLabelRow>
          <LabelInput
            id="event-location-label"
            value={label}
            onChange={(changeEvent) => {
              setLabel(changeEvent.target.value)
            }}
            maxLength={LOCATION_MAX}
            rows={1}
            placeholder="예: 베르사유 궁전 거울의 방"
          />
          <FieldHint>상세에 크게 서는 이름 — 짧게. 설명·현재 지명·나머지 장소는 아래 메모에 ({label.length}/{LOCATION_MAX})</FieldHint>
        </Field>
        {/*
          * 위치 메모 — 예전엔 한 칸('위치 이름·설명')이라 '옛 수도원 정원이 지금의 테라스가 되었음' 같은 설명문이
          * 장소 이름 자리에 섰다. 메모는 이름 아래 작게 보인다.
          */}
        <Field>
          <FieldLabel htmlFor="event-location-note">위치 메모 (선택)</FieldLabel>
          <LabelInput
            id="event-location-note"
            value={note}
            onChange={(changeEvent) => setNote(changeEvent.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="예: 현 프랑스 이블린주 · 여러 곳이면 나머지 장소(광저우·샤먼·닝보…)"
          />
        </Field>
      </Body>
      <ModalFooter>
        {canClearAll && (
          <ClearLocationButton
            type="button"
            onClick={() =>
              onSave({
                location: '',
                locationLatitude: null,
                locationLongitude: null,
                locationNote: null,
              })
            }
          >
            위치 모두 지우기
          </ClearLocationButton>
        )}
        <SecondaryButton type="button" onClick={onClose}>
          취소
        </SecondaryButton>
        <PrimaryButton type="button" onClick={save}>
          저장
        </PrimaryButton>
      </ModalFooter>
    </Modal>
  )
}

const PrefillNote = styled.p`
  margin: -4px 0 0;
  font-size: 12px;
  color: ${metaText};
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 24px 16px;
  overflow-y: auto;
`

const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.MD};
  color: ${metaText};

  &:focus-within {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 40px;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Results = styled.ul`
  display: flex;
  flex-direction: column;
  max-height: 200px;
  margin: -4px 0 0;
  padding: 4px 0;
  overflow-y: auto;
  list-style: none;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.MD};
`

const ResultNote = styled.li`
  padding: 8px 12px;
  font-size: 12.5px;
  color: ${metaText};
`

const ResultButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  padding: 7px 12px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.06)'
      : 'transparent'};
  text-align: left;
  font: inherit;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    outline: none;
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')};
  }
`

const ResultName = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ResultDetail = styled.span`
  overflow: hidden;
  font-size: 12px;
  color: ${metaText};
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MapFrame = styled.div`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.MD};

  /* 지도 위 확대 버튼이 모달 위로 뜨지 않게 — leaflet 기본 z-index(400~1000)를 이 상자 안에 가둔다 */
  isolation: isolate;
`

const MapLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 320px;
  font-size: 12.5px;
  color: ${metaText};
`

const PointLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    flex-shrink: 0;
    color: ${metaText};
  }
`

const PlainButton = styled.button`
  min-height: 24px;
  padding: 0 2px;
  border: none;
  background: transparent;
  font: inherit;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
`

const ExternalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const FieldLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ReplaceLabelButton = styled.button`
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const LabelInput = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  font-size: 13.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const FieldHint = styled.span`
  font-size: 12px;
  color: ${metaText};
`

const ClearLocationButton = styled.button`
  margin-right: auto;
  min-height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: ${RADIUS.MD};
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.error};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'};
  }
`

const SecondaryButton = styled.button`
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.MD};
  background: transparent;
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const PrimaryButton = styled.button`
  min-height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
`
