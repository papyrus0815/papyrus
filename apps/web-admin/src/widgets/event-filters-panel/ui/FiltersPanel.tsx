/**
 * Event Filters Panel Widget
 * FSD: widgets/event-filters-panel/ui
 */

import React from 'react'
import { FiChevronRight, FiX } from 'react-icons/fi'

import { FILTER_ALL } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { CenturyFilter } from '@/entities/event/model'

import * as Filter from '../../../pages/events/styles/filter.styles'
import * as Skeleton from '../../../pages/events/styles/skeleton.styles'
import { MOCK_POSITION_TYPES } from '../../../pages/events/list/mock-government-positions'
import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import {
  formatCenturyLabel,
  formatCenturyRange,
  getCenturyFromDate,
} from '../../../pages/events/utils/events.utils'

interface FiltersPanelProps {
  // 상태
  keyword: string
  selectedCategory: typeof FILTER_ALL | string
  selectedCountry: typeof FILTER_ALL | string
  selectedPositionType: typeof FILTER_ALL | string
  selectedCentury: CenturyFilter
  showFlatView: boolean
  hasActiveFilters: boolean
  isLoading: boolean

  // 데이터
  dbCategories: EventCategoryDto[]
  availableCenturies: number[]
  events: HistoricalEvent[]

  // 핸들러
  onKeywordChange: (value: string) => void
  onShowCategoryModal: () => void
  onShowCountryModal: () => void
  onShowPositionTypeModal: () => void
  onToggleFlatView: () => void
  onResetFilters: () => void
  onSelectCentury: (century: CenturyFilter) => void
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  keyword,
  selectedCategory,
  selectedCountry,
  selectedPositionType,
  selectedCentury,
  showFlatView,
  hasActiveFilters,
  isLoading,
  dbCategories,
  availableCenturies,
  events,
  onKeywordChange,
  onShowCategoryModal,
  onShowCountryModal,
  onShowPositionTypeModal,
  onToggleFlatView,
  onResetFilters,
  onSelectCentury,
}) => {
  return (
    <Filter.FilterColumn>
      {/* 통합된 필터 블록 */}
      <Filter.FilterBlock>
        <Filter.FilterBlockLabel>필터</Filter.FilterBlockLabel>

        {/* 검색 */}
        <Filter.FilterSearchInput
          type="search"
          placeholder="사건명, 태그, 인물 검색"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />

        {/* 카테고리 */}
        <Filter.FilterTriggerButton
          type="button"
          onClick={onShowCategoryModal}
          style={{ marginTop: '10px' }}
        >
          <span>
            {selectedCategory === FILTER_ALL
              ? '전체 카테고리'
              : dbCategories.find((cat) => cat.id === selectedCategory)?.name ||
                '알 수 없음'}
          </span>
          <FiChevronRight size={14} />
        </Filter.FilterTriggerButton>

        {/* 국가 */}
        <Filter.FilterTriggerButton
          type="button"
          onClick={onShowCountryModal}
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
          onClick={onShowPositionTypeModal}
          style={{ marginTop: '6px' }}
        >
          <span>
            {selectedPositionType === FILTER_ALL
              ? '전체 직업'
              : MOCK_POSITION_TYPES.find(
                  (type) => type.value === selectedPositionType,
                )?.label || '전체 직업'}
          </span>
          <FiChevronRight size={14} />
        </Filter.FilterTriggerButton>

        {/* 계층 분리 토글 */}
        <Filter.FilterToggle style={{ marginTop: '12px' }}>
          <Filter.FilterToggleLabel>계층 구조 해제</Filter.FilterToggleLabel>
          <Filter.Switch
            type="button"
            $active={showFlatView}
            onClick={onToggleFlatView}
          >
            <Filter.SwitchThumb $active={showFlatView} />
          </Filter.Switch>
        </Filter.FilterToggle>
      </Filter.FilterBlock>

      {hasActiveFilters && (
        <Filter.FilterResetButton type="button" onClick={onResetFilters}>
          <FiX size={14} />
          초기화
        </Filter.FilterResetButton>
      )}

      <Filter.FilterDivider />

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
            onClick={() => onSelectCentury('all')}
          >
            <Filter.CenturyLabel>
              <strong>전체 시대</strong>
              <span>모든 연대</span>
            </Filter.CenturyLabel>
            <Filter.CenturyEventCount>{events.length}건</Filter.CenturyEventCount>
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
                onClick={() => onSelectCentury(century)}
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

