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

const ModalBox = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 800px;
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
`

const ModalCloseButton = styled.button`
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
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }
`

const SearchSection = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

// 좌우 분할 레이아웃
const SplitModalBody = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  height: 500px;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`

// 좌측 필터 사이드바
const FilterSidebar = styled.div`
  background: #f8fafc;
  border-right: 1px solid rgba(226, 232, 240, 1);
  overflow-y: auto;
  padding: 12px 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid rgba(226, 232, 240, 1);
    max-height: 200px;
  }
`

const FilterSidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  padding: 8px 12px;
  margin-bottom: 8px;

  svg {
    color: #6366f1;
  }
`

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #6366f1;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 9px;
  margin-left: auto;
`

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 4px;
  margin-bottom: 12px;
`

const FilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    color: #6366f1;
  }
`

const FilterSelect = styled.select`
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;

  &:hover {
    border-color: #6366f1;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  option {
    padding: 8px;
  }
`

const FilterDivider = styled.div`
  height: 1px;
  background: rgba(226, 232, 240, 0.6);
  margin: 8px 4px;
`

const ResetFiltersButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0 4px;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }

  &:active {
    transform: scale(0.98);
  }
`

// 우측 인물 리스트 영역
const PersonsArea = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PersonsHeader = styled.div`
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: #ffffff;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);

  span {
    display: flex;
    align-items: center;
    gap: 6px;
  }
`

const PersonsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;

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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #cbd5e1;

  p {
    margin: 16px 0 0;
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
  }
`

const PersonCard = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 6px;
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

const PersonCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
`

const PersonAvatar = styled.div<{ $selected?: boolean }>`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $selected }) =>
    $selected ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0'};
  border-radius: 10px;
  color: ${({ $selected }) => ($selected ? '#ffffff' : '#64748b')};
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
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

const PersonName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.2px;
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
  font-size: 11px;
  font-weight: 500;
  color: #64748b;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100px;
  }
`

const PersonDates = styled.div<{ $empty?: boolean }>`
  font-size: 11px;
  font-weight: 500;
  color: ${({ $empty }) => ($empty ? '#94a3b8' : '#64748b')};
`

// 토글 버튼
const ToggleButton = styled.div<{ $selected: boolean }>`
  position: relative;
  width: 40px;
  height: 22px;
  background: ${({ $selected }) =>
    $selected ? '#6366f1' : 'rgba(203, 213, 225, 0.5)'};
  border-radius: 11px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  border: 2px solid
    ${({ $selected }) => ($selected ? '#6366f1' : 'rgba(203, 213, 225, 0.8)')};

  &:hover {
    background: ${({ $selected }) =>
      $selected ? '#4f46e5' : 'rgba(203, 213, 225, 0.7)'};
    border-color: ${({ $selected }) => ($selected ? '#4f46e5' : '#cbd5e1')};
  }
`

const ToggleSlider = styled.div<{ $selected: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $selected }) => ($selected ? '20px' : '2px')};
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`
