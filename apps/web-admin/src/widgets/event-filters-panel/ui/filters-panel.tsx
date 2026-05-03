/**
 * Event Filters Panel Widget
 * FSD: widgets/event-filters-panel/ui
 *
 * 검색 입력 / 활성 칩 / reset / *정렬·페이지 크기*는 페이지 또는 ViewSwitcherRow가
 * 담당. 이 위젯은 "데이터 좁히기"인 카테고리·국가·직책·세기 + 표시 토글만.
 */
import React from 'react'

import { FiCalendar, FiGlobe, FiGrid, FiLayers, FiUsers } from 'react-icons/fi'

import type { CenturyFilter } from '@/entities/event/model'
import { FILTER_ALL } from '@/features/event-list/lib'
import { MOCK_POSITION_TYPES } from '@/entities/event/model/mock-government-positions'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import * as Filter from '../../../pages/events/styles/filter.styles'

interface FiltersPanelProps {
  selectedCategory: typeof FILTER_ALL | string
  selectedCountry: typeof FILTER_ALL | string
  selectedPositionType: typeof FILTER_ALL | string
  selectedCentury: CenturyFilter
  showFlatView: boolean

  dbCategories: EventCategoryDto[]
  availableCenturies: number[]
  countries?: Array<{ id: string; name: string; flagEmoji?: string }>
  historicalCountries?: Array<{ id: string; name: string }>

  onShowCategoryModal: () => void
  onShowCountryModal: () => void
  onShowPositionTypeModal: () => void
  onToggleFlatView: () => void
  onSelectCentury: (century: CenturyFilter) => void
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  selectedCategory,
  selectedCountry,
  selectedPositionType,
  selectedCentury,
  showFlatView,
  dbCategories,
  availableCenturies,
  countries = [],
  historicalCountries = [],
  onShowCategoryModal,
  onShowCountryModal,
  onShowPositionTypeModal,
  onToggleFlatView,
  onSelectCentury,
}) => {
  const positionLabel =
    selectedPositionType === FILTER_ALL
      ? '직책'
      : MOCK_POSITION_TYPES.find((p) => p.value === selectedPositionType)
          ?.label ?? '직책'
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

        {/* 직책 — 역대 수반 직책 필터 */}
        <Filter.FilterTriggerButton
          type="button"
          onClick={onShowPositionTypeModal}
        >
          <FiUsers size={13} />
          <span>{positionLabel}</span>
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
    </Filter.FilterBlock>
  )
}
