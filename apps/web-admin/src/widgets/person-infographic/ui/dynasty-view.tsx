/**
 * VIEW: 왕조별 그룹핑 — faction(가문) 기준.
 * 정렬은 공용 store sort 사용. faction 없는 인물은 "소속 없음"으로 묶음.
 */
import { useMemo, useState } from 'react'

import type { AdaptedPerson } from '../model/types'
import { bornForPlot, diedForPlot } from '../model/adapt'
import { formatYear } from '../model/century'
import { INFOGRAPHIC_DEFAULTS } from '../model/constants'
import {
  usePersonInfographicFilterStore,
  useHasActiveFilter,
} from '../model/filter.store'
import { makeSortFnWithPinned } from '../model/sort-helpers'

import { EmptyState } from './_shared/empty-state'
import { GroupPanel, GroupSection, MoreBtn } from './_shared/group-section'
import { EraCardGrid, PersonCardItem } from './_shared/person-card'
import { PinnedPeopleSection } from './_shared/pinned-people-section'

/** '소속 없음' 그룹 키 — 실제 왕조명과 겹치지 않는 값 */
const NO_FACTION_KEY = '__none__'

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  query: string
  pinned: Set<string>
  togglePin: (id: string, e: React.MouseEvent) => void
}

export function DynastyView({
  people,
  onOpen,
  query,
  pinned,
  togglePin,
}: Props) {
  const sort = usePersonInfographicFilterStore((s) => s.sort)
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  const hasFilter = useHasActiveFilter()
  // 그룹별 펼침 상태 — 기본은 GROUP_TOP_N까지만 렌더(대형 가문·"소속 없음"에서 DOM 폭주 방지)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleExpand = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  const { factions, noFaction } = useMemo(() => {
    const byFaction: Record<string, AdaptedPerson[]> = {}
    const without: AdaptedPerson[] = []
    for (const person of people) {
      // 핀 인물은 상단 고정 섹션에서만 표시 — 왕조 그룹에서는 제외해 중복 방지.
      if (pinned.has(person.id)) continue
      if (person.faction)
        (byFaction[person.faction] = byFaction[person.faction] || []).push(person)
      else without.push(person)
    }
    // 연도 범위·대표 국가는 그룹 생성 시 1회 계산 (렌더 본문 spread 제거 — 콜스택/재계산 방지)
    const factions = Object.entries(byFaction)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([faction, arr]) => {
        let minYr = Infinity
        let maxYr = -Infinity
        for (const p of arr) {
          const bornY = bornForPlot(p)
          const diedY = diedForPlot(p)
          if (bornY < minYr) minYr = bornY
          if (diedY > maxYr) maxYr = diedY
        }
        return { faction, arr, minYr, maxYr, countryName: arr[0]?.country ?? '' }
      })
    return { factions, noFaction: without }
  }, [people, pinned])

  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinned, sort),
    [pinned, sort],
  )

  // 핀 인물은 왕조와 무관하게 상단 고정 섹션에서만 표시.
  const pinnedPeople = useMemo(
    () => people.filter((person) => pinned.has(person.id)).sort(sortFn),
    [people, pinned, sortFn],
  )

  // 정렬은 people/sort/pinned 변할 때만 — expanded(더보기) 토글 등 다른 리렌더에서 재정렬 방지
  const sortedFactions = useMemo(
    () =>
      factions.map((group) => ({
        ...group,
        sorted: group.arr.slice().sort(sortFn),
      })),
    [factions, sortFn],
  )
  const sortedNoFaction = useMemo(
    () => noFaction.slice().sort(sortFn),
    [noFaction, sortFn],
  )

  if (!factions.length && !noFaction.length && pinnedPeople.length === 0) {
    return <EmptyState hasActiveFilter={hasFilter} onClearFilters={resetFilters} />
  }

  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  const renderCards = (list: AdaptedPerson[], key: string) => {
    const isExpanded = !!expanded[key]
    const shown = isExpanded
      ? list
      : list.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
    const hasMore = list.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N
    return (
      <>
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
          <MoreBtn type="button" onClick={() => toggleExpand(key)}>
            {isExpanded
              ? '접기'
              : `+ ${list.length - INFOGRAPHIC_DEFAULTS.GROUP_TOP_N}명 더 보기`}
          </MoreBtn>
        )}
      </>
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
      {sortedFactions.map(({ faction, arr, minYr, maxYr, countryName, sorted }) => (
        <GroupSection
          key={faction}
          id={`dynasty-${faction}`}
          label={faction}
          range={`${countryName ? `${countryName} · ` : ''}${formatYear(minYr)}–${formatYear(maxYr)}`}
          count={arr.length}
          collapsed={!!collapsed[faction]}
          onToggle={() => toggleCollapsed(faction)}
        >
          {renderCards(sorted, faction)}
        </GroupSection>
      ))}
      {noFaction.length > 0 && (
        <GroupSection
          id="dynasty-none"
          label="소속 없음"
          count={noFaction.length}
          tone="muted"
          collapsed={!!collapsed[NO_FACTION_KEY]}
          onToggle={() => toggleCollapsed(NO_FACTION_KEY)}
        >
          {renderCards(sortedNoFaction, NO_FACTION_KEY)}
        </GroupSection>
      )}
    </GroupPanel>
  )
}
