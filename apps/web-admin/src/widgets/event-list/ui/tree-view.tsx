/**
 * 트리 뷰 컴포넌트
 * FSD: widgets/event-list/ui
 *
 * 목록에서 하위 사건 계층을 손자까지 한눈에 보는 유일한 화면이다. 예전에는 어떤 노드도
 * 클릭·포커스가 되지 않아, 원하는 사건을 찾아도 **거기서 아무 데도 갈 수 없었다** —
 * 모달을 닫고 목록에서 그 행을 다시 찾아야 했다(검토 CTRL-7).
 * `onSelectNode`를 주면 카드가 버튼이 되어 그 사건을 열 수 있다.
 */
import React from 'react'

import type { EventHierarchyNode } from '@/pages/events/create/events.types'
import * as Modal from '@/pages/events/styles/modal.styles'
import { formatDateRange } from '@/pages/events/utils/events.utils'

interface TreeViewProps {
  node: EventHierarchyNode
  /**
   * 노드 선택 — 주면 카드가 버튼으로 승격된다. 생략하면 종전대로 읽기 전용 트리다
   * (다른 소비처의 계약을 깨지 않기 위해 선택 prop으로 둔다).
   */
  onSelectNode?: (eventId: string) => void
}

export const TreeView: React.FC<TreeViewProps> = ({ node, onSelectNode }) => {
  const renderTreeNode = (
    currentNode: EventHierarchyNode,
    depth: number,
  ): React.ReactNode => (
    <Modal.TreeNodeWrapper key={currentNode.id} $depth={depth}>
      <Modal.TreeNodeCard
        $depth={depth}
        $importance={currentNode.importance}
        {...(onSelectNode
          ? {
              as: 'button' as const,
              type: 'button' as const,
              onClick: () => onSelectNode(currentNode.id),
              'aria-label': `${currentNode.title} 열기`,
            }
          : {})}
      >
        <Modal.TreeNodeHeader>
          <Modal.TreeNodeTitle>{currentNode.title}</Modal.TreeNodeTitle>
        </Modal.TreeNodeHeader>
        <Modal.TreeNodeDate>
          {formatDateRange(
            currentNode.period.start,
            currentNode.period.end,
            currentNode.period.startPrecision,
            currentNode.period.endPrecision,
          )}
        </Modal.TreeNodeDate>
        <Modal.TreeNodeSummary>{currentNode.summary}</Modal.TreeNodeSummary>
      </Modal.TreeNodeCard>
      {currentNode.children && currentNode.children.length > 0 && (
        <Modal.TreeNodeChildren>
          {currentNode.children.map((child) =>
            renderTreeNode(child, depth + 1),
          )}
        </Modal.TreeNodeChildren>
      )}
    </Modal.TreeNodeWrapper>
  )

  return <Modal.TreeContainer>{renderTreeNode(node, 0)}</Modal.TreeContainer>
}
