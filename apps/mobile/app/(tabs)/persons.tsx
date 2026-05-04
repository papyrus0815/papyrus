import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { api } from '@/lib/api'
import { displayName, lifespan } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { ListSearchBar } from '@/components/list-search-bar'
import { setPersonPreview } from '@/lib/preview-cache'
import { Tokens } from '@/constants/theme'
import type { PersonListItem } from '@/lib/dto'

export default function PersonsScreen() {
  const router = useRouter()
  const [items, setItems] = useState<PersonListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api.get<PersonListItem[]>('/persons')
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'failed to load')
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((p) =>
      `${p.name ?? ''}${p.surname ?? ''}${p.dynasty?.name ?? ''}${p.country?.name ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [items, query])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <ListSearchBar value={query} onChange={setQuery} placeholder="이름·가문·국가 검색" />
      <FlatList
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{error ?? '인물이 없습니다'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ls = lifespan(item)
          const img = imageUrl(item.profileImageUrl)
          const name = displayName(item)
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => {
                setPersonPreview(item)
                router.push(`/person/${item.id}` as any)
              }}
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
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {name}
                  </Text>
                  {item.country?.flagEmoji && (
                    <Text style={styles.flag}>{item.country.flagEmoji}</Text>
                  )}
                </View>
                {!!ls && <Text style={styles.cardMeta}>{ls}</Text>}
                <View style={styles.tagRow}>
                  {item.dynasty?.name && <Text style={styles.tag}>{item.dynasty.name}</Text>}
                  {item.country?.name && <Text style={styles.cardMeta}>{item.country.name}</Text>}
                </View>
              </View>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: Tokens.text.soft, fontSize: 14 },
  card: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardPressed: { backgroundColor: Tokens.surface.canvas },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Tokens.border.subtle },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: Tokens.text.muted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Tokens.text.primary, flexShrink: 1 },
  flag: { fontSize: 14 },
  cardMeta: { fontSize: 12, color: Tokens.text.muted },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  tag: {
    fontSize: 11,
    color: Tokens.accent.purple,
    backgroundColor: Tokens.accent.purpleSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
})
