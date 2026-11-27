/**
 * 인물 등록/수정 폼의 출생지 · 사망지 · 묘소/안장지 입력 (생애 영역).
 * - 범용 장소 정본(Place) 검색 + Google 지도 URL·좌표 붙여넣기 + 핀 피커 모달(HeadquartersPinPickerModal)
 * - 당대 지명 표기(historicalLabel)와 현대 정본 위치(Place)를 분리 기록
 *
 * 조판 — 장소 하나 = **한 줄**: [현대 위치 검색][당대 지명][핀]. 예전엔 장소마다 검색 줄·당대 지명 줄·
 * 지도 요약 줄이 따로 서서 세 장소가 9~10줄을 먹었고, 같은 긴 안내문이 세 번 반복됐다.
 * - 당대 지명은 '당대' 꼬리표를 단 칸으로 검색 칸 옆에 — 두 칸 모두 지명이라 꼬리표 없이는 어느 쪽인지 모른다
 * - 지도 핀은 아이콘 칸, 좌표가 찍혀 있으면 강조색으로 '핀 있음'을 말한다
 * - 지도는 장소마다 줄을 세우지 않고 맨 아래 '위치 지도' 한 줄 — 고른 장소가 칩으로 서고, 누른 하나만 펼친다
 * - 안장·이장 비고는 쓰는 인물이 드물어 접어 두고, 값이 있으면 펼친다
 * - 칸이 좁으면(컨테이너 440px 이하) 당대 지명이 둘째 줄로 내려간다
 */
import React, { useState } from 'react'

import { FiCopy, FiMapPin, FiPlus } from 'react-icons/fi'
import styled, { css } from 'styled-components'

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
  setBirthPlace: (place: PlaceResult | null) => void
  setDeathPlace: (place: PlaceResult | null) => void
  setBurialPlace?: (place: PlaceResult | null) => void
  setBirthHistoricalLabel?: (value: string) => void
  setDeathHistoricalLabel?: (value: string) => void
  setBurialHistoricalLabel?: (value: string) => void
  setBurialNote?: (value: string) => void
  setBirthCityId: (id: string) => void
  setDeathCityId: (id: string) => void
  onCopyBirthToDeathPlace: () => void
  markDirty: () => void
  placeHistory?: ReadonlyArray<PlaceHistoryEntry>
  onPlaceListOpen?: () => void
}

type PlaceRole = 'birth' | 'death' | 'burial'

function hasCoordinates(place: PlaceResult | null): boolean {
  return place?.latitude != null && place?.longitude != null
}

function samePlace(left: PlaceResult | null, right: PlaceResult | null): boolean {
  if (!left || !right) return false
  if (left.placeId && right.placeId) return left.placeId === right.placeId
  return (left.shortName ?? left.displayName) === (right.shortName ?? right.displayName)
}

interface PlaceLineProps {
  title: string
  place: PlaceResult | null
  onPlaceChange: (place: PlaceResult | null) => void
  searchPlaceholder: string
  historicalLabel: string
  onHistoricalLabelChange?: (value: string) => void
  historicalPlaceholder: string
  onOpenPin: () => void
  countryId: string
  placeHistory?: ReadonlyArray<PlaceHistoryEntry>
  onPlaceListOpen?: () => void
  /** 라벨 아래 보조 액션(출생지와 같음·비고 추가) */
  labelAction?: React.ReactNode
  /** 줄 아래 덧붙임(안장 비고) */
  children?: React.ReactNode
}

