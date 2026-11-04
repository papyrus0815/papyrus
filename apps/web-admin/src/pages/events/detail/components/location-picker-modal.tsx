import { Suspense, lazy, useCallback, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiExternalLink, FiMapPin, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent, RADIUS } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { cityApi } from '@/shared/api/city'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { Modal, ModalFooter } from '@/shared/ui/modal'

import { type LatLng } from './location-picker-map'

const LocationPickerMap = lazy(() => import('./location-picker-map'))

/** 위치 이름 칸 상한 — event.location VarChar(255) */
const LOCATION_MAX = 255

export interface LocationValue {
  location: string
  locationLatitude: number | null
  locationLongitude: number | null
}

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  initial: { location?: string | null; latitude?: number | null; longitude?: number | null }
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
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 350)

  const searchQuery = useQuery({
    queryKey: ['place-search', 'any', debouncedQuery],
    queryFn: () => cityApi.searchPlaces(debouncedQuery, undefined, { anyPlace: true }),
    enabled: isOpen && debouncedQuery.length >= 2,
    staleTime: 5 * 60_000,
  })
  const results = searchQuery.data ?? []
  const searching = query.trim().length >= 2 && (searchQuery.isFetching || query.trim() !== debouncedQuery)

  const handlePick = useCallback((next: LatLng) => setPoint(next), [])

  const chooseResult = (result: (typeof results)[number]) => {
    setPoint({ lat: result.lat, lng: result.lng })
    setFlyToken((token) => token + 1)
    /* 이름이 비어 있을 때만 채운다 — 이미 적어 둔 설명('… (현 튀르키예 이스탄불)')을 덮지 않게 */
    if (!label.trim()) setLabel(result.shortName)
    setQuery('')
  }

  const save = () =>
    onSave({
      location: label.trim(),
      locationLatitude: point?.lat ?? null,
      locationLongitude: point?.lng ?? null,
    })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="사건 위치" subtitle="장소를 찾거나 지도를 눌러 핀을 꽂으세요" maxWidth="720px">
      <Body>
        <SearchBox>
          <FiSearch aria-hidden />
          <SearchInput
            type="search"
            value={query}
            onChange={(changeEvent) => setQuery(changeEvent.target.value)}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'Enter' && results[0]) {
                keyEvent.preventDefault()
                chooseResult(results[0])
              }
            }}
            placeholder="장소 검색 — 예: 베르사유 궁전, 워털루, 콘스탄티노플"
            aria-label="장소 검색"
            aria-controls="location-search-results"
          />
        </SearchBox>

        {query.trim().length >= 2 && (
          <Results id="location-search-results" aria-live="polite">
            {searching && results.length === 0 && <ResultNote>찾는 중…</ResultNote>}
            {!searching && results.length === 0 && (
              <ResultNote>찾지 못했습니다 — 지금 이름이나 영어 이름으로 찾거나, 지도를 직접 누르세요</ResultNote>
            )}
            {results.map((result) => (
              <li key={result.placeId}>
                <ResultButton type="button" onClick={() => chooseResult(result)}>
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
          <FieldLabel htmlFor="event-location-label">위치 이름·설명</FieldLabel>
          <LabelInput
            id="event-location-label"
            value={label}
            onChange={(changeEvent) => setLabel(changeEvent.target.value)}
            maxLength={LOCATION_MAX}
            rows={2}
            placeholder="예: 베르사유 궁전 거울의 방 (현 프랑스 이블린주)"
          />
          <FieldHint>
            여러 곳·넓은 지역이면 대표 지점에 핀을 꽂고, 나머지는 여기에 적으세요 ({label.length}/{LOCATION_MAX})
          </FieldHint>
        </Field>
      </Body>
      <ModalFooter>
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

const ResultButton = styled.button`
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  padding: 7px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    outline: none;
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)')};
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

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
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
