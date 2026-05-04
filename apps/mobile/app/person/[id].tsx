import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@/lib/api'
import { DetailRow, DetailSection } from '@/components/detail-section'
import { RelatedLink } from '@/components/related-link'
import { RichText } from '@/components/rich-text'
import { TabBar, type TabItem } from '@/components/tab-bar'
import { PersonStatsCard } from '@/components/person-stats-card'
import type { FamilyTreeData } from '@/components/family-tree-view'
import { GenealogySvg } from '@/components/genealogy-svg'
import { KpiStrip, type KpiEntry } from '@/components/kpi-strip'
import { FamilyBadges } from '@/components/family-badges'
import { RegnalTitleRow } from '@/components/regnal-title-row'
import { DeathInfoCard } from '@/components/death-info-card'
import { UnifiedTenureCardList } from '@/components/unified-tenure-card'
import { SameDynastySection } from '@/components/same-dynasty-section'
import { AdjacentPersons } from '@/components/adjacent-persons'
import {
  TimelineFilter,
  TIMELINE_GROUP_KINDS,
  kindToGroup,
  type TimelineGroup,
} from '@/components/timeline-filter'
import { displayName, formatDateString, formatYMD, lifespan, placeText } from '@/lib/format'
import { lifespanYears, totalReignAndTenureYears } from '@/lib/age-utils'
import { imageUrl } from '@/lib/image-url'
import { buildPersonTimeline, type ExtraTimelineItem, type TimelineEntry } from '@/lib/timeline-builder'
import type { PersonStats, PersonTraitAssignment } from '@/lib/person-stats'
import { getPersonPreview } from '@/lib/preview-cache'
import { relationshipLabel } from '@/lib/relationship-label'
import { Tokens } from '@/constants/theme'
import type { PersonDetail, PersonListItem } from '@/lib/dto'

type TabKey = 'overview' | 'family' | 'politics' | 'timeline' | 'relations'

type HumanRelationship = {
  id: string
  relationshipType: string
  counterpartPerson?: { id: string; name: string; surname?: string | null } | null
  counterpartPersonId?: string | null
  description?: string | null
  phases?: Array<{
    id: string
    status?: string | null
    startDate?: string | null
    endDate?: string | null
    note?: string | null
  }>
}

type Resource<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

function emptyResource<T>(): Resource<T> {
  return { data: null, loading: false, error: null }
}

function personLabel(p?: { name: string; surname?: string | null } | null) {
  if (!p) return '?'
  return p.surname ? `${p.surname}${p.name}` : p.name
}

function errorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message ?? e?.message ?? 'failed to load'
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const preview = useMemo<PersonListItem | null>(() => (id ? getPersonPreview(id) : null), [id])

  const [detail, setDetail] = useState<Resource<PersonDetail>>(emptyResource)
  const [stats, setStats] = useState<Resource<PersonStats>>(emptyResource)
  const [traits, setTraits] = useState<Resource<PersonTraitAssignment[]>>(emptyResource)
  const [familyTree, setFamilyTree] = useState<Resource<FamilyTreeData>>(emptyResource)
  const [timeline, setTimeline] = useState<Resource<ExtraTimelineItem[]>>(emptyResource)
  const [relations, setRelations] = useState<Resource<HumanRelationship[]>>(emptyResource)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set(['overview']))
  const [refreshing, setRefreshing] = useState(false)

  // detail + stats/traits 즉시 fetch (overview에 필요)
  const loadCore = useCallback(async () => {
    if (!id) return
    setDetail({ data: null, loading: true, error: null })
    setStats({ data: null, loading: true, error: null })
    setTraits({ data: null, loading: true, error: null })
    const [d, s, t] = await Promise.allSettled([
      api.get<PersonDetail>(`/persons/${id}/detail`),
      api.get<PersonStats | null>(`/persons/${id}/my-stats`),
      api.get<PersonTraitAssignment[]>(`/persons/${id}/my-traits`),
    ])
    setDetail(
      d.status === 'fulfilled'
        ? { data: d.value.data, loading: false, error: null }
        : { data: null, loading: false, error: errorMessage(d.reason) },
    )
    setStats(
      s.status === 'fulfilled'
        ? { data: s.value.data ?? null, loading: false, error: null }
        : { data: null, loading: false, error: errorMessage(s.reason) },
    )
    setTraits(
      t.status === 'fulfilled'
        ? { data: Array.isArray(t.value.data) ? t.value.data : [], loading: false, error: null }
        : { data: null, loading: false, error: errorMessage(t.reason) },
    )
  }, [id])

  const loadFamilyTree = useCallback(async () => {
    if (!id) return
    setFamilyTree({ data: null, loading: true, error: null })
    try {
      const res = await api.get<FamilyTreeData>(`/persons/${id}/family-tree`)
      setFamilyTree({ data: res.data, loading: false, error: null })
    } catch (err) {
      setFamilyTree({ data: null, loading: false, error: errorMessage(err) })
    }
  }, [id])

  const loadTimeline = useCallback(async () => {
    if (!id) return
    setTimeline({ data: null, loading: true, error: null })
    try {
      const res = await api.get<ExtraTimelineItem[]>(`/person-life-events/timeline/by-person/${id}`)
      setTimeline({
        data: Array.isArray(res.data) ? res.data : [],
        loading: false,
        error: null,
      })
    } catch (err) {
      setTimeline({ data: null, loading: false, error: errorMessage(err) })
    }
  }, [id])

  const loadRelations = useCallback(async () => {
    if (!id) return
    setRelations({ data: null, loading: true, error: null })
    try {
      const res = await api.get<HumanRelationship[]>(`/persons/${id}/human-relationships`)
      setRelations({
        data: Array.isArray(res.data) ? res.data : [],
        loading: false,
        error: null,
      })
    } catch (err) {
      setRelations({ data: null, loading: false, error: errorMessage(err) })
    }
  }, [id])

  useEffect(() => {
    void loadCore()
  }, [loadCore])

  // 탭 첫 진입 시 lazy fetch
  useEffect(() => {
    if (!visited.has(activeTab)) {
      setVisited((prev) => {
        const next = new Set(prev)
        next.add(activeTab)
        return next
      })
    }
    if (activeTab === 'family' && !familyTree.data && !familyTree.loading && !familyTree.error) {
      void loadFamilyTree()
    }
    if (activeTab === 'timeline' && !timeline.data && !timeline.loading && !timeline.error) {
      void loadTimeline()
    }
    if (activeTab === 'relations' && !relations.data && !relations.loading && !relations.error) {
      void loadRelations()
    }
  }, [
    activeTab,
    visited,
    familyTree,
    timeline,
    relations,
    loadFamilyTree,
    loadTimeline,
    loadRelations,
  ])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    const tasks: Promise<unknown>[] = [loadCore()]
    if (visited.has('family')) tasks.push(loadFamilyTree())
    if (visited.has('timeline')) tasks.push(loadTimeline())
    if (visited.has('relations')) tasks.push(loadRelations())
    await Promise.allSettled(tasks)
    setRefreshing(false)
  }, [loadCore, loadFamilyTree, loadTimeline, loadRelations, visited])

  const headerSource: PersonDetail | PersonListItem | null = detail.data ?? preview
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

  const timelineEntries = useMemo(
    () => (detail.data ? buildPersonTimeline(detail.data, timeline.data ?? []) : []),
    [detail.data, timeline.data],
  )

  const familyCount = detail.data
    ? (detail.data.father ? 1 : 0) +
      (detail.data.mother ? 1 : 0) +
      (detail.data.spouse ? 1 : 0) +
      (detail.data.children?.length ?? 0) +
      (detail.data.siblings?.length ?? 0)
    : 0
  const politicsCount = detail.data
    ? (detail.data.sovereignReigns?.length ?? 0) + (detail.data.governmentPositions?.length ?? 0)
    : 0

  const tabs: TabItem[] = [
    { key: 'overview', label: '개요' },
    { key: 'family', label: '가족', badge: familyCount },
    { key: 'politics', label: '정치', badge: politicsCount },
    { key: 'timeline', label: '연보', badge: timelineEntries.length },
    { key: 'relations', label: '관계', badge: relations.data?.length ?? 0 },
  ]

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            headerSource ? (
              <Pressable onPress={onShare} hitSlop={8} style={{ paddingHorizontal: 4 }}>
                <Ionicons name="share-outline" size={22} color={Tokens.text.primary} />
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: Tokens.surface.canvas }}
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <PersonHero
          title={title}
          subTitle={subTitle}
          profileImg={profileImg}
          headerSource={headerSource}
          detail={detail.data}
        />
        <TabBar tabs={tabs} active={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />
        <View style={styles.tabContent}>
          {detail.loading && !preview && (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
            </View>
          )}
          {detail.error && (
            <ErrorBlock message={detail.error} onRetry={loadCore} />
          )}

          {/* 모든 탭은 keep-mounted: 첫 방문 후 데이터/스크롤 보존 */}
          <PaneVisible visible={activeTab === 'overview'}>
            {detail.data && (
              <OverviewTab data={detail.data} stats={stats.data} traits={traits.data ?? []} />
            )}
          </PaneVisible>

          <PaneVisible visible={activeTab === 'family'}>
            {visited.has('family') && (
              <FamilyTab
                data={detail.data}
                resource={familyTree}
                onRetry={loadFamilyTree}
              />
            )}
          </PaneVisible>

          <PaneVisible visible={activeTab === 'politics'}>
            {detail.data && <PoliticsTab data={detail.data} />}
          </PaneVisible>

          <PaneVisible visible={activeTab === 'timeline'}>
            {visited.has('timeline') && (
              <TimelineTabPane
                detailReady={!!detail.data}
                resource={timeline}
                entries={timelineEntries}
                onRetry={loadTimeline}
                onPress={(it) =>
                  it.link && router.push(`/${it.link.kind}/${it.link.id}` as any)
                }
              />
            )}
          </PaneVisible>

          <PaneVisible visible={activeTab === 'relations'}>
            {visited.has('relations') && (
              <RelationsTabPane resource={relations} onRetry={loadRelations} />
            )}
          </PaneVisible>
        </View>
      </ScrollView>
    </>
  )
}

