import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import RAnimated from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useHeroParallax } from '@/hooks/use-hero-parallax'
import { useBookmarks } from '@/lib/bookmarks'
import { api } from '@/lib/api'
import { BookmarkHeart } from '@/components/bookmark-heart'
import { DetailRow, DetailSection } from '@/components/detail-section'
import { ExpandableText } from '@/components/expandable-text'
import { RelatedLink } from '@/components/related-link'
import { RichText } from '@/components/rich-text'
import { TabBar, type TabItem } from '@/components/tab-bar'
import { PersonStatsCard } from '@/components/person-stats-card'
import type { FamilyTreeData } from '@/lib/family-tree'
import { GenealogySvg } from '@/components/genealogy-svg'
import { DeathInfoCard } from '@/components/death-info-card'
import { UnifiedTenureCardList } from '@/components/unified-tenure-card'
import { SameDynastySection } from '@/components/same-dynasty-section'
import { AdjacentPersons } from '@/components/adjacent-persons'
import { PersonHero } from '@/components/person-detail/person-hero'
import { PaneLoading } from '@/components/pane-loading'
import { PaneErrorBlock } from '@/components/pane-error-block'
import { EmptyMessage } from '@/components/empty-message'
import {
  TimelineFilter,
  TIMELINE_GROUP_KINDS,
  kindToGroup,
  type TimelineGroup,
} from '@/components/timeline-filter'
import { TimelineList } from '@/components/timeline-list'
import { displayName, formatDateString, formatYMD, lifespan, placeText } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { buildPersonTimeline, type ExtraTimelineItem, type TimelineEntry } from '@/lib/timeline-builder'
import type { PersonStats, PersonTraitAssignment } from '@/lib/person-stats'
import { getPersonPreview } from '@/lib/preview-cache'
import { relationshipLabel } from '@/lib/relationship-label'
import { Radius, Spacing, Tokens, Type } from '@/constants/theme'
import { errorMessage } from '@/lib/error'
import { goByKind, goPersonEdit } from '@/lib/routes'
import type { PersonDetail, PersonListItem } from '@/lib/dto'

type TabKey = 'overview' | 'family' | 'politics' | 'timeline' | 'relations'

type HumanRelationship = {
  id: string
  relationshipType: string
  fromPersonId: string
  toPersonId: string
  otherPerson?: {
    id: string
    name: string
    surname?: string | null
    nameDisplayOrder?: string | null
  } | null
  mentorPerspective?: 'MENTOR' | 'STUDENT' | null
  subjectivePerspective?: 'MUTUAL' | 'SUBJECT' | 'OTHER'
  isMutual?: boolean
  startDate?: string | null
  endDate?: string | null
  note?: string | null
  tags?: string[]
  phases?: Array<{
    id: string
    label?: string | null
    startDate?: string | null
    endDate?: string | null
    note?: string | null
    affinityLevel?: number | null
    trustLevel?: number | null
    powerDynamic?: number | null
    formality?: number | null
  }>
}

