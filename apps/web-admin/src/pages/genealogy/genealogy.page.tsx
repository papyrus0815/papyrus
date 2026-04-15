/**
 * 전체 가계도 페이지
 * - @xyflow/react 기반 무한 캔버스
 * - ego 기준 최대 3세대 위 / 2세대 아래 / 형제자매 / 배우자
 */
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import styled from 'styled-components'
import { FiArrowLeft, FiUsers } from 'react-icons/fi'

import { getPersonFamilyTree, type FamilyTreePerson, type FamilyTreeData } from '@/shared/api/persons-family-tree'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

// ─── Layout constants ──────────────────────────────────────────────
const NODE_W = 164
const NODE_H = 210
const H_GAP = 48
const V_GAP = 100
const STEP = NODE_W + H_GAP

// ─── Layout constants (derived) ───────────────────────────────────
// COUPLE_STEP: minimum horizontal distance between ego and a spouse,
// ensuring their parent rows (each ±STEP/2 wide) don't overlap.
// Math: wife_left_parent = wife_x - STEP/2; ego_right_parent = ego_x + STEP/2
// No-overlap requires: wife_x - STEP/2 ≥ ego_x + STEP/2 + NODE_W + H_GAP
//   → wife_x ≥ ego_x + STEP + NODE_W + H_GAP = STEP + STEP = 2·STEP
const COUPLE_STEP = STEP * 2  // 424px

