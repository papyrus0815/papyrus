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
import { FamilyTreeView, type FamilyTreeData } from '@/components/family-tree-view'
import { displayName, formatDateString, formatYMD, lifespan, placeText } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { buildPersonTimeline, type ExtraTimelineItem, type TimelineEntry } from '@/lib/timeline-builder'
import type { PersonStats, PersonTraitAssignment } from '@/lib/person-stats'
import { getPersonPreview } from '@/lib/preview-cache'
import { relationshipLabel } from '@/lib/relationship-label'
import { Tokens } from '@/constants/theme'
import type {
  GovernmentPosition,
  PersonDetail,
  PersonListItem,
  SovereignReign,
} from '@/lib/dto'

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
        <Header title={title} subTitle={subTitle} profileImg={profileImg} headerSource={headerSource} />
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

function Header({
  title,
  subTitle,
  profileImg,
  headerSource,
}: {
  title: string
  subTitle: string
  profileImg: string | null
  headerSource: PersonDetail | PersonListItem | null
}) {
  return (
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
      </View>
    </View>
  )
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
  const deathPlace = placeText({
    city: data.deathCity,
    adminDivision: data.deathAdminDivision,
    placeText: data.deathPlaceText,
  })

  return (
    <>
      <PersonStatsCard stats={stats} traits={traits} influence={data.influence} />

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

      {(data.regnalName || data.templeName || data.posthumousName) && (
        <DetailSection title="군주 호칭">
          <DetailRow label="왕호" value={data.regnalName} />
          <DetailRow label="묘호" value={data.templeName} />
          <DetailRow label="시호" value={data.posthumousName} />
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

      <DetailSection title="사망">
        <DetailRow label="생존" value={data.isAlive ? '생존 중' : null} />
        <DetailRow
          label="일자"
          value={
            data.isAlive
              ? null
              : data.isDeathDateUnknown
                ? '미상'
                : formatYMD(data.deathEra, data.deathYear, data.deathMonth, data.deathDay)
          }
        />
        <DetailRow label="장소" value={deathPlace} />
        <DetailRow label="유형" value={data.deathType} />
        <DetailRow label="원인" value={data.deathCause} />
        <DetailRow label="비고" value={data.deathNote} />
      </DetailSection>

      <DetailSection title="속성">
        <DetailRow label="성별" value={data.gender} />
      </DetailSection>

      {(data.dynasty || data.religion || data.denomination) && (
        <DetailSection title="소속">
          <DetailRow label="가문/왕조" value={data.dynasty?.name} />
          <DetailRow label="종교" value={data.religion?.name} />
          <DetailRow label="종파" value={data.denomination?.name} />
        </DetailSection>
      )}

      {data.biography && (
        <DetailSection title="생애">
          <RichText html={data.biography} />
        </DetailSection>
      )}
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

  if (!has) return <EmptyState text="등록된 가족이 없습니다" />

  if (tree) return <FamilyTreeView data={tree} />

  if (!data) return null
  return (
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
  )
}

function periodText(start?: string | null, startPrec?: string | null, end?: string | null, endPrec?: string | null, fallbackEnd?: string) {
  const startLabel = formatDateString(start, startPrec) ?? '?'
  const endLabel = end ? formatDateString(end, endPrec) ?? '?' : (fallbackEnd ?? '?')
  return `${startLabel} ~ ${endLabel}`
}

function PoliticsTab({ data }: { data: PersonDetail }) {
  const reigns = data.sovereignReigns ?? []
  const positions = data.governmentPositions ?? []
  if (!reigns.length && !positions.length) return <EmptyState text="정부 직책·재위 기록 없음" />
  return (
    <>
      {reigns.length > 0 && (
        <DetailSection title="군주 재위">
          {reigns.map((r: SovereignReign, i: number) => {
            const country = r.country?.name ?? r.historicalCountry?.name
            const period = periodText(r.startDate, null, r.endDate, null, '재위 중')
            return (
              <View key={r.id ?? i} style={styles.tenureItem}>
                <Text style={styles.tenureTitle}>
                  {r.regnalName ?? country ?? '재위'}
                  {r.regnalNumber != null ? ` (${r.regnalNumber}대)` : ''}
                </Text>
                {country && <Text style={styles.tenureMeta}>{country}</Text>}
                <Text style={styles.tenureMeta}>{period}</Text>
                {r.notes && <RichText html={r.notes} />}
              </View>
            )
          })}
        </DetailSection>
      )}

      {positions.length > 0 && (
        <DetailSection title="정부 직책">
          {positions.map((g: GovernmentPosition, i: number) => {
            const country = g.country?.name ?? g.historicalCountry?.name
            const position =
              g.positionDefinition?.name ??
              g.positionDefinition?.title ??
              g.positionName ??
              g.title ??
              g.position?.name
            const period = periodText(
              g.startDate,
              g.startDatePrecision,
              g.endDate,
              g.endDatePrecision,
              '재임 중',
            )
            return (
              <View key={g.id ?? i} style={styles.tenureItem}>
                <Text style={styles.tenureTitle}>{position ?? '직책 미지정'}</Text>
                {country && <Text style={styles.tenureMeta}>{country}</Text>}
                <Text style={styles.tenureMeta}>{period}</Text>
                {g.notes && <RichText html={g.notes} />}
              </View>
            )
          })}
        </DetailSection>
      )}
    </>
  )
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
  if (resource.loading || !detailReady) return <PaneLoading />
  if (resource.error) return <ErrorBlock message={resource.error} onRetry={onRetry} />
  if (!entries.length) return <EmptyState text="연보 기록 없음" />

  return (
    <View>
      {entries.map((it) => {
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
      })}
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
})
