import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowDown,
  FiArrowUp,
  FiArrowUpRight,
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import {
  isPlaceholderSideName,
  SIDE_OUTCOME_LABEL,
} from '@/pages/events/detail/components/side-outcome'
import type { SideOutcome } from '@/shared/api/event-sides'
import {
  EVENTS_LIMIT_ALL,
  type EventResponseDto,
  getAllEvents,
} from '@/shared/api/events'
import { formatDateRange, parseIsoDateParts } from '@/shared/lib/iso-date'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { pathKeys } from '@/shared/router'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import { PopoverMenu } from '@/shared/ui/popover-menu'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal/country-inline-modal'

import {
  LedgerSearchBox,
  LedgerSearchInput,
} from './country-ledger-primitives'
import { WarDeclarationsSection } from './war-declarations-section'

export interface CountryMilitaryWarsPanelProps {
  country: UnifiedCountry
  linkedHistoricalCountryIds?: string[]
  units?: unknown[]
  onSelectUnit?: (unitId: string) => void
}

type ConflictFilterKey = 'ALL' | 'WAR' | 'BATTLE' | 'UPRISING_ATTACK' | 'OTHER'

interface CountryParticipantMeta {
  id: string
  name: string
  role?: string | null
  sideId?: string | null
  sideName?: string | null
  sideColor?: string | null
  sideOutcome?: string | null
  sideOutcomeNote?: string | null
}

type ExtendedMilitaryEvent = EventResponseDto & {
  kind?: string | null
  parentEventId?: string | null
  parentEvent?: {
    id: string
    title: string
    startDate?: string | null
    endDate?: string | null
    kind?: string | null
    type?: string | null
  } | null
  relatedCountries?: CountryParticipantMeta[]
  relatedHistoricalCountries?: CountryParticipantMeta[]
}

interface DeployedUnitSummary {
  id: string
  name: string
  abbreviation?: string | null
  unitType?: string | null
  sideDeployedUnits?: Array<{
    id: string
    role?: string | null
    side?: {
      event?: { id: string } | null
    } | null
  }>
}

interface DeployedUnitChipData {
  id: string
  name: string
  abbreviation?: string | null
  unitType?: string | null
}

const CONFLICT_TYPE_LABEL: Record<string, string> = {
  WAR: '전쟁',
  BATTLE: '전투·작전',
  CAMPAIGN: '전역·작전',
  SIEGE: '공방전·포위전',
  WAR_DECLARATION: '선전포고',
  ARMISTICE: '휴전·정전',
  UPRISING: '봉기·내란',
  REBELLION: '반란·항쟁',
  COUP: '군사정변·쿠데타',
  ATTACK: '기습·무력충돌',
  MOBILIZATION: '동원·군제개편',
  ALLIANCE: '군사동맹',
}

const ROLE_LABEL: Record<string, string> = {
  AGGRESSOR: '공격·선포',
  DEFENDER: '방어·응전',
  BELLIGERENT: '교전국',
  VICTOR: '승전국',
  DEFEATED: '패전국',
  ALLY: '동맹·지원',
  HOST: '전장·발생지',
  PARTICIPANT: '참전·관여',
}

function getEventChronologyKey(ev: EventResponseDto): number {
  const parts = parseIsoDateParts(ev.startDate)
  if (parts) {
    return parts.year * 10000 + parts.month * 100 + parts.day
  }
  const anyEv = ev as unknown as {
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
  }
  if (anyEv.startYear && anyEv.startYear > 0) {
    const signedYr =
      anyEv.startEra === 'BC' ? -Math.abs(anyEv.startYear) : anyEv.startYear
    return (
      signedYr * 10000 +
      (anyEv.startMonth ?? 1) * 100 +
      (anyEv.startDay ?? 1)
    )
  }
  return Number.MAX_SAFE_INTEGER
}

