/**
 * VIEW: 왕조별 그룹핑 — faction(가문) 기준.
 * 정렬은 공용 store sort 사용. faction 없는 인물은 "소속 없음"으로 묶음.
 */
import { useMemo, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import { glassOrSolidMixin } from '@/shared/styles/mixins'

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
import { EraCardGrid, PersonCardItem } from './_shared/person-card'
import { PinnedPeopleSection } from './_shared/pinned-people-section'

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
  const theme = useTheme()
  const sort = usePersonInfographicFilterStore((s) => s.sort)
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  const hasFilter = useHasActiveFilter()
  // 그룹별 펼침 상태 — 기본은 GROUP_TOP_N까지만 렌더(대형 가문·"소속 없음"에서 DOM 폭주 방지)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
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

  return (
    <Wrap>
      <PinnedPeopleSection
        people={pinnedPeople}
        query={query}
        onTogglePin={togglePin}
        onOpen={onOpen}
      />
      {sortedFactions.map(({ faction, arr, minYr, maxYr, countryName, sorted }) => {
        const isExpanded = !!expanded[faction]
        const shown = isExpanded
          ? sorted
          : sorted.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
        const hasMore = sorted.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N
        return (
          <Block key={faction}>
            <BlockHdr>
              <BlockTitle style={{ color: theme.colors.text.primary }}>
                {faction}
              </BlockTitle>
              <BlockRange style={{ color: theme.colors.text.tertiary }}>
                {countryName} · {formatYear(minYr)}–{formatYear(maxYr)}
              </BlockRange>
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
              <MoreBtn onClick={() => toggleExpand(faction)}>
                {isExpanded
                  ? '접기'
                  : `+ ${sorted.length - INFOGRAPHIC_DEFAULTS.GROUP_TOP_N}명 더보기`}
              </MoreBtn>
            )}
          </Block>
        )
      })}
      {noFaction.length > 0 &&
        (() => {
          const sorted = sortedNoFaction
          const isExpanded = !!expanded['__none__']
          const shown = isExpanded
            ? sorted
            : sorted.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
          const hasMore = sorted.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N
          return (
            <Block>
              <BlockHdr>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: theme.colors.text.secondary,
                  }}
                >
                  소속 없음
                </span>
                <BlockCount style={{ color: theme.colors.text.tertiary }}>
                  {noFaction.length}명
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
                <MoreBtn onClick={() => toggleExpand('__none__')}>
                  {isExpanded
                    ? '접기'
                    : `+ ${sorted.length - INFOGRAPHIC_DEFAULTS.GROUP_TOP_N}명 더보기`}
                </MoreBtn>
              )}
            </Block>
          )
        })()}
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
  font-size: 18px;
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
