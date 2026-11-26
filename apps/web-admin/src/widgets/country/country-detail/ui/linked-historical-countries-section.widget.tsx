/**
 * 현대 국가 상세 > '과거 국가' 탭
 *
 * - 상단 3열 인터랙티브 Bento 인포그래픽(계보 역할 비중 · 국체 구성 도넛 · 장기 존속 Top 4 비례 바)
 * - 단일 레벨 3모드 보기 전환: [2열 원장 | 존속 스팬 바 | 세기 계보도] (중복 헤드라인·이중 스위처 제거)
 * - 2열 원장 내 전체 통사 대비 '상대 존속 위치 미니 스팬 바' + 존속 연수 배지 + 변천/소속/외교 관계 칩
 */
import { CountryTabEmptyState } from './country-tab-empty-state'
import { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  FiAlignLeft,
  FiArrowRight,
  FiChevronRight,
  FiClock,
  FiGitBranch,
  FiGitCommit,
  FiLayers,
  FiList,
  FiPlus,
  FiRepeat,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid3Col,
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { getStateTypeLabel } from '@/entities/historical-country/lib/utils'
import { useHistoricalCountries } from '@/features/historical-country'
import {
  getHistoricalCountryById,
  type HistoricalCountryMembershipDto,
  type HistoricalCountryRelationDto,
  type HistoricalCountryTransitionDto,
  type HistoricalMembershipRole,
  type HistoricalRelationType,
  type TransitionEventType,
  type UpdateHistoricalCountryDto,
  updateHistoricalCountry,
} from '@/shared/api/historical-countries'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  compareByCountryStart,
  formatCountryPeriod,
  formatModernLinkPeriod,
  getCountryDurationYears,
  toLinkScopedPeriod,
} from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import { SectionSubNav, SubNavFigure } from '@/shared/ui/section-sub-nav/section-sub-nav'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  CountryPicker,
  type CountryPickerPick,
} from '@/shared/ui/country-picker'
import { notify } from '@/shared/ui/toast'

import { classifyLinkedHistorical } from '../model/linked-historical-classify'
import {
  MEMBERSHIP_ROLE_LABELS,
  RELATION_TYPE_LABELS,
  TRANSITION_EVENT_LABELS,
  TRANSITION_SCOPE_LABELS,
} from '../model/linked-historical-labels'
import { useLinkedHistoricalData } from '../model/use-linked-historical-data.hook'
import * as DashboardStyles from './country-detail-dashboard.styles'
import { LedgerFilterChip } from './country-ledger-primitives'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import { LineageFlow } from './dashboard-panels/lineage-flow'

export interface LinkedHistoricalCountriesSectionProps {
  country: UnifiedCountry
}

type HistoricalCountryItem = NonNullable<
  NonNullable<UnifiedCountry['historicalCountries']>[number]
>

type CategoryFilterKey =
  | 'all'
  | 'PREDECESSOR'
  | 'CONSTITUENT'
  | 'HERITAGE'
  | 'withRelations'

type StateGroupKey = 'monarchy' | 'empire' | 'republic' | 'principality' | 'other'
type LinkedViewMode = 'list' | 'span' | 'century'
type LinkedSortKey = 'eraAsc' | 'eraDesc' | 'durationDesc'

const EMPTY_RELS: {
  transitions: HistoricalCountryTransitionDto[]
  relations: HistoricalCountryRelationDto[]
  memberships: HistoricalCountryMembershipDto[]
} = { transitions: [], relations: [], memberships: [] }

const LINK_KIND_LABEL: Record<string, string> = {
  PREDECESSOR: '직계 전신',
  CONSTITUENT: '구성 정치체',
  HERITAGE: '역사 유산',
}

const STATE_GROUP_LABEL: Record<StateGroupKey, string> = {
  monarchy: '왕국·왕조',
  empire: '제국',
  republic: '공화·연방',
  principality: '공국·제후국',
  other: '칸국·정권·기타',
}

function classifyStateGroup(stateType?: string | null): StateGroupKey {
  const st = String(stateType ?? '').toUpperCase()
  if (st.includes('EMPIRE')) return 'empire'
  if (
    st.includes('KINGDOM') ||
    st.includes('DYNASTY') ||
    st.includes('MONARCHY') ||
    st.includes('PERSONAL_UNION') ||
    st.includes('HEREDITARY')
  ) {
    return 'monarchy'
  }
  if (
    st.includes('REPUBLIC') ||
    st.includes('CONFEDERATION') ||
    st.includes('FEDERATION') ||
    st.includes('CITY_STATE')
  ) {
    return 'republic'
  }
  if (
    st.includes('DUCHY') ||
    st.includes('PRINCIPALITY') ||
    st.includes('ELECTORATE') ||
    st.includes('MARGRAVIATE')
  ) {
    return 'principality'
  }
  return 'other'
}

function toSignedYear(
  era: string | null | undefined,
  year: number | null | undefined,
): number | null {
  if (year == null) return null
  return era === 'BC' ? -Math.abs(year) : Math.abs(year)
}

function formatSignedYearShort(signedYear: number | null): string | null {
  if (signedYear == null) return null
  return signedYear < 0 ? `BC ${Math.abs(signedYear)}년` : `${signedYear}년`
}

