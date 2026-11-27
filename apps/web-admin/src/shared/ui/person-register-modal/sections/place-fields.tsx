/**
 * 인물 등록/수정 폼의 출생지 · 사망지 · 묘소/안장지 입력 (생애 상세 영역).
 * - 범용 장소 정본(Place) 검색 + Google 지도 URL·좌표 붙여넣기 + 핀 피커 모달(HeadquartersPinPickerModal) 지원
 * - 당대 지명 표기(historicalLabel)와 현대 정본 위치(Place)를 분리 기록
 * - 인라인 Google 지도(일반/위성) 미리보기 지원
 */
import React, { useState } from 'react'

import { FiCopy, FiMapPin } from 'react-icons/fi'
import styled from 'styled-components'

import { placeApi } from '@/shared/api/place'
import {
  HeadquartersMapPreview,
  HeadquartersPinPickerModal,
} from '@/shared/ui/headquarters-location-field'
import {
  PlaceSelect as PlaceAutocomplete,
  type PlaceHistoryEntry,
  type PlaceResult,
} from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import { FONT, RADIUS } from '../_form-primitives'

export interface PlaceFieldsProps {
  /** 출생지/사망지 자동완성의 국가 스코프 */
  countryId: string
  birthPlace: PlaceResult | null
  deathPlace: PlaceResult | null
  burialPlace?: PlaceResult | null
  birthHistoricalLabel?: string
  deathHistoricalLabel?: string
  burialHistoricalLabel?: string
  burialNote?: string
  setBirthPlace: (p: PlaceResult | null) => void
  setDeathPlace: (p: PlaceResult | null) => void
  setBurialPlace?: (p: PlaceResult | null) => void
  setBirthHistoricalLabel?: (v: string) => void
  setDeathHistoricalLabel?: (v: string) => void
  setBurialHistoricalLabel?: (v: string) => void
  setBurialNote?: (v: string) => void
  setBirthCityId: (id: string) => void
  setDeathCityId: (id: string) => void
  onCopyBirthToDeathPlace: () => void
  markDirty: () => void
  placeHistory?: ReadonlyArray<PlaceHistoryEntry>
  onPlaceListOpen?: () => void
}

type ActivePickerRole = 'birth' | 'death' | 'burial' | null

