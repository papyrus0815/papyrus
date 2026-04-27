/**
 * Event Filters Panel Widget
 * FSD: widgets/event-filters-panel/ui
 *
 * 검색 입력과 활성 필터 chip / reset 버튼은 페이지 레벨에서 다루므로
 * 이 위젯은 카테고리·국가·세기·정렬·토글 등 "필터 트리거"에만 집중한다.
 */
import React from 'react'

import {
  FiArrowDown,
  FiArrowUp,
  FiCalendar,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiUsers,
} from 'react-icons/fi'

import type { CenturyFilter } from '@/entities/event/model'
import { FILTER_ALL } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import * as Filter from '../../../pages/events/styles/filter.styles'

interface FiltersPanelProps {
  selectedCategory: typeof FILTER_ALL | string
  selectedCountry: typeof FILTER_ALL | string
  selectedPositionType: typeof FILTER_ALL | string
  selectedCentury: CenturyFilter
  showFlatView: boolean
  /** 교황 등 전역 수반 표시 (모든 국가에서 다 뜨는 직책) */
  showGlobalHeadsOfState?: boolean
  sortBy: string
  sortDirection: 'asc' | 'desc'

  dbCategories: EventCategoryDto[]
  availableCenturies: number[]
  countries?: Array<{ id: string; name: string; flagEmoji?: string }>
  historicalCountries?: Array<{ id: string; name: string }>

  onShowCategoryModal: () => void
  onShowCountryModal: () => void
  onShowPositionTypeModal: () => void
  onToggleFlatView: () => void
  onToggleShowGlobalHeadsOfState?: () => void
  onSelectCentury: (century: CenturyFilter) => void
  onSortChange: (sortBy: string) => void
  onSortDirectionToggle: () => void
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  selectedCategory,
  selectedCountry,
  selectedCentury,
  showFlatView,
  showGlobalHeadsOfState = true,
  sortBy,
  sortDirection,
  dbCategories,
  availableCenturies,
  countries = [],
  historicalCountries = [],
  onShowCategoryModal,
  onShowCountryModal,
  onToggleFlatView,
  onToggleShowGlobalHeadsOfState,
  onSelectCentury,
  onSortChange,
  onSortDirectionToggle,
}) => {
  return (
    <Filter.FilterColumn>
      <Filter.FilterBlock>
        {/* 카테고리 */}
        <Filter.FilterTriggerButton type="button" onClick={onShowCategoryModal}>
          <FiGrid size={13} />
          <span>
            {selectedCategory === FILTER_ALL
              ? '카테고리'
              : dbCategories.find((cat) => cat.id === selectedCategory)?.name ||
                '알 수 없음'}
          </span>
        </Filter.FilterTriggerButton>

        {/* 국가 */}
        <Filter.FilterTriggerButton type="button" onClick={onShowCountryModal}>
          <FiGlobe size={13} />
          <span>
            {selectedCountry === FILTER_ALL
              ? '국가'
              : countries.find((c) => c.id === selectedCountry)?.name ||
                historicalCountries.find((c) => c.id === selectedCountry)
                  ?.name ||
                '국가'}
          </span>
        </Filter.FilterTriggerButton>

        {/* 세기 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiCalendar size={13} style={{ color: '#64748b', flexShrink: 0 }} />
          <Filter.CenturySelect
            value={selectedCentury === FILTER_ALL ? 'all' : selectedCentury}
            onChange={(e) => {
              const value = e.target.value
              onSelectCentury(
                value === 'all' ? FILTER_ALL : parseInt(value, 10),
              )
            }}
          >
            <option value="all">전체</option>
            {availableCenturies.map((century) => (
              <option key={century} value={century}>
                {century}C
              </option>
            ))}
          </Filter.CenturySelect>
        </div>

        {/* 정렬 */}
        <Filter.SortSelect
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="recent">최근순</option>
          <option value="duration">기간순</option>
        </Filter.SortSelect>

        <Filter.SortButton
          type="button"
          onClick={onSortDirectionToggle}
        >
          {sortDirection === 'asc' ? (
            <FiArrowUp size={14} />
          ) : (
            <FiArrowDown size={14} />
          )}
        </Filter.SortButton>

        {/* 계층 구조 토글 */}
        <Filter.FilterToggle>
          <FiLayers size={12} style={{ color: '#64748b' }} />
          <Filter.FilterToggleLabel>계층</Filter.FilterToggleLabel>
          <Filter.Switch
            type="button"
            $active={!showFlatView}
            onClick={onToggleFlatView}
          >
            <Filter.SwitchThumb $active={!showFlatView} />
          </Filter.Switch>
        </Filter.FilterToggle>

        {/* 교황 등 전역 수반 표시 토글 */}
        {onToggleShowGlobalHeadsOfState && (
          <Filter.FilterToggle
            title="교황 등 전역 수반(모든 국가에 영향을 미친 인물)을 역대 수반 목록에 표시합니다. 끄면 숨깁니다."
          >
            <FiUsers size={12} style={{ color: '#64748b' }} />
            <Filter.FilterToggleLabel>교황 등 전역</Filter.FilterToggleLabel>
            <Filter.Switch
              type="button"
              $active={showGlobalHeadsOfState}
              onClick={onToggleShowGlobalHeadsOfState}
            >
              <Filter.SwitchThumb $active={showGlobalHeadsOfState} />
            </Filter.Switch>
          </Filter.FilterToggle>
        )}
      </Filter.FilterBlock>
    </Filter.FilterColumn>
  )
}
