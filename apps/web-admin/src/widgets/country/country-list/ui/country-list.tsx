import React, { useEffect } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiChevronRight, FiClock, FiMap, FiStar } from 'react-icons/fi'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useRecentCountriesStore } from '@/widgets/command-palette'
import { SidebarHeader } from '@/widgets/content-shell'

import {
  getContinentColor,
  getContinentOrder,
} from '../model/continent-colors'
import { usePinnedCountriesStore } from '../model/pinned-countries.store'
import { useListKeyboardNav } from '../model/use-list-keyboard-nav'
import { useCountryListState } from '../country-list-state.context'
import { CountryListAddMenu } from './country-list-add-menu'
import { CountryListChildrenPopover } from './country-list-children-popover'
import { CountryListContextMenu } from './country-list-context-menu'
import { CountryListEmpty } from './country-list-empty'
import {
  CountryListError,
  HistoricalPartialErrorBanner,
} from './country-list-error'
import { CountryListFilters } from './country-list-filters'
import { CountryListRow } from './country-list-row'
import { CountryListSkeleton } from './country-list-skeleton'
import * as S from './country-list.styles'
import { PersonRegisterViewModal } from './person-register-view-modal'

export type SortBy = 'name' | 'population' | 'area'

interface CountryListProps {
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  /** 역사적 국가 폼 열기. preset이 있으면 막부 등 미리 채움 */
  onAddHistorical?: (preset?: {
    stateType: 'SHOGUNATE'
    entityKind: 'REGIME'
  }) => void
  onEditHistorical?: (country: UnifiedCountry) => void
  /** 좌측 패널 접기 상태 */
  collapsed?: boolean
  /** 접기/펼치기 토글 핸들러 */
  onToggleCollapse?: () => void
}

