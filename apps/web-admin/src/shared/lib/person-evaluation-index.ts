/**
 * 사용자 전체 인물 평가(stats + traits)를 한 번에 가져와 personId 인덱스로 노출.
 * 인물 리스트의 평가 indicator·정렬·필터에 사용.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  type PersonStats,
  type PersonTraitAssignment,
  PERSON_STAT_KEYS,
  getAllMyEvaluations,
} from '@/shared/api/person-stats'

export interface PersonEvaluationSummary {
  personId: string
  /** 점수가 하나라도 있는지 */
  hasStats: boolean
  /** 부착된 태그 수 */
  traitCount: number
  /** 평가 자체가 있는지 (stats 또는 trait) */
  hasEvaluation: boolean
  /** 정렬용 — null 차원은 제외한 평균. 점수 0개면 null */
  statsAverage: number | null
  /** 가장 높은 축 라벨/값 — 카드 표시·정렬에 사용 */
  topStatKey: keyof PersonStats | null
  topStatValue: number | null
  stats: PersonStats | null
  traits: PersonTraitAssignment[]
}

const EMPTY_SUMMARY = (personId: string): PersonEvaluationSummary => ({
  personId,
  hasStats: false,
  traitCount: 0,
  hasEvaluation: false,
  statsAverage: null,
  topStatKey: null,
  topStatValue: null,
  stats: null,
  traits: [],
})

function summarizeStats(
  stats: PersonStats | null,
): {
  hasStats: boolean
  statsAverage: number | null
  topStatKey: keyof PersonStats | null
  topStatValue: number | null
} {
  if (!stats) return { hasStats: false, statsAverage: null, topStatKey: null, topStatValue: null }
  let sum = 0
  let count = 0
  let topKey: keyof PersonStats | null = null
  let topVal = -Infinity
  for (const key of PERSON_STAT_KEYS) {
    const v = stats[key]
    if (v == null) continue
    sum += v
    count += 1
    if (v > topVal) {
      topVal = v
      topKey = key
    }
  }
  return {
    hasStats: count > 0,
    statsAverage: count > 0 ? Math.round(sum / count) : null,
    topStatKey: topKey,
    topStatValue: count > 0 ? topVal : null,
  }
}

/**
 * personId → PersonEvaluationSummary 맵.
 * staleTime 5분 — 평가는 자주 바뀌지 않음.
 */
export function usePersonEvaluationIndex(): Map<string, PersonEvaluationSummary> {
  const { data } = useQuery({
    queryKey: ['my-evaluations'],
    queryFn: getAllMyEvaluations,
    staleTime: 1000 * 60 * 5,
  })

  return useMemo(() => {
    const map = new Map<string, PersonEvaluationSummary>()
    if (!data) return map

    for (const stats of data.stats) {
      const summary = summarizeStats(stats)
      const prev = map.get(stats.personId) ?? EMPTY_SUMMARY(stats.personId)
      map.set(stats.personId, {
        ...prev,
        ...summary,
        stats,
        hasEvaluation: summary.hasStats || prev.traitCount > 0,
      })
    }

    for (const trait of data.traits as Array<PersonTraitAssignment & { personId?: string }>) {
      const pid = trait.personId
      if (!pid) continue
      const prev = map.get(pid) ?? EMPTY_SUMMARY(pid)
      const traits = [...prev.traits, trait]
      map.set(pid, {
        ...prev,
        traits,
        traitCount: traits.length,
        hasEvaluation: prev.hasStats || traits.length > 0,
      })
    }

    return map
  }, [data])
}
