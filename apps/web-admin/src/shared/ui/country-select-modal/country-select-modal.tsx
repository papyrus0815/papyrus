/**
 * 국가 선택 모달 컴포넌트
 */
import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { createPortal } from 'react-dom'

import { useVirtualizer } from '@tanstack/react-virtual'

import { FiCheck, FiGlobe, FiSearch, FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { useContinents } from '@/features/continent/use-continents.hook'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { glassCardMixin } from '@/shared/styles/mixins'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'
import {
  AddButton,
  SaveButton,
  SectionTabHeader,
} from '@/shared/ui/section-page-layout'
import { UnderlineTabButton, UnderlineTabNav } from '@/shared/ui/underline-tabs'

interface CountrySelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (country: {
    id: string
    name: string
    isHistorical: boolean
  }) => void
  modernCountries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]
  title?: string
  selectedCountryId?: string
  selectedCountryIds?: string[] // 복수 선택용
  multiSelect?: boolean // 복수 선택 모드
}

type CountryType = 'modern' | 'historical'

type CountrySortField =
  | 'name'
  | 'isoCode'
  | 'continent'
  | 'startYear'
  | 'population'
  | 'areaSqKm'

function filterCountryList(
  countries: (CountryResponseDto | HistoricalCountryResponseDto)[],
  queryTrimmed: string,
  continentNameById: Map<string, string>,
): (CountryResponseDto | HistoricalCountryResponseDto)[] {
  if (!queryTrimmed) return countries
  const query = queryTrimmed.toLowerCase()
  return countries.filter((country) => {
    const modern = country as CountryResponseDto
    const historical = country as HistoricalCountryResponseDto
    const candidates = [
      country.name,
      modern.localName,
      modern.isoCode,
      modern.continentId ? continentNameById.get(modern.continentId) : undefined,
      historical.enName,
    ]
    return candidates.some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(query),
    )
  })
}

function sortCountryList(
  list: (CountryResponseDto | HistoricalCountryResponseDto)[],
  countryType: CountryType,
  sortBy: CountrySortField,
  sortOrder: 'asc' | 'desc',
  continentNameById: Map<string, string>,
): (CountryResponseDto | HistoricalCountryResponseDto)[] {
  const mult = sortOrder === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (countryType === 'modern') {
      const ma = a as CountryResponseDto
      const mb = b as CountryResponseDto
      if (sortBy === 'name') return mult * ma.name.localeCompare(mb.name, 'ko')
      if (sortBy === 'isoCode') {
        const va = ma.isoCode ?? ''
        const vb = mb.isoCode ?? ''
        return mult * va.localeCompare(vb)
      }
      if (sortBy === 'continent') {
        const va =
          (ma.continentId ? continentNameById.get(ma.continentId) : '') ?? ''
        const vb =
          (mb.continentId ? continentNameById.get(mb.continentId) : '') ?? ''
        return (
          mult * va.localeCompare(vb, 'ko') ||
          mult * ma.name.localeCompare(mb.name, 'ko')
        )
      }
      if (sortBy === 'population') {
        const parseNum = (v: string | null | undefined) => {
          if (v == null || v === '') return -1
          const n = Number(String(v).replace(/[^0-9.-]/g, ''))
          return Number.isFinite(n) ? n : -1
        }
        const va = parseNum(ma.population)
        const vb = parseNum(mb.population)
        return mult * (va - vb) || mult * ma.name.localeCompare(mb.name, 'ko')
      }
      if (sortBy === 'areaSqKm') {
        const va = ma.areaSqKm ?? -1
        const vb = mb.areaSqKm ?? -1
        return mult * (va - vb) || mult * ma.name.localeCompare(mb.name, 'ko')
      }
    } else {
      const ha = a as HistoricalCountryResponseDto
      const hb = b as HistoricalCountryResponseDto
      if (sortBy === 'startYear') {
        const va = ha.startYear ?? -1
        const vb = hb.startYear ?? -1
        return mult * (va - vb) || mult * ha.name.localeCompare(hb.name, 'ko')
      }
      return mult * ha.name.localeCompare(hb.name, 'ko')
    }
    return 0
  })
}

