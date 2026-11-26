import React, { useCallback, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowDown,
  FiArrowLeft,
  FiArrowRight,
  FiArrowUp,
  FiArrowUpRight,
  FiChevronDown,
  FiChevronRight,
  FiGitBranch,
  FiPlus,
  FiSearch,
  FiShield,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  type EventCountryParticipant,
  eventCountryRoleLabel,
} from '@/entities/event/model/country-participant'
import { eventTypeLabel } from '@/entities/event/model/event-type-registry'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
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
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import {
  UnderlineTabBadge,
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal/country-inline-modal'
import {
  type EventParentPreset,
  EventRegisterModal,
} from '@/widgets/event-form/ui/event-register-modal'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'

import {
  LedgerSearchBox,
  LedgerSearchInput,
} from './country-ledger-primitives'

export interface CountryMilitaryWarsPanelProps {
  country: UnifiedCountry
  linkedHistoricalCountryIds?: string[]
  units?: unknown[]
  onSelectUnit?: (unitId: string) => void
}

type ConflictFilterKey = 'ALL' | 'WAR' | 'BATTLE' | 'UPRISING_ATTACK' | 'OTHER'
type OutcomeFilterKey = 'ALL' | 'VICTORY' | 'DEFEAT' | 'OTHER_OUTCOME'
type OutcomeTone = 'victory' | 'defeat' | 'amber' | 'neutral'
type DeclarationDirection = 'declared' | 'targeted' | 'other'

interface CountryParticipantMeta {
  id: string
  name: string
  role?: string | null
  roleDescription?: string | null
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

interface CounterpartCountryItem {
  id: string
  name: string
  isHistorical: boolean
}

interface ResolvedEventMeta {
  periodText: string
  durationHint: string | null
  typeLabel: string
  isWarRow: boolean
  isDeclaration: boolean
  declarationDir: DeclarationDirection
  outcomeTone: OutcomeTone
  outcomeLabel: string | null
  outcomeNote: string | null
  selfRoleText: string | null
  selfRoleDescription: string | null
  sideName: string | null
  sideColor: string | null
  hasSidesContext: boolean
  distinctPolities: Array<{ id: string; name: string }>
  counterparts: CounterpartCountryItem[]
  deployedUnits: DeployedUnitChipData[]
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

const LEGACY_ROLE_LABEL: Record<string, string> = {
  AGGRESSOR: '공격·선포',
  DEFENDER: '방어·응전',
  BELLIGERENT: '교전국',
  VICTOR: '승전국',
  DEFEATED: '패전국',
  ALLY: '동맹·지원',
  HOST: '전장·발생지',
  PARTICIPANT: '참전·관여',
}

const OUTCOME_FILTER_OPTIONS: ReadonlyArray<{
  key: OutcomeFilterKey
  label: string
}> = [
  { key: 'ALL', label: '전체 결과' },
  { key: 'VICTORY', label: '승전' },
  { key: 'DEFEAT', label: '패전' },
  { key: 'OTHER_OUTCOME', label: '무승부·철수' },
]

function resolveRoleLabel(
  roleCode: string | null | undefined,
  eventType?: string | null,
): string | null {
  if (!roleCode) return null
  if (eventType === 'WAR_DECLARATION' && roleCode === 'TARGET') {
    return '피선포국'
  }
  return (
    eventCountryRoleLabel(roleCode, eventType) ??
    LEGACY_ROLE_LABEL[roleCode] ??
    null
  )
}

function getEventSignedStartYear(ev: EventResponseDto): number | null {
  const parts = parseIsoDateParts(ev.startDate)
  if (parts) return parts.year
  const anyEv = ev as unknown as {
    startEra?: string | null
    startYear?: number | null
  }
  if (anyEv.startYear && anyEv.startYear > 0) {
    return anyEv.startEra === 'BC'
      ? -Math.abs(anyEv.startYear)
      : anyEv.startYear
  }
  return null
}

function toCenturyIndex(signedYear: number | null): number | null {
  if (signedYear == null || signedYear === 0) return null
  return signedYear < 0
    ? -Math.ceil(Math.abs(signedYear) / 100)
    : Math.ceil(signedYear / 100)
}

function formatCenturyHeading(centuryIdx: number): string {
  return centuryIdx < 0
    ? `기원전 ${Math.abs(centuryIdx)}세기`
    : `${centuryIdx}세기`
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
    return endText && endText !== startText
      ? `${startText} ~ ${endText}`
      : startText
  }
  return '연도 미상'
}

function computeEventDurationHint(ev: EventResponseDto): string | null {
  if (!ev.startDate || !ev.endDate) return null
  const startParts = parseIsoDateParts(ev.startDate)
  const endParts = parseIsoDateParts(ev.endDate)
  if (!startParts || !endParts) return null

  const totalMonths =
    (endParts.year - startParts.year) * 12 + (endParts.month - startParts.month)
  if (totalMonths <= 0) return null

  if (
    ev.startDatePrecision === 'YEAR' ||
    ev.endDatePrecision === 'YEAR'
  ) {
    const yearDiff = endParts.year - startParts.year
    return yearDiff >= 1 ? `약 ${yearDiff + 1}년` : null
  }

  const years = Math.floor(totalMonths / 12)
  const remMonths = totalMonths % 12
  if (years >= 1 && remMonths >= 1) return `${years}년 ${remMonths}개월`
  if (years >= 1) return `${years}년`
  if (remMonths >= 2) return `${remMonths}개월`
  return null
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
    typeStr === 'ATTACK' ||
    typeStr === 'PROTEST_VIOLENCE' ||
    typeStr === 'POLITICAL_VIOLENCE'
  ) {
    return 'UPRISING_ATTACK'
  }
  return 'OTHER'
}

function resolveOutcomeTone(outcome: string | null | undefined): OutcomeTone {
  if (!outcome) return 'neutral'
  if (
    outcome === 'VICTORY' ||
    outcome === 'DECISIVE_VICTORY' ||
    outcome === 'STRATEGIC_VICTORY' ||
    outcome === 'TACTICAL_VICTORY'
  ) {
    return 'victory'
  }
  if (
    outcome === 'DEFEAT' ||
    outcome === 'SURRENDER' ||
    outcome === 'COLLAPSE'
  ) {
    return 'defeat'
  }
  if (
    outcome === 'DRAW' ||
    outcome === 'WITHDRAWAL' ||
    outcome === 'STALEMATE' ||
    outcome === 'TRUCE' ||
    outcome === 'CEASEFIRE' ||
    outcome === 'PYRRHIC_VICTORY'
  ) {
    return 'amber'
  }
  return 'neutral'
}

function matchesOutcomeFilter(
  tone: OutcomeTone,
  hasOutcome: boolean,
  filterKey: OutcomeFilterKey,
): boolean {
  if (filterKey === 'ALL') return true
  if (!hasOutcome) return false
  if (filterKey === 'VICTORY') return tone === 'victory'
  if (filterKey === 'DEFEAT') return tone === 'defeat'
  return tone === 'amber' || tone === 'neutral'
}

function resolveInitialEventTypeForTab(
  tabKey: ConflictFilterKey,
): string | null {
  if (tabKey === 'WAR') return 'WAR'
  if (tabKey === 'BATTLE') return 'BATTLE'
  if (tabKey === 'UPRISING_ATTACK') return 'UPRISING'
  if (tabKey === 'OTHER') return 'WAR_DECLARATION'
  return null
}

export function CountryMilitaryWarsPanel({
  country,
  linkedHistoricalCountryIds = [],
  units = [],
  onSelectUnit,
}: CountryMilitaryWarsPanelProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isHistorical = country.type === 'historical'

  const [conflictFilter, setConflictFilter] =
    useState<ConflictFilterKey>('ALL')
  const [eraFilter, setEraFilter] = useState<string>('ALL')
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilterKey>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [collapsedWarIds, setCollapsedWarIds] = useState<Set<string>>(
    () => new Set(),
  )

  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [registerParentPreset, setRegisterParentPreset] = useState<
    EventParentPreset | undefined
  >(undefined)
  const [registerTypeOverride, setRegisterTypeOverride] = useState<
    string | null
  >(null)

  const relatedHistKey = linkedHistoricalCountryIds.join(',')
  const linkedHistSet = useMemo(
    () => new Set(linkedHistoricalCountryIds),
    [linkedHistoricalCountryIds],
  )

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

  const resolveEventMeta = useCallback(
    (ev: ExtendedMilitaryEvent, childCount = 0): ResolvedEventMeta => {
      const periodText = formatMilitaryEventPeriod(ev)
      const durationHint = computeEventDurationHint(ev)
      const evTypeStr: string | null = ev.type ?? null
      const typeLabel = evTypeStr
        ? (CONFLICT_TYPE_LABEL[evTypeStr] ??
          eventTypeLabel(ev.type) ??
          evTypeStr)
        : '군사사건'

      const selfModerns = !isHistorical
        ? (ev.relatedCountries ?? []).filter(
            (countryItem) => countryItem.id === country.id,
          )
        : []
      const selfHistoricals = (ev.relatedHistoricalCountries ?? []).filter(
        (histItem) =>
          (isHistorical && histItem.id === country.id) ||
          linkedHistSet.has(histItem.id),
      )
      const allSelfMatches = [...selfModerns, ...selfHistoricals]
      const primarySelf = allSelfMatches[0]

      const selfRoleCode = primarySelf?.role ?? null
      const selfRoleText = resolveRoleLabel(selfRoleCode, ev.type)
      const selfRoleDescription = primarySelf?.roleDescription?.trim() || null

      const isDeclaration = ev.type === 'WAR_DECLARATION'
      const declarationDir: DeclarationDirection = !isDeclaration
        ? 'other'
        : selfRoleCode === 'INITIATOR' || selfRoleCode === 'AGGRESSOR'
          ? 'declared'
          : selfRoleCode === 'TARGET' || selfRoleCode === 'DEFENDER'
            ? 'targeted'
            : 'other'

      const sideMatch = allSelfMatches.find(
        (matchItem) => matchItem.sideOutcome || matchItem.sideName,
      )
      const sideName =
        sideMatch?.sideName && !isPlaceholderSideName(sideMatch.sideName)
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
      const outcomeTone = resolveOutcomeTone(rawOutcome)
      const outcomeNote = sideMatch?.sideOutcomeNote?.trim() || null

      const polityMap = new Map<string, string>()
      for (const histItem of selfHistoricals) {
        if (histItem.id && histItem.name && histItem.name !== country.name) {
          polityMap.set(histItem.id, histItem.name)
        }
      }
      const distinctPolities = Array.from(polityMap.entries()).map(
        ([polityId, polityName]) => ({ id: polityId, name: polityName }),
      )

      const counterpartMap = new Map<string, CounterpartCountryItem>()
      const shouldIncludeCounterpartRole = (
        roleVal: string | null | undefined,
      ): boolean => {
        if (!isDeclaration || declarationDir === 'other') return true
        if (declarationDir === 'declared') return roleVal === 'TARGET'
        return roleVal === 'INITIATOR'
      }

      const collectCounterparts = (strictRoleFilter: boolean) => {
        for (const histItem of ev.relatedHistoricalCountries ?? []) {
          if (
            (isHistorical && histItem.id === country.id) ||
            linkedHistSet.has(histItem.id)
          ) {
            continue
          }
          if (strictRoleFilter && !shouldIncludeCounterpartRole(histItem.role)) {
            continue
          }
          if (
            sideMatch?.sideId &&
            histItem.sideId &&
            histItem.sideId === sideMatch.sideId
          ) {
            continue
          }
          if (!counterpartMap.has(histItem.name)) {
            counterpartMap.set(histItem.name, {
              id: histItem.id,
              name: histItem.name,
              isHistorical: true,
            })
          }
        }
        for (const modItem of ev.relatedCountries ?? []) {
          if (!isHistorical && modItem.id === country.id) continue
          if (strictRoleFilter && !shouldIncludeCounterpartRole(modItem.role)) {
            continue
          }
          if (
            sideMatch?.sideId &&
            modItem.sideId &&
            modItem.sideId === sideMatch.sideId
          ) {
            continue
          }
          if (!counterpartMap.has(modItem.name)) {
            counterpartMap.set(modItem.name, {
              id: modItem.id,
              name: modItem.name,
              isHistorical: false,
            })
          }
        }
      }

      collectCounterparts(true)
      if (counterpartMap.size === 0 && isDeclaration) {
        collectCounterparts(false)
      }

      const deployedUnits = deployedUnitsByEventId.get(ev.id) ?? []
      const hasSidesContext = Boolean(
        sideMatch?.sideId ||
          sideName ||
          outcomeLabel ||
          deployedUnits.length > 0 ||
          evTypeStr === 'WAR' ||
          evTypeStr === 'BATTLE' ||
          evTypeStr === 'CAMPAIGN' ||
          evTypeStr === 'SIEGE',
      )

      return {
        periodText,
        durationHint,
        typeLabel,
        isWarRow: ev.type === 'WAR' || childCount > 0,
        isDeclaration,
        declarationDir,
        outcomeTone,
        outcomeLabel,
        outcomeNote,
        selfRoleText,
        selfRoleDescription,
        sideName,
        sideColor,
        hasSidesContext,
        distinctPolities,
        counterparts: Array.from(counterpartMap.values()).slice(0, 4),
        deployedUnits,
      }
    },
    [country.id, country.name, deployedUnitsByEventId, isHistorical, linkedHistSet],
  )

  const resolvedMetaById = useMemo(() => {
    const map = new Map<string, ResolvedEventMeta>()
    for (const ev of rawEvents) {
      map.set(ev.id, resolveEventMeta(ev, 0))
    }
    return map
  }, [rawEvents, resolveEventMeta])

  const warRecordSummary = useMemo(() => {
    let wars = 0
    let battles = 0
    let victories = 0
    let defeats = 0
    let otherOutcomes = 0

    for (const ev of rawEvents) {
      const bucket = classifyConflictBucket(ev.type)
      if (bucket === 'WAR') wars += 1
      else if (bucket === 'BATTLE') battles += 1

      const meta = resolvedMetaById.get(ev.id)
      if (meta?.outcomeLabel) {
        if (meta.outcomeTone === 'victory') victories += 1
        else if (meta.outcomeTone === 'defeat') defeats += 1
        else otherOutcomes += 1
      }
    }

    return {
      wars,
      battles,
      victories,
      defeats,
      otherOutcomes,
      hasAnyOutcome: victories + defeats + otherOutcomes > 0,
    }
  }, [rawEvents, resolvedMetaById])

  const eraSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    let directCount = 0
    const histCounts = new Map<string, { name: string; count: number }>()

    for (const ev of rawEvents) {
      const hasDirectModern =
        !isHistorical &&
        (ev.relatedCountries ?? []).some(
          (countryItem) => countryItem.id === country.id,
        )
      const hasDirectSelfHist =
        isHistorical &&
        (ev.relatedHistoricalCountries ?? []).some(
          (histItem) => histItem.id === country.id,
        )

      if (hasDirectModern || hasDirectSelfHist) {
        directCount += 1
      }

      for (const histItem of ev.relatedHistoricalCountries ?? []) {
        if (isHistorical && histItem.id === country.id) continue
        if (!linkedHistSet.has(histItem.id)) continue
        const existing = histCounts.get(histItem.id)
        if (existing) {
          existing.count += 1
        } else {
          histCounts.set(histItem.id, { name: histItem.name, count: 1 })
        }
      }
    }

    if (histCounts.size === 0) return []

    const options: SearchableSelectOption[] = []
    if (directCount > 0) {
      options.push({
        value: isHistorical ? country.id : 'MODERN',
        label: isHistorical ? `${country.name} 직속` : '현대 직속',
        meta: `${directCount}건`,
      })
    }
    const sortedHist = Array.from(histCounts.entries()).sort((left, right) => {
      if (right[1].count !== left[1].count) {
        return right[1].count - left[1].count
      }
      return left[1].name.localeCompare(right[1].name, 'ko')
    })
    for (const [histId, info] of sortedHist) {
      options.push({
        value: histId,
        label: info.name,
        meta: `${info.count}건`,
      })
    }
    return options
  }, [rawEvents, isHistorical, country.id, country.name, linkedHistSet])

  const matchesToolbarFilters = useCallback(
    (ev: ExtendedMilitaryEvent): boolean => {
      if (eraFilter !== 'ALL') {
        if (eraFilter === 'MODERN') {
          const hasModern = (ev.relatedCountries ?? []).some(
            (countryItem) => countryItem.id === country.id,
          )
          if (!hasModern) return false
        } else {
          const hasHist = (ev.relatedHistoricalCountries ?? []).some(
            (histItem) => histItem.id === eraFilter,
          )
          if (!hasHist) return false
        }
      }

      if (outcomeFilter !== 'ALL') {
        const meta = resolvedMetaById.get(ev.id)
        if (
          !meta ||
          !matchesOutcomeFilter(
            meta.outcomeTone,
            Boolean(meta.outcomeLabel),
            outcomeFilter,
          )
        ) {
          return false
        }
      }

      const queryText = searchQuery.trim().toLowerCase()
      if (queryText) {
        const counterparts = [
          ...(ev.relatedCountries ?? []).map(
            (countryItem) =>
              `${countryItem.name} ${countryItem.sideName ?? ''}`,
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
          ev.type ? CONFLICT_TYPE_LABEL[ev.type] : '',
          counterparts,
          deployedNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(queryText)) return false
      }

      return true
    },
    [
      eraFilter,
      outcomeFilter,
      searchQuery,
      country.id,
      resolvedMetaById,
      deployedUnitsByEventId,
    ],
  )

  const bucketCounts = useMemo(() => {
    const counts: Record<ConflictFilterKey, number> = {
      ALL: 0,
      WAR: 0,
      BATTLE: 0,
      UPRISING_ATTACK: 0,
      OTHER: 0,
    }
    for (const ev of rawEvents) {
      if (!matchesToolbarFilters(ev)) continue
      counts.ALL += 1
      counts[classifyConflictBucket(ev.type)] += 1
    }
    return counts
  }, [rawEvents, matchesToolbarFilters])

  const totalTypePresence = useMemo(() => {
    let hasUprising = false
    let hasOther = false
    for (const ev of rawEvents) {
      const bucket = classifyConflictBucket(ev.type)
      if (bucket === 'UPRISING_ATTACK') hasUprising = true
      if (bucket === 'OTHER') hasOther = true
    }
    return { hasUprising, hasOther }
  }, [rawEvents])

  const filteredEvents = useMemo(() => {
    const list = rawEvents.filter((ev) => {
      if (
        conflictFilter !== 'ALL' &&
        classifyConflictBucket(ev.type) !== conflictFilter
      ) {
        return false
      }
      return matchesToolbarFilters(ev)
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
  }, [rawEvents, conflictFilter, matchesToolbarFilters, sortDir])

  const hierarchyResult = useMemo(() => {
    const enableHierarchy =
      conflictFilter === 'ALL' &&
      outcomeFilter === 'ALL' &&
      searchQuery.trim().length === 0

    type EventRowItem = {
      ev: ExtendedMilitaryEvent
      depth: number
      childCount: number
      isLastChild: boolean
    }

    if (!enableHierarchy) {
      return {
        enableHierarchy: false,
        collapsibleWarIds: [] as string[],
        rows: filteredEvents.map((ev) => ({
          ev,
          depth: 0,
          childCount: 0,
          isLastChild: false,
        })),
      }
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

    for (const bucket of childrenMap.values()) {
      bucket.sort((leftEv, rightEv) => {
        const kA = getEventChronologyKey(leftEv)
        const kB = getEventChronologyKey(rightEv)
        if (kA !== kB) return kA - kB
        return leftEv.title.localeCompare(rightEv.title, 'ko')
      })
    }

    const collapsibleWarIds = Array.from(childrenMap.keys())
    const rows: EventRowItem[] = []
    const emitted = new Set<string>()

    const emitNode = (
      ev: ExtendedMilitaryEvent,
      depth: number,
      isLastChild: boolean,
    ) => {
      if (emitted.has(ev.id)) return
      emitted.add(ev.id)
      const kids = childrenMap.get(ev.id) ?? []
      rows.push({
        ev,
        depth,
        childCount: kids.length,
        isLastChild,
      })
      if (kids.length > 0 && !collapsedWarIds.has(ev.id)) {
        kids.forEach((child, idx) => {
          emitNode(child, depth + 1, idx === kids.length - 1)
        })
      } else if (kids.length > 0 && collapsedWarIds.has(ev.id)) {
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
      if (ev.parentEventId && byId.has(ev.parentEventId)) continue
      emitNode(ev, 0, false)
    }

    for (const ev of filteredEvents) {
      if (!emitted.has(ev.id)) {
        emitNode(ev, 0, false)
      }
    }

    return {
      enableHierarchy: true,
      collapsibleWarIds,
      rows,
    }
  }, [
    filteredEvents,
    conflictFilter,
    outcomeFilter,
    searchQuery,
    collapsedWarIds,
  ])

  const displayItems = useMemo(() => {
    const rootCenturies = new Set<number>()
    const centuryCounts = new Map<number, number>()

    for (const rowItem of hierarchyResult.rows) {
      if (rowItem.depth === 0) {
        const cIdx = toCenturyIndex(getEventSignedStartYear(rowItem.ev))
        if (cIdx != null) {
          rootCenturies.add(cIdx)
        }
      }
      const evCentury = toCenturyIndex(getEventSignedStartYear(rowItem.ev))
      if (evCentury != null) {
        centuryCounts.set(evCentury, (centuryCounts.get(evCentury) ?? 0) + 1)
      }
    }

    const showCenturyDividers =
      rootCenturies.size >= 2 && searchQuery.trim().length === 0

    type RenderItem =
      | {
          kind: 'century'
          key: string
          label: string
          count: number
        }
      | {
          kind: 'event'
          ev: ExtendedMilitaryEvent
          depth: number
          childCount: number
          isLastChild: boolean
        }

    if (!showCenturyDividers) {
      return hierarchyResult.rows.map<RenderItem>((rowItem) => ({
        kind: 'event',
        ...rowItem,
      }))
    }

    const items: RenderItem[] = []
    let lastCentury: number | 'UNKNOWN' | null = null

    for (const rowItem of hierarchyResult.rows) {
      if (rowItem.depth === 0) {
        const cIdx =
          toCenturyIndex(getEventSignedStartYear(rowItem.ev)) ?? 'UNKNOWN'
        if (cIdx !== lastCentury) {
          lastCentury = cIdx
          if (cIdx !== 'UNKNOWN') {
            items.push({
              kind: 'century',
              key: `century:${cIdx}`,
              label: formatCenturyHeading(cIdx),
              count: centuryCounts.get(cIdx) ?? 1,
            })
          }
        }
      }
      items.push({
        kind: 'event',
        ...rowItem,
      })
    }

    return items
  }, [hierarchyResult.rows, searchQuery])

  const visibleEventList = useMemo(
    () =>
      displayItems
        .filter(
          (
            item,
          ): item is Extract<
            (typeof displayItems)[number],
            { kind: 'event' }
          > => item.kind === 'event',
        )
        .map((item) => item.ev),
    [displayItems],
  )

  const previewContextAndSequence = useMemo(() => {
    if (!previewEventId) return { personContext: null, sequence: null }
    const idx = visibleEventList.findIndex((ev) => ev.id === previewEventId)
    const targetEv =
      idx >= 0
        ? visibleEventList[idx]
        : rawEvents.find((ev) => ev.id === previewEventId)
    if (!targetEv) return { personContext: null, sequence: null }

    const meta = resolveEventMeta(targetEv, 0)
    const roleTokens: string[] = []
    if (meta.isDeclaration) {
      if (meta.declarationDir === 'declared') roleTokens.push('선전포고 (선포국)')
      else if (meta.declarationDir === 'targeted')
        roleTokens.push('피선전포고 (대상국)')
    }
    if (meta.outcomeLabel) roleTokens.push(meta.outcomeLabel)
    if (meta.sideName) roleTokens.push(meta.sideName)
    if (meta.selfRoleText && !meta.isDeclaration) {
      roleTokens.push(meta.selfRoleText)
    }

    const noteTokens: string[] = []
    if (meta.distinctPolities.length > 0) {
      noteTokens.push(
        `참전 정치체: ${meta.distinctPolities.map((pol) => pol.name).join(' · ')}`,
      )
    }
    if (meta.counterparts.length > 0) {
      noteTokens.push(
        `상대국: ${meta.counterparts.map((cp) => cp.name).join(' · ')}`,
      )
    }
    if (meta.deployedUnits.length > 0) {
      noteTokens.push(
        `투입 편제: ${meta.deployedUnits
          .map((unitItem) => unitItem.abbreviation || unitItem.name)
          .join(', ')}`,
      )
    }
    if (meta.outcomeNote) noteTokens.push(meta.outcomeNote)
    if (meta.selfRoleDescription) noteTokens.push(meta.selfRoleDescription)

    const personContext =
      roleTokens.length > 0 || noteTokens.length > 0
        ? {
            label: `${country.name} 참전 기록`,
            role: roleTokens.length > 0 ? roleTokens.join(' · ') : null,
            note: noteTokens.length > 0 ? noteTokens.join(' — ') : null,
          }
        : null

    const sequence =
      idx >= 0 && visibleEventList.length > 1
        ? {
            previous:
              idx > 0
                ? {
                    id: visibleEventList[idx - 1].id,
                    title: visibleEventList[idx - 1].title,
                  }
                : null,
            next:
              idx < visibleEventList.length - 1
                ? {
                    id: visibleEventList[idx + 1].id,
                    title: visibleEventList[idx + 1].title,
                  }
                : null,
            position: idx + 1,
            total: visibleEventList.length,
            context: targetEv.parentEvent?.title
              ? `상위 전쟁: ${targetEv.parentEvent.title}`
              : null,
            onGo: (nextId: string) => setPreviewEventId(nextId),
          }
        : null

    return { personContext, sequence }
  }, [
    previewEventId,
    visibleEventList,
    rawEvents,
    resolveEventMeta,
    country.name,
  ])

  const initialParticipantCountries = useMemo<EventCountryParticipant[]>(() => {
    if (!country.id) return []
    if (isHistorical) {
      const targetHistId =
        eraFilter !== 'ALL' && eraFilter !== 'MODERN' ? eraFilter : country.id
      return [{ historicalCountryId: targetHistId, role: 'PARTICIPANT' }]
    }
    if (eraFilter !== 'ALL' && eraFilter !== 'MODERN') {
      return [{ historicalCountryId: eraFilter, role: 'PARTICIPANT' }]
    }
    return [{ countryId: country.id, role: 'PARTICIPANT' }]
  }, [country.id, isHistorical, eraFilter])

  const openCreateModal = useCallback(
    (options?: { parent?: EventParentPreset; eventType?: string | null }) => {
      setRegisterParentPreset(options?.parent)
      setRegisterTypeOverride(options?.eventType ?? null)
      setIsRegisterModalOpen(true)
    },
    [],
  )

  const closeCreateModal = useCallback(() => {
    setIsRegisterModalOpen(false)
    setRegisterParentPreset(undefined)
    setRegisterTypeOverride(null)
  }, [])

  const toggleWarCollapse = (warId: string) => {
    setCollapsedWarIds((prev) => {
      const next = new Set(prev)
      if (next.has(warId)) next.delete(warId)
      else next.add(warId)
      return next
    })
  }

  const allWarsCollapsed =
    hierarchyResult.collapsibleWarIds.length > 0 &&
    hierarchyResult.collapsibleWarIds.every((warId) =>
      collapsedWarIds.has(warId),
    )

  const toggleCollapseAllWars = () => {
    if (allWarsCollapsed) {
      setCollapsedWarIds(new Set())
    } else {
      setCollapsedWarIds(new Set(hierarchyResult.collapsibleWarIds))
    }
  }

  const hasActiveToolbarFilters =
    eraFilter !== 'ALL' ||
    outcomeFilter !== 'ALL' ||
    Boolean(searchQuery.trim())

  const activeEraLabel = useMemo(() => {
    if (eraFilter === 'ALL') return null
    return (
      eraSelectOptions.find((opt) => opt.value === eraFilter)?.label ?? null
    )
  }, [eraFilter, eraSelectOptions])

  const resetAllFilters = () => {
    setConflictFilter('ALL')
    setEraFilter('ALL')
    setOutcomeFilter('ALL')
    setSearchQuery('')
  }

  return (
    <PanelStack>
      <EventRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={closeCreateModal}
        initialDomain="MILITARY"
        initialEventType={
          registerTypeOverride ?? resolveInitialEventTypeForTab(conflictFilter)
        }
        initialCountries={initialParticipantCountries}
        initialParent={registerParentPreset}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: ['country-military-events'],
          })
        }}
      />

      <EventInlineModal
        eventId={previewEventId}
        onClose={() => setPreviewEventId(null)}
        onNavigate={(targetEventId) => {
          setPreviewEventId(null)
          navigate(pathKeys.events.detail(targetEventId))
        }}
        personContext={previewContextAndSequence.personContext}
        sequence={previewContextAndSequence.sequence}
      />

      <ConflictsCanvas aria-label="참전 전쟁 및 군사 사건 원장">
        {militaryEventsQuery.isLoading ? (
          <ChartSkeleton variant="bars" rows={5} />
        ) : rawEvents.length === 0 ? (
          <EmptyStateSpotlight
            flat
            icon={<FiShield size={22} />}
            title="등록된 군사·전쟁 사건이 없습니다"
            description="군사 사건을 등록하면 이 국가(및 연결된 과거 정치체)의 전쟁·전투·선전포고 기록이 연대순 계통으로 집계됩니다."
            primaryAction={{
              label: '첫 군사 사건 등록',
              onClick: () => openCreateModal(),
            }}
          />
        ) : (
          <>
            {/* 1단: 순수 사건 유형 언더라인 탭 바 + 우측 전적 요약 */}
            <TopTabBarRow>
              <UnderlineTabNav as="nav" aria-label="군사 사건 유형 탭">
                <UnderlineTabButton
                  type="button"
                  $active={conflictFilter === 'ALL'}
                  onClick={() => setConflictFilter('ALL')}
                >
                  <span>전체</span>
                  <UnderlineTabBadge $active={conflictFilter === 'ALL'}>
                    {bucketCounts.ALL}
                  </UnderlineTabBadge>
                </UnderlineTabButton>
                <UnderlineTabButton
                  type="button"
                  $active={conflictFilter === 'WAR'}
                  onClick={() => setConflictFilter('WAR')}
                >
                  <span>전쟁</span>
                  <UnderlineTabBadge $active={conflictFilter === 'WAR'}>
                    {bucketCounts.WAR}
                  </UnderlineTabBadge>
                </UnderlineTabButton>
                <UnderlineTabButton
                  type="button"
                  $active={conflictFilter === 'BATTLE'}
                  onClick={() => setConflictFilter('BATTLE')}
                >
                  <span>전투 · 작전</span>
                  <UnderlineTabBadge $active={conflictFilter === 'BATTLE'}>
                    {bucketCounts.BATTLE}
                  </UnderlineTabBadge>
                </UnderlineTabButton>
                {totalTypePresence.hasUprising ||
                conflictFilter === 'UPRISING_ATTACK' ? (
                  <UnderlineTabButton
                    type="button"
                    $active={conflictFilter === 'UPRISING_ATTACK'}
                    onClick={() => setConflictFilter('UPRISING_ATTACK')}
                  >
                    <span>봉기 · 무력충돌</span>
                    <UnderlineTabBadge
                      $active={conflictFilter === 'UPRISING_ATTACK'}
                    >
                      {bucketCounts.UPRISING_ATTACK}
                    </UnderlineTabBadge>
                  </UnderlineTabButton>
                ) : null}
                {totalTypePresence.hasOther || conflictFilter === 'OTHER' ? (
                  <UnderlineTabButton
                    type="button"
                    $active={conflictFilter === 'OTHER'}
                    onClick={() => setConflictFilter('OTHER')}
                  >
                    <span>선전포고 · 휴전 · 기타</span>
                    <UnderlineTabBadge $active={conflictFilter === 'OTHER'}>
                      {bucketCounts.OTHER}
                    </UnderlineTabBadge>
                  </UnderlineTabButton>
                ) : null}
              </UnderlineTabNav>

              <WarRecordSummary aria-label="국가 참전 전적 요약">
                <span>
                  전쟁 <strong>{warRecordSummary.wars}</strong>
                </span>
                <SummarySep aria-hidden="true">·</SummarySep>
                <span>
                  전투·작전 <strong>{warRecordSummary.battles}</strong>
                </span>
                {warRecordSummary.victories > 0 ? (
                  <>
                    <SummarySep aria-hidden="true">·</SummarySep>
                    <SummaryTone $tone="victory">
                      승전 <strong>{warRecordSummary.victories}</strong>
                    </SummaryTone>
                  </>
                ) : null}
                {warRecordSummary.defeats > 0 ? (
                  <>
                    <SummarySep aria-hidden="true">·</SummarySep>
                    <SummaryTone $tone="defeat">
                      패전 <strong>{warRecordSummary.defeats}</strong>
                    </SummaryTone>
                  </>
                ) : null}
              </WarRecordSummary>
            </TopTabBarRow>

            {/* 2단: 단일 행 검색 · 시대/승패 필터 · 계통 접기 · 정렬 · 우측 주 등록 CTA */}
            <ControlBarRow>
              <ControlLeftGroup>
                <LedgerSearchBox style={{ width: 'clamp(210px, 25vw, 296px)' }}>
                  <FiSearch />
                  <LedgerSearchInput
                    type="search"
                    placeholder="전쟁·전투, 진영·상대국, 투입 부대 검색…"
                    aria-label="군사 사건 검색"
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

                {eraSelectOptions.length > 0 ? (
                  <EraSelectSlot>
                    <SearchableSelect
                      size="sm"
                      clearable
                      ariaLabel={
                        isHistorical ? '소속 정치체 필터' : '시대·정치체 필터'
                      }
                      value={eraFilter === 'ALL' ? '' : eraFilter}
                      onChange={(nextVal) => setEraFilter(nextVal || 'ALL')}
                      placeholder={
                        isHistorical
                          ? `전체 정치체 (${rawEvents.length})`
                          : `전체 시대 · 정체 (${rawEvents.length})`
                      }
                      searchPlaceholder="시대 · 정치체 검색…"
                      options={eraSelectOptions}
                    />
                  </EraSelectSlot>
                ) : null}

                {warRecordSummary.hasAnyOutcome ? (
                  <OutcomeQuickPills
                    role="group"
                    aria-label="참전 결과 빠른 필터"
                  >
                    {OUTCOME_FILTER_OPTIONS.map((opt) => (
                      <OutcomeQuickBtn
                        key={opt.key}
                        type="button"
                        $active={outcomeFilter === opt.key}
                        onClick={() => setOutcomeFilter(opt.key)}
                      >
                        {opt.label}
                      </OutcomeQuickBtn>
                    ))}
                  </OutcomeQuickPills>
                ) : null}
              </ControlLeftGroup>

              <ControlRightGroup>
                {filteredEvents.length !== rawEvents.length ? (
                  <LiveCountMeta>
                    표시 <strong>{filteredEvents.length}</strong> /{' '}
                    {rawEvents.length}건
                  </LiveCountMeta>
                ) : null}

                {hierarchyResult.enableHierarchy &&
                hierarchyResult.collapsibleWarIds.length > 0 ? (
                  <ToolbarGhostBtn
                    type="button"
                    $active={allWarsCollapsed}
                    onClick={toggleCollapseAllWars}
                    title={
                      allWarsCollapsed
                        ? '하위 전투·작전 모두 펼치기'
                        : '하위 전투·작전을 접고 주요 전쟁 줄기만 보기'
                    }
                  >
                    <FiGitBranch size={12} />
                    <span>
                      {allWarsCollapsed ? '하위 전투 펼치기' : '전쟁만 보기'}
                    </span>
                  </ToolbarGhostBtn>
                ) : null}

                <ToolbarGhostBtn
                  type="button"
                  onClick={() =>
                    setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                  }
                  title={
                    sortDir === 'desc'
                      ? '클릭하여 연대순(과거부터)으로 전환'
                      : '클릭하여 최신순(최근부터)으로 전환'
                  }
                >
                  {sortDir === 'desc' ? (
                    <FiArrowDown size={12} />
                  ) : (
                    <FiArrowUp size={12} />
                  )}
                  <span>{sortDir === 'desc' ? '최신순' : '연대순'}</span>
                </ToolbarGhostBtn>

                <PrimaryActionButton
                  $size="sm"
                  icon={<FiPlus size={14} />}
                  onClick={() => openCreateModal()}
                >
                  군사 사건 등록
                </PrimaryActionButton>
              </ControlRightGroup>
            </ControlBarRow>

            {hasActiveToolbarFilters ? (
              <ActiveFilterBar>
                {activeEraLabel ? (
                  <ActiveFilterPill
                    type="button"
                    onClick={() => setEraFilter('ALL')}
                  >
                    <span>시대: {activeEraLabel}</span>
                    <FiX size={11} />
                  </ActiveFilterPill>
                ) : null}
                {outcomeFilter !== 'ALL' ? (
                  <ActiveFilterPill
                    type="button"
                    onClick={() => setOutcomeFilter('ALL')}
                  >
                    <span>
                      결과:{' '}
                      {
                        OUTCOME_FILTER_OPTIONS.find(
                          (item) => item.key === outcomeFilter,
                        )?.label
                      }
                    </span>
                    <FiX size={11} />
                  </ActiveFilterPill>
                ) : null}
                {searchQuery.trim() ? (
                  <ActiveFilterPill
                    type="button"
                    onClick={() => setSearchQuery('')}
                  >
                    <span>검색: &ldquo;{searchQuery.trim()}&rdquo;</span>
                    <FiX size={11} />
                  </ActiveFilterPill>
                ) : null}
                <FilterResetBtn type="button" onClick={resetAllFilters}>
                  필터 초기화
                </FilterResetBtn>
              </ActiveFilterBar>
            ) : null}

            {displayItems.length === 0 ? (
              <EmptyStateSpotlight
                flat
                icon={<FiSearch size={20} />}
                title="필터 조건에 맞는 전쟁·전투 기록이 없습니다"
                description="유형 탭, 시대·결과 필터 또는 검색어를 초기화해 보세요."
                primaryAction={{
                  label: '필터 초기화',
                  onClick: resetAllFilters,
                }}
              />
            ) : (
              <TableScroll>
                <ConflictsTable>
                  <thead>
                    <tr>
                      <th style={{ width: 152 }}>시기</th>
                      <th>전쟁 · 작전 · 투입 편제</th>
                      <th style={{ width: 156 }}>참전 결과 · 역할</th>
                      <th style={{ width: '30%', minWidth: 248 }}>
                        교전 상대국 · 진영
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((renderItem) => {
                      if (renderItem.kind === 'century') {
                        return (
                          <CenturyDividerTr key={renderItem.key}>
                            <td colSpan={4}>
                              <CenturyDividerInner>
                                <CenturyTitle>{renderItem.label}</CenturyTitle>
                                <CenturyCount>
                                  {renderItem.count}건
                                </CenturyCount>
                                <CenturyRule aria-hidden="true" />
                              </CenturyDividerInner>
                            </td>
                          </CenturyDividerTr>
                        )
                      }

                      const { ev, depth, childCount, isLastChild } = renderItem
                      const meta = resolveEventMeta(ev, childCount)
                      const isCollapsed = collapsedWarIds.has(ev.id)
                      const showOrphanParent =
                        depth === 0 && Boolean(ev.parentEvent?.id)
                      const showInlineTypeCaption =
                        (conflictFilter === 'ALL' &&
                          ev.type !== 'WAR' &&
                          !(depth > 0 && ev.type === 'BATTLE')) ||
                        conflictFilter === 'UPRISING_ATTACK' ||
                        conflictFilter === 'OTHER' ||
                        (conflictFilter === 'BATTLE' &&
                          ev.type !== 'BATTLE' &&
                          Boolean(ev.type))

                      const handleOpenPreview = (
                        clickEvt: React.MouseEvent<HTMLElement>,
                      ) => {
                        if (!shouldInterceptEntityClick(clickEvt)) {
                          navigate(pathKeys.events.detail(ev.id))
                          return
                        }
                        setPreviewEventId(ev.id)
                      }

                      return (
                        <EventRowTr
                          key={ev.id}
                          $isWar={meta.isWarRow}
                          $isChild={depth > 0}
                          onClick={handleOpenPreview}
                        >
                          <td className="num">
                            <PeriodStack>
                              <span>{meta.periodText}</span>
                              {meta.durationHint ? (
                                <DurationSubText>
                                  {meta.durationHint}
                                </DurationSubText>
                              ) : null}
                            </PeriodStack>
                          </td>

                          <td>
                            <EventTitleOuter $depth={depth}>
                              {depth > 0 ? (
                                <ChildTreeRail
                                  $last={isLastChild}
                                  aria-hidden="true"
                                />
                              ) : null}

                              <EventTitleBody>
                                <EventTitleStack>
                                  {childCount > 0 ? (
                                    <CollapseWarBtn
                                      type="button"
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        toggleWarCollapse(ev.id)
                                      }}
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

                                  <EventTitleButton
                                    type="button"
                                    $isWar={meta.isWarRow}
                                    onClick={(evt) => {
                                      evt.stopPropagation()
                                      handleOpenPreview(evt)
                                    }}
                                  >
                                    <span>{ev.title}</span>
                                  </EventTitleButton>

                                  {childCount > 0 ? (
                                    <ChildCountBtn
                                      type="button"
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        toggleWarCollapse(ev.id)
                                      }}
                                    >
                                      전투 {childCount}
                                    </ChildCountBtn>
                                  ) : null}

                                  {showInlineTypeCaption ? (
                                    <InlineTypeCaption
                                      $highlight={meta.isDeclaration}
                                    >
                                      {meta.typeLabel}
                                    </InlineTypeCaption>
                                  ) : null}

                                  {meta.distinctPolities.map((polityItem) => (
                                    <PolityFilterTag
                                      key={polityItem.id}
                                      type="button"
                                      title={`${polityItem.name} 시대 사건만 필터링 (⌘클릭 시 국가 상세)`}
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        if (!shouldInterceptEntityClick(evt)) {
                                          navigate(
                                            pathKeys.countryDetail(
                                              polityItem.id,
                                            ),
                                          )
                                          return
                                        }
                                        setEraFilter((prev) =>
                                          prev === polityItem.id
                                            ? 'ALL'
                                            : polityItem.id,
                                        )
                                      }}
                                    >
                                      {polityItem.name}
                                    </PolityFilterTag>
                                  ))}

                                  {showOrphanParent && ev.parentEvent ? (
                                    <ParentWarBtn
                                      type="button"
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        if (!shouldInterceptEntityClick(evt)) {
                                          navigate(
                                            pathKeys.events.detail(
                                              ev.parentEvent!.id,
                                            ),
                                          )
                                          return
                                        }
                                        setPreviewEventId(ev.parentEvent!.id)
                                      }}
                                    >
                                      상위: {ev.parentEvent.title}
                                    </ParentWarBtn>
                                  ) : null}
                                </EventTitleStack>

                                {meta.deployedUnits.length > 0 ? (
                                  <DeployedUnitsRow
                                    onClick={(evt) => evt.stopPropagation()}
                                  >
                                    <DeployedPrefix>투입 편제</DeployedPrefix>
                                    {meta.deployedUnits
                                      .slice(0, 5)
                                      .map((unitChip, idx) => (
                                        <React.Fragment key={unitChip.id}>
                                          {idx > 0 ? (
                                            <UnitSepDot aria-hidden>
                                              ·
                                            </UnitSepDot>
                                          ) : null}
                                          <DeployedUnitLinkBtn
                                            type="button"
                                            title={
                                              unitChip.unitType
                                                ? `${militaryUnitTypeLabelKo(unitChip.unitType)} 상세 보기`
                                                : '편제 상세 보기'
                                            }
                                            onClick={(evt) => {
                                              if (
                                                !shouldInterceptEntityClick(evt)
                                              ) {
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
                                            {unitChip.abbreviation ||
                                              unitChip.name}
                                          </DeployedUnitLinkBtn>
                                        </React.Fragment>
                                      ))}
                                    {meta.deployedUnits.length > 5 ? (
                                      <MoreUnitsSpan>
                                        +{meta.deployedUnits.length - 5}
                                      </MoreUnitsSpan>
                                    ) : null}
                                  </DeployedUnitsRow>
                                ) : null}
                              </EventTitleBody>
                            </EventTitleOuter>
                          </td>

                          <td>
                            <StatusColumnStack>
                              {meta.isDeclaration &&
                              meta.declarationDir !== 'other' ? (
                                <DeclarationDirBadge
                                  $dir={meta.declarationDir}
                                  title={meta.selfRoleDescription ?? undefined}
                                >
                                  {meta.declarationDir === 'declared' ? (
                                    <>
                                      <span>선포</span>
                                      <FiArrowRight size={11.5} />
                                    </>
                                  ) : (
                                    <>
                                      <span>피선포</span>
                                      <FiArrowLeft size={11.5} />
                                    </>
                                  )}
                                </DeclarationDirBadge>
                              ) : meta.outcomeLabel ? (
                                <OutcomeIndicator
                                  $tone={meta.outcomeTone}
                                  title={meta.outcomeNote ?? undefined}
                                >
                                  {meta.outcomeLabel}
                                </OutcomeIndicator>
                              ) : null}

                              {meta.selfRoleText &&
                              !(
                                meta.isDeclaration &&
                                meta.declarationDir !== 'other'
                              ) ? (
                                <RoleText
                                  title={meta.selfRoleDescription ?? undefined}
                                >
                                  {meta.selfRoleText}
                                </RoleText>
                              ) : !meta.outcomeLabel &&
                                !(
                                  meta.isDeclaration &&
                                  meta.declarationDir !== 'other'
                                ) ? (
                                <MutedDash>—</MutedDash>
                              ) : null}
                            </StatusColumnStack>
                          </td>

                          <td>
                            <CounterpartCellRow>
                              <CounterpartInfoWrap>
                                {meta.sideName ? (
                                  <CoalitionText>
                                    {meta.sideColor ? (
                                      <SideDot $color={meta.sideColor} />
                                    ) : null}
                                    {meta.sideName}
                                  </CoalitionText>
                                ) : null}

                                {meta.counterparts.length > 0 ? (
                                  <CounterpartLinksInline
                                    onClick={(evt) => evt.stopPropagation()}
                                  >
                                    <VsPrefix>
                                      {meta.isDeclaration
                                        ? meta.declarationDir === 'declared'
                                          ? '대상'
                                          : meta.declarationDir === 'targeted'
                                            ? '선포국'
                                            : '상대'
                                        : 'vs'}
                                    </VsPrefix>
                                    {meta.counterparts.map((cp, idx) => (
                                      <React.Fragment
                                        key={`${cp.isHistorical ? 'h' : 'm'}:${cp.id}`}
                                      >
                                        {idx > 0 ? (
                                          <UnitSepDot aria-hidden>·</UnitSepDot>
                                        ) : null}
                                        <CounterpartCountryLink
                                          to={pathKeys.countryDetail(cp.id)}
                                          $historical={cp.isHistorical}
                                        >
                                          {cp.name}
                                        </CounterpartCountryLink>
                                      </React.Fragment>
                                    ))}
                                  </CounterpartLinksInline>
                                ) : !meta.sideName ? (
                                  <MutedDash>—</MutedDash>
                                ) : null}
                              </CounterpartInfoWrap>

                              <RowHoverActions
                                onClick={(evt) => evt.stopPropagation()}
                              >
                                {meta.isWarRow ? (
                                  <RowActionBtn
                                    type="button"
                                    title={`${ev.title} 하위 전투·작전 등록`}
                                    onClick={() =>
                                      openCreateModal({
                                        parent: {
                                          id: ev.id,
                                          title: ev.title,
                                        },
                                        eventType: 'BATTLE',
                                      })
                                    }
                                  >
                                    <FiPlus size={11.5} />
                                    <span>전투</span>
                                  </RowActionBtn>
                                ) : null}

                                {ev.kind === 'COLLECTION' ? (
                                  <RowActionLink
                                    to={`${pathKeys.events.detail(ev.id)}?tab=survey`}
                                    title="전쟁 조망 · 전황 지도 바로가기"
                                  >
                                    조망 ↗
                                  </RowActionLink>
                                ) : meta.hasSidesContext ? (
                                  <RowActionLink
                                    to={`${pathKeys.events.detail(ev.id)}?tab=modules#module-sides`}
                                    title="참전 진영 · 전투서열 바로가기"
                                  >
                                    전투서열 ↗
                                  </RowActionLink>
                                ) : null}

                                <DirectDetailIconLink
                                  to={pathKeys.events.detail(ev.id)}
                                  title="사건 상세 페이지 바로 이동"
                                  aria-label={`${ev.title} 상세 페이지 이동`}
                                >
                                  <FiArrowUpRight size={13} />
                                </DirectDetailIconLink>
                              </RowHoverActions>
                            </CounterpartCellRow>
                          </td>
                        </EventRowTr>
                      )
                    })}
                  </tbody>
                </ConflictsTable>
              </TableScroll>
            )}
          </>
        )}
      </ConflictsCanvas>
    </PanelStack>
  )
}

