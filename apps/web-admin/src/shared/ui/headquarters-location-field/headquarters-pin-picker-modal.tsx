import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiCheck,
  FiColumns,
  FiCopy,
  FiExternalLink,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiNavigation,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { cityApi } from '@/shared/api/city'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { Modal, ModalFooter } from '@/shared/ui/modal'
import { kitC } from '@/shared/ui/register-form-kit/register-form-kit'

import {
  HEADQUARTERS_ZOOM_PRESETS,
  type HeadquartersGoogleMapLayer,
  type HeadquartersPoint,
  buildHeadquartersGoogleMapsSpec,
  buildHeadquartersSearchHints,
  clampValidWgs84,
  formatHeadquartersCoordinate,
  parseHeadquartersMapInput,
} from './headquarters-google-map.lib'

const HeadquartersPickerMap = lazy(() => import('./headquarters-picker-map'))

const HEADQUARTERS_MAX_LEN = 500

export interface HeadquartersPickerSaveValue {
  headquarters: string
  headquartersLatitude: number | null
  headquartersLongitude: number | null
}

export interface HeadquartersPinPickerModalProps {
  isOpen: boolean
  onClose: () => void
  initialHeadquarters: string
  initialLatitude: number | null
  initialLongitude: number | null
  countryName?: string | null
  departmentName?: string | null
  onSave: (nextValue: HeadquartersPickerSaveValue) => void
}

type PickerWorkspaceMode = 'pin' | 'split' | 'google'

