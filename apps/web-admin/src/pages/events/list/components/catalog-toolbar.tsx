/**
 * 사건 카탈로그 상단 도구바.
 *
 * 검색바 + FiltersPanel(필터 트리거만) + 액션 버튼 + 활성 칩.
 * 정렬·페이지 크기는 *표시 옵션*이라 toolbar가 아니라 ViewSwitcherRow가 담당.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import styled from 'styled-components'

import {
  FiBookmark,
  FiChevronsDown,
  FiChevronsUp,
  FiDownload,
  FiFlag,
  FiHelpCircle,
  FiMoreHorizontal,
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
import { useAnchoredPosition } from '@/shared/hooks/use-anchored-position.hook'
import { useOverlayEscape } from '@/shared/hooks/use-overlay-escape.hook'
import { Badge } from '@/shared/ui/badge/badge'
import { Z_INDEX } from '@/shared/styles/z-index'
import { FiltersPanel } from '@/widgets/event-filters-panel/ui/filters-panel'

import type { HistoricalEvent } from '../../create/events.types'
import * as Layout from '../../styles/layout.styles'
import * as ToolbarStyles from '../../styles/list-toolbar.styles'
import { BRAND, ICON_SIZE, MOTION, SHADOW } from '../../styles/theme'
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

  // 최근 본 (toolbar dropdown — Discovery Hub 제거 후 진입점)
  recentEventIds: string[]
  events: HistoricalEvent[]
  onSelectEvent: (id: string) => void

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
  toggleShowFlatView,
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
  onCollapseAllChildren,
  onExpandAllChildren,
  recentEventIds,
  events,
  onSelectEvent,
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
          {viewUtilities && (
            <NarrowUtilities>{viewUtilities}</NarrowUtilities>
          )}
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
 * 표시 제어의 **좁은 폭 자리**(≤900px). 넓은 폭에서는 보기 행이 소유하므로 여기는 사라진다.
 * `display: none`이라 접근성 트리에서도 빠진다 — 두 자리에 같은 버튼이 동시에 낭독되지 않는다.
 */
