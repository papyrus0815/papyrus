/**
 * VIEW: 목록 (구 세기별·왕조 통합) — 그룹핑 기준(세기별·국가별·분야별·가문별·전체) 및
 * 표시 밀도(카드 격자·컴팩트 행)를 지원하는 통합 인물 카탈로그 뷰.
 *
 * - 세기별(century): 1750 → 18세기, BC 50 → 기원전 1세기 자동 분할 + 공백 세기 표시
 * - 국가별(country): 소속 국가별 그룹핑 (인원순) + 활동 연도 범위
 * - 분야별(field)  : 정치·군사·사상·과학·예술·기타 그룹핑
 * - 가문별(dynasty): 구 왕조 뷰 흡수 — 가문(faction)별 그룹핑 + 대표 국가·존속 범위
 * - 전체(none)     : 그룹 구분 없이 전체 인물을 활성 정렬 기준으로 평탄 탐색
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiChevronsDown, FiChevronsUp } from 'react-icons/fi'
import styled from 'styled-components'

import type { AdaptedPerson } from '../model/types'
import { bornForPlot, diedForPlot } from '../model/adapt'
import {
  centuryOf,
  compareCenturyMeta,
  formatYear,
  type CenturyMeta,
} from '../model/century'
import { FIELDS, INFOGRAPHIC_DEFAULTS } from '../model/constants'
import {
  usePersonInfographicFilterStore,
  useHasActiveFilter,
  type PersonSortKey,
} from '../model/filter.store'
import { makeSortFnWithPinned } from '../model/sort-helpers'

import { BRAND, hairline, metaText, MOTION_FAST, surface } from './_shared/catalog.styles'
import { EmptyState } from './_shared/empty-state'
import {
  GapMarker,
  GroupPanel,
  GroupSection,
  MoreBtn,
} from './_shared/group-section'
import {
  EraCardGrid,
  PersonCardItem,
  PersonRowItem,
  PersonRowList,
  PersonRowListHeader,
} from './_shared/person-card'
import { PinnedPeopleSection } from './_shared/pinned-people-section'

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  query: string
  pinned: Set<string>
  selectedPersonId?: string | null
  togglePin: (id: string, e: React.MouseEvent) => void
}

interface UnifiedGroup {
  /** 고유 섹션 ID (`person-group-${id}`) */
  id: string
  /** 접기/더보기 상태 키 */
  stateKey: string
  label: string
  range?: string
  marker?: string
  tone?: 'primary' | 'muted'
  /** 세기별 뷰 전용 — 공백 세기 계산용 메타 */
  centuryMeta?: CenturyMeta
  arr: AdaptedPerson[]
}

/** 레일 구슬 표지 — '20세기'→'20', '기원전 5세기'→'BC5', 연도 미상→'?' */
const centuryMarker = (meta: CenturyMeta) => {
  if (meta.key === 'unknown') return '?'
  const ordinal = Math.abs(meta.sortKey)
  return meta.sortKey < 0 ? `BC${ordinal}` : `${ordinal}`
}

const centuryIndex = (meta: CenturyMeta) =>
  meta.sortKey < 0 ? meta.sortKey + 1 : meta.sortKey

/** 출생연도 미상 인물 전용 그룹 — 항상 맨 끝(sortKey=+∞). */
const UNKNOWN_CENTURY: CenturyMeta = {
  key: 'unknown',
  label: '연도 미상',
  from: 0,
  to: 0,
  sortKey: Number.POSITIVE_INFINITY,
}

const NO_FACTION_KEY = '__none__'
const NO_COUNTRY_KEY = '__country_unknown__'
const FLAT_PAGE_SIZE = 60
const INDEX_COLLAPSED_LIMIT = 14

function computeYearSpanText(arr: AdaptedPerson[]): string | undefined {
  let minYr = Infinity
  let maxYr = -Infinity
  for (const p of arr) {
    if (p.activityYear == null && p.born == null && p.died == null) continue
    const bornY = bornForPlot(p)
    const diedY = diedForPlot(p)
    if (bornY < minYr) minYr = bornY
    if (diedY > maxYr) maxYr = diedY
  }
  if (!Number.isFinite(minYr) || !Number.isFinite(maxYr)) return undefined
  return `${formatYear(Math.round(minYr))}–${formatYear(Math.round(maxYr))}`
}

