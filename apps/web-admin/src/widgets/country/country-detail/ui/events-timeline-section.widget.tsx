/**
 * 국가 상세 "사건" 탭 — 현대 국가(현재 국가 + 브리지된 과거 국가 통사)와
 * 역사 국가(단일 왕조·정권) 양쪽의 연관 사건을 한눈에 조망하는 인포그래픽 원장.
 *
 * - 상단 3열 인터랙티브 Bento 인포그래픽(통사 규모·정치체 비중 · 세기별 분야 누적 막대 · 9대 분야 도넛)
 *   → 차트 막대·범례 클릭 시 하단 연표/간트/캘린더가 즉시 연동 필터링됨
 * - 1줄 통합 필터 바(시대 범위 · 9대 사건 분야 칩 · 세기/정치체 활성 태그 · 검색)
 * - 3모드 보기 전환: [연표 원장 | 기간 간트(스팬 타임라인) | 월별 캘린더]
 * - 행 클릭 시 EventInlineModal 빠른 미리보기 오픈(스크롤·필터 보존), 우측 '상세 →'로 전용 페이지 진입
 * - '+ 새 사건 등록' 시 현재 국가(현대/역사) 및 선택 분야 자동 프리필
 */
import { CountryTabEmptyState } from './country-tab-empty-state'
import React, { useEffect, useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import {
  FiAlignLeft,
  FiArrowUpRight,
  FiCalendar,
  FiChevronDown,
  FiList,
  FiMapPin,
  FiPieChart,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { useEvents } from '@/entities/event/model'
import type { EventCountryParticipant } from '@/entities/event/model/country-participant'
import {
  domainAccent,
  domainLabel,
  EVENT_DOMAIN_ORDER,
  type EventDomainKey,
  isEventDomainKey,
} from '@/entities/event/model/event-domain'
import {
  eventTypeLabel,
  eventTypeShort,
} from '@/entities/event/model/event-type-registry'
import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid3Col,
  type CenturyDomainBucket,
  MiniDonutRing,
  type SegmentSlice,
  StackedCenturyDomainChart,
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
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import {
  formatCenturyLabel,
  formatSignedYear,
} from '@/shared/lib/lifespan-text'
import { pathKeys } from '@/shared/router'
import { SectionSubNav, SubNavFigure } from '@/shared/ui/section-sub-nav/section-sub-nav'
import { EventRegisterModal } from '@/widgets/event-form/ui/event-register-modal'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'

import type { CalendarEventItem } from '../model/use-country-dashboard-stats'
import {
  countryTabCanvasPadding,
  LedgerFilterChip,
  LedgerPrimaryButton,
  LedgerToolbarButton,
  LedgerViewSwitch,
  LedgerViewSwitchItem,
} from './country-ledger-primitives'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import { EventCalendarPanel } from './dashboard-panels/event-calendar-panel'

export interface EventsTimelineSectionProps {
  /** 국가(현대/역사적) ID로 연관 사건만 표시. 미전달 시 전체 */
  countryId?: string | null
  /** 국가명 (새 사건 안내·허브 링크용) */
  countryName?: string | null
  /** 역사 국가 상세에서 호출된 경우 true (사건 등록 모달 historicalCountryId 프리필) */
  isHistoricalCountry?: boolean
  /**
   * 이 국가로 인정할 id 전부 — 현대 국가 id + 브리지된 과거 국가 id들.
   */
  scopeCountryIds?: string[]
  /** URL searchParams form=create 시 true. 사건 등록 모달을 바로 연다 */
  initialFormFromSearchParams?: boolean
  /**
   * URL의 `century` — 부호 세기 문자열(20 = 20세기, -1 = 기원전 1세기).
   * 대시보드 연표 막대에서 넘어오면 그 세기 묶음으로 스크롤하고 잠깐 강조한다.
   */
  focusCentury?: string | null
  /** 등록 모달 열고 닫을 때 URL 동기화 (열기: true, 닫기: false) */
  onNavigateToForm?: (toForm: boolean) => void
}

type EventViewMode = 'list' | 'gantt' | 'calendar'

const GANTT_MAX_ROWS = 75

function toCenturyIndex(signedYear: number | null): number | null {
  if (signedYear == null || signedYear === 0) return null
  return signedYear < 0
    ? -Math.ceil(Math.abs(signedYear) / 100)
    : Math.ceil(signedYear / 100)
}

function formatCenturyIdx(cIdx: number): string {
  return cIdx < 0 ? `기원전 ${Math.abs(cIdx)}세기` : `${cIdx}세기`
}

function stripPlainSnippet(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>~[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  return cleaned.length > 96 ? `${cleaned.slice(0, 96)}…` : cleaned
}

export function EventsTimelineSection({
  countryId,
  countryName,
  isHistoricalCountry = false,
  scopeCountryIds,
  initialFormFromSearchParams,
  focusCentury,
  onNavigateToForm,
}: EventsTimelineSectionProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  const [pageSize] = useState(50)
  const [isCreateOpen, setIsCreateOpen] = useState(
    Boolean(initialFormFromSearchParams),
  )
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const [eraScopeFilter, setEraScopeFilter] = useState<
    'all' | 'modern' | 'historical'
  >('all')
  const [polityFilterId, setPolityFilterId] = useState<string | null>(null)
  const [domainFilter, setDomainFilter] = useState<EventDomainKey | 'all'>('all')
  const [selectedCentury, setSelectedCentury] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [collapsedCenturies, setCollapsedCenturies] = useState<Set<string>>(
    new Set(),
  )
  const [ganttMultiYearOnly, setGanttMultiYearOnly] = useState(false)

  const rawViewParam = searchParams.get('view')
  const viewMode: EventViewMode =
    rawViewParam === 'calendar'
      ? 'calendar'
      : rawViewParam === 'gantt'
        ? 'gantt'
        : 'list'

  const setViewMode = (mode: EventViewMode) => {
    const nextParams = new URLSearchParams(searchParams)
    if (mode === 'list') {
      nextParams.delete('view')
    } else {
      nextParams.set('view', mode)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const { events, isLoading, loadMoreFailed, fetchMoreEvents } = useEvents({
    pageSize,
    countryId: countryId ?? undefined,
    autoLoadAll: true,
  })

  const scopeSet = useMemo(
    () => (scopeCountryIds?.length ? new Set(scopeCountryIds) : null),
    [scopeCountryIds],
  )
  const historicalBridgeIds = useMemo(() => {
    if (!countryId || !scopeCountryIds || scopeCountryIds.length <= 1) {
      return new Set<string>()
    }
    return new Set(scopeCountryIds.filter((itemId) => itemId !== countryId))
  }, [countryId, scopeCountryIds])
  const hasHistoricalBridge = historicalBridgeIds.size > 0

  const list = useMemo(() => {
    const all = events ?? []
    if (!scopeSet) return all
    return all.filter((evt) => {
      const modern = evt.relatedCountries
      const historical = evt.relatedHistoricalCountries
      return (
        (modern ?? []).some((item) => scopeSet.has(item.id)) ||
        (historical ?? []).some((item) => scopeSet.has(item.id))
      )
    })
  }, [events, scopeSet])

  // ── 3-Card Bento Infographic 집계 (전체 스코프 모수 기준) ──────────────────
  const bentoSummary = useMemo(() => {
    const centuries = new Set<number>()
    let minYear: number | null = null
    let maxYear: number | null = null
    let unknownYearCount = 0
    let dayKnownCount = 0
    let modernCount = 0
    let historicalCount = 0
    let multiYearCount = 0
    let collectionCount = 0

    const histPolityCounts = new Map<string, { id: string; name: string; count: number }>()
    const domainCounts = new Map<EventDomainKey, number>()
    const centuryBucketMap = new Map<number, CenturyDomainBucket>()

    for (const eventItem of list) {
      const signedStart = signedYearFromIsoLike(eventItem.startDate)
      const signedEnd = signedYearFromIsoLike(eventItem.endDate)
      const cIdx = toCenturyIndex(signedStart)

      const domKey: EventDomainKey = isEventDomainKey(eventItem.domain)
        ? eventItem.domain
        : 'OTHER'
      domainCounts.set(domKey, (domainCounts.get(domKey) ?? 0) + 1)

      if (cIdx == null) {
        unknownYearCount += 1
      } else {
        centuries.add(cIdx)
        if (minYear == null || signedStart! < minYear) minYear = signedStart!
        const effectiveEnd =
          signedEnd != null && signedEnd >= signedStart!
            ? signedEnd
            : signedStart!
        if (maxYear == null || effectiveEnd > maxYear) maxYear = effectiveEnd

        let bucket = centuryBucketMap.get(cIdx)
        if (!bucket) {
          bucket = { century: cIdx, total: 0, domains: {} }
          centuryBucketMap.set(cIdx, bucket)
        }
        bucket.total += 1
        bucket.domains[domKey] = (bucket.domains[domKey] ?? 0) + 1
      }

      if (
        signedStart != null &&
        signedEnd != null &&
        signedEnd > signedStart
      ) {
        multiYearCount += 1
      }
      if (eventItem.kind === 'COLLECTION') {
        collectionCount += 1
      }

      const rawStart = eventItem.startDate
      if (
        eventItem.id &&
        typeof rawStart === 'string' &&
        /^(-?\d{1,6}-\d{2}-\d{2})/.test(rawStart)
      ) {
        const withDayKnown = eventItem as { isDayKnown?: boolean }
        if (withDayKnown.isDayKnown !== false) {
          dayKnownCount += 1
        }
      }

      if (hasHistoricalBridge && countryId) {
        const modernList = eventItem.relatedCountries ?? []
        const historicalList = eventItem.relatedHistoricalCountries ?? []
        if (modernList.some((rel) => rel.id === countryId)) {
          modernCount += 1
        }
        let matchedHist = false
        for (const rel of historicalList) {
          if (historicalBridgeIds.has(rel.id)) {
            matchedHist = true
            const prev = histPolityCounts.get(rel.id)
            if (prev) prev.count += 1
            else histPolityCounts.set(rel.id, { id: rel.id, name: rel.name, count: 1 })
          }
        }
        if (!matchedHist && modernList.some((rel) => historicalBridgeIds.has(rel.id))) {
          matchedHist = true
        }
        if (matchedHist) {
          historicalCount += 1
        }
      }
    }

    const yearSpanValue =
      minYear != null && maxYear != null
        ? minYear === maxYear
          ? formatSignedYear(minYear)
          : `${formatSignedYear(minYear)} ~ ${formatSignedYear(maxYear)}`
        : '연도 미상'

    const palette = isDark
      ? ['#a5b4fc', '#fbbf24', '#38bdf8', '#34d399', '#c084fc', '#94a3b8']
      : ['#4f46e5', '#d97706', '#0284c7', '#059669', '#7c3aed', '#64748b']

    // Card 1 세그먼트: 브리지 존재 시 정치체 비중, 단일 국가 시 사건 형태 비중
    const scopeSlices: Array<SegmentSlice & { polityId: string | null }> = []
    if (hasHistoricalBridge) {
      if (modernCount > 0) {
        scopeSlices.push({
          key: '__modern__',
          polityId: '__modern__',
          label: `${countryName || '현대 국가'} (현대)`,
          value: modernCount,
          color: palette[0],
          meta: `${modernCount}건`,
        })
      }
      const sortedHist = [...histPolityCounts.values()].sort(
        (a, b) => b.count - a.count,
      )
      sortedHist.slice(0, 4).forEach((hp, idx) => {
        scopeSlices.push({
          key: hp.id,
          polityId: hp.id,
          label: hp.name,
          value: hp.count,
          color: palette[(idx + 1) % (palette.length - 1)],
          meta: `${hp.count}건`,
        })
      })
      const restCount = sortedHist
        .slice(4)
        .reduce((acc, item) => acc + item.count, 0)
      if (restCount > 0) {
        scopeSlices.push({
          key: 'other-hist',
          polityId: null,
          label: `기타 과거국가 (${sortedHist.length - 4}개국)`,
          value: restCount,
          color: palette[palette.length - 1],
          meta: `${restCount}건`,
        })
      }
    }

    const singleYearCount = Math.max(
      0,
      list.length - multiYearCount,
    )
    const structureSlices: SegmentSlice[] = [
      {
        key: 'collection',
        label: '묶음(전쟁·전역)',
        value: collectionCount,
        color: isDark ? '#f87171' : '#b91c1c',
        meta: `${collectionCount}건`,
      },
      {
        key: 'multiYear',
        label: '다년도 지속',
        value: Math.max(0, multiYearCount - collectionCount),
        color: isDark ? '#fbbf24' : '#d97706',
        meta: `${Math.max(0, multiYearCount - collectionCount)}건`,
      },
      {
        key: 'single',
        label: '단년·단일 사건',
        value: singleYearCount,
        color: isDark ? '#a5b4fc' : '#4f46e5',
        meta: `${singleYearCount}건`,
      },
    ].filter((s) => s.value > 0)

    const centuryDomainBuckets = [...centuryBucketMap.values()].sort(
      (a, b) => a.century - b.century,
    )

    const domainBreakdown = EVENT_DOMAIN_ORDER.filter(
      (dk) => (domainCounts.get(dk) ?? 0) > 0,
    )
      .map((dk) => ({
        domain: dk,
        label: domainLabel(dk),
        count: domainCounts.get(dk) ?? 0,
        color: domainAccent(dk, theme.mode),
      }))
      .sort((a, b) => b.count - a.count)

    const domainDonutSlices: SegmentSlice[] = domainBreakdown.map((d) => ({
      key: d.domain,
      label: d.label,
      value: d.count,
      color: d.color,
      meta: `${d.count}건`,
    }))

    return {
      totalCount: list.length,
      centuryCount: centuries.size,
      unknownYearCount,
      yearSpanValue,
      dayKnownCount,
      modernCount,
      historicalCount,
      multiYearCount,
      collectionCount,
      scopeSlices,
      structureSlices,
      centuryDomainBuckets,
      domainBreakdown,
      domainDonutSlices,
      histPolityMap: histPolityCounts,
    }
  }, [
    list,
    hasHistoricalBridge,
    countryId,
    countryName,
    historicalBridgeIds,
    isDark,
    theme.mode,
  ])

  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return list.filter((eventItem) => {
      const modernList = eventItem.relatedCountries ?? []
      const historicalList = eventItem.relatedHistoricalCountries ?? []
      const domKey: EventDomainKey = isEventDomainKey(eventItem.domain)
        ? eventItem.domain
        : 'OTHER'

      if (domainFilter !== 'all' && domKey !== domainFilter) {
        return false
      }

      if (selectedCentury != null) {
        const cIdx = toCenturyIndex(signedYearFromIsoLike(eventItem.startDate))
        if (cIdx !== selectedCentury) return false
      }

      if (polityFilterId && countryId) {
        if (polityFilterId === '__modern__') {
          if (!modernList.some((rel) => rel.id === countryId)) return false
        } else {
          if (!historicalList.some((rel) => rel.id === polityFilterId)) {
            return false
          }
        }
      } else if (hasHistoricalBridge && countryId && eraScopeFilter !== 'all') {
        if (eraScopeFilter === 'modern') {
          if (!modernList.some((rel) => rel.id === countryId)) return false
        } else if (eraScopeFilter === 'historical') {
          const matchesHistorical =
            historicalList.some((rel) => historicalBridgeIds.has(rel.id)) ||
            modernList.some((rel) => historicalBridgeIds.has(rel.id))
          if (!matchesHistorical) return false
        }
      }

      if (query) {
        const signedYear = signedYearFromIsoLike(eventItem.startDate)
        const yearText =
          signedYear == null ? '미상' : formatSignedYear(signedYear)
        const tLabel = eventTypeLabel(eventItem.type) ?? ''
        const dLabel = domainLabel(domKey)
        const haystack = [
          eventItem.title ?? '',
          dLabel,
          tLabel,
          eventItem.location ?? '',
          yearText,
          eventItem.startDate ?? '',
          ...modernList.map((rel) => rel.name),
          ...historicalList.map((rel) => rel.name),
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [
    list,
    domainFilter,
    selectedCentury,
    polityFilterId,
    hasHistoricalBridge,
    countryId,
    eraScopeFilter,
    historicalBridgeIds,
    searchQuery,
  ])

  const calendarEvents = useMemo<CalendarEventItem[]>(() => {
    const rows: CalendarEventItem[] = []
    for (const eventItem of filteredList) {
      const rawStart = eventItem.startDate
      if (!eventItem.id || typeof rawStart !== 'string') continue
      const matched = /^(-?\d{1,6}-\d{2}-\d{2})/.exec(rawStart)
      if (!matched) continue
      const withDayKnown = eventItem as { isDayKnown?: boolean }
      rows.push({
        id: eventItem.id,
        title: eventItem.title?.trim() || '제목 없음',
        date: matched[1],
        isDayKnown: withDayKnown.isDayKnown !== false,
      })
    }
    return rows
  }, [filteredList])

  const centuryGroups = useMemo(() => {
    type Entry = {
      event: (typeof filteredList)[number]
      domainKey: EventDomainKey
      domainText: string
      typeShortText: string | null
      signedYear: number | null
      durationYears: number | null
      yearLabel: string
      rangeLabel: string | null
      snippet: string | null
      modern: Array<{ id: string; name: string; flagEmoji?: string }>
      historical: Array<{ id: string; name: string }>
    }

    const entries: Entry[] = filteredList.map((event) => {
      const signedStart = signedYearFromIsoLike(event.startDate)
      const signedEnd = signedYearFromIsoLike(event.endDate)
      const durationYears =
        signedStart != null && signedEnd != null && signedEnd > signedStart
          ? signedEnd - signedStart - (signedStart < 0 && signedEnd > 0 ? 1 : 0) + 1
          : null
      const range = formatDateRange(event.startDate, event.endDate)
      const domKey: EventDomainKey = isEventDomainKey(event.domain)
        ? event.domain
        : 'OTHER'

      return {
        event,
        domainKey: domKey,
        domainText: domainLabel(domKey),
        typeShortText: eventTypeShort(event.type) ?? eventTypeLabel(event.type),
        signedYear: signedStart,
        durationYears,
        yearLabel: signedStart == null ? '미상' : formatSignedYear(signedStart),
        rangeLabel: event.endDate ? range : null,
        snippet: stripPlainSnippet(event.description),
        modern: event.relatedCountries ?? [],
        historical: event.relatedHistoricalCountries ?? [],
      }
    })

    const direction = order === 'asc' ? 1 : -1
    const buckets = new Map<
      string,
      {
        key: string
        label: string
        sortKey: number
        events: Entry[]
        topDomains: Array<{ domain: EventDomainKey; label: string; count: number }>
      }
    >()

    for (const entry of entries) {
      const key =
        entry.signedYear == null
          ? '__unknown__'
          : `c${Math.sign(entry.signedYear)}-${Math.floor((Math.abs(entry.signedYear) - 1) / 100) + 1}`
      const existing = buckets.get(key)
      if (existing) {
        existing.events.push(entry)
      } else {
        buckets.set(key, {
          key,
          label:
            entry.signedYear == null
              ? '연도 미상'
              : formatCenturyLabel(entry.signedYear),
          sortKey:
            entry.signedYear == null
              ? Number.POSITIVE_INFINITY
              : entry.signedYear,
          events: [entry],
          topDomains: [],
        })
      }
    }

    return Array.from(buckets.values())
      .sort((left, right) => {
        if (!Number.isFinite(left.sortKey)) return 1
        if (!Number.isFinite(right.sortKey)) return -1
        return (left.sortKey - right.sortKey) * direction
      })
      .map((group) => {
        const dMap = new Map<EventDomainKey, number>()
        for (const ev of group.events) {
          dMap.set(ev.domainKey, (dMap.get(ev.domainKey) ?? 0) + 1)
        }
        const topDomains = [...dMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([domain, count]) => ({
            domain,
            label: domainLabel(domain),
            count,
          }))

        return {
          ...group,
          topDomains,
          events: [...group.events].sort((left, right) => {
            if (left.signedYear == null && right.signedYear == null) return 0
            if (left.signedYear == null) return 1
            if (right.signedYear == null) return -1
            return (left.signedYear - right.signedYear) * direction
          }),
        }
      })
  }, [filteredList, order])

  // ── 기간 간트 (Event Span Timeline) 데이터 집계 ──────────────────────────
  const ganttData = useMemo(() => {
    if (viewMode !== 'gantt') return null
    const candidates: Array<{
      event: (typeof filteredList)[number]
      domainKey: EventDomainKey
      color: string
      typeLabelText: string
      startYear: number
      endYear: number
      isMultiYear: boolean
      durationYears: number
    }> = []
    let undatedCount = 0

    for (const ev of filteredList) {
      const sStart = signedYearFromIsoLike(ev.startDate)
      if (sStart == null || sStart === 0) {
        undatedCount += 1
        continue
      }
      const sEndRaw = signedYearFromIsoLike(ev.endDate)
      const sEnd =
        sEndRaw != null && sEndRaw >= sStart ? sEndRaw : sStart
      const isMultiYear = sEnd > sStart || ev.kind === 'COLLECTION'
      const durationYears =
        sEnd > sStart
          ? sEnd - sStart - (sStart < 0 && sEnd > 0 ? 1 : 0) + 1
          : 1
      const domKey: EventDomainKey = isEventDomainKey(ev.domain)
        ? ev.domain
        : 'OTHER'

      candidates.push({
        event: ev,
        domainKey: domKey,
        color: domainAccent(domKey, theme.mode),
        typeLabelText:
          eventTypeShort(ev.type) ?? domainLabel(domKey),
        startYear: sStart,
        endYear: Math.max(sStart + 1, sEnd),
        isMultiYear,
        durationYears,
      })
    }

    const multiYearItems = candidates.filter((c) => c.isMultiYear)
    const pool =
      ganttMultiYearOnly && multiYearItems.length > 0
        ? multiYearItems
        : candidates

    const dir = order === 'desc' ? -1 : 1
    pool.sort((a, b) => {
      if (a.startYear !== b.startYear) return (a.startYear - b.startYear) * dir
      return b.durationYears - a.durationYears
    })

    if (pool.length === 0) {
      return {
        rows: [],
        minYear: 0,
        maxYear: 1,
        ticks: [] as number[],
        undatedCount,
        multiYearTotal: multiYearItems.length,
        truncatedCount: 0,
      }
    }

    const rows = pool.slice(0, GANTT_MAX_ROWS)
    const truncatedCount = Math.max(0, pool.length - rows.length)
    const minYear = Math.min(...rows.map((r) => r.startYear))
    const maxYear = Math.max(...rows.map((r) => r.endYear), minYear + 5)
    const span = Math.max(5, maxYear - minYear)

    const ticks = Array.from({ length: 5 }, (_, idx) => {
      const raw = Math.round(minYear + (span * idx) / 4)
      return raw === 0 ? 1 : raw
    })

    return {
      rows,
      minYear,
      maxYear: minYear + span,
      ticks,
      undatedCount,
      multiYearTotal: multiYearItems.length,
      truncatedCount,
    }
  }, [viewMode, filteredList, ganttMultiYearOnly, order, theme.mode])

  // 대시보드 연표 막대에서 넘어온 세기로 자동 스크롤 + 하이라이트
  const [centuryFocused, setCenturyFocused] = useState(false)
  const focusKey = useMemo(() => {
    if (!focusCentury) return null
    const century = Number(focusCentury)
    if (!Number.isFinite(century) || century === 0) return null
    return `c${century > 0 ? 1 : -1}-${Math.abs(century)}`
  }, [focusCentury])

  const urlDomainParam = searchParams.get('domain')
  const urlCenturyParam = searchParams.get('century')

  useEffect(() => {
    if (urlDomainParam && isEventDomainKey(urlDomainParam)) {
      setDomainFilter(urlDomainParam)
    }
  }, [urlDomainParam])

  useEffect(() => {
    const rawC = urlCenturyParam ?? focusCentury
    if (!rawC) return
    const num = Number(rawC)
    if (Number.isFinite(num) && num !== 0) {
      setSelectedCentury(num)
    }
  }, [urlCenturyParam, focusCentury])

  useEffect(() => {
    setCenturyFocused(false)
  }, [focusKey])

  useEffect(() => {
    if (!focusKey) return
    const target = document.querySelector<HTMLElement>(
      `[data-century-key="${focusKey}"]`,
    )
    if (!target) return

    target.scrollIntoView({
      block: 'start',
      behavior: centuryFocused ? 'auto' : 'smooth',
    })
    if (centuryFocused) return

    setCenturyFocused(true)
    target.setAttribute('data-century-focus', 'true')
    const timer = window.setTimeout(
      () => target.removeAttribute('data-century-focus'),
      1600,
    )
    return () => window.clearTimeout(timer)
  }, [focusKey, centuryFocused, list.length])

  useEffect(() => {
    setIsCreateOpen(Boolean(initialFormFromSearchParams))
  }, [initialFormFromSearchParams])

  const closeCreate = () => {
    setIsCreateOpen(false)
    onNavigateToForm?.(false)
  }

  const openCreate = () => {
    setIsCreateOpen(true)
    onNavigateToForm?.(true)
  }

  const initialParticipantCountries = useMemo<
    EventCountryParticipant[] | undefined
  >(() => {
    if (!countryId) return undefined
    if (isHistoricalCountry) {
      return [{ historicalCountryId: countryId, role: 'PARTICIPANT' }]
    }
    return [{ countryId, role: 'PARTICIPANT' }]
  }, [countryId, isHistoricalCountry])

  const toggleCenturyCollapse = (key: string) => {
    setCollapsedCenturies((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isFiltered =
    eraScopeFilter !== 'all' ||
    polityFilterId != null ||
    domainFilter !== 'all' ||
    selectedCentury != null ||
    searchQuery.trim().length > 0

  const resetAllFilters = () => {
    setEraScopeFilter('all')
    setPolityFilterId(null)
    setDomainFilter('all')
    setSelectedCentury(null)
    setSearchQuery('')
  }

  const activePolityName = useMemo(() => {
    if (!polityFilterId) return null
    if (polityFilterId === '__modern__') {
      return `${countryName || '현대 국가'} (현대)`
    }
    return bentoSummary.histPolityMap.get(polityFilterId)?.name ?? null
  }, [polityFilterId, countryName, bentoSummary.histPolityMap])

  return (
    <Root
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* 제목은 위 탭('사건')이 맡는다 — 여기는 수치 한 줄과 할 일만 */}
      <SectionSubNav
        summary={
          <span>
            사건{' '}
            <SubNavFigure>{list.length.toLocaleString('ko-KR')}</SubNavFigure>건
          </span>
        }
        actions={
          <>
              <LedgerToolbarButton
                type="button"
                onClick={() => navigate(pathKeys.events.root())}
              >
                <span>사건 허브</span>
                <FiArrowUpRight size={13} />
              </LedgerToolbarButton>

              {/* 비어 있으면 등록은 빈 화면의 버튼 하나만 */}
              {isLoading || list.length === 0 ? null : (
                <LedgerPrimaryButton
                  type="button"
                  onClick={openCreate}
                  aria-label="새 사건 등록"
                >
                  <FiPlus size={14} />
                  <span>새 사건 등록</span>
                </LedgerPrimaryButton>
              )}
          </>
        }
      />

      <EventRegisterModal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        initialCountries={initialParticipantCountries}
        initialDomain={domainFilter !== 'all' ? domainFilter : null}
      />

      <EventInlineModal
        eventId={previewEventId}
        onClose={() => setPreviewEventId(null)}
        onNavigate={(targetEventId) => {
          setPreviewEventId(null)
          navigate(pathKeys.events.detail(targetEventId))
        }}
      />

      {/* 상단 3열 인터랙티브 Bento 인포그래픽 요약 */}
      {list.length > 0 && (
        <BentoGrid3Col aria-label="국가 사건 인포그래픽 요약">
          {/* Card 1: 사건 통사 범위 & 시대/형태 비중 */}
          <BentoCard>
            <BentoCardHeader>
              <BentoCardTitleGroup>
                <BentoCardTitle>
                  {hasHistoricalBridge
                    ? '통사 범위 · 정치체 비중'
                    : '통사 범위 · 사건 형태'}
                </BentoCardTitle>
                <BentoCardBadge>
                  {bentoSummary.centuryCount}개 세기
                </BentoCardBadge>
              </BentoCardTitleGroup>
              {polityFilterId && (
                <CardResetMiniBtn
                  type="button"
                  onClick={() => setPolityFilterId(null)}
                >
                  전체 정치체
                </CardResetMiniBtn>
              )}
            </BentoCardHeader>
            <BentoCardBody>
              <HeroMetricLine>
                <HeroBigNumber>
                  {bentoSummary.totalCount.toLocaleString('ko-KR')}
                  <span>건</span>
                </HeroBigNumber>
                <HeroSpanText>{bentoSummary.yearSpanValue}</HeroSpanText>
              </HeroMetricLine>

              {hasHistoricalBridge ? (
                <>
                  <StackedSegmentBar
                    slices={bentoSummary.scopeSlices}
                    height={10}
                    showPercent
                  />
                  <LegendChipsWrap>
                    {bentoSummary.scopeSlices.slice(0, 5).map((slice) => {
                      const active =
                        slice.polityId != null &&
                        polityFilterId === slice.polityId
                      return slice.polityId ? (
                        <LegendFilterBtn
                          key={slice.key}
                          type="button"
                          $active={active}
                          onClick={() => {
                            setEraScopeFilter('all')
                            setPolityFilterId((prev) =>
                              prev === slice.polityId ? null : slice.polityId,
                            )
                          }}
                          title={`${slice.label} 사건만 보기`}
                        >
                          <ColorDot $color={slice.color} />
                          <LegendName>{slice.label}</LegendName>
                          <LegendCount>{slice.meta}</LegendCount>
                        </LegendFilterBtn>
                      ) : (
                        <LegendStaticSpan key={slice.key}>
                          <ColorDot $color={slice.color} />
                          <LegendName>{slice.label}</LegendName>
                          <LegendCount>{slice.meta}</LegendCount>
                        </LegendStaticSpan>
                      )
                    })}
                  </LegendChipsWrap>
                </>
              ) : (
                <>
                  <StackedSegmentBar
                    slices={bentoSummary.structureSlices}
                    height={10}
                    showPercent
                  />
                  <LegendChipsWrap>
                    {bentoSummary.structureSlices.map((slice) => (
                      <LegendStaticSpan key={slice.key}>
                        <ColorDot $color={slice.color} />
                        <LegendName>{slice.label}</LegendName>
                        <LegendCount>{slice.meta}</LegendCount>
                      </LegendStaticSpan>
                    ))}
                  </LegendChipsWrap>
                  <SubHintLine>
                    일자 확인 {bentoSummary.dayKnownCount}건 (캘린더 표시)
                    {bentoSummary.unknownYearCount > 0
                      ? ` · 연도 미상 ${bentoSummary.unknownYearCount}건`
                      : ''}
                  </SubHintLine>
                </>
              )}
            </BentoCardBody>
          </BentoCard>

          {/* Card 2: 세기별 사건 분야 누적 리듬 */}
          <BentoCard>
            <BentoCardHeader>
              <BentoCardTitleGroup>
                <BentoCardTitle>세기별 사건 리듬</BentoCardTitle>
                <BentoCardBadge>
                  {selectedCentury != null
                    ? formatCenturyIdx(selectedCentury)
                    : `기록 ${bentoSummary.centuryDomainBuckets.length}개 세기`}
                </BentoCardBadge>
              </BentoCardTitleGroup>
              {selectedCentury != null && (
                <CardResetMiniBtn
                  type="button"
                  onClick={() => setSelectedCentury(null)}
                >
                  세기 필터 해제
                </CardResetMiniBtn>
              )}
            </BentoCardHeader>
            <BentoCardBody>
              {bentoSummary.centuryDomainBuckets.length > 0 ? (
                <>
                  <StackedCenturyDomainChart
                    buckets={bentoSummary.centuryDomainBuckets}
                    domainBreakdown={bentoSummary.domainBreakdown}
                    onSelectCentury={(cIdx) =>
                      setSelectedCentury((prev) =>
                        prev === cIdx ? null : cIdx,
                      )
                    }
                  />
                  <SubHintLine>
                    막대를 클릭하면 해당 세기 사건만 좁혀 봅니다 (다시 클릭 시 해제)
                  </SubHintLine>
                </>
              ) : (
                <SubHintLine>
                  시작 연도가 기재된 사건이 등록되면 세기별 분야 누적 차트가 표시됩니다.
                </SubHintLine>
              )}
            </BentoCardBody>
          </BentoCard>

          {/* Card 3: 9대 사건 분야 도넛 & 클릭 필터 */}
          <BentoCard>
            <BentoCardHeader>
              <BentoCardTitleGroup>
                <BentoCardTitle>사건 분야 구성</BentoCardTitle>
                <BentoCardBadge>
                  {bentoSummary.domainBreakdown.length}개 분야
                </BentoCardBadge>
              </BentoCardTitleGroup>
              {domainFilter !== 'all' && (
                <CardResetMiniBtn
                  type="button"
                  onClick={() => setDomainFilter('all')}
                >
                  전체 분야
                </CardResetMiniBtn>
              )}
            </BentoCardHeader>
            <BentoCardBody>
              <DomainDonutLayout>
                <MiniDonutRing
                  slices={bentoSummary.domainDonutSlices}
                  size={76}
                  strokeWidth={10}
                  centerValue={
                    domainFilter !== 'all'
                      ? String(
                          bentoSummary.domainBreakdown.find(
                            (d) => d.domain === domainFilter,
                          )?.count ?? 0,
                        )
                      : String(bentoSummary.totalCount)
                  }
                  centerLabel={
                    domainFilter !== 'all'
                      ? domainLabel(domainFilter)
                      : '전체 사건'
                  }
                />
                <DomainLegendList>
                  {bentoSummary.domainBreakdown.slice(0, 5).map((item) => {
                    const pct =
                      bentoSummary.totalCount > 0
                        ? Math.round(
                            (item.count / bentoSummary.totalCount) * 100,
                          )
                        : 0
                    const isSelected = domainFilter === item.domain
                    return (
                      <DomainLegendBtn
                        key={item.domain}
                        type="button"
                        $active={isSelected}
                        onClick={() =>
                          setDomainFilter((prev) =>
                            prev === item.domain ? 'all' : item.domain,
                          )
                        }
                        title={`${item.label} 사건만 필터링`}
                      >
                        <ColorDot $color={item.color} />
                        <DomainLegendName $active={isSelected}>
                          {item.label}
                        </DomainLegendName>
                        <DomainLegendCount>
                          {item.count}건 ({pct}%)
                        </DomainLegendCount>
                      </DomainLegendBtn>
                    )
                  })}
                </DomainLegendList>
              </DomainDonutLayout>
            </BentoCardBody>
          </BentoCard>
        </BentoGrid3Col>
      )}

      {/* 통합 필터 바 & 3모드 보기 전환 */}
      {list.length > 0 && (
        <FilterToolbar>
          <ScopeChipGroup role="tablist" aria-label="시대 및 사건 분야 필터">
            <ScopeFilterChip
              type="button"
              role="tab"
              aria-selected={
                eraScopeFilter === 'all' &&
                domainFilter === 'all' &&
                polityFilterId == null
              }
              $active={
                eraScopeFilter === 'all' &&
                domainFilter === 'all' &&
                polityFilterId == null
              }
              onClick={() => {
                setEraScopeFilter('all')
                setPolityFilterId(null)
                setDomainFilter('all')
              }}
            >
              전체 <ChipCount>{bentoSummary.totalCount}</ChipCount>
            </ScopeFilterChip>

            {hasHistoricalBridge && (
              <>
                <ScopeFilterChip
                  type="button"
                  role="tab"
                  aria-selected={eraScopeFilter === 'modern'}
                  $active={eraScopeFilter === 'modern'}
                  onClick={() => {
                    setPolityFilterId(null)
                    setEraScopeFilter((prev) =>
                      prev === 'modern' ? 'all' : 'modern',
                    )
                  }}
                >
                  현대 국가 <ChipCount>{bentoSummary.modernCount}</ChipCount>
                </ScopeFilterChip>
                <ScopeFilterChip
                  type="button"
                  role="tab"
                  aria-selected={eraScopeFilter === 'historical'}
                  $active={eraScopeFilter === 'historical'}
                  onClick={() => {
                    setPolityFilterId(null)
                    setEraScopeFilter((prev) =>
                      prev === 'historical' ? 'all' : 'historical',
                    )
                  }}
                >
                  과거 국가{' '}
                  <ChipCount>{bentoSummary.historicalCount}</ChipCount>
                </ScopeFilterChip>
                <ToolbarDivider aria-hidden />
              </>
            )}

            {bentoSummary.domainBreakdown.map((item) => {
              const active = domainFilter === item.domain
              return (
                <ScopeFilterChip
                  key={item.domain}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  $active={active}
                  onClick={() =>
                    setDomainFilter((prev) =>
                      prev === item.domain ? 'all' : item.domain,
                    )
                  }
                >
                  <ColorDot $color={item.color} />
                  <span>{item.label}</span>
                  <ChipCount>{item.count}</ChipCount>
                </ScopeFilterChip>
              )
            })}
          </ScopeChipGroup>

          <SearchControlsGroup>
            {activePolityName && (
              <ActiveFilterPill
                type="button"
                onClick={() => setPolityFilterId(null)}
              >
                <span>{activePolityName}</span>
                <FiX size={11} />
              </ActiveFilterPill>
            )}
            {selectedCentury != null && (
              <ActiveFilterPill
                type="button"
                onClick={() => setSelectedCentury(null)}
              >
                <span>{formatCenturyIdx(selectedCentury)}</span>
                <FiX size={11} />
              </ActiveFilterPill>
            )}
            {isFiltered && (
              <FilterStatusInline>
                <FilterResultMeta>
                  {filteredList.length.toLocaleString('ko-KR')}건
                </FilterResultMeta>
                <InlineResetTextBtn type="button" onClick={resetAllFilters}>
                  초기화
                </InlineResetTextBtn>
              </FilterStatusInline>
            )}

            <SearchInputWrap>
              <FiSearch size={13} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="사건명·분야·장소·연도·국가 검색…"
                aria-label="연대표 사건 검색"
              />
            </SearchInputWrap>

            {viewMode !== 'calendar' && (
              <LedgerViewSwitch role="group" aria-label="정렬 방향">
                <LedgerViewSwitchItem
                  type="button"
                  $active={order === 'asc'}
                  aria-pressed={order === 'asc'}
                  onClick={() => setOrder('asc')}
                >
                  오래된순
                </LedgerViewSwitchItem>
                <LedgerViewSwitchItem
                  type="button"
                  $active={order === 'desc'}
                  aria-pressed={order === 'desc'}
                  onClick={() => setOrder('desc')}
                >
                  최신순
                </LedgerViewSwitchItem>
              </LedgerViewSwitch>
            )}

            <LedgerViewSwitch role="group" aria-label="사건 보기 방식">
              <LedgerViewSwitchItem
                type="button"
                $active={viewMode === 'list'}
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                <FiList size={13} />
                <span>연표 원장</span>
              </LedgerViewSwitchItem>
              <LedgerViewSwitchItem
                type="button"
                $active={viewMode === 'gantt'}
                aria-pressed={viewMode === 'gantt'}
                onClick={() => setViewMode('gantt')}
              >
                <FiAlignLeft size={13} />
                <span>기간 간트</span>
              </LedgerViewSwitchItem>
              <LedgerViewSwitchItem
                type="button"
                $active={viewMode === 'calendar'}
                aria-pressed={viewMode === 'calendar'}
                onClick={() => setViewMode('calendar')}
              >
                <FiCalendar size={13} />
                <span>캘린더</span>
              </LedgerViewSwitchItem>
            </LedgerViewSwitch>
          </SearchControlsGroup>
        </FilterToolbar>
      )}

      <section aria-label="사건 연대표 본문">
        {isLoading && list.length === 0 ? (
          <ChartSkeleton variant="bars" rows={6} />
        ) : list.length === 0 ? (
          <CountryTabEmptyState
            Icon={FiCalendar}
            title="아직 이 국가의 사건이 없습니다"
            description="사건 등록 창을 열면 이 국가가 참여국으로 자동으로 채워집니다."
            actionLabel="새 사건 등록"
            onAction={openCreate}
            features={[
              { Icon: FiList, title: '세기별 통사 원장', description: '기원전부터 현대까지 세기로 묶고 분야 배지로 훑기' },
              { Icon: FiAlignLeft, title: '기간 막대', description: '전쟁·조약·개혁처럼 여러 해에 걸친 사건의 겹침 비교' },
              { Icon: FiPieChart, title: '분야 · 세기 분포', description: '정치·군사·외교 비중과 세기별 사건 수' },
            ]}
          />
        ) : filteredList.length === 0 ? (
          <EmptyFilterBox>
            <span>조건에 맞는 사건이 없습니다.</span>
            <InlineResetTextBtn type="button" onClick={resetAllFilters}>
              필터 초기화
            </InlineResetTextBtn>
          </EmptyFilterBox>
        ) : viewMode === 'calendar' ? (
          <CalendarCard>
            <EventCalendarPanel
              events={calendarEvents}
              onSelectEvent={(targetEventId) => setPreviewEventId(targetEventId)}
            />
          </CalendarCard>
        ) : viewMode === 'gantt' && ganttData ? (
          <GanttPanel aria-label="사건 기간 스팬 간트 차트">
            <GanttSubToolbar>
              <GanttHintText>
                시작~종료 연도 기준 시간축 비례 스팬 막대 · 행 클릭 시 빠른 미리보기
              </GanttHintText>
              {ganttData.multiYearTotal > 0 && (
                <ScopeFilterChip
                  type="button"
                  $active={ganttMultiYearOnly}
                  onClick={() => setGanttMultiYearOnly((prev) => !prev)}
                >
                  다년도·묶음 사건만 ({ganttData.multiYearTotal})
                </ScopeFilterChip>
              )}
            </GanttSubToolbar>

            {ganttData.rows.length === 0 ? (
              <EmptyFilterBox>
                <span>연도가 확인된 사건이 없어 기간 간트를 표시할 수 없습니다.</span>
                <InlineResetTextBtn
                  type="button"
                  onClick={() => setViewMode('list')}
                >
                  연표 원장으로 전환
                </InlineResetTextBtn>
              </EmptyFilterBox>
            ) : (
              <>
                <GanttAxisHead>
                  <span>사건 · 분야</span>
                  <GanttTicksRow>
                    {ganttData.ticks.map((tick, idx) => (
                      <span key={`${tick}-${idx}`}>
                        {formatSignedYear(tick)}
                      </span>
                    ))}
                  </GanttTicksRow>
                  <GanttDurationHead>연대 · 지속</GanttDurationHead>
                </GanttAxisHead>

                <GanttRowsList>
                  {ganttData.rows.map((row) => {
                    const totalSpan = Math.max(
                      1,
                      ganttData.maxYear - ganttData.minYear,
                    )
                    const leftPct = Math.max(
                      0,
                      Math.min(
                        98,
                        ((row.startYear - ganttData.minYear) / totalSpan) * 100,
                      ),
                    )
                    const widthPct = Math.max(
                      1.4,
                      Math.min(
                        100 - leftPct,
                        ((row.endYear - row.startYear) / totalSpan) * 100,
                      ),
                    )
                    return (
                      <GanttEventRow
                        key={row.event.id}
                        type="button"
                        onClick={() => setPreviewEventId(row.event.id)}
                      >
                        <GanttLeadCol>
                          <ColorDot $color={row.color} />
                          <GanttTypeTag $color={row.color}>
                            {row.typeLabelText}
                          </GanttTypeTag>
                          <GanttEventTitle title={row.event.title}>
                            {row.event.title || '제목 없음'}
                          </GanttEventTitle>
                        </GanttLeadCol>

                        <GanttTrackLane>
                          <GanttSpanFill
                            $color={row.color}
                            $multi={row.isMultiYear}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                          />
                        </GanttTrackLane>

                        <GanttRightMeta>
                          {formatSignedYear(row.startYear)}
                          {row.durationYears > 1
                            ? ` (${row.durationYears}년)`
                            : ''}
                        </GanttRightMeta>
                      </GanttEventRow>
                    )
                  })}
                </GanttRowsList>

                {(ganttData.truncatedCount > 0 ||
                  ganttData.undatedCount > 0) && (
                  <GanttFooterBar>
                    {ganttData.truncatedCount > 0 && (
                      <span>
                        상위 {GANTT_MAX_ROWS}건 표시 중 (외{' '}
                        {ganttData.truncatedCount}건은 세기·분야 필터로 좁혀 확인)
                      </span>
                    )}
                    {ganttData.undatedCount > 0 && (
                      <span>
                        연도 미상 {ganttData.undatedCount}건은 연표 원장 하단에 표시됩니다.
                      </span>
                    )}
                  </GanttFooterBar>
                )}
              </>
            )}
          </GanttPanel>
        ) : (
          <Chronology>
            {centuryGroups.map((group) => {
              const isCollapsed = collapsedCenturies.has(group.key)
              return (
                <CenturySection key={group.key} data-century-key={group.key}>
                  <CenturyHead>
                    <CenturyHeadBtn
                      type="button"
                      onClick={() => toggleCenturyCollapse(group.key)}
                      aria-expanded={!isCollapsed}
                    >
                      <CenturyCaret $collapsed={isCollapsed} aria-hidden>
                        <FiChevronDown size={14} />
                      </CenturyCaret>
                      <CenturyLabel>{group.label}</CenturyLabel>
                      <CenturyCount>{group.events.length}건</CenturyCount>
                    </CenturyHeadBtn>

                    <CenturyDomainSummary>
                      {group.topDomains.map((d) => (
                        <CenturyDomainMiniPill key={d.domain}>
                          <ColorDot
                            $color={domainAccent(d.domain, theme.mode)}
                          />
                          <span>{d.label}</span>
                          <strong>{d.count}</strong>
                        </CenturyDomainMiniPill>
                      ))}
                    </CenturyDomainSummary>
                  </CenturyHead>

                  {!isCollapsed &&
                    group.events.map((entry) => {
                      const dColor = domainAccent(entry.domainKey, theme.mode)
                      return (
                        <EventLedgerItem key={entry.event.id}>
                          <EventRowMainBtn
                            type="button"
                            onClick={() => setPreviewEventId(entry.event.id)}
                          >
                            <RowYearCol>
                              <RowYear>{entry.yearLabel}</RowYear>
                              {entry.durationYears != null &&
                                entry.durationYears > 1 && (
                                  <DurationMiniPill>
                                    {entry.durationYears}년 지속
                                  </DurationMiniPill>
                                )}
                            </RowYearCol>

                            <RowBody>
                              <RowHeadlineLine>
                                <DomainInlineBadge $color={dColor}>
                                  <ColorDot $color={dColor} />
                                  <span>
                                    {entry.typeShortText
                                      ? `${entry.domainText} · ${entry.typeShortText}`
                                      : entry.domainText}
                                  </span>
                                </DomainInlineBadge>

                                {entry.event.kind === 'COLLECTION' && (
                                  <CollectionTag>묶음 사건</CollectionTag>
                                )}

                                <RowTitle>
                                  {entry.event.title || '제목 없음'}
                                </RowTitle>
                              </RowHeadlineLine>

                              {(entry.rangeLabel ||
                                entry.event.location ||
                                entry.snippet) && (
                                <RowSubLine>
                                  {entry.rangeLabel && (
                                    <RowRange>{entry.rangeLabel}</RowRange>
                                  )}
                                  {entry.event.location && (
                                    <RowLocation>
                                      <FiMapPin size={10} />
                                      <span>{entry.event.location}</span>
                                    </RowLocation>
                                  )}
                                  {entry.snippet && (
                                    <RowSnippet>{entry.snippet}</RowSnippet>
                                  )}
                                </RowSubLine>
                              )}
                            </RowBody>

                            {(entry.historical.length > 0 ||
                              entry.modern.length > 0) && (
                              <CountryChipRow>
                                {entry.historical.slice(0, 3).map((item) => (
                                  <CountryChip key={`h-${item.id}`} $past>
                                    {item.name}
                                  </CountryChip>
                                ))}
                                {entry.modern.slice(0, 3).map((item) => (
                                  <CountryChip key={`m-${item.id}`}>
                                    {item.flagEmoji
                                      ? `${item.flagEmoji} `
                                      : ''}
                                    {item.name}
                                  </CountryChip>
                                ))}
                                {entry.historical.length + entry.modern.length >
                                  6 && (
                                  <CountryChip>
                                    +
                                    {entry.historical.length +
                                      entry.modern.length -
                                      6}
                                  </CountryChip>
                                )}
                              </CountryChipRow>
                            )}
                          </EventRowMainBtn>

                          <EventDetailNavBtn
                            type="button"
                            onClick={() =>
                              navigate(pathKeys.events.detail(entry.event.id))
                            }
                            title="사건 전용 상세 페이지로 이동"
                          >
                            상세 →
                          </EventDetailNavBtn>
                        </EventLedgerItem>
                      )
                    })}
                </CenturySection>
              )
            })}
          </Chronology>
        )}

        {loadMoreFailed && (
          <LoadMoreErrorBox>
            <span>일부 과거 사건 페이지를 불러오지 못했습니다.</span>
            <LedgerToolbarButton
              type="button"
              onClick={() => fetchMoreEvents()}
            >
              이어받기 다시 시도
            </LedgerToolbarButton>
          </LoadMoreErrorBox>
        )}
      </section>
    </Root>
  )
}

/* ── Styled Components (Event-Ledger Flat System) ─────────────────────────── */

const Root = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  ${countryTabCanvasPadding}
  position: relative;
  min-height: calc(100vh - 200px);
  box-sizing: border-box;
`

const CardResetMiniBtn = styled.button`
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

const HeroMetricLine = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 10px;
`

const HeroBigNumber = styled.strong`
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

const HeroSpanText = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const LegendChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
`

const LegendFilterBtn = styled.button<{ $active?: boolean }>`
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
  cursor: pointer;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const LegendStaticSpan = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 2px;
  font-size: 11.5px;
`

const ColorDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const LegendName = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
  max-width: 116px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LegendCount = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 700;
  ${DIGIT_DISPLAY}
`

const SubHintLine = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const DomainDonutLayout = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const DomainLegendList = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const DomainLegendBtn = styled.button<{ $active?: boolean }>`
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

const DomainLegendName = styled.span<{ $active?: boolean }>`
  flex: 1;
  min-width: 0;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DomainLegendCount = styled.span`
  flex-shrink: 0;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
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

const ScopeChipGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

const ScopeFilterChip = styled(LedgerFilterChip)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const ChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  opacity: 0.85;
  ${DIGIT_DISPLAY}
`

const ToolbarDivider = styled.span`
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const SearchControlsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ActiveFilterPill = styled.button`
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

const FilterStatusInline = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const FilterResultMeta = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const InlineResetTextBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const SearchInputWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  width: min(220px, 100%);

  &:focus-within {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  input {
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    font-family: inherit;
    font-size: 12px;
    outline: none;
    width: 100%;
  }
`

/* ── 연표 원장 (Chronology List) ─────────────────────────────────────────── */

const Chronology = styled.div`
  display: flex;
  flex-direction: column;
`

const CenturySection = styled.section`
  display: flex;
  flex-direction: column;
  scroll-margin-top: 12px;

  &[data-century-focus='true'] {
    animation: centuryArrive 1.6s ease-out;
  }

  @keyframes centuryArrive {
    0%,
    60% {
      background: rgba(79, 70, 229, 0.1);
      box-shadow: inset 3px 0 0 #4f46e5;
    }
    100% {
      background: transparent;
      box-shadow: inset 3px 0 0 transparent;
    }
  }
`

const CenturyHead = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 0 8px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const CenturyHeadBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
`

const CenturyCaret = styled.span<{ $collapsed: boolean }>`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.15s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
`

const CenturyLabel = styled.h3`
  margin: 0;
  font-size: 14.5px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CenturyCount = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const CenturyDomainSummary = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 680px) {
    display: none;
  }
`

const CenturyDomainMiniPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const EventLedgerItem = styled.div`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const EventRowMainBtn = styled.button`
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 10px 8px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 740px) {
    grid-template-columns: 64px minmax(0, 1fr);
  }
`

const RowYearCol = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`

const RowYear = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

const DurationMiniPill = styled.span`
  padding: 0 4px;
  border-radius: 3px;
  font-size: 9.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  ${DIGIT_DISPLAY}
`

const RowBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const RowHeadlineLine = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  min-width: 0;
`

const DomainInlineBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`

const CollectionTag = styled.span`
  padding: 1px 5px;
  border-radius: ${RADIUS.XS};
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.16)' : '#fef3c7'};
  white-space: nowrap;
`

const RowTitle = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RowSubLine = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowRange = styled.span`
  flex-shrink: 0;
  font-weight: 600;
  ${DIGIT_DISPLAY}
`

const RowLocation = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RowSnippet = styled.span`
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.85;
`

const CountryChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  max-width: 280px;

  @media (max-width: 740px) {
    display: none;
  }
`

const CountryChip = styled.span<{ $past?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme, $past }) =>
    $past
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#92400e'
      : theme.colors.text.secondary};
  background: ${({ theme, $past }) =>
    $past
      ? theme.mode === 'dark'
        ? 'rgba(245,158,11,0.14)'
        : '#fef3c7'
      : ledgerSubtleFill(theme.mode)};
`

const EventDetailNavBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: none;
  border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

/* ── 기간 간트 (Event Span Gantt View) ───────────────────────────────────── */

const GanttPanel = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
`

const GanttSubToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const GanttHintText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const GanttAxisHead = styled.div`
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 128px;
  align-items: center;
  gap: 12px;
  padding: 7px 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 780px) {
    grid-template-columns: 165px minmax(0, 1fr);
  }
`

const GanttTicksRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${DIGIT_DISPLAY}
`

const GanttDurationHead = styled.span`
  text-align: right;
  @media (max-width: 780px) {
    display: none;
  }
`

const GanttRowsList = styled.div`
  display: flex;
  flex-direction: column;
`

const GanttEventRow = styled.button`
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 128px;
  align-items: center;
  gap: 12px;
  padding: 7px 12px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 780px) {
    grid-template-columns: 165px minmax(0, 1fr);
  }
`

const GanttLeadCol = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const GanttTypeTag = styled.span<{ $color: string }>`
  padding: 0 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  flex-shrink: 0;
`

const GanttEventTitle = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const GanttTrackLane = styled.div`
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const GanttSpanFill = styled.div<{ $color: string; $multi: boolean }>`
  position: absolute;
  top: 2px;
  bottom: 2px;
  min-width: 6px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  opacity: ${({ $multi }) => ($multi ? 0.92 : 0.68)};
`

const GanttRightMeta = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}

  @media (max-width: 780px) {
    display: none;
  }
`

const GanttFooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const CalendarCard = styled.div`
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const EmptyFilterBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const EmptyCreateBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const LoadMoreErrorBox = styled.div`
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
