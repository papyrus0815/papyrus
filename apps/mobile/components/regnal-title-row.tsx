import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export function RegnalTitleRow({
  regnalName,
  regnalNumber,
  templeName,
  posthumousName,
}: {
  regnalName?: string | null
  regnalNumber?: number | null
  templeName?: string | null
  posthumousName?: string | null
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  if (!regnalName && !templeName && !posthumousName) return null
  return (
    <View style={styles.row}>
      <Text style={styles.crown}>♔</Text>
      <View style={styles.body}>
        {regnalName ? (
          <Text style={styles.title}>
            {regnalName}
            {regnalNumber != null ? ` (${regnalNumber}대)` : ''}
          </Text>
        ) : null}
        {(templeName || posthumousName) && (
          <Text style={styles.sub} numberOfLines={2}>
            {[templeName ? `묘호 ${templeName}` : null, posthumousName ? `시호 ${posthumousName}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </View>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: t.surface.pressed,
      borderRadius: Radius.sm,
    },
    body: { flex: 1, gap: 2 },
    crown: { fontSize: 18, color: t.text.secondary },
    title: { ...Type.titleSm, fontWeight: '700', color: t.text.primary },
    sub: { ...Type.captionSm, color: t.text.muted },
  })
}
