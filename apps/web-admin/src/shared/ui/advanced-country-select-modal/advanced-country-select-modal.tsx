/**
 * 고급 국가 선택 모달 - 좌측 필터 + 우측 리스트
 * 인물 페이지와 동일한 스타일
 */
import React, { useEffect, useMemo, useState } from 'react'

import { FiCheck, FiGlobe, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { Z_INDEX } from '@/shared/styles/z-index'

interface AdvancedCountrySelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (country: {
    id: string
    name: string
    isHistorical: boolean
  }) => void
  modernCountries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]
  selectedCountryIds: string[] // 복수 선택용
  multiSelect?: boolean
  title?: string
}

export const AdvancedCountrySelectModal: React.FC<
  AdvancedCountrySelectModalProps
> = ({
  isOpen,
  onClose,
  onSelect,
  modernCountries,
  historicalCountries,
  selectedCountryIds,
  multiSelect = true,
  title = '국가 선택',
}) => {
  const playClick = useClickSound()
  const [countryType, setCountryType] = useState<'modern' | 'historical'>(
    'modern',
  )
  const [selectedContinent, setSelectedContinent] = useState<string>('all')
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<
    'name' | 'isoCode' | 'continent' | 'startYear' | 'population' | 'areaSqKm'
  >('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

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

  // 대륙 목록 추출
  const continents = useMemo(() => {
    const continentSet = new Set<string>()
    modernCountries.forEach((country) => {
      if (country.continent) {
        continentSet.add(country.continent)
      }
    })
    return Array.from(continentSet).sort()
  }, [modernCountries])

  // 필터링 + 정렬된 국가 목록
  const filteredCountries = useMemo(() => {
    const countries =
      countryType === 'modern' ? modernCountries : historicalCountries

    const filtered = countries.filter((country) => {
      const matchesSearch = country.name
        .toLowerCase()
        .includes(countrySearchTerm.toLowerCase())

      if (countryType === 'modern') {
        const matchesContinent =
          selectedContinent === 'all' ||
          (country as CountryResponseDto).continent === selectedContinent
        return matchesSearch && matchesContinent
      }

      return matchesSearch
    })

    const mult = sortOrder === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (countryType === 'modern') {
        const ma = a as CountryResponseDto
        const mb = b as CountryResponseDto
        if (sortBy === 'name') {
          return mult * ma.name.localeCompare(mb.name, 'ko')
        }
        if (sortBy === 'isoCode') {
          const va = ma.isoCode ?? ''
          const vb = mb.isoCode ?? ''
          return mult * va.localeCompare(vb)
        }
        if (sortBy === 'continent') {
          const va = (ma as { continent?: string }).continent ?? ''
          const vb = (mb as { continent?: string }).continent ?? ''
          return (
            mult * va.localeCompare(vb) ||
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
  }, [
    countryType,
    modernCountries,
    historicalCountries,
    countrySearchTerm,
    selectedContinent,
    sortBy,
    sortOrder,
  ])

  const handleCountryClick = (
    country: CountryResponseDto | HistoricalCountryResponseDto,
  ) => {
    playClick()
    onSelect({
      id: country.id,
      name: country.name,
      isHistorical: countryType === 'historical',
    })

    // 단일 선택 모드면 모달 닫기
    if (!multiSelect) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose}>
            <FiX />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {/* 좌측 필터 영역 */}
          <FilterSidebar>
            <FilterSidebarSection>
              <FilterSidebarTitle>국가 타입</FilterSidebarTitle>
              <CountryTypeOption
                $active={countryType === 'modern'}
                onClick={() => {
                  setCountryType('modern')
                  setSelectedContinent('all')
                }}
              >
                <RadioButton $active={countryType === 'modern'}>
                  <ModalRadioDot $active={countryType === 'modern'} />
                </RadioButton>
                <span>현대 국가</span>
              </CountryTypeOption>
              <CountryTypeOption
                $active={countryType === 'historical'}
                onClick={() => {
                  setCountryType('historical')
                  setSelectedContinent('all')
                }}
              >
                <RadioButton $active={countryType === 'historical'}>
                  <ModalRadioDot $active={countryType === 'historical'} />
                </RadioButton>
                <span>역사적 국가</span>
              </CountryTypeOption>
            </FilterSidebarSection>

            {countryType === 'modern' && (
              <FilterSidebarSection>
                <FilterSidebarTitle>대륙</FilterSidebarTitle>
                <FilterOptionButton
                  $active={selectedContinent === 'all'}
                  onClick={() => setSelectedContinent('all')}
                >
                  전체
                </FilterOptionButton>
                {continents.map((continent) => (
                  <FilterOptionButton
                    key={continent}
                    $active={selectedContinent === continent}
                    onClick={() => setSelectedContinent(continent)}
                  >
                    {continent}
                  </FilterOptionButton>
                ))}
              </FilterSidebarSection>
            )}
          </FilterSidebar>

          {/* 우측 리스트 영역 */}
          <ListArea>
            <SearchWrapper>
              <FiSearch />
              <SearchInput
                type="text"
                placeholder="국가 검색..."
                value={countrySearchTerm}
                onChange={(e) => setCountrySearchTerm(e.target.value)}
              />
              <SortRow>
                <SortLabel>정렬</SortLabel>
                <SortFieldSelect
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | 'name'
                        | 'isoCode'
                        | 'continent'
                        | 'startYear'
                        | 'population'
                        | 'areaSqKm',
                    )
                  }
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
                    $active={sortOrder === 'asc'}
                    onClick={() => setSortOrder('asc')}
                  >
                    오름차순
                  </SortOrderBtn>
                  <SortOrderBtn
                    $active={sortOrder === 'desc'}
                    onClick={() => setSortOrder('desc')}
                  >
                    내림차순
                  </SortOrderBtn>
                </SortOrderGroup>
              </SortRow>
            </SearchWrapper>

            <CardGrid>
              {filteredCountries.map((country) => {
                const isSelected = selectedCountryIds.includes(country.id)
                const modern = country as CountryResponseDto
                const historical = country as HistoricalCountryResponseDto
                return (
                  <CountryCard
                    key={country.id}
                    $selected={isSelected}
                    onClick={() => handleCountryClick(country)}
                  >
                    <CardFlag>{modern.flagEmoji || '🌐'}</CardFlag>
                    <CardName>{country.name}</CardName>
                    <CardMetaList>
                      {countryType === 'modern' ? (
                        <>
                          {modern.localName && (
                            <CardMetaRow>{modern.localName}</CardMetaRow>
                          )}
                          {modern.isoCode && (
                            <CardMetaRow>ISO {modern.isoCode}</CardMetaRow>
                          )}
                          {(modern as { continent?: string }).continent && (
                            <CardMetaRow>
                              {(modern as { continent?: string }).continent}
                            </CardMetaRow>
                          )}
                          {modern.capital && (
                            <CardMetaRow>수도 {modern.capital}</CardMetaRow>
                          )}
                          {modern.population && (
                            <CardMetaRow>인구 {modern.population}</CardMetaRow>
                          )}
                          {modern.areaSqKm != null && (
                            <CardMetaRow>
                              면적 {Number(modern.areaSqKm).toLocaleString()}{' '}
                              km²
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
                              {historical.endYear
                                ? ` - ${historical.endYear}`
                                : ' - 현재'}
                            </CardMetaRow>
                          )}
                          {historical.stateType && (
                            <CardMetaRow>{historical.stateType}</CardMetaRow>
                          )}
                          {historical.description && (
                            <CardMetaRow className="desc">
                              {historical.description.length > 24
                                ? `${historical.description.slice(0, 24)}…`
                                : historical.description}
                            </CardMetaRow>
                          )}
                        </>
                      )}
                    </CardMetaList>
                    {isSelected && multiSelect && (
                      <CardCheck>
                        <FiCheck size={14} />
                      </CardCheck>
                    )}
                  </CountryCard>
                )
              })}
              {filteredCountries.length === 0 && (
                <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
              )}
            </CardGrid>
          </ListArea>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

// Styled Components
const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`

const ModalContent = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20,20,20,0.92)' : '#ffffff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border-radius: 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'transparent'};
  width: 92%;
  max-width: 1000px;
  max-height: 68vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 20px 60px rgba(0,0,0,0.6)'
      : '0 20px 60px rgba(0, 0, 0, 0.3)'};
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ModalCloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: all 0.2s ease;
  border-radius: 8px;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const ModalBody = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  max-height: calc(68vh - 72px);
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-height: none;
  }
`

const FilterSidebar = styled.div`
  background: ${({ theme }) => theme.colors.background.secondary};
  padding: 24px 20px;
  border-right: 1.5px solid ${({ theme }) => theme.colors.border.light};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};
    padding: 16px 16px;
    gap: 16px;
    max-height: 40vh;
  }
`

const FilterSidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FilterSidebarTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const CountryTypeOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.1)'
        : '#ffffff'
      : 'transparent'};
  border: 1.5px solid
    ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.3)' : 'transparent')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  text-align: left;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#ffffff'};
    border-color: rgba(99, 102, 241, 0.2);
  }
