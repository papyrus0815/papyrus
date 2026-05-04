import { StyleSheet, Text, View } from 'react-native'
import { Tokens } from '@/constants/theme'
import type { PersonDetail } from '@/lib/dto'

export function FamilyBadges({ data }: { data: PersonDetail }) {
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  badge: {
    backgroundColor: Tokens.accent.purpleSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  text: { fontSize: 11, color: Tokens.accent.purple, fontWeight: '600' },
})
