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
  selectedCountryIds?: string[] // 복수 선택용
  multiSelect?: boolean // 복수 선택 모드
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
  selectedCountryIds = [],
  multiSelect = false,
}) => {
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')
  const [countryType, setCountryType] = useState<CountryType>('modern')
  const [sortBy, setSortBy] = useState<
    'name' | 'isoCode' | 'continent' | 'startYear' | 'population' | 'areaSqKm'
  >('name')
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

  const sortCountries = (
    list: (CountryResponseDto | HistoricalCountryResponseDto)[],
  ) => {
    const mult = sortOrder === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (countryType === 'modern') {
        const ma = a as CountryResponseDto
        const mb = b as CountryResponseDto
        if (sortBy === 'name')
          return mult * ma.name.localeCompare(mb.name, 'ko')
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
  }

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
    // 복수 선택 모드가 아니면 모달 닫기
    if (!multiSelect) {
      onClose()
    }
  }

  const displayCountries = sortCountries(
    countryType === 'modern'
      ? filteredModernCountries
      : filteredHistoricalCountries,
  )

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiGlobe size={20} />
            {title}
          </ModalTitle>
          <CloseButton type="button" onClick={onClose}>
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

          {/* 국가 유형 탭 + 정렬 */}
          <TabSection>
            <Tab
              type="button"
              $active={countryType === 'modern'}
              onClick={() => {
                playClickSound()
                setCountryType('modern')
              }}
            >
              현대 국가
              <CountBadge $active={countryType === 'modern'}>
                {filteredModernCountries.length}
              </CountBadge>
            </Tab>
            <Tab
              type="button"
              $active={countryType === 'historical'}
              onClick={() => {
                playClickSound()
                setCountryType('historical')
              }}
            >
              역사적 국가
              <CountBadge $active={countryType === 'historical'}>
                {filteredHistoricalCountries.length}
              </CountBadge>
            </Tab>
            <SortRow>
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
            </SortRow>
          </TabSection>

          {/* 국가 목록 - 카드 그리드 */}
          <CardGrid>
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
                const isSelected = multiSelect
                  ? selectedCountryIds.includes(country.id)
                  : selectedCountryId === country.id
                const modern = country as CountryResponseDto
                const historical = country as HistoricalCountryResponseDto
                return (
                  <CountryCard
                    type="button"
                    key={country.id}
                    $selected={isSelected}
                    onClick={() =>
                      handleSelect(country, countryType === 'historical')
                    }
                  >
                    <CardFlag>
                      {countryType === 'modern' && modern.flagEmoji
                        ? modern.flagEmoji
                        : '🌐'}
                    </CardFlag>
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
                    {isSelected && (
                      <CardCheck>
                        <FiCheck size={14} />
                      </CardCheck>
                    )}
                  </CountryCard>
                )
              })
            )}
          </CardGrid>
        </ModalBody>
      </ModalContainer>
    </Overlay>
  )
}

/* 행정조직 디자인 톤: 깔끔·트렌디 */
const ACCENT = '#6366f1'
const ACCENT_HOVER = '#4f46e5'
const BORDER = '#e5e7eb'
const BORDER_LIGHT = '#f3f4f6'
const BG_MUTED = '#f8fafc'
const TEXT = '#0f172a'
const TEXT_MUTED = '#64748b'
const TEXT_SUBTLE = '#94a3b8'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: overlayIn 0.2s ease;
  @keyframes overlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: modalUp 0.25s ease;
  @keyframes modalUp {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid ${BORDER_LIGHT};
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${TEXT};
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: ${ACCENT};
    flex-shrink: 0;
  }
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: ${BG_MUTED};
  color: ${TEXT_MUTED};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: ${ACCENT};
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
  padding: 20px 28px;
  border-bottom: 1px solid ${BORDER_LIGHT};
  background: #fff;
`

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  color: ${TEXT_SUBTLE};
  display: flex;
  align-items: center;
  pointer-events: none;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 48px 14px 48px;
  font-size: 15px;
  color: ${TEXT};
  border: 1px solid ${BORDER};
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: ${TEXT_SUBTLE};
  }

  &:focus {
    border-color: ${ACCENT};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
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
  background: ${BG_MUTED};
  color: ${TEXT_MUTED};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
  }
`

const TabSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 28px;
  background: ${BG_MUTED};
  border-bottom: 1px solid ${BORDER_LIGHT};
  flex-wrap: wrap;
`

const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#fff' : TEXT_MUTED)};
  background: ${({ $active }) => ($active ? ACCENT : 'transparent')};
  border: 1px solid ${({ $active }) => ($active ? ACCENT : BORDER)};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active }) => ($active ? ACCENT_HOVER : 'rgba(99, 102, 241, 0.08)')};
    border-color: ${({ $active }) => ($active ? ACCENT_HOVER : ACCENT)};
    color: ${({ $active }) => ($active ? '#fff' : ACCENT)};
  }
`

const CountBadge = styled.span<{ $active?: boolean }>`
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $active }) => ($active ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)')};
  border-radius: 10px;
`

const SortRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
`

const SortLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${TEXT_MUTED};
`

const SortFieldSelect = styled.select`
  padding: 8px 32px 8px 12px;
  font-size: 13px;
  color: ${TEXT};
  background: #fff;
  border: 1px solid ${BORDER};
  border-radius: 10px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;

  &:focus {
    outline: none;
    border-color: ${ACCENT};
  }
`

const SortOrderGroup = styled.div`
  display: flex;
  gap: 4px;
`

const SortOrderBtn = styled.button<{ $active: boolean }>`
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#fff' : TEXT_MUTED)};
  background: ${({ $active }) => ($active ? ACCENT : '#fff')};
  border: 1px solid ${({ $active }) => ($active ? ACCENT : BORDER)};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active }) => ($active ? ACCENT_HOVER : 'rgba(99, 102, 241, 0.08)')};
    border-color: ${ACCENT};
    color: ${({ $active }) => ($active ? '#fff' : ACCENT)};
  }
`

const CardGrid = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 28px 28px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
  align-content: start;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${BORDER_LIGHT};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;

    &:hover {
      background: #94a3b8;
    }
  }
`

const CountryCard = styled.button<{ $selected: boolean }>`
  position: relative;
  min-height: 120px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? '600' : '500')};
  color: ${({ $selected }) => ($selected ? ACCENT : TEXT)};
  background: ${({ $selected }) => ($selected ? 'rgba(99, 102, 241, 0.06)' : '#fff')};
  border: 2px solid ${({ $selected }) => ($selected ? ACCENT : BORDER)};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;

  &:hover {
    background: ${({ $selected }) => ($selected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.04)')};
    border-color: ${ACCENT};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
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
  line-height: 1.3;
  color: inherit;
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
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
  color: ${TEXT_SUBTLE};
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
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${ACCENT};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
`

const EmptyState = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  color: ${TEXT_SUBTLE};
  gap: 16px;

  svg {
    opacity: 0.35;
    color: ${TEXT_MUTED};
  }
`

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${TEXT_MUTED};
`
