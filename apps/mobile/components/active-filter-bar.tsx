import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export type ActiveFilterChip = {
  key: string
  label: string
  onClear: () => void
}

/**
 * 활성 필터 가시화. 각 칩 우측 ⨯로 개별 해제.
 */
export function ActiveFilterBar({
  chips,
  onClearAll,
}: {
  chips: ActiveFilterChip[]
  onClearAll?: () => void
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  if (chips.length === 0) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {chips.map((c) => (
        <View key={c.key} style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>
            {c.label}
          </Text>
          <Pressable
            onPress={c.onClear}
            hitSlop={6}
            accessibilityLabel={`${c.label} 필터 해제`}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={14} color={t.brand.primary} />
          </Pressable>
        </View>
      ))}
      {chips.length > 1 && onClearAll && (
        <Pressable onPress={onClearAll} style={styles.clearAll}>
          <Text style={styles.clearAllText}>모두 해제</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    scroll: {
      backgroundColor: t.surface.raised,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    row: { gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center' },
    // outlined 스타일 — 여러 chip이 가로로 늘어설 때 fill 보다 시각 부담 적음
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingLeft: Spacing.md,
      paddingRight: 6,
      paddingVertical: Spacing.xs,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.brand.primary,
      borderRadius: Radius.full,
    },
    chipText: { ...Type.captionSm, fontWeight: '600', color: t.brand.primary },
    clearAll: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
    clearAllText: { ...Type.captionSm, fontWeight: '600', color: t.text.muted, textDecorationLine: 'underline' },
  })
}
