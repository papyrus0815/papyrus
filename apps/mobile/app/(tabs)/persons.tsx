import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { displayName, lifespan } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { OptionSheet, type OptionItem } from '@/components/option-sheet'
import { ActiveFilterBar, type ActiveFilterChip } from '@/components/active-filter-bar'
import { PersonCardRow, PersonCompactRow } from '@/components/persons/person-list-row'
import { PersonsFilterPanel } from '@/components/persons/persons-filter-panel'
import { PersonActionMenu } from '@/components/persons/person-action-menu'
import {
  CardSeparator,
  CenturyHeader,
  CompactSeparator,
  PersonsEmptyView,
} from '@/components/persons/persons-list-helpers'
import { setPersonPreview } from '@/lib/preview-cache'
import { centuryShortLabel } from '@/lib/century'
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/use-debounced-value'
import { useStatsAverages } from '@/lib/person-evaluations'
import { deletePerson } from '@/lib/person-mutations'
import {
  applyFilters,
  applySort,
  buildFacets,
  groupByCentury,
} from '@/lib/persons-filter'
import { SkeletonList } from '@/components/skeleton'
import { SearchHistoryChips } from '@/components/search-history-chips'
import { SwipeToDelete } from '@/components/swipe-to-delete'
import { PersonContextMenu } from '@/components/person-context-menu'
import { useTabScrollToTop } from '@/hooks/use-tab-scroll-to-top'
import { useBookmarks } from '@/lib/bookmarks'
import { useSearchHistory } from '@/lib/search-history'
import { Tokens, useTokens } from '@/constants/theme'
import { errorMessage } from '@/lib/error'
import { goPerson, goPersonEdit } from '@/lib/routes'
import type { PersonListItem } from '@/lib/dto'
import type {
  EvalFilter,
  GenderKey,
  SortMode,
  ViewMode,
} from '@/components/persons/types'

// Reanimated가 SectionList의 typed Animated 버전을 export하지 않아 직접 생성. typeof SectionList로 제네릭 보존.
const AnimatedSectionList = Animated.createAnimatedComponent(SectionList) as unknown as typeof SectionList

const SORT_OPTIONS: OptionItem<SortMode>[] = [
  { value: 'recent', label: '최근 등록순', description: '새로 추가된 인물이 위에', icon: 'time' },
  { value: 'influence-desc', label: '영향력 (높은 순)', description: '역사적 영향력 점수 기준', icon: 'trending-up' },
  { value: 'statsAvg-desc', label: '능력치 평균 (높은 순)', description: '평가된 능력치 평균', icon: 'analytics' },
  { value: 'birth-asc', label: '출생 빠른 순', description: 'BC부터 시간순', icon: 'arrow-up' },
  { value: 'birth-desc', label: '출생 늦은 순', description: '최근 출생부터', icon: 'arrow-down' },
  { value: 'name-asc', label: '이름 가나다순', icon: 'text' },
]

