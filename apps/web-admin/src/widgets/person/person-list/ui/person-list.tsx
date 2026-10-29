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
import { getUploadImageUrl } from '@/shared/api/upload'
import { HighlightedText } from '@/shared/ui/highlighted-text'
import {
  EntityListSidebar,
  type EntitySidebarGroup,
  type EntitySidebarItem,
  type EntitySidebarSelect,
} from '@/widgets/entity-list-sidebar'
import {
  computePersonFacetCounts,
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
  if (bornText === '?' && diedText === '?') {
    return person.activityYear != null
      ? `${formatYear(Math.round(person.activityYear))}경`
      : ''
  }
  return `${bornText}–${diedText}`
}

function toSidebarItem(
  person: AdaptedPerson,
  groupId: string,
  trimmedQuery = '',
): EntitySidebarItem {
  const searching = trimmedQuery.length > 0
  const loweredQuery = trimmedQuery.toLowerCase()
  const highlight = (text: string) => (
    <HighlightedText text={text} query={trimmedQuery} />
  )
  const country =
    person.country && person.country !== '미상' ? person.country : null
  const faction = person.faction?.trim() || null
  const showFaction =
    !!faction &&
    (!person.primaryTitle ||
      (searching && faction.toLowerCase().includes(loweredQuery)))
  const showField =
    searching &&
    !!person.field &&
    person.field.toLowerCase().includes(loweredQuery)

  return {
    id: person.id,
    name: person.name,
    nameNode: searching ? highlight(person.name) : undefined,
    meta: [
      country
        ? {
            text: country,
            shrink: true,
            node: searching ? highlight(country) : undefined,
          }
        : null,
      lifespanText(person),
      person.primaryTitle
        ? {
            text: person.primaryTitle,
            shrink: true,
            node: searching ? highlight(person.primaryTitle) : undefined,
          }
        : null,
      showFaction && faction
        ? {
            text: faction,
            shrink: true,
            node: searching ? highlight(faction) : undefined,
          }
        : null,
      showField
        ? {
            text: person.field,
            node: highlight(person.field),
          }
        : null,
    ],
    thumbnailUrl: person.profileImageUrl
      ? getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl
      : null,
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
  const toggleScope = usePersonInfographicFilterStore(
    (state) => state.toggleScope,
  )
  const minInfluence = usePersonInfographicFilterStore(
    (state) => state.minInfluence,
  )
  const setMinInfluence = usePersonInfographicFilterStore(
    (state) => state.setMinInfluence,
  )
  const aliveFilter = usePersonInfographicFilterStore(
    (state) => state.aliveFilter,
  )
  const setAliveFilter = usePersonInfographicFilterStore(
    (state) => state.setAliveFilter,
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

  const trimmedQuery = committedQuery.trim()
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

  const facetCounts = useMemo(
    () =>
      computePersonFacetCounts(allPersons, {
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
    !!trimmedQuery

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

  const selectedPerson = useMemo(
    () => (selectedId ? (personsById.get(selectedId) ?? null) : null),
    [selectedId, personsById],
  )

  // 시대 그룹 — 최신 시대 먼저(당대 → 고대), 마지막에 연도 미상. 빈 시대는 EntityListSidebar가 안 그린다.
  // 첫 번째 시대 그룹(당대)은 기본 펼침(alwaysExpanded)으로 두어 첫 진입 시 빈 벽처럼 보이지 않게 한다.
  const eraGroups = useMemo<EntitySidebarGroup[]>(
    () => [
      ...[...ERAS]
        .reverse()
        .map((era, index) => ({
          id: era.key,
          name: era.lbl,
          accent: era.color,
          alwaysExpanded: index === 0,
        })),
      { id: 'unknown', name: '연도 미상', accent: '#64748b' },
    ],
    [],
  )

  // 핀·최근은 필터/검색 활성 시 숨긴다 (국가 목록과 같은 규약)
  // 현재 보고 있는 인물(selectedId)은 '최근'에서 제외해 상단 중복 표시와 하이라이트 분산을 막는다.
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
    if (
      recentIds.some(
        (id) =>
          id !== selectedId && !pinnedSet.has(id) && personsById.has(id),
      )
    ) {
      extra.push({
        id: RECENT_GROUP,
        name: '최근',
        accent: '#06b6d4',
        leadIcon: <FiClock size={10} />,
        isQuickAccess: true,
      })
    }
    return extra
  }, [hasActiveFilter, pinnedList, recentIds, selectedId, pinnedSet, personsById])

  const groups = useMemo(
    () => [...quickAccessGroups, ...eraGroups],
    [quickAccessGroups, eraGroups],
  )

  const items = useMemo<EntitySidebarItem[]>(() => {
    const rows: EntitySidebarItem[] = []
    if (!hasActiveFilter) {
      for (const id of pinnedList) {
        const person = personsById.get(id)
        if (person) rows.push(toSidebarItem(person, PINNED_GROUP, trimmedQuery))
      }
      const recents = recentIds
        .filter((id) => id !== selectedId && !pinnedSet.has(id))
        .map((id) => personsById.get(id))
        .filter((person): person is AdaptedPerson => !!person)
        .slice(0, 5)
      for (const person of recents) {
        rows.push(toSidebarItem(person, RECENT_GROUP, trimmedQuery))
      }
    }
    for (const person of [...filtered].sort(sortFn)) {
      rows.push(toSidebarItem(person, person.era.key, trimmedQuery))
    }
    return rows
  }, [
    hasActiveFilter,
    pinnedList,
    recentIds,
    selectedId,
    pinnedSet,
    personsById,
    filtered,
    sortFn,
    trimmedQuery,
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
        ERAS.map((era) => ({
          value: era.key,
          label: `${era.lbl} (${facetCounts.era[era.key] ?? 0})`,
        })),
      ),
      scopeSelect(
        'region',
        '지역',
        regionOptions.map((region) => ({
          value: region,
          label: `${region} (${facetCounts.region[region] ?? 0})`,
        })),
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
    [scopeSelect, regionOptions, facetCounts, sort, setSort],
  )

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    resetFilters()
  }, [resetFilters, setSearchInput])

  const selectedCountry =
    selectedPerson?.country && selectedPerson.country !== '미상'
      ? selectedPerson.country
      : null
  const isSameCountryActive =
    !!selectedCountry &&
    scopes.country.length === 1 &&
    scopes.country[0] === selectedCountry

  const selectedFaction = selectedPerson?.faction ?? null
  const isSameFactionActive =
    !!selectedFaction &&
    trimmedQuery.toLowerCase() === selectedFaction.toLowerCase()

  return (
    <EntityListSidebar
      title="인물 목록"
      noun="인물"
      countUnit="명"
      domainKey="person"
      items={items}
      totalCount={allPersons.length}
      groups={groups}
      selectedId={selectedId}
      onSelect={onSelect}
      query={searchInput}
      onQueryChange={setSearchInput}
      searchPlaceholder="이름·국가·왕조·직함 검색..."
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
          {selectedCountry && (
            <PersonStyles.ContextFilterChip
              type="button"
              $active={isSameCountryActive}
              aria-pressed={isSameCountryActive}
              onClick={() =>
                setScopeValues(
                  'country',
                  isSameCountryActive ? [] : [selectedCountry],
                )
              }
              title={`현재 인물과 같은 국가(${selectedCountry})만 보기`}
            >
              같은 국가: {selectedCountry}
            </PersonStyles.ContextFilterChip>
          )}
          {selectedFaction && (
            <PersonStyles.ContextFilterChip
              type="button"
              $active={isSameFactionActive}
              aria-pressed={isSameFactionActive}
              onClick={() =>
                setSearchInput(isSameFactionActive ? '' : selectedFaction)
              }
              title={`현재 인물과 같은 왕조·계보(${selectedFaction}) 검색`}
            >
              같은 왕조: {selectedFaction}
            </PersonStyles.ContextFilterChip>
          )}
          {scopes.country
            .filter(
              (country) => !(isSameCountryActive && country === selectedCountry),
            )
            .map((country) => (
              <PersonStyles.ActiveFilterChip
                key={`country-${country}`}
                type="button"
                onClick={() => toggleScope('country', country)}
                title={`국가 필터 '${country}' 해제`}
              >
                {country} <span aria-hidden>×</span>
              </PersonStyles.ActiveFilterChip>
            ))}
          {scopes.field.map((field) => (
            <PersonStyles.ActiveFilterChip
              key={`field-${field}`}
              type="button"
              onClick={() => toggleScope('field', field)}
              title={`분야 필터 '${field}' 해제`}
            >
              {field} <span aria-hidden>×</span>
            </PersonStyles.ActiveFilterChip>
          ))}
          {minInfluence > 0 && (
            <PersonStyles.ActiveFilterChip
              type="button"
              onClick={() => setMinInfluence(0)}
              title="최소 영향력 필터 해제"
            >
              영향력 {minInfluence}+ <span aria-hidden>×</span>
            </PersonStyles.ActiveFilterChip>
          )}
          {aliveFilter !== 'all' && (
            <PersonStyles.ActiveFilterChip
              type="button"
              onClick={() => setAliveFilter('all')}
              title="생존 여부 필터 해제"
            >
              {aliveFilter === 'alive' ? '생존' : '사망'}{' '}
              <span aria-hidden>×</span>
            </PersonStyles.ActiveFilterChip>
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
