import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </SafeAreaView>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    safe: { backgroundColor: t.surface.canvas },
    row: {
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.md,
    },
    titleWrap: { flex: 1 },
    title: { ...Type.displayXl, color: t.text.primary },
    subtitle: { ...Type.bodySm, color: t.text.muted, marginTop: 2 },
  })
}
