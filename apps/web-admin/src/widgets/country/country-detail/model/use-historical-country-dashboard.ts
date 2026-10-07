import { useMemo } from 'react'

import { useQueries, useQuery } from '@tanstack/react-query'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { eventKeys } from '@/shared/api/event-query-keys'
import { getAllEventsExhaustive } from '@/shared/api/events'
import {
  getAllHistoricalCountries,
  getHistoricalCountryFoundingSummary,
  getMembershipsByHistoricalCountryId,
  getRelationsByHistoricalCountryId,
  getTransitionsByHistoricalCountryId,
  getTransitionsByHistoricalCountryIds,
  type HistoricalCountryResponseDto,
  type HistoricalCountryTransitionDto,
} from '@/shared/api/historical-countries'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonsByHistoricalCountryUnion } from '@/shared/api/persons'
import { treatyApi } from '@/shared/api/treaty'
import {
  getCountryYearRange,
  signedYearFromIsoLike,
  toSignedYear,
} from '@/shared/lib/country-period'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { regnalNameFromNotes } from '@/entities/government-position/model/regnal-name'

import type {
  CalendarEventItem,
  CompletenessField,
  RecentActivityItem,
} from './use-country-dashboard-stats'

/** 역대 수반 한 줄 — 재위·재임을 한 모양으로 */
export interface HistoricalRulerItem {
  recordId: string
  personId: string | null
  personName: string
  profileImageUrl: string | null
  title: string | null
  axis: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  ordinal: number | null
  startYear: number | null
  endYear: number | null
  /** 나라의 존속 기간 밖에서 시작·종료한 기록 — 잘못 걸린 행일 가능성이 높다 */
  isOutOfSpan: boolean
}

/** 계보 노드 — 전신·후신 2대까지 */
export interface HistoricalLineageNode extends HistoricalCountryResponseDto {
  /** 이 나라 기준 거리(-2 전전신 … 0 자신 … +2 후후신) */
  distance: number
}

/** 더 채울 것 — 역사 국가 축 */
export type HistoricalFillTarget =
  | 'overview'
  | 'founding'
  | 'events'
  | 'figures'
  | 'heads'
  | 'succession'
  | 'treaty'
  | 'relation'

export interface HistoricalCompletenessField extends CompletenessField {
  historicalTarget: HistoricalFillTarget
}

const STALE_MS = 1000 * 60 * 5
const ACTIVITY_FEED_LIMIT = 10

/** 쿼리 키 — 탭 위젯들이 쓰는 키와 같아야 캐시를 나눠 쓰고 무효화가 함께 먹는다 */
export const historicalDashboardKeys = {
  persons: (id: string) => ['historical-country-union-persons', id] as const,
  events: (id: string) => eventKeys.byCountry(id, 'flat'),
  tenures: (id: string) => ['tenures-by-country', undefined, id] as const,
  transitions: (id: string) => ['historical-country-transitions', id] as const,
  memberships: (id: string) => ['historical-country-memberships', id] as const,
  relations: (id: string) => ['historical-country-relations', id] as const,
  /* ['treaties'] 접두 무효화에 함께 걸리게 — 목록(take 전체)과 모양이 달라 키는 따로 */
  treaties: (id: string) => ['treaties', 'historical-count', id] as const,
  allCountries: ['historical-countries-list'] as const,
}

/** 인물 요약 — 인물·재임·사건 응답에 공통으로 실리는 필드만 */
interface LoosePerson {
  id?: string
  name?: string | null
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  country?: { defaultNameDisplayOrder?: string | null } | null
  profileImageUrl?: string | null
  createdAt?: string | null
}

/**
 * 느슨한 응답 행 — 엔드포인트마다 싣는 필드가 달라(재임·사건·인물·국가) 여기서 쓰는
 * 것만 선택 필드로 적는다. 없는 필드는 undefined로 읽힌다.
 */
interface LooseRecord extends LoosePerson {
  title?: string | null
  startDate?: string | null
  endDate?: string | null
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
  isDayKnown?: boolean
  personId?: string | null
  person?: LoosePerson | null
  positionType?: string | null
  positionDefinition?: { positionType?: string | null; title?: string | null } | null
  regnalNumber?: number | null
  termNumber?: number | null
  /** 재위 행의 왕명(프리드리히 빌헬름 2세) — 인물 이름보다 앞선다 */
  regnalName?: string | null
  notes?: string | null
}

function asArray(value: unknown): LooseRecord[] {
  return Array.isArray(value) ? (value as LooseRecord[]) : []
}

