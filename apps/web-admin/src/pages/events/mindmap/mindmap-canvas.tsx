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

import { FiMaximize2, FiSearch } from 'react-icons/fi'

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
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
  useStore,
} from '@xyflow/react'
import styled, { useTheme } from 'styled-components'

import { metaText } from '@/pages/events/styles/theme'
import { Modal } from '@/shared/ui/modal'

import { type MindPosition, type MindTreeNode, layoutMindmap } from './mindmap-layout'
import { NewRelationCard, RelationCard, type RelationDraft } from './mindmap-relation-card'
import {
  MIND_NODE_SIZE,
  type MindNodeKind,
  type MindNodeSpec,
  type MindRelationItem,
  type MindmapData,
} from './mindmap-types'

interface MindmapCanvasProps {
  data: MindmapData
  height: number
  hotId?: string | null
  onOpen: (id: string) => void
  onToggle?: (id: string) => void
  onHover?: (id: string | null) => void
  /** 주면 '전체 화면' 단추 — 그 창의 제목 */
  fullscreenTitle?: string
  /** 마디를 끌어 다른 마디에 놓아 잇기 — 주면 잇기 손잡이가 선다 */
  onCreateRelation?: (fromId: string, toId: string, draft: RelationDraft) => Promise<void>
  onUpdateRelation?: (item: MindRelationItem, draft: RelationDraft) => Promise<void>
  onDeleteRelation?: (item: MindRelationItem) => Promise<void>
}

/** 화면 맞춤이 이 배율 아래로 내려가면(글자 ≈7px) 뿌리 둘레를 읽히는 배율로 먼저 보이고 나머지는 끌어서 */
const READABLE_ZOOM = 0.62
/** 이보다 멀면 사건 마디를 번호만으로(의미 축소) */
const FAR_ZOOM = 0.42

