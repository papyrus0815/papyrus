import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Tokens } from '@/constants/theme'

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
            <Ionicons name="close" size={14} color={Tokens.text.inverse} />
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

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: Tokens.surface.raised,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.subtle,
  },
  row: { gap: 6, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    backgroundColor: Tokens.text.primary,
    borderRadius: 14,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Tokens.text.inverse },
  clearAll: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearAllText: { fontSize: 12, fontWeight: '600', color: Tokens.text.muted, textDecorationLine: 'underline' },
})
