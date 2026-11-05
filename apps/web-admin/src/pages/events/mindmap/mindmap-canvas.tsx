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

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

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
import { DIRECTED_RELATIONS, RELATION_DASH, RELATION_TYPE_NAME } from './survey-mindmap.lib'
import {
  MIND_NODE_SIZE,
  type MindCandidate,
  type MindNodeKind,
  type MindNodeSpec,
  type MindRelationItem,
  type MindmapData,
} from './mindmap-types'

interface MindmapCanvasProps {
  data: MindmapData
  /** 지도 높이 — minHeight를 주면 이것이 상한이고, 그림 높이에 맞춰 줄어든다 */
  height: number
  /**
   * 주면 그림 높이에 맞춘다(이 값 ~ height). 예전엔 마디 **개수**로 높이를 정해, 가로로 펼친 지롱드파 지도가 626px 중
   * 200px 띠에만 그려지고 위아래가 비었다
   */
  minHeight?: number
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
  /** 지도에 없는 사건 — 주면 '이을 사건' 서랍(끌어 지도의 사건·서랍의 다른 사건에 놓으면 잇기) */
  candidates?: MindCandidate[]
}

const DRAG_TYPE = 'application/x-papyrus-event'
/** 이을 사건 칸 폭 — 지도 위에 뜨면 가운데 사건을 가렸다(놓을 자리가 서랍에 덮였다). 옆 칸으로 */
const DRAWER_WIDTH = 264

/**
 * 화면 맞춤이 이 배율 아래로 내려가면 뿌리 둘레를 읽히는 배율로 먼저 보이고 나머지는 끌어서. 0.62였다가 0.5 —
 * 본문 열(650px)의 '국면까지' 첫 화면(프랑스 혁명 21마디)이 0.55배라 잘렸는데, 상위에선 전부 보여야 한다.
 */