// ─── Layout algorithm ─────────────────────────────────────────────
//
// Overview (left→right, gen -N↑ to gen +N↓):
//  A. Build adjacency from edges
//  B. Assign generations: Phase 1 BFS from ego (parent-child), then
//     Phase 2 propagates gens to spouse families
//  C. Place ego's descendant subtree top-down centered at x=0
//  D. Place ego's spouses to the RIGHT (at least COUPLE_STEP from ego)
//  E. Place ego's TRUE siblings (share a parent with ego) to the LEFT
//  F. Place ancestor rows (gen < 0) centered over positioned children;
//     spouse pairs are offset ±STEP/2 from their couple center
//  G. Fallback: any still-unplaced node goes after the rightmost node
//
function computeLayout(
  data: FamilyTreeData,
): Record<string, { x: number; y: number }> {
  const { nodes, edges, egoId } = data

  // ── A. Adjacency ──────────────────────────────────────────────────
  const childrenOf = new Map<string, string[]>()
  const parentsOf  = new Map<string, string[]>()
  const spousesOf  = new Map<string, string[]>()

  const addTo = (map: Map<string, string[]>, key: string, val: string) => {
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(val)
  }

  for (const e of edges) {
    if (e.type === 'parent-child') {
      addTo(childrenOf, e.source, e.target)
      addTo(parentsOf,  e.target, e.source)
    } else {
      addTo(spousesOf, e.source, e.target)
      addTo(spousesOf, e.target, e.source)
    }
  }

  // ── B. Generation assignment ──────────────────────────────────────
  // Phase 1: BFS from ego via parent-child edges
  const genMap = new Map<string, number>([[egoId, 0]])
  {
    const q: string[] = [egoId]
    while (q.length) {
      const id = q.shift()!
      const g  = genMap.get(id)!
      for (const pid of parentsOf.get(id) ?? []) {
        if (!genMap.has(pid)) { genMap.set(pid, g - 1); q.push(pid) }
      }
      for (const cid of childrenOf.get(id) ?? []) {
        if (!genMap.has(cid)) { genMap.set(cid, g + 1); q.push(cid) }
      }
    }
  }

  // Phase 2: propagate to spouse families (spouses get same gen, then
  //          their blood tree is BFS-expanded with parent-child edges)
  {
    const q: string[] = []
    for (const n of nodes) {
      if (genMap.has(n.id)) continue
      for (const sid of spousesOf.get(n.id) ?? []) {
        if (genMap.has(sid)) {
          genMap.set(n.id, genMap.get(sid)!)
          q.push(n.id)
          break
        }
      }
    }
    while (q.length) {
      const id = q.shift()!
      const g  = genMap.get(id)!
      for (const pid of parentsOf.get(id) ?? []) {
        if (!genMap.has(pid)) { genMap.set(pid, g - 1); q.push(pid) }
      }
      for (const cid of childrenOf.get(id) ?? []) {
        if (!genMap.has(cid)) { genMap.set(cid, g + 1); q.push(cid) }
      }
    }
  }

  // Fallback for completely isolated nodes
  for (const n of nodes) {
    if (!genMap.has(n.id)) genMap.set(n.id, 0)
  }

  // ── C. Ego's descendant subtree (subtree-width algorithm) ─────────
  // "desc children" of id = children at exactly id's gen + 1
  const descCh = (id: string): string[] =>
    (childrenOf.get(id) ?? []).filter(c => genMap.get(c) === (genMap.get(id) ?? 0) + 1)

  const subW = new Map<string, number>()
  const getSubW = (id: string): number => {
    if (subW.has(id)) return subW.get(id)!
    const ch = descCh(id)
    const w  = ch.length === 0 ? STEP : ch.reduce((s, c) => s + getSubW(c), 0)
    subW.set(id, w)
    return w
  }
  getSubW(egoId)

  const xMap = new Map<string, number>()

  const placeDesc = (id: string, cx: number) => {
    xMap.set(id, cx)
    const ch = descCh(id)
    if (!ch.length) return
    const total = ch.reduce((s, c) => s + getSubW(c), 0)
    let left = cx - total / 2
    for (const c of ch) {
      const w = getSubW(c)
      placeDesc(c, left + w / 2)
      left += w
    }
  }
  placeDesc(egoId, 0)

  const maxX = () => (xMap.size ? Math.max(...xMap.values()) : 0)
  const minX = () => (xMap.size ? Math.min(...xMap.values()) : 0)

  // ── D. Ego's spouses → right (COUPLE_STEP clearance) ─────────────
  const egoSpouseSet = new Set(spousesOf.get(egoId) ?? [])

  // Ensure at least COUPLE_STEP from ego (x=0) so parent rows don't collide
  let rightCursor = Math.max(maxX() + STEP, COUPLE_STEP)
  for (const sid of egoSpouseSet) {
    xMap.set(sid, rightCursor)
    // Check if this spouse has parents in the graph
    const spouseHasParents = (parentsOf.get(sid) ?? []).some(pid =>
      nodes.some(n => n.id === pid),
    )
    // Gap between consecutive spouses also needs COUPLE_STEP if they show parents
    rightCursor += spouseHasParents ? COUPLE_STEP : STEP
  }

  // ── E. Ego's TRUE siblings → left ────────────────────────────────
  // Siblings = gen-0 nodes that share at least one parent with ego
  const egoParentSet = new Set(parentsOf.get(egoId) ?? [])
  const siblings = nodes.filter(n => {
    if (n.id === egoId || egoSpouseSet.has(n.id)) return false
    if (genMap.get(n.id) !== 0) return false
    return (parentsOf.get(n.id) ?? []).some(pid => egoParentSet.has(pid))
  })

  let leftCursor = minX() - STEP
  // Reverse: sibling closest to ego is placed first
  for (const sib of [...siblings].reverse()) {
    if (!xMap.has(sib.id)) {
      xMap.set(sib.id, leftCursor)
      leftCursor -= STEP
    }
  }

  // ── F. Ancestor rows (gen < 0), nearest-first ────────────────────
  const allGens     = [...new Set(genMap.values())].sort((a, b) => a - b)
  const ancestorGens = allGens.filter(g => g < 0).sort((a, b) => b - a) // -1, -2, …

  for (const g of ancestorGens) {
    const unplaced = nodes.filter(n => genMap.get(n.id) === g && !xMap.has(n.id))

    // Ideal center X for each unplaced ancestor = midpoint of its positioned children
    const idealX = new Map<string, number>()
    for (const n of unplaced) {
      const posKids = (childrenOf.get(n.id) ?? []).filter(
        c => genMap.get(c) === g + 1 && xMap.has(c),
      )
      if (posKids.length > 0) {
        const xs = posKids.map(c => xMap.get(c)!)
        idealX.set(n.id, (Math.min(...xs) + Math.max(...xs)) / 2)
      }
    }

    // Place as spouse pairs (offset ±STEP/2 from couple center), then individuals
    const processed = new Set<string>()
    for (const n of unplaced) {
      if (processed.has(n.id)) continue
      processed.add(n.id)

      // Find an unplaced spouse at the same gen
      const partner = (spousesOf.get(n.id) ?? []).find(
        sid => genMap.get(sid) === g && !xMap.has(sid) && !processed.has(sid),
      )

      if (partner) {
        processed.add(partner)
        // Couple center = midpoint of all positioned children of both
        const allKids = [
          ...(childrenOf.get(n.id) ?? []),
          ...(childrenOf.get(partner) ?? []),
        ].filter(c => genMap.get(c) === g + 1 && xMap.has(c))

        let center: number
        if (allKids.length > 0) {
          const xs = allKids.map(c => xMap.get(c)!)
          center = (Math.min(...xs) + Math.max(...xs)) / 2
        } else if (idealX.has(n.id) || idealX.has(partner)) {
          center = ((idealX.get(n.id) ?? idealX.get(partner)!) +
                    (idealX.get(partner) ?? idealX.get(n.id)!)) / 2
        } else {
          // Neither has positioned children: append after rightmost placed node
          center = maxX() + COUPLE_STEP
        }
        xMap.set(n.id, center - STEP / 2)
        xMap.set(partner,  center + STEP / 2)
      } else {
        // Individual (no partner at this gen)
        xMap.set(n.id, idealX.get(n.id) ?? (maxX() + STEP))
      }
    }
  }

  // ── G. Fallback: anything still unplaced ─────────────────────────
  let fb = maxX() + COUPLE_STEP
  for (const n of nodes) {
    if (!xMap.has(n.id)) {
      xMap.set(n.id, fb)
      fb += STEP
    }
  }

  // ── Build result ──────────────────────────────────────────────────
  const positions: Record<string, { x: number; y: number }> = {}
  for (const n of nodes) {
    const g = genMap.get(n.id) ?? 0
    positions[n.id] = {
      x: xMap.get(n.id) ?? 0,
      y: g * (NODE_H + V_GAP),
    }
  }
  return positions
}

