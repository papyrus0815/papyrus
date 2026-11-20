// src/pages/dashboard/dashboard.page.tsx
import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowUpRight,
  FiBookOpen,
  FiCalendar,
  FiCompass,
  FiFlag,
  FiGlobe,
  FiLayers,
  FiSearch,
  FiShield,
  FiUsers,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  domainAccent,
  domainLabel,
  EVENT_DOMAIN_ORDER,
  formatDomainPath,
  isEventDomainKey,
  type EventDomainKey,
} from '@/entities/event/model'
import { sessionQueryOptions } from '@/entities/session'
import { getAllCountries } from '@/shared/api/countries'
import { eventKeys } from '@/shared/api/event-query-keys'
import {
  EVENTS_LIMIT_ALL,
  getAllEvents,
  getEventsCount,
  getEventsOnThisDay,
  type EventResponseDto,
} from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { getInfographicPersons } from '@/shared/api/persons'
import { treatyApi } from '@/shared/api/treaty'
import { pathKeys } from '@/shared/router'
import { useCommandPaletteStore } from '@/widgets/command-palette'
import type { CenturyDomainBucket } from '@/widgets/country/country-detail/model/use-country-dashboard-stats'
import { StackedCenturyDomainChart } from '@/widgets/country/country-detail/ui/dashboard-infographic/bento-primitives'
import { useEventRegisterModalUrl } from '@/widgets/event-form/model/use-event-register-modal-url'
import { EventRegisterModal } from '@/widgets/event-form/ui/event-register-modal'

import * as S from './dashboard.styles'

type DeckTab = 'feed' | 'infographic' | 'volume' | 'all'

/** 사건 응답에서 부호 있는 연도 추출 (BC는 음수, AD는 양수) */
function extractSignedEventYear(event: EventResponseDto): number | null {
  const anyEv = event as {
    startYear?: number | null
    startEra?: string | null
    startDate?: string | null
  }
  if (typeof anyEv.startYear === 'number' && Number.isFinite(anyEv.startYear)) {
    const absY = Math.abs(Math.trunc(anyEv.startYear))
    if (absY === 0) return null
    return String(anyEv.startEra ?? 'AD').toUpperCase() === 'BC' ? -absY : absY
  }
  const raw = anyEv.startDate?.trim()
  if (!raw) return null
  const bcMatch = raw.match(/^-(\d{1,6})/)
  if (bcMatch) {
    const y = Number(bcMatch[1])
    return Number.isFinite(y) && y > 0 ? -y : null
  }
  const adMatch = raw.match(/^(\d{1,4})/)
  if (adMatch) {
    const y = Number(adMatch[1])
    return Number.isFinite(y) && y > 0 ? y : null
  }
  const parsed = new Date(raw).getUTCFullYear()
  if (Number.isNaN(parsed) || parsed === 0) return null
  return parsed
}

function signedYearToCentury(signedYear: number): number | null {
  if (!Number.isFinite(signedYear) || signedYear === 0) return null
  const c =
    signedYear < 0
      ? -(Math.floor((Math.abs(signedYear) - 1) / 100) + 1)
      : Math.floor((signedYear - 1) / 100) + 1
  return Math.abs(c) <= 21 ? c : null
}

function eraLabelFromEvent(event: EventResponseDto): string | null {
  const y = extractSignedEventYear(event)
  if (y == null) return null
  if (y < 0) return `기원전 ${Math.abs(y)}년`
  return `${y}년`
}

function stripHtmlSummary(raw?: string | null): string | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > 0 ? cleaned : null
}

/**
 * 시계 — 기존 홈 디자인의 핵심 중앙 디지털 시계.
 * 매초 갱신되는 영역을 분리해 차트·카드의 불필요한 리렌더를 차단한다.
 */
function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeString = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateString = now.toLocaleDateString('ko-KR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <S.ClockContainer>
      <S.Time>{timeString}</S.Time>
      <S.DateText>{dateString}</S.DateText>
    </S.ClockContainer>
  )
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M10 16.5l6-4.5-6-4.5v9z" />
  </svg>
)

/** 사건 카드 1개 — 기존 홈 EventCard 디자인틀 유지 + 분야 색상 바·HTML 요약 정제 */
function EventCardItem({ event }: { event: EventResponseDto }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const era = eraLabelFromEvent(event)
  const category = formatDomainPath(event.domain, event.type)
  const summary = stripHtmlSummary(event.description)
  const accent = domainAccent(event.domain, theme.mode)

  return (
    <S.EventCard
      type="button"
      $accentColor={accent}
      onClick={() => navigate(pathKeys.events.detail(event.id))}
    >
      <S.EventTitle>{event.title}</S.EventTitle>
      {(era || category) && (
        <S.CardMetaRow>
          {era && <span>{era}</span>}
          {era && category && <S.MetaDot />}
          {category && <span>{category}</span>}
        </S.CardMetaRow>
      )}
      {summary && <S.DescLine>{summary}</S.DescLine>}
      <S.CardFooter>
        <S.OpenChip>
          <PlayIcon />
          자세히 보기
        </S.OpenChip>
      </S.CardFooter>
    </S.EventCard>
  )
}