export const CountrySelectModal: React.FC<CountrySelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  modernCountries,
  historicalCountries,
  title = '국가 선택',
  selectedCountryId,
  selectedCountryIds = [],
  multiSelect = false,
}) => {
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')
  const [countryType, setCountryType] = useState<CountryType>('modern')
  const [sortBy, setSortBy] = useState<CountrySortField>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  useEffect(() => {
    if (
      countryType === 'historical' &&
      (sortBy === 'isoCode' ||
        sortBy === 'continent' ||
        sortBy === 'population' ||
        sortBy === 'areaSqKm')
    ) {
      setSortBy('name')
    }
    if (countryType === 'modern' && sortBy === 'startYear') {
      setSortBy('name')
    }
  }, [countryType, sortBy])

  const selectedCount = useMemo(() => {
    if (multiSelect) return selectedCountryIds.length
    return selectedCountryId ? 1 : 0
  }, [multiSelect, selectedCountryIds.length, selectedCountryId])

  const deferredSearch = useDeferredValue(searchQuery.trim())

  // 대륙 이름 표시용 — CountryResponseDto에는 continentId만 있어 이름은 대륙 목록에서 매핑
  const { data: continentList } = useContinents()
  const continentNameById = useMemo(() => {
    const map = new Map<string, string>()
    ;(continentList ?? []).forEach((continent) => {
      map.set(continent.id, continent.name)
    })
    return map
  }, [continentList])

  const filteredModernCountries = useMemo(() => {
    if (!isOpen) return []
    return filterCountryList(modernCountries, deferredSearch, continentNameById)
  }, [isOpen, modernCountries, deferredSearch, continentNameById])

  const filteredHistoricalCountries = useMemo(() => {
    if (!isOpen) return []
    return filterCountryList(
      historicalCountries,
      deferredSearch,
      continentNameById,
    )
  }, [isOpen, historicalCountries, deferredSearch, continentNameById])

  const displayCountries = useMemo(() => {
    if (!isOpen) return []
    const list =
      countryType === 'modern'
        ? filteredModernCountries
        : filteredHistoricalCountries
    return sortCountryList(list, countryType, sortBy, sortOrder, continentNameById)
  }, [
    isOpen,
    countryType,
    filteredModernCountries,
    filteredHistoricalCountries,
    sortBy,
    sortOrder,
    continentNameById,
  ])

  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const [gridColumns, setGridColumns] = useState(4)

  useLayoutEffect(() => {
    if (!isOpen) return
    const root = scrollViewportRef.current
    if (!root) return
    const computeCols = () => {
      const w = root.clientWidth
      const horizontalPad = 56
      const inner = Math.max(0, w - horizontalPad)
      const minCard = 200
      const gap = 16
      const cols = Math.max(1, Math.floor((inner + gap) / (minCard + gap)))
      setGridColumns(cols)
    }
    computeCols()
    const ro = new ResizeObserver(() => computeCols())
    ro.observe(root)
    return () => ro.disconnect()
  }, [isOpen])

  const countryRows = useMemo(() => {
    if (displayCountries.length === 0) return []
    const c = Math.max(1, gridColumns)
    const rows: (CountryResponseDto | HistoricalCountryResponseDto)[][] = []
    for (let i = 0; i < displayCountries.length; i += c) {
      rows.push(displayCountries.slice(i, i + c))
    }
    return rows
  }, [displayCountries, gridColumns])

  const rowVirtualizer = useVirtualizer({
    count: countryRows.length,
    getScrollElement: () => scrollViewportRef.current,
    estimateSize: () => 188,
    overscan: 8,
    measureElement:
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !navigator.userAgent.includes('Firefox')
        ? (el) => (el as HTMLElement).getBoundingClientRect().height
        : undefined,
  })

  useEffect(() => {
    if (isOpen) {
      scrollViewportRef.current?.scrollTo({ top: 0 })
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (
      country: CountryResponseDto | HistoricalCountryResponseDto,
      isHistorical: boolean,
    ) => {
      playClickSound()
      onSelect({
        id: country.id,
        name: country.name,
        isHistorical,
      })
      if (!multiSelect) {
        onClose()
      }
    },
    [playClickSound, onSelect, multiSelect, onClose],
  )

  if (!isOpen) return null

  const modalDescription =
    multiSelect === true
      ? '비교할 국가를 여러 개 고를 수 있습니다. 검색 후 카드를 눌러 선택하세요.'
      : '검색으로 국가를 찾은 뒤 하나를 선택하면 적용됩니다.'

  return createPortal(
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <SectionTabHeader
            variant="plain"
            title={title}
            description={modalDescription}
            leftSlot={
              <HeaderIconWrap aria-hidden>
                <FiGlobe size={22} strokeWidth={2} />
              </HeaderIconWrap>
            }
            rightSlot={
              <CloseButton type="button" onClick={onClose} aria-label="닫기">
                <FiX size={20} strokeWidth={2} />
              </CloseButton>
            }
          />
        </ModalHeader>

        <ModalBody>
          {/* 검색창 */}
          <SearchSection>
            <SearchInputWrapper>
              <SearchIcon>
                <FiSearch size={18} />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="국가명, 현지명, ISO 코드로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <ClearButton
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setSearchQuery('')
                  }}
                >
                  <FiX size={16} />
                </ClearButton>
              )}
            </SearchInputWrapper>
          </SearchSection>

          {/* 국가 유형 탭 + 정렬 (행정조직·지도 탭과 동일한 밑줄 탭) */}
          <ToolbarSection>
            <TypeTabNav>
              <UnderlineTabButton
                type="button"
                $active={countryType === 'modern'}
                onClick={() => {
                  playClickSound()
                  setCountryType('modern')
                }}
              >
                현대 국가
                <TabCount $active={countryType === 'modern'}>
                  {filteredModernCountries.length}
                </TabCount>
              </UnderlineTabButton>
              <UnderlineTabButton
                type="button"
                $active={countryType === 'historical'}
                onClick={() => {
                  playClickSound()
                  setCountryType('historical')
                }}
              >
                역사 국가
                <TabCount $active={countryType === 'historical'}>
                  {filteredHistoricalCountries.length}
                </TabCount>
              </UnderlineTabButton>
            </TypeTabNav>
            <SortToolsRow>
              <SortLabel>정렬</SortLabel>
              <SortFieldSelect
                value={sortBy}
                onChange={(e) => {
                  playClickSound()
                  setSortBy(
                    e.target.value as
                      | 'name'
                      | 'isoCode'
                      | 'continent'
                      | 'startYear'
                      | 'population'
                      | 'areaSqKm',
                  )
                }}
              >
                {countryType === 'modern' ? (
                  <>
                    <option value="name">이름</option>
                    <option value="isoCode">ISO 코드</option>
                    <option value="continent">대륙</option>
                    <option value="population">인구</option>
                    <option value="areaSqKm">면적</option>
                  </>
                ) : (
                  <>
                    <option value="name">이름</option>
                    <option value="startYear">시작년도</option>
                  </>
                )}
              </SortFieldSelect>
              <SortOrderGroup>
                <SortOrderBtn
                  type="button"
                  $active={sortOrder === 'asc'}
                  onClick={() => {
                    playClickSound()
                    setSortOrder('asc')
                  }}
                >
                  오름차순
                </SortOrderBtn>
                <SortOrderBtn
                  type="button"
                  $active={sortOrder === 'desc'}
                  onClick={() => {
                    playClickSound()
                    setSortOrder('desc')
                  }}
                >
                  내림차순
                </SortOrderBtn>
              </SortOrderGroup>
            </SortToolsRow>
            <ResultSummary aria-live="polite">
              {searchQuery.trim()
                ? `"${searchQuery}" 검색 결과 ${displayCountries.length}개`
                : `${countryType === 'modern' ? '현대 국가' : '역사 국가'} ${displayCountries.length}개`}
            </ResultSummary>
          </ToolbarSection>

          {/* 국가 목록 — 가상 스크롤(행 단위 그리드)로 대량 목록 렉 완화 */}
          <CardGrid ref={scrollViewportRef}>
            {displayCountries.length === 0 ? (
              <GridEmptyState>
                <FiGlobe size={48} />
                <EmptyText>
                  {searchQuery
                    ? '검색 결과가 없습니다'
                    : '국가 정보가 없습니다'}
                </EmptyText>
              </GridEmptyState>
            ) : (
              <VirtualGridSizer
                style={{ height: rowVirtualizer.getTotalSize() }}
              >
                {rowVirtualizer.getVirtualItems().map((vRow) => (
                  <CardGridVirtualRow
                    key={vRow.key}
                    data-index={vRow.index}
                    ref={rowVirtualizer.measureElement}
                    $cols={gridColumns}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vRow.start}px)`,
                    }}
                  >
                    {countryRows[vRow.index]?.map((country) => {
                      const isSelected = multiSelect
                        ? selectedCountryIds.includes(country.id)
                        : selectedCountryId === country.id
                      const continentId =
                        countryType === 'modern'
                          ? (country as CountryResponseDto).continentId
                          : null
                      return (
                        <CountryGridCard
                          key={country.id}
                          country={country}
                          countryType={countryType}
                          isSelected={isSelected}
                          onPick={handleSelect}
                          continentName={
                            continentId
                              ? continentNameById.get(continentId)
                              : undefined
                          }
                        />
                      )
                    })}
                  </CardGridVirtualRow>
                ))}
              </VirtualGridSizer>
            )}
          </CardGrid>
        </ModalBody>
        <ModalFooter>
          <FooterInfo>
            {multiSelect
              ? `선택 ${selectedCount}개 국가`
              : selectedCount > 0
                ? '국가를 선택했습니다'
                : '목록에서 국가를 선택하세요'}
          </FooterInfo>
          <FooterActions>
            {multiSelect ? (
              <SaveButton type="button" onClick={onClose}>
                선택 완료
              </SaveButton>
            ) : (
              <AddButton type="button" onClick={onClose}>
                닫기
              </AddButton>
            )}
          </FooterActions>
        </ModalFooter>
      </ModalContainer>
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  -webkit-backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  padding: clamp(12px, 3vw, 28px);
  animation: overlayIn 0.2s ease;
  @keyframes overlayIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

/** 국가 상세 폼 카드·대시보드 카드와 동일한 톤 */
const ModalContainer = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  width: 100%;
  max-width: min(1240px, 96vw);
  /* max-height만 있으면 flex 자식(flex:1)이 세로 공간을 못 받아 목록이 쪼그라듦 */
  height: min(98vh, 1800px);
  max-height: min(98vh, 1800px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  ${css`
    @supports (height: 100dvh) {
      height: min(98dvh, 1800px);
      max-height: min(98dvh, 1800px);
    }
  `}
  border-radius: 16px;
  animation: modalUp 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  @keyframes modalUp {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const ModalHeader = styled.div`
  flex: 0 0 auto;
  padding: 24px 28px 0;

  @media (max-width: 640px) {
    padding: 20px 20px 0;
  }
`

const HeaderIconWrap = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          color: ${theme.colors.text.secondary};
          background: ${theme.colors.background.tertiary};
          border: 1px solid ${theme.colors.border.medium};
          box-shadow: inset 3px 0 0 0 ${theme.colors.primary}55;
        `
      : css`
          color: ${theme.colors.text.secondary};
          background: ${theme.colors.background.secondary};
          border: 1px solid ${theme.colors.border.default};
          box-shadow: inset 3px 0 0 0 ${theme.colors.primary}35;
        `}
`

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.background.secondary
      : theme.colors.background.primary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? theme.colors.background.tertiary
        : theme.colors.background.secondary};
  }
`

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1 1 0;
  min-height: 0;
`

const SearchSection = styled.div`
  flex: 0 0 auto;
  padding: 20px 28px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};

  @media (max-width: 640px) {
    padding: 16px 20px 14px;
  }
`

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  pointer-events: none;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 48px 12px 44px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 12px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${theme.colors.background.secondary};
          border: 1px solid ${theme.colors.border.default};
        `
      : css`
          background: #ffffff;
          border: 1px solid #e8ecf1;
        `}

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 400;
  }

  &:focus {
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            border-color: ${theme.colors.border.dark};
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
          `
        : css`
            border-color: ${theme.colors.border.dark};
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
          `}
  }
`

const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ToolbarSection = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 28px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};

  @media (max-width: 640px) {
    padding: 14px 20px 16px;
  }
