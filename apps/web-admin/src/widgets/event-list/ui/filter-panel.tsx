/**
 * 이벤트 목록 필터 패널
 * FSD: widgets/event-list/ui
 */
import React from 'react'

import { FiChevronRight, FiX } from 'react-icons/fi'

import type { EventCategoryDto } from '@/shared/api/event-categories'

import type { HistoricalEvent } from '@/pages/events/create/events.types'
import * as Filter from '@/pages/events/styles/filter.styles'
import * as Skeleton from '@/pages/events/styles/skeleton.styles'
import {
  formatCenturyLabel,
  formatCenturyRange,
  getCenturyFromDate,
} from '@/pages/events/utils/events.utils'

interface FilterPanelProps {
  // 검색
  keyword: string
  setKeyword: (value: string) => void

  // 카테고리
  selectedCategory: typeof FILTER_ALL | string
  dbCategories: EventCategoryDto[]
  onCategoryClick: () => void

  // 국가
  selectedCountry: typeof FILTER_ALL | string
  onCountryClick: () => void

  // 직업
  selectedPositionType: typeof FILTER_ALL | string
  positionTypes: Array<{ value: string; label: string }>
  onPositionTypeClick: () => void

  // 계층 뷰
  showFlatView: boolean
  setShowFlatView: (value: boolean) => void

  // 세기
  selectedCentury: typeof FILTER_ALL | number
  setSelectedCentury: (value: 'all' | number) => void
  availableCenturies: number[]
  events: HistoricalEvent[]

  // 필터 초기화
  hasActiveFilters: boolean
  onResetFilters: () => void

  // 로딩
  isLoading: boolean
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  keyword,
  setKeyword,
  selectedCategory,
  dbCategories,
  onCategoryClick,
  selectedCountry,
  onCountryClick,
  selectedPositionType,
  positionTypes,
  onPositionTypeClick,
  showFlatView,
  setShowFlatView,
  selectedCentury,
  setSelectedCentury,
  availableCenturies,
  events,
  hasActiveFilters,
  onResetFilters,
  isLoading,
}) => {
  const selectedCategoryName =
    selectedCategory === FILTER_ALL
      ? '전체 카테고리'
      : dbCategories.find((cat) => cat.id === selectedCategory)?.name ||
        '전체 카테고리'

  return (
    <Filter.FilterColumn>
      <Filter.FilterBlock>
        <Filter.FilterBlockLabel>필터</Filter.FilterBlockLabel>

        {/* 검색 */}
        <Filter.FilterSearchInput
          type="search"
          placeholder="사건명, 태그, 인물 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        {/* 카테고리 */}
        <Filter.FilterTriggerButton
          type="button"
          onClick={onCategoryClick}
          style={{ marginTop: '10px' }}
        >
          <span>{selectedCategoryName}</span>
          <FiChevronRight size={14} />
        </Filter.FilterTriggerButton>

        {/* 국가 */}
        <Filter.FilterTriggerButton
          type="button"
          onClick={onCountryClick}
          style={{ marginTop: '6px' }}
        >
          <span>
            {selectedCountry === FILTER_ALL ? '전체 국가' : selectedCountry}
          </span>
          <FiChevronRight size={14} />
        </Filter.FilterTriggerButton>

        {/* 직업 */}
        <Filter.FilterTriggerButton
          type="button"
          onClick={onPositionTypeClick}
          style={{ marginTop: '6px' }}
        >
          <span>
            {selectedPositionType === FILTER_ALL
              ? '전체 직업'
              : positionTypes.find(
                  (type) => type.value === selectedPositionType,
                )?.label || '전체 직업'}
          </span>
          <FiChevronRight size={14} />
        </Filter.FilterTriggerButton>

        {/* 계층 구조 해제 토글 */}
        <Filter.FilterToggle style={{ marginTop: '12px' }}>
          <Filter.FilterToggleLabel>계층 구조 해제</Filter.FilterToggleLabel>
          <Filter.Switch
            type="button"
            $active={showFlatView}
            onClick={() => setShowFlatView(!showFlatView)}
          >
            <Filter.SwitchThumb $active={showFlatView} />
          </Filter.Switch>
        </Filter.FilterToggle>
      </Filter.FilterBlock>

      {/* 필터 초기화 */}
      {hasActiveFilters && (
        <Filter.FilterResetButton type="button" onClick={onResetFilters}>
          <FiX size={14} />
          초기화
        </Filter.FilterResetButton>
      )}

      <Filter.FilterDivider />

      {/* 세기 선택 */}
      <Filter.CenturyHeader>
        <Filter.CenturyTitle>시대 선택</Filter.CenturyTitle>
        <Filter.CenturyCount>
          {isLoading ? '...' : `${availableCenturies.length}개`}
        </Filter.CenturyCount>
      </Filter.CenturyHeader>

      {isLoading ? (
        <Filter.CenturyList>
          {[...Array(6)].map((_, index) => (
            <Skeleton.SkeletonCenturyButton key={index}>
              <Skeleton.SkeletonCenturyLabel />
              <Skeleton.SkeletonCenturyCount />
            </Skeleton.SkeletonCenturyButton>
          ))}
        </Filter.CenturyList>
      ) : (
        <Filter.CenturyList>
          <Filter.CenturyButton
            $active={selectedCentury === FILTER_ALL}
            type="button"
            onClick={() => setSelectedCentury('all')}
          >
            <Filter.CenturyLabel>
              <strong>전체 시대</strong>
              <span>모든 연대</span>
            </Filter.CenturyLabel>
            <Filter.CenturyEventCount>
              {events.length}건
            </Filter.CenturyEventCount>
          </Filter.CenturyButton>
          {availableCenturies.map((century) => {
            const centuryEvents = events.filter((event) => {
              const startCentury = getCenturyFromDate(event.startDate)
              const endCentury = getCenturyFromDate(event.endDate)
              return startCentury === century || endCentury === century
            })
            return (
              <Filter.CenturyButton
                key={century}
                $active={selectedCentury === century}
                type="button"
                onClick={() => setSelectedCentury(century)}
              >
                <Filter.CenturyLabel>
                  <strong>{formatCenturyLabel(century)}</strong>
                  <span>{formatCenturyRange(century)}</span>
                </Filter.CenturyLabel>
                <Filter.CenturyEventCount>
                  {centuryEvents.length}건
                </Filter.CenturyEventCount>
              </Filter.CenturyButton>
            )
          })}
        </Filter.CenturyList>
      )}
    </Filter.FilterColumn>
  )
}
