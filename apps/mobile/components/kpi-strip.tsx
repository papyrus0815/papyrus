import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Tokens } from '@/constants/theme'
import { InfluenceTierBadge } from './influence-tier-badge'

export type KpiValue = string | number | React.ReactNode

export type KpiEntry = {
  key: string
  label: string
  value: KpiValue
}

export function KpiStrip({ items }: { items: KpiEntry[] }) {
  if (!items.length) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {items.map((it, idx) => (
        <View key={it.key} style={styles.itemWrap}>
          <View style={styles.item}>
            <Text style={styles.label} numberOfLines={1}>{it.label}</Text>
            {typeof it.value === 'string' || typeof it.value === 'number' ? (
              <Text style={styles.value} numberOfLines={1}>{String(it.value)}</Text>
            ) : (
              it.value
            )}
          </View>
          {idx < items.length - 1 && <View style={styles.divider} />}
        </View>
      ))}
    </ScrollView>
  )
}

export { InfluenceTierBadge }

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: Tokens.surface.raised,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.subtle,
  },
  row: { paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', gap: 0 },
  itemWrap: { flexDirection: 'row', alignItems: 'center' },
  item: { paddingHorizontal: 10, gap: 2, alignItems: 'flex-start' },
  divider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: Tokens.border.subtle },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: { fontSize: 14, fontWeight: '600', color: Tokens.text.primary },
})
