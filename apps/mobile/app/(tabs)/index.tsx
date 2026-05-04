import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { api } from '@/lib/api'
import { formatDateString } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { ListSearchBar } from '@/components/list-search-bar'
import { PageHeader } from '@/components/page-header'
import { Tokens } from '@/constants/theme'
import type { EventListItem } from '@/lib/dto'

export default function EventsScreen() {
  const router = useRouter()
  const [items, setItems] = useState<EventListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api.get<EventListItem[] | { data?: EventListItem[]; items?: EventListItem[] }>(
        '/events',
        { params: { limit: 200 } },
      )
      const list = Array.isArray(res.data)
        ? res.data
        : res.data.data ?? res.data.items ?? []
      setItems(list)
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
    return items.filter((e) =>
      `${e.title ?? ''}${e.description ?? ''}${e.location ?? ''}${e.category?.name ?? ''}${(e.keywords ?? []).join(' ')}`
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
      <PageHeader title="사건" subtitle={`${filtered.length}건`} />
      <ListSearchBar value={query} onChange={setQuery} placeholder="제목·키워드·장소 검색" />
      <FlatList
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{error ?? '사건이 없습니다'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const start = formatDateString(item.startDate, item.startDatePrecision)
          const end = formatDateString(item.endDate, item.endDatePrecision)
          const range = start || end ? `${start ?? '?'} ~ ${end ?? '?'}` : null
          const thumb = imageUrl(item.thumbnailUrl ?? item.thumbnail)
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/event/${item.id}` as any)}
            >
              {thumb && (
                <Image
                  source={{ uri: thumb }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={120}
                  cachePolicy="memory-disk"
                />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title ?? `(no title) #${item.id}`}
                </Text>
                {range && <Text style={styles.cardMeta}>{range}</Text>}
                <View style={styles.metaRow}>
                  {item.category?.name && <Text style={styles.tag}>{item.category.name}</Text>}
                  {item.location && <Text style={styles.cardMeta} numberOfLines={1}>📍 {item.location}</Text>}
                </View>
                {item.description && (
                  <Text style={styles.cardSummary} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
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
  },
  cardPressed: { backgroundColor: Tokens.surface.canvas },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: Tokens.border.subtle },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Tokens.text.primary },
  cardMeta: { fontSize: 12, color: Tokens.text.muted },
  cardSummary: { fontSize: 13, color: Tokens.text.secondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tag: {
    fontSize: 11,
    color: Tokens.accent.blue,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
})
