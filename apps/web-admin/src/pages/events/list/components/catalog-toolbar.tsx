/**
 * 사건 카탈로그 상단 도구바.
 *
 * 검색바 + FiltersPanel + 액션 버튼(북마크/내보내기/도움말/새 사건) + 활성 필터 칩.
 */
import React from 'react'

import {
  FiBookmark,
  FiDownload,
  FiHelpCircle,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'

import type { CenturyFilter, FilterChip } from '@/entities/event/model'
import type { SortOption } from '@/features/event-list/lib/constants'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { Badge } from '@/shared/ui/badge/badge'
import { FiltersPanel } from '@/widgets/event-filters-panel/ui/filters-panel'

import * as Layout from '../../styles/layout.styles'
import * as ToolbarStyles from '../../styles/list-toolbar.styles'
import { ICON_SIZE } from '../../styles/theme'

interface Props {
  // 검색
  searchInputRef: React.RefObject<HTMLInputElement | null>
  keywordInput: string
  setKeywordInput: (v: string) => void
  /** true이면 검색 디바운스 중 — 좌측 아이콘 자리에 spinner 노출 */
  isSearchPending?: boolean

  // 필터 상태 / 설정
  selectedCategory: string
  selectedCountry: string
  selectedPositionType: string
  selectedCentury: CenturyFilter
  showFlatView: boolean
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  dbCategories: EventCategoryDto[]
  availableCenturies: number[]
  countries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]

  setShowCategoryModal: (v: boolean) => void
  setShowCountryModal: (v: boolean) => void
  setShowPositionTypeModal: (v: boolean) => void
  toggleShowFlatView: () => void
  setSelectedCentury: (v: CenturyFilter) => void
  setSortBy: (v: SortOption) => void
  setSortDirection: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>

  // 북마크
  bookmarksOnly: boolean
  toggleBookmarksOnly: () => void
  bookmarksCount: number

  // 내보내기 / 도움말 / 새 사건
  onExportJson: () => void
  onOpenShortcutHelp: () => void
  onCreateEvent: () => void

  // 활성 필터 칩
  filterSummaryChips: FilterChip[]
  activeFilterCount: number
  handleResetAll: () => void
}

