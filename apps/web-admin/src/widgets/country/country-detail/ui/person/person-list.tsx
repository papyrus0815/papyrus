import React from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'

import { type PersonResponseDto as Person } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { PersonCard } from './person-card'
import { PersonFilters } from './person-filters'

interface DynastyItem {
  id: string
  name: string
}

interface PersonListProps {
  persons: Person[]
  searchTerm: string
  onSearchChange: (value: string) => void
  genderFilter: string
  onGenderChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  onPersonClick: (personId: string) => void
  currentPage: number
  onPageChange: (page: number) => void
  itemsPerPage: number
  /** 가문 목록 (인물 카드에 가문명 표시용) */
  dynasties?: DynastyItem[]
}

export function PersonList({
  persons,
  searchTerm,
  onSearchChange,
  genderFilter,
  onGenderChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  onPersonClick,
  currentPage,
  onPageChange,
  itemsPerPage,
  dynasties = [],
}: PersonListProps) {
  const [showGenderModal, setShowGenderModal] = React.useState(false)
  const [showStatusModal, setShowStatusModal] = React.useState(false)
  const [showSortModal, setShowSortModal] = React.useState(false)

  // 검색 및 필터링
  const filteredPersons = persons
    .filter((person) => {
      const searchLower = searchTerm.toLowerCase()
      const display = getPersonDisplayName(person).toLowerCase()
      const westernLike = getPersonDisplayName(person, {
        countryDefaultNameDisplayOrder: 'western',
      }).toLowerCase()
      const koreanLike = getPersonDisplayName(person, {
        countryDefaultNameDisplayOrder: 'korean',
      }).toLowerCase()
      const matchesSearch =
        display.includes(searchLower) ||
        westernLike.includes(searchLower) ||
        koreanLike.includes(searchLower)

      const matchesGender =
        genderFilter === 'all' || person.gender === genderFilter

      let matchesStatus = true
      if (statusFilter === 'alive') {
        matchesStatus = !person.deathYear
      } else if (statusFilter === 'deceased') {
        matchesStatus = !!person.deathYear
      }

      return matchesSearch && matchesGender && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = getPersonDisplayName(a)
        const nameB = getPersonDisplayName(b)
        return nameA.localeCompare(nameB)
      } else if (sortBy === 'birthYear') {
        return (b.birthYear || 0) - (a.birthYear || 0)
      } else if (sortBy === 'deathYear') {
        return (b.deathYear || 0) - (a.deathYear || 0)
      }
      return 0
    })

  const totalPages = Math.ceil(filteredPersons.length / itemsPerPage)
  const paginatedPersons = filteredPersons.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  return (
    <Container>
      <PersonFilters
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        genderFilter={genderFilter}
        onGenderChange={onGenderChange}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        resultCount={filteredPersons.length}
        showGenderModal={showGenderModal}
        setShowGenderModal={setShowGenderModal}
        showStatusModal={showStatusModal}
        setShowStatusModal={setShowStatusModal}
        showSortModal={showSortModal}
        setShowSortModal={setShowSortModal}
      />

      {filteredPersons.length === 0 ? (
        <EmptyState
          as={motion.div}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <EmptyIcon>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M20 20l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </EmptyIcon>
          <EmptyTitle>검색 결과가 없습니다</EmptyTitle>
          <EmptyDesc>다른 검색어나 필터를 사용해보세요</EmptyDesc>
        </EmptyState>
      ) : (
        <>
          <Grid>
            {paginatedPersons.map((person, index) => {
              const dynastyId = (person as { dynastyId?: string | null }).dynastyId
              const dynastyFromApi = (person as { dynasty?: { id: string; name: string } | null }).dynasty
              const dynastyName =
                dynastyFromApi?.name ??
                (dynastyId != null ? dynasties.find((d) => d.id === dynastyId)?.name : undefined)
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  index={index}
                  onClick={() => onPersonClick(person.id)}
                  dynastyName={dynastyName}
                />
              )
            })}
          </Grid>

          {totalPages > 1 && (
            <Pagination>
              <PaginationButton
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ‹ 이전
              </PaginationButton>

              <PaginationInfo>
                {currentPage} / {totalPages}
              </PaginationInfo>

              <PaginationButton
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                다음 ›
              </PaginationButton>
            </Pagination>
          )}
        </>
      )}

      {/* 성별 선택 모달 */}
      <AnimatePresence>
        {showGenderModal && (
          <>
            <ModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGenderModal(false)}
            />
            <Modal
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ModalHeader>
                <ModalTitle>성별 선택</ModalTitle>
                <ModalClose onClick={() => setShowGenderModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      fill="currentColor"
                    />
                  </svg>
                </ModalClose>
              </ModalHeader>
              <ModalContent>
                <ModalOption
                  $active={genderFilter === 'all'}
                  onClick={() => {
                    onGenderChange('all')
                    setShowGenderModal(false)
                  }}
                >
                  <ModalOptionText>전체</ModalOptionText>
                  {genderFilter === 'all' && (
                    <ModalOptionCheck>✓</ModalOptionCheck>
                  )}
                </ModalOption>
                <ModalOption
                  $active={genderFilter === '남성'}
                  onClick={() => {
                    onGenderChange('남성')
                    setShowGenderModal(false)
                  }}
                >
                  <ModalOptionText>남성</ModalOptionText>
                  {genderFilter === '남성' && (
                    <ModalOptionCheck>✓</ModalOptionCheck>
                  )}
                </ModalOption>
                <ModalOption
                  $active={genderFilter === '여성'}
                  onClick={() => {
                    onGenderChange('여성')
                    setShowGenderModal(false)
                  }}
                >
                  <ModalOptionText>여성</ModalOptionText>
                  {genderFilter === '여성' && (
                    <ModalOptionCheck>✓</ModalOptionCheck>
                  )}
                </ModalOption>
              </ModalContent>
            </Modal>
          </>
        )}
      </AnimatePresence>

      {/* 상태 선택 모달 */}
      <AnimatePresence>
        {showStatusModal && (
          <>
            <ModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStatusModal(false)}
            />
            <Modal
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ModalHeader>
                <ModalTitle>상태 선택</ModalTitle>
                <ModalClose onClick={() => setShowStatusModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      fill="currentColor"
                    />
                  </svg>
                </ModalClose>
              </ModalHeader>
              <ModalContent>
                <ModalOption
                  $active={statusFilter === 'all'}
                  onClick={() => {
                    onStatusChange('all')
                    setShowStatusModal(false)
                  }}
                >
                  <ModalOptionText>전체</ModalOptionText>
                  {statusFilter === 'all' && (
                    <ModalOptionCheck>✓</ModalOptionCheck>
                  )}
                </ModalOption>
                <ModalOption
                  $active={statusFilter === 'alive'}
                  onClick={() => {
                    onStatusChange('alive')
                    setShowStatusModal(false)
                  }}
                >
                  <ModalOptionText>생존</ModalOptionText>
                  {statusFilter === 'alive' && (
                    <ModalOptionCheck>✓</ModalOptionCheck>
                  )}
                </ModalOption>
                <ModalOption
                  $active={statusFilter === 'deceased'}
                  onClick={() => {
                    onStatusChange('deceased')
                    setShowStatusModal(false)
                  }}
                >
                  <ModalOptionText>사망</ModalOptionText>
                  {statusFilter === 'deceased' && (
                    <ModalOptionCheck>✓</ModalOptionCheck>
                  )}
                </ModalOption>
              </ModalContent>
            </Modal>
          </>
        )}
      </AnimatePresence>

      {/* 정렬 선택 모달 */}
      <AnimatePresence>
        {showSortModal && (
          <>
            <ModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSortModal(false)}
            />
            <Modal
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ModalHeader>
                <ModalTitle>정렬 방식</ModalTitle>
                <ModalClose onClick={() => setShowSortModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      fill="currentColor"
                    />
                  </svg>
                </ModalClose>
              </ModalHeader>
              <ModalContent>
                <ModalOption
                  $active={sortBy === 'name'}
                  onClick={() => {
                    onSortChange('name')
                    setShowSortModal(false)
                  }}
                >
                  <ModalOptionText>이름순</ModalOptionText>
                  {sortBy === 'name' && <ModalOptionCheck>✓</ModalOptionCheck>}
                </ModalOption>
                <ModalOption
                  $active={sortBy === 'birthYear'}
                  onClick={() => {
                    onSortChange('birthYear')
                    setShowSortModal(false)
                  }}
                >
                  <ModalOptionText>출생순</ModalOptionText>
                  {sortBy === 'birthYear' && (
                    <ModalOptionCheck>✓</ModalOptionCheck>
                  )}
                </ModalOption>
                <ModalOption
                  $active={sortBy === 'deathYear'}
                  onClick={() => {
                    onSortChange('deathYear')
                    setShowSortModal(false)
                  }}
                >
                  <ModalOptionText>사망순</ModalOptionText>
                  {sortBy === 'deathYear' && (
                    <ModalOptionCheck>✓</ModalOptionCheck>
                  )}
                </ModalOption>
              </ModalContent>
            </Modal>
          </>
        )}
      </AnimatePresence>
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 40px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#1d1d1d'
      : 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)'};
  border-radius: 20px;
  border: 2px dashed ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  text-align: center;