export function LinkedHistoricalCountriesSection({
  country,
}: LinkedHistoricalCountriesSectionProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const rawList = country.historicalCountries ?? []
  const list = useMemo(
    () =>
      [...rawList].sort((left, right) =>
        compareByCountryStart(
          toLinkScopedPeriod(left),
          toLinkScopedPeriod(right),
        ),
      ),
    [rawList],
  )
  const count = list.length

  const [viewMode, setViewMode] = useState<LinkedViewMode>('list')
  const [sortBy, setSortBy] = useState<LinkedSortKey>('eraAsc')
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilterKey>('all')
  const [stateGroupFilter, setStateGroupFilter] =
    useState<StateGroupKey | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isMutatingLink, setIsMutatingLink] = useState(false)

  const {
    data: allHistoricalCountries = [],
    isLoading: isAllHistoricalLoading,
  } = useHistoricalCountries({ enabled: isPickerOpen })

  const linkedIds = useMemo(() => list.map((item) => item.id), [list])
  const {
    transitions,
    relations,
    memberships,
    isLoading: isLinkedDataLoading,
  } = useLinkedHistoricalData(linkedIds)

  const invalidateBridgeDependentCaches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['countries'] }),
      queryClient.invalidateQueries({ queryKey: ['historical-countries'] }),
      queryClient.invalidateQueries({
        queryKey: ['persons', 'by-country-grouped', country.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ['persons', 'by-country', country.id],
      }),
      queryClient.invalidateQueries({ queryKey: ['treaties'] }),
    ])
  }

  const resolveExistingModernIds = async (
    historicalCountryId: string,
  ): Promise<string[]> => {
    const cached = allHistoricalCountries.find(
      (candidate) => candidate.id === historicalCountryId,
    ) as { parentModernCountryIds?: string[] } | undefined
    if (Array.isArray(cached?.parentModernCountryIds)) {
      return cached.parentModernCountryIds
    }
    const detail = (await getHistoricalCountryById(historicalCountryId)) as {
      parentModernCountryIds?: string[]
    }
    return detail.parentModernCountryIds ?? []
  }

  const handleCommitLink = async (pickedList: CountryPickerPick[]) => {
    if (pickedList.length === 0 || isMutatingLink) return
    setIsMutatingLink(true)
    const toastId = notify.loading('과거 국가 연결 중...')
    try {
      const results = await Promise.allSettled(
        pickedList.map(async (picked) => {
          const existingModernIds = await resolveExistingModernIds(picked.id)
          const nextModernIds = Array.from(
            new Set([...existingModernIds, country.id]),
          )
          await updateHistoricalCountry(picked.id, {
            parentModernCountryIds: nextModernIds,
          } as UpdateHistoricalCountryDto)
        }),
      )
      const succeededCount = results.filter(
        (result) => result.status === 'fulfilled',
      ).length
      const firstRejected = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      )

      if (succeededCount > 0) {
        await invalidateBridgeDependentCaches()
      }

      if (firstRejected) {
        const reasonMessage =
          (firstRejected.reason as Error)?.message || '오류가 발생했습니다.'
        notify.error(
          succeededCount > 0
            ? `${succeededCount}개 연결 완료, 일부 실패: ${reasonMessage}`
            : `연결 실패: ${reasonMessage}`,
          { id: toastId },
        )
        if (succeededCount > 0) {
          setIsPickerOpen(false)
        }
        return
      }

      notify.success(
        `${succeededCount}개 과거 국가를 ${country.name}에 연결했습니다.`,
        { id: toastId },
      )
      setIsPickerOpen(false)
    } catch (error) {
      notify.error(
        `연결 실패: ${(error as Error).message || '오류가 발생했습니다.'}`,
        { id: toastId },
      )
    } finally {
      setIsMutatingLink(false)
    }
  }

  const handleUnlink = async (item: HistoricalCountryItem) => {
    if (isMutatingLink) return
    const confirmed = await confirm({
      title: '과거 국가 연결 해제',
      message: `${item.name}와(과) ${country.name}의 연결을 해제하시겠습니까? (과거 국가 자체는 삭제되지 않습니다.)`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (!confirmed) return
    setIsMutatingLink(true)
    const toastId = notify.loading('연결 해제 중...')
    try {
      const existingModernIds = await resolveExistingModernIds(item.id)
      const nextModernIds = existingModernIds.filter(
        (modernId) => modernId !== country.id,
      )
      await updateHistoricalCountry(item.id, {
        parentModernCountryIds: nextModernIds,
      } as UpdateHistoricalCountryDto)
      await invalidateBridgeDependentCaches()
      notify.success(`${item.name} 연결을 해제했습니다.`, { id: toastId })
    } catch (error) {
      notify.error(
        `연결 해제 실패: ${(error as Error).message || '오류가 발생했습니다.'}`,
        { id: toastId },
      )
    } finally {
      setIsMutatingLink(false)
    }
  }

  const idToCountry = useMemo(() => {
    const map = new Map<string, HistoricalCountryItem>()
    for (const item of list) {
      map.set(item.id, item)
    }
    return map
  }, [list])

  const countryRelations = useMemo(() => {
    const map = new Map<
      string,
      {
        transitions: HistoricalCountryTransitionDto[]
        relations: HistoricalCountryRelationDto[]
        memberships: HistoricalCountryMembershipDto[]
      }
    >()
    for (const item of list) {
      map.set(item.id, { transitions: [], relations: [], memberships: [] })
    }
    for (const transition of transitions) {
      map.get(transition.predecessorId)?.transitions.push(transition)
      if (transition.successorId !== transition.predecessorId) {
        map.get(transition.successorId)?.transitions.push(transition)
      }
    }
    for (const relation of relations) {
      map.get(relation.subjectCountryId)?.relations.push(relation)
      if (relation.objectCountryId !== relation.subjectCountryId) {
        map.get(relation.objectCountryId)?.relations.push(relation)
      }
    }
    for (const membership of memberships) {
      map.get(membership.historicalCountryId)?.memberships.push(membership)
      if (membership.memberCountryId !== membership.historicalCountryId) {
        map.get(membership.memberCountryId)?.memberships.push(membership)
      }
    }
    return map
  }, [list, transitions, relations, memberships])

  const classification = useMemo(() => {
    const kindById = new Map<string, string>()
    const hasServerKind =
      list.length > 0 && list.every((item) => item.linkKind != null)
    if (hasServerKind) {
      for (const item of list) {
        kindById.set(item.id, String(item.linkKind))
      }
    } else {
      const { kindById: clientKind } = classifyLinkedHistorical({
        nodes: list.map((item) => {
          const scoped = toLinkScopedPeriod(item)
          return {
            id: item.id,
            startYear: toSignedYear(scoped.startEra, scoped.startYear),
            endYear: toSignedYear(scoped.endEra, scoped.endYear),
          }
        }),
        transitions: transitions.map((transition) => ({
          predecessorId: transition.predecessorId,
          successorId: transition.successorId,
        })),
        memberships: memberships.map((membership) => ({
          historicalCountryId: membership.historicalCountryId,
          memberCountryId: membership.memberCountryId,
          isLeadingMember: membership.isLeadingMember,
        })),
      })
      for (const [nodeId, kind] of clientKind) {
        kindById.set(nodeId, kind)
      }
    }

    const predecessors = list.filter(
      (item) => kindById.get(item.id) === 'PREDECESSOR',
    )
    const constituents = list.filter(
      (item) => kindById.get(item.id) === 'CONSTITUENT',
    )
    const heritage = list.filter(
      (item) => kindById.get(item.id) === 'HERITAGE',
    )
    return { kindById, predecessors, constituents, heritage }
  }, [list, transitions, memberships])

  const spanSummary = useMemo(() => {
    let minSigned: number | null = null
    let maxSigned: number | null = null
    for (const item of list) {
      const scoped = toLinkScopedPeriod(item)
      const startSigned = toSignedYear(scoped.startEra, scoped.startYear)
      const endSigned = toSignedYear(scoped.endEra, scoped.endYear)
      if (startSigned != null) {
        minSigned =
          minSigned == null ? startSigned : Math.min(minSigned, startSigned)
        maxSigned =
          maxSigned == null ? startSigned : Math.max(maxSigned, startSigned)
      }
      if (endSigned != null) {
        minSigned =
          minSigned == null ? endSigned : Math.min(minSigned, endSigned)
        maxSigned =
          maxSigned == null ? endSigned : Math.max(maxSigned, endSigned)
      }
    }
    return {
      minSigned,
      maxSigned,
      minLabel: formatSignedYearShort(minSigned),
      maxLabel: formatSignedYearShort(maxSigned),
      totalYears:
        minSigned != null && maxSigned != null && maxSigned >= minSigned
          ? maxSigned - minSigned - (minSigned < 0 && maxSigned > 0 ? 1 : 0)
          : null,
    }
  }, [list])

  const withRelationsCount = useMemo(
    () =>
      list.filter((item) => {
        const rels = countryRelations.get(item.id) ?? EMPTY_RELS
        return (
          rels.transitions.length +
            rels.relations.length +
            rels.memberships.length >
          0
        )
      }).length,
    [list, countryRelations],
  )

  // ── Bento 인포그래픽 집계 ───────────────────────────────────────────────────
  const bentoInfographic = useMemo(() => {
    const rawRoleSlices: Array<SegmentSlice & { filterKey: CategoryFilterKey }> =
      [
        {
          key: 'PREDECESSOR',
          filterKey: 'PREDECESSOR',
          label: '직계 전신',
          value: classification.predecessors.length,
          color: isDark ? '#a5b4fc' : '#4f46e5',
          meta: `${classification.predecessors.length}개국`,
        },
        {
          key: 'CONSTITUENT',
          filterKey: 'CONSTITUENT',
          label: '구성 정치체',
          value: classification.constituents.length,
          color: isDark ? '#38bdf8' : '#0284c7',
          meta: `${classification.constituents.length}개국`,
        },
        {
          key: 'HERITAGE',
          filterKey: 'HERITAGE',
          label: '역사 유산',
          value: classification.heritage.length,
          color: isDark ? '#fbbf24' : '#d97706',
          meta: `${classification.heritage.length}개국`,
        },
      ]
    const roleSlices = rawRoleSlices.filter((s) => s.value > 0)

    const stateColorMap: Record<StateGroupKey, string> = isDark
      ? {
          monarchy: '#a5b4fc',
          empire: '#fbbf24',
          republic: '#34d399',
          principality: '#38bdf8',
          other: '#94a3b8',
        }
      : {
          monarchy: '#4f46e5',
          empire: '#d97706',
          republic: '#059669',
          principality: '#0284c7',
          other: '#64748b',
        }
    const stateCounts = new Map<StateGroupKey, number>()
    for (const item of list) {
      const grp = classifyStateGroup(item.stateType)
      stateCounts.set(grp, (stateCounts.get(grp) ?? 0) + 1)
    }
    const stateOrder: StateGroupKey[] = [
      'monarchy',
      'empire',
      'republic',
      'principality',
      'other',
    ]
    const stateSlices: Array<SegmentSlice & { groupKey: StateGroupKey }> =
      stateOrder
        .filter((gk) => (stateCounts.get(gk) ?? 0) > 0)
        .map((gk) => ({
          key: gk,
          groupKey: gk,
          label: STATE_GROUP_LABEL[gk],
          value: stateCounts.get(gk) ?? 0,
          color: stateColorMap[gk],
          meta: `${stateCounts.get(gk) ?? 0}개국`,
        }))

    const topLongest = [...list]
      .map((item) => ({
        item,
        duration:
          getCountryDurationYears({
            startYear: item.startYear,
            startEra: item.startEra,
            endYear: item.endYear,
            endEra: item.endEra,
          }) ?? 0,
      }))
      .filter((entry) => entry.duration > 0)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 4)
    const maxDuration = Math.max(1, ...topLongest.map((e) => e.duration))

    return {
      roleSlices,
      stateSlices,
      topLongest,
      maxDuration,
    }
  }, [classification, list, isDark])

  const filteredList = useMemo(() => {
    const lowered = searchQuery.trim().toLowerCase()
    const matched = list.filter((item) => {
      const resolvedKind =
        classification.kindById.get(item.id) ?? item.linkKind ?? null
      const rels = countryRelations.get(item.id) ?? EMPTY_RELS
      const hasAnyRel =
        rels.transitions.length +
          rels.relations.length +
          rels.memberships.length >
        0

      if (
        categoryFilter === 'PREDECESSOR' ||
        categoryFilter === 'CONSTITUENT' ||
        categoryFilter === 'HERITAGE'
      ) {
        if (resolvedKind !== categoryFilter) return false
      } else if (categoryFilter === 'withRelations' && !hasAnyRel) {
        return false
      }

      if (
        stateGroupFilter !== 'all' &&
        classifyStateGroup(item.stateType) !== stateGroupFilter
      ) {
        return false
      }

      if (!lowered) return true
      const stateTypeLabel = item.stateType
        ? getStateTypeLabel(item.stateType)
        : ''
      const kindLabel = resolvedKind ? (LINK_KIND_LABEL[resolvedKind] ?? '') : ''
      const searchable = [
        item.name,
        item.enName,
        stateTypeLabel,
        kindLabel,
        formatCountryPeriod(item),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(lowered)
    })

    if (sortBy === 'eraDesc') {
      return [...matched].reverse()
    }
    if (sortBy === 'durationDesc') {
      return [...matched].sort((a, b) => {
        const dA =
          getCountryDurationYears({
            startYear: a.startYear,
            startEra: a.startEra,
            endYear: a.endYear,
            endEra: a.endEra,
          }) ?? -1
        const dB =
          getCountryDurationYears({
            startYear: b.startYear,
            startEra: b.startEra,
            endYear: b.endYear,
            endEra: b.endEra,
          }) ?? -1
        return dB - dA
      })
    }
    return matched
  }, [
    list,
    classification.kindById,
    countryRelations,
    categoryFilter,
    stateGroupFilter,
    searchQuery,
    sortBy,
  ])

  const enrichedForLineage = useMemo(
    () =>
      filteredList.map((item) => ({
        ...toLinkScopedPeriod(item),
        linkKind:
          classification.kindById.get(item.id) ?? item.linkKind ?? null,
      })),
    [filteredList, classification.kindById],
  )

  const renderRelationSummaries = (item: HistoricalCountryItem) => {
    const rels = countryRelations.get(item.id) ?? EMPTY_RELS
    const chips: Array<{ key: string; label: string; highlight?: boolean }> = []

    for (const transition of rels.transitions) {
      const isIncoming = transition.successorId === item.id
      const otherId = isIncoming
        ? transition.predecessorId
        : transition.successorId
      const otherName =
        idToCountry.get(otherId)?.name ??
        (isIncoming ? transition.predecessorName : transition.successorName) ??
        '미상'
      const eventLabel =
        TRANSITION_EVENT_LABELS[transition.eventType as TransitionEventType] ??
        transition.eventType
      const scopeText = transition.transitionScope
        ? ` · ${TRANSITION_SCOPE_LABELS[transition.transitionScope] ?? transition.transitionScope}`
        : ''
      chips.push({
        key: `tr-${transition.id}-${isIncoming ? 'in' : 'out'}`,
        label: isIncoming
          ? `전신 ← ${otherName} (${eventLabel}${scopeText})`
          : `후신 → ${otherName} (${eventLabel}${scopeText})`,
        highlight: true,
      })
    }

    for (const membership of rels.memberships) {
      const isParent = membership.historicalCountryId === item.id
      const otherName = isParent
        ? (idToCountry.get(membership.memberCountryId)?.name ??
          membership.memberName)
        : (idToCountry.get(membership.historicalCountryId)?.name ??
          membership.parentName)
      const roleLabel =
        MEMBERSHIP_ROLE_LABELS[membership.role as HistoricalMembershipRole] ??
        membership.role
      const leaderSuffix = membership.isLeadingMember ? '·주축' : ''
      chips.push({
        key: `mem-${membership.id}-${isParent ? 'parent' : 'member'}`,
        label: isParent
          ? `하위포함 ⊃ ${otherName ?? '미상'} (${roleLabel}${leaderSuffix})`
          : `상위소속 ⊂ ${otherName ?? '미상'} (${roleLabel}${leaderSuffix})`,
      })
    }

    for (const relation of rels.relations) {
      const isSubject = relation.subjectCountryId === item.id
      const otherId = isSubject
        ? relation.objectCountryId
        : relation.subjectCountryId
      const otherName =
        idToCountry.get(otherId)?.name ??
        (isSubject ? relation.objectCountryName : relation.subjectCountryName) ??
        '미상'
      const relLabel =
        RELATION_TYPE_LABELS[relation.relationType as HistoricalRelationType] ??
        relation.relationType
      chips.push({
        key: `rel-${relation.id}`,
        label: `${relLabel}: ${otherName}`,
      })
    }

    return chips
  }

  const isFiltered =
    categoryFilter !== 'all' ||
    stateGroupFilter !== 'all' ||
    searchQuery.trim().length > 0

  const resetFilters = () => {
    setCategoryFilter('all')
    setStateGroupFilter('all')
    setSearchQuery('')
  }

  const filterBarNode = (
    <FilterChipGroup role="tablist" aria-label="과거 국가 계보 분류 필터">
      <FilterChip
        type="button"
        role="tab"
        aria-selected={categoryFilter === 'all' && stateGroupFilter === 'all'}
        $active={categoryFilter === 'all' && stateGroupFilter === 'all'}
        onClick={() => {
          setCategoryFilter('all')
          setStateGroupFilter('all')
        }}
      >
        전체 <FilterChipCount>{count}</FilterChipCount>
      </FilterChip>
      <FilterChip
        type="button"
        role="tab"
        aria-selected={categoryFilter === 'PREDECESSOR'}
        $active={categoryFilter === 'PREDECESSOR'}
        onClick={() =>
          setCategoryFilter((prev) =>
            prev === 'PREDECESSOR' ? 'all' : 'PREDECESSOR',
          )
        }
      >
        직계 전신{' '}
        <FilterChipCount>{classification.predecessors.length}</FilterChipCount>
      </FilterChip>
      {classification.constituents.length > 0 && (
        <FilterChip
          type="button"
          role="tab"
          aria-selected={categoryFilter === 'CONSTITUENT'}
          $active={categoryFilter === 'CONSTITUENT'}
          onClick={() =>
            setCategoryFilter((prev) =>
              prev === 'CONSTITUENT' ? 'all' : 'CONSTITUENT',
            )
          }
        >
          구성 정치체{' '}
          <FilterChipCount>
            {classification.constituents.length}
          </FilterChipCount>
        </FilterChip>
      )}
      {classification.heritage.length > 0 && (
        <FilterChip
          type="button"
          role="tab"
          aria-selected={categoryFilter === 'HERITAGE'}
          $active={categoryFilter === 'HERITAGE'}
          onClick={() =>
            setCategoryFilter((prev) =>
              prev === 'HERITAGE' ? 'all' : 'HERITAGE',
            )
          }
        >
          역사 유산{' '}
          <FilterChipCount>{classification.heritage.length}</FilterChipCount>
        </FilterChip>
      )}
      {withRelationsCount > 0 && (
        <FilterChip
          type="button"
          role="tab"
          aria-selected={categoryFilter === 'withRelations'}
          $active={categoryFilter === 'withRelations'}
          onClick={() =>
            setCategoryFilter((prev) =>
              prev === 'withRelations' ? 'all' : 'withRelations',
            )
          }
        >
          관계 보유 <FilterChipCount>{withRelationsCount}</FilterChipCount>
        </FilterChip>
      )}
    </FilterChipGroup>
  )

  return (
    <DashboardStyles.DashboardRoot>
      <SectionWrap>
        {/* 제목은 위 탭('과거국가')이 맡는다 — 보기 전환을 왼쪽 알약으로, 연결은 오른쪽 */}
        <SectionSubNav<LinkedViewMode>
          ariaLabel="과거 국가 보기 방식"
          kind="views"
          tabs={
            count > 0
              ? [
                  { key: 'list', label: '2열 원장', icon: <FiList size={13} aria-hidden /> },
                  { key: 'span', label: '존속 스팬 바', icon: <FiAlignLeft size={13} aria-hidden /> },
                  { key: 'century', label: '세기 계보도', icon: <FiGitCommit size={13} aria-hidden /> },
                ]
              : undefined
          }
          activeTab={viewMode}
          onTabChange={setViewMode}
          summary={
            <span>
              연결된 과거 국가 <SubNavFigure>{count}</SubNavFigure>
            </span>
          }
          actions={
            <>
            {/* 비어 있으면 등록은 빈 화면의 버튼 하나만 */}
            {isLinkedDataLoading || count === 0 ? null : (
              <PrimaryActionButton
                disabled={isMutatingLink}
                onClick={() => setIsPickerOpen(true)}
              >
                <FiPlus size={14} />
                <span>과거 국가 연결</span>
              </PrimaryActionButton>
            )}
            </>
          }
        />

        {count > 0 && (
          <BentoHeaderWrap aria-label="연결된 과거 국가 인포그래픽 요약">
            <BentoGrid3Col>
              {/* Card 1: 계보 역할 비중 & 통사 범위 */}
              <BentoCard>
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>계보 역할 · 통사 범위</BentoCardTitle>
                    <BentoCardBadge>{count}개국</BentoCardBadge>
                  </BentoCardTitleGroup>
                  {categoryFilter !== 'all' && (
                    <MiniResetBtn
                      type="button"
                      onClick={() => setCategoryFilter('all')}
                    >
                      전체 역할
                    </MiniResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody>
                  <PolityHeroLine>
                    <BigCountNum>
                      {count.toLocaleString('ko-KR')}
                      <span>개국</span>
                    </BigCountNum>
                    <SpanSubLabel>
                      {spanSummary.minLabel && spanSummary.maxLabel
                        ? `${spanSummary.minLabel} ~ ${spanSummary.maxLabel}${spanSummary.totalYears ? ` (약 ${spanSummary.totalYears.toLocaleString('ko-KR')}년사)` : ''}`
                        : '존속 연대 집계'}
                    </SpanSubLabel>
                  </PolityHeroLine>

                  <StackedSegmentBar
                    slices={bentoInfographic.roleSlices}
                    height={10}
                    showPercent
                  />

                  <InteractiveLegendRow>
                    {bentoInfographic.roleSlices.map((slice) => {
                      const active = categoryFilter === slice.filterKey
                      return (
                        <LegendPillBtn
                          key={slice.key}
                          type="button"
                          $active={active}
                          onClick={() =>
                            setCategoryFilter((prev) =>
                              prev === slice.filterKey ? 'all' : slice.filterKey,
                            )
                          }
                        >
                          <SwatchDot $color={slice.color} />
                          <span>{slice.label}</span>
                          <strong>{slice.meta}</strong>
                        </LegendPillBtn>
                      )
                    })}
                  </InteractiveLegendRow>
                </BentoCardBody>
              </BentoCard>

              {/* Card 2: 국체 · 국가 형태 도넛 */}
              <BentoCard>
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>국체 · 국가 형태 분포</BentoCardTitle>
                    <BentoCardBadge>
                      관계 {transitions.length + memberships.length + relations.length}건
                    </BentoCardBadge>
                  </BentoCardTitleGroup>
                  {stateGroupFilter !== 'all' && (
                    <MiniResetBtn
                      type="button"
                      onClick={() => setStateGroupFilter('all')}
                    >
                      전체 국체
                    </MiniResetBtn>
                  )}
                </BentoCardHeader>
                <BentoCardBody>
                  <DonutFlexRow>
                    <MiniDonutRing
                      slices={bentoInfographic.stateSlices}
                      size={74}
                      strokeWidth={10}
                      centerValue={
                        stateGroupFilter !== 'all'
                          ? String(
                              bentoInfographic.stateSlices.find(
                                (s) => s.groupKey === stateGroupFilter,
                              )?.value ?? 0,
                            )
                          : String(count)
                      }
                      centerLabel={
                        stateGroupFilter !== 'all'
                          ? STATE_GROUP_LABEL[stateGroupFilter]
                          : '전체 정치체'
                      }
                    />
                    <DonutLegendStack>
                      {bentoInfographic.stateSlices.map((slice) => {
                        const pct = Math.round((slice.value / count) * 100)
                        const active = stateGroupFilter === slice.groupKey
                        return (
                          <DonutLegendRowBtn
                            key={slice.key}
                            type="button"
                            $active={active}
                            onClick={() =>
                              setStateGroupFilter((prev) =>
                                prev === slice.groupKey ? 'all' : slice.groupKey,
                              )
                            }
                          >
                            <SwatchDot $color={slice.color} />
                            <DonutLegendLabel $active={active}>
                              {slice.label}
                            </DonutLegendLabel>
                            <DonutLegendVal>
                              {slice.value}개 ({pct}%)
                            </DonutLegendVal>
                          </DonutLegendRowBtn>
                        )
                      })}
                    </DonutLegendStack>
                  </DonutFlexRow>
                </BentoCardBody>
              </BentoCard>

              {/* Card 3: 장기 존속 과거 국가 Top 4 비례 막대 */}
              <BentoCard>
                <BentoCardHeader>
                  <BentoCardTitleGroup>
                    <BentoCardTitle>장기 존속 과거 국가 Top 4</BentoCardTitle>
                    <BentoCardBadge>존속 연수 비례</BentoCardBadge>
                  </BentoCardTitleGroup>
                </BentoCardHeader>
                <BentoCardBody>
                  {bentoInfographic.topLongest.length > 0 ? (
                    <LongestBarList>
                      {bentoInfographic.topLongest.map(
                        ({ item, duration }, idx) => {
                          const pct = Math.max(
                            8,
                            Math.round(
                              (duration / bentoInfographic.maxDuration) * 100,
                            ),
                          )
                          return (
                            <LongestBarBtn
                              key={item.id}
                              type="button"
                              onClick={() =>
                                navigate(pathKeys.countryDetail(item.id))
                              }
                            >
                              <LongestRowHead>
                                <LongestName>
                                  <small>{idx + 1}.</small> {item.name}
                                </LongestName>
                                <LongestDuration>
                                  약 {duration.toLocaleString('ko-KR')}년
                                </LongestDuration>
                              </LongestRowHead>
                              <LongestTrack>
                                <LongestFill $pct={pct} $top={idx === 0} />
                              </LongestTrack>
                            </LongestBarBtn>
                          )
                        },
                      )}
                    </LongestBarList>
                  ) : (
                    <EmptyDurationHint>
                      성립·종료 연도가 입력되면 장기 존속 정치체 비례 막대가 표시됩니다.
                    </EmptyDurationHint>
                  )}
                </BentoCardBody>
              </BentoCard>
            </BentoGrid3Col>
          </BentoHeaderWrap>
        )}

        {isLinkedDataLoading ? (
          <ChartSkeleton variant="bars" rows={5} />
        ) : count === 0 ? (
          <CountryTabEmptyState
            Icon={FiClock}
            title="아직 연결된 과거 국가가 없습니다"
            description="이 국가의 전신이거나 이 국가를 이룬 역사 국가를 연결합니다. 역사 국가끼리 계승·소속 관계를 넣으면 계보가 자동으로 나뉩니다."
            actionLabel="과거 국가 연결"
            onAction={() => setIsPickerOpen(true)}
            features={[
              { Icon: FiGitBranch, title: '계보 자동 분류', description: '직계 전신 · 구성 정치체 · 역사 유산으로 나눔' },
              { Icon: FiAlignLeft, title: '존속 스팬 바', description: '나라마다 존속 기간을 한 시간축에 겹쳐 보기' },
              { Icon: FiGitCommit, title: '세기 계보도', description: '세기마다 어떤 정치체가 이어졌는지 흐름으로' },
            ]}
          />
        ) : viewMode !== 'list' ? (
          <FlowSectionWrap>
            <LineageFlow
              historicalCountries={enrichedForLineage}
              modernEndpoint={{
                id: country.id,
                name: country.name,
                flagEmoji: country.flagEmoji,
                thumbnailUrl: country.thumbnailUrl,
                isoCode: country.isoCode,
              }}
              onSelect={(targetId) =>
                navigate(pathKeys.countryDetail(targetId))
              }
              toolbarLeft={filterBarNode}
              hideHeadline
              externalViewMode={viewMode === 'span' ? 'span' : 'century'}
              onExternalViewModeChange={(next) => {
                if (next === 'ledger') setViewMode('list')
                else setViewMode(next)
              }}
            />

            {transitions.length + memberships.length + relations.length > 0 && (
              <SubLedgerSection aria-label="변천·소속·수평 관계 원장">
                <SubLedgerHead>
                  <SubLedgerTitle>
                    국가 간 변천 · 소속 · 외교 관계 원장
                  </SubLedgerTitle>
                  <SubLedgerCount>
                    총{' '}
                    {(
                      transitions.length +
                      memberships.length +
                      relations.length
                    ).toLocaleString('ko-KR')}
                    건
                  </SubLedgerCount>
                </SubLedgerHead>
                <RelationLedgerGrid>
                  {transitions.map((transition) => (
                    <RelationLedgerCell key={`tr-${transition.id}`}>
                      <RelationKindBadge $tone="transition">
                        변천 ·{' '}
                        {TRANSITION_EVENT_LABELS[
                          transition.eventType as TransitionEventType
                        ] ?? transition.eventType}
                      </RelationKindBadge>
                      <RelationMainText>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(transition.predecessorId),
                            )
                          }
                        >
                          {idToCountry.get(transition.predecessorId)?.name ??
                            transition.predecessorName ??
                            '전임'}
                        </RelationNodeBtn>
                        <RelationArrow>
                          <FiArrowRight size={12} />
                        </RelationArrow>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(transition.successorId),
                            )
                          }
                        >
                          {idToCountry.get(transition.successorId)?.name ??
                            transition.successorName ??
                            '후임'}
                        </RelationNodeBtn>
                      </RelationMainText>
                    </RelationLedgerCell>
                  ))}

                  {memberships.map((membership) => (
                    <RelationLedgerCell key={`mem-${membership.id}`}>
                      <RelationKindBadge $tone="membership">
                        소속 ·{' '}
                        {MEMBERSHIP_ROLE_LABELS[
                          membership.role as HistoricalMembershipRole
                        ] ?? membership.role}
                        {membership.isLeadingMember ? ' (주축)' : ''}
                      </RelationKindBadge>
                      <RelationMainText>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(
                                membership.historicalCountryId,
                              ),
                            )
                          }
                        >
                          {idToCountry.get(membership.historicalCountryId)
                            ?.name ??
                            membership.parentName ??
                            '상위'}
                        </RelationNodeBtn>
                        <RelationArrow>
                          <FiLayers size={11} />
                        </RelationArrow>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(
                                membership.memberCountryId,
                              ),
                            )
                          }
                        >
                          {idToCountry.get(membership.memberCountryId)?.name ??
                            membership.memberName ??
                            '하위'}
                        </RelationNodeBtn>
                      </RelationMainText>
                    </RelationLedgerCell>
                  ))}

                  {relations.map((relation) => (
                    <RelationLedgerCell key={`rel-${relation.id}`}>
                      <RelationKindBadge $tone="relation">
                        관계 ·{' '}
                        {RELATION_TYPE_LABELS[
                          relation.relationType as HistoricalRelationType
                        ] ?? relation.relationType}
                      </RelationKindBadge>
                      <RelationMainText>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(relation.subjectCountryId),
                            )
                          }
                        >
                          {idToCountry.get(relation.subjectCountryId)?.name ??
                            relation.subjectCountryName ??
                            '주체'}
                        </RelationNodeBtn>
                        <RelationArrow>
                          <FiRepeat size={11} />
                        </RelationArrow>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(relation.objectCountryId),
                            )
                          }
                        >
                          {idToCountry.get(relation.objectCountryId)?.name ??
                            relation.objectCountryName ??
                            '대상'}
                        </RelationNodeBtn>
                      </RelationMainText>
                    </RelationLedgerCell>
                  ))}
                </RelationLedgerGrid>
              </SubLedgerSection>
            )}
          </FlowSectionWrap>
        ) : (
          <>
            <FilterToolbar>
              {filterBarNode}

              <ToolbarRightGroup>
                {stateGroupFilter !== 'all' && (
                  <ActiveFilterTag
                    type="button"
                    onClick={() => setStateGroupFilter('all')}
                  >
                    <span>국체: {STATE_GROUP_LABEL[stateGroupFilter]}</span>
                    <FiX size={11} />
                  </ActiveFilterTag>
                )}
                {isFiltered && (
                  <ResetLinkBtn type="button" onClick={resetFilters}>
                    초기화 ({filteredList.length}/{count})
                  </ResetLinkBtn>
                )}

                <SearchInputBox>
                  <FiSearch size={13} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(changeEvent) =>
                      setSearchQuery(changeEvent.target.value)
                    }
                    placeholder="국호 · 영문명 · 체제 · 연도 검색…"
                    aria-label="과거 국가 검색"
                  />
                </SearchInputBox>

                <SortSelect
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as LinkedSortKey)}
                  aria-label="과거 국가 정렬 기준"
                >
                  <option value="eraAsc">성립 오래된순</option>
                  <option value="eraDesc">성립 최신순</option>
                  <option value="durationDesc">존속 기간 긴 순</option>
                </SortSelect>
              </ToolbarRightGroup>
            </FilterToolbar>

            {filteredList.length === 0 ? (
              <NoMatchRow>
                <span>선택한 분류나 검색어와 일치하는 과거 국가가 없습니다.</span>
                <ResetLinkBtn type="button" onClick={resetFilters}>
                  전체 보기
                </ResetLinkBtn>
              </NoMatchRow>
            ) : (
              <CountryLedgerGrid>
                {filteredList.map((item) => {
                  const resolvedKind =
                    classification.kindById.get(item.id) ??
                    item.linkKind ??
                    null
                  const kindLabel = resolvedKind
                    ? LINK_KIND_LABEL[resolvedKind]
                    : null
                  const stateTypeLabel = item.stateType
                    ? getStateTypeLabel(item.stateType)
                    : null
                  const periodLabel = formatCountryPeriod(item)
                  const linkPeriodLabel = formatModernLinkPeriod(item)
                  const durationYears = getCountryDurationYears({
                    startYear: item.startYear,
                    startEra: item.startEra,
                    endYear: item.endYear,
                    endEra: item.endEra,
                  })
                  const relationChips = renderRelationSummaries(item)

                  // 전체 통사 범위 대비 상대 존속 위치 계산
                  const scoped = toLinkScopedPeriod(item)
                  const sYear = toSignedYear(scoped.startEra, scoped.startYear)
                  const eYear =
                    toSignedYear(scoped.endEra, scoped.endYear) ?? sYear
                  const globalMin = spanSummary.minSigned
                  const globalMax = spanSummary.maxSigned
                  let spanLeftPct: number | null = null
                  let spanWidthPct: number | null = null
                  if (
                    sYear != null &&
                    eYear != null &&
                    globalMin != null &&
                    globalMax != null &&
                    globalMax > globalMin
                  ) {
                    const total = globalMax - globalMin
                    spanLeftPct = Math.max(
                      0,
                      Math.min(97, ((sYear - globalMin) / total) * 100),
                    )
                    spanWidthPct = Math.max(
                      2.5,
                      Math.min(
                        100 - spanLeftPct,
                        ((Math.max(sYear + 1, eYear) - sYear) / total) * 100,
                      ),
                    )
                  }

                  return (
                    <CountryLedgerCell key={item.id}>
                      <CountryRowButton
                        type="button"
                        onClick={() =>
                          navigate(pathKeys.countryDetail(item.id))
                        }
                      >
                        <CountryThumb>
                          {item.thumbnailUrl ? (
                            <img
                              src={getUploadImageUrl(item.thumbnailUrl)}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span>{item.name.slice(0, 1)}</span>
                          )}
                        </CountryThumb>

                        <CountryMainCol>
                          <CountryTitleRow>
                            <CountryNameText>{item.name}</CountryNameText>
                            {item.enName && (
                              <CountryEnNameText>{item.enName}</CountryEnNameText>
                            )}
                            {durationYears != null && durationYears > 0 && (
                              <DurationBadge>
                                약 {durationYears.toLocaleString('ko-KR')}년
                              </DurationBadge>
                            )}
                          </CountryTitleRow>

                          <CountryMetaRow>
                            {kindLabel && (
                              <KindBadge $kind={resolvedKind ?? ''}>
                                {kindLabel}
                              </KindBadge>
                            )}
                            {stateTypeLabel && stateTypeLabel !== '미분류' && (
                              <StateBadge>{stateTypeLabel}</StateBadge>
                            )}
                            <PeriodText>{periodLabel}</PeriodText>
                            {linkPeriodLabel && (
                              <LinkPeriodText title="이 나라가 이 땅에 있었던 기간">
                                이 땅에서 {linkPeriodLabel}
                              </LinkPeriodText>
                            )}
                          </CountryMetaRow>

                          {spanLeftPct != null && spanWidthPct != null && (
                            <MiniEraSpanTrack title={`전체 통사 내 존속 구간 (${periodLabel})`}>
                              <MiniEraSpanFill
                                $kind={resolvedKind ?? ''}
                                style={{
                                  left: `${spanLeftPct}%`,
                                  width: `${spanWidthPct}%`,
                                }}
                              />
                            </MiniEraSpanTrack>
                          )}

                          {relationChips.length > 0 && (
                            <RelationChipRow>
                              {relationChips.slice(0, 4).map((chip) => (
                                <RelationChip
                                  key={chip.key}
                                  $highlight={chip.highlight}
                                >
                                  {chip.label}
                                </RelationChip>
                              ))}
                              {relationChips.length > 4 && (
                                <RelationChip>
                                  외 {relationChips.length - 4}건
                                </RelationChip>
                              )}
                            </RelationChipRow>
                          )}
                        </CountryMainCol>

                        <DetailActionLabel>
                          <span>대시보드</span>
                          <FiChevronRight size={13} />
                        </DetailActionLabel>
                      </CountryRowButton>

                      <CountryRowActions>
                        <UnlinkRowBtn
                          type="button"
                          disabled={isMutatingLink}
                          onClick={() => void handleUnlink(item)}
                        >
                          연결 해제
                        </UnlinkRowBtn>
                      </CountryRowActions>
                    </CountryLedgerCell>
                  )
                })}
              </CountryLedgerGrid>
            )}
          </>
        )}

        <CountryPicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          title={`${country.name}에 연결할 과거 국가 선택`}
          mode="add"
          scope="historical"
          modernCountries={[]}
          historicalCountries={allHistoricalCountries}
          selectedIds={linkedIds}
          isLoading={isAllHistoricalLoading}
          onCommit={(pickedList) => void handleCommitLink(pickedList)}
        />
      </SectionWrap>
    </DashboardStyles.DashboardRoot>
  )
}

