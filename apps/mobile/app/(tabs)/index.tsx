import { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useQuery } from '@tanstack/react-query'
import { AppPressable } from '@/components/app-pressable'
import { InitialAvatar } from '@/components/initial-avatar'
import { api } from '@/lib/api'
import { formatDateString } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { EmptyState } from '@/components/empty-state'
import { ListErrorView } from '@/components/list-error-view'
import { PageHeader } from '@/components/page-header'
import { SearchHistoryChips } from '@/components/search-history-chips'
import { SkeletonList } from '@/components/skeleton'
import { useTabScrollToTop } from '@/hooks/use-tab-scroll-to-top'
import { useSearchHistory } from '@/lib/search-history'
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/use-debounced-value'
import { Elevation, Radius, Spacing, Tokens, Type, useTokens } from '@/constants/theme'
import { errorMessage } from '@/lib/error'
import { goEvent, goEventEdit } from '@/lib/routes'
import type { EventListItem } from '@/lib/dto'

export default function EventsScreen() {
  const router = useRouter()
  const t = useTokens()
  const listRef = useRef<FlatList<EventListItem>>(null)
  useTabScrollToTop(listRef)
  // iOS는 탭 바가 absolute라 마지막 아이템이 가려지지 않게 직접 패딩
  const tabBarHeight = useBottomTabBarHeight()
  const listBottomPad = Platform.OS === 'ios' ? tabBarHeight + Spacing.md : Spacing.md
  // PageHeader collapse용 scrollY
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
  })
  const { items: searchHistory, push: pushHistory, remove: removeHistory, clear: clearHistory } =
    useSearchHistory('events')
  const [query, setQuery] = useState('')

  const eventsQuery = useQuery({
    queryKey: ['events', 'list'],
    queryFn: async () => {
      const res = await api.get<EventListItem[]>('/events', { params: { limit: 200 } })
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const items = eventsQuery.data ?? []
  const loading = eventsQuery.isLoading
  const refreshing = eventsQuery.isRefetching
  const error = eventsQuery.error ? errorMessage(eventsQuery.error) : null

  const onRefresh = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await eventsQuery.refetch()
  }, [eventsQuery])

  const load = useCallback(() => {
    void eventsQuery.refetch()
  }, [eventsQuery])

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter((e) =>
      `${e.title ?? ''}${e.description ?? ''}${e.location ?? ''}${e.category?.name ?? ''}${(e.keywords ?? []).join(' ')}`
        .toLowerCase()
        .includes(q),
    )
  }, [items, debouncedQuery])

  if (loading) {
    return (
      <View style={styles.root}>
        <PageHeader title="사건" />
        <SkeletonList count={6} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <PageHeader
        title="사건"
        subtitle={`${filtered.length}건`}
        scrollY={scrollY}
        search={{ value: query, onChange: setQuery, placeholder: '제목·키워드·장소 검색' }}
        bottomSlot={
          !query ? (
            <SearchHistoryChips
              items={searchHistory}
              onSelect={(q) => setQuery(q)}
              onRemove={removeHistory}
              onClear={clearHistory}
              suggestions={['임진왜란', '갑오개혁', '3.1 운동', '병자호란', '한국전쟁']}
            />
          ) : null
        }
        right={
          <AppPressable
            onPress={() => goEventEdit(router)}
            accessibilityLabel="사건 등록"
            accessibilityRole="button"
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={Tokens.brand.onPrimary} />
          </AppPressable>
        }
      />
      <Animated.FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={[styles.list, { paddingBottom: listBottomPad }]}
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.brand.primary}
            colors={[t.brand.primary]}
          />
        }
        ListEmptyComponent={
          error ? (
            <ListErrorView message={error} onRetry={load} />
          ) : (
            <EmptyState
              icon="time-outline"
              title={query ? '조건에 맞는 사건 없음' : '사건이 없습니다'}
              subtitle={query ? '다른 키워드로 검색해보세요' : '등록된 사건이 아직 없어요'}
            />
          )
        }
        renderItem={({ item }) => {
          const start = formatDateString(item.startDate, item.startDatePrecision)
          const end = formatDateString(item.endDate, item.endDatePrecision)
          const range = start || end ? `${start ?? '?'} ~ ${end ?? '?'}` : null
          const thumb = imageUrl(item.thumbnailUrl ?? item.thumbnail)
          return (
            <AppPressable
              style={styles.card}
              onPress={() => {
                if (query.trim()) pushHistory(query)
                goEvent(router, item.id)
              }}
              accessibilityRole="button"
              accessibilityLabel={item.title ?? `사건 ${item.id}`}
            >
              <View style={styles.heroWrap}>
                {thumb ? (
                  <Image
                    source={{ uri: thumb }}
                    style={styles.hero}
                    contentFit="cover"
                    transition={120}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <InitialAvatar
                    seed={item.id}
                    initial={(item.title ?? '?').slice(0, 1)}
                    fontSize={64}
                    style={styles.hero}
                  />
                )}
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.heroGradient}
                  pointerEvents="none"
                />
                {item.category?.name && (
                  <View style={styles.heroCategoryBadge}>
                    <Text style={styles.heroCategoryText}>
                      {item.category.name}
                    </Text>
                  </View>
                )}
                {range && <Text style={styles.heroDate}>{range}</Text>}
              </View>
              <View style={styles.body}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title ?? `(no title) #${item.id}`}
                </Text>
                {item.location && (
                  <Text style={styles.cardMeta} numberOfLines={1}>📍 {item.location}</Text>
                )}
                {item.description && (
                  <Text style={styles.cardSummary} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </AppPressable>
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
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Elevation.card,
  },
  cardPressed: { opacity: 0.92 },
  // hero (사진-우선)
  heroWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Tokens.surface.pressed,
  },
  hero: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  heroCategoryBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  heroCategoryText: { fontSize: 11, fontWeight: '700', color: Tokens.text.primary },
  heroDate: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  body: { padding: Spacing.md, gap: 4 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: Tokens.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...Type.titleMd, color: Tokens.text.primary },
  cardMeta: { fontSize: 12, color: Tokens.text.muted },
  cardSummary: { fontSize: 13, color: Tokens.text.secondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tag: {
    fontSize: 11,
    color: Tokens.state.info.fg,
    backgroundColor: Tokens.state.info.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
})
