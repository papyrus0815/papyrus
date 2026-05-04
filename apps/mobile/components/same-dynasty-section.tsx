import { useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { displayName, lifespan } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { signedYear } from '@/lib/age-utils'
import { useDynastyMembers } from '@/lib/dynasty-cache'
import { setPersonPreview } from '@/lib/preview-cache'
import { Tokens } from '@/constants/theme'

export function SameDynastySection({
  dynastyId,
  dynastyName,
  currentPersonId,
}: {
  dynastyId: string
  dynastyName?: string | null
  currentPersonId: string
}) {
  const router = useRouter()
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
        <Header dynastyName={dynastyName} count={null} />
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </View>
    )
  }
  if (!sorted.length || (sorted.length === 1 && sorted[0].id === currentPersonId)) return null

  return (
    <View style={styles.section}>
      <Header dynastyName={dynastyName} count={sorted.length} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {sorted.map((p) => {
          const isCurrent = p.id === currentPersonId
          const img = imageUrl(p.profileImageUrl)
          const name = displayName(p)
          return (
            <Pressable
              key={p.id}
              disabled={isCurrent}
              onPress={() => {
                setPersonPreview(p)
                router.push(`/person/${p.id}` as any)
              }}
              style={({ pressed }) => [
                styles.card,
                isCurrent && styles.cardCurrent,
                pressed && !isCurrent && styles.cardPressed,
              ]}
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
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

function Header({ dynastyName, count }: { dynastyName?: string | null; count: number | null }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>같은 가문 {dynastyName ? `· ${dynastyName}` : ''}</Text>
      {count != null && <Text style={styles.countText}>{count}명</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    marginTop: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 12, fontWeight: '700', color: Tokens.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  countText: { fontSize: 12, color: Tokens.text.soft },
  row: { gap: 8, paddingVertical: 4 },
  card: {
    width: 96,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    alignItems: 'center',
    gap: 4,
  },
  cardPressed: { backgroundColor: Tokens.surface.pressed },
  cardCurrent: { backgroundColor: Tokens.surface.highlight, borderColor: Tokens.surface.highlightBorder },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Tokens.border.subtle },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: Tokens.text.muted },
  name: { fontSize: 12, fontWeight: '600', color: Tokens.text.primary, textAlign: 'center' },
  regnal: { fontSize: 10, color: Tokens.accent.amber, fontWeight: '600' },
  years: { fontSize: 10, color: Tokens.text.soft },
})
