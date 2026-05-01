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
    <Filter.FilterBlock>
      {/* 필터 트리거 5개 — 한 외곽 border로 묶음 (내부 hairline divider) */}
      <Filter.FilterGroup>
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

        {/* 세기 — icon은 select prefix 자리에 padding으로 통합 */}
        <Filter.CenturySelectWrap>
          <FiCalendar size={13} aria-hidden="true" />
          <Filter.CenturySelect
            value={selectedCentury === FILTER_ALL ? 'all' : selectedCentury}
            onChange={(e) => {
              const value = e.target.value
              onSelectCentury(
                value === 'all' ? FILTER_ALL : parseInt(value, 10),
              )
            }}
            aria-label="세기 선택"
          >
            <option value="all">전체</option>
            {availableCenturies.map((century) => (
              <option key={century} value={century}>
                {century}C
              </option>
            ))}
          </Filter.CenturySelect>
        </Filter.CenturySelectWrap>

        {/* 정렬 by */}
        <Filter.SortSelect
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="정렬 기준"
        >
          <option value="recent">최근순</option>
          <option value="duration">기간순</option>
        </Filter.SortSelect>

        {/* 정렬 방향 — 단일 아이콘을 transform rotate로 부드럽게 토글 (위치 흔들림 방지) */}
        <Filter.SortButton
          type="button"
          onClick={onSortDirectionToggle}
          aria-label={sortDirection === 'asc' ? '오름차순' : '내림차순'}
          $direction={sortDirection}
        >
          <FiArrowDown size={14} aria-hidden="true" />
        </Filter.SortButton>
      </Filter.FilterGroup>

      {/* 토글들 — segmented group 외부, inline group */}
      <Filter.FilterToggle onClick={onToggleFlatView}>
        <FiLayers size={12} style={{ color: '#64748b' }} aria-hidden="true" />
        <Filter.FilterToggleLabel>계층</Filter.FilterToggleLabel>
        <Filter.Switch
          type="button"
          $active={!showFlatView}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFlatView()
          }}
        >
          <Filter.SwitchThumb $active={!showFlatView} />
        </Filter.Switch>
      </Filter.FilterToggle>

      {onToggleShowGlobalHeadsOfState && (
        <Filter.FilterToggle
          onClick={onToggleShowGlobalHeadsOfState}
          title="교황 등 전역 수반(모든 국가에 영향을 미친 인물)을 역대 수반 목록에 표시합니다. 끄면 숨깁니다."
        >
          <FiUsers size={12} style={{ color: '#64748b' }} aria-hidden="true" />
          <Filter.FilterToggleLabel>교황 등 전역</Filter.FilterToggleLabel>
          <Filter.Switch
            type="button"
            $active={showGlobalHeadsOfState}
            onClick={(e) => {
              e.stopPropagation()
              onToggleShowGlobalHeadsOfState()
            }}
          >
            <Filter.SwitchThumb $active={showGlobalHeadsOfState} />
          </Filter.Switch>
        </Filter.FilterToggle>
      )}
    </Filter.FilterBlock>
  )
}