`

const TypeTabNav = styled(UnderlineTabNav)`
  margin-bottom: 0;
  width: 100%;
`

const TabCount = styled.span<{ $active?: boolean }>`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 999px;
  line-height: 1.3;
  ${({ theme, $active }) =>
    $active
      ? css`
          background: ${theme.colors.background.tertiary};
          color: ${theme.colors.text.primary};
          box-shadow: inset 2px 0 0 0 ${theme.colors.primary}45;
        `
      : css`
          background: ${theme.colors.background.secondary};
          color: ${theme.colors.text.tertiary};
        `}
`

const SortToolsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px 14px;
  flex-wrap: wrap;
`

const SortLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SortFieldSelect = styled.select`
  padding: 8px 32px 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 12px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background-color: ${theme.colors.background.secondary};
          border: 1px solid ${theme.colors.border.default};
        `
      : css`
          background-color: #ffffff;
          border: 1px solid #e8ecf1;
        `}

  &:focus {
    outline: none;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            border-color: ${theme.colors.border.dark};
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
          `
        : css`
            border-color: ${theme.colors.border.dark};
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
          `}
  }
`

const SortOrderGroup = styled.div`
  display: flex;
  gap: 4px;
`

const ResultSummary = styled.div`
  width: 100%;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.45;
`

const SortOrderBtn = styled.button<{ $active: boolean }>`
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
  ${({ theme, $active }) =>
    $active
      ? css`
          color: ${theme.colors.text.primary};
          background: ${theme.colors.background.tertiary};
          border: 1px solid ${theme.colors.border.medium};
          box-shadow: inset 0 -2px 0 0 ${theme.colors.primary}55;
        `
      : css`
          color: ${theme.colors.text.secondary};
          background: ${theme.mode === 'dark'
            ? 'transparent'
            : theme.colors.background.primary};
          border: 1px solid ${theme.colors.border.default};
        `}

  &:hover {
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            border-color: ${theme.colors.border.dark};
            color: ${theme.colors.text.primary};
          `
        : css`
            border-color: ${theme.colors.border.medium};
            color: ${theme.colors.text.primary};
          `}
  }