/** 9대 사건 분야 SVG 멀티 세그먼트 도넛 링 + 수평 비례 바 카드 */
function EventDomainInfographicCard({
  domainBreakdown,
  totalSampled,
  onSelectDomain,
  onOpenEvents,
}: {
  domainBreakdown: Array<{ domain: EventDomainKey; count: number }>
  totalSampled: number
  onSelectDomain: (domain: EventDomainKey) => void
  onOpenEvents: () => void
}) {
  const theme = useTheme()
  const [hoveredDomain, setHoveredDomain] = useState<EventDomainKey | null>(
    null,
  )
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const maxDomainCount = Math.max(1, ...domainBreakdown.map((d) => d.count))

  const donutArcs = useMemo(() => {
    if (totalSampled <= 0) return []
    let cumulative = 0
    return domainBreakdown
      .filter((d) => d.count > 0)
      .map((d) => {
        const fraction = d.count / totalSampled
        const dashLength = Math.max(0, fraction * circumference - 1.5)
        const dashOffset = -cumulative * circumference
        cumulative += fraction
        return {
          key: d.domain,
          count: d.count,
          sharePct: Math.round(fraction * 100),
          color: domainAccent(d.domain, theme.mode),
          dashArray: `${dashLength} ${Math.max(0, circumference - dashLength)}`,
          dashOffset,
        }
      })
  }, [domainBreakdown, totalSampled, circumference, theme.mode])

  const activeHoverItem = hoveredDomain
    ? (donutArcs.find((a) => a.key === hoveredDomain) ?? null)
    : null

  return (
    <S.SurfaceCard aria-label="사건 9대 분야 분포">
      <S.CardHeader>
        <S.CardTitleGroup>
          <S.CardTitle>9대 사건 분야 비중</S.CardTitle>
          <S.CardBadge>
            {domainBreakdown.filter((d) => d.count > 0).length}개 분야
          </S.CardBadge>
        </S.CardTitleGroup>
        <S.ViewAllButton type="button" onClick={onOpenEvents}>
          사건 총람
          <FiArrowUpRight size={12} aria-hidden />
        </S.ViewAllButton>
      </S.CardHeader>

      {totalSampled === 0 ? (
        <S.EmptyState>아직 집계할 사건 데이터가 없습니다.</S.EmptyState>
      ) : (
        <S.DomainInfographicBody>
          <S.DonutWrap>
            <svg width={100} height={100} viewBox="0 0 100 100" aria-hidden>
              <circle
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke={
                  theme.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(15,23,42,0.06)'
                }
                strokeWidth={10}
              />
              <g transform="rotate(-90 50 50)">
                {donutArcs.map((arc) => {
                  const isHovered = hoveredDomain === arc.key
                  const isDimmed =
                    Boolean(hoveredDomain) && hoveredDomain !== arc.key
                  return (
                    <circle
                      key={arc.key}
                      cx={50}
                      cy={50}
                      r={radius}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={isHovered ? 12.5 : 10}
                      strokeOpacity={isDimmed ? 0.35 : 1}
                      strokeDasharray={arc.dashArray}
                      strokeDashoffset={arc.dashOffset}
                      style={{ cursor: 'pointer', transition: 'all 0.14s ease' }}
                      onMouseEnter={() => setHoveredDomain(arc.key)}
                      onMouseLeave={() => setHoveredDomain(null)}
                      onClick={() => onSelectDomain(arc.key)}
                    />
                  )
                })}
              </g>
            </svg>
            <S.DonutCenter>
              {activeHoverItem ? (
                <>
                  <S.DonutTotalNum style={{ color: activeHoverItem.color }}>
                    {activeHoverItem.sharePct}%
                  </S.DonutTotalNum>
                  <S.DonutTotalLabel>
                    {domainLabel(activeHoverItem.key)} ·{' '}
                    {activeHoverItem.count.toLocaleString('ko-KR')}
                  </S.DonutTotalLabel>
                </>
              ) : (
                <>
                  <S.DonutTotalNum>
                    {totalSampled.toLocaleString('ko-KR')}
                  </S.DonutTotalNum>
                  <S.DonutTotalLabel>집계 사건</S.DonutTotalLabel>
                </>
              )}
            </S.DonutCenter>
          </S.DonutWrap>

          <S.DomainBarList>
            {domainBreakdown
              .filter((item) => item.count > 0)
              .map((item) => {
                const color = domainAccent(item.domain, theme.mode)
                const barPct = Math.max(
                  5,
                  Math.round((item.count / maxDomainCount) * 100),
                )
                const sharePct = Math.round((item.count / totalSampled) * 100)
                return (
                  <S.DomainBarRow
                    key={item.domain}
                    type="button"
                    $active={hoveredDomain === item.domain}
                    $dimmed={
                      Boolean(hoveredDomain) && hoveredDomain !== item.domain
                    }
                    onMouseEnter={() => setHoveredDomain(item.domain)}
                    onMouseLeave={() => setHoveredDomain(null)}
                    onClick={() => onSelectDomain(item.domain)}
                    title={`${domainLabel(item.domain)} 분야 사건 목록 열기`}
                  >
                    <S.DomainLabelCell>
                      <S.DomainSwatch $color={color} />
                      <span>{domainLabel(item.domain)}</span>
                    </S.DomainLabelCell>
                    <S.DomainTrack>
                      <S.DomainFill $pct={barPct} $color={color} />
                    </S.DomainTrack>
                    <S.DomainStatCell>
                      {item.count.toLocaleString('ko-KR')} ({sharePct}%)
                    </S.DomainStatCell>
                  </S.DomainBarRow>
                )
              })}
          </S.DomainBarList>
        </S.DomainInfographicBody>
      )}
    </S.SurfaceCard>
  )
}

