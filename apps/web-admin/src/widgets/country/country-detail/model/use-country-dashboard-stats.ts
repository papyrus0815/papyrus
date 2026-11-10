import { useMemo } from 'react'

import { useQueries } from '@tanstack/react-query'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { politicalSystemKeys } from '@/entities/political-system/api'
import {
  formatPeriod as formatPoliticalSystemPeriod,
  GOVERNMENT_FORM_LABEL,
  headOfGovernmentTitleOf,
  headOfStateTitleOf,
} from '@/entities/political-system/model/political-system'
import { eventKeys } from '@/shared/api/event-query-keys'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { cityApi } from '@/shared/api/city'
import { getAllCountries } from '@/shared/api/countries'
import { getElections, getLaws } from '@/shared/api/election'
import { ethnicityApi } from '@/shared/api/ethnicity'
import { getAllEventsExhaustive } from '@/shared/api/events'
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
  governmentSubTab?: 'heads' | 'cabinets' | 'ministries' | 'system'
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
}

export interface ElectionSummary {
  id: string
  name: string
  electionType: string
  pollDate: string
}

export interface CountryDashboardStats {
  personCount: number
  militaryCount: number
  eventCount: number
  historicalCountryCount: number
  administrationCount: number
  cityCount: number
  treatyCount: number
  electionCount: number
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
  const picked: RecentActivityItem[] = []

  // 1단계: 최근 7일 내 실제 활동 우선 수집 (묶음당 최대 6건)
  const recentCandidates: RecentActivityItem[] = []
  for (const group of nonEmptyGroups) {
    const recentInGroup = group
      .filter((item) => {
        const ts = new Date(item.createdAt).getTime()
        return Number.isFinite(ts) && ts >= recentCutoff
      })
      .slice(0, 6)
    recentCandidates.push(...recentInGroup)
  }
  recentCandidates.sort(byCreatedAtDesc)
  for (const item of recentCandidates) {
    if (picked.length >= ACTIVITY_FEED_LIMIT) break
    if (!pickedIds.has(item.id)) {
      pickedIds.add(item.id)
      picked.push(item)
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
      if (!pickedIds.has(item.id)) {
        pickedIds.add(item.id)
        picked.push(item)
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
      pickedIds.add(item.id)
      picked.push(item)
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
        queryKey: ['treaties-by-country', countryId],
        queryFn: () => treatyApi.getAll({ countryId, take: 1 }),
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

  // 활성 cabinet 중 가장 최신(headTenure.startDate desc)을 우선 선택하고,
  // 모든 내각이 종료된 국가(프랑스·일본·독일 등 과거 내각만 등록된 경우)에서는 가장 최근 내각으로 폴백한다.
  const latestActiveCabinetId = useMemo<string | null>(() => {
    const list = Array.isArray(cabinetsQuery.data)
      ? (cabinetsQuery.data as any[])
      : []
    if (list.length === 0) return null
    const now = Date.now()
    const active = list.filter((c) => {
      const end = c.headTenure?.endDate
      if (!end) return true
      const t = new Date(end).getTime()
      return !Number.isFinite(t) || t >= now
    })
    const candidates = active.length > 0 ? active : list
    const sorted = [...candidates].sort((a, b) => {
      const da = new Date(a.headTenure?.startDate ?? 0).getTime()
      const db = new Date(b.headTenure?.startDate ?? 0).getTime()
      return db - da
    })
    return (sorted[0] as { id?: string } | undefined)?.id ?? null
  }, [cabinetsQuery.data])

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
  const militaryCount = 0
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
  // 기록 원장의 '행정조직' 축: 중앙부처 + 등록된 내각 + 정체(없으면 수반 재임 기록)을 합산해
  // 내각·정체·역대 수반이 등록된 국가(프랑스·스페인 등)에서 행정조직이 0건으로 빠지지 않게 한다.
  const administrationCount =
    departmentCount + cabinetList.length + politicalSystemCount ||
    executiveHeadTenureCount
  const cityCount = Array.isArray(citiesQuery.data)
    ? citiesQuery.data.length
    : 0
  const electionCount = Array.isArray(electionsQuery.data)
    ? electionsQuery.data.length
    : 0
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
      const subParts = [
        sys.title?.trim() && sys.title.trim() !== formLabel ? sys.title.trim() : null,
        headSummary ? `수장: ${headSummary}` : null,
        periodText !== '기간 미상' ? periodText : null,
        sys.historicalCountry?.name && sys.historicalCountry.name !== currentCountryName
          ? sys.historicalCountry.name
          : null,
      ].filter(Boolean)
      governanceItems.push({
        id: `political-system-${sys.id}`,
        kind: 'political-system',
        category: 'governance',
        refId: sys.id,
        label: formLabel,
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
      const positionType =
        t.positionType ??
        t.positionDefinition?.positionType ??
        t.position?.positionType
      if (!HEAD_TYPES.has(positionType)) return false
      const end = t.endDate ? new Date(t.endDate).getTime() : null
      return end == null || end >= now
    })
    const ordered = [...matches]
    ordered.sort((a, b) => {
      const order = (t: any) =>
        (t.positionType ??
          t.positionDefinition?.positionType ??
          t.position?.positionType) === 'HEAD_OF_STATE'
          ? 0
          : 1
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
        positionType:
          t.positionType ??
          t.positionDefinition?.positionType ??
          t.position?.positionType ??
          'OTHER',
        startDate: t.startDate,
      }
    })
  }, [tenuresQuery.data, country?.defaultNameDisplayOrder])

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
  const eventCenturyCounts = useMemo<
    Array<{ century: number; count: number }>
  >(() => {
    const list = (eventsQuery.data ?? []) as Array<{
      startDate?: string | null
    }>
    const byCentury = new Map<number, number>()
    for (const event of list) {
      const raw = event.startDate
      if (typeof raw !== 'string') continue
      const matched = /^(-?)(\d{1,6})-/.exec(raw)
      if (!matched) continue
      const year = Number(matched[2])
      if (!Number.isFinite(year) || year === 0) continue
      const century =
        matched[1] === '-'
          ? -Math.ceil(year / 100)
          : Math.ceil(year / 100)
      byCentury.set(century, (byCentury.get(century) ?? 0) + 1)
    }
    return [...byCentury.entries()]
      .map(([century, count]) => ({ century, count }))
      .sort((left, right) => left.century - right.century)
  }, [eventsQuery.data])

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
    return {
      cabinetId: top.id,
      name: top.name ?? '현 행정부',
      startDate: top.headTenure?.startDate ?? null,
      ministerCount: uniquePersonIds.size,
      partyDistribution,
    }
  }, [latestActiveCabinetId, cabinetsQuery.data, tenuresQuery.data])

  const { nextElection, recentElection } = useMemo<{
    nextElection: ElectionSummary | null
    recentElection: ElectionSummary | null
  }>(() => {
    const list = Array.isArray(electionsQuery.data)
      ? (electionsQuery.data as any[])
      : []
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
  }, [electionsQuery.data])

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
            key: 'head',
            label: '수반',
            filled: currentHeads.length > 0 || hasAnyHeadRecord,
            target: 'government',
            governmentSubTab: 'heads',
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
    military: false,
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

  return {
    personCount,
    militaryCount,
    eventCount,
    historicalCountryCount,
    administrationCount,
    cityCount,
    treatyCount,
    electionCount,
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
