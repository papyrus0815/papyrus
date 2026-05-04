import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '@/lib/api'
import { displayName, lifespan } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { ListSearchBar } from '@/components/list-search-bar'
import { InfluenceTierBadge } from '@/components/influence-tier-badge'
import { PageHeader } from '@/components/page-header'
import { HighlightedText } from '@/components/highlighted-text'
import { OptionSheet, type OptionItem } from '@/components/option-sheet'
import { ActiveFilterBar, type ActiveFilterChip } from '@/components/active-filter-bar'
import { setPersonPreview } from '@/lib/preview-cache'
import { signedYear } from '@/lib/age-utils'
import { centuryOf, centuryLongLabel, centuryShortLabel } from '@/lib/century'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useStatsAverages } from '@/lib/person-evaluations'
import { deletePerson } from '@/lib/person-mutations'
import { Alert, Share } from 'react-native'
import { Tokens } from '@/constants/theme'
import type { PersonListItem } from '@/lib/dto'

type SortMode =
  | 'recent'
  | 'influence-desc'
  | 'statsAvg-desc'
  | 'name-asc'
  | 'birth-asc'
  | 'birth-desc'

const SORT_OPTIONS: OptionItem<SortMode>[] = [
  { value: 'recent', label: '최근 등록순', description: '새로 추가된 인물이 위에', icon: 'time' },
  { value: 'influence-desc', label: '영향력 (높은 순)', description: '역사적 영향력 점수 기준', icon: 'trending-up' },
  { value: 'statsAvg-desc', label: '능력치 평균 (높은 순)', description: '평가된 능력치 평균', icon: 'analytics' },
  { value: 'birth-asc', label: '출생 빠른 순', description: 'BC부터 시간순', icon: 'arrow-up' },
  { value: 'birth-desc', label: '출생 늦은 순', description: '최근 출생부터', icon: 'arrow-down' },
  { value: 'name-asc', label: '이름 가나다순', icon: 'text' },
]

type GenderKey = 'MALE' | 'FEMALE'
type EvalFilter = 'all' | 'evaluated' | 'unevaluated'
type ViewMode = 'cards' | 'compact'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function isRecentlyRegistered(createdAt?: string | null): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  return Number.isFinite(t) && Date.now() - t < TWENTY_FOUR_HOURS_MS
}

