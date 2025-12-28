/**
 * 국가 선택 모달 컴포넌트
 */

import React, { useEffect, useState } from 'react'
import { FiCheck, FiGlobe, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

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
}

type CountryType = 'modern' | 'historical'

export const CountrySelectModal: React.FC<CountrySelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  modernCountries,
  historicalCountries,
  title = '국가 선택',
  selectedCountryId,
}) => {
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')
  const [countryType, setCountryType] = useState<CountryType>('modern')

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  if (!isOpen) return null

  // 검색 필터링
  const filterCountries = (
    countries: (CountryResponseDto | HistoricalCountryResponseDto)[],
  ) => {
    if (!searchQuery.trim()) return countries

    const query = searchQuery.toLowerCase()
    return countries.filter((country) =>
      country.name.toLowerCase().includes(query),
    )
  }

  const filteredModernCountries = filterCountries(modernCountries)
  const filteredHistoricalCountries = filterCountries(historicalCountries)

  const handleSelect = (
    country: CountryResponseDto | HistoricalCountryResponseDto,
    isHistorical: boolean,
  ) => {
    playClickSound()
    onSelect({
      id: country.id,
      name: country.name,
      isHistorical,
    })
    onClose()
  }

  const displayCountries =
    countryType === 'modern'
      ? filteredModernCountries
      : filteredHistoricalCountries

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiGlobe size={20} />
            {title}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX size={20} />
          </CloseButton>
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
                placeholder="국가명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <ClearButton
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

          {/* 국가 유형 탭 */}
          <TabSection>
            <Tab
              $active={countryType === 'modern'}
              onClick={() => {
                playClickSound()
                setCountryType('modern')
              }}
            >
              현대 국가
              <CountBadge>{filteredModernCountries.length}</CountBadge>
            </Tab>
            <Tab
              $active={countryType === 'historical'}
              onClick={() => {
                playClickSound()
                setCountryType('historical')
              }}
            >
              역사적 국가
              <CountBadge>{filteredHistoricalCountries.length}</CountBadge>
            </Tab>
          </TabSection>

          {/* 국가 목록 */}
          <CountryList>
            {displayCountries.length === 0 ? (
              <EmptyState>
                <FiGlobe size={48} />
                <EmptyText>
                  {searchQuery
                    ? '검색 결과가 없습니다'
                    : '국가 정보가 없습니다'}
                </EmptyText>
              </EmptyState>
            ) : (
              displayCountries.map((country) => {
                const isSelected = selectedCountryId === country.id
                return (
                  <CountryItem
                    key={country.id}
                    $selected={isSelected}
                    onClick={() =>
                      handleSelect(country, countryType === 'historical')
                    }
                  >
                    <CountryName>{country.name}</CountryName>
                    {isSelected && (
                      <CheckIcon>
                        <FiCheck size={18} />
                      </CheckIcon>
                    )}
                  </CountryItem>
                )
              })
            )}
          </CountryList>
        </ModalBody>
      </ModalContainer>
    </Overlay>
  )
}

const Overlay = styled.div`
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
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
`

const SearchSection = styled.div`
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  pointer-events: none;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 44px 12px 44px;
  font-size: 14px;
  color: #0f172a;
  border: 2px solid rgba(226, 232, 240, 1);
  border-radius: 12px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #cbd5e1;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
  }
`

const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(148, 163, 184, 0.1);
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`

const TabSection = styled.div`
  display: flex;
  gap: 4px;
  padding: 16px 24px;
  background: rgba(248, 250, 252, 0.6);
`

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'transparent'};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        : 'rgba(99, 102, 241, 0.08)'};
    color: ${({ $active }) => ($active ? '#ffffff' : '#6366f1')};
  }
`

const CountBadge = styled.span`
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
`

const CountryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 24px 24px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 4px;

    &:hover {
      background: rgba(148, 163, 184, 0.6);
    }
  }
`

const CountryItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? '600' : '500')};
  color: ${({ $selected }) => ($selected ? '#6366f1' : '#0f172a')};
  background: ${({ $selected }) =>
    $selected ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};
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
    border-color: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.2)'};
    transform: translateX(4px);
  }

  &:active {
    transform: translateX(2px);
  }
`

const CountryName = styled.span`
  flex: 1;
`

const CheckIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  border-radius: 6px;
  flex-shrink: 0;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #94a3b8;
  gap: 16px;

  svg {
    opacity: 0.3;
  }
`

const EmptyText = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
`

