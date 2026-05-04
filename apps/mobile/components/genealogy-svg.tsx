import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { Tokens } from '@/constants/theme'
import { setPersonPreview } from '@/lib/preview-cache'
import type { FamilyTreeData, FamilyTreePerson } from './family-tree-view'

const CARD_W = 90
const CARD_H = 64
const COL_GAP = 8
const ROW_GAP = 36
const PADDING = 16

type Layer = 'gp' | 'parent' | 'self' | 'child'

type Node = {
  id: string
  layer: Layer
  role?: string
  half?: boolean
  ego?: boolean
  person: FamilyTreePerson
  x: number
  y: number
}

type Edge = {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  kind: 'parent-child' | 'spouse'
}

function isMale(p?: FamilyTreePerson | null) {
  const g = (p?.gender ?? '').toUpperCase()
  return g === 'M' || g === 'MALE'
}
function isFemale(p?: FamilyTreePerson | null) {
  const g = (p?.gender ?? '').toUpperCase()
  return g === 'F' || g === 'FEMALE'
}

function lifespan(p: FamilyTreePerson): string {
  const b = p.birthYear ?? null
  const d = p.deathYear ?? null
  if (b == null && d == null) return ''
  return `${b ?? '?'}–${d ?? '?'}`
}

function nameOf(p: FamilyTreePerson): string {
  return p.surname ? `${p.surname}${p.name}` : p.name
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

export function GenealogySvg({ data }: { data: FamilyTreeData }) {
  const router = useRouter()
  const layout = useMemo(() => buildLayout(data), [data])
  if (!layout) return null
  const { width, height, nodes, edges } = layout

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          {edges.map((e) => (
            <Line
              key={e.key}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.kind === 'spouse' ? Tokens.accent.pink : Tokens.text.soft}
              strokeWidth={e.kind === 'spouse' ? 1.5 : 1}
              strokeDasharray={e.kind === 'spouse' ? '4,3' : undefined}
            />
          ))}
          {nodes.map((n) => (
            <G
              key={n.id}
              onPress={() => {
                router.push(`/person/${n.id}` as any)
              }}
            >
              <Rect
                x={n.x}
                y={n.y}
                width={CARD_W}
                height={CARD_H}
                rx={8}
                fill={n.ego ? Tokens.surface.highlight : Tokens.surface.raised}
                stroke={n.ego ? Tokens.surface.highlightBorder : Tokens.border.subtle}
                strokeWidth={1}
                strokeDasharray={n.half ? '3,3' : undefined}
              />
              {n.role && (
                <SvgText
                  x={n.x + CARD_W / 2}
                  y={n.y + 14}
                  fontSize={9}
                  fill={Tokens.text.muted}
                  textAnchor="middle"
                >
                  {n.role}
                </SvgText>
              )}
              <SvgText
                x={n.x + CARD_W / 2}
                y={n.y + 32}
                fontSize={12}
                fontWeight="600"
                fill={Tokens.text.primary}
                textAnchor="middle"
              >
                {truncate(nameOf(n.person), 8)}
              </SvgText>
              {!!lifespan(n.person) && (
                <SvgText
                  x={n.x + CARD_W / 2}
                  y={n.y + 50}
                  fontSize={10}
                  fill={Tokens.text.soft}
                  textAnchor="middle"
                >
                  {lifespan(n.person)}
                </SvgText>
              )}
            </G>
          ))}
        </Svg>
        <Legend />
      </View>
    </ScrollView>
  )
}

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: Tokens.text.soft }]} />
        <Text style={styles.legendText}>혈연</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: Tokens.accent.pink }]} />
        <Text style={styles.legendText}>혼인</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, styles.legendDashed]} />
        <Text style={styles.legendText}>이복</Text>
      </View>
    </View>
  )
}

