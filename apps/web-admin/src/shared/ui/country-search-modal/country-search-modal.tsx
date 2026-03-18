/**
 * 국가 선택 모달 (공용)
 * - 인물 등록 페이지 출생국가 선택 모달과 동일한 UI: 좌측 필터(국가 타입·대륙), 우측 검색·리스트
 * - 인물 등록(출생/활동국가), 수반 소속 국가 등에서 공용
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

export interface CountryOption {
  id: string
  name: string
  flagEmoji?: string | null
  continentId?: string | null
  startYear?: number | null
  endYear?: number | null
}

export interface ContinentOption {
  id: string
  name: string
}

interface CountrySearchModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  modernCountries: CountryOption[]
  historicalCountries: CountryOption[]
  continentList?: ContinentOption[]
  /** 단일 선택 시 사용 */
  selectedCountryId?: string | null
  onSelect?: (country: { id: string; name: string; isHistorical: boolean }) => void
  /** 현대 국가만 표시(역사적 국가 탭 숨김). 연결된 현대 국가 선택 등에서 사용 */
  modernOnly?: boolean
  /** 역사적 국가만 표시(현대 국가 탭 숨김). 후임 국가 선택 등에서 사용 */
  historicalOnly?: boolean
  /** 다중 선택 모드: 선택된 ID 목록 */
  selectedCountryIds?: string[]
  /** 다중 선택 모드: 선택 완료 시 호출 */
  onSelectMultiple?: (countries: { id: string; name: string; isHistorical: boolean }[]) => void
  placeholder?: string
}

type TabType = 'modern' | 'historical'

const MODAL_HEIGHT = 680

function isHistoricalCountry(c: CountryOption): boolean {
  return c.startYear != null || c.endYear != null
}

export function CountrySearchModal({
  isOpen,
  onClose,
  title = '국가 선택',
  modernCountries,
  historicalCountries,
  continentList = [],
  selectedCountryId,
  onSelect,
  modernOnly = false,
  historicalOnly = false,
  selectedCountryIds = [],
  onSelectMultiple,
  placeholder = '국가 검색...',
}: CountrySearchModalProps) {
  const [countryType, setCountryType] = useState<TabType>('modern')
  const [selectedContinent, setSelectedContinent] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const multiSelect = Boolean(onSelectMultiple)
  /** 다중 선택 시 모달 내부 선택 ID (모달 열릴 때 selectedCountryIds로 초기화) */
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([])
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      const justOpened = !wasOpenRef.current
      wasOpenRef.current = true
      if (justOpened) {
        const selectedInHistorical =
          selectedCountryId &&
          historicalCountries.some((c) => c.id === selectedCountryId)
        setCountryType(
          historicalOnly ? 'historical' : selectedInHistorical ? 'historical' : 'modern',
        )
        setSelectedContinent('all')
        setSearchTerm('')
        if (multiSelect) setMultiSelectedIds(selectedCountryIds)
      }
    } else {
      wasOpenRef.current = false
    }
  }, [isOpen, multiSelect, selectedCountryIds, historicalOnly])

  const sourceList =
    historicalOnly
      ? historicalCountries
      : modernOnly || countryType === 'modern'
        ? modernCountries
        : historicalCountries

  const continents = useMemo(() => {
    const ids = new Set(
      sourceList.map((c) => c.continentId).filter(Boolean),
    ) as Set<string>
    const names = Array.from(ids)
      .map((id) => continentList.find((c) => c.id === id)?.name)
      .filter(Boolean) as string[]
    return names.sort()
  }, [sourceList, continentList])

  const filteredCountries = useMemo(() => {
    let list = sourceList
    if (selectedContinent !== 'all') {
      const cont = continentList.find((c) => c.name === selectedContinent)
      if (cont) list = list.filter((c) => c.continentId === cont.id)
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q))
    }
    return list
  }, [sourceList, selectedContinent, searchTerm, continentList])

  if (!isOpen) return null

  const handleSelect = (c: CountryOption) => {
    if (multiSelect) {
      setMultiSelectedIds((prev) =>
        prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id],
      )
      return
    }
    onSelect?.({
      id: c.id,
      name: c.name,
      isHistorical: countryType === 'historical',
    })
    onClose()
  }

  const handleMultiSelectComplete = () => {
    const list = [...modernCountries, ...historicalCountries]
    const selected = multiSelectedIds
      .map((id) => {
        const c = list.find((x) => x.id === id)
        if (!c) return null
        return {
          id: c.id,
          name: c.name,
          isHistorical: isHistoricalCountry(c),
        }
      })
      .filter(Boolean) as { id: string; name: string; isHistorical: boolean }[]
    onSelectMultiple?.(selected)
    onClose()
  }

  const isItemSelected = (id: string) =>
    multiSelect ? multiSelectedIds.includes(id) : selectedCountryId === id

  return createPortal(
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton type="button" onClick={onClose}>
            <FiX />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <FilterSidebar>
            {!modernOnly && !historicalOnly && (
              <FilterSidebarSection>
                <FilterSidebarTitle>국가 타입</FilterSidebarTitle>
                <CountryTypeOption
                  type="button"
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
                  type="button"
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
            )}

            <FilterSidebarSection>
              <FilterSidebarTitle>대륙</FilterSidebarTitle>
              <FilterOptionButton
                type="button"
                $active={selectedContinent === 'all'}
                onClick={() => setSelectedContinent('all')}
              >
                전체
              </FilterOptionButton>
              {continents.map((name) => (
                <FilterOptionButton
                  type="button"
                  key={name}
                  $active={selectedContinent === name}
                  onClick={() => setSelectedContinent(name)}
                >
                  {name}
                </FilterOptionButton>
              ))}
            </FilterSidebarSection>
          </FilterSidebar>

          <ListArea>
            <SearchWrapper>
              <FiSearch />
              <SearchInput
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchWrapper>

            <ModalList>
              {filteredCountries.map((country) => (
                <ModalListItem
                  type="button"
                  key={country.id}
                  $selected={isItemSelected(country.id)}
                  onClick={() => handleSelect(country)}
                >
                  <CountryItemContent>
                    {country.flagEmoji ? (
                      <CountryFlag>{country.flagEmoji}</CountryFlag>
                    ) : (
                      <CountryFlagDefault aria-hidden>
                        <svg width="28" height="21" viewBox="0 0 28 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <rect x="2" y="2" width="22" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                          <line x1="2" y1="8.2" x2="24" y2="8.2" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
                          <line x1="2" y1="14.4" x2="24" y2="14.4" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
                        </svg>
                      </CountryFlagDefault>
                    )}
                    <CountryName>{country.name}</CountryName>
                    {country.startYear != null && (
                      <CountryPeriod>
                        ({country.startYear}
                        {country.endYear
                          ? ` - ${country.endYear}`
                          : ' - 현재'}
                        )
                      </CountryPeriod>
                    )}
                  </CountryItemContent>
                  {multiSelect && isItemSelected(country.id) && (
                    <ModalListItemCheck>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                      </svg>
                    </ModalListItemCheck>
                  )}
                </ModalListItem>
              ))}
              {filteredCountries.length === 0 && (
                <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
              )}
            </ModalList>
          </ListArea>
        </ModalBody>
        {multiSelect && (
          <ModalFooter>
            <ModalFooterSelectedCount>
              {multiSelectedIds.length}개 선택됨
            </ModalFooterSelectedCount>
            <ModalFooterCompleteButton type="button" onClick={handleMultiSelectComplete}>
              선택 완료
            </ModalFooterCompleteButton>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>,
    document.body,
  )
}

// ————— 다크/라이트 테마 적용 스타일 —————
const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY + 2};
  padding: 1rem;
  animation: fadeIn 0.15s ease-out;
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ModalContent = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20,20,20,0.92)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  height: ${MODAL_HEIGHT}px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 10px 40px rgba(0,0,0,0.5)'
      : '0 20px 60px rgba(0,0,0,0.15)'};
  z-index: ${Z_INDEX.MODAL_CONTENT + 2};
  animation: slideUp 0.25s ease-out;
  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`

const ModalCloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  svg {
    font-size: 1.375rem;
  }
`