/** 장소 한 줄 — 출생·사망·안장이 같은 꼴을 쓰도록 하나로 */
function PlaceLine({
  title,
  place,
  onPlaceChange,
  searchPlaceholder,
  historicalLabel,
  onHistoricalLabelChange,
  historicalPlaceholder,
  onOpenPin,
  countryId,
  placeHistory,
  onPlaceListOpen,
  labelAction,
  children,
}: PlaceLineProps) {
  const pinned = hasCoordinates(place)
  const hasHistorical = Boolean(onHistoricalLabelChange)

  return (
    <FieldRow>
      {labelAction ? (
        <LabelStack>
          <FieldLabel>{title}</FieldLabel>
          {labelAction}
        </LabelStack>
      ) : (
        <FieldLabel>{title}</FieldLabel>
      )}
      <FieldControl>
        <PlaceStack>
          <PlaceGrid $hasHistorical={hasHistorical}>
            <SearchSlot>
              <PlaceAutocomplete
                value={place}
                onChange={onPlaceChange}
                placeholder={searchPlaceholder}
                countryId={countryId || undefined}
                history={placeHistory}
                onOpen={onPlaceListOpen}
              />
            </SearchSlot>
            {onHistoricalLabelChange && (
              <TaggedField>
                <FieldTag aria-hidden>당대</FieldTag>
                <TaggedInput
                  type="text"
                  value={historicalLabel}
                  onChange={(changeEvent) => onHistoricalLabelChange(changeEvent.target.value)}
                  placeholder={historicalPlaceholder}
                  aria-label={`${title} 당대 지명 표기`}
                />
              </TaggedField>
            )}
            <PinButton
              type="button"
              $pinned={pinned}
              onClick={onOpenPin}
              aria-label={pinned ? `${title} 지도 핀 수정` : `${title} 지도에서 핀 찍기`}
              title={pinned ? '지도 핀 수정 · 위성 확인' : '지도에서 핀 찍기'}
            >
              <FiMapPin size={15} aria-hidden />
            </PinButton>
          </PlaceGrid>
          {children}
        </PlaceStack>
      </FieldControl>
    </FieldRow>
  )
}

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
  const [pickerRole, setPickerRole] = useState<PlaceRole | null>(null)
  const [burialNoteOpen, setBurialNoteOpen] = useState(false)
  const [mapRole, setMapRole] = useState<PlaceRole | null>(null)
  /* 수정 모드는 마운트 뒤에 값이 들어오므로 '열림'은 상태가 아니라 값에서도 파생 */
  const burialNoteVisible = burialNoteOpen || burialNote.trim() !== ''

  const getRoleState = (role: PlaceRole) => {
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
    role: PlaceRole,
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

  const withDirty =
    (setter?: (value: string) => void) =>
    (value: string): void => {
      setter?.(value)
      markDirty()
    }

  const activePickerState = pickerRole ? getRoleState(pickerRole) : null
  /* 위치 지도 — 고른 장소만 칩으로, 한 번에 하나만 펼친다(장소마다 지도 줄이 서던 것을 한 줄로) */
  const mappedPlaces = (['birth', 'death', 'burial'] as const)
    .map((role) => ({ role, ...getRoleState(role) }))
    .filter((entry) => Boolean(entry.place?.shortName))
  const shownMap = mappedPlaces.find((entry) => entry.role === mapRole) ?? null
  const canCopyBirth = Boolean(birthPlace) && !samePlace(birthPlace, deathPlace)

  return (
    <FormRows>
      <PlaceLine
        title="출생지"
        place={birthPlace}
        onPlaceChange={(place) => {
          setBirthPlace(place)
          setBirthCityId(place?.cityId ?? '')
          markDirty()
        }}
        searchPlaceholder="현대 지명 검색 · 지도 URL"
        historicalLabel={birthHistoricalLabel}
        onHistoricalLabelChange={
          setBirthHistoricalLabel ? withDirty(setBirthHistoricalLabel) : undefined
        }
        historicalPlaceholder="예: 한성부 건천동"
        onOpenPin={() => setPickerRole('birth')}
        countryId={countryId}
        placeHistory={placeHistory}
        onPlaceListOpen={onPlaceListOpen}
      />

      <PlaceLine
        title="사망지"
        place={deathPlace}
        onPlaceChange={(place) => {
          setDeathPlace(place)
          setDeathCityId(place?.cityId ?? '')
          markDirty()
        }}
        searchPlaceholder="현대 지명 검색 · 지도 URL"
        historicalLabel={deathHistoricalLabel}
        onHistoricalLabelChange={
          setDeathHistoricalLabel ? withDirty(setDeathHistoricalLabel) : undefined
        }
        historicalPlaceholder="예: 교황령 로마"
        onOpenPin={() => setPickerRole('death')}
        countryId={countryId}
        placeHistory={placeHistory}
        onPlaceListOpen={onPlaceListOpen}
        labelAction={
          canCopyBirth ? (
            <LabelActionBtn
              type="button"
              onClick={onCopyBirthToDeathPlace}
              title="출생지를 사망지로 복사"
            >
              <FiCopy size={11} aria-hidden />
              출생지와 같음
            </LabelActionBtn>
          ) : undefined
        }
      />

      {setBurialPlace && (
        <PlaceLine
          title="묘소·안장지"
          place={burialPlace}
          onPlaceChange={(place) => {
            setBurialPlace(place)
            markDirty()
          }}
          searchPlaceholder="왕릉·묘소·묘지 검색 · 지도 URL"
          historicalLabel={burialHistoricalLabel}
          onHistoricalLabelChange={
            setBurialHistoricalLabel ? withDirty(setBurialHistoricalLabel) : undefined
          }
          historicalPlaceholder="능호·묘호 (예: 헌릉)"
          onOpenPin={() => setPickerRole('burial')}
          countryId={countryId}
          placeHistory={placeHistory}
          onPlaceListOpen={onPlaceListOpen}
          labelAction={
            setBurialNote && !burialNoteVisible ? (
              <LabelActionBtn type="button" onClick={() => setBurialNoteOpen(true)}>
                <FiPlus size={11} aria-hidden />
                이장·안장 비고
              </LabelActionBtn>
            ) : undefined
          }
        >
          {setBurialNote && burialNoteVisible && (
            <TaggedField>
              <FieldTag aria-hidden>비고</FieldTag>
              <TaggedInput
                type="text"
                value={burialNote}
                autoFocus={burialNoteOpen && burialNote === ''}
                onChange={(changeEvent) => {
                  setBurialNote(changeEvent.target.value)
                  markDirty()
                }}
                placeholder="안장·이장 경위 (예: 1840년 세인트헬레나에서 파리로 이장)"
                aria-label="안장·이장 비고"
              />
            </TaggedField>
          )}
        </PlaceLine>
      )}

      {mappedPlaces.length > 0 && (
        <FieldRow>
          <FieldLabel data-no-optional>위치 지도</FieldLabel>
          <FieldControl>
            <PlaceStack>
              <MapChips role="group" aria-label="지도에서 볼 장소">
                {mappedPlaces.map((entry) => {
                  const active = entry.role === mapRole
                  return (
                    <MapChip
                      key={entry.role}
                      type="button"
                      aria-pressed={active}
                      $active={active}
                      onClick={() => setMapRole(active ? null : entry.role)}
                      title={hasCoordinates(entry.place) ? '핀 좌표 기준' : '지명 검색 기준'}
                    >
                      <MapChipDot $pinned={hasCoordinates(entry.place)} aria-hidden />
                      <strong>{entry.title}</strong>
                      <span>{entry.place?.shortName}</span>
                    </MapChip>
                  )
                })}
              </MapChips>
              {shownMap?.place && (
                <HeadquartersMapPreview
                  key={shownMap.role}
                  headquarters={shownMap.place.modernAddress || shownMap.place.shortName}
                  latitude={shownMap.place.latitude ?? null}
                  longitude={shownMap.place.longitude ?? null}
                  departmentName={shownMap.title}
                  defaultExpanded
                  mapHeight={220}
                />
              )}
            </PlaceStack>
          </FieldControl>
        </FieldRow>
      )}

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

/* ───────────────────────── 조판 ───────────────────────── */

const LabelStack = styled.div``

const MapChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const MapChipDot = styled.span<{ $pinned: boolean }>`
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  /* 핀 좌표가 있으면 채운 점, 지명으로만 찾으면 빈 점 */
  background: ${({ $pinned, theme }) => ($pinned ? theme.colors.primary : 'transparent')};
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
`

const MapChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  height: 30px;
  padding: 0 11px 0 10px;
  border-radius: ${RADIUS.pill};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.colors.primary
        : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.16)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  font-family: inherit;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  strong {
    flex-shrink: 0;
    font-weight: 600;
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text.primary)};
  }
  span:last-child {
    min-width: 0;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const PlaceStack = styled.div`
  container: place-line / inline-size;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`

const SearchSlot = styled.div`
  grid-row: 1;
  grid-column: 1;
  min-width: 0;
`

/* 검색 칸과 같은 41px 칸 — 앞머리 꼬리표로 무슨 칸인지 말한다 */
const TaggedField = styled.label`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 41px;
  padding: 0 10px 0 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.control};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  cursor: text;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  }
`

const FieldTag = styled.span`
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'};
`

const TaggedInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PinButton = styled.button<{ $pinned: boolean }>`
  grid-row: 1;
  grid-column: -2 / -1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 41px;
  height: 41px;
  padding: 0;
  border-radius: ${RADIUS.control};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;

  ${({ $pinned, theme }) =>
    $pinned &&
    css`
      color: ${theme.colors.primary};
      border-color: ${theme.mode === 'dark' ? 'rgba(129,140,248,0.4)' : 'rgba(99,102,241,0.35)'};
      background: ${theme.mode === 'dark' ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.07)'};
    `}

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const PlaceGrid = styled.div<{ $hasHistorical: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasHistorical }) =>
    $hasHistorical
      ? 'minmax(0, 1.45fr) minmax(0, 1fr) 41px'
      : 'minmax(0, 1fr) 41px'};
  gap: 6px;
  align-items: center;

  > ${TaggedField} {
    grid-row: 1;
    grid-column: 2;
  }

  /* 좁은 칸 — 검색+핀 한 줄, 당대 지명은 아랫줄 전폭 */
  @container place-line (max-width: 440px) {
    grid-template-columns: minmax(0, 1fr) 41px;
    > ${TaggedField} {
      grid-row: 2;
      grid-column: 1 / -1;
    }
  }
`

/* 라벨 아래 작은 글자 액션 — 사건 폼 라벨 보조 액션과 같은 결 */
const LabelActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: -6px;
  padding: 2px 6px;
  font-family: inherit;
  font-size: ${FONT.meta};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`
