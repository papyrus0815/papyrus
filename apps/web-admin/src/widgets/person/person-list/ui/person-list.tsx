/**
 * 인물 목록 사이드바 — `/persons-timeline` 좌측.
 *
 * 목록 UI 자체는 공용 EntityListSidebar가 담당하고, 여기서는 인물 도메인만 다룬다:
 * 시대(ERAS) 그룹핑 · 고정/최근 · 시대·지역·정렬 셀렉트 · 상세 필터 유도 배지.
 *
 * 필터 상태는 인포그래픽과 같은 store를 쓴다 — 좌측 목록과 우측 인포그래픽이 항상 같은
 * 집합을 보여줘야 하기 때문. 셀렉트로 표현 못 하는 다중 스코프·영향력·생존은 '상세 필터'
 * (SidebarSheet)로 넘긴다.
 */
import React, { useCallback, useMemo } from 'react'

import { FaChessKing, FaStar } from 'react-icons/fa'
import { FiClock, FiStar, FiUsers } from 'react-icons/fi'

import { usePersonsInfographic } from '@/entities/person/api'
import {
  EntityListSidebar,
  type EntitySidebarGroup,
  type EntitySidebarItem,
  type EntitySidebarSelect,
} from '@/widgets/entity-list-sidebar'
import {
  countActiveScopes,
  ERAS,
  filterPersons,
  formatYear,
  makeSortFnWithPinned,
  REGIONS,
  SORT_OPTIONS,
  useAdaptedPersons,
  usePersonInfographicFilterStore,
  usePersonQueryInput,
  type AdaptedPerson,
  type PersonSortKey,
} from '@/widgets/person-infographic'

import { useRecentPersonsStore } from '../model/recent-persons.store'
import * as PersonStyles from './person-list.styles'

const PINNED_GROUP = '__pinned__'
const RECENT_GROUP = '__recent__'
/** 2개 이상 선택된 카테고리를 셀렉트에 표시하기 위한 sentinel */
const MULTI = '__multi__'

/** 생몰 표기 — BC는 formatYear가 '44BC'로 처리. 생존자는 '현재'. */
function lifespanText(person: AdaptedPerson): string {
  const bornText = person.born == null ? '?' : formatYear(person.born)
  const diedText = person.isAlive
    ? '현재'
    : person.died == null
      ? '?'
      : formatYear(person.died)
  if (bornText === '?' && diedText === '?') return ''
  return `${bornText}–${diedText}`
}

function toSidebarItem(
  person: AdaptedPerson,
  groupId: string,
): EntitySidebarItem {
  return {
    id: person.id,
    name: person.name,
    meta: [
      person.country && person.country !== '미상' ? person.country : null,
      lifespanText(person),
      person.primaryTitle,
    ],
    thumbnailUrl: person.profileImageUrl,
    // 영향력 0은 미상이라 배지를 그리지 않는다 — 대부분의 행에 0이 붙어 읽을 값이 있는
    // 행을 오히려 가렸다 (EntitySidebarRow가 0을 비표시로 처리)
    metric: person.influence,
    searchText: person.searchText,
    mark:
      person.isMonarch || person.isHeadOfState ? (
        <PersonStyles.RoleMark
          aria-hidden
          title={person.isMonarch ? '군주' : '국가원수'}
          style={{ color: person.isMonarch ? '#b45309' : '#1d4ed8' }}
        >
          {person.isMonarch ? <FaChessKing size={9} /> : <FaStar size={9} />}
        </PersonStyles.RoleMark>
      ) : undefined,
    groupId,
  }
}

interface PersonListProps {
  selectedId: string | null
  onSelect: (id: string) => void
  /** 새 인물 등록 모달 열기 */
  onAdd: () => void
  /** 상세 필터 패널(SidebarSheet) 열기 */
  onOpenAdvancedFilters: () => void
  collapsed?: boolean
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
  const setScopeValues = usePersonInfographicFilterStore(
    (state) => state.setScopeValues,
  )
  const minInfluence = usePersonInfographicFilterStore(
    (state) => state.minInfluence,
  )
  const aliveFilter = usePersonInfographicFilterStore(
    (state) => state.aliveFilter,
  )
  const sort = usePersonInfographicFilterStore((state) => state.sort)
  const setSort = usePersonInfographicFilterStore((state) => state.setSort)
  const pinnedList = usePersonInfographicFilterStore((state) => state.pinned)
  const togglePin = usePersonInfographicFilterStore((state) => state.togglePin)
  const resetFilters = usePersonInfographicFilterStore(
    (state) => state.resetFilters,
  )
  const recentIds = useRecentPersonsStore((state) => state.recentIds)

