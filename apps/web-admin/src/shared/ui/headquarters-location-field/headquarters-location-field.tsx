import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiNavigation,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { cityApi } from '@/shared/api/city'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { kitC } from '@/shared/ui/register-form-kit/register-form-kit'

import {
  HEADQUARTERS_ZOOM_PRESETS,
  type HeadquartersGoogleMapLayer,
  buildHeadquartersGoogleMapsSpec,
  clampValidWgs84,
  formatHeadquartersCoordinate,
  parseHeadquartersMapInput,
} from './headquarters-google-map.lib'
import { HeadquartersPinPickerModal } from './headquarters-pin-picker-modal'

export interface HeadquartersLocationFieldValue {
  headquarters: string
  headquartersLatitude: number | null
  headquartersLongitude: number | null
}

export interface HeadquartersLocationFieldProps {
  headquarters: string
  latitude: number | null
  longitude: number | null
  onChange: (nextValue: HeadquartersLocationFieldValue) => void
  countryName?: string | null
  departmentName?: string | null
  placeholder?: string
  ariaLabel?: string
}

export const HeadquartersLocationField: React.FC<
  HeadquartersLocationFieldProps
> = ({
  headquarters,
  latitude,
  longitude,
  onChange,
  countryName,
  departmentName,
  placeholder = '예: 서울 정부서울청사, 한성부 육조거리 · Google 지도 URL 붙여넣기',
  ariaLabel = '청사 · 본부 소재지',
}) => {
  const validPoint = useMemo(
    () => clampValidWgs84(latitude, longitude),
    [latitude, longitude],
  )

  const [pickerModalOpen, setPickerModalOpen] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(
    () => validPoint !== null,
  )
  const [mapLayer, setMapLayer] =
    useState<HeadquartersGoogleMapLayer>('roadmap')
  const [zoomLevel, setZoomLevel] = useState<number>(15)
  const [inputFocused, setInputFocused] = useState(false)
  const [activeOptionIdx, setActiveOptionIdx] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevHadPinRef = useRef<boolean>(validPoint !== null)

  useEffect(() => {
    const hasPinNow = validPoint !== null
    if (hasPinNow && !prevHadPinRef.current) {
      setPreviewExpanded(true)
    }
    prevHadPinRef.current = hasPinNow
  }, [validPoint])

  const trimmedHq = headquarters.trim()
  const debouncedText = useDebouncedValue(trimmedHq, 300)
  const parsedTyped = useMemo(
    () => parseHeadquartersMapInput(trimmedHq),
    [trimmedHq],
  )

  const shouldAutocomplete =
    inputFocused &&
    validPoint === null &&
    debouncedText.length >= 2 &&
    !parsedTyped.isMapUrlOrCoord

  const inlinePlaceQuery = useQuery({
    queryKey: ['place-search', 'any', debouncedText],
    queryFn: () =>
      cityApi.searchPlaces(debouncedText, undefined, { anyPlace: true }),
    enabled: shouldAutocomplete,
    staleTime: 5 * 60_000,
  })

  const autocompleteItems = useMemo(
    () => (shouldAutocomplete ? (inlinePlaceQuery.data ?? []).slice(0, 5) : []),
    [shouldAutocomplete, inlinePlaceQuery.data],
  )

  const effectiveZoom = validPoint ? zoomLevel : Math.min(zoomLevel, 15)

  const googleMapsSpec = useMemo(
    () =>
      buildHeadquartersGoogleMapsSpec({
        headquarters: trimmedHq,
        latitude: validPoint?.lat ?? null,
        longitude: validPoint?.lng ?? null,
        countryName,
        zoom: effectiveZoom,
        mapLayer,
      }),
    [trimmedHq, validPoint, countryName, effectiveZoom, mapLayer],
  )

  const handlePaste = (pasteEvent: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = pasteEvent.clipboardData?.getData('text') ?? ''
    const parsed = parseHeadquartersMapInput(pastedText)
    if (!parsed.isMapUrlOrCoord) return

    if (parsed.point || parsed.extractedLabel) {
      pasteEvent.preventDefault()
      const nextLabel = trimmedHq || parsed.extractedLabel || ''
      onChange({
        headquarters: nextLabel,
        headquartersLatitude: parsed.point?.lat ?? validPoint?.lat ?? null,
        headquartersLongitude: parsed.point?.lng ?? validPoint?.lng ?? null,
      })
      setPreviewExpanded(true)
      setInputFocused(false)
    }
  }

  const applyAutocompleteItem = (
    selectedPlace: (typeof autocompleteItems)[number],
  ) => {
    const nextPoint = clampValidWgs84(selectedPlace.lat, selectedPlace.lng)
    onChange({
      headquarters: trimmedHq || selectedPlace.shortName,
      headquartersLatitude: nextPoint?.lat ?? null,
      headquartersLongitude: nextPoint?.lng ?? null,
    })
    setInputFocused(false)
    setPreviewExpanded(true)
  }

  const showPopover =
    inputFocused &&
    (autocompleteItems.length > 0 ||
      (parsedTyped.isMapUrlOrCoord && parsedTyped.point !== null))

  return (
    <FieldWrapper
      ref={wrapperRef}
      onBlur={(blurEvent) => {
        if (
          wrapperRef.current &&
          blurEvent.relatedTarget instanceof Node &&
          wrapperRef.current.contains(blurEvent.relatedTarget)
        ) {
          return
        }
        setInputFocused(false)
      }}
    >
      <InputActionRow>
        <AutocompleteAnchor>
          <LocationInputShell $pinned={validPoint !== null}>
            <InputLeadingBadge
              $pinned={validPoint !== null}
              aria-hidden="true"
              title={
                validPoint
                  ? `좌표 핀 연결됨 (${formatHeadquartersCoordinate(validPoint)})`
                  : '소재지 텍스트 입력 또는 Google 지도 URL 붙여넣기'
              }
            >
              <FiMapPin size={13} />
            </InputLeadingBadge>

            <LocationNativeInput
              ref={inputRef}
              type="text"
              aria-label={ariaLabel}
              value={headquarters}
              onFocus={() => {
                setInputFocused(true)
                setActiveOptionIdx(0)
              }}
              onPaste={handlePaste}
              onChange={(changeEvent) => {
                onChange({
                  headquarters: changeEvent.target.value,
                  headquartersLatitude: validPoint?.lat ?? null,
                  headquartersLongitude: validPoint?.lng ?? null,
                })
                setActiveOptionIdx(0)
              }}
              onKeyDown={(keyEvent) => {
                if (autocompleteItems.length > 0 && inputFocused) {
                  if (keyEvent.key === 'ArrowDown') {
                    keyEvent.preventDefault()
                    setActiveOptionIdx(
                      (prevIdx) => (prevIdx + 1) % autocompleteItems.length,
                    )
                    return
                  }
                  if (keyEvent.key === 'ArrowUp') {
                    keyEvent.preventDefault()
                    setActiveOptionIdx(
                      (prevIdx) =>
                        (prevIdx - 1 + autocompleteItems.length) %
                        autocompleteItems.length,
                    )
                    return
                  }
                  if (keyEvent.key === 'Enter') {
                    const targetPlace =
                      autocompleteItems[
                        Math.min(activeOptionIdx, autocompleteItems.length - 1)
                      ]
                    if (targetPlace) {
                      keyEvent.preventDefault()
                      applyAutocompleteItem(targetPlace)
                      return
                    }
                  }
                  if (keyEvent.key === 'Escape') {
                    setInputFocused(false)
                    return
                  }
                }
                if (
                  keyEvent.key === 'Enter' &&
                  parsedTyped.isMapUrlOrCoord &&
                  parsedTyped.point
                ) {
                  keyEvent.preventDefault()
                  onChange({
                    headquarters: parsedTyped.extractedLabel ?? '',
                    headquartersLatitude: parsedTyped.point.lat,
                    headquartersLongitude: parsedTyped.point.lng,
                  })
                  setPreviewExpanded(true)
                  setInputFocused(false)
                }
              }}
              placeholder={placeholder}
            />

            {headquarters ? (
              <InputClearBtn
                type="button"
                aria-label="소재지 텍스트 지우기"
                title="입력한 소재지 이름을 비웁니다"
                onClick={() => {
                  onChange({
                    headquarters: '',
                    headquartersLatitude: validPoint?.lat ?? null,
                    headquartersLongitude: validPoint?.lng ?? null,
                  })
                  inputRef.current?.focus()
                }}
              >
                <FiX size={13} />
              </InputClearBtn>
            ) : null}
          </LocationInputShell>

          {showPopover ? (
            <AutocompletePopover role="listbox" aria-label="추천 청사 위치">
              <PopoverHeaderBar>
                <span>
                  {parsedTyped.isMapUrlOrCoord
                    ? '지도 링크 · 좌표 감지됨'
                    : '장소 검색 · 선택하면 좌표 핀 자동 연결'}
                </span>
                <PopoverKbdHint>↑↓ · Enter</PopoverKbdHint>
              </PopoverHeaderBar>

              {parsedTyped.isMapUrlOrCoord && parsedTyped.point ? (
                <AutocompleteItemBtn
                  type="button"
                  $active
                  onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                  onClick={() => {
                    onChange({
                      headquarters: parsedTyped.extractedLabel ?? '',
                      headquartersLatitude: parsedTyped.point!.lat,
                      headquartersLongitude: parsedTyped.point!.lng,
                    })
                    setInputFocused(false)
                    setPreviewExpanded(true)
                  }}
                >
                  <ItemPinCircle $accent>
                    <FiNavigation size={11} />
                  </ItemPinCircle>
                  <ItemTextCol>
                    <span className="place-title">
                      {parsedTyped.extractedLabel
                        ? `Google 지도 핀 적용 · ${parsedTyped.extractedLabel}`
                        : '입력된 위·경도 좌표로 핀 지정'}
                    </span>
                    <span className="place-sub">
                      {formatHeadquartersCoordinate(parsedTyped.point)}
                    </span>
                  </ItemTextCol>
                  <ItemActionTag>적용</ItemActionTag>
                </AutocompleteItemBtn>
              ) : null}

              {autocompleteItems.map((placeItem, itemIndex) => (
                <AutocompleteItemBtn
                  key={placeItem.placeId}
                  type="button"
                  $active={itemIndex === activeOptionIdx}
                  onMouseEnter={() => setActiveOptionIdx(itemIndex)}
                  onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                  onClick={() => applyAutocompleteItem(placeItem)}
                >
                  <ItemPinCircle>
                    <FiMapPin size={11} />
                  </ItemPinCircle>
                  <ItemTextCol>
                    <span className="place-title">{placeItem.shortName}</span>
                    <span className="place-sub">{placeItem.displayName}</span>
                  </ItemTextCol>
                  <ItemActionTag>핀 연결</ItemActionTag>
                </AutocompleteItemBtn>
              ))}
            </AutocompletePopover>
          ) : null}
        </AutocompleteAnchor>

        <MapModalTriggerBtn
          type="button"
          $pinned={validPoint !== null}
          onClick={() => setPickerModalOpen(true)}
          aria-label={validPoint ? '지도 핀 수정' : '지도에서 소재지 찾기'}
        >
          <FiMapPin size={13.5} />
          <span>{validPoint ? '핀 위치 조정' : '지도·핀 지정'}</span>
        </MapModalTriggerBtn>
      </InputActionRow>

      {googleMapsSpec ? (
        <InspectorCard $expanded={previewExpanded}>
          <InspectorHeader $expanded={previewExpanded}>
            <StatusGroup>
              <StatusPill $pinned={googleMapsSpec.mode === 'pinned'}>
                <StatusDot $pinned={googleMapsSpec.mode === 'pinned'} />
                {validPoint ? (
                  <span>
                    핀 고정 · {formatHeadquartersCoordinate(validPoint)}
                  </span>
                ) : (
                  <span>명칭 검색 · 핀 미지정</span>
                )}
              </StatusPill>

              {!validPoint ? (
                <QuickPinLinkBtn
                  type="button"
                  onClick={() => setPickerModalOpen(true)}
                >
                  정확한 핀 찍기 →
                </QuickPinLinkBtn>
              ) : null}
            </StatusGroup>

            <ToolbarRightActions>
              {previewExpanded ? (
                <>
                  <SegmentedMicroGroup role="group" aria-label="구글 지도 유형">
                    <SegmentedMicroBtn
                      type="button"
                      $active={mapLayer === 'roadmap'}
                      onClick={() => setMapLayer('roadmap')}
                    >
                      일반
                    </SegmentedMicroBtn>
                    <SegmentedMicroBtn
                      type="button"
                      $active={mapLayer === 'hybrid'}
                      onClick={() => setMapLayer('hybrid')}
                      title="위성·항공 사진과 지명 라벨을 함께 표시합니다"
                    >
                      <FiLayers size={10} />
                      위성
                    </SegmentedMicroBtn>
                  </SegmentedMicroGroup>

                  <SegmentedMicroGroup role="group" aria-label="지도 확대 배율">
                    {HEADQUARTERS_ZOOM_PRESETS.map((presetItem) => (
                      <SegmentedMicroBtn
                        key={presetItem.key}
                        type="button"
                        $active={zoomLevel === presetItem.zoom}
                        onClick={() => setZoomLevel(presetItem.zoom)}
                      >
                        {presetItem.label}
                      </SegmentedMicroBtn>
                    ))}
                  </SegmentedMicroGroup>
                </>
              ) : null}

              <TogglePreviewBtn
                type="button"
                $active={previewExpanded}
                onClick={() => setPreviewExpanded((prevOpen) => !prevOpen)}
              >
                <FiGlobe size={12} aria-hidden />
                <span>
                  {previewExpanded ? '구글 지도 접기' : '구글 지도 미리보기'}
                </span>
                {previewExpanded ? (
                  <FiChevronUp size={12} aria-hidden />
                ) : (
                  <FiChevronDown size={12} aria-hidden />
                )}
              </TogglePreviewBtn>

              <ExternalOpenLink
                href={googleMapsSpec.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="새 탭에서 Google 지도 열기"
              >
                <span>Google 지도</span>
                <FiExternalLink size={11} aria-hidden />
              </ExternalOpenLink>

              {validPoint ? (
                <UnpinBtn
                  type="button"
                  title="좌표 핀만 해제 (소재지 텍스트는 유지)"
                  onClick={() =>
                    onChange({
                      headquarters,
                      headquartersLatitude: null,
                      headquartersLongitude: null,
                    })
                  }
                >
                  <FiX size={11.5} aria-hidden />
                  <span>핀 해제</span>
                </UnpinBtn>
              ) : null}
            </ToolbarRightActions>
          </InspectorHeader>

          {previewExpanded ? (
            <InlineMapCanvas>
              <iframe
                key={googleMapsSpec.embedUrl}
                title={`${trimmedHq || departmentName || '청사 소재지'} 구글 지도 미리보기`}
                src={googleMapsSpec.embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </InlineMapCanvas>
          ) : null}
        </InspectorCard>
      ) : null}

      {pickerModalOpen ? (
        <HeadquartersPinPickerModal
          isOpen={pickerModalOpen}
          onClose={() => setPickerModalOpen(false)}
          initialHeadquarters={headquarters}
          initialLatitude={validPoint?.lat ?? null}
          initialLongitude={validPoint?.lng ?? null}
          countryName={countryName}
          departmentName={departmentName}
          onSave={(savedValue) => {
            onChange(savedValue)
            setPickerModalOpen(false)
            if (
              savedValue.headquartersLatitude != null ||
              savedValue.headquarters.trim()
            ) {
              setPreviewExpanded(true)
            }
          }}
        />
      ) : null}
    </FieldWrapper>
  )
}

const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`

const InputActionRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`

const AutocompleteAnchor = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
`

const LocationInputShell = styled.div<{ $pinned: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 41px;
  padding: 0 8px 0 10px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid
    ${({ $pinned, theme }) =>
      $pinned
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.42)'
          : 'rgba(99, 102, 241, 0.36)'
        : kitC(theme).border};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#252525' : '#f8fafc'};
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    border-color: ${({ $pinned, theme }) =>
      $pinned ? kitC(theme).focus : kitC(theme).borderHover};
  }

  &:focus-within {
    border-color: ${({ theme }) => kitC(theme).focus};
    background: ${({ theme }) => kitC(theme).content};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
`

const InputLeadingBadge = styled.span<{ $pinned: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  flex-shrink: 0;
  color: ${({ $pinned, theme }) =>
    $pinned
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : kitC(theme).textMuted};
  background: ${({ $pinned, theme }) =>
    $pinned
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.1)'
      : 'transparent'};
`

const LocationNativeInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 13.5px;
  color: ${({ theme }) => kitC(theme).textPrimary};

  &::placeholder {
    color: ${({ theme }) => kitC(theme).textMuted};
  }
`

const InputClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => kitC(theme).textMuted};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    color 0.14s ease,
    background 0.14s ease;

  &:hover {
    color: ${({ theme }) => kitC(theme).textPrimary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
  }
`

const MapModalTriggerBtn = styled.button<{ $pinned: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 41px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid
    ${({ $pinned, theme }) =>
      $pinned
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.45)'
          : 'rgba(99, 102, 241, 0.35)'
        : kitC(theme).border};
  background: ${({ $pinned, theme }) =>
    $pinned
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.16)'
        : 'rgba(99, 102, 241, 0.07)'
      : kitC(theme).content};
  color: ${({ $pinned, theme }) =>
    $pinned
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : kitC(theme).textPrimary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.04)'};
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;

  svg {
    color: ${({ theme }) => kitC(theme).focus};
  }

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
    background: ${({ $pinned, theme }) =>
      $pinned
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.24)'
          : 'rgba(99, 102, 241, 0.12)'
        : kitC(theme).section};
  }
`

const AutocompletePopover = styled.div`
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  z-index: 45;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 10px;
  background: ${({ theme }) => kitC(theme).content};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 14px 32px rgba(0, 0, 0, 0.56)'
      : '0 12px 28px rgba(15, 23, 42, 0.12)'};
`

const PopoverHeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const PopoverKbdHint = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px;
  letter-spacing: -0.02em;
  opacity: 0.85;
`

const AutocompleteItemBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.16)'
        : 'rgba(99, 102, 241, 0.07)'
      : 'transparent'};
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background 0.12s ease;

  &:not(:last-child) {
    border-bottom: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.04)'
          : 'rgba(15, 23, 42, 0.04)'};
  }
`

const ItemPinCircle = styled.span<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  flex-shrink: 0;
  color: ${({ $accent, theme }) =>
    $accent
      ? '#ffffff'
      : theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'};
  background: ${({ $accent, theme }) =>
    $accent
      ? kitC(theme).focus
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.09)'};
`

const ItemTextCol = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  .place-title {
    font-size: 12.5px;
    font-weight: 600;
    color: ${({ theme }) => kitC(theme).textPrimary};
  }

  .place-sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11.5px;
    color: ${({ theme }) => kitC(theme).textSecondary};
  }
`

const ItemActionTag = styled.span`
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.18)'
      : 'rgba(99, 102, 241, 0.09)'};
`

const InspectorCard = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 10px;
  background: ${({ theme }) => kitC(theme).content};
  box-shadow: ${({ $expanded, theme }) =>
    $expanded && theme.mode !== 'dark'
      ? '0 2px 8px rgba(15, 23, 42, 0.04)'
      : 'none'};
`

const InspectorHeader = styled.div<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 6px 10px;
  background: ${({ theme }) => kitC(theme).section};
  border-bottom: ${({ $expanded, theme }) =>
    $expanded ? `1px solid ${kitC(theme).border}` : 'none'};
`

const StatusGroup = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
`

const StatusPill = styled.span<{ $pinned: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: ${({ $pinned }) => ($pinned ? 600 : 500)};
  font-variant-numeric: tabular-nums;
  color: ${({ $pinned, theme }) =>
    $pinned
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : '#3730a3'
      : kitC(theme).textSecondary};
`

const StatusDot = styled.span<{ $pinned: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $pinned }) => ($pinned ? '#10b981' : '#94a3b8')};
  box-shadow: ${({ $pinned }) =>
    $pinned ? '0 0 0 3px rgba(16, 185, 129, 0.16)' : 'none'};
`

const QuickPinLinkBtn = styled.button`
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.35)'
        : 'rgba(99, 102, 241, 0.28)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.06)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'};
  }
`

const ToolbarRightActions = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
`

const SegmentedMicroGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
`

const SegmentedMicroBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 21px;
  padding: 0 7px;
  border: none;
  border-radius: 4px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : kitC(theme).textSecondary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;

  &:hover {
    color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? '#a5b4fc'
          : '#4f46e5'
        : kitC(theme).textPrimary};
  }
`

const TogglePreviewBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 25px;
  padding: 0 9px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? kitC(theme).focus : kitC(theme).border};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.09)'
      : kitC(theme).content};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : kitC(theme).textPrimary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    background 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
  }
`

const ExternalOpenLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 25px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  text-decoration: none;
  transition: background 0.14s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.07)'};
  }
`

const UnpinBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 25px;
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => kitC(theme).textMuted};
  cursor: pointer;
  transition:
    color 0.14s ease,
    background 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.12)'
        : 'rgba(239, 68, 68, 0.07)'};
  }
`

const InlineMapCanvas = styled.div`
  width: 100%;
  height: 224px;
  background: ${({ theme }) => kitC(theme).section};

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
`
