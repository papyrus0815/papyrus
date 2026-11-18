import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowUpRight,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiCompass,
  FiFlag,
  FiGlobe,
  FiLayers,
  FiPlus,
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

function formatEventYearBadge(event: EventResponseDto): string {
  const y = extractSignedEventYear(event)
  if (y == null) return '연대 미상'
  return y < 0 ? `BC ${Math.abs(y)}` : `${y}년`
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
 * 매초 갱신되는 시계 영역만 별도 컴포넌트로 분리해 차트·카드의 불필요한 리렌더를 차단한다.
 */
function LiveClockPill() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dateText = now.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  const timeText = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <S.ClockPill aria-label="현재 날짜 및 시각">
      <FiClock size={11} aria-hidden />
      <span>{dateText}</span>
      <span>·</span>
      <S.ClockTime>{timeText}</S.ClockTime>
    </S.ClockPill>
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
  const radius = 40
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
    <S.BentoCard aria-label="사건 9대 분야 분포">
      <S.CardHeader>
        <S.CardTitleGroup>
          <S.CardTitle>9대 사건 분야 비중</S.CardTitle>
          <S.CardBadge>
            {domainBreakdown.filter((d) => d.count > 0).length}개 분야
          </S.CardBadge>
        </S.CardTitleGroup>
        <S.CardLinkBtn type="button" onClick={onOpenEvents}>
          사건 총람
          <FiArrowUpRight size={12} aria-hidden />
        </S.CardLinkBtn>
      </S.CardHeader>

      {totalSampled === 0 ? (
        <S.EmptyBox>아직 집계할 사건 데이터가 없습니다.</S.EmptyBox>
      ) : (
        <S.DomainInfographicBody>
          <S.DonutWrap>
            <svg width={108} height={108} viewBox="0 0 108 108" aria-hidden>
              <circle
                cx={54}
                cy={54}
                r={radius}
                fill="none"
                stroke={
                  theme.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(15,23,42,0.06)'
                }
                strokeWidth={11}
              />
              <g transform="rotate(-90 54 54)">
                {donutArcs.map((arc) => {
                  const isHovered = hoveredDomain === arc.key
                  const isDimmed =
                    Boolean(hoveredDomain) && hoveredDomain !== arc.key
                  return (
                    <circle
                      key={arc.key}
                      cx={54}
                      cy={54}
                      r={radius}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={isHovered ? 13.5 : 11}
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
                      {item.count.toLocaleString('ko-KR')}
                      <S.DomainPctSub>({sharePct}%)</S.DomainPctSub>
                    </S.DomainStatCell>
                  </S.DomainBarRow>
                )
              })}
          </S.DomainBarList>
        </S.DomainInfographicBody>
      )}
    </S.BentoCard>
  )
}

