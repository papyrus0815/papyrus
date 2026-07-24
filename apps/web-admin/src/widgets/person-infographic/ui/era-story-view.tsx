/**
 * VIEW: 시대 스토리 — 출생연도 기준 세기별 그룹.
 *
 * 1750 → 18세기, BC 50 → 기원전 1세기 형태로 자동 분할.
 * 정렬은 store의 공용 sort(영향력/이름/출생/사망)를 사용.
 */
import { useMemo, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import { glassOrSolidMixin } from '@/shared/styles/mixins'

import type { AdaptedPerson } from '../model/types'
import { yearOfEra } from '../model/adapt'
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

import { EmptyState } from './_shared/empty-state'
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
  const theme = useTheme()
  const sort = usePersonInfographicFilterStore((s) => s.sort)
  const eraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.eraGroupOrder,
  )
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  const hasFilter = useHasActiveFilter()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

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

  if (!groups.length && pinnedPeople.length === 0) {
    return (
      <EmptyState hasActiveFilter={hasFilter} onClearFilters={resetFilters} />
    )
  }

  return (
    <Wrap>
      <PinnedPeopleSection
        people={pinnedPeople}
        query={query}
        onTogglePin={togglePin}
        onOpen={onOpen}
      />
      {sortedGroups.map(({ meta, arr }) => {
        const isExpanded = !!expanded[meta.key]
        const shown = isExpanded
          ? arr
          : arr.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
        const hasMore = arr.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N
        const isUnknown = meta.key === 'unknown'
        const headerColor = isUnknown
          ? theme.colors.text.tertiary
          : yearOfEra((meta.from + meta.to) / 2).color
        return (
          <Block key={meta.key}>
            <BlockHdr>
              <BlockTitle style={{ color: headerColor }}>
                {meta.label}
              </BlockTitle>
              {!isUnknown && (
                <BlockRange style={{ color: theme.colors.text.tertiary }}>
                  {formatYear(meta.from)} — {formatYear(meta.to)}
                </BlockRange>
              )}
              <BlockCount style={{ color: theme.colors.text.tertiary }}>
                {arr.length}명
              </BlockCount>
            </BlockHdr>
            <EraCardGrid>
              {shown.map((p) => (
                <PersonCardItem
                  key={p.id}
                  p={p}
                  era={p.era}
                  q={query}
                  pinned={pinned.has(p.id)}
                  onTogglePin={togglePin}
                  onOpen={onOpen}
                />
              ))}
            </EraCardGrid>
            {hasMore && (
              <MoreBtn
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [meta.key]: !prev[meta.key],
                  }))
                }
              >
                {isExpanded
                  ? '접기'
                  : `+ ${arr.length - INFOGRAPHIC_DEFAULTS.GROUP_TOP_N}명 더보기`}
              </MoreBtn>
            )}
          </Block>
        )
      })}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Block = styled.div`
  border-radius: 12px;
  padding: 16px 18px;
  ${({ theme }) => glassOrSolidMixin(theme)}
`

const BlockHdr = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
`

const BlockTitle = styled.span`
  font-size: 20px;
  font-weight: 700;
`

const BlockRange = styled.span`
  font-size: 11px;
`

const BlockCount = styled.span`
  margin-left: auto;
  font-size: 11px;
`

const MoreBtn = styled.button`
  margin: 12px auto 0;
  display: block;
  padding: 6px 16px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: background 0.12s, color 0.12s;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f3f4f6'};
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