// ─── Build React Flow graph ────────────────────────────────────────
function buildGraph(data: FamilyTreeData): { rfNodes: Node[]; rfEdges: Edge[] } {
  const positions = computeLayout(data)

  const rfNodes: Node[] = data.nodes.map(p => ({
    id: p.id,
    type: 'personNode',
    position: positions[p.id] ?? { x: 0, y: 0 },
    data: { person: p, isEgo: p.id === data.egoId },
    draggable: true,
  }))

  const rfEdges: Edge[] = data.edges.map((e, i) => {
    const isSpouse = e.type === 'spouse'
    return {
      id: `e-${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: isSpouse ? 'straight' : 'smoothstep',
      animated: false,
      label: isSpouse ? '♥' : undefined,
      labelStyle: isSpouse ? { fill: '#e11d48', fontWeight: 700, fontSize: 14 } : undefined,
      labelBgStyle: isSpouse ? { fill: 'transparent' } : undefined,
      style: isSpouse
        ? { stroke: '#fda4af', strokeWidth: 1.5, strokeDasharray: '4 3' }
        : { stroke: '#94a3b8', strokeWidth: 1.5 },
      markerEnd: isSpouse ? undefined : {
        type: 'arrowclosed' as any,
        width: 12,
        height: 12,
        color: '#94a3b8',
      },
    }
  })

  return { rfNodes, rfEdges }
}

// ─── Person Node component ─────────────────────────────────────────
function PersonNodeInner({ data }: NodeProps) {
  const { person, isEgo } = data as { person: FamilyTreePerson; isEgo: boolean }
  const navigate = useNavigate()

  const displayName = getPersonDisplayName(
    {
      name: person.name,
      surname: person.surname,
      middleName: person.middleName,
      nameDisplayOrder: person.nameDisplayOrder,
    },
    true,
  )

  const src = person.profileImageUrl
    ? getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl
    : null

  const initial = [...(displayName.trim() || '?')][0] ?? '?'

  const lifeSpan =
    person.birthYear != null || person.deathYear != null
      ? `${person.birthYear ?? '?'}–${person.deathYear ?? ''}`
      : null

  return (
    <NodeWrap
      $isEgo={isEgo}
      onClick={() => navigate(`/persons/${person.id}/`)}
      title={`${displayName} 상세 보기`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left-t" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-t" style={{ opacity: 0 }} />

      <NodeAvatar $isEgo={isEgo} $hasImg={!!src}>
        {src
          ? <img src={src} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          : <span style={{ fontSize: 22, fontWeight: 700, color: isEgo ? '#fff' : 'var(--node-text, #475569)' }}>{initial}</span>}
      </NodeAvatar>

      {person.regnalName && (
        <NodeRegnalName>{person.regnalName}</NodeRegnalName>
      )}

      <NodeName $isEgo={isEgo}>{displayName}</NodeName>

      {lifeSpan && <NodeMeta>{lifeSpan}</NodeMeta>}

      {person.dynasty?.name && (
        <NodeDynasty>{person.dynasty.name}</NodeDynasty>
      )}

      {isEgo && <EgoBadge>본인</EgoBadge>}

      <NodeClickOverlay />
    </NodeWrap>
  )
}

const nodeTypes = { personNode: PersonNodeInner }

// ─── Inner flow component (needs ReactFlowProvider context) ─────────
function GenealogyFlow({ personId }: { personId: string }) {
  const navigate = useNavigate()
  const { fitView } = useReactFlow()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['family-tree', personId],
    queryFn: () => getPersonFamilyTree(personId),
    staleTime: 5 * 60 * 1000,
  })

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!data || data.nodes.length === 0) return { rfNodes: [], rfEdges: [] }
    return buildGraph(data)
  }, [data])

  const onInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.15 }), 100)
  }, [fitView])

  // fitView를 데이터 로드 후에도 재실행 (onInit은 마운트 시 한 번만 실행되므로)
  useEffect(() => {
    if (rfNodes.length === 0) return
    const timer = setTimeout(() => fitView({ padding: 0.15 }), 150)
    return () => clearTimeout(timer)
  }, [rfNodes.length, fitView])

  const egoName = useMemo(() => {
    if (!data) return ''
    const ego = data.nodes.find(n => n.id === data.egoId)
    if (!ego) return ''
    return getPersonDisplayName({ name: ego.name, surname: ego.surname, middleName: ego.middleName, nameDisplayOrder: ego.nameDisplayOrder }, true)
  }, [data])

  return (
    <PageRoot>
      <PageHeader>
        <BackBtn onClick={() => navigate(-1)}>
          <FiArrowLeft size={16} />
          <span>돌아가기</span>
        </BackBtn>
        <HeaderCenter>
          <FiUsers size={16} strokeWidth={1.75} />
          <HeaderTitle>전체 가계도{egoName ? ` — ${egoName}` : ''}</HeaderTitle>
        </HeaderCenter>
        <HeaderRight>
          <NodeCount>{data?.nodes.length ?? 0}명</NodeCount>
        </HeaderRight>
      </PageHeader>

      <FlowWrap>
        {isLoading && (
          <LoadingOverlay>
            <LoadingSpinner />
            <span>가계도 불러오는 중…</span>
          </LoadingOverlay>
        )}
        {isError && (
          <ErrorOverlay>
            <span>가계도를 불러올 수 없습니다.</span>
          </ErrorOverlay>
        )}

        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          minZoom={0.05}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
          <Controls position="bottom-right" />
          <MiniMap
            nodeColor={(n) => (n.data as any)?.isEgo ? '#6366f1' : '#cbd5e1'}
            maskColor="rgba(248,250,252,0.8)"
            position="bottom-left"
          />
        </ReactFlow>
      </FlowWrap>
    </PageRoot>
  )
}

// ─── Page export (wrapped in ReactFlowProvider) ────────────────────
export default function GenealogyPage() {
  const { personId } = useParams<{ personId: string }>()

  if (!personId) return null

  return (
    <ReactFlowProvider>
      <GenealogyFlow personId={personId} />
    </ReactFlowProvider>
  )
}

// ─── Styled components ────────────────────────────────────────────
const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100dvh;
  background: ${({ theme }) => theme.colors.background.primary};
  overflow: hidden;
`

const PageHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  height: 56px;
  flex-shrink: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  z-index: 10;
`

const BackBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const HeaderCenter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
`

const NodeCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border-radius: 8px;
  padding: 3px 10px;
`

const FlowWrap = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;

  /* React Flow 기본 스타일 오버라이드 */
  .react-flow__controls {
    button {
      border-radius: 8px;
    }
  }
`

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LoadingSpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid ${({ theme }) => theme.colors.border.light};
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`

const ErrorOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #ef4444;
  background: ${({ theme }) => theme.colors.background.primary};
`

// ─── Node styled components ───────────────────────────────────────
// 라이트/다크 모드 모두 지원하기 위해 CSS 변수와 prefers-color-scheme 사용
const NodeWrap = styled.div<{ $isEgo: boolean }>`
  position: relative;
  width: ${NODE_W}px;
  min-height: ${NODE_H}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 16px 12px 14px;
  border-radius: 16px;
  box-sizing: border-box;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
  background: ${({ $isEgo }) => $isEgo
    ? 'linear-gradient(145deg, #6366f1 0%, #818cf8 100%)'
    : 'var(--node-bg, #fff)'};
  border: ${({ $isEgo }) => $isEgo ? '2px solid #4f46e5' : '1.5px solid var(--node-border, #e2e8f0)'};
  box-shadow: ${({ $isEgo }) => $isEgo ? '0 4px 24px rgba(99,102,241,0.35)' : '0 2px 8px rgba(0,0,0,0.06)'};
  &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }

  @media (prefers-color-scheme: dark) {
    --node-bg: #1e293b;
    --node-border: #334155;
    --node-text: #f1f5f9;
    --node-text-meta: #64748b;
    --node-avatar-bg: #0f172a;
    --node-avatar-border: #334155;
  }
  @media (prefers-color-scheme: light) {
    --node-bg: #fff;
    --node-border: #e2e8f0;
    --node-text: #1e293b;
    --node-text-meta: #94a3b8;
    --node-avatar-bg: #f1f5f9;
    --node-avatar-border: #e2e8f0;
  }
`

const NodeAvatar = styled.div<{ $isEgo: boolean; $hasImg: boolean }>`
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
  background: ${({ $isEgo, $hasImg }) => $isEgo ? 'rgba(255,255,255,0.25)' : $hasImg ? 'transparent' : 'var(--node-avatar-bg, #f1f5f9)'};
  border: ${({ $isEgo }) => $isEgo ? '2px solid rgba(255,255,255,0.5)' : '2px solid var(--node-avatar-border, #e2e8f0)'};
`

const NodeRegnalName = styled.div`
  font-size: 10px; font-weight: 700; letter-spacing: -0.01em; color: #d97706;
  text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
`

const NodeName = styled.div<{ $isEgo: boolean }>`
  font-size: 13px; font-weight: ${({ $isEgo }) => $isEgo ? 700 : 600};
  letter-spacing: -0.02em; text-align: center; line-height: 1.35; word-break: keep-all;
  color: ${({ $isEgo }) => $isEgo ? '#fff' : 'var(--node-text, #1e293b)'};
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; max-width: 100%;
`

const NodeMeta = styled.div`
  font-size: 11px; color: var(--node-text-meta, #94a3b8); text-align: center; letter-spacing: 0.01em;
`

const NodeDynasty = styled.div`
  font-size: 10.5px; font-weight: 500; color: #6366f1;
  background: rgba(99,102,241,0.08); border-radius: 6px; padding: 1px 7px;
  text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`

const EgoBadge = styled.div`
  font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85);
  letter-spacing: 0.05em; text-transform: uppercase;
`

// pointer-events: none으로 설정하여 ReactFlow 드래그와 충돌하지 않도록 함.
// 클릭 이벤트는 NodeWrap의 onClick으로 위임한다.
const NodeClickOverlay = styled.div`
  position: absolute; inset: 0; border-radius: inherit;
  pointer-events: none;
`
