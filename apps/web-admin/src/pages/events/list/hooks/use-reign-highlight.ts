/**
 * 군주 재위 표시 — 선택한 인물의 재위(SovereignReign) 기간과 겹치는 사건을 목록에서 따로 표시.
 *
 * 필터가 아니라 **표시**다. 행을 걸러내지 않고 '재위 중' 배지만 얹어, 재위 전후 맥락이
 * 그대로 보이는 상태에서 어느 사건이 그 치세에 속하는지 훑을 수 있게 한다.
 * 재위 기록은 인물 상세(`GET /persons/:id/detail`)에서 가져오며, 인물 상세 패널과 같은
 * 쿼리 키를 써 캐시를 공유한다.
 */
import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import type { FlattenedHierarchyItem } from '@/features/event-hierarchy/model'
import { personKeys } from '@/entities/person/api'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import {
  type PersonDeathFields,
  type ReignPeriod,
  type SovereignReignDateFields,
  eventRangeKeys,
  findOverlappingReign,
  formatReignSpan,
  toReignPeriods,
} from '../lib/reign-periods'

export interface ReignHighlight {
  /** 표시 중인 군주의 이름 — 로딩 전이면 null */
  personName: string | null
  periods: ReignPeriod[]
  /** 사건 id → 행 배지 툴팁 문구(예: '세종 재위 중 (1418–1450)') */
  labelByEventId: Map<string, string>
  /** 재위 기간과 겹치는 행 수(화면 기준) */
  matchedCount: number
  isLoading: boolean
  isError: boolean
}

const EMPTY_LABELS = new Map<string, string>()

export function useReignHighlight(
  reignPersonId: string | null,
  items: FlattenedHierarchyItem[],
): ReignHighlight {
  const { data, isLoading, isError } = useQuery({
    queryKey: personKeys.detailFull(reignPersonId ?? ''),
    queryFn: () => getPersonDetailById(reignPersonId!),
    enabled: !!reignPersonId,
    staleTime: 60_000,
  })

  const personName = useMemo(() => {
    if (!reignPersonId || !data?.name) return null
    return getPersonDisplayName(data)
  }, [reignPersonId, data])

  const periods = useMemo(() => {
    if (!reignPersonId || !data) return []
    return toReignPeriods(
      data.sovereignReigns as SovereignReignDateFields[] | undefined,
      data as PersonDeathFields,
    )
  }, [reignPersonId, data])

  const labelByEventId = useMemo(() => {
    if (periods.length === 0) return EMPTY_LABELS
    const labels = new Map<string, string>()
    for (const item of items) {
      const reign = findOverlappingReign(
        eventRangeKeys(item.node.period),
        periods,
      )
      if (!reign) continue
      const who = reign.regnalName ?? personName ?? '군주'
      const where = reign.countryName ? `${reign.countryName} ` : ''
      labels.set(
        item.node.id,
        `${where}${who} 재위 중 (${formatReignSpan(reign)})`,
      )
    }
    return labels
  }, [items, periods, personName])

  return {
    personName,
    periods,
    labelByEventId,
    matchedCount: labelByEventId.size,
    isLoading: !!reignPersonId && isLoading,
    isError,
  }
}
