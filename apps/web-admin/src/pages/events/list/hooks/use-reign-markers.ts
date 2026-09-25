/**
 * 사건 목록의 군주 즉위 구분선 데이터.
 *
 * 선택·토글 없이 **항상** 연대 흐름에 녹아 있다. 대신 범위를 목록이 스스로 정한다 —
 * 지금 목록에 나온 사건들의 관련 국가(현대·역사)의 군주만 싣는다. 국가 필터가 걸려
 * 있으면 그 나라 하나로 좁힌다(조선으로 거르면 임진왜란의 관련국 일본 천황까지 끼지 않게).
 */
import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import type { FlattenedHierarchyItem } from '@/features/event-hierarchy/model'
import { FILTER_ALL } from '@/features/event-list/lib'
import { getSovereignReignTimeline } from '@/shared/api/sovereign-reigns'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  type ReignMarker,
  type SovereignReignTimelineItem,
  toReignMarkers,
} from '@/widgets/event-list-compact/lib/reign-markers'

import type { HistoricalEvent } from '../../create/events.types'

export const sovereignReignTimelineKey = ['sovereign-reign-timeline'] as const

const NO_MARKERS: ReignMarker[] = []

export function useReignMarkers(
  items: FlattenedHierarchyItem[],
  eventById: Map<string, HistoricalEvent>,
  selectedCountry: string,
): ReignMarker[] {
  const { data: reigns } = useQuery({
    queryKey: sovereignReignTimelineKey,
    queryFn: getSovereignReignTimeline,
    staleTime: 5 * 60 * 1000,
  })

  const countryIds = useMemo(() => {
    if (selectedCountry !== FILTER_ALL) return new Set([selectedCountry])
    const ids = new Set<string>()
    for (const item of items) {
      const event = eventById.get(item.node.id) ?? item.parentEvent
      event?.relatedCountries?.forEach((country) => ids.add(country.id))
      event?.relatedHistoricalCountries?.forEach((country) =>
        ids.add(country.id),
      )
    }
    return ids
  }, [items, eventById, selectedCountry])

  return useMemo(() => {
    if (!reigns?.length) return NO_MARKERS
    return toReignMarkers(
      reigns as SovereignReignTimelineItem[],
      countryIds,
      (person) => getPersonDisplayName(person, true),
    )
  }, [reigns, countryIds])
}
