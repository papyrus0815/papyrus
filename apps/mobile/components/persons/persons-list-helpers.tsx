import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { centuryLongLabel } from '@/lib/century'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export function CenturyHeader({ century, count }: { century: number | null; count: number }) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <View style={styles.centuryHeader}>
      <Text style={styles.centuryText}>{centuryLongLabel(century)}</Text>
      <View style={styles.centuryLine} />
      <Text style={styles.centuryCount}>{count}</Text>
    </View>
  )
}

export function PersonsEmptyView({
  message,
  showCta,
  onRegister,
  onClearFilters,
  onRetry,
}: {
  message: string
  showCta: boolean
  onRegister: () => void
  onClearFilters?: () => void
  onRetry?: () => void
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name={onRetry ? 'alert-circle-outline' : 'people-outline'} size={48} color={t.text.soft} />
      <Text style={styles.emptyText}>{message}</Text>
      {showCta && (
        <Pressable style={styles.emptyCta} onPress={onRegister}>
          <Ionicons name="add" size={16} color={t.text.inverse} />
          <Text style={styles.emptyCtaText}>인물 등록</Text>
        </Pressable>
      )}
      {onRetry && (
        <Pressable
          style={styles.retryBtn}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
        >
          <Ionicons name="refresh" size={16} color={t.text.primary} />
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </Pressable>
      )}
      {onClearFilters && (
        <Pressable onPress={onClearFilters} hitSlop={6} style={styles.clearBtn}>
          <Text style={styles.emptyClear}>검색·필터 초기화</Text>
        </Pressable>
      )}
    </View>
  )
}

export function CompactSeparator() {
  const t = useTokens()
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: t.border.subtle,
        marginHorizontal: Spacing.md,
      }}
    />
  )
}

export function CardSeparator() {
  return <View style={{ height: Spacing.sm }} />
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    centuryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      backgroundColor: t.surface.canvas,
    },
    centuryText: { ...Type.bodySm, fontWeight: '700', color: t.text.primary, minWidth: 80 },
    centuryLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.border.subtle },
    centuryCount: {
      ...Type.badge,
      color: t.text.muted,
      backgroundColor: t.surface.pressed,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: Radius.full,
      minWidth: 24,
      textAlign: 'center',
    },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
    emptyText: { ...Type.bodySm, color: t.text.muted, textAlign: 'center' },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: t.brand.primary,
      borderRadius: Radius.sm,
      minHeight: 48,
    },
    emptyCtaText: { ...Type.buttonSm, color: t.text.inverse, fontWeight: '700' },
    clearBtn: { marginTop: Spacing.sm },
    emptyClear: { ...Type.captionSm, color: t.text.muted, fontWeight: '600', textDecorationLine: 'underline' },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: t.border.subtle,
      minHeight: 48,
    },
    retryBtnText: { ...Type.captionSm, color: t.text.primary, fontWeight: '600' },
  })
}