`

const EmptyIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#212121'
      : 'linear-gradient(135deg, #fff 0%, #fafafa 100%)'};
  border: 2px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#9ca3af')};
`

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#d1d5db' : '#374151')};
  margin: 0 0 8px 0;
`

const EmptyDesc = styled.p`
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#9ca3af')};
  font-size: 14px;
  font-weight: 500;
  margin: 0;
`

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  padding: 24px;
`

const PaginationButton = styled.button<{ disabled?: boolean }>`
  padding: 12px 24px;
  border: ${({ disabled, theme }) =>
    disabled
      ? `2px solid ${theme.mode === 'dark' ? '#2a2a2a' : '#f3f4f6'}`
      : 'none'};
  border-radius: 12px;
  background: ${({ disabled, theme }) =>
    disabled
      ? theme.mode === 'dark'
        ? '#1d1d1d'
        : '#fafbfc'
      : 'linear-gradient(135deg, #ad46ff 0%, #9146ff 100%)'};
  color: ${({ disabled, theme }) =>
    disabled ? (theme.mode === 'dark' ? '#3f3f46' : '#d1d5db') : 'white'};
  font-size: 15px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ disabled }) =>
    disabled ? 'none' : '0 4px 12px rgba(173, 70, 255, 0.3)'};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(173, 70, 255, 0.4);
  }
`

const PaginationInfo = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #ad46ff;
  min-width: 100px;
  text-align: center;
  padding: 12px 20px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(173, 70, 255, 0.12)'
      : 'linear-gradient(135deg, #f3e8ff 0%, #e9d1ff 100%)'};
  border-radius: 12px;
  border: 2px solid rgba(173, 70, 255, 0.2);
`

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : 'white')};
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 10001;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f1f5f9')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#fafbfc')};
`

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')};
  margin: 0;
`

const ModalClose = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#64748b')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f1f5f9')};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')};
  }
`

const ModalContent = styled.div`
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
`

const ModalOption = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(173, 70, 255, 0.12)'
        : '#f3e8ff'
      : 'transparent'};
  border: ${({ $active }) => ($active ? '2px solid #ad46ff' : 'none')};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(173, 70, 255, 0.12)'
          : '#f3e8ff'
        : theme.mode === 'dark'
          ? '#1d1d1d'
          : '#fafbfc'};
  }
`

const ModalOptionText = styled.div`
  flex: 1;
  text-align: left;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')};
`

const ModalOptionCheck = styled.div`
  font-size: 20px;
  color: #ad46ff;
  font-weight: 700;
`