export default function PersonsScreen() {
  const router = useRouter()
  const [items, setItems] = useState<PersonListItem[]>([])
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 200)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('recent')
  const [filterGenders, setFilterGenders] = useState<Set<GenderKey>>(() => new Set())
  const [filterEval, setFilterEval] = useState<EvalFilter>('all')
  const [filterCountryIds, setFilterCountryIds] = useState<Set<string>>(() => new Set())
  const [filterCenturies, setFilterCenturies] = useState<Set<number | null>>(() => new Set())
  const [filterDynastyIds, setFilterDynastyIds] = useState<Set<string>>(() => new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [groupByCentury, setGroupByCentury] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [longPressTarget, setLongPressTarget] = useState<PersonListItem | null>(null)

  const { averages: statsAverages } = useStatsAverages()

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

  // 가용 필터 옵션 도출
  const { countries, dynasties, centuries } = useMemo(() => {
    const cMap = new Map<string, { id: string; name: string; flagEmoji?: string | null; count: number }>()
    const dMap = new Map<string, { id: string; name: string; count: number }>()
    const centMap = new Map<number | null, number>()
    for (const p of items) {
      if (p.country) {
        const ex = cMap.get(p.country.id)
        if (ex) ex.count++
        else cMap.set(p.country.id, { ...p.country, count: 1 })
      }
      if (p.dynasty) {
        const ex = dMap.get(p.dynasty.id)
        if (ex) ex.count++
        else dMap.set(p.dynasty.id, { ...p.dynasty, count: 1 })
      }
      const c = centuryOf(p)
      centMap.set(c, (centMap.get(c) ?? 0) + 1)
    }
    return {
      countries: [...cMap.values()].sort((a, b) => b.count - a.count),
      dynasties: [...dMap.values()].sort((a, b) => b.count - a.count),
      centuries: [...centMap.entries()]
        .sort(([a], [b]) => {
          if (a == null) return 1
          if (b == null) return -1
          return b - a
        })
        .map(([c, count]) => ({ century: c, count })),
    }
  }, [items])

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    return items.filter((p) => {
      if (q) {
        const haystack =
          `${p.name ?? ''} ${p.surname ?? ''} ${p.regnalName ?? ''} ${p.dynasty?.name ?? ''} ${p.country?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (filterGenders.size > 0) {
        const g = (p.gender ?? '').toUpperCase()
        const norm: GenderKey | null =
          g === 'MALE' || g === 'M' ? 'MALE' : g === 'FEMALE' || g === 'F' ? 'FEMALE' : null
        if (!norm || !filterGenders.has(norm)) return false
      }
      if (filterEval !== 'all') {
        const has = p.influence != null && p.influence > 0
        if (filterEval === 'evaluated' && !has) return false
        if (filterEval === 'unevaluated' && has) return false
      }
      if (filterCountryIds.size > 0) {
        if (!p.country?.id || !filterCountryIds.has(p.country.id)) return false
      }
      if (filterDynastyIds.size > 0) {
        if (!p.dynasty?.id || !filterDynastyIds.has(p.dynasty.id)) return false
      }
      if (filterCenturies.size > 0) {
        if (!filterCenturies.has(centuryOf(p))) return false
      }
      return true
    })
  }, [
    items,
    debouncedQuery,
    filterGenders,
    filterEval,
    filterCountryIds,
    filterDynastyIds,
    filterCenturies,
  ])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'recent':
        arr.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tb - ta
        })
        break
      case 'influence-desc':
        arr.sort((a, b) => (b.influence ?? -1) - (a.influence ?? -1))
        break
      case 'statsAvg-desc':
        arr.sort((a, b) => {
          const sa = statsAverages.get(a.id) ?? -1
          const sb = statsAverages.get(b.id) ?? -1
          return sb - sa
        })
        break
      case 'name-asc':
        arr.sort((a, b) => displayName(a).localeCompare(displayName(b), 'ko'))
        break
      case 'birth-asc':
        arr.sort((a, b) => {
          const ya = a.birthYear != null ? signedYear(a.birthEra, a.birthYear) : Number.POSITIVE_INFINITY
          const yb = b.birthYear != null ? signedYear(b.birthEra, b.birthYear) : Number.POSITIVE_INFINITY
          return ya - yb
        })
        break
      case 'birth-desc':
        arr.sort((a, b) => {
          const ya = a.birthYear != null ? signedYear(a.birthEra, a.birthYear) : Number.NEGATIVE_INFINITY
          const yb = b.birthYear != null ? signedYear(b.birthEra, b.birthYear) : Number.NEGATIVE_INFINITY
          return yb - ya
        })
        break
    }
    return arr
  }, [filtered, sort, statsAverages])

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

  const handleLongPress = useCallback((item: PersonListItem) => {
    setLongPressTarget(item)
  }, [])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  const isEmpty = sorted.length === 0

  return (
    <View style={styles.root}>
      <PageHeader
        title="인물"
        subtitle={`${sorted.length}명${activeFilterChips.length > 0 ? ` (필터 ${activeFilterChips.length}개)` : ''}`}
        right={
          <Pressable
            onPress={() => router.push('/person/edit' as any)}
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
        <ListSearchBar value={query} onChange={setQuery} placeholder="이름·왕호·가문·국가" />
        <View style={styles.toolbarRow}>
          <Pressable
            style={styles.toolbarBtn}
            onPress={() => setShowSortSheet(true)}
            accessibilityLabel={`정렬 변경 (현재: ${sortLabel})`}
            accessibilityRole="button"
          >
            <Ionicons name="swap-vertical" size={14} color={Tokens.text.secondary} />
            <Text style={styles.toolbarBtnText}>{sortLabel}</Text>
            <Ionicons name="chevron-down" size={12} color={Tokens.text.muted} />
          </Pressable>
          <Pressable
            style={[styles.toolbarBtn, activeFilterChips.length > 0 && styles.toolbarBtnActive]}
            onPress={() => setShowFilters((v) => !v)}
            accessibilityLabel="필터 패널 토글"
            accessibilityRole="button"
          >
            <Ionicons
              name={showFilters ? 'filter' : 'filter-outline'}
              size={14}
              color={activeFilterChips.length > 0 ? Tokens.text.inverse : Tokens.text.secondary}
            />
            <Text style={[styles.toolbarBtnText, activeFilterChips.length > 0 && styles.toolbarBtnTextActive]}>
              필터{activeFilterChips.length > 0 ? ` ${activeFilterChips.length}` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toolbarBtn, groupByCentury && styles.toolbarBtnActive]}
            onPress={() => setGroupByCentury((v) => !v)}
            accessibilityLabel="세기별 그룹"
            accessibilityRole="switch"
            accessibilityState={{ checked: groupByCentury }}
          >
            <Ionicons
              name="albums"
              size={14}
              color={groupByCentury ? Tokens.text.inverse : Tokens.text.secondary}
            />
            <Text style={[styles.toolbarBtnText, groupByCentury && styles.toolbarBtnTextActive]}>
              세기
            </Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode('cards')}
              style={[styles.viewBtn, viewMode === 'cards' && styles.viewBtnActive]}
              accessibilityLabel="카드 뷰"
              accessibilityRole="button"
            >
              <Ionicons
                name="albums-outline"
                size={16}
                color={viewMode === 'cards' ? Tokens.text.inverse : Tokens.text.muted}
              />
            </Pressable>
            <Pressable
              onPress={() => setViewMode('compact')}
              style={[styles.viewBtn, viewMode === 'compact' && styles.viewBtnActive]}
              accessibilityLabel="콤팩트 뷰"
              accessibilityRole="button"
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={viewMode === 'compact' ? Tokens.text.inverse : Tokens.text.muted}
              />
            </Pressable>
          </View>
        </View>
        {showFilters && (
          <FilterPanel
            filterGenders={filterGenders}
            toggleGender={(g) =>
              setFilterGenders((prev) => {
                const next = new Set(prev)
                next.has(g) ? next.delete(g) : next.add(g)
                return next
              })
            }
            filterEval={filterEval}
            setFilterEval={setFilterEval}
            filterCountryIds={filterCountryIds}
            toggleCountry={(id) =>
              setFilterCountryIds((prev) => {
                const next = new Set(prev)
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })
            }
            filterDynastyIds={filterDynastyIds}
            toggleDynasty={(id) =>
              setFilterDynastyIds((prev) => {
                const next = new Set(prev)
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })
            }
            filterCenturies={filterCenturies}
            toggleCentury={(c) =>
              setFilterCenturies((prev) => {
                const next = new Set(prev)
                next.has(c) ? next.delete(c) : next.add(c)
                return next
              })
            }
            countries={countries}
            dynasties={dynasties}
            centuries={centuries}
            onReset={resetAllFilters}
          />
        )}
      </View>
      <ActiveFilterBar chips={activeFilterChips} onClearAll={resetAllFilters} />

      {isEmpty ? (
        <EmptyView
          message={error ?? (debouncedQuery || activeFilterChips.length > 0 ? '조건에 맞는 인물 없음' : '아직 인물이 없습니다')}
          showCta={!error && !debouncedQuery && activeFilterChips.length === 0}
          onRegister={() => router.push('/person/edit' as any)}
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
        <SectionList
          sections={groupByCentury ? sectionData(sorted) : [{ century: null, data: sorted }]}
          keyExtractor={(it) => String(it.id)}
          stickySectionHeadersEnabled={groupByCentury}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews
          renderSectionHeader={
            groupByCentury
              ? ({ section }) => (
                  <CenturyHeader century={section.century} count={section.data.length} />
                )
              : undefined
          }
          renderItem={({ item }) =>
            viewMode === 'cards' ? (
              <CardRow
                item={item}
                query={debouncedQuery}
                statsAvg={statsAverages.get(item.id) ?? null}
                onPress={() => onItemPress(item, router)}
                onLongPress={() => handleLongPress(item)}
              />
            ) : (
              <CompactRow
                item={item}
                query={debouncedQuery}
                onPress={() => onItemPress(item, router)}
                onLongPress={() => handleLongPress(item)}
              />
            )
          }
          ItemSeparatorComponent={viewMode === 'compact' ? Separator : CardSeparator}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        />
      )}

      <OptionSheet
        visible={showSortSheet}
        title="정렬 기준"
        options={SORT_OPTIONS}
        selected={sort}
        onSelect={setSort}
        onClose={() => setShowSortSheet(false)}
      />

      <PersonActionMenu
        target={longPressTarget}
        onClose={() => setLongPressTarget(null)}
        onEdit={(p) => {
          setLongPressTarget(null)
          router.push(`/person/edit?id=${p.id}` as any)
        }}
        onShare={(p) => {
          setLongPressTarget(null)
          const ls = lifespan(p)
          void Share.share({
            message: [displayName(p), ls, p.country?.name].filter(Boolean).join(' · '),
          })
        }}
        onDelete={async (p) => {
          setLongPressTarget(null)
          Alert.alert('인물 삭제', `"${displayName(p)}" 삭제하시겠어요?`, [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deletePerson(p.id)
                  setItems((prev) => prev.filter((it) => it.id !== p.id))
                } catch (err: any) {
                  Alert.alert('삭제 실패', err?.response?.data?.message ?? err?.message ?? '삭제 실패')
                }
              },
            },
          ])
        }}
      />
    </View>
  )
}

function onItemPress(item: PersonListItem, router: ReturnType<typeof useRouter>) {
  setPersonPreview(item)
  router.push(`/person/${item.id}` as any)
}

type Section = { century: number | null; data: PersonListItem[] }

function sectionData(items: PersonListItem[]): Section[] {
  const map = new Map<string, Section>()
  for (const p of items) {
    const c = centuryOf(p)
    const key = c === null ? 'unknown' : String(c)
    let sec = map.get(key)
    if (!sec) {
      sec = { century: c, data: [] }
      map.set(key, sec)
    }
    sec.data.push(p)
  }
  return [...map.values()].sort((a, b) => {
    if (a.century === null) return 1
    if (b.century === null) return -1
    return b.century - a.century
  })
}

function CenturyHeader({ century, count }: { century: number | null; count: number }) {
  return (
    <View style={styles.centuryHeader}>
      <Text style={styles.centuryText}>{centuryLongLabel(century)}</Text>
      <View style={styles.centuryLine} />
      <Text style={styles.centuryCount}>{count}</Text>
    </View>
  )
}

function CardRow({
  item,
  query,
  statsAvg,
  onPress,
  onLongPress,
}: {
  item: PersonListItem
  query: string
  statsAvg: number | null
  onPress: () => void
  onLongPress: () => void
}) {
  const ls = lifespan(item)
  const img = imageUrl(item.profileImageUrl)
  const name = displayName(item)
  const isNew = isRecentlyRegistered(item.createdAt)
  const bioExcerpt = item.biography
    ? item.biography
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60)
    : null
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityLabel={`${name} ${ls}`}
      accessibilityRole="button"
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
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleRow}>
          {item.regnalName ? (
            <HighlightedText
              text={item.regnalName}
              query={query}
              style={styles.cardRegnal}
              numberOfLines={1}
            />
          ) : null}
          <HighlightedText text={name} query={query} style={styles.cardTitle} numberOfLines={1} />
          {item.country?.flagEmoji && <Text style={styles.flag}>{item.country.flagEmoji}</Text>}
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        {!!ls && <Text style={styles.cardMeta}>{ls}</Text>}
        <View style={styles.tagRow}>
          {item.dynasty?.name && (
            <HighlightedText text={item.dynasty.name} query={query} style={styles.tag} />
          )}
          {item.country?.name && (
            <HighlightedText text={item.country.name} query={query} style={styles.cardMeta} />
          )}
          {statsAvg != null && (
            <Text style={styles.statsBadge}>
              ⌀ {statsAvg.toFixed(0)}
            </Text>
          )}
        </View>
        {bioExcerpt && (
          <Text style={styles.cardBio} numberOfLines={2}>
            {bioExcerpt}
            {bioExcerpt.length === 60 ? '…' : ''}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <InfluenceTierBadge influence={item.influence} size="sm" showNumber={item.influence != null} />
      </View>
    </Pressable>
  )
}

function CompactRow({
  item,
  query,
  onPress,
  onLongPress,
}: {
  item: PersonListItem
  query: string
  onPress: () => void
  onLongPress: () => void
}) {
  const ls = lifespan(item)
  const name = displayName(item)
  const titleText = item.regnalName ? `${item.regnalName} · ${name}` : name
  const isNew = isRecentlyRegistered(item.createdAt)
  return (
    <Pressable
      style={({ pressed }) => [styles.compactRow, pressed && styles.cardPressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityLabel={`${name}, ${ls}`}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <HighlightedText
            text={titleText + (item.country?.flagEmoji ? ` ${item.country.flagEmoji}` : '')}
            query={query}
            style={styles.compactName}
            numberOfLines={1}
          />
          {isNew && (
            <View style={styles.newBadgeSm}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.compactMeta} numberOfLines={1}>
          {[ls, item.dynasty?.name, item.country?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <InfluenceTierBadge influence={item.influence} size="sm" showNumber={item.influence != null} />
    </Pressable>
  )
}

function PersonActionMenu({
  target,
  onClose,
  onEdit,
  onShare,
  onDelete,
}: {
  target: PersonListItem | null
  onClose: () => void
  onEdit: (p: PersonListItem) => void
  onShare: (p: PersonListItem) => void
  onDelete: (p: PersonListItem) => void
}) {
  const visible = target != null
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.actionBackdrop} onPress={onClose} />
      <View style={styles.actionWrap} pointerEvents="box-none">
        <SafeAreaView edges={['bottom']} style={styles.actionSheet}>
          <View style={styles.actionHandle} />
          {target && (
            <Text style={styles.actionTitle} numberOfLines={1}>
              {displayName(target)}
            </Text>
          )}
          <ActionRow
            icon="create-outline"
            label="수정"
            onPress={() => target && onEdit(target)}
          />
          <ActionRow
            icon="share-outline"
            label="공유"
            onPress={() => target && onShare(target)}
          />
          <ActionRow
            icon="trash-outline"
            label="삭제"
            destructive
            onPress={() => target && onDelete(target)}
          />
          <ActionRow icon="close" label="취소" onPress={onClose} />
        </SafeAreaView>
      </View>
    </Modal>
  )
}

function ActionRow({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  destructive?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={destructive ? Tokens.accent.red : Tokens.text.primary}
      />
      <Text style={[styles.actionLabel, destructive && { color: Tokens.accent.red }]}>{label}</Text>
    </Pressable>
  )
}

function EmptyView({
  message,
  showCta,
  onRegister,
  onClearFilters,
}: {
  message: string
  showCta: boolean
  onRegister: () => void
  onClearFilters?: () => void
}) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="people-outline" size={48} color={Tokens.text.soft} />
      <Text style={styles.emptyText}>{message}</Text>
      {showCta && (
        <Pressable style={styles.emptyCta} onPress={onRegister}>
          <Ionicons name="add" size={16} color={Tokens.text.inverse} />
          <Text style={styles.emptyCtaText}>인물 등록</Text>
        </Pressable>
      )}
      {onClearFilters && (
        <Pressable onPress={onClearFilters} hitSlop={6} style={{ marginTop: 8 }}>
          <Text style={styles.emptyClear}>검색·필터 초기화</Text>
        </Pressable>
      )}
    </View>
  )
}

function Separator() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Tokens.border.subtle, marginHorizontal: 12 }} />
}

function CardSeparator() {
  return <View style={{ height: 8 }} />
}

function FilterPanel({
  filterGenders,
  toggleGender,
  filterEval,
  setFilterEval,
  filterCountryIds,
  toggleCountry,
  filterDynastyIds,
  toggleDynasty,
  filterCenturies,
  toggleCentury,
  countries,
  dynasties,
  centuries,
  onReset,
}: {
  filterGenders: Set<GenderKey>
  toggleGender: (g: GenderKey) => void
  filterEval: EvalFilter
  setFilterEval: (v: EvalFilter) => void
  filterCountryIds: Set<string>
  toggleCountry: (id: string) => void
  filterDynastyIds: Set<string>
  toggleDynasty: (id: string) => void
  filterCenturies: Set<number | null>
  toggleCentury: (c: number | null) => void
  countries: Array<{ id: string; name: string; flagEmoji?: string | null; count: number }>
  dynasties: Array<{ id: string; name: string; count: number }>
  centuries: Array<{ century: number | null; count: number }>
  onReset: () => void
}) {
  return (
    <View style={styles.filterPanel}>
      <FilterSection label="성별 (다중 가능)">
        <Chip active={filterGenders.has('MALE')} label="남" onPress={() => toggleGender('MALE')} />
        <Chip active={filterGenders.has('FEMALE')} label="여" onPress={() => toggleGender('FEMALE')} />
      </FilterSection>

      <FilterSection label="평가">
        <Chip active={filterEval === 'all'} label="전체" onPress={() => setFilterEval('all')} />
        <Chip active={filterEval === 'evaluated'} label="평가됨" onPress={() => setFilterEval('evaluated')} />
        <Chip active={filterEval === 'unevaluated'} label="미평가" onPress={() => setFilterEval('unevaluated')} />
      </FilterSection>

      {centuries.length > 1 && (
        <FilterSection label={`세기 (다중 가능)`} scrollable>
          {centuries.map((c) => (
            <Chip
              key={String(c.century)}
              active={filterCenturies.has(c.century)}
              label={centuryShortLabel(c.century)}
              count={c.count}
              onPress={() => toggleCentury(c.century)}
            />
          ))}
        </FilterSection>
      )}

      {countries.length > 0 && (
        <FilterSection label="국가 (다중 가능)" scrollable>
          {countries.map((c) => (
            <Chip
              key={c.id}
              active={filterCountryIds.has(c.id)}
              label={`${c.flagEmoji ?? ''} ${c.name}`.trim()}
              count={c.count}
              onPress={() => toggleCountry(c.id)}
            />
          ))}
        </FilterSection>
      )}

      {dynasties.length > 0 && (
        <FilterSection label="가문 (다중 가능)" scrollable>
          {dynasties.map((d) => (
            <Chip
              key={d.id}
              active={filterDynastyIds.has(d.id)}
              label={d.name}
              count={d.count}
              onPress={() => toggleDynasty(d.id)}
            />
          ))}
        </FilterSection>
      )}

      <Pressable onPress={onReset} style={styles.resetBtn}>
        <Ionicons name="refresh" size={14} color={Tokens.text.muted} />
        <Text style={styles.resetText}>모든 필터 초기화</Text>
      </Pressable>
    </View>
  )
}

function FilterSection({
  label,
  scrollable,
  children,
}: {
  label: string
  scrollable?: boolean
  children: React.ReactNode
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>{label}</Text>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.filterChipsRow}>{children}</View>
      )}
    </View>
  )
}

function Chip({
  active,
  label,
  count,
  onPress,
}: {
  active: boolean
  label: string
  count?: number
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count != null && (
        <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
      )}
    </Pressable>
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
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  toolbarBtnActive: { backgroundColor: Tokens.text.primary, borderColor: Tokens.text.primary },
  toolbarBtnText: { fontSize: 12, fontWeight: '600', color: Tokens.text.secondary },
  toolbarBtnTextActive: { color: Tokens.text.inverse },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  viewBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  viewBtnActive: { backgroundColor: Tokens.text.primary },
  list: { paddingHorizontal: 12, paddingVertical: 8 },
  centuryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: Tokens.surface.canvas,
  },
  centuryText: { fontSize: 14, fontWeight: '700', color: Tokens.text.primary, minWidth: 80 },
  centuryLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Tokens.border.subtle },
  centuryCount: {
    fontSize: 11,
    color: Tokens.text.muted,
    fontWeight: '600',
    backgroundColor: Tokens.surface.pressed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 24,
    textAlign: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Tokens.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: { opacity: 0.7 },

  // 빈 상태
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyText: { color: Tokens.text.muted, fontSize: 14, textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Tokens.text.primary,
    borderRadius: 20,
  },
  emptyCtaText: { color: Tokens.text.inverse, fontWeight: '700', fontSize: 14 },
  emptyClear: { color: Tokens.accent.blue, fontSize: 13, fontWeight: '600' },

  // 카드
  card: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardPressed: { backgroundColor: Tokens.surface.pressed },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Tokens.border.subtle },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: Tokens.text.muted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Tokens.text.primary },
  cardRegnal: { fontSize: 12, fontWeight: '700', color: Tokens.accent.amber },
  flag: { fontSize: 14 },
  cardMeta: { fontSize: 12, color: Tokens.text.muted },
  cardBio: { fontSize: 12, color: Tokens.text.secondary, marginTop: 4, lineHeight: 16 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  tag: {
    fontSize: 11,
    color: Tokens.accent.purple,
    backgroundColor: Tokens.accent.purpleSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statsBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  newBadgeSm: { backgroundColor: '#f59e0b', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },

  // 콤팩트
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  compactName: { fontSize: 14, fontWeight: '600', color: Tokens.text.primary },
  compactMeta: { fontSize: 11, color: Tokens.text.muted, marginTop: 2 },

  // 필터 패널
  filterPanel: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Tokens.border.subtle,
    marginTop: 8,
  },
  filterSection: { gap: 4 },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Tokens.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  filterChipsScroll: { gap: 4, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  chipActive: { backgroundColor: Tokens.text.primary, borderColor: Tokens.text.primary },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: 12, fontWeight: '600', color: Tokens.text.secondary },
  chipTextActive: { color: Tokens.text.inverse },
  chipCount: { fontSize: 10, color: Tokens.text.muted, fontWeight: '600' },
  chipCountActive: { color: Tokens.text.inverse, opacity: 0.7 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  resetText: { fontSize: 12, color: Tokens.text.muted, fontWeight: '600' },

  // 액션 메뉴
  actionBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  actionWrap: { flex: 1, justifyContent: 'flex-end' },
  actionSheet: {
    backgroundColor: Tokens.surface.raised,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  actionHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Tokens.border.subtle,
    alignSelf: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Tokens.text.muted,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionPressed: { backgroundColor: Tokens.surface.canvas },
  actionLabel: { fontSize: 15, color: Tokens.text.primary, fontWeight: '500' },
})
