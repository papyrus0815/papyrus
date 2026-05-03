/**
 * 인물 선택 모달 - 공용 컴포넌트
 * 이름, 생몰년도로 검색 가능
 */
import React, { useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { toast } from 'react-hot-toast'
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { PersonResponseDto } from '@/shared/api/persons'
import { createPerson } from '@/shared/api/persons'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Z_INDEX } from '@/shared/styles/z-index'

interface PersonSelectModalProps {
  persons: PersonResponseDto[]
  selectedPersonId: string
  onSelect: (personId: string, personName: string) => void
  onClose: () => void
  /** 표시 목록에서 제외할 인물 ID들 (자기 자신·이미 다른 가족 슬롯에 들어간 인물 등) */
  excludeIds?: string[]
  /** 선택 불가 사유 안내 (excludeIds로 결과가 0건일 때 빈 상태에 노출) */
  excludeReason?: string
  /** 모달 제목 (예: "아버지 선택") — 미지정 시 "인물 선택" */
  title?: string
  /** 검색 placeholder (예: "아버지로 등록할 인물을 검색...") */
  searchPlaceholder?: string
  /**
   * 인라인 "+ 새 인물 등록" 진입점 활성화. 부모 폼의 현재 국가를 기본값으로 사용.
   * 미지정이거나 빈 문자열이면 진입점 자체가 노출되지 않음.
   */
  defaultCountryId?: string
  /** 인라인 등록으로 새 인물이 생성된 경우 콜백 — 부모가 로컬 인물 목록을 갱신할 수 있도록. */
  onCreatedPerson?: (person: PersonResponseDto) => void
}

type SortOption = 'name' | 'birth-asc' | 'birth-desc'

