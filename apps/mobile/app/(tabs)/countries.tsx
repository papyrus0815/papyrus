import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { api } from '@/lib/api'
import { dateRange } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { ListSearchBar } from '@/components/list-search-bar'
import { PageHeader } from '@/components/page-header'
import { Tokens } from '@/constants/theme'
import type { CountryListItem } from '@/lib/dto'

export default function CountriesScreen() {
  const router = useRouter()
  const [items, setItems] = useState<CountryListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api.get<CountryListItem[]>('/historical-countries')
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
    return items.filter((c) =>
      `${c.name ?? ''}${c.enName ?? ''}${c.stateType ?? ''}`.toLowerCase().includes(q),
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
      <PageHeader title="국가" subtitle={`${filtered.length}개`} />
      <ListSearchBar value={query} onChange={setQuery} placeholder="국가·정권 검색" />
      <FlatList
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{error ?? '국가가 없습니다'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const range = dateRange(item)
          const img = imageUrl(item.thumbnailUrl)
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/country/${item.id}` as any)}
            >
              {img ? (
                <Image
                  source={{ uri: img }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={120}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name ?? `(no name) #${item.id}`}
                </Text>
                {!!item.enName && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {item.enName}
                  </Text>
                )}
                <View style={styles.metaRow}>
                  {item.stateType && <Text style={styles.tag}>{item.stateType}</Text>}
                  {item.entityKind && <Text style={styles.tagAlt}>{item.entityKind}</Text>}
                </View>
                {!!range && <Text style={styles.cardMeta}>{range}</Text>}
              </View>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Tokens.surface.canvas },
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
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: Tokens.border.subtle },
  thumbPlaceholder: { backgroundColor: Tokens.surface.pressed },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Tokens.text.primary },
  subtitle: { fontSize: 12, color: Tokens.text.soft, marginTop: 1 },
  cardMeta: { fontSize: 12, color: Tokens.text.muted, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  tag: {
    fontSize: 11,
    color: Tokens.accent.blue,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagAlt: {
    fontSize: 11,
    color: Tokens.text.secondary,
    backgroundColor: Tokens.surface.pressed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
})
