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
import { Fragment, useMemo, useState } from 'react'

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
  const scopes = usePersonInfographicFilterStore((state) => state.scopes)
  const groupBy = usePersonInfographicFilterStore((state) => state.groupBy)
  const listLayout = usePersonInfographicFilterStore((state) => state.listLayout)
  const eraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.eraGroupOrder,
  )
  const resetFilters = usePersonInfographicFilterStore((state) => state.resetFilters)
  const hasFilter = useHasActiveFilter()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [flatLimit, setFlatLimit] = useState(FLAT_PAGE_SIZE)

  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinned, sort),
    [pinned, sort],
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
      const isEraFiltered = scopes.era.length > 0
      for (const person of unpinnedPeople) {
        const yearForCentury = isEraFiltered
          ? (person.activityYear ?? person.born ?? person.died)
          : (person.born ?? person.activityYear ?? person.died)
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
  }, [groupBy, unpinnedPeople, scopes.era.length, eraGroupOrder, sortFn])

  const largestGroup = Math.max(1, ...sortedGroups.map(({ arr }) => arr.length))

  const jumpTo = (stateKey: string, sectionId: string) => {
    setCollapsed((prevState) => ({ ...prevState, [stateKey]: false }))
    requestAnimationFrame(() => {
      document
        .getElementById(`person-group-${sectionId}`)
        ?.closest('section')
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  const renderCollection = (items: AdaptedPerson[]) => {
    if (listLayout === 'row') {
      return (
        <PersonRowList>
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
            {renderCollection(shownFlat)}
            {remaining > 0 && (
              <MoreBtn
                type="button"
                onClick={() => setFlatLimit((prev) => prev + FLAT_PAGE_SIZE)}
              >
                + {remaining.toLocaleString()}명 더 보기
              </MoreBtn>
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
      {sortedGroups.length >= 3 && (
        <CenturyIndex aria-label={indexAriaLabel}>
          {sortedGroups.map(({ id, stateKey, label, arr }) => (
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
        </CenturyIndex>
      )}
      {sortedGroups.map((group, index) => {
        const { id, stateKey, label, range, marker, tone, centuryMeta, arr } = group
        const isExpanded = !!expanded[stateKey]
        const shown = isExpanded
          ? arr
          : arr.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
        const hasMore = arr.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N

        // 세기별 모드에서만 직전 세기와의 공백(세기 수) 표지 표시
        const prevMeta = sortedGroups[index - 1]?.centuryMeta
        const gap =
          groupBy === 'century' &&
          centuryMeta &&
          prevMeta &&
          prevMeta.key !== 'unknown' &&
          centuryMeta.key !== 'unknown'
            ? Math.abs(centuryIndex(centuryMeta) - centuryIndex(prevMeta)) - 1
            : 0

        return (
          <Fragment key={id}>
            {gap > 0 && <GapMarker>{gap}개 세기 기록 없음</GapMarker>}
            <GroupSection
              id={id}
              label={label}
              range={range}
              count={arr.length}
              weight={
                tone === 'muted' ? undefined : Math.sqrt(arr.length / largestGroup)
              }
              marker={marker}
              tone={tone ?? 'primary'}
              collapsed={!!collapsed[stateKey]}
              onToggle={() =>
                setCollapsed((prevState) => ({
                  ...prevState,
                  [stateKey]: !prevState[stateKey],
                }))
              }
            >
              {renderCollection(shown)}
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

const CenturyIndex = styled.nav`
  /* 판의 좌측 시간 레일이 첫 세기 머리부터 시작하도록 레일 자리까지 지면색으로 덮는다 */
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 4px calc(-1 * var(--rail-inset));
  padding: 10px 0 12px var(--rail-inset);
  border-bottom: 1px solid ${hairline};
  background: ${surface};

  /* 좁은 폭에선 줄바꿈 대신 한 줄 가로 스크롤 — 5줄로 불어나 첫 카드를 밀어내지 않게 */
  @media (max-width: 640px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`

const CenturyJump = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  flex-shrink: 0;
  border: 1px solid ${hairline};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)'};
  font-size: 12px;
  white-space: nowrap;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: color ${MOTION_FAST}, background ${MOTION_FAST}, border-color ${MOTION_FAST};

  &:hover {
    color: ${BRAND.primary};
    border-color: ${BRAND.primaryBorder};
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
