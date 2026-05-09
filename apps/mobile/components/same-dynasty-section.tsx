import { memo, useMemo } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppPressable } from '@/components/app-pressable'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { displayName, lifespan } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { signedYear } from '@/lib/age-utils'
import { useDynastyMembers } from '@/lib/dynasty-cache'
import { setPersonPreview } from '@/lib/preview-cache'
import { goPerson } from '@/lib/routes'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export const SameDynastySection = memo(function SameDynastySection({
  dynastyId,
  dynastyName,
  currentPersonId,
}: {
  dynastyId: string
  dynastyName?: string | null
  currentPersonId: string
}) {
  const router = useRouter()
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const { data: items, loading } = useDynastyMembers(dynastyId)

  const sorted = useMemo(() => {
    if (!items) return []
    return [...items].sort((a, b) => {
      const ya = a.birthYear != null ? signedYear(a.birthEra, a.birthYear) : Number.POSITIVE_INFINITY
      const yb = b.birthYear != null ? signedYear(b.birthEra, b.birthYear) : Number.POSITIVE_INFINITY
      return ya - yb
    })
  }, [items])

  if (loading) {
    return (
      <View style={styles.section}>
        <Header dynastyName={dynastyName} count={null} styles={styles} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
        </View>
      </View>
    )
  }
  if (!sorted.length || (sorted.length === 1 && sorted[0].id === currentPersonId)) return null

  return (
    <View style={styles.section}>
      <Header dynastyName={dynastyName} count={sorted.length} styles={styles} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {sorted.map((p) => {
          const isCurrent = p.id === currentPersonId
          const img = imageUrl(p.profileImageUrl)
          const name = displayName(p)
          return (
            <AppPressable
              key={p.id}
              disabled={isCurrent}
              onPress={() => {
                setPersonPreview(p)
                goPerson(router, p.id)
              }}
              style={[styles.card, isCurrent && styles.cardCurrent]}
              haptic={!isCurrent}
            >
              {img ? (
                <Image
                  source={{ uri: img }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={120}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{name.slice(0, 1)}</Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              {p.regnalName ? (
                <Text style={styles.regnal} numberOfLines={1}>{p.regnalName}</Text>
              ) : null}
              <Text style={styles.years} numberOfLines={1}>{lifespan(p) || '-'}</Text>
            </AppPressable>
          )
        })}
      </ScrollView>
    </View>
  )
})

function Header({
  dynastyName,
  count,
  styles,
}: {
  dynastyName?: string | null
  count: number | null
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>같은 가문 {dynastyName ? `· ${dynastyName}` : ''}</Text>
      {count != null && <Text style={styles.countText}>{count}명</Text>}
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    section: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.base,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      marginTop: Spacing.md,
    },
    loadingWrap: { paddingVertical: Spacing.base, alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
    title: { ...Type.sectionLabel, color: t.text.muted },
    countText: { ...Type.captionSm, color: t.text.soft },
    row: { gap: Spacing.sm, paddingVertical: Spacing.xs },
    card: {
      width: 96,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      alignItems: 'center',
      gap: Spacing.xs,
    },
    cardCurrent: { backgroundColor: t.surface.highlight, borderColor: t.surface.highlightBorder },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: t.border.subtle },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { ...Type.titleSm, fontWeight: '700', color: t.text.muted },
    name: { ...Type.captionSm, fontWeight: '600', color: t.text.primary, textAlign: 'center' },
    regnal: { ...Type.badge, color: t.text.primary },
    years: { ...Type.badge, fontWeight: '500', color: t.text.soft },
  })
}
