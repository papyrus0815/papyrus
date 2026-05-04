import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '@/lib/api'
import { dateRange } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { ListSearchBar } from '@/components/list-search-bar'
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
                <Image source={{ uri: img }} style={styles.thumb} />
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
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0',
    flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  cardPressed: { backgroundColor: '#f8fafc' },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#e2e8f0' },
  thumbPlaceholder: { backgroundColor: '#f1f5f9' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  cardMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  tag: { fontSize: 11, color: '#0369a1', backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagAlt: { fontSize: 11, color: '#475569', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
})
