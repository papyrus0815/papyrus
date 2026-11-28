/* eslint-disable no-restricted-syntax, @typescript-eslint/no-explicit-any -- 레거시 대시보드 통계 훅 호환 */
import { useMemo } from 'react'

import { useQueries, useQuery } from '@tanstack/react-query'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { politicalSystemKeys } from '@/entities/political-system/api'
import {
  formatPeriod as formatPoliticalSystemPeriod,
  GOVERNMENT_FORM_LABEL,
  headOfGovernmentTitleOf,
  headOfStateTitleOf,
  resolveEffectivePowerHolderRole,
} from '@/entities/political-system/model/political-system'
import { eventKeys } from '@/shared/api/event-query-keys'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { cityApi } from '@/shared/api/city'
import { getAllCountries } from '@/shared/api/countries'
import { getElections, getLaws } from '@/shared/api/election'
import { ethnicityApi } from '@/shared/api/ethnicity'
import { getAllEventsExhaustive } from '@/shared/api/events'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { personApi } from '@/shared/api/person'
import { personCareerApi } from '@/shared/api/person-career'
import type { PersonResponseDto } from '@/shared/api/persons'
import { listPoliticalSystems } from '@/shared/api/political-system'
import { treatyApi } from '@/shared/api/treaty'
import { administrationDepartmentsByCountryQueryKey } from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export interface RecentPersonItem {
  id: string
  displayName: string
  createdAt: string
  profileImageUrl?: string | null
}

export type ActivityKind =
  | 'person'
  | 'event'
  | 'tenure'
  | 'political-system'
  | 'cabinet'
  | 'department'
  | 'election'
  | 'law'
  | 'treaty'
  | 'city'

export type ActivityCategory = 'person' | 'event' | 'governance' | 'archive'

/** 달력 한 칸에 찍히는 사건 */
export interface CalendarEventItem {
  id: string
  title: string
  /** 'YYYY-MM-DD' (BC는 앞에 '-') — 서버가 구조화 연도로 합성한 값도 섞여 있다 */
  date: string
  /**
   * 월·일까지 아는 사건인가. false면 서버가 채운 01-01이라 특정 날짜에 찍으면 거짓이다
   * — 달력 아래 '연도만 아는 사건'으로 따로 센다.
   */
  isDayKnown: boolean
}

export interface RecentActivityItem {
  id: string
  kind: ActivityKind
  category?: ActivityCategory
  refId: string
  /** 재임(tenure) 등 인물과 연결된 항목일 때 인물 미리보기 연동용 */
  personId?: string | null
  label: string
  /** 시대·생몰년·소속 국가·직함·기간 등 보조 맥락 한 줄 */
  subLabel?: string | null
  /** 활동 기준 시각 (updatedAt 우선, 없으면 createdAt) */
  createdAt: string
  /** 생성 이후 수정된 기록인지 여부 */
  isUpdated?: boolean
  profileImageUrl?: string | null
  startDate?: string | null
  endDate?: string | null
}

export interface CurrentHead {
  tenureId: string
  personId: string
  personName: string
  profileImageUrl?: string | null
  positionTitle: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT' | string
  startDate: string
  /** 현행 헌정 체제의 실권 보유 수반인지 여부 */
  isPowerHolder?: boolean
}

/** 비어 있는 축을 채우러 갈 곳 — 대시보드 위젯이 탭 이동으로 해석한다 */
export type CompletenessTarget =
  | 'government'
  | 'persons'
  | 'events'
  | 'elections'
  | 'laws'
  | 'ethnicity'
  | 'historical'
  | 'regions'
  | 'treaty'

export interface CompletenessField {
  key: string
  label: string
  filled: boolean
  target: CompletenessTarget
  /** target === 'government'일 때 행정조직 내부 하위 탭 딥링크 */
  governmentSubTab?: 'cabinets' | 'ministries' | 'system' | 'military'
}

export interface DeltaCounts {
  person: number
  event: number
  administration: number
  city: number
}

export interface ContinentComparison {
  /** 같은 대륙의 표본 수 (자국 제외) */
  sampleSize: number
  /** 인구 평균 대비 % 차 (양수=많음). null이면 비교 불가 */
  populationDeltaPct: number | null
  /** 면적 평균 대비 % 차. null이면 비교 불가 */
  areaDeltaPct: number | null
  /** 인구 순위 (해당 지표 등록 국가 중 i위, 1부터). null이면 비교 불가 */
  populationRank: number | null
  /** 면적 순위. null이면 비교 불가 */
  areaRank: number | null
  /** 표본 총 수 (자국 포함, 대륙 전체) */
  totalCount: number
  /** 인구 순위 분모 (인구 등록된 국가 수). 비교 불가 시 null. */
  populationRankTotal: number | null
  /** 면적 순위 분모 (면적 등록된 국가 수). 비교 불가 시 null. */
  areaRankTotal: number | null
}

export interface CurrentCabinetSummary {
  cabinetId: string
  name: string
  /** Head tenure 시작일 — 정부 시작 */
  startDate: string | null
  /** 각료 수 (cabinet에 속한 tenure 카운트) */
  ministerCount: number
  /** 각료 정당 분포 (membership 기반) — top N */
  partyDistribution: Array<{
    partyId: string | null
    partyName: string
    count: number
    color?: string | null
  }>
  /** 내각 공식 지지 정당 연결 (`CabinetPoliticalParty` — 집권여당·연정·신임보완) */
  cabinetParties?: Array<{
    partyId: string
    partyName: string
    role: string
    color?: string | null
  }>
}

export interface ElectionSummary {
  id: string
  name: string
  electionType: string
  pollDate: string
}

export interface CenturyDomainBucket {
  century: number
  total: number
  domains: Record<string, number>
}

export interface WarOutcomeSummary {
  totalMilitaryEvents: number
  wars: number
  battles: number
  victories: number
  defeats: number
  draws: number
}

export interface MilitaryBranchSummary {
  branch: string
  count: number
}

export interface ExecutiveTimelineItem {
  recordId: string
  personId: string | null
  personName: string
  profileImageUrl: string | null
  title: string | null
  axis: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  ordinal: number | null
  startYear: number
  endYear: number | null
  partyName?: string | null
  partyColor?: string | null
  isHistoricalPolity?: boolean
}

export interface PersonSpotlightItem {
  id: string
  name: string
  subLabel: string | null
  profileImageUrl: string | null
  polityName: string | null
  roleKind: 'ruler' | 'minister' | 'figure'
}

export interface PersonSpotlightSummary {
  featured: PersonSpotlightItem[]
  roleCounts: { rulers: number; ministers: number; figures: number }
  eraSlices: Array<{ key: string; label: string; count: number }>
}

export interface MilestoneEventItem {
  id: string
  title: string
  yearLabel: string
  signedYear: number
  domain: string
  polityName: string | null
  eventTypeLabel?: string | null
}

export function resolveEventTurningLabel(
  evTypeRaw: string,
  domainRaw: string,
): string {
  const evType = evTypeRaw.toUpperCase()
  const dom = domainRaw.toUpperCase()
  if (evType === 'INDEPENDENCE' || evType === 'FOUNDING') return '건국 · 독립'
  if (evType === 'REVOLUTION' || evType === 'COUP' || evType === 'UPRISING') {
    return '혁명 · 정변'
  }
  if (evType === 'REFORM' || evType === 'CONSTITUTION') return '헌정 · 개혁'
  if (evType === 'WAR') return '전쟁 · 안보'
  if (evType === 'BATTLE' || evType === 'CAMPAIGN' || evType === 'SIEGE') {
    return '주요 전투'
  }
  if (evType === 'TREATY' || evType === 'SUMMIT') return '조약 · 회담'
  if (dom === 'POLITICS') return '정치 전환점'
  if (dom === 'DIPLOMACY') return '외교 분수령'
  if (dom === 'MILITARY') return '군사 분수령'
  if (dom === 'ECONOMY') return '경제 전환점'
  if (dom === 'SOCIETY') return '사회 분수령'
  if (dom === 'SCIENCE') return '과학 · 기술'
  if (dom === 'CULTURE') return '문화 · 유산'
  return '역사 이정표'
}

export interface RegimeEraBand {
  id: string
  label: string
  governmentFormLabel: string | null
  startYear: number
  endYear: number | null
}

export interface PeerCountryMetric {
  id: string
  name: string
  flagEmoji: string | null
  continentId: string | null
  population: number | null
  areaSqKm: number | null
}

export interface CivicInstitutionalSnapshot {
  turnoutSparkPoints: Array<{ year: number; value: number }>
  avgTurnout: number | null
  electionTypeCounts: Array<{ type: string; count: number }>
  latestLegislativeElectionId: string | null
  /** 하원(또는 단원) 최신 총선 ID 묶음 — 병립형(지역구+비례)일 때 함께 담김 */
  latestLegislativeElectionIds?: string[]
  /** 양원제일 때 상원 최신 선거 ID 묶음 */
  latestUpperElectionIds?: string[]
  regimeEras: RegimeEraBand[]
  recentTreaties: Array<{
    id: string
    name: string
    type: string
    yearLabel: string | null
  }>
  recentLaws: Array<{ id: string; title: string; yearLabel: string | null }>
  ethnicGroups: Array<{ id: string; name: string; nameLocal: string | null }>
  activePolitySeats: {
    name: string | null
    lowerName: string | null
    lowerSeats: number | null
    upperName: string | null
    upperSeats: number | null
    governmentForm: string | null
    stateStructure: string | null
    legislatureType: string | null
    partySystem: string | null
    constitutionLaw?: { id: string; name: string } | null
    foundingEvent?: { id: string; title: string } | null
  } | null
}

export interface CountryDashboardStats {
  personCount: number
  militaryCount: number
  highCommandCount: number
  militaryBranchBreakdown: MilitaryBranchSummary[]
  eventDomainBreakdown: Array<{ domain: string; count: number }>
  eventCenturyDomainCounts: CenturyDomainBucket[]
  warSummary: WarOutcomeSummary
  executiveTimeline: ExecutiveTimelineItem[]
  personSpotlight: PersonSpotlightSummary
  milestoneEvents: MilestoneEventItem[]
  civicSnapshot: CivicInstitutionalSnapshot
  peerCountries: PeerCountryMetric[]
  eventCount: number
  historicalCountryCount: number
  administrationCount: number
  cityCount: number
  treatyCount: number
  electionCount: number
  modernElectionCount: number
  historicalElectionCount: number
  historicalHeadCount: number
  lawCount: number
  ethnicityCount: number
  /** 최근 7일 새로 등록된 카운트 — delta 칩용 */
  deltaCounts: DeltaCounts
  recentPersons: RecentPersonItem[]
  recentActivity: RecentActivityItem[]
  currentHeads: CurrentHead[]
  completeness: {
    filled: number
    total: number
    missing: CompletenessField[]
  }
  /**
   * 세기별 사건 수 — 오래된 순. `century`는 부호 세기(20 = 20세기, -1 = 기원전 1세기).
   * 사건이 있는 세기만 담는다(빈 세기는 화면에서 '건너뜀' 표지로 그린다).
   */
  eventCenturyCounts: Array<{ century: number; count: number }>
  /** 달력용 사건 — 날짜(YYYY-MM-DD)와 '일자를 아는가'만 남긴 경량 목록 */
  calendarEvents: CalendarEventItem[]
  /** 같은 대륙 평균/순위 비교 */
  continentComparison: ContinentComparison
  /** 가장 최신 cabinet 1건 요약 (수반 재임 끝나지 않은 것 우선) */
  currentCabinet: CurrentCabinetSummary | null
  /** 가장 가까운 미래 선거 (없으면 null) */
  nextElection: ElectionSummary | null
  /** 가장 최근 종료된 선거 */
  recentElection: ElectionSummary | null
  /** 마지막 활동 시각 (recentActivity 첫 번째) */
  lastUpdatedAt: string | null
  /** 모든 쿼리 OR — 호환용 */
  isLoading: boolean
  /** 패널별 로딩 — UI에서 부분 로딩 표시용 */
  loading: {
    persons: boolean
    military: boolean
    events: boolean
    administration: boolean
    cities: boolean
    tenures: boolean
    activity: boolean
    cabinets: boolean
    elections: boolean
    laws: boolean
    ethnicity: boolean
    treaties: boolean
    continent: boolean
  }
}