`

const RadioButton = styled.div<{ $active: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${({ $active }) => ($active ? '#6366f1' : '#cbd5e1')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
`

const ModalRadioDot = styled.div<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? '#6366f1' : 'transparent')};
  transition: all 0.2s ease;
`

const FilterOptionButton = styled.button<{ $active: boolean }>`
  padding: 8px 12px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.1)'
        : '#ffffff'
      : 'transparent'};
  border: 1px solid
    ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.2)' : 'transparent')};
  border-radius: 8px;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active, theme }) =>
    $active ? '#818cf8' : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#6366f1')};
  }
`

const ListArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

const SearchWrapper = styled.div`
  padding: 20px 24px;
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SortRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const SortLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SortFieldSelect = styled.select`
  padding: 8px 28px 8px 12px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  min-width: 100px;
  outline: none;

  &:focus {
    border-color: rgba(99, 102, 241, 0.4);
  }
`

const SortOrderGroup = styled.div`
  display: flex;
  gap: 4px;
`

const SortOrderBtn = styled.button<{ $active: boolean }>`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
    $active
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : theme.colors.background.tertiary};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'transparent' : theme.colors.border.light};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        : 'rgba(99, 102, 241, 0.1)'};
    color: ${({ $active }) => ($active ? '#ffffff' : '#6366f1')};
  }
`

const CardGrid = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  align-content: start;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.secondary};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;
  }
`

const CountryCard = styled.button<{ $selected: boolean }>`
  position: relative;
  aspect-ratio: 1;
  min-height: 140px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  background: ${({ $selected, theme }) =>
    $selected
      ? 'rgba(99, 102, 241, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#ffffff'};
  border: 1.5px solid
    ${({ $selected, theme }) =>
      $selected ? 'rgba(99, 102, 241, 0.35)' : theme.colors.border.light};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    background: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.04)'};
    border-color: rgba(99, 102, 241, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }
`

const CardFlag = styled.span`
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
`

const CardName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: keep-all;
`

const CardMetaList = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

const CardMetaRow = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  line-height: 1.3;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;

  &.desc {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
`

const CardCheck = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #6366f1;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const EmptyMessage = styled.div`
  grid-column: 1 / -1;
  padding: 48px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
`