`

const CardGrid = styled.div`
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 28px 28px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: ${({ theme }) => theme.colors.background.primary};

  @media (max-width: 640px) {
    padding: 16px 20px 22px;
  }

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : theme.colors.border.light};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1'};
    border-radius: 4px;
    &:hover {
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.25)' : '#94a3b8'};
    }
  }
`

/** 국가 대시보드 StatCard / InfoCard 톤 — 그리드 행마다 동일 높이(stretch) */
const CountryCard = styled.button<{ $selected: boolean }>`
  position: relative;
  box-sizing: border-box;
  min-height: 156px;
  height: 100%;
  align-self: stretch;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 10px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-width: 0;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
  ${({ theme, $selected }) =>
    $selected
      ? css`
          color: ${theme.colors.text.primary};
          border: 1px solid
            ${theme.mode === 'dark'
              ? theme.colors.border.dark
              : theme.colors.border.dark};
          background: ${theme.mode === 'dark'
            ? theme.colors.background.secondary
            : theme.colors.background.secondary};
          box-shadow:
            ${theme.mode === 'dark'
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : `0 1px 3px ${theme.colors.shadow.sm}`},
            inset 0 0 0 1px ${theme.colors.primary}22;
        `
      : css`
          font-weight: 600;
          color: ${theme.colors.text.primary};
          border: 1px solid
            ${theme.mode === 'dark' ? theme.colors.border.default : '#e8ecf1'};
          background: ${theme.mode === 'dark'
            ? theme.colors.background.secondary
            : '#ffffff'};
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        `}

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? theme.colors.border.dark
        : theme.colors.border.medium};
    box-shadow: ${({ theme, $selected }) =>
      $selected
        ? theme.mode === 'dark'
          ? `0 2px 10px rgba(0,0,0,0.4)`
          : `0 2px 10px rgba(0, 0, 0, 0.08)`
        : theme.mode === 'dark'
          ? `0 2px 8px rgba(0, 0, 0, 0.35)`
          : `0 4px 16px rgba(0, 0, 0, 0.06)`};
    ${({ theme, $selected }) =>
      !$selected &&
      css`
        background: ${theme.mode === 'dark'
          ? theme.colors.background.tertiary
          : theme.colors.background.secondary};
      `}
  }
