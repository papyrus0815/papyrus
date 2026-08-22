/**
 * 인물 목록 사이드바 — `/persons-timeline` 좌측.
 *
 * 국가 목록(CountryList)과 **같은 구조·조판**이다: 헤더(제목·개수·등록·접기) → 검색·필터 행 →
 * 그룹 아코디언(시대) → 인물 행, 행 클릭 시 우측 상세. 조판 스타일은 `@/shared/ui/sidebar-list`를
 * 국가 목록과 공유하므로, 목록 생김새를 바꿀 일이 생기면 그 공용 모듈에서 바꿀 것.
 *
 * 필터 상태는 인포그래픽과 같은 store(usePersonInfographicFilterStore)를 쓴다 —
 * 좌측 목록과 우측 인포그래픽이 항상 같은 집합을 보여줘야 하기 때문.
 * 셀렉트로 표현 못 하는 다중 스코프·영향력·생존은 '상세 필터'(SidebarSheet)로 넘긴다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiChevronRight, FiClock, FiStar, FiUsers } from 'react-icons/fi'

import { usePersonsInfographic } from '@/entities/person/api'
import * as S from '@/shared/ui/sidebar-list'
import { SidebarHeader } from '@/widgets/content-shell'
import {
  countActiveScopes,
  ERAS,
  filterPersons,
  makeSortFnWithPinned,
  REGIONS,
  useAdaptedPersons,
  usePersonInfographicFilterStore,
  usePersonQueryInput,
  type AdaptedPerson,
} from '@/widgets/person-infographic'

import { useRecentPersonsStore } from '../model/recent-persons.store'
import { PersonListEmpty } from './person-list-empty'
import { PersonListError } from './person-list-error'
import { PersonListFilters } from './person-list-filters'
import { PersonListRow } from './person-list-row'

const COLLAPSED_GROUPS_KEY = 'person-list-collapsed-groups'
const PINNED_GROUP = '__pinned__'
const RECENT_GROUP = '__recent__'

/** 빠른 접근 그룹 accent — 국가 목록의 특수 그룹 색과 같은 톤 */
const QUICK_ACCESS_COLOR: Record<string, string> = {
  [PINNED_GROUP]: '#eab308',
  [RECENT_GROUP]: '#06b6d4',
}

interface PersonGroup {
  groupId: string
  name: string
  accent: string
  persons: AdaptedPerson[]
  isQuickAccess?: boolean
}

interface PersonListProps {
  selectedId: string | null
  onSelect: (id: string) => void
  /** 새 인물 등록 모달 열기 */
  onAdd: () => void
  /** 상세 필터 패널(SidebarSheet) 열기 */
  onOpenAdvancedFilters: () => void
  /** 좌측 패널 접기 상태 */
  collapsed?: boolean
  /** 접기/펼치기 토글 핸들러 */
  onToggleCollapse?: () => void
}