export default function DashboardPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const openCommandPalette = useCommandPaletteStore((s) => s.openPalette)
  const { data: user } = useQuery(sessionQueryOptions)
  const displayName = user?.account ?? null

  const [deckTab, setDeckTab] = useState<DeckTab>('feed')
  const [eraAxisMode, setEraAxisMode] = useState<
    'events' | 'persons' | 'polities'
  >('events')

  const {
    isOpen: createEventOpen,
    open: openCreateEvent,
    close: closeCreateEvent,
    onDirtyChange: onCreateEventDirtyChange,
  } = useEventRegisterModalUrl()

  useEffect(() => {
    document.body.setAttribute('data-dashboard', 'true')
    const globalBg = document.getElementById('global-bg')
    if (globalBg) globalBg.style.display = 'none'

    return () => {
      document.body.removeAttribute('data-dashboard')
      const gb = document.getElementById('global-bg')
      if (gb) gb.style.display = ''
    }
  }, [])

  const today = useMemo(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, day: now.getDate() }
  }, [])

  // --- 경량·캐시 공유 아카이브 볼륨 & 큐레이션 쿼리 ---
  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: getAllCountries,
    staleTime: 5 * 60_000,
  })

  const { data: historicalCountries = [] } = useQuery({
    queryKey: ['historical-countries'],
    queryFn: getAllHistoricalCountries,
    staleTime: 5 * 60_000,
  })

  const { data: persons = [] } = useQuery({
    queryKey: ['persons', 'infographic'],
    queryFn: getInfographicPersons,
    staleTime: 5 * 60_000,
  })

  const { data: totalEventsCount } = useQuery({
    queryKey: ['dashboard-events-count'],
    queryFn: () => getEventsCount({ includeSubEvents: true }),
    staleTime: 3 * 60_000,
  })

  const { data: allSampledEvents = [], isLoading: isInfographicLoading } =
    useQuery({
      queryKey: ['dashboard-events-overview'],
      queryFn: () =>
        getAllEvents({ limit: EVENTS_LIMIT_ALL, includeSubEvents: true }),
      staleTime: 5 * 60_000,
    })

  const { data: militaryUnits = [] } = useQuery({
    queryKey: ['military-units', 'global-catalog'],
    queryFn: () => militaryUnitApi.getAll(),
    staleTime: 5 * 60_000,
  })

  const { data: treatyMeta } = useQuery({
    queryKey: ['treaties', 'dashboard-total'],
    queryFn: () => treatyApi.getAll({ take: 1 }),
    staleTime: 5 * 60_000,
  })

  const { data: onThisDayEvents = [] } = useQuery({
    queryKey: ['dashboard-on-this-day', today.month, today.day],
    queryFn: () =>
      getEventsOnThisDay({ month: today.month, day: today.day, limit: 2 }),
    staleTime: 30 * 60_000,
  })

  const {
    data: recentEvents = [],
    isLoading: isRecentLoading,
    isError: isRecentError,
  } = useQuery({
    queryKey: [...eventKeys.dashboardRecent(), 4],
    queryFn: () => getAllEvents({ limit: 4, createdSinceDays: 36500 }),
    staleTime: 60_000,
  })

  // --- 세기별 사건 밀도 & 9대 분야 인포그래픽 집계 ---
  const { centuryBuckets, domainBreakdown, sampledTotal } = useMemo(() => {
    const centuryMap = new Map<number, Record<string, number>>()
    const domainCounts: Record<EventDomainKey, number> = {
      POLITICS: 0,
      DIPLOMACY: 0,
      MILITARY: 0,
      ECONOMY: 0,
      SOCIETY: 0,
      CULTURE: 0,
      RELIGION: 0,
      SCIENCE: 0,
      OTHER: 0,
    }

    for (const ev of allSampledEvents) {
      const domKey: EventDomainKey = isEventDomainKey(ev.domain)
        ? ev.domain
        : 'OTHER'
      domainCounts[domKey] += 1

      const signedYear = extractSignedEventYear(ev)
      const century =
        signedYear != null ? signedYearToCentury(signedYear) : null
      if (century != null) {
        const bucket = centuryMap.get(century) ?? {}
        bucket[domKey] = (bucket[domKey] ?? 0) + 1
        centuryMap.set(century, bucket)
      }
    }

    const sortedBuckets: CenturyDomainBucket[] = Array.from(
      centuryMap.entries(),
    )
      .sort(([a], [b]) => a - b)
      .map(([century, domains]) => ({
        century,
        total: Object.values(domains).reduce((acc, v) => acc + v, 0),
        domains,
      }))

    const sortedDomains = EVENT_DOMAIN_ORDER.map((domain) => ({
      domain,
      count: domainCounts[domain],
    })).sort((a, b) => b.count - a.count)

    return {
      centuryBuckets: sortedBuckets,
      domainBreakdown: sortedDomains,
      sampledTotal: allSampledEvents.length,
    }
  }, [allSampledEvents])

  const personCenturyBuckets = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of persons) {
      const anyP = p as {
        birthYear?: number | null
        birthEra?: string | null
        floruitStartYear?: number | null
        floruitEra?: string | null
        birthDate?: string | null
      }
      let signed: number | null = null
      if (typeof anyP.birthYear === 'number' && Number.isFinite(anyP.birthYear)) {
        signed =
          String(anyP.birthEra ?? 'AD').toUpperCase() === 'BC'
            ? -Math.abs(anyP.birthYear)
            : Math.abs(anyP.birthYear)
      } else if (
        typeof anyP.floruitStartYear === 'number' &&
        Number.isFinite(anyP.floruitStartYear)
      ) {
        signed =
          String(anyP.floruitEra ?? 'AD').toUpperCase() === 'BC'
            ? -Math.abs(anyP.floruitStartYear)
            : Math.abs(anyP.floruitStartYear)
      } else if (anyP.birthDate) {
        const m = /^(-?\d{1,6})/.exec(anyP.birthDate.trim())
        if (m) signed = Number(m[1])
      }
      const c = signed != null ? signedYearToCentury(signed) : null
      if (c != null) map.set(c, (map.get(c) ?? 0) + 1)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([century, count]) => ({ century, count }))
  }, [persons])

  const polityCenturyBuckets = useMemo(() => {
    const map = new Map<number, number>()
    for (const hc of historicalCountries) {
      const sY =
        hc.startYear != null
          ? hc.startEra === 'BC'
            ? -Math.abs(hc.startYear)
            : Math.abs(hc.startYear)
          : null
      const eY =
        hc.endYear != null
          ? hc.endEra === 'BC'
            ? -Math.abs(hc.endYear)
            : Math.abs(hc.endYear)
          : sY
      if (sY == null) continue
      const cStart = signedYearToCentury(sY)
      const cEnd = eY != null ? signedYearToCentury(eY) : cStart
      if (cStart == null || cEnd == null) continue
      const lo = Math.max(-21, Math.min(cStart, cEnd))
      const hi = Math.min(21, Math.max(cStart, cEnd))
      for (let c = lo; c <= hi; c += 1) {
        if (c === 0) continue
        map.set(c, (map.get(c) ?? 0) + 1)
      }
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([century, count]) => ({ century, count }))
  }, [historicalCountries])

  const effectiveEventTotal = totalEventsCount ?? sampledTotal
  const treatyTotal = treatyMeta?.total ?? 0
  const totalCountriesCount = countries.length + historicalCountries.length

  const showFeed = deckTab === 'feed' || deckTab === 'all'
  const showInfographic = deckTab === 'infographic' || deckTab === 'all'
  const showVolume = deckTab === 'volume' || deckTab === 'all'

  // 기본 'feed' 단일 탭일 땐 기존처럼 최근 사건 2개(1줄)로 깔끔한 여백 유지, 전체 펼침 시 4개 노출
  const visibleRecentEvents =
    deckTab === 'all' ? recentEvents : recentEvents.slice(0, 2)

  return (
    <S.DashboardContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* 중앙 런처 영역 — 기존 홈의 환영 인사 · 디지털 시계 · 원형 도크 · 알약 액션 유지 */}
      <S.CentralContent>
        {displayName && (
          <S.Greeting>{displayName}님, 환영합니다</S.Greeting>
        )}

        <Clock />

        <S.SearchPillButton
          type="button"
          onClick={openCommandPalette}
          aria-label="통합 검색 팔레트 열기"
        >
          <S.SearchPillLead>
            <FiSearch size={14} aria-hidden />
            <span>국가 · 인물 · 사건 · 부대 · 조약 통합 검색…</span>
          </S.SearchPillLead>
          <S.SearchKbd>⌘K</S.SearchKbd>
        </S.SearchPillButton>

        <S.ButtonContainer>
          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="국가 아틀라스"
              aria-label="국가"
              onClick={() => navigate(pathKeys.country())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4zm-7.32 6c.24-1.02.7-1.96 1.33-2.77.43.29.92.77 1.49 1.37.73.78 1.63 1.4 2.5 1.4.71 0 1.48-.31 2.17-.62.52-.24 1.02-.46 1.49-.55.5-.1.98-.04 1.43.18.53.25 1.02.68 1.46 1.29.41.58.73 1.25.94 1.98H4.68zM12 20c-2.56 0-4.83-1.2-6.27-3.06.37-.54.83-1.05 1.3-1.36.58-.38 1.15-.5 1.69-.36.5.13.98.46 1.45.96.5.54 1.02.86 1.56.96.7.13 1.46-.07 2.25-.47.7-.36 1.3-.49 1.83-.39.64.12 1.28.58 1.92 1.32C16.49 19.23 14.35 20 12 20z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>국가</S.ButtonLabel>
            {totalCountriesCount > 0 && (
              <S.ButtonSubCount>
                {totalCountriesCount.toLocaleString('ko-KR')}
              </S.ButtonSubCount>
            )}
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="인물 연표 · 인포그래픽"
              aria-label="인물"
              onClick={() => navigate(pathKeys.personsTimeline())}
            >
              <FiUsers size={16} aria-hidden />
            </S.CircleButton>
            <S.ButtonLabel>인물</S.ButtonLabel>
            {persons.length > 0 && (
              <S.ButtonSubCount>
                {persons.length.toLocaleString('ko-KR')}
              </S.ButtonSubCount>
            )}
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              $primary
              title="새 사건"
              aria-label="새 사건 등록"
              onClick={openCreateEvent}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.24 4.56c-2.34-2.34-6.14-2.34-8.48 0L3 13.32V21h7.68l8.56-8.56c2.34-2.34 2.34-6.14 0-8.48zM9.1 19H5v-4.1l6.34-6.34 4.1 4.1L9.1 19zm8.49-8.49-1.41 1.41-4.1-4.1 1.41-1.41c1.56-1.56 4.09-1.56 5.66 0 1.56 1.57 1.56 4.1 0 5.66z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>새 사건</S.ButtonLabel>
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="왕조"
              aria-label="왕조"
              onClick={() => navigate(pathKeys.dynasty())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M5 16h14l1-8-4 3-3-5-3 5-4-3 1 8zm-1 2h16v2H4v-2z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>왕조</S.ButtonLabel>
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="역대 수장 비교"
              aria-label="역대 수장 비교"
              onClick={() => navigate(pathKeys.headsOfState())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.39 6.95H22l-6 4.36 2.3 7.04L12 16l-6.3 4.35L8 13.31 2 8.95h7.61L12 2z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>수장 비교</S.ButtonLabel>
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="집단 (세대·계파·사단)"
              aria-label="집단 (세대·계파·사단)"
              onClick={() => navigate(pathKeys.personGroups())}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM5 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 11c-1.6 0-3 .7-3.9 1.8l1.5 1.2c.5-.6 1.4-1 2.4-1s1.9.4 2.4 1l1.5-1.2C15 11.7 13.6 11 12 11z" />
              </svg>
            </S.CircleButton>
            <S.ButtonLabel>집단</S.ButtonLabel>
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="군사 편제 총람"
              aria-label="군사 편제"
              onClick={() => navigate(pathKeys.military())}
            >
              <FiShield size={16} aria-hidden />
            </S.CircleButton>
            <S.ButtonLabel>군사</S.ButtonLabel>
            {militaryUnits.length > 0 && (
              <S.ButtonSubCount>
                {militaryUnits.length.toLocaleString('ko-KR')}
              </S.ButtonSubCount>
            )}
          </S.ButtonWrapper>

          <S.ButtonWrapper>
            <S.CircleButton
              type="button"
              title="조약 카탈로그"
              aria-label="조약"
              onClick={() => navigate(pathKeys.treaties.list())}
            >
              <FiFlag size={16} aria-hidden />
            </S.CircleButton>
            <S.ButtonLabel>조약</S.ButtonLabel>
            {treatyTotal > 0 && (
              <S.ButtonSubCount>
                {treatyTotal.toLocaleString('ko-KR')}
              </S.ButtonSubCount>
            )}
          </S.ButtonWrapper>
        </S.ButtonContainer>

        <S.ActionPillRow>
          <S.TextButton
            type="button"
            onClick={() => navigate(pathKeys.events.root())}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12v-2H6V4h12v16l2-1V3.5A1.5 1.5 0 0 0 18.5 2H18z" />
            </svg>
            아카이브 열기
            {effectiveEventTotal > 0
              ? ` (${effectiveEventTotal.toLocaleString('ko-KR')})`
              : ''}
          </S.TextButton>

          <S.TextButton
            type="button"
            $subtle
            onClick={() => navigate(pathKeys.government.list())}
          >
            <FiLayers size={12} aria-hidden />
            정부·내각
          </S.TextButton>

          <S.TextButton
            type="button"
            $subtle
            onClick={() => navigate(pathKeys.headsOfStateAtlas())}
          >
            수장 아틀라스
          </S.TextButton>

          <S.TextButton
            type="button"
            $subtle
            onClick={() => navigate(pathKeys.companies.root())}
          >
            기업·상단
          </S.TextButton>

          <S.TextButton
            type="button"
            $subtle
            onClick={() => navigate(pathKeys.sources())}
          >
            <FiBookOpen size={12} aria-hidden />
            출처 서고
          </S.TextButton>
        </S.ActionPillRow>
      </S.CentralContent>

      {/* 하단 큐레이션 · 인포그래픽 덱 — 기존 BottomInner 틀 위에 탭으로 기능 통합 */}
      <S.BottomContainer
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.12 }}
      >
        <S.BottomInner>
          <S.DeckModeBar>
            <S.DeckTabGroup role="tablist" aria-label="홈 하단 보드 전환">
              <S.DeckTabBtn
                type="button"
                role="tab"
                aria-selected={deckTab === 'feed'}
                $active={deckTab === 'feed'}
                onClick={() => setDeckTab('feed')}
              >
                최근 · 오늘의 사건
              </S.DeckTabBtn>
              <S.DeckTabBtn
                type="button"
                role="tab"
                aria-selected={deckTab === 'infographic'}
                $active={deckTab === 'infographic'}
                onClick={() => setDeckTab('infographic')}
              >
                시대 · 분야 인포그래픽
              </S.DeckTabBtn>
              <S.DeckTabBtn
                type="button"
                role="tab"
                aria-selected={deckTab === 'volume'}
                $active={deckTab === 'volume'}
                onClick={() => setDeckTab('volume')}
              >
                수록 규모 총람
                <S.DeckTabCount>6</S.DeckTabCount>
              </S.DeckTabBtn>
            </S.DeckTabGroup>

            <S.ViewAllButton
              type="button"
              onClick={() =>
                setDeckTab((prev) => (prev === 'all' ? 'feed' : 'all'))
              }
            >
              {deckTab === 'all' ? '기본 보기로 접기' : '모두 펼쳐보기'}
            </S.ViewAllButton>
          </S.DeckModeBar>

          {/* 1) 기존 홈 주력 섹션: 역사 속 오늘 + 최근 사건 2열 카드 */}
          {showFeed && (
            <>
              {onThisDayEvents.length > 0 && (
                <S.Section>
                  <S.SectionHeader>
                    <S.SectionTitle>
                      역사 속 오늘 · {today.month}월 {today.day}일
                    </S.SectionTitle>
                  </S.SectionHeader>
                  <S.EventGrid>
                    {onThisDayEvents.map((ev) => (
                      <EventCardItem key={ev.id} event={ev} />
                    ))}
                  </S.EventGrid>
                </S.Section>
              )}

              <S.Section>
                <S.SectionHeader>
                  <S.SectionTitle>최근 사건</S.SectionTitle>
                  <S.ViewAllButton
                    type="button"
                    onClick={() => navigate(pathKeys.events.root())}
                  >
                    전체 보기
                  </S.ViewAllButton>
                </S.SectionHeader>

                <S.EventGrid>
                  {isRecentLoading ? (
                    <S.EmptyState>불러오는 중…</S.EmptyState>
                  ) : isRecentError ? (
                    <S.EmptyState>최근 사건을 불러오지 못했습니다.</S.EmptyState>
                  ) : visibleRecentEvents.length === 0 ? (
                    <S.EmptyState>아직 등록된 사건이 없습니다.</S.EmptyState>
                  ) : (
                    visibleRecentEvents.map((ev) => (
                      <EventCardItem key={ev.id} event={ev} />
                    ))
                  )}
                </S.EventGrid>
              </S.Section>
            </>
          )}

          {/* 2) 시대별 3축 밀도 & 9대 분야 도넛 인포그래픽 */}
          {showInfographic && (
            <S.InfographicGrid>
              <S.SurfaceCard aria-label="세기별 역사 아카이브 밀도 히스토그램">
                <S.CardHeader>
                  <S.CardTitleGroup>
                    <S.CardTitle>
                      {eraAxisMode === 'events'
                        ? '세기별 사건 밀도'
                        : eraAxisMode === 'persons'
                          ? '세기별 인물 밀도'
                          : '세기별 존속 정치체'}
                    </S.CardTitle>
                  </S.CardTitleGroup>

                  <S.EraModeSwitch
                    role="tablist"
                    aria-label="세기별 밀도 기준 전환"
                  >
                    <S.EraModeBtn
                      type="button"
                      $active={eraAxisMode === 'events'}
                      onClick={() => setEraAxisMode('events')}
                    >
                      사건 ({centuryBuckets.length})
                    </S.EraModeBtn>
                    <S.EraModeBtn
                      type="button"
                      $active={eraAxisMode === 'persons'}
                      onClick={() => setEraAxisMode('persons')}
                    >
                      인물 ({personCenturyBuckets.length})
                    </S.EraModeBtn>
                    <S.EraModeBtn
                      type="button"
                      $active={eraAxisMode === 'polities'}
                      onClick={() => setEraAxisMode('polities')}
                    >
                      정치체 ({polityCenturyBuckets.length})
                    </S.EraModeBtn>
                  </S.EraModeSwitch>
                </S.CardHeader>

                {eraAxisMode === 'events' ? (
                  isInfographicLoading ? (
                    <S.EmptyState>세기별 분포를 집계하는 중…</S.EmptyState>
                  ) : centuryBuckets.length === 0 ? (
                    <S.EmptyState>
                      연대가 입력된 사건 기록이 아직 없습니다.
                    </S.EmptyState>
                  ) : (
                    <StackedCenturyDomainChart
                      buckets={centuryBuckets}
                      domainBreakdown={domainBreakdown}
                      onSelectCentury={(century) =>
                        navigate(`${pathKeys.events.root()}?century=${century}`)
                      }
                    />
                  )
                ) : eraAxisMode === 'persons' ? (
                  personCenturyBuckets.length === 0 ? (
                    <S.EmptyState>
                      연대가 입력된 인물 기록이 아직 없습니다.
                    </S.EmptyState>
                  ) : (
                    <S.SimpleCenturyBarsRow>
                      {(() => {
                        const maxP = Math.max(
                          1,
                          ...personCenturyBuckets.map((b) => b.count),
                        )
                        return personCenturyBuckets.map((b) => (
                          <S.SimpleCenturyCol
                            key={b.century}
                            type="button"
                            onClick={() => navigate(pathKeys.personsTimeline())}
                            title={`${b.century < 0 ? `기원전 ${Math.abs(b.century)}세기` : `${b.century}세기`}: 인물 ${b.count}명`}
                          >
                            <S.SimpleCenturyCount>
                              {b.count}
                            </S.SimpleCenturyCount>
                            <S.SimpleCenturyTrack>
                              <S.SimpleCenturyFill
                                $color={
                                  theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'
                                }
                                style={{
                                  height: `${Math.max(8, Math.round((b.count / maxP) * 100))}%`,
                                }}
                              />
                            </S.SimpleCenturyTrack>
                            <S.SimpleCenturyLabel>
                              {b.century < 0
                                ? `BC${Math.abs(b.century)}`
                                : `${b.century}c`}
                            </S.SimpleCenturyLabel>
                          </S.SimpleCenturyCol>
                        ))
                      })()}
                    </S.SimpleCenturyBarsRow>
                  )
                ) : polityCenturyBuckets.length === 0 ? (
                  <S.EmptyState>
                    존속 연대가 입력된 역사 정치체가 없습니다.
                  </S.EmptyState>
                ) : (
                  <S.SimpleCenturyBarsRow>
                    {(() => {
                      const maxH = Math.max(
                        1,
                        ...polityCenturyBuckets.map((b) => b.count),
                      )
                      return polityCenturyBuckets.map((b) => (
                        <S.SimpleCenturyCol
                          key={b.century}
                          type="button"
                          onClick={() => navigate(pathKeys.country())}
                          title={`${b.century < 0 ? `기원전 ${Math.abs(b.century)}세기` : `${b.century}세기`}: 존속 정치체 ${b.count}개`}
                        >
                          <S.SimpleCenturyCount>{b.count}</S.SimpleCenturyCount>
                          <S.SimpleCenturyTrack>
                            <S.SimpleCenturyFill
                              $color={
                                theme.mode === 'dark' ? '#fcd34d' : '#d97706'
                              }
                              style={{
                                height: `${Math.max(8, Math.round((b.count / maxH) * 100))}%`,
                              }}
                            />
                          </S.SimpleCenturyTrack>
                          <S.SimpleCenturyLabel>
                            {b.century < 0
                              ? `BC${Math.abs(b.century)}`
                              : `${b.century}c`}
                          </S.SimpleCenturyLabel>
                        </S.SimpleCenturyCol>
                      ))
                    })()}
                  </S.SimpleCenturyBarsRow>
                )}
              </S.SurfaceCard>

              <EventDomainInfographicCard
                domainBreakdown={domainBreakdown}
                totalSampled={sampledTotal}
                onSelectDomain={(domainKey) =>
                  navigate(`${pathKeys.events.root()}?cat=${domainKey}`)
                }
                onOpenEvents={() => navigate(pathKeys.events.root())}
              />
            </S.InfographicGrid>
          )}

          {/* 3) 6대 도메인 아카이브 수록 규모 총람 */}
          {showVolume && (
            <S.VolumeGrid aria-label="도메인별 수록 규모">
              <S.VolumeCard
                type="button"
                onClick={() => navigate(pathKeys.country())}
              >
                <S.VolumeTop>
                  <span>현대 주권국</span>
                  <FiGlobe size={13} aria-hidden />
                </S.VolumeTop>
                <S.VolumeValue>
                  {countries.length.toLocaleString('ko-KR')}
                  <S.VolumeUnit>개국</S.VolumeUnit>
                </S.VolumeValue>
                <S.VolumeDesc>글로벌 아틀라스 · 국력 지표</S.VolumeDesc>
              </S.VolumeCard>

              <S.VolumeCard
                type="button"
                onClick={() => navigate(pathKeys.country())}
              >
                <S.VolumeTop>
                  <span>역사 정치체</span>
                  <FiCompass size={13} aria-hidden />
                </S.VolumeTop>
                <S.VolumeValue>
                  {historicalCountries.length.toLocaleString('ko-KR')}
                  <S.VolumeUnit>개국</S.VolumeUnit>
                </S.VolumeValue>
                <S.VolumeDesc>왕조 · 제국 · 고대~근현대 정권</S.VolumeDesc>
              </S.VolumeCard>

              <S.VolumeCard
                type="button"
                onClick={() => navigate(pathKeys.personsTimeline())}
              >
                <S.VolumeTop>
                  <span>등록 인물</span>
                  <FiUsers size={13} aria-hidden />
                </S.VolumeTop>
                <S.VolumeValue>
                  {persons.length.toLocaleString('ko-KR')}
                  <S.VolumeUnit>명</S.VolumeUnit>
                </S.VolumeValue>
                <S.VolumeDesc>생애 연표 · 가계도 · 관직 이력</S.VolumeDesc>
              </S.VolumeCard>

              <S.VolumeCard
                type="button"
                onClick={() => navigate(pathKeys.events.root())}
              >
                <S.VolumeTop>
                  <span>역사 사건</span>
                  <FiCalendar size={13} aria-hidden />
                </S.VolumeTop>
                <S.VolumeValue>
                  {effectiveEventTotal.toLocaleString('ko-KR')}
                  <S.VolumeUnit>건</S.VolumeUnit>
                </S.VolumeValue>
                <S.VolumeDesc>하위 국면·전투 포함 전체 기록</S.VolumeDesc>
              </S.VolumeCard>

              <S.VolumeCard
                type="button"
                onClick={() => navigate(pathKeys.military())}
              >
                <S.VolumeTop>
                  <span>군사 편제</span>
                  <FiShield size={13} aria-hidden />
                </S.VolumeTop>
                <S.VolumeValue>
                  {militaryUnits.length.toLocaleString('ko-KR')}
                  <S.VolumeUnit>개 부대</S.VolumeUnit>
                </S.VolumeValue>
                <S.VolumeDesc>지휘 계통 · 참전 ORBAT 카탈로그</S.VolumeDesc>
              </S.VolumeCard>

              <S.VolumeCard
                type="button"
                onClick={() => navigate(pathKeys.treaties.list())}
              >
                <S.VolumeTop>
                  <span>체결 조약</span>
                  <FiFlag size={13} aria-hidden />
                </S.VolumeTop>
                <S.VolumeValue>
                  {treatyTotal.toLocaleString('ko-KR')}
                  <S.VolumeUnit>건</S.VolumeUnit>
                </S.VolumeValue>
                <S.VolumeDesc>강화 · 동맹 · 국경 · 통상 협정</S.VolumeDesc>
              </S.VolumeCard>
            </S.VolumeGrid>
          )}
        </S.BottomInner>
      </S.BottomContainer>

      <EventRegisterModal
        isOpen={createEventOpen}
        onClose={closeCreateEvent}
        onDirtyChange={onCreateEventDirtyChange}
      />
    </S.DashboardContainer>
  )
}