function personLabel(p?: { name: string; surname?: string | null } | null) {
  if (!p) return '?'
  return p.surname ? `${p.surname}${p.name}` : p.name
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  // Hero parallax용 scrollY 공유값 + 핸들러
  const { scrollY, onScroll } = useHeroParallax()
  // 즐겨찾기
  const { has: isBookmarked, toggle: toggleBookmark } = useBookmarks('persons')

  const preview = useMemo<PersonListItem | null>(() => (id ? getPersonPreview(id) : null), [id])

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set(['overview']))
  const [refreshing, setRefreshing] = useState(false)

  // detail/stats/traits — overview에 필요해 즉시 fetch. queryKey는 person/edit과 공유.
  const detailQuery = useQuery({
    queryKey: ['persons', 'detail', id],
    queryFn: async () => {
      const res = await api.get<PersonDetail>(`/persons/${id}/detail`)
      return res.data
    },
    enabled: !!id,
  })
  const statsQuery = useQuery({
    queryKey: ['persons', 'stats', id],
    queryFn: async () => {
      const res = await api.get<PersonStats | null>(`/persons/${id}/my-stats`)
      return res.data ?? null
    },
    enabled: !!id,
  })
  const traitsQuery = useQuery({
    queryKey: ['persons', 'traits', id],
    queryFn: async () => {
      const res = await api.get<PersonTraitAssignment[]>(`/persons/${id}/my-traits`)
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: !!id,
  })
  // family/timeline/relations — 해당 탭이 한 번이라도 방문되면 fetch (lazy)
  const familyQuery = useQuery({
    queryKey: ['persons', 'family', id],
    queryFn: async () => {
      const res = await api.get<FamilyTreeData>(`/persons/${id}/family-tree`)
      return res.data
    },
    enabled: !!id && visited.has('family'),
  })
  const timelineQuery = useQuery({
    queryKey: ['persons', 'timeline', id],
    queryFn: async () => {
      const res = await api.get<ExtraTimelineItem[]>(`/person-life-events/timeline/by-person/${id}`)
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: !!id && visited.has('timeline'),
  })
  const relationsQuery = useQuery({
    queryKey: ['persons', 'relations', id],
    queryFn: async () => {
      const res = await api.get<HumanRelationship[]>(`/persons/${id}/human-relationships`)
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: !!id && visited.has('relations'),
  })

  // 탭 첫 진입 시 visited 등록 — useQuery enabled가 자동으로 fetch 트리거
  useEffect(() => {
    if (!visited.has(activeTab)) {
      setVisited((prev) => {
        const next = new Set(prev)
        next.add(activeTab)
        return next
      })
    }
  }, [activeTab, visited])

  const onRefresh = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRefreshing(true)
    const tasks: Promise<unknown>[] = [
      detailQuery.refetch(),
      statsQuery.refetch(),
      traitsQuery.refetch(),
    ]
    if (visited.has('family')) tasks.push(familyQuery.refetch())
    if (visited.has('timeline')) tasks.push(timelineQuery.refetch())
    if (visited.has('relations')) tasks.push(relationsQuery.refetch())
    await Promise.allSettled(tasks)
    setRefreshing(false)
  }, [detailQuery, statsQuery, traitsQuery, familyQuery, timelineQuery, relationsQuery, visited])

  const detailError = detailQuery.error ? errorMessage(detailQuery.error) : null
  const headerSource: PersonDetail | PersonListItem | null = detailQuery.data ?? preview
  const title = headerSource ? displayName(headerSource) : '...'
  const subTitle = headerSource ? lifespan(headerSource) : ''
  const profileImg = headerSource ? imageUrl(headerSource.profileImageUrl) : null

  const onShare = useCallback(() => {
    if (!headerSource) return
    const ls = lifespan(headerSource)
    const country = headerSource.country?.name
    void Share.share({
      message: [title, ls, country].filter(Boolean).join(' · '),
    })
  }, [headerSource, title])

  const detailData = detailQuery.data ?? null
  const timelineEntries = useMemo(
    () => (detailData ? buildPersonTimeline(detailData, timelineQuery.data ?? []) : []),
    [detailData, timelineQuery.data],
  )

  const { familyCount, politicsCount } = useMemo(() => {
    if (!detailData) return { familyCount: 0, politicsCount: 0 }
    return {
      familyCount:
        (detailData.father ? 1 : 0) +
        (detailData.mother ? 1 : 0) +
        (detailData.spouse ? 1 : 0) +
        (detailData.children?.length ?? 0) +
        (detailData.siblings?.length ?? 0),
      politicsCount:
        (detailData.sovereignReigns?.length ?? 0) +
        (detailData.governmentPositions?.length ?? 0),
    }
  }, [detailData])

  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'overview', label: '개요' },
      { key: 'family', label: '가족', badge: familyCount },
      { key: 'politics', label: '정치', badge: politicsCount },
      { key: 'timeline', label: '연보', badge: timelineEntries.length },
      { key: 'relations', label: '관계', badge: relationsQuery.data?.length ?? 0 },
    ],
    [familyCount, politicsCount, timelineEntries.length, relationsQuery.data?.length],
  )

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            headerSource ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {id && (
                  <BookmarkHeart
                    active={isBookmarked(id)}
                    onToggle={() => toggleBookmark(id)}
                    variant="flat"
                    size={22}
                    accessibilityLabel={`${title} 즐겨찾기`}
                  />
                )}
                <Pressable
                  onPress={() => goPersonEdit(router, id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="인물 수정"
                  style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
                >
                  <Ionicons name="create-outline" size={20} color={Tokens.text.primary} />
                </Pressable>
                <Pressable
                  onPress={onShare}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="공유"
                  style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
                >
                  <Ionicons name="share-outline" size={20} color={Tokens.text.primary} />
                </Pressable>
              </View>
            ) : null,
        }}
      />
      <RAnimated.ScrollView
        style={{ flex: 1, backgroundColor: Tokens.surface.canvas }}
        stickyHeaderIndices={[1]}
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
      >
        <PersonHero
          title={title}
          subTitle={subTitle}
          profileImg={profileImg}
          headerSource={headerSource}
          detail={detailQuery.data ?? null}
          scrollY={scrollY}
        />
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.tabBlur}>
          <TabBar
            tabs={tabs}
            active={activeTab}
            onChange={(k) => setActiveTab(k as TabKey)}
            transparent
          />
        </BlurView>
        <View style={styles.tabContent}>
          {detailQuery.isLoading && !preview && <PaneLoading />}
          {detailError && (
            <PaneErrorBlock message={detailError} onRetry={() => void detailQuery.refetch()} />
          )}

          {/* 모든 탭은 keep-mounted: 첫 방문 후 데이터/스크롤 보존 */}
          <PaneVisible visible={activeTab === 'overview'}>
            {detailQuery.data && (
              <OverviewTab
                data={detailQuery.data}
                stats={statsQuery.data ?? null}
                traits={traitsQuery.data ?? []}
              />
            )}
          </PaneVisible>

          <PaneVisible visible={activeTab === 'family'}>
            {visited.has('family') && (
              <FamilyTab
                data={detailQuery.data ?? null}
                familyTree={familyQuery.data ?? null}
                loading={familyQuery.isLoading}
                error={familyQuery.error ? errorMessage(familyQuery.error) : null}
                onRetry={() => void familyQuery.refetch()}
              />
            )}
          </PaneVisible>

          <PaneVisible visible={activeTab === 'politics'}>
            {detailQuery.data && <PoliticsTab data={detailQuery.data} />}
          </PaneVisible>

          <PaneVisible visible={activeTab === 'timeline'}>
            {visited.has('timeline') && (
              <TimelineTabPane
                detailReady={!!detailQuery.data}
                loading={timelineQuery.isLoading}
                error={timelineQuery.error ? errorMessage(timelineQuery.error) : null}
                entries={timelineEntries}
                onRetry={() => void timelineQuery.refetch()}
                onPress={(it) =>
                  it.link && goByKind(router, it.link.kind, it.link.id)
                }
              />
            )}
          </PaneVisible>

          <PaneVisible visible={activeTab === 'relations'}>
            {visited.has('relations') && (
              <RelationsTabPane
                items={relationsQuery.data ?? null}
                loading={relationsQuery.isLoading}
                error={relationsQuery.error ? errorMessage(relationsQuery.error) : null}
                onRetry={() => void relationsQuery.refetch()}
                subjectId={id ?? ''}
              />
            )}
          </PaneVisible>
        </View>
      </RAnimated.ScrollView>
    </>
  )
}

