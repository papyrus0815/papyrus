/**
 * 국가 리스트 검색·필터 행 — 검색 인풋 + 유형/대륙/정렬 셀렉트 + 초기화.
 */
import React from 'react'

import {
  COUNTRY_TYPE_LABELS,
  type CountryTypeFilter,
} from '@/entities/country/model/unified-types'

import type { SortBy } from '../country-list-state.context'
import * as S from './country-list.styles'

interface CountryListFiltersProps {
  query: string
  onQueryChange: (q: string) => void
  countryTypeFilter: CountryTypeFilter
  onCountryTypeFilterChange: (v: CountryTypeFilter) => void
  continentFilter: string
  onContinentFilterChange: (v: string) => void
  continents: { id: string; name: string }[]
  sortBy: SortBy
  onSortByChange: (v: SortBy) => void
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
  const isFiltered =
    !!query || !!continentFilter || countryTypeFilter !== 'all'

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
          type="text"
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
          value={continentFilter}
          onChange={(e) => onContinentFilterChange(e.target.value)}
          $active={!!continentFilter}
          aria-label="대륙"
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
    </S.FilterRow>
  )
}