function formatMilitaryEventPeriod(ev: EventResponseDto): string {
  if (ev.startDate) {
    const rangeStr = formatDateRange(
      ev.startDate,
      ev.endDate ?? undefined,
      ev.startDatePrecision,
      ev.endDatePrecision,
    )
    if (rangeStr && rangeStr !== '날짜 미상') return rangeStr
  }

  const anyEv = ev as unknown as {
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    endEra?: string | null
    endYear?: number | null
    endMonth?: number | null
  }
  if (anyEv.startYear && anyEv.startYear > 0) {
    const startText = `${anyEv.startEra === 'BC' ? 'BC ' : ''}${anyEv.startYear}${
      anyEv.startMonth ? `.${String(anyEv.startMonth).padStart(2, '0')}` : ''
    }`
    const endText =
      anyEv.endYear && anyEv.endYear > 0
        ? `${anyEv.endEra === 'BC' ? 'BC ' : ''}${anyEv.endYear}${
            anyEv.endMonth ? `.${String(anyEv.endMonth).padStart(2, '0')}` : ''
          }`
        : null
    return endText && endText !== startText ? `${startText} ~ ${endText}` : startText
  }
  return '연도 미상'
}

function classifyConflictBucket(
  typeStr: string | null | undefined,
): Exclude<ConflictFilterKey, 'ALL'> {
  if (typeStr === 'WAR') return 'WAR'
  if (
    typeStr === 'BATTLE' ||
    typeStr === 'CAMPAIGN' ||
    typeStr === 'SIEGE'
  ) {
    return 'BATTLE'
  }
  if (
    typeStr === 'UPRISING' ||
    typeStr === 'REBELLION' ||
    typeStr === 'COUP' ||
    typeStr === 'ATTACK'
  ) {
    return 'UPRISING_ATTACK'
  }
  return 'OTHER'
}

function resolveOutcomeTone(
  outcome: string | null | undefined,
): 'victory' | 'defeat' | 'neutral' {
  if (outcome === 'VICTORY') return 'victory'
  if (outcome === 'DEFEAT') return 'defeat'
  return 'neutral'
}

