import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

/**
 * 디테일 화면의 탭/섹션 에러 + 재시도. 화면 전체 에러는 ListErrorView 사용.
 */
export function PaneErrorBlock({
  message,
  onRetry,
  retryLabel = '다시 시도',
}: {
  message: string
  onRetry: () => void
  retryLabel?: string
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <View style={styles.errorBlock}>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
      >
        <Text style={styles.retryText}>{retryLabel}</Text>
      </Pressable>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    errorBlock: {
      padding: Spacing.base,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: t.border.subtle,
      alignItems: 'center',
      marginBottom: Spacing.md,
      gap: Spacing.md,
    },
    errorText: { ...Type.bodySm, color: t.text.danger, textAlign: 'center' },
    retryBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: 12,
      backgroundColor: t.surface.canvas,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: t.border.subtle,
      minHeight: 48,
      justifyContent: 'center',
    },
    retryPressed: { backgroundColor: t.surface.pressed },
    retryText: { ...Type.buttonSm, color: t.text.primary, fontWeight: '600' },
  })
}