function PersonListInner({
  selectedId,
  onSelect,
  onAdd,
  onOpenAdvancedFilters,
  collapsed = false,
  onToggleCollapse,
}: PersonListProps) {
  const { isLoading, isError, refetch } = usePersonsInfographic()
  const allPersons = useAdaptedPersons()

  const scopes = usePersonInfographicFilterStore((state) => state.scopes)
  const minInfluence = usePersonInfographicFilterStore(
    (state) => state.minInfluence,
  )
  const aliveFilter = usePersonInfographicFilterStore(
    (state) => state.aliveFilter,
  )
  const sort = usePersonInfographicFilterStore((state) => state.sort)
  const pinnedList = usePersonInfographicFilterStore((state) => state.pinned)
  const togglePin = usePersonInfographicFilterStore((state) => state.togglePin)
  const resetFilters = usePersonInfographicFilterStore(
    (state) => state.resetFilters,
  )
  const recentIds = useRecentPersonsStore((state) => state.recentIds)

  // 검색 입력은 로컬 즉시 반영 + 디바운스 커밋 — 우측 인포그래픽 검색창과 **같은 훅**을 쓴다.
  // (두 검색창이 각자 store 동기화 쌍을 들면 서로 되돌리며 무한 업데이트가 난다)
  const {
    input: searchInput,
    setInput: setSearchInput,
    query: committedQuery,
  } = usePersonQueryInput()

  const pinnedSet = useMemo(() => new Set(pinnedList), [pinnedList])

  // 필터 술어 정본은 filterPersons — 우측 인포그래픽과 같은 집합을 보장한다.
  const filtered = useMemo(
    () =>
      filterPersons(allPersons, {
        scopes,
        minInfluence,
        aliveFilter,
        query: committedQuery,
      }),
    [allPersons, scopes, minInfluence, aliveFilter, committedQuery],
  )

  const hasActiveFilter =
    countActiveScopes(scopes) > 0 ||
    minInfluence > 0 ||
    aliveFilter !== 'all' ||
    !!committedQuery.trim()

  // 셀렉트(시대·지역)로 드러나지 않는 필터 — '상세 필터' 배지 카운트
  const advancedActiveCount =
    scopes.field.length +
    scopes.country.length +
    (minInfluence > 0 ? 1 : 0) +
    (aliveFilter !== 'all' ? 1 : 0)

  // 지역 셀렉트 옵션 — 데이터에 실제로 존재하는 지역만, REGIONS 상수 순서로.
  const regionOptions = useMemo(() => {
    const present = new Set(allPersons.map((person) => person.region))
    const known = REGIONS.filter((region) => present.has(region))
    const unknown = [...present]
      .filter((region) => !REGIONS.includes(region))
      .sort((left, right) => left.localeCompare(right, 'ko'))
    return [...known, ...unknown]
  }, [allPersons])

  // ── 그룹 접힘 ───────────────────────────────────────────────────────────────
  // 'all' sentinel — 첫 진입(localStorage 없음) 시. 데이터 로드 전에도 전 그룹 collapsed로
  // 렌더 → 깜빡임 없음. 사용자가 토글하면 'all' → 실제 Set으로 materialize.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string> | 'all'>(
    () => {
      try {
        const saved = localStorage.getItem(COLLAPSED_GROUPS_KEY)
        return saved ? new Set(JSON.parse(saved) as string[]) : 'all'
      } catch {
        return 'all'
      }
    },
  )
  const isGroupCollapsedById = useCallback(
    (groupId: string): boolean => {
      // 핀/최근은 'all'이어도 펼침 유지
      if (groupId === PINNED_GROUP || groupId === RECENT_GROUP) {
        return collapsedGroups !== 'all' && collapsedGroups.has(groupId)
      }
      if (collapsedGroups === 'all') return true
      return collapsedGroups.has(groupId)
    },
    [collapsedGroups],
  )
  const materializeCollapsed = useCallback(
    (previous: Set<string> | 'all'): Set<string> => {
      if (previous !== 'all') return new Set(previous)
      return new Set<string>(ERAS.map((era) => era.key))
    },
    [],
  )
  const toggleGroup = useCallback(
    (groupId: string) => {
      setCollapsedGroups((previous) => {
        const base = materializeCollapsed(previous)
        if (base.has(groupId)) base.delete(groupId)
        else base.add(groupId)
        try {
          localStorage.setItem(
            COLLAPSED_GROUPS_KEY,
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
  // 선택 인물의 그룹만 임시로 펼침 — localStorage에 기록하지 않아 '기본 접힘' 의도를 보존.
  const expandGroupForSelection = useCallback(
    (groupId: string) => {
      setCollapsedGroups((previous) => {
        if (previous !== 'all' && !previous.has(groupId)) return previous
        const base = materializeCollapsed(previous)
        base.delete(groupId)
        return base
      })
    },
    [materializeCollapsed],
  )

  // ── 그룹 구성 ───────────────────────────────────────────────────────────────
  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinnedSet, sort),
    [pinnedSet, sort],
  )

  const personsById = useMemo(() => {
    const map = new Map<string, AdaptedPerson>()
    for (const person of allPersons) map.set(person.id, person)
    return map
  }, [allPersons])

  // 시대 그룹 — 최신 시대 먼저(당대 → 고대). 빈 시대는 렌더하지 않는다.
  const eraGroups = useMemo<PersonGroup[]>(() => {
    const byEra = new Map<string, AdaptedPerson[]>()
    for (const person of filtered) {
      const list = byEra.get(person.era.key)
      if (list) list.push(person)
      else byEra.set(person.era.key, [person])
    }
    const result: PersonGroup[] = []
    for (let index = ERAS.length - 1; index >= 0; index -= 1) {
      const era = ERAS[index]
      const list = byEra.get(era.key)
      if (!list?.length) continue
      result.push({
        groupId: era.key,
        name: era.lbl,
        accent: era.color,
        persons: [...list].sort(sortFn),
      })
      byEra.delete(era.key)
    }
    // never-drop — ERAS에 없는 시대 키가 생기더라도 인물이 조용히 사라지지 않게 흡수
    const leftover: AdaptedPerson[] = []
    for (const list of byEra.values()) leftover.push(...list)
    if (leftover.length > 0) {
      result.push({
        groupId: '__unknown__',
        name: '미분류',
        accent: '#a1a1aa',
        persons: leftover.sort(sortFn),
      })
    }
    return result
  }, [filtered, sortFn])

  // 핀·최근 빠른 접근 — 필터/검색 활성 시엔 숨김(국가 목록과 같은 규약)
  const groupsWithQuickAccess = useMemo<PersonGroup[]>(() => {
    if (hasActiveFilter) return eraGroups
    const extra: PersonGroup[] = []
    const pinnedPersons = pinnedList
      .map((id) => personsById.get(id))
      .filter((person): person is AdaptedPerson => !!person)
    if (pinnedPersons.length > 0) {
      extra.push({
        groupId: PINNED_GROUP,
        name: '고정',
        accent: QUICK_ACCESS_COLOR[PINNED_GROUP],
        persons: pinnedPersons,
        isQuickAccess: true,
      })
    }
    const recentPersons = recentIds
      .filter((id) => !pinnedSet.has(id))
      .map((id) => personsById.get(id))
      .filter((person): person is AdaptedPerson => !!person)
      .slice(0, 5)
    if (recentPersons.length > 0) {
      extra.push({
        groupId: RECENT_GROUP,
        name: '최근',
        accent: QUICK_ACCESS_COLOR[RECENT_GROUP],
        persons: recentPersons,
        isQuickAccess: true,
      })
    }
    return extra.length > 0 ? [...extra, ...eraGroups] : eraGroups
  }, [hasActiveFilter, eraGroups, pinnedList, pinnedSet, recentIds, personsById])

  // ── 키보드 네비 ─────────────────────────────────────────────────────────────
  const listRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)

  // 검색·필터 활성 시엔 collapsedGroups를 무시하고 모두 평탄화 (결과가 숨겨지면 안 됨)
  const { flatRowIds, rowIndexByGroupPerson } = useMemo(() => {
    const ids: string[] = []
    const indexMap = new Map<string, number>()
    for (const group of groupsWithQuickAccess) {
      if (!hasActiveFilter && isGroupCollapsedById(group.groupId)) continue
      for (const person of group.persons) {
        indexMap.set(`${group.groupId}-${person.id}`, ids.length)
        ids.push(person.id)
      }
    }
    return { flatRowIds: ids, rowIndexByGroupPerson: indexMap }
  }, [groupsWithQuickAccess, hasActiveFilter, isGroupCollapsedById])

  // roving tabindex 단일 진입점 — 선택 행(첫 등장), 없으면 첫 행.
  const tabStopFlatIndex = useMemo(() => {
    if (flatRowIds.length === 0) return -1
    const selectedFlatIndex = selectedId ? flatRowIds.indexOf(selectedId) : -1
    return selectedFlatIndex >= 0 ? selectedFlatIndex : 0
  }, [flatRowIds, selectedId])

  const { handleListKeyDown, handleSearchKeyDown } = S.useListKeyboardNav({
    containerRef: listRef,
    rowIds: flatRowIds,
    onSelect,
  })

  // 접기/펼치기 토글 시 누른 버튼이 언마운트돼 포커스가 body로 유실되는 것 방지:
  // collapsed 전환 후 반대편 토글 버튼(aria-label로 조회)으로 포커스 이동.
  const collapsedDidMountRef = useRef(false)
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

  // 외부 진입(딥링크·상세 이동)으로 selectedId가 바뀌면 그 인물의 시대 그룹을 펼치고 스크롤.
  const selectedPerson = selectedId ? personsById.get(selectedId) : undefined
  useEffect(() => {
    if (!selectedId || !selectedPerson) return
    const targetGroupId = ERAS.some((era) => era.key === selectedPerson.era.key)
      ? selectedPerson.era.key
      : '__unknown__'
    expandGroupForSelection(targetGroupId)
    // 펼침 반영(재렌더) 후 스코프 한정 스크롤 — 전역 조회 대신 listRef 내부만.
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        listRef.current
          ?.querySelector<HTMLElement>(`#person-${CSS.escape(selectedId)}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    })
    return () => {
      cancelAnimationFrame(outerRaf)
      if (innerRaf) cancelAnimationFrame(innerRaf)
    }
  }, [selectedId, selectedPerson, expandGroupForSelection])

  // 헤더 카운트 — 분자(표시 수)가 분모(전체)와 다를 때만 분수로 노출해 '필터 중' 신호를 준다.
  const totalCount = allPersons.length
  const headerCount =
    filtered.length !== totalCount
      ? `${filtered.length}/${totalCount}`
      : totalCount

  // 검색·필터 결과 수 스크린리더 공지 — 타이핑 폭주를 피해 300ms 디바운스.
  const [liveMessage, setLiveMessage] = useState('')
  useEffect(() => {
    if (!hasActiveFilter) {
      setLiveMessage('')
      return
    }
    const timerId = setTimeout(() => {
      setLiveMessage(
        filtered.length === 0 ? '검색 결과 없음' : `인물 ${filtered.length}명`,
      )
    }, 300)
    return () => clearTimeout(timerId)
  }, [filtered.length, hasActiveFilter])

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    resetFilters()
  }, [resetFilters])

  const isInitialLoading = isLoading && allPersons.length === 0

  return (
    <S.ListPaneWrapper>
      <S.ListPane ref={paneRef} $collapsed={collapsed}>
        {!collapsed && (
          <>
            <SidebarHeader
              title="인물 목록"
              count={headerCount}
              countTitle={
                filtered.length !== totalCount
                  ? `표시 ${filtered.length} / 전체 ${totalCount}`
                  : undefined
              }
              action={
                <S.SidebarActionButton
                  type="button"
                  aria-label="인물 등록"
                  title="인물 등록"
                  onClick={onAdd}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                      fill="currentColor"
                    />
                  </svg>
                </S.SidebarActionButton>
              }
              onCollapse={onToggleCollapse}
            />

            <PersonListFilters
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              onSearchKeyDown={handleSearchKeyDown}
              regionOptions={regionOptions}
              onOpenAdvanced={onOpenAdvancedFilters}
              advancedActiveCount={advancedActiveCount}
              onClearFilters={handleClearFilters}
              hasActiveFilter={hasActiveFilter}
            />

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
                  <S.ListContainer>
                    <S.VirtualList
                      ref={listRef}
                      role="listbox"
                      aria-label="인물 목록"
                      tabIndex={-1}
                      onKeyDown={handleListKeyDown}
                    >
                      {isInitialLoading ? (
                        <S.SidebarListSkeleton label="인물 목록 로딩 중" />
                      ) : isError && filtered.length === 0 ? (
                        <PersonListError onRetry={() => void refetch()} />
                      ) : filtered.length === 0 ? (
                        <PersonListEmpty
                          query={committedQuery}
                          hasActiveFilter={hasActiveFilter}
                          onAdd={onAdd}
                        />
                      ) : (
                        groupsWithQuickAccess.map((group) => {
                          // 검색·필터 활성 시 collapsed 무시 (자동 펼침)
                          const isGroupCollapsed =
                            !hasActiveFilter &&
                            isGroupCollapsedById(group.groupId)
                          return (
                            <React.Fragment key={group.groupId}>
                              <S.GroupSectionHeader
                                type="button"
                                onClick={() => toggleGroup(group.groupId)}
                                aria-expanded={!isGroupCollapsed}
                                title={
                                  group.isQuickAccess
                                    ? '빠른 접근 — 시대별 목록은 아래 그룹에서'
                                    : undefined
                                }
                              >
                                <S.GroupCaret
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
                                </S.GroupCaret>
                                {group.groupId === PINNED_GROUP ? (
                                  <S.GroupLeadIcon
                                    aria-hidden
                                    style={{ color: group.accent }}
                                  >
                                    <FiStar size={10} />
                                  </S.GroupLeadIcon>
                                ) : group.groupId === RECENT_GROUP ? (
                                  <S.GroupLeadIcon
                                    aria-hidden
                                    style={{ color: group.accent }}
                                  >
                                    <FiClock size={10} />
                                  </S.GroupLeadIcon>
                                ) : (
                                  <S.GroupDot
                                    aria-hidden
                                    style={{ background: group.accent }}
                                  />
                                )}
                                <S.GroupTitle>{group.name}</S.GroupTitle>
                                <S.GroupCount>
                                  {group.persons.length}
                                </S.GroupCount>
                              </S.GroupSectionHeader>
                              {!isGroupCollapsed &&
                                group.persons.map((person) => {
                                  const baseIndex =
                                    rowIndexByGroupPerson.get(
                                      `${group.groupId}-${person.id}`,
                                    ) ?? 0
                                  return (
                                    <PersonListRow
                                      key={`${group.groupId}-${person.id}`}
                                      person={person}
                                      isQuickAccess={!!group.isQuickAccess}
                                      selectedId={selectedId}
                                      isTabStop={baseIndex === tabStopFlatIndex}
                                      pinned={pinnedSet.has(person.id)}
                                      accentColor={group.accent}
                                      rowIndex={baseIndex}
                                      onSelect={onSelect}
                                      onTogglePin={togglePin}
                                    />
                                  )
                                })}
                            </React.Fragment>
                          )
                        })
                      )}
                    </S.VirtualList>
                  </S.ListContainer>
                </motion.div>
              </AnimatePresence>
            </S.SidebarTabBody>
          </>
        )}
        {/* 접힘 상태 — 국가 목록과 동일하게 상단 rail에 펼치기 버튼 */}
        {collapsed && (
          <S.CollapsedRail role="group" aria-label="인물 목록 (접힘)">
            <S.CollapsedToggleBtn
              type="button"
              onClick={onToggleCollapse}
              title="패널 펼치기"
              aria-label="패널 펼치기"
            >
              <FiChevronRight size={16} />
            </S.CollapsedToggleBtn>
            <S.CollapsedHint aria-hidden>
              <FiUsers size={16} />
            </S.CollapsedHint>
          </S.CollapsedRail>
        )}
      </S.ListPane>
    </S.ListPaneWrapper>
  )
}

export const PersonList = React.memo(PersonListInner)
