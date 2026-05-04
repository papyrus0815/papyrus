import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Tokens } from '@/constants/theme'

export type FamilyTreePerson = {
  id: string
  name: string
  surname?: string | null
  gender?: string | null
  regnalName?: string | null
  birthYear?: number | null
  deathYear?: number | null
  dynasty?: { id: string; name: string } | null
}

export type FamilyTreeEdge = {
  source: string
  target: string
  type: 'parent-child' | 'spouse'
}

export type FamilyTreeData = {
  egoId: string
  nodes: FamilyTreePerson[]
  edges: FamilyTreeEdge[]
}

function lifespan(p?: FamilyTreePerson | null) {
  if (!p) return null
  const b = p.birthYear ?? null
  const d = p.deathYear ?? null
  if (b == null && d == null) return null
  return `${b ?? '?'}–${d ?? '?'}`
}

function nameOf(p?: FamilyTreePerson | null) {
  if (!p) return '?'
  return p.surname ? `${p.surname}${p.name}` : p.name
}

function isMale(p?: FamilyTreePerson | null) {
  const g = (p?.gender ?? '').toUpperCase()
  return g === 'M' || g === 'MALE'
}

function isFemale(p?: FamilyTreePerson | null) {
  const g = (p?.gender ?? '').toUpperCase()
  return g === 'F' || g === 'FEMALE'
}