const READABLE_ZOOM = 0.5
/** 이보다 멀면 사건 마디를 번호만으로(의미 축소) */
const FAR_ZOOM = 0.36

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
          {(data.number || data.year) && (
            <span className="meta">
              {data.number && <span className="number">{data.number}</span>}
              {data.year && <span className="year">{data.year}</span>}
            </span>
          )}
          <span className="label">{data.label}</span>
        </NodeButton>
      ) : (
        <NodeText>
          {(data.number || data.year) && (
            <span className="meta">
              {data.number && <span className="number">{data.number}</span>}
              {data.year && <span className="year">{data.year}</span>}
            </span>
          )}
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

/** 지도 위아래 덮개(찾기 줄·범례)가 먹는 높이 */
const CANVAS_CHROME = 104
const FIT_PADDING = 0.08

function MindmapFlow({
  data,
  height,
  minHeight,
  hotId = null,
  onOpen,
  onToggle,
  onHover,
  fullscreenTitle,
  onCreateRelation,
  onUpdateRelation,
  onDeleteRelation,
  onFullscreen,
  candidates = [],
}: MindmapCanvasProps & { onFullscreen?: () => void }) {
  const theme = useTheme()
  const { fitView, getZoom, setCenter, setViewport } = useReactFlow()
  const hostRef = useRef<HTMLDivElement>(null)
  const zoom = useStore((state) => state.transform[2])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [bubbleOnLeft, setBubbleOnLeft] = useState(false)
  /** 좁은 지도(본문 열) — 옆에 띄우면 어느 쪽이든 이웃을 덮어 아래 띠로 붙인다 */
  const [bubbleDocked, setBubbleDocked] = useState(false)
  /*
   * 마우스 올림은 잠깐 머물러야 잡는다 — 마디 사이 틈(≈5px)을 지날 때마다 '모두 흐림 ↔ 원래대로'가 번갈아
   * 그림 전체가 깜빡였다(흔들림). 들어갈 땐 90ms 머문 뒤, 나갈 땐 160ms 안에 다른 마디로 들어가면 놓지 않는다.
   */
  const hoverTimer = useRef<number | null>(null)
  const setHoverSteady = (id: string | null) => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(
      () => {
        /* 이유 말풍선은 마디 반대편에 — 마디 오른쪽(이어진 사건들 자리)을 덮었다 */
        const host = hostRef.current
        const element = id ? host?.querySelector(`.react-flow__node[data-id="${id}"]`) : null
        if (host && element && id) {
          /* 이어진 사건들이 주로 오른쪽에 있으면 왼쪽에, 아니면 오른쪽에 — 마디·이웃을 덮지 않게 */
          const rect = element.getBoundingClientRect()
          const center = rect.left + rect.width / 2
          const neighborCenters = data.relations
            .filter((relation) => relation.from === id || relation.to === id)
            .map((relation) => (relation.from === id ? relation.to : relation.from))
            .map((neighbor) => host.querySelector(`.react-flow__node[data-id="${neighbor}"]`)?.getBoundingClientRect())
            .filter((neighborRect): neighborRect is DOMRect => Boolean(neighborRect))
            .map((neighborRect) => neighborRect.left + neighborRect.width / 2)
          const hostRect = host.getBoundingClientRect()
          const leaning =
            neighborCenters.length > 0
              ? neighborCenters.reduce((sum, value) => sum + value, 0) / neighborCenters.length - center
              : hostRect.left + hostRect.width / 2 - center
          setBubbleOnLeft(leaning > 0)
          setBubbleDocked(hostRect.width < 900)
        }
        setHoveredId(id)
        onHover?.(id)
      },
      id ? 90 : 160,
    )
  }
  useEffect(
    () => () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current)
    },
    [],
  )
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ fromId: string; toId: string } | null>(null)
  /* '이을 사건' 서랍 — 관계가 하나도 없으면(빈 지도) 처음부터 연다: 끌 마디가 없는데 '끌어 놓으라'고만 했다 */
  const [drawerOpen, setDrawerOpen] = useState(() => data.relations.length === 0 && candidates.length > 0)
  const [drawerQuery, setDrawerQuery] = useState('')
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const candidateById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates])
  const titleOf = (id: string) => data.specs.get(id)?.label ?? candidateById.get(id)?.label ?? ''
  const [query, setQuery] = useState('')
  const [foundId, setFoundId] = useState<string | null>(null)
  const [cropped, setCropped] = useState(false)
  const activeId = hoveredId ?? foundId ?? hotId
  const positions = useMemo(() => layoutMindmap(data.tree), [data.tree])
  const canConnect = Boolean(onCreateRelation)
  /* 그림 맞춤 높이 — 지도 폭에서 맞춤 배율을 셈해(읽히는 하한 아래면 하한 배율) 그림 높이 + 덮개 */
  const [hostWidth, setHostWidth] = useState(0)
  useLayoutEffect(() => {
    if (minHeight == null) return
    const host = hostRef.current
    if (!host) return
    setHostWidth(host.clientWidth)
    const observer = new ResizeObserver(() => setHostWidth(host.clientWidth))
    observer.observe(host)
    return () => observer.disconnect()
  }, [minHeight])
  const fittedHeight = useMemo(() => {
    if (minHeight == null || hostWidth === 0 || positions.size === 0) return height
    let left = Infinity
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity
    for (const [id, position] of positions) {
      const spec = data.specs.get(id)
      if (!spec) continue
      const size = MIND_NODE_SIZE[spec.kind]
      left = Math.min(left, position.x)
      right = Math.max(right, position.x + size.width)
      top = Math.min(top, position.y)
      bottom = Math.max(bottom, position.y + size.height)
    }
    const pad = 1 + FIT_PADDING * 2
    /* 배율 상한 0.9 — 마디가 적은 지도(NSPM-2, 6마디)는 1.1배로 키워 맞추느라 오히려 커졌다. 0.9배면 글자가 읽히고 키는 준다 */
    const widthScale = Math.min(0.9, hostWidth / ((right - left) * pad))
    const scale = widthScale < READABLE_ZOOM ? READABLE_ZOOM + 0.08 : widthScale
    return Math.round(Math.min(height, Math.max(minHeight, (bottom - top) * pad * scale + CANVAS_CHROME)))
  }, [minHeight, hostWidth, positions, data.specs, height])

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

  /*
   * 마우스를 올린 사건의 **사슬 전체** — 방향 있는 연결을 따라 원인 쪽(위로)·결과 쪽(아래로) 끝까지, 방향 없는 연결은
   * 바로 이웃만. 예전엔 바로 이웃만 진해져 '이 일이 어디서 와서 어디로 갔나'를 한 번에 볼 수 없었다.
   */
  const connected = useMemo(() => {
    if (!activeId) return null
    const set = new Set<string>([activeId])
    const walk = (direction: 'down' | 'up') => {
      const queue = [activeId]
      const visited = new Set<string>([activeId])
      while (queue.length > 0) {
        const current = queue.shift()!
        for (const relation of data.relations) {
          if (!relation.arrow) continue
          const next = direction === 'down' ? (relation.from === current ? relation.to : null) : relation.to === current ? relation.from : null
          if (next && !visited.has(next)) {
            visited.add(next)
            set.add(next)
            queue.push(next)
          }
        }
      }
    }
    walk('down')
    walk('up')
    for (const relation of data.relations) {
      if (relation.arrow) continue
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
          hot: activeId === id || dropTargetId === id,
          dim: connected !== null && !connected.has(id) && spec.kind !== 'root',
          onOpen,
          onToggle,
          canConnect,
        },
      })
    }
    return list
  }, [positions, data.specs, activeId, connected, onOpen, onToggle, canConnect, dropTargetId])

  /* 연결 선은 글자 보조색 — 검정(본문 잉크)이면 선 30여 개가 마디 글보다 먼저 눈에 걸렸다 */
  const ink = theme.colors.text.secondary
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
          style: { stroke: color, strokeWidth: Math.max(1.2, 3.2 - depth * 0.7), strokeOpacity: connected ? 0.4 : 0.75 },
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
        (connected.has(relation.from) &&
          connected.has(relation.to) &&
          (relation.arrow || relation.from === activeId || relation.to === activeId))
      /* 보조 선(가지를 건너는·사슬을 이루지 않은 선)은 평소 한 단 흐리고 가늘게 — 주 사슬이 먼저 읽히게 */
      const restOpacity = relation.cross ? 0.32 : 0.8
      list.push({
        id: `rel:${relation.id}`,
        source: relation.from,
        target: relation.to,
        sourceHandle: bow ? (bow === 'left' ? 'l-s' : 'r-s') : forward ? 'r-s' : 'l-s',
        targetHandle: bow ? (bow === 'left' ? 'l-t' : 'r-t') : forward ? 'l-t' : 'r-t',
        type: 'relation',
        markerEnd: relation.arrow ? { type: MarkerType.ArrowClosed, color: ink, width: 12, height: 12 } : undefined,
        zIndex: 5,
        focusable: false,
        data: {
          dash: relation.dash,
          count: relation.count,
          bow,
          title: relation.title ? `${relation.title}\n(누르면 자세히)` : undefined,
          ink,
          opacity: touched ? (connected || selected ? 0.95 : restOpacity) : 0.12,
          /* 굵기는 그대로 — 올릴 때마다 1.6↔2.4로 바뀌면 선이 튀어 보였다. 진하기(투명도)만 바꾼다 */
          width: selected ? 2.4 : relation.cross ? 1.3 : 1.8,
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
          const oneSided = ![...positions.values()].some((position) => position.side === 'left')
          const rootPosition = positions.get(data.tree.id)
          const rootSpec = data.specs.get(data.tree.id)
          const host = hostRef.current
          if (oneSided && rootPosition && rootSpec && host) {
            /*
             * 한쪽으로만 뻗는 지도(관련 사건 사슬) — 뿌리를 가운데 두면 왼쪽 절반이 비었다. 뿌리를 왼쪽 끝에 붙인다.
             */
            const zoom = READABLE_ZOOM + 0.08
            const rootHeight = MIND_NODE_SIZE[rootSpec.kind].height
            void setViewport(
              {
                x: 24 - rootPosition.x * zoom,
                y: host.clientHeight / 2 - (rootPosition.y + rootHeight / 2) * zoom,
                zoom,
              },
              { duration: 200 },
            )
          } else centerOn(data.tree.id, READABLE_ZOOM + 0.08)
        } else setCropped(false)
      })
    })
    return () => cancelAnimationFrame(frame)
    // centerOn은 positions·specs에서 나온다(signature가 그 변화를 잡는다). 높이가 그림에 맞춰 바뀌면 다시 맞춘다
  }, [signature, fittedHeight, fitView])
  /* 칸이 열리고 닫히면 지도 폭이 바뀐다 — 다시 맞춘다 */
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => void fitView({ padding: 0.08, maxZoom: 1.1, duration: 200 })))
    return () => cancelAnimationFrame(frame)
  }, [drawerOpen, fitView])

  /* 범례 — 그림에 실제로 있는 관계 종류만(선 모양 = 종류). 지도 밖 칩과 떨어져 있으면 선을 보며 맞춰 읽기 어렵다 */
  const legendTypes = useMemo(() => {
    const present = new Set(data.relations.flatMap((relation) => (relation.items ?? []).map((item) => item.type)))
    return (['LED_TO', 'INFLUENCED', 'RESPONSE_TO', 'CONCURRENT', 'RELATED'] as const).filter((type) => present.has(type))
  }, [data.relations])
  const hasSecondary = data.relations.some((relation) => relation.cross)

  /* 마우스를 올린 사건의 연결 이유 — 선을 눌러야만 보이던 '왜'를 올리기만 해도(읽기 전용 말풍선) */
  const hoverReasons = useMemo(() => {
    if (!hoveredId) return []
    return data.relations
      .filter((relation) => relation.from === hoveredId || relation.to === hoveredId)
      .flatMap((relation) => relation.items ?? [])
      .slice(0, 6)
  }, [hoveredId, data.relations])

  const selectedEdge = selectedEdgeId ? data.relations.find((relation) => `rel:${relation.id}` === selectedEdgeId) : null
  const findMatches = (text: string) => {
    const needle = text.trim().toLowerCase()
    if (!needle) return []
    return [...data.specs.values()].filter(
      (spec) => spec.label.toLowerCase().includes(needle) || (spec.number ?? '').toLowerCase() === needle,
    )
  }

  return (
    <Host
      ref={hostRef}
      style={{ height: fittedHeight }}
      data-far={zoom < FAR_ZOOM ? '' : undefined}
      onDragOver={(dragEvent) => {
        if (!onCreateRelation || !dragEvent.dataTransfer.types.includes(DRAG_TYPE)) return
        dragEvent.preventDefault()
        const element = document.elementFromPoint(dragEvent.clientX, dragEvent.clientY)
        setDropTargetId(element?.closest('.react-flow__node')?.getAttribute('data-id') ?? null)
      }}
      onDragLeave={() => setDropTargetId(null)}
      onDrop={(dropEvent) => {
        const fromId = dropEvent.dataTransfer.getData(DRAG_TYPE)
        setDropTargetId(null)
        if (!fromId || !onCreateRelation) return
        const element = document.elementFromPoint(dropEvent.clientX, dropEvent.clientY)
        const toId = element?.closest('.react-flow__node')?.getAttribute('data-id')
        if (!toId || toId === fromId || !data.specs.get(toId)?.connectable) return
        dropEvent.preventDefault()
        setSelectedEdgeId(null)
        setPending({ fromId, toId })
      }}
    >
      <FlowArea style={{ left: drawerOpen && canConnect && candidates.length > 0 ? DRAWER_WIDTH : 0 }}>
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
        onNodeMouseEnter={(_, node) => setHoverSteady(node.id)}
        onNodeMouseLeave={() => setHoverSteady(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb'} />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
      </FlowArea>

      <TopBar style={{ left: (drawerOpen && canConnect && candidates.length > 0 ? DRAWER_WIDTH : 0) + 10 }}>
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
        {canConnect && candidates.length > 0 && (
          <DrawerToggle type="button" aria-pressed={drawerOpen} onClick={() => setDrawerOpen(!drawerOpen)}>
            이을 사건 {candidates.length}
          </DrawerToggle>
        )}
        {fullscreenTitle && onFullscreen && (
          <FullscreenButton type="button" onClick={onFullscreen} aria-label={`${fullscreenTitle} 전체 화면`}>
            <FiMaximize2 aria-hidden />
            전체 화면
          </FullscreenButton>
        )}
      </TopBar>

      {drawerOpen && canConnect && candidates.length > 0 && (
        <Drawer aria-label="이을 사건">
          <DrawerHead>
            <strong>이을 사건</strong>
            <span>아직 관련 사건이 없는 아래 사건 — 끌어서 지도의 사건이나 목록의 다른 사건 위에 놓으면 잇습니다</span>
          </DrawerHead>
          <input
            type="search"
            value={drawerQuery}
            onChange={(changeEvent) => setDrawerQuery(changeEvent.target.value)}
            placeholder="이름으로 거르기"
            aria-label="이을 사건 거르기"
          />
          <ul>
            {candidates
              .filter((candidate) => !drawerQuery.trim() || candidate.label.includes(drawerQuery.trim()))
              .map((candidate) => (
                <li
                  key={candidate.id}
                  draggable
                  data-drop={dropTargetId === candidate.id ? '' : undefined}
                  title={`${candidate.label} — 끌어서 다른 사건 위에 놓기`}
                  onDragStart={(dragEvent) => {
                    dragEvent.dataTransfer.setData(DRAG_TYPE, candidate.id)
                    dragEvent.dataTransfer.effectAllowed = 'link'
                  }}
                  onDragOver={(dragEvent) => {
                    if (!dragEvent.dataTransfer.types.includes(DRAG_TYPE)) return
                    dragEvent.preventDefault()
                    dragEvent.stopPropagation()
                    setDropTargetId(candidate.id)
                  }}
                  onDrop={(dropEvent) => {
                    const fromId = dropEvent.dataTransfer.getData(DRAG_TYPE)
                    dropEvent.preventDefault()
                    dropEvent.stopPropagation()
                    setDropTargetId(null)
                    if (!fromId || fromId === candidate.id) return
                    setSelectedEdgeId(null)
                    setPending({ fromId, toId: candidate.id })
                  }}
                >
                  <span className="meta">
                    {candidate.number && <span className="number">{candidate.number}</span>}
                    {candidate.year && <span className="year">{candidate.year}</span>}
                  </span>
                  <span className="label">{candidate.label}</span>
                </li>
              ))}
          </ul>
        </Drawer>
      )}

      {hoveredId && hoverReasons.length > 0 && !selectedEdge && !pending && (
        <ReasonBubble
          aria-hidden="true"
          data-docked={bubbleDocked ? '' : undefined}
          style={
            bubbleDocked
              ? { left: (drawerOpen && canConnect && candidates.length > 0 ? DRAWER_WIDTH : 0) + 10 }
              : bubbleOnLeft
                ? { left: (drawerOpen && canConnect && candidates.length > 0 ? DRAWER_WIDTH : 0) + 10, right: 'auto' }
                : undefined
          }
        >
          {hoverReasons.slice(0, bubbleDocked ? 3 : 6).map((item) => {
            const outgoing = item.fromId === hoveredId || data.specs.get(hoveredId)?.label === item.fromTitle
            return (
              <li key={item.id}>
                <span className="direction">
                  {outgoing ? '→' : '←'} {RELATION_TYPE_NAME[item.type]}
                </span>
                <strong>{outgoing ? item.toTitle : item.fromTitle}</strong>
                {item.description && <span className="why">{item.description}</span>}
              </li>
            )
          })}
        </ReasonBubble>
      )}

      {legendTypes.length > 0 && !(bubbleDocked && hoveredId && hoverReasons.length > 0 && !selectedEdge && !pending) && (
        <Legend aria-label="선 모양 — 관계 종류" style={{ left: (drawerOpen && canConnect && candidates.length > 0 ? DRAWER_WIDTH : 0) + 10 }}>
          {legendTypes.map((type) => (
            <li key={type}>
              <svg width="26" height="8" aria-hidden="true">
                <line x1="1" y1="4" x2={DIRECTED_RELATIONS.has(type) ? 19 : 25} y2="4" stroke="currentColor" strokeWidth="1.8" strokeDasharray={RELATION_DASH[type] || undefined} strokeLinecap="round" />
                {DIRECTED_RELATIONS.has(type) && <path d="M19,1 L25,4 L19,7 z" fill="currentColor" />}
              </svg>
              {RELATION_TYPE_NAME[type]}
            </li>
          ))}
          {hasSecondary && <li className="secondary">흐린 선 = 사슬을 가로지르는 연결</li>}
        </Legend>
      )}

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
          fromTitle={titleOf(pending.fromId)}
          toTitle={titleOf(pending.toId)}
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
            <MindmapFlow {...props} minHeight={undefined} height={Math.round(window.innerHeight * 0.78)} />
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
  &[data-far] .mind-event .meta {
    border-right: 0;
  }
  &[data-far] .mind-event .year,
  &[data-far] .mind-external .label {
    display: none;
  }
  &[data-far] .mind-event .number {
    font-size: 18px;
    color: inherit;
  }

  /* 손잡이는 마디 안쪽 끝 — 바깥(-7px)에 두면 손잡이로 가는 순간 마디를 벗어나 '나감→들어옴'이 되풀이됐다 */
  .react-flow__handle.mind-connect {
    width: 14px;
    height: 14px;
    right: 3px;
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
  .react-flow__edge-path {
    transition: stroke-opacity 0.18s ease;
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

const Legend = styled.ul`
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 6;
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  max-width: calc(100% - 80px);
  margin: 0;
  padding: 5px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  list-style: none;
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  pointer-events: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .secondary {
    color: ${metaText};
  }
`

const DrawerToggle = styled.button`
  padding: 4px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.primary};
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &[aria-pressed='true'] {
    border-color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const FlowArea = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`

const Drawer = styled.aside`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 7;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: ${DRAWER_WIDTH}px;
  box-sizing: border-box;
  padding: 12px 10px 10px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};

  input {
    padding: 5px 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 6px;
    background: transparent;
    font: inherit;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ul {
    flex: 1 1 auto;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
    scrollbar-width: thin;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 6px;
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: grab;

    &:hover {
      background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)')};
    }
    &[data-drop] {
      border-color: ${({ theme }) => theme.colors.text.primary};
    }
  }
  .meta {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    min-width: 34px;
    line-height: 1.1;
  }
  .number {
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .year {
    font-size: 10px;
    color: ${metaText};
  }
  .label {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.25;
  }
`

const DrawerHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  span {
    font-size: 11.5px;
    line-height: 1.4;
    color: ${metaText};
  }
`

const ReasonBubble = styled.ul`
  position: absolute;
  top: 48px;
  right: 10px;
  z-index: 7;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(280px, calc(100% - 20px));
  max-height: calc(100% - 110px);
  overflow: hidden;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  list-style: none;
  background: ${({ theme }) => theme.colors.background.primary};
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
  pointer-events: none;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};

  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* 아래 띠 — 지도 아래쪽(범례 자리)에 가로로, 한 항목 두 줄 */
  &[data-docked] {
    top: auto;
    bottom: 10px;
    right: 56px;
    width: auto;
    max-height: none;
    flex-direction: row;
    gap: 14px;

    li {
      flex: 1 1 0;
      min-width: 0;
    }
    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .direction {
    font-size: 11px;
    font-weight: 700;
    color: ${metaText};
  }
  .why {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.45;
    color: ${({ theme }) => theme.colors.text.secondary};
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
  font-size: 12px;
  line-height: 1.2;
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  transition: opacity 0.18s ease, outline-color 0.18s ease;

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
        border-radius: 8px;
        background: ${surface};
        color: ${ink};
        border: 1.5px dashed ${theme.colors.text.secondary};
      `
    /* 사건 — 중립 직사각형(색 띠 없음, 사용자 지시). 어느 묶음인지는 번호(1-…·3-…)가 든다 */
    return `
      border-radius: 8px;
      background: ${surface};
      color: ${ink};
      border: 1px solid ${theme.colors.border.default};
      padding: 0 10px;
    `
  }}

  /* 강조는 outline — 사건 마디의 왼쪽 색 띠(inset box-shadow)를 덮지 않고, 자리도 차지하지 않는다 */
  outline: 2px solid ${({ $hot, theme }) => ($hot ? theme.colors.text.primary : 'transparent')};
  /* 사슬에 든 마디(흐리지 않은 것) — 테두리를 한 단 진하게 */
  outline-offset: 2px;
`

const NodeButton = styled.button`
  display: flex;
  align-items: baseline;
  gap: 8px;
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

  /* 왼쪽 메타 칸 — 번호(위)·연도(아래). 제목 뒤에 붙던 연도가 두 줄 제목과 자리를 다퉜다 */
  .meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 1px;
    flex-shrink: 0;
    min-width: 34px;
    padding-right: 8px;
    border-right: 1px solid ${({ theme }) => theme.colors.border.default};
    line-height: 1.1;
  }
  .number {
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  /* 두 줄까지 — 넘치면 말줄임(전체는 마우스 올림) */
  .label {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    min-width: 0;
    overflow: hidden;
    line-height: 1.25;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
  /* 마우스 올림 밑줄 없음(사용자 지시) — 강조는 사슬 진하기·테두리가 맡는다 */
  .year {
    font-size: 10px;
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

  .meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex-shrink: 0;
    min-width: 34px;
    padding-right: 8px;
    border-right: 1px solid ${({ theme }) => theme.colors.border.default};
    line-height: 1.1;
  }
  .year {
    font-size: 10px;
    color: ${metaText};
  }

  .number {
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .label {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    min-width: 0;
    overflow: hidden;
    line-height: 1.25;
    word-break: keep-all;
    overflow-wrap: anywhere;
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
