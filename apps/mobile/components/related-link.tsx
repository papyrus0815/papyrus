import { memo, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppPressable } from '@/components/app-pressable'
import { goByKind } from '@/lib/routes'
import { Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

type Kind = 'person' | 'event' | 'country'

export const RelatedLink = memo(function RelatedLink({
  kind,
  id,
  label,
  sublabel,
}: {
  kind: Kind
  id: string
  label: string
  sublabel?: string | null
}) {
  const router = useRouter()
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <AppPressable
      style={styles.row}
      onPress={() => goByKind(router, kind, id)}
      accessibilityRole="link"
      accessibilityLabel={sublabel ? `${label} (${sublabel})` : label}
      scaleTo={0.985}
    >
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {!!sublabel && (
          <Text style={styles.sub} numberOfLines={1}>
            {sublabel}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.text.soft} />
    </AppPressable>
  )
})

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      gap: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    body: { flex: 1 },
    label: { ...Type.bodySm, color: t.text.primary, fontWeight: '500' },
    sub: { ...Type.captionSm, color: t.text.muted, marginTop: 2 },
  })
}