export function FamilyTreeView({ data }: { data: FamilyTreeData }) {
  const router = useRouter()

  const graph = useMemo(() => {
    const byId = new Map(data.nodes.map((n) => [n.id, n]))
    const parentsOf = new Map<string, string[]>()
    const childrenOf = new Map<string, string[]>()
    const spousesOf = new Map<string, string[]>()
    for (const e of data.edges) {
      if (e.type === 'parent-child') {
        const arr = parentsOf.get(e.target) ?? []
        arr.push(e.source)
        parentsOf.set(e.target, arr)
        const cArr = childrenOf.get(e.source) ?? []
        cArr.push(e.target)
        childrenOf.set(e.source, cArr)
      } else if (e.type === 'spouse') {
        const arr = spousesOf.get(e.source) ?? []
        arr.push(e.target)
        spousesOf.set(e.source, arr)
        const arr2 = spousesOf.get(e.target) ?? []
        arr2.push(e.source)
        spousesOf.set(e.target, arr2)
      }
    }
    return { byId, parentsOf, childrenOf, spousesOf }
  }, [data])

  const ego = graph.byId.get(data.egoId)

  const layout = useMemo(() => {
    if (!ego) return null
    const { byId, parentsOf, childrenOf, spousesOf } = graph

    const parentIds = parentsOf.get(ego.id) ?? []
    const parents = parentIds.map((id) => byId.get(id)).filter(Boolean) as FamilyTreePerson[]

    // 성별 명시된 부/모만 라벨, 나머지는 "부모"
    const explicitFather = parents.find(isMale) ?? null
    const explicitMother = parents.find(isFemale) ?? null
    const unknownParents = parents.filter((p) => !isMale(p) && !isFemale(p))

    const grandparentsOf = (parent?: FamilyTreePerson | null) =>
      parent ? ((parentsOf.get(parent.id) ?? []).map((id) => byId.get(id)!).filter(Boolean)) : []

    const fatherSide = grandparentsOf(explicitFather)
    const motherSide = grandparentsOf(explicitMother)

    const spouseIds = spousesOf.get(ego.id) ?? []
    const spouses = spouseIds.map((id) => byId.get(id)!).filter(Boolean)

    const childrenIds = childrenOf.get(ego.id) ?? []
    const children = childrenIds.map((id) => byId.get(id)!).filter(Boolean)

    // 형제자매: 부모 한쪽이라도 공유
    const fullSiblingIds = new Set<string>()
    const halfSiblingIds = new Set<string>()
    if (parentIds.length > 0) {
      const otherChildren = new Map<string, number>() // childId → 공유 부모 수
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

    return {
      explicitFather,
      explicitMother,
      unknownParents,
      pgf: fatherSide.find(isMale),
      pgm: fatherSide.find(isFemale),
      mgf: motherSide.find(isMale),
      mgm: motherSide.find(isFemale),
      otherGrandparents: [
        ...fatherSide.filter((p) => !isMale(p) && !isFemale(p)),
        ...motherSide.filter((p) => !isMale(p) && !isFemale(p)),
      ],
      spouses,
      children,
      fullSiblings,
      halfSiblings,
    }
  }, [ego, graph])

  if (!ego || !layout) return null

  const showGrandparents =
    layout.pgf || layout.pgm || layout.mgf || layout.mgm || layout.otherGrandparents.length > 0
  const hasParents = layout.explicitFather || layout.explicitMother || layout.unknownParents.length > 0

  return (
    <View>
      {showGrandparents && (
        <>
          <Text style={styles.sectionLabel}>조부모</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Card p={layout.pgf} role="친조부" onPress={(id) => router.push(`/person/${id}` as any)} />
            <Card p={layout.pgm} role="친조모" onPress={(id) => router.push(`/person/${id}` as any)} />
            <Card p={layout.mgf} role="외조부" onPress={(id) => router.push(`/person/${id}` as any)} />
            <Card p={layout.mgm} role="외조모" onPress={(id) => router.push(`/person/${id}` as any)} />
            {layout.otherGrandparents.map((p) => (
              <Card key={p.id} p={p} role="조부모" onPress={(id) => router.push(`/person/${id}` as any)} />
            ))}
          </ScrollView>
        </>
      )}

      {hasParents && (
        <>
          <Text style={styles.sectionLabel}>부모</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {layout.explicitFather && (
              <Card p={layout.explicitFather} role="아버지" onPress={(id) => router.push(`/person/${id}` as any)} />
            )}
            {layout.explicitMother && (
              <Card p={layout.explicitMother} role="어머니" onPress={(id) => router.push(`/person/${id}` as any)} />
            )}
            {layout.unknownParents.map((p) => (
              <Card key={p.id} p={p} role="부모" onPress={(id) => router.push(`/person/${id}` as any)} />
            ))}
          </ScrollView>
        </>
      )}

      <Text style={styles.sectionLabel}>본인 · 배우자 · 형제자매</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <View style={[styles.card, styles.cardEgo]}>
          <Text style={styles.role}>본인</Text>
          <Text style={styles.name} numberOfLines={1}>{nameOf(ego)}</Text>
          {!!lifespan(ego) && <Text style={styles.years}>{lifespan(ego)}</Text>}
        </View>
        {layout.spouses.map((s) => (
          <Card key={s.id} p={s} role="배우자" onPress={(id) => router.push(`/person/${id}` as any)} />
        ))}
        {layout.fullSiblings.map((s) => (
          <Card key={s.id} p={s} role="형제자매" onPress={(id) => router.push(`/person/${id}` as any)} />
        ))}
        {layout.halfSiblings.map((s) => (
          <Card key={s.id} p={s} role="이복형제" half onPress={(id) => router.push(`/person/${id}` as any)} />
        ))}
      </ScrollView>

      {layout.children.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>자녀 ({layout.children.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {layout.children.map((c) => (
              <Card key={c.id} p={c} role="자녀" onPress={(id) => router.push(`/person/${id}` as any)} />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  )
}

function Card({
  p,
  role,
  half,
  onPress,
}: {
  p?: FamilyTreePerson | null
  role?: string
  half?: boolean
  onPress: (id: string) => void
}) {
  if (!p) return null
  return (
    <Pressable
      style={({ pressed }) => [styles.card, half && styles.cardHalf, pressed && styles.cardPressed]}
      onPress={() => onPress(p.id)}
    >
      {!!role && <Text style={styles.role}>{role}</Text>}
      <Text style={styles.name} numberOfLines={1}>{nameOf(p)}</Text>
      {!!lifespan(p) && <Text style={styles.years}>{lifespan(p)}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: { gap: 8, paddingHorizontal: 4 },
  card: {
    width: 110,
    padding: 10,
    backgroundColor: Tokens.surface.raised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    gap: 2,
  },
  cardPressed: { backgroundColor: Tokens.surface.canvas },
  cardEgo: { backgroundColor: Tokens.surface.highlight, borderColor: Tokens.surface.highlightBorder },
  cardHalf: { borderStyle: 'dashed' },
  role: { fontSize: 10, color: Tokens.text.muted },
  name: { fontSize: 14, fontWeight: '600', color: Tokens.text.primary },
  years: { fontSize: 11, color: Tokens.text.soft },
})
