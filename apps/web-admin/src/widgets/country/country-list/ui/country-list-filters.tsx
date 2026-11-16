/**
 * 국가 리스트 검색·필터 행 — 시대 세그먼트(전체/현대/과거) + 검색 인풋 + 대륙/정렬 셀렉트 + 초기화.
 *
 * 기존에는 상단 `TypeSegmentBar`(전체/현대/과거)와 하단 `<S.FilterSelect>`(전체/현대/과거)가
 * 중복 노출되어 좁은 사이드바를 비좁게 만들었다. 시대 구분은 세그먼트 바 하나로 일원화한다.
 */
import React from 'react'

import { FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  COUNTRY_TYPE_LABELS,
  type CountryTypeFilter,
} from '@/entities/country/model/unified-types'
import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerBackground,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'

import { type SortBy, useCountryListState } from '../country-list-state.context'
import * as S from './country-list.styles'

const DiscoveryRow = S.DiscoveryRow

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
  const {
    unifiedCountries,
    historicalCount,
    unlinkedHistoricalIds,
    isErrorHistorical,
  } = useCountryListState()
  const isFiltered = !!query || !!continentFilter || countryTypeFilter !== 'all'
  const continentDisabled = countryTypeFilter === 'historical'
  const showUnlinkedHint =
    countryTypeFilter === 'historical' && unlinkedHistoricalIds.size > 0

  return (
    <S.FilterRow>
      <TypeSegmentBar role="tablist" aria-label="국가 시대 구분">
        <TypeSegmentBtn
          type="button"
          role="tab"
          aria-selected={countryTypeFilter === 'all'}
          $active={countryTypeFilter === 'all'}
          onClick={() => onCountryTypeFilterChange('all')}
        >
          <span>{COUNTRY_TYPE_LABELS.all}</span>
          {unifiedCountries.length > 0 && (
            <TypeSegmentCount $active={countryTypeFilter === 'all'}>
              {unifiedCountries.length +
                (!isErrorHistorical ? historicalCount : 0)}
            </TypeSegmentCount>
          )}
        </TypeSegmentBtn>
        <TypeSegmentBtn
          type="button"
          role="tab"
          aria-selected={countryTypeFilter === 'modern'}
          $active={countryTypeFilter === 'modern'}
          onClick={() => onCountryTypeFilterChange('modern')}
        >
          <span>{COUNTRY_TYPE_LABELS.modern}</span>
          {unifiedCountries.length > 0 && (
            <TypeSegmentCount $active={countryTypeFilter === 'modern'}>
              {unifiedCountries.length}
            </TypeSegmentCount>
          )}
        </TypeSegmentBtn>
        <TypeSegmentBtn
          type="button"
          role="tab"
          aria-selected={countryTypeFilter === 'historical'}
          $active={countryTypeFilter === 'historical'}
          onClick={() => onCountryTypeFilterChange('historical')}
        >
          <span>{COUNTRY_TYPE_LABELS.historical}</span>
          {!isErrorHistorical && historicalCount > 0 && (
            <TypeSegmentCount $active={countryTypeFilter === 'historical'}>
              {historicalCount}
            </TypeSegmentCount>
          )}
        </TypeSegmentBtn>
      </TypeSegmentBar>

      <S.SearchWrapper>
        <S.SearchIcon>
          <FiSearch aria-hidden />
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
            <FiX size={13} aria-hidden />
          </S.ClearButton>
        )}
      </S.SearchWrapper>

      <S.FilterWrapper>
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

      {showUnlinkedHint && (
        <DiscoveryRow>
          <S.DiscoveryHint
            $tone="warn"
            title="현대 국가에 연결되지 않아 현대 행에서는 찾을 수 없는 국가 수"
          >
            연결 안 됨 {unlinkedHistoricalIds.size}
          </S.DiscoveryHint>
        </DiscoveryRow>
      )}
    </S.FilterRow>
  )
}

const TypeSegmentBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const TypeSegmentBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  height: 26px;
  padding: 0 6px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: ${({ theme, $active }) =>
    $active ? ledgerBackground(theme.mode) : 'transparent'};
  box-shadow: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0, 0, 0, 0.35)'
        : '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  cursor: pointer;
  white-space: nowrap;
  transition:
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

const TypeSegmentCount = styled.span<{ $active: boolean }>`
  font-size: 10.5px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`
