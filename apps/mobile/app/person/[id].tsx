import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { api } from '@/lib/api'
import { DetailRow, DetailSection } from '@/components/detail-section'
import { RelatedLink } from '@/components/related-link'
import { RichText } from '@/components/rich-text'
import { TabBar, type TabItem } from '@/components/tab-bar'
import { PersonStatsCard } from '@/components/person-stats-card'
import { FamilyTreeView, type FamilyTreeData } from '@/components/family-tree-view'
import { displayName, formatYMD, lifespan, placeText } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { buildPersonTimeline, type ExtraTimelineItem, type TimelineEntry } from '@/lib/timeline-builder'
import type { PersonStats, PersonTraitAssignment } from '@/lib/person-stats'
import type { PersonDetail } from '@/lib/dto'

type TabKey = 'overview' | 'family' | 'politics' | 'timeline' | 'relations'

type HumanRelationship = {
  id: string
  relationshipType: string
  counterpartPerson?: { id: string; name: string; surname?: string | null } | null
  counterpartPersonId?: string | null
  description?: string | null
  phases?: Array<{ id: string; status?: string | null; startDate?: string | null; endDate?: string | null; note?: string | null }>
}

function personLabel(p?: { name: string; surname?: string | null } | null) {
  if (!p) return '?'
  return p.surname ? `${p.surname}${p.name}` : p.name
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  MENTOR: '스승/제자',
  FRIEND: '친구',
  RIVAL: '경쟁자',
  ALLY: '동맹',
  ENEMY: '적대',
  COLLEAGUE: '동료',
  SUBORDINATE: '상관/부하',
  PATRON: '후원자',
  STUDENT: '제자',
  TEACHER: '스승',
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<PersonDetail | null>(null)
  const [extraTimeline, setExtraTimeline] = useState<ExtraTimelineItem[]>([])
  const [relationships, setRelationships] = useState<HumanRelationship[]>([])
  const [stats, setStats] = useState<PersonStats | null>(null)
  const [traits, setTraits] = useState<PersonTraitAssignment[]>([])
  const [familyTree, setFamilyTree] = useState<FamilyTreeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  useEffect(() => {
    let cancel = false
    setLoading(true)
    Promise.allSettled([
      api.get<PersonDetail>(`/persons/${id}/detail`),
      api.get<ExtraTimelineItem[]>(`/person-life-events/timeline/by-person/${id}`),
      api.get<HumanRelationship[]>(`/persons/${id}/human-relationships`),
      api.get<PersonStats | null>(`/persons/${id}/my-stats`),
      api.get<PersonTraitAssignment[]>(`/persons/${id}/my-traits`),
      api.get<FamilyTreeData>(`/persons/${id}/family-tree`),
    ])
      .then(([detailRes, timelineRes, relRes, statsRes, traitsRes, treeRes]) => {
        if (cancel) return
        if (detailRes.status === 'fulfilled') setData(detailRes.value.data)
        else setError((detailRes.reason as any)?.message ?? 'failed to load')
        if (timelineRes.status === 'fulfilled') setExtraTimeline(Array.isArray(timelineRes.value.data) ? timelineRes.value.data : [])
        if (relRes.status === 'fulfilled') setRelationships(Array.isArray(relRes.value.data) ? relRes.value.data : [])
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data ?? null)
        if (traitsRes.status === 'fulfilled') setTraits(Array.isArray(traitsRes.value.data) ? traitsRes.value.data : [])
        if (treeRes.status === 'fulfilled') setFamilyTree(treeRes.value.data)
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '데이터 없음'}</Text>
      </View>
    )
  }

  const title = displayName(data)
  const ls = lifespan(data)
  const profileImg = imageUrl(data.profileImageUrl)
  const timelineEntries = buildPersonTimeline(data, extraTimeline)
  const familyCount =
    (data.father ? 1 : 0) +
    (data.mother ? 1 : 0) +
    (data.spouse ? 1 : 0) +
    (data.children?.length ?? 0) +
    (data.siblings?.length ?? 0)
  const politicsCount = (data.sovereignReigns?.length ?? 0) + (data.governmentPositions?.length ?? 0)

  const tabs: TabItem[] = [
    { key: 'overview', label: '개요' },
    { key: 'family', label: '가족', badge: familyCount },
    { key: 'politics', label: '정치', badge: politicsCount },
    { key: 'timeline', label: '연보', badge: timelineEntries.length },
    { key: 'relations', label: '관계', badge: relationships.length },
  ]

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={styles.header}>
          {profileImg ? (
            <Image source={{ uri: profileImg }} style={styles.avatar} />
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
              {data.country?.flagEmoji && <Text style={styles.flag}>{data.country.flagEmoji}</Text>}
            </View>
            {!!ls && <Text style={styles.subheading}>{ls}</Text>}
            {!!data.country?.name && <Text style={styles.subheading}>{data.country.name}</Text>}
          </View>
        </View>

        <TabBar tabs={tabs} active={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />

        <ScrollView contentContainerStyle={styles.tabContent}>
          {activeTab === 'overview' && <OverviewTab data={data} stats={stats} traits={traits} />}
          {activeTab === 'family' && <FamilyTab data={data} tree={familyTree} />}
          {activeTab === 'politics' && <PoliticsTab data={data} />}
          {activeTab === 'timeline' && <TimelineTab entries={timelineEntries} />}
          {activeTab === 'relations' && <RelationsTab items={relationships} />}
        </ScrollView>
      </View>
    </>
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
  const birthPlace = placeText({ city: data.birthCity, adminDivision: data.birthAdminDivision, placeText: data.birthPlaceText })
  const deathPlace = placeText({ city: data.deathCity, adminDivision: data.deathAdminDivision, placeText: data.deathPlaceText })

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

function FamilyTab({ data, tree }: { data: PersonDetail; tree: FamilyTreeData | null }) {
  const has =
    data.father || data.mother || data.spouse || data.children?.length || data.siblings?.length || tree
  if (!has) return <EmptyState text="등록된 가족이 없습니다" />
  return (
    <View>
      {tree ? (
        <FamilyTreeView data={tree} />
      ) : (
        <DetailSection title="가족">
          {data.father && <RelatedLink kind="person" id={data.father.id} label={personLabel(data.father)} sublabel="아버지" />}
          {data.mother && <RelatedLink kind="person" id={data.mother.id} label={personLabel(data.mother)} sublabel="어머니" />}
          {data.spouse && <RelatedLink kind="person" id={data.spouse.id} label={personLabel(data.spouse)} sublabel="배우자" />}
          {data.children?.map((c) => (
            <RelatedLink key={c.id} kind="person" id={c.id} label={personLabel(c)} sublabel="자녀" />
          ))}
          {data.siblings?.map((s) => (
            <RelatedLink key={s.id} kind="person" id={s.id} label={personLabel(s)} sublabel="형제자매" />
          ))}
        </DetailSection>
      )}
    </View>
  )
}

function PoliticsTab({ data }: { data: PersonDetail }) {
  const reigns = data.sovereignReigns ?? []
  const positions = data.governmentPositions ?? []
  if (!reigns.length && !positions.length) return <EmptyState text="정부 직책·재위 기록 없음" />
  return (
    <>
      {reigns.length > 0 && (
        <DetailSection title="군주 재위">
          {reigns.map((r: any, i: number) => {
            const country = r.country?.name ?? r.historicalCountry?.name
            const period = `${r.startDate?.slice(0, 10) ?? '?'} ~ ${r.endDate?.slice(0, 10) ?? '재위 중'}`
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
          {positions.map((g: any, i: number) => {
            const country = g.country?.name ?? g.historicalCountry?.name
            const position = g.positionDefinition?.name ?? g.positionDefinition?.title ?? g.positionName ?? g.position?.name
            const period = `${g.startDate?.slice(0, 10) ?? '?'} ~ ${g.endDate?.slice(0, 10) ?? '재임 중'}`
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

function TimelineTab({ entries }: { entries: TimelineEntry[] }) {
  const router = useRouter()
  if (!entries.length) return <EmptyState text="연보 기록 없음" />
  return (
    <View>
      {entries.map((it) => {
        const dateText = it.endLabel && it.endLabel !== it.dateLabel
          ? `${it.dateLabel} ~ ${it.endLabel}`
          : it.dateLabel
        const onPress = it.link
          ? () => router.push(`/${it.link!.kind}/${it.link!.id}` as any)
          : undefined
        const Wrapper: any = onPress ? Pressable : View
        return (
          <Wrapper
            key={it.key}
            style={({ pressed }: { pressed?: boolean }) => [styles.timelineItem, pressed && styles.timelinePressed]}
            onPress={onPress}
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

function RelationsTab({ items }: { items: HumanRelationship[] }) {
  if (!items.length) return <EmptyState text="등록된 인간관계 없음" />
  return (
    <DetailSection title="인간관계">
      {items.map((r) => {
        const counterId = r.counterpartPerson?.id ?? r.counterpartPersonId
        const label = r.counterpartPerson ? personLabel(r.counterpartPerson) : `인물 #${counterId ?? '?'}`
        const typeLabel = RELATIONSHIP_LABELS[r.relationshipType] ?? r.relationshipType
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
                · {p.startDate?.slice(0, 10) ?? '?'} ~ {p.endDate?.slice(0, 10) ?? '?'}: {p.status ?? p.note ?? ''}
              </Text>
            ))}
          </View>
        )
      })}
    </DetailSection>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#ef4444' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e2e8f0' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#64748b' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f172a', flexShrink: 1 },
  flag: { fontSize: 18 },
  subheading: { fontSize: 13, color: '#64748b', marginTop: 4 },
  tabContent: { padding: 12 },
  body: { fontSize: 14, color: '#0f172a', lineHeight: 22 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  tenureItem: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  tenureTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  tenureMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  timelineItem: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  timelinePressed: { opacity: 0.6 },
  timelineDotCol: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, borderWidth: 2, borderColor: '#fff' },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#e2e8f0', marginTop: 2 },
  timelineDate: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  timelineTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  timelineMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