export const PersonSelectModal: React.FC<PersonSelectModalProps> = ({
  persons,
  selectedPersonId,
  onSelect,
  onClose,
  excludeIds,
  excludeReason,
  title,
  searchPlaceholder,
  defaultCountryId,
  onCreatedPerson,
}) => {
  const excludeSet = useMemo(
    () => new Set((excludeIds ?? []).filter(Boolean)),
    [excludeIds],
  )
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')

  // ─── 인라인 새 인물 등록 ───────────────────────────────────────────────
  const canCreate = !!defaultCountryId
  const [createMode, setCreateMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSurname, setNewSurname] = useState('')
  const [newGender, setNewGender] = useState<'' | 'MALE' | 'FEMALE'>('')
  const [newBirthYear, setNewBirthYear] = useState('')
  const [newDeathYear, setNewDeathYear] = useState('')
  const [creating, setCreating] = useState(false)

  const enterCreate = () => {
    playClickSound()
    // 검색어를 이름 필드에 자동 채움 — "검색했는데 못 찾음 → 등록" 흐름 가속.
    setNewName(searchQuery.trim())
    setNewSurname('')
    setNewGender('')
    setNewBirthYear('')
    setNewDeathYear('')
    setCreateMode(true)
  }

  const exitCreate = () => {
    if (creating) return
    setCreateMode(false)
  }

  const handleCreateSubmit = async () => {
    if (!defaultCountryId) {
      toast.error('국가를 먼저 선택해 주세요.')
      return
    }
    if (!newName.trim()) {
      toast.error('이름을 입력해 주세요.')
      return
    }
    if (!newSurname.trim()) {
      toast.error('성을 입력해 주세요.')
      return
    }
    if (!newGender) {
      toast.error('성별을 선택해 주세요.')
      return
    }
    setCreating(true)
    try {
      const payload: any = {
        name: newName.trim(),
        surname: newSurname.trim(),
        gender: newGender,
        countryId: defaultCountryId,
      }
      if (newBirthYear.trim()) {
        const y = parseInt(newBirthYear, 10)
        if (!isNaN(y) && y >= 1 && y <= 9999) {
          payload.birth = { era: 'AD', year: y }
        }
      }
      if (newDeathYear.trim()) {
        const y = parseInt(newDeathYear, 10)
        if (!isNaN(y) && y >= 1 && y <= 9999) {
          payload.death = { era: 'AD', year: y }
        }
      }
      const created = await createPerson(payload)
      toast.success('인물을 등록했습니다.')
      onCreatedPerson?.(created)
      const fullName = getPersonDisplayName(created)
      onSelect(created.id, fullName)
      onClose()
    } catch (err: any) {
      toast.error(err?.message ?? '등록에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

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
    let result = excludeSet.size > 0
      ? persons.filter((p) => !excludeSet.has(p.id))
      : persons

    // 검색어 필터
    const query = searchQuery.toLowerCase().trim()
    if (query) {
      result = result.filter((person) => {
        const display = getPersonDisplayName(person).toLowerCase()
        const westernLike = getPersonDisplayName(person, {
          countryDefaultNameDisplayOrder: 'western',
        }).toLowerCase()
        const koreanLike = getPersonDisplayName(person, {
          countryDefaultNameDisplayOrder: 'korean',
        }).toLowerCase()
        const birthYear = person.birthYear ? String(person.birthYear) : ''
        const deathYear = person.deathYear ? String(person.deathYear) : ''

        return (
          display.includes(query) ||
          westernLike.includes(query) ||
          koreanLike.includes(query) ||
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
        const nameA = getPersonDisplayName(personA)
        const nameB = getPersonDisplayName(personB)
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
    excludeSet,
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
    const fullName = getPersonDisplayName(person)
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

  const modal = (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          {createMode ? (
            <CreateBackBtn type="button" onClick={exitCreate} disabled={creating}>
              <FiArrowLeft size={16} />
              검색으로
            </CreateBackBtn>
          ) : null}
          <ModalTitle>
            {createMode ? '새 인물 등록' : (title ?? '인물 선택')}
          </ModalTitle>
          <ModalCloseButton onClick={onClose} aria-label="닫기">
            <FiX size={20} strokeWidth={2.5} />
          </ModalCloseButton>
        </ModalHeader>

        {!createMode && (
          /* 검색 바 + 새 인물 등록 진입점 */
          <SearchSection>
            <SearchWrapper>
              <FiSearch size={20} className="search-icon" />
              <SearchInput
                type="text"
                placeholder={
                  searchPlaceholder ?? '이름 또는 생몰년도로 검색...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </SearchWrapper>
            {canCreate && (
              <CreateEntryBtn
                type="button"
                onClick={enterCreate}
                title="DB에 없는 인물을 즉석에서 등록 (skeleton). 상세는 인물 페이지에서 보강."
              >
                <FiPlus size={14} />
                새 인물
              </CreateEntryBtn>
            )}
          </SearchSection>
        )}

        {createMode ? (
          <CreateFormBody>
            <CreateFormHint>
              필수 정보만 입력해 빠르게 등록합니다. 생몰지·가족·약력 등 상세는 인물 페이지에서 보강할 수 있습니다.
            </CreateFormHint>
            <CreateFormGrid>
              <CreateFormField>
                <CreateFormLabel>성</CreateFormLabel>
                <CreateFormInput
                  type="text"
                  value={newSurname}
                  onChange={(e) => setNewSurname(e.target.value)}
                  placeholder="예: 김"
                  disabled={creating}
                  autoFocus
                />
              </CreateFormField>
              <CreateFormField>
                <CreateFormLabel>이름</CreateFormLabel>
                <CreateFormInput
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 홍길동"
                  disabled={creating}
                />
              </CreateFormField>
              <CreateFormField $span={2}>
                <CreateFormLabel>성별</CreateFormLabel>
                <CreateFormChips role="radiogroup" aria-label="성별">
                  <CreateFormChip
                    type="button"
                    role="radio"
                    aria-checked={newGender === 'MALE'}
                    $active={newGender === 'MALE'}
                    onClick={() => setNewGender('MALE')}
                    disabled={creating}
                  >
                    남성
                  </CreateFormChip>
                  <CreateFormChip
                    type="button"
                    role="radio"
                    aria-checked={newGender === 'FEMALE'}
                    $active={newGender === 'FEMALE'}
                    onClick={() => setNewGender('FEMALE')}
                    disabled={creating}
                  >
                    여성
                  </CreateFormChip>
                </CreateFormChips>
              </CreateFormField>
              <CreateFormField>
                <CreateFormLabel>출생 연도 (선택)</CreateFormLabel>
                <CreateFormInput
                  type="number"
                  min={1}
                  max={9999}
                  value={newBirthYear}
                  onChange={(e) => setNewBirthYear(e.target.value)}
                  placeholder="예: 1397"
                  disabled={creating}
                />
              </CreateFormField>
              <CreateFormField>
                <CreateFormLabel>사망 연도 (선택)</CreateFormLabel>
                <CreateFormInput
                  type="number"
                  min={1}
                  max={9999}
                  value={newDeathYear}
                  onChange={(e) => setNewDeathYear(e.target.value)}
                  placeholder="예: 1450"
                  disabled={creating}
                />
              </CreateFormField>
            </CreateFormGrid>
            <CreateFormActions>
              <CreateFormCancelBtn
                type="button"
                onClick={exitCreate}
                disabled={creating}
              >
                취소
              </CreateFormCancelBtn>
              <CreateFormSubmitBtn
                type="button"
                onClick={handleCreateSubmit}
                disabled={creating}
              >
                {creating ? '등록 중…' : '등록 후 이 슬롯에 지정'}
              </CreateFormSubmitBtn>
            </CreateFormActions>
          </CreateFormBody>
        ) : (
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
                  <EmptySub>
                    {excludeReason ?? '필터를 조정하거나 검색어를 변경해 보세요'}
                  </EmptySub>
                </EmptyState>
              ) : (
                filteredPersons.map((person) => {
                  const fullName = getPersonDisplayName(person)
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
        )}
      </ModalBox>
    </ModalOverlay>
  )

  if (typeof document === 'undefined') return null

  return createPortal(modal, document.body)
}

// Styled Components — z-index를 상위 모달보다 높게 해 서브 모달에서도 앞에 표시
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  padding: 24px;
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ModalBox = styled.div`
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(20,20,20,0.92)' : '#ffffff'};
  backdrop-filter: ${({ theme }) => theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) => theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? '0 20px 60px rgba(0,0,0,0.6)'
    : '0 20px 60px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)'};
  width: 100%;
  max-width: 920px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: ${Z_INDEX.MODAL_CONTENT};
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
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.03)'
    : 'linear-gradient(180deg, #fafbff 0%, #ffffff 100%)'};
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
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
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#eef2ff'};
    color: #6366f1;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
  }
`

const SearchSection = styled.div`
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 16px 28px 20px;
  > :first-child {
    flex: 1;
    min-width: 0;
  }
`

const CreateEntryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  background: ${({ theme }) =>
    theme.colors.alert.info.bg};
  border: 1px solid ${({ theme }) =>
    theme.colors.alert.info.border};
  border-radius: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  &:hover {
    color: #fff;
    background: #6366f1;
    border-color: #6366f1;
  }
`

const CreateBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  margin-right: 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CreateFormBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 28px 24px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

const CreateFormHint = styled.p`
  margin: 0;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.colors.alert.info.bg};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#e0e7ff'};
  border-radius: 12px;
`

const CreateFormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const CreateFormField = styled.div<{ $span?: number }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ $span }) =>
    $span && $span > 1
      ? `grid-column: span ${$span};`
      : ''}
  @media (max-width: 640px) {
    grid-column: span 1;
  }
`

const CreateFormLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CreateFormInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  outline: none;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
  &:disabled {
    opacity: 0.6;
  }
`

const CreateFormChips = styled.div`
  display: flex;
  gap: 6px;
`

const CreateFormChip = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? '#fff' : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
    $active
      ? '#6366f1'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : '#fff'};
  border: 1px solid ${({ $active, theme }) =>
    $active ? '#6366f1' : theme.colors.border.default};
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  &:hover:not(:disabled) {
    border-color: ${({ $active }) => ($active ? '#4f46e5' : '#a5b4fc')};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CreateFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-top: 6px;
`

const CreateFormCancelBtn = styled.button`
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CreateFormSubmitBtn = styled.button`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: #6366f1;
  border: 1px solid #6366f1;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
  &:hover:not(:disabled) {
    background: #4f46e5;
    border-color: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  .search-icon {
    position: absolute;
    left: 18px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
    transition: color 0.2s ease;
  }

  &:focus-within .search-icon {
    color: #6366f1;
  }
`

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 18px 14px 48px;
  font-size: 15px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
    border-color: #6366f1;
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
  background: ${({ theme }) => theme.colors.background.secondary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  overflow-y: auto;
  padding: 20px 16px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    max-height: 220px;
  }
`

const FilterSidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  .label {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #6366f1;
  color: #ffffff;
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
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;

  svg {
    color: #6366f1;
    opacity: 0.9;
  }
`

const FilterSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: #c7d2fe;
  }
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`

const FilterDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.default};
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
  color: #6366f1;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eef2ff'};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #c7d2fe;
    color: #ffffff;
  }
`

const PersonsArea = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PersonsHeader = styled.div`
  padding: 14px 28px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ResultCount = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};

  .count {
    color: #6366f1;
    font-weight: 700;
  }
  .total {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 500;
  }
`

const EmptyMessage = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #ef4444;
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
    background: ${({ theme }) => theme.colors.background.secondary};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.text.tertiary};
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
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 20px;
  opacity: 0.7;
`

const EmptyText = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptySub = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PersonCard = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#eef2ff'
      : theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'};
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? '#6366f1' : theme.colors.border.light};
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
  box-shadow: ${({ $selected }) =>
    $selected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none'};

  &:hover {
    border-color: ${({ $selected }) =>
      $selected ? '#6366f1' : '#c7d2fe'};
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#eef2ff'
        : theme.colors.background.secondary};
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
  }
  &:focus-visible {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
  }
`

const PersonAvatar = styled.div<{ $selected?: boolean }>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $selected, theme }) =>
    $selected
      ? 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)'
      : theme.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'};
  border-radius: 50%;
  color: ${({ $selected, theme }) => ($selected ? '#ffffff' : theme.colors.text.tertiary)};
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
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
  line-height: 1.3;
`

const SelectedBadge = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6366f1;
  color: #ffffff;
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
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
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
  color: ${({ $empty, theme }) =>
    $empty ? theme.colors.text.tertiary : theme.colors.text.secondary};
`
