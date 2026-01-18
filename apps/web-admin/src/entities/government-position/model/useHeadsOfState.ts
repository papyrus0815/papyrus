/**
 * Government Position Entity - Heads of State Hook
 * FSD: entities/government-position/model
 */

import { useEffect, useState, useMemo } from 'react'

import {
  HeadOfStateDuringEvent,
  findHeadsOfStateDuringPeriod,
} from '@/shared/api/government-positions'
import { FILTER_ALL } from '@/features/event-list/lib'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS } from '../../../pages/events/list/mock-government-positions'
import { getPrimaryHeadOfState } from '../../../pages/events/utils/events.utils'

export const useHeadsOfState = (
  events: HistoricalEvent[],
  personsWithGovPositions: typeof MOCK_PERSONS_WITH_GOVERNMENT_POSITIONS,
  selectedPositionType: string,
) => {
  const [eventHeadsOfState, setEventHeadsOfState] = useState<
    Map<string, HeadOfStateDuringEvent[]>
  >(new Map())

  const [expandedTenureGroups, setExpandedTenureGroups] = useState<Set<string>>(
    new Set(),
  )

  // 선택된 직업 타입에 따라 국가 원수 목록 필터링
  useEffect(() => {
    if (events.length === 0 || personsWithGovPositions.length === 0) return

    const headsOfStateMap = new Map<string, HeadOfStateDuringEvent[]>()
    events.forEach((event) => {
      const headsOfState = findHeadsOfStateDuringPeriod(
        event.startDate,
        event.endDate,
        personsWithGovPositions,
        selectedPositionType === FILTER_ALL ? undefined : selectedPositionType,
      )
      if (headsOfState.length > 0) {
        headsOfStateMap.set(event.id, headsOfState)
      }
    })
    setEventHeadsOfState(headsOfStateMap)
    console.log('👑 사건별 국가 원수 (필터링됨):', headsOfStateMap)
    console.log('💼 선택된 직업:', selectedPositionType)
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

    // 연속된 사건들만 그룹으로 유지 (중간에 빈 공간이 있으면 분리)
    const continuousGroups: typeof groups = []
    groups.forEach((group) => {
      // ✅ 모든 사건에 국가 원수 표시 (1개여도 표시)
      // if (group.eventIds.length < 2) {
      //   // 1개 사건만 있으면 그룹으로 표시하지 않음
      //   return
      // }

      // 연속성 확인
      const indices = topLevelEvents
        .map((item, idx) => (group.eventIds.includes(item.node.id) ? idx : -1))
        .filter((idx) => idx !== -1)

      let currentGroup: typeof group | null = null
      for (let i = 0; i < indices.length; i++) {
        if (i === 0 || indices[i] === indices[i - 1] + 1) {
          if (!currentGroup) {
            currentGroup = {
              ...group,
              eventIds: [topLevelEvents[indices[i]].node.id],
              startIndex: indices[i],
              endIndex: indices[i],
            }
          } else {
            currentGroup.eventIds.push(topLevelEvents[indices[i]].node.id)
            currentGroup.endIndex = indices[i]
          }
        } else {
          // ✅ 1개 사건도 표시
          if (currentGroup) {
            continuousGroups.push(currentGroup)
          }
          currentGroup = {
            ...group,
            eventIds: [topLevelEvents[indices[i]].node.id],
            startIndex: indices[i],
            endIndex: indices[i],
          }
        }
      }
      // ✅ 1개 사건도 표시
      if (currentGroup) {
        continuousGroups.push(currentGroup)
      }
    })

    return continuousGroups
  }, [flattenedHierarchy, eventHeadsOfState, events])
}

