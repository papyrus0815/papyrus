/**
 * 인물 선택 모달 - 공용 컴포넌트
 * 이름, 생몰년도로 검색 가능
 */
import React, { useMemo, useState } from 'react'

import {
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiMapPin,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { PersonResponseDto } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { Z_INDEX } from '@/shared/styles/z-index'

// 디자인 토큰
const BRAND = {
  primary: '#6366f1',
  primaryLight: '#eef2ff',
  primaryMuted: '#c7d2fe',
  text: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  surface: '#f8fafc',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  white: '#ffffff',
  error: '#ef4444',
}

interface PersonSelectModalProps {
  persons: PersonResponseDto[]
  selectedPersonId: string
  onSelect: (personId: string, personName: string) => void
  onClose: () => void
}

type SortOption = 'name' | 'birth-asc' | 'birth-desc'

export const PersonSelectModal: React.FC<PersonSelectModalProps> = ({
  persons,
  selectedPersonId,
  onSelect,
  onClose,
}) => {
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')

  // 필터 상태
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [filterDynasty, setFilterDynasty] = useState<string>('')
  const [filterJob, setFilterJob] = useState<string>('')
  const [filterReligion, setFilterReligion] = useState<string>('')

  // 고유 값 추출
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>()
    persons.forEach((person) => {
      if (person.countryId) countries.add(person.countryId)
    })
    return Array.from(countries)
  }, [persons])

  const uniqueDynasties = useMemo(() => {
    const dynasties = new Set<string>()
    persons.forEach((person) => {
      if (person.dynastyId) dynasties.add(person.dynastyId)
    })
    return Array.from(dynasties)
  }, [persons])

  const uniqueJobs = useMemo(() => {
    const jobs = new Set<string>()
    persons.forEach((person) => {
      if (person.jobId) jobs.add(person.jobId)
    })
    return Array.from(jobs)
  }, [persons])

  const uniqueReligions = useMemo(() => {
    const religions = new Set<string>()
    persons.forEach((person) => {
      if (person.religionId) religions.add(person.religionId)
    })
    return Array.from(religions)
  }, [persons])

  // 검색 + 필터링
  const filteredPersons = useMemo(() => {
    let result = persons

    // 검색어 필터
    const query = searchQuery.toLowerCase().trim()
    if (query) {
      result = result.filter((person) => {
        const fullName = `${person.surname || ''} ${person.name}`
          .toLowerCase()
          .trim()
        const reverseName = `${person.name} ${person.surname || ''}`
          .toLowerCase()
          .trim()

        const birthYear = person.birthYear ? String(person.birthYear) : ''
        const deathYear = person.deathYear ? String(person.deathYear) : ''

        return (
          fullName.includes(query) ||
          reverseName.includes(query) ||
          birthYear.includes(query) ||
          deathYear.includes(query)
        )
      })
    }

    // 국가 필터
    if (filterCountry) {
      result = result.filter((person) => person.countryId === filterCountry)
    }

    // 왕조 필터
    if (filterDynasty) {
      result = result.filter((person) => person.dynastyId === filterDynasty)
    }

    // 직업 필터
    if (filterJob) {
      result = result.filter((person) => person.jobId === filterJob)
    }

    // 종교 필터
    if (filterReligion) {
      result = result.filter((person) => person.religionId === filterReligion)
    }

    // 정렬
    result = [...result].sort((personA, personB) => {
      if (sortBy === 'name') {
        const nameA = `${personA.surname || ''} ${personA.name}`.trim()
        const nameB = `${personB.surname || ''} ${personB.name}`.trim()
        return nameA.localeCompare(nameB, 'ko')
      } else if (sortBy === 'birth-asc') {
        const birthA = personA.birthYear || 9999
        const birthB = personB.birthYear || 9999
        return birthA - birthB
      } else if (sortBy === 'birth-desc') {
        const birthA = personA.birthYear || 0
        const birthB = personB.birthYear || 0
        return birthB - birthA
      }
      return 0
    })

    return result
  }, [
    persons,
    searchQuery,
    filterCountry,
    filterDynasty,
    filterJob,
    filterReligion,
    sortBy,
  ])

  const activeFilterCount = [
    filterCountry,
    filterDynasty,
    filterJob,
    filterReligion,
  ].filter(Boolean).length

  const handleSelect = (person: PersonResponseDto) => {
    const fullName = person.surname
      ? `${person.surname} ${person.name}`
      : person.name
    playClickSound()
    onSelect(person.id, fullName)
    onClose()
  }

  const clearAllFilters = () => {
    playClickSound()
    setFilterCountry('')
    setFilterDynasty('')
    setFilterJob('')
    setFilterReligion('')
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>인물 선택</ModalTitle>
          <ModalCloseButton onClick={onClose} aria-label="닫기">
            <FiX size={20} strokeWidth={2.5} />
          </ModalCloseButton>
        </ModalHeader>

        {/* 검색 바 */}
        <SearchSection>
          <SearchWrapper>
            <FiSearch size={20} className="search-icon" />
            <SearchInput
              type="text"
              placeholder="이름 또는 생몰년도로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </SearchWrapper>
        </SearchSection>

        <SplitModalBody>
          {/* 좌측: 필터 사이드바 */}
          <FilterSidebar>
            <FilterSidebarHeader>
              <span className="label">필터</span>
              {activeFilterCount > 0 && (
                <FilterBadge>{activeFilterCount}</FilterBadge>
              )}
            </FilterSidebarHeader>

            {/* 정렬 */}
            <FilterGroup>
              <FilterLabel>정렬</FilterLabel>
              <FilterSelect
                value={sortBy}
                onChange={(e) => {
                  playClickSound()
                  setSortBy(e.target.value as SortOption)
                }}
              >
                <option value="name">이름순</option>
                <option value="birth-asc">출생일 빠른순</option>
                <option value="birth-desc">출생일 늦은순</option>
              </FilterSelect>
            </FilterGroup>

            <FilterDivider />

            {/* 국가 필터 */}
            <FilterGroup>
              <FilterLabel>
                <FiMapPin size={12} />
                국가
              </FilterLabel>
              <FilterSelect
                value={filterCountry}
                onChange={(e) => {
                  playClickSound()
                  setFilterCountry(e.target.value)
                }}
              >
                <option value="">전체</option>
                {uniqueCountries.map((countryId) => (
                  <option key={countryId} value={countryId}>
                    {countryId}
                  </option>
                ))}
              </FilterSelect>
            </FilterGroup>

            {/* 왕조 필터 */}
            <FilterGroup>
              <FilterLabel>
                <FiCalendar size={12} />
                왕조
              </FilterLabel>
              <FilterSelect
                value={filterDynasty}
                onChange={(e) => {
                  playClickSound()
                  setFilterDynasty(e.target.value)
                }}
              >
                <option value="">전체</option>
                {uniqueDynasties.map((dynastyId) => (
                  <option key={dynastyId} value={dynastyId}>
                    {dynastyId}
                  </option>
                ))}
              </FilterSelect>
            </FilterGroup>

            {/* 직업 필터 */}
            <FilterGroup>
              <FilterLabel>
                <FiBriefcase size={12} />
                직업
              </FilterLabel>
              <FilterSelect
                value={filterJob}
                onChange={(e) => {
                  playClickSound()
                  setFilterJob(e.target.value)
                }}
              >
                <option value="">전체</option>
                {uniqueJobs.map((jobId) => (
                  <option key={jobId} value={jobId}>
                    {jobId}
                  </option>
                ))}
              </FilterSelect>
            </FilterGroup>

            {/* 종교 필터 */}
            <FilterGroup>
              <FilterLabel>종교</FilterLabel>
              <FilterSelect
                value={filterReligion}
                onChange={(e) => {
                  playClickSound()
                  setFilterReligion(e.target.value)
                }}
              >
                <option value="">전체</option>
                {uniqueReligions.map((religionId) => (
                  <option key={religionId} value={religionId}>
                    {religionId}
                  </option>
                ))}
              </FilterSelect>
            </FilterGroup>

            {/* 초기화 버튼 */}
            {activeFilterCount > 0 && (
              <>
                <FilterDivider />
                <ResetFiltersButton onClick={clearAllFilters}>
                  <FiX size={14} />
                  필터 초기화
                </ResetFiltersButton>
              </>
            )}
          </FilterSidebar>

          {/* 우측: 인물 리스트 */}
          <PersonsArea>
            <PersonsHeader>
              {filteredPersons.length > 0 ? (
                <ResultCount>
                  <span className="count">{filteredPersons.length}</span>
                  <span className="total">/ {persons.length}명</span>
                </ResultCount>
              ) : (
                <EmptyMessage>검색 결과가 없습니다</EmptyMessage>
              )}
            </PersonsHeader>

            <PersonsList>
              {filteredPersons.length === 0 ? (
                <EmptyState>
                  <EmptyIconWrap>
                    <FiUser size={40} strokeWidth={1.5} />
                  </EmptyIconWrap>
                  <EmptyText>검색 결과가 없습니다</EmptyText>
                  <EmptySub>필터를 조정하거나 검색어를 변경해 보세요</EmptySub>
                </EmptyState>
              ) : (
                filteredPersons.map((person) => {
                  const fullName = person.surname
                    ? `${person.surname} ${person.name}`
                    : person.name
                  const isSelected = selectedPersonId === person.id

                  // 생몰년도 포맷팅 (직업·국가는 ID만 있어 카드에는 표시하지 않음)
                  const birthYear = person.birthYear
                  const deathYear = person.deathYear
                  const lifespan =
                    birthYear || deathYear
                      ? `${birthYear || '?'} ~ ${deathYear || '현재'}`
                      : null

                  return (
                    <PersonCard
                      key={person.id}
                      $selected={isSelected}
                      onClick={() => handleSelect(person)}
                    >
                      <PersonAvatar $selected={isSelected}>
                        {person.profileImageUrl ? (
                          <img src={person.profileImageUrl} alt={fullName} />
                        ) : (
                          <FiUser size={22} strokeWidth={2} />
                        )}
                      </PersonAvatar>

                      <PersonMainInfo>
                        <PersonNameRow>
                          <PersonName>{fullName}</PersonName>
                          {isSelected ? (
                            <SelectedBadge>
                              <FiCheck size={14} strokeWidth={3} />
                            </SelectedBadge>
                          ) : null}
                        </PersonNameRow>

                        {lifespan ? (
                          <PersonMetaRow>
                            <PersonMeta>
                              <FiCalendar size={11} />
                              <span>{lifespan}</span>
                            </PersonMeta>
                          </PersonMetaRow>
                        ) : (
                          <PersonDates $empty>생몰 정보 없음</PersonDates>
                        )}
                      </PersonMainInfo>
                    </PersonCard>
                  )
                })
              )}
            </PersonsList>
          </PersonsArea>
        </SplitModalBody>
      </ModalBox>
    </ModalOverlay>
  )
}

