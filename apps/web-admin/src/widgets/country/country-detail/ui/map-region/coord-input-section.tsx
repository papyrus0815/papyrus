/**
 * 좌표 입력 공용 섹션 — 위도/경도 입력 + 지도 클릭 피커(CoordPickerMap) + 이름 기반 좌표 자동 검색.
 * 행정구역·자연지리·인프라 등록/수정 모달에서 공통 사용한다.
 */
import { useState } from 'react'

import { FiMapPin } from 'react-icons/fi'

import { type PlaceSearchResult, cityApi } from '@/shared/api/city'
import { CoordPickerMap } from '@/shared/ui/google-map/coord-picker-map'
import { notify } from '@/shared/ui/toast'

import {
  ErrorText,
  Field,
  FieldFull,
  HintText,
  Input,
  Label,
} from './form-fields'
import type { RegionPalette } from './use-region-palette'

interface CoordInputSectionProps {
  palette: RegionPalette
  lat: string
  lng: string
  onChangeLat: (value: string) => void
  onChangeLng: (value: string) => void
  onPickCoords: (lat: string, lng: string) => void
  latError?: string
  lngError?: string
  /** 이름 기반 자동 검색 시 사용할 질의어 (예: 행정구역명, 산/강/공항명) */
  searchQuery: string
  countryIsoCode?: string
  fallbackLat?: number | null
  fallbackLng?: number | null
  latInputId?: string
  lngInputId?: string
  latLabel?: string
  lngLabel?: string
}

export function CoordInputSection({
  palette,
  lat,
  lng,
  onChangeLat,
  onChangeLng,
  onPickCoords,
  latError,
  lngError,
  searchQuery,
  countryIsoCode,
  fallbackLat = null,
  fallbackLng = null,
  latInputId = 'coord-lat',
  lngInputId = 'coord-lng',
  latLabel = '위도',
  lngLabel = '경도',
}: CoordInputSectionProps) {
  const [autoFilling, setAutoFilling] = useState(false)
  const [coordCandidates, setCoordCandidates] = useState<
    PlaceSearchResult[] | null
  >(null)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [mapPickerLarge, setMapPickerLarge] = useState(false)

  const trimmedQuery = searchQuery.trim()

  const handleAutofillCoords = async () => {
    if (!trimmedQuery) {
      notify.error('이름을 먼저 입력하세요')
      return
    }
    setAutoFilling(true)
    try {
      const results = await cityApi.searchPlaces(trimmedQuery, countryIsoCode)
      if (results.length === 0) {
        notify.error(`"${trimmedQuery}" 위치를 찾을 수 없습니다`)
        return
      }
      setCoordCandidates(results.slice(0, 5))
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '좌표 검색에 실패했습니다',
      )
    } finally {
      setAutoFilling(false)
    }
  }

  const pickCandidate = (hit: PlaceSearchResult) => {
    onPickCoords(hit.lat.toFixed(6), hit.lng.toFixed(6))
    notify.success(`좌표 채움: ${hit.shortName}`)
    setCoordCandidates(null)
  }

  const parsedLat = lat.trim() === '' ? null : Number(lat)
  const parsedLng = lng.trim() === '' ? null : Number(lng)

  return (
    <>
      <FieldFull>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Label as="span">중심 좌표</Label>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setMapPickerOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${palette.primary}`,
                color: mapPickerOpen ? '#ffffff' : palette.primary,
                background: mapPickerOpen ? palette.primary : 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {mapPickerOpen ? '지도 닫기' : '🗺 지도에서 선택'}
            </button>
            <button
              type="button"
              onClick={handleAutofillCoords}
              disabled={autoFilling || !trimmedQuery}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${palette.primary}`,
                color: palette.primary,
                background: 'transparent',
                borderRadius: 8,
                cursor:
                  autoFilling || !trimmedQuery ? 'not-allowed' : 'pointer',
                opacity: autoFilling || !trimmedQuery ? 0.5 : 1,
              }}
            >
              <FiMapPin size={11} />
              {autoFilling ? '검색 중…' : '이름으로 자동 채우기'}
            </button>
          </div>
        </div>

        {mapPickerOpen && (
          <div>
            <CoordPickerMap
              lat={
                parsedLat != null && Number.isFinite(parsedLat)
                  ? parsedLat
                  : null
              }
              lng={
                parsedLng != null && Number.isFinite(parsedLng)
                  ? parsedLng
                  : null
              }
              onPick={(pickedLat, pickedLng) => {
                onPickCoords(String(pickedLat), String(pickedLng))
              }}
              fallbackLat={fallbackLat}
              fallbackLng={fallbackLng}
              height={mapPickerLarge ? 420 : 220}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setMapPickerLarge((prev) => !prev)}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 500,
                  border: 'none',
                  background: 'transparent',
                  color: palette.primary,
                  cursor: 'pointer',
                }}
              >
                {mapPickerLarge ? '⤢ 작게' : '⤡ 크게'}
              </button>
            </div>
          </div>
        )}

        <HintText>
          지도를 클릭하거나 이름으로 검색해 위·경도를 자동으로 채울 수 있습니다.
        </HintText>

        {coordCandidates && coordCandidates.length > 0 && (
          <div
            style={{
              marginTop: 6,
              border: `1px solid ${palette.borderMedium}`,
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '6px 12px',
                background: palette.bgHover,
                fontSize: 11,
                fontWeight: 600,
                color: palette.textSecondary,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>후보를 선택하세요</span>
              <button
                type="button"
                onClick={() => setCoordCandidates(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 11,
                  color: palette.textSecondary,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
            </div>
            {coordCandidates.map((hit) => (
              <button
                key={hit.placeId}
                type="button"
                onClick={() => pickCandidate(hit)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  borderTop: `1px solid ${palette.divider}`,
                  background: palette.bg,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = palette.bgHover
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = palette.bg
                }}
              >
                <div style={{ fontWeight: 600, color: palette.text }}>
                  {hit.shortName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: palette.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {hit.displayName} ({hit.lat.toFixed(4)}, {hit.lng.toFixed(4)})
                </div>
              </button>
            ))}
          </div>
        )}
      </FieldFull>

      <Field>
        <Label htmlFor={latInputId}>{latLabel}</Label>
        <Input
          id={latInputId}
          type="number"
          step="0.0000001"
          value={lat}
          onChange={(event) => onChangeLat(event.target.value)}
          placeholder="-90 ~ 90"
        />
        {latError && <ErrorText>{latError}</ErrorText>}
      </Field>
      <Field>
        <Label htmlFor={lngInputId}>{lngLabel}</Label>
        <Input
          id={lngInputId}
          type="number"
          step="0.0000001"
          value={lng}
          onChange={(event) => onChangeLng(event.target.value)}
          placeholder="-180 ~ 180"
        />
        {lngError && <ErrorText>{lngError}</ErrorText>}
      </Field>
    </>
  )
}
