/**
 * 사건 마인드맵 캔버스 — 조망 › 연결과 상세 › 연관이 같은 그림 문법으로 쓴다(어댑터가 나무·마디·연결을 만든다).
 *
 * - 뼈대(나무) 선: 가지 색, 뿌리에서 멀수록 가늘게. 좌·우는 mindmap-layout이 나눈다.
 * - 연결 선: 글자 잉크 한 색, 선 모양 = 관계 종류(간트 화살표와 같은 규약), 방향 종류만 화살촉. 같은 열끼리는 바깥으로 휜다.
 * - 마디에 마우스를 올리면 그 마디에 닿는 연결만 진하게, 나머지는 흐리게.
 * - 마디 = 단추(Enter로 열기). 접을 수 있는 마디는 옆 ▸/▾.
 * '@xyflow/react'가 무거워 이 파일은 lazy로만 싣는다.
 */
import '@xyflow/react/dist/style.css'

import { memo, useEffect, useMemo, useState } from 'react'

import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  type Edge,
  type EdgeProps,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react'
import styled, { useTheme } from 'styled-components'

import { metaText } from '@/pages/events/styles/theme'

import { type MindPosition, type MindTreeNode, layoutMindmap } from './mindmap-layout'
import { MIND_NODE_SIZE, type MindNodeKind, type MindNodeSpec, type MindmapData } from './mindmap-types'

interface MindmapCanvasProps {
  data: MindmapData
  height: number
  hotId?: string | null
  onOpen: (id: string) => void
  onToggle?: (id: string) => void
  onHover?: (id: string | null) => void
}

type MindNodeData = MindNodeSpec & {
  side: MindPosition['side']
  hot: boolean
  dim: boolean
  onOpen: (id: string) => void
  onToggle?: (id: string) => void
}

const MindNode = memo(function MindNode({ data }: NodeProps<Node<MindNodeData>>) {
  const size = MIND_NODE_SIZE[data.kind]
  const toggle = data.collapse && data.onToggle && (
    <Toggle
      type="button"
      className="nodrag"
      aria-expanded={!data.collapse.collapsed}
      aria-label={`${data.label} ${data.collapse.collapsed ? '펼치기' : '접기'}`}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation()
        data.onToggle?.(data.id)
      }}
    >
      {data.collapse.collapsed ? `▸ ${data.collapse.hidden}` : '▾'}
    </Toggle>
  )
  return (
    <NodeBox
      $kind={data.kind}
      $color={data.color ?? null}
      $hot={data.hot}
      $dim={data.dim}
      $focus={Boolean(data.focus)}
      style={{ width: size.width, height: size.height }}
      title={[data.number, data.label].filter(Boolean).join(' ') + (data.hint ? `\n${data.hint}` : '')}
    >
      {(['l', 'r'] as const).map((side) => (
        <span key={side}>
          <Handle id={`${side}-s`} type="source" position={side === 'l' ? Position.Left : Position.Right} isConnectable={false} />
          <Handle id={`${side}-t`} type="target" position={side === 'l' ? Position.Left : Position.Right} isConnectable={false} />
        </span>
      ))}
      {data.side === 'left' && toggle}
      {data.openable ? (
        <NodeButton type="button" className="nodrag" onClick={() => data.onOpen(data.id)}>
          {data.number && <span className="number">{data.number}</span>}
          <span className="label">{data.label}</span>
        </NodeButton>
      ) : (
        <NodeText>
          {data.number && <span className="number">{data.number}</span>}
          <span className="label">{data.label}</span>
        </NodeText>
      )}
      {data.side !== 'left' && toggle}
    </NodeBox>
  )
})

type RelationEdgeData = { dash?: string; count?: number; bow?: 'left' | 'right' | null; title?: string; ink: string; opacity: number; width: number }

function RelationEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }: EdgeProps<Edge<RelationEdgeData>>) {
  let path: string
  let labelX: number
  let labelY: number
  if (data?.bow) {
    /* 같은 열 — 바깥으로 휘는 곡선 */
    const reach = Math.max(48, Math.abs(targetY - sourceY) * 0.35)
    const dx = data.bow === 'right' ? reach : -reach
    path = `M${sourceX},${sourceY} C${sourceX + dx},${sourceY} ${targetX + dx},${targetY} ${targetX},${targetY}`
    labelX = (sourceX + targetX) / 2 + dx * 0.75
    labelY = (sourceY + targetY) / 2
  } else {
    ;[path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  }
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: data?.ink,
          strokeWidth: data?.width ?? 1.6,
          strokeOpacity: data?.opacity ?? 0.7,
          strokeDasharray: data?.dash || undefined,
          strokeLinecap: 'round',
        }}
        label={data?.count && data.count > 1 ? `×${data.count}` : undefined}
        labelX={labelX}
        labelY={labelY}
        labelStyle={{ fontSize: 11, fontWeight: 700 }}
        labelBgPadding={[4, 2]}
        labelBgBorderRadius={4}
      />
      {data?.title && <title>{data.title}</title>}
    </>
  )
}

const nodeTypes = { mind: MindNode }
const edgeTypes = { relation: RelationEdge }

function MindmapFlow({ data, height, hotId = null, onOpen, onToggle, onHover }: MindmapCanvasProps) {
  const theme = useTheme()
  const { fitView } = useReactFlow()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const activeId = hoveredId ?? hotId
  const positions = useMemo(() => layoutMindmap(data.tree), [data.tree])

  const connected = useMemo(() => {
    if (!activeId) return null
    const set = new Set<string>([activeId])
    for (const relation of data.relations) {
      if (relation.from === activeId) set.add(relation.to)
      if (relation.to === activeId) set.add(relation.from)
    }
    return set
  }, [activeId, data.relations])

  const nodes = useMemo<Node<MindNodeData>[]>(() => {
    const list: Node<MindNodeData>[] = []
    for (const [id, position] of positions) {
      const spec = data.specs.get(id)
      if (!spec) continue
      list.push({
        id,
        type: 'mind',
        position: { x: position.x, y: position.y },
        draggable: false,
        selectable: false,
        data: {
          ...spec,
          side: position.side,
          hot: activeId === id,
          dim: connected !== null && !connected.has(id) && spec.kind !== 'root',
          onOpen,
          onToggle,
        },
      })
    }
    return list
  }, [positions, data.specs, activeId, connected, onOpen, onToggle])

  const ink = theme.colors.text.primary
  const edges = useMemo<Edge[]>(() => {
    const list: Edge[] = []
    /* 나무 선 — 부모 → 자식, 자식 쪽 바깥 손잡이 */
    const visit = (node: MindTreeNode, depth: number) => {
      for (const child of node.children) {
        if (data.specs.get(child.id)?.hideTreeEdge) {
          visit(child, depth + 1)
          continue
        }
        const side = positions.get(child.id)?.side
        const color = data.specs.get(child.id)?.color ?? data.specs.get(node.id)?.color ?? theme.colors.border.default
        list.push({
          id: `tree:${node.id}>${child.id}`,
          source: node.id,
          target: child.id,
          sourceHandle: side === 'left' ? 'l-s' : 'r-s',
          targetHandle: side === 'left' ? 'r-t' : 'l-t',
          type: 'default',
          style: { stroke: color, strokeWidth: Math.max(1.2, 3.2 - depth * 0.7), strokeOpacity: connected ? 0.35 : 0.75 },
          focusable: false,
        })
        visit(child, depth + 1)
      }
    }
    visit(data.tree, 0)
    for (const relation of data.relations) {
      const source = positions.get(relation.from)
      const target = positions.get(relation.to)
      if (!source || !target) continue
      const sourceSpec = data.specs.get(relation.from)
      const targetSpec = data.specs.get(relation.to)
      const sourceCenter = source.x + (sourceSpec ? MIND_NODE_SIZE[sourceSpec.kind].width / 2 : 0)
      const targetCenter = target.x + (targetSpec ? MIND_NODE_SIZE[targetSpec.kind].width / 2 : 0)
      const sameColumn = Math.abs(sourceCenter - targetCenter) < 40
      const bow = sameColumn ? (source.side === 'left' ? 'left' : 'right') : null
      const forward = targetCenter > sourceCenter
      const touched = connected === null || (connected.has(relation.from) && connected.has(relation.to) && (relation.from === activeId || relation.to === activeId))
      list.push({
        id: `rel:${relation.id}`,
        source: relation.from,
        target: relation.to,
        sourceHandle: bow ? (bow === 'left' ? 'l-s' : 'r-s') : forward ? 'r-s' : 'l-s',
        targetHandle: bow ? (bow === 'left' ? 'l-t' : 'r-t') : forward ? 'l-t' : 'r-t',
        type: 'relation',
        markerEnd: relation.arrow ? { type: MarkerType.ArrowClosed, color: ink, width: 16, height: 16 } : undefined,
        zIndex: 5,
        focusable: false,
        data: {
          dash: relation.dash,
          count: relation.count,
          bow,
          title: relation.title,
          ink,
          opacity: touched ? (connected ? 0.95 : 0.7) : 0.12,
          width: connected && touched ? 2.2 : 1.6,
        },
      })
    }
    return list
  }, [data, positions, connected, activeId, ink, theme])

  /* 그림이 바뀌면(모드·접기·거르기) 전체 맞춤 */
  const signature = [...positions.keys()].join('|')
  useEffect(() => {
    const frame = requestAnimationFrame(() => void fitView({ padding: 0.08, duration: 200, maxZoom: 1.1 }))
    return () => cancelAnimationFrame(frame)
  }, [signature, fitView])

  return (
    <Host style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1.1 }}
        minZoom={0.15}
        maxZoom={1.8}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch
        preventScrolling={false}
        onNodeMouseEnter={(_, node) => {
          setHoveredId(node.id)
          onHover?.(node.id)
        }}
        onNodeMouseLeave={() => {
          setHoveredId(null)
          onHover?.(null)
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb'} />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
    </Host>
  )
}

