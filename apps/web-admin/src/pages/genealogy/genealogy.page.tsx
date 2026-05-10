/**
 * 전체 가계도 페이지
 * - @xyflow/react 기반 무한 캔버스
 * - ego 기준 최대 N세대 위/아래/형제자매/배우자 (BFS 11단계)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import styled from 'styled-components'
import { FiArrowLeft, FiDownload, FiSearch, FiTarget, FiUsers } from 'react-icons/fi'

import { getPersonFamilyTree, type FamilyTreePerson, type FamilyTreeData } from '@/shared/api/persons-family-tree'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

// ─── Layout sizes ──────────────────────────────────────────────────
// 데스크탑/모바일 분기 — 노드 카드와 간격을 viewport에 맞춰 축소.
// 모바일에선 fitView가 작은 폭에 맞춰 zoom out하므로 카드를 같이 축소해야
// 화면에 더 많은 세대가 한 눈에 들어옴.
interface LayoutSizes {
  NODE_W: number
  NODE_H: number
  H_GAP: number
  V_GAP: number
  AVATAR: number
}

const DESKTOP_SIZES: LayoutSizes = {
  NODE_W: 164,
  NODE_H: 210,
  H_GAP: 48,
  V_GAP: 100,
  AVATAR: 64,
}

const COMPACT_SIZES: LayoutSizes = {
  NODE_W: 120,
  NODE_H: 160,
  H_GAP: 32,
  V_GAP: 70,
  AVATAR: 48,
}

/**
 * STEP·COUPLE_STEP 도출:
 * - STEP = NODE_W + H_GAP — 형제·자식 간 기본 가로 간격
 * - COUPLE_STEP = 2·STEP — 부부 사이 최소 거리 (양쪽 부모 행 ±STEP/2 폭이 겹치지 않게)
 *   증명: wife_x ≥ ego_x + STEP/2 + NODE_W + H_GAP + STEP/2 = ego_x + 2·STEP
 */
