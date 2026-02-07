/**
 * Event Filters Panel Widget
 * FSD: widgets/event-filters-panel/ui
 */
import React from 'react'

import { FiChevronRight, FiX } from 'react-icons/fi'

import type { CenturyFilter } from '@/entities/event/model'
import { FILTER_ALL } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { MOCK_POSITION_TYPES } from '../../../pages/events/list/mock-government-positions'
import * as Filter from '../../../pages/events/styles/filter.styles'
import * as Skeleton from '../../../pages/events/styles/skeleton.styles'
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
  countries?: Array<{ id: string; name: string; flagEmoji?: string }>
  historicalCountries?: Array<{ id: string; name: string }>

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
  countries = [],
  historicalCountries = [],
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
      {/* 검색 */}
      <Filter.FilterSearchInput
        type="search"
        placeholder="사건명, 태그, 인물 검색"
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
      />

      <Filter.FilterBlock>
        {/* 카테고리 */}
        <Filter.FilterTriggerButton type="button" onClick={onShowCategoryModal}>
          <span>
            {selectedCategory === FILTER_ALL
              ? '전체 카테고리'
              : dbCategories.find((cat) => cat.id === selectedCategory)?.name ||
                '알 수 없음'}
          </span>
          <FiChevronRight size={14} />
        </Filter.FilterTriggerButton>

        {/* 국가 */}
        <Filter.FilterTriggerButton type="button" onClick={onShowCountryModal}>
          <span>
            {selectedCountry === FILTER_ALL
              ? '전체 국가'
              : countries.find((c) => c.id === selectedCountry)?.name ||
                historicalCountries.find((c) => c.id === selectedCountry)
                  ?.name ||
                '전체 국가'}
          </span>
          <FiChevronRight size={14} />
        </Filter.FilterTriggerButton>

        {/* 세기 선택 */}
        <Filter.CenturySelect
          value={selectedCentury === FILTER_ALL ? 'all' : selectedCentury}
          onChange={(e) => {
            const value = e.target.value
            onSelectCentury(value === 'all' ? FILTER_ALL : parseInt(value, 10))
          }}
        >
          <option value="all">전체 시대</option>
          {availableCenturies.map((century) => (
            <option key={century} value={century}>
              {century}세기
            </option>
          ))}
        </Filter.CenturySelect>

        {/* 계층 구조 토글 */}
        <Filter.FilterToggle>
          <Filter.FilterToggleLabel>계층 구조</Filter.FilterToggleLabel>
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
    </Filter.FilterColumn>
  )
}