const ModalBody = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
`

const FilterSidebar = styled.div`
  width: 240px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  padding: 1.5rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 3px;
  }
`

const FilterSidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const FilterSidebarTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
  padding: 0 0.5rem;
`

const CountryTypeOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
  span {
    flex: 1;
    text-align: left;
  }
`

const RadioButton = styled.div<{ $active: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
`

const ModalRadioDot = styled.div<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  transition: all 0.2s;
  transform: scale(${({ $active }) => ($active ? 1 : 0)});
`

const FilterOptionButton = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 0.625rem 1rem;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.activeLight : theme.colors.background.tertiary};
    color: ${({ $active, theme }) =>
      $active ? theme.colors.active : theme.colors.text.primary};
  }
`

const ListArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  flex-shrink: 0;
  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-size: 1.25rem;
  }
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ModalList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  min-height: 0;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 3px;
  }
`

const ModalListItem = styled.button<{ $selected?: boolean }>`
  width: 100%;
  padding: 1rem 1.125rem;
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.background.secondary : 'transparent'};
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.border.default : 'transparent'};
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
  font-size: 0.9375rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 0.625rem;
  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.default};
    transform: scale(1.01);
  }
  &:active {
    transform: scale(0.99);
  }
  &:last-child {
    margin-bottom: 0;
  }
`

const CountryItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
`

const ModalListItemCheck = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
`

const CountryFlag = styled.span`
  font-size: 1.75rem;
  line-height: 1;
  flex-shrink: 0;
`

const CountryFlagDefault = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.85;
  svg {
    display: block;
  }
`

const CountryName = styled.span`
  flex: 1;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountryPeriod = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-left: auto;
  padding: 0.25rem 0.625rem;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: 6px;
`

const EmptyMessage = styled.div`
  padding: 3rem 2rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 0.95rem;
`

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem 1.25rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 0 0 16px 16px;
`

const ModalFooterSelectedCount = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`

const ModalFooterCompleteButton = styled.button`
  padding: 0.5rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
  }
`