function PaneVisible({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  // 활성 탭만 fade 들어오게. 비활성은 display:none으로 마운트 유지하되 측정/터치 비활성.
  // (스크롤 위치·내부 상태 보존을 위해 unmount 안 함)
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start()
  }, [opacity, visible])
  return (
    <Animated.View
      style={{ opacity, display: visible ? 'flex' : 'none' }}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  )
}

function OverviewTab({
  data,
  stats,
  traits,
}: {
  data: PersonDetail
  stats: PersonStats | null
  traits: PersonTraitAssignment[]
}) {
  const birthPlace = placeText({
    city: data.birthCity,
    adminDivision: data.birthAdminDivision,
    placeText: data.birthPlaceText,
  })

  return (
    <>
      {data.biography && (
        <DetailSection title="생애">
          <ExpandableText collapsedLines={6}>
            <RichText html={data.biography} />
          </ExpandableText>
        </DetailSection>
      )}

      <PersonStatsCard stats={stats} traits={traits} influence={data.influence} />

      <DeathInfoCard data={data} />

      <DetailSection title="이름">
        <DetailRow label="성" value={data.surname} />
        <DetailRow label="이름" value={data.name} />
        <DetailRow label="중간 이름" value={data.middleName} />
        <DetailRow label="원어 이름" value={data.originalName} />
      </DetailSection>

      {(data.surnameMeaning || data.nameMeaning || data.middleNameMeaning) && (
        <DetailSection title="이름 의미">
          <DetailRow label="성 의미" value={data.surnameMeaning} />
          <DetailRow label="이름 의미" value={data.nameMeaning} />
          <DetailRow label="중간 이름" value={data.middleNameMeaning} />
        </DetailSection>
      )}

      {data.nicknames?.length ? (
        <DetailSection title="별칭">
          {data.nicknames.map((n) => (
            <Text key={n.id} style={styles.body}>
              · {n.nickname}
              {n.type ? ` (${n.type})` : ''}
            </Text>
          ))}
        </DetailSection>
      ) : null}

      <DetailSection title="출생">
        <DetailRow label="일자" value={formatYMD(data.birthEra, data.birthYear, data.birthMonth, data.birthDay)} />
        <DetailRow label="장소" value={birthPlace} />
      </DetailSection>

      {(data.dynasty || data.religion || data.denomination) && (
        <DetailSection title="소속">
          <DetailRow label="가문/왕조" value={data.dynasty?.name} />
          <DetailRow label="종교" value={data.religion?.name} />
          <DetailRow label="종파" value={data.denomination?.name} />
        </DetailSection>
      )}

      <AdjacentPersons dynastyId={data.dynasty?.id ?? null} currentPersonId={data.id} />
    </>
  )
}