/* ── Styled Components ────────────────────────────────────────────────────── */

const SectionWrap = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
`

const BentoHeaderWrap = styled.div`
  padding-bottom: 14px;
`

const MiniResetBtn = styled.button`
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const PolityHeroLine = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 10px;
`

const BigCountNum = styled.strong`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}

  span {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SpanSubLabel = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const InteractiveLegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
`

const LegendPillBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const SwatchDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const DonutFlexRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const DonutLegendStack = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const DonutLegendRowBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 3px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const DonutLegendLabel = styled.span<{ $active?: boolean }>`
  flex: 1;
  min-width: 0;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DonutLegendVal = styled.span`
  flex-shrink: 0;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const LongestBarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const LongestBarBtn = styled.button`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 3px 5px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const LongestRowHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const LongestName = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  small {
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
`

const LongestDuration = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const LongestTrack = styled.div`
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const LongestFill = styled.div<{ $pct: number; $top?: boolean }>`
  width: ${({ $pct }) => `${$pct}%`};
  height: 100%;
  border-radius: 999px;
  background: ${({ theme, $top }) =>
    $top
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.5)'
        : 'rgba(79, 70, 229, 0.5)'};
`

const EmptyDurationHint = styled.p`
  margin: 0;
  padding: 12px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FilterToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const FilterChipGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

const FilterChip = styled(LedgerFilterChip)``

const FilterChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  opacity: 0.85;
`

const ToolbarRightGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ActiveFilterTag = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
`

const ResetLinkBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
  ${DIGIT_DISPLAY}

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const SearchInputBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  width: min(210px, 100%);

  &:focus-within {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  input {
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.primary};
    width: 100%;
    outline: none;
  }
`

const SortSelect = styled.select`
  height: 32px;
  padding: 0 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CountryLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const CountryLedgerCell = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @media (min-width: 780px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
`

const CountryRowButton = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 12px 12px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const CountryRowActions = styled.div`
  display: flex;
  align-items: center;
  padding: 0 10px 0 4px;
  flex-shrink: 0;
`

const UnlinkRowBtn = styled.button`
  padding: 3px 7px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CountryThumb = styled.div`
  width: 38px;
  height: 28px;
  border-radius: ${RADIUS.XS};
  overflow: hidden;
  flex-shrink: 0;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const CountryMainCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
`

const CountryTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
`

const CountryNameText = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountryEnNameText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
`

const DurationBadge = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const CountryMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
`

const KindBadge = styled.span<{ $kind: string }>`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme, $kind }) => {
    if ($kind === 'PREDECESSOR') return ledgerAccent(theme.mode)
    if ($kind === 'CONSTITUENT')
      return theme.mode === 'dark' ? '#38bdf8' : '#0369a1'
    return theme.mode === 'dark' ? '#fbbf24' : '#92400e'
  }};
  background: ${({ theme, $kind }) => {
    if ($kind === 'PREDECESSOR') return ledgerAccentSubtle(theme.mode)
    if ($kind === 'CONSTITUENT')
      return theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.14)' : '#e0f2fe'
    return theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7'
  }};
`

const StateBadge = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const PeriodText = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const LinkPeriodText = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${DIGIT_DISPLAY}
`

const MiniEraSpanTrack = styled.div`
  position: relative;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const MiniEraSpanFill = styled.div<{ $kind: string }>`
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 6px;
  border-radius: 999px;
  background: ${({ theme, $kind }) => {
    if ($kind === 'PREDECESSOR') return ledgerAccent(theme.mode)
    if ($kind === 'CONSTITUENT')
      return theme.mode === 'dark' ? '#38bdf8' : '#0284c7'
    return theme.mode === 'dark' ? '#fbbf24' : '#d97706'
  }};
  opacity: 0.85;
`

const RelationChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
`

const RelationChip = styled.span<{ $highlight?: boolean }>`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme, $highlight }) =>
    $highlight ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  background: ${({ theme, $highlight }) =>
    $highlight ? ledgerAccentSubtle(theme.mode) : 'transparent'};
`

const DetailActionLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  align-self: center;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const NoMatchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FlowSectionWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const SubLedgerSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SubLedgerHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const SubLedgerTitle = styled.h4`
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SubLedgerCount = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const RelationLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const RelationLedgerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  min-width: 0;

  @media (min-width: 780px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

const RelationKindBadge = styled.span<{
  $tone: 'transition' | 'membership' | 'relation'
}>`
  padding: 2px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  color: ${({ theme, $tone }) => {
    if ($tone === 'transition') return ledgerAccent(theme.mode)
    if ($tone === 'membership')
      return theme.mode === 'dark' ? '#38bdf8' : '#0369a1'
    return theme.mode === 'dark' ? '#34d399' : '#047857'
  }};
  background: ${({ theme, $tone }) => {
    if ($tone === 'transition') return ledgerAccentSubtle(theme.mode)
    if ($tone === 'membership')
      return theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.14)' : '#e0f2fe'
    return theme.mode === 'dark' ? 'rgba(52, 211, 153, 0.14)' : '#d1fae5'
  }};
`

const RelationMainText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
`

const RelationNodeBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const RelationArrow = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

