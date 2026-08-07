/**
 * 사건 카탈로그 상단 도구바.
 *
 * 검색바 + FiltersPanel(필터 트리거만) + 액션 버튼 + 활성 칩.
 * 정렬·페이지 크기는 *표시 옵션*이라 toolbar가 아니라 ViewSwitcherRow가 담당.
 */
import React from 'react'

import {
  FiBookmark,
  FiChevronsDown,
  FiChevronsUp,
  FiDownload,
  FiHelpCircle,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'

import type { CenturyFilter, FilterChip } from '@/entities/event/model'
import type { FilterOptionCounts } from '@/features/event-filters/model/option-facets'
import type { FilterReferenceState } from '@/features/event-filters/model/reference-label'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { Badge } from '@/shared/ui/badge/badge'
import { FiltersPanel } from '@/widgets/event-filters-panel/ui/filters-panel'

import type { HistoricalEvent } from '../../create/events.types'
import * as Layout from '../../styles/layout.styles'
import * as ToolbarStyles from '../../styles/list-toolbar.styles'
import { ICON_SIZE } from '../../styles/theme'
import { RecentEventsDropdown } from './recent-events-dropdown'

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
  selectedContinent: string
  selectedCentury: CenturyFilter
  showFlatView: boolean
  dbCategories: EventCategoryDto[]
  availableCenturies: number[]
  countries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]
  continents: ContinentResponseDto[]
  /** 참조 데이터 로드 상태 — 트리거 라벨 폴백을 원인별로 가른다(검토 GAP-5) */
  referenceState?: FilterReferenceState
  onRetryReference?: (axis: keyof FilterReferenceState) => void
  /**
   * 로드된 사건 기준 축별 건수(검토 IA-13). 옵션 우측 숫자이자 국가 축의 정렬 키다 —
   * 이 값이 있어야 옵션 목록이 참조 DB 순서가 아니라 '내 데이터'를 반영한다.
   */
  optionCounts?: FilterOptionCounts

  setShowCategoryModal: (v: boolean) => void
  setShowCountryModal: (v: boolean) => void
  toggleShowFlatView: () => void
  setSelectedCentury: (v: CenturyFilter) => void

  /** 인라인 팝오버에서 직접 선택 — FILTER_ALL 또는 id */
  onSelectCategory?: (id: string) => void
  onSelectCountry?: (id: string) => void
  onSelectContinent?: (id: string) => void

  // 북마크
  bookmarksOnly: boolean
  toggleBookmarksOnly: () => void
  bookmarksCount: number
  /**
   * 하위 사건 일괄 접기/펼치기 — 자식 보유 사건은 로드될 때마다 전부 자동 전개되는데
   * 되돌릴 일괄 수단이 목록에 없었다('계층' 토글은 평면 모드라 오히려 행이 늘어난다).
   * 정리하려면 부모마다 20px 셰브론을 30여 번 눌러야 했다(검토 CR-5).
   */
  allChildrenCollapsed: boolean
  onCollapseAllChildren: () => void
  onExpandAllChildren: () => void

  // 최근 본 (toolbar dropdown — Discovery Hub 제거 후 진입점)
  recentEventIds: string[]
  events: HistoricalEvent[]
  onSelectEvent: (id: string) => void

  // 내보내기 / 도움말 / 새 사건
  onExportJson: () => void
  onOpenShortcutHelp: () => void
  onCreateEvent: () => void

  /**
   * 활성 필터 칩 — **여기 담긴 것이 곧 렌더되는 것**이다(검토 IA-17).
   * 페이지가 이미 검색어 칩을 걷어내고 타임라인 축 칩을 합쳐서 넘긴다.
   * 툴바가 여기서 다시 걸러내면 'N개 적용 중'과 칩 수가 어긋난다.
   */
  filterSummaryChips: FilterChip[]
  handleResetAll: () => void
}