  // 검색 입력은 우측 인포그래픽 검색창과 **같은 훅**을 쓴다.
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

  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinnedSet, sort),
    [pinnedSet, sort],
  )

  const personsById = useMemo(() => {
    const map = new Map<string, AdaptedPerson>()
    for (const person of allPersons) map.set(person.id, person)
    return map
  }, [allPersons])

  // 시대 그룹 — 최신 시대 먼저(당대 → 고대). 빈 시대는 EntityListSidebar가 안 그린다.
  const eraGroups = useMemo<EntitySidebarGroup[]>(
    () =>
      [...ERAS]
        .reverse()
        .map((era) => ({ id: era.key, name: era.lbl, accent: era.color })),
    [],
  )

  // 핀·최근은 필터/검색 활성 시 숨긴다 (국가 목록과 같은 규약)
  const quickAccessGroups = useMemo<EntitySidebarGroup[]>(() => {
    if (hasActiveFilter) return []
    const extra: EntitySidebarGroup[] = []
    if (pinnedList.some((id) => personsById.has(id))) {
      extra.push({
        id: PINNED_GROUP,
        name: '고정',
        accent: '#eab308',
        leadIcon: <FiStar size={10} />,
        isQuickAccess: true,
      })
    }
    if (recentIds.some((id) => !pinnedSet.has(id) && personsById.has(id))) {
      extra.push({
        id: RECENT_GROUP,
        name: '최근',
        accent: '#06b6d4',
        leadIcon: <FiClock size={10} />,
        isQuickAccess: true,
      })
    }
    return extra
  }, [hasActiveFilter, pinnedList, recentIds, pinnedSet, personsById])

  const groups = useMemo(
    () => [...quickAccessGroups, ...eraGroups],
    [quickAccessGroups, eraGroups],
  )

  const items = useMemo<EntitySidebarItem[]>(() => {
    const rows: EntitySidebarItem[] = []
    if (!hasActiveFilter) {
      for (const id of pinnedList) {
        const person = personsById.get(id)
        if (person) rows.push(toSidebarItem(person, PINNED_GROUP))
      }
      const recents = recentIds
        .filter((id) => !pinnedSet.has(id))
        .map((id) => personsById.get(id))
        .filter((person): person is AdaptedPerson => !!person)
        .slice(0, 5)
      for (const person of recents) {
        rows.push(toSidebarItem(person, RECENT_GROUP))
      }
    }
    for (const person of [...filtered].sort(sortFn)) {
      rows.push(toSidebarItem(person, person.era.key))
    }
    return rows
  }, [
    hasActiveFilter,
    pinnedList,
    recentIds,
    pinnedSet,
    personsById,
    filtered,
    sortFn,
  ])

  // 지역 셀렉트 옵션 — 데이터에 실제로 존재하는 지역만, REGIONS 상수 순서로.
  const regionOptions = useMemo(() => {
    const present = new Set(allPersons.map((person) => person.region))
    const known = REGIONS.filter((region) => present.has(region))
    const unknown = [...present]
      .filter((region) => !REGIONS.includes(region))
      .sort((left, right) => left.localeCompare(right, 'ko'))
    return [...known, ...unknown]
  }, [allPersons])

  // 셀렉트는 단일 선택이지만 store의 scope는 다중이다(상세 필터에서 여러 개 선택 가능).
  // 2개 이상이면 요약 옵션을 보여주고, 그걸 고르면 아무 일도 하지 않는다 —
  // 셀렉트가 다중 상태를 조용히 지우지 않게.
  const selectValue = (values: string[]) =>
    values.length === 0 ? '' : values.length === 1 ? values[0] : MULTI

  const scopeSelect = useCallback(
    (kind: 'era' | 'region', label: string, options: { value: string; label: string }[]) =>
      ({
        id: kind,
        label,
        value: selectValue(scopes[kind]),
        active: scopes[kind].length > 0,
        options: [
          { value: '', label: `${label} 전체` },
          ...(scopes[kind].length > 1
            ? [{ value: MULTI, label: `${label} ${scopes[kind].length}개` }]
            : []),
          ...options,
        ],
        onChange: (next: string) => {
          if (next === MULTI) return
          setScopeValues(kind, next ? [next] : [])
        },
      }) satisfies EntitySidebarSelect,
    [scopes, setScopeValues],
  )

  const selects = useMemo<EntitySidebarSelect[]>(
    () => [
      scopeSelect(
        'era',
        '시대',
        ERAS.map((era) => ({ value: era.key, label: era.lbl })),
      ),
      scopeSelect(
        'region',
        '지역',
        regionOptions.map((region) => ({ value: region, label: region })),
      ),
      {
        id: 'sort',
        label: '정렬',
        value: sort,
        active: false,
        options: SORT_OPTIONS.map(([key, label]) => ({
          value: key,
          label: `${label}순`,
        })),
        onChange: (next) => setSort(next as PersonSortKey),
      },
    ],
    [scopeSelect, regionOptions, sort, setSort],
  )

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    resetFilters()
  }, [resetFilters, setSearchInput])

  return (
    <EntityListSidebar
      title="인물 목록"
      noun="인물"
      domainKey="person"
      items={items}
      totalCount={allPersons.length}
      groups={groups}
      selectedId={selectedId}
      onSelect={onSelect}
      query={searchInput}
      onQueryChange={setSearchInput}
      selects={selects}
      hasActiveFilter={hasActiveFilter}
      onClearFilters={handleClearFilters}
      discovery={
        <PersonStyles.DiscoveryRow>
          <PersonStyles.AdvancedFilterBadge
            type="button"
            onClick={onOpenAdvancedFilters}
            title="분야·국가 다중 선택, 영향력, 생존 여부"
          >
            상세 필터
            {advancedActiveCount > 0 && (
              <PersonStyles.BadgeCount>
                {advancedActiveCount}
              </PersonStyles.BadgeCount>
            )}
          </PersonStyles.AdvancedFilterBadge>
          {advancedActiveCount > 0 && (
            <PersonStyles.ActiveAdvancedHint title="셀렉트에 드러나지 않는 필터가 적용 중입니다">
              적용 중 {advancedActiveCount}
            </PersonStyles.ActiveAdvancedHint>
          )}
        </PersonStyles.DiscoveryRow>
      }
      pinnedIds={pinnedList}
      onTogglePin={togglePin}
      onAdd={onAdd}
      addLabel="인물 등록"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedIcon={<FiUsers size={16} />}
    />
  )
}

export const PersonList = React.memo(PersonListInner)