function deriveSteps(s: LayoutSizes) {
  const STEP = s.NODE_W + s.H_GAP
  return { STEP, COUPLE_STEP: STEP * 2 }
}

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
  sizes: LayoutSizes,
): Record<string, { x: number; y: number }> {
  const { nodes, edges, egoId } = data
  const { NODE_H, V_GAP } = sizes
  const { STEP, COUPLE_STEP } = deriveSteps(sizes)

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
function buildGraph(
  data: FamilyTreeData,
  sizes: LayoutSizes,
): { rfNodes: Node[]; rfEdges: Edge[] } {
  const positions = computeLayout(data, sizes)

  const rfNodes: Node[] = data.nodes.map(p => ({
    id: p.id,
    type: 'personNode',
    position: positions[p.id] ?? { x: 0, y: 0 },
    data: { person: p, isEgo: p.id === data.egoId, sizes },
    draggable: true,
  }))

  const rfEdges: Edge[] = data.edges.map((e, i) => {
    const isSpouse = e.type === 'spouse'
    const inferred = isSpouse && Boolean((e as any).inferred)
    const marriagePeriod =
      isSpouse && (e.marriageStartYear != null || e.marriageEndYear != null)
        ? `${e.marriageStartYear ?? '?'}–${e.marriageEndYear ?? ''}`
        : null
    const labelText = isSpouse
      ? (inferred ? '♡' : (marriagePeriod ? `♥ ${marriagePeriod}` : '♥'))
      : undefined
    return {
      id: `e-${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: isSpouse ? 'straight' : 'smoothstep',
      animated: false,
      label: labelText,
      labelStyle: isSpouse
        ? {
            fill: inferred ? '#cbd5e1' : '#e11d48',
            fontWeight: 700,
            fontSize: 12,
          }
        : undefined,
      labelBgStyle: isSpouse ? { fill: 'transparent' } : undefined,
      style: isSpouse
        ? {
            stroke: inferred ? '#e2e8f0' : '#fda4af',
            strokeWidth: inferred ? 1 : 1.5,
            strokeDasharray: inferred ? '2 4' : '4 3',
            opacity: inferred ? 0.65 : 1,
          }
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

// ─── Helpers ────────────────────────────────────────────────────────
/** 카드 아바타 우하단 작은 국기 뱃지 — emoji > thumbnailUrl > flagcdn(isoCode) 우선순위 */
function CountryFlag({
  flag,
  countryName,
  size = 18,
}: {
  flag: { flagEmoji?: string | null; isoCode?: string | null; thumbnailUrl?: string | null } | null | undefined
  countryName?: string | null
  size?: number
}) {
  if (!flag) return null
  const emoji = flag.flagEmoji ?? null
  const thumb = flag.thumbnailUrl
    ? (getUploadImageUrl(flag.thumbnailUrl) || flag.thumbnailUrl)
    : null
  const flagcdn = flag.isoCode
    ? `https://flagcdn.com/w40/${flag.isoCode.toLowerCase()}.png`
    : null
  const title = countryName ?? undefined
  if (emoji) {
    return (
      <CountryFlagBadge $size={size} title={title} aria-label={countryName ? `${countryName} 국기` : '국기'}>
        <span aria-hidden style={{ fontSize: `${Math.round(size * 0.85)}px`, lineHeight: 1 }}>{emoji}</span>
      </CountryFlagBadge>
    )
  }
  const imgSrc = thumb ?? flagcdn
  if (imgSrc) {
    return (
      <CountryFlagBadge $size={size} title={title} aria-label={countryName ? `${countryName} 국기` : '국기'}>
        <img src={imgSrc} alt="" loading="lazy" decoding="async" />
      </CountryFlagBadge>
    )
  }
  return null
}

function buildPersonTooltip(p: FamilyTreePerson, displayName: string): string {
  const lines: string[] = [`${displayName} — 클릭: 상세 / Shift+클릭: 중심 변경`]
  if (p.originalName) lines.push(`원어 — ${p.originalName}`)
  if (p.preEnthronementTitle) lines.push(`작호 — ${p.preEnthronementTitle}`)
  if (p.templeName) lines.push(`묘호 — ${p.templeName}`)
  if (p.posthumousName) lines.push(`시호 — ${p.posthumousName}`)
  if (p.birthPlace) lines.push(`출생 — ${p.birthPlace}`)
  if (p.deathPlace) lines.push(`사망 — ${p.deathPlace}`)
  return lines.join('\n')
}

// ─── Person Node component ─────────────────────────────────────────
function PersonNodeInner({ data }: NodeProps) {
  const { person, isEgo, sizes } = data as {
    person: FamilyTreePerson
    isEgo: boolean
    sizes: LayoutSizes
  }
  const navigate = useNavigate()

  const baseName = getPersonDisplayName(
    {
      name: person.name,
      surname: person.surname,
      middleName: person.middleName,
      nameDisplayOrder: person.nameDisplayOrder,
    },
    true,
  )
  const displayName = person.illegitimate ? `${baseName}*` : baseName

  const src = person.profileImageUrl
    ? getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl
    : null

  const initial = [...(baseName.trim() || '?')][0] ?? '?'

  const lifeSpan =
    person.birthYear != null || person.deathYear != null
      ? `${person.birthYear ?? '?'}–${person.deathYear ?? ''}`
      : null
  const isDeceased = person.deathYear != null
  const handleClick = (ev: React.MouseEvent) => {
    if (!person.id) return
    if (ev.shiftKey) {
      // Shift+클릭: 가계도 중심을 이 인물로 변경 (C2)
      navigate(`/genealogy/${person.id}/`)
    } else {
      navigate(`/persons/${person.id}/`)
    }
  }

  return (
    <NodeWrap
      $isEgo={isEgo}
      $deceased={isDeceased}
      $w={sizes.NODE_W}
      $h={sizes.NODE_H}
      onClick={handleClick}
      title={buildPersonTooltip(person, displayName)}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left-t" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-t" style={{ opacity: 0 }} />

      <AvatarFrame>
        <NodeAvatar
          $isEgo={isEgo}
          $hasImg={!!src}
          $deceased={isDeceased}
          $size={sizes.AVATAR}
        >
          {src
            ? <img src={src} alt={baseName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', borderRadius: '50%' }} />
            : <span style={{ fontSize: 22, fontWeight: 700, color: isEgo ? '#fff' : 'var(--node-text, #475569)' }}>{initial}</span>}
        </NodeAvatar>
        {(() => {
          const flag = person.flag ?? person.sovereignCountry ?? person.country
          if (!flag) return null
          const countryName = (flag as any).countryName ?? (flag as any).name ?? null
          return <CountryFlag flag={flag} countryName={countryName} size={22} />
        })()}
      </AvatarFrame>

      {person.regnalName && (
        <NodeRegnalName>
          ♛ {person.regnalName}
          {person.sovereignCountry?.regnalNumber != null && (
            <span style={{ marginLeft: 4, opacity: 0.85, fontWeight: 600, fontSize: '0.85em' }}>
              {person.sovereignCountry.regnalNumber}대
            </span>
          )}
          {person.sovereignCountry?.name && (
            <span style={{ marginLeft: 4, opacity: 0.75, fontWeight: 500, fontSize: '0.85em' }}>
              · {person.sovereignCountry.name}
            </span>
          )}
        </NodeRegnalName>
      )}

      <NodeName $isEgo={isEgo}>
        {displayName}
        {isDeceased && <span style={{ marginLeft: 4, fontWeight: 500, opacity: 0.6 }}>†</span>}
      </NodeName>

      {lifeSpan && <NodeMeta>{lifeSpan}</NodeMeta>}

      {person.dynasty?.name && (
        <NodeDynasty>{person.dynasty.name}</NodeDynasty>
      )}

      {isEgo && <EgoBadge>본인</EgoBadge>}

      <RecenterHint aria-hidden>
        <FiTarget size={9} strokeWidth={2.4} />
      </RecenterHint>

      <NodeClickOverlay />
    </NodeWrap>
  )
}

const nodeTypes = { personNode: PersonNodeInner }

/**
 * 모바일 폭(<=640px) 매칭 — 노드 크기·간격을 컴팩트로 전환.
 * SSR 가드 포함 (matchMedia 미존재 환경 대비).
 */
function useIsCompactLayout(): boolean {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(max-width: 640px)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(max-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isCompact
}

// ─── Inner flow component (needs ReactFlowProvider context) ─────────
function GenealogyFlow({ personId }: { personId: string }) {
  const navigate = useNavigate()
  const { fitView, setCenter } = useReactFlow()
  const flowWrapRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const isCompact = useIsCompactLayout()
  const sizes = isCompact ? COMPACT_SIZES : DESKTOP_SIZES

  const { data, isLoading, isError } = useQuery({
    queryKey: ['family-tree', personId],
    queryFn: () => getPersonFamilyTree(personId),
    staleTime: 5 * 60 * 1000,
  })

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!data || data.nodes.length === 0) return { rfNodes: [], rfEdges: [] }
    return buildGraph(data, sizes)
  }, [data, sizes])

  const onInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.15 }), 100)
  }, [fitView])

  // fitView를 데이터 로드 후 / 사이즈 변경 시 재실행
  useEffect(() => {
    if (rfNodes.length === 0) return
    const timer = setTimeout(() => fitView({ padding: 0.15 }), 150)
    return () => clearTimeout(timer)
  }, [rfNodes, fitView])

  const egoName = useMemo(() => {
    if (!data) return ''
    const ego = data.nodes.find(n => n.id === data.egoId)
    if (!ego) return ''
    return getPersonDisplayName({ name: ego.name, surname: ego.surname, middleName: ego.middleName, nameDisplayOrder: ego.nameDisplayOrder }, true)
  }, [data])

  // 세대 라벨 계산 (D1) — y 좌표를 (NODE_H + V_GAP)으로 나눠 세대 도출
  const generationLabels = useMemo(() => {
    if (rfNodes.length === 0) return [] as Array<{ y: number; label: string }>
    const rowH = sizes.NODE_H + sizes.V_GAP
    const generations = new Set<number>()
    for (const n of rfNodes) {
      const gen = Math.round(n.position.y / rowH)
      generations.add(gen)
    }
    const labelFor = (gen: number): string => {
      if (gen === 0) return '본인 세대'
      const abs = Math.abs(gen)
      const direction = gen < 0 ? '위' : '아래'
      const koreanName = gen < 0
        ? (abs === 1 ? '부모' : abs === 2 ? '조부모' : abs === 3 ? '증조부모' : abs === 4 ? '고조부모' : `${abs}세대 위`)
        : (abs === 1 ? '자녀' : abs === 2 ? '손자녀' : abs === 3 ? '증손자녀' : `${abs}세대 아래`)
      return `${gen > 0 ? '+' : '−'}${abs} ${direction} (${koreanName})`
    }
    return Array.from(generations)
      .sort((a, b) => a - b)
      .map((gen) => ({ y: gen * rowH, label: labelFor(gen) }))
  }, [rfNodes, sizes])

  // 검색 매치 (C3)
  const searchMatches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || rfNodes.length === 0) return [] as Node[]
    return rfNodes.filter((n) => {
      const p = (n.data as any)?.person as FamilyTreePerson | undefined
      if (!p) return false
      const name = (p.name ?? '') + (p.surname ?? '') + (p.regnalName ?? '') + (p.originalName ?? '')
      return name.toLowerCase().includes(q)
    })
  }, [search, rfNodes])

  const goToMatch = useCallback((idx: number) => {
    if (searchMatches.length === 0) return
    const wrapped = ((idx % searchMatches.length) + searchMatches.length) % searchMatches.length
    const target = searchMatches[wrapped]
    setMatchIndex(wrapped)
    setCenter(
      target.position.x + sizes.NODE_W / 2,
      target.position.y + sizes.NODE_H / 2,
      { zoom: 1, duration: 400 },
    )
  }, [searchMatches, setCenter, sizes])

  // 검색어 바뀌면 첫 매치로 점프
  useEffect(() => {
    if (searchMatches.length === 0) return
    goToMatch(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // PNG 내보내기 (C4) — html-to-image로 ReactFlow viewport 캡처
  const handleExportPng = useCallback(async () => {
    if (rfNodes.length === 0 || exporting) return
    const wrap = flowWrapRef.current?.querySelector<HTMLElement>('.react-flow__viewport')
    const flowEl = flowWrapRef.current?.querySelector<HTMLElement>('.react-flow')
    if (!wrap || !flowEl) return
    setExporting(true)
    try {
      // 모든 노드가 한 번에 보이도록 viewport 임시 조정
      const bounds = getNodesBounds(rfNodes)
      const W = 2400
      const H = Math.max(1200, Math.round((bounds.height / bounds.width) * W))
      const vp = getViewportForBounds(bounds, W, H, 0.05, 2, 0.1)
      const transformBefore = wrap.style.transform
      wrap.style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`
      const dataUrl = await toPng(flowEl, {
        backgroundColor: '#ffffff',
        width: W,
        height: H,
        style: { width: `${W}px`, height: `${H}px` },
        cacheBust: true,
      })
      wrap.style.transform = transformBefore
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `genealogy-${egoName || personId}.png`
      a.click()
    } catch (e) {
      console.error('PNG 내보내기 실패', e)
    } finally {
      setExporting(false)
    }
  }, [rfNodes, exporting, egoName, personId])

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
          <SearchWrap>
            <FiSearch size={13} />
            <SearchInput
              type="search"
              value={search}
              placeholder="이름·왕호 검색"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  goToMatch(matchIndex + 1)
                }
              }}
            />
            {searchMatches.length > 0 && (
              <SearchCount>{matchIndex + 1}/{searchMatches.length}</SearchCount>
            )}
          </SearchWrap>
          <ExportBtn type="button" onClick={handleExportPng} disabled={exporting || rfNodes.length === 0}>
            <FiDownload size={13} />
            <span>{exporting ? '저장 중…' : 'PNG'}</span>
          </ExportBtn>
          <NodeCount>{data?.nodes.length ?? 0}명</NodeCount>
        </HeaderRight>
      </PageHeader>

      <FlowWrap ref={flowWrapRef}>
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
          onlyRenderVisibleElements={rfNodes.length > 30}
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

        {/* 세대 라벨 sticky 오버레이 (D1) — 좌측 가장자리 고정 */}
        <GenerationGuides aria-hidden>
          {generationLabels.map(({ y, label }) => (
            <GenerationGuideLine key={y} style={{ top: `calc(50% + ${y}px)` }}>
              <span>{label}</span>
            </GenerationGuideLine>
          ))}
        </GenerationGuides>

        {data?.truncations && data.truncations.length > 0 && (
          <TruncationNotice>
            데이터가 일부 절단되었습니다 — {data.truncations.map((t) => `${t.scope} ${t.took}+`).join(', ')}
          </TruncationNotice>
        )}
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
  @media (max-width: 640px) {
    padding: 0 10px;
    gap: 8px;
  }
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
  flex-shrink: 0;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  @media (max-width: 480px) {
    span {
      display: none;
    }
  }
`

const HeaderCenter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 0;
  @media (max-width: 640px) {
    display: none;
  }
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
  gap: 10px;
`

const SearchWrap = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.tertiary};
  &:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }
`

const SearchInput = styled.input`
  background: transparent;
  border: 0;
  outline: none;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  width: 140px;
  min-width: 0;
  @media (max-width: 640px) {
    width: 90px;
  }
`

const SearchCount = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const ExportBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : '#e2e8f0'};
  }
  &:disabled { opacity: 0.5; cursor: default; }
`

const NodeCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border-radius: 8px;
  padding: 3px 10px;
  flex-shrink: 0;
  @media (max-width: 480px) {
    display: none;
  }
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

  @media (max-width: 640px) {
    /* 좁은 화면에선 미니맵 노이즈가 큼 — 숨김 */
    .react-flow__minimap {
      display: none;
    }
    /* 컨트롤 버튼 터치 친화적으로 */
    .react-flow__controls button {
      width: 36px;
      height: 36px;
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
const NodeWrap = styled.div<{
  $isEgo: boolean
  $deceased?: boolean
  $w?: number
  $h?: number
}>`
  position: relative;
  width: ${({ $w }) => $w ?? DESKTOP_SIZES.NODE_W}px;
  min-height: ${({ $h }) => $h ?? DESKTOP_SIZES.NODE_H}px;
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
  &:hover, &:focus-within, &:active {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    /* 모바일 (C5): hover 대체용 active 처리 */
  }

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

const NodeAvatar = styled.div<{
  $isEgo: boolean
  $hasImg: boolean
  $deceased?: boolean
  $size?: number
}>`
  width: ${({ $size }) => $size ?? DESKTOP_SIZES.AVATAR}px;
  height: ${({ $size }) => $size ?? DESKTOP_SIZES.AVATAR}px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
  background: ${({ $isEgo, $hasImg }) => $isEgo ? 'rgba(255,255,255,0.25)' : $hasImg ? 'transparent' : 'var(--node-avatar-bg, #f1f5f9)'};
  border: ${({ $isEgo }) => $isEgo ? '2px solid rgba(255,255,255,0.5)' : '2px solid var(--node-avatar-border, #e2e8f0)'};
  ${({ $deceased, $hasImg }) =>
    $deceased && $hasImg ? 'img { filter: grayscale(0.6) opacity(0.85); }' : ''}
`

const AvatarFrame = styled.div`
  position: relative;
  display: inline-flex;
`

const CountryFlagBadge = styled.span<{ $size: number }>`
  position: absolute;
  right: -2px;
  bottom: -2px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--node-bg, #fff);
  border: 1.5px solid var(--node-bg, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  & img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const RecenterHint = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  opacity: 0;
  transition: opacity 0.15s ease;
  ${NodeWrap}:hover & { opacity: 1; }
`

const GenerationGuides = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
`

const GenerationGuideLine = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  height: 0;
  border-top: 1px dashed ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.30)'};
  & > span {
    display: inline-block;
    transform: translateY(-50%);
    margin-left: 12px;
    padding: 2px 8px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(203, 213, 225, 0.55)' : 'rgba(71, 85, 105, 0.7)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(248, 250, 252, 0.85)'};
    border-radius: 4px;
  }
`

const TruncationNotice = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80%;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.12)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(217, 119, 6, 0.35)'};
  pointer-events: none;
  z-index: 5;
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