function FamilyTab({
  data,
  familyTree,
  loading,
  error,
  onRetry,
}: {
  data: PersonDetail | null
  familyTree: FamilyTreeData | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (loading) return <PaneLoading />
  if (error) return <PaneErrorBlock message={error} onRetry={onRetry} />

  const tree = familyTree
  const has =
    tree ||
    data?.father ||
    data?.mother ||
    data?.spouse ||
    data?.children?.length ||
    data?.siblings?.length

  return (
    <>
      {!has && <EmptyMessage text="등록된 가족이 없습니다" />}
      {tree ? (
        <View style={styles.genealogyWrap}>
          <GenealogySvg data={tree} />
        </View>
      ) : has && data ? (
        <DetailSection title="가족">
          {data.father && (
            <RelatedLink kind="person" id={data.father.id} label={personLabel(data.father)} sublabel="아버지" />
          )}
          {data.mother && (
            <RelatedLink kind="person" id={data.mother.id} label={personLabel(data.mother)} sublabel="어머니" />
          )}
          {data.spouse && (
            <RelatedLink kind="person" id={data.spouse.id} label={personLabel(data.spouse)} sublabel="배우자" />
          )}
          {data.children?.map((c) => (
            <RelatedLink key={c.id} kind="person" id={c.id} label={personLabel(c)} sublabel="자녀" />
          ))}
          {data.siblings?.map((s) => (
            <RelatedLink key={s.id} kind="person" id={s.id} label={personLabel(s)} sublabel="형제자매" />
          ))}
        </DetailSection>
      ) : null}

      {data?.dynasty?.id && (
        <SameDynastySection
          dynastyId={data.dynasty.id}
          dynastyName={data.dynasty.name}
          currentPersonId={data.id}
        />
      )}
    </>
  )
}

function PoliticsTab({ data }: { data: PersonDetail }) {
  const reigns = data.sovereignReigns ?? []
  const positions = data.governmentPositions ?? []
  if (!reigns.length && !positions.length) return <EmptyMessage text="정부 직책·재위 기록 없음" />
  return <UnifiedTenureCardList data={data} />
}

function TimelineTabPane({
  detailReady,
  loading,
  error,
  entries,
  onRetry,
  onPress,
}: {
  detailReady: boolean
  loading: boolean
  error: string | null
  entries: TimelineEntry[]
  onRetry: () => void
  onPress: (entry: TimelineEntry) => void
}) {
  const [active, setActive] = useState<Set<TimelineGroup>>(() => new Set())

  const available = useMemo(() => {
    const set = new Set<TimelineGroup>()
    for (const e of entries) set.add(kindToGroup(e.kind))
    return set
  }, [entries])

  const filtered = useMemo(() => {
    if (active.size === 0) return entries
    return entries.filter((e) => active.has(kindToGroup(e.kind)))
  }, [entries, active])

  const onToggle = (g: TimelineGroup) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }
  const onReset = () => setActive(new Set())

  if (loading || !detailReady) return <PaneLoading />
  if (error) return <PaneErrorBlock message={error} onRetry={onRetry} />
  if (!entries.length) return <EmptyMessage text="연보 기록 없음" />

  return (
    <View>
      <TimelineFilter available={available} active={active} onToggle={onToggle} onReset={onReset} />
      {filtered.length === 0 ? (
        <EmptyMessage text="필터 조건에 맞는 항목이 없습니다" />
      ) : (
        <TimelineList entries={filtered} onPress={onPress} />
      )}
    </View>
  )
}

