import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

/**
 * 작은 인라인 빈 상태 메시지.
 * 풍부한 UI(큰 아이콘 + 그라데이션 + CTA)가 필요하면 components/empty-state.tsx 사용.
 */
export function EmptyMessage({ text }: { text: string }) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    empty: { padding: Spacing.xl, alignItems: 'center' },
    emptyText: { ...Type.bodySm, color: t.text.soft },
  })
}
