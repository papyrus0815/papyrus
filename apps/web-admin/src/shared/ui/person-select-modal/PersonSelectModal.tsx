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

                  // 생몰년도 포맷팅
                  const birthYear = person.birthYear
                  const deathYear = person.deathYear
                  const lifespan =
                    birthYear || deathYear
                      ? `${birthYear || '?'} ~ ${deathYear || '현재'}`
                      : null

                  // 직업, 국가 추출
                  const primaryJob = person.jobId
                  const primaryCountry = person.countryId

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

                        <PersonMetaRow>
                          {lifespan && (
                            <PersonMeta>
                              <FiCalendar size={11} />
                              <span>{lifespan}</span>
                            </PersonMeta>
                          )}
                          {primaryJob && (
                            <PersonMeta>
                              <FiBriefcase size={11} />
                              <span>{primaryJob}</span>
                            </PersonMeta>
                          )}
                          {primaryCountry && (
                            <PersonMeta>
                              <FiMapPin size={11} />
                              <span>{primaryCountry}</span>
                            </PersonMeta>
                          )}
                        </PersonMetaRow>

                        {!lifespan && !primaryJob && !primaryCountry && (
                          <PersonDates $empty>정보 없음</PersonDates>
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

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ModalBox = styled.div`
  background: ${BRAND.white};
  border-radius: 24px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.04),
    0 24px 48px -12px rgba(0, 0, 0, 0.15),
    0 12px 24px -8px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from {
      transform: translateY(24px) scale(0.98);
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
  padding: 24px 28px 20px;
  border-bottom: 1px solid ${BRAND.borderLight};
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${BRAND.text};
  letter-spacing: -0.04em;
  line-height: 1.3;
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
  min-height: 420px;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    min-height: auto;
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
  font-size: 13px;
  font-weight: 500;
  color: ${BRAND.textMuted};

  .count {
    color: ${BRAND.primary};
    font-weight: 700;
  }
  .total {
    color: ${BRAND.textSubtle};
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
  padding: 16px 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.border};
    border-radius: 3px;
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
  padding: 14px 18px;
  background: ${({ $selected }) =>
    $selected ? BRAND.primaryLight : BRAND.white};
  border: 1px solid
    ${({ $selected }) => ($selected ? BRAND.primaryMuted : BRAND.borderLight)};
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;

  &:hover {
    border-color: ${({ $selected }) =>
      $selected ? BRAND.primary : BRAND.primaryMuted};
    background: ${({ $selected }) =>
      $selected ? BRAND.primaryLight : BRAND.surface};
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.06);
  }
`

const PersonAvatar = styled.div<{ $selected?: boolean }>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $selected }) =>
    $selected
      ? `linear-gradient(135deg, ${BRAND.primary} 0%, #818cf8 100%)`
      : `linear-gradient(135deg, ${BRAND.surface} 0%, #e2e8f0 100%)`};
  border-radius: 50%;
  color: ${({ $selected }) => ($selected ? BRAND.white : BRAND.textSubtle)};
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const PersonMainInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 16px;
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const PersonName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${BRAND.text};
  letter-spacing: -0.03em;
  line-height: 1.3;
`

const SelectedBadge = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${BRAND.primary};
  color: ${BRAND.white};
  border-radius: 50%;
  flex-shrink: 0;
`

const PersonMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const PersonMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: ${BRAND.textMuted};

  svg {
    color: ${BRAND.textSubtle};
    flex-shrink: 0;
    opacity: 0.8;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }
`

const PersonDates = styled.div<{ $empty?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $empty }) =>
    $empty ? BRAND.textSubtle : BRAND.textMuted};
`
