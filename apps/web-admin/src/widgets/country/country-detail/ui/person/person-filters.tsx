import React from 'react'

import { motion } from 'framer-motion'
import styled from 'styled-components'

interface PersonFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  genderFilter: string
  onGenderChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  resultCount: number
  showGenderModal: boolean
  setShowGenderModal: (show: boolean) => void
  showStatusModal: boolean
  setShowStatusModal: (show: boolean) => void
  showSortModal: boolean
  setShowSortModal: (show: boolean) => void
}

export function PersonFilters({
  searchTerm,
  onSearchChange,
  genderFilter,
  onGenderChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  resultCount,
  showGenderModal,
  setShowGenderModal,
  showStatusModal,
  setShowStatusModal,
  showSortModal,
  setShowSortModal,
}: PersonFiltersProps) {
  const hasActiveFilters = genderFilter !== 'all' || statusFilter !== 'all'

  const handleReset = () => {
    onGenderChange('all')
    onStatusChange('all')
  }

  const GENDER_LABELS: Record<string, string> = {
    all: '성별',
    남성: '남성',
    여성: '여성',
  }

  const STATUS_LABELS: Record<string, string> = {
    all: '상태',
    alive: '생존',
    deceased: '사망',
  }

  return (
    <FilterRow
      as={motion.div}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <FilterWrapper>
        <SearchWrapper>
          <SearchIcon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                fill="currentColor"
              />
            </svg>
          </SearchIcon>
          <SearchInput
            type="text"
            placeholder="이름으로 검색..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <ClearButton onClick={() => onSearchChange('')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  fill="currentColor"
                />
              </svg>
            </ClearButton>
          )}
        </SearchWrapper>

        <FilterButton
          onClick={() => setShowGenderModal(true)}
          $active={genderFilter !== 'all'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              fill="currentColor"
            />
          </svg>
          {GENDER_LABELS[genderFilter]}
        </FilterButton>

        <FilterButton
          onClick={() => setShowStatusModal(true)}
          $active={statusFilter !== 'all'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              fill="currentColor"
            />
          </svg>
          {STATUS_LABELS[statusFilter]}
        </FilterButton>

        <FilterButton onClick={() => setShowSortModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"
              fill="currentColor"
            />
          </svg>
          {sortBy === 'name'
            ? '이름순'
            : sortBy === 'birthYear'
              ? '출생순'
              : '사망순'}
        </FilterButton>
      </FilterWrapper>

      {hasActiveFilters && (
        <ClearAllFiltersButton onClick={handleReset}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              fill="currentColor"
            />
          </svg>
          초기화
        </ClearAllFiltersButton>
      )}

      {searchTerm && (
        <FilterResultBar>
          <FilterResultText>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                fill="currentColor"
              />
            </svg>
            <FilterResultCount>{resultCount}</FilterResultCount>
            개의 인물 발견
          </FilterResultText>
        </FilterResultBar>
      )}
    </FilterRow>
  )
}

// Styled Components
const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#212121'
      : 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)'};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#dadce0')};
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 10px 8px;
    gap: 8px;
  }

  @media (max-width: 480px) {
    padding: 8px 6px;
    gap: 6px;
  }
`

const FilterWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    gap: 10px;
  }
`

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  max-width: 400px;

  @media (max-width: 768px) {
    max-width: 100%;
    min-width: 100%;
  }
`

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#5f6368')};
  pointer-events: none;
  z-index: 1;
`

const SearchInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 36px 0 40px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  border-radius: 8px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#202124')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#ffffff')};
  transition: all 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#9aa0a6')};
  }

  &:hover {
    border-color: ${({ theme }) => (theme.mode === 'dark' ? '#3f3f46' : '#d1d5db')};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  &:focus {
    outline: none;
    border-color: #ad46ff;
    box-shadow:
      0 0 0 3px rgba(173, 70, 255, 0.08),
      0 1px 3px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    height: 36px;
    font-size: 13px;
    padding: 0 32px 0 36px;
  }

  @media (max-width: 480px) {
    height: 34px;
    font-size: 12px;
    padding: 0 28px 0 32px;
  }
`

const ClearButton = styled.button`
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#5f6368')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f1f3f4')};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#202124')};
  }

  &:active {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e8eaed')};
    transform: scale(0.95);
  }
`

const FilterButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? '#ad46ff' : theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ $active, theme }) =>
    $active ? '#ad46ff' : theme.mode === 'dark' ? '#a1a1aa' : '#5f6368'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(173, 70, 255, 0.12)'
        : '#f3e8ff'
      : theme.mode === 'dark'
        ? '#212121'
        : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: ${({ $active }) =>
    $active ? '0 0 0 3px rgba(173, 70, 255, 0.08)' : 'none'};

  &:hover {
    border-color: #ad46ff;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(173, 70, 255, 0.12)' : '#f3e8ff'};
    color: #ad46ff;
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 768px) {
    height: 36px;
    padding: 0 12px;
    font-size: 13px;
    gap: 6px;
  }

  @media (max-width: 480px) {
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }

  svg {
    flex-shrink: 0;
  }
`

const ClearAllFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#5f6368')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#ffffff')};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  animation: slideIn 0.2s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#202124')};
    border-color: #ad46ff;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(173, 70, 255, 0.12)' : '#f3e8ff'};
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 768px) {
    height: 36px;
    padding: 0 12px;
    font-size: 12px;
    gap: 4px;
  }

  @media (max-width: 480px) {
    height: 34px;
    padding: 0 10px;
    font-size: 11px;
  }

  svg {
    flex-shrink: 0;
  }
`

const FilterResultBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 8px;
  border: 1px solid #86efac;
  animation: slideDown 0.3s ease;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const FilterResultText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #166534;

  svg {
    flex-shrink: 0;
    color: #16a34a;
  }
`

const FilterResultCount = styled.span`
  font-weight: 700;
  color: #15803d;
`