export const CatalogToolbar: React.FC<Props> = ({
  searchInputRef,
  keywordInput,
  setKeywordInput,
  isSearchPending = false,
  selectedCategory,
  selectedCountry,
  selectedContinent,
  selectedCentury,
  showFlatView,
  dbCategories,
  availableCenturies,
  countries,
  historicalCountries,
  continents,
  referenceState,
  onRetryReference,
  optionCounts,
  setShowCategoryModal,
  setShowCountryModal,
  toggleShowFlatView,
  setSelectedCentury,
  onSelectCategory,
  onSelectCountry,
  onSelectContinent,
  bookmarksOnly,
  toggleBookmarksOnly,
  bookmarksCount,
  allChildrenCollapsed,
  onCollapseAllChildren,
  onExpandAllChildren,
  recentEventIds,
  events,
  onSelectEvent,
  onExportJson,
  onOpenShortcutHelp,
  onCreateEvent,
  filterSummaryChips,
  handleResetAll,
}) => {
  const trimmedKeyword = keywordInput.trim()
  const hasKeyword = trimmedKeyword.length > 0
  /**
   * 실제로 그려지는 칩 수 — 'N개 적용 중'과 바의 렌더 조건이 **같은 값**을 읽는다(검토 IA-17).
   * 페이지가 세어 내려주던 `activeFilterCount` prop은 제거했다 — 두 곳이 각자 세는 한
   * 언젠가 다시 갈리기 때문이다. 무엇을 칩으로 낼지는 페이지가, 세는 것은 여기가 한다.
   */
  const chipCount = filterSummaryChips.length + (bookmarksOnly ? 1 : 0)

  return (
    <>
      {/* 툴바 한 줄 — 넓은 폭에서 [검색][필터][액션] 3존 격자, 좁은 폭에서 wrap flex.
          자식이 정확히 **3개**여야 격자 자동 배치가 의도대로 선다(활성 필터 칩은 아래
          전용 행으로 분리했다). 4번째 자식을 여기 넣지 말 것. */}
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
            // 검색 대상 필드와 문구를 일치시킨다 — location(자유 텍스트 지명)이
            // 술어에 합류했다(검토 GAP-11/DATA-16).
            placeholder="제목·설명·키워드·장소 검색"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            aria-label="사건 검색 — 제목·설명·키워드·장소"
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
            <ToolbarStyles.PromSearchKbd
              aria-hidden="true"
              title="`/` 키로 검색창 포커스"
            >
              /
            </ToolbarStyles.PromSearchKbd>
          )}
        </ToolbarStyles.PromSearch>

        <FiltersPanel
          selectedCategory={selectedCategory}
          selectedCountry={selectedCountry}
          selectedContinent={selectedContinent}
          selectedCentury={selectedCentury}
          showFlatView={showFlatView}
          dbCategories={dbCategories}
          availableCenturies={availableCenturies}
          countries={countries}
          historicalCountries={historicalCountries}
          continents={continents}
          referenceState={referenceState}
          onRetryReference={onRetryReference}
          optionCounts={optionCounts}
          onSelectCategory={onSelectCategory}
          onSelectCountry={onSelectCountry}
          onSelectContinent={onSelectContinent}
          onShowCategoryModal={() => setShowCategoryModal(true)}
          onShowCountryModal={() => setShowCountryModal(true)}
          onToggleFlatView={toggleShowFlatView}
          onSelectCentury={setSelectedCentury}
        />

        <ToolbarStyles.ToolbarActions>
          <RecentEventsDropdown
            recentEventIds={recentEventIds}
            events={events}
            onSelectEvent={onSelectEvent}
          />
          {/**
           * 하위 일괄 접기/펼치기 — **평면 보기에서는 비활성**(검토 GAP-6).
           *
           * 평면 모드는 모든 자손을 depth 0으로 이미 나열하므로 접을 것이 없다. 그런데
           * 버튼은 활성인 채로 눌리면 `expandedEventIds`만 비워 두었다가, 사용자가 나중에
           * 계층을 다시 켜는 순간 **그때 접힘이 터졌다**(원인과 결과가 분리된 지연 폭발).
           * 행 셰브론이 `canExpand`로 같은 판정을 이미 하고 있으므로 규약을 맞춘다.
           */}
          <ToolbarStyles.ToolbarBtn
            type="button"
            $active={!showFlatView && allChildrenCollapsed}
            disabled={showFlatView}
            title={
              showFlatView
                ? '평면 보기에서는 하위 사건이 이미 모두 펼쳐져 있어 접을 것이 없습니다'
                : allChildrenCollapsed
                  ? '하위 사건 모두 펼치기'
                  : '하위 사건 모두 접기 — 최상위 사건만 훑을 때'
            }
            aria-pressed={!showFlatView && allChildrenCollapsed}
            onClick={
              allChildrenCollapsed ? onExpandAllChildren : onCollapseAllChildren
            }
          >
            {allChildrenCollapsed ? (
              <FiChevronsDown size={ICON_SIZE.base} aria-hidden="true" />
            ) : (
              <FiChevronsUp size={ICON_SIZE.base} aria-hidden="true" />
            )}
            <span>{allChildrenCollapsed ? '하위 펼치기' : '하위 접기'}</span>
          </ToolbarStyles.ToolbarBtn>
          <ToolbarStyles.ToolbarBtn
            type="button"
            $active={bookmarksOnly}
            /* 북마크 실체는 브라우저 로컬이다 — 링크로 전달되지 않는다는 사실을
             토글 지점에서 한 번 밝힌다(검토 URL-11). */
            title="북마크된 사건만 보기 — 북마크는 이 브라우저에만 저장되며 공유 링크로는 전달되지 않습니다"
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
            $hideOnMobile
          >
            <FiDownload size={ICON_SIZE.base} />
            <span>JSON</span>
          </ToolbarStyles.ToolbarBtn>
          <ToolbarStyles.ToolbarBtn
            type="button"
            title="단축키 도움말 (?)"
            aria-label="단축키 도움말"
            onClick={onOpenShortcutHelp}
          >
            <FiHelpCircle size={ICON_SIZE.base} aria-hidden="true" />
          </ToolbarStyles.ToolbarBtn>
          <Layout.CreateEventButton onClick={onCreateEvent}>
            <FiPlus size={ICON_SIZE.md} />새 사건 등록
          </Layout.CreateEventButton>
        </ToolbarStyles.ToolbarActions>
      </Layout.TopFilterBar>

      {/**
       * 활성 필터 chips — 검색어는 이미 입력창에 표시되므로 칩으로 중복 노출하지 않는다.
       *
       * ⚠️ 바의 렌더 조건은 **렌더될 칩 수**다(검토 IA-17). 예전엔 검색어를 포함한
       * `activeFilterCount`로 열어서, 검색어만 있으면 '1개 적용 중'만 적힌 **칩 0개짜리
       * 바**가 떴다. 제외 규칙은 페이지(barFilterChips)에 있고 여기서는 세지 않는다.
       *
       * 툴바 **바깥 전용 행**이다 — 인라인이던 시절엔 칩 하나가 생겨도 툴바가 한 줄
       * 늘었다 줄었다 해서 높이가 폭·필터 상태에 종속됐다.
       */}
      {chipCount > 0 && (
        <Layout.ActiveFiltersRow>
          <ToolbarStyles.ActiveFiltersBar>
            <ToolbarStyles.ActiveFilterCount>
              <FiSearch size={ICON_SIZE.xs} />
              <span>{chipCount}개 적용 중</span>
            </ToolbarStyles.ActiveFilterCount>
            {filterSummaryChips.map((chip) => (
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
          </ToolbarStyles.ActiveFiltersBar>
          {/**
           * 칩 바 **바깥** 형제 — 신축이 칩 바에 있어야 이 버튼이 행 우측 끝에 앵커된다.
           * 칩 하나를 지우려다 '전체 초기화'를 누르는 오조작을 앞의 hairline이 막는다.
           *
           * 범위를 라벨이 아니라 툴팁에 밝힌다(검토 URL-7) — 버튼 문구를 길게 쓰면
           * 칩 줄이 밀린다. 정렬·보기·페이지 크기는 '표시 옵션'이라 제외이고,
           * 행을 감추는 것(접힘)은 포함이라는 규약을 그대로 적는다.
           */}
          <ToolbarStyles.ActiveFilterClearAll
            type="button"
            title="필터·검색어·북마크·타임라인 축과 접어 둔 연도·세기·하위 사건을 모두 해제합니다 (정렬·보기·페이지 크기는 유지)"
            onClick={handleResetAll}
          >
            전체 초기화
          </ToolbarStyles.ActiveFilterClearAll>
        </Layout.ActiveFiltersRow>
      )}
    </>
  )
}
