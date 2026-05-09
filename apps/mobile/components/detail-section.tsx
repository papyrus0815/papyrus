import { memo, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export const DetailSection = memo(function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const styles = useStyles()
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  )
})

export const DetailRow = memo(function DetailRow({
  label,
  value,
}: {
  label: string
  value?: string | number | null
}) {
  const styles = useStyles()
  if (value === null || value === undefined || value === '') return null
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  )
})

function useStyles() {
  const t = useTokens()
  return useMemo(() => makeStyles(t), [t])
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    section: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.base,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      marginBottom: Spacing.md,
      gap: 6,
    },
    title: { ...Type.sectionLabel, color: t.text.muted, marginBottom: Spacing.xs },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.xs },
    label: { ...Type.captionSm, width: 90, color: t.text.muted },
    value: { ...Type.bodySm, flex: 1, color: t.text.primary },
  })
}