function CountryListInner({
  selectedId,
  onSelect,
  onAdd,
  onAddHistorical,
  onEditHistorical,
  collapsed = false,
  onToggleCollapse,
}: CountryListProps) {
  const {
    unifiedCountries,
    countriesById,
    filtered,
    continents,
    query,
    setQuery: onQueryChange,
    continentFilter,
    setContinentFilter: onContinentFilterChange,
    countryTypeFilter,
    setCountryTypeFilter: onCountryTypeFilterChange,
    sortBy,
    setSortBy: onSortByChange,
    historicalCount,
    isLoadingCountries,
    isLoadingHistorical,
    isLoadingContinents,
    isError,
    isErrorHistorical,
    refetchAll,
    showPersonRegisterModal,
    setShowPersonRegisterModal,
  } = useCountryListState()
  // 'all' sentinel — 첫 진입(localStorage 없음) 시. 데이터 로드 전에도 모든 그룹 collapsed로 렌더 → 깜빡임 없음.
  // 사용자가 그룹을 토글하면 'all' → 실제 Set으로 materialize.
  const [collapsedGroups, setCollapsedGroups] = React.useState<
    Set<string> | 'all'
  >(() => {
    try {
      const saved = localStorage.getItem('country-list-collapsed-groups')
      return saved ? new Set(JSON.parse(saved) as string[]) : 'all'
    } catch {
      return 'all'
    }
  })
  const isGroupCollapsedById = React.useCallback(
    (continentId: string): boolean => {
      // 핀/최근은 'all'이어도 펼침 유지
      if (continentId === '__pinned__' || continentId === '__recent__') {
        return collapsedGroups !== 'all' && (collapsedGroups as Set<string>).has(continentId)
      }
      if (collapsedGroups === 'all') return true
      return collapsedGroups.has(continentId)
    },
    [collapsedGroups],
  )
  // 'all' sentinel을 실제 Set으로 materialize (continents + 특수 그룹 모두 collapsed로 시작)
  const materializeCollapsed = React.useCallback(
    (prev: Set<string> | 'all'): Set<string> => {
      if (prev !== 'all') return new Set(prev)
      const nextSet = new Set<string>(
        continents.map((continent) => continent.id),
      )
      nextSet.add('__unknown__')
      nextSet.add('__historical__')
      return nextSet
    },
    [continents],
  )
  const toggleGroup = React.useCallback(
    (continentId: string) => {
      setCollapsedGroups((prev) => {
        const base = materializeCollapsed(prev)
        if (base.has(continentId)) base.delete(continentId)
        else base.add(continentId)
        try {
          localStorage.setItem(
            'country-list-collapsed-groups',
            JSON.stringify(Array.from(base)),
          )
        } catch {
          /* ignore */
        }
        return base
      })
    },
    [materializeCollapsed],
  )
  // 선택 국가의 그룹을 임시로 펼침(F1) — localStorage에 기록하지 않아 '기본 접힘' 의도를 보존.
  const expandGroupForSelection = React.useCallback(
    (continentId: string) => {
      setCollapsedGroups((prev) => {
        if (prev !== 'all' && !prev.has(continentId)) return prev // 이미 펼침
        const base = materializeCollapsed(prev)
        base.delete(continentId)
        return base
      })
    },
    [materializeCollapsed],
  )
  const listRef = React.useRef<HTMLDivElement>(null)
  // 접기/펼치기 토글 시 누른 버튼이 언마운트돼 포커스가 body로 유실되는 것 방지(F30):
  // collapsed 전환 후 반대편 토글 버튼(aria-label로 조회)으로 포커스 이동.
  const paneRef = React.useRef<HTMLDivElement>(null)
  const collapsedDidMountRef = React.useRef(false)
  useEffect(() => {
    if (!collapsedDidMountRef.current) {
      collapsedDidMountRef.current = true
      return
    }
    const targetLabel = collapsed ? '패널 펼치기' : '패널 접기'
    paneRef.current
      ?.querySelector<HTMLElement>(`[aria-label="${targetLabel}"]`)
      ?.focus()
  }, [collapsed])

  const pinnedIds = usePinnedCountriesStore((store) => store.pinnedIds)
  const togglePinned = usePinnedCountriesStore((store) => store.toggle)
  const recentIds = useRecentCountriesStore((store) => store.recentIds)


  // 핀 + 최근 — 사이드바 상단 빠른 접근 섹션. 필터/검색 활성 시 숨김.
  const hasFilterActive =
    !!query || !!continentFilter || countryTypeFilter !== 'all'

  const quickAccessItems = React.useMemo(() => {
    if (hasFilterActive) return { pinned: [], recent: [] }
    // core의 countriesById(현대+역사+하위역사 3원 인덱스)를 재사용 — 자체 flatById 재구축을
    // 버려 미연결 역사국가도 핀/최근에서 조회되게 한다(F5, O(1)).
    const pinned = pinnedIds
      .map((id) => countriesById.get(id))
      .filter((country): country is UnifiedCountry => !!country)
    const recent = recentIds
      .filter((id) => !pinnedIds.includes(id))
      .map((id) => countriesById.get(id))
      .filter((country): country is UnifiedCountry => !!country)
      .slice(0, 5)
    return { pinned, recent }
  }, [hasFilterActive, countriesById, pinnedIds, recentIds])

  // 대륙별로 그룹화 (현대 국가만; continentId 기준). 과거만 선택 시 단일 그룹으로 플랫 목록
  const groupedByContinent = React.useMemo(() => {
    // 과거(역사적)만 선택된 경우: 그룹 없이 단일 섹션으로 표시
    if (countryTypeFilter === 'historical') {
      if (filtered.length === 0) return []
      return [
        {
          continentId: '__historical__',
          name: '과거 국가',
          countries: filtered,
        },
      ]
    }
    const groups = new Map<string, typeof filtered>()
    const UNKNOWN = '__unknown__'
    const historicalMatches: typeof filtered = []
    for (const country of filtered) {
      if (country.type !== 'modern') {
        historicalMatches.push(country)
        continue
      }
      const key = country.continentId ?? UNKNOWN
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(country)
    }
    // 명시적 표시 순서: 유럽 → 아시아 → 북아메리카 → 남아메리카 → 아프리카 → ...
    // (continent-colors.ts의 NAME_ORDER 매핑). 매핑 안 된 대륙은 뒤에 데이터 순서대로.
    const orderedContinents = [...continents].sort(
      (contA, contB) => getContinentOrder(contA.name) - getContinentOrder(contB.name),
    )
    const result: {
      continentId: string
      name: string
      countries: typeof filtered
    }[] = []
    const emittedKeys = new Set<string>()
    for (const cont of orderedContinents) {
      const list = groups.get(cont.id)
      if (list?.length) {
        result.push({ continentId: cont.id, name: cont.name, countries: list })
        emittedKeys.add(cont.id)
      }
    }
    // never-drop (F4): 로드된 대륙 섹션에 못 들어간 국가 — 대륙 목록이 아직 로딩 중이거나
    // continentId가 현재 대륙 목록에 없는(고아) 경우 포함 — 를 전부 '미분류'로 모은다.
    // 어떤 시점에도 국가가 조용히 사라지지 않게 하는 안전망. (__unknown__ 버킷도 여기서 흡수)
    const unclassified: typeof filtered = []
    for (const [groupKey, list] of groups) {
      if (emittedKeys.has(groupKey)) continue
      unclassified.push(...list)
    }
    if (unclassified.length > 0) {
      result.push({
        continentId: '__unknown__',
        name: '미분류',
        countries: unclassified,
      })
    }
    // 검색으로 매칭된 역사적 국가가 있으면 별도 섹션으로 추가
    if (historicalMatches.length > 0) {
      result.push({
        continentId: '__historical__',
        name: '과거 국가',
        countries: historicalMatches,
      })
    }
    return result
  }, [filtered, continents, countryTypeFilter])

  // 핀/최근 섹션을 통상 그룹 앞에 prepend (필터 비활성 시에만).
  // isQuickAccess=true면 행 렌더에서 펼침 버튼·자식 표시를 막아 통상 그룹과 충돌 회피.
  const groupedWithQuickAccess = React.useMemo(() => {
    type Group = (typeof groupedByContinent)[number] & {
      isQuickAccess?: boolean
    }
    if (hasFilterActive) return groupedByContinent as Group[]
    const extra: Group[] = []
    if (quickAccessItems.pinned.length > 0) {
      extra.push({
        continentId: '__pinned__',
        name: '고정',
        countries: quickAccessItems.pinned,
        isQuickAccess: true,
      })
    }
    if (quickAccessItems.recent.length > 0) {
      extra.push({
        continentId: '__recent__',
        name: '최근',
        countries: quickAccessItems.recent,
        isQuickAccess: true,
      })
    }
    return extra.length > 0
      ? [...extra, ...(groupedByContinent as Group[])]
      : (groupedByContinent as Group[])
  }, [hasFilterActive, quickAccessItems, groupedByContinent])

  // 키보드 nav를 위해 평탄화된 row id 시퀀스 + 인덱스 매핑 계산.
  // 펼친 sub-row도 순서대로 포함.
  // B-4 Finder 컬럼 모드 — sub-row 평탄화 제거. 자식은 별도 컬럼이 처리.
  // 검색·필터 활성 시에는 collapsedGroups를 무시하고 모두 평탄화 (검색 결과가 숨겨지면 안 됨).
  const { flatRowIds, rowIndexByGroupCountry } = React.useMemo(() => {
    const ids: string[] = []
    const indexMap = new Map<string, number>()
    for (const group of groupedWithQuickAccess) {
      if (!hasFilterActive && isGroupCollapsedById(group.continentId)) continue
      for (const country of group.countries) {
        const rowKey = `${group.continentId}-${country.id}`
        indexMap.set(rowKey, ids.length)
        ids.push(country.id)
      }
    }
    return {
      flatRowIds: ids,
      rowIndexByGroupCountry: indexMap,
    }
  }, [groupedWithQuickAccess, isGroupCollapsedById, hasFilterActive])

  // roving tabindex 단일 진입점(F11) — 선택 행(첫 등장), 없으면 첫 행. 목록 전체에서 한 개만 tabIndex=0.
  const tabStopFlatIndex = React.useMemo(() => {
    if (flatRowIds.length === 0) return -1
    const selectedFlatIndex = selectedId
      ? flatRowIds.indexOf(selectedId)
      : -1
    return selectedFlatIndex >= 0 ? selectedFlatIndex : 0
  }, [flatRowIds, selectedId])

  const { handleListKeyDown, handleSearchKeyDown } = useListKeyboardNav({
    containerRef: listRef,
    rowIds: flatRowIds,
    onSelect,
  })

  // 외부 진입(딥링크·⌘K)으로 selectedId가 바뀌면 해당 국가의 그룹을 자동 펼치고 그 행으로
  // 스크롤한다(F1). 접힌 그룹은 임시로만 펼쳐(localStorage 미기록) '기본 접힘' 의도를 보존하고,
  // 데이터 로드 후 행이 마운트되면(countriesById에 등장) 재실행돼 1회 스크롤한다.
  const selectedCountryForScroll = selectedId
    ? countriesById.get(selectedId)
    : undefined
  useEffect(() => {
    if (!selectedId || !selectedCountryForScroll) return
    // 대상 그룹 판정 (never-drop 규칙과 동일): 역사=과거 섹션, 현대=continentId(미로드/고아면 미분류)
    const targetGroupId =
      selectedCountryForScroll.type === 'historical'
        ? '__historical__'
        : selectedCountryForScroll.continentId &&
            continents.some(
              (continent) =>
                continent.id === selectedCountryForScroll.continentId,
            )
          ? selectedCountryForScroll.continentId
          : '__unknown__'
    expandGroupForSelection(targetGroupId)
    // 펼침 반영(재렌더) 후 스코프 한정 스크롤 — 전역 getElementById 대신 listRef 내부만.
    // 두 번의 rAF로 새 그룹이 커밋·레이아웃된 뒤 스크롤한다.
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        const element = listRef.current?.querySelector<HTMLElement>(
          `#country-${CSS.escape(selectedId)}`,
        )
        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    })
    return () => {
      cancelAnimationFrame(outerRaf)
      if (innerRaf) cancelAnimationFrame(innerRaf)
    }
  }, [
    selectedId,
    selectedCountryForScroll,
    continents,
    expandGroupForSelection,
  ])

  const handleClearFilters = () => {
    onQueryChange('')
    onContinentFilterChange('')
    onCountryTypeFilterChange('all')
  }

  const handleAddPerson = () => setShowPersonRegisterModal(true)
  const handleAddHistorical = () => onAddHistorical?.()

  // 헤더 카운트 분모(모집단) — 현재 유형 필터가 실제로 보여주는 집합에 맞춘다(F7).
  // '과거'=역사 총수, 검색 중 '전체'(대륙 미지정)=현대+역사(합류분), 그 외=현대 총수.
  // 역사 합류 조건은 filtered의 shouldMergeHistorical과 정확히 일치시킨다(대륙 지정 시 제외).
  // 분자(표시 수)가 분모와 다를 때만 분수로 노출해 '필터 중' 신호를 준다.
  const mergesHistoricalIntoCount =
    !!query && countryTypeFilter === 'all' && !continentFilter
  const countPopulation =
    countryTypeFilter === 'historical'
      ? historicalCount
      : mergesHistoricalIntoCount
        ? unifiedCountries.length + historicalCount
        : unifiedCountries.length
  const headerCount =
    filtered.length !== countPopulation
      ? `${filtered.length} / ${countPopulation}개`
      : `${countPopulation}개`

  // 검색·필터 결과 수 스크린리더 공지 (F28) — 타이핑 폭주를 피해 300ms 디바운스.
  const [liveMessage, setLiveMessage] = React.useState('')
  useEffect(() => {
    if (!hasFilterActive) {
      setLiveMessage('')
      return
    }
    const timerId = setTimeout(() => {
      setLiveMessage(
        filtered.length === 0
          ? '검색 결과 없음'
          : `국가 ${filtered.length}개`,
      )
    }, 300)
    return () => clearTimeout(timerId)
  }, [filtered.length, hasFilterActive])

  // 스켈레톤 게이트 — 활성 필터의 데이터 소스로 판정(G1-3). '과거'는 역사 쿼리,
  // 그 외는 현대 쿼리 기준. 추가로, 대륙 그룹핑을 해야 하는데(비-과거) 대륙이 아직
  // 콜드 로딩 중이면 현대 국가가 '미분류'로 잠깐 쏟아지는 대신 스켈레톤을 보인다(F4 레이스).
  const isInitialLoading =
    countryTypeFilter === 'historical'
      ? isLoadingHistorical && filtered.length === 0
      : (isLoadingCountries && unifiedCountries.length === 0) ||
        (isLoadingContinents &&
          continents.length === 0 &&
          unifiedCountries.length > 0)

  // 우클릭 컨텍스트 메뉴 — 행에서 onContextMenu로 호출
  const [contextMenu, setContextMenu] = React.useState<{
    country: UnifiedCountry
    x: number
    y: number
  } | null>(null)
  const handleRowContextMenu = React.useCallback(
    (country: UnifiedCountry, e: React.MouseEvent) => {
      e.preventDefault()
      setContextMenu({ country, x: e.clientX, y: e.clientY })
    },
    [],
  )

  // M2 — chevron 클릭으로 떠오르는 역사 국가 popover.
  // anchor는 element 자체로 받음 (스크롤 시 popover가 따라가야 하므로 매번 rect 재계산).
  const [childrenPopover, setChildrenPopover] = React.useState<{
    parent: UnifiedCountry
    anchorEl: HTMLElement
  } | null>(null)
  const handleShowChildren = React.useCallback(
    (country: UnifiedCountry, anchorEl: HTMLElement) => {
      setChildrenPopover((prev) => {
        // 같은 부모 chevron 다시 클릭 → 닫기 (toggle)
        if (prev?.parent.id === country.id) return null
        return { parent: country, anchorEl }
      })
    },
    [],
  )

  return (
    <>
      <S.ListPaneWrapper>
        <S.ListPane ref={paneRef} $collapsed={collapsed}>
          {!collapsed && (
            <>
              <SidebarHeader
                title="국가 목록"
                subtitle={headerCount}
                subtitleTitle={
                  filtered.length !== countPopulation
                    ? `표시 ${filtered.length} / 전체 ${countPopulation}`
                    : undefined
                }
                action={
                  <CountryListAddMenu
                    onAddModern={onAdd}
                    onAddHistorical={handleAddHistorical}
                    onAddPerson={handleAddPerson}
                  />
                }
                onCollapse={onToggleCollapse}
              />

              <CountryListFilters
                query={query}
                onQueryChange={onQueryChange}
                countryTypeFilter={countryTypeFilter}
                onCountryTypeFilterChange={onCountryTypeFilterChange}
                continentFilter={continentFilter}
                onContinentFilterChange={onContinentFilterChange}
                continents={continents}
                sortBy={sortBy}
                onSortByChange={onSortByChange}
                onClearFilters={handleClearFilters}
                onSearchKeyDown={handleSearchKeyDown}
              />

              {/* 검색·필터 결과 수 스크린리더 공지 (F28) */}
              <S.SrLiveRegion role="status" aria-live="polite">
                {liveMessage}
              </S.SrLiveRegion>

              <S.SidebarTabBody>
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      style={{
                        width: '100%',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minHeight: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        <S.ListContainer>
                          <S.VirtualList
                            ref={listRef}
                            role="listbox"
                            aria-label="국가 목록"
                            tabIndex={-1}
                            onKeyDown={handleListKeyDown}
                          >
                            {isInitialLoading ? (
                              <CountryListSkeleton />
                            ) : isError && filtered.length === 0 ? (
                              // fetch 실패를 빈 상태로 위장하지 않고 재시도 경로 제공(G1-1)
                              <CountryListError onRetry={refetchAll} />
                            ) : filtered.length === 0 ? (
                              <CountryListEmpty
                                query={query}
                                continentFilter={continentFilter}
                                countryTypeFilter={countryTypeFilter}
                                onAdd={onAdd}
                              />
                            ) : (
                              <>
                                {/* 역사 목록만 실패 → 일부만 표시 중임을 고지(G1-2) */}
                                {isErrorHistorical &&
                                  countryTypeFilter !== 'modern' && (
                                    <HistoricalPartialErrorBanner
                                      onRetry={refetchAll}
                                    />
                                  )}
                                {groupedWithQuickAccess.map((group) => {
                                // 검색·필터 활성 시 collapsed 무시 (자동 펼침)
                                const isGroupCollapsed =
                                  !hasFilterActive &&
                                  isGroupCollapsedById(group.continentId)
                                const accent = getContinentColor({
                                  continentId: group.continentId,
                                  continentName: group.name,
                                })
                                return (
                                  <React.Fragment key={group.continentId}>
                                    <S.ContinentSectionHeader
                                      type="button"
                                      onClick={() =>
                                        toggleGroup(group.continentId)
                                      }
                                      aria-expanded={!isGroupCollapsed}
                                      title={
                                        group.isQuickAccess
                                          ? '빠른 접근 — 자식 펼침은 본 그룹에서'
                                          : undefined
                                      }
                                    >
                                      <S.ContinentCaret
                                        $collapsed={isGroupCollapsed}
                                        aria-hidden
                                      >
                                        <svg
                                          width="10"
                                          height="10"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M6 9l6 6 6-6" />
                                        </svg>
                                      </S.ContinentCaret>
                                      {group.continentId === '__pinned__' ? (
                                        <S.ContinentLeadIcon
                                          aria-hidden
                                          style={{ color: accent }}
                                        >
                                          <FiStar size={10} />
                                        </S.ContinentLeadIcon>
                                      ) : group.continentId ===
                                        '__recent__' ? (
                                        <S.ContinentLeadIcon
                                          aria-hidden
                                          style={{ color: accent }}
                                        >
                                          <FiClock size={10} />
                                        </S.ContinentLeadIcon>
                                      ) : (
                                        <S.ContinentDot
                                          aria-hidden
                                          style={{ background: accent }}
                                        />
                                      )}
                                      <S.ContinentTitle>
                                        {group.name}
                                      </S.ContinentTitle>
                                      <S.ContinentCount>
                                        {group.countries.length}
                                      </S.ContinentCount>
                                    </S.ContinentSectionHeader>
                                    {!isGroupCollapsed &&
                                      group.countries.map((country) => {
                                        const baseIndex =
                                          rowIndexByGroupCountry.get(
                                            `${group.continentId}-${country.id}`,
                                          ) ?? 0
                                        return (
                                          <CountryListRow
                                            key={`${group.continentId}-${country.id}`}
                                            country={country}
                                            isQuickAccess={
                                              !!group.isQuickAccess
                                            }
                                            selectedId={selectedId}
                                            isTabStop={
                                              baseIndex === tabStopFlatIndex
                                            }
                                            pinned={pinnedIds.includes(
                                              country.id,
                                            )}
                                            accentColor={accent}
                                            rowIndex={baseIndex}
                                            childrenPopoverOpenForId={
                                              childrenPopover?.parent.id ?? null
                                            }
                                            onShowChildren={handleShowChildren}
                                            onSelect={onSelect}
                                            onTogglePin={togglePinned}
                                            onEditHistorical={
                                              onEditHistorical
                                            }
                                            onContextMenu={
                                              handleRowContextMenu
                                            }
                                          />
                                        )
                                      })}
                                  </React.Fragment>
                                )
                                })}
                              </>
                            )}
                          </S.VirtualList>
                        </S.ListContainer>
                      </div>
                    </motion.div>
                </AnimatePresence>
              </S.SidebarTabBody>
            </>
          )}
          {/* 접힘 상태 — 인물 필터와 동일하게 상단 rail에 펼치기 버튼 (가운데 floating X) */}
          {collapsed && (
            <S.CollapsedRail role="group" aria-label="국가 목록 (접힘)">
              <S.CollapsedToggleBtn
                type="button"
                onClick={onToggleCollapse}
                title="패널 펼치기"
                aria-label="패널 펼치기"
              >
                <FiChevronRight size={16} />
              </S.CollapsedToggleBtn>
              <S.CollapsedHint aria-hidden>
                <FiMap size={16} />
              </S.CollapsedHint>
            </S.CollapsedRail>
          )}
        </S.ListPane>
      </S.ListPaneWrapper>

      {/* 인물 등록 모달 — 사이드바 + 메뉴에서 트리거 */}
      <PersonRegisterViewModal
        isOpen={showPersonRegisterModal}
        onClose={() => setShowPersonRegisterModal(false)}
        onSuccess={() => setShowPersonRegisterModal(false)}
      />

      {/* 행 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <CountryListContextMenu
          country={contextMenu.country}
          pinned={pinnedIds.includes(contextMenu.country.id)}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onTogglePin={togglePinned}
          onEdit={
            contextMenu.country.type === 'historical' && onEditHistorical
              ? onEditHistorical
              : undefined
          }
        />
      )}

      {/* M2 — 부모 chevron 클릭 시 떠오르는 역사 국가 popover */}
      {childrenPopover &&
        (() => {
          // 대륙 색은 이름 기반이라 continentId만으론 회색 fallback이 된다 — 이름을 함께 조회(F25)
          const parentContinentId =
            childrenPopover.parent.continentId ?? null
          const parentContinentName = parentContinentId
            ? (continents.find(
                (continent) => continent.id === parentContinentId,
              )?.name ?? null)
            : null
          return (
            <CountryListChildrenPopover
              parent={childrenPopover.parent}
              anchorEl={childrenPopover.anchorEl}
              selectedId={selectedId}
              accentColor={getContinentColor({
                continentId: parentContinentId,
                continentName: parentContinentName,
              })}
              onSelect={onSelect}
              onClose={() => setChildrenPopover(null)}
              onContextMenu={handleRowContextMenu}
            />
          )
        })()}
    </>
  )
}

export const CountryList = React.memo(CountryListInner)
