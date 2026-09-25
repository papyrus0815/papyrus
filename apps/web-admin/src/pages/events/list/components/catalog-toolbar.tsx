/**
 * 사건 카탈로그 상단 도구바.
 *
 * 검색바 + FiltersPanel(필터 트리거만) + 액션 버튼 + 활성 칩.
 * 정렬·밀도·개수 같은 *표시 옵션*은 결과를 좁히지 않으므로 필터와 섞지 않고
 * 액션 트랙 끝의 ⋯ 메뉴(`CatalogViewUtilities`)에 모아 둔다. 자주 쓰는 정렬만은
 * 목록의 **열 머리글 클릭**이라는 두 번째 진입점을 따로 갖는다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import styled from 'styled-components'

import { FaCrown } from 'react-icons/fa'
import {
  FiBookmark,
  FiChevronsDown,
  FiChevronsUp,
  FiCheck,
  FiDownload,
  FiLayers,
  FiFlag,
  FiSliders,
  FiArrowDown,
  FiHelpCircle,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'

import type { CenturyFilter, FilterChip } from '@/entities/event/model'
/* 값(런타임) import는 배럴이 아니라 `model/types`에서 — 배럴은 `useEvents → api.service`를
   끌고 오고 그 안의 `import.meta`가 ts-jest(CJS)를 깨뜨려 이 파일을 쓰는 spec이 통째로
   실행 불가가 된다(파서 파일 상단의 같은 주의와 한 쌍). */
import { EVENTS_PAGE_SIZE_ALL } from '@/entities/event/model/types'
import {
  HIDEABLE_COLUMNS,
  LIST_COLUMNS,
  type ListColumnKey,
  type SortOption,
} from '@/features/event-list/lib'
import { LIST_STEPS, type ListDensity } from '@/pages/events/styles/theme'
import type { FilterOptionCounts } from '@/features/event-filters/model/option-facets'
import type { FilterReferenceState } from '@/features/event-filters/model/reference-label'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useAnchoredPosition } from '@/shared/hooks/use-anchored-position.hook'
import { useOverlayEscape } from '@/shared/hooks/use-overlay-escape.hook'
import { Badge } from '@/shared/ui/badge/badge'
import { Z_INDEX } from '@/shared/styles/z-index'
import { FiltersPanel } from '@/widgets/event-filters-panel/ui/filters-panel'

import { useFocusTrap } from '../hooks/use-focus-trap'