const PanelStack = styled.div`
  display: flex;
  flex-direction: column;
`

const ConflictsCanvas = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const TopTabBarRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  ${UnderlineTabNav} {
    width: auto;
    flex: 1 1 auto;
    min-width: 0;
    margin-bottom: 0;
    border-bottom: none;
  }
`

const WarRecordSummary = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  padding-bottom: 2px;
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const SummarySep = styled.span`
  opacity: 0.45;
`

const SummaryTone = styled.span<{ $tone: 'victory' | 'defeat' }>`
  strong {
    color: ${({ theme, $tone }) =>
      $tone === 'victory'
        ? theme.mode === 'dark'
          ? '#6ee7b7'
          : '#047857'
        : theme.mode === 'dark'
          ? '#fda4af'
          : '#be123c'};
  }
`

const ControlBarRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ControlLeftGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
`

const ControlRightGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-left: auto;
`

const EraSelectSlot = styled.div`
  width: clamp(168px, 18vw, 212px);
`

const OutcomeQuickPills = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const OutcomeQuickBtn = styled.button<{ $active: boolean }>`
  height: 26px;
  padding: 0 9px;
  border: none;
  border-radius: 5px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 550)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? ledgerBackground(theme.mode) : 'transparent'};
  box-shadow: ${({ theme, $active }) =>
    $active
      ? `0 1px 2px ${theme.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(15,23,42,0.08)'}`
      : 'none'};
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s ease, background 0.12s ease;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const LiveCountMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
  white-space: nowrap;
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ToolbarGhostBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 9px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : ledgerHairline(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active
        ? ledgerAccentSubtle(theme.mode)
        : ledgerHoverFill(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const ActiveFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 7px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const ActiveFilterPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const FilterResetBtn = styled.button`
  padding: 0 4px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
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

const RowHoverActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s ease;

  @media (hover: none) {
    opacity: 1;
  }
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
    padding: 10.5px 10px;
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
    vertical-align: top;
    padding-top: 12px;
  }
`

const CenturyDividerTr = styled.tr`
  td {
    padding: 16px 4px 6px;
    border-bottom: none;
    background: transparent !important;
  }
`

const CenturyDividerInner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CenturyTitle = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const CenturyCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

const CenturyRule = styled.span`
  flex: 1 1 auto;
  height: 1px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

const EventRowTr = styled.tr<{ $isWar: boolean; $isChild: boolean }>`
  cursor: pointer;
  background: ${({ theme, $isWar, $isChild }) =>
    $isWar && !$isChild
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.012)'
        : 'rgba(15, 23, 42, 0.012)'
      : 'transparent'};

  &:hover td {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &:hover ${RowHoverActions}, &:focus-within ${RowHoverActions} {
    opacity: 1;
  }
`

const PeriodStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const DurationSubText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EventTitleOuter = styled.div<{ $depth: number }>`
  position: relative;
  display: flex;
  align-items: stretch;
  padding-left: ${({ $depth }) => ($depth > 0 ? $depth * 18 + 6 : 0)}px;
`

const ChildTreeRail = styled.span<{ $last: boolean }>`
  position: absolute;
  left: 8px;
  top: -11px;
  bottom: ${({ $last }) => ($last ? '50%' : '-11px')};
  width: 10px;
  border-left: 1.5px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: ${({ $last }) => ($last ? '100%' : '21px')};
    width: 9px;
    border-top: 1.5px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const EventTitleBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3.5px;
  min-width: 0;
`

const EventTitleStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 7px;
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
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const EventTitleButton = styled.button<{ $isWar?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  font-size: ${({ $isWar }) => ($isWar ? '13.75px' : '13px')};
  font-weight: ${({ $isWar }) => ($isWar ? 740 : 610)};
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const ChildCountBtn = styled.button`
  height: 19px;
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
  ${DIGIT_DISPLAY}

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const InlineTypeCaption = styled.span<{ $highlight?: boolean }>`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme, $highlight }) =>
    $highlight ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const PolityFilterTag = styled.button`
  height: 19px;
  padding: 0 6px;
  border-radius: 4px;
  border: none;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const ParentWarBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 2px;
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

const StatusColumnStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 7px;
`

const OutcomeIndicator = styled.span<{ $tone: OutcomeTone }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme, $tone }) =>
    $tone === 'victory'
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : $tone === 'defeat'
        ? theme.mode === 'dark'
          ? '#fda4af'
          : '#be123c'
        : $tone === 'amber'
          ? theme.mode === 'dark'
            ? '#fcd34d'
            : '#b45309'
          : theme.colors.text.secondary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ $tone }) =>
      $tone === 'victory'
        ? '#10b981'
        : $tone === 'defeat'
          ? '#f43f5e'
          : $tone === 'amber'
            ? '#f59e0b'
            : '#94a3b8'};
  }
`

const DeclarationDirBadge = styled.span<{ $dir: 'declared' | 'targeted' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 6.5px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme, $dir }) =>
    $dir === 'declared'
      ? theme.mode === 'dark'
        ? '#fda4af'
        : '#be123c'
      : theme.mode === 'dark'
        ? '#93c5fd'
        : '#1d4ed8'};
  background: ${({ theme, $dir }) =>
    $dir === 'declared'
      ? theme.mode === 'dark'
        ? 'rgba(244, 63, 94, 0.14)'
        : 'rgba(225, 29, 72, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.16)'
        : 'rgba(37, 99, 235, 0.08)'};
`

const RoleText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const MutedDash = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.6;
`

const CounterpartCellRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const CounterpartInfoWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-width: 0;
`

const CoalitionText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

const SideDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const CounterpartLinksInline = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 3px 5px;
  font-size: 12.5px;
`

const VsPrefix = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 1px;
`

const CounterpartCountryLink = styled(Link)<{ $historical?: boolean }>`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 550;
  font-style: ${({ $historical }) => ($historical ? 'italic' : 'normal')};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const RowActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 22px;
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const RowActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 5px;
  border-radius: 4px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const DirectDetailIconLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  }
`