// Styled Components — z-index를 상위 모달보다 높게 해 서브 모달에서도 앞에 표시
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_CONTENT + 50};
  padding: 24px;
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ModalBox = styled.div`
  background: ${BRAND.white};
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 920px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: ${Z_INDEX.MODAL_CONTENT + 51};
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from {
      transform: translateY(20px) scale(0.99);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px 20px;
  border-bottom: 1px solid ${BRAND.borderLight};
  background: linear-gradient(180deg, #fafbff 0%, ${BRAND.white} 100%);
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${BRAND.text};
  letter-spacing: -0.03em;
  line-height: 1.35;
`

const ModalCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: ${BRAND.surface};
  color: ${BRAND.textMuted};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${BRAND.primaryLight};
    color: ${BRAND.primary};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
  }
`

const SearchSection = styled.div`
  padding: 16px 28px 20px;
`

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  .search-icon {
    position: absolute;
    left: 18px;
    color: ${BRAND.textSubtle};
    pointer-events: none;
    transition: color 0.2s ease;
  }

  &:focus-within .search-icon {
    color: ${BRAND.primary};
  }
`

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 18px 14px 48px;
  font-size: 15px;
  font-weight: 500;
  color: ${BRAND.text};
  background: ${BRAND.surface};
  border: 1px solid ${BRAND.border};
  border-radius: 14px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: ${BRAND.textSubtle};
  }

  &:focus {
    background: ${BRAND.white};
    border-color: ${BRAND.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`

const SplitModalBody = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  flex: 1;
  min-height: 0;
  max-height: 56vh;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-height: 60vh;
  }
`

const FilterSidebar = styled.div`
  background: ${BRAND.surface};
  border-right: 1px solid ${BRAND.borderLight};
  overflow-y: auto;
  padding: 20px 16px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.border};
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid ${BRAND.borderLight};
    max-height: 220px;
  }
`

const FilterSidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${BRAND.borderLight};

  .label {
    font-size: 13px;
    font-weight: 600;
    color: ${BRAND.text};
  }
`

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: ${BRAND.primary};
  color: ${BRAND.white};
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  margin-left: auto;
`

const FilterGroup = styled.div`
  margin-bottom: 18px;
`

const FilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: ${BRAND.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;

  svg {
    color: ${BRAND.primary};
    opacity: 0.9;
  }
`

const FilterSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  color: ${BRAND.text};
  background: ${BRAND.white};
  border: 1px solid ${BRAND.border};
  border-radius: 10px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${BRAND.primaryMuted};
  }
  &:focus {
    border-color: ${BRAND.primary};
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`

const FilterDivider = styled.div`
  height: 1px;
  background: ${BRAND.border};
  margin: 16px 0;
  opacity: 0.6;
`

const ResetFiltersButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${BRAND.primary};
  background: ${BRAND.primaryLight};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${BRAND.primaryMuted};
    color: ${BRAND.white};
  }
`

const PersonsArea = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PersonsHeader = styled.div`
  padding: 14px 28px;
  border-bottom: 1px solid ${BRAND.borderLight};
`

const ResultCount = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${BRAND.textMuted};

  .count {
    color: ${BRAND.primary};
    font-weight: 700;
  }
  .total {
    color: ${BRAND.textSubtle};
    font-weight: 500;
  }
`

const EmptyMessage = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${BRAND.error};
`

const PersonsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 18px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${BRAND.borderLight};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.border};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${BRAND.textSubtle};
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
`

const EmptyIconWrap = styled.div`
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${BRAND.surface};
  border-radius: 50%;
  color: ${BRAND.textSubtle};
  margin-bottom: 20px;
  opacity: 0.7;
`

const EmptyText = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${BRAND.textMuted};
`

const EmptySub = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: ${BRAND.textSubtle};
`

const PersonCard = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: ${({ $selected }) => $selected ? '#eef2ff' : BRAND.white};
  border: 1.5px solid ${({ $selected }) => $selected ? '#6366f1' : BRAND.borderLight};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
  box-shadow: ${({ $selected }) => $selected ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none'};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: ${({ $selected }) => $selected ? '3px' : '0'};
    background: #6366f1;
    transition: width 0.18s;
  }

  &:hover {
    border-color: ${({ $selected }) => $selected ? '#6366f1' : '#a5b4fc'};
    background: ${({ $selected }) => $selected ? '#eef2ff' : '#f8faff'};
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
    transform: translateX(2px);
  }
  &:focus-visible {
    outline: none;
    border-color: ${BRAND.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
  }
`

const PersonAvatar = styled.div<{ $selected?: boolean }>`
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $selected }) =>
    $selected
      ? `linear-gradient(135deg, #6366f1 0%, #818cf8 100%)`
      : `linear-gradient(135deg, #1e293b 0%, #334155 100%)`};
  color: ${({ $selected }) => $selected ? BRAND.white : '#64748b'};
  flex-shrink: 0;
  overflow: hidden;
  border: 1.5px solid ${({ $selected }) => $selected ? '#6366f1' : '#e2e8f0'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }
`

const PersonMainInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 12px;
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const PersonName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${BRAND.text};
  letter-spacing: -0.02em;
  line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`

const SelectedBadge = styled.div`
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6366f1;
  color: ${BRAND.white};
  border-radius: 50%;
  flex-shrink: 0;
`

const PersonMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const PersonMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${BRAND.textMuted};

  svg {
    color: ${BRAND.textSubtle};
    flex-shrink: 0;
    opacity: 0.7;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }
`

const PersonDates = styled.div<{ $empty?: boolean }>`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ $empty }) => $empty ? BRAND.textSubtle : BRAND.textMuted};
  font-style: ${({ $empty }) => $empty ? 'italic' : 'normal'};
`