export function HeadquartersPinPickerModal({
  isOpen,
  onClose,
  initialHeadquarters,
  initialLatitude,
  initialLongitude,
  countryName,
  departmentName,
  onSave,
}: HeadquartersPinPickerModalProps) {
  const initialPoint = clampValidWgs84(initialLatitude, initialLongitude)
  const [labelText, setLabelText] = useState(initialHeadquarters ?? '')
  const [point, setPoint] = useState<HeadquartersPoint | null>(initialPoint)
  const [flyToken, setFlyToken] = useState(0)
  const [mapMode, setMapMode] = useState<PickerWorkspaceMode>(() =>
    initialPoint ? 'split' : 'pin',
  )
  const [mapLayer, setMapLayer] =
    useState<HeadquartersGoogleMapLayer>('roadmap')
  const [zoomLevel, setZoomLevel] = useState<number>(16)
  const [copiedCoord, setCopiedCoord] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [queryText, setQueryText] = useState(() => {
    if (initialPoint) return ''
    return initialHeadquarters.trim()
  })
  const [activeIndex, setActiveIndex] = useState(0)
  const autoFilledNameRef = useRef<string | null>(null)
  const searchAnchorRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [suggestedPlaceName, setSuggestedPlaceName] = useState<string | null>(
    null,
  )

  const debouncedQuery = useDebouncedValue(queryText.trim(), 300)
  const parsedInput = useMemo(
    () => parseHeadquartersMapInput(queryText),
    [queryText],
  )
  const searchHints = useMemo(
    () =>
      buildHeadquartersSearchHints({
        headquarters: labelText || initialHeadquarters,
        departmentName,
        countryName,
      }),
    [labelText, initialHeadquarters, departmentName, countryName],
  )

  const placeSearchQuery = useQuery({
    queryKey: ['place-search', 'any', debouncedQuery],
    queryFn: () =>
      cityApi.searchPlaces(debouncedQuery, undefined, { anyPlace: true }),
    enabled:
      isOpen && debouncedQuery.length >= 2 && !parsedInput.isMapUrlOrCoord,
    staleTime: 5 * 60_000,
  })

  const placeResults = placeSearchQuery.data ?? []
  const isSearching =
    !parsedInput.isMapUrlOrCoord &&
    queryText.trim().length >= 2 &&
    (placeSearchQuery.isFetching || queryText.trim() !== debouncedQuery)

  const googleMapsSpec = useMemo(
    () =>
      buildHeadquartersGoogleMapsSpec({
        headquarters: labelText.trim() || queryText.trim(),
        latitude: point?.lat ?? null,
        longitude: point?.lng ?? null,
        countryName,
        zoom: point ? zoomLevel : Math.min(zoomLevel, 15),
        mapLayer,
      }),
    [labelText, queryText, point, countryName, zoomLevel, mapLayer],
  )

  const handleMapPick = useCallback(
    (nextPoint: HeadquartersPoint) => {
      setPoint(nextPoint)
      const trimmedQuery = queryText.trim()
      if (
        !labelText.trim() &&
        trimmedQuery &&
        !parseHeadquartersMapInput(trimmedQuery).isMapUrlOrCoord
      ) {
        setLabelText(trimmedQuery)
        autoFilledNameRef.current = trimmedQuery
      }
    },
    [labelText, queryText],
  )

  const applyParsedJump = (
    targetPoint: HeadquartersPoint | null,
    extractedLabel: string | null,
  ) => {
    if (targetPoint) {
      setPoint(targetPoint)
      setFlyToken((prevToken) => prevToken + 1)
      if (mapMode === 'pin') {
        setMapMode('split')
      }
    }
    if (extractedLabel) {
      const currentTrimmed = labelText.trim()
      if (!currentTrimmed || currentTrimmed === autoFilledNameRef.current) {
        setLabelText(extractedLabel)
        autoFilledNameRef.current = extractedLabel
        setSuggestedPlaceName(null)
      } else if (currentTrimmed !== extractedLabel) {
        setSuggestedPlaceName(extractedLabel)
      }
    }
    setQueryText('')
    setActiveIndex(0)
    setSearchFocused(false)
  }

  const choosePlaceResult = (placeItem: (typeof placeResults)[number]) => {
    const pickedPoint = clampValidWgs84(placeItem.lat, placeItem.lng)
    if (pickedPoint) {
      setPoint(pickedPoint)
      setFlyToken((prevToken) => prevToken + 1)
      if (mapMode === 'pin') {
        setMapMode('split')
      }
    }
    const currentTrimmed = labelText.trim()
    if (!currentTrimmed || currentTrimmed === autoFilledNameRef.current) {
      setLabelText(placeItem.shortName)
      autoFilledNameRef.current = placeItem.shortName
      setSuggestedPlaceName(null)
    } else if (currentTrimmed !== placeItem.shortName) {
      setSuggestedPlaceName(placeItem.shortName)
    } else {
      setSuggestedPlaceName(null)
    }
    setQueryText('')
    setActiveIndex(0)
    setSearchFocused(false)
  }

  const handleCopyCoordinate = async () => {
    if (!point) return
    const rawPair = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`
    try {
      await navigator.clipboard?.writeText(rawPair)
      setCopiedCoord(true)
      window.setTimeout(() => setCopiedCoord(false), 1600)
    } catch {
      // 클립보드 권한 불가 시 무시
    }
  }

  const handleSave = () => {
    onSave({
      headquarters: labelText.trim(),
      headquartersLatitude: point?.lat ?? null,
      headquartersLongitude: point?.lng ?? null,
    })
  }

  const canClearAll = Boolean(
    labelText.trim() ||
      point ||
      initialHeadquarters.trim() ||
      initialPoint !== null,
  )

  const showFloatingResults =
    searchFocused &&
    (queryText.trim().length >= 2 || parsedInput.isMapUrlOrCoord)

  const showGoogleControls =
    (mapMode === 'google' || mapMode === 'split') && Boolean(googleMapsSpec)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="청사 · 본부 소재지 위치 지정"
      subtitle="장소 검색이나 Google 지도 링크로 핀을 꽂고, 구글 지도·위성 뷰로 실제 위치를 대조하세요"
      maxWidth="880px"
    >
      <ModalContent
        onKeyDown={(keyEvent) => {
          if (
            (keyEvent.metaKey || keyEvent.ctrlKey) &&
            keyEvent.key === 'Enter'
          ) {
            keyEvent.preventDefault()
            handleSave()
          }
        }}
      >
        <SearchSection>
          <SearchAnchor
            ref={searchAnchorRef}
            onBlur={(blurEvent) => {
              if (
                searchAnchorRef.current &&
                blurEvent.relatedTarget instanceof Node &&
                searchAnchorRef.current.contains(blurEvent.relatedTarget)
              ) {
                return
              }
              setSearchFocused(false)
            }}
          >
            <SearchBox>
              <FiSearch size={15} aria-hidden />
              <SearchInput
                ref={searchInputRef}
                type="text"
                value={queryText}
                onFocus={() => setSearchFocused(true)}
                onChange={(changeEvent) => {
                  setQueryText(changeEvent.target.value)
                  setActiveIndex(0)
                  setSearchFocused(true)
                }}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'ArrowDown' && placeResults.length > 0) {
                    keyEvent.preventDefault()
                    setActiveIndex(
                      (prevIdx) => (prevIdx + 1) % placeResults.length,
                    )
                  } else if (
                    keyEvent.key === 'ArrowUp' &&
                    placeResults.length > 0
                  ) {
                    keyEvent.preventDefault()
                    setActiveIndex(
                      (prevIdx) =>
                        (prevIdx - 1 + placeResults.length) %
                        placeResults.length,
                    )
                  } else if (keyEvent.key === 'Enter') {
                    if (parsedInput.point || parsedInput.extractedLabel) {
                      keyEvent.preventDefault()
                      applyParsedJump(
                        parsedInput.point,
                        parsedInput.extractedLabel,
                      )
                    } else if (placeResults.length > 0) {
                      keyEvent.preventDefault()
                      const picked =
                        placeResults[
                          Math.min(activeIndex, placeResults.length - 1)
                        ] ?? placeResults[0]
                      if (picked) choosePlaceResult(picked)
                    }
                  } else if (keyEvent.key === 'Escape' && queryText) {
                    keyEvent.preventDefault()
                    setQueryText('')
                    setActiveIndex(0)
                  }
                }}
                placeholder="장소명, 위·경도 좌표, 또는 Google 지도 URL 붙여넣기 (예: 정부서울청사, 화이트홀, 37.5749, 126.9752)"
                aria-label="청사 장소 또는 좌표 검색"
              />
              {queryText ? (
                <SearchClearBtn
                  type="button"
                  aria-label="검색어 비우기"
                  onClick={() => {
                    setQueryText('')
                    setActiveIndex(0)
                    searchInputRef.current?.focus()
                  }}
                >
                  <FiX size={14} />
                </SearchClearBtn>
              ) : (
                <SearchKbdTag>Enter 선택</SearchKbdTag>
              )}
            </SearchBox>

            {showFloatingResults ? (
              <ResultPopover aria-live="polite">
                {parsedInput.point ? (
                  <li>
                    <ResultItemBtn
                      type="button"
                      $active
                      onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                      onClick={() =>
                        applyParsedJump(
                          parsedInput.point,
                          parsedInput.extractedLabel,
                        )
                      }
                    >
                      <ResultPinIcon $accent>
                        <FiNavigation size={12} />
                      </ResultPinIcon>
                      <ResultTextCol>
                        <ResultTitle>
                          {parsedInput.extractedLabel
                            ? `Google 지도 위치 적용 · ${parsedInput.extractedLabel}`
                            : '좌표로 바로 핀 이동'}
                        </ResultTitle>
                        <ResultSub>
                          {formatHeadquartersCoordinate(parsedInput.point)}
                        </ResultSub>
                      </ResultTextCol>
                      <ResultActionBadge>핀 적용</ResultActionBadge>
                    </ResultItemBtn>
                  </li>
                ) : parsedInput.extractedLabel ? (
                  <li>
                    <ResultItemBtn
                      type="button"
                      $active
                      onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                      onClick={() => {
                        setQueryText(parsedInput.extractedLabel ?? '')
                        setSearchFocused(true)
                      }}
                    >
                      <ResultPinIcon $accent>
                        <FiSearch size={12} />
                      </ResultPinIcon>
                      <ResultTextCol>
                        <ResultTitle>
                          추출된 장소명으로 검색: {parsedInput.extractedLabel}
                        </ResultTitle>
                        <ResultSub>
                          클릭하면 해당 장소명으로 좌표를 검색합니다
                        </ResultSub>
                      </ResultTextCol>
                    </ResultItemBtn>
                  </li>
                ) : null}

                {!parsedInput.isMapUrlOrCoord &&
                  isSearching &&
                  placeResults.length === 0 && (
                    <ResultEmptyItem>장소를 검색하는 중…</ResultEmptyItem>
                  )}

                {!parsedInput.isMapUrlOrCoord &&
                  !isSearching &&
                  placeResults.length === 0 && (
                    <ResultEmptyItem>
                      일치하는 장소를 찾지 못했습니다. 현대 지명·영문명으로
                      검색하거나, Google 지도 주소를 붙여넣거나, 아래 지도를
                      클릭해 핀을 꽂아주세요.
                    </ResultEmptyItem>
                  )}

                {placeResults.map((placeItem, resultIndex) => (
                  <li key={placeItem.placeId}>
                    <ResultItemBtn
                      type="button"
                      $active={resultIndex === activeIndex}
                      onMouseEnter={() => setActiveIndex(resultIndex)}
                      onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                      onClick={() => choosePlaceResult(placeItem)}
                    >
                      <ResultPinIcon>
                        <FiMapPin size={12} />
                      </ResultPinIcon>
                      <ResultTextCol>
                        <ResultTitle>{placeItem.shortName}</ResultTitle>
                        <ResultSub>{placeItem.displayName}</ResultSub>
                      </ResultTextCol>
                      <ResultActionBadge>선택</ResultActionBadge>
                    </ResultItemBtn>
                  </li>
                ))}
              </ResultPopover>
            ) : null}
          </SearchAnchor>

          {searchHints.length > 0 ? (
            <HintChipRow aria-label="빠른 장소 검색어">
              <HintChipLabel>추천 검색</HintChipLabel>
              {searchHints.map((hintItem) => (
                <HintChipBtn
                  key={hintItem}
                  type="button"
                  $active={queryText.trim() === hintItem}
                  onClick={() => {
                    setQueryText(hintItem)
                    setActiveIndex(0)
                    setSearchFocused(true)
                    searchInputRef.current?.focus()
                  }}
                >
                  {hintItem}
                </HintChipBtn>
              ))}
            </HintChipRow>
          ) : null}
        </SearchSection>

        <MapShell>
          <MapToolbar>
            <ModeSwitch role="tablist" aria-label="지도 표시 방식">
              <ModeTabBtn
                type="button"
                role="tab"
                aria-selected={mapMode === 'pin'}
                $active={mapMode === 'pin'}
                onClick={() => setMapMode('pin')}
              >
                <FiMapPin size={12} />
                <span>핀 찍기</span>
              </ModeTabBtn>
              <ModeTabBtn
                type="button"
                role="tab"
                aria-selected={mapMode === 'split'}
                $active={mapMode === 'split'}
                disabled={!googleMapsSpec}
                onClick={() => setMapMode('split')}
                title="좌측에서 핀을 옮기면서 우측 Google 지도로 즉시 비교합니다"
              >
                <FiColumns size={12} />
                <span>나란히 비교</span>
              </ModeTabBtn>
              <ModeTabBtn
                type="button"
                role="tab"
                aria-selected={mapMode === 'google'}
                $active={mapMode === 'google'}
                disabled={!googleMapsSpec}
                onClick={() => setMapMode('google')}
              >
                <FiGlobe size={12} />
                <span>구글 지도 검토</span>
              </ModeTabBtn>
            </ModeSwitch>

            <ToolbarRightCluster>
              {showGoogleControls ? (
                <>
                  <MiniSwitchGroup role="group" aria-label="구글 지도 레이어">
                    <MiniSwitchBtn
                      type="button"
                      $active={mapLayer === 'roadmap'}
                      onClick={() => setMapLayer('roadmap')}
                    >
                      일반
                    </MiniSwitchBtn>
                    <MiniSwitchBtn
                      type="button"
                      $active={mapLayer === 'hybrid'}
                      onClick={() => setMapLayer('hybrid')}
                    >
                      <FiLayers size={10.5} />
                      위성
                    </MiniSwitchBtn>
                  </MiniSwitchGroup>

                  <MiniSwitchGroup role="group" aria-label="구글 지도 배율">
                    {HEADQUARTERS_ZOOM_PRESETS.map((presetItem) => (
                      <MiniSwitchBtn
                        key={presetItem.key}
                        type="button"
                        $active={zoomLevel === presetItem.zoom}
                        onClick={() => setZoomLevel(presetItem.zoom)}
                      >
                        {presetItem.label}
                      </MiniSwitchBtn>
                    ))}
                  </MiniSwitchGroup>
                </>
              ) : null}

              {googleMapsSpec ? (
                <ExternalMapLink
                  href={googleMapsSpec.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Google 지도 새 창</span>
                  <FiExternalLink size={11.5} />
                </ExternalMapLink>
              ) : null}
            </ToolbarRightCluster>
          </MapToolbar>

          {mapMode === 'split' && googleMapsSpec ? (
            <SplitMapGrid>
              <SplitPane>
                <PaneCaption>
                  <FiMapPin size={11} />
                  <span>핀 미세 조정 (클릭 · 드래그)</span>
                </PaneCaption>
                <Suspense
                  fallback={<MapFallback>지도를 불러오는 중…</MapFallback>}
                >
                  <HeadquartersPickerMap
                    point={point}
                    onPick={handleMapPick}
                    flyToken={flyToken}
                    height={284}
                  />
                </Suspense>
              </SplitPane>

              <SplitPane>
                <PaneCaption>
                  <FiGlobe size={11} />
                  <span>
                    Google 지도 실시간 대조 (
                    {mapLayer === 'hybrid' ? '위성·라벨' : '일반 지도'})
                  </span>
                </PaneCaption>
                <GoogleIframeWrap $height={284}>
                  <iframe
                    key={googleMapsSpec.embedUrl}
                    title="청사 소재지 구글 지도 검토"
                    src={googleMapsSpec.embedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </GoogleIframeWrap>
              </SplitPane>
            </SplitMapGrid>
          ) : mapMode === 'google' && googleMapsSpec ? (
            <GoogleIframeWrap $height={312}>
              <iframe
                key={googleMapsSpec.embedUrl}
                title="청사 소재지 구글 지도 검토"
                src={googleMapsSpec.embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </GoogleIframeWrap>
          ) : (
            <Suspense fallback={<MapFallback>지도를 불러오는 중…</MapFallback>}>
              <HeadquartersPickerMap
                point={point}
                onPick={handleMapPick}
                flyToken={flyToken}
                height={312}
              />
            </Suspense>
          )}

          <MapFooterBar>
            <CoordReadout>
              <CoordDot $pinned={point !== null} />
              {point ? (
                <>
                  <strong>{formatHeadquartersCoordinate(point)}</strong>
                  <MonoRawCoord>
                    ({point.lat.toFixed(5)}, {point.lng.toFixed(5)})
                  </MonoRawCoord>
                </>
              ) : (
                <span>
                  지도를 클릭해 핀을 꽂으면 역사 지명(예: 한성부 육조거리)도
                  정확한 현대 좌표와 연결됩니다
                </span>
              )}
            </CoordReadout>

            {point ? (
              <FooterCoordActions>
                <SmallUtilityBtn
                  type="button"
                  onClick={() => void handleCopyCoordinate()}
                >
                  {copiedCoord ? (
                    <>
                      <FiCheck size={11.5} />
                      <span>복사됨</span>
                    </>
                  ) : (
                    <>
                      <FiCopy size={11.5} />
                      <span>좌표 복사</span>
                    </>
                  )}
                </SmallUtilityBtn>
                <SmallUtilityBtn
                  type="button"
                  $danger
                  onClick={() => setPoint(null)}
                >
                  <FiX size={12} />
                  <span>핀 해제</span>
                </SmallUtilityBtn>
              </FooterCoordActions>
            ) : null}
          </MapFooterBar>
        </MapShell>

        <FieldCard>
          <FieldTopRow>
            <LabelGroup>
              <LabelEl htmlFor="hq-picker-label-input">
                청사 · 본부 표기명
              </LabelEl>
              <LabelSubTag>화면에 표시될 공식·역사 명칭</LabelSubTag>
            </LabelGroup>

            {suggestedPlaceName && suggestedPlaceName !== labelText.trim() ? (
              <SuggestChipBtn
                type="button"
                onClick={() => {
                  setLabelText(suggestedPlaceName)
                  autoFilledNameRef.current = suggestedPlaceName
                  setSuggestedPlaceName(null)
                }}
              >
                &lsquo;{suggestedPlaceName}&rsquo;(으)로 이름 채우기
              </SuggestChipBtn>
            ) : null}
          </FieldTopRow>

          <TextInput
            id="hq-picker-label-input"
            type="text"
            maxLength={HEADQUARTERS_MAX_LEN}
            value={labelText}
            onChange={(changeEvent) => setLabelText(changeEvent.target.value)}
            placeholder="예: 서울 정부서울청사, 한성부 광화문 앞 육조거리, 런던 화이트홀, 베를린 빌헬름가 74번지"
          />

          <SubtleHint>
            당대의 역사적 지명·청사명을 그대로 적어도 위에서 찍은 현대 지도 핀은
            별도로 보존됩니다.
          </SubtleHint>
        </FieldCard>
      </ModalContent>

      <ModalFooter>
        {canClearAll ? (
          <DangerClearBtn
            type="button"
            onClick={() =>
              onSave({
                headquarters: '',
                headquartersLatitude: null,
                headquartersLongitude: null,
              })
            }
          >
            소재지·핀 모두 비우기
          </DangerClearBtn>
        ) : null}
        <CancelBtn type="button" onClick={onClose}>
          취소
        </CancelBtn>
        <ApplyBtn type="button" onClick={handleSave}>
          적용
        </ApplyBtn>
      </ModalFooter>
    </Modal>
  )
}

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 6px 24px 16px;
  overflow-y: auto;
`

const SearchSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SearchAnchor = styled.div`
  position: relative;
  z-index: 35;
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 10px 0 13px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 9px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#252525' : '#f8fafc'};
  color: ${({ theme }) => kitC(theme).textSecondary};
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &:focus-within {
    border-color: ${({ theme }) => kitC(theme).focus};
    background: ${({ theme }) => kitC(theme).content};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
`

const SearchInput = styled.input`
  flex: 1;
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

const SearchClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => kitC(theme).textMuted};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => kitC(theme).textPrimary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
  }
`

const SearchKbdTag = styled.span`
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textMuted};

  @media (max-width: 600px) {
    display: none;
  }
`

const ResultPopover = styled.ul`
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  max-height: 220px;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 10px;
  background: ${({ theme }) => kitC(theme).content};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 16px 36px rgba(0, 0, 0, 0.6)'
      : '0 14px 32px rgba(15, 23, 42, 0.14)'};
`

const ResultEmptyItem = styled.li`
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const ResultItemBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.08)'
      : 'transparent'};
  text-align: left;
  font: inherit;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.08)'};
  }
`

const ResultPinIcon = styled.span<{ $accent?: boolean }>`
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

const ResultTextCol = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const ResultTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textPrimary};
`

const ResultSub = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const ResultActionBadge = styled.span`
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

const HintChipRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const HintChipLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const HintChipBtn = styled.button<{ $active?: boolean }>`
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? kitC(theme).focus : kitC(theme).border};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.08)'
      : kitC(theme).content};
  color: ${({ $active, theme }) =>
    $active ? kitC(theme).focus : kitC(theme).textSecondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
    color: ${({ theme }) => kitC(theme).focus};
  }
