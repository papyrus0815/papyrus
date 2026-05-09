import { StyleSheet, Text, View } from 'react-native'
import { Radius, Type } from '@/constants/theme'
import {
  getInfluenceTier,
  getInfluenceTierBg,
  getInfluenceTierColor,
  getInfluenceTierLabel,
} from '@/lib/influence-tier'

export function InfluenceTierBadge({
  influence,
  showNumber = true,
  size = 'md',
}: {
  influence?: number | null
  showNumber?: boolean
  size?: 'sm' | 'md'
}) {
  const tier = getInfluenceTier(influence)
  if (!tier) return null
  const fg = getInfluenceTierColor(tier)
  const bg = getInfluenceTierBg(tier)
  const label = getInfluenceTierLabel(tier)
  const isSm = size === 'sm'
  return (
    <View style={[styles.badge, isSm && styles.badgeSm, { backgroundColor: bg }]}>
      <Text style={[styles.label, isSm && styles.labelSm, { color: fg }]}>{label}</Text>
      {showNumber && influence != null && (
        <Text style={[styles.value, isSm && styles.valueSm, { color: fg }]}>{influence}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, gap: 4 },
  label: { ...Type.badge, fontSize: 12, lineHeight: 14 },
  labelSm: { ...Type.badge },
  value: { ...Type.badge, fontSize: 12, lineHeight: 14, opacity: 0.7 },
  valueSm: { ...Type.badge },
})