function tenureYear(
  era: string | null | undefined,
  year: number | null | undefined,
  isoLike: string | null | undefined,
): number | null {
  if (year != null) return toSignedYear(era === 'BC' ? 'BC' : 'AD', year)
  return signedYearFromIsoLike(isoLike ?? null)
}

function personNameOf(person: LoosePerson | null | undefined): string {
  if (!person) return '이름 없음'
  return (
    getPersonDisplayName({
      name: person.name ?? '',
      surname: person.surname,
      middleName: person.middleName,
      nameDisplayOrder: person.nameDisplayOrder ?? null,
      country: person.country ?? undefined,
    }) ||
    person.name ||
    '이름 없음'
  )
}

/**
 * 역사 국가 개요 대시보드의 자료 — 현대 국가 대시보드(useCountryDashboardStats)의 역사판.
 *
 * 현대 국가는 인구·지표·내각처럼 '지금'을 묻는 축이 대부분이라 그대로 못 쓴다. 역사 국가가
 * 가진 축은 존속 기간·계보·역대 수반·사건 분포다. 쿼리 키는 각 탭 위젯과 같게 둬서 탭을
 * 오가도 다시 받지 않는다.
 */
export function useHistoricalCountryDashboard(
  country: UnifiedCountry,
  description: string | null | undefined,
) {
  const id = country.id

  const [
    personsQuery,
    eventsQuery,
    tenuresQuery,
    transitionsQuery,
    membershipsQuery,
    relationsQuery,
    treatiesQuery,
    foundingQuery,
    allCountriesQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: historicalDashboardKeys.persons(id),
        queryFn: () => getPersonsByHistoricalCountryUnion(id),
        staleTime: STALE_MS,
      },
      {
        /* 하위 사건까지 평면으로 — 세기 분포·달력의 모수(현대 대시보드와 같은 규약) */
        queryKey: historicalDashboardKeys.events(id),
        queryFn: () =>
          getAllEventsExhaustive({ countryId: id, includeSubEvents: true }),
        staleTime: STALE_MS,
      },
      {
        queryKey: historicalDashboardKeys.tenures(id),
        queryFn: () =>
          personCareerApi.getTenuresByCountry({ historicalCountryId: id }),
        staleTime: STALE_MS,
      },
      {
        queryKey: historicalDashboardKeys.transitions(id),
        queryFn: () => getTransitionsByHistoricalCountryId(id),
        staleTime: STALE_MS,
      },
      {
        queryKey: historicalDashboardKeys.memberships(id),
        queryFn: () => getMembershipsByHistoricalCountryId(id),
        staleTime: STALE_MS,
      },
      {
        queryKey: historicalDashboardKeys.relations(id),
        queryFn: () => getRelationsByHistoricalCountryId(id),
        staleTime: STALE_MS,
      },
      {
        queryKey: historicalDashboardKeys.treaties(id),
        queryFn: () => treatyApi.getAll({ historicalCountryId: id, take: 1 }),
        staleTime: STALE_MS,
      },
      {
        /* 건국 카드와 같은 키 — historical-founding-cards의 foundingSummaryKey */
        queryKey: ['historical-countries', id, 'founding-summary'],
        queryFn: () => getHistoricalCountryFoundingSummary(id),
        staleTime: STALE_MS,
      },
      {
        queryKey: historicalDashboardKeys.allCountries,
        queryFn: getAllHistoricalCountries,
        staleTime: 1000 * 60 * 30,
      },
    ],
  })

  const transitions: HistoricalCountryTransitionDto[] = useMemo(
    () => (Array.isArray(transitionsQuery.data) ? transitionsQuery.data : []),
    [transitionsQuery.data],
  )
  const directPredecessorIds = useMemo(
    () =>
      transitions
        .filter((transition) => transition.successorId === id)
        .map((transition) => transition.predecessorId),
    [transitions, id],
  )
  const directSuccessorIds = useMemo(
    () =>
      transitions
        .filter((transition) => transition.predecessorId === id)
        .map((transition) => transition.successorId),
    [transitions, id],
  )

  /* 계보 2대 — 전신의 전신, 후신의 후신까지. 한 번의 일괄 조회 */
  const neighborIds = useMemo(
    () => [...new Set([...directPredecessorIds, ...directSuccessorIds])].sort(),
    [directPredecessorIds, directSuccessorIds],
  )
  const secondHopQuery = useQuery({
    queryKey: ['historical-country-transitions', 'by-ids', neighborIds],
    queryFn: () => getTransitionsByHistoricalCountryIds(neighborIds),
    enabled: neighborIds.length > 0,
    staleTime: STALE_MS,
  })

  const lineage = useMemo<HistoricalLineageNode[]>(() => {
    const byId = new Map(
      asArray(allCountriesQuery.data).map((row) => [row.id as string, row]),
    )
    const distances = new Map<string, number>([[id, 0]])
    for (const predecessorId of directPredecessorIds) distances.set(predecessorId, -1)
    for (const successorId of directSuccessorIds) {
      if (!distances.has(successorId)) distances.set(successorId, 1)
    }
    const second = Array.isArray(secondHopQuery.data) ? secondHopQuery.data : []
    for (const transition of second) {
      const predecessorDistance = distances.get(transition.successorId)
      if (predecessorDistance === -1 && !distances.has(transition.predecessorId)) {
        distances.set(transition.predecessorId, -2)
      }
      const successorDistance = distances.get(transition.predecessorId)
      if (successorDistance === 1 && !distances.has(transition.successorId)) {
        distances.set(transition.successorId, 2)
      }
    }
    const nodes: HistoricalLineageNode[] = []
    for (const [nodeId, distance] of distances) {
      const row = byId.get(nodeId)
      if (row) nodes.push({ ...(row as HistoricalCountryResponseDto), distance })
    }
    return nodes
  }, [
    allCountriesQuery.data,
    directPredecessorIds,
    directSuccessorIds,
    secondHopQuery.data,
    id,
  ])

  /* 역대 수반 — 국가원수·정부수반 축만, 같은 인물·같은 시작의 중복 행은 하나로 */
  const span = getCountryYearRange(country)
  const rulers = useMemo<HistoricalRulerItem[]>(() => {
    const seen = new Set<string>()
    const rows: HistoricalRulerItem[] = []
    for (const tenure of asArray(tenuresQuery.data)) {
      const axis =
        tenure.positionType ?? tenure.positionDefinition?.positionType ?? null
      if (axis !== 'HEAD_OF_STATE' && axis !== 'HEAD_OF_GOVERNMENT') continue
      const startYear = tenureYear(tenure.startEra, tenure.startYear, tenure.startDate)
      const endYear = tenureYear(tenure.endEra, tenure.endYear, tenure.endDate)
      const personId = tenure.person?.id ?? tenure.personId ?? null
      const dedupeKey = `${axis}|${personId}|${startYear}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      const isOutOfSpan =
        (span.start != null && endYear != null && endYear < span.start) ||
        (span.end != null && startYear != null && startYear > span.end)
      rows.push({
        recordId: String(tenure.id),
        personId,
        /* 재위는 왕명(루이 14세)이 이름이다 — 성까지 붙은 인물명은 같은 왕가끼리 구분이 안 된다 */
        personName:
          tenure.regnalName?.trim() ||
          regnalNameFromNotes(tenure.notes) ||
          personNameOf(tenure.person),
        profileImageUrl: tenure.person?.profileImageUrl ?? null,
        title: tenure.positionDefinition?.title ?? tenure.title ?? null,
        axis,
        ordinal: tenure.regnalNumber ?? tenure.termNumber ?? null,
        startYear,
        endYear,
        isOutOfSpan,
      })
    }
    /* 존속 기간 밖 기록(대개 잘못 걸린 행)은 뒤로 — 1009년 변경백이 프로이센 왕국 첫 칸에 서지 않게 */
    return rows.sort(
      (left, right) =>
        Number(left.isOutOfSpan) - Number(right.isOutOfSpan) ||
        (left.startYear ?? Number.MAX_SAFE_INTEGER) -
          (right.startYear ?? Number.MAX_SAFE_INTEGER),
    )
  }, [tenuresQuery.data, span.start, span.end])

  const events = asArray(eventsQuery.data)
  const persons = asArray(personsQuery.data)

  /* 세기 분포 — 사건 발생일 문자열에서(BC는 '-' 접두, new Date 금지) */
  const eventCenturyCounts = useMemo(() => {
    const byCentury = new Map<number, number>()
    for (const event of asArray(eventsQuery.data)) {
      const matched = /^(-?)(\d{1,6})-/.exec(String(event.startDate ?? ''))
      if (!matched) continue
      const year = Number(matched[2])
      if (!Number.isFinite(year) || year === 0) continue
      const century =
        matched[1] === '-' ? -Math.ceil(year / 100) : Math.ceil(year / 100)
      byCentury.set(century, (byCentury.get(century) ?? 0) + 1)
    }
    return [...byCentury.entries()]
      .map(([century, count]) => ({ century, count }))
      .sort((left, right) => left.century - right.century)
  }, [eventsQuery.data])

  const calendarEvents = useMemo<CalendarEventItem[]>(() => {
    const rows: CalendarEventItem[] = []
    for (const event of asArray(eventsQuery.data)) {
      const matched = /^(-?\d{1,6}-\d{2}-\d{2})/.exec(String(event.startDate ?? ''))
      if (!event.id || !matched) continue
      rows.push({
        id: event.id,
        title: event.title?.trim() || '제목 없음',
        date: matched[1],
        isDayKnown: event.isDayKnown !== false,
      })
    }
    return rows
  }, [eventsQuery.data])

  /* 최근 활동 — 이 나라에 걸린 인물·사건을 등록순으로 */
  const recentActivity = useMemo<RecentActivityItem[]>(() => {
    const items: RecentActivityItem[] = [
      ...asArray(personsQuery.data).map<RecentActivityItem>((person) => ({
        id: `person-${person.id}`,
        kind: 'person',
        refId: person.id ?? '',
        label: personNameOf(person),
        createdAt: person.createdAt ?? '',
        profileImageUrl: person.profileImageUrl ?? null,
      })),
      ...asArray(eventsQuery.data).map<RecentActivityItem>((event) => ({
        id: `event-${event.id}`,
        kind: 'event',
        refId: event.id ?? '',
        label: event.title ?? '제목 없음',
        createdAt: event.createdAt ?? '',
        startDate: event.startDate ?? null,
        endDate: event.endDate ?? null,
      })),
    ].filter((item) => item.createdAt)
    return items
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, ACTIVITY_FEED_LIMIT)
  }, [personsQuery.data, eventsQuery.data])

  const memberships = asArray(membershipsQuery.data)
  const relations = asArray(relationsQuery.data)
  const treatyCount =
    (treatiesQuery.data as { total?: number } | undefined)?.total ?? 0
  const founding = foundingQuery.data

  const completenessFields: HistoricalCompletenessField[] = [
    {
      key: 'description',
      label: '개요',
      filled: !!description?.trim(),
      target: 'historical',
      historicalTarget: 'overview',
    },
    {
      key: 'span',
      label: '존속 연도',
      filled: span.start != null && span.end != null,
      target: 'historical',
      historicalTarget: 'overview',
    },
    {
      key: 'foundingNote',
      label: '건국 배경',
      filled: !!founding?.foundingNote?.trim(),
      target: 'historical',
      historicalTarget: 'founding',
    },
    {
      key: 'firstRuler',
      label: '초대 통치자',
      filled: (founding?.firstRulers?.length ?? 0) > 0,
      target: 'historical',
      historicalTarget: 'heads',
    },
    {
      key: 'lineage',
      label: '전신·후신',
      filled: transitions.length > 0,
      target: 'historical',
      historicalTarget: 'succession',
    },
    {
      key: 'rulers',
      label: '역대 수반',
      filled: rulers.length > 0,
      target: 'government',
      historicalTarget: 'heads',
    },
    {
      key: 'persons',
      label: '인물',
      filled: persons.length > 0,
      target: 'persons',
      historicalTarget: 'figures',
    },
    {
      key: 'events',
      label: '사건',
      filled: events.length > 0,
      target: 'events',
      historicalTarget: 'events',
    },
    {
      key: 'relations',
      label: '국가 관계',
      filled: relations.length > 0 || memberships.length > 0,
      target: 'historical',
      historicalTarget: 'relation',
    },
    {
      key: 'treaty',
      label: '조약',
      filled: treatyCount > 0,
      target: 'treaty',
      historicalTarget: 'treaty',
    },
  ]
  const filledCount = completenessFields.filter((field) => field.filled).length

  const loading = {
    persons: personsQuery.isLoading,
    events: eventsQuery.isLoading,
    tenures: tenuresQuery.isLoading,
    lineage:
      transitionsQuery.isLoading ||
      allCountriesQuery.isLoading ||
      (neighborIds.length > 0 && secondHopQuery.isLoading),
    memberships: membershipsQuery.isLoading,
    relations: relationsQuery.isLoading,
    treaties: treatiesQuery.isLoading,
    founding: foundingQuery.isLoading,
  }

  return {
    personCount: persons.length,
    eventCount: events.length,
    rulers,
    lineage,
    transitionCount: transitions.length,
    membershipCount: memberships.length,
    relationCount: relations.length,
    treatyCount,
    eventCenturyCounts,
    calendarEvents,
    recentActivity,
    completeness: {
      filled: filledCount,
      total: completenessFields.length,
      missing: completenessFields.filter((field) => !field.filled),
    },
    loading,
    isCompletenessLoading: Object.values(loading).some(Boolean),
  }
}
