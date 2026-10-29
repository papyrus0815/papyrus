/**
 * VIEW: 왕조별 그룹핑 — faction(가문) 기준.
 * 정렬은 공용 store sort 사용. faction 없는 인물은 "소속 없음"으로 묶음.
 */
import { useMemo, useState } from 'react'

import styled from 'styled-components'

import type { AdaptedPerson } from '../model/types'
import { bornForPlot, diedForPlot } from '../model/adapt'
import { formatYear } from '../model/century'
import { INFOGRAPHIC_DEFAULTS } from '../model/constants'
import {
  usePersonInfographicFilterStore,
  useHasActiveFilter,
} from '../model/filter.store'
import { makeSortFnWithPinned } from '../model/sort-helpers'

import { BRAND, hairline, metaText, MOTION_FAST, surface } from './_shared/catalog.styles'
import { EmptyState } from './_shared/empty-state'
import { GroupPanel, GroupSection, MoreBtn } from './_shared/group-section'
import { EraCardGrid, PersonCardItem } from './_shared/person-card'
import { PinnedPeopleSection } from './_shared/pinned-people-section'

/** '소속 없음' 그룹 키 — 실제 왕조명과 겹치지 않는 값 */
const NO_FACTION_KEY = '__none__'

/** 가문 대표 국가 산출 — '미상'을 제외한 최빈 국가를 우선 반환 */
function pickRepresentativeCountry(arr: AdaptedPerson[]): string {
  const counts: Record<string, number> = {}
  for (const p of arr) {
    const c = p.country?.trim()
    if (!c || c === '미상') continue
    counts[c] = (counts[c] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  return top ?? arr[0]?.country ?? ''
}

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  query: string
  pinned: Set<string>
  selectedPersonId?: string | null
  togglePin: (id: string, e: React.MouseEvent) => void
}

export function DynastyView({
  people,
  onOpen,
  query,
  pinned,
  selectedPersonId,
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
          if (p.activityYear == null && p.born == null && p.died == null) {
            continue
          }
          const bornY = bornForPlot(p)
          const diedY = diedForPlot(p)
          if (bornY < minYr) minYr = bornY
          if (diedY > maxYr) maxYr = diedY
        }
        return {
          faction,
          arr,
          minYr,
          maxYr,
          countryName: pickRepresentativeCountry(arr),
        }
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

  const jumpTo = (collapseKey: string, sectionId: string) => {
    setCollapsed((prev) => ({ ...prev, [collapseKey]: false }))
    requestAnimationFrame(() => {
      document
        .getElementById(`person-group-${sectionId}`)
        ?.closest('section')
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

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
              selected={selectedPersonId === person.id}
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

  /* 레일 도트 무게 — 가장 큰 가문 대비 √비율(면적이 아니라 지름이라 제곱근으로 눌러 둔다) */
  const largestFaction = Math.max(1, ...sortedFactions.map(({ arr }) => arr.length))
  const totalSectionCount = sortedFactions.length + (noFaction.length > 0 ? 1 : 0)

  return (
    <GroupPanel>
      <PinnedPeopleSection
        people={pinnedPeople}
        query={query}
        selectedPersonId={selectedPersonId}
        onTogglePin={togglePin}
        onOpen={onOpen}
      />
      {totalSectionCount >= 3 && (
        <DynastyIndex aria-label="왕조·가문 바로가기">
          {sortedFactions.map(({ faction, arr }) => (
            <DynastyJump
              key={faction}
              type="button"
              onClick={() => jumpTo(faction, `dynasty-${faction}`)}
              aria-label={`${faction} ${arr.length}명으로 이동`}
            >
              {faction}
              <DynastyJumpCount>{arr.length}</DynastyJumpCount>
            </DynastyJump>
          ))}
          {noFaction.length > 0 && (
            <DynastyJump
              type="button"
              onClick={() => jumpTo(NO_FACTION_KEY, 'dynasty-none')}
              aria-label={`소속 없음 ${noFaction.length}명으로 이동`}
            >
              소속 없음
              <DynastyJumpCount>{noFaction.length}</DynastyJumpCount>
            </DynastyJump>
          )}
        </DynastyIndex>
      )}
      {sortedFactions.map(({ faction, arr, minYr, maxYr, countryName, sorted }) => {
        const hasValidSpan = Number.isFinite(minYr) && Number.isFinite(maxYr)
        const rangeText = hasValidSpan
          ? `${countryName ? `${countryName} · ` : ''}${formatYear(Math.round(minYr))}–${formatYear(Math.round(maxYr))}`
          : countryName || undefined
        return (
          <GroupSection
            key={faction}
            id={`dynasty-${faction}`}
            label={faction}
            range={rangeText}
            count={arr.length}
            weight={Math.sqrt(arr.length / largestFaction)}
            collapsed={!!collapsed[faction]}
            onToggle={() => toggleCollapsed(faction)}
          >
            {renderCards(sorted, faction)}
          </GroupSection>
        )
      })}
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

const DynastyIndex = styled.nav`
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 4px calc(-1 * var(--rail-inset));
  padding: 10px 0 12px var(--rail-inset);
  border-bottom: 1px solid ${hairline};
  background: ${surface};

  @media (max-width: 640px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`

const DynastyJump = styled.button`
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

const DynastyJumpCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`