const NarrowUtilities = styled.span`
  display: none;

  @media (max-width: 900px) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

/* ───────────────────────────── 표시 제어 클러스터 ───────────────────────────── */

interface ViewUtilitiesProps {
  showFlatView: boolean
  childrenCollapsed: boolean
  hasCollapsibleChildren: boolean
  onCollapseAllChildren: () => void
  onExpandAllChildren: () => void
  onExportJson: () => void
  onOpenShortcutHelp: () => void
  /** 한 번에 불러올 사건 수 — 도구줄에서 내려온 저빈도 설정(아래 메뉴 안에 산다) */
  pageSize: number
  onPageSizeChange: (size: number) => void
}

/**
 * 하위 일괄 접기 · 그 밖의 표시 설정(⋯ 메뉴) — **필터 바가 아니라 보기 행**에 산다.
 *
 * 셋 다 결과 집합을 좁히지 않는다(접기는 표시, JSON은 내보내기, ?는 도움말). 필터 행에
 * 섞여 있던 시절엔 ⑴ 성격이 다른 컨트롤이 북마크·최상위와 한 줄에 서서 무엇이 모수를
 * 바꾸는지 읽히지 않았고, ⑵ 액션 트랙 폭을 **4px** 넘겨(1600px에서 필요 522 / 가용 518)
 * '새 사건 등록'이 혼자 다음 줄로 밀려 필터 바가 51 → 91px이 됐다. 바로 아래 보기 행은
 * 같은 폭에서 474px이 비어 있었다.
 */
export const CatalogViewUtilities: React.FC<ViewUtilitiesProps> = ({
  showFlatView,
  childrenCollapsed,
  hasCollapsibleChildren,
  onCollapseAllChildren,
  onExpandAllChildren,
  onExportJson,
  onOpenShortcutHelp,
  pageSize,
  onPageSizeChange,
}) => {
  const canToggleChildren = !showFlatView && hasCollapsibleChildren

  /*
   * ⋯ 메뉴 — 저빈도 표시 설정의 집합소.
   *
   * 보기 행에 컨트롤이 13개까지 늘어나 있었다(뷰 탭 4 · 정렬 · 방향 · 개수 · 밀도 3 ·
   * 건수 · 하위 접기 · JSON · ?). 그중 **한 세션에 한 번 만질까 말까 한 것**이 셋이다:
   * 한 번에 불러올 개수(기본 100으로 두고 끝), JSON 내보내기, 단축키 도움말.
   * 상시 노출의 값은 '자주 쓰는가'로 정해진다 — 셋을 접어 행을 자주 쓰는 컨트롤만 남긴다.
   *
   * ⚠️ 포털이어야 한다. 이 버튼이 사는 행은 radius 클리핑과 가로 스크롤 때문에 overflow가
   *    걸려 있어, 안에서 absolute로 띄우면 z-index와 무관하게 잘린다(필터 드롭다운이
   *    7주간 화면에 안 나오던 그 원인).
   */
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement | null>(null)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuPosition = useAnchoredPosition(menuTriggerRef, menuOpen, {
    maxWidth: 200,
  })
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

  return (
    <>
      {/**
       * 하위 일괄 접기/펼치기 — **평면 보기에서는 비활성**(검토 GAP-6).
       *
       * 평면 모드는 모든 자손을 depth 0으로 이미 나열하므로 접을 것이 없다. 그런데
       * 버튼은 활성인 채로 눌리면 `expandedEventIds`만 비워 두었다가, 사용자가 나중에
       * 계층을 다시 켜는 순간 **그때 접힘이 터졌다**(원인과 결과가 분리된 지연 폭발).
       * 행 셰브론이 `canExpand`로 같은 판정을 이미 하고 있으므로 규약을 맞춘다.
       */}
      {/**
       * ⚠️ 라벨과 `aria-pressed`를 **같은 조건으로 동시에 뒤집지 않는다**(검토 A11Y-8).
       * 예전엔 접힌 상태에서 이름이 '하위 펼치기'인데 상태가 '눌림'이라
       * "하위 펼치기, 눌림"으로 낭독됐다 — 낭독만 들으면 지금 펼쳐져 있다고 읽힌다.
       * 라벨은 다음 동작을 말하고, 상태는 `aria-pressed` 없이 접근 설명이 싣는다.
       */}
      <ToolbarStyles.ToolbarBtn
        type="button"
        $active={canToggleChildren && childrenCollapsed}
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
        aria-label={
          childrenCollapsed
            ? '하위 사건 모두 펼치기 — 지금 일부가 접혀 있습니다'
            : '하위 사건 모두 접기'
        }
        onClick={
          childrenCollapsed ? onExpandAllChildren : onCollapseAllChildren
        }
      >
        {childrenCollapsed ? (
          <FiChevronsDown size={ICON_SIZE.base} aria-hidden="true" />
        ) : (
          <FiChevronsUp size={ICON_SIZE.base} aria-hidden="true" />
        )}
        <span>{childrenCollapsed ? '하위 펼치기' : '하위 접기'}</span>
      </ToolbarStyles.ToolbarBtn>
      <UtilityMenuWrap ref={menuWrapRef}>
        <ToolbarStyles.ToolbarBtn
          ref={menuTriggerRef}
          type="button"
          $active={menuOpen}
          title="표시 설정 — 불러올 개수 · 내보내기 · 단축키"
          aria-label="표시 설정 더보기"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <FiMoreHorizontal size={ICON_SIZE.base} aria-hidden="true" />
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
              <UtilityMenuLabel id="catalog-page-size-label">
                한 번에 불러올 개수
              </UtilityMenuLabel>
              {/* 라디오 그룹 — 값 자체가 상태이므로 선택지를 한눈에 편다(셀렉트 재현 금지) */}
              <PageSizeRow role="radiogroup" aria-labelledby="catalog-page-size-label">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <PageSizeBtn
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={pageSize === size}
                    $active={pageSize === size}
                    onClick={() => onPageSizeChange(size)}
                  >
                    {size}
                  </PageSizeBtn>
                ))}
              </PageSizeRow>
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
    </>
  )
}

/** 한 번에 불러올 사건 수 — 스크롤 시 이 단위로 추가 로드된다. */
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

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

const PageSizeRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  padding: 2px 4px 4px;
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

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)'};
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
