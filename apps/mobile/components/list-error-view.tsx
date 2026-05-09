import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

/**
 * 리스트/디테일 화면에서 데이터 로드 실패 시 공용 에러 + 재시도.
 * negative 톤(약한 빨강 배경)으로 위험 신호 명확화.
 */
export const ListErrorView = memo(function ListErrorView({
  message,
  onRetry,
  retryLabel = '다시 시도',
}: {
  message: string
  onRetry?: () => void
  retryLabel?: string
}) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  return (
    <View style={styles.root}>
      <View style={styles.iconBubble}>
        <Ionicons name="alert-circle" size={28} color={tokens.state.negative.fg} />
      </View>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text style={styles.btnText}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  )
})

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    root: {
      padding: Spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
    },
    iconBubble: {
      width: 56,
      height: 56,
      borderRadius: Radius.full,
      backgroundColor: t.state.negative.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { ...Type.bodySm, color: t.text.secondary, textAlign: 'center', maxWidth: 280 },
    btn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: 12,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: t.state.negative.fg,
      minHeight: 48,
      justifyContent: 'center',
    },
    btnPressed: { opacity: 0.7 },
    btnText: { ...Type.buttonSm, color: t.state.negative.fg, fontWeight: '700' },
  })
}
