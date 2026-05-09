import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppPressable } from '@/components/app-pressable'
import { displayName, lifespan } from '@/lib/format'
import { signedYear } from '@/lib/age-utils'
import { useDynastyMembers } from '@/lib/dynasty-cache'
import { setPersonPreview } from '@/lib/preview-cache'
import { replacePerson } from '@/lib/routes'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export function AdjacentPersons({
  dynastyId,
  currentPersonId,
}: {
  dynastyId?: string | null
  currentPersonId: string
}) {
  const router = useRouter()
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
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
      <NavButton
        direction="prev"
        person={prev}
        styles={styles}
        iconColor={t.text.muted}
        onPress={() => {
          if (!prev) return
          setPersonPreview(prev)
          replacePerson(router, prev.id)
        }}
      />
      <NavButton
        direction="next"
        person={next}
        styles={styles}
        iconColor={t.text.muted}
        onPress={() => {
          if (!next) return
          setPersonPreview(next)
          replacePerson(router, next.id)
        }}
      />
    </View>
  )
}

function NavButton({
  direction,
  person,
  styles,
  iconColor,
  onPress,
}: {
  direction: 'prev' | 'next'
  person: { name: string; surname?: string | null; nameDisplayOrder?: string | null; regnalName?: string | null; birthYear?: number | null; deathYear?: number | null; birthEra?: string | null; deathEra?: string | null; isAlive?: boolean | null; isDeathDateUnknown?: boolean | null } | null
  styles: ReturnType<typeof makeStyles>
  iconColor: string
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
    <AppPressable
      onPress={onPress}
      disabled={!enabled}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={`${isPrev ? '이전' : '다음'} 인물: ${person.regnalName ?? name}`}
    >
      {isPrev && <Ionicons name="chevron-back" size={16} color={iconColor} />}
      <View style={[styles.labelWrap, isPrev ? styles.alignStart : styles.alignEnd]}>
        <Text style={styles.dirLabel}>{isPrev ? '이전 인물' : '다음 인물'}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {person.regnalName ?? name}
        </Text>
        {!!ls && <Text style={styles.years} numberOfLines={1}>{ls}</Text>}
      </View>
      {!isPrev && <Ionicons name="chevron-forward" size={16} color={iconColor} />}
    </AppPressable>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: t.border.subtle,
      minHeight: 56,
    },
    buttonEmpty: { opacity: 0.4 },
    labelWrap: { flex: 1, gap: 2 },
    alignStart: { alignItems: 'flex-start' },
    alignEnd: { alignItems: 'flex-end' },
    dirLabel: { ...Type.sectionLabel, fontSize: 10, color: t.text.muted },
    name: { ...Type.bodySm, fontWeight: '600', color: t.text.primary },
    years: { ...Type.badge, fontWeight: '500', color: t.text.soft },
  })
}