`

const MapShell = styled.div`
  overflow: hidden;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 11px;
  background: ${({ theme }) => kitC(theme).section};
  isolation: isolate;
`

const MapToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 7px 10px;
  border-bottom: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
`

const ModeSwitch = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
`

const ModeTabBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 5px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.12)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : kitC(theme).textSecondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.14s ease,
    color 0.14s ease;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const ToolbarRightCluster = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
`

const MiniSwitchGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
`

const MiniSwitchBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 7px;
  border: none;
  border-radius: 4px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
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
`

const ExternalMapLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).focus};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.07)'};
  }
`

const SplitMapGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: ${({ theme }) => kitC(theme).border};
  gap: 1px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const SplitPane = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: ${({ theme }) => kitC(theme).section};
`

const PaneCaption = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-bottom: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const GoogleIframeWrap = styled.div<{ $height: number }>`
  width: 100%;
  height: ${({ $height }) => $height}px;

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
`

const MapFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 284px;
  font-size: 12.5px;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const MapFooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 7px 12px;
  border-top: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
`

const CoordReadout = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  font-size: 12px;
  color: ${({ theme }) => kitC(theme).textSecondary};

  strong {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
`

const CoordDot = styled.span<{ $pinned: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $pinned }) => ($pinned ? '#10b981' : '#94a3b8')};
  box-shadow: ${({ $pinned }) =>
    $pinned ? '0 0 0 3px rgba(16, 185, 129, 0.16)' : 'none'};
