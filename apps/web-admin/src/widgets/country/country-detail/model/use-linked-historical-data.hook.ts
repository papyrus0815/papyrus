/**
 * 연결된 역사적 국가 ID 기준으로 변천·관계·소속을 일괄 fetch.
 *
 * - 3 API 병렬 호출 (transitions, relations, memberships)
 * - staleTime 5분 — 같은 ids로 다시 진입 시 캐시 재사용
 * - 결과는 idSet 기준으로 클라 필터(중복 제거 + 무관 데이터 방어)
 */
import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import {
  type HistoricalCountryMembershipDto,
  type HistoricalCountryRelationDto,
  type HistoricalCountryTransitionDto,
  getMembershipsByHistoricalCountryIds,
  getRelationsByHistoricalCountryIds,
  getTransitionsByHistoricalCountryIds,
} from '@/shared/api/historical-countries'

interface LinkedHistoricalData {
  transitions: HistoricalCountryTransitionDto[]
  relations: HistoricalCountryRelationDto[]
  memberships: HistoricalCountryMembershipDto[]
  isLoading: boolean
}

export function useLinkedHistoricalData(
  linkedIds: string[],
): LinkedHistoricalData {
  const idSet = useMemo(() => new Set(linkedIds), [linkedIds])
  // queryKey는 정렬된 array 그대로 — react-query가 deep-compare하므로 join 불필요.
  const sortedIds = useMemo(() => [...linkedIds].sort(), [linkedIds])
  const { data, isLoading } = useQuery({
    queryKey: ['historical-country-linked-batch', sortedIds],
    queryFn: async () => {
      const [transitions, relations, memberships] = await Promise.all([
        getTransitionsByHistoricalCountryIds(linkedIds),
        getRelationsByHistoricalCountryIds(linkedIds),
        getMembershipsByHistoricalCountryIds(linkedIds),
      ])
      return { transitions, relations, memberships }
    },
    enabled: linkedIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  const transitions = useMemo(() => {
    if (!data?.transitions) return []
    const seen = new Set<string>()
    return data.transitions.filter((t) => {
      if (!idSet.has(t.predecessorId) || !idSet.has(t.successorId)) return false
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [data?.transitions, idSet])

  const relations = useMemo(() => {
    if (!data?.relations) return []
    const seen = new Set<string>()
    return data.relations.filter((r) => {
      if (!idSet.has(r.subjectCountryId) || !idSet.has(r.objectCountryId))
        return false
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
  }, [data?.relations, idSet])

  const memberships = useMemo(() => {
    if (!data?.memberships) return []
    const seen = new Set<string>()
    return data.memberships.filter((m) => {
      if (!idSet.has(m.historicalCountryId) || !idSet.has(m.memberCountryId))
        return false
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
  }, [data?.memberships, idSet])

  return { transitions, relations, memberships, isLoading }
}
