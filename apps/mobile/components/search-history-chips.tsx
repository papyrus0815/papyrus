import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import { useMemo } from 'react'

type Props = {
  items: string[]
  onSelect: (query: string) => void
  onRemove: (query: string) => void
  onClear: () => void
  /** history가 비었을 때 fallback으로 노출할 추천 검색어 (옵션) */
  suggestions?: readonly string[]
}

/**
 * 최근 검색어 가로 스크롤 chip 리스트.
 * - history 있을 때: 최근 검색 (× 삭제, 전체 지우기)
 * - history 비어있고 suggestions 있을 때: 추천 검색어 (× 없음)
 */
export function SearchHistoryChips({ items, onSelect, onRemove, onClear, suggestions }: Props) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  const showHistory = items.length > 0
  const showSuggestions = !showHistory && suggestions && suggestions.length > 0
  if (!showHistory && !showSuggestions) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons
            name={showHistory ? 'time-outline' : 'sparkles-outline'}
            size={12}
            color={tokens.text.muted}
          />
          <Text style={styles.label}>{showHistory ? '최근 검색' : '추천'}</Text>
        </View>
        {showHistory && (
          <Pressable onPress={onClear} hitSlop={6} accessibilityRole="button" accessibilityLabel="전체 지우기">
            <Text style={styles.clearText}>전체 지우기</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {showHistory
          ? items.map((q) => (
              <View key={q} style={styles.chip}>
                <Pressable
                  onPress={() => onSelect(q)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`${q} 검색`}
                >
                  <Text style={styles.chipText}>{q}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onRemove(q)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`${q} 검색어 삭제`}
                >
                  <Ionicons name="close" size={14} color={tokens.text.muted} />
                </Pressable>
              </View>
            ))
          : suggestions!.map((q) => (
              <Pressable
                key={q}
                onPress={() => onSelect(q)}
                hitSlop={4}
                style={styles.suggestionChip}
                accessibilityRole="button"
                accessibilityLabel={`${q} 검색`}
              >
                <Text style={styles.chipText}>{q}</Text>
              </Pressable>
            ))}
      </ScrollView>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    label: { ...Type.sectionLabel, fontSize: 11, color: t.text.muted },
    clearText: { ...Type.captionSm, color: t.text.muted, fontWeight: '600' },
    row: { gap: 6 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 12,
      paddingRight: 8,
      paddingVertical: 6,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
    },
    suggestionChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: t.surface.pressed,
      borderRadius: Radius.full,
    },
    chipText: { ...Type.captionSm, color: t.text.primary, fontWeight: '500' },
  })
}