`

const CardTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
`

/** 국기·대체 아이콘 동일 박스 — 카드 정렬 통일 */
const CardFlagSlot = styled.span`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${theme.colors.background.tertiary};
          border: 1px solid ${theme.colors.border.default};
        `
      : css`
          background: transparent;
          border: 1px solid ${theme.colors.border.light};
        `}
`

const CardFlagEmoji = styled.span`
  font-size: 22px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CardFlagSvg = styled.svg`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CardTitleBlock = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const CardName = styled.span`
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  min-height: calc(1.35em * 2);
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
`

const CardCheckPlaceholder = styled.span`
  width: 26px;
  height: 26px;
  flex-shrink: 0;
`

const CardMetaList = styled.div`
  width: 100%;
  min-width: 0;
  min-height: 5rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
  flex: 1 1 auto;
  padding-left: 0;
  justify-content: flex-start;
`

const CardMetaRow = styled.span`
  font-size: 11px;
  font-weight: 500;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  width: 100%;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: left;

  &.desc {
    -webkit-line-clamp: 4;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CardCheck = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${theme.colors.border.dark};
          box-shadow: none;
        `
      : css`
          background: ${theme.colors.primary};
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.06),
            0 2px 8px ${theme.colors.primary}35;
        `}
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const CountryGridCard = memo(
  function CountryGridCardInner({
    country,
    countryType,
    isSelected,
    onPick,
    continentName,
  }: {
    country: CountryResponseDto | HistoricalCountryResponseDto
    countryType: CountryType
    isSelected: boolean
    onPick: (
      c: CountryResponseDto | HistoricalCountryResponseDto,
      isHistorical: boolean,
    ) => void
    continentName?: string | null
  }) {
    const modern = country as CountryResponseDto
    const historical = country as HistoricalCountryResponseDto
    return (
      <CountryCard
        type="button"
        $selected={isSelected}
        title={country.name}
        onClick={() => onPick(country, countryType === 'historical')}
      >
        <CardTopRow>
          <CardFlagSlot aria-hidden>
            {countryType === 'modern' && modern.flagEmoji?.trim() ? (
              <CardFlagEmoji>{modern.flagEmoji.trim()}</CardFlagEmoji>
            ) : (
              <CardFlagSvg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </CardFlagSvg>
            )}
          </CardFlagSlot>
          <CardTitleBlock>
            <CardName>{country.name}</CardName>
          </CardTitleBlock>
          {isSelected ? (
            <CardCheck aria-hidden>
              <FiCheck size={14} strokeWidth={2.5} />
            </CardCheck>
          ) : (
            <CardCheckPlaceholder aria-hidden />
          )}
        </CardTopRow>
        <CardMetaList>
          {countryType === 'modern' ? (
            <>
              {modern.localName && (
                <CardMetaRow>{modern.localName}</CardMetaRow>
              )}
              {modern.isoCode && (
                <CardMetaRow>ISO {modern.isoCode}</CardMetaRow>
              )}
              {continentName && <CardMetaRow>{continentName}</CardMetaRow>}
              {modern.capital && (
                <CardMetaRow>수도 {modern.capital}</CardMetaRow>
              )}
              {modern.population && (
                <CardMetaRow>인구 {modern.population}</CardMetaRow>
              )}
              {modern.areaSqKm != null && (
                <CardMetaRow>
                  면적 {Number(modern.areaSqKm).toLocaleString()} km²
                </CardMetaRow>
              )}
            </>
          ) : (
            <>
              {historical.enName && (
                <CardMetaRow>{historical.enName}</CardMetaRow>
              )}
              {historical.startYear != null && (
                <CardMetaRow>
                  {historical.startYear}
                  {historical.endYear ? ` - ${historical.endYear}` : ' - 현재'}
                </CardMetaRow>
              )}
              {historical.stateType && (
                <CardMetaRow>{historical.stateType}</CardMetaRow>
              )}
              {historical.description && (
                <CardMetaRow className="desc" title={historical.description}>
                  {historical.description}
                </CardMetaRow>
              )}
            </>
          )}
        </CardMetaList>
      </CountryCard>
    )
  },
  (prev, next) =>
    prev.country.id === next.country.id &&
    prev.isSelected === next.isSelected &&
    prev.countryType === next.countryType &&
    prev.onPick === next.onPick,
)

/* 가상 목록 높이는 getTotalSize() 인라인으로만 잡음. flex:1이면 부모가 납작할 때 같이 눌림 */
const VirtualGridSizer = styled.div`
  position: relative;
  width: 100%;
`

const CardGridVirtualRow = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
  padding-bottom: 16px;
  box-sizing: border-box;
`

const GridEmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  gap: 18px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    opacity: 0.4;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const EmptyText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ModalFooter = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 28px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};

  @media (max-width: 640px) {
    padding: 14px 20px 18px;
  }
`

const FooterInfo = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: -0.01em;
  line-height: 1.45;
`

const FooterActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`
