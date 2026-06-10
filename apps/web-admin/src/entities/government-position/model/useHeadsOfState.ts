/**
 * Government Position Entity - Heads of State Hook
 * FSD: entities/government-position/model
 */
import { useEffect, useState } from 'react'

import { FILTER_ALL } from '@/features/event-list/lib'
import {
  HeadOfStateDuringEvent,
  findHeadsOfStateDuringPeriod,
} from '@/shared/api/government-positions'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'

export const useHeadsOfState = (
  events: HistoricalEvent[],
  /**
   * 인물 + 직책 임기 데이터(governmentPositions 포함). 미전달 시 빈 배열 → 빈 Map 반환.
   */
  personsWithGovPositions: any[] = [],
  selectedPositionType: string = '',
) => {
  const [eventHeadsOfState, setEventHeadsOfState] = useState<
    Map<string, HeadOfStateDuringEvent[]>
  >(new Map())

  const [expandedTenureGroups, setExpandedTenureGroups] = useState<Set<string>>(
    new Set(),
  )

  // 선택된 직업 타입에 따라 국가 원수 목록 필터링 + 목록 전체 기간에 대한 국가원수(트럼프 등) 한 블록
  useEffect(() => {
    if (events.length === 0 || personsWithGovPositions.length === 0) return

    const positionFilter =
      selectedPositionType === FILTER_ALL ? undefined : selectedPositionType
    const headsOfStateMap = new Map<string, HeadOfStateDuringEvent[]>()
    let periodStart: string | undefined
    let periodEnd: string | undefined
    events.forEach((event) => {
      const s = event.startDate
      const e = event.endDate || s
      if (s) {
        if (periodStart == null || s < periodStart) periodStart = s
        if (periodEnd == null || e > periodEnd) periodEnd = e
      }
      const headsOfState = findHeadsOfStateDuringPeriod(
        s,
        e,
        personsWithGovPositions,
        positionFilter,
      )
      if (headsOfState.length > 0) {
        headsOfStateMap.set(event.id, headsOfState)
      }
    })
    // 목록 전체 기간에 해당하는 국가원수 (사건이 과거뿐이어도 기간 끝을 올해까지 넓혀 트럼프 등 최근 재임 인물 포함)
    const endOfCurrentYear = new Date().getFullYear() + '-12-31T23:59:59.999Z'
    const periodEndExtended =
      periodEnd && periodEnd > endOfCurrentYear ? periodEnd : endOfCurrentYear
    if (periodStart) {
      const periodHeads = findHeadsOfStateDuringPeriod(
        periodStart,
        periodEndExtended,
        personsWithGovPositions,
        positionFilter,
      )
      if (periodHeads.length > 0) {
        headsOfStateMap.set('__periodHeads__', periodHeads)
      }
    }
    setEventHeadsOfState(headsOfStateMap)
  }, [events, personsWithGovPositions, selectedPositionType])

  const toggleTenureGroupExpansion = (tenureKey: string) => {
    setExpandedTenureGroups((prev) => {
      const next = new Set(prev)
      if (next.has(tenureKey)) {
        next.delete(tenureKey)
      } else {
        next.add(tenureKey)
      }
      return next
    })
  }

  return {
    eventHeadsOfState,
    expandedTenureGroups,
    toggleTenureGroupExpansion,
  }
}