import * as Layout from '../../styles/layout.styles'
import * as ToolbarStyles from '../../styles/list-toolbar.styles'
import { BRAND, ICON_SIZE, MOTION, SHADOW } from '../../styles/theme'

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
   * 군주 재위 표시 — 고른 군주의 재위 기간과 겹치는 사건을 목록에서 따로 표시한다.
   * 필터가 아니므로 활성 필터 칩·개수에는 포함하지 않는다.
   */
  reignActive: boolean
  /** 표시 중인 군주 이름 — 로딩 중이면 null */
  reignPersonName: string | null
  /** 재위 기간과 겹치는 표시 행 수 */
  reignMatchedCount: number
  reignLoading: boolean
  onOpenReignPicker: () => void
  onClearReign: () => void
  /**
   * 최상위(앵커) 사건 축 — 자손이 있는 루트만 남긴다.
   * 생존 루트의 88%가 자식 0인 단독 사건이라, 이 칩이 없으면 앵커가 파묻힌다
   * (docs/event-root-designation-review.md).
   */
  anchorsOnly: boolean
  toggleAnchorsOnly: () => void
  /** 로드된 최상위 중 앵커 수 — 배지 모수 */
  anchorsCount: number
  /**
   * 하위 사건 일괄 접기/펼치기 — 자식 보유 사건은 로드될 때마다 전부 자동 전개되는데
   * 되돌릴 일괄 수단이 목록에 없었다('계층' 토글은 평면 모드라 오히려 행이 늘어난다).
   * 정리하려면 부모마다 20px 셰브론을 30여 번 눌러야 했다(검토 CR-5).
   */
  childrenCollapsed: boolean
  /** 접어 둔 연·세기 밴드 수 — 0이 아니면 칩 행이 열리고 해제 칩이 뜬다 */
  collapsedBandCount: number
  /** 접어 둔 밴드만 전부 펼친다(필터는 유지) */
  onExpandAllBands: () => void
  /** 접었다 펼 하위 사건이 **하나라도** 있는가 — 없으면 버튼 자체가 할 일이 없다 */
  hasCollapsibleChildren: boolean
  onCollapseAllChildren: () => void
  onExpandAllChildren: () => void

  // 내보내기 / 도움말 / 새 사건
  onExportJson: () => void
  onOpenShortcutHelp: () => void
  /**
   * 표시 제어 클러스터 — **≤900px에서만** 여기 선다. 넓은 폭에서는 보기 행이 소유한다.
   *
   * 왜 자리를 바꾸는가: 넓은 폭에서는 보기 행 우측이 474px 비어 있어 공짜지만, 좁은 폭에서는
   * 그 행이 이미 꽉 차 묶음 하나가 **줄을 하나 더** 만든다(실측 768px에서 +48px). 반대로
   * 필터 바는 그 대역에서 이미 wrap 상태라 아이콘 3개를 남는 자리에 흡수한다.
   */
  viewUtilities?: React.ReactNode
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
  setSelectedCentury,
  onSelectCategory,
  onSelectCountry,
  onSelectContinent,
  bookmarksOnly,
  toggleBookmarksOnly,
  bookmarksCount,
  anchorsOnly,
  toggleAnchorsOnly,
  anchorsCount,
  childrenCollapsed,
  hasCollapsibleChildren,
  collapsedBandCount,
  onExpandAllBands,
  reignActive,
  reignPersonName,
  reignMatchedCount,
  reignLoading,
  onOpenReignPicker,
  onClearReign,
  onCollapseAllChildren,
  onExpandAllChildren,
  onExportJson,
  onOpenShortcutHelp,
  onCreateEvent,
  viewUtilities,
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
  const chipCount =
    filterSummaryChips.length + (bookmarksOnly ? 1 : 0) + (anchorsOnly ? 1 : 0)
  /**
   * 하위 일괄 토글이 할 일이 있는가. 평면 보기는 자손이 이미 전부 depth 0으로 나열돼
   * 접을 것이 없고(검토 GAP-6), 계층 보기라도 자식 보유 사건이 0건이면 마찬가지다.
   */
  const canToggleChildren = !showFlatView && hasCollapsibleChildren

  return (
    <>
      {/* 툴바 한 줄 — 넓은 폭에서 [검색][필터][액션] 3존 격자, 좁은 폭에서 wrap flex.
          자식이 정확히 **3개**여야 격자 자동 배치가 의도대로 선다(활성 필터 칩은 아래
          전용 행으로 분리했다). 4번째 자식을 여기 넣지 말 것. */}
      <Layout.TopFilterBarShell>
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
          onSelectCentury={setSelectedCentury}
        />

        <ToolbarStyles.ToolbarActions>
          {/*
           * (제거) '최근 본 사건' 드롭다운 — 좌측 사건 목록 사이드바가 같은 것을
           * **상시** 보여준다(클릭 한 번이 아예 필요 없다). 게다가 둘은 저장소가 달라
           * (`papyrus.events.recent` vs `event-sidebar-recents`) 같은 화면에서 서로 다른
           * 목록을 내놓을 수 있었다 — 한 개념에 진실이 둘이던 상태.
           * 데이터(useRecentEvents)는 그대로 살아 있다: 필터 0건 빈 상태의 추천이 그것을 쓴다.
           */}
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
            $active={anchorsOnly}
            /* '최상위 사건'의 정의를 토글 지점에서 밝힌다 — 파생 규약(자손 ≥ 1)이라
               사용자가 하위를 붙이거나 떼면 이 목록이 자동으로 달라진다. */
            title="하위 사건을 가진 최상위 사건만 보기 — 하위를 붙이면 자동으로 포함됩니다"
            aria-pressed={anchorsOnly}
            onClick={toggleAnchorsOnly}
          >
            <FiFlag size={ICON_SIZE.base} />
            <span>최상위</span>
            {anchorsCount > 0 && <Badge tone="primary">{anchorsCount}</Badge>}
          </ToolbarStyles.ToolbarBtn>
          <ToolbarStyles.ToolbarBtn
            type="button"
            $active={reignActive}
            title={
              reignActive
                ? `${reignPersonName ?? '군주'} 재위 기간의 사건 ${reignMatchedCount}건을 목록에 표시 중 — 눌러서 다른 군주 선택`
                : '군주를 골라 그 재위 기간의 사건을 목록에 따로 표시'
            }
            aria-pressed={reignActive}
            onClick={onOpenReignPicker}
          >
            <FaCrown size={ICON_SIZE.sm} aria-hidden="true" />
            <span>
              {reignActive
                ? `${reignPersonName ?? '불러오는 중…'} 재위`
                : '군주 재위'}
            </span>
            {reignActive && !reignLoading && (
              <Badge tone="primary">{reignMatchedCount}</Badge>
            )}
          </ToolbarStyles.ToolbarBtn>
          {reignActive && (
            <ToolbarStyles.ToolbarBtn
              type="button"
              title="군주 재위 표시 끄기"
              aria-label="군주 재위 표시 끄기"
              onClick={onClearReign}
            >
              <FiX size={ICON_SIZE.sm} aria-hidden="true" />
            </ToolbarStyles.ToolbarBtn>
          )}
          {viewUtilities && <Utilities>{viewUtilities}</Utilities>}
          <Layout.CreateEventButton onClick={onCreateEvent}>
            <FiPlus size={ICON_SIZE.md} />새 사건 등록
          </Layout.CreateEventButton>
        </ToolbarStyles.ToolbarActions>
      </Layout.TopFilterBar>
      </Layout.TopFilterBarShell>

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
      {/* ⚠️ 렌더 조건에 **접힘**도 넣는다(검토 CTRL-3). 필터가 0개인 채로 세기·연도 밴드만
          접으면 이 행 자체가 렌더되지 않아, 접힌 자리에 '19세기 — N행 접힘'만 남고
          되돌릴 일괄 수단이 화면 어디에도 없었다('전체 초기화'가 그 역할인데 이 행 안에 있다). */}
      {(chipCount > 0 || collapsedBandCount > 0) && (
        <Layout.ActiveFiltersRow>
          <ToolbarStyles.ActiveFiltersBar>
            {chipCount > 0 && (
              <ToolbarStyles.ActiveFilterCount>
                <FiSearch size={ICON_SIZE.xs} />
                <span>{chipCount}개 적용 중</span>
              </ToolbarStyles.ActiveFilterCount>
            )}
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
            {anchorsOnly && (
              <ToolbarStyles.ActiveFilterChip
                type="button"
                onClick={toggleAnchorsOnly}
                aria-label="최상위 사건 필터 끄기"
              >
                <FiFlag size={ICON_SIZE.xs} aria-hidden="true" />
                <span>최상위 사건만</span>
                <FiX size={ICON_SIZE.xs} aria-hidden="true" />
              </ToolbarStyles.ActiveFilterChip>
            )}
            {/* 접힌 밴드는 필터가 아니지만 **행을 감춘다**는 점에서 같은 축이다.
                여기서 접힘만 따로 풀 수 있어야 필터를 유지한 채 되돌릴 수 있다. */}
            {collapsedBandCount > 0 && (
              <ToolbarStyles.ActiveFilterChip
                type="button"
                onClick={onExpandAllBands}
                aria-label={`접어 둔 연도·세기 ${collapsedBandCount}개 모두 펼치기`}
              >
                <FiChevronsDown size={ICON_SIZE.xs} aria-hidden="true" />
                <span>{collapsedBandCount}개 밴드 접힘</span>
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

/**
 * 표시 제어의 자리 — **이제 모든 폭에서 여기 하나뿐이다**.
 *
 * 예전엔 같은 클러스터가 두 벌 존재했다: 넓은 폭은 보기 행(ViewSwitcherRow), ≤900px는
 * 이 자리. 한쪽이 `display:none`이라 화면에는 한 벌만 보였지만, 자리를 두 개 유지하려고
 * 페이지가 같은 노드를 두 번 만들고 미디어쿼리 두 벌이 서로를 상쇄하고 있었다.
 * 보기 행이 사라지면서(뷰가 목록 하나가 됐다) 경쟁자가 없어졌다.
 */
const Utilities = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* 앞의 셋(최근·북마크·최상위)은 **모수를 바꾸는** 버튼이고 이건 표시 설정이다.
     간격만으로는 네 번째 토글로 읽혀, 성격이 갈리는 자리에 머리카락 한 올을 긋는다. */
  margin-left: 2px;
  padding-left: 8px;
  border-left: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)'};

  /* 좁은 폭에서는 액션 트랙이 이미 줄바꿈하므로 구분선이 줄 머리에 혼자 남는다. */
  @media (max-width: 640px) {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
  }
`

/* ───────────────────────────── 표시 제어 클러스터 ───────────────────────────── */

interface ViewUtilitiesProps {
  showFlatView: boolean
  /** 계층 ↔ 평면 — 결과를 좁히지 않는 **표시** 축이라 필터 바에서 이리로 내려왔다 */
  onToggleFlatView: () => void
  childrenCollapsed: boolean
  hasCollapsibleChildren: boolean
  onCollapseAllChildren: () => void
  onExpandAllChildren: () => void
  onExportJson: () => void
  onOpenShortcutHelp: () => void
  /**
   * 한 번에 불러올 사건 수 — 저빈도 설정(메뉴 안에 산다).
   * `EVENTS_PAGE_SIZE_ALL`(0)이면 '모두'(쪼개지 않고 한 번에 전부).
   */
  pageSize: number
  onPageSizeChange: (size: number) => void
  /** 정렬 축 — 메뉴가 전체 목록을 펴고, 그중 셋은 열 머리글 클릭으로도 닿는다 */
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  onSortChange: (next: SortOption) => void
  onSortDirectionToggle: () => void
  /** 목록 밀도 — 행 높이의 소유권을 사용자에게 넘기는 축 */
  listDensity: ListDensity
  onChangeListDensity: (next: ListDensity) => void
  /** 사용자가 끈 열 — 가로 픽셀의 소유권을 넘기는 축(끄기 전용) */
  hiddenColumns: readonly ListColumnKey[]
  onToggleColumn: (column: ListColumnKey) => void
  onResetColumns: () => void
}

/**
 * 라디오 그룹 안의 ←→↑↓ — **그룹 하나가 탭 정지점 하나**(WAI-ARIA roving tabindex).
 *
 * 이 메뉴에는 라디오 그룹이 셋(정렬 4 · 밀도 3 · 개수 4)이다. 로빙이 없으면 열 벌의
 * 라디오가 전부 탭 정지점이라, 메뉴를 가로지르는 데만 Tab이 열 번 더 든다. 라디오는
 * **이동과 동시에 선택**되는 것이 표준 동작이라 화살표 한 번이 곧 적용이다.
 */
const handleRadioGroupKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
  const delta =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0
  if (delta === 0) return
  const group = event.currentTarget
  const radios = Array.from(
    group.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  )
  const current = radios.indexOf(document.activeElement as HTMLButtonElement)
  if (current === -1) return
  event.preventDefault()
  const next = radios[(current + delta + radios.length) % radios.length]
  // 포커스와 선택을 함께 옮긴다 — 포커스만 옮기면 다음 화살표가 같은 자리에서 돈다.
  next.focus()
  next.click()
}

/** 정렬 옵션 — 라벨과 '무엇을 기준으로 줄 세우는가'를 한 줄 설명으로 함께 싣는다. */
const SORT_CHOICES: Array<{
  value: SortOption
  label: string
  hint: string
}> = [
  { value: 'recent', label: '시기순', hint: '사건이 일어난 시점' },
  { value: 'created', label: '등록순', hint: '이 목록에 입력한 시각 · 연도 그룹 해제' },
  { value: 'duration', label: '기간순', hint: '지속 일수 · 같은 해 안에서만' },
  { value: 'descendants', label: '하위 많은 순', hint: '자손 수 · 연도 그룹 해제' },
]

/** 목록 밀도 — 라벨을 글자로 두는 이유는 밀도 아이콘 3종의 관습이 약하기 때문이다. */
const DENSITY_CHOICES: Array<{
  value: ListDensity
  label: string
  hint: string
}> = [
  { value: 'compact', label: '조밀', hint: '행 높이 32px — 한 화면에 더 많이' },
  { value: 'cozy', label: '기본', hint: '행 높이 45px' },
  { value: 'roomy', label: '편안', hint: '행 높이 52px — 읽기 위주' },
]

/**
 * 표시 설정 — 버튼 **하나**(⋯)와 그 뒤의 메뉴.
 *
 * ## 왜 전부 메뉴로 들어갔나
 *
 * 이 클러스터는 원래 목록 위 '보기 행'에 살았다. 그 행의 주인공은 뷰 전환 세그먼트
 * (목록·시대·트리 + 더보기 4종)였고, 정렬·방향·밀도·하위 접기·⋯가 그 옆에 붙어 있었다.
 * 2026-09-24 뷰가 목록 하나로 정리되면서 세그먼트가 사라지자, 행 하나(34px + 여백)를
 * 좌측 컨트롤 다섯이 지키는 모양이 됐다 — 같은 폭에서 그 행의 우측 1,000px은 비어 있었다.
 *
 * 그래서 행을 걷어내고 컨트롤을 빈도로 갈랐다.
 *  - **정렬**(자주): 목록의 **열 머리글 클릭**이 1차 진입점이 된다(시작·사건·기간·등록).
 *    표에서 순서를 만드는 것이 열이므로, 컨트롤이 그 열 위에 서는 편이 원래 자리다.
 *    네 축 전부와 키보드 경로는 이 메뉴가 계속 책임진다 — 머리글은 `aria-hidden`
 *    시각 보조라 마우스 보조 진입점일 뿐, 유일한 경로가 되면 접근성 회귀다.
 *  - **하위 접기·밀도·개수·내보내기·도움말**(가끔~드묾): 이 메뉴.
 *
 * ⚠️ 액션 트랙은 넉넉하지 않다 — 라벨 달린 버튼을 되살리지 말 것. 실측(1600px)에서
 * 라벨 포함 클러스터가 트랙을 **4px** 넘겨 '새 사건 등록'이 혼자 다음 줄로 밀렸고,
 * 필터 바 높이가 51 → 91px이 됐다. 지금은 아이콘 하나(36px)라 여유 118px 안쪽이다.
 */
export const CatalogViewUtilities: React.FC<ViewUtilitiesProps> = ({
  showFlatView,
  onToggleFlatView,
  childrenCollapsed,
  hasCollapsibleChildren,
  onCollapseAllChildren,
  onExpandAllChildren,
  onExportJson,
  onOpenShortcutHelp,
  pageSize,
  onPageSizeChange,
  sortBy,
  sortDirection,
  onSortChange,
  onSortDirectionToggle,
  listDensity,
  onChangeListDensity,
  hiddenColumns,
  onToggleColumn,
  onResetColumns,
}) => {
  /**
   * 하위 일괄 접기/펼치기가 할 일이 있는가. 평면 보기는 자손이 이미 전부 depth 0으로
   * 나열돼 접을 것이 없고(검토 GAP-6), 계층 보기라도 자식 보유 사건이 0건이면 마찬가지다.
   * 예전엔 버튼이 활성인 채로 눌려 `expandedEventIds`만 비워 두었다가, 사용자가 나중에
   * 계층을 다시 켜는 순간 **그때 접힘이 터졌다**(원인과 결과가 분리된 지연 폭발).
   */
  const canToggleChildren = !showFlatView && hasCollapsibleChildren

  /*
   * ⚠️ 포털이어야 한다. 이 버튼이 사는 행은 radius 클리핑과 가로 스크롤 때문에 overflow가
   *    걸려 있어, 안에서 absolute로 띄우면 z-index와 무관하게 잘린다(필터 드롭다운이
   *    7주간 화면에 안 나오던 그 원인).
   */
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement | null>(null)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const menuPosition = useAnchoredPosition(menuTriggerRef, menuOpen, {
    maxWidth: 260,
  })
  /**
   * 포커스 트랩 — **없으면 이 메뉴는 키보드로 사실상 닿지 않는다**.
   *
   * 메뉴는 body로 포털되므로 DOM 순서상 문서 맨 끝에 붙는다. 트리거에서 Tab을 누르면
   * 다음 툴바 버튼으로 갈 뿐이고, 메뉴 첫 항목까지는 실측 **489번**이 걸렸다. 정렬·밀도·
   * 열 표시·개수·내보내기가 전부 이 안으로 들어온 뒤라, 그건 기능 전체가 마우스 전용이
   * 됐다는 뜻이다. 훅이 열 때 첫 항목으로 옮기고, Tab을 안에 가두고, 닫힐 때 트리거로
   * 되돌린다(언마운트 시 복귀라 Esc·바깥 클릭·항목 선택 어느 경로든 같다).
   *
   * ⚠️ `menuOpen`만으로 켜면 안 된다 — 좌표(menuPosition)가 잡히기 전 프레임에는 메뉴가
   * 아직 마운트되지 않아 트랩이 빈 컨테이너를 잡고 조용히 아무 일도 하지 않는다.
   */
  const menuRef = useFocusTrap<HTMLDivElement>(menuOpen && !!menuPosition)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return
    const onDocDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuWrapRef.current?.contains(target)) return
      /* 메뉴는 body로 포털된다 — 이 검사가 없으면 항목을 누르는 mousedown이 외부 클릭으로
         판정돼 click 전에 언마운트되고 아무 일도 일어나지 않는다. */
      if (menuRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [menuOpen])
  useOverlayEscape(menuOpen, closeMenu)

  const activeSort = SORT_CHOICES.find((choice) => choice.value === sortBy)
  const hiddenCount = hiddenColumns.length

  /**
   * **폭이 모자라 접힌 열** — 사용자가 끈 것과 다른 축이다.
   *
   * '열 표시'가 체크를 켠 채로 보여 주는데 화면에는 그 열이 없으면, 설정이 거짓말을
   * 하는 것으로 읽힌다(실측: 뷰포트 1600에서도 좌측 사이드바가 360px을 가져가 카드가
   * 1,162px이라 종료·키워드·등록 셋이 접혀 있다). 끌 수는 있어도 **켤 수는 없는** 축이
   * 따로 있다는 사실을 그 자리에서 밝힌다.
   *
   * 메뉴가 열리는 순간 한 번만 잰다 — 순수 읽기이고, 열려 있는 동안 카드 폭이 바뀌는
   * 경우(창 리사이즈)는 메뉴를 닫았다 여는 것으로 충분하다. ResizeObserver를 상시로
   * 걸면 이 버튼 하나 때문에 목록 전체가 리사이즈마다 렌더된다.
   */
  const [widthHiddenColumns, setWidthHiddenColumns] = useState<ListColumnKey[]>(
    [],
  )
  useEffect(() => {
    if (!menuOpen) return
    const card = document.querySelector('[data-list-scroller]')?.parentElement
    if (!card) {
      setWidthHiddenColumns([])
      return
    }
    const cardWidth = card.getBoundingClientRect().width
    const folded: ListColumnKey[] = []
    // 열 사다리와 **같은 임계**를 읽는다 — 값을 여기 베껴 쓰면 곧 갈린다.
    if (cardWidth < LIST_STEPS.summary) folded.push('end', 'kw')
    if (cardWidth < LIST_STEPS.atlas) folded.push('reg')
    setWidthHiddenColumns(folded)
  }, [menuOpen])

  return (
    <UtilityMenuWrap ref={menuWrapRef}>
      <ToolbarStyles.ToolbarBtn
        ref={menuTriggerRef}
        type="button"
        $active={menuOpen}
        /* 트리거가 **현재 정렬을 말한다** — 정렬이 메뉴 뒤로 들어간 이상, 지금 무엇이
           순서를 만드는지 닫힌 상태에서도 읽혀야 한다(열 머리글의 캐럿과 한 쌍). */
        title={`표시 설정 — 정렬 ${activeSort?.label ?? ''} · 열 표시 · 밀도 · 하위 접기 · 개수${
          hiddenCount > 0 ? ` (열 ${hiddenCount}개 숨김)` : ''
        }`}
        aria-label={`표시 설정 — 현재 정렬 ${activeSort?.label ?? ''}${
          hiddenCount > 0 ? `, 열 ${hiddenCount}개 숨김` : ''
        }`}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <UtilityGlyph $marked={hiddenCount > 0}>
          <FiSliders size={ICON_SIZE.base} aria-hidden="true" />
        </UtilityGlyph>
      </ToolbarStyles.ToolbarBtn>
      {menuOpen &&
        menuPosition &&
        createPortal(
          <UtilityMenu
            ref={menuRef}
            role="group"
            aria-label="표시 설정"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            <UtilityMenuLabel id="catalog-sort-label">정렬</UtilityMenuLabel>
            {/* 라디오 그룹 — 값 자체가 상태이므로 선택지를 한눈에 편다(셀렉트 재현 금지) */}
            <ChoiceColumn
              role="radiogroup"
              aria-labelledby="catalog-sort-label"
              onKeyDown={handleRadioGroupKeys}
            >
              {SORT_CHOICES.map((choice) => {
                const active = sortBy === choice.value
                return (
                  <ChoiceRow
                    key={choice.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    $active={active}
                    title={choice.hint}
                    onClick={() => onSortChange(choice.value)}
                  >
                    <span>{choice.label}</span>
                    {/* 축마다 딸린 조건을 그 자리에서 밝힌다 — '기간순'이 같은 해 안에서만
                        적용된다는 사실이 화면 어디에도 없으면, 목록이 안 바뀌는 것을 보고
                        컨트롤이 고장 났다고 읽는다(검토 IA-12). */}
                    <ChoiceHint>{choice.hint}</ChoiceHint>
                  </ChoiceRow>
                )
              })}
            </ChoiceColumn>
            <DirectionRow>
              <UtilityMenuItem
                type="button"
                onClick={onSortDirectionToggle}
                aria-label={`정렬 방향 — 지금 ${
                  sortDirection === 'asc' ? '오름차순' : '내림차순'
                }, 눌러서 바꾸기`}
              >
                <DirectionGlyph $direction={sortDirection} aria-hidden="true">
                  <FiArrowDown size={13} />
                </DirectionGlyph>
                <span>{sortDirection === 'asc' ? '오름차순' : '내림차순'}</span>
              </UtilityMenuItem>
            </DirectionRow>

            <UtilityMenuDivider role="presentation" />

            <UtilityMenuLabel id="catalog-density-label">
              목록 밀도
            </UtilityMenuLabel>
            <ChoiceGrid
              role="radiogroup"
              aria-labelledby="catalog-density-label"
              onKeyDown={handleRadioGroupKeys}
              $columns={DENSITY_CHOICES.length}
            >
              {DENSITY_CHOICES.map((choice) => (
                <PageSizeBtn
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={listDensity === choice.value}
                  tabIndex={listDensity === choice.value ? 0 : -1}
                  $active={listDensity === choice.value}
                  title={choice.hint}
                  onClick={() => onChangeListDensity(choice.value)}
                >
                  {choice.label}
                </PageSizeBtn>
              ))}
            </ChoiceGrid>

            <UtilityMenuDivider role="presentation" />

            <ColumnSectionHead>
              <UtilityMenuLabel as="span" id="catalog-columns-label">
                열 표시
              </UtilityMenuLabel>
              {/* 되돌리기는 **하나라도 꺼져 있을 때만** 선다 — 항상 있으면 누를 일 없는
                  링크가 섹션 머리에 상주한다. */}
              {hiddenCount > 0 && (
                <ColumnResetBtn type="button" onClick={onResetColumns}>
                  전부 표시
                </ColumnResetBtn>
              )}
            </ColumnSectionHead>
            <ChoiceColumn role="group" aria-labelledby="catalog-columns-label">
              {HIDEABLE_COLUMNS.map((column) => {
                const shown = !hiddenColumns.includes(column)
                const foldedByWidth = shown && widthHiddenColumns.includes(column)
                return (
                  <ColumnRow
                    key={column}
                    type="button"
                    role="switch"
                    aria-checked={shown}
                    $active={shown}
                    title={
                      foldedByWidth
                        ? `${LIST_COLUMNS[column]} — 켜져 있지만 지금 폭에서는 접혀 있습니다. 창을 넓히거나 좌측 목록을 접으면 나타납니다`
                        : undefined
                    }
                    onClick={() => onToggleColumn(column)}
                  >
                    <ColumnCheck aria-hidden="true">
                      {shown ? <FiCheck size={12} /> : null}
                    </ColumnCheck>
                    <span>{LIST_COLUMNS[column]}</span>
                    {/* 켜져 있는데 화면에 없는 열 — 그 사실을 행 자신이 말한다.
                        (끈 열은 이미 흐린 글자로 구별되므로 여기 오지 않는다.) */}
                    {foldedByWidth && (
                      <ColumnFoldedNote>폭 부족</ColumnFoldedNote>
                    )}
                  </ColumnRow>
                )
              })}
            </ChoiceColumn>
            {/* 켜 둔 열이 안 보일 수 있다는 사실을 **설정 옆에서** 밝힌다 — 이 축은
                끄기 전용이고, 폭이 모자라면 열 사다리가 따로 접기 때문이다. */}
            <ColumnNote role="note">
              {widthHiddenColumns.length > 0
                ? '좌측 목록을 접거나 창을 넓히면 접힌 열이 돌아옵니다'
                : '폭이 좁으면 켜 둔 열도 자동으로 접힙니다'}
            </ColumnNote>

            <UtilityMenuDivider role="presentation" />

            {/*
             * 계층 보기 — '하위 사건 모두 접기'와 한 묶음이다. 둘 다 "하위를 어떻게
             * 보여줄 것인가"이고, 평면이면 접을 것이 없어 아래 항목이 비활성이 된다.
             * 필터 바에 있던 시절에는 이 둘이 서로 다른 지면에 흩어져 있었다.
             */}
            <UtilityMenuItem
              type="button"
              role="switch"
              aria-checked={!showFlatView}
              title={
                showFlatView
                  ? '계층 보기로 — 하위 사건을 상위 아래로 들여 쓴다'
                  : '평면 보기로 — 모든 사건을 같은 단에 나열한다'
              }
              onClick={onToggleFlatView}
            >
              <FiLayers size={13} aria-hidden="true" />
              <span>계층 보기</span>
              <MenuSwitch $active={!showFlatView} aria-hidden="true">
                <MenuSwitchThumb $active={!showFlatView} />
              </MenuSwitch>
            </UtilityMenuItem>

            {/**
             * ⚠️ 라벨과 `aria-pressed`를 **같은 조건으로 동시에 뒤집지 않는다**(검토 A11Y-8).
             * 예전엔 접힌 상태에서 이름이 '하위 펼치기'인데 상태가 '눌림'이라
             * "하위 펼치기, 눌림"으로 낭독됐다 — 낭독만 들으면 지금 펼쳐져 있다고 읽힌다.
             * 라벨은 다음 동작을 말하고, 상태는 접근 설명이 싣는다.
             */}
            <UtilityMenuItem
              type="button"
              disabled={!canToggleChildren}
              title={
                showFlatView
                  ? '평면 보기에서는 하위 사건이 이미 모두 펼쳐져 있어 접을 것이 없습니다'
                  : !hasCollapsibleChildren
                    ? '지금 목록에는 하위 사건을 가진 사건이 없습니다'
                    : childrenCollapsed
                      ? '하위 사건 모두 펼치기 — 지금 일부가 접혀 있습니다'
                      : '하위 사건 모두 접기 — 최상위 사건만 훑을 때'
              }
              onClick={() => {
                if (childrenCollapsed) onExpandAllChildren()
                else onCollapseAllChildren()
                setMenuOpen(false)
              }}
            >
              {childrenCollapsed ? (
                <FiChevronsDown size={13} aria-hidden="true" />
              ) : (
                <FiChevronsUp size={13} aria-hidden="true" />
              )}
              <span>
                {childrenCollapsed ? '하위 사건 모두 펼치기' : '하위 사건 모두 접기'}
              </span>
            </UtilityMenuItem>

            <UtilityMenuDivider role="presentation" />

            <UtilityMenuLabel id="catalog-page-size-label">
              한 번에 불러올 개수
            </UtilityMenuLabel>
            <ChoiceGrid
              role="radiogroup"
              aria-labelledby="catalog-page-size-label"
              onKeyDown={handleRadioGroupKeys}
              $columns={PAGE_SIZE_CHOICES.length}
            >
              {PAGE_SIZE_CHOICES.map((choice) => (
                <PageSizeBtn
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={pageSize === choice.value}
                  tabIndex={pageSize === choice.value ? 0 : -1}
                  $active={pageSize === choice.value}
                  title={choice.hint}
                  /* 숫자 셋 사이에 낱말 하나가 서므로 낭독 라벨을 따로 준다 —
                     '모두'만 읽히면 무엇이 모두인지 알 수 없다. */
                  aria-label={choice.hint}
                  onClick={() => onPageSizeChange(choice.value)}
                >
                  {choice.label}
                </PageSizeBtn>
              ))}
            </ChoiceGrid>
            <UtilityMenuDivider role="presentation" />
            <UtilityMenuItem
              type="button"
              onClick={() => {
                onExportJson()
                setMenuOpen(false)
              }}
            >
              <FiDownload size={13} aria-hidden="true" />
              <span>JSON 내보내기</span>
            </UtilityMenuItem>
            <UtilityMenuItem
              type="button"
              onClick={() => {
                onOpenShortcutHelp()
                setMenuOpen(false)
              }}
            >
              <FiHelpCircle size={13} aria-hidden="true" />
              <span>단축키 도움말</span>
              <UtilityMenuHint aria-hidden="true">?</UtilityMenuHint>
            </UtilityMenuItem>
          </UtilityMenu>,
          document.body,
        )}
    </UtilityMenuWrap>
  )
}

/**
 * 한 번에 불러올 사건 수 — 목록은 이 단위로 페이지를 이어 받는다.
 *
 * '모두'는 쪼개지 않고 한 요청으로 전부 받는다. 목록이 정렬·세기 필터·계층 평탄화를
 * 클라이언트 전역으로 하는 이상 어차피 전량을 소진하는데, 100건 상한 때문에 그게
 * 수십 번의 왕복으로 쪼개져 있었다 — '모두'는 그 왕복을 한 번으로 줄인다.
 */
const PAGE_SIZE_CHOICES = [
  { value: 20, label: '20', hint: '20건씩 이어 받기' },
  { value: 50, label: '50', hint: '50건씩 이어 받기' },
  { value: 100, label: '100', hint: '100건씩 이어 받기' },
  {
    value: EVENTS_PAGE_SIZE_ALL,
    label: '모두',
    hint: '쪼개지 않고 한 번에 전부 불러오기',
  },
] as const

const UtilityMenuWrap = styled.div`
  position: relative;
  display: inline-flex;
`

const UtilityMenu = styled.div`
  position: fixed;
  z-index: ${Z_INDEX.DROPDOWN};
  min-width: 184px;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: #18181b;
         border: 1px solid rgba(255,255,255,0.08);
         box-shadow: ${SHADOW.mdDark};`
      : `background: #ffffff;
         border: 1px solid rgba(15,23,42,0.08);
         box-shadow: ${SHADOW.md};`}
`

const UtilityMenuLabel = styled.div`
  padding: 4px 8px 2px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 선택지 한 줄 격자 — 밀도 3칸·개수 3칸이 같은 조판을 쓴다(한쪽만 손대면 곧 갈린다). */
const ChoiceGrid = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: 3px;
  padding: 2px 4px 4px;
`

/** 정렬 선택지 — 라벨 옆에 조건을 함께 싣느라 한 줄에 하나씩 선다. */
const ChoiceColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 4px 4px;
`

const ChoiceRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryFillDark
        : BRAND.primarySoftHover
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primaryHover
      : theme.colors.text.secondary};
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  & > span:first-child {
    flex-shrink: 0;
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? BRAND.primaryFillDark
          : BRAND.primarySoftHover
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(15,23,42,0.05)'};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * ⋯ 트리거 글리프 — 숨긴 열이 있으면 **점 하나**가 붙는다.
 *
 * '키워드 열이 왜 없지'의 답이 메뉴 두 겹 안에만 있으면 안 되므로 닫힌 상태에도 신호가
 * 필요하다. 그런데 숫자 배지(24px)를 달았더니 액션 트랙이 넘쳐 '새 사건 등록'이 혼자
 * 다음 줄로 밀렸다 — 같은 트랙이 4px 모자라 무너지던 전례를 그대로 재현했다(실측 컨테이너
 * 1240). 점은 폭을 **0** 쓰면서 같은 사실을 말한다. 개수는 title·aria-label이 싣는다.
 */
const UtilityGlyph = styled.span<{ $marked: boolean }>`
  position: relative;
  display: inline-flex;

  ${({ $marked, theme }) =>
    $marked &&
    `&::after {
       content: '';
       position: absolute;
       top: -1px;
       right: -2px;
       width: 5px;
       height: 5px;
       border-radius: 50%;
       background: ${
         theme.mode === 'dark' ? BRAND.primaryTextOnDark : BRAND.primaryHover
       };
     }`}
`

/** 메뉴 안 스위치 — 항목 우측 끝. 필터 바의 Switch와 같은 어휘를 축소해 옮긴 것. */
const MenuSwitch = styled.span<{ $active: boolean }>`
  margin-left: auto;
  flex-shrink: 0;
  width: 26px;
  height: 15px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  padding: 2px;
  transition: background ${MOTION.fast};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryFillDark
        : BRAND.primary
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(15,23,42,0.16)'};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const MenuSwitchThumb = styled.span<{ $active: boolean }>`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ffffff;
  transform: ${({ $active }) => ($active ? 'translateX(11px)' : 'none')};
  transition: transform ${MOTION.fast};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** 열 표시 섹션 머리 — 라벨과 '전부 표시'가 같은 줄의 양 끝에 선다. */
const ColumnSectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-right: 4px;
`

const ColumnResetBtn = styled.button`
  border: none;
  background: transparent;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primaryTextOnDark : BRAND.primaryHover};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? BRAND.primaryFillDark
        : BRAND.primarySoftHover};
  }
`

/**
 * 열 토글 한 줄 — `role="switch"`다.
 *
 * 라디오가 아닌 이유: 여섯 열은 **서로 배타가 아니고** 각자 켜짐/꺼짐을 갖는다.
 * 체크박스도 되지만 switch가 '지금 보이는가'라는 상태를 더 정확히 낭독한다.
 */
const ColumnRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  background: transparent;
  /* 꺼진 열은 **흐린 글자**로 말한다 — 체크 칸이 비었다는 사실만으로는 한 줄씩
     확인해야 하지만, 잉크 대비가 다르면 섹션을 한눈에 훑어 읽힌다. */
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(15,23,42,0.05)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** 체크 칸 — 빈 칸도 자리를 지킨다(라벨 x가 행마다 흔들리면 목록이 아니라 얼룩이 된다). */
const ColumnCheck = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 4px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primaryTextOnDark : BRAND.primaryHover};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

/** '폭 부족' 꼬리표 — 값이 아니라 **상태**라 라벨보다 한 단 뒤로 물러선다. */
const ColumnFoldedNote = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)'};
`

const ColumnNote = styled.p`
  margin: 0;
  padding: 0 8px 4px;
  font-size: 10.5px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 축에 딸린 조건 — 라벨보다 한 단 뒤로 물러선다. */
const ChoiceHint = styled.span`
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.3;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 방향 토글 한 줄 — 정렬 선택지와 같은 묶음이라 구분선 없이 이어 붙는다. */
const DirectionRow = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 4px 2px;
`

const DirectionGlyph = styled.span<{ $direction: 'asc' | 'desc' }>`
  display: inline-flex;
  transform: ${({ $direction }) =>
    $direction === 'asc' ? 'rotate(180deg)' : 'none'};
  transition: transform ${MOTION.fast};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const PageSizeBtn = styled.button<{ $active: boolean }>`
  padding: 5px 0;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryFillDark
        : BRAND.primarySoftHover
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15,23,42,0.04)'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primaryHover
      : theme.colors.text.secondary};
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.07)'};
  }
`

const UtilityMenuDivider = styled.div`
  height: 1px;
  margin: 3px 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
`

const UtilityMenuItem = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  cursor: pointer;
  text-align: left;
  transition: background ${MOTION.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)'};
  }

  /* 할 일이 없는 항목 — 메뉴에서 지우지 않고 흐린다. 사라지면 '왜 없지'가 되고,
     흐려 있으면 title이 그 이유를 말할 자리가 남는다. */
  &:disabled {
    cursor: default;
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const UtilityMenuHint = styled.span`
  margin-left: auto;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)'};
`
