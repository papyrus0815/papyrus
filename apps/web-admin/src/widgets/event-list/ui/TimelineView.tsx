/**
 * 타임라인 뷰 컴포넌트
 * FSD: widgets/event-list/ui
 */
import React from 'react'

import type { EventHierarchyNode } from '@/pages/events/create/events.types'
import { formatDateRange } from '@/pages/events/utils/events.utils'

import * as Modal from '@/pages/events/styles/modal.styles'

interface TimelineViewProps {
  node: EventHierarchyNode
}

export const TimelineView: React.FC<TimelineViewProps> = ({ node }) => {
  const allEvents: Array<{
    node: EventHierarchyNode
    depth: number
  }> = []

  const collectEvents = (currentNode: EventHierarchyNode, depth: number) => {
    allEvents.push({ node: currentNode, depth })
    if (currentNode.children) {
      currentNode.children.forEach((child) => collectEvents(child, depth + 1))
    }
  }

  collectEvents(node, 0)

  // 시간순 정렬
  const sortedEvents = [...allEvents].sort((eventA, eventB) => {
    const dateA = new Date(eventA.node.period.start).getTime()
    const dateB = new Date(eventB.node.period.start).getTime()
    return dateA - dateB
  })

  return (
    <Modal.TimelineContainer>
      {sortedEvents.map(({ node: eventNode, depth }) => (
        <Modal.TimelineEventCard key={eventNode.id} $depth={depth}>
          <Modal.TimelineEventDate>
            {formatDateRange(eventNode.period.start, eventNode.period.end)}
          </Modal.TimelineEventDate>
          <Modal.TimelineEventTitle>{eventNode.title}</Modal.TimelineEventTitle>
          <Modal.TimelineEventSummary>
            {eventNode.summary}
          </Modal.TimelineEventSummary>
          {eventNode.importance && (
            <Modal.TimelineImportance $importance={eventNode.importance}>
              {eventNode.importance === 'critical'
                ? '핵심'
                : eventNode.importance === 'major'
                  ? '주요'
                  : '일반'}
            </Modal.TimelineImportance>
          )}
        </Modal.TimelineEventCard>
      ))}
    </Modal.TimelineContainer>
  )
}