export default function MindmapCanvas(props: MindmapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MindmapFlow {...props} />
    </ReactFlowProvider>
  )
}

const Host = styled.div`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};

  .react-flow__handle {
    width: 1px;
    height: 1px;
    min-width: 0;
    min-height: 0;
    border: 0;
    background: transparent;
    opacity: 0;
  }
  .react-flow__edge-textbg {
    fill: ${({ theme }) => theme.colors.background.primary};
  }
  .react-flow__edge-text {
    fill: ${({ theme }) => theme.colors.text.primary};
  }
  .react-flow__controls button {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`

const NodeBox = styled.div<{ $kind: MindNodeKind; $color: string | null; $hot: boolean; $dim: boolean; $focus: boolean }>`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  font-size: 12.5px;
  line-height: 1.2;
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  transition: opacity 0.12s;

  ${({ $kind, $color, theme, $focus }) => {
    const surface = theme.colors.background.primary
    const ink = theme.colors.text.primary
    if ($kind === 'root' || $focus)
      return `
        border-radius: 12px;
        background: ${ink};
        color: ${surface};
        font-size: 14px;
        font-weight: 800;
        padding: 0 14px;
      `
    if ($kind === 'branch')
      return `
        border-radius: 10px;
        background: ${surface};
        color: ${ink};
        border: 2px solid ${$color ?? theme.colors.border.default};
        font-weight: 700;
      `
    if ($kind === 'phase')
      return `
        border-radius: 6px;
        background: transparent;
        color: ${theme.colors.text.secondary};
        border-left: 3px solid ${$color ?? theme.colors.border.default};
        font-size: 11.5px;
        font-weight: 600;
      `
    if ($kind === 'external')
      return `
        border-radius: 999px;
        background: ${surface};
        color: ${ink};
        border: 1.5px dashed ${theme.colors.text.secondary};
      `
    return `
      border-radius: 999px;
      background: ${surface};
      color: ${ink};
      border: 1px solid ${theme.colors.border.default};
      box-shadow: inset 3px 0 0 ${$color ?? theme.colors.border.default};
    `
  }}

  ${({ $hot, theme }) => ($hot ? `outline: 2px solid ${theme.colors.text.primary}; outline-offset: 2px;` : '')}
`

const NodeButton = styled.button`
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  align-items: center;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 3px;
    border-radius: 6px;
  }

  .number {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${metaText};
  }
  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover .label {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const NodeText = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;

  .number {
    flex-shrink: 0;
    font-size: 11px;
    color: ${metaText};
  }
  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Toggle = styled.button`
  flex-shrink: 0;
  padding: 1px 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`
