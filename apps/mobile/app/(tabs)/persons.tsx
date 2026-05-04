import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@/lib/api'
import { displayName, lifespan } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { ListSearchBar } from '@/components/list-search-bar'
import { InfluenceTierBadge } from '@/components/influence-tier-badge'
import { PageHeader } from '@/components/page-header'
import { setPersonPreview } from '@/lib/preview-cache'
import { signedYear } from '@/lib/age-utils'
import { Tokens } from '@/constants/theme'
import type { PersonListItem } from '@/lib/dto'

type SortMode =
  | 'influence-desc'
  | 'influence-asc'
  | 'name-asc'
  | 'birth-asc'
  | 'birth-desc'

type GenderFilter = 'all' | 'MALE' | 'FEMALE'
type EvalFilter = 'all' | 'evaluated' | 'unevaluated'
type ViewMode = 'cards' | 'compact'

const SORT_LABEL: Record<SortMode, string> = {
  'influence-desc': '영향력 ↓',
  'influence-asc': '영향력 ↑',
  'name-asc': '가나다',
  'birth-asc': '출생 빠른순',
  'birth-desc': '출생 늦은순',
}
const SORT_ORDER: SortMode[] = [
  'influence-desc',
  'influence-asc',
  'name-asc',
  'birth-asc',
  'birth-desc',
]

function centuryOf(p: PersonListItem): number | null {
  if (p.birthYear == null) return null
  const y = signedYear(p.birthEra, p.birthYear)
  // BC 100년대 = -1세기, AD 1년대 = 1세기
  return y >= 0 ? Math.floor((y - 1) / 100) + 1 : -(Math.floor((-y - 1) / 100) + 1)
}

function centuryLabel(c: number | null): string {
  if (c == null) return '미상'
  return c < 0 ? `BC ${-c}C` : `${c}C`
}