const HEAD_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/** 최근 활동 피드에 올릴 최대 줄 수 */
const ACTIVITY_FEED_LIMIT = 16
/** 그 중 한 종류(도메인 묶음)가 먼저 차지할 수 있는 기본 몫 */
const ACTIVITY_KIND_QUOTA = 4

const byCreatedAtDesc = (a: RecentActivityItem, b: RecentActivityItem) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

/**
 * 레코드의 생성·수정 시각 중 최신 활동 시각을 추출하고 수정 여부를 판별한다.
 * 생성 직후(60초 이내) 자동 후처리된 updatedAt은 신규 등록으로 간주한다.
 */
export function resolveActivityTimestamp(rec: any): {
  activityAt: string
  isUpdated: boolean
} {
  const created = String(rec?.createdAt ?? rec?.created_at ?? '').trim()
  const updated = String(rec?.updatedAt ?? rec?.updated_at ?? '').trim()
  const cTime = created ? new Date(created).getTime() : NaN
  const uTime = updated ? new Date(updated).getTime() : NaN
  if (Number.isFinite(uTime) && Number.isFinite(cTime) && uTime - cTime > 60_000) {
    return { activityAt: updated, isUpdated: true }
  }
  if (Number.isFinite(cTime)) {
    return { activityAt: created, isUpdated: false }
  }
  if (Number.isFinite(uTime)) {
    return { activityAt: updated, isUpdated: false }
  }
  return { activityAt: '', isUpdated: false }
}

export function formatActivityYearFromIso(
  isoOrDate?: string | null,
  era?: string | null,
  yearNum?: number | null,
): string | null {
  if (yearNum != null && Number.isFinite(Number(yearNum)) && Number(yearNum) !== 0) {
    const absY = Math.abs(Number(yearNum))
    const isBc = era === 'BC' || Number(yearNum) < 0
    return isBc ? `BC ${absY}년` : `${absY}년`
  }
  if (typeof isoOrDate !== 'string' || !isoOrDate.trim()) return null
  const matched = /^(-?)(\d{1,6})(?:-(\d{2})-(\d{2}))?/.exec(isoOrDate.trim())
  if (!matched) return null
  const y = Number(matched[2])
  if (!Number.isFinite(y) || y === 0) return null
  const isBc = matched[1] === '-' || era === 'BC'
  return isBc ? `BC ${y}년` : `${y}년`
}

