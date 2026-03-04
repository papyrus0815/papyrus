/**
 * Government Position Entity - Heads of State Hook
 * FSD: entities/government-position/model
 */
import { useEffect, useMemo, useState } from 'react'

import {
  FILTER_ALL,
  GLOBAL_POSITION_DEFINITION_IDS,
} from '@/features/event-list/lib'
import {
  HeadOfStateDuringEvent,
  findHeadsOfStateDuringPeriod,
} from '@/shared/api/government-positions'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS } from '../../../pages/events/list/mock-government-positions'
import { getPrimaryHeadOfState } from '../../../pages/events/utils/events.utils'

export const useHeadsOfState = (
  events: HistoricalEvent[],
  personsWithGovPositions: typeof MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS,
  selectedPositionType: string,
  /** false이면 교황 등 전역 수반 제외 */
  showGlobalHeadsOfState: boolean = true,
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
        showGlobalHeadsOfState ? undefined : GLOBAL_POSITION_DEFINITION_IDS,
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
        showGlobalHeadsOfState ? undefined : GLOBAL_POSITION_DEFINITION_IDS,
      )
      if (periodHeads.length > 0) {
        headsOfStateMap.set('__periodHeads__', periodHeads)
      }
    }
    setEventHeadsOfState(headsOfStateMap)
  }, [events, personsWithGovPositions, selectedPositionType, showGlobalHeadsOfState])

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

/**
 * 국가 원수 집권 기간별로 사건 그룹핑
 */
export const useTenureGroups = (
  flattenedHierarchy: Array<{
    node: any
    depth: number
    parentEvent: HistoricalEvent | null
  }>,
  eventHeadsOfState: Map<string, HeadOfStateDuringEvent[]>,
  events: HistoricalEvent[],
) => {
  return useMemo(() => {
    const groups: Array<{
      headOfState: HeadOfStateDuringEvent
      otherHeadsOfState: HeadOfStateDuringEvent[]
      eventIds: string[]
      startIndex: number
      endIndex: number
    }> = []

    // depth 0인 사건들만 처리
    const topLevelEvents = flattenedHierarchy.filter((item) => item.depth === 0)

    topLevelEvents.forEach((item, index) => {
      const headsOfState = eventHeadsOfState.get(item.node.id)
      if (!headsOfState || headsOfState.length === 0) return

      // 현재 노드의 이벤트 찾기
      const event =
        events.find((e) => e.id === item.node.id) ?? item.parentEvent
      if (!event) return

      // 우선순위로 가장 중요한 국가 원수 1명 선택
      const primaryHead = getPrimaryHeadOfState(headsOfState, event)
      const otherHeads = headsOfState.filter(
        (headOfState) =>
          headOfState.person.id !== primaryHead.person.id ||
          headOfState.tenure.startDate !== primaryHead.tenure.startDate,
      )

      // 이미 이 국가 원수의 그룹이 있는지 확인
      let existingGroup = groups.find(
        (group) =>
          group.headOfState.person.id === primaryHead.person.id &&
          group.headOfState.tenure.startDate === primaryHead.tenure.startDate,
      )

      if (existingGroup) {
        // 기존 그룹에 사건 추가
        existingGroup.eventIds.push(item.node.id)
        existingGroup.endIndex = index
        // 다른 국가 원수들 병합 (중복 제거)
        otherHeads.forEach((otherHead) => {
          const exists = existingGroup!.otherHeadsOfState.some(
            (existing) =>
              existing.person.id === otherHead.person.id &&
              existing.tenure.startDate === otherHead.tenure.startDate,
          )
          if (!exists) {
            existingGroup!.otherHeadsOfState.push(otherHead)
          }
        })
      } else {
        // 새 그룹 생성
        groups.push({
          headOfState: primaryHead,
          otherHeadsOfState: otherHeads,
          eventIds: [item.node.id],
          startIndex: index,
          endIndex: index,
        })
      }
    })

    // 한 인물·한 재임 = 한 그룹 유지 (연속 분할 제거). eventIds를 사건 시작일 기준 시간순 정렬 → 첫 사건=취임 연도, 마지막=퇴임 연도
    groups.forEach((group) => {
      group.eventIds.sort((idA, idB) => {
        const eventA = events.find((e) => e.id === idA)
        const eventB = events.find((e) => e.id === idB)
        const dateA = eventA?.startDate ?? ''
        const dateB = eventB?.startDate ?? ''
        return dateA.localeCompare(dateB)
      })
    })

    return groups
  }, [flattenedHierarchy, eventHeadsOfState, events])
}
