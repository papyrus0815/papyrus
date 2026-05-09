import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { PersonDetail } from '@/lib/dto'

export function FamilyBadges({ data }: { data: PersonDetail }) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const badges: Array<{ key: string; label: string }> = []
  if (data.father) badges.push({ key: 'father', label: '부' })
  if (data.mother) badges.push({ key: 'mother', label: '모' })
  const spouseCount = (data.spouseRelations?.length ?? 0) || (data.spouse ? 1 : 0)
  if (spouseCount > 0) {
    badges.push({ key: 'spouse', label: spouseCount > 1 ? `배우자 ${spouseCount}` : '배우자' })
  }
  const childrenCount = data.children?.length ?? 0
  if (childrenCount > 0) badges.push({ key: 'children', label: `자녀 ${childrenCount}` })
  const siblingsCount = data.siblings?.length ?? 0
  if (siblingsCount > 0) badges.push({ key: 'siblings', label: `형제 ${siblingsCount}` })

  if (!badges.length) return null

  return (
    <View style={styles.row}>
      {badges.map((b) => (
        <View key={b.key} style={styles.badge}>
          <Text style={styles.text}>{b.label}</Text>
        </View>
      ))}
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
    badge: {
      backgroundColor: t.surface.pressed,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    text: { ...Type.badge, color: t.text.secondary },
  })
}