export function formatPersonSubLabel(
  person: any,
  fallbackPolityName?: string | null,
  currentCountryName?: string | null,
): string | null {
  const parts: string[] = []
  const honorific =
    person?.regnalName?.trim() ||
    person?.job?.name?.trim() ||
    person?.dynasty?.name?.trim() ||
    null
  if (honorific && honorific !== person?.name?.trim()) {
    parts.push(honorific)
  }

  const bYear = formatActivityYearFromIso(
    person?.birthDate,
    person?.birthEra,
    person?.birthYear,
  )
  const dYear = person?.isAlive
    ? '현재'
    : formatActivityYearFromIso(
        person?.deathDate,
        person?.deathEra,
        person?.deathYear,
      )
  if (bYear && dYear) {
    parts.push(`${bYear.replace(/년$/, '')}–${dYear}`)
  } else if (bYear) {
    parts.push(`${bYear}생`)
  } else if (dYear && dYear !== '현재') {
    parts.push(`${dYear}몰`)
  }

  const polity =
    fallbackPolityName?.trim() ||
    (person?.country?.isHistorical ? person?.country?.name?.trim() : null) ||
    null
  if (polity && polity !== currentCountryName?.trim()) {
    parts.push(polity)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

export function formatEventSubLabel(
  event: any,
  currentCountryName?: string | null,
): string | null {
  const parts: string[] = []
  const startYear = formatActivityYearFromIso(
    event?.startDate,
    event?.startEra,
    event?.startYear,
  )
  const endYear = formatActivityYearFromIso(
    event?.endDate,
    event?.endEra,
    event?.endYear,
  )

  if (startYear && endYear && startYear !== endYear) {
    parts.push(`${startYear.replace(/년$/, '')}–${endYear}`)
  } else if (startYear) {
    const rawStart = typeof event?.startDate === 'string' ? event.startDate.trim() : ''
    const mdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(rawStart)
    if (
      mdMatch &&
      event?.isDayKnown !== false &&
      !(mdMatch[2] === '01' && mdMatch[3] === '01')
    ) {
      parts.push(`${Number(mdMatch[1])}.${mdMatch[2]}.${mdMatch[3]}`)
    } else {
      parts.push(startYear)
    }
  }

  const polity =
    event?.historicalCountry?.name?.trim() ||
    (event?.country?.isHistorical ? event?.country?.name?.trim() : null) ||
    null
  if (polity && polity !== currentCountryName?.trim()) {
    parts.push(polity)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * 도메인 묶음별 활동 내역을 균형 있게 합친다.
 *
 * 1) 최근 7일 이내에 새로 등록·수정된 항목은 실제 사용자의 최근 편집이므로
 *    종류에 상관없이 먼저 우선 반영한다(단, 한 묶음 일괄 시딩이 전부를 덮지 않게 묶음당 최대 6건).
 * 2) 나머지 자리는 각 도메인 묶음에서 최소 몫(ACTIVITY_KIND_QUOTA)을 먼저 떼고,
 *    남는 자리를 최신순으로 채운다.
 */
export function pickWithKindQuota(
  ...groups: RecentActivityItem[][]
): RecentActivityItem[] {
  const nonEmptyGroups = groups
    .map((group) => [...group].sort(byCreatedAtDesc))
    .filter((group) => group.length > 0)
  if (nonEmptyGroups.length === 0) return []

  const recentCutoff = Date.now() - SEVEN_DAYS_MS
  const pickedIds = new Set<string>()
  const pickedLabels = new Set<string>()
  const picked: RecentActivityItem[] = []
  const tryPush = (item: RecentActivityItem): boolean => {
    const labelKey = `${item.kind}::${item.label.trim()}`
    if (pickedIds.has(item.id) || pickedLabels.has(labelKey)) return false
    pickedIds.add(item.id)
    pickedLabels.add(labelKey)
    picked.push(item)
    return true
  }

  // 1단계: 최근 7일 내 실제 활동 우선 수집 — 도메인 독점을 막기 위해 그룹별 1순위부터 라운드로빈 배정
  const recentBuckets = nonEmptyGroups
    .map((group) =>
      group
        .filter((item) => {
          const ts = new Date(item.createdAt).getTime()
          return Number.isFinite(ts) && ts >= recentCutoff
        })
        .slice(0, 6),
    )
    .filter((bucket) => bucket.length > 0)
    .sort((left, right) => byCreatedAtDesc(left[0], right[0]))

  for (let passIdx = 0; passIdx < 6; passIdx += 1) {
    if (picked.length >= ACTIVITY_FEED_LIMIT) break
    const passItems: RecentActivityItem[] = []
    for (const bucket of recentBuckets) {
      if (bucket[passIdx]) passItems.push(bucket[passIdx])
    }
    passItems.sort(byCreatedAtDesc)
    for (const item of passItems) {
      if (picked.length >= ACTIVITY_FEED_LIMIT) break
      tryPush(item)
    }
  }

  // 2단계: 각 도메인 묶음에서 최소 몫(ACTIVITY_KIND_QUOTA) 보장
  const quotaPerGroup = Math.max(
    2,
    Math.min(
      ACTIVITY_KIND_QUOTA,
      Math.floor(ACTIVITY_FEED_LIMIT / nonEmptyGroups.length),
    ),
  )
  for (const group of nonEmptyGroups) {
    let count = 0
    for (const item of group) {
      if (count >= quotaPerGroup || picked.length >= ACTIVITY_FEED_LIMIT) break
      if (tryPush(item)) {
        count++
      }
    }
  }

  // 3단계: 남는 슬롯을 전체 최신순으로 보충
  if (picked.length < ACTIVITY_FEED_LIMIT) {
    const leftover = nonEmptyGroups
      .flat()
      .filter((item) => !pickedIds.has(item.id))
      .sort(byCreatedAtDesc)
    for (const item of leftover) {
      if (picked.length >= ACTIVITY_FEED_LIMIT) break
      tryPush(item)
    }
  }

  return picked.sort(byCreatedAtDesc).slice(0, ACTIVITY_FEED_LIMIT)
}

function countSince(items: unknown, sinceMs: number): number {
  if (!Array.isArray(items)) return 0
  return items.filter((it) => {
    const ts = (it as any)?.createdAt ?? (it as any)?.created_at
    if (!ts) return false
    const t = new Date(ts).getTime()
    return Number.isFinite(t) && t >= sinceMs
  }).length
}

/**
 * 현대 국가 상세 대시보드용 요약 수치, 최근 활동, 현임 수반, 데이터 완성도.
 * 역사적 국가는 별도 위젯(HistoricalCountryDetail)으로 라우팅되므로 여기 도달하지 않음.
 */
export function useCountryDashboardStats(
  country: UnifiedCountry | null,
): CountryDashboardStats {
  const countryId = country?.id ?? ''

  const [
    personsQuery,
    eventsQuery,
    administrationQuery,
    citiesQuery,
    tenuresQuery,
    cabinetsQuery,
    electionsQuery,
    lawsQuery,
    ethnicityQuery,
    treatiesQuery,
    allCountriesQuery,
    politicalSystemsQuery,
  ] = useQueries({
    queries: [
      {
        /*
         * 국가 상세 인물 탭(CountryPersonsSection)과 동일한 3원 합집합 + 연결 과거 국가 묶음을 공유한다.
         * 기존 getPersonsByTenureCountry는 재임 기록이 있는 관료만 세어 일반 인물(학자·문인·기업인 등)이
         * 대시보드 카운트·최근 활동에서 빠지고 인물 탭 숫자와 어긋났다.
         */
        queryKey: ['persons', 'by-country-grouped', countryId],
        queryFn: () => personApi.getByCountryIdGrouped(countryId),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        /*
         * 이 국가의 사건 — 대시보드의 사건 수·연표·캘린더가 모두 이 한 배열을 모수로 쓴다.
         *
         * 두 가지를 명시해야 모수가 맞는다.
         *  · includeSubEvents: 목록 API의 기본 스코프는 최상위 사건뿐이라 하위 사건이
         *    통째로 빠진다(미국 43건 중 6건이 그래서 안 보였다). 계층을 그리지 않고
         *    세기만 하는 지면이라 평평하게 받는다.
         *  · 페이징 소진: 서버가 limit을 100으로 깎으므로 limit:5000은 '전부'가 아니었다.
         */
        /* 'flat' 꼬리표 — 같은 국가라도 계층 응답과 평면 응답은 다른 자료다 */
        queryKey: eventKeys.byCountry(countryId, 'flat'),
        queryFn: () =>
          getAllEventsExhaustive({ countryId, includeSubEvents: true }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: administrationDepartmentsByCountryQueryKey(countryId),
        queryFn: () => administrationDepartmentApi.getByCountryId(countryId),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['cities-by-country', countryId],
        queryFn: () => cityApi.getByCountryId(countryId),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['tenures-by-country', countryId, undefined],
        queryFn: () => personCareerApi.getTenuresByCountry({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['cabinets-by-country', countryId, undefined],
        queryFn: () => personCareerApi.getCabinets({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['elections', 'list', `c:${countryId}`],
        queryFn: () => getElections({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['laws', `c:${countryId}`],
        queryFn: () => getLaws({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['ethnicities', 'by-country', countryId],
        queryFn: () => ethnicityApi.getAll({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['treaties-by-country-preview', countryId],
        queryFn: () => treatyApi.getAll({ countryId, take: 8 }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['all-countries-for-comparison'],
        queryFn: () => getAllCountries(),
        enabled: Boolean(countryId && country?.continentId),
        staleTime: 1000 * 60 * 30,
      },
      {
        queryKey: politicalSystemKeys.list({ countryId }),
        queryFn: () => listPoliticalSystems({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60,
      },
    ],
  })

  const linkedHistIds = useMemo(
    () =>
      Array.from(
        new Set(
          (country?.historicalCountries ?? [])
            .map((h) => h?.id)
            .filter((hid): hid is string => Boolean(hid)),
        ),
      ).sort(),
    [country?.historicalCountries],
  )
  const allMilitaryUnitsQuery = useQuery({
    queryKey: ['military-units', 'all'] as const,
    queryFn: () => militaryUnitApi.getAll(),
    enabled: Boolean(countryId),
    staleTime: 1000 * 60 * 5,
  })

  const scopedMilitaryUnits = useMemo(() => {
    if (!countryId || !Array.isArray(allMilitaryUnitsQuery.data)) return []
    const histSet = new Set(linkedHistIds)
    return allMilitaryUnitsQuery.data.filter(
      (u) =>
        u.countryId === countryId ||
        (Boolean(u.historicalCountryId) && histSet.has(u.historicalCountryId!)),
    )
  }, [countryId, allMilitaryUnitsQuery.data, linkedHistIds])

  // 현대 국가 대시보드에서는 현대 국가 직속(historicalCountryId 없음) 내각만 현 내각으로 선택한다.
  // 전신 역사국가 내각(예: 1909년 독일 제국 베트만홀베크 내각)이 현대 국가의 현 행정부로 둔갑하는 혼선을 차단한다.
  const latestActiveCabinetId = useMemo<string | null>(() => {
    const list = Array.isArray(cabinetsQuery.data)
      ? (cabinetsQuery.data as any[])
      : []
    if (list.length === 0) return null
    const now = Date.now()
    const isModernDirect = (c: any) =>
      !c?.historicalCountryId && !c?.headTenure?.historicalCountryId
    const basePool =
      country?.type === 'modern' ? list.filter(isModernDirect) : list
    if (basePool.length === 0) return null
    const active = basePool.filter((c) => {
      if (c.headTenure?.endYear != null) return false
      const end = c.headTenure?.endDate
      if (!end) return true
      const t = new Date(end).getTime()
      return !Number.isFinite(t) || t >= now
    })
    const candidates = active.length > 0 ? active : basePool
    const sorted = [...candidates].sort((a, b) => {
      const da = new Date(a.headTenure?.startDate ?? 0).getTime()
      const db = new Date(b.headTenure?.startDate ?? 0).getTime()
      return db - da
    })
    return (sorted[0] as { id?: string } | undefined)?.id ?? null
  }, [cabinetsQuery.data, country?.type])

  // 현대 국가 묶음 + 연결된 과거 국가 묶음의 인물을 id 기준으로 합집합 + 소속 과거국가 이름 매핑
  const { persons, personPolityById } = useMemo<{
    persons: PersonResponseDto[]
    personPolityById: Map<string, string>
  }>(() => {
    const grouped = personsQuery.data
    const byId = new Map<string, PersonResponseDto>()
    const polityMap = new Map<string, string>()
    if (!grouped) return { persons: [], personPolityById: polityMap }
    for (const p of grouped.modern ?? []) {
      if (p?.id) byId.set(p.id, p)
    }
    for (const group of grouped.historical ?? []) {
      const polityName = group.historicalCountryName?.trim() || ''
      for (const p of group.persons ?? []) {
        if (p?.id) {
          if (!byId.has(p.id)) byId.set(p.id, p)
          if (polityName && !polityMap.has(p.id)) {
            polityMap.set(p.id, polityName)
          }
        }
      }
    }
    return { persons: [...byId.values()], personPolityById: polityMap }
  }, [personsQuery.data])

  const personCount = persons.length
  const { militaryCount, highCommandCount, militaryBranchBreakdown } = useMemo(() => {
    if (!countryId || scopedMilitaryUnits.length === 0) {
      return {
        militaryCount: 0,
        highCommandCount: 0,
        militaryBranchBreakdown: [] as MilitaryBranchSummary[],
      }
    }
    const HIGH_CMD_TYPES = new Set([
      'SUPREME_COMMAND',
      'GENERAL_STAFF',
      'SERVICE_HQ',
      'THEATER',
      'ARMY_GROUP',
      'FRONT',
      'MILITARY_DISTRICT',
      'FIELD_ARMY',
      'FLEET',
      'AIR_FLEET',
      'CORPS',
      'AIR_CORPS',
    ])
    let highCmd = 0
    const byBranch = new Map<string, number>()
    for (const u of scopedMilitaryUnits) {
      if (u.unitType && HIGH_CMD_TYPES.has(u.unitType)) highCmd += 1
      const br = u.branch ?? 'OTHER'
      byBranch.set(br, (byBranch.get(br) ?? 0) + 1)
    }
    const breakdown = [...byBranch.entries()]
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count)
    return {
      militaryCount: scopedMilitaryUnits.length,
      highCommandCount: highCmd,
      militaryBranchBreakdown: breakdown,
    }
  }, [countryId, scopedMilitaryUnits])
  const eventCount = Array.isArray(eventsQuery.data) ? eventsQuery.data.length : 0
  const historicalCountryCount = country?.historicalCountries?.length ?? 0
  const departmentCount = Array.isArray(administrationQuery.data)
    ? administrationQuery.data.length
    : 0
  const politicalSystemCount = Array.isArray(politicalSystemsQuery.data)
    ? politicalSystemsQuery.data.length
    : 0
  const cabinetList = Array.isArray(cabinetsQuery.data)
    ? (cabinetsQuery.data as any[])
    : []
  const allTenureRows = Array.isArray(tenuresQuery.data)
    ? (tenuresQuery.data as any[])
    : []
  const hasAnyHeadRecord = useMemo(() => {
    if (cabinetList.some((c) => c?.headTenure != null)) return true
    return allTenureRows.some((t) => {
      const pt =
        t?.positionType ??
        t?.positionDefinition?.positionType ??
        t?.position?.positionType
      return HEAD_TYPES.has(pt)
    })
  }, [cabinetList, allTenureRows])
  const hasAnyMinisterRecord = useMemo(() => {
    if (
      cabinetList.some(
        (c) => (c?.ministerCount ?? c?._count?.tenures ?? 0) > 0,
      )
    ) {
      return true
    }
    return allTenureRows.some((t) => {
      const pt =
        t?.positionType ??
        t?.positionDefinition?.positionType ??
        t?.position?.positionType
      return pt === 'MINISTER'
    })
  }, [cabinetList, allTenureRows])
  const executiveHeadTenureCount = useMemo(
    () =>
      allTenureRows.filter((t) => {
        const pt =
          t?.positionType ??
          t?.positionDefinition?.positionType ??
          t?.position?.positionType
        return HEAD_TYPES.has(pt)
      }).length,
    [allTenureRows],
  )
  const historicalHeadCount = useMemo(
    () =>
      allTenureRows.filter((t) => {
        if (!t?.historicalCountryId) return false
        const pt =
          t?.positionType ??
          t?.positionDefinition?.positionType ??
          t?.position?.positionType
        return HEAD_TYPES.has(pt)
      }).length,
    [allTenureRows],
  )
  // 기록 원장의 '행정조직' 축: 중앙부처 + 등록된 내각 + 정체(없으면 수반 재임 기록)을 합산해
  // 내각·정체·역대 수반이 등록된 국가(프랑스·스페인 등)에서 행정조직이 0건으로 빠지지 않게 한다.
  const administrationCount =
    departmentCount + cabinetList.length + politicalSystemCount ||
    executiveHeadTenureCount
  const cityCount = Array.isArray(citiesQuery.data)
    ? citiesQuery.data.length
    : 0
  const rawElectionsList = Array.isArray(electionsQuery.data)
    ? (electionsQuery.data as any[])
    : []
  const electionCount = rawElectionsList.length
  const modernElectionCount = useMemo(
    () => rawElectionsList.filter((e) => !e?.historicalCountryId).length,
    [rawElectionsList],
  )
  const historicalElectionCount = electionCount - modernElectionCount
  const lawCount = Array.isArray(lawsQuery.data)
    ? lawsQuery.data.length
    : 0
  const ethnicityCount = Array.isArray(ethnicityQuery.data)
    ? ethnicityQuery.data.length
    : 0

  const deltaCounts = useMemo<DeltaCounts>(() => {
    const since = Date.now() - SEVEN_DAYS_MS
    const adminBaseDelta =
      countSince(administrationQuery.data, since) +
      countSince(cabinetsQuery.data, since) +
      countSince(politicalSystemsQuery.data, since)
    return {
      person: countSince(persons, since),
      event: countSince(eventsQuery.data, since),
      administration:
        adminBaseDelta || countSince(tenuresQuery.data, since),
      city: countSince(citiesQuery.data, since),
    }
  }, [
    persons,
    eventsQuery.data,
    administrationQuery.data,
    cabinetsQuery.data,
    politicalSystemsQuery.data,
    tenuresQuery.data,
    citiesQuery.data,
  ])

  const recentPersons = useMemo((): RecentPersonItem[] => {
    const list = persons as any[]
    // 한 번의 sort + slice — 이전엔 `.map(spread).sort.slice.map` 4단계였음.
    const sorted = [...list].sort((a, b) => {
      const ta = new Date(a.createdAt ?? a.created_at ?? 0).getTime()
      const tb = new Date(b.createdAt ?? b.created_at ?? 0).getTime()
      return tb - ta
    })
    return sorted.slice(0, 10).map((p) => {
      const order =
        p.country?.defaultNameDisplayOrder ??
        country?.defaultNameDisplayOrder ??
        null
      const displayName =
        getPersonDisplayName(
          {
            name: p.name ?? '',
            surname: p.surname,
            middleName: p.middleName,
            nameDisplayOrder: p.nameDisplayOrder ?? null,
            country: p.country ?? undefined,
          },
          order != null ? { countryDefaultNameDisplayOrder: order } : undefined,
        ) ||
        p.name ||
        p.surname ||
        '이름 없음'
      return {
        id: p.id ?? '',
        displayName,
        createdAt: p.createdAt ?? p.created_at ?? '',
        profileImageUrl: p.profileImageUrl ?? p.profile_image_url ?? null,
      }
    })
  }, [persons, country?.defaultNameDisplayOrder])

  const recentActivity = useMemo((): RecentActivityItem[] => {
    const currentCountryName = country?.name ?? null
    const defaultOrder = country?.defaultNameDisplayOrder ?? null

    const personItems = (persons as any[])
      .map<RecentActivityItem>((p) => {
        const { activityAt, isUpdated } = resolveActivityTimestamp(p)
        const order = p.country?.defaultNameDisplayOrder ?? defaultOrder
        const displayName =
          getPersonDisplayName(
            {
              name: p.name ?? '',
              surname: p.surname,
              middleName: p.middleName,
              nameDisplayOrder: p.nameDisplayOrder ?? null,
              country: p.country ?? undefined,
            },
            order != null ? { countryDefaultNameDisplayOrder: order } : undefined,
          ) ||
          p.name ||
          p.surname ||
          '이름 없음'
        return {
          id: `person-${p.id}`,
          kind: 'person',
          category: 'person',
          refId: p.id ?? '',
          personId: p.id ?? null,
          label: displayName,
          subLabel: formatPersonSubLabel(
            p,
            personPolityById.get(p.id) ?? null,
            currentCountryName,
          ),
          createdAt: activityAt,
          isUpdated,
          profileImageUrl: p.profileImageUrl ?? p.profile_image_url ?? null,
        }
      })
      .filter((item) => item.refId && item.createdAt)

    const eventItems = ((eventsQuery.data ?? []) as any[])
      .map<RecentActivityItem>((e) => {
        const { activityAt, isUpdated } = resolveActivityTimestamp(e)
        return {
          id: `event-${e.id}`,
          kind: 'event',
          category: 'event',
          refId: e.id ?? '',
          label: e.title?.trim() || '제목 없음',
          subLabel: formatEventSubLabel(e, currentCountryName),
          createdAt: activityAt,
          isUpdated,
          startDate: e.startDate ?? null,
          endDate: e.endDate ?? null,
        }
      })
      .filter((item) => item.refId && item.createdAt)

    const governanceItems: RecentActivityItem[] = []

    for (const sys of (politicalSystemsQuery.data ?? []) as any[]) {
      const { activityAt, isUpdated } = resolveActivityTimestamp(sys)
      if (!sys?.id || !activityAt) continue
      const formLabel =
        (sys.governmentForm &&
          (GOVERNMENT_FORM_LABEL as Record<string, string>)[sys.governmentForm]) ||
        sys.title?.trim() ||
        '정체'
      const hos = headOfStateTitleOf(sys)
      const hog = headOfGovernmentTitleOf(sys)
      const headSummary =
        hos && hog && hos !== hog
          ? `${hos} · ${hog}`
          : hos || hog || null
      const periodText = formatPoliticalSystemPeriod(sys)
      const polityQualifier =
        sys.historicalCountry?.name &&
        sys.historicalCountry.name !== currentCountryName
          ? sys.historicalCountry.name
          : null
      const sysDisplayLabel =
        sys.name?.trim() ||
        sys.title?.trim() ||
        (polityQualifier ? `${polityQualifier} · ${formLabel}` : formLabel)
      const subParts = [
        sysDisplayLabel !== formLabel ? formLabel : null,
        headSummary ? `수장: ${headSummary}` : null,
        periodText !== '기간 미상' ? periodText : null,
        polityQualifier && !sysDisplayLabel.includes(polityQualifier)
          ? polityQualifier
          : null,
      ].filter(Boolean)
      governanceItems.push({
        id: `political-system-${sys.id}`,
        kind: 'political-system',
        category: 'governance',
        refId: sys.id,
        label: sysDisplayLabel,
        subLabel: subParts.length > 0 ? subParts.join(' · ') : '헌법·통치 체제',
        createdAt: activityAt,
        isUpdated,
      })
    }

    for (const t of (tenuresQuery.data ?? []) as any[]) {
      const { activityAt, isUpdated } = resolveActivityTimestamp(t)
      if (!t?.id || !activityAt) continue
      const order = t.person?.country?.defaultNameDisplayOrder ?? defaultOrder
      const personName =
        t.regnalName?.trim() ||
        getPersonDisplayName(
          {
            name: t.person?.name ?? '',
            surname: t.person?.surname,
            middleName: t.person?.middleName,
            nameDisplayOrder: t.person?.nameDisplayOrder ?? null,
            country: t.person?.country ?? undefined,
          },
          order != null ? { countryDefaultNameDisplayOrder: order } : undefined,
        ) ||
        t.person?.name ||
        '인물 미상'
      const posTitle =
        t.title?.trim() ||
        t.positionDefinition?.title?.trim() ||
        t.administrationDepartment?.name?.trim() ||
        '재임'
      const posType =
        t.positionType ??
        t.positionDefinition?.positionType ??
        t.position?.positionType
      const roleKindLabel =
        posType === 'HEAD_OF_STATE'
          ? '국가원수'
          : posType === 'HEAD_OF_GOVERNMENT'
            ? '정부수반'
            : posType === 'MINISTER'
              ? t.administrationDepartment?.name?.trim() || '각료'
              : '공직'
      const startY = formatActivityYearFromIso(t.startDate, t.startEra, t.startYear)
      const endY = t.endDate || t.endYear != null
        ? formatActivityYearFromIso(t.endDate, t.endEra, t.endYear)
        : '현재'
      const spanText =
        startY && endY
          ? startY === endY
            ? startY
            : `${startY.replace(/년$/, '')}–${endY}`
          : startY || null
      const subParts = [roleKindLabel, spanText].filter(Boolean)
      governanceItems.push({
        id: `tenure-${t.id}`,
        kind: 'tenure',
        category: 'governance',
        refId: t.id,
        personId: t.person?.id ?? t.personId ?? null,
        label: `${personName} · ${posTitle}`,
        subLabel: subParts.length > 0 ? subParts.join(' · ') : null,
        createdAt: activityAt,
        isUpdated,
        profileImageUrl:
          t.person?.profileImageUrl ?? t.person?.profile_image_url ?? null,
      })
    }

    for (const cab of (cabinetsQuery.data ?? []) as any[]) {
      const { activityAt, isUpdated } = resolveActivityTimestamp(cab)
      if (!cab?.id || !activityAt) continue
      const startY = formatActivityYearFromIso(cab.headTenure?.startDate)
      const endY = cab.headTenure?.endDate
        ? formatActivityYearFromIso(cab.headTenure?.endDate)
        : startY
          ? '현재'
          : null
      const spanText =
        startY && endY ? `${startY.replace(/년$/, '')}–${endY}` : startY
      governanceItems.push({
        id: `cabinet-${cab.id}`,
        kind: 'cabinet',
        category: 'governance',
        refId: cab.id,
        label: cab.name?.trim() || '행정부 내각',
        subLabel: spanText ? `내각 편제 · ${spanText}` : '내각 편제',
        createdAt: activityAt,
        isUpdated,
      })
    }

    for (const dept of (administrationQuery.data ?? []) as any[]) {
      const { activityAt, isUpdated } = resolveActivityTimestamp(dept)
      if (!dept?.id || !activityAt) continue
      governanceItems.push({
        id: `department-${dept.id}`,
        kind: 'department',
        category: 'governance',
        refId: dept.id,
        label: dept.name?.trim() || '중앙부처',
        subLabel: dept.englishName?.trim()
          ? `중앙부처 · ${dept.englishName.trim()}`
          : '중앙부처 편제',
        createdAt: activityAt,
        isUpdated,
      })
    }

    const archiveItems: RecentActivityItem[] = []

    for (const elec of (electionsQuery.data ?? []) as any[]) {
      const { activityAt, isUpdated } = resolveActivityTimestamp(elec)
      if (!elec?.id || !activityAt) continue
      const pollText =
        typeof elec.pollDate === 'string' && elec.pollDate.length >= 10
          ? elec.pollDate.slice(0, 10).replace(/-/g, '.')
          : formatActivityYearFromIso(elec.pollDate)
      archiveItems.push({
        id: `election-${elec.id}`,
        kind: 'election',
        category: 'archive',
        refId: elec.id,
        label: elec.name?.trim() || '선거',
        subLabel: pollText ? `선거 · ${pollText}` : '선거 기록',
        createdAt: activityAt,
        isUpdated,
      })
    }

    for (const law of (lawsQuery.data ?? []) as any[]) {
      const { activityAt, isUpdated } = resolveActivityTimestamp(law)
      if (!law?.id || !activityAt) continue
      const yearText = formatActivityYearFromIso(
        law.enactedDate ?? law.promulgatedDate ?? law.startDate,
        law.era,
        law.year,
      )
      archiveItems.push({
        id: `law-${law.id}`,
        kind: 'law',
        category: 'archive',
        refId: law.id,
        label: law.title?.trim() || law.name?.trim() || '법령',
        subLabel: yearText ? `법령 · ${yearText}` : '법령 · 제도',
        createdAt: activityAt,
        isUpdated,
      })
    }

    for (const city of (citiesQuery.data ?? []) as any[]) {
      const { activityAt, isUpdated } = resolveActivityTimestamp(city)
      if (!city?.id || !activityAt) continue
      archiveItems.push({
        id: `city-${city.id}`,
        kind: 'city',
        category: 'archive',
        refId: city.id,
        label: city.name?.trim() || '행정구역',
        subLabel: city.isCapital ? '수도 · 행정구역' : '행정구역',
        createdAt: activityAt,
        isUpdated,
      })
    }

    return pickWithKindQuota(
      personItems,
      eventItems,
      governanceItems,
      archiveItems,
    )
  }, [
    persons,
    personPolityById,
    country?.name,
    country?.defaultNameDisplayOrder,
    eventsQuery.data,
    politicalSystemsQuery.data,
    tenuresQuery.data,
    cabinetsQuery.data,
    administrationQuery.data,
    electionsQuery.data,
    lawsQuery.data,
    citiesQuery.data,
  ])

  const currentHeads = useMemo((): CurrentHead[] => {
    const tenures = (tenuresQuery.data ?? []) as any[]
    const now = Date.now()
    const matches = tenures.filter((t) => {
      // 현대 국가 대시보드에서는 소멸한 전신 과거국가(historicalCountryId)의 미종료 행이 현직 수반으로 둔갑하지 않도록 차단
      if (country?.type === 'modern' && t.historicalCountryId != null) {
        return false
      }
      const positionType =
        t.positionType ??
        t.positionDefinition?.positionType ??
        t.position?.positionType
      if (!HEAD_TYPES.has(positionType)) return false
      if (t.endYear != null) return false
      const end = t.endDate ? new Date(t.endDate).getTime() : null
      return end == null || end >= now
    })
    const rawSystems = Array.isArray(politicalSystemsQuery.data)
      ? (politicalSystemsQuery.data as any[])
      : []
    const scopedSystems =
      country?.type === 'modern'
        ? rawSystems.filter((s) => !s?.historicalCountryId)
        : rawSystems
    const activeSystemForHeads =
      scopedSystems.find((s) => s?.isCurrent) ??
      [...scopedSystems].reverse().find((s) => s?.endYear == null) ??
      null
    const effectivePowerRole = activeSystemForHeads
      ? resolveEffectivePowerHolderRole(activeSystemForHeads)
      : 'HEAD_OF_STATE'

    const ordered = [...matches]
    ordered.sort((a, b) => {
      const typeOf = (t: any) =>
        t.positionType ??
        t.positionDefinition?.positionType ??
        t.position?.positionType
      const order = (t: any) => {
        const pt = typeOf(t)
        if (effectivePowerRole === 'HEAD_OF_GOVERNMENT') {
          return pt === 'HEAD_OF_GOVERNMENT' ? 0 : 1
        }
        return pt === 'HEAD_OF_STATE' ? 0 : 1
      }
      const oa = order(a)
      const ob = order(b)
      if (oa !== ob) return oa - ob
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    })
    return ordered.slice(0, 4).map<CurrentHead>((t) => {
      const order =
        t.person?.country?.defaultNameDisplayOrder ??
        country?.defaultNameDisplayOrder ??
        null
      const personName =
        getPersonDisplayName(
          {
            name: t.person?.name ?? '',
            surname: t.person?.surname,
            middleName: t.person?.middleName,
            nameDisplayOrder: t.person?.nameDisplayOrder ?? null,
            country: t.person?.country ?? undefined,
          },
          order != null ? { countryDefaultNameDisplayOrder: order } : undefined,
        ) ||
        t.person?.name ||
        '이름 없음'
      const posType =
        t.positionType ??
        t.positionDefinition?.positionType ??
        t.position?.positionType ??
        'OTHER'
      const isPowerHolder =
        effectivePowerRole === 'DUAL_EXECUTIVE'
          ? posType === 'HEAD_OF_STATE' || posType === 'HEAD_OF_GOVERNMENT'
          : posType === effectivePowerRole
      return {
        tenureId: t.id,
        personId: t.person?.id ?? '',
        personName,
        profileImageUrl:
          t.person?.profileImageUrl ?? t.person?.profile_image_url ?? null,
        positionTitle:
          t.title ??
          t.positionDefinition?.title ??
          '직책 미상',
        positionType: posType,
        startDate: t.startDate,
        isPowerHolder,
      }
    })
  }, [
    tenuresQuery.data,
    politicalSystemsQuery.data,
    country?.type,
    country?.defaultNameDisplayOrder,
  ])

  const treatyCount = (treatiesQuery.data as { total?: number } | undefined)
    ?.total ?? 0

  // 사건 시간 분포는 "사건 발생일(startDate)" 기준 — createdAt 폴백 없음.
  // 발생일이 없는 사건은 분포에서 제외해 의미 일관성 유지.
  /**
   * 세기 분포 — 사건 발생일 기준.
   *
   * `startDate`는 DATETIME이 없는 사건(실측 330건 중 67건)도 서버가 구조화 연도로
   * 합성해 내려준다('0976-01-01', BC는 앞에 '-'). 그래서 **문자열로 읽는다** —
   * `new Date()`에 넣으면 100년 미만이 1900년대로 튀고 BC는 Invalid Date가 된다.
   */
  const {
    eventCenturyCounts,
    eventCenturyDomainCounts,
    eventDomainBreakdown,
    warSummary,
  } = useMemo(() => {
    const list = (eventsQuery.data ?? []) as Array<{
      startDate?: string | null
      domain?: string | null
      type?: string | null
      relatedCountries?: Array<{ id?: string; sideOutcome?: string | null }>
      relatedHistoricalCountries?: Array<{
        id?: string
        sideOutcome?: string | null
      }>
    }>
    const linkedSet = new Set(linkedHistIds)
    const byCentury = new Map<
      number,
      { total: number; domains: Record<string, number> }
    >()
    const byDomain = new Map<string, number>()
    const warAcc: WarOutcomeSummary = {
      totalMilitaryEvents: 0,
      wars: 0,
      battles: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
    }

    for (const event of list) {
      const dom = event.domain?.trim() || 'OTHER'
      byDomain.set(dom, (byDomain.get(dom) ?? 0) + 1)

      if (dom === 'MILITARY') {
        warAcc.totalMilitaryEvents += 1
        if (event.type === 'WAR') warAcc.wars += 1
        else if (
          event.type === 'BATTLE' ||
          event.type === 'CAMPAIGN' ||
          event.type === 'SIEGE'
        ) {
          warAcc.battles += 1
        }
        const selfMod = (event.relatedCountries ?? []).find(
          (c) => c.id === countryId && c.sideOutcome,
        )
        const selfHist = (event.relatedHistoricalCountries ?? []).find(
          (h) => h.id && linkedSet.has(h.id) && h.sideOutcome,
        )
        const outcome = selfMod?.sideOutcome ?? selfHist?.sideOutcome ?? null
        if (outcome === 'VICTORY') warAcc.victories += 1
        else if (outcome === 'DEFEAT') warAcc.defeats += 1
        else if (outcome) warAcc.draws += 1
      }

      const raw = event.startDate
      if (typeof raw !== 'string') continue
      const matched = /^(-?)(\d{1,6})-/.exec(raw)
      if (!matched) continue
      const year = Number(matched[2])
      const maxReasonableYear = new Date().getFullYear() + 10
      if (!Number.isFinite(year) || year === 0) continue
      if (matched[1] !== '-' && year > maxReasonableYear) continue
      const century =
        matched[1] === '-' ? -Math.ceil(year / 100) : Math.ceil(year / 100)
      const prev = byCentury.get(century) ?? { total: 0, domains: {} }
      prev.total += 1
      prev.domains[dom] = (prev.domains[dom] ?? 0) + 1
      byCentury.set(century, prev)
    }

    const sortedCenturies = [...byCentury.entries()].sort(
      (left, right) => left[0] - right[0],
    )
    return {
      eventCenturyCounts: sortedCenturies.map(([century, val]) => ({
        century,
        count: val.total,
      })),
      eventCenturyDomainCounts: sortedCenturies.map(([century, val]) => ({
        century,
        total: val.total,
        domains: val.domains,
      })),
      eventDomainBreakdown: [...byDomain.entries()]
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count),
      warSummary: warAcc,
    }
  }, [eventsQuery.data, countryId, linkedHistIds])

  /** 달력용 경량 목록 — 같은 쿼리를 재사용하므로 왕복은 늘지 않는다 */
  const calendarEvents = useMemo<CalendarEventItem[]>(() => {
    const list = (eventsQuery.data ?? []) as Array<{
      id?: string
      title?: string | null
      startDate?: string | null
      isDayKnown?: boolean
    }>
    const rows: CalendarEventItem[] = []
    for (const event of list) {
      if (!event.id || typeof event.startDate !== 'string') continue
      const matched = /^(-?\d{1,6}-\d{2}-\d{2})/.exec(event.startDate)
      if (!matched) continue
      rows.push({
        id: event.id,
        title: event.title?.trim() || '제목 없음',
        date: matched[1],
        isDayKnown: event.isDayKnown !== false,
      })
    }
    return rows
  }, [eventsQuery.data])

  const continentComparison = useMemo<ContinentComparison>(() => {
    const empty: ContinentComparison = {
      sampleSize: 0,
      populationDeltaPct: null,
      areaDeltaPct: null,
      populationRank: null,
      areaRank: null,
      totalCount: 0,
      populationRankTotal: null,
      areaRankTotal: null,
    }
    if (!country?.continentId) return empty
    const list = Array.isArray(allCountriesQuery.data)
      ? (allCountriesQuery.data as any[])
      : []
    const sameContinent = list.filter(
      (c) => c.continentId === country.continentId,
    )
    if (sameContinent.length === 0) return empty
    const popOf = (c: any): number | null => {
      const raw = c.population
      if (raw == null || raw === '') return null
      const n =
        typeof raw === 'string' ? Number(String(raw).replace(/,/g, '')) : Number(raw)
      return Number.isFinite(n) && n >= 0 ? n : null
    }
    const areaOf = (c: any): number | null => {
      const raw = c.areaSqKm
      if (raw == null) return null
      const n = Number(raw)
      return Number.isFinite(n) && n >= 0 ? n : null
    }
    const meanOf = (vals: (number | null)[]): number | null => {
      const ok = vals.filter((v): v is number => v != null && v > 0)
      if (ok.length === 0) return null
      return ok.reduce((s, v) => s + v, 0) / ok.length
    }
    const others = sameContinent.filter((c) => c.id !== country.id)
    // 표본이 너무 작으면 통계 신뢰 불가 — 비교/순위 모두 비활성.
    const MIN_SAMPLE = 3
    const sample = others.length
    if (sample < MIN_SAMPLE) {
      return {
        ...empty,
        sampleSize: sample,
        totalCount: sameContinent.length,
      }
    }
    const popMean = meanOf(others.map(popOf))
    const areaMean = meanOf(others.map(areaOf))
    const myPop = popOf(country)
    const myArea = areaOf(country)
    const populationDeltaPct =
      myPop != null && popMean != null && popMean > 0
        ? ((myPop - popMean) / popMean) * 100
        : null
    const areaDeltaPct =
      myArea != null && areaMean != null && areaMean > 0
        ? ((myArea - areaMean) / areaMean) * 100
        : null
    const sortedPop = [...sameContinent]
      .filter((c) => popOf(c) != null)
      .sort((a, b) => (popOf(b) ?? 0) - (popOf(a) ?? 0))
    const sortedArea = [...sameContinent]
      .filter((c) => areaOf(c) != null)
      .sort((a, b) => (areaOf(b) ?? 0) - (areaOf(a) ?? 0))
    // 순위 분모는 해당 지표가 등록된 국가만 — 라벨도 그렇게 표시
    const populationRank =
      sortedPop.length >= MIN_SAMPLE
        ? (() => {
            const idx = sortedPop.findIndex((c) => c.id === country.id)
            return idx < 0 ? null : idx + 1
          })()
        : null
    const areaRank =
      sortedArea.length >= MIN_SAMPLE
        ? (() => {
            const idx = sortedArea.findIndex((c) => c.id === country.id)
            return idx < 0 ? null : idx + 1
          })()
        : null
    return {
      sampleSize: sample,
      totalCount: sameContinent.length,
      populationDeltaPct,
      areaDeltaPct,
      populationRank,
      areaRank,
      populationRankTotal: sortedPop.length,
      areaRankTotal: sortedArea.length,
    }
  }, [allCountriesQuery.data, country])

  const currentCabinet = useMemo<CurrentCabinetSummary | null>(() => {
    if (!latestActiveCabinetId) return null
    const list = Array.isArray(cabinetsQuery.data)
      ? (cabinetsQuery.data as any[])
      : []
    const top = list.find((c) => c?.id === latestActiveCabinetId)
    if (!top) return null
    // tenuresQuery에서 이미 국가 전체 재임을 받았으므로 별도 cabinet-tenures 쿼리 없이 재사용
    const allTenures = Array.isArray(tenuresQuery.data)
      ? (tenuresQuery.data as any[])
      : []
    const headTenureId = top.headTenure?.id ?? null
    const scopeStart = top.headTenure?.startDate?.slice(0, 10) ?? null
    const scopeEnd = top.headTenure?.endDate?.slice(0, 10) ?? null
    const ministers = allTenures.filter((t) => {
      if (headTenureId && t.id === headTenureId) return false
      if (t.cabinetId) return t.cabinetId === latestActiveCabinetId
      if (!t.administrationDepartmentId) return false
      const start = t.startDate?.slice(0, 10) ?? null
      const end = t.endDate?.slice(0, 10) ?? null
      if (!start || !scopeStart) return false
      const startsBeforeScopeEnds = !scopeEnd || start <= scopeEnd
      const endsAfterScopeStarts = !end || end >= scopeStart
      return startsBeforeScopeEnds && endsAfterScopeStarts
    })
    // 정당 분포 — minister.person.partyMemberships 기반(없으면 빈)
    const partyMap = new Map<
      string,
      { partyId: string | null; partyName: string; count: number; color?: string | null }
    >()
    for (const m of ministers) {
      const memberships = m.person?.partyMemberships ?? m.partyMemberships ?? []
      const active = (Array.isArray(memberships) ? memberships : []).find(
        (pm: any) => pm.endDate == null || new Date(pm.endDate).getTime() > Date.now(),
      )
      const partyId = active?.partyId ?? active?.party?.id ?? null
      const partyName = active?.party?.name ?? active?.partyName ?? '무소속'
      const key = partyId ?? `__noparty:${partyName}`
      const prev = partyMap.get(key)
      if (prev) prev.count++
      else
        partyMap.set(key, {
          partyId,
          partyName,
          count: 1,
          color: active?.party?.color ?? null,
        })
    }
    const partyDistribution = [...partyMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    // 한 인물이 여러 자리를 겸직하면 tenure가 여러 개 — 중복 카운트 방지를 위해 unique person id로 집계.
    const uniquePersonIds = new Set<string>()
    for (const m of ministers) {
      const id = m.person?.id ?? m.personId
      if (typeof id === 'string' && id) uniquePersonIds.add(id)
    }
    const cabinetParties = Array.isArray(top.politicalParties)
      ? top.politicalParties
          .filter((cp: any) => cp?.party?.id)
          .map((cp: any) => ({
            partyId: String(cp.party.id),
            partyName: String(
              cp.party.shortName?.trim() || cp.party.name || '정당',
            ),
            role: String(cp.role ?? 'LEADING'),
            color: cp.party.brandColor ?? null,
          }))
      : []
    return {
      cabinetId: top.id,
      name: top.name ?? '현 행정부',
      startDate: top.headTenure?.startDate ?? null,
      ministerCount: uniquePersonIds.size,
      partyDistribution,
      cabinetParties,
    }
  }, [latestActiveCabinetId, cabinetsQuery.data, tenuresQuery.data])

  const { nextElection, recentElection } = useMemo<{
    nextElection: ElectionSummary | null
    recentElection: ElectionSummary | null
  }>(() => {
    const raw = Array.isArray(electionsQuery.data)
      ? (electionsQuery.data as any[])
      : []
    // 현대 국가 대시보드의 최근·예정 선거는 현대 국가 직속 선거만 대상으로 한다 (1907년 제국 선거 혼입 방지)
    const list =
      country?.type === 'modern'
        ? raw.filter((e) => !e?.historicalCountryId)
        : raw
    const now = Date.now()
    const valid = list
      .filter((e) => e.pollDate)
      .map((e) => ({ raw: e, t: new Date(e.pollDate).getTime() }))
      .filter((x) => Number.isFinite(x.t))
    const future = valid
      .filter((x) => x.t >= now)
      .sort((a, b) => a.t - b.t)
    const past = valid.filter((x) => x.t < now).sort((a, b) => b.t - a.t)
    const toSummary = (e: any): ElectionSummary => ({
      id: e.id,
      name: e.name,
      electionType: e.electionType,
      pollDate: e.pollDate,
    })
    return {
      nextElection: future[0] ? toSummary(future[0].raw) : null,
      recentElection: past[0] ? toSummary(past[0].raw) : null,
    }
  }, [electionsQuery.data, country?.type])

  /**
   * 기록 완성도 — 이 나라에 어떤 기록 축이 비어 있는가.
   *
   * 예전 모수는 country 테이블 10개 필드(정식 국호·수도·좌표…)였다. 실측하니 71개국 중
   * 69개국이 똑같이 6/10이었고 비어 있는 4개 항목까지 전부 같았다(정식 국호 0/71,
   * 수도 0/71, 좌표 0/71, 국기 이미지 2/71). 어느 나라를 열어도 같은 화면이라
   * "이 나라에 뭐가 없나"를 전혀 답하지 못했다. 모수를 이 나라의 기록 축으로 바꾼다.
   */
  const completeness = useMemo(() => {
    const fields: CompletenessField[] = country
      ? [
          {
            key: 'politicalSystem',
            label: '정체',
            filled: politicalSystemCount > 0,
            target: 'government',
            governmentSubTab: 'system',
          },
          {
            key: 'cabinet',
            label: '행정부',
            filled: currentCabinet != null || cabinetList.length > 0,
            target: 'government',
            governmentSubTab: 'cabinets',
          },
          {
            key: 'ministers',
            label: '각료',
            filled:
              (currentCabinet?.ministerCount ?? 0) > 0 || hasAnyMinisterRecord,
            target: 'government',
            governmentSubTab: 'cabinets',
          },
          {
            key: 'departments',
            label: '중앙부처',
            filled: departmentCount > 0,
            target: 'government',
            governmentSubTab: 'ministries',
          },
          {
            key: 'military',
            label: '군사 조직',
            filled: militaryCount > 0,
            target: 'government',
            governmentSubTab: 'military',
          },
          {
            key: 'persons',
            label: '인물',
            filled: personCount > 0,
            target: 'persons',
          },
          {
            key: 'events',
            label: '사건',
            filled: eventCount > 0,
            target: 'events',
          },
          {
            key: 'elections',
            label: '선거',
            filled: nextElection != null || recentElection != null || electionCount > 0,
            target: 'elections',
          },
          {
            key: 'laws',
            label: '법령',
            filled: lawCount > 0,
            target: 'laws',
          },
          {
            key: 'ethnicity',
            label: '민족',
            filled: ethnicityCount > 0,
            target: 'ethnicity',
          },
          {
            key: 'historical',
            label: '과거 국가',
            filled: historicalCountryCount > 0,
            target: 'historical',
          },
          {
            key: 'regions',
            label: '행정구역',
            filled: cityCount > 0,
            target: 'regions',
          },
          {
            key: 'treaties',
            label: '조약',
            filled: treatyCount > 0,
            target: 'treaty',
          },
        ]
      : []
    const filled = fields.filter((field) => field.filled).length
    const missing = fields.filter((field) => !field.filled)
    return { filled, total: fields.length, missing }
  }, [
    country,
    politicalSystemCount,
    currentHeads,
    hasAnyHeadRecord,
    currentCabinet,
    cabinetList.length,
    hasAnyMinisterRecord,
    departmentCount,
    militaryCount,
    personCount,
    eventCount,
    nextElection,
    recentElection,
    electionCount,
    lawCount,
    ethnicityCount,
    historicalCountryCount,
    cityCount,
    treatyCount,
  ])

  // 라벨이 "갱신"인 만큼 모든 엔티티의 updatedAt / createdAt 중 최신을 사용.
  const lastUpdatedAt = useMemo<string | null>(() => {
    const treatyRows = Array.isArray(treatiesQuery.data)
      ? treatiesQuery.data
      : ((treatiesQuery.data as { data?: unknown[] } | undefined)?.data ?? [])
    const sources: unknown[][] = [
      persons as unknown[],
      eventsQuery.data as unknown[],
      administrationQuery.data as unknown[],
      cabinetsQuery.data as unknown[],
      politicalSystemsQuery.data as unknown[],
      tenuresQuery.data as unknown[],
      electionsQuery.data as unknown[],
      lawsQuery.data as unknown[],
      ethnicityQuery.data as unknown[],
      treatyRows as unknown[],
      citiesQuery.data as unknown[],
    ]
    let max = 0
    for (const list of sources) {
      if (!Array.isArray(list)) continue
      for (const item of list) {
        const rec = item as {
          updatedAt?: string
          updated_at?: string
          createdAt?: string
          created_at?: string
        } | null
        const ts =
          rec?.updatedAt ?? rec?.updated_at ?? rec?.createdAt ?? rec?.created_at
        if (!ts) continue
        const t = new Date(ts).getTime()
        if (Number.isFinite(t) && t > max) max = t
      }
    }
    return max > 0 ? new Date(max).toISOString() : null
  }, [
    persons,
    eventsQuery.data,
    administrationQuery.data,
    cabinetsQuery.data,
    politicalSystemsQuery.data,
    tenuresQuery.data,
    electionsQuery.data,
    lawsQuery.data,
    ethnicityQuery.data,
    treatiesQuery.data,
    citiesQuery.data,
  ])

  const loading = {
    persons: personsQuery.isLoading,
    military: allMilitaryUnitsQuery.isLoading,
    events: eventsQuery.isLoading,
    administration:
      administrationQuery.isLoading ||
      cabinetsQuery.isLoading ||
      politicalSystemsQuery.isLoading,
    cities: citiesQuery.isLoading,
    tenures: tenuresQuery.isLoading,
    activity: personsQuery.isLoading || eventsQuery.isLoading,
    cabinets: cabinetsQuery.isLoading || tenuresQuery.isLoading,
    elections: electionsQuery.isLoading,
    laws: lawsQuery.isLoading,
    ethnicity: ethnicityQuery.isLoading,
    treaties: treatiesQuery.isLoading,
    continent: allCountriesQuery.isLoading,
  }

  const isLoading =
    loading.persons ||
    loading.events ||
    loading.administration ||
    loading.cities ||
    loading.tenures

  const executiveTimeline = useMemo<ExecutiveTimelineItem[]>(() => {
    const tenures = (tenuresQuery.data ?? []) as any[]
    const defaultOrder = country?.defaultNameDisplayOrder ?? null
    const parseSignedYear = (
      iso?: string | null,
      era?: string | null,
      yr?: number | null,
    ): number | null => {
      if (yr != null && Number.isFinite(Number(yr)) && Number(yr) !== 0) {
        const abs = Math.abs(Number(yr))
        return era === 'BC' || Number(yr) < 0 ? -abs : abs
      }
      if (!iso || typeof iso !== 'string') return null
      const m = /^(-?)(\d{1,6})/.exec(iso.trim())
      if (!m) return null
      const n = Number(m[2])
      if (!Number.isFinite(n) || n === 0) return null
      return m[1] === '-' || era === 'BC' ? -n : n
    }

    const out: ExecutiveTimelineItem[] = []
    for (const t of tenures) {
      /*
       * 역사 국가가 걸린 재임도 넣는다 — 재임은 현대·역사 국가 두 칸을 다 채우는 규약이라(독일 수반 28건 전부가
       * 독일 제국·바이마르 등에도 걸림) 이걸 빼면 역대 연표가 거의 모든 나라에서 비었다. '소멸한 정체의 미종료 행이
       * 현직으로 둔갑'하는 문제는 현직 수반(currentHeads)만의 일이라 그쪽 필터만 남긴다.
       */
      const pt =
        t?.positionType ??
        t?.positionDefinition?.positionType ??
        t?.position?.positionType
      if (pt !== 'HEAD_OF_STATE' && pt !== 'HEAD_OF_GOVERNMENT') continue
      const sY = parseSignedYear(t.startDate, t.startEra, t.startYear)
      if (sY == null) continue
      const eY =
        t.endDate || t.endYear != null
          ? parseSignedYear(t.endDate, t.endEra, t.endYear)
          : null
      const order = t.person?.country?.defaultNameDisplayOrder ?? defaultOrder
      const personName =
        t.regnalName?.trim() ||
        getPersonDisplayName(
          {
            name: t.person?.name ?? '',
            surname: t.person?.surname,
            middleName: t.person?.middleName,
            nameDisplayOrder: t.person?.nameDisplayOrder ?? null,
            country: t.person?.country ?? undefined,
          },
          order != null ? { countryDefaultNameDisplayOrder: order } : undefined,
        ) ||
        t.person?.name ||
        '수반'
      const memberships =
        t.person?.partyMemberships ?? t.partyMemberships ?? []
      const activeParty = (Array.isArray(memberships) ? memberships : [])[0]
      const rawColor =
        t.electionCandidacy?.party?.brandColor ??
        activeParty?.party?.brandColor ??
        activeParty?.party?.color ??
        null
      const partyColor =
        typeof rawColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(rawColor)
          ? rawColor
          : null
      const partyName =
        t.electionCandidacy?.party?.shortName ??
        t.electionCandidacy?.party?.name ??
        activeParty?.party?.shortName ??
        activeParty?.party?.name ??
        null
      out.push({
        recordId: String(t.id),
        personId: t.person?.id ?? t.personId ?? null,
        personName,
        profileImageUrl:
          t.person?.profileImageUrl ?? t.person?.profile_image_url ?? null,
        title:
          t.title?.trim() ?? t.positionDefinition?.title?.trim() ?? null,
        axis: pt,
        ordinal: typeof t.ordinal === 'number' ? t.ordinal : null,
        startYear: sY,
        endYear: eY,
        partyName,
        partyColor,
        isHistoricalPolity: Boolean(t.historicalCountryId),
      })
    }
    return out.sort((a, b) => a.startYear - b.startYear)
  }, [tenuresQuery.data, country?.type, country?.defaultNameDisplayOrder])

  const personSpotlight = useMemo<PersonSpotlightSummary>(() => {
    const defaultOrder = country?.defaultNameDisplayOrder ?? null
    const rulerPersonIds = new Set<string>()
    const ministerPersonIds = new Set<string>()
    for (const t of allTenureRows) {
      const pid = t?.person?.id ?? t?.personId
      if (!pid) continue
      const pt =
        t?.positionType ??
        t?.positionDefinition?.positionType ??
        t?.position?.positionType
      if (HEAD_TYPES.has(pt)) rulerPersonIds.add(pid)
      else ministerPersonIds.add(pid)
    }

    let rulersCnt = 0
    let ministersCnt = 0
    let figuresCnt = 0
    const eraMap = new Map<string, number>()

    const scored = (persons as any[]).map((personRow) => {
      const id = String(personRow.id ?? '')
      const roleKind: 'ruler' | 'minister' | 'figure' = rulerPersonIds.has(id)
        ? 'ruler'
        : ministerPersonIds.has(id)
          ? 'minister'
          : 'figure'
      if (roleKind === 'ruler') rulersCnt += 1
      else if (roleKind === 'minister') ministersCnt += 1
      else figuresCnt += 1

      const polityName = personPolityById.get(id) ?? null
      const eraLabel = polityName || '현대 본국'
      eraMap.set(eraLabel, (eraMap.get(eraLabel) ?? 0) + 1)

      const order = personRow.country?.defaultNameDisplayOrder ?? defaultOrder
      const name =
        getPersonDisplayName(
          {
            name: personRow.name ?? '',
            surname: personRow.surname,
            middleName: personRow.middleName,
            nameDisplayOrder: personRow.nameDisplayOrder ?? null,
            country: personRow.country ?? undefined,
          },
          order != null ? { countryDefaultNameDisplayOrder: order } : undefined,
        ) ||
        personRow.name ||
        '이름 없음'
      const img = personRow.profileImageUrl ?? personRow.profile_image_url ?? null
      const rawBirthYr =
        personRow.birthYear != null
          ? Number(personRow.birthYear)
          : typeof personRow.birthDate === 'string'
            ? Number(/^(-?\d{1,4})/.exec(personRow.birthDate)?.[1] ?? NaN)
            : NaN
      const modernEraBonus = !polityName
        ? 3
        : Number.isFinite(rawBirthYr) && rawBirthYr >= 1800
          ? 3
          : 0
      const score =
        modernEraBonus +
        (img ? 10 : 0) +
        (roleKind === 'ruler' ? 12 : roleKind === 'minister' ? 6 : 2)
      return {
        item: {
          id,
          name,
          subLabel: formatPersonSubLabel(
            personRow,
            polityName,
            country?.name ?? null,
          ),
          profileImageUrl: img,
          polityName,
          roleKind,
        } satisfies PersonSpotlightItem,
        score,
        birthSort: Number.isFinite(rawBirthYr) ? rawBirthYr : -9999,
      }
    })

    scored.sort(
      (left, right) =>
        right.score - left.score || right.birthSort - left.birthSort,
    )
    const eraSlices = [...eraMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, count]) => ({ key: label, label, count }))

    const featured: PersonSpotlightItem[] = []
    const seenPersonKeys = new Set<string>()
    const hasNonRulers = ministersCnt + figuresCnt > 0
    let rulerPicked = 0
    for (const entry of scored) {
      if (featured.length >= 8) break
      if (
        hasNonRulers &&
        entry.item.roleKind === 'ruler' &&
        rulerPicked >= 5
      ) {
        continue
      }
      const lifespanKey = (entry.item.subLabel ?? '').replace(/[^0-9–-]/g, '')
      const dedupKey = `${entry.item.name.replace(/\s+/g, '')}::${lifespanKey}`
      if (seenPersonKeys.has(dedupKey)) continue
      seenPersonKeys.add(dedupKey)
      if (entry.item.roleKind === 'ruler') rulerPicked += 1
      featured.push(entry.item)
    }
    if (featured.length < 8) {
      for (const entry of scored) {
        if (featured.length >= 8) break
        const lifespanKey = (entry.item.subLabel ?? '').replace(/[^0-9–-]/g, '')
        const dedupKey = `${entry.item.name.replace(/\s+/g, '')}::${lifespanKey}`
        if (seenPersonKeys.has(dedupKey)) continue
        seenPersonKeys.add(dedupKey)
        featured.push(entry.item)
      }
    }

    return {
      featured,
      roleCounts: {
        rulers: rulersCnt,
        ministers: ministersCnt,
        figures: figuresCnt,
      },
      eraSlices,
    }
  }, [
    persons,
    allTenureRows,
    personPolityById,
    country?.name,
    country?.defaultNameDisplayOrder,
  ])

  const milestoneEvents = useMemo<MilestoneEventItem[]>(() => {
    const rawList = (eventsQuery.data ?? []) as any[]
    const maxReasonableYear = new Date().getFullYear() + 10
    const MAJOR_TURNING_TYPES = new Set([
      'WAR',
      'REVOLUTION',
      'COUP',
      'INDEPENDENCE',
      'FOUNDING',
      'REFORM',
    ])
    const currentName = country?.name?.trim() ?? ''
    const isModernCountry = country?.type === 'modern'
    const candidates: Array<{
      item: MilestoneEventItem
      weight: number
      century: number
    }> = []
    for (const ev of rawList) {
      if (!ev?.id || !ev?.title) continue
      const matched = /^(-?)(\d{1,6})/.exec(String(ev.startDate ?? ''))
      const yr =
        ev.startYear != null
          ? ev.startEra === 'BC'
            ? -Math.abs(Number(ev.startYear))
            : Number(ev.startYear)
          : matched
            ? matched[1] === '-'
              ? -Number(matched[2])
              : Number(matched[2])
            : null
      if (yr == null || !Number.isFinite(yr) || yr === 0) continue
      if (yr > maxReasonableYear) continue
      const yearLabel = yr < 0 ? `BC ${Math.abs(yr)}` : `${yr}년`
      const polityName = ev.historicalCountry?.name?.trim() ?? null
      const century =
        yr < 0 ? -Math.ceil(Math.abs(yr) / 100) : Math.ceil(yr / 100)
      const titleStr = String(ev.title).trim()
      const evType = String(ev.type ?? '')
      const domStr = String(ev.domain ?? 'OTHER')
      const isDirectModern = !ev.historicalCountryId && ev.countryId === countryId
      const hasCountryName =
        currentName.length >= 2 && titleStr.includes(currentName)
      const typeScore =
        evType === 'INDEPENDENCE' || evType === 'FOUNDING'
          ? 11
          : MAJOR_TURNING_TYPES.has(evType)
            ? 8
            : evType === 'TREATY'
              ? 4
              : 1
      const modernEraBoost = isModernCountry
        ? (isDirectModern ? 5 : 0) +
          (yr >= 1900 ? 4 : yr >= 1770 ? 2.5 : -3)
        : 0
      const weight =
        (ev.parentId ? 0 : 5) +
        typeScore +
        (hasCountryName ? 6 : 0) +
        modernEraBoost +
        (domStr === 'POLITICS' || domStr === 'MILITARY' || domStr === 'DIPLOMACY'
          ? 2
          : domStr === 'ECONOMY'
            ? 1.5
            : 0)
      candidates.push({
        item: {
          id: String(ev.id),
          title: titleStr,
          yearLabel,
          signedYear: yr,
          domain: domStr,
          polityName,
          eventTypeLabel: resolveEventTurningLabel(evType, domStr),
        },
        weight,
        century,
      })
    }
    candidates.sort(
      (left, right) =>
        right.weight - left.weight ||
        right.item.signedYear - left.item.signedYear,
    )
    const TARGET_COUNT = 5
    const hasPost1850 =
      candidates.filter((cand) => cand.item.signedYear >= 1850).length >= 3
    const picked: MilestoneEventItem[] = []
    const pickedIds = new Set<string>()
    const perCenturyCount = new Map<number, number>()
    const perHalfGenerationCount = new Map<number, number>()
    let preModernUsed = 0
    for (const cand of candidates) {
      if (picked.length >= TARGET_COUNT) break
      if (isModernCountry && hasPost1850 && cand.item.signedYear < 1750) {
        if (preModernUsed >= 1) continue
      }
      const used = perCenturyCount.get(cand.century) ?? 0
      if (used >= 2) continue
      const bucket15Yr = Math.floor(cand.item.signedYear / 15)
      if ((perHalfGenerationCount.get(bucket15Yr) ?? 0) >= 1) continue
      perCenturyCount.set(cand.century, used + 1)
      perHalfGenerationCount.set(bucket15Yr, 1)
      if (cand.item.signedYear < 1750) preModernUsed += 1
      pickedIds.add(cand.item.id)
      picked.push(cand.item)
    }
    if (picked.length < TARGET_COUNT) {
      for (const cand of candidates) {
        if (picked.length >= TARGET_COUNT) break
        if (pickedIds.has(cand.item.id)) continue
        pickedIds.add(cand.item.id)
        picked.push(cand.item)
      }
    }
    return picked.sort((left, right) => left.signedYear - right.signedYear)
  }, [eventsQuery.data, countryId, country?.name, country?.type])

  const civicSnapshot = useMemo<CivicInstitutionalSnapshot>(() => {
    const rawElections = Array.isArray(electionsQuery.data)
      ? (electionsQuery.data as any[])
      : []
    // 현대 국가 의회·투표율 스냅샷은 현대 국가 직속 선거만 집계해 1900년대 제국 선거와 섞이지 않게 한다
    const elections =
      country?.type === 'modern'
        ? rawElections.filter((el) => !el?.historicalCountryId)
        : rawElections
    const byYearTurnout = new Map<number, { sum: number; cnt: number }>()
    const byElType = new Map<string, number>()
    let tSum = 0
    let tCnt = 0
    for (const el of elections) {
      if (el?.electionType) {
        byElType.set(el.electionType, (byElType.get(el.electionType) ?? 0) + 1)
      }
      const tv = Number(el?.voterTurnoutPercent)
      const ym = /^(\d{4})/.exec(String(el?.pollDate ?? ''))
      if (
        el?.voterTurnoutPercent != null &&
        String(el.voterTurnoutPercent).trim() !== '' &&
        Number.isFinite(tv) &&
        tv > 0 &&
        ym
      ) {
        const y = Number(ym[1])
        const cur = byYearTurnout.get(y) ?? { sum: 0, cnt: 0 }
        cur.sum += tv
        cur.cnt += 1
        byYearTurnout.set(y, cur)
        tSum += tv
        tCnt += 1
      }
    }
    const turnoutSparkPoints = [...byYearTurnout.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, agg]) => ({
        year,
        value: Math.round((agg.sum / agg.cnt) * 10) / 10,
      }))

    const parseDocYear = (
      iso?: string | null,
      era?: string | null,
      yr?: number | null,
    ): number => {
      if (yr != null && Number.isFinite(Number(yr)) && Number(yr) !== 0) {
        const abs = Math.abs(Number(yr))
        return era === 'BC' || Number(yr) < 0 ? -abs : abs
      }
      if (!iso || typeof iso !== 'string') return -99999
      const matched = /^(-?)(\d{1,6})/.exec(iso.trim())
      if (!matched) return -99999
      const num = Number(matched[2])
      if (!Number.isFinite(num) || num === 0) return -99999
      return matched[1] === '-' || era === 'BC' ? -num : num
    }

    const normalizeTitleKey = (rawTitle: string): string =>
      rawTitle
        .replace(/\s*\([^)]*\)\s*/g, '')
        .replace(/\s+/g, '')
        .toLowerCase()

    const rawTreaties =
      (treatiesQuery.data as { items?: any[]; data?: any[] } | undefined)
        ?.items ??
      (treatiesQuery.data as { items?: any[]; data?: any[] } | undefined)
        ?.data ??
      []
    const sortedTreaties = [
      ...(Array.isArray(rawTreaties) ? rawTreaties : []),
    ].sort((left: any, right: any) => {
      const leftMod = left?.historicalCountryId ? 0 : 1
      const rightMod = right?.historicalCountryId ? 0 : 1
      if (leftMod !== rightMod) return rightMod - leftMod
      return (
        parseDocYear(right?.signDate ?? right?.effectiveDate) -
        parseDocYear(left?.signDate ?? left?.effectiveDate)
      )
    })
    const seenTreatyKeys = new Set<string>()
    const recentTreaties: CivicInstitutionalSnapshot['recentTreaties'] = []
    for (const tr of sortedTreaties) {
      if (recentTreaties.length >= 5) break
      const titleText = String(tr.name ?? tr.title ?? '조약').trim()
      const yearLabel = formatActivityYearFromIso(
        tr.signDate ?? tr.effectiveDate,
      )
      const dedupKey = `${normalizeTitleKey(titleText)}::${yearLabel ?? ''}`
      if (seenTreatyKeys.has(dedupKey)) continue
      seenTreatyKeys.add(dedupKey)
      recentTreaties.push({
        id: String(tr.id),
        name: titleText,
        type: String(tr.type ?? 'OTHER'),
        yearLabel,
      })
    }

    const rawLaws = Array.isArray(lawsQuery.data)
      ? (lawsQuery.data as any[])
      : []
    const sortedLaws = [...rawLaws].sort((left: any, right: any) => {
      const leftMod = left?.historicalCountryId ? 0 : 1
      const rightMod = right?.historicalCountryId ? 0 : 1
      if (leftMod !== rightMod) return rightMod - leftMod
      const leftY = parseDocYear(
        left?.enactedDate ?? left?.promulgatedDate ?? left?.startDate,
        left?.era,
        left?.year,
      )
      const rightY = parseDocYear(
        right?.enactedDate ?? right?.promulgatedDate ?? right?.startDate,
        right?.era,
        right?.year,
      )
      return rightY - leftY
    })
    const seenLawKeys = new Set<string>()
    const recentLaws: CivicInstitutionalSnapshot['recentLaws'] = []
    for (const lw of sortedLaws) {
      if (recentLaws.length >= 5) break
      const titleText = String(lw.title ?? lw.name ?? '법령').trim()
      const dedupKey = normalizeTitleKey(titleText)
      if (seenLawKeys.has(dedupKey)) continue
      seenLawKeys.add(dedupKey)
      recentLaws.push({
        id: String(lw.id),
        title: titleText,
        yearLabel: formatActivityYearFromIso(
          lw.enactedDate ?? lw.promulgatedDate ?? lw.startDate,
          lw.era,
          lw.year,
        ),
      })
    }

    const rawEth = Array.isArray(ethnicityQuery.data)
      ? (ethnicityQuery.data as any[])
      : []
    const ethnicGroups = rawEth.slice(0, 8).map((eth: any) => ({
      id: String(eth.id),
      name: String(eth.name ?? '').trim(),
      nameLocal: eth.nameLocal ? String(eth.nameLocal).trim() : null,
    }))

    const sysList = Array.isArray(politicalSystemsQuery.data)
      ? (politicalSystemsQuery.data as any[])
      : []
    const modernSysPool =
      country?.type === 'modern'
        ? sysList.filter((s) => !s?.historicalCountryId)
        : sysList
    const activeSys =
      modernSysPool.find((s) => !s.endDate && s.endYear == null) ??
      modernSysPool[0] ??
      null

    const parseSysYear = (
      iso?: string | null,
      era?: string | null,
      yr?: number | null,
    ): number | null => {
      if (yr != null && Number.isFinite(Number(yr)) && Number(yr) !== 0) {
        const abs = Math.abs(Number(yr))
        return era === 'BC' || Number(yr) < 0 ? -abs : abs
      }
      if (!iso || typeof iso !== 'string') return null
      const m = /^(-?)(\d{1,6})/.exec(iso.trim())
      if (!m) return null
      const n = Number(m[2])
      if (!Number.isFinite(n) || n === 0) return null
      return m[1] === '-' || era === 'BC' ? -n : n
    }

    /* 헌정 시대 띠도 역대 기록 — 역사 국가 시절 정체(비스마르크 헌법 등)를 빼지 않는다(역대 연표와 같은 이유) */
    const regimeEras: RegimeEraBand[] = sysList
      .map((s) => {
        const sY = parseSysYear(s.startDate, s.startEra, s.startYear)
        if (sY == null) return null
        const eY =
          s.endDate || s.endYear != null
            ? parseSysYear(s.endDate, s.endEra, s.endYear)
            : null
        const formLabel = s.governmentForm
          ? (GOVERNMENT_FORM_LABEL[
              s.governmentForm as keyof typeof GOVERNMENT_FORM_LABEL
            ] ?? String(s.governmentForm))
          : null
        const label =
          String(s.name ?? s.title ?? formLabel ?? '헌정 체제').trim()
        return {
          id: String(s.id),
          label,
          governmentFormLabel: formLabel,
          startYear: sY,
          endYear: eY,
        }
      })
      .filter((x): x is RegimeEraBand => x !== null)
      .sort((a, b) => a.startYear - b.startYear)

    const nowMs = Date.now()
    const legTypes = new Set([
      'PARLIAMENTARY_CONSTITUENCY',
      'PARLIAMENTARY_PROPORTIONAL',
      'PARLIAMENTARY',
      'LEGISLATIVE',
      'GENERAL',
      'LOWER_HOUSE',
      'UPPER_HOUSE',
    ])
    const sortedPastLeg = elections
      .filter((el) => {
        if (!el?.id || !legTypes.has(String(el.electionType))) return false
        if (el.status === 'CANCELLED' || el.status === 'SCHEDULED') return false
        const t = Date.parse(String(el.pollDate ?? ''))
        return Number.isFinite(t) && t <= nowMs + 86_400_000
      })
      .sort(
        (a, b) =>
          Date.parse(String(b.pollDate ?? '')) -
          Date.parse(String(a.pollDate ?? '')),
      )
    const pickLatestParallelGroup = (pool: any[]): string[] => {
      if (pool.length === 0) return []
      const anchor = pool[0]!
      const anchorId = String(anchor.id)
      const anchorType = String(anchor.electionType)
      const isParallelCandidate =
        anchorType === 'PARLIAMENTARY_CONSTITUENCY' ||
        anchorType === 'PARLIAMENTARY_PROPORTIONAL'
      if (!isParallelCandidate) return [anchorId]
      const anchorChamber = anchor.chamberId ?? null
      const anchorOrd = anchor.convocationOrdinal ?? null
      const anchorDay = String(anchor.pollDate ?? '').slice(0, 10)
      const companion = pool.find((other) => {
        if (!other?.id || String(other.id) === anchorId) return false
        const otherType = String(other.electionType)
        if (
          otherType !== 'PARLIAMENTARY_CONSTITUENCY' &&
          otherType !== 'PARLIAMENTARY_PROPORTIONAL'
        ) {
          return false
        }
        if (otherType === anchorType) return false
        if ((other.chamberId ?? null) !== anchorChamber) return false
        if (anchorOrd != null && other.convocationOrdinal === anchorOrd) {
          return true
        }
        return Boolean(
          anchorDay && String(other.pollDate ?? '').slice(0, 10) === anchorDay,
        )
      })
      return companion ? [anchorId, String(companion.id)] : [anchorId]
    }

    const activeLowerChamberId: string | null =
      activeSys?.lowerChamberId ?? null
    const activeUpperChamberId: string | null =
      activeSys?.legislatureType === 'BICAMERAL'
        ? (activeSys?.upperChamberId ?? null)
        : null

    const lowerPool = sortedPastLeg.filter((el) => {
      if (String(el.electionType) === 'UPPER_HOUSE') return false
      if (el.chamber?.role === 'UPPER') return false
      if (activeUpperChamberId && el.chamberId === activeUpperChamberId) {
        return false
      }
      if (activeLowerChamberId && el.chamberId) {
        return el.chamberId === activeLowerChamberId
      }
      return true
    })

    const upperPool =
      activeSys?.legislatureType === 'BICAMERAL'
        ? sortedPastLeg.filter((el) => {
            if (activeUpperChamberId) {
              return el.chamberId === activeUpperChamberId
            }
            return (
              el.chamber?.role === 'UPPER' ||
              String(el.electionType) === 'UPPER_HOUSE'
            )
          })
        : []

    const latestLegislativeElectionIds = pickLatestParallelGroup(
      lowerPool.length > 0 ? lowerPool : sortedPastLeg,
    )
    const latestUpperElectionIds = pickLatestParallelGroup(upperPool)
    const latestLegislativeElectionId =
      latestLegislativeElectionIds[0] ?? null

    return {
      turnoutSparkPoints,
      avgTurnout: tCnt > 0 ? Math.round((tSum / tCnt) * 10) / 10 : null,
      electionTypeCounts: [...byElType.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      latestLegislativeElectionId,
      latestLegislativeElectionIds,
      latestUpperElectionIds,
      regimeEras,
      recentTreaties,
      recentLaws,
      ethnicGroups,
      activePolitySeats: activeSys
        ? {
            name: activeSys.name ?? activeSys.title ?? null,
            lowerName: activeSys.lowerHouseName ?? null,
            lowerSeats:
              activeSys.lowerHouseSeats != null
                ? Number(activeSys.lowerHouseSeats)
                : null,
            upperName: activeSys.upperHouseName ?? null,
            upperSeats:
              activeSys.upperHouseSeats != null
                ? Number(activeSys.upperHouseSeats)
                : null,
            governmentForm: activeSys.governmentForm ?? null,
            stateStructure: activeSys.stateStructure ?? null,
            legislatureType: activeSys.legislatureType ?? null,
            partySystem: activeSys.partySystem ?? null,
            constitutionLaw: activeSys.constitutionLaw?.id
              ? {
                  id: String(activeSys.constitutionLaw.id),
                  name: String(activeSys.constitutionLaw.name ?? '헌법'),
                }
              : null,
            foundingEvent: activeSys.foundingEvent?.id
              ? {
                  id: String(activeSys.foundingEvent.id),
                  title: String(activeSys.foundingEvent.title ?? '출범 사건'),
                }
              : null,
          }
        : null,
    }
  }, [
    country?.type,
    electionsQuery.data,
    treatiesQuery.data,
    lawsQuery.data,
    ethnicityQuery.data,
    politicalSystemsQuery.data,
  ])

  const peerCountries = useMemo<PeerCountryMetric[]>(() => {
    const rawList = Array.isArray(allCountriesQuery.data)
      ? (allCountriesQuery.data as any[])
      : ((allCountriesQuery.data as { data?: any[] } | undefined)?.data ?? [])
    return rawList
      .filter((c) => c?.id && c?.name)
      .map((c) => {
        const popRaw = c.population
        const pop =
          popRaw != null && String(popRaw).trim() !== '' && Number.isFinite(Number(popRaw))
            ? Number(popRaw)
            : null
        const areaRaw = c.areaSqKm
        const area =
          areaRaw != null && String(areaRaw).trim() !== '' && Number.isFinite(Number(areaRaw))
            ? Number(areaRaw)
            : null
        return {
          id: String(c.id),
          name: String(c.name),
          flagEmoji: c.flagEmoji ? String(c.flagEmoji) : null,
          continentId: c.continentId ? String(c.continentId) : null,
          population: pop,
          areaSqKm: area,
        }
      })
  }, [allCountriesQuery.data])

  return {
    personCount,
    militaryCount,
    highCommandCount,
    militaryBranchBreakdown,
    eventDomainBreakdown,
    eventCenturyDomainCounts,
    warSummary,
    executiveTimeline,
    personSpotlight,
    milestoneEvents,
    civicSnapshot,
    peerCountries,
    eventCount,
    historicalCountryCount,
    administrationCount,
    cityCount,
    treatyCount,
    electionCount,
    modernElectionCount,
    historicalElectionCount,
    historicalHeadCount,
    lawCount,
    ethnicityCount,
    deltaCounts,
    recentPersons,
    recentActivity,
    currentHeads,
    completeness,
    eventCenturyCounts,
    calendarEvents,
    continentComparison,
    currentCabinet,
    nextElection,
    recentElection,
    lastUpdatedAt,
    isLoading,
    loading,
  }
}