function buildLayout(data: FamilyTreeData): {
  width: number
  height: number
  nodes: Node[]
  edges: Edge[]
} | null {
  const byId = new Map(data.nodes.map((n) => [n.id, n]))
  const ego = byId.get(data.egoId)
  if (!ego) return null

  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  const spousesOf = new Map<string, string[]>()
  for (const e of data.edges) {
    if (e.type === 'parent-child') {
      ;(parentsOf.get(e.target) ?? parentsOf.set(e.target, []).get(e.target)!).push(e.source)
      ;(childrenOf.get(e.source) ?? childrenOf.set(e.source, []).get(e.source)!).push(e.target)
    } else if (e.type === 'spouse') {
      ;(spousesOf.get(e.source) ?? spousesOf.set(e.source, []).get(e.source)!).push(e.target)
      ;(spousesOf.get(e.target) ?? spousesOf.set(e.target, []).get(e.target)!).push(e.source)
    }
  }

  const parentIds = parentsOf.get(ego.id) ?? []
  const parents = parentIds.map((id) => byId.get(id)).filter(Boolean) as FamilyTreePerson[]
  const father = parents.find(isMale) ?? null
  const mother = parents.find(isFemale) ?? null
  const otherParents = parents.filter((p) => !isMale(p) && !isFemale(p))

  const grandparentsOf = (parent: FamilyTreePerson | null) =>
    parent ? ((parentsOf.get(parent.id) ?? []).map((id) => byId.get(id)!).filter(Boolean)) : []

  const fatherSide = grandparentsOf(father)
  const motherSide = grandparentsOf(mother)
  const pgf = fatherSide.find(isMale) ?? null
  const pgm = fatherSide.find(isFemale) ?? null
  const mgf = motherSide.find(isMale) ?? null
  const mgm = motherSide.find(isFemale) ?? null

  const spouseIds = spousesOf.get(ego.id) ?? []
  const spouses = spouseIds.map((id) => byId.get(id)!).filter(Boolean)
  const childrenIds = childrenOf.get(ego.id) ?? []
  const children = childrenIds.map((id) => byId.get(id)!).filter(Boolean)

  // siblings
  const fullSiblingIds = new Set<string>()
  const halfSiblingIds = new Set<string>()
  if (parentIds.length > 0) {
    const otherChildren = new Map<string, number>()
    for (const pid of parentIds) {
      for (const cid of childrenOf.get(pid) ?? []) {
        if (cid === ego.id) continue
        otherChildren.set(cid, (otherChildren.get(cid) ?? 0) + 1)
      }
    }
    for (const [cid, shared] of otherChildren) {
      if (shared >= parentIds.length && parentIds.length >= 2) fullSiblingIds.add(cid)
      else halfSiblingIds.add(cid)
    }
  }
  const fullSiblings = [...fullSiblingIds].map((id) => byId.get(id)!).filter(Boolean)
  const halfSiblings = [...halfSiblingIds].map((id) => byId.get(id)!).filter(Boolean)

  // Place each layer
  const gpEntries: Array<[FamilyTreePerson, string]> = []
  if (pgf) gpEntries.push([pgf, '친조부'])
  if (pgm) gpEntries.push([pgm, '친조모'])
  if (mgf) gpEntries.push([mgf, '외조부'])
  if (mgm) gpEntries.push([mgm, '외조모'])

  const parentEntries: Array<[FamilyTreePerson, string]> = []
  if (father) parentEntries.push([father, '아버지'])
  if (mother) parentEntries.push([mother, '어머니'])
  for (const p of otherParents) parentEntries.push([p, '부모'])

  const selfRowEntries: Array<{ p: FamilyTreePerson; role: string; ego?: boolean; half?: boolean }> = [
    { p: ego, role: '본인', ego: true },
    ...spouses.map((s) => ({ p: s, role: '배우자' })),
    ...fullSiblings.map((s) => ({ p: s, role: '형제' })),
    ...halfSiblings.map((s) => ({ p: s, role: '이복', half: true })),
  ]
  const childEntries = children.map((c) => ({ p: c, role: '자녀' }))

  const rowWidths = [
    gpEntries.length * (CARD_W + COL_GAP) - COL_GAP,
    parentEntries.length * (CARD_W + COL_GAP) - COL_GAP,
    selfRowEntries.length * (CARD_W + COL_GAP) - COL_GAP,
    childEntries.length * (CARD_W + COL_GAP) - COL_GAP,
  ].map((w) => Math.max(0, w))
  const maxRow = Math.max(...rowWidths)
  const width = Math.max(maxRow + PADDING * 2, 320)

  const rowYs = {
    gp: PADDING,
    parent: PADDING + (CARD_H + ROW_GAP),
    self: PADDING + 2 * (CARD_H + ROW_GAP),
    child: PADDING + 3 * (CARD_H + ROW_GAP),
  }

  function rowStartX(rowWidth: number) {
    return (width - rowWidth) / 2
  }

  const nodes: Node[] = []
  const fatherNodeX = (() => {
    if (!father) return null
    const startX = rowStartX(rowWidths[1])
    const idx = parentEntries.findIndex(([p]) => p.id === father.id)
    return startX + idx * (CARD_W + COL_GAP)
  })()
  const motherNodeX = (() => {
    if (!mother) return null
    const startX = rowStartX(rowWidths[1])
    const idx = parentEntries.findIndex(([p]) => p.id === mother.id)
    return startX + idx * (CARD_W + COL_GAP)
  })()

  // gp row
  {
    const startX = rowStartX(rowWidths[0])
    gpEntries.forEach(([p, role], i) => {
      nodes.push({
        id: `gp-${p.id}`,
        layer: 'gp',
        person: p,
        role,
        x: startX + i * (CARD_W + COL_GAP),
        y: rowYs.gp,
      })
    })
  }
  // parent row
  {
    const startX = rowStartX(rowWidths[1])
    parentEntries.forEach(([p, role], i) => {
      nodes.push({
        id: `p-${p.id}`,
        layer: 'parent',
        person: p,
        role,
        x: startX + i * (CARD_W + COL_GAP),
        y: rowYs.parent,
      })
    })
  }
  // self row
  let selfNodeX = 0
  {
    const startX = rowStartX(rowWidths[2])
    selfRowEntries.forEach((entry, i) => {
      const x = startX + i * (CARD_W + COL_GAP)
      if (entry.ego) selfNodeX = x
      nodes.push({
        id: `s-${entry.p.id}`,
        layer: 'self',
        person: entry.p,
        role: entry.role,
        ego: entry.ego,
        half: entry.half,
        x,
        y: rowYs.self,
      })
    })
  }
  // child row
  {
    const startX = rowStartX(rowWidths[3])
    childEntries.forEach((c, i) => {
      nodes.push({
        id: `c-${c.p.id}`,
        layer: 'child',
        person: c.p,
        role: c.role,
        x: startX + i * (CARD_W + COL_GAP),
        y: rowYs.child,
      })
    })
  }

  // Edges
  const edges: Edge[] = []
  // grandparent -> parent
  for (const node of nodes.filter((n) => n.layer === 'gp')) {
    const role = node.role
    let targetX: number | null = null
    if ((role === '친조부' || role === '친조모') && fatherNodeX != null) {
      targetX = fatherNodeX + CARD_W / 2
    } else if ((role === '외조부' || role === '외조모') && motherNodeX != null) {
      targetX = motherNodeX + CARD_W / 2
    }
    if (targetX != null) {
      edges.push({
        key: `gp-edge-${node.id}`,
        x1: node.x + CARD_W / 2,
        y1: node.y + CARD_H,
        x2: targetX,
        y2: rowYs.parent,
        kind: 'parent-child',
      })
    }
  }
  // parent -> self
  for (const pNode of nodes.filter((n) => n.layer === 'parent')) {
    edges.push({
      key: `p-edge-${pNode.id}`,
      x1: pNode.x + CARD_W / 2,
      y1: pNode.y + CARD_H,
      x2: selfNodeX + CARD_W / 2,
      y2: rowYs.self,
      kind: 'parent-child',
    })
  }
  // self -> child
  for (const cNode of nodes.filter((n) => n.layer === 'child')) {
    edges.push({
      key: `c-edge-${cNode.id}`,
      x1: selfNodeX + CARD_W / 2,
      y1: rowYs.self + CARD_H,
      x2: cNode.x + CARD_W / 2,
      y2: cNode.y,
      kind: 'parent-child',
    })
  }
  // self - spouse
  for (const sNode of nodes.filter((n) => n.layer === 'self' && n.role === '배우자')) {
    edges.push({
      key: `sp-edge-${sNode.id}`,
      x1: selfNodeX + CARD_W,
      y1: rowYs.self + CARD_H / 2,
      x2: sNode.x,
      y2: sNode.y + CARD_H / 2,
      kind: 'spouse',
    })
  }

  const height = rowYs.child + CARD_H + PADDING + 28 // extra for legend

  return { width, height, nodes, edges }
}

const styles = StyleSheet.create({
  legend: {
    position: 'absolute',
    bottom: 6,
    left: 16,
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDashed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Tokens.text.soft,
  },
  legendText: { fontSize: 10, color: Tokens.text.muted },
})
