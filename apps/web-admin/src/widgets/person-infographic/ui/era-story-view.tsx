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
import { centuryOf, formatYear, type CenturyMeta } from '../model/century'
import { INFOGRAPHIC_DEFAULTS } from '../model/constants'
import { usePersonInfographicFilterStore } from '../model/filter.store'
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

interface Group {
  meta: CenturyMeta
  arr: AdaptedPerson[]
}

export function EraStoryView({ people, onOpen, q, pinned, togglePin }: Props) {
  const theme = useTheme()
  const sort = usePersonInfographicFilterStore((s) => s.sort)
  const clearAllScopes = usePersonInfographicFilterStore(
    (s) => s.clearAllScopes,
  )
  const hasFilter = useHasActiveFilter()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const groups: Group[] = useMemo(() => {
    const map: Record<string, Group> = {}
    for (const p of people) {
      const meta = centuryOf(p.born)
      if (!map[meta.key]) map[meta.key] = { meta, arr: [] }
      map[meta.key].arr.push(p)
    }
    return Object.values(map).sort((a, b) => a.meta.sortKey - b.meta.sortKey)
  }, [people])

  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinned, sort),
    [pinned, sort],
  )

  if (!groups.length) {
    return (
      <EmptyState hasActiveFilter={hasFilter} onClearFilters={clearAllScopes} />
    )
  }

  return (
    <Wrap>
      <SortBar />
      {groups.map(({ meta, arr: rawArr }) => {
        const arr = rawArr.slice().sort(sortFn)
        const isExpanded = !!expanded[meta.key]
        const shown = isExpanded
          ? arr
          : arr.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
        const hasMore = arr.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N
        const headerColor = yearOfEra((meta.from + meta.to) / 2).color
        return (
          <Block key={meta.key}>
            <BlockHdr>
              <BlockTitle style={{ color: headerColor }}>
                {meta.label}
              </BlockTitle>
              <BlockRange style={{ color: theme.colors.text.tertiary }}>
                {formatYear(meta.from)} — {formatYear(meta.to)}
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
                  era={yearOfEra(p.activityYear)}
                  q={q}
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

function useHasActiveFilter() {
  return usePersonInfographicFilterStore((s) => {
    const sc = s.scopes
    return (
      sc.era.length +
        sc.region.length +
        sc.field.length +
        sc.country.length +
        (s.minInfluence > 0 ? 1 : 0) +
        (s.aliveFilter !== 'all' ? 1 : 0) +
        (s.query.trim() ? 1 : 0) >
      0
    )
  })
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
