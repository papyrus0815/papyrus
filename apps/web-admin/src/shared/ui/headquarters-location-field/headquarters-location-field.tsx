import React, { useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { cityApi } from '@/shared/api/city'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { KitAddButton, kitC } from '@/shared/ui/register-form-kit/register-form-kit'
import { Input } from '@/shared/ui/register-form-layout'

import {
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
  placeholder = '청사·본부 소재지 또는 Google 지도 URL 붙여넣기 (예: 서울 정부서울청사, 한성부 육조거리)',
  ariaLabel = '청사 · 본부 소재지',
}) => {
  const [pickerModalOpen, setPickerModalOpen] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [activeOptionIdx, setActiveOptionIdx] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const validPoint = useMemo(
    () => clampValidWgs84(latitude, longitude),
    [latitude, longitude],
  )

  const trimmedHq = headquarters.trim()
  const debouncedText = useDebouncedValue(trimmedHq, 320)
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

  const googleMapsSpec = useMemo(
    () =>
      buildHeadquartersGoogleMapsSpec({
        headquarters: trimmedHq,
        latitude: validPoint?.lat ?? null,
        longitude: validPoint?.lng ?? null,
        countryName,
      }),
    [trimmedHq, validPoint, countryName],
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
          <Input
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
                } else if (keyEvent.key === 'ArrowUp') {
                  keyEvent.preventDefault()
                  setActiveOptionIdx(
                    (prevIdx) =>
                      (prevIdx - 1 + autocompleteItems.length) %
                      autocompleteItems.length,
                  )
                } else if (keyEvent.key === 'Escape') {
                  setInputFocused(false)
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

          {inputFocused &&
          (autocompleteItems.length > 0 ||
            (parsedTyped.isMapUrlOrCoord && parsedTyped.point !== null)) ? (
            <AutocompletePopover role="listbox" aria-label="추천 청사 위치">
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
                  <span className="place-title">
                    <FiMapPin size={12} />
                    {parsedTyped.extractedLabel
                      ? `Google 지도 핀 적용 (${parsedTyped.extractedLabel})`
                      : '입력된 위·경도 좌표로 핀 지정'}
                  </span>
                  <span className="place-sub">
                    {formatHeadquartersCoordinate(parsedTyped.point)}
                  </span>
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
                  <span className="place-title">
                    <FiMapPin size={12} />
                    {placeItem.shortName} — 좌표 핀 연결
                  </span>
                  <span className="place-sub">{placeItem.displayName}</span>
                </AutocompleteItemBtn>
              ))}
            </AutocompletePopover>
          ) : null}
        </AutocompleteAnchor>

        <KitAddButton
          type="button"
          onClick={() => setPickerModalOpen(true)}
          aria-label={validPoint ? '지도 핀 수정' : '지도에서 소재지 찾기'}
        >
          <FiMapPin size={13} />
          <span>{validPoint ? '지도 핀 수정' : '지도·검색'}</span>
        </KitAddButton>
      </InputActionRow>

      {googleMapsSpec ? (
        <ReviewStripWrap>
          <ReviewToolbar>
            <StatusPill $pinned={googleMapsSpec.mode === 'pinned'}>
              <FiMapPin size={11} aria-hidden />
              {validPoint ? (
                <span>핀 고정 · {formatHeadquartersCoordinate(validPoint)}</span>
              ) : (
                <span>명칭 검색 기준 (핀 미지정)</span>
              )}
            </StatusPill>

            <ToolbarRightActions>
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
                  <FiX size={12} aria-hidden />
                  <span>핀 해제</span>
                </UnpinBtn>
              ) : null}
            </ToolbarRightActions>
          </ReviewToolbar>

          {previewExpanded ? (
            <InlineMapCard>
              <iframe
                key={googleMapsSpec.embedUrl}
                title={`${trimmedHq || departmentName || '청사 소재지'} 구글 지도 미리보기`}
                src={googleMapsSpec.embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </InlineMapCard>
          ) : null}
        </ReviewStripWrap>
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
  gap: 6px;
  width: 100%;
`

const InputActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`

const AutocompleteAnchor = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
`

const AutocompletePopover = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  padding: 4px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 8px;
  background: ${({ theme }) => kitC(theme).content};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 10px 24px rgba(0, 0, 0, 0.5)'
      : '0 10px 24px rgba(15, 23, 42, 0.12)'};
`

const AutocompleteItemBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.08)'
      : 'transparent'};
  text-align: left;
  font: inherit;
  cursor: pointer;

  .place-title {
    display: inline-flex;
    align-items: center;
    gap: 5px;
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

const ReviewStripWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ReviewToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 5px 10px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 8px;
  background: ${({ theme }) => kitC(theme).section};
`

const StatusPill = styled.span<{ $pinned: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: ${({ $pinned }) => ($pinned ? 600 : 500)};
  color: ${({ $pinned, theme }) =>
    $pinned
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : kitC(theme).textSecondary};
`

const ToolbarRightActions = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`

const TogglePreviewBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? kitC(theme).focus : kitC(theme).border};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.1)'
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

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
  }
`

const ExternalOpenLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).focus};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const UnpinBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  color: ${({ theme }) => kitC(theme).textMuted};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`

const InlineMapCard = styled.div`
  overflow: hidden;
  height: 210px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 9px;
  background: ${({ theme }) => kitC(theme).section};

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
`