type MindNodeData = MindNodeSpec & {
  side: MindPosition['side']
  hot: boolean
  dim: boolean
  onOpen: (id: string) => void
  onToggle?: (id: string) => void
  canConnect: boolean
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
      className={`mind-node mind-${data.kind}`}
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
      {/* 잇기 손잡이 — 마우스를 올리면 오른쪽 끝에 '+'. 끌어서 다른 마디에 놓으면 새 연결 */}
      {data.canConnect && data.connectable && (
        <Handle
          id="connect"
          type="source"
          position={Position.Right}
          className="mind-connect"
          title="끌어서 다른 사건에 놓으면 연결"
        />
      )}
      {data.side === 'left' && toggle}
      {data.openable ? (
        <NodeButton type="button" className="nodrag" onClick={() => data.onOpen(data.id)}>
          {data.number && <span className="number">{data.number}</span>}
          <span className="label">{data.label}</span>
          {data.year && <span className="year">{data.year}</span>}
        </NodeButton>
      ) : (
        <NodeText>
          {data.number && <span className="number">{data.number}</span>}
          <span className="label">{data.label}</span>
          {data.year && <span className="year">{data.year}</span>}
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
        interactionWidth={14}
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

function MindmapFlow({
  data,
  height,
  hotId = null,
  onOpen,
  onToggle,
  onHover,
  fullscreenTitle,
  onCreateRelation,
  onUpdateRelation,
  onDeleteRelation,
  onFullscreen,
}: MindmapCanvasProps & { onFullscreen?: () => void }) {
  const theme = useTheme()
  const { fitView, getZoom, setCenter } = useReactFlow()
  const zoom = useStore((state) => state.transform[2])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ fromId: string; toId: string } | null>(null)
  const [query, setQuery] = useState('')
  const [foundId, setFoundId] = useState<string | null>(null)
  const [cropped, setCropped] = useState(false)
  const activeId = hoveredId ?? foundId ?? hotId
  const positions = useMemo(() => layoutMindmap(data.tree), [data.tree])
  const canConnect = Boolean(onCreateRelation)

  const centerOn = (id: string, nextZoom?: number) => {
    const position = positions.get(id)
    const spec = data.specs.get(id)
    if (!position || !spec) return
    const size = MIND_NODE_SIZE[spec.kind]
    void setCenter(position.x + size.width / 2, position.y + size.height / 2, {
      zoom: nextZoom ?? Math.max(getZoom(), READABLE_ZOOM + 0.1),
      duration: 250,
    })
  }

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
          canConnect,
        },
      })
    }
    return list
  }, [positions, data.specs, activeId, connected, onOpen, onToggle, canConnect])

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
      const selected = selectedEdgeId === `rel:${relation.id}`
      const touched =
        selected ||
        connected === null ||
        (connected.has(relation.from) && connected.has(relation.to) && (relation.from === activeId || relation.to === activeId))
      /* 가지를 건너는 선은 평소 한 단 흐리게 — 뿌리를 가로질러 그림을 가른다 */
      const restOpacity = relation.cross ? 0.4 : 0.7
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
          title: relation.title ? `${relation.title}\n(누르면 자세히)` : undefined,
          ink,
          opacity: touched ? (connected || selected ? 0.95 : restOpacity) : 0.12,
          width: (connected && touched) || selected ? 2.4 : 1.6,
        },
      })
    }
    return list
  }, [data, positions, connected, activeId, ink, theme, selectedEdgeId])

  /*
   * 그림이 바뀌면(모드·접기·거르기) 전체 맞춤 — 맞춤 배율이 읽히는 하한보다 작으면 뿌리 둘레를 읽히는 배율로 먼저 보이고
   * '일부만 보임'을 알린다(휴대폰 0.26배에서 글자 3px이었다).
   */
  const signature = [...positions.keys()].join('|')
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.08, maxZoom: 1.1 }).then(() => {
        if (getZoom() < READABLE_ZOOM) {
          setCropped(true)
          centerOn(data.tree.id, READABLE_ZOOM + 0.08)
        } else setCropped(false)
      })
    })
    return () => cancelAnimationFrame(frame)
    // centerOn은 positions·specs에서 나온다(signature가 그 변화를 잡는다)
  }, [signature, fitView])

  const selectedEdge = selectedEdgeId ? data.relations.find((relation) => `rel:${relation.id}` === selectedEdgeId) : null
  const findMatches = (text: string) => {
    const needle = text.trim().toLowerCase()
    if (!needle) return []
    return [...data.specs.values()].filter(
      (spec) => spec.label.toLowerCase().includes(needle) || (spec.number ?? '').toLowerCase() === needle,
    )
  }

  return (
    <Host style={{ height }} data-far={zoom < FAR_ZOOM ? '' : undefined}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={canConnect}
        connectionMode={ConnectionMode.Loose}
        /* 놓는 자리는 xyflow 손잡이 판정 대신 '포인터 아래 마디'로 — 1px 손잡이를 맞힐 수 없다 */
        isValidConnection={() => false}
        onConnectEnd={(pointerEvent, state) => {
          const fromId = state.fromNode?.id
          const point = 'changedTouches' in pointerEvent ? pointerEvent.changedTouches[0] : pointerEvent
          const element = document.elementFromPoint(point.clientX, point.clientY)
          const toId = element?.closest('.react-flow__node')?.getAttribute('data-id') ?? null
          if (!fromId || !toId || fromId === toId) return
          if (!data.specs.get(toId)?.connectable) return
          setSelectedEdgeId(null)
          setPending({ fromId, toId })
        }}
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
        onEdgeClick={(_, edge) => {
          if (edge.type !== 'relation') return
          setPending(null)
          setSelectedEdgeId(edge.id === selectedEdgeId ? null : edge.id)
        }}
        onPaneClick={() => setSelectedEdgeId(null)}
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

      <TopBar>
        <SearchBox>
          <FiSearch aria-hidden />
          <input
            type="search"
            value={query}
            placeholder="마디 찾기"
            aria-label="마인드맵에서 사건 찾기"
            onChange={(changeEvent) => {
              setQuery(changeEvent.target.value)
              const first = findMatches(changeEvent.target.value)[0]
              setFoundId(first?.id ?? null)
            }}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key !== 'Enter') return
              const matches = findMatches(query)
              if (matches.length === 0) return
              const index = Math.max(0, matches.findIndex((spec) => spec.id === foundId))
              const next = matches[(index + (foundId ? 1 : 0)) % matches.length]
              setFoundId(next.id)
              centerOn(next.id)
            }}
          />
          {query.trim() && <span className="count">{findMatches(query).length}</span>}
        </SearchBox>
        {cropped && (
          <Cropped>
            일부만 보입니다 — 끌어서 둘러보기 ·{' '}
            <button type="button" onClick={() => void fitView({ padding: 0.08, duration: 250 })}>
              전체 맞춤
            </button>
          </Cropped>
        )}
        {fullscreenTitle && onFullscreen && (
          <FullscreenButton type="button" onClick={onFullscreen} aria-label={`${fullscreenTitle} 전체 화면`}>
            <FiMaximize2 aria-hidden />
            전체 화면
          </FullscreenButton>
        )}
      </TopBar>

      {selectedEdge?.items && selectedEdge.items.length > 0 && (
        <RelationCard
          items={selectedEdge.items}
          onClose={() => setSelectedEdgeId(null)}
          onSave={
            onUpdateRelation
              ? async (item, draft) => {
                  await onUpdateRelation(item, draft)
                }
              : undefined
          }
          onDelete={
            onDeleteRelation
              ? async (item) => {
                  await onDeleteRelation(item)
                  setSelectedEdgeId(null)
                }
              : undefined
          }
        />
      )}
      {pending && onCreateRelation && (
        <NewRelationCard
          fromTitle={data.specs.get(pending.fromId)?.label ?? ''}
          toTitle={data.specs.get(pending.toId)?.label ?? ''}
          onCancel={() => setPending(null)}
          onCreate={async (draft) => {
            await onCreateRelation(pending.fromId, pending.toId, draft)
            setPending(null)
          }}
        />
      )}
    </Host>
  )
}