export const CatalogToolbar: React.FC<Props> = ({
  searchInputRef,
  keywordInput,
  setKeywordInput,
  isSearchPending = false,
  selectedCategory,
  selectedCountry,
  selectedPositionType,
  selectedCentury,
  showFlatView,
  sortBy,
  sortDirection,
  dbCategories,
  availableCenturies,
  countries,
  historicalCountries,
  setShowCategoryModal,
  setShowCountryModal,
  setShowPositionTypeModal,
  toggleShowFlatView,
  setSelectedCentury,
  setSortBy,
  setSortDirection,
  bookmarksOnly,
  toggleBookmarksOnly,
  bookmarksCount,
  onExportJson,
  onOpenShortcutHelp,
  onCreateEvent,
  filterSummaryChips,
  activeFilterCount,
  handleResetAll,
}) => {
  const trimmedKeyword = keywordInput.trim()
  const hasKeyword = trimmedKeyword.length > 0

  return (
    <Layout.TopFilterBar>
      <ToolbarStyles.PromSearch>
        {isSearchPending ? (
          <ToolbarStyles.PromSearchSpinner
            role="status"
            aria-label="검색 중"
          />
        ) : (
          <ToolbarStyles.PromSearchIcon aria-hidden="true">
            <FiSearch size={ICON_SIZE.md} />
          </ToolbarStyles.PromSearchIcon>
        )}
        <ToolbarStyles.PromSearchInput
          ref={searchInputRef}
          type="search"
          name="event-search"
          autoComplete="off"
          spellCheck={false}
          placeholder="사건명, 태그, 인물 검색"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          aria-label="사건 검색"
        />
        {hasKeyword ? (
          <ToolbarStyles.PromSearchClear
            type="button"
            aria-label="검색어 지우기"
            onClick={() => setKeywordInput('')}
          >
            <FiX size={ICON_SIZE.sm} aria-hidden="true" />
          </ToolbarStyles.PromSearchClear>
        ) : (
          <ToolbarStyles.PromSearchKbd aria-hidden="true" title="`/` 키로 검색창 포커스">
            /
          </ToolbarStyles.PromSearchKbd>
        )}
      </ToolbarStyles.PromSearch>

      <FiltersPanel
        selectedCategory={selectedCategory}
        selectedCountry={selectedCountry}
        selectedPositionType={selectedPositionType}
        selectedCentury={selectedCentury}
        showFlatView={showFlatView}
        sortBy={sortBy}
        sortDirection={sortDirection}
        dbCategories={dbCategories}
        availableCenturies={availableCenturies}
        countries={countries}
        historicalCountries={historicalCountries}
        onShowCategoryModal={() => setShowCategoryModal(true)}
        onShowCountryModal={() => setShowCountryModal(true)}
        onShowPositionTypeModal={() => setShowPositionTypeModal(true)}
        onToggleFlatView={toggleShowFlatView}
        onSelectCentury={setSelectedCentury}
        onSortChange={(newSortBy: string) => {
          setSortBy(newSortBy as SortOption)
          if (newSortBy === 'recent' || newSortBy === 'duration') {
            setSortDirection('desc')
          }
        }}
        onSortDirectionToggle={() => {
          setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        }}
      />

      <ToolbarStyles.ToolbarActions>
        <ToolbarStyles.ToolbarBtn
          type="button"
          $active={bookmarksOnly}
          title="북마크된 사건만 보기"
          aria-pressed={bookmarksOnly}
          onClick={toggleBookmarksOnly}
        >
          <FiBookmark size={ICON_SIZE.base} />
          <span>북마크</span>
          {bookmarksCount > 0 && (
            <Badge tone="primary">{bookmarksCount}</Badge>
          )}
        </ToolbarStyles.ToolbarBtn>
        <ToolbarStyles.ToolbarBtn
          type="button"
          title="현재 필터된 결과를 내보내기"
          onClick={onExportJson}
        >
          <FiDownload size={ICON_SIZE.base} />
          <span>JSON</span>
        </ToolbarStyles.ToolbarBtn>
        <ToolbarStyles.ToolbarBtn
          type="button"
          title="단축키 도움말 (?)"
          onClick={onOpenShortcutHelp}
        >
          <FiHelpCircle size={ICON_SIZE.base} />
        </ToolbarStyles.ToolbarBtn>
        <Layout.CreateEventButton onClick={onCreateEvent}>
          <FiPlus size={ICON_SIZE.md} />새 사건 등록
        </Layout.CreateEventButton>
      </ToolbarStyles.ToolbarActions>

      {/* 활성 필터 chips */}
      {(activeFilterCount > 0 || hasKeyword) && (
        <ToolbarStyles.ActiveFiltersBar>
          <ToolbarStyles.ActiveFilterCount>
            <FiSearch size={ICON_SIZE.xs} />
            <span>
              {activeFilterCount + (hasKeyword ? 1 : 0)}개 적용 중
            </span>
          </ToolbarStyles.ActiveFilterCount>
          {hasKeyword && (
            <ToolbarStyles.ActiveFilterChip
              type="button"
              onClick={() => setKeywordInput('')}
              aria-label={`검색어 "${trimmedKeyword}" 제거`}
            >
              <span>검색 · {trimmedKeyword}</span>
              <FiX size={ICON_SIZE.xs} aria-hidden="true" />
            </ToolbarStyles.ActiveFilterChip>
          )}
          {filterSummaryChips
            .filter((c) => c.key !== 'keyword')
            .map((chip) => (
              <ToolbarStyles.ActiveFilterChip
                key={chip.key}
                type="button"
                onClick={() => chip.onClear()}
                aria-label={`${chip.label} 필터 제거`}
              >
                <span>{chip.label}</span>
                <FiX size={ICON_SIZE.xs} aria-hidden="true" />
              </ToolbarStyles.ActiveFilterChip>
            ))}
          {bookmarksOnly && (
            <ToolbarStyles.ActiveFilterChip
              type="button"
              onClick={toggleBookmarksOnly}
              aria-label="북마크 필터 끄기"
            >
              <FiBookmark size={ICON_SIZE.xs} aria-hidden="true" />
              <span>북마크된 항목만</span>
              <FiX size={ICON_SIZE.xs} aria-hidden="true" />
            </ToolbarStyles.ActiveFilterChip>
          )}
          <ToolbarStyles.ActiveFilterClearAll
            type="button"
            onClick={handleResetAll}
          >
            전체 초기화
          </ToolbarStyles.ActiveFilterClearAll>
        </ToolbarStyles.ActiveFiltersBar>
      )}
    </Layout.TopFilterBar>
  )
}