function RelationsTabPane({
  items,
  loading,
  error,
  onRetry,
  subjectId,
}: {
  items: HumanRelationship[] | null
  loading: boolean
  error: string | null
  onRetry: () => void
  subjectId: string
}) {
  if (loading) return <PaneLoading />
  if (error) return <PaneErrorBlock message={error} onRetry={onRetry} />
  const list = items ?? []
  if (!list.length) return <EmptyMessage text="등록된 인간관계 없음" />

  return (
    <DetailSection title="인간관계">
      {list.map((r) => {
        const otherId = r.otherPerson?.id ?? (r.fromPersonId === subjectId ? r.toPersonId : r.fromPersonId)
        const label = r.otherPerson ? personLabel(r.otherPerson) : null
        // 멘토 관계는 본인이 스승인지 제자인지에 따라 라벨 변경
        const baseLabel = relationshipLabel(r.relationshipType)
        const typeLabel =
          r.mentorPerspective === 'MENTOR'
            ? '제자'
            : r.mentorPerspective === 'STUDENT'
              ? '스승'
              : baseLabel
        const period =
          r.startDate || r.endDate
            ? `${formatDateString(r.startDate) ?? '?'} ~ ${formatDateString(r.endDate) ?? '현재'}`
            : null
        return (
          <View key={r.id} style={{ marginBottom: 10 }}>
            {label && otherId ? (
              <RelatedLink kind="person" id={otherId} label={label} sublabel={typeLabel} />
            ) : (
              <Text style={styles.body}>· ({typeLabel})</Text>
            )}
            {period && <Text style={styles.timelineMeta}>{period}</Text>}
            {r.note && (
              <View style={{ marginTop: 4, marginLeft: 8 }}>
                <RichText html={r.note} />
              </View>
            )}
            {r.phases?.map((p) => {
              const range = `${formatDateString(p.startDate) ?? '?'} ~ ${formatDateString(p.endDate) ?? '?'}`
              return (
                <Text key={p.id} style={styles.timelineMeta}>
                  · {range}{p.label ? `: ${p.label}` : ''}{p.note ? ` (${p.note})` : ''}
                </Text>
              )
            })}
          </View>
        )
      })}
    </DetailSection>
  )
}

const styles = StyleSheet.create({
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Tokens.surface.pressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnPressed: { opacity: 0.7 },
  tabContent: { padding: Spacing.md },
  tabBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.subtle,
  },
  body: { ...Type.bodySm, color: Tokens.text.primary },
  timelineMeta: { ...Type.captionSm, color: Tokens.text.muted, marginTop: 2 },
  genealogyWrap: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
})