function PaneVisible({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return <View style={{ display: visible ? 'flex' : 'none' }}>{children}</View>
}

function PersonHero({
  title,
  subTitle,
  profileImg,
  headerSource,
  detail,
}: {
  title: string
  subTitle: string
  profileImg: string | null
  headerSource: PersonDetail | PersonListItem | null
  detail: PersonDetail | null
}) {
  const kpiItems = useMemo<KpiEntry[]>(() => {
    if (!detail) return []
    const list: KpiEntry[] = []
    if (detail.country?.name) list.push({ key: 'country', label: '국가', value: detail.country.name })
    if (detail.gender) list.push({ key: 'gender', label: '성별', value: genderLabel(detail.gender) })
    const span = lifespanYears(detail)
    if (span != null && span > 0) {
      list.push({
        key: 'lifespan',
        label: '생존',
        value: detail.isAlive ? `${span}년 (생존)` : `${span}년`,
      })
    }
    const totalReign = totalReignAndTenureYears(detail)
    if (totalReign != null) {
      list.push({ key: 'reign', label: '재임·재위', value: `약 ${totalReign}년` })
    }
    if (detail.dynasty?.name) list.push({ key: 'dynasty', label: '가문', value: detail.dynasty.name })
    if (detail.religion?.name) list.push({ key: 'religion', label: '종교', value: detail.religion.name })
    return list
  }, [detail])

  return (
    <View>
      <View style={styles.header}>
        {profileImg ? (
          <Image
            source={{ uri: profileImg }}
            style={styles.avatar}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{title.slice(0, 1)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.heading} numberOfLines={2}>
              {title}
            </Text>
            {!!headerSource?.country?.flagEmoji && (
              <Text style={styles.flag}>{headerSource.country.flagEmoji}</Text>
            )}
          </View>
          {!!subTitle && <Text style={styles.subheading}>{subTitle}</Text>}
          {!!headerSource?.country?.name && (
            <Text style={styles.subheading}>{headerSource.country.name}</Text>
          )}
          {detail && <FamilyBadges data={detail} />}
        </View>
      </View>
      {detail && (
        <View style={{ paddingHorizontal: 12, paddingTop: 8, backgroundColor: Tokens.surface.raised }}>
          <RegnalTitleRow
            regnalName={detail.regnalName}
            regnalNumber={
              ((detail.sovereignReigns ?? [])[0]?.regnalNumber ?? null) as number | null
            }
            templeName={detail.templeName}
            posthumousName={detail.posthumousName}
          />
        </View>
      )}
      {kpiItems.length > 0 && <KpiStrip items={kpiItems} />}
    </View>
  )
}

function genderLabel(g?: string | null): string {
  if (!g) return '-'
  const k = g.toUpperCase()
  if (k === 'MALE' || k === 'M') return '남'
  if (k === 'FEMALE' || k === 'F') return '여'
  return g
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBlock}>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}
      >
        <Text style={styles.retryText}>다시 시도</Text>
      </Pressable>
    </View>
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
          <RichText html={data.biography} />
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
  resource,
  onRetry,
}: {
  data: PersonDetail | null
  resource: Resource<FamilyTreeData>
  onRetry: () => void
}) {
  if (resource.loading) return <PaneLoading />
  if (resource.error) return <ErrorBlock message={resource.error} onRetry={onRetry} />

  const tree = resource.data
  const has =
    tree ||
    data?.father ||
    data?.mother ||
    data?.spouse ||
    data?.children?.length ||
    data?.siblings?.length

  return (
    <>
      {!has && <EmptyState text="등록된 가족이 없습니다" />}
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
  if (!reigns.length && !positions.length) return <EmptyState text="정부 직책·재위 기록 없음" />
  return <UnifiedTenureCardList data={data} />
}

function TimelineTabPane({
  detailReady,
  resource,
  entries,
  onRetry,
  onPress,
}: {
  detailReady: boolean
  resource: Resource<ExtraTimelineItem[]>
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

  if (resource.loading || !detailReady) return <PaneLoading />
  if (resource.error) return <ErrorBlock message={resource.error} onRetry={onRetry} />
  if (!entries.length) return <EmptyState text="연보 기록 없음" />

  return (
    <View>
      <TimelineFilter available={available} active={active} onToggle={onToggle} onReset={onReset} />
      {filtered.length === 0 ? (
        <EmptyState text="필터 조건에 맞는 항목이 없습니다" />
      ) : (
        filtered.map((it) => {
          const dateText =
            it.endLabel && it.endLabel !== it.dateLabel ? `${it.dateLabel} ~ ${it.endLabel}` : it.dateLabel
          const Wrapper: any = it.link ? Pressable : View
          return (
            <Wrapper
              key={it.key}
              style={({ pressed }: { pressed?: boolean }) => [
                styles.timelineItem,
                pressed && styles.timelinePressed,
              ]}
              onPress={it.link ? () => onPress(it) : undefined}
            >
              <View style={styles.timelineDotCol}>
                <View style={[styles.timelineDot, { backgroundColor: it.color }]} />
                <View style={styles.timelineLine} />
              </View>
              <View style={{ flex: 1, paddingBottom: 12 }}>
                <Text style={[styles.timelineDate, { color: it.color }]}>{dateText}</Text>
                <Text style={styles.timelineTitle}>{it.title}</Text>
                {it.subtitle && <Text style={styles.timelineMeta}>{it.subtitle}</Text>}
                {it.body && (
                  <View style={{ marginTop: 4 }}>
                    <RichText html={it.body} />
                  </View>
                )}
              </View>
            </Wrapper>
          )
        })
      )}
    </View>
  )
}

function RelationsTabPane({
  resource,
  onRetry,
}: {
  resource: Resource<HumanRelationship[]>
  onRetry: () => void
}) {
  if (resource.loading) return <PaneLoading />
  if (resource.error) return <ErrorBlock message={resource.error} onRetry={onRetry} />
  const items = resource.data ?? []
  if (!items.length) return <EmptyState text="등록된 인간관계 없음" />

  return (
    <DetailSection title="인간관계">
      {items.map((r) => {
        const counterId = r.counterpartPerson?.id ?? r.counterpartPersonId
        const label = r.counterpartPerson ? personLabel(r.counterpartPerson) : `인물 #${counterId ?? '?'}`
        const typeLabel = relationshipLabel(r.relationshipType)
        return (
          <View key={r.id} style={{ marginBottom: 8 }}>
            {counterId ? (
              <RelatedLink kind="person" id={counterId} label={label} sublabel={typeLabel} />
            ) : (
              <Text style={styles.body}>· {label} ({typeLabel})</Text>
            )}
            {r.description && (
              <View style={{ marginTop: 4, marginLeft: 8 }}>
                <RichText html={r.description} />
              </View>
            )}
            {r.phases?.map((p) => (
              <Text key={p.id} style={styles.timelineMeta}>
                · {formatDateString(p.startDate) ?? '?'} ~ {formatDateString(p.endDate) ?? '?'}
                {p.status || p.note ? `: ${p.status ?? p.note}` : ''}
              </Text>
            ))}
          </View>
        )
      })}
    </DetailSection>
  )
}

function PaneLoading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  errorBlock: {
    padding: 16,
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  errorText: { color: Tokens.text.danger, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Tokens.surface.canvas,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  retryPressed: { backgroundColor: Tokens.surface.pressed },
  retryText: { fontSize: 14, color: Tokens.text.primary, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    backgroundColor: Tokens.surface.raised,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.subtle,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Tokens.border.subtle },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: Tokens.text.muted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heading: { fontSize: 22, fontWeight: '700', color: Tokens.text.primary, flexShrink: 1 },
  flag: { fontSize: 18 },
  subheading: { fontSize: 13, color: Tokens.text.muted, marginTop: 4 },
  tabContent: { padding: 12 },
  body: { fontSize: 14, color: Tokens.text.primary, lineHeight: 22 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: Tokens.text.soft, fontSize: 14 },
  tenureItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Tokens.border.subtle,
  },
  tenureTitle: { fontSize: 14, fontWeight: '600', color: Tokens.text.primary },
  tenureMeta: { fontSize: 12, color: Tokens.text.muted, marginTop: 2 },
  timelineItem: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  timelinePressed: { opacity: 0.6 },
  timelineDotCol: { alignItems: 'center', width: 16 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 2,
    borderColor: Tokens.surface.raised,
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: Tokens.border.subtle, marginTop: 2 },
  timelineDate: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  timelineTitle: { fontSize: 15, fontWeight: '600', color: Tokens.text.primary },
  timelineMeta: { fontSize: 12, color: Tokens.text.muted, marginTop: 2 },
  genealogyWrap: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    paddingVertical: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
})
