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
    isLoading,
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
  const toggleGroup = React.useCallback(
    (continentId: string) => {
      setCollapsedGroups((prev) => {
        // 'all' sentinel을 실제 Set으로 materialize (continents + 특수 그룹 모두 collapsed로 시작)
        const base =
          prev === 'all'
            ? (() => {
                const s = new Set<string>(continents.map((c) => c.id))
                s.add('__unknown__')
                s.add('__historical__')
                return s
              })()
            : new Set(prev)

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
    [continents],
  )
  const listRef = React.useRef<HTMLDivElement>(null)

  const pinnedIds = usePinnedCountriesStore((s) => s.pinnedIds)
  const togglePinned = usePinnedCountriesStore((s) => s.toggle)
  const recentIds = useRecentCountriesStore((s) => s.recentIds)


  // 핀 + 최근 — 사이드바 상단 빠른 접근 섹션. 필터/검색 활성 시 숨김.
  const hasFilterActive =
    !!query || !!continentFilter || countryTypeFilter !== 'all'

  const quickAccessItems = React.useMemo(() => {
    if (hasFilterActive) return { pinned: [], recent: [] }
    const flatById = new Map<string, UnifiedCountry>()
    // UnifiedCountry 목록 사용 — Country에는 type 판별 필드가 없어 역사 국가 분기가 동작하지 않음
    for (const c of unifiedCountries) {
      flatById.set(c.id, c)
      if (c.type === 'modern' && c.historicalCountries) {
        for (const h of c.historicalCountries) {
          flatById.set(h.id, {
            ...h,
            type: 'historical',
          } as unknown as UnifiedCountry)
        }
      }
    }
    const pinned = pinnedIds
      .map((id) => flatById.get(id))
      .filter((c): c is UnifiedCountry => !!c)
    const recent = recentIds
      .filter((id) => !pinnedIds.includes(id))
      .map((id) => flatById.get(id))
      .filter((c): c is UnifiedCountry => !!c)
      .slice(0, 5)
    return { pinned, recent }
  }, [hasFilterActive, unifiedCountries, pinnedIds, recentIds])

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
      (a, b) => getContinentOrder(a.name) - getContinentOrder(b.name),
    )
    const result: {
      continentId: string
      name: string
      countries: typeof filtered
    }[] = []
    for (const cont of orderedContinents) {
      const list = groups.get(cont.id)
      if (list?.length)
        result.push({ continentId: cont.id, name: cont.name, countries: list })
    }
    const unknownList = groups.get('__unknown__')
    if (unknownList?.length) {
      result.push({
        continentId: '__unknown__',
        name: '미분류',
        countries: unknownList,
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
      for (const c of group.countries) {
        const key = `${group.continentId}-${c.id}`
        indexMap.set(key, ids.length)
        ids.push(c.id)
      }
    }
    return {
      flatRowIds: ids,
      rowIndexByGroupCountry: indexMap,
    }
  }, [groupedWithQuickAccess, isGroupCollapsedById, hasFilterActive])

  const { handleListKeyDown, handleSearchKeyDown } = useListKeyboardNav({
    containerRef: listRef,
    rowIds: flatRowIds,
    onSelect,
  })

  // 선택된 국가가 변경되면 해당 행으로 자동 스크롤 (popover 모드 — sub-row 펼침 없음)
  useEffect(() => {
    if (!selectedId) return
    const t = setTimeout(() => {
      const element = document.getElementById(`country-${selectedId}`)
      if (element && listRef.current) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 80)
    return () => clearTimeout(t)
  }, [selectedId])

  const handleClearFilters = () => {
    onQueryChange('')
    onContinentFilterChange('')
    onCountryTypeFilterChange('all')
  }

  const handleAddPerson = () => setShowPersonRegisterModal(true)
  const handleAddHistorical = () => onAddHistorical?.()

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
        <S.ListPane $collapsed={collapsed}>
          {!collapsed && (
            <>
              <SidebarHeader
                title="국가 목록"
                count={
                  hasFilterActive && filtered.length !== unifiedCountries.length
                    ? `${filtered.length}/${unifiedCountries.length}`
                    : unifiedCountries.length
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
                            {isLoading && unifiedCountries.length === 0 ? (
                              <CountryListSkeleton />
                            ) : filtered.length === 0 ? (
                              <CountryListEmpty
                                query={query}
                                continentFilter={continentFilter}
                                countryTypeFilter={countryTypeFilter}
                                onAdd={onAdd}
                              />
                            ) : (
                              groupedWithQuickAccess.map((group) => {
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
                              })
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
            <S.CollapsedRail aria-label="국가 목록 (접힘)">
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
      {childrenPopover && (
        <CountryListChildrenPopover
          parent={childrenPopover.parent}
          anchorEl={childrenPopover.anchorEl}
          selectedId={selectedId}
          accentColor={getContinentColor({
            continentId:
              (childrenPopover.parent as { continentId?: string | null })
                .continentId ?? null,
          })}
          onSelect={onSelect}
          onClose={() => setChildrenPopover(null)}
          onContextMenu={handleRowContextMenu}
        />
      )}
    </>
  )
}

export const CountryList = React.memo(CountryListInner)