export function PlaceFields({
  countryId,
  birthPlace,
  deathPlace,
  burialPlace = null,
  birthHistoricalLabel = '',
  deathHistoricalLabel = '',
  burialHistoricalLabel = '',
  burialNote = '',
  setBirthPlace,
  setDeathPlace,
  setBurialPlace,
  setBirthHistoricalLabel,
  setDeathHistoricalLabel,
  setBurialHistoricalLabel,
  setBurialNote,
  setBirthCityId,
  setDeathCityId,
  onCopyBirthToDeathPlace,
  markDirty,
  placeHistory,
  onPlaceListOpen,
}: PlaceFieldsProps) {
  const [pickerRole, setPickerRole] = useState<ActivePickerRole>(null)

  const getRoleState = (role: Exclude<ActivePickerRole, null>) => {
    if (role === 'birth') {
      return {
        place: birthPlace,
        setPlace: setBirthPlace,
        setCityId: setBirthCityId,
        histLabel: birthHistoricalLabel,
        title: '출생지',
      }
    }
    if (role === 'death') {
      return {
        place: deathPlace,
        setPlace: setDeathPlace,
        setCityId: setDeathCityId,
        histLabel: deathHistoricalLabel,
        title: '사망지',
      }
    }
    return {
      place: burialPlace,
      setPlace: setBurialPlace ?? (() => {}),
      setCityId: () => {},
      histLabel: burialHistoricalLabel,
      title: '묘소·안장지',
    }
  }

  const handleSavePinnedPlace = async (
    role: Exclude<ActivePickerRole, null>,
    saved: {
      headquarters: string
      headquartersLatitude: number | null
      headquartersLongitude: number | null
    },
  ) => {
    const target = getRoleState(role)
    const labelName =
      saved.headquarters.trim() ||
      target.place?.shortName ||
      target.histLabel.trim() ||
      '지정 위치'

    const nextLocal: PlaceResult = {
      displayName: labelName,
      shortName: labelName,
      placeId: target.place?.placeId,
      latitude: saved.headquartersLatitude,
      longitude: saved.headquartersLongitude,
      isManual: saved.headquartersLatitude == null,
    }
    target.setPlace(nextLocal)
    target.setCityId('')
    markDirty()

    if (
      saved.headquartersLatitude != null &&
      saved.headquartersLongitude != null
    ) {
      try {
        const canonical = await placeApi.resolve({
          id: target.place?.placeId ?? null,
          name: labelName,
          latitude: saved.headquartersLatitude,
          longitude: saved.headquartersLongitude,
          countryId: countryId || null,
          aliases: target.histLabel.trim()
            ? [{ name: target.histLabel.trim(), kind: 'HISTORICAL' }]
            : undefined,
        })
        target.setPlace({
          ...nextLocal,
          placeId: canonical.id,
          latitude: canonical.latitude,
          longitude: canonical.longitude,
          modernAddress: canonical.modernAddress,
          isManual: false,
        })
      } catch {
        // 오프라인 시 로컬 좌표 유지
      }
    }
  }

  const activePickerState = pickerRole ? getRoleState(pickerRole) : null

  return (
    <FormRows>
      <PlaceGrid>
        {/* 1. 출생지 */}
        <FieldRow>
          <FieldLabel>출생지</FieldLabel>
          <FieldControl>
            <PlaceControlStack>
              <PlaceRowMain>
                <PlaceAutocompleteWrap>
                  <PlaceAutocomplete
                    value={birthPlace}
                    onChange={(place) => {
                      setBirthPlace(place)
                      setBirthCityId(place?.cityId ?? '')
                      markDirty()
                    }}
                    placeholder="현대 위치·지명 검색 또는 Google 지도 URL 붙여넣기"
                    countryId={countryId || undefined}
                    history={placeHistory}
                    onOpen={onPlaceListOpen}
                  />
                </PlaceAutocompleteWrap>
                <PinButton
                  type="button"
                  onClick={() => setPickerRole('birth')}
                  title="지도에서 출생지 핀 지정 / 위성 확인"
                >
                  <FiMapPin size={12.5} />
                  <span>지도 핀</span>
                </PinButton>
              </PlaceRowMain>

              {setBirthHistoricalLabel && (
                <SubInput
                  type="text"
                  value={birthHistoricalLabel}
                  onChange={(e) => {
                    setBirthHistoricalLabel(e.target.value)
                    markDirty()
                  }}
                  placeholder="당대 지명 표기 (선택 — 예: 한성부 건천동, 프랑크 왕국 엑스라샤펠)"
                />
              )}

              {(birthPlace?.shortName || birthHistoricalLabel.trim()) && (
                <HeadquartersMapPreview
                  headquarters={
                    birthPlace?.modernAddress ||
                    birthPlace?.shortName ||
                    birthHistoricalLabel
                  }
                  latitude={birthPlace?.latitude ?? null}
                  longitude={birthPlace?.longitude ?? null}
                  mapHeight={210}
                />
              )}
            </PlaceControlStack>
          </FieldControl>
        </FieldRow>

        {/* 2. 사망지 */}
        <FieldRow>
          <DeathLabelRow>
            <FieldLabel>사망지</FieldLabel>
            {birthPlace && (
              <InlineActionBtn
                type="button"
                onClick={onCopyBirthToDeathPlace}
                title="출생지를 사망지로 복사"
              >
                <FiCopy size={12} />
                출생지와 동일
              </InlineActionBtn>
            )}
          </DeathLabelRow>
          <FieldControl>
            <PlaceControlStack>
              <PlaceRowMain>
                <PlaceAutocompleteWrap>
                  <PlaceAutocomplete
                    value={deathPlace}
                    onChange={(place) => {
                      setDeathPlace(place)
                      setDeathCityId(place?.cityId ?? '')
                      markDirty()
                    }}
                    placeholder="현대 위치·지명 검색 또는 Google 지도 URL 붙여넣기"
                    countryId={countryId || undefined}
                    history={placeHistory}
                    onOpen={onPlaceListOpen}
                  />
                </PlaceAutocompleteWrap>
                <PinButton
                  type="button"
                  onClick={() => setPickerRole('death')}
                  title="지도에서 사망지 핀 지정 / 위성 확인"
                >
                  <FiMapPin size={12.5} />
                  <span>지도 핀</span>
                </PinButton>
              </PlaceRowMain>

              {setDeathHistoricalLabel && (
                <SubInput
                  type="text"
                  value={deathHistoricalLabel}
                  onChange={(e) => {
                    setDeathHistoricalLabel(e.target.value)
                    markDirty()
                  }}
                  placeholder="당대 지명 표기 (선택 — 예: 셋쓰국 오사카성, 교황령 로마)"
                />
              )}

              {(deathPlace?.shortName || deathHistoricalLabel.trim()) && (
                <HeadquartersMapPreview
                  headquarters={
                    deathPlace?.modernAddress ||
                    deathPlace?.shortName ||
                    deathHistoricalLabel
                  }
                  latitude={deathPlace?.latitude ?? null}
                  longitude={deathPlace?.longitude ?? null}
                  mapHeight={210}
                />
              )}
            </PlaceControlStack>
          </FieldControl>
        </FieldRow>

        {/* 3. 묘소 · 안장지 */}
        {setBurialPlace && (
          <FieldRow>
            <FieldLabel>묘소·안장지</FieldLabel>
            <FieldControl>
              <PlaceControlStack>
                <PlaceRowMain>
                  <PlaceAutocompleteWrap>
                    <PlaceAutocomplete
                      value={burialPlace}
                      onChange={(place) => {
                        setBurialPlace(place)
                        markDirty()
                      }}
                      placeholder="왕릉·묘소·현충원 검색 또는 Google 지도 URL 붙여넣기"
                      countryId={countryId || undefined}
                      history={placeHistory}
                      onOpen={onPlaceListOpen}
                    />
                  </PlaceAutocompleteWrap>
                  <PinButton
                    type="button"
                    onClick={() => setPickerRole('burial')}
                    title="지도에서 묘소·안장지 핀 지정 / 위성 확인"
                  >
                    <FiMapPin size={12.5} />
                    <span>지도 핀</span>
                  </PinButton>
                </PlaceRowMain>

                {setBurialHistoricalLabel && (
                  <SubInput
                    type="text"
                    value={burialHistoricalLabel}
                    onChange={(e) => {
                      setBurialHistoricalLabel(e.target.value)
                      markDirty()
                    }}
                    placeholder="묘호·능호·당대 표기 (선택 — 예: 헌릉, 파리 앵발리드)"
                  />
                )}

                {setBurialNote && (
                  <SubInput
                    type="text"
                    value={burialNote}
                    onChange={(e) => {
                      setBurialNote(e.target.value)
                      markDirty()
                    }}
                    placeholder="안장·이장 비고 (선택 — 예: 1840년 세인트헬레나에서 파리로 이장)"
                  />
                )}

                {(burialPlace?.shortName || burialHistoricalLabel.trim()) && (
                  <HeadquartersMapPreview
                    headquarters={
                      burialPlace?.modernAddress ||
                      burialPlace?.shortName ||
                      burialHistoricalLabel
                    }
                    latitude={burialPlace?.latitude ?? null}
                    longitude={burialPlace?.longitude ?? null}
                    mapHeight={210}
                  />
                )}
              </PlaceControlStack>
            </FieldControl>
          </FieldRow>
        )}
      </PlaceGrid>

      {pickerRole && activePickerState && (
        <HeadquartersPinPickerModal
          isOpen
          onClose={() => setPickerRole(null)}
          initialHeadquarters={
            activePickerState.place?.shortName ??
            activePickerState.histLabel ??
            ''
          }
          initialLatitude={activePickerState.place?.latitude ?? null}
          initialLongitude={activePickerState.place?.longitude ?? null}
          departmentName={activePickerState.title}
          onSave={(saved) => {
            void handleSavePinnedPlace(pickerRole, saved)
            setPickerRole(null)
          }}
        />
      )}
    </FormRows>
  )
}

const PlaceGrid = styled.div`
  display: contents;
`

const DeathLabelRow = styled.div``

const PlaceControlStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`

const PlaceRowMain = styled.div`
  display: flex;
  align-items: stretch;
  gap: 6px;
  width: 100%;
`

const PlaceAutocompleteWrap = styled.div`
  flex: 1;
  min-width: 0;
`

const PinButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border-radius: ${RADIUS.control};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(15, 23, 42, 0.14)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const SubInput = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: ${RADIUS.control};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const InlineActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  margin-right: -6px;
  font-size: ${FONT.meta};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.active};
  background: transparent;
  border: none;
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.activeLight};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`
