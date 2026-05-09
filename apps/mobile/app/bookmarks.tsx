import { useCallback, useMemo, useRef } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/error'
import { goPerson, routes } from '@/lib/routes'
import { useBookmarks } from '@/lib/bookmarks'
import { setPersonPreview } from '@/lib/preview-cache'
import { useStatsAverages } from '@/lib/person-evaluations'
import { EmptyState } from '@/components/empty-state'
import { ListErrorView } from '@/components/list-error-view'
import { SkeletonList } from '@/components/skeleton'
import { PersonCardRow } from '@/components/persons/person-list-row'
import { Spacing, Tokens, useTokens } from '@/constants/theme'
import type { PersonListItem } from '@/lib/dto'

export default function BookmarksScreen() {
  const router = useRouter()
  const t = useTokens()
  const listRef = useRef<FlatList<PersonListItem>>(null)
  const { ids, has, toggle } = useBookmarks('persons')
  const { averages: statsAverages } = useStatsAverages()

  const personsQuery = useQuery({
    queryKey: ['persons', 'list'],
    queryFn: async () => {
      const res = await api.get<PersonListItem[]>('/persons')
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const items = personsQuery.data ?? []
  const loading = personsQuery.isLoading
  const refreshing = personsQuery.isRefetching
  const error = personsQuery.error ? errorMessage(personsQuery.error) : null

  const onRefresh = useCallback(() => {
    void personsQuery.refetch()
  }, [personsQuery])

  // 즐겨찾기 ID에 속한 인물만, ids 순서로
  const bookmarked = useMemo(() => {
    if (!items.length || ids.size === 0) return [] as PersonListItem[]
    const byId = new Map(items.map((p) => [p.id, p]))
    return [...ids].map((id) => byId.get(id)).filter((p): p is PersonListItem => !!p)
  }, [items, ids])

  const handlePress = useCallback(
    (item: PersonListItem) => {
      setPersonPreview(item)
      goPerson(router, item.id)
    },
    [router],
  )
  const handleToggleBookmark = useCallback(
    (p: PersonListItem) => toggle(p.id),
    [toggle],
  )

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: '즐겨찾기' }} />
        <View style={styles.root}>
          <SkeletonList variant="person-card" count={3} gap={12} />
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: `즐겨찾기 (${bookmarked.length})` }} />
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={bookmarked}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={t.brand.primary}
              colors={[t.brand.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          ListEmptyComponent={
            error ? (
              <ListErrorView message={error} onRetry={onRefresh} />
            ) : (
              <EmptyState
                icon="heart"
                tone="soft"
                title="즐겨찾기가 비어있어요"
                subtitle={'인물 카드의 하트를 탭하면\n여기에 모입니다'}
                actionLabel="인물 보러가기"
                onAction={() => router.replace(routes.tabs.persons as never)}
              />
            )
          }
          renderItem={({ item }) => (
            <PersonCardRow
              item={item}
              query=""
              statsAvg={statsAverages.get(item.id) ?? null}
              onPress={handlePress}
              onLongPress={handlePress}
              bookmarked={has(item.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          )}
        />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Tokens.surface.canvas },
  list: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, flexGrow: 1 },
})
