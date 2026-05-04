import { useEffect, useState } from 'react'
import { api } from './api'
import { PERSON_STAT_KEYS, type PersonStats, type PersonTraitAssignment } from './person-stats'

type EvaluationsBundle = {
  stats: PersonStats[]
  traits: Array<PersonTraitAssignment & { personId: string }>
}

let cached: EvaluationsBundle | null = null
let inflight: Promise<EvaluationsBundle> | null = null

async function fetchAll(): Promise<EvaluationsBundle> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = api
    .get<EvaluationsBundle>('/persons/my-evaluations')
    .then((res) => {
      const data: EvaluationsBundle = {
        stats: Array.isArray(res.data?.stats) ? res.data.stats : [],
        traits: Array.isArray(res.data?.traits) ? res.data.traits : [],
      }
      cached = data
      return data
    })
    .catch(() => {
      const empty = { stats: [], traits: [] }
      cached = empty
      return empty
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function invalidateEvaluations() {
  cached = null
  inflight = null
}

/**
 * personId → 능력치 평균 (정의된 능력치만 평균. 모두 null이면 null).
 */
export function useStatsAverages(): { averages: Map<string, number>; loading: boolean } {
  const [bundle, setBundle] = useState<EvaluationsBundle | null>(cached)
  useEffect(() => {
    if (cached) {
      setBundle(cached)
      return
    }
    let cancel = false
    fetchAll().then((b) => {
      if (!cancel) setBundle(b)
    })
    return () => {
      cancel = true
    }
  }, [])

  const averages = new Map<string, number>()
  if (bundle) {
    for (const s of bundle.stats) {
      const vals: number[] = []
      for (const k of PERSON_STAT_KEYS) {
        const v = s[k]
        if (typeof v === 'number') vals.push(v)
      }
      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length
        averages.set(s.personId, avg)
      }
    }
  }
  return { averages, loading: bundle == null }
}
