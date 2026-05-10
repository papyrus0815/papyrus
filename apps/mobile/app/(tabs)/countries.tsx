import { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useQuery } from '@tanstack/react-query'
import { AppPressable } from '@/components/app-pressable'
import { InitialAvatar } from '@/components/initial-avatar'
import { api } from '@/lib/api'
import { dateRange } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { EmptyState } from '@/components/empty-state'
import { ListErrorView } from '@/components/list-error-view'
import { PageHeader } from '@/components/page-header'
import { SearchHistoryChips } from '@/components/search-history-chips'
import { SkeletonList } from '@/components/skeleton'
import { useTabScrollToTop } from '@/hooks/use-tab-scroll-to-top'
import { useSearchHistory } from '@/lib/search-history'
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/use-debounced-value'
import { Elevation, Radius, Spacing, Tokens, Type } from '@/constants/theme'
import { errorMessage } from '@/lib/error'
import { goCountry } from '@/lib/routes'
import type { CountryListItem } from '@/lib/dto'

export default function CountriesScreen() {
  const router = useRouter()
  const listRef = useRef<FlatList<CountryListItem>>(null)
  useTabScrollToTop(listRef)
  const tabBarHeight = useBottomTabBarHeight()
  const listBottomPad = Platform.OS === 'ios' ? tabBarHeight + Spacing.md : Spacing.md
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
  })
  const { items: searchHistory, push: pushHistory, remove: removeHistory, clear: clearHistory } =
    useSearchHistory('countries')
  const [query, setQuery] = useState('')

  const countriesQuery = useQuery({
    queryKey: ['countries', 'list'],
    queryFn: async () => {
      const res = await api.get<CountryListItem[]>('/historical-countries')
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const items = countriesQuery.data ?? []
  const loading = countriesQuery.isLoading
  const refreshing = countriesQuery.isRefetching
  const error = countriesQuery.error ? errorMessage(countriesQuery.error) : null

  const onRefresh = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await countriesQuery.refetch()
  }, [countriesQuery])

  const load = useCallback(() => {
    void countriesQuery.refetch()
  }, [countriesQuery])

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) =>
      `${c.name ?? ''}${c.enName ?? ''}${c.stateType ?? ''}`.toLowerCase().includes(q),
    )
  }, [items, debouncedQuery])

  if (loading) {
    return (
      <View style={styles.root}>
        <PageHeader title="국가" />
        <SkeletonList count={6} />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <PageHeader
        title="국가"
        subtitle={`${filtered.length}개`}
        scrollY={scrollY}
        search={{ value: query, onChange: setQuery, placeholder: '국가·정권 검색' }}
        bottomSlot={
          !query ? (
            <SearchHistoryChips
              items={searchHistory}
              onSelect={(q) => setQuery(q)}
              onRemove={removeHistory}
              onClear={clearHistory}
              suggestions={['조선', '고려', '신라', '백제', '고구려', '대한제국']}
            />
          ) : null
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
            tintColor={Tokens.brand.primary}
            colors={[Tokens.brand.primary]}
          />
        }
        ListEmptyComponent={
          error ? (
            <ListErrorView message={error} onRetry={load} />
          ) : (
            <EmptyState
              icon="flag-outline"
              title={query ? '조건에 맞는 국가 없음' : '국가가 없습니다'}
              subtitle={query ? '다른 이름으로 검색해보세요' : '등록된 국가가 아직 없어요'}
            />
          )
        }
        renderItem={({ item }) => {
          const range = dateRange(item)
          const img = imageUrl(item.thumbnailUrl)
          return (
            <AppPressable
              style={styles.card}
              onPress={() => {
                if (query.trim()) pushHistory(query)
                goCountry(router, item.id)
              }}
              accessibilityRole="button"
              accessibilityLabel={item.name ?? `국가 ${item.id}`}
            >
              <View style={styles.heroWrap}>
                {img ? (
                  <Image
                    source={{ uri: img }}
                    style={styles.hero}
                    contentFit="cover"
                    transition={120}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <InitialAvatar
                    seed={item.id}
                    initial={(item.name ?? '?').slice(0, 1)}
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
                {item.stateType && (
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipText}>{item.stateType}</Text>
                  </View>
                )}
                {!!range && <Text style={styles.heroDate}>{range}</Text>}
              </View>
              <View style={styles.body}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name ?? `(no name) #${item.id}`}
                </Text>
                {!!item.enName && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {item.enName}
                  </Text>
                )}
                {item.entityKind && <Text style={styles.cardMeta}>{item.entityKind}</Text>}
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
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
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
  heroChip: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  heroChipText: { fontSize: 11, fontWeight: '700', color: Tokens.text.primary },
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
  cardTitle: { ...Type.titleMd, color: Tokens.text.primary },
  subtitle: { fontSize: 12, color: Tokens.text.soft, marginTop: 1 },
  cardMeta: { fontSize: 12, color: Tokens.text.muted, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  tag: {
    fontSize: 11,
    color: Tokens.state.info.fg,
    backgroundColor: Tokens.state.info.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  tagAlt: {
    fontSize: 11,
    color: Tokens.text.secondary,
    backgroundColor: Tokens.surface.pressed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
})