`

const MonoRawCoord = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const FooterCoordActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
`

const SmallUtilityBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  color: ${({ $danger, theme }) =>
    $danger ? theme.colors.error : kitC(theme).textSecondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    color 0.14s ease,
    background 0.14s ease;

  &:hover {
    border-color: ${({ $danger, theme }) =>
      $danger ? theme.colors.error : kitC(theme).borderHover};
    color: ${({ $danger, theme }) =>
      $danger ? theme.colors.error : kitC(theme).textPrimary};
  }
`

const FieldCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 11px 13px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 10px;
  background: ${({ theme }) => kitC(theme).section};
`

const FieldTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`

const LabelGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`

const LabelEl = styled.label`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => kitC(theme).textPrimary};
`

const LabelSubTag = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const SuggestChipBtn = styled.button`
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.4)'
        : 'rgba(99, 102, 241, 0.3)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.16)'
      : 'rgba(99, 102, 241, 0.08)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
  }
`

const TextInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 8px;
  background: ${({ theme }) => kitC(theme).content};
  font: inherit;
  font-size: 13.5px;
  color: ${({ theme }) => kitC(theme).textPrimary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => kitC(theme).focus};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
`

const SubtleHint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const DangerClearBtn = styled.button`
  margin-right: auto;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.error};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.14)' : '#fef2f2'};
  }
`

const CancelBtn = styled.button`
  height: 36px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 8px;
  background: ${({ theme }) => kitC(theme).content};
  color: ${({ theme }) => kitC(theme).textPrimary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const ApplyBtn = styled.button`
  height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`
