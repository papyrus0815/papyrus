/**
 * VIEW: 왕조별 그룹핑 — faction(가문) 기준.
 * 정렬은 공용 store sort 사용. faction 없는 인물은 "소속 없음"으로 묶음.
 */
import { useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import { glassOrSolidMixin } from '@/shared/styles/mixins'

import type { AdaptedPerson } from '../model/types'
import { yearOfEra } from '../model/adapt'
import {
  usePersonInfographicFilterStore,
  useHasActiveFilter,
} from '../model/filter.store'
import { makeSortFnWithPinned } from '../model/sort-helpers'

import { EmptyState } from './_shared/empty-state'
import { EraCardGrid, PersonCardItem } from './_shared/person-card'
import { SortBar } from './_shared/sort-bar'

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  q: string
  pinned: Set<string>
  togglePin: (id: string, e: React.MouseEvent) => void
}

export function DynastyView({ people, onOpen, q, pinned, togglePin }: Props) {
  const theme = useTheme()
  const sort = usePersonInfographicFilterStore((s) => s.sort)
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  const hasFilter = useHasActiveFilter()

  const { factions, noFaction } = useMemo(() => {
    const byFaction: Record<string, AdaptedPerson[]> = {}
    const without: AdaptedPerson[] = []
    for (const p of people) {
      if (p.faction) (byFaction[p.faction] = byFaction[p.faction] || []).push(p)
      else without.push(p)
    }
    // 연도 범위·대표 국가는 그룹 생성 시 1회 계산 (렌더 본문 spread 제거 — 콜스택/재계산 방지)
    const factions = Object.entries(byFaction)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([faction, arr]) => {
        let minYr = Infinity
        let maxYr = -Infinity
        for (const p of arr) {
          if (p.born < minYr) minYr = p.born
          if (p.died > maxYr) maxYr = p.died
        }
        return { faction, arr, minYr, maxYr, countryName: arr[0]?.country ?? '' }
      })
    return { factions, noFaction: without }
  }, [people])

  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinned, sort),
    [pinned, sort],
  )

  if (!factions.length && !noFaction.length) {
    return <EmptyState hasActiveFilter={hasFilter} onClearFilters={resetFilters} />
  }

  return (
    <Wrap>
      <SortBar />
      {factions.map(({ faction, arr, minYr, maxYr, countryName }) => {
        const sorted = arr.slice().sort(sortFn)
        return (
          <Block key={faction}>
            <BlockHdr>
              <BlockTitle style={{ color: theme.colors.text.primary }}>
                {faction}
              </BlockTitle>
              <BlockRange style={{ color: theme.colors.text.tertiary }}>
                {countryName} · {minYr < 0 ? `${-minYr}BC` : minYr}–
                {maxYr < 0 ? `${-maxYr}BC` : maxYr}
              </BlockRange>
              <BlockCount style={{ color: theme.colors.text.tertiary }}>
                {arr.length}명
              </BlockCount>
            </BlockHdr>
            <EraCardGrid>
              {sorted.map((p) => (
                <PersonCardItem
                  key={p.id}
                  p={p}
                  era={yearOfEra(p.activityYear)}
                  q={q}
                  pinned={pinned.has(p.id)}
                  onTogglePin={togglePin}
                  onOpen={onOpen}
                />
              ))}
            </EraCardGrid>
          </Block>
        )
      })}
      {noFaction.length > 0 && (
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
            {noFaction
              .slice()
              .sort(sortFn)
              .map((p) => (
                <PersonCardItem
                  key={p.id}
                  p={p}
                  era={yearOfEra(p.activityYear)}
                  q={q}
                  pinned={pinned.has(p.id)}
                  onTogglePin={togglePin}
                  onOpen={onOpen}
                />
              ))}
          </EraCardGrid>
        </Block>
      )}
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