export default function PersonsScreen() {
  const router = useRouter()
  const t = useTokens()
  const listRef = useRef<SectionList<PersonListItem>>(null)
  useTabScrollToTop(listRef)
  const queryClient = useQueryClient()
  const tabBarHeight = useBottomTabBarHeight()
  const listBottomPad = Platform.OS === 'ios' ? tabBarHeight + 8 : 8
  // PageHeader collapse용 scrollY
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
  })
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const [sort, setSort] = useState<SortMode>('recent')
  const [filterGenders, setFilterGenders] = useState<Set<GenderKey>>(() => new Set())
  const [filterEval, setFilterEval] = useState<EvalFilter>('all')
  const [filterCountryIds, setFilterCountryIds] = useState<Set<string>>(() => new Set())
  const [filterCenturies, setFilterCenturies] = useState<Set<number | null>>(() => new Set())
  const [filterDynastyIds, setFilterDynastyIds] = useState<Set<string>>(() => new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [groupCentury, setGroupCentury] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [longPressTarget, setLongPressTarget] = useState<PersonListItem | null>(null)

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

  const onRefresh = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await personsQuery.refetch()
  }, [personsQuery])

  const load = useCallback(() => {
    void personsQuery.refetch()
  }, [personsQuery])

  const { countries, dynasties, centuries } = useMemo(() => buildFacets(items), [items])

  const filtered = useMemo(
    () =>
      applyFilters(items, {
        query: debouncedQuery,
        genders: filterGenders,
        evalFilter: filterEval,
        countryIds: filterCountryIds,
        dynastyIds: filterDynastyIds,
        centuries: filterCenturies,
      }),
    [items, debouncedQuery, filterGenders, filterEval, filterCountryIds, filterDynastyIds, filterCenturies],
  )

  const sorted = useMemo(() => applySort(filtered, sort, statsAverages), [filtered, sort, statsAverages])

  const activeFilterChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = []
    for (const g of filterGenders) {
      chips.push({
        key: `gender-${g}`,
        label: g === 'MALE' ? '남' : '여',
        onClear: () =>
          setFilterGenders((prev) => {
            const next = new Set(prev)
            next.delete(g)
            return next
          }),
      })
    }
    if (filterEval !== 'all') {
      chips.push({
        key: 'eval',
        label: filterEval === 'evaluated' ? '평가됨' : '미평가',
        onClear: () => setFilterEval('all'),
      })
    }
    for (const c of filterCenturies) {
      chips.push({
        key: `cent-${c}`,
        label: centuryShortLabel(c),
        onClear: () =>
          setFilterCenturies((prev) => {
            const next = new Set(prev)
            next.delete(c)
            return next
          }),
      })
    }
    for (const id of filterCountryIds) {
      const c = countries.find((it) => it.id === id)
      chips.push({
        key: `co-${id}`,
        label: c ? `${c.flagEmoji ?? ''} ${c.name}`.trim() : '국가',
        onClear: () =>
          setFilterCountryIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          }),
      })
    }
    for (const id of filterDynastyIds) {
      const d = dynasties.find((it) => it.id === id)
      chips.push({
        key: `dy-${id}`,
        label: d?.name ?? '가문',
        onClear: () =>
          setFilterDynastyIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          }),
      })
    }
    return chips
  }, [filterGenders, filterEval, filterCenturies, filterCountryIds, filterDynastyIds, countries, dynasties])

  const resetAllFilters = useCallback(() => {
    setFilterGenders(new Set())
    setFilterEval('all')
    setFilterCountryIds(new Set())
    setFilterDynastyIds(new Set())
    setFilterCenturies(new Set())
  }, [])

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? '정렬'

  const { items: searchHistory, push: pushHistory, remove: removeHistory, clear: clearHistory } =
    useSearchHistory('persons')
  const { has: isBookmarked, toggle: toggleBookmark } = useBookmarks('persons')

  const handleToggleBookmark = useCallback(
    (p: PersonListItem) => toggleBookmark(p.id),
    [toggleBookmark],
  )

  const handlePress = useCallback(
    (item: PersonListItem) => {
      // 검색 중에 결과를 눌렀다면 검색어를 history에 저장
      if (debouncedQuery.trim()) pushHistory(debouncedQuery)
      setPersonPreview(item)
      goPerson(router, item.id)
    },
    [debouncedQuery, pushHistory, router],
  )

  const handleLongPress = useCallback((item: PersonListItem) => {
    setLongPressTarget(item)
  }, [])

  // 필터/정렬/뷰 변경 시 부드러운 재배치
  const animateNext = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  }, [])

  // long-press 메뉴와 swipe-to-delete 양쪽에서 공유하는 삭제 흐름
  const confirmAndDelete = useCallback(
    (p: PersonListItem) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert('인물 삭제', `"${displayName(p)}" 삭제하시겠어요?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePerson(p.id)
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
              // optimistic 캐시 갱신 — 다음 refetch 때 서버 진실로 동기화됨
              queryClient.setQueryData<PersonListItem[]>(['persons', 'list'], (prev) =>
                prev ? prev.filter((it) => it.id !== p.id) : prev,
              )
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            } catch (err) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
              Alert.alert('삭제 실패', errorMessage(err, '삭제 실패'))
            }
          },
        },
      ])
    },
    [queryClient],
  )

  // iOS context menu 액션 디스패치
  const handleContextAction = useCallback(
    (action: 'edit' | 'share' | 'delete', p: PersonListItem) => {
      if (action === 'edit') {
        goPersonEdit(router, p.id)
      } else if (action === 'share') {
        const ls = lifespan(p)
        void Share.share({
          message: [displayName(p), ls, p.country?.name].filter(Boolean).join(' · '),
        })
      } else {
        confirmAndDelete(p)
      }
    },
    [router, confirmAndDelete],
  )

  if (loading) {
    return (
      <View style={styles.root}>
        <PageHeader title="인물" />
        <SkeletonList variant="person-card" count={4} gap={12} />
      </View>
    )
  }

  const isEmpty = sorted.length === 0

  return (
    <View style={styles.root}>
      <PageHeader
        title="인물"
        subtitle={`${sorted.length}명${activeFilterChips.length > 0 ? ` (필터 ${activeFilterChips.length}개)` : ''}`}
        scrollY={scrollY}
        search={{ value: query, onChange: setQuery, placeholder: '이름·왕호·가문·국가' }}
        bottomSlot={
          !query ? (
            <SearchHistoryChips
              items={searchHistory}
              onSelect={(q) => setQuery(q)}
              onRemove={removeHistory}
              onClear={clearHistory}
              suggestions={['세종', '정조', '광개토대왕', '이순신', '왕건', '주원장']}
            />
          ) : null
        }
        right={
          <Pressable
            onPress={() => goPersonEdit(router)}
            hitSlop={8}
            accessibilityLabel="인물 등록"
            accessibilityRole="button"
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          >
            <Ionicons name="add" size={22} color={Tokens.text.inverse} />
          </Pressable>
        }
      />
      <View style={styles.toolbar}>
        <View style={styles.toolbarRow}>
          <Pressable
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
            onPress={() => setShowSortSheet(true)}
            accessibilityLabel={`정렬 변경 (현재: ${sortLabel})`}
            accessibilityRole="button"
          >
            <Ionicons name="swap-vertical" size={14} color={Tokens.text.secondary} />
            <Text style={styles.ghostBtnText}>{sortLabel}</Text>
            <Ionicons name="chevron-down" size={12} color={Tokens.text.muted} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.ghostBtn,
              activeFilterChips.length > 0 && styles.ghostBtnAccent,
              pressed && styles.ghostBtnPressed,
            ]}
            onPress={() => {
              animateNext()
              setShowFilters((v) => !v)
            }}
            accessibilityLabel="필터 패널 토글"
            accessibilityRole="button"
          >
            <Ionicons
              name={showFilters ? 'filter' : 'filter-outline'}
              size={14}
              color={activeFilterChips.length > 0 ? Tokens.brand.primary : Tokens.text.secondary}
            />
            <Text
              style={[
                styles.ghostBtnText,
                activeFilterChips.length > 0 && { color: Tokens.brand.primary, fontWeight: '700' },
              ]}
            >
              필터{activeFilterChips.length > 0 ? ` ${activeFilterChips.length}` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.ghostBtn,
              groupCentury && styles.ghostBtnAccent,
              pressed && styles.ghostBtnPressed,
            ]}
            onPress={() => {
              animateNext()
              setGroupCentury((v) => !v)
            }}
            accessibilityLabel="세기별 그룹"
            accessibilityRole="switch"
            accessibilityState={{ checked: groupCentury }}
          >
            <Ionicons
              name="albums"
              size={14}
              color={groupCentury ? Tokens.brand.primary : Tokens.text.secondary}
            />
            <Text
              style={[
                styles.ghostBtnText,
                groupCentury && { color: Tokens.brand.primary, fontWeight: '700' },
              ]}
            >
              세기
            </Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          {/* iOS UISegmentedControl 톤: 배경 surface.pressed, 활성 segment surface.raised */}
          <View style={styles.segment}>
            <Pressable
              onPress={() => {
                animateNext()
                setViewMode('cards')
              }}
              style={[styles.segmentItem, viewMode === 'cards' && styles.segmentItemActive]}
              accessibilityLabel="카드 뷰"
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === 'cards' }}
            >
              <Ionicons
                name="albums-outline"
                size={15}
                color={viewMode === 'cards' ? Tokens.text.primary : Tokens.text.muted}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                animateNext()
                setViewMode('compact')
              }}
              style={[styles.segmentItem, viewMode === 'compact' && styles.segmentItemActive]}
              accessibilityLabel="콤팩트 뷰"
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === 'compact' }}
            >
              <Ionicons
                name="list-outline"
                size={15}
                color={viewMode === 'compact' ? Tokens.text.primary : Tokens.text.muted}
              />
            </Pressable>
          </View>
        </View>
        {showFilters && (
          <PersonsFilterPanel
            filterGenders={filterGenders}
            toggleGender={(g) => {
              animateNext()
              setFilterGenders((prev) => {
                const next = new Set(prev)
                if (next.has(g)) next.delete(g)
                else next.add(g)
                return next
              })
            }}
            filterEval={filterEval}
            setFilterEval={(v) => {
              animateNext()
              setFilterEval(v)
            }}
            filterCountryIds={filterCountryIds}
            toggleCountry={(id) => {
              animateNext()
              setFilterCountryIds((prev) => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }}
            filterDynastyIds={filterDynastyIds}
            toggleDynasty={(id) => {
              animateNext()
              setFilterDynastyIds((prev) => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }}
            filterCenturies={filterCenturies}
            toggleCentury={(c) => {
              animateNext()
              setFilterCenturies((prev) => {
                const next = new Set(prev)
                if (next.has(c)) next.delete(c)
                else next.add(c)
                return next
              })
            }}
            countries={countries}
            dynasties={dynasties}
            centuries={centuries}
            onReset={resetAllFilters}
          />
        )}
      </View>
      <ActiveFilterBar chips={activeFilterChips} onClearAll={resetAllFilters} />

      {isEmpty ? (
        <PersonsEmptyView
          message={error ?? (debouncedQuery || activeFilterChips.length > 0 ? '조건에 맞는 인물 없음' : '아직 인물이 없습니다')}
          showCta={!error && !debouncedQuery && activeFilterChips.length === 0}
          onRegister={() => goPersonEdit(router)}
          onRetry={error ? load : undefined}
          onClearFilters={
            debouncedQuery || activeFilterChips.length > 0
              ? () => {
                  setQuery('')
                  resetAllFilters()
                }
              : undefined
          }
        />
      ) : (
        <AnimatedSectionList
          ref={listRef}
          sections={groupCentury ? groupByCentury(sorted) : [{ century: null, data: sorted }]}
          keyExtractor={(it) => String(it.id)}
          stickySectionHeadersEnabled={groupCentury}
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
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews
          renderSectionHeader={
            groupCentury
              ? ({ section }) => (
                  <CenturyHeader century={section.century} count={section.data.length} />
                )
              : undefined
          }
          renderItem={({ item }) => (
            <Animated.View
              layout={LinearTransition.springify().damping(20).stiffness(180)}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(140)}
            >
              <SwipeToDelete onDelete={() => confirmAndDelete(item)}>
                <PersonContextMenu person={item} onAction={handleContextAction}>
                  {viewMode === 'cards' ? (
                    <PersonCardRow
                      item={item}
                      query={debouncedQuery}
                      statsAvg={statsAverages.get(item.id) ?? null}
                      onPress={handlePress}
                      onLongPress={handleLongPress}
                      bookmarked={isBookmarked(item.id)}
                      onToggleBookmark={handleToggleBookmark}
                    />
                  ) : (
                    <PersonCompactRow
                      item={item}
                      query={debouncedQuery}
                      onPress={handlePress}
                      onLongPress={handleLongPress}
                    />
                  )}
                </PersonContextMenu>
              </SwipeToDelete>
            </Animated.View>
          )}
          ItemSeparatorComponent={viewMode === 'compact' ? CompactSeparator : CardSeparator}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        />
      )}

      <OptionSheet
        visible={showSortSheet}
        title="정렬 기준"
        options={SORT_OPTIONS}
        selected={sort}
        onSelect={(v) => {
          animateNext()
          setSort(v)
        }}
        onClose={() => setShowSortSheet(false)}
      />

      <PersonActionMenu
        target={longPressTarget}
        onClose={() => setLongPressTarget(null)}
        onEdit={(p) => {
          setLongPressTarget(null)
          goPersonEdit(router, p.id)
        }}
        onShare={(p) => {
          setLongPressTarget(null)
          const ls = lifespan(p)
          void Share.share({
            message: [displayName(p), ls, p.country?.name].filter(Boolean).join(' · '),
          })
        }}
        onDelete={(p) => {
          setLongPressTarget(null)
          confirmAndDelete(p)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Tokens.surface.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    backgroundColor: Tokens.surface.raised,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.subtle,
    paddingBottom: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  // ghost 버튼: 테두리 없이 부드러운 배경, 활성 시 brand 텍스트만 강조
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ghostBtnPressed: { backgroundColor: Tokens.surface.pressed },
  ghostBtnAccent: { backgroundColor: Tokens.surface.pressed },
  ghostBtnText: { fontSize: 12, fontWeight: '600', color: Tokens.text.secondary },
  // iOS UISegmentedControl 톤
  segment: {
    flexDirection: 'row',
    backgroundColor: Tokens.surface.pressed,
    borderRadius: 8,
    padding: 2,
  },
  segmentItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentItemActive: {
    backgroundColor: Tokens.surface.raised,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  list: { paddingHorizontal: 12, paddingVertical: 8 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: Tokens.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: { opacity: 0.7 },
})