export default function DashboardPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const openCommandPalette = useCommandPaletteStore((s) => s.openPalette)
  const { data: user } = useQuery(sessionQueryOptions)
  const displayName = user?.account ?? null

  const {
    isOpen: createEventOpen,
    open: openCreateEvent,
    close: closeCreateEvent,
    onDirtyChange: onCreateEventDirtyChange,
  } = useEventRegisterModalUrl()

  // 대시보드 진입 시 배경 3D/캔버스 요소만 숨겨 GPU 점유를 줄이고, 다크/라이트 테마는 그대로 유지한다.
  useEffect(() => {
    const globalBg = document.getElementById('global-bg')
    if (globalBg) globalBg.style.display = 'none'
    return () => {
      const gb = document.getElementById('global-bg')
      if (gb) gb.style.display = ''
    }
  }, [])

  const today = useMemo(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, day: now.getDate() }
  }, [])

  // --- 경량·캐시 공유 아카이브 볼륨 쿼리 ---
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

  const { data: onThisDayEvents = [], isLoading: isOnThisDayLoading } =
    useQuery({
      queryKey: ['dashboard-on-this-day', today.month, today.day],
      queryFn: () =>
        getEventsOnThisDay({ month: today.month, day: today.day, limit: 6 }),
      staleTime: 30 * 60_000,
    })

  const { data: recentEvents = [], isLoading: isRecentLoading } = useQuery({
    queryKey: [...eventKeys.dashboardRecent(), 6],
    queryFn: () => getAllEvents({ limit: 6, createdSinceDays: 36500 }),
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

  const [eraAxisMode, setEraAxisMode] = useState<
    'events' | 'persons' | 'polities'
  >('events')

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

  return (
    <S.DashboardViewport
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <S.DashboardInner>
        {/* 1. 상단 커맨드 헤더 */}
        <S.HeaderBar>
          <S.HeaderLead>
            <S.EyebrowRow>
              <S.EyebrowBadge>PAPYRUS ARCHIVE INFOGRAPHIC</S.EyebrowBadge>
              <LiveClockPill />
            </S.EyebrowRow>
            <S.GreetingTitle>
              {displayName
                ? `${displayName}님의 역사 아카이브 현황판`
                : '파피루스 역사 아카이브 현황판'}
            </S.GreetingTitle>
          </S.HeaderLead>

          <S.HeaderControls>
            <S.CommandSearchTrigger
              type="button"
              onClick={openCommandPalette}
              aria-label="통합 검색 팔레트 열기"
            >
              <S.SearchLead>
                <FiSearch size={14} aria-hidden />
                <span>국가 · 인물 · 사건 · 부대 · 조약 검색…</span>
              </S.SearchLead>
              <S.SearchShortcutKbd>⌘K</S.SearchShortcutKbd>
            </S.CommandSearchTrigger>

            <S.PrimaryActionBtn type="button" onClick={openCreateEvent}>
              <FiPlus size={14} aria-hidden />
              새 사건 기록
            </S.PrimaryActionBtn>
          </S.HeaderControls>
        </S.HeaderBar>

        {/* 2. 6-Cell 아카이브 총량 스트립 + 교차 도메인 허브 바로가기 */}
        <S.VolumeStripWrap aria-label="아카이브 도메인별 수록 규모">
          <S.VolumeGrid>
            <S.VolumeCell
              type="button"
              onClick={() => navigate(pathKeys.country())}
            >
              <S.VolumeTopRow>
                <span>현대 주권국</span>
                <FiGlobe size={13} aria-hidden />
              </S.VolumeTopRow>
              <S.VolumeNumber>
                {countries.length.toLocaleString('ko-KR')}
                <S.VolumeUnit>개국</S.VolumeUnit>
              </S.VolumeNumber>
              <S.VolumeSub>글로벌 아틀라스 · 국력 지표</S.VolumeSub>
            </S.VolumeCell>

            <S.VolumeCell
              type="button"
              onClick={() => navigate(pathKeys.country())}
            >
              <S.VolumeTopRow>
                <span>역사 정치체</span>
                <FiCompass size={13} aria-hidden />
              </S.VolumeTopRow>
              <S.VolumeNumber>
                {historicalCountries.length.toLocaleString('ko-KR')}
                <S.VolumeUnit>개국</S.VolumeUnit>
              </S.VolumeNumber>
              <S.VolumeSub>왕조 · 제국 · 고대~근현대 정권</S.VolumeSub>
            </S.VolumeCell>

            <S.VolumeCell
              type="button"
              onClick={() => navigate(pathKeys.personsTimeline())}
            >
              <S.VolumeTopRow>
                <span>등록 인물</span>
                <FiUsers size={13} aria-hidden />
              </S.VolumeTopRow>
              <S.VolumeNumber>
                {persons.length.toLocaleString('ko-KR')}
                <S.VolumeUnit>명</S.VolumeUnit>
              </S.VolumeNumber>
              <S.VolumeSub>생애 연표 · 가계도 · 관직 이력</S.VolumeSub>
            </S.VolumeCell>

            <S.VolumeCell
              type="button"
              onClick={() => navigate(pathKeys.events.root())}
            >
              <S.VolumeTopRow>
                <span>역사 사건</span>
                <FiCalendar size={13} aria-hidden />
              </S.VolumeTopRow>
              <S.VolumeNumber>
                {effectiveEventTotal.toLocaleString('ko-KR')}
                <S.VolumeUnit>건</S.VolumeUnit>
              </S.VolumeNumber>
              <S.VolumeSub>하위 국면·전투 포함 전체 기록</S.VolumeSub>
            </S.VolumeCell>

            <S.VolumeCell
              type="button"
              onClick={() => navigate(pathKeys.military())}
            >
              <S.VolumeTopRow>
                <span>군사 편제</span>
                <FiShield size={13} aria-hidden />
              </S.VolumeTopRow>
              <S.VolumeNumber>
                {militaryUnits.length.toLocaleString('ko-KR')}
                <S.VolumeUnit>개 부대</S.VolumeUnit>
              </S.VolumeNumber>
              <S.VolumeSub>지휘 계통 · 참전 ORBAT 카탈로그</S.VolumeSub>
            </S.VolumeCell>

            <S.VolumeCell
              type="button"
              onClick={() => navigate(pathKeys.treaties.list())}
            >
              <S.VolumeTopRow>
                <span>체결 조약</span>
                <FiFlag size={13} aria-hidden />
              </S.VolumeTopRow>
              <S.VolumeNumber>
                {treatyTotal.toLocaleString('ko-KR')}
                <S.VolumeUnit>건</S.VolumeUnit>
              </S.VolumeNumber>
              <S.VolumeSub>강화 · 동맹 · 국경 · 통상 협정</S.VolumeSub>
            </S.VolumeCell>
          </S.VolumeGrid>

          <S.QuickHubStrip aria-label="도메인 전문 뷰 바로가기">
            <S.QuickHubLabel>전문 뷰 바로가기</S.QuickHubLabel>
            <S.QuickHubPill
              type="button"
              onClick={() => navigate(pathKeys.government.list())}
            >
              <FiLayers size={12} aria-hidden />
              정부·내각 총람
            </S.QuickHubPill>
            <S.QuickHubPill
              type="button"
              onClick={() => navigate(pathKeys.headsOfState())}
            >
              역대 수장 비교 연표
            </S.QuickHubPill>
            <S.QuickHubPill
              type="button"
              onClick={() => navigate(pathKeys.headsOfStateAtlas())}
            >
              수장 지도 아틀라스
            </S.QuickHubPill>
            <S.QuickHubPill
              type="button"
              onClick={() => navigate(pathKeys.dynasty())}
            >
              왕조·가문
            </S.QuickHubPill>
            <S.QuickHubPill
              type="button"
              onClick={() => navigate(pathKeys.personGroups())}
            >
              인물 집단·계파
            </S.QuickHubPill>
            <S.QuickHubPill
              type="button"
              onClick={() => navigate(pathKeys.companies.root())}
            >
              기업·상단
            </S.QuickHubPill>
            <S.QuickHubPill
              type="button"
              onClick={() => navigate(pathKeys.sources())}
            >
              <FiBookOpen size={12} aria-hidden />
              출처 서고
            </S.QuickHubPill>
          </S.QuickHubStrip>
        </S.VolumeStripWrap>

        {/* 3. 2열 아카이브 인포그래픽 (세기별 3축 밀도 & 9대 분야 분포) */}
        <S.InfographicsGrid>
          <S.BentoCard aria-label="세기별 역사 아카이브 밀도 히스토그램">
            <S.CardHeader>
              <S.CardTitleGroup>
                <S.CardTitle>
                  {eraAxisMode === 'events'
                    ? '기원전 ~ 현대 세기별 사건 밀도'
                    : eraAxisMode === 'persons'
                      ? '기원전 ~ 현대 세기별 인물 밀도'
                      : '기원전 ~ 현대 세기별 존속 정치체'}
                </S.CardTitle>
              </S.CardTitleGroup>

              <S.EraModeSwitch role="tablist" aria-label="세기별 밀도 기준 전환">
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
            <S.CardCaption>
              {eraAxisMode === 'events'
                ? '막대를 클릭하면 해당 세기 사건 카탈로그로 즉시 필터링됩니다.'
                : eraAxisMode === 'persons'
                  ? '생몰·활동 연대 기준 세기별 수록 인물 분포입니다.'
                  : '존속 시작~종료 기간에 걸쳐 해당 세기에 실존했던 역사 정치체 수입니다.'}
            </S.CardCaption>

            {eraAxisMode === 'events' ? (
              isInfographicLoading ? (
                <S.EmptyBox>세기별 분포를 집계하는 중…</S.EmptyBox>
              ) : centuryBuckets.length === 0 ? (
                <S.EmptyBox>연대가 입력된 사건 기록이 아직 없습니다.</S.EmptyBox>
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
                <S.EmptyBox>연대가 입력된 인물 기록이 아직 없습니다.</S.EmptyBox>
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
                        <S.SimpleCenturyCount>{b.count}</S.SimpleCenturyCount>
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
                          {b.century < 0 ? `BC${Math.abs(b.century)}` : `${b.century}c`}
                        </S.SimpleCenturyLabel>
                      </S.SimpleCenturyCol>
                    ))
                  })()}
                </S.SimpleCenturyBarsRow>
              )
            ) : polityCenturyBuckets.length === 0 ? (
              <S.EmptyBox>존속 연대가 입력된 역사 정치체가 없습니다.</S.EmptyBox>
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
                        {b.century < 0 ? `BC${Math.abs(b.century)}` : `${b.century}c`}
                      </S.SimpleCenturyLabel>
                    </S.SimpleCenturyCol>
                  ))
                })()}
              </S.SimpleCenturyBarsRow>
            )}
          </S.BentoCard>

          <EventDomainInfographicCard
            domainBreakdown={domainBreakdown}
            totalSampled={sampledTotal}
            onSelectDomain={(domainKey) =>
              navigate(`${pathKeys.events.root()}?cat=${domainKey}`)
            }
            onOpenEvents={() => navigate(pathKeys.events.root())}
          />
        </S.InfographicsGrid>

        {/* 4. 2열 라이브 큐레이션 (역사 속 오늘 & 최근 기록된 사건) */}
        <S.FeedsGrid>
          <S.BentoCard aria-label={`역사 속 오늘 ${today.month}월 ${today.day}일`}>
            <S.CardHeader>
              <S.CardTitleGroup>
                <S.CardTitle>
                  역사 속 오늘 · {today.month}월 {today.day}일
                </S.CardTitle>
                {onThisDayEvents.length > 0 && (
                  <S.CardBadge>{onThisDayEvents.length}건</S.CardBadge>
                )}
              </S.CardTitleGroup>
              <S.CardLinkBtn type="button" onClick={openCreateEvent}>
                <FiPlus size={12} aria-hidden />
                사건 추가
              </S.CardLinkBtn>
            </S.CardHeader>

            {isOnThisDayLoading ? (
              <S.EmptyBox>오늘 날짜의 역사 기록을 찾는 중…</S.EmptyBox>
            ) : onThisDayEvents.length === 0 ? (
              <S.EmptyBox>
                <span>
                  {today.month}월 {today.day}일자로 기록된 역사 사건이 아직 없습니다.
                </span>
                <S.CardLinkBtn
                  type="button"
                  onClick={() => navigate(pathKeys.events.root())}
                >
                  사건 아카이브 둘러보기
                  <FiArrowUpRight size={12} aria-hidden />
                </S.CardLinkBtn>
              </S.EmptyBox>
            ) : (
              <S.SpineList>
                {onThisDayEvents.map((ev) => {
                  const color = domainAccent(ev.domain, theme.mode)
                  const summary = stripHtmlSummary(ev.description)
                  const categoryPath = formatDomainPath(ev.domain, ev.type)
                  return (
                    <S.FeedRowButton
                      key={ev.id}
                      type="button"
                      onClick={() => navigate(pathKeys.events.detail(ev.id))}
                    >
                      <S.FeedYearBadge>{formatEventYearBadge(ev)}</S.FeedYearBadge>
                      <S.FeedMainCol>
                        <S.FeedTitleLine>
                          <S.DomainSwatch $color={color} />
                          <S.FeedEventTitle>{ev.title}</S.FeedEventTitle>
                        </S.FeedTitleLine>
                        {summary ? <S.FeedSummary>{summary}</S.FeedSummary> : null}
                      </S.FeedMainCol>
                      {categoryPath ? (
                        <S.FeedCategoryTag $color={color}>
                          {categoryPath}
                        </S.FeedCategoryTag>
                      ) : (
                        <FiArrowUpRight size={13} aria-hidden />
                      )}
                    </S.FeedRowButton>
                  )
                })}
              </S.SpineList>
            )}
          </S.BentoCard>

          <S.BentoCard aria-label="최근 기록된 사건">
            <S.CardHeader>
              <S.CardTitleGroup>
                <S.CardTitle>최근 기록된 사건</S.CardTitle>
                {recentEvents.length > 0 && (
                  <S.CardBadge>최신 {recentEvents.length}건</S.CardBadge>
                )}
              </S.CardTitleGroup>
              <S.CardLinkBtn
                type="button"
                onClick={() => navigate(pathKeys.events.root())}
              >
                전체 보기
                <FiArrowUpRight size={12} aria-hidden />
              </S.CardLinkBtn>
            </S.CardHeader>

            {isRecentLoading ? (
              <S.EmptyBox>최근 사건을 불러오는 중…</S.EmptyBox>
            ) : recentEvents.length === 0 ? (
              <S.EmptyBox>
                <span>아직 등록된 사건이 없습니다.</span>
                <S.CardLinkBtn type="button" onClick={openCreateEvent}>
                  첫 사건 등록하기
                </S.CardLinkBtn>
              </S.EmptyBox>
            ) : (
              <S.SpineList>
                {recentEvents.map((ev) => {
                  const color = domainAccent(ev.domain, theme.mode)
                  const summary = stripHtmlSummary(ev.description)
                  const categoryPath = formatDomainPath(ev.domain, ev.type)
                  return (
                    <S.FeedRowButton
                      key={ev.id}
                      type="button"
                      onClick={() => navigate(pathKeys.events.detail(ev.id))}
                    >
                      <S.FeedYearBadge>{formatEventYearBadge(ev)}</S.FeedYearBadge>
                      <S.FeedMainCol>
                        <S.FeedTitleLine>
                          <S.DomainSwatch $color={color} />
                          <S.FeedEventTitle>{ev.title}</S.FeedEventTitle>
                        </S.FeedTitleLine>
                        {summary ? <S.FeedSummary>{summary}</S.FeedSummary> : null}
                      </S.FeedMainCol>
                      {categoryPath ? (
                        <S.FeedCategoryTag $color={color}>
                          {categoryPath}
                        </S.FeedCategoryTag>
                      ) : (
                        <FiArrowUpRight size={13} aria-hidden />
                      )}
                    </S.FeedRowButton>
                  )
                })}
              </S.SpineList>
            )}
          </S.BentoCard>
        </S.FeedsGrid>
      </S.DashboardInner>

      <EventRegisterModal
        isOpen={createEventOpen}
        onClose={closeCreateEvent}
        onDirtyChange={onCreateEventDirtyChange}
      />
    </S.DashboardViewport>
  )
}
