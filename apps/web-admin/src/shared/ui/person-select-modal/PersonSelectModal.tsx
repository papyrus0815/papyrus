/**
 * 인물 선택 모달 - 공용 컴포넌트
 * 이름, 생몰년도로 검색 가능
 */
import React, { useMemo, useState } from 'react'

import {
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { PersonResponseDto } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

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
          <ModalCloseButton onClick={onClose}>
            <FiX size={20} />
          </ModalCloseButton>
        </ModalHeader>

        {/* 검색 바 */}
        <SearchSection>
          <SearchInput
            type="text"
            placeholder="이름 또는 생몰년도로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </SearchSection>

        <SplitModalBody>
          {/* 좌측: 필터 사이드바 */}
          <FilterSidebar>
            <FilterSidebarHeader>
              <FiFilter size={14} />
              필터
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
                <span>
                  검색 결과: {filteredPersons.length}명 / 전체 {persons.length}
                  명
                </span>
              ) : (
                <span style={{ color: '#ef4444' }}>검색 결과가 없습니다</span>
              )}
            </PersonsHeader>

            <PersonsList>
              {filteredPersons.length === 0 ? (
                <EmptyState>
                  <FiUser size={48} style={{ opacity: 0.2 }} />
                  <p>검색 결과가 없습니다</p>
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
                      <PersonCardContent>
                        <PersonAvatar $selected={isSelected}>
                          {person.profileImageUrl ? (
                            <img src={person.profileImageUrl} alt={fullName} />
                          ) : (
                            <FiUser size={24} />
                          )}
                        </PersonAvatar>

                        <PersonMainInfo>
                          <PersonNameRow>
                            <PersonName>{fullName}</PersonName>
                            <ToggleButton $selected={isSelected}>
                              <ToggleSlider $selected={isSelected} />
                            </ToggleButton>
                          </PersonNameRow>

                          <PersonMetaRow>
                            {lifespan && (
                              <PersonMeta>
                                <FiCalendar size={12} />
                                <span>{lifespan}</span>
                              </PersonMeta>
                            )}
                            {primaryJob && (
                              <PersonMeta>
                                <FiBriefcase size={12} />
                                <span>{primaryJob}</span>
                              </PersonMeta>
                            )}
                            {primaryCountry && (
                              <PersonMeta>
                                <FiMapPin size={12} />
                                <span>{primaryCountry}</span>
                              </PersonMeta>
                            )}
                          </PersonMetaRow>

                          {!lifespan && !primaryJob && !primaryCountry && (
                            <PersonDates $empty>정보 없음</PersonDates>
                          )}
                        </PersonMainInfo>
                      </PersonCardContent>
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
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

const ModalBox = styled.div`
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 880px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.25s ease;

  @keyframes slideUp {
    from {
      transform: translateY(16px);
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
  padding: 24px 28px;
  border-bottom: 1px solid #eee;
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #111;
  letter-spacing: -0.03em;
`

const ModalCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: #f5f5f5;
  color: #666;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: var(--color-primary-100, #f3e8ff);
    color: var(--color-primary);
  }
`

const SearchSection = styled.div`
  padding: 20px 28px;
  border-bottom: 1px solid #eee;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 16px 20px;
  font-size: 16px;
  color: #111;
  border: 2px solid #eee;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: #999;
  }

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px rgba(173, 70, 255, 0.12);
  }
`

const SplitModalBody = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 420px;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
`

const FilterSidebar = styled.div`
  background: #fafafa;
  border-right: 1px solid #eee;
  overflow-y: auto;
  padding: 20px 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid #eee;
    max-height: 220px;
  }
`

const FilterSidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #111;
  padding: 0 4px 16px;
  margin-bottom: 12px;
  border-bottom: 1px solid #eee;

  svg {
    color: var(--color-primary);
  }
`

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 11px;
  margin-left: auto;
`

const FilterGroup = styled.div`
  margin-bottom: 20px;
`

const FilterLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;

  svg {
    color: var(--color-primary);
  }
`

const FilterSelect = styled.select`
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 500;
  color: #111;
  background: #fff;
  border: 2px solid #eee;
  border-radius: 10px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;

  &:hover, &:focus {
    border-color: var(--color-primary);
  }
`

const FilterDivider = styled.div`
  height: 1px;
  background: #eee;
  margin: 16px 0;
`

const ResetFiltersButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-100, #f3e8ff);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
`

const PersonsArea = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PersonsHeader = styled.div`
  padding: 16px 28px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  border-bottom: 1px solid #eee;
`

const PersonsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 28px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 4px;
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  color: #bbb;

  p {
    margin: 20px 0 0;
    font-size: 16px;
    font-weight: 500;
    color: #888;
  }
`

const PersonCard = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  padding: 18px 20px;
  margin-bottom: 10px;
  background: ${({ $selected }) =>
    $selected ? 'var(--color-primary-100, #f3e8ff)' : '#fff'};
  border: 2px solid
    ${({ $selected }) =>
      $selected ? 'var(--color-primary)' : '#eee'};
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    border-color: var(--color-primary);
    background: ${({ $selected }) =>
      $selected ? 'var(--color-primary-100, #f3e8ff)' : 'var(--color-primary-100, #faf5ff)'};
  }
`

const PersonCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
`

const PersonAvatar = styled.div<{ $selected?: boolean }>`
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $selected }) =>
    $selected ? 'var(--color-primary)' : '#f0f0f0'};
  border-radius: 14px;
  color: ${({ $selected }) => ($selected ? '#fff' : '#888')};
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
  gap: 8px;
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const PersonName = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: #111;
  letter-spacing: -0.02em;
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
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #666;

  svg {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }
`

const PersonDates = styled.div<{ $empty?: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${({ $empty }) => ($empty ? '#999' : '#666')};
`

const ToggleButton = styled.div<{ $selected: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  background: ${({ $selected }) =>
    $selected ? 'var(--color-primary)' : '#e0e0e0'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
  border: none;

  &:hover {
    opacity: 0.9;
  }
`

const ToggleSlider = styled.div<{ $selected: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $selected }) => ($selected ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: all 0.25s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
`
