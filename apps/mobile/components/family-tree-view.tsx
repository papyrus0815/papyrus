import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

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

export function FamilyTreeView({ data }: { data: FamilyTreeData }) {
  const router = useRouter()
  const byId = new Map(data.nodes.map((n) => [n.id, n]))

  // edges로 부모/자녀/배우자 매핑
  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  const spousesOf = new Map<string, string[]>()
  for (const e of data.edges) {
    if (e.type === 'parent-child') {
      // source = parent, target = child
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

  const ego = byId.get(data.egoId)
  if (!ego) return null

  const parents = (parentsOf.get(ego.id) ?? []).map((id) => byId.get(id)).filter(Boolean) as FamilyTreePerson[]
  const father = parents.find((p) => (p.gender ?? '').toUpperCase() === 'M' || (p.gender ?? '').toUpperCase() === 'MALE') ?? parents[0]
  const mother = parents.find((p) => (p.gender ?? '').toUpperCase() === 'F' || (p.gender ?? '').toUpperCase() === 'FEMALE') ?? parents[1]

  const grandparents = {
    pf: father ? (parentsOf.get(father.id) ?? []).map((id) => byId.get(id)!).filter(Boolean) : [],
    pm: mother ? (parentsOf.get(mother.id) ?? []).map((id) => byId.get(id)!).filter(Boolean) : [],
  }
  const pgf = grandparents.pf.find((p) => (p.gender ?? '').toUpperCase().startsWith('M'))
  const pgm = grandparents.pf.find((p) => (p.gender ?? '').toUpperCase().startsWith('F'))
  const mgf = grandparents.pm.find((p) => (p.gender ?? '').toUpperCase().startsWith('M'))
  const mgm = grandparents.pm.find((p) => (p.gender ?? '').toUpperCase().startsWith('F'))

  const spouses = (spousesOf.get(ego.id) ?? []).map((id) => byId.get(id)!).filter(Boolean)
  const children = (childrenOf.get(ego.id) ?? []).map((id) => byId.get(id)!).filter(Boolean)
  // 형제자매: 부모를 공유하는 다른 사람들
  const siblingsSet = new Set<string>()
  for (const p of parents) {
    for (const cid of childrenOf.get(p.id) ?? []) {
      if (cid !== ego.id) siblingsSet.add(cid)
    }
  }
  const siblings = [...siblingsSet].map((id) => byId.get(id)!).filter(Boolean)

  function Card({ p, role }: { p?: FamilyTreePerson | null; role?: string }) {
    if (!p) return <View style={styles.cardEmpty} />
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/person/${p.id}` as any)}
      >
        {!!role && <Text style={styles.role}>{role}</Text>}
        <Text style={styles.name} numberOfLines={1}>{nameOf(p)}</Text>
        {!!lifespan(p) && <Text style={styles.years}>{lifespan(p)}</Text>}
      </Pressable>
    )
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>조부모</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Card p={pgf} role="친조부" />
        <Card p={pgm} role="친조모" />
        <Card p={mgf} role="외조부" />
        <Card p={mgm} role="외조모" />
      </ScrollView>

      <Text style={styles.sectionLabel}>부모</Text>
      <View style={styles.row}>
        <Card p={father} role="아버지" />
        <Card p={mother} role="어머니" />
      </View>

      <Text style={styles.sectionLabel}>본인 · 배우자 · 형제자매</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <View style={[styles.card, styles.cardEgo]}>
          <Text style={styles.role}>본인</Text>
          <Text style={styles.name} numberOfLines={1}>{nameOf(ego)}</Text>
          {!!lifespan(ego) && <Text style={styles.years}>{lifespan(ego)}</Text>}
        </View>
        {spouses.map((s) => (
          <Card key={s.id} p={s} role="배우자" />
        ))}
        {siblings.map((s) => (
          <Card key={s.id} p={s} role="형제자매" />
        ))}
      </ScrollView>

      {children.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>자녀 ({children.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {children.map((c) => (
              <Card key={c.id} p={c} role="자녀" />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8, marginLeft: 4 },
  row: { gap: 8, paddingHorizontal: 4 },
  card: {
    width: 110, padding: 10,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
    gap: 2,
  },
  cardEmpty: { width: 110, padding: 10, opacity: 0 },
  cardPressed: { backgroundColor: '#f8fafc' },
  cardEgo: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  role: { fontSize: 10, color: '#64748b' },
  name: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  years: { fontSize: 11, color: '#94a3b8' },
})
