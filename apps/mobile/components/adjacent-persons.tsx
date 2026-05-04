import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { displayName, lifespan } from '@/lib/format'
import { signedYear } from '@/lib/age-utils'
import { useDynastyMembers } from '@/lib/dynasty-cache'
import { setPersonPreview } from '@/lib/preview-cache'
import { Tokens } from '@/constants/theme'

export function AdjacentPersons({
  dynastyId,
  currentPersonId,
}: {
  dynastyId?: string | null
  currentPersonId: string
}) {
  const router = useRouter()
  const { data: items } = useDynastyMembers(dynastyId ?? null)

  const { prev, next } = useMemo(() => {
    if (!items || !dynastyId) return { prev: null, next: null }
    const sorted = [...items].sort((a, b) => {
      const ya = a.birthYear != null ? signedYear(a.birthEra, a.birthYear) : Number.POSITIVE_INFINITY
      const yb = b.birthYear != null ? signedYear(b.birthEra, b.birthYear) : Number.POSITIVE_INFINITY
      return ya - yb
    })
    const idx = sorted.findIndex((p) => p.id === currentPersonId)
    if (idx < 0) return { prev: null, next: null }
    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
    }
  }, [items, currentPersonId, dynastyId])

  if (!prev && !next) return null

  return (
    <View style={styles.row}>
      <NavButton direction="prev" person={prev} onPress={() => prev && (setPersonPreview(prev), router.replace(`/person/${prev.id}` as any))} />
      <NavButton direction="next" person={next} onPress={() => next && (setPersonPreview(next), router.replace(`/person/${next.id}` as any))} />
    </View>
  )
}

function NavButton({
  direction,
  person,
  onPress,
}: {
  direction: 'prev' | 'next'
  person: { name: string; surname?: string | null; nameDisplayOrder?: string | null; regnalName?: string | null; birthYear?: number | null; deathYear?: number | null; birthEra?: string | null; deathEra?: string | null; isAlive?: boolean | null; isDeathDateUnknown?: boolean | null } | null
  onPress: () => void
}) {
  const enabled = !!person
  const isPrev = direction === 'prev'
  if (!person) {
    return <View style={[styles.button, styles.buttonEmpty]} />
  }
  const name = displayName(person)
  const ls = lifespan(person)
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      {isPrev && <Ionicons name="chevron-back" size={16} color={Tokens.text.muted} />}
      <View style={[styles.labelWrap, isPrev ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }]}>
        <Text style={styles.dirLabel}>{isPrev ? '이전 인물' : '다음 인물'}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {person.regnalName ?? name}
        </Text>
        {!!ls && <Text style={styles.years} numberOfLines={1}>{ls}</Text>}
      </View>
      {!isPrev && <Ionicons name="chevron-forward" size={16} color={Tokens.text.muted} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Tokens.surface.raised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  buttonEmpty: { opacity: 0.4 },
  buttonPressed: { backgroundColor: Tokens.surface.canvas },
  labelWrap: { flex: 1, gap: 2 },
  dirLabel: { fontSize: 10, color: Tokens.text.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 14, fontWeight: '600', color: Tokens.text.primary },
  years: { fontSize: 11, color: Tokens.text.soft },
})