export default function PersonsScreen() {
  const router = useRouter()
  const [items, setItems] = useState<PersonListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('influence-desc')
  const [filterGender, setFilterGender] = useState<GenderFilter>('all')
  const [filterEval, setFilterEval] = useState<EvalFilter>('all')
  const [filterCountryId, setFilterCountryId] = useState<string | null>(null)
  const [filterCentury, setFilterCentury] = useState<number | null>(null)
  const [filterDynastyId, setFilterDynastyId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [showFilters, setShowFilters] = useState(false)

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
    const centSet = new Set<number | null>()
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
      centSet.add(centuryOf(p))
    }
    return {
      countries: [...cMap.values()].sort((a, b) => b.count - a.count),
      dynasties: [...dMap.values()].sort((a, b) => b.count - a.count),
      centuries: [...centSet].sort((a, b) => {
        if (a == null) return 1
        if (b == null) return -1
        return b - a
      }),
    }
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((p) => {
      if (q) {
        const haystack = `${p.name ?? ''}${p.surname ?? ''}${p.regnalName ?? ''}${p.dynasty?.name ?? ''}${p.country?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (filterGender !== 'all') {
        const g = (p.gender ?? '').toUpperCase()
        if (filterGender === 'MALE' && g !== 'MALE' && g !== 'M') return false
        if (filterGender === 'FEMALE' && g !== 'FEMALE' && g !== 'F') return false
      }
      if (filterEval !== 'all') {
        const has = p.influence != null && p.influence > 0
        if (filterEval === 'evaluated' && !has) return false
        if (filterEval === 'unevaluated' && has) return false
      }
      if (filterCountryId && p.country?.id !== filterCountryId) return false
      if (filterDynastyId && p.dynasty?.id !== filterDynastyId) return false
      if (filterCentury !== null && centuryOf(p) !== filterCentury) return false
      return true
    })
  }, [items, query, filterGender, filterEval, filterCountryId, filterDynastyId, filterCentury])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'influence-desc':
        arr.sort((a, b) => (b.influence ?? -1) - (a.influence ?? -1))
        break
      case 'influence-asc':
        arr.sort((a, b) => (a.influence ?? Number.POSITIVE_INFINITY) - (b.influence ?? Number.POSITIVE_INFINITY))
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
  }, [filtered, sort])

  const cycleSort = () => {
    const idx = SORT_ORDER.indexOf(sort)
    setSort(SORT_ORDER[(idx + 1) % SORT_ORDER.length])
  }

  const activeFilterCount =
    (filterGender !== 'all' ? 1 : 0) +
    (filterEval !== 'all' ? 1 : 0) +
    (filterCountryId ? 1 : 0) +
    (filterDynastyId ? 1 : 0) +
    (filterCentury !== null ? 1 : 0)

  const resetFilters = () => {
    setFilterGender('all')
    setFilterEval('all')
    setFilterCountryId(null)
    setFilterDynastyId(null)
    setFilterCentury(null)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <PageHeader
        title="인물"
        subtitle={`${sorted.length}명${activeFilterCount > 0 ? ` (필터 ${activeFilterCount}개)` : ''}`}
      />
      <View style={styles.toolbar}>
        <ListSearchBar value={query} onChange={setQuery} placeholder="이름·왕호·가문·국가" />
        <View style={styles.toolbarRow}>
          <Pressable style={styles.toolbarBtn} onPress={cycleSort}>
            <Ionicons name="swap-vertical" size={14} color={Tokens.text.secondary} />
            <Text style={styles.toolbarBtnText}>{SORT_LABEL[sort]}</Text>
          </Pressable>
          <Pressable
            style={[styles.toolbarBtn, activeFilterCount > 0 && styles.toolbarBtnActive]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Ionicons
              name={showFilters ? 'filter' : 'filter-outline'}
              size={14}
              color={activeFilterCount > 0 ? Tokens.text.inverse : Tokens.text.secondary}
            />
            <Text style={[styles.toolbarBtnText, activeFilterCount > 0 && styles.toolbarBtnTextActive]}>
              필터{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
            </Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode('cards')}
              style={[styles.viewBtn, viewMode === 'cards' && styles.viewBtnActive]}
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
            filterGender={filterGender}
            setFilterGender={setFilterGender}
            filterEval={filterEval}
            setFilterEval={setFilterEval}
            filterCountryId={filterCountryId}
            setFilterCountryId={setFilterCountryId}
            filterDynastyId={filterDynastyId}
            setFilterDynastyId={setFilterDynastyId}
            filterCentury={filterCentury}
            setFilterCentury={setFilterCentury}
            countries={countries}
            dynasties={dynasties}
            centuries={centuries}
            onReset={resetFilters}
          />
        )}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{error ?? '인물이 없습니다'}</Text>
          </View>
        }
        renderItem={({ item }) =>
          viewMode === 'cards' ? (
            <CardRow item={item} onPress={() => onItemPress(item, router)} />
          ) : (
            <CompactRow item={item} onPress={() => onItemPress(item, router)} />
          )
        }
        ItemSeparatorComponent={viewMode === 'compact' ? Separator : undefined}
      />
    </View>
  )
}

function onItemPress(item: PersonListItem, router: ReturnType<typeof useRouter>) {
  setPersonPreview(item)
  router.push(`/person/${item.id}` as any)
}

function CardRow({ item, onPress }: { item: PersonListItem; onPress: () => void }) {
  const ls = lifespan(item)
  const img = imageUrl(item.profileImageUrl)
  const name = displayName(item)
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      {img ? (
        <Image source={{ uri: img }} style={styles.avatar} contentFit="cover" transition={120} cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>{name.slice(0, 1)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          {item.regnalName ? (
            <Text style={styles.cardRegnal} numberOfLines={1}>
              {item.regnalName}
            </Text>
          ) : null}
          <Text style={styles.cardTitle} numberOfLines={1}>
            {name}
          </Text>
          {item.country?.flagEmoji && <Text style={styles.flag}>{item.country.flagEmoji}</Text>}
        </View>
        {!!ls && <Text style={styles.cardMeta}>{ls}</Text>}
        <View style={styles.tagRow}>
          {item.dynasty?.name && <Text style={styles.tag}>{item.dynasty.name}</Text>}
          {item.country?.name && <Text style={styles.cardMeta}>{item.country.name}</Text>}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <InfluenceTierBadge influence={item.influence} size="sm" showNumber={false} />
      </View>
    </Pressable>
  )
}

function CompactRow({ item, onPress }: { item: PersonListItem; onPress: () => void }) {
  const ls = lifespan(item)
  const name = displayName(item)
  return (
    <Pressable style={({ pressed }) => [styles.compactRow, pressed && styles.cardPressed]} onPress={onPress}>
      <Text style={styles.compactName} numberOfLines={1}>
        {item.regnalName ? `${item.regnalName} · ${name}` : name}
        {item.country?.flagEmoji ? ` ${item.country.flagEmoji}` : ''}
      </Text>
      <Text style={styles.compactMeta} numberOfLines={1}>
        {[ls, item.dynasty?.name, item.country?.name].filter(Boolean).join(' · ')}
      </Text>
      <InfluenceTierBadge influence={item.influence} size="sm" showNumber={false} />
    </Pressable>
  )
}

function Separator() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Tokens.border.subtle, marginHorizontal: 12 }} />
}

function FilterPanel({
  filterGender,
  setFilterGender,
  filterEval,
  setFilterEval,
  filterCountryId,
  setFilterCountryId,
  filterDynastyId,
  setFilterDynastyId,
  filterCentury,
  setFilterCentury,
  countries,
  dynasties,
  centuries,
  onReset,
}: {
  filterGender: GenderFilter
  setFilterGender: (v: GenderFilter) => void
  filterEval: EvalFilter
  setFilterEval: (v: EvalFilter) => void
  filterCountryId: string | null
  setFilterCountryId: (v: string | null) => void
  filterDynastyId: string | null
  setFilterDynastyId: (v: string | null) => void
  filterCentury: number | null
  setFilterCentury: (v: number | null) => void
  countries: Array<{ id: string; name: string; flagEmoji?: string | null; count: number }>
  dynasties: Array<{ id: string; name: string; count: number }>
  centuries: Array<number | null>
  onReset: () => void
}) {
  return (
    <View style={styles.filterPanel}>
      <FilterSection label="성별">
        <SegBtn active={filterGender === 'all'} label="전체" onPress={() => setFilterGender('all')} />
        <SegBtn active={filterGender === 'MALE'} label="남" onPress={() => setFilterGender('MALE')} />
        <SegBtn active={filterGender === 'FEMALE'} label="여" onPress={() => setFilterGender('FEMALE')} />
      </FilterSection>

      <FilterSection label="평가">
        <SegBtn active={filterEval === 'all'} label="전체" onPress={() => setFilterEval('all')} />
        <SegBtn active={filterEval === 'evaluated'} label="평가됨" onPress={() => setFilterEval('evaluated')} />
        <SegBtn active={filterEval === 'unevaluated'} label="미평가" onPress={() => setFilterEval('unevaluated')} />
      </FilterSection>

      {centuries.length > 1 && (
        <FilterSection label="세기" scrollable>
          <Chip active={filterCentury === null} label="전체" onPress={() => setFilterCentury(null)} />
          {centuries.map((c) => (
            <Chip
              key={String(c)}
              active={filterCentury === c}
              label={centuryLabel(c)}
              onPress={() => setFilterCentury(c)}
            />
          ))}
        </FilterSection>
      )}

      {countries.length > 0 && (
        <FilterSection label="국가" scrollable>
          <Chip active={filterCountryId === null} label="전체" onPress={() => setFilterCountryId(null)} />
          {countries.map((c) => (
            <Chip
              key={c.id}
              active={filterCountryId === c.id}
              label={`${c.flagEmoji ?? ''} ${c.name}`.trim()}
              count={c.count}
              onPress={() => setFilterCountryId(c.id)}
            />
          ))}
        </FilterSection>
      )}

      {dynasties.length > 0 && (
        <FilterSection label="가문" scrollable>
          <Chip active={filterDynastyId === null} label="전체" onPress={() => setFilterDynastyId(null)} />
          {dynasties.map((d) => (
            <Chip
              key={d.id}
              active={filterDynastyId === d.id}
              label={d.name}
              count={d.count}
              onPress={() => setFilterDynastyId(d.id)}
            />
          ))}
        </FilterSection>
      )}

      <Pressable onPress={onReset} style={styles.resetBtn}>
        <Ionicons name="refresh" size={14} color={Tokens.text.muted} />
        <Text style={styles.resetText}>필터 초기화</Text>
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

function SegBtn({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.segBtn, active && styles.segBtnActive, pressed && styles.segBtnPressed]}
    >
      <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>{label}</Text>
    </Pressable>
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
  countLabel: { paddingHorizontal: 12, paddingTop: 6, fontSize: 11, color: Tokens.text.muted },
  list: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
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
  cardPressed: { backgroundColor: Tokens.surface.pressed },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Tokens.border.subtle },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: Tokens.text.muted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Tokens.text.primary },
  cardRegnal: { fontSize: 12, fontWeight: '700', color: Tokens.accent.amber },
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
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactName: { flex: 1, fontSize: 14, fontWeight: '600', color: Tokens.text.primary },
  compactMeta: { fontSize: 11, color: Tokens.text.muted },

  filterPanel: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Tokens.border.subtle,
    marginTop: 8,
  },
  filterSection: { gap: 4 },
  filterLabel: { fontSize: 10, fontWeight: '700', color: Tokens.text.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  filterChipsScroll: { gap: 4, paddingVertical: 2 },
  segBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  segBtnActive: { backgroundColor: Tokens.text.primary, borderColor: Tokens.text.primary },
  segBtnPressed: { opacity: 0.7 },
  segBtnText: { fontSize: 12, fontWeight: '600', color: Tokens.text.secondary },
  segBtnTextActive: { color: Tokens.text.inverse },
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
})
