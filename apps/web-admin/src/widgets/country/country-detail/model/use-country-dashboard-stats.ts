import { useMemo } from 'react'

import { useQueries } from '@tanstack/react-query'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { cityApi } from '@/shared/api/city'
import { getAllCountries } from '@/shared/api/countries'
import { getElections } from '@/shared/api/election'
import { getAllEvents } from '@/shared/api/events'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonsByTenureCountry } from '@/shared/api/persons'
import { treatyApi } from '@/shared/api/treaty'
import { administrationDepartmentsByCountryQueryKey } from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export interface RecentPersonItem {
  id: string
  displayName: string
  createdAt: string
  profileImageUrl?: string | null
}

export type ActivityKind = 'person' | 'event'

export interface RecentActivityItem {
  id: string
  kind: ActivityKind
  refId: string
  label: string
  createdAt: string
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

export interface CompletenessField {
  key: string
  label: string
  filled: boolean
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
  /** 최근 12개월 사건 등록 분포 (가장 오래된 → 최신, 길이 12) */
  monthlyEventCounts: number[]
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
    treaties: boolean
    continent: boolean
  }
}

const HEAD_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

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
    militaryQuery,
    eventsQuery,
    administrationQuery,
    citiesQuery,
    tenuresQuery,
    cabinetsQuery,
    electionsQuery,
    treatiesQuery,
    allCountriesQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ['persons-by-country', countryId],
        queryFn: () => getPersonsByTenureCountry({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        // 백엔드에 국가별 군대 endpoint가 없어 전체 fetch + 클라 필터.
        // staleTime을 길게 두어 다른 국가 진입 시 글로벌 캐시 재사용.
        queryKey: ['military-units'],
        queryFn: () => militaryUnitApi.getAll(),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['events-by-country', countryId],
        queryFn: () => getAllEvents({ countryId, limit: 5000 }),
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
        queryKey: ['tenures-by-country', countryId],
        queryFn: () => personCareerApi.getTenuresByCountry({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['cabinets-by-country', countryId],
        queryFn: () => personCareerApi.getCabinets({ countryId }),
        enabled: Boolean(countryId),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ['elections-by-country', countryId],
        queryFn: () => getElections({ countryId }),
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
    ],
  })

  // 활성 cabinet 중 가장 최신(headTenure.startDate desc)을 명시적으로 선택.
  // API 응답 순서를 가정하지 않고 정렬 후 첫 항목을 사용 — 정렬 보장 없으면 잘못된 cabinet이
  // "현 정부"로 표시될 위험.
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
    if (active.length === 0) return null
    const sorted = [...active].sort((a, b) => {
      const da = new Date(a.headTenure?.startDate ?? 0).getTime()
      const db = new Date(b.headTenure?.startDate ?? 0).getTime()
      return db - da
    })
    return (sorted[0] as { id?: string } | undefined)?.id ?? null
  }, [cabinetsQuery.data])

  const currentCabinetTenuresQuery = useQueries({
    queries: [
      {
        queryKey: ['cabinet-tenures', latestActiveCabinetId],
        queryFn: () =>
          personCareerApi.getTenuresByCabinetId(latestActiveCabinetId!),
        enabled: Boolean(latestActiveCabinetId),
        staleTime: 1000 * 60 * 5,
      },
    ],
  })[0]

  const personCount = personsQuery.data?.length ?? 0
  const militaryCount = Array.isArray(militaryQuery.data)
    ? militaryQuery.data.filter(
        (u) => (u.countryId ?? (u as any).country_id) === countryId,
      ).length
    : 0
  const eventCount = Array.isArray(eventsQuery.data) ? eventsQuery.data.length : 0
  const historicalCountryCount = country?.historicalCountries?.length ?? 0
  const administrationCount = Array.isArray(administrationQuery.data)
    ? administrationQuery.data.length
    : 0
  const cityCount = Array.isArray(citiesQuery.data)
    ? citiesQuery.data.length
    : 0

  const deltaCounts = useMemo<DeltaCounts>(() => {
    const since = Date.now() - SEVEN_DAYS_MS
    return {
      person: countSince(personsQuery.data, since),
      event: countSince(eventsQuery.data, since),
      administration: countSince(administrationQuery.data, since),
      city: countSince(citiesQuery.data, since),
    }
  }, [
    personsQuery.data,
    eventsQuery.data,
    administrationQuery.data,
    citiesQuery.data,
  ])

  const recentPersons = useMemo((): RecentPersonItem[] => {
    const list = (personsQuery.data ?? []) as any[]
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
  }, [personsQuery.data, country?.defaultNameDisplayOrder])

  const recentActivity = useMemo((): RecentActivityItem[] => {
    const persons = recentPersons.map<RecentActivityItem>((p) => ({
      id: `person-${p.id}`,
      kind: 'person',
      refId: p.id,
      label: p.displayName,
      createdAt: p.createdAt,
      profileImageUrl: p.profileImageUrl,
    }))
    const events = ((eventsQuery.data ?? []) as any[])
      .map<RecentActivityItem>((e) => ({
        id: `event-${e.id}`,
        kind: 'event',
        refId: e.id,
        label: e.title ?? '제목 없음',
        createdAt: e.createdAt ?? e.created_at ?? '',
        startDate: e.startDate ?? null,
        endDate: e.endDate ?? null,
      }))
      .filter((e) => e.createdAt)
    const merged = [...persons, ...events].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return merged.slice(0, 10)
  }, [recentPersons, eventsQuery.data])

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
          t.positionDefinition?.title ??
          t.position?.title ??
          t.title ??
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

  const completeness = useMemo(() => {
    const fields: CompletenessField[] = country
      ? [
          { key: 'fullName', label: '정식 국호', filled: hasText(country.fullName) },
          { key: 'localName', label: '현지어 명칭', filled: hasText(country.localName) },
          { key: 'isoCode', label: 'ISO 코드', filled: hasText(country.isoCode) },
          { key: 'flagEmoji', label: '국기 이모지', filled: hasText(country.flagEmoji) },
          { key: 'thumbnailUrl', label: '국기 이미지', filled: hasText(country.thumbnailUrl) },
          { key: 'capital', label: '수도', filled: hasText(country.capital) },
          {
            key: 'population',
            label: '인구',
            filled:
              country.population != null &&
              String(country.population).trim() !== '',
          },
          { key: 'areaSqKm', label: '면적', filled: country.areaSqKm != null },
          { key: 'continentId', label: '대륙', filled: hasText(country.continentId) },
          {
            key: 'coordinates',
            label: '좌표',
            filled: country.latitude != null && country.longitude != null,
          },
        ]
      : []
    const filled = fields.filter((f) => f.filled).length
    const missing = fields.filter((f) => !f.filled)
    return { filled, total: fields.length, missing }
  }, [country])

  const treatyCount = (treatiesQuery.data as { total?: number } | undefined)
    ?.total ?? 0

  // 사건 시간 분포는 "사건 발생일(startDate)" 기준 — createdAt 폴백 없음.
  // 발생일이 없는 사건은 분포에서 제외해 의미 일관성 유지.
  const monthlyEventCounts = useMemo<number[]>(() => {
    const list = Array.isArray(eventsQuery.data) ? (eventsQuery.data as any[]) : []
    const buckets = new Array(12).fill(0)
    const now = new Date()
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    for (const e of list) {
      const ts = e.startDate ?? e.start_date
      if (!ts) continue
      const d = new Date(ts)
      if (Number.isNaN(d.getTime())) continue
      const monthIdx =
        (d.getFullYear() - startMonth.getFullYear()) * 12 +
        (d.getMonth() - startMonth.getMonth())
      if (monthIdx >= 0 && monthIdx < 12) buckets[monthIdx]++
    }
    return buckets
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
    const ministers = Array.isArray(currentCabinetTenuresQuery.data)
      ? (currentCabinetTenuresQuery.data as any[])
      : []
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
  }, [latestActiveCabinetId, cabinetsQuery.data, currentCabinetTenuresQuery.data])

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

  // 라벨이 "갱신"인 만큼 모든 엔티티의 createdAt 중 최신을 사용.
  const lastUpdatedAt = useMemo<string | null>(() => {
    const sources: unknown[][] = [
      personsQuery.data as unknown[],
      eventsQuery.data as unknown[],
      administrationQuery.data as unknown[],
      citiesQuery.data as unknown[],
    ]
    let max = 0
    for (const list of sources) {
      if (!Array.isArray(list)) continue
      for (const item of list) {
        const ts =
          (item as { createdAt?: string; created_at?: string })?.createdAt ??
          (item as { created_at?: string })?.created_at
        if (!ts) continue
        const t = new Date(ts).getTime()
        if (Number.isFinite(t) && t > max) max = t
      }
    }
    return max > 0 ? new Date(max).toISOString() : null
  }, [
    personsQuery.data,
    eventsQuery.data,
    administrationQuery.data,
    citiesQuery.data,
  ])

  const loading = {
    persons: personsQuery.isLoading,
    military: militaryQuery.isLoading,
    events: eventsQuery.isLoading,
    administration: administrationQuery.isLoading,
    cities: citiesQuery.isLoading,
    tenures: tenuresQuery.isLoading,
    activity: personsQuery.isLoading || eventsQuery.isLoading,
    cabinets:
      cabinetsQuery.isLoading || currentCabinetTenuresQuery.isLoading,
    elections: electionsQuery.isLoading,
    treaties: treatiesQuery.isLoading,
    continent: allCountriesQuery.isLoading,
  }

  const isLoading =
    loading.persons ||
    loading.military ||
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
    deltaCounts,
    recentPersons,
    recentActivity,
    currentHeads,
    completeness,
    monthlyEventCounts,
    continentComparison,
    currentCabinet,
    nextElection,
    recentElection,
    lastUpdatedAt,
    isLoading,
    loading,
  }
}

function hasText(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== ''
}