function pickTopLabel(arr: AdaptedPerson[], getter: (p: AdaptedPerson) => string): string {
  const counts: Record<string, number> = {}
  for (const p of arr) {
    const v = getter(p)?.trim()
    if (!v || v === '미상' || v === '기타') continue
    counts[v] = (counts[v] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

export function EraStoryView({
  people,
  onOpen,
  query,
  pinned,
  selectedPersonId,
  togglePin,
}: Props) {
  const sort = usePersonInfographicFilterStore((state) => state.sort)
  const setSort = usePersonInfographicFilterStore((state) => state.setSort)
  const groupBy = usePersonInfographicFilterStore((state) => state.groupBy)
  const listLayout = usePersonInfographicFilterStore((state) => state.listLayout)
  const eraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.eraGroupOrder,
  )
  const setEraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.setEraGroupOrder,
  )
  const resetFilters = usePersonInfographicFilterStore((state) => state.resetFilters)
  const hasFilter = useHasActiveFilter()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [indexExpanded, setIndexExpanded] = useState(false)
  const [flatLimit, setFlatLimit] = useState(FLAT_PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const reversePersonSort =
    groupBy === 'century'
      ? (sort === 'year' || sort === 'deathYear') && eraGroupOrder === 'asc'
      : eraGroupOrder === 'asc'

  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinned, sort, reversePersonSort),
    [pinned, sort, reversePersonSort],
  )

  const handleHeaderSortSelect = useCallback(
    (nextKey: PersonSortKey) => {
      if (sort === nextKey) {
        setEraGroupOrder(eraGroupOrder === 'desc' ? 'asc' : 'desc')
      } else {
        setSort(nextKey)
      }
    },
    [sort, eraGroupOrder, setSort, setEraGroupOrder],
  )

  // 핀 인물은 그룹과 무관하게 상단 고정 섹션에서만 표시(그룹에서는 제외해 중복 방지).
  const pinnedPeople = useMemo(
    () => people.filter((person) => pinned.has(person.id)).sort(sortFn),
    [people, pinned, sortFn],
  )

  const unpinnedPeople = useMemo(
    () => people.filter((person) => !pinned.has(person.id)),
    [people, pinned],
  )

  const sortedFlatPeople = useMemo(
    () => (groupBy === 'none' ? unpinnedPeople.slice().sort(sortFn) : []),
    [groupBy, unpinnedPeople, sortFn],
  )

  const sortedGroups: UnifiedGroup[] = useMemo(() => {
    if (groupBy === 'none') return []

    if (groupBy === 'century') {
      const map: Record<string, { meta: CenturyMeta; arr: AdaptedPerson[] }> = {}
      for (const person of unpinnedPeople) {
        // 출생연도가 세기 말(예: 세종 1397년생, 김유신 595년생)이어도 실제 활약 세기(15세기·7세기)에
        // 배치되고, 상단 시대 필터 토글 전후로 소속 세기가 점프하지 않도록 활동연도를 우선 사용한다.
        const yearForCentury = person.activityYear ?? person.born ?? person.died
        const meta =
          yearForCentury == null
            ? UNKNOWN_CENTURY
            : centuryOf(Math.round(yearForCentury))
        if (!map[meta.key]) map[meta.key] = { meta, arr: [] }
        map[meta.key].arr.push(person)
      }
      return Object.values(map)
        .sort((a, b) => compareCenturyMeta(a.meta, b.meta, eraGroupOrder))
        .map(({ meta, arr }) => {
          const isUnknown = meta.key === 'unknown'
          return {
            id: meta.key,
            stateKey: `century:${meta.key}`,
            label: meta.label,
            range: isUnknown
              ? undefined
              : `${formatYear(meta.from)}–${formatYear(meta.to)}`,
            marker: centuryMarker(meta),
            tone: isUnknown ? 'muted' : 'primary',
            centuryMeta: meta,
            arr: arr.slice().sort(sortFn),
          }
        })
    }

    if (groupBy === 'dynasty') {
      const byFaction: Record<string, AdaptedPerson[]> = {}
      const without: AdaptedPerson[] = []
      for (const person of unpinnedPeople) {
        if (person.faction) {
          ;(byFaction[person.faction] = byFaction[person.faction] || []).push(person)
        } else {
          without.push(person)
        }
      }
      const out: UnifiedGroup[] = Object.entries(byFaction)
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'ko'))
        .map(([faction, arr]) => {
          const countryName = pickTopLabel(arr, (p) => p.country)
          const spanText = computeYearSpanText(arr)
          const range =
            countryName && spanText
              ? `${countryName} · ${spanText}`
              : countryName || spanText
          return {
            id: `dynasty-${faction}`,
            stateKey: `dynasty:${faction}`,
            label: faction,
            range,
            tone: 'primary',
            arr: arr.slice().sort(sortFn),
          }
        })
      if (without.length > 0) {
        out.push({
          id: 'dynasty-none',
          stateKey: `dynasty:${NO_FACTION_KEY}`,
          label: '소속 없음',
          tone: 'muted',
          arr: without.slice().sort(sortFn),
        })
      }
      return out
    }

    if (groupBy === 'country') {
      const byCountry: Record<string, AdaptedPerson[]> = {}
      const unknown: AdaptedPerson[] = []
      for (const person of unpinnedPeople) {
        const c = person.country?.trim()
        if (!c || c === '미상') {
          unknown.push(person)
        } else {
          ;(byCountry[c] = byCountry[c] || []).push(person)
        }
      }
      const out: UnifiedGroup[] = Object.entries(byCountry)
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'ko'))
        .map(([country, arr]) => {
          const regionName = pickTopLabel(arr, (p) => p.region)
          const spanText = computeYearSpanText(arr)
          const range =
            regionName && spanText
              ? `${regionName} · ${spanText}`
              : regionName || spanText
          return {
            id: `country-${country}`,
            stateKey: `country:${country}`,
            label: country,
            range,
            tone: 'primary',
            arr: arr.slice().sort(sortFn),
          }
        })
      if (unknown.length > 0) {
        out.push({
          id: 'country-unknown',
          stateKey: `country:${NO_COUNTRY_KEY}`,
          label: '국가 미상',
          tone: 'muted',
          arr: unknown.slice().sort(sortFn),
        })
      }
      return out
    }

    // groupBy === 'field'
    const byField: Record<string, AdaptedPerson[]> = {}
    for (const person of unpinnedPeople) {
      const f = person.field || '기타'
      ;(byField[f] = byField[f] || []).push(person)
    }
    const orderedFields = [
      ...FIELDS.filter((f) => f !== '기타' && (byField[f]?.length ?? 0) > 0).sort(
        (a, b) => (byField[b]?.length ?? 0) - (byField[a]?.length ?? 0),
      ),
      ...(byField['기타']?.length ? ['기타'] : []),
    ]
    return orderedFields.map((field) => {
      const arr = byField[field] ?? []
      const topCountry = pickTopLabel(arr, (p) => p.country)
      const spanText = computeYearSpanText(arr)
      const range =
        topCountry && spanText
          ? `${topCountry} 외 · ${spanText}`
          : spanText || topCountry || undefined
      const isResidual = field === '기타'
      return {
        id: `field-${field}`,
        stateKey: `field:${field}`,
        label: field,
        range,
        tone: isResidual ? 'muted' : 'primary',
        arr: arr.slice().sort(sortFn),
      }
    })
  }, [groupBy, unpinnedPeople, eraGroupOrder, sortFn])

  const largestGroup = Math.max(1, ...sortedGroups.map(({ arr }) => arr.length))

  const allGroupsCollapsed =
    sortedGroups.length > 0 &&
    sortedGroups.every((g) => !!collapsed[g.stateKey])

  const toggleAllGroupsCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = { ...prev }
      const target = !allGroupsCollapsed
      for (const g of sortedGroups) {
        next[g.stateKey] = target
      }
      return next
    })
  }, [allGroupsCollapsed, sortedGroups])

  // 전체 목록(groupBy === 'none') 하단 센티넬 자동 무한 스크롤
  const remainingFlatCount =
    groupBy === 'none' ? Math.max(0, sortedFlatPeople.length - flatLimit) : 0

  useEffect(() => {
    if (groupBy !== 'none' || remainingFlatCount <= 0) return
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setFlatLimit((prev) => prev + FLAT_PAGE_SIZE)
        }
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [groupBy, remainingFlatCount])

  const jumpTo = (stateKey: string, sectionId: string) => {
    setCollapsed((prevState) => ({ ...prevState, [stateKey]: false }))
    requestAnimationFrame(() => {
      document
        .getElementById(`person-group-${sectionId}`)
        ?.closest('section')
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  const renderCollection = (items: AdaptedPerson[], showHeader = true) => {
    if (listLayout === 'row') {
      return (
        <PersonRowList>
          {showHeader && (
            <PersonRowListHeader
              sort={sort}
              order={reversePersonSort ? 'asc' : 'desc'}
              onSortSelect={handleHeaderSortSelect}
            />
          )}
          {items.map((person) => (
            <PersonRowItem
              key={person.id}
              person={person}
              query={query}
              pinned={pinned.has(person.id)}
              selected={selectedPersonId === person.id}
              onTogglePin={togglePin}
              onOpen={onOpen}
            />
          ))}
        </PersonRowList>
      )
    }
    return (
      <EraCardGrid>
        {items.map((person) => (
          <PersonCardItem
            key={person.id}
            person={person}
            query={query}
            pinned={pinned.has(person.id)}
            selected={selectedPersonId === person.id}
            onTogglePin={togglePin}
            onOpen={onOpen}
          />
        ))}
      </EraCardGrid>
    )
  }

  if (
    sortedGroups.length === 0 &&
    sortedFlatPeople.length === 0 &&
    pinnedPeople.length === 0
  ) {
    return (
      <EmptyState hasActiveFilter={hasFilter} onClearFilters={resetFilters} />
    )
  }

  // 전체(그룹 없음) 모드 — 세기/가문 구획 없이 선택 정렬순으로 한 번에 스캔
  if (groupBy === 'none') {
    const shownFlat = sortedFlatPeople.slice(0, flatLimit)
    const remaining = sortedFlatPeople.length - shownFlat.length
    return (
      <FlatPanel>
        {pinnedPeople.length > 0 && (
          <PinnedWrap>
            <PinnedPeopleSection
              people={pinnedPeople}
              query={query}
              selectedPersonId={selectedPersonId}
              layout={listLayout}
              onTogglePin={togglePin}
              onOpen={onOpen}
            />
          </PinnedWrap>
        )}
        {shownFlat.length > 0 && (
          <div>
            {renderCollection(shownFlat, true)}
            {remaining > 0 && (
              <>
                <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
                <MoreBtn
                  type="button"
                  onClick={() => setFlatLimit((prev) => prev + FLAT_PAGE_SIZE)}
                >
                  + {remaining.toLocaleString()}명 더 보기
                </MoreBtn>
              </>
            )}
          </div>
        )}
      </FlatPanel>
    )
  }

  const indexAriaLabel =
    groupBy === 'century'
      ? '세기 바로가기'
      : groupBy === 'country'
        ? '국가 바로가기'
        : groupBy === 'field'
          ? '분야 바로가기'
          : '왕조·가문 바로가기'

  const canCollapseIndex = sortedGroups.length > INDEX_COLLAPSED_LIMIT + 2
  const visibleIndexGroups =
    canCollapseIndex && !indexExpanded
      ? sortedGroups.slice(0, INDEX_COLLAPSED_LIMIT)
      : sortedGroups
  const hiddenIndexCount = sortedGroups.length - visibleIndexGroups.length

  return (
    <GroupPanel>
      <PinnedPeopleSection
        people={pinnedPeople}
        query={query}
        selectedPersonId={selectedPersonId}
        layout={listLayout}
        onTogglePin={togglePin}
        onOpen={onOpen}
      />
      {sortedGroups.length >= 4 && (
        <CenturyIndex aria-label={indexAriaLabel}>
          <CenturyIndexPills>
            {visibleIndexGroups.map(({ id, stateKey, label, arr }) => (
              <CenturyJump
                key={id}
                type="button"
                onClick={() => jumpTo(stateKey, id)}
                aria-label={`${label} ${arr.length}명으로 이동`}
              >
                {label}
                <CenturyJumpCount>{arr.length}</CenturyJumpCount>
              </CenturyJump>
            ))}
            {canCollapseIndex && (
              <IndexMoreBtn
                type="button"
                onClick={() => setIndexExpanded((prev) => !prev)}
              >
                {indexExpanded ? '목차 접기' : `+ ${hiddenIndexCount}개 그룹 더보기`}
              </IndexMoreBtn>
            )}
          </CenturyIndexPills>
          <CollapseAllBtn
            type="button"
            onClick={toggleAllGroupsCollapsed}
            title={allGroupsCollapsed ? '모든 그룹 펼치기' : '모든 그룹 접기'}
          >
            {allGroupsCollapsed ? (
              <>
                <FiChevronsDown size={13} aria-hidden />
                모두 펼치기
              </>
            ) : (
              <>
                <FiChevronsUp size={13} aria-hidden />
                모두 접기
              </>
            )}
          </CollapseAllBtn>
        </CenturyIndex>
      )}
      {listLayout === 'row' && sortedGroups.length > 0 && (
        <GroupRowHeaderWrap>
          <PersonRowListHeader
            sort={sort}
            order={reversePersonSort ? 'asc' : 'desc'}
            onSortSelect={handleHeaderSortSelect}
          />
        </GroupRowHeaderWrap>
      )}
      {sortedGroups.map((group) => {
        const { id, stateKey, label, range, tone, arr } = group
        const isExpanded = !!expanded[stateKey]
        const shown = isExpanded
          ? arr
          : arr.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
        const hasMore = arr.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N

        return (
          <Fragment key={id}>
            <GroupSection
              id={id}
              label={label}
              range={range}
              count={arr.length}
              tone={tone ?? 'primary'}
              collapsed={!!collapsed[stateKey]}
              onToggle={() =>
                setCollapsed((prevState) => ({
                  ...prevState,
                  [stateKey]: !prevState[stateKey],
                }))
              }
            >
              {renderCollection(shown, false)}
              {hasMore && (
                <MoreBtn
                  type="button"
                  onClick={() =>
                    setExpanded((prevState) => ({
                      ...prevState,
                      [stateKey]: !prevState[stateKey],
                    }))
                  }
                >
                  {isExpanded
                    ? '접기'
                    : `+ ${arr.length - INFOGRAPHIC_DEFAULTS.GROUP_TOP_N}명 더 보기`}
                </MoreBtn>
              )}
            </GroupSection>
          </Fragment>
        )
      })}
    </GroupPanel>
  )
}

const FlatPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const PinnedWrap = styled(GroupPanel)`
  padding-bottom: 12px;
`

const GroupRowHeaderWrap = styled.div`
  container: personrowlist / inline-size;
  margin-bottom: 2px;
`

const CenturyIndex = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  padding: 4px 0 10px;
  border-bottom: 1px solid ${hairline};
`

const CenturyIndexPills = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 6px;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

const IndexMoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  flex-shrink: 0;
  border: 1px dashed ${hairline};
  background: transparent;
  font-size: 11.5px;
  font-weight: 600;
  color: ${BRAND.primary};
  cursor: pointer;
  white-space: nowrap;
  transition: background ${MOTION_FAST}, border-color ${MOTION_FAST};

  &:hover {
    border-color: ${BRAND.primaryBorder};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const CollapseAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  flex-shrink: 0;
  border: 1px solid ${hairline};
  background: transparent;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  white-space: nowrap;
  transition: color ${MOTION_FAST}, background ${MOTION_FAST}, border-color ${MOTION_FAST};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const CenturyJump = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  white-space: nowrap;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: color ${MOTION_FAST}, background ${MOTION_FAST};

  &:hover {
    color: ${BRAND.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const CenturyJumpCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`