export function CountryMilitaryWarsPanel({
  country,
  linkedHistoricalCountryIds = [],
  units = [],
  onSelectUnit,
}: CountryMilitaryWarsPanelProps) {
  const navigate = useNavigate()
  const isHistorical = country.type === 'historical'

  const [conflictFilter, setConflictFilter] =
    useState<ConflictFilterKey>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [collapsedWarIds, setCollapsedWarIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [showWarDeclarations, setShowWarDeclarations] = useState(false)

  const relatedHistKey = linkedHistoricalCountryIds.join(',')

  const militaryEventsQuery = useQuery({
    queryKey: [
      'country-military-events',
      country.type,
      country.id,
      isHistorical ? relatedHistKey : 'auto-linked',
    ],
    queryFn: async () => {
      if (isHistorical) {
        const targetIds = Array.from(
          new Set([country.id, ...linkedHistoricalCountryIds]),
        )
        return getAllEvents({
          historicalCountryIds: targetIds,
          domain: 'MILITARY',
          includeSubEvents: true,
          limit: EVENTS_LIMIT_ALL,
        })
      }

      return getAllEvents({
        countryId: country.id,
        domain: 'MILITARY',
        includeSubEvents: true,
        limit: EVENTS_LIMIT_ALL,
      })
    },
    staleTime: 60_000,
  })

  const rawEvents = useMemo(
    () => (militaryEventsQuery.data ?? []) as ExtendedMilitaryEvent[],
    [militaryEventsQuery.data],
  )

  const deployedUnitsByEventId = useMemo(() => {
    const map = new Map<string, DeployedUnitChipData[]>()
    const typedUnits = units as DeployedUnitSummary[]
    for (const unitItem of typedUnits) {
      for (const dep of unitItem.sideDeployedUnits ?? []) {
        const evId = dep.side?.event?.id
        if (!evId) continue
        const bucket = map.get(evId) ?? []
        if (!bucket.some((item) => item.id === unitItem.id)) {
          bucket.push({
            id: unitItem.id,
            name: unitItem.name,
            abbreviation: unitItem.abbreviation,
            unitType: unitItem.unitType,
          })
          map.set(evId, bucket)
        }
      }
    }
    return map
  }, [units])

  const bucketCounts = useMemo(() => {
    const counts: Record<ConflictFilterKey, number> = {
      ALL: rawEvents.length,
      WAR: 0,
      BATTLE: 0,
      UPRISING_ATTACK: 0,
      OTHER: 0,
    }
    for (const ev of rawEvents) {
      counts[classifyConflictBucket(ev.type)] += 1
    }
    return counts
  }, [rawEvents])

  const filteredEvents = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase()
    const list = rawEvents.filter((ev) => {
      if (
        conflictFilter !== 'ALL' &&
        classifyConflictBucket(ev.type) !== conflictFilter
      ) {
        return false
      }
      if (queryText) {
        const counterparts = [
          ...(ev.relatedCountries ?? []).map(
            (countryItem) => `${countryItem.name} ${countryItem.sideName ?? ''}`,
          ),
          ...(ev.relatedHistoricalCountries ?? []).map(
            (histItem) => `${histItem.name} ${histItem.sideName ?? ''}`,
          ),
        ].join(' ')
        const deployedNames = (deployedUnitsByEventId.get(ev.id) ?? [])
          .map((unitItem) => `${unitItem.name} ${unitItem.abbreviation ?? ''}`)
          .join(' ')
        const hay = [
          ev.title,
          ev.parentEvent?.title,
          ev.type,
          counterparts,
          deployedNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(queryText)) return false
      }
      return true
    })

    const mult = sortDir === 'asc' ? 1 : -1
    return [...list].sort((leftEv, rightEv) => {
      const kA = getEventChronologyKey(leftEv)
      const kB = getEventChronologyKey(rightEv)
      if (kA !== kB) {
        if (kA === Number.MAX_SAFE_INTEGER) return 1
        if (kB === Number.MAX_SAFE_INTEGER) return -1
        return (kA - kB) * mult
      }
      return leftEv.title.localeCompare(rightEv.title, 'ko')
    })
  }, [
    rawEvents,
    conflictFilter,
    searchQuery,
    sortDir,
    deployedUnitsByEventId,
  ])

  /**
   * 전체(ALL) + 비검색 상태에서는 상위 전쟁(parentEventId) 아래에 하위 전투·작전을 들여써 계층 표시한다.
   */
  const displayRows = useMemo(() => {
    const enableHierarchy =
      conflictFilter === 'ALL' && searchQuery.trim().length === 0
    if (!enableHierarchy) {
      return filteredEvents.map((ev) => ({
        kind: 'event' as const,
        ev,
        depth: 0,
        childCount: 0,
      }))
    }

    const byId = new Map<string, ExtendedMilitaryEvent>()
    for (const ev of filteredEvents) {
      byId.set(ev.id, ev)
    }

    const childrenMap = new Map<string, ExtendedMilitaryEvent[]>()
    for (const ev of filteredEvents) {
      if (ev.parentEventId && byId.has(ev.parentEventId)) {
        const bucket = childrenMap.get(ev.parentEventId) ?? []
        bucket.push(ev)
        childrenMap.set(ev.parentEventId, bucket)
      }
    }

    // 하위 전투는 항상 연대순(과거 -> 미래)으로 정렬해 전쟁 전개 흐름을 자연스럽게 읽게 함
    for (const bucket of childrenMap.values()) {
      bucket.sort((leftEv, rightEv) => {
        const kA = getEventChronologyKey(leftEv)
        const kB = getEventChronologyKey(rightEv)
        if (kA !== kB) return kA - kB
        return leftEv.title.localeCompare(rightEv.title, 'ko')
      })
    }

    const rows: Array<{
      kind: 'event'
      ev: ExtendedMilitaryEvent
      depth: number
      childCount: number
    }> = []
    const emitted = new Set<string>()

    const emitNode = (ev: ExtendedMilitaryEvent, depth: number) => {
      if (emitted.has(ev.id)) return
      emitted.add(ev.id)
      const kids = childrenMap.get(ev.id) ?? []
      rows.push({
        kind: 'event',
        ev,
        depth,
        childCount: kids.length,
      })
      if (kids.length > 0 && !collapsedWarIds.has(ev.id)) {
        for (const child of kids) {
          emitNode(child, depth + 1)
        }
      } else if (kids.length > 0 && collapsedWarIds.has(ev.id)) {
        // 접힌 전쟁의 하위 전투들은 루트에서 중복 출력되지 않도록 방문 처리
        const markHidden = (items: ExtendedMilitaryEvent[]) => {
          for (const item of items) {
            emitted.add(item.id)
            const grand = childrenMap.get(item.id)
            if (grand) markHidden(grand)
          }
        }
        markHidden(kids)
      }
    }

    for (const ev of filteredEvents) {
      if (ev.parentEventId && byId.has(ev.parentEventId)) {
        continue
      }
      emitNode(ev, 0)
    }

    // 혹시 순환 참조 등으로 누락된 사건이 있으면 끝에 추가
    for (const ev of filteredEvents) {
      if (!emitted.has(ev.id)) {
        emitNode(ev, 0)
      }
    }

    return rows
  }, [filteredEvents, conflictFilter, searchQuery, collapsedWarIds])

  const linkedHistSet = useMemo(
    () => new Set(linkedHistoricalCountryIds),
    [linkedHistoricalCountryIds],
  )

  const toggleWarCollapse = (warId: string) => {
    setCollapsedWarIds((prev) => {
      const next = new Set(prev)
      if (next.has(warId)) next.delete(warId)
      else next.add(warId)
      return next
    })
  }

  return (
    <PanelStack>
      {showWarDeclarations ? (
        <WarDeclarationsSection
          historicalCountryId={isHistorical ? country.id : undefined}
          countryId={!isHistorical ? country.id : undefined}
          linkedHistoricalCountryIds={linkedHistoricalCountryIds}
        />
      ) : null}

      <ConflictsCanvas aria-label="참전 전쟁 및 군사 사건 원장">
        <FilterToolbar>
          <ChipRow role="group" aria-label="군사 사건 유형 필터">
            <ConflictTabBtn
              type="button"
              $active={conflictFilter === 'ALL'}
              onClick={() => setConflictFilter('ALL')}
            >
              <span>전체</span>
              <small>{bucketCounts.ALL}</small>
            </ConflictTabBtn>
            <ConflictTabBtn
              type="button"
              $active={conflictFilter === 'WAR'}
              onClick={() => setConflictFilter('WAR')}
            >
              <span>전쟁</span>
              <small>{bucketCounts.WAR}</small>
            </ConflictTabBtn>
            <ConflictTabBtn
              type="button"
              $active={conflictFilter === 'BATTLE'}
              onClick={() => setConflictFilter('BATTLE')}
            >
              <span>전투·작전</span>
              <small>{bucketCounts.BATTLE}</small>
            </ConflictTabBtn>
            {bucketCounts.UPRISING_ATTACK > 0 ||
            conflictFilter === 'UPRISING_ATTACK' ? (
              <ConflictTabBtn
                type="button"
                $active={conflictFilter === 'UPRISING_ATTACK'}
                onClick={() => setConflictFilter('UPRISING_ATTACK')}
              >
                <span>봉기·무력충돌</span>
                <small>{bucketCounts.UPRISING_ATTACK}</small>
              </ConflictTabBtn>
            ) : null}
            {bucketCounts.OTHER > 0 || conflictFilter === 'OTHER' ? (
              <ConflictTabBtn
                type="button"
                $active={conflictFilter === 'OTHER'}
                onClick={() => setConflictFilter('OTHER')}
              >
                <span>선전포고·동원·기타</span>
                <small>{bucketCounts.OTHER}</small>
              </ConflictTabBtn>
            ) : null}
          </ChipRow>

          <FilterRight>
            <LedgerSearchBox style={{ maxWidth: 268 }}>
              <FiSearch />
              <LedgerSearchInput
                type="search"
                placeholder="전쟁·전투, 진영·교전국, 투입 부대 검색…"
                value={searchQuery}
                onChange={(evt) => setSearchQuery(evt.target.value)}
              />
              {searchQuery ? (
                <ClearBtn
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => setSearchQuery('')}
                >
                  <FiX size={12} />
                </ClearBtn>
              ) : null}
            </LedgerSearchBox>

            <PopoverMenu
              ariaLabel="전쟁·참전사 정렬 및 보기 설정"
              title="정렬 순서 · 선전포고 이력 보기 설정"
              active={showWarDeclarations}
              minWidth={224}
              items={[
                { type: 'section', id: 'sec-sort', label: '정렬 순서' },
                {
                  id: 'sort-desc',
                  label: '최신순 (최근 사건부터)',
                  icon: <FiArrowDown size={12.5} />,
                  checked: sortDir === 'desc',
                  onSelect: () => setSortDir('desc'),
                },
                {
                  id: 'sort-asc',
                  label: '연대순 (과거 사건부터)',
                  icon: <FiArrowUp size={12.5} />,
                  checked: sortDir === 'asc',
                  onSelect: () => setSortDir('asc'),
                },
                { type: 'divider', id: 'div-panel' },
                { type: 'section', id: 'sec-panel', label: '보조 패널' },
                {
                  id: 'toggle-declarations',
                  label: '선전포고 · 참전 이력 섹션 표시',
                  icon: <FiShield size={12.5} />,
                  checked: showWarDeclarations,
                  onSelect: () => setShowWarDeclarations((prev) => !prev),
                },
                ...(conflictFilter !== 'ALL' || Boolean(searchQuery.trim())
                  ? [
                      { type: 'divider' as const, id: 'div-reset' },
                      {
                        id: 'reset',
                        label: '필터 초기화',
                        icon: <FiRotateCcw size={12.5} />,
                        onSelect: () => {
                          setConflictFilter('ALL')
                          setSearchQuery('')
                        },
                      },
                    ]
                  : []),
              ]}
            />
          </FilterRight>
        </FilterToolbar>

        {militaryEventsQuery.isLoading ? (
          <ChartSkeleton variant="bars" rows={5} />
        ) : rawEvents.length === 0 ? (
          <EmptyStateSpotlight
            flat
            icon={<FiShield size={22} />}
            title="등록된 군사·전쟁 사건이 없습니다"
            description="사건 등록 시 분야를 ‘군사(MILITARY)’로 지정하고 관련 국가를 연결하면 이곳에 자동 집계됩니다."
            primaryAction={{
              label: '군사 사건 등록',
              onClick: () => navigate(pathKeys.events.create()),
            }}
          />
        ) : displayRows.length === 0 ? (
          <EmptyStateSpotlight
            flat
            icon={<FiSearch size={20} />}
            title="필터 조건에 맞는 전쟁·전투 기록이 없습니다"
            description="유형 필터나 검색어를 초기화해 보세요."
            primaryAction={{
              label: '필터 초기화',
              onClick: () => {
                setConflictFilter('ALL')
                setSearchQuery('')
              },
            }}
          />
        ) : (
          <TableScroll>
            <ConflictsTable>
              <thead>
                <tr>
                  <th style={{ width: 142 }}>시기</th>
                  <th>전쟁 · 전투 · 투입 편제</th>
                  <th style={{ width: 108 }}>분류</th>
                  <th>진영 · 결과 · 상대국</th>
                  <th style={{ width: 108, textAlign: 'right' }}>전황·서열</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map(({ ev, depth, childCount }) => {
                  const periodText = formatMilitaryEventPeriod(ev)
                  const typeLabel = ev.type
                    ? (CONFLICT_TYPE_LABEL[ev.type] ?? ev.type)
                    : '군사사건'

                  const selfModerns = !isHistorical
                    ? (ev.relatedCountries ?? []).filter(
                        (countryItem) => countryItem.id === country.id,
                      )
                    : []
                  const selfHistoricals = (
                    ev.relatedHistoricalCountries ?? []
                  ).filter(
                    (histItem) =>
                      (isHistorical && histItem.id === country.id) ||
                      linkedHistSet.has(histItem.id),
                  )
                  const allSelfMatches = [...selfModerns, ...selfHistoricals]
                  const primarySelf = allSelfMatches[0]

                  const selfRoleCode = primarySelf?.role ?? null
                  const selfRoleText = selfRoleCode
                    ? (ROLE_LABEL[selfRoleCode] ?? selfRoleCode)
                    : null

                  const sideMatch = allSelfMatches.find(
                    (matchItem) => matchItem.sideOutcome || matchItem.sideName,
                  )
                  const sideName =
                    sideMatch?.sideName &&
                    !isPlaceholderSideName(sideMatch.sideName)
                      ? sideMatch.sideName
                      : null
                  const sideColor = sideMatch?.sideColor ?? null
                  const rawOutcome = sideMatch?.sideOutcome as
                    | SideOutcome
                    | undefined
                    | null
                  const outcomeLabel =
                    rawOutcome && rawOutcome in SIDE_OUTCOME_LABEL
                      ? SIDE_OUTCOME_LABEL[rawOutcome]
                      : null

                  const distinctHistNames = Array.from(
                    new Set(
                      selfHistoricals
                        .map((histItem) => histItem.name)
                        .filter(
                          (nameVal) =>
                            Boolean(nameVal) && nameVal !== country.name,
                        ),
                    ),
                  )

                  const counterparts = Array.from(
                    new Set([
                      ...(ev.relatedHistoricalCountries ?? [])
                        .filter(
                          (histItem) =>
                            !(isHistorical && histItem.id === country.id) &&
                            !linkedHistSet.has(histItem.id),
                        )
                        .map((histItem) => histItem.name),
                      ...(ev.relatedCountries ?? [])
                        .filter(
                          (countryItem) =>
                            isHistorical || countryItem.id !== country.id,
                        )
                        .map((countryItem) => countryItem.name),
                    ]),
                  ).slice(0, 4)

                  const deployedUnits = deployedUnitsByEventId.get(ev.id) ?? []
                  const isCollapsed = collapsedWarIds.has(ev.id)
                  const showOrphanParent =
                    depth === 0 && Boolean(ev.parentEvent?.id)
                  const isWarRow = ev.type === 'WAR' || childCount > 0

                  return (
                    <tr key={ev.id}>
                      <td className="num">{periodText}</td>
                      <td>
                        <EventTitleCell $depth={depth}>
                          <EventTitleStack>
                            {depth > 0 ? (
                              <ChildIndentMark aria-hidden="true">
                                ↳
                              </ChildIndentMark>
                            ) : null}
                            {childCount > 0 ? (
                              <CollapseWarBtn
                                type="button"
                                onClick={() => toggleWarCollapse(ev.id)}
                                title={
                                  isCollapsed
                                    ? `하위 전투·작전 ${childCount}건 펼치기`
                                    : `하위 전투·작전 ${childCount}건 접기`
                                }
                              >
                                {isCollapsed ? (
                                  <FiChevronRight size={13} />
                                ) : (
                                  <FiChevronDown size={13} />
                                )}
                              </CollapseWarBtn>
                            ) : null}

                            <EventTitleLink
                              to={pathKeys.events.detail(ev.id)}
                              $isWar={isWarRow}
                            >
                              {ev.title}
                              <OpenIcon aria-hidden="true">
                                <FiArrowUpRight size={12} />
                              </OpenIcon>
                            </EventTitleLink>

                            {childCount > 0 ? (
                              <ChildCountBtn
                                type="button"
                                onClick={() => toggleWarCollapse(ev.id)}
                              >
                                하위 {childCount}
                              </ChildCountBtn>
                            ) : null}

                            {distinctHistNames.length > 0 ? (
                              <PolityHintText>
                                {distinctHistNames.join(' · ')}
                              </PolityHintText>
                            ) : null}

                            {showOrphanParent && ev.parentEvent ? (
                              <ParentWarLink
                                to={pathKeys.events.detail(ev.parentEvent.id)}
                              >
                                상위: {ev.parentEvent.title}
                              </ParentWarLink>
                            ) : null}
                          </EventTitleStack>

                          {deployedUnits.length > 0 ? (
                            <DeployedUnitsRow>
                              <DeployedPrefix>투입 편제</DeployedPrefix>
                              {deployedUnits.slice(0, 5).map((unitChip, idx) => (
                                <React.Fragment key={unitChip.id}>
                                  {idx > 0 ? (
                                    <UnitSepDot aria-hidden>·</UnitSepDot>
                                  ) : null}
                                  <DeployedUnitLinkBtn
                                    type="button"
                                    title={
                                      unitChip.unitType
                                        ? `${militaryUnitTypeLabelKo(unitChip.unitType)} 상세 보기`
                                        : '편제 상세 보기'
                                    }
                                    onClick={(evt) => {
                                      if (!shouldInterceptEntityClick(evt)) {
                                        navigate(
                                          pathKeys.militaryUnitDetail(
                                            unitChip.id,
                                          ),
                                        )
                                        return
                                      }
                                      if (onSelectUnit) {
                                        onSelectUnit(unitChip.id)
                                      } else {
                                        navigate(
                                          pathKeys.militaryUnitDetail(
                                            unitChip.id,
                                          ),
                                        )
                                      }
                                    }}
                                  >
                                    {unitChip.abbreviation || unitChip.name}
                                  </DeployedUnitLinkBtn>
                                </React.Fragment>
                              ))}
                              {deployedUnits.length > 5 ? (
                                <MoreUnitsSpan>
                                  +{deployedUnits.length - 5}
                                </MoreUnitsSpan>
                              ) : null}
                            </DeployedUnitsRow>
                          ) : null}
                        </EventTitleCell>
                      </td>
                      <td>
                        <TypeText $isWar={ev.type === 'WAR'}>
                          {typeLabel}
                        </TypeText>
                      </td>
                      <td>
                        <MetaInline>
                          {outcomeLabel ? (
                            <OutcomeIndicator
                              $tone={resolveOutcomeTone(rawOutcome)}
                              title={sideMatch?.sideOutcomeNote ?? undefined}
                            >
                              {outcomeLabel}
                            </OutcomeIndicator>
                          ) : null}
                          {sideName ? (
                            <CoalitionText>
                              {sideColor ? (
                                <SideDot $color={sideColor} />
                              ) : null}
                              {sideName}
                            </CoalitionText>
                          ) : null}
                          {selfRoleText ? (
                            <RoleText>{selfRoleText}</RoleText>
                          ) : null}
                          {counterparts.length > 0 ? (
                            <CounterpartText>
                              vs {counterparts.join(' · ')}
                            </CounterpartText>
                          ) : !outcomeLabel && !sideName && !selfRoleText ? (
                            <CounterpartText>—</CounterpartText>
                          ) : null}
                        </MetaInline>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {ev.kind === 'COLLECTION' ? (
                          <SurveyTextLink
                            to={`${pathKeys.events.detail(ev.id)}?tab=survey`}
                          >
                            조망·전황 ↗
                          </SurveyTextLink>
                        ) : (
                          <SurveyTextLink
                            to={`${pathKeys.events.detail(ev.id)}?tab=modules#module-sides`}
                          >
                            전투서열 ↗
                          </SurveyTextLink>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </ConflictsTable>
          </TableScroll>
        )}
      </ConflictsCanvas>
    </PanelStack>
  )
}

const PanelStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const ConflictsCanvas = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const FilterToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 4px 0 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
`

const ConflictTabBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 7px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;

  small {
    font-size: 11.5px;
    font-weight: 600;
    ${DIGIT_DISPLAY}
    opacity: ${({ $active }) => ($active ? 0.95 : 0.65)};
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const FilterRight = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

const ClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const OpenIcon = styled.span`
  display: inline-flex;
  align-items: center;
  opacity: 0;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition: opacity 0.12s ease, transform 0.12s ease;
`

const ConflictsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 8.5px 10px;
    font-size: 11.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    background: ${({ theme }) => ledgerBackground(theme.mode)};
    border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    white-space: nowrap;

    &:first-child {
      padding-left: 4px;
    }

    &:last-child {
      padding-right: 4px;
    }
  }

  td {
    padding: 11px 10px;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.primary};
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    vertical-align: middle;

    &:first-child {
      padding-left: 4px;
    }

    &:last-child {
      padding-right: 4px;
    }
  }

  td.num {
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: nowrap;
    font-size: 12px;
  }

  tbody tr:hover td {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};

    ${OpenIcon} {
      opacity: 0.9;
      transform: translate(1px, -1px);
    }
  }
`

const EventTitleCell = styled.div<{ $depth: number }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: ${({ $depth }) => ($depth > 0 ? $depth * 20 : 0)}px;
`

const EventTitleStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 5px 8px;
`

const ChildIndentMark = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CollapseWarBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ChildCountBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  ${DIGIT_DISPLAY}

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const EventTitleLink = styled(Link)<{ $isWar?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ $isWar }) => ($isWar ? '14px' : '13px')};
  font-weight: ${({ $isWar }) => ($isWar ? 760 : 620)};
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const PolityHintText = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ParentWarLink = styled(Link)`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const DeployedUnitsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 5px;
  font-size: 11.5px;
`

const DeployedPrefix = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
`

const UnitSepDot = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.55;
`

const DeployedUnitLinkBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const MoreUnitsSpan = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const TypeText = styled.span<{ $isWar?: boolean }>`
  font-size: 12px;
  font-weight: ${({ $isWar }) => ($isWar ? 700 : 550)};
  color: ${({ theme, $isWar }) =>
    $isWar ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const MetaInline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 8px;
  font-size: 12.5px;
`

const OutcomeIndicator = styled.span<{
  $tone: 'victory' | 'defeat' | 'neutral'
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $tone }) =>
    $tone === 'victory'
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : $tone === 'defeat'
        ? theme.mode === 'dark'
          ? '#fda4af'
          : '#be123c'
        : theme.colors.text.secondary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $tone }) =>
      $tone === 'victory'
        ? '#10b981'
        : $tone === 'defeat'
          ? '#f43f5e'
          : '#94a3b8'};
  }
`

const CoalitionText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SideDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const RoleText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CounterpartText = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SurveyTextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`


