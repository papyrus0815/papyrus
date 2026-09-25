/**
 * VIEW: 세기별 — 출생연도 기준 세기별 그룹.
 *
 * 1750 → 18세기, BC 50 → 기원전 1세기 형태로 자동 분할.
 * 정렬은 store의 공용 sort(영향력/이름/출생/사망)를 사용.
 */
import { Fragment, useMemo, useState } from 'react'

import styled from 'styled-components'

import type { AdaptedPerson } from '../model/types'
import {
  centuryOf,
  compareCenturyMeta,
  formatYear,
  type CenturyMeta,
} from '../model/century'
import { INFOGRAPHIC_DEFAULTS } from '../model/constants'
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
import { EraCardGrid, PersonCardItem } from './_shared/person-card'
import { PinnedPeopleSection } from './_shared/pinned-people-section'

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  query: string
  pinned: Set<string>
  togglePin: (id: string, e: React.MouseEvent) => void
}

interface Group {
  meta: CenturyMeta
  arr: AdaptedPerson[]
}

/** 세기 연속 인덱스 — 기원전 1세기(-1)와 1세기(1)는 인접(0, 1). */
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

export function EraStoryView({
  people,
  onOpen,
  query,
  pinned,
  togglePin,
}: Props) {
  const sort = usePersonInfographicFilterStore((s) => s.sort)
  const eraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.eraGroupOrder,
  )
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  const hasFilter = useHasActiveFilter()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinned, sort),
    [pinned, sort],
  )

  // 핀 인물은 세기 그룹과 무관하게 상단 고정 섹션에서만 표시(그룹에서는 제외해 중복 방지).
  const pinnedPeople = useMemo(
    () => people.filter((person) => pinned.has(person.id)).sort(sortFn),
    [people, pinned, sortFn],
  )

  const groups: Group[] = useMemo(() => {
    const map: Record<string, Group> = {}
    for (const person of people) {
      if (pinned.has(person.id)) continue
      const meta = person.born == null ? UNKNOWN_CENTURY : centuryOf(person.born)
      if (!map[meta.key]) map[meta.key] = { meta, arr: [] }
      map[meta.key].arr.push(person)
    }
    // 세기 그룹 나열 방향 — eraGroupOrder('desc'=최신 세기 먼저, 기본).
    return Object.values(map).sort((groupA, groupB) =>
      compareCenturyMeta(groupA.meta, groupB.meta, eraGroupOrder),
    )
  }, [people, pinned, eraGroupOrder])

  // 그룹별 정렬은 people/sort/pinned 변할 때만 — expanded(더보기) 토글 등 다른 리렌더에서 재정렬 방지
  const sortedGroups = useMemo(
    () =>
      groups.map((group) => ({
        meta: group.meta,
        arr: group.arr.slice().sort(sortFn),
      })),
    [groups, sortFn],
  )

  /** 세기 바로가기 — 접혀 있으면 펼치고 그 세기 머리로 스크롤 */
  const jumpTo = (key: string) => {
    setCollapsed((prevState) => ({ ...prevState, [key]: false }))
    requestAnimationFrame(() => {
      document
        .getElementById(`person-group-${key}`)
        ?.closest('section')
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  if (!groups.length && pinnedPeople.length === 0) {
    return (
      <EmptyState hasActiveFilter={hasFilter} onClearFilters={resetFilters} />
    )
  }

  return (
    <GroupPanel>
      <PinnedPeopleSection
        people={pinnedPeople}
        query={query}
        onTogglePin={togglePin}
        onOpen={onOpen}
      />
      {/* 세기가 셋 이상일 때만 — 20명씩 끊긴 긴 지면에서 원하는 세기로 바로 간다 */}
      {sortedGroups.length >= 3 && (
        <CenturyIndex aria-label="세기 바로가기">
          {sortedGroups.map(({ meta, arr }) => (
            <CenturyJump
              key={meta.key}
              type="button"
              onClick={() => jumpTo(meta.key)}
              aria-label={`${meta.label} ${arr.length}명으로 이동`}
            >
              {meta.label}
              <CenturyJumpCount>{arr.length}</CenturyJumpCount>
            </CenturyJump>
          ))}
        </CenturyIndex>
      )}
      {sortedGroups.map(({ meta, arr }, index) => {
        const isExpanded = !!expanded[meta.key]
        const shown = isExpanded
          ? arr
          : arr.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
        const hasMore = arr.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N
        const isUnknown = meta.key === 'unknown'

        // 직전 세기와의 공백(세기 수) — 사건 목록의 'N년 기록 없음'과 같은 표지.
        // 미상 그룹은 시간축 밖이라 계산하지 않는다.
        const prev = sortedGroups[index - 1]?.meta
        const gap =
          prev && prev.key !== 'unknown' && !isUnknown
            ? Math.abs(centuryIndex(meta) - centuryIndex(prev)) - 1
            : 0

        return (
          <Fragment key={meta.key}>
            {gap > 0 && <GapMarker>{gap}개 세기 기록 없음</GapMarker>}
            <GroupSection
              id={meta.key}
              label={meta.label}
              range={
                isUnknown
                  ? undefined
                  : `${formatYear(meta.from)}–${formatYear(meta.to)}`
              }
              count={arr.length}
              tone={isUnknown ? 'muted' : 'primary'}
              collapsed={!!collapsed[meta.key]}
              onToggle={() =>
                setCollapsed((prevState) => ({
                  ...prevState,
                  [meta.key]: !prevState[meta.key],
                }))
              }
            >
              <EraCardGrid>
                {shown.map((person) => (
                  <PersonCardItem
                    key={person.id}
                    person={person}
                    query={query}
                    pinned={pinned.has(person.id)}
                    onTogglePin={togglePin}
                    onOpen={onOpen}
                  />
                ))}
              </EraCardGrid>
              {hasMore && (
                <MoreBtn
                  type="button"
                  onClick={() =>
                    setExpanded((prevState) => ({
                      ...prevState,
                      [meta.key]: !prevState[meta.key],
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

const CenturyIndex = styled.nav`
  /* 판의 좌측 시간 레일이 첫 세기 머리부터 시작하도록 레일 자리까지 지면색으로 덮는다 */
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 4px calc(-1 * var(--rail-inset));
  padding: 12px 0 12px var(--rail-inset);
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
  align-items: baseline;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  flex-shrink: 0;
  border: 1px solid ${hairline};
  background: transparent;
  font-size: 12.5px;
  white-space: nowrap;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: color ${MOTION_FAST}, border-color ${MOTION_FAST}, background ${MOTION_FAST};

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
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`