export default function MindmapCanvas(props: MindmapCanvasProps) {
  const [fullscreen, setFullscreen] = useState(false)
  return (
    <>
      <ReactFlowProvider>
        <MindmapFlow {...props} onFullscreen={props.fullscreenTitle ? () => setFullscreen(true) : undefined} />
      </ReactFlowProvider>
      {/* 전체 화면 — 공용 Modal(Esc·포커스 가둠). 지면은 container-type이라 fixed 자손을 직접 띄우면 갇힌다 */}
      {fullscreen && (
        <Modal isOpen onClose={() => setFullscreen(false)} title={props.fullscreenTitle} maxWidth="min(1680px, 96vw)">
          <ReactFlowProvider>
            <MindmapFlow {...props} height={Math.round(window.innerHeight * 0.78)} />
          </ReactFlowProvider>
        </Modal>
      )}
    </>
  )
}

const Host = styled.div`
  position: relative;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};

  /* 멀리 줄었을 때 — 사건 마디는 번호만(글자가 점처럼 되기 전에 의미를 줄인다) */
  &[data-far] .mind-event .label,
  &[data-far] .mind-event .year,
  &[data-far] .mind-external .label {
    display: none;
  }
  &[data-far] .mind-event .number {
    font-size: 18px;
    color: inherit;
  }

  .react-flow__handle.mind-connect {
    width: 14px;
    height: 14px;
    right: -7px;
    border: 2px solid ${({ theme }) => theme.colors.background.primary};
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.text.primary};
    opacity: 0;
    cursor: crosshair;
    transition: opacity 0.12s;
  }
  .react-flow__node:hover .react-flow__handle.mind-connect,
  .react-flow__handle.mind-connect.connectingfrom {
    opacity: 1;
  }

  .react-flow__handle:not(.mind-connect) {
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

const TopBar = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 6;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`

const SearchBox = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 12.5px;
  color: ${metaText};

  input {
    width: 140px;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .count {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const Cropped = styled.span`
  padding: 3px 8px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 12px;
  color: ${metaText};

  button {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    cursor: pointer;
  }
`

const FullscreenButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 4px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.primary};
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  svg {
    width: 13px;
    height: 13px;
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
  .year {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    color: ${metaText};
  }
`

const NodeText = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;

  .year {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 10.5px;
    color: ${metaText};
  }

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
