/**
 * 트리 뷰 컴포넌트
 * FSD: widgets/event-list/ui
 */
import React from 'react'

import type { EventHierarchyNode } from '@/pages/events/create/events.types'
import * as Modal from '@/pages/events/styles/modal.styles'
import { formatDateRange } from '@/pages/events/utils/events.utils'

interface TreeViewProps {
  node: EventHierarchyNode
}

export const TreeView: React.FC<TreeViewProps> = ({ node }) => {
  const renderTreeNode = (
    currentNode: EventHierarchyNode,
    depth: number,
  ): React.ReactNode => (
    <Modal.TreeNodeWrapper key={currentNode.id} $depth={depth}>
      <Modal.TreeNodeCard $depth={depth} $importance={currentNode.importance}>
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
