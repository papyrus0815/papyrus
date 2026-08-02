/**
 * 국가 리스트 검색·필터 행 — 검색 인풋 + 유형/대륙/정렬 셀렉트 + 초기화.
 *
 * '전체'/'현대' 모드에서는 역사국가가 목록에 뜨지 않으므로(F37) 필터 행 아래에
 * '과거 국가 N' 카운트 배지를 두어 존재를 알리고 한 번의 클릭으로 '과거' 필터로 넘긴다.
 * 카운트·미연결 수는 프롭 대신 리스트 상태 Context에서 직접 읽는다
 * (배지가 필터 행의 부속이라 상위로 프롭을 뚫는 값이 없음).
 */
import React from 'react'

import styled from 'styled-components'

import {
  COUNTRY_TYPE_LABELS,
  type CountryTypeFilter,
} from '@/entities/country/model/unified-types'

import {
  useCountryListState,
  type SortBy,
} from '../country-list-state.context'
import * as S from './country-list.styles'

const DiscoveryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const HistoricalCountBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const BadgeCount = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const UnlinkedHint = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(245,158,11,0.32)' : '#fde68a'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.14)' : '#fef3c7'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#92400e')};
`

interface CountryListFiltersProps {
  query: string
  onQueryChange: (query: string) => void
  countryTypeFilter: CountryTypeFilter
  onCountryTypeFilterChange: (value: CountryTypeFilter) => void
  continentFilter: string
  onContinentFilterChange: (value: string) => void
  continents: { id: string; name: string }[]
  sortBy: SortBy
  onSortByChange: (value: SortBy) => void
  onClearFilters: () => void
  /** 검색 인풋에서 ↓ 키 → 첫 행으로 포커스 이동 */
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function CountryListFilters({
  query,
  onQueryChange,
  countryTypeFilter,
  onCountryTypeFilterChange,
  continentFilter,
  onContinentFilterChange,
  continents,
  sortBy,
  onSortByChange,
  onClearFilters,
  onSearchKeyDown,
}: CountryListFiltersProps) {
  const { historicalCount, unlinkedHistoricalIds, isErrorHistorical } =
    useCountryListState()
  const isFiltered =
    !!query || !!continentFilter || countryTypeFilter !== 'all'
  // 대륙 필터는 역사 국가에 continentId가 없어 '과거' 유형에선 무의미하므로 비활성(F3).
  const continentDisabled = countryTypeFilter === 'historical'
  // 검색 중에는 역사국가가 이미 결과에 합류하므로 유도 배지를 감춘다.
  // 역사 목록 로딩 실패 시엔 historicalCount가 과소 집계이므로 잘못된 수를 노출하지 않는다(G1-2).
  const showHistoricalBadge =
    !query &&
    countryTypeFilter !== 'historical' &&
    !isErrorHistorical &&
    historicalCount > 0
  const showUnlinkedHint =
    countryTypeFilter === 'historical' && unlinkedHistoricalIds.size > 0

  return (
    <S.FilterRow>
      <S.SearchWrapper>
        <S.SearchIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </S.SearchIcon>
        <S.SearchInput
          type="search"
          aria-label="국가 검색"
          placeholder="국가 검색..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
        />
        {query && (
          <S.ClearButton onClick={() => onQueryChange('')} aria-label="지우기">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </S.ClearButton>
        )}
      </S.SearchWrapper>

      <S.FilterWrapper>

        <S.FilterSelect
          value={countryTypeFilter}
          onChange={(e) =>
            onCountryTypeFilterChange(e.target.value as CountryTypeFilter)
          }
          $active={countryTypeFilter !== 'all'}
          aria-label="국가 유형"
        >
          <option value="all">{COUNTRY_TYPE_LABELS.all}</option>
          <option value="modern">{COUNTRY_TYPE_LABELS.modern}</option>
          <option value="historical">{COUNTRY_TYPE_LABELS.historical}</option>
        </S.FilterSelect>

        <S.FilterSelect
          value={continentDisabled ? '' : continentFilter}
          onChange={(e) => onContinentFilterChange(e.target.value)}
          $active={!continentDisabled && !!continentFilter}
          disabled={continentDisabled}
          aria-label="대륙"
          title={
            continentDisabled
              ? '과거 국가는 대륙으로 분류되지 않아요'
              : undefined
          }
        >
          <option value="">대륙 전체</option>
          {continents.map((continent) => (
            <option key={continent.id} value={continent.id}>
              {continent.name}
            </option>
          ))}
        </S.FilterSelect>

        <S.FilterSelect
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          aria-label="정렬"
        >
          <option value="name">이름순</option>
          <option value="population">인구순</option>
          <option value="area">면적순</option>
        </S.FilterSelect>

        {isFiltered && (
          <S.ClearAllFiltersButton onClick={onClearFilters}>
            초기화
          </S.ClearAllFiltersButton>
        )}
      </S.FilterWrapper>

      {(showHistoricalBadge || showUnlinkedHint) && (
        <DiscoveryRow>
          {showHistoricalBadge && (
            <HistoricalCountBadge
              type="button"
              onClick={() => onCountryTypeFilterChange('historical')}
              title="과거 국가 목록으로 전환"
            >
              과거 국가 <BadgeCount>{historicalCount}</BadgeCount>개 보기
            </HistoricalCountBadge>
          )}
          {showUnlinkedHint && (
            <UnlinkedHint title="현대 국가에 연결되지 않아 현대 행에서는 찾을 수 없는 국가 수">
              연결 안 됨 {unlinkedHistoricalIds.size}
            </UnlinkedHint>
          )}
        </DiscoveryRow>
      )}
    </S.FilterRow>
  )
}
