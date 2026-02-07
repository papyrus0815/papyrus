/**
 * 고급 국가 선택 모달 - 좌측 필터 + 우측 리스트
 * 인물 페이지와 동일한 스타일
 */
import React, { useMemo, useState } from 'react'

import { FiCheck, FiGlobe, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

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

  // 필터링된 국가 목록
  const filteredCountries = useMemo(() => {
    const countries =
      countryType === 'modern' ? modernCountries : historicalCountries

    return countries.filter((country) => {
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
  }, [
    countryType,
    modernCountries,
    historicalCountries,
    countrySearchTerm,
    selectedContinent,
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
            </SearchWrapper>

            <ModalList>
              {filteredCountries.map((country) => {
                const isSelected = selectedCountryIds.includes(country.id)
                return (
                  <ModalListItem
                    key={country.id}
                    $selected={isSelected}
                    onClick={() => handleCountryClick(country)}
                  >
                    <CountryItemContent>
                      {(country as CountryResponseDto).flagEmoji && (
                        <CountryFlag>
                          {(country as CountryResponseDto).flagEmoji}
                        </CountryFlag>
                      )}
                      <CountryName>{country.name}</CountryName>
                      {(country as HistoricalCountryResponseDto).startYear && (
                        <CountryPeriod>
                          ({(country as HistoricalCountryResponseDto).startYear}
                          {(country as HistoricalCountryResponseDto).endYear
                            ? ` - ${(country as HistoricalCountryResponseDto).endYear}`
                            : ' - 현재'}
                          )
                        </CountryPeriod>
                      )}
                      {isSelected && multiSelect && (
                        <CheckIcon>
                          <FiCheck size={16} />
                        </CheckIcon>
                      )}
                    </CountryItemContent>
                  </ModalListItem>
                )
              })}
              {filteredCountries.length === 0 && (
                <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
              )}
            </ModalList>
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
  z-index: 1000;
`

const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1.5px solid rgba(226, 232, 240, 0.8);
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
`

const ModalCloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #94a3b8;
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
  grid-template-columns: 220px 1fr;
  gap: 0;
  flex: 1;
  overflow: hidden;
`

const FilterSidebar = styled.div`
  background: #f8fafc;
  padding: 24px 20px;
  border-right: 1.5px solid rgba(226, 232, 240, 0.8);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
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
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const CountryTypeOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  border: 1.5px solid
    ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.3)' : 'transparent')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active }) => ($active ? '#1e293b' : '#64748b')};
  text-align: left;

  &:hover {
    background: #ffffff;
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
  background: ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  border: 1px solid
    ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.2)' : 'transparent')};
  border-radius: 8px;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active }) => ($active ? '#6366f1' : '#64748b')};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: #ffffff;
    color: #6366f1;
  }
`

const ListArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`

const SearchWrapper = styled.div`
  padding: 20px 24px;
  border-bottom: 1.5px solid rgba(226, 232, 240, 0.6);
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #94a3b8;
    flex-shrink: 0;
  }
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #1e293b;
  background: transparent;

  &::placeholder {
    color: #cbd5e1;
  }
`

const ModalList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(248, 250, 252, 0.5);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(203, 213, 225, 0.6);
    border-radius: 4px;

    &:hover {
      background: rgba(148, 163, 184, 0.8);
    }
  }
`

const ModalListItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 6px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(99, 102, 241, 0.08)' : '#ffffff'};
  border: 1.5px solid
    ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.04)'};
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateX(2px);
  }
`

const CountryItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const CountryFlag = styled.span`
  font-size: 24px;
  flex-shrink: 0;
`

const CountryName = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
`

const CountryPeriod = styled.span`
  font-size: 12px;
  color: #94a3b8;
  font-weight: 400;
`

const CheckIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #6366f1;
  color: #ffffff;
  border-radius: 6px;
  flex-shrink: 0;
`

const EmptyMessage = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
`
