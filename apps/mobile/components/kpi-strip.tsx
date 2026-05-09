import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import { InfluenceTierBadge } from './influence-tier-badge'

export type KpiValue = string | number | React.ReactNode

export type KpiEntry = {
  key: string
  label: string
  value: KpiValue
  /** 0~100 — 있으면 값 아래 progress bar 표시 (영향력 등) */
  progress?: number
  /** progress bar 색상 (default: brand.primary) */
  progressColor?: string
}

/**
 * Apple Health 스타일 KPI: 작은 라벨 + 큰 값 + (옵션) progress bar.
 * 가로 스크롤, divider로 구분.
 */
export function KpiStrip({ items }: { items: KpiEntry[] }) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

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
            {typeof it.progress === 'number' && (
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(0, Math.min(100, it.progress))}%`,
                      backgroundColor: it.progressColor ?? tokens.brand.primary,
                    },
                  ]}
                />
              </View>
            )}
          </View>
          {idx < items.length - 1 && <View style={styles.divider} />}
        </View>
      ))}
    </ScrollView>
  )
}

export { InfluenceTierBadge }

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    scroll: {
      backgroundColor: t.surface.raised,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    row: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, alignItems: 'center', gap: 0 },
    itemWrap: { flexDirection: 'row', alignItems: 'center' },
    item: { paddingHorizontal: Spacing.md, gap: Spacing.xxs, alignItems: 'center', minWidth: 80 },
    divider: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: t.border.subtle },
    label: { ...Type.sectionLabel, fontSize: 11, color: t.text.muted },
    // Apple Health 스타일: 큰 값 + 굵게
    value: { ...Type.titleMd, fontSize: 18, lineHeight: 24, fontWeight: '700', color: t.text.primary },
    progressBg: {
      height: 5,
      width: 64,
      borderRadius: Radius.xs,
      backgroundColor: t.surface.pressed,
      overflow: 'hidden',
      marginTop: 2,
    },
    progressFill: { height: '100%', borderRadius: Radius.xs },
  })
}
